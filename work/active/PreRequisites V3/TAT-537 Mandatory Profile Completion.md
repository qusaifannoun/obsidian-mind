---
date: 2026-11-02
description: "Online Courses never showed Complete Profile in QA: staging still runs a pre-TAT-537 portal build (likely failing on a missing env var), and login sent users to the ungated home"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-portal
ticket: TAT-537
---

# TAT-537 — Mandatory Profile Completion

**Status (2026-11-02):** Needs Fixes. The code fix is on dev + prepod, but **staging Online Courses doesn't deploy**, so QA can't see it.

## Context

New or added users must complete their profile before using the system, in the Dashboard, Online Courses and Staff Management. The backend enforces it with `profileIncomplete` in `jwt-at-strategy` and a 403 `PROFILE_INCOMPLETE` from `JwtAtGuard` unless `@AllowIncompleteProfile()`. [[tat-portal]] `058658c` (2026-10-28) added `ProfileCompletionGate` on protected paths, a `/complete-profile` page and an SSO hand-off to Dashboard → My Profile.

## QA round 2026-11-01

Ayat: the Dashboard passes. In Online Courses, login went straight to home and My Courses with **no** Complete Profile page, and My Courses said "Failed to load courses" (the backend 403).

## Root cause

1. **Staging runs an old build.** `staging.onlinecourses.tat147.com/complete-profile` → 404, although `058658c` has been on the portal's `prepod` since 2026-10-28 14:01. The portal has no pipeline file in the repo, so builds run outside it. Since TAT-537, `src/lib/env.ts` throws without `NEXT_PUBLIC_DASHBOARD_URL`, and a local build fails exactly that way. **Inferred: the staging build env lacks the variable, every build since 10-28 fails, and staging stays on the last good one.** Not confirmed from build logs.
2. **Login lands on an ungated page.** After login the portal pushed `returnTo ?? '/'`, and `/` is public, so the gate never fired until a protected page was opened.

## Fix

- [[tat-portal]] `0ea2353`: after login, call `getProfileCompleteness` and go to `/complete-profile` when `complete === false`; otherwise `returnTo` or home. On dev + prepod; built, **not browser-run**.

## Certificates list made optional (2026-11-05)

Qusai asked for "Certificates list" to be optional for Instructor, Examiner and Practical Assessor.

**Required fields are defined twice**, and both copies have to change together:
- **FE:** `ROLE_DATA_REQUIREMENTS` in [[tat-prereq]] `src/components/staff/StaffForm.tsx` drives the form's "Required" errors.
- **Backend:** `REQUIRED_ROLE_FIELDS` in [[tat-app-ws Backend]] `libs/database/src/lib/profile-completeness.util.ts` feeds `missingProfileFields`, which `jwt-at-strategy` turns into `profileIncomplete`.

An FE-only change would have saved profiles with no certificates that the backend then flags as incomplete, so the user gets the 403 `PROFILE_INCOMPLETE` gate described in [[#Context]].

**Fix:**
- [[tat-app-ws Backend]] `1b47d6df`: drops `certificatesList` from IN, EX and PA in `REQUIRED_ROLE_FIELDS`.
- [[tat-prereq]] `6d8eab7`: drops it from `ROLE_DATA_REQUIREMENTS`.

**Evidence:** `profile-completeness.util.spec.ts`: 10 passed, including the new "does not require a certificates list from instructors, examiners or assessors".

## Still open

- [ ] Whoever owns the portal deployment: set `NEXT_PUBLIC_DASHBOARD_URL` for staging (and production), and check the failed builds since 2026-10-28. This also blocks the [[TAT-539 Multiple Nationalities|TAT-539]] portal change.
- [ ] Sign-up (Ayat's note): a last name with a digit or hyphen is rejected by the API ("Please enter a valid name."), but the form shows nothing. Separate bug.
- [ ] AC 10 (access after completing the profile) hasn't been tested yet.
- [ ] **Certificates list optional (`1b47d6df` + `6d8eab7`):** spec and tsc only. Not browser-checked. Pushed to dev and synced to prepod on 2026-11-05 (tat-app-ws `0243752e`, tat-prereq `474640f`). The backend half only takes effect once staging is deployed.

## Related

- [[Session and Cache Leaks Across Logins]]: same QA batch
- [[TAT-492 + TAT-493 Staff Editing Moves to Staff Management]]: the SSO hand-off pattern the Complete Profile button reuses
- [[tat-portal]] · [[tat-app-ws Backend]]
