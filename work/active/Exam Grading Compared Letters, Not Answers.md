---
date: 2026-11-18
description: "Since Nov 2025 the exam shuffled answer texts under fixed letters and never saved the order, so grading compared letters, not the answer the trainee chose"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
---

# Exam Grading Compared Letters, Not Answers

**Status (as of 2026-11-18):** fixed in [[tat-app-ws Backend]] `3cc5ecee`, merged to prepod `ae38675a` and master `9c2f459e`. **Not run in the exam portal or against a database; it needs an API redeploy.** No Jira ticket; Qusai reported it.

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
- [ ] **Past results:** completed exams since about 2025-11-17 were likely mis-graded (inferred from code; about a 1-in-3 chance a correct answer was graded right). They can't be recovered, because the shuffled order was never saved. Needs a business decision (re-sit, review). Offered: a read-only Atlas query counting completed submissions since that date.
- [ ] `finishExam` still returns every question's `correctAnswer` to the trainee: an answer-key leak when bank questions are reused.
- [ ] Tell Hamza: his code, and the submission schema gained `answerOrder`.

## Related

- [[Live Exam Failure]]: the same family, state computed once at an event and never re-derived
- [[Exam Submissions Never Created - Enroll Before Compose]]
- [[Online-Course Exam Timeout - Backend Bug]]: the separate online-course exam flow
- [[Gotchas - Backend Schema & Data#A shuffle that isn't saved is a different exam on every load — save the order, grade by identity (2026-11-18)]]
- [[tat-app-ws Backend]]
