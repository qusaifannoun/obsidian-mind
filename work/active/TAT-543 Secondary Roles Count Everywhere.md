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

**Status (as of 2026-11-01):** permission over-reach reverted and the lookup fixes kept, on `dev` and merged into `prepod` in [[tat-app-ws Backend]] and [[tat-prereq]]. Jira still Ready for Dev. Remaining lookups fixed 2026-11-01.

## What happened

2026-10-29: built as "every permission check accepts any held role" — `AtStrategy` attached `roleCodes`/`roleIds`, and the guard, role actions, staff management, forms, course forms, exam approval, questions and the tat-prereq UI all used the union. That misread the ticket and reversed [[Staff Management Role Switcher|the active-role decision]].

2026-11-01: reverted in [[tat-app-ws Backend]] `756daf58` (reverts `c66017c6`, `a540422e`, `03408e45`, `e757803f`) and [[tat-prereq]] `d5108e2` (reverts `37ec645`). Requests are authorized by the token's active role again; the role switcher matters again. Prepod merges: tat-app-ws `eb4b0e87`, tat-prereq `02ff12b`.

## Lookup fixes kept

- Eligible course instructors and `examinerExists` query `$or` on `role` / `secondaryRoles` (`27068211`).
- History Form: whether a staff member is an instructor, and which mandatory courses apply, use all their roles — `getHeldRoleCodes` (`264bfd8b`, `0a25defd`). Courses are still shown in **one list**; Qusai wants a secondary role's courses separated (tab or page) — not built, layout not decided.
- Assessor fallback list and the chosen assessor's role check include secondary roles (re-applied inside `756daf58`).

## Remaining lookups fixed (2026-11-01)

Found by a sweep of every user query by role in [[tat-app-ws Backend]]; everything else already went through `getUsersByRole` or an `$or`.

- Refresher course seeding (`mandatory-` and `aircraft-refresher-online-course.service.ts` `resolveSeedActorId`) finds a Super Admin held as a secondary role — `cb3983c7`.
- `approveNotification` compared the **stored primary** role to `approvalByRole`, while the approvers are notified via `getUsersByRole` (both fields), so a secondary holder who switched into the role was rejected. Now compares the token's active role (`req.user.role._id`) — `cb3983c7`.
- `GET /user/all` keeps `includeSecondaryRoles` opt-in (added 2026-08-27 so no caller changed); the tat-ws pickers already sent it. [[tat-ws]] `useFetchUsers` now sends it whenever a role filter is set — Manage Profiles and the learning-materials user search — `e38bde77`.
- Merged to prepod: tat-app-ws `8861bcc5`, tat-ws `3df2f08c`.

## Evidence

- After the revert: `tsc` clean for `libs/database` and `apps/api`; auth + staff-management + forms + course-forms specs 138/139 — the one failure is AuthService "should be defined", which also fails on an untouched `origin/dev`.
- 2026-11-01 lookup fixes: `tsc` clean for `libs/database`, `apps/api` and tat-ws (one pre-existing `@testing-library/react` spec error). `notifications.service.spec` is an empty stub, so the approval change has **no test**.
- Nothing run in a browser.

## Still open

- [x] Fix the remaining primary-only lookups (2026-11-01)
- [ ] Exercise notification approval by a user holding the approving role as a secondary, switched into it.
- [ ] Decide the History Form layout for secondary-role courses, then build it.
- [ ] Move TAT-543 to READY FOR QA with a comment once the above is done.

## Related

- [[Staff Management Role Switcher]] — the active-role decision, which stands
- [[Staff Management Subsystem & TOR Model]] · [[Gotchas - Forms & Approval]]
- [[tat-app-ws Backend]] · [[tat-prereq]] · [[tat-ws]]
- [[Index|Work Index]]
