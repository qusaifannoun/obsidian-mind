---
date: 2026-06-02
description: "Scope/gap analysis for TAT-434 email verification in tat-portal — feature is ~90% already built; only the post-signup confirmation message is missing"
tags:
  - work-note
  - project/tat
status: active
quarter: Q2-2026
project: tat-portal
ticket: TAT-434
---

# TAT-434 Email Verification

Jira: [TAT-434](https://cryptonic-art.atlassian.net/browse/TAT-434) · *Ready for Dev* · Highest · reporter dania.baradie · parent epic TAT-377 "Online Courses" → [[tat-portal]].

## Context

Ticket asks to "implement email verification for the Online Courses signup flow," stating the current state is "users can register without email verification." **In reality the feature is almost entirely built already in [[tat-portal]].** This is a scope contradiction — see analysis. Related auth contract: [[TAT API & Auth Model]].

## Gap analysis — ticket requirement vs. code

| Requirement | State | Evidence |
|---|---|---|
| Send verification email after signup | ✅ Backend | `sign-up/page.tsx` → `POST /auth/external-user/signup` (backend sends mail) |
| Email contains a verification link | ✅ | link → `verify-email/[token]/page.tsx` → `PATCH /auth/external-user/verify-email/{token}` |
| **Show "verification email sent / please verify before login" message** | ❌ **GAP** | signup `onSuccess` does `router.push('/login')` with **no message** |
| Block unverified users from logging in | ✅ | `login/page.tsx` `onError` → `isEmailNotVerifiedError()` → redirect `/verify-email?email=` |
| After verify → account verified, can log in | ✅ | token page success state + normal login |
| (bonus) Resend verification link | ✅ | `verify-email/page.tsx` → `POST /auth/resend-verification-link` |

`isEmailNotVerifiedError` (`lib/format-api-error.ts`) detects a 401 whose message contains "not verified" — fully implemented.

## The only real frontend work

Post-signup, route the user to the existing verify-email screen (which already says "we sent a link to <email>") instead of silently dropping them on `/login`:

```ts
// sign-up/page.tsx — onSuccess
onSuccess: (_data, vars) => router.push(`/verify-email?email=${encodeURIComponent(vars.email)}`)
```

~1–2 lines. Optionally tweak the verify-email copy so it reads as a post-signup confirmation, not only an "already unverified" notice.

## Backend dependencies (not our repo — [[tat-app-ws Backend]], other team)

The flow assumes the backend (a) sends the email on signup and (b) returns a 401 "not verified" on login for unverified accounts. **Staging OpenAPI (`/api/docs-json`) confirms all endpoints exist:** `POST /auth/external-user/signup`, `PATCH /auth/external-user/verify-email/{token}`, `POST /auth/resend-verification-link`, `POST /auth/login`. The runtime 401 message on unverified login isn't provable from the spec alone (would need a throwaway signup on staging to test live).

## Correction to the gap analysis

The "~90% built, only the message missing" read was **wrong** — it trusted that the existing frontend route matched the backend. It didn't. The real, verified state (Qusai's investigation) was that the verification flow was actually broken. See [[TAT API & Auth Model#Email links (verification / password reset) — cross-app gotcha]].

## Changes made (2026-06-02, branch `dev`, uncommitted)

**Qusai** — fixed the real breakage:
- `axios/client.ts` + `server.ts`: send `X-Client-App: online-courses` so backend email links target this app.
- New `app/(auth)/email-verify/page.tsx` (`?token=` query param) — the route the backend actually emails; old `/verify-email/[token]` had no matching link and would 404.
- New `components/auth/EmailVerification.tsx` — shared verify component (both routes reuse it).
- `reset-password/page.tsx`: read `?token=` via `useSearchParams` + Suspense (was taking props Next never passes → dead).

**Claude (TAT-434 proper)** — `sign-up/page.tsx`: signup `onSuccess` → `/verify-email?email=…` (the resend/notice screen) instead of `/login`. Compatible with the above (different route).

Status: ESLint + `tsc --noEmit` clean. Committed to `tat-portal` `dev` as **533bf70**. Jira: **In Progress → Passed Code Review**.

## Open observations
- ✅ **`verify-email/[token]` deleted** (2026-06-02) — confirmed dead code. Backend `constructVerifyLink` (common.service.ts) always builds `${url}?token=` (query param, path `/email-verify`); it can never emit a path-param frontend link. The only `verify-email/:token` in the backend is the *API endpoint* `@Patch("external-user/verify-email/:token")`, which the EmailVerification component still calls — unrelated to the deleted route. Lint + `tsc` clean after removal. Live `verify-email/page.tsx` (resend/notice) kept.
- `reset-password` reads `?email=` though the link doesn't carry it (harmless default).

## Action Items
- [x] Verify backend endpoints on staging (all present)
- [x] Implement the signup `onSuccess` redirect
- [ ] (optional) Live-test login 401 "not verified" via throwaway staging signup — needs user OK (creates test data)
- [ ] (optional) Confirm with reporter (dania.baradie) the ticket was just the missing message
- [ ] Post findings as a Jira comment (pending user confirmation)
- [ ] Manual check in running dev server, then move toward Code Review

## Related
- [[tat-portal]] · [[TAT API & Auth Model]] · [[TAT Platform]]
- Kickoff: [[TAT Portal Onboarding]]
- Competencies: [[Debugging & Root Cause Analysis]] — traced the 404 across frontend route + backend email-link format · [[Systems Thinking]] — the cross-app email-link contract
