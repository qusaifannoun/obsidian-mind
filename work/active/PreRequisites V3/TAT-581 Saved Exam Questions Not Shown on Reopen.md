---
date: 2026-11-12
description: "Reopening an online course showed 0 of 10 saved questions: the Exam step only copied the fetched questions into the form after an Excel upload"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-ws
ticket: TAT-581
---

# TAT-581 — Saved Exam Questions Not Shown on Reopen

**Status (as of 2026-11-12):** Jira **Ready for Dev**. Fixed in [[tat-ws]] `e81098c5`, on dev, prepod and main. **Typecheck only; not tried in a browser.**

## Context

Ayat's bug (Highest), under TAT-491 PreRequisites V3. An SA creates a With Exam online course, adds 10 questions and saves each one ("All 10 required questions are saved"). After leaving and reopening the course, the Exam Section shows "0 of 10 questions saved" and one blank question. The questions were stored: Ayat's ticket says "GET /api/online-courses/{id}/questions returns all 10, but the page does not show them."

## Root cause

- The exam form state lives in `OnlineCourseSteps` and starts as `DEFAULT_EXAM`, which holds one blank question. On reopen, only the exam settings (duration, count, pass mark) are copied in from the course.
- `ExamStep` does fetch the questions with `useGetOnlineCourseQuestions`, but its effect copied them into the form only when the `syncAfterUpload` ref was set, meaning after an Excel upload. On every other load the fetched list was ignored.
- The "saved" count compares form questions to fetched records by id, so the blank placeholder counted as 0 saved.

See [[Gotchas - Frontend Data & API Contracts#A step that copies a query into form state only after an upload shows nothing on reopen (tat-ws, 2026-11-12)|the gotcha]].

## Fix

[[tat-ws]] `e81098c5`, `manage-courses/add-online-course/_components/steps/ExamStep/index.tsx`:
- The effect also loads the saved records when there are some and the form holds none of their ids. That covers reopening the course.
- Going back and forth between steps keeps edits in progress: once the form holds a saved id, it isn't overwritten.
- The Excel upload path is unchanged and still replaces the list.

## Still open

- [ ] Not tried in a browser: reopening a course, going back and forth with unsaved edits, and an Excel upload. The local dashboard needs a login, and that means entering credentials.
- [ ] Move to READY FOR QA (waiting for Qusai's go-ahead).

## Related

- [[Question Bank Bulk Upload - A Feature That Only Reported Success]]: the same Exam step and question bank
- [[TAT-580 Online Certificate Template Placeholders]]: the same Online Courses batch, 2026-11-12
- [[tat-ws]]
- [[Debugging & Root Cause Analysis]]
