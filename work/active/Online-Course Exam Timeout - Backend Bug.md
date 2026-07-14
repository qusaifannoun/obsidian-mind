---
date: 2026-06-23
description: "Backend bug handoff — online-course exam forfeits timed-out attempts unscored instead of scoring saved answers (BA decision). Endpoint-level spec for the backend team."
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q2-2026
project: tat-app-ws
---

# Online-Course Exam Timeout — Backend Bug (Handoff)

> Handoff for the backend team. Repo: [[tat-app-ws Backend]]. Surfaced from a [[tat-portal]] exam-timer bug.

**Component:** `tat-app-ws` — `online-course` exam module
**Severity:** High (users lose paid exam attempts; can also freeze the exam UI)
**BA decision:** When the exam timer reaches 0, the answers saved so far **must be submitted and scored** — not counted as a complete fail.

---

## Summary

The online-course exam backend enforces the time limit at request time with **zero grace and no auto-submit**. Once the deadline passes, the submit endpoint **rejects the submission, marks the attempt `TIMED_OUT`, and discards it unscored** — even though every answer was already persisted incrementally via the per-answer endpoint. Because attempts are limited/paid, a user who runs out of time loses the attempt with no credit for correct answers.

## Current behavior (as coded)

File: `libs/database/src/lib/online-course/online-course-exam.service.ts`

- **Deadline check** (`isTimedOut`, lines 84–88): `Date.now() > startedAt + timeLimitMinutes*60_000` — strict, no grace period.
- **`submitAttempt`** (lines ~395–399): if timed out → sets `status = TIMED_OUT`, saves, throws `BadRequestException("Exam time limit exceeded")` → **HTTP 400, unscored**.
- **`submitAnswer`** (lines ~479–483): same — rejects and marks `TIMED_OUT`.
- **`getAttempt`** (lines ~515–521): an expired `IN_PROGRESS` attempt is silently flipped to `TIMED_OUT` (unscored) on read.
- Answers are saved as the user selects them (`POST .../answer`), so **the data needed to score already exists on the attempt** at the moment of timeout.
- Error strings: `libs/app-data/src/lib/enums.ts:437` `examTimeLimitExceeded = "Exam time limit exceeded"`; `attemptNotInProgress = "Attempt is not in progress"`. Status enum `TIMED_OUT` at `enums.ts:1107`.

## Expected behavior (per BA)

On timeout, **score the answers already saved** and finalize the attempt as a normal submission (PASS/FAIL by the existing threshold). If the user cleared the pass mark, they pass — enrollment completion + certificate generation should run exactly as for an on-time submit.

## Reproduction

1. Start an online-course exam attempt.
2. Answer some questions (each is saved via `POST /online-courses/exam/:attemptId/answer`).
3. Let the timer run past `timeLimitMinutes` without submitting.
4. Call `POST /online-courses/exam/:attemptId/submit`.
   - **Actual:** `400 "Exam time limit exceeded"`, attempt `TIMED_OUT`, no score, attempt consumed.
   - **Expected:** `200` with `scorePercentage` / `passed` computed from saved answers; certificate issued if passed.

## Proposed backend changes

All in `online-course-exam.service.ts`:

1. **Extract a `finalizeAttempt(userId, attempt)` helper** containing the existing scoring + pass side-effects (enrollment → `FINISHED` / `passed`, mandatory-training sync, certificate enqueue). Attempt must be loaded with `+correctAnswers`.
2. **`submitAttempt`** — remove the timeout rejection; always finalize-and-score (whether or not timed out). Keep the `status !== IN_PROGRESS → attemptNotInProgress` guard for genuine double-submits.
3. **`submitAnswer`** — keep rejecting *new* answers after the deadline (can't keep answering), but **do NOT set `status = TIMED_OUT`** — leave it `IN_PROGRESS` so `submitAttempt` can still finalize. (Marking it `TIMED_OUT` here would block scoring.)
4. **`getAttempt`** — when an `IN_PROGRESS` attempt is expired, **finalize-and-score** it (via the helper) instead of marking `TIMED_OUT`. Select `+correctAnswers`; `toAttemptResponse` already strips them, so no answer-key leak.

> Net effect: a finalized timed-out attempt ends as `SUBMITTED` with a real score. The `TIMED_OUT` status is effectively retired from the write paths (existing historical records remain valid).

## Downstream consumers (no breakage expected)

- `online-course-certificate.service.ts:819` — currently maps `TIMED_OUT → "FAIL"`. After the change, timed-out attempts are `SUBMITTED` and flow through the existing `SUBMITTED` PASS/FAIL branch — a passing timed-out user will correctly show **PASS**. ✅ improvement
- `online-course-enrollment.service.ts:203` — refund guard's `$in` list includes `TIMED_OUT`; finalized attempts are `SUBMITTED`, which is already in the list. ✅ no change needed

## Acceptance criteria

- [ ] Submitting after the deadline returns `200` with a score computed from saved answers (no `400`).
- [ ] A timed-out attempt that meets the pass threshold → `passed = true`, enrollment `FINISHED`, certificate generated.
- [ ] A timed-out attempt below threshold → `passed = false`, scored (not a forced 0 / forfeit).
- [ ] Answers cannot be added/changed after the deadline (`submitAnswer` still rejects), but the attempt remains finalizable.
- [ ] Abandoned expired attempts (never submitted) get scored on the next `GET .../:attemptId` rather than left dangling or zeroed.

## Frontend note (already handled in tat-portal)

The portal had a separate, real bug: the auto-submit mutation had **no `onError` handler**, so the backend's `400` was swallowed and the page silently froze (timer stuck at 0, navigation still active, submit did nothing). That is now fixed independently — the FE locks the exam at 0, auto-submits once, shows a retry modal on genuine failures, and currently renders a graceful **"Time Expired – not scored"** result on the backend's `400`. **Once this backend change ships, submit returns `200` and the FE automatically shows the normal scored result** — no further FE change required.

## Related

- [[tat-app-ws Backend]] · [[tat-portal]] · [[TAT Platform]]
- [[TAT-409 Backend Open Items]] — sibling backend handoff doc (same endpoint-level format)
