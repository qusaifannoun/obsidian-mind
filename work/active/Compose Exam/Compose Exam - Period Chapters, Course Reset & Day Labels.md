---
date: 2026-09-15
description: "The chapter lookup used the exam period only to find its course; two functions named resetForm left the form uncleared; period day labels counted exam days"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-ws
---

# Compose Exam - Period Chapters, Course Reset & Day Labels

Reported 2026-09-15 on `tat-ws` `/manage-exams/compose-exam`: changing the exam period did not change the chapters, and clearing the course did not clear the form. While fixing it the user also asked for the period dropdown to show the **real course day** with exams numbered in order — "Day n Exam 1, Day nn Exam 2" — instead of "Day 1 Exam 1, Day 2 Exam 1".

Committed on `dev` 2026-09-15, **not pushed**: [[tat-app-ws Backend]] `4b8b3e79` (shared day numbering) + `d8ebb62b` (chapters + day numbers); [[tat-ws]] `de46770` (reset) + `5d5a680` (labels). **Typecheck-only, never run** — see [[#Still open]].

## Root causes

### 1. The chapters endpoint used the period only to find its course

`GET /exam/period/chapters?periodId=…` → `ExamService.getChaptersByPeriod` loaded the period, took its `courseId`, and returned the chapters of **every** EXAM template period in that course via `getChaptersUsedInExamPeriods(courseId)`. It also built an `allCourseChapterIds` set it never used. So every period of a course returned the same list, the page auto-selected all of it, and the chapters field is `disabled={true}` — nothing could change it.

Introduced by `06a07f8d` "fixed getting chapters" (2026-02-02, a teammate). The version before it didn't select by period either.

**Why the fix needed the day number.** A scheduled period (`Schedule`) stores only `date` + `period`; the template (`CourseSchedule`) stores periods under `dayNumber`. And exam periods cannot be matched by chapter, because scheduling writes their `topic` as null:

```ts
// schedule.service.ts — course scheduling
if (period.type === PeriodType.CHAPTER) {
  topicValue = period.topic[0]._id;
}
```

Scheduling sorts template days by `dayNumber` and gives each one its own date, advancing `currentDate` once per day. So a period's template day is **the rank of its date among the course's scheduled dates** — the same rule the trainee schedule already used (`addDayNumbersToSchedules`).

### 2. Two functions named `resetForm`

Clearing the course calls `setShouldReset(true)` (`page.tsx`). The effect watching it lives in `useQuestionGeneration` and called **its own** `resetForm`, which only clears question state (generated chapter ids, question list, pending-change flag). The real form reset — `useComposeExamForm.resetForm`, which calls react-hook-form's `reset()` — was passed only into `useExamSync`, which never called it. The question list cleared; every form field kept its value.

`useExamSync` also fired `setShouldReset(true)` once on mount. Harmless while it reset only question state; **once the real reset was wired in, it would have wiped already-loaded exam data on the edit page**, so it was removed.

### 3. Day labels counted exam days, not course days

`ScheduleService.getAllPeriods` (`GET /schedule/periods`) numbered days by index over the **filtered** result. With `periodType=Exam`, that is a counter over days containing an exam — 1, 2, 3, 4 — and the page labelled options `Exam <periodNumber>`, so "Exam 1" repeated across days.

## Fix

| Repo | Commit | Change |
|---|---|---|
| [[tat-app-ws Backend]] | `4b8b3e79` | `CourseService.getCourseDayNumbers(courseId)` + `scheduleDateKey(date)`; `addDayNumbersToSchedules` now shares `rankScheduleDates` — one implementation of course day numbering |
| [[tat-app-ws Backend]] | `d8ebb62b` | `ExamService.findTemplateExamPeriod` matches template day (date rank) + `periodNumber`; `getChaptersByPeriod` returns only that period's chapters; `getChaptersUsedInExamPeriods` removed. `getAllPeriods` groups by course + date and returns the real course day; `ScheduleService` now injects `CourseService` |
| [[tat-ws]] | `de46770` | `useQuestionGeneration` takes `resetFormValues` and calls it with its own reset; `resetForm` reads `getValues('courseId')` rather than a render-time value; mount-time `setShouldReset` and its two props removed from `useExamSync` |
| [[tat-ws]] | `5d5a680` | options `Day <courseDay>` with `Exam n` numbered in date/time order across the course; `day` typed `number \| null` |

No service depends on `ScheduleService` (only its controller), so the new injection cannot form a cycle — reasoned from code, not booted.

## Evidence

```
$ grep -rn "validateAllScheduleChaptersIncluded" libs apps --include='*.ts'
libs/database/src/lib/exam/exam.service.ts:1789:  private async validateAllScheduleChaptersIncluded(

$ git log -S "validateAllScheduleChaptersIncluded(" --oneline
ccc14615 removed validation on exam creation
5ec113b0 TAT-324

$ npx tsc --noEmit -p apps/api/tsconfig.app.json | grep -E "exam\.service|schedule\.service|course\.service"
(no output)

$ npx tsc --noEmit -p apps/tat-ws/tsconfig.json | grep "error TS"
apps/tat-ws/specs/index.spec.tsx(2,24): error TS2307: Cannot find module '@testing-library/react' or its corresponding type declarations.
```

**Correction made mid-session:** the save-time check `validateAllScheduleChaptersIncluded` was first reported as sharing the same day-less matching bug on the save path. It has **no caller** (removed in `ccc14615`), so it affects nothing; it was left untouched.

## Still open

- **Nothing was exercised.** Per-period chapter lists, the new labels, clearing the course, and the edit flow after removing the mount-time reset are all unchecked in a browser. Built, **not verified** — per [[Patterns - Method & Conventions]].
- **The Nest DI change was never booted**, and nothing works until [[tat-app-ws Backend]] deploys — local tat-ws points at `https://api.tat147.com`.
- **Day numbering rests on two assumptions:** every template day produced at least one scheduled date (a period-less day consumes a date but writes no rows, shifting later numbers by one), and dates keep their order after rescheduling.
- Dead code left as is: `validateAllScheduleChaptersIncluded` still matches `periodNumber` without the day.
- Commits are local on `dev` — but see [[Gotchas - Tooling & Method]] on why "local only" is not a safe claim in these repos.

## Related

- [[tat-ws]] — primary repo
- [[tat-app-ws Backend]] — the chapter lookup and day numbering
- [[Gotchas - Backend Services & Environment]] — scheduled period → template period mapping written up
- [[Course Details Show Schedule]] — the trainee schedule whose day numbering this now shares
- [[Patterns - Architecture & Boundaries]] — one rule, one implementation: day numbering consolidated rather than recomputed per service
