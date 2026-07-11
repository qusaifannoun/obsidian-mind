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

> [!success] Fixed + pushed to `dev` (2026-07-12) — and the cycle ran end to end for the first time
> Eligibility fix: [[tat-app-ws Backend]] `9da69984` · [[tat-ws]] `1862d90`. **Verified on staging: the fresh instructor appeared, was added, the evaluator submitted, the TM signed, and the History Form flipped to `APPROVED`** — the first complete sit-in in the product's history.
>
> Driving it for real then surfaced **four latent bugs** behind the old deadlock (see [[#Bugs found by walking the path]]) plus a visibility gap (no way to see who'd been added). All fixed: `0bab2340`, `b5e0ddc1`, `5b60f193`, `0c1f1cbb` (backend) · `ecea1c3`, `1669a89`, `9cb360f` (FE).

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

## Bugs found by walking the path

Unblocking the deadlock didn't reveal one bug — it revealed **every bug downstream of it**, all at once. None were regressions; all had been unreachable since TAT-421 shipped. See [[Gotchas#Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)]].

1. **Completed sit-in 404'd and rendered as an empty section** (`0bab2340`). `completeFinalAssessment` sets `status = APPROVED` **and** `active = false` together, but `getSitInForTrainee` queried `active: true` — so approving the sit-in is exactly what made it invisible. The FE was already correct (`SitInSection.tsx:177` renders an approved sit-in read-only); it only showed empty because the 404 made `sitIn` null.
2. **The Instructors list showed a completed instructor as "No sit-in" / "Unassigned"** (`0c1f1cbb`). Same `active: true` trap — **in an endpoint I'd written myself that morning**, before I understood the field. See [[Gotchas#`StaffSitIn.active` means "in progress", NOT "exists" — completing the flow makes the record invisible (2026-07-12)]].
3. **`SIT_IN_CREATED` recorded the instructor as the actor** (`b5e0ddc1`). `createForPeriodCourseEnrollment` passed `instructorUserId` as `triggeredBy`, so the audit trail claimed the instructor created their own sit-in when an SA/TM had clicked Add Instructor. Every other event in the chain records the real actor. **An audit trail that misattributes is worse than one that's missing** — it doesn't look broken, it looks like a different fact.
4. **`sit_in_moved` had no label** (`9cb360f`) — rendered as a raw enum string in the Activity Log.

## Instructors tab — the visibility gap

Adding an instructor produced **no feedback at all**: they're deliberately excluded from the trainee table, and no endpoint existed to read them back. AC-05 forbids mixing instructors *into* the trainee list — it doesn't forbid showing them — so a separate tab satisfies it.

- **`GET /enrollment/instructors/:courseId`** (`5b60f193`) — each enrolled instructor with sit-in status, assigned evaluator, and date added. Reuses the `GET_ELIGIBLE_COURSE_INSTRUCTORS` action rather than minting a new `SystemAction`, which would mean re-running the **destructive** role-action seeder.
- **Two tabs** `Trainees (n) | Instructors (n)` (`ecea1c3`), Trainees default. **Add Instructor moved out of the page header into the Instructors tab** — it had been sitting above a trainee table it has nothing to do with, which is *why* adding someone looked like a no-op.
- **Search + status filter** (`0c1f1cbb` / `1669a89`) — debounced free text (name/email) + a dropdown (`awaiting evaluator` / `awaiting TM review` / `approved` / `no sit-in`). `none` is a first-class filter option because "enrolled but no sit-in record" is a genuine broken state worth being able to hunt for.

The status column is the real value: the onboarding progression was previously **invisible everywhere in the product**.

## What is NOT fixed (deliberately out of scope)

- **Teaching/examining assignment keeps the TAT-424 rule.** `course.service.ts`, `schedule.service.ts`, and the instructor pickers are untouched — 424 is correct where it belongs. Only the *pre-qualification* sit-in path is exempt.
- **`tor.aircraftTypeIds` is still never populated**, so aircraft-type courses still return **zero** eligible instructors for real teaching assignment. This fix only routes around it.
- **TAT-424 AC-09 has no TOR gate at all on assessor/assessment assignment** — `staff-assessment.service.ts` doesn't even import the eligibility service.

## Open

- [x] **Staging E2E: the full cycle ran end to end (2026-07-12)** — fresh instructor appeared → added → evaluator submitted → TM signed → HF `APPROVED`. First time ever.
- [x] `SIT_IN_MOVED` label added to `EVENT_LABELS` in [[tat-prereq]] (`9cb360f`)
- [ ] **Confirm the TOR actually activated** after HF `APPROVED` — that's the last link in the bootstrap chain (`staff-tor-sync.processor`) and the whole point of the fix. Not yet verified.
- [ ] **Verify the move path on staging** — none of it has been exercised: the Move confirmation, the soft-delete of the old enrollment, the `SIT_IN_MOVED` audit row, the 409 at `pending_tm_review`, and the stranded-evaluator notification
- [ ] Verify the "Sit-In Moved To Another Course" notification setting actually seeds on deploy — `sendNotification` silently no-ops if the setting is missing (see [[Gotchas#Bootstrap silently SKIPS any notification setting with no mapping entry (2026-07-12)]])
- [ ] Comment on TAT-424 / TAT-429 recording the exemption, so the TOR filter isn't reinstated
- [ ] **Remove-instructor endpoint** — nothing in the codebase can un-enroll an instructor from a course. Deferred deliberately; can largely reuse `deactivateForMove`
- [ ] Separate ticket for the `aircraftTypeIds` keystone gap

## Related

- [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]]
- [[Stale Sit-In Index & Orphaned Instructor Enrollments]] — the other sit-in bug, same week, same seam
- [[History Form Audit Log]] — where `SIT_IN_MOVED` lands
- [[TAT-409 Bug & Gap List]] · [[TAT-409 Ticket Groups & Inspection Map]]
- [[tat-app-ws Backend]] · [[tat-ws]] · [[tat-prereq]]
- [[Debugging & Root Cause Analysis]] — traced an empty dropdown to a circular dependency across four services
- [[Systems Thinking]] — the two tickets were each internally coherent; the bug lived in the gap between them
