---
date: 2026-09-15
description: "An invigilator with the role as a secondary role never appeared; a 2025 refactor had silently excluded the course creator, and this user created both courses"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Compose Exam Invigilators - Course Creator Silently Excluded

Reported 2026-09-15 on `tat-ws` `/manage-exams/compose-exam`: a user who holds Invigilator as a **secondary** role never appeared in the invigilator list. It looked like the secondary-role gap fixed for trainee pickers on 2026-09-10. **It wasn't.**

Rule removed in [[tat-app-ws Backend]] `ea388a80`. It reached `origin/dev` **and** `origin/master` minutes after being committed, with no push run — see [[#Still open]]. **Typecheck + lint only, never exercised.**

## Root cause — a course-creator exclusion with no stated reason

`GET /exam/invigilators/chapters` → `InvigilatorManagementService.getAvailableInvigilatorsForChapters` starts from every user whose `role` **or** `secondaryRoles` is Invigilator — the secondary-role match was always correct — and then filters out:

1. **the course's `createdBy` user** ← the cause
2. instructors who taught one of the exam's chapters in this course
3. anyone with a schedule clash at the exam time
4. anyone invigilating another exam on the same date

Production had exactly **one** user with the Invigilator role through `/user/all`: primary Admin, secondary Invigilator — and that user **created both courses**. So the list could never show them.

The rule arrived in `9a6c47e0` "refactor: invigilator assignment" (2025-06-02, a teammate), which created `invigilator-management.service.ts`. None of the lines it removed from `exam.service.ts` held a creator check, so this was a new rule, not a moved one. No ticket, no rationale in the message; searching history for "course creator" finds only that commit and a same-day tidy-up (`4572a2b3`).

## How it was isolated

Static reading ran out: every rule looked clean against the data I could read. So the endpoint was probed on production **read-only**, from the user's logged-in page, varying one input at a time and asking only "is `6a8567da…` in the result?":

| Probe | Returned? | Rules it rules out |
|---|---|---|
| this course, all chapters, real exam date | no | — |
| this course, 1 chapter, a 2030 date | no | schedule clash, same-day exam (date-bound) |
| other course, 1 chapter, a 2030 date | no | — |
| **non-existent `courseId`**, same chapter and date | **yes** (2 available) | role lookup — the user is a candidate |

A fake course removes exactly two rules — course creator and taught-this-chapter — and the tested chapter was taught by someone else. That left the creator rule. The user confirmed the creator id.

**Two wrong turns worth recording.** (1) An early "0 available" was a parsing mistake — the browser tool masked the response keys; the raw body held one invigilator, just not this one. (2) The first "creator" id offered, `69ddeab4b563b12eeb93bea3`, is the **scheduler**: every `Schedule` row's `createdBy` is that user. `Course.createdBy` is a different field, set only at course creation (`course.service.ts:817`), and neither `GET /courses/:id` nor `/courses/all` returns it.

## Decision

The user chose to **remove** the rule, over keeping it (with or without explaining exclusions in the UI). Whether the creator exclusion encoded a real independence requirement was **not** confirmed with its author or the BA before removing it.

## Fix

`libs/database/src/lib/exam/invigilator-management.service.ts` — 13 lines removed: the `courseModel.findById(courseId).select("createdBy")` lookup, `courseCreatorId` and its filter, and the now-unused `courseModel` injection and `Course` import. Rules 2–4 are unchanged.

## Evidence

```
$ git log -S "courseCreatorId" --all --format="%h %ad %an | %s" --date=short
9a6c47e0 2025-06-02 dawahreh | refactor: invigilator assignment

$ git branch -r --contains ea388a80
origin/HEAD -> origin/master
origin/dev
origin/master
```

`tsc --noEmit` on the API and ESLint on the file: clean.

## Still open

- **Not exercised.** Nobody has seen the creator appear in the list; the constructor lost an injected model and the backend was not booted. Built, **not verified** — per [[Patterns - Method & Conventions]]. It is already on `origin/dev` and `origin/master`, and `dev` deploys on push.
- **The requirement question is open.** If keeping course authors off their own exams was intended, this removal is a regression — ask the rule's author or the BA.
- **Two user lists disagree.** `/user/all?role=IV&includeSecondaryRoles=true` returned one user; the invigilator endpoint returned a different one. `/user/all` filters out `emailToken.isVerified: false` and the invigilator query does not — likely, **unverified**.
- Resolved 2026-09-15: the probing tab's URL changing to `compose-exam?examId=6aa90fbe6ea99d2b48e55d43` with no click was the user's own exam — `CrossTabSyncProvider` mirroring their tab, not a write from the probes.
- Pre-existing, not fixed: the schedule-clash check compares `startTime` (a Date) against a minutes-of-day number, so it never matches anyone; the same-day exam check ignores status and time of day.

## Related

- [[tat-app-ws Backend]] — where the rule lived
- [[Compose Exam - Period Chapters, Course Reset & Day Labels]] — the same page, the same day
- [[Gotchas - Backend Services & Environment]] — `Schedule.createdBy` is the scheduler, not the course creator
- [[Gotchas - Tooling & Method]] — the commit reached `origin` without a push, again
- [[Patterns - Method & Conventions]] — isolate a silent filter by varying one input at a time against the live endpoint
