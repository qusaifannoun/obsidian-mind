---
date: 2026-07-16
description: "Deep-link the History Form's related online courses to the tat-portal (refresher → /courses/{id}, online records → /my-courses/{enrollmentId}); gated on a new NEXT_PUBLIC_ONLINE_COURSES_URL that isn't set locally"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-prereq
---

# History Form — Online Course Deep-Links

The History Form had a **dead "see the courses portal" text** and no actual links to the related online courses, which live in [[tat-portal]] (a separate app).

## What shipped

- **Config (the prerequisite):** new optional `NEXT_PUBLIC_ONLINE_COURSES_URL` (portal base) in `env.ts` + `.env.example`, and a null-safe `lib/online-course-url.ts` helper — `onlineCourseUrl(id)` → `/courses/{id}`, `enrolledCourseUrl(enrollmentId)` → `/my-courses/{enrollmentId}`. **Links render only when the env var is set.**
- **Link points:**
  - Mandatory **refresher** rows → the portal course page (from `refresherOnlineCourseId`), placed **next to the course title** so it shows on accomplished rows too. *(Initial placement bug: I first put it only on the NotStarted online-request sub-row, so it never showed on the Approved rows — moved to the title cell.)*
  - Online-sourced **additional** records + **Relevant-Training-History** records with an `onlineEnrollmentId` → the enrollment page.
- **Backend:** added `onlineEnrollmentId` to `AdditionalTrainingItemResponseDTO` + its mapping (`TrainingHistoryRecordResponseDTO` already had it). FE threaded `onlineEnrollmentId` through `form.ts` / `history-form-api.ts` + both fetcher adapters.

Committed `dev`: [[tat-app-ws Backend|tat-app-ws]] `474e8d8e`, [[tat-prereq]] (local). `tsc` + `eslint` clean.

## Config dependency / still open

> [!warning] Links are invisible until the env var is set
> `NEXT_PUBLIC_ONLINE_COURSES_URL` is **not** in local `.env` — which is exactly why the link didn't appear when Qusai looked. It must be set **per environment**. The links also depend on real `refresherOnlineCourseId` / `onlineEnrollmentId` data and the **assumed** portal paths (`/courses/[id]`, `/my-courses/[enrollmentId]`). Not browser-verified.

This is the recurring "**confirm the config/data exists before wiring an FE control**" trap — see [[Patterns]].

## Related

- [[Export History Form - TAT Form 031 PDF]] · [[History Form - Training & Validity Records]]
- [[tat-prereq]] · [[tat-app-ws Backend]] · [[tat-portal]]
