---
date: 2026-11-18
description: "The exam shuffled answer texts under fixed letters and graded the letter; a follow-up sweep closed foreign answers, the client-only time limit and the answer key"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
---

# Exam Grading Compared Letters, Not Answers

**Status (as of 2026-11-18):** fixed in [[tat-app-ws Backend]] `3cc5ecee`. A follow-up sweep added `2f317c8b`, `1cd9cd6f` and `970f6120`. All on dev `970f6120`, prepod `f1ed5687` and master `529297ed`. **Not run in the exam portal or against a database; it needs an API redeploy.** No Jira ticket; Qusai reported it.

## Context

Qusai's example: the bank stores "What is the grass color?" with A green (correct), B blue, C red. The exam showed the answers shuffled. A trainee who picked green under its new letter got 0, because the system checks that the letter equals `A`, not that the chosen text is the correct one.

## Root cause

Two bugs in `ExamSubmissionService` (`libs/database/src/lib/exam-submission/exam-submission.service.ts`):

1. **Texts were shuffled under fixed letters.** `shuffleAnswerTexts` (Hamza, `5d354f33`, 2025-11-17) kept the labels A/B/C in order and shuffled which text sat under each. `submitAnswer` graded `correctAnswer.label === selectedAnswer` against the **bank**, so the trainee's on-screen letter was compared with the bank letter of a different text.
2. **The order was never saved.** Only the first `getExamData` call (status NOT_STARTED) shuffled. Every later call (IN_PROGRESS) returned **bank order**, so the same letter meant a different answer before and after a refresh.

The exam portal (`apps/exam-portal`, inside tat-app-ws) fetches the exam data once the exam has started (`refetchInterval` is off once the status is `started`), and refetches only on an `online` reconnect. So most trainees answered on the shuffled screen. A trainee whose page reloaded was graded correctly by accident, which likely hid the bug (inferred).

**Also found:** the trainee's own responses (`submit-answer`, `my-answers`, complaint) returned `isCorrect` during the exam, so developer tools showed whether each answer was right.

## Fix

[[tat-app-ws Backend]] `3cc5ecee`:
- `QuestionResponse.answerOrder` stores the bank labels in on-screen order. Screen position *i* is labelled by the *i*-th letter of the sorted order.
- `getExamData` shuffles whole answers (each text keeps its bank letter) once and saves the order on the responses. Reloads rebuild the screen from the saved order.
- `submitAnswer` maps the on-screen letter to the bank letter, only when the saved order still matches the question's answers, then grades and **stores bank letters**. Admin submission details, question analysis and statistics therefore stay correct unchanged.
- `mapSubmissionToResponse(traineeView)` returns on-screen letters and drops `isCorrect` and `correctAnswer`. The portal never read them.
- Submissions without `answerOrder` (exams in progress at deploy) keep bank order and pass letters through unchanged, which grades correctly.

No exam-portal change: it shows and sends whatever `label` the API gives it.

## Affected areas checked

| Area | Result |
|---|---|
| Trainee screen, answering, restoring answers after refresh | Fixed (backend only) |
| Grading, `finishExam`, recalculation, cancelled questions | Fixed: graded in bank letters |
| Admin submission details, question analysis, `my-submissions` | Correct: they read bank letters |
| Online-course exams (`online-course-exam.service`) | Not affected: options A/B/C stay in place, graded against `correctAnswers` saved on the attempt |
| `socket.gateway` answered count | Unaffected (counts non-null answers) |

## Evidence

- The new specs run against the **old** service: `Tests: 3 failed, 5 passed`. The failures are: grading the shuffled text, a wrong text under the bank's correct letter, and the same order after a reload.
- With the fix: `Tests: 8 passed, 8 total`, including a legacy submission without `answerOrder`.
- API and exam-portal `tsc` exit 0. ESLint not runnable locally (`@nx/eslint-plugin`).

## Still open

- [ ] Redeploy the API, then on staging: start an exam, answer the correct text under its shuffled letter, refresh (the order must stay the same), finish, and check the score.
- [x] ~~Past results~~: no action. Old exam data is gone and the system is otherwise empty (Qusai, 2026-11-18). Before that, grading would have been about 1-in-3 correct by chance (inferred).
- [x] ~~`finishExam` returns the answer key~~: fixed in `2f317c8b`, see below.
- [ ] A trainee can still extend their time by staying disconnected while posting answers. This is accepted: the pause on disconnect is a business rule.
- [ ] `my-submissions` still returns `correctAnswer` for published exams. Left as is; no frontend consumer found.
- [ ] Tell Hamza: his code, and the submission schema gained `answerOrder`.

## Follow-up sweep (2026-11-18)

A sweep for the same kinds of bug (grading the wrong thing, random state not saved, trusting what the client sends, answer leaks, silent defaults) found five more. None overlaps Hamza's open tickets (TAT-598, 597, 599, 591).

| # | Defect | Fix |
|---|---|---|
| 1 | `submitAnswer` never checked that the question belonged to the trainee's exam; it pushed a new response. The score is correct ÷ `responses.length`, so extra known answers raised it | `2f317c8b`: a non-exam question is a 400 |
| 2 | The time check was `remainingSeconds === 0` on a Redis snapshot refreshed only by `getExamData` or a disconnect. The limit was effectively enforced only by the exam portal | `2f317c8b`: `sessionRemainingSeconds` subtracts the time since the last snapshot, with a 5 s grace; paused timers unchanged |
| 3 | `finishExam` returned `submission.toObject()`, so every `correctAnswer` reached the trainee. The portal ignores the response | `2f317c8b`: returns the trainee view plus score and pass/fail |
| 4 | The bulk upload's `parseCorrectLabel` turned anything other than exactly `answer_a/b/c` into A silently; level and category defaulted the same way | `1cd9cd6f`: row error; accepts A/B/C, `answer_x`, `option_x`. See [[Question Bank Bulk Upload - A Feature That Only Reported Success]] #9 |
| 5 | Question selection used the biased `sort(() => 0.5 - Math.random())` | `970f6120`: one shared `shuffle` in `libs/helpers/src/lib/common/shuffle.ts`, also used for answer order |

**Not changed:** pausing on disconnect, a business rule per Qusai (a dropped connection gives the trainee extra time). Online-course exams were checked and are not affected (validated A/B/C, no option shuffle, key hidden until review).

**Evidence:** the exam specs on dev before the fix: `Tests: 5 failed, 8 passed` (the foreign-question answer was accepted and finish returned `correctAnswer`; the 3 timer tests failed because the helper did not exist yet). With the fixes: `Tests: 13 passed, 13 total`. Temporary parser test (deleted): `answer_a`→A, `Answer B`→B, `option_b`→B, `b)`→B; `D`, `""` and `answer` → null; level `4`/`hard` → null; category `B1-B2` → B1/B2, `A` → null. Shuffle spec: `Tests: 2 passed` (each position within 3% over 30k runs). API `tsc` exit 0.

`2f317c8b` and `1cd9cd6f` reached `origin/dev` before the sync without being pushed from this session, most likely through the editor's Git sync (inferred).

## Related

- [[Live Exam Failure]]: the same family, state computed once at an event and never re-derived
- [[Exam Submissions Never Created - Enroll Before Compose]]
- [[Online-Course Exam Timeout - Backend Bug]]: the separate online-course exam flow
- [[Question Bank Bulk Upload - A Feature That Only Reported Success]]: defect #9 from the sweep
- [[Gotchas - Backend Schema & Data#A check only the client enforces is not a check — exam answers, time and answer key (2026-11-18)]]
- [[Gotchas - Backend Schema & Data#A shuffle that isn't saved is a different exam on every load — save the order, grade by identity (2026-11-18)]]
- [[tat-app-ws Backend]]
