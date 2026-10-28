---
date: 2026-09-20
description: "No frontend ever decoded a token's exp — every route gate tested cookie presence only, and the 401 refresh that would have caught it could never succeed"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Expired Sessions Undetected Across All TAT Frontends

Reported symptom: when the token expires the system cannot detect it, the session keeps running on an expired token, nothing surfaces in the UI, and you keep navigating instead of landing on the login screen.

21 files across [[tat-app-ws Backend]], [[tat-prereq]], [[tat-portal]] and [[tat-ws]]. **Uncommitted at time of writing, and nothing exercised at runtime** — see [[#Still open]].

## Root cause — only the backend knew what "expired" meant

The backend does reject expired tokens: `jwt-at-strategy.ts:23` and `jwt-rt-strategy.ts:16` both set `ignoreExpiration: false`. Every layer in front of it was blind.

**1. Every route gate tested cookie *presence*, never validity.** `tat-prereq/src/proxy.ts`, `tat-portal/src/middleware.ts` and `exam-portal/src/middleware.ts` all read the token cookie and branched on whether it existed. A 30-day-dead JWT is a present cookie, so navigation was never blocked.

**2. The 401 refresh could never succeed.** `tat-prereq/src/lib/axios/client.ts:107-111` and the identical `tat-portal` copy posted the token in the JSON body:

```ts
await axios.post(`${API_URL}/auth/refresh-token`, { refreshToken }, ...)
```

But `apps/api/src/app/auth/auth.controller.ts:144-150` guards that route with `JwtRtGuard`, which extracts via `ExtractJwt.fromAuthHeaderAsBearerToken()`. Both calls used bare `axios` rather than the configured client, so they carried **no `Authorization` header at all** — the guard 401'd every attempt. There was no working renewal path in either app.

**3. Cookies outlived their own tokens by a year.** `token-cookies.ts` hardcoded `max-age` to `ONE_YEAR` regardless of the JWT's `exp`, so the browser kept presenting long-dead credentials.

**4. Guard coverage is partial.** 299 of 458 route decorators in `apps/api/src` carry `JwtAtGuard`. Any screen fed by an unguarded route answers **200 with a dead token**, so nothing 401s and nothing notices.

Net effect: a session that could only end by accident — and only if a guarded request happened to fire.

## Two independent backend bugs underneath

- **Rotated refresh tokens were never retired.** `auth.service.ts` minted a new pair and left the old Redis key in place, so every refresh token ever issued stayed valid indefinitely.
- **Every Redis TTL was 1000× too long.** `refreshTokenInMinutes()` returned *milliseconds* while cache-manager v3 takes *seconds* — a 30-day TTL became roughly 82 years. The name said minutes, the body returned ms, and the API wanted s. See [[Gotchas - Backend Services & Environment#`cache-manager` v3 `ttl` is SECONDS — a helper returning ms made a 30-day Redis TTL ~82 years (2026-09-20)]].
- `redisData.role` was always `undefined` — `decodedToken.role.code` reading `.code` off a value that is already the role code string.

## Fix

| Repo | Change |
|---|---|
| [[tat-app-ws Backend]] | Rotation retires the presented refresh token (30s grace, see [[Decision - Refresh Token as the Session Boundary]]); `parseDurationToSeconds` + `refreshTokenTtlSeconds`/`accessTokenTtlSeconds` across 7 call sites; `redisData.role` fixed |
| [[tat-prereq]], [[tat-portal]] | Refresh sent as `Authorization: Bearer`; cookie lifetimes derived from JWT `exp`; gates decode `exp`; pre-emptive single-flight refresh shared by both interceptors |
| [[tat-ws]] | Server middleware now persists the **rotated refresh token** (it wrote only `accessToken`); module-level token cache in `authMiddleware` removed; cookies made authoritative over `localforage`; 401 race guard |
| `exam-portal` | Middleware decodes `exp`; login + refresh write real cookie expiries; refresh exemption narrowed |

Two holes only became visible once cookies carried real expiries: `tat-ws`'s middleware refresh branch **required the access token to still be present**, so an expired-away cookie would bounce a user still holding a valid refresh token; and the same shape in the other gates. Both fixed by making the refresh token the session boundary.

The blanket `/auth/` refresh exemption in `tat-ws` and `exam-portal` also hid 401s on `/auth/me`; narrowed to the six endpoints that genuinely must not recurse.

## Not the cause — dead code found on the way

[[tat-website]] has **no authentication at all**: no login page, no protected routes, and `tokenUtils` has zero callers (`grep` for `setAccessToken`/`isAuthenticated` → nothing outside its own definition). Its refresh block targets a nonexistent `/auth/refresh`, sends snake_case, reads `access_token` where the backend returns `accessToken`, and on failure clears the tokens and logs to the console with `// You can add redirect logic here if needed` (`axios-client.ts:80-86`) — no redirect. It is the purest form of the reported symptom and it is unreachable. Deletion awaits a go-ahead.

## Still open

- **Nothing exercised at runtime.** What ran: `tsc --noEmit` clean on all five projects (`--listFiles` confirmed the edited files were in the compilation), and `eslint` clean on every changed file in [[tat-prereq]], [[tat-portal]] and [[tat-ws]] (7 pre-existing `any` warnings, 0 errors). Per [[Patterns - Method & Conventions]] that is built, **not verified**.
- ESLint **cannot run in [[tat-app-ws Backend]]** — `@nx/eslint-plugin` is not installed there. Pre-existing, unrelated to this change.
- Unverified: the Bearer refresh against a live backend; the TTL fix; the 30s grace window under concurrent refreshes; the `tat-ws` cookie-authoritative switch across its middleware/client/cross-tab paths.
- **The TTL fix changes real behaviour on deploy** — existing sessions start expiring at the configured lifetime instead of never. Expect sessions to end where they previously did not.
- Manual pass still owed, [[tat-ws]] first (most moving parts): log in → let the access token expire → navigate → confirm you stay in; then let the refresh token expire → confirm you land on `/login`.
- Noticed, not fixed: the Redis cache **falls back to in-process memory** (`apps/api/src/app/cache-db/cache-db.module.ts:14-20`, `max: 100`). Refresh tokens live in that cache, so on the fallback path they vanish on restart, are not shared between ECS tasks, and are LRU-evictable past 100 entries — each of which makes refresh fail and logs users out. Infra decision of its own.
- Noticed, not fixed: login's one-user-per-role invalidation keys a refresh token by role code (`auth.service.ts:695`) and rotation never updates that entry, so the role key lingers pointing at a retired token. Nothing reads it for validity.

## Related

- [[Session and Cache Leaks Across Logins]] — follow-up: logout left cached data and a live refresh token behind (TAT-496, TAT-505, 2026-10-27)

- [[Decision - Refresh Token as the Session Boundary]] — the architectural call this fix rests on
- [[TAT API & Auth Model]] — the contract; its refresh-flow line was **wrong** and was corrected in this pass
- [[tat-ws Sign-Out 404]] — the previous session-handling bug in the same area, and where the JS-readable-cookie posture was set
- [[TAT Platform]] — the six-repo system
- [[Gotchas - Frontend]], [[Gotchas - Frontend Data & API Contracts]], [[Gotchas - Backend Services & Environment]] — the four traps written up
- [[TAT-434 Email Verification]] — same failure family: a frontend built against a contract the backend never spoke
