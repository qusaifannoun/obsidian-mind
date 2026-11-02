---
date: 2026-10-28
description: "Logout left React Query data and a live refresh token behind, so the next user saw the previous user's data and pages rendered for nobody"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-505
---

# Session and Cache Leaks Across Logins

**Status (as of 2026-10-28):** fixed in tat-prereq and ported to tat-portal, every branch; **not browser-tested**. Part of [[Staff Management QA - Oct 2026]]. Tickets: TAT-496, TAT-505.

## Root cause

- **TAT-496:** logout navigated client-side and never cleared React Query. Profile and notifications are cached under keys with no user id, so the next login in the tab saw the previous user.
- **TAT-505:** the proxy treated `refresh_token` alone as a session. A token refresh finishing after logout wrote the tokens back, and `auth_user`'s max-age was never extended on refresh — so "refresh present, `auth_user` gone" let pages render for nobody ("? Account", no-access cards).

## Evidence

- Staging with no cookies redirected correctly (`307 → /login?returnTo=…`), so QA's browser still held a live `refresh_token`.
- `auth_user` cookie sizes on staging: staff max ~2.7 KB, trainees max ~2.2 KB (browser limit ~4 KB).

## Fix

- [[tat-prereq]] `dd8019b` — drop every cached query at login (not logout: mounted queries would refetch tokenless and hard-redirect).
- `a323a81` — session needs `refresh_token` **and** `auth_user`; a refresh that finds the session signed out doesn't save; `saveTokens` extends `auth_user` with the refresh token.
- Ported to [[tat-portal]]: `355d30b`, `4e5f386`. tat-ws was already safe (clears the cache and hard-reloads on logout).

## Still open

- [ ] Browser test: log out, open `/manage-staff` and `/tor-matrix`; switch accounts in one tab.
- [ ] `auth_user` stores the whole user object; a user past ~4 KB would now bounce to login on every page.

## QA round 2026-11-01: still failing, real cause was CloudFront

Ayat on 2026-11-01: logged out, in a fresh tab, `/manage-staff` and `/tor-matrix` sometimes rendered "Only a Super Admin…" / "You don't have access" instead of redirecting.

- **Root cause:** both pages were prerendered **static** pages, sent with `cache-control: s-maxage=31536000`. CloudFront cached the 200 from a logged-in visit and served it to logged-out visitors **without the proxy running**. Which edge you hit decided the result, hence "works sometimes". The cookie fixes above were real, but not this bug.
- **Evidence:** `staging.staff.tat147.com/login` → `cache-control: s-maxage=31536000`, `x-cache: Hit from cloudfront`. A no-cookie `/manage-staff` → `307 Miss` every time.
- **Fix:** [[tat-prereq]] `43ff737` sets `export const dynamic = 'force-dynamic'` in the root layout. Every route now renders per request and sends `private, no-cache, no-store`. Checked on a local `next start`: logged out → 307 to login; logged in → 200 with `no-store`. On dev + prepod. → [[Gotchas - Frontend#Static pages behind CloudFront skip the auth proxy — a cached 200 reaches logged-out users (2026-11-02)]]

- [ ] **Run a CloudFront invalidation (`/*`)** on the staff staging distribution after deploy. Copies cached earlier can live for a year.
- [ ] The [[tat-portal]] `/login` also sends `s-maxage=31536000`, so the portal probably has the same bug (unverified).

## Related

- [[Expired Sessions Undetected Across All TAT Frontends]] — the earlier session work this builds on
- [[tat-prereq]] · [[tat-portal]]
