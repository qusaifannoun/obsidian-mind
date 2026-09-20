---
date: 2026-09-20
description: "The refresh token defines how long a session lives; the access token is renewable state, and the cookie is authoritative over any client-side store"
status: accepted
tags:
  - decision
  - project/tat
---

# Decision: Refresh Token as the Session Boundary

## Context

Fixing [[Expired Sessions Undetected Across All TAT Frontends]] meant teaching four route gates what "expired" means. The naive version — treat an expired access token as signed out — is wrong: the access token is short-lived by design and renewable, so bouncing on it would log people out mid-session every time one aged out.

[[tat-ws]] made the problem concrete. It refreshes in **two** places, a server-side `middleware.ts` and a client-side wretch middleware, over **two** stores: cookies (the only store the server can reach) and `localforage` (the only one the client used to prefer). Once the backend began retiring rotated refresh tokens, those two paths could invalidate each other.

## Options Considered

1. **Access token as the boundary** — bounce to login whenever it is expired. Simple, and wrong: it discards a renewable session and would make short access lifetimes unusable.
2. **Refresh token as the boundary** — the gate admits anyone holding a live refresh token and lets the data layer renew the access token.
3. **Hard-delete the rotated refresh token** — strictest revocation, but the loser of a two-tab race gets logged out, which is the same spurious-logout class being fixed.

## Decision

**Option 2, with a 30-second rotation grace window.**

- The gate's session test is the **refresh token's** validity. An absent or expired access token is a refreshable state, not a signed-out one.
- **Cookies are authoritative** over client-side stores. The server middleware rotates cookies and cannot reach `localforage`, so reading `localforage` first hands back a token the server already rotated away — and a rotated refresh token is revoked. `getTokens()` and `useTokens` now read the cookie first and mirror it back so `localforage` self-heals.
- Rotation **retires** the presented refresh token with a 30s TTL rather than deleting it, so a second tab refreshing in the same moment still succeeds. After the window it is gone for good.
- Cookie lifetimes are derived from each token's own `exp`, so a credential's storage never outlives the credential.

## Consequences

- Sessions now genuinely end. Combined with the TTL unit fix, refresh tokens expire at their configured lifetime instead of ~82 years, so **deploying this will end sessions that previously never ended**.
- A stolen refresh token stays usable for up to 30s after the victim refreshes — a deliberate trade against infinite validity, which is what the code did before.
- Every gate now needs a JWT decode at the edge. Each repo carries its own dependency-free helper (`isTokenExpired`) because there is no shared workspace; `jwt-decode` is not a dependency in three of the four apps and was not added.
- `authMiddleware`'s module-level token cache had to go — a process-lifetime cache can never learn that the server rotated the token.

## Related

- [[Expired Sessions Undetected Across All TAT Frontends]] — the work this decision came out of
- [[TAT API & Auth Model]] — contract updated to match
- [[tat-ws Sign-Out 404]] — where the JS-readable-cookie posture was set, which this builds on
- [[Patterns - Architecture & Boundaries]] — one rule, one implementation
