---
date: 2026-06-02
description: "All open/missing items surfaced while working the certificate issue (TAT-428) — frontend gaps, backend dependencies, and unrelated bugs found along the way"
project: TAT
status: active
quarter: Q2-2026
tags:
  - work-note
  - project/tat
---

# TAT Certificates - Open Items

Running list of everything still missing or broken that came up while doing [[TAT-428 Edit Issued Certificates]]. Grouped by who owns it. Context: [[TAT API & Auth Model#Certificates — two independent systems]], [[tat-ws]], [[tat-app-ws Backend]].

## Done this round (for reference)
- ✅ Catalog: edit issued (general) certs wired to `PATCH /certificates/{id}`, gated by `UPDATE_CERTIFICATE` permission.
- ✅ Manage Trainees: certificate badges clickable → view issued cert PDF.
- ✅ Committed to tat-ws `dev` as `60c1cba`.

## Backend (other team — not us)

| # | Item | Detail |
|---|---|---|
| B1 | ✅ **Online-course cert update endpoint (SHIPPED 2026-06-07)** | Backend added `PATCH /online-courses/certificates/{id}` (metadata: `displayData/issuedAt/scorePercentage/courseTitle`; queues PDF regen; RBAC SA/AD/TM). The tat-ws trainee-row edit was built on it the same day — see [[TAT-428 Edit Issued Certificates#UNBLOCKED (2026-06-07) — backend shipped the online-course cert PATCH]]. |
| B2 | **RBAC: `UPDATE_CERTIFICATE` too broad** | Seeded to **SA + TM** (`bootstrap.service.ts` 295 & 386); ticket wants Super-Admin-only. Frontend is already permission-gated so it auto-follows once tightened. |
| B3 | **Exam result endpoint missing** | Frontend calls `GET /online-courses/{courseId}/trainees/{enrollmentId}/exam-result` → **404, route doesn't exist**. Either backend adds it returning `{score,passed,passPercentage,takenAt,answers[]}`, or we repoint the frontend (see F3). |

## Frontend (us — tat-ws)

| # | Item | Detail |
|---|---|---|
| F1 | **Exam "View" 404 fix** | Repoint `useGetOnlineCourseExamResult` to an existing endpoint (`GET /online-courses/exam/enrollment/{enrollmentId}`?) **iff** its response carries the per-question answer breakdown the modal needs. Needs shape verification. Depends on B3 decision. |
| F2 | ✅ **Hydration error — sidebar logo (FIXED)** | Root cause: `SidebarContext` read `localStorage` during render (`isExpanded ?? true`) → server `true`/`w-20` vs client stored `w-10`. Fixed: deterministic defaults + apply persisted state after mount + guard the save effect. |
| F3 | ✅ **`nx lint tat-ws` crash (FIXED)** | Disabled the broken, wide-open `@nx/enforce-module-boundaries` rule in `.eslintrc.json`. Lint runs now. See [[Gotchas]]. |
| F4 | **Lint backlog exposed by F3 (real bugs fixed; cosmetic left)** | True totals via raw eslint JSON (nx terminal truncates counts): 41 errors / 1173 warnings after ignoring the vendored worker. **Fixed:** `cda2d0f` — `no-unsafe-optional-chaining` bug + 9 trivial; `c5beae7` — all 14 genuine bug-errors: 12 `react-hooks/rules-of-hooks` (the `page`→`Page` rename + unconditional `useFormContext`) and 2 `react/jsx-key`. **Now 27 errors left, all cosmetic** (unescaped entities, `no-inferrable-types`, `no-empty-function`/`-interface`, `ban-ts-comment`, `display-name`) + 1173 warnings — deferred per "errors only". `tsc --noEmit` is the clean gate. |
| F5 | ✅ **Nested duplicate map in PhasesList (FIXED `bf52ea6`)** | Mobile view mapped `course.phases` inside `course.phases` (N² render). Now renders the outer-map `phase` directly. |

## Frontend (us — tat-portal)

| # | Item | Detail |
|---|---|---|
| P1 | ✅ **My Courses "View Certificate" / "View Exam Certificate" wired (2026-06-07)** | Both were `disabled` placeholder buttons on the storefront `my-courses` page with no handler. Connected to the trainee-facing `GET /online-courses/certificates/my` (returns the user's own certs incl. `pdfUrl`; `@Roles` includes `TRAINEE`). Page fetches once, groups by `enrollmentId`; each card resolves its `ATTENDANCE` (View Certificate) and `EXAM` (View Exam Certificate) cert and opens `pdfUrl` in a new tab. Stays disabled showing "Generating certificate…" until the async PDF lands. New: `types/certificate.ts`, `api/Certificates/fetchers.ts`, `CertificateQueryKey`. tsc + eslint clean. Committed tat-portal `dev` `1b1b9e9`. |

## Product / design decisions

| # | Item | Detail |
|---|---|---|
| D1 | **Two cert systems** | `OnlineCourseCertificate` (storefront, PDF, view-only) vs general `Certificate` (admin catalog, editable). Decide whether they should converge, and whether TAT-428's "edit" was ever meant for the online-course certs at all. |
| D2 | **Page vs modal** | TAT-428 says "open the certificate edit page"; implementation reuses the existing edit **modal**. Confirm acceptable. |

## Related
- [[TAT-428 Edit Issued Certificates]] · [[TAT API & Auth Model]] · [[tat-ws]] · [[tat-app-ws Backend]] · [[Gotchas]]
- Competencies: [[Code Quality]] — bug-class lint fixes (rules-of-hooks, unsafe chaining, N² render) · [[Debugging & Root Cause Analysis]] — nx-lint crash + SSR hydration root causes
