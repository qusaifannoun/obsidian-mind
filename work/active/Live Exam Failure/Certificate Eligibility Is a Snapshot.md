---
date: 2026-09-22
description: "Certificates are computed once at course completion, so a trainee who becomes eligible later gets nothing — and one who becomes ineligible keeps a valid certificate"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Certificate Eligibility Is a Snapshot

**Reported by Qusai:** *"i completed the course as a trainee, and i failed, then the super admin opend the exam analysis, and canceled 2 question and now i passed but the thing is the course certeficate is not generated"*

One of three root causes found around a single live exam — see [[Live Exam Failure]].

## Root cause

Certificate issuance is **one-shot and event-driven**. `autoGenerateCertificatesForCourse` (`certificate.service.ts:141`) runs when the course completes — from `period-cron.service.ts:152` and `:247` — and for each trainee calls `checkTraineeEligibility`, which requires every exam on the course's schedules to be passed (`certificate.service.ts:834`):

```ts
if (!submission || !submission.passed) {
  return { eligible: false, reason: `Exam "${exam.title}" not passed` };
}
```

At completion the trainee had failed, so they were skipped — logged, then moved past.

Cancelling a question afterwards calls `cancelQuestion` (`exam.service.ts:2604`), which marks responses `isCancelled` and calls `recalculateSubmission` to recompute `percentageScore` and `passed`. **That is its entire effect.** Re-grading had no path back into issuance, and the course had already completed so the cron will never fire for it again. The trainee ends up `passed: true` with nobody left to notice.

## Fix

`55e4e1c5` — `cancelQuestion` calls `autoGenerateCertificatesForCourse(exam.courseId)` after the submissions are recalculated.

No extra conditions were needed: the method already no-ops unless the course is `COMPLETED`, re-checks eligibility per trainee, and `generateCertificate` returns null when a certificate already exists. So it issues for exactly the newly-passed trainees. `CertificateService` was **already injected into `ExamService` and never called** — someone wired this up for this case and did not finish it.

Wrapped in `try/catch` deliberately: a certificate failure must not roll back a cancellation that has already been written to `exam.cancelledQuestions` and every submission.

## Manual recovery

The stranded certificate was issued by hand via the existing trigger, which is safe to re-run (course-status gate + per-trainee eligibility + skip-if-exists):

```
POST /certificates/auto-generate/<courseId>
```

## The bigger shape — still open

`checkTraineeEligibility` (`certificate.service.ts:770`) reads **four** inputs. Only the fourth now re-triggers issuance:

1. absence rate, via `attendanceService.calculateAbsenceRate`
2. `enrollment.status !== DENIED`
3. `enrollment.examEligible` — written at `enrollment.service.ts:942`
4. every exam submission `passed` ← fixed

Change any of the first three after completion and this bug reproduces exactly.

**The inverse is worse and wholly unhandled.** `revoke` exists (`certificate.service.ts:2029`) but nothing invokes it automatically, so disqualifying a trainee *after* issuance leaves a valid certificate asserting they passed a course they were disqualified from. For an aviation training record that is the more serious direction.

The general fix is to re-evaluate certificate state whenever an eligibility input changes, rather than bolting a call onto each mutation site — a design change, not a one-liner.

## Action Items
- [ ] Decide how to handle the revoke direction — disqualification after issuance currently leaves a valid certificate
- [ ] Decide whether attendance corrections and `examEligible` flips should re-trigger issuance
- [ ] Watch the cancel → certificate path fire end to end; only `autoGenerateCertificatesForCourse` itself is proven, via the manual Swagger call

## Related
- [[Live Exam Failure]]
- [[Exam Submissions Never Created - Enroll Before Compose]]
- [[Exam Start Split - Period Start vs Exam Start]]
- [[TAT Certificates - Open Items]] — the online-course certificate system, separate from this one
- [[tat-app-ws Backend]], [[TAT Platform]]
