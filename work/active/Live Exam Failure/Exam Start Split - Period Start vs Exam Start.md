---
date: 2026-09-22
description: "startExam and startExamPeriod write disjoint state and the invigilator app only calls one of them — POST /exam/:examId/start is an orphan no frontend reaches"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-app-ws
---

# Exam Start Split — Period Start vs Exam Start

**Diagnosed, deliberately NOT fixed.** One of three root causes found in a single live exam — see [[Live Exam Failure]].

## The split

Two "start" operations exist, and they write disjoint state:

| | `POST /exam/:examId/start` (`startExam`) | `POST /exam/:examId/period/:periodId/start` (`startExamPeriod`) |
|---|---|---|
| `exam.status = STARTED` | sets it | never touches it |
| `schedule.actualStartTime` | never touches it | sets it |
| socket event | `exam-started` (full exam data) | `exam-period-started` (details payload) |

`exam.service.ts:1367` is the **only** line in the exam flow that sets `actualStartTime`, and it lives inside `startExamPeriod`.

The consumers are split to match. The student-facing "is my exam live?" check, `checkStartedExamPeriod` → `checkIfTraineeHasStartedExamPeriod`, matches purely on `actualStartTime: { $ne: null }, actualEndTime: null` and never reads `exam.status`. Meanwhile `getExamData` throws `Exam has not started yet` unless `exam.status === STARTED`.

## Why it is unresolved

The invigilator mobile app ("Attendance Tracking") has **no Start Exam control** — its exam screens offer *View Trainees*, *Disqualify* and *End Exam* only. And no frontend in any repo calls `POST /exam/:examId/start`; tat-portal's `startExam` is the unrelated online-course flow. **It is an orphan endpoint.**

That argues starting the period should start the exam. But `startExam` carries its own `START_EXAM` permission and action guard, distinct from `START_EXAM_PERIOD`, which argues the two-stage flow is deliberate and the mobile app is simply missing its second call.

`endExam` requires `exam.status === STARTED`, so while the exam never transitions, the mobile app's **only** lifecycle control is also dead.

## What was tried

A patch adding `await this.startExam(examId, user)` to the end of `startExamPeriod` was written and then **reverted** — the DB showed `status: "started"` already, which contradicted the inference the patch was built on. Reverting was the right call: the submission gap ([[Exam Submissions Never Created - Enroll Before Compose]]) turned out to be the actual cause of the reported symptom.

## Unresolved anomaly

The exam document was read twice with **identical `updatedAt` (`11:56:41.955`) and different `status`** — `"approved"` in one read, `"started"` in the next. Every path that writes `status` goes through Mongoose with `timestamps: true` and would bump `updatedAt`. So either the status was edited directly in a GUI, or one read was stale. Never resolved, and worth knowing before trusting a future test run — mongosh writes bypass Mongoose timestamps, so a raw `updateOne` produces exactly this signature.

## Action Items
- [ ] Decide: mobile app calls `POST /exam/:examId/start` after starting the period, **or** `startExamPeriod` starts the exam. Until then a started period leaves an exam that cannot be ended
- [ ] Identify what wrote `status` without touching `updatedAt`

## Related
- [[Live Exam Failure]]
- [[Exam Submissions Never Created - Enroll Before Compose]]
- [[Certificate Eligibility Is a Snapshot]]
- [[tat-app-ws Backend]], [[TAT Platform]]
