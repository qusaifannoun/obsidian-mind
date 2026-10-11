---
date: 2026-09-15
description: "Frontend data-layer traps across tat-prereq, tat-portal and tat-ws — React Query errors and cache keys, endpoint contracts, uploads and certificate hooks"
tags:
  - brain
---

# Gotchas - Frontend Data & API Contracts

Split out of [[Gotchas - Frontend]] on 2026-09-15, when it reached 29KB. Entries moved verbatim; [[Gotchas]] keeps the one-line index. **Add new entries here, not to the index.**

## `POST /auth/refresh-token` takes the token as a Bearer header, not a body field — the body form 401s every time (2026-09-20)

> [!danger] The route is `@UseGuards(JwtRtGuard)` and the strategy reads `ExtractJwt.fromAuthHeaderAsBearerToken()` (`jwt-rt-strategy.ts:14`). A `{ refreshToken }` body never reaches it: the guard rejects the request before the controller runs.
> [[tat-prereq]] and [[tat-portal]] both did this, and both made the call with bare `axios` rather than the configured client — so there was not even a stale `Authorization` header to accidentally satisfy the guard. Neither app could refresh a token, ever. The failure is invisible in code review because the call *looks* right and the catch block does something plausible (clear tokens, go to `/login`).
>
> ```ts
> await axios.post(`${API_URL}/auth/refresh-token`, undefined, {
>   headers: { Authorization: `Bearer ${refreshToken}` },
> });
> ```
>
> [[tat-ws]] and `exam-portal` had it right all along, which is why only two of the four apps were broken this way. The contract is now correct in [[TAT API & Auth Model]] — it had documented the body form, which is what both apps were built against. See [[Expired Sessions Undetected Across All TAT Frontends]].

## `isLoading` is false while a query is paused, and on the server — key skeletons on `isPending` (tat-ws, 2026-10-11)

> [!danger] In React Query v5, `isLoading` is `isPending && isFetching`. A query that has no data yet but **is not fetching** reports `isLoading: false` — and a list written as `isLoading ? <Skeleton/> : rows.length ? <List/> : <Empty/>` renders **"No results"** for a request that has not finished.
> Two ways that happens in [[tat-ws]]: (1) **a failed query only retries while the window has focus** — in a background tab, or a browser driven by automation, the retry pauses and the list sits on its empty state indefinitely; (2) **on the server** nothing fetches, so SSR renders the empty state while the client's first render is loading — a hydration mismatch.
>
> Fix: key the skeleton on **`isPending`** ("no data and no error yet") and keep the separate `isError` branch ([[#A query hook read without `isError` turns every server failure into an empty-state card (2026-09-09)|entry below]]). Pages also need the repo's `useMounted()` guard, as ~50 tat-ws pages already have. Found in the Forms pages: [[TAT-481 Super Admin Forms Browser]].

## `GET /courses/:id` 403s for trainees — read their enrollment status from `/courses/public/:id` (tat-ws, 2026-10-11)

The staff course endpoint `GET /courses/:id` (`useFetchCourseDetails`) returns **403** for a trainee. The public course page reads `GET /courses/public/:id` (`useFetchPublicCourseDetails`), which carries the logged-in trainee's `enrollmentStatus` — `isPending` is exactly `status === pending`, `isEnrolled` exactly `enrolled`; a `draft` enrollment is neither. Use that one for anything a trainee sees. **Pre-existing, not fixed:** both hooks share the cache key `['courseDetails', id]` while calling different endpoints, so whichever loads first can serve the other its data. Context: [[TAT-482 + TAT-483 Enrollment Forms]].

## A query hook read without `isError` turns every server failure into an empty-state card (2026-09-09)

> [!danger] `const { data, isLoading } = useQuery(...)` then `const rows = data?.rows ?? []` — a 500, a 403, a network drop and a genuinely empty result all render the same reassuring "No results" message.
> [[tat-prereq]]'s `TorMatrixView` did exactly this. The TOR Matrix was 500ing on every load and the page said **"No staff match your search or filter."** The stat cards showed an `EMPTY_SUMMARY` of zeros, which reads as real data. Nothing reached the console, because React Query swallows the rejection into `error` and nobody read it.
>
> **The cost is diagnostic, not cosmetic.** A whole session went into static tracing across the frontend and backend — permissions, DTO validation, query scoping, adapter null-safety — all of it ruled out one hypothesis at a time, because the one artifact that knew the answer was being discarded. **Adding the error branch produced the root cause on the first render**: the server's `MissingSchemaError` message appeared on screen immediately.
>
> **So when a list screen shows nothing, check `isError` handling before forming any theory about the data.** If the component cannot distinguish failure from emptiness, you have no evidence yet — you are guessing, and the screen is actively arguing for the wrong answer.
>
> `formatApiError` (`src/lib/format-api-error.ts`) already existed for this and handles both Nest shapes (`message: string` and the class-validator `string[]`). Use it rather than rendering a generic "something went wrong" — the *server's own message* is the thing worth showing. Fix: [[tat-prereq]] `dcacb9a`. Context: [[TOR Matrix 500 - Leading Space in aircraftTypeIds Ref]].

## Bulk Edit reads a different query-config source — patching one leaves the page looking wired and unfiltered (tat-ws, 2026-08-01)

> [!warning] Adding a param to `getInstructorQueryConfig` filters the normal pickers and does **nothing** to Bulk Edit
> Bulk Edit runs `preloadAll`, so its lists come from **`getAllInstructorQueryConfigs`** — a separate config builder. Patch only the singular one and the feature **looks shipped**: the page renders, the lists populate, no error anywhere, and the rows are simply unfiltered.
>
> **The trap is that the failure is invisible by construction** — an unfiltered list is a *superset*, which reads as working data rather than a bug. Whenever a request-shaping change lands, **grep for every builder of that query config**, not the one the feature under test calls. Found while wiring [[TAT-454 Instructor Assignment Filtering - courseMethod|TAT-454's `courseMethod`]]; the fix was verified by reading all three pickers' persisted React Query keys, which is what a superset symptom forces you to do.

## tat-prereq Form 32 cache keys are shaped `[Form32, kind, torId, …]` — a `[Form32, torId]` invalidation silently no-ops (2026-08-01)

> [!warning] The key's second element is the **kind**, not the id
> Real keys are `[Form32, 'schema' | 'list' | 'instance', torId, …]`. An invalidation written as `[Form32, torId]` **never matches a single entry** — React Query prefix-matching compares element by element, so `torId` in position 1 fails against `'schema'`. Nothing throws; the mutation succeeds, the cache keeps the stale value, and the UI is simply out of date until a refetch happens for some other reason.
>
> **Rule: copy the key from the query that produced it, never reconstruct it from memory.** A key mismatch is the one React Query error with no runtime signal at all. See [[TAT-450 TOR Certificate FE - Read Path Only]].

## `router.refresh()` does NOT invalidate the React Query cache (tat-portal)

Next's `router.refresh()` only re-runs RSC / server-component data — it leaves the **client React Query cache untouched**. Bit [[tat-portal]]'s refund flow (2026-06-23): the refund modal's `onSuccess` called `router.refresh()`, which updated the server-rendered orders list but left the client-cached `myCourses` / `cart` queries stale, so a refunded course kept showing in My Courses until a hard refresh. Fix: mutations that change React-Query-held data must call `queryClient.invalidateQueries` explicitly (via the centralized helpers — see [[Patterns - Frontend & UI#Centralized cache-invalidation map for React Query mutations (tat-portal)]]). More broadly, the staleness came from mutations not invalidating the *other* queries they affect (e.g. submit-exam left `myCourses`/`myCourseDetail`/`myCertificates` stale), compounded by a global `staleTime: 5min` + `refetchOnWindowFocus: false`. Rule: `router.refresh()` and React Query are two separate caches — refreshing one never refreshes the other.

## tat-ws cert hooks: `usePatchOnlineCourseCertificate` is NOT for issued certs

Two confusingly-named things in [[tat-ws]]. `usePatchOnlineCourseCertificate` (in `online-courses/usePatchOnlineCourseCertificate.ts`) edits a **course's certificate _template_ HTML** (`PATCH /online-courses/{id}/certificates/{type}`, body `{ certificateHtml }`) — course-level, not trainee-level. To edit an **issued** online-course certificate (a trainee's generated cert), use `useUpdateIssuedCertificate` (`PATCH /online-courses/certificates/{id}`, body `{ templateHtml }`, queues async PDF regen). *(The DTO changed 2026-06-11: it used to take `{ courseTitle, issuedAt, scorePercentage, displayData }`; those metadata fields are gone — it's the cert's HTML now.)* **Naming trap on top:** the PATCH field is `templateHtml`, but the GETs return the same value as `templateHtmlSnapshot` — read one name, write the other. Don't reuse the template hook for issued-cert edits. RBAC nuance: the issued-cert PATCH allows **SA/AD/TM** (role-based, hardcoded in the route), but the FE gates on `UPDATE_CERTIFICATE` (`UCE`) which is seeded **SA+TM** — so an **AD** user is allowed by the backend yet hidden by the FE gate. Context: [[TAT-428 Edit Issued Certificates]].

## Online-course certs ARE trainee-reachable (storefront)

`GET /online-courses/certificates/my` returns the logged-in user's own issued certs **including `pdfUrl`**, and its `@Roles(...SystemRolesCodes)` guard **includes `TRAINEE = "TR"`** — so [[tat-portal]] (the student storefront) can call it directly. Don't assume the `/online-courses/certificates/*` endpoints are admin-only just because [[tat-ws]] uses them; the `/my` variant is for trainees. Each cert carries `enrollmentId` + `type` (`EXAM` | `ATTENDANCE`) for matching to a course card. Context: [[TAT Certificates - Open Items]].

## tat-portal: derive pass/fail from backend `passed`, not a local `examPassed` hardcoded to `>= 70`

A learner who fails an online-course exam only ever gets an **attendance** certificate, not a full one — but [[tat-portal]]'s `MyCourseCard` rendered a single hardcoded "Take Certificate" label for both outcomes, so a failed learner's button was indistinguishable from a passing learner's (2026-07-15). The data was already there: the enrollment carries a backend-authoritative **`passed`** boolean. The trap is the *other* field — a local `examPassed` that hardcodes `examMark >= 70`. Passing threshold is per-course (`passPercentage`), so `examPassed` silently drifts wrong the moment any course sets a threshold ≠ 70. Rule: branch outcome UI on the backend's `passed`, never on a client-recomputed threshold. Fix added `examFailed = hasExam && examMark !== null && !passed` and labeled the completion cert "Attendance Certificate" when true. Edge caveat: assumes `showCourseCompletionCertificate` isn't set true while retake attempts remain, else it could read "Attendance" prematurely. Context: [[TAT Certificates - Open Items#Frontend (us — tat-portal)]], sibling gotcha [[#Online-course certs ARE trainee-reachable (storefront)]].

## Two certificate-template preview endpoints — wrong one leaves tokens unsubstituted

[[tat-ws]]'s shared `CertificateEditor` Preview button hit this (2026-06-26): there are **two** preview endpoints and the editor must pick by domain. Aircraft/general templates use single-brace `{ token }` and `POST /certificate-templates/preview`; online-course templates use double-brace `{{ token }}` and `POST /online-courses/certificate-templates/preview`. Both share the **identical** `{ content }` → `{ previewContent }` shape, so a mis-wire **type-checks and returns 200** — but the aircraft endpoint doesn't substitute `{{ }}` tokens, so the online preview renders with placeholders still showing. The editor was originally hardwired to the aircraft hook regardless of its `courseType` prop; fix routes online templates to `usePostPreviewOnlineCertificateTemplate`. Lesson: when two endpoints share a request/response shape but differ in server-side behavior (token dialect), nothing local catches the mismatch — only a visual/staging check does. Context: [[TAT Certificates - Open Items]], [[TAT API & Auth Model#Certificate template preview (two endpoints, by domain)]].

## FE hook built against a speculative endpoint the backend never shipped

tat-ws's "Exam Answers" preview was wired to `GET /online-courses/{id}/trainees/{enrollmentId}/exam-result` with an invented `EnrollmentExamResult` shape (`score`, `takenAt`, `answers[].options[{text,isCorrect,isTraineeAnswer}]`). The backend actually shipped **`/exam`** (`getAdminTraineeExamAttempt`) with a *different* shape: `scorePercentage`/`submittedAt`/`questions[]`, each question `optionA/B/C` + `userAnswer`/`correctAnswer` as **letters** `"A"|"B"|"C"` (enum — `SubmitAnswerDTO @IsIn(["A","B","C"])`, question-bank `correctAnswer enum ["A","B","C"]`), plus `attemptId`/`attemptNumber`/`status`/`timeLimitMinutes`/`passPercentage`. Backend returns **only the latest SUBMITTED attempt** and **404s** when none exists (so gate the hook with `retry:false` and render an empty state). Lesson: when a FE data hook is built before the backend lands, treat its types/URL as a guess — reconcile against the actual controller+DTO in [[tat-app-ws Backend]] before trusting it. Context: [[Online-Course Exam Timeout - Backend Bug]], [[TAT Certificates - Open Items]].

**Recurred 2026-10-11, contained this time:** the TAT-314 Forms pages were built against guessed endpoints while the backend owner was unreachable. Every guess was wrong (paths, response shape `{ data, totalSize }` not `{ data, total }`, no pagination, `id` not `_id`, lowercase statuses, a course-name grouping instead of an aircraft one). Because all guesses lived in one folder of hooks plus one types file, the swap was mechanical. Keep a guessed contract in exactly one place. [[TAT-481 Super Admin Forms Browser]].

## tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original

`POST /file/upload-file` **transforms** files server-side and returns the **final** key with a possibly-different extension: office docs (`doc/docx/xls/xlsx/ppt/pptx/csv`) are queued for **PDF conversion** and the response Key is rewritten to `…​.pdf`; images are compressed/normalized to `.jpg`; HEIC → png/jpg. Conversion is gated in `s3.service.ts` on `category ∈ {LEARNING_MATERIALS, COMPANY_DOCUMENTS, ONLINE_COURSE_PARTS, ONLINE_COURSE_CONTENT}` **and** an office extension — so the FE must send one of those categories (online-course materials already send `ONLINE_COURSE_CONTENT`). Bug this caused (2026-06-28): `MaterialFileUpload` stored the part's `name`/`fileType` from the **original** file (`lesson.docx` → type `word` → saved as part type `OTHER`), even though the returned key was the converted `…​.pdf`, so a converted Word doc showed up as a Word/OTHER file — "it didn't convert." Fix: derive `name` + `fileType` from the **returned key** (`getFileType(url, '')`, rename to the returned extension), never from the uploaded `File`. Note the conversion is **async/background** — the response returns the `.pdf` key before the worker finishes, so the object may 404 briefly. Caveat: `FileConversionService` is an **optional** dep on `S3Service` (`fileConversionService?`); it's wired via `HelpersModule`, but if a module re-provides `S3Service` without it in scope, conversion silently no-ops. See [[Patterns - Frontend & UI#File uploads: always pass a `FileUploadCategory` (tat-ws)]]. Context: [[TAT Certificates - Open Items]].

**The `.jpg` normalization destroys transparency (2026-10-11).** A drawn signature uploaded as a transparent PNG came back as a **solid black box** — the transparent background turned black and swallowed the black strokes (stored key `…/signature/….jpg`). Anything with transparency must be flattened onto white before upload; `signature_pad` takes `backgroundColor: 'rgb(255, 255, 255)'`. [[TAT-482 + TAT-483 Enrollment Forms]].

## tat-ws online-course trainees endpoint: no server search + fake pagination

`GET /online-courses/{id}/trainees` (`getCourseTrainees`) **looks** paginated (`skip`/`limit`, returns `{ data, total }`) but the service `find()` has **no `.skip().limit()`** — it loads every enrollment, builds every row, then `rows.slice(skip, skip+limit)` in memory. So server pagination saves **zero** DB work; it only trims the JSON payload. There is also **no search param** (`OCAdminCourseTraineesListQueryDTO extends Pagination {}` — pagination-only). Consequence for [[tat-ws]]: the Manage Trainees search box worked only because the FE downloaded the *whole* list and filtered client-side; switching to true server pagination would make search match the **current page only** (a name on page 2 → "no results"). Decision (2026-06-28): wired server-side `skip`/`limit` via the shared `Table` and **disabled the FE search** until the backend adds a real `search` param (and ideally real DB-level paging). When picking client- vs server-side paging, first check whether the endpoint paginates at the DB or just slices — and whether search is server-supported. Context: [[TAT Certificates - Open Items]], [[tat-app-ws Backend]].

## tat-prereq `uploadFileKey` must send a `FileUploadCategory` — else `bucket/undefined/` (2026-07-05)

> [!warning] Missing `category` → files land in `bucket/undefined/`, and the backend does NOT error
> The S3 key is built as `bucket/<category>/<...>`; the shared `src/api/uploadFileKey.ts` only appended `file`, not `category`, so every tat-prereq upload (Form 32/285, History evidence, signatures, qualifications) went to `bucket/undefined/`. Form 32's validator only checks the `bucket/` prefix + extension, so it silently misfiles instead of failing. Fix: `uploadFileKey(client, file, category)` now required; each call site passes the right `FileUploadCategory` (`tor-form-32`, `tor-aircraft-qualification`, `tor-documents`, `tor-assessment`, `tor-external-teaching`, `tor-form-285`). Same class as the [[#tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original|tat-ws upload]] gotcha — third time this bit.
