---
date: 2026-10-29
description: "Lookups that find users by role checked only the primary role and skipped secondaryRoles; first built wrongly as a permission change, reverted 2026-11-01"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-543
---

# TAT-543 — Secondary Roles Count Everywhere

**What the ticket means (Qusai, 2026-11-01):** places that **find other users by role** — eligible instructors, examiners, assessors — checked only `user.role` and skipped `secondaryRoles`. The model is the earlier bulk-edit fix, where eligible instructors now include users holding Instructor as a secondary role. It is **not** about letting the logged-in user act as every role they hold. Logged in [[Key Decisions#2026-11-01 — TAT-543 is about finding users by role, not about what the requester may do]].

**Status (as of 2026-11-03):** Jira **READY FOR QA** (moved after the retest fixes). Retest fixes are on `dev` + `prepod` in [[tat-app-ws Backend]] and [[tat-prereq]] ([[#Retest fixes (2026-11-03)]]). They were typechecked and specs pass; **nothing has been run on staging**.

## What happened

2026-10-29: built as "every permission check accepts any held role" — `AtStrategy` attached `roleCodes`/`roleIds`, and the guard, role actions, staff management, forms, course forms, exam approval, questions and the tat-prereq UI all used the union. That misread the ticket and reversed [[Staff Management Role Switcher|the active-role decision]].

2026-11-01: reverted in [[tat-app-ws Backend]] `756daf58` (reverts `c66017c6`, `a540422e`, `03408e45`, `e757803f`) and [[tat-prereq]] `d5108e2` (reverts `37ec645`). Requests are authorized by the token's active role again; the role switcher matters again. Prepod merges: tat-app-ws `eb4b0e87`, tat-prereq `02ff12b`.

## Lookup fixes kept

- Eligible course instructors and `examinerExists` query `$or` on `role` / `secondaryRoles` (`27068211`).
- History Form: whether a staff member is an instructor, and which mandatory courses apply, use all their roles — `getHeldRoleCodes` (`264bfd8b`, `0a25defd`). Courses stay in **one list**, matching the paper form (decided 2026-11-03).
- Assessor fallback list and the chosen assessor's role check include secondary roles (re-applied inside `756daf58`).

## Remaining lookups fixed (2026-11-01)

Found by a sweep of every user query by role in [[tat-app-ws Backend]]; everything else already went through `getUsersByRole` or an `$or`.

- Refresher course seeding (`mandatory-` and `aircraft-refresher-online-course.service.ts` `resolveSeedActorId`) finds a Super Admin held as a secondary role — `cb3983c7`.
- `approveNotification` compared the **stored primary** role to `approvalByRole`, while the approvers are notified via `getUsersByRole` (both fields), so a secondary holder who switched into the role was rejected. Now compares the token's active role (`req.user.role._id`) — `cb3983c7`.
- `GET /user/all` keeps `includeSecondaryRoles` opt-in (added 2026-08-27 so no caller changed); the tat-ws pickers already sent it. [[tat-ws]] `useFetchUsers` now sends it whenever a role filter is set — Manage Profiles and the learning-materials user search — `e38bde77`.
- Merged to prepod: tat-app-ws `8861bcc5`, tat-ws `3df2f08c`.

## Retest fixes (2026-11-03)

Ayat's retest used Qaform Recheck (primary Instructor, secondary Examiner). The History Form courses, the Edit Staff role sections and the role switcher **work**. Two things failed: Form 285 ignored the roles, and in the Examiner role the user's own TOR showed "Couldn't load this TOR."

**Root causes:**
- Permissions follow the **JWT's active role**: `switch-role` re-signs the token with that role, and `getUserActions` reads `user.role`. That stays consistent with [[Staff Management Role Switcher|the active-role decision]].
- `GET tors/:torId/details` is guarded by `SM_VIEW_PENDING_TORS`. The bootstrap gave that, and every other staff-TOR action, to `IN` only. `EX` and `PA` had just `smOperationalActions`.
- Every TOR-owner workflow check required `roleCode === INSTRUCTOR`: Form 285, Form 32, the TOR certificate, the History Form basic info and training-course requests. So the TOR would load, and an Examiner's next save would fail.
- Form 285 positions weren't tied to the staff member's roles, in either the frontend or the backend.

**Fix:**
- [[tat-app-ws Backend]] `17a401e0`:
  - `smStaffTorHolderActions` is shared by IN, EX and PA. The bootstrap rewrites role actions on every boot, so this applies on deploy.
  - Owner checks now use `isStaffTorRoleCode`, which accepts IN, EX or PA.
  - Form 285 returns `allowedPositions` (IN → instructor, PA → assessor, EX → examiner, from primary and secondary roles) and rejects others with `form285PositionNotHeld`.
- [[tat-prereq]] `a766589`: Form 285 pre-selects `allowedPositions` on an empty form and disables positions the person doesn't hold.
- [[tat-app-ws Backend]] `2a8e9622` (Qusai, 2026-11-03: "EX and PA should only see their forms"):
  - When the TOR owner is acting in a staff role, TOR details lists only that role's Form 32: IN → 32A/32B, EX → 32C, PA → 32D. Form 32 endpoints reject the owner opening another role's Form 32.
  - Form 285, the History Form, the certificate and the assessment report stay visible in every role. Admins and reviewers still see everything.
  - Helpers: `resolveOwnerActingRole` and `isFormKeyForActingRole` in `staff-tor-requested-role.util.ts`. IN is filtered too, which is my extension of "their forms" (inferred, not stated).
  - The [[tat-prereq]] role switcher already runs `invalidateQueries()`, so no frontend change was needed.
- Prepod merges: tat-app-ws `69110f76`, then `0c8df124`; tat-prereq `c4b015e`.

## Evidence

- 2026-11-03: `tsc --noEmit` clean for `apps/api` and tat-prereq; eslint clean on the touched tat-prereq files; staff-management specs 94/94, including new ones for `resolveForm285Positions`, `isFormKeyForActingRole` and `resolveOwnerActingRole`.
- After the revert: `tsc` clean for `libs/database` and `apps/api`; auth + staff-management + forms + course-forms specs 138/139 — the one failure is AuthService "should be defined", which also fails on an untouched `origin/dev`.
- 2026-11-01 lookup fixes: `tsc` clean for `libs/database`, `apps/api` and tat-ws (one pre-existing `@testing-library/react` spec error). `notifications.service.spec` is an empty stub, so the approval change has **no test**.
- Nothing run in a browser.

## Still open

- [x] Fix the remaining primary-only lookups (2026-11-01)
- [ ] Exercise notification approval by a user holding the approving role as a secondary, switched into it.
- [x] ~~Decide the History Form layout for secondary-role courses~~: **keep the single list** (Qusai, 2026-11-03), because it matches the real paper form. Nothing to build.
- [ ] On staging, as an IN + EX user: in the Examiner role, open your own TOR (only 32C should be listed) and save Form 285. Check that Assessor can't be ticked and that the positions are pre-selected.
- [ ] As an IN-primary user in the IN role, confirm 32C is no longer listed. It is now filtered by the active role.
- [x] Moved to READY FOR QA 2026-11-03, before the staging checks above were run.

## Related

- [[Staff Management Role Switcher]] — the active-role decision, which stands
- [[Staff Management Subsystem & TOR Model]] · [[Gotchas - Forms & Approval]]
- [[tat-app-ws Backend]] · [[tat-prereq]] · [[tat-ws]]
- [[Index|Work Index]]
