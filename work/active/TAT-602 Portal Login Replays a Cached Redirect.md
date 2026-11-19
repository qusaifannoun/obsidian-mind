---
date: 2026-11-19
description: "After login, Enroll Now went back to Login: a pre-login prefetch of /cart cached the middleware redirect (inferred); login and logout now do a full page load"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-portal
ticket: TAT-602
---

# TAT-602 Portal Login Replays a Cached Redirect

**Status (as of 2026-11-19):** [[tat-portal]] `6b97b8a` on dev, prepod and main. Jira READY FOR QA. **Not reproduced and not opened in a browser; the cause is inferred.**

## Context

QA: after logging in to Online Courses, Enroll Now sends the trainee to the Login page, and Sign In appears to hang. Opening `/cart` directly works.

## Root cause (inferred)

- Before login, the header's `CartIcon` `<Link>` prefetches `/cart`. The middleware answers a logged-out request with a redirect to `/login`, and the Next.js client router cache stores that redirect.
- Login then navigated client-side, so the cache survived. Enroll Now → `/cart` replayed the cached redirect. Sign In "hangs" the same way.
- A direct visit does a full page load and skips the router cache, which is why `/cart` typed in works.
- Prefetch runs only in production builds and the bug needs a logged-in session, so it was not reproduced locally.

## Fix

- `app/(auth)/login/page.tsx`: on success, `window.location.replace(completeness?.complete === false ? '/complete-profile' : (returnTo ?? '/'))`.
- `components/landing/UserMenu.tsx`: logout uses `window.location.replace('/')`; the unused router was removed. tat-prereq already logs out this way.

## Evidence

- tat-portal `tsc` clean; lint-staged ESLint passed on commit.

## Still open

- [ ] Not reproduced; retest on the deployed portal: log out, hover the cart, log in, click Enroll Now.

## Related

- [[Gotchas - Frontend Data & API Contracts#A prefetch made while logged out caches the middleware's login redirect — a client-side login replays it (tat-portal, 2026-11-19)]]
- [[Course Purchase Important-Notes Acknowledgment Gate]]: the same Enroll Now button
- [[TAT-591 Initial TOR Documents Audit Log]] · [[TAT-598 Super Admin Delete Form 32]]: the same batch
- [[tat-portal]]
