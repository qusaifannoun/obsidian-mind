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

## Related

- [[Expired Sessions Undetected Across All TAT Frontends]] — the earlier session work this builds on
- [[tat-prereq]] · [[tat-portal]]
