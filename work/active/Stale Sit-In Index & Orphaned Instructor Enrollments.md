---
date: 2026-07-10
description: "A schema rename left a unique non-sparse index on staffsitins, breaking every sit-in insert since 2026-06-26 and leaving orphaned instructor enrollments that silently hide instructors from the eligible list"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Stale Sit-In Index & Orphaned Instructor Enrollments

Adding an instructor to a course on staging returned `500 E11000 duplicate key error collection: tat-dev.staffsitins index: enrollmentId_1 dup key: { enrollmentId: null }`. Retrying returned a different, misleading `400 "Instructor is not eligible for course enrollment"`. Two faces of one bug.

Repro: `POST /api/enrollment/instructors/add/:courseId` from [[tat-ws]]'s `AddInstructorModal.tsx`. The frontend is not at fault.

## Root cause

`cd30796b` (TAT-429, 2026-06-26) renamed `StaffSitIn.enrollmentId` → `periodEnrollmentId`. The new field is correctly `unique + sparse`. The **old** `enrollmentId_1` index — `unique`, **not** sparse — was never dropped, because `autoIndex: true` creates indexes but never removes them.

Nothing writes `enrollmentId` anymore, so every new sit-in has the field absent. A non-sparse index records absent as `null`. Doc #1 indexed on `null`; doc #2 collided. **Every `sitInModel.create()` on staging has failed since 2026-06-26** — the instructor-add path is just where it surfaced. See [[Gotchas - Backend Schema & Data#`autoIndex: true` creates indexes but NEVER drops them — renaming an indexed field leaves a live unique constraint (2026-07-10)]].

## Why the second error looked unrelated

`addCourseInstructor` wrote the `Enrollment` first, then the sit-in, with no transaction and no rollback. The failed sit-in left the enrollment behind as an orphan.

`getEligibleCourseInstructors` excludes anyone already enrolled (`assignedInstructorIds.has(userId) → false`). So the orphan made the instructor **ineligible**, and since the eligibility check ran *before* the duplicate check, the retry threw `courseInstructorNotEligible` instead of a conflict. The `ConflictException(courseInstructorAlreadyEnrolled)` at the old line 1347 was **unreachable dead code** for exactly this reason.

The nasty part: an affected instructor simply disappears from the eligible-instructors dropdown. No error, no signal. Anyone who hit the 500 and gave up left an instructor quietly unselectable for that course.

## Fixes

**Migration** — `scripts/migrations/2026-07-10-drop-stale-sitin-indexes.js`. Dry-run by default, `--apply` to write. Drops `enrollmentId_1` and the also-stale `userId_1_courseCode_1_active_1` (leftover from the removed `courseCode` field), then finds instructor enrollments with no matching sit-in and **soft-deletes** them (`deletedAt`, matching the `Base` schema's soft-delete plugin — not a hard delete).

**Service** — `enrollment.service.ts`:
- Duplicate check moved **above** the eligibility check, so the specific 409 wins over the generic 400.
- Sit-in creation wrapped in try/catch; on failure the just-created enrollment is deleted and the error rethrown.

Chose a compensating rollback over a real transaction: `createForPeriodCourseEnrollment` also writes audit logs through a shared helper, and threading a session through all of it is a much larger refactor. This repo currently uses **zero** transactions anywhere. Worth revisiting — Atlas is a replica set, so `startSession()` is available.

## Status

- [x] Migration script written
- [x] Service rollback + check reorder — `nx run api:build` and `tsc --noEmit` clean. Committed `dev` `30610307`
- [x] **Migration run against staging (2026-07-11)** — dropped `enrollmentId_1` + `userId_1_courseCode_1_active_1`; soft-deleted **2 orphan enrollments** ("Tor Instructor Dev → Test Course", "Qusai Fannoun → Test Course 2"). Post-apply dry run confirms 0 stale indexes / 0 orphans. (The earlier Atlas `ReplicaSetNoPrimary` was an IP-allowlist rejection surfacing as a TLS `internal error` alert, not a connectivity or cert problem — resolved once the egress IP `188.123.164.132` was whitelisted.)
- [x] Handoff explainer written + **sent to team by email** (2026-07-11); the repo README copy was removed
- [ ] Re-verify the original request (instructor `6a4d245e…`, course `6a50caf9…`) returns 200. Note: neither cleaned-up orphan was that exact instructor/course pair, so if it still 400s it's a *genuine* eligibility reason (no history form / TOR ineligibility / active schedule), not this bug
- [ ] **Check production for the same stale index** before it bites there — same rename, same `autoIndex` behavior, so prod will fail identically on its second sit-in insert
- [ ] Consider deleting the now-always-`false` `alreadyInstructorEnrolled` DTO field (`enrollment.service.ts:1312`) — enrolled instructors are filtered out entirely, so it can never be true

## Related

- [[Gotchas]] — the `autoIndex` rule this produced
- [[TAT-409 Staff Management Subsystem]] — the sit-in workflow's home epic
- [[tat-app-ws Backend]] · [[tat-ws]]
- [[Staff Management Subsystem & TOR Model]] — domain reference for sit-ins
- [[Debugging & Root Cause Analysis]] — traced a misleading 400 back to a two-week-old schema migration
- [[Systems Thinking]] — the failure mode (self-concealing orphans) mattered more than the index itself
