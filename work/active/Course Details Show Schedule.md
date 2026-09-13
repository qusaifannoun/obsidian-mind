---
date: 2026-09-13
description: "The trainee schedule endpoint 403s for anyone not enrolled or assigned, so staff got a new schedule endpoint plus a shared table in a course-details modal"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-ws
---

# Course Details Show Schedule

Request: a **Show Schedule** button on Manage Courses → Course Details that shows the same schedule table trainees see on their own course page.

Committed on `dev` 2026-09-13, **not pushed**: [[tat-ws]] `ac780cf` (table extraction, its own commit) + `248359d` (button, modal, hook); [[tat-app-ws Backend]] `9e5bd7e7` (endpoint). **Typecheck-only, never run** — see [[#Still open]].

## Root cause — the only schedule source was gated to participants

The trainee page (`my-courses/details/[id]`) reads its schedule from `GET /courses/my-courses/:id`. That endpoint serves only the people *in* the course, so it can't back a staff view:

```ts
// tat-app-ws libs/database/src/lib/course/course.service.ts — getMyCourseById
if (!enrollment && !instructorSchedule) {
  throw new HttpException(
    "User is not enrolled in this course or assigned as an instructor",
    HttpStatus.FORBIDDEN,
  );
}
```

`enrollment` = an `ENROLLED`/`PENDING` enrollment for the caller; `instructorSchedule` = a `schedule` row with the caller as `instructorId`. An admin or training manager has neither.

The alternative, `GET /schedule/course/:courseId` (`SCHEDULE_TRAINING` action), is **a different data source**, not the same data behind another gate: no `dayNumber`, no `examiner`, and no fallback to the `CourseSchedule` template. Using it would have let the staff view drift from what trainees see.

## Decision

Chosen by the user over the frontend-only option: a new staff endpoint that reuses the exact trainee data path, a modal rather than a new page, and extraction of the table rather than a copy.

## Fix

| Repo | File | Change |
|---|---|---|
| [[tat-app-ws Backend]] | `apps/api/src/app/course/course.controller.ts` | `@Get(":id/schedule")` → `getCourseSchedule`, gated like `GET /courses/:id` (`InternalSystemRolesCodes` + `JwtAtGuard`, no action) |
| [[tat-app-ws Backend]] | `libs/database/src/lib/course/course.service.ts` | `getCourseScheduleById` — id validation, 404 on missing course, then the existing private `getCourseSchedules()` (`Schedule` model with `dayNumber` added, falling back to the `CourseSchedule` template) |
| [[tat-ws]] | `components/common/CourseScheduleTable/index.tsx` *(new)* | table extracted verbatim from the trainee page; still highlights the viewer's own name in instructor cells |
| [[tat-ws]] | `app/(private)/my-courses/details/[id]/page.tsx` | now renders `CourseScheduleTable` (−174 lines); a debug `console.log` removed |
| [[tat-ws]] | `services/api-hooks/coursers/useFetchCourseScheduleById.ts` *(new)* | fetches only while the modal is open |
| [[tat-ws]] | `manage-courses/[id]/details/_components/CourseDetailsContent/CourseScheduleModal.tsx` *(new)* | `maxWidth="xl"` dialog in the `ChangeCertificatesModal` idiom, loading + error states |
| [[tat-ws]] | `…/CourseDetailsContent/index.tsx` | Show Schedule button beside Show Enrolment |

The extraction landed as **its own commit** (`ac780cf`), separate from the button and endpoint.

## Evidence

```
$ npx tsc --noEmit -p apps/api/tsconfig.app.json | grep -E "course\.(controller|service)"
(no output)

$ npx tsc --noEmit -p apps/tat-ws/tsconfig.json | grep "error TS"
apps/tat-ws/specs/index.spec.tsx(2,24): error TS2307: Cannot find module '@testing-library/react' or its corresponding type declarations.
```

The one tat-ws error is pre-existing — the count is identical (1) with the changes stashed.

## Still open

- **Nothing was exercised.** The endpoint was never called, the modal never opened, and the trainee `my-courses/details` page was not re-checked after the table moved out of it. Built, **not verified** — per [[Patterns - Method & Conventions]].
- **Does nothing until [[tat-app-ws Backend]] is deployed** — the button will error on `dev` until then.
- The button has **no `ActionsWrapper` action gate**, unlike Show Enrolment beside it; any internal role that can open the page sees it. No matching action code was looked for.
- Layout of a wide schedule (many periods) inside the modal is unchecked.
- Commits are local on `dev` — but see [[Gotchas - Tooling & Method]] on why "local only" is not a safe claim in these repos.

## Related

- [[tat-ws]] — primary repo
- [[tat-app-ws Backend]] — the new endpoint
- [[Gotchas - Backend Services & Environment]] — the participant-only `my-courses/:id` gate written up
- [[Patterns - Architecture & Boundaries]] — one rule, one implementation: the staff view reuses the trainee data path instead of rebuilding it from a second endpoint
- [[tat-ws Tooltips Unstyled]] — same repo, same week
