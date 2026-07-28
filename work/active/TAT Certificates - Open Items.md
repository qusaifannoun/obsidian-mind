---
date: 2026-06-02
description: "All open/missing items surfaced while working the certificate issue (TAT-428) — frontend gaps, backend dependencies, and unrelated bugs found along the way"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q2-2026
project: tat-ws
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
| B3 | ✅ **Exam attempt endpoint (RESOLVED 2026-06-28)** | Backend shipped `GET /online-courses/{courseId}/trainees/{enrollmentId}/exam` (`getAdminTraineeExamAttempt`) — **different path + DTO** than the speculative `/exam-result`. Returns `{ attemptId, attemptNumber, status, scorePercentage, passed, submittedAt, passPercentage, questions[{ question, optionA/B/C, userAnswer, correctAnswer (A/B/C), isCorrect }] }`; latest **SUBMITTED** attempt only; **404s** if none. FE repointed — see F1. |
| B4 | ✅ **Online cert-template preview endpoint (SHIPPED)** | `POST /online-courses/certificate-templates/preview` — renders an online template's HTML with **dummy data**; `{ content }` → `{ previewContent }` (same shape as the aircraft `/certificate-templates/preview`, but substitutes double-brace `{{ }}` tokens). FE wired the same day — see F6. Detail: [[TAT API & Auth Model#Certificate template preview (two endpoints, by domain)]]. |

## Frontend (us — tat-ws)

| # | Item | Detail |
|---|---|---|
| F1 | ✅ **Exam "View" 404 fixed (2026-06-28, `79ba0b7`)** | Repointed `useGetOnlineCourseExamResult` `/exam-result` → `/exam`, rewrote the types to the real DTO (B3) with letter-based A/B/C matching (`optionA/B/C` + `userAnswer`/`correctAnswer`). Rebuilt the Exam Answers modal on **MUI Dialog** (house standard) — the hand-rolled `fixed inset-0` overlay clipped its header/close behind the navbar. `retry:false` + empty state for the no-attempt 404. Gotchas: [[Gotchas - Frontend#tat-ws modals: use MUI `<Dialog>`, not hand-rolled `fixed inset-0`]], [[Gotchas - Frontend#FE hook built against a speculative endpoint the backend never shipped]]. |
| F2 | ✅ **Hydration error — sidebar logo (FIXED)** | Root cause: `SidebarContext` read `localStorage` during render (`isExpanded ?? true`) → server `true`/`w-20` vs client stored `w-10`. Fixed: deterministic defaults + apply persisted state after mount + guard the save effect. |
| F3 | ✅ **`nx lint tat-ws` crash (FIXED)** | Disabled the broken, wide-open `@nx/enforce-module-boundaries` rule in `.eslintrc.json`. Lint runs now. See [[Gotchas]]. |
| F4 | **Lint backlog exposed by F3 (real bugs fixed; cosmetic left)** | True totals via raw eslint JSON (nx terminal truncates counts): 41 errors / 1173 warnings after ignoring the vendored worker. **Fixed:** `cda2d0f` — `no-unsafe-optional-chaining` bug + 9 trivial; `c5beae7` — all 14 genuine bug-errors: 12 `react-hooks/rules-of-hooks` (the `page`→`Page` rename + unconditional `useFormContext`) and 2 `react/jsx-key`. **Now 27 errors left, all cosmetic** (unescaped entities, `no-inferrable-types`, `no-empty-function`/`-interface`, `ban-ts-comment`, `display-name`) + 1173 warnings — deferred per "errors only". `tsc --noEmit` is the clean gate. |
| F5 | ✅ **Nested duplicate map in PhasesList (FIXED `bf52ea6`)** | Mobile view mapped `course.phases` inside `course.phases` (N² render). Now renders the outer-map `phase` directly. |
| F6 | ✅ **Online cert-template Preview wired (2026-06-26, `4bf9144`)** | The shared `CertificateEditor` Preview button was hardwired to the aircraft endpoint (single-brace `{ }`), so online templates' `{{ }}` tokens never substituted. Added `usePostPreviewOnlineCertificateTemplate` (→ B4 endpoint, reuses the aircraft `{ content }`/`{ previewContent }` types) and route by the existing `courseType` prop. Works for create + edit (unified editor page). Gotcha: [[Gotchas - Frontend#Two certificate-template preview endpoints — wrong one leaves tokens unsubstituted]]. **Pending staging check** (attendance + course-and-exam). |
| F7 | ✅ **Template-status buttons on Manage Certificate Templates (2026-06-26, `4bf9144`)** | `CertificateTemplatesStep` (shared by the manage page + add-course wizard) now fetches the course and colors each button by whether its template HTML is set: **blue "Create Template"** when null, **green "Edit Template"** when present. Reads `attendanceCertificateHtml` / `courseAndExamCertificateHtml` from `useGetOnlineCourse` (deduped). |
| F8 | ✅ **Manage Trainees table responsive + paginated (2026-06-28, `79ba0b7`)** | Migrated the hand-rolled `<table>` to the shared `Table` component — fixes columns clipping off-screen on narrow viewports (built-in `overflow-x-auto`), adds pagination, moves row delete to a kebab (⋮) dropdown. Wired **server-side pagination** (`skip`/`limit`, `{data,total}`) and **disabled client-side search**: the trainees endpoint loads all rows then slices in-memory with **no search param**, so client search would only match the current page. Convention: [[Patterns#tat-ws: always use the shared `Table` component]]; backend gotcha: [[Gotchas - Frontend#tat-ws online-course trainees endpoint: no server search + fake pagination]]. |
| F9 | ✅ **Uploaded Word docs reflect backend PDF conversion (2026-06-28, `1e55696`)** | The upload endpoint converts office docs → PDF (and images → JPG) and returns the rewritten `.pdf` key, but `MaterialFileUpload` derived the part `name`/`fileType` from the original `.docx` → stored as Word/`OTHER`. Now derives both from the returned key. Convention: [[Patterns#File uploads: always pass a `FileUploadCategory` (tat-ws)]]; gotcha: [[Gotchas - Frontend#tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original]]. |

## Frontend (us — tat-portal)

| # | Item | Detail |
|---|---|---|
| P1 | ✅ **My Courses "View Certificate" / "View Exam Certificate" wired (2026-06-07)** | Both were `disabled` placeholder buttons on the storefront `my-courses` page with no handler. Connected to the trainee-facing `GET /online-courses/certificates/my` (returns the user's own certs incl. `pdfUrl`; `@Roles` includes `TRAINEE`). Page fetches once, groups by `enrollmentId`; each card resolves its `ATTENDANCE` (View Certificate) and `EXAM` (View Exam Certificate) cert and opens `pdfUrl` in a new tab. Stays disabled showing "Generating certificate…" until the async PDF lands. New: `types/certificate.ts`, `api/Certificates/fetchers.ts`, `CertificateQueryKey`. tsc + eslint clean. Committed tat-portal `dev` `1b1b9e9`. |
| P2 | ✅ **"Remove from Cart" on course details page (2026-06-26, `8defeda`)** | `EnrollmentOptions` toggle button flipped its label to "Remove from Cart" when `inCart`, but `onClick` was hardwired to `handleAddToCart` and the component never imported `useRemoveFromCart` — so clicking re-fired an idempotent add and nothing removed. Imported `useRemoveFromCart`, added `handleRemoveFromCart` (passes `courseId`, matching the working `/cart` page + the `DELETE /online-courses/cart/remove/{courseId}` fetcher), branched `onClick` on `inCart`, added a "Removing…" pending state. |
| P3 | ✅ **My-Courses card mislabeled the attendance cert as a full cert for failed-exam learners (2026-07-15)** | `MyCourseCard` rendered one hardcoded "Take Certificate" label regardless of exam outcome — a learner who **failed** the exam only receives an *attendance* certificate but the button read identically to a passing learner's full cert. Root cause was a missing branch, not missing data: the enrollment already carries `passed`. Added `examFailed = hasExam && examMark !== null && !passed`, deliberately keying off the **backend-authoritative `passed`**, not the local `examPassed` which hardcodes `>= 70` and would drift from the course's real `passPercentage`. Label now branches to "Take/View **Attendance** Certificate" when `examFailed`, else "Take/View Certificate"; the separate `showExamCertificate` button is untouched. `tsc --noEmit` + eslint clean; Qusai verified in browser against a failed enrollment. Edge: correctness assumes `showCourseCompletionCertificate` isn't true while retake attempts remain (else it could read "Attendance" prematurely) — held in testing. Touches `src/components/my-courses/MyCourseCard.tsx`. Trap: [[Gotchas - Frontend#tat-portal: derive pass/fail from backend `passed`, not a local `examPassed` hardcoded to `>= 70`]]. |

## Product / design decisions

| # | Item | Detail |
|---|---|---|
| D1 | **Two cert systems** | `OnlineCourseCertificate` (storefront, PDF, view-only) vs general `Certificate` (admin catalog, editable). Decide whether they should converge, and whether TAT-428's "edit" was ever meant for the online-course certs at all. |
| D2 | **Page vs modal** | TAT-428 says "open the certificate edit page"; implementation reuses the existing edit **modal**. Confirm acceptable. |

## Related
- [[TAT-428 Edit Issued Certificates]] · [[TAT API & Auth Model]] · [[tat-ws]] · [[tat-app-ws Backend]] · [[Gotchas]]
- Competencies: [[Code Quality]] — bug-class lint fixes (rules-of-hooks, unsafe chaining, N² render) · [[Debugging & Root Cause Analysis]] — nx-lint crash + SSR hydration root causes
