---
date: 2026-07-12
description: "The Add Instructor eligible list applied TAT-424's Active-TOR rule to the sit-in path, creating a circular dependency that made new-instructor onboarding impossible; removed the gate and added move semantics"
tags:
  - work-note
status: active
quarter: Q3-2026
team: Backend
aliases:
  - TAT-429
---

# TAT-429 Sit-In Eligibility & Move Semantics

A freshly created instructor never appeared in **Add Instructor** on an aircraft-type course's Course Enrollment page ([[tat-ws]] `/course-enrolment-managment/{id}`). The BA's instinct was right: TOR status should not gate this list at all.

> [!success] Fixed + pushed to `dev` (2026-07-12)
> Backend [[tat-app-ws Backend]] `9da69984` · Frontend [[tat-ws]] `1862d90`. `nx run api:build` + tsc clean. **Staging E2E pending** — the loop this unblocks has never once run end to end.

## What a sit-in actually is

Onboarding for a *new* instructor. You enroll them into a live course **as a student**, sitting alongside the trainees, to learn from the instructor teaching it. That teaching instructor is the evaluator: they confirm attendance on the sit-in page, and a reviewer approves. The approved sit-in unlocks the [[Staff Management Subsystem & TOR Model|History Form]], which activates the TOR, which finally makes them eligible to *teach*.

So the person being added has **nothing** by definition — no license, no aircraft qualification, no active TOR, no sit-in.

## Root cause: a circular dependency

`getEligibleCourseInstructors` applied [[#The TAT-424 ↔ TAT-429 contradiction|TAT-424's]] Active-TOR filter. That closes a loop:

```
TOR becomes ACTIVE  ← requires History Form APPROVED   (staff-tor-sync.processor.ts:155-178)
History Form APPROVED ← requires sit-in final assessment (assertHistoryFormReadyForApproval)
sit-in created        ← ONLY by addCourseInstructor      (sole sitInModel.create in the repo)
addCourseInstructor   ← required an ACTIVE TOR
```

**To get an Active TOR you need a sit-in; to get a sit-in you need an Active TOR.** A new instructor could never be bootstrapped. See [[Gotchas#Sit-in eligibility was circular — the TOR gate made new-instructor onboarding impossible (2026-07-12)]].

Staff creation auto-provisions three **DRAFT** TORs (CARC/EASA/GCAA) with `aircraftTypeIds: []` plus a History Form (`provisionInstructorTors` → `ensureForUser`). So the fresh instructor failed the TOR gate *twice over*: DRAFT status, and — because the course had an aircraft type — an empty `aircraftTypeIds` that `AC-10`'s clause can never match ([[Gotchas#`tor.aircraftTypeIds` is never populated — the keystone gap (2026-07-05)|the keystone gap]]).

## The TAT-424 ↔ TAT-429 contradiction

Both tickets carry exactly one comment — a lone "Approved" from the BA, 13 days apart. **Nobody noticed they conflict.**

- **TAT-429 AC-03** defines the list as: *has not completed required sit-ins* + *is not yet assigned to the course*. No TOR condition. Its story sentence even says "instructors who **still require Sit-In completion**" — who by definition cannot have an Active TOR.
- **TAT-424 AC-09** sweepingly applies the Active-TOR rule to "Course instructor assignment", and **AC-08** forbids any role from overriding it.

TAT-424 was approved first and written as a global rule; whoever implemented it applied that rule to TAT-429's endpoint. **424's AC-09 over-reached.** The fix implements 429 as written for the first time — the deviation is what was in `main`.

## Changes

**Backend** (`enrollment.service.ts`):
- Dropped `findEligibleUserIds` from `getEligibleCourseInstructors` and `assertTorEligibleForAssignment` from `addCourseInstructor`. `StaffTorAssignmentEligibilityService` removed from the constructor — no dead dependency to tempt a revert.
- The list is now AC-03 + `staffStatus: ACTIVE` + **History Form exists**. That last gate stays because `assertHistoryFormReadyForApproval` throws `404 historyFormNotFound` — a sit-in without an HF can be created but never finalised. It is effectively "has at least one TOR, any status", which is exactly *regardless of TOR **status***, not regardless of TOR existence.
- Dropped `alreadyInstructorEnrolled` from the DTO — hardcoded `false`, unreachable, unconsumed.

**Move semantics** — adding an instructor who already has an active sit-in now *moves* them:
- Old enrollment soft-deleted (`deletedAt`), old sit-in set `active: false` (status stays non-`APPROVED`, so they correctly remain sit-in-eligible — no enum change needed).
- New `SIT_IN_MOVED` audit event; the stranded evaluator is notified ("Sit-In Moved To Another Course").
- **409 if the old sit-in is already `pending_tm_review`** — never silently discard a submitted evaluator assessment.
- **Teardown runs last**, after the new sit-in is created. Failing mid-way leaves two active sit-ins (recoverable, and `assertHistoryFormReadyForApproval` refuses them) rather than destroying the old one irrecoverably. Same compensate-on-failure lesson as [[Stale Sit-In Index & Orphaned Instructor Enrollments]].

**Frontend** ([[tat-ws]]): the Add button reads **Move** for an instructor with a pending sit-in and opens a confirmation naming the course they'd be pulled out of.

## What is NOT fixed (deliberately out of scope)

- **Teaching/examining assignment keeps the TAT-424 rule.** `course.service.ts`, `schedule.service.ts`, and the instructor pickers are untouched — 424 is correct where it belongs. Only the *pre-qualification* sit-in path is exempt.
- **`tor.aircraftTypeIds` is still never populated**, so aircraft-type courses still return **zero** eligible instructors for real teaching assignment. This fix only routes around it.
- **TAT-424 AC-09 has no TOR gate at all on assessor/assessment assignment** — `staff-assessment.service.ts` doesn't even import the eligibility service.

## Open

- [ ] Staging E2E: fresh instructor appears → add → evaluator submits → TM assesses → HF `APPROVED` → TOR activates. **This loop has never run end to end.**
- [ ] Verify the "Sit-In Moved To Another Course" notification setting actually seeds on deploy — `sendNotification` silently no-ops if the setting is missing (see [[Gotchas#Bootstrap silently SKIPS any notification setting with no mapping entry (2026-07-12)]])
- [ ] Add the `SIT_IN_MOVED` label to `EVENT_LABELS` in [[tat-prereq]] so it renders in the [[History Form Audit Log|Activity Log]]
- [ ] Comment on TAT-424 / TAT-429 recording the exemption, so the TOR filter isn't reinstated
- [ ] Separate ticket for the `aircraftTypeIds` keystone gap

## Related

- [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]]
- [[Stale Sit-In Index & Orphaned Instructor Enrollments]] — the other sit-in bug, same week, same seam
- [[History Form Audit Log]] — where `SIT_IN_MOVED` lands
- [[TAT-409 Bug & Gap List]] · [[TAT-409 Ticket Groups & Inspection Map]]
- [[tat-app-ws Backend]] · [[tat-ws]] · [[tat-prereq]]
- [[Debugging & Root Cause Analysis]] — traced an empty dropdown to a circular dependency across four services
- [[Systems Thinking]] — the two tickets were each internally coherent; the bug lived in the gap between them
