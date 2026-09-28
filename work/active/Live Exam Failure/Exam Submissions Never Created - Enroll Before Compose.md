---
date: 2026-09-22
description: "Enrolling trainees before an exam is composed silently creates no submission, and nothing back-fills it — so getExamData 404s forever and the trainee is never told the exam started"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Exam Submissions Never Created — Enroll Before Compose

**Reported by Qusai:** *"we started the exam on the mobile app, and the exam portal didnot show that, and the students didnot see the exam eventhough it started"*

One of three independent root causes found in a single live exam — see [[Live Exam Failure]] for the set. The other two: [[Exam Start Split - Period Start vs Exam Start]] and [[Certificate Eligibility Is a Snapshot]].

## Root cause

Exam **enrollments** are keyed on the *schedule*, not the exam. `course-enrollment-cron.service.ts:227` builds them from `examSchedule._id` with no reference to an exam document, then looks the exam up **afterwards** (`:197`). Submission creation is guarded:

```ts
if (exam) {
  await this.examSubmissionService.createInitialSubmission(...)
} else {
  this.logger.warn(`No exam found for schedule ${examSchedule._id}, skipping submission creation for trainee ${enrollment.traineeId}`);
}
```

So enrolling **before the exam is composed** creates the enrollment and no submission. Nothing back-fills: `createInitialSubmission` had exactly two callers — this cron and manual enrollment creation (`exam-enrollment.service.ts:415`) — and composing or approving an exam later calls neither.

`getExamData` (`exam-submission.service.ts`) then throws `Exam submission not found` for that trainee, permanently.

## Why nobody was told

`startExam` builds each trainee's socket payload by calling `getExamData` inside a `try/catch` that only `console.error`s (`exam.service.ts:1211-1217`). The trainee whose submission is missing throws, so **`exam-started` is never emitted for them** — while the exam runs normally for everyone who does have a submission. A per-trainee data failure was indistinguishable from a healthy exam.

## Evidence

Exam `6ab25a73bebdf203ddf97ee9`, schedule `6ab243d8bebdf203ddf93dee`, trainee *mohammed thyab*.

```
db.examsubmissions.countDocuments({ examId: ObjectId("6ab25a73bebdf203ddf97ee9") })
=> 0
```

The mobile invigilator app's badge read **"On going"**, and `determinePeriodStatusMobileView` (`exam.service.ts:2279`) returns `Ongoing` only when `actualStartTime` is set — so the period genuinely had started. The trainee's portal sat on *"Connecting you shortly…"* while correctly rendering exam name, phase, chapters, question count and duration: `formatExamPeriodStartedPayload` had arrived, `getExamData` had not.

## Fix

`0a2fdb1d` — `getExamData` calls `createInitialSubmission` before the submission lookup instead of throwing, placed **after** the enrollment-exists and `QUALIFIED` guards so a submission is never conjured for someone not properly enrolled. Heals both entry points at once, since `startExam`'s per-trainee loop goes through the same function.

Same commit rewrote `createInitialSubmission` from `findOne`-then-`create` to an atomic `findOneAndUpdate` + `$setOnInsert` + `upsert`. The old read-then-write was racy, and the fix makes concurrent first-calls routine (portal polling plus `startExam`). There is **no unique index on `{examId, traineeId}`**, so the race is narrowed, not closed.

`2c334e2d` — the exam-portal waiting room now polls every 5s until `status === "started"`. The `refetchInterval` was already written in `useFetchExamData.ts` and commented out; re-enabled at 5s rather than the authored 1s, since that endpoint does four DB round-trips plus question decryption per call.

`ba964070` — removed a stray `@OnEvent("exam-earted")` decorating the private `getToken` in `socket.gateway.ts`. Dead, unrelated.

## Confirmation — accidental and clean

Preprod redeployed with the fix while nothing else changed: the exam was still `status: "started"` with `startedAt: 11:56:41.954`, and the reset script had never been applied. The trainee got in immediately. Qusai: *"i didnt do anything and now the trainee sees the exam"*.

That also means the **backend fix alone was sufficient** — preprod's `deploypreprod.yml` builds `Dockerfile.api` only and never ships `exam-portal`, so the polling was not live when it started working.

## Action Items
- [ ] Add a unique index on `examsubmissions {examId, traineeId}` to close the upsert race properly — needs a migration and a duplicate check first
- [ ] Decide whether composing/approving an exam should back-fill submissions for already-enrolled trainees, rather than relying on read-time self-heal

## Related
- [[Live Exam Failure]] — the other two root causes from the same exam
- [[Exam Start Split - Period Start vs Exam Start]]
- [[Certificate Eligibility Is a Snapshot]]
- [[tat-app-ws Backend]], [[TAT Platform]]
- [[Gotchas - Backend Services & Environment]]
