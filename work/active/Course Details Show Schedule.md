---
date: 2026-09-13
description: "The trainee schedule endpoint 403s for anyone not enrolled or assigned, so staff and the public page got their own endpoints and a shared schedule drawer"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-ws
---

# Course Details Show Schedule

Request (2026-09-13): a **Show Schedule** button on Manage Courses → Course Details that shows the same schedule table trainees see on their own course page. Extended 2026-09-15: the same button on the **public** course page (`/courses/:id`), and the modal replaced by a **right-side drawer** on both.

Committed on `dev`, **not pushed** (as of 2026-09-15): [[tat-ws]] `ac780cf` → `248359d` → `7402e06` → `6f675e1`; [[tat-app-ws Backend]] `9e5bd7e7` → `cb77bb27`. **Typecheck-only, never run** — see [[#Still open]].

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

The public course page is served to anonymous visitors, unenrolled trainees and staff alike, so the staff endpoint (`InternalSystemRolesCodes` + JWT) could not back it either.

## Decisions

All chosen by the user:

- **2026-09-13** — a new staff endpoint reusing the exact trainee data path (over the frontend-only option); extraction of the table rather than a copy.
- **2026-09-15** — the public page's schedule is visible to **everyone, including anonymous visitors**. Chosen over staff-only and signed-in-only, with the consequence stated up front: instructor/examiner names and dates become public for any visible course.
- **2026-09-15** — widen the shared `CustomDrawer` through its previously-ignored `className` prop, rather than keep its fixed 40.438rem width with horizontal scroll.

## Fix

| Repo | Commit | Change |
|---|---|---|
| [[tat-app-ws Backend]] | `9e5bd7e7` | `GET /courses/:id/schedule` (staff, gated like `GET /courses/:id`) → `getCourseScheduleById`, reusing the private `getCourseSchedules()` (`Schedule` model with `dayNumber`, falling back to the `CourseSchedule` template) |
| [[tat-app-ws Backend]] | `cb77bb27` | `GET /courses/public/:id/schedule` (no auth) → `getPublicCourseScheduleById`. Visibility matches `GET /courses/public/:id` via a new `PUBLIC_COURSE_STATUSES` constant (`SCHEDULED`/`APPROVED`/`ASSIGNED`) now shared by both, so a draft course 404s instead of leaking. Both schedule methods go through a private `findExistingCourseSchedules` |
| [[tat-ws]] | `ac780cf` | table extracted from the trainee page into `components/common/CourseScheduleTable/index.tsx` — its own commit |
| [[tat-ws]] | `248359d` | `useFetchCourseScheduleById` + a Show Schedule modal on Manage Courses → Details (the modal is gone as of `6f675e1`) |
| [[tat-ws]] | `7402e06` | `libs/ui` `CustomDrawer` applies its `className` via the existing `cn()` helper; the default width is unchanged for its four existing callers |
| [[tat-ws]] | `6f675e1` | `CourseScheduleTable/CourseScheduleDrawer.tsx` (90vw, capped at 90rem, loading/error states), used on both pages; `useFetchPublicCourseScheduleById`; Show Schedule button on the public page |

**Commit hygiene slip:** the modal's `git rm` was already staged when `7402e06` was made, so the deletion of `CourseScheduleModal.tsx` landed in the `CustomDrawer` commit instead of `6f675e1`. A re-split was started and **interrupted by the user**; the history was left as is.

## Evidence

```
$ npx tsc --noEmit -p apps/api/tsconfig.app.json | grep -E "course\.(controller|service)"
(no output)

$ npx tsc --noEmit -p apps/tat-ws/tsconfig.json | grep "error TS"
apps/tat-ws/specs/index.spec.tsx(2,24): error TS2307: Cannot find module '@testing-library/react' or its corresponding type declarations.
```

The one tat-ws error is pre-existing — the count is identical (1) with the changes stashed.

Local tat-ws points at a remote API, so nothing could be exercised end to end:

```
NEXT_PUBLIC_API_URL=https://api.tat147.com
```

## Still open

- **Nothing was exercised.** Neither endpoint was called, the drawer was never opened on either page, and the trainee `my-courses/details` page was not re-checked after the table moved out of it. Built, **not verified** — per [[Patterns - Method & Conventions]].
- **Does nothing until [[tat-app-ws Backend]] is deployed** — both drawers will show "Failed to load course schedule" until then.
- The four existing `CustomDrawer` callers (Show Enrolment, enrolment approval, Add Phase, Course Sign-Up) were not re-checked after the `className` change. Phone-width drawer layout unchecked.
- The manage-page button has **no `ActionsWrapper` action gate**, unlike Show Enrolment beside it.
- Pre-existing, not fixed: `CustomDrawer` never closes on backdrop click or Esc — its `SwipeableDrawer` `onClose` only logs `"closed "`, for every drawer in the app.
- Pre-existing, not fixed: the public course **list** and the public course **details** use different visibility rules — the list excludes `DRAFT`/`COMPLETED`/`ARCHIVED`/`TEMPLATE`, the details include only `SCHEDULED`/`APPROVED`/`ASSIGNED`. A course in any other status can be listed and then 404 when opened.
- Commits are local on `dev` — but see [[Gotchas - Tooling & Method]] on why "local only" is not a safe claim in these repos.

## Related

- [[tat-ws]] — primary repo
- [[tat-app-ws Backend]] — the two new endpoints
- [[Gotchas - Backend Services & Environment]] — the participant-only `my-courses/:id` gate written up
- [[Patterns - Architecture & Boundaries]] — one rule, one implementation: both new views reuse the trainee data path instead of rebuilding it from a second endpoint
- [[tat-ws Tooltips Unstyled]] — same repo, same week
