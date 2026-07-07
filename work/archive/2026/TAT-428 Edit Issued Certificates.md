---
date: 2026-06-02
description: "Scope for TAT-428 Edit Issued Certificates — a tat-ws (admin) feature, not tat-portal; backend PATCH already exists, work is frontend wiring + Super Admin gating"
project: TAT
status: completed
quarter: Q2-2026
ticket: TAT-428
tags:
  - work-note
  - project/tat
---

# TAT-428 Edit Issued Certificates

Jira: [TAT-428](https://cryptonic-art.atlassian.net/browse/TAT-428) · *Ready for Dev* · Highest · reporter dania.baradie · parent epic TAT-377 "Online Courses".

## Requirement

On the "View and Manage Trainees" page, if a trainee has an issued certificate, **only the Super Admin** may edit it. Certificates must be clickable from the trainee row; clicking opens the certificate edit page. Other roles: view only.

## Repo finding (contradiction)

> [!warning] This is [[tat-ws]] work, not [[tat-portal]]
> Filed under the "Online Courses" epic and was in the tat-portal-focused queue, but it's a **Super Admin / Manage Trainees** admin feature. [[tat-portal]] has zero trainee/certificate-management code; [[tat-ws]] has the whole certificate subsystem. Confirmed by code search.

## Backend — endpoint exists, but the role rule CONTRADICTS the ticket

`PATCH /api/certificates/{id}` exists in [[tat-app-ws Backend]] (`certificate.controller.ts:119`), confirmed on staging. Body `UpdateCertificateDTO`: `{ filledContent?, issueDate?, expiryDate? }`. So the **edit operation is fully supported** — no backend-team dependency to *build* anything.

> [!note] Decision (2026-06-02): gate by permission, backend untouched for now
> The `UPDATE_CERTIFICATE` (`UCE`) action is currently seeded to **SA + TM** (bootstrap.service.ts 295 & 386), which is broader than the ticket's "Super Admin only." **Per Qusai: don't touch the backend now — gate the frontend by the `UPDATE_CERTIFICATE` permission, and the backend will tighten the RBAC later.** Gating by permission (not hardcoded role) means the UI auto-follows whenever the backend changes who holds `UCE`. (My earlier Jira comment was removed by Qusai.)
>
> Scope: **edit applies to BOTH certificate types** (online-course + aircraft-type).

## Frontend gaps (all in tat-ws)

| Piece | State | File |
|---|---|---|
| "Manage Trainees" page | ✅ exists | `app/(private)/manage-courses/online-courses/[id]/trainees` |
| Certificate cell in trainee row | ⚠️ shows static badges (cert *types*, not clickable) | `…/_components/ManageTrainees/index.tsx` (`CertificateCell`) |
| Edit UI | ⚠️ `CertificateEditModal` + `CertificateEditor` exist; save is a TODO stub | `certificate-catalog/components/CertificateEditModal.tsx`, `certificate-catalog/page.tsx` (~357) |
| Update API hook | ❌ `usePatchCertificate` missing | new `services/api-hooks/certificates/usePatchCertificate.ts` → `PATCH /certificates/{id}` |
| Super Admin gating | ⚠️ hook+enum exist, not wired here | `hooks/useUserRole.ts`, `SystemRolesCodes.SUPER_ADMIN = 'SA'` |

**Data-wiring gap:** the trainee row's `certificates` is an array of *types* (`'ATTENDANCE' | 'COURSE_AND_EXAM'`), not cert IDs. To open a specific issued cert we need its `_id` — fetch via `GET /online-courses/certificates/enrollment/{enrollmentId}` or `useFetchCertificates` (traineeId filter).

## Two certificate types (TAT domain)

TAT issues two kinds of certificates — relevant because they have different edit endpoints:
- **Online-course certificates** — `OnlineCourseCertificateType` = `ATTENDANCE` / `COURSE_AND_EXAM`. These are the badges on the Manage Trainees row. Endpoints: general `PATCH /certificates/{id}` *and* `PATCH /online-courses/{id}/certificates/{type}`.
- **Aircraft-type / license certificates** — separate `aircraft-type-license` + `license` domain (aviation ratings).

TAT-428 is almost certainly about the **online-course** certificates (it's the trainees page), but confirm — see the posted comment.

## Open questions (posted to Jira 2026-06-02)

Comment posted on TAT-428 raising: (1) the SA-vs-(SA+TM) RBAC contradiction, (2) which certificate type this covers + which endpoint, (3) page-vs-modal. Awaiting reporter.

## Progress (2026-06-02, tat-ws `dev`, uncommitted)

Both cert types live in one `/certificates` collection (general `Certificate` carries both `courseId` and `licenseId`), so the certificate-catalog + `PATCH /certificates/{id}` already cover both — "edit both types" is satisfied by the unified endpoint.

Done — **certificate-catalog edit now works, permission-gated**:
- `libs/configs/src/lib/actionsEnums.ts`: added `UPDATE_CERTIFICATE = 'UCE'`.
- New `services/api-hooks/certificates/usePatchCertificate.ts` → `PATCH /certificates/{id}` `{ filledContent }` (mirrors `usePublishCertificate`).
- `certificate-catalog/page.tsx`: finished the `handleSaveCertificate` TODO (calls the hook, closes modal, invalidates); gated the Edit row-action behind `Actions.UPDATE_CERTIFICATE` via `useFetchRoleActions` (view/print/download only otherwise).

Verified: `tsc --noEmit` clean in scope; eslint clean on my files (0 errors; the lone `isLoadingCertificate` warning is pre-existing).

> [!warning] tat-ws lint tooling is broken (pre-existing)
> `nx lint tat-ws` currently **crashes** (not a violation): `@nx/enforce-module-boundaries` throws `ENOENT … src/assets/*` while linting unrelated files (e.g. `(auth)/email-verify/page.tsx`). This will hit pre-commit/CI on tat-ws regardless of our change. See [[Gotchas]]. Workaround for local checks: `eslint --rule '{"@nx/enforce-module-boundaries":"off"}'`.

## Step 4 done — but it's VIEW-only (key discovery)

> [!danger] Two independent certificate systems
> - **`OnlineCourseCertificate`** (trainee-row certs, `/online-courses/certificates/*`): generated PDF, fields `type/certificateNumber/pdfUrl/...`, **no `filledContent`**; was GET-only at the time. → was **view-only**. **UPDATE 2026-06-07: backend shipped `PATCH /online-courses/certificates/{id}` (metadata + PDF regen) — now editable, see [[#UNBLOCKED (2026-06-07) — backend shipped the online-course cert PATCH]].**
> - **General `Certificate`** (certificate-catalog, `/certificates/*`): has `filledContent` (rich text) + `PATCH /certificates/{id}`. → **editable** (done in Step 1–3).
> The two are independent collections (OnlineCourseCertificate doesn't reference Certificate). So "edit issued certificates" only applies to the general system. Editing online-course certs would need a backend endpoint that doesn't exist (out of scope: backend untouched). See [[TAT API & Auth Model#Certificates — two independent systems]].

Built (tat-ws `dev`, uncommitted) — trainee row certs now **clickable to view the PDF**:
- `services/api-hooks/online-courses/enrollments.ts`: added `useGetEnrollmentCertificates` (→ `GET /online-courses/certificates/enrollment/{enrollmentId}`) + `OnlineCourseIssuedCertificate` type.
- `ManageTrainees/index.tsx`: `CertificateCell` badges are now buttons; clicking fetches the enrollment's certs, matches the clicked type, and opens the existing `CertificateViewModal` (reused from certificate-catalog) with the cert PDF.
- No edit on the row (correct — these certs aren't editable).

Verified: `tsc --noEmit` clean. My code lint-clean (2 eslint issues at lines 211/379 are **pre-existing**, unrelated — surfaced only because [[Gotchas|nx lint is broken]]).

## UNBLOCKED (2026-06-07) — backend shipped the online-course cert PATCH

> [!success] The previously-missing endpoint now exists
> `PATCH /api/online-courses/certificates/{id}` — *"Update issued online course certificate metadata and queue PDF regeneration"*, RBAC **[SA/AD/TM]**. Confirmed on staging Swagger. This is the endpoint flagged missing in Step 4; backend (notified 2026-06-04) built it.

Shape — **metadata edit, not rich-text** (differs from general `Certificate`'s `filledContent`):
```jsonc
// path: id = OnlineCourseCertificate _id
{
  "displayData": { /* arbitrary key:value metadata */ },
  "issuedAt": "string",
  "scorePercentage": 0,
  "courseTitle": "string"
}
```
- Editing **queues PDF regeneration** (async) — the cert PDF re-renders from the new data; UI should reflect that the PDF updates after a delay, not instantly.
- **RBAC `[SA/AD/TM]`** is broader than the ticket's "Super Admin only" — same contradiction as the general system. **Gate FE by permission, not hardcoded role** (consistent with the Step 1–3 decision).

FE work to build this path — **done (2026-06-07, tat-ws `dev`, committed `cece4e1`)**:
- [x] New hook `useUpdateIssuedCertificate` + `UpdateIssuedCertificatePayload` → `PATCH /online-courses/certificates/{id}`, added to `online-courses/enrollments.ts` (co-located with `useGetEnrollmentCertificates` + the `OnlineCourseIssuedCertificate` type). Invalidates `['enrollmentCertificates']`. **NB:** name `usePatchOnlineCourseCertificate` was already taken by an unrelated hook (edits a course's cert *template HTML* at `/online-courses/{id}/certificates/{type}`) — don't confuse them.
- [x] Edit UI = new `IssuedCertificateEditModal.tsx` (sibling of `ManageTrainees/index.tsx`): **structured form** — `courseTitle`, `issuedAt` (date), `scorePercentage` (0–100 validated), plus a dynamic key/value editor for `displayData`. NOT the rich-text `CertificateEditor`.
- [x] Wired from the trainee row: `CertificateCell` badges now carry a pencil **Edit** affordance (shown only when `canEditCertificate`); `certTarget` gained an `intent: 'view' | 'edit'`, reusing the existing enrollment-cert fetch to resolve the cert `_id`.
- [x] Async PDF regen handled: success toast says "PDF is regenerating"; mutation invalidates the issued-cert query so it refetches.
- [x] Permission gate: reused `Actions.UPDATE_CERTIFICATE` (`UCE`) via `useFetchRoleActions`, mirroring the certificate-catalog pattern. **Open nuance:** the backend endpoint allows **SA/AD/TM** (role-based, hardcoded in the route), but `UCE` is seeded **SA+TM** — so an **AD** user is allowed by the backend yet hidden by the FE gate. Resolve by either seeding `UCE` to AD too, or adding a dedicated action for this endpoint. Flagged for backend.

Verified: `tsc --noEmit -p apps/tat-ws/tsconfig.json` **0 errors**; eslint clean on both new files (the 2 issues in `ManageTrainees/index.tsx` at lines 239/407 are **pre-existing**, unrelated — surfaced only because [[Gotchas|nx lint is broken]]).

## Re-scoped to rich-text HTML editing — BLOCKED on backend (2026-06-11)

> [!danger] BA decision: edit the certificate **HTML**, like the general editor (no versioning)
> The 2026-06-07 build edited `displayData` + scalars (Path A). The **BA rejected that** — the online-course cert editor must mirror the **general certificate editor** (rich-text HTML on the cert), **minus versioning**. So the SA edits the certificate's HTML directly, not just interpolation variables.

**Backend contract gap (the blocker).** Hamza confirmed (Slack/Jira comment, 2026-06-10) he now returns **`templateHtmlSnapshot`** on both `GET /online-courses/certificates/enrollment/:enrollmentId` and `GET …/:id`. But **`PATCH /online-courses/certificates/:id` can't take the HTML back** — `UpdateOnlineCourseCertificateDTO` only accepts `displayData`, `issuedAt`, `scorePercentage`, `courseTitle` (verified on `origin/dev`, `tat-app-ws`). The schema comment confirms intent: `templateHtmlSnapshot` is *"HTML template frozen at first issuance"* and `displayData` are *"interpolation variables"* — the system was built for value-editing (Path A), not raw-HTML editing (Path B).

**Asked Hamza (commented on TAT-428, 2026-06-11)** to: (1) add `templateHtmlSnapshot?: string` (optional) to `UpdateOnlineCourseCertificateDTO`; (2) persist it in `updateCertificate` and regenerate the PDF from the **edited** snapshot. No versioning.

> [!success] UNBLOCKED same day (2026-06-11) — backend now accepts HTML
> Hamza updated `PATCH /api/online-courses/certificates/{id}` (confirmed on staging Swagger): request body is now `{ "templateHtml": "string" }`. RBAC unchanged **[SA/AD/TM]**.
>
> Two contract gotchas spotted in the Swagger:
> 1. **Field-name mismatch**: the PATCH takes **`templateHtml`**, but the GETs return **`templateHtmlSnapshot`** (per Hamza, 2026-06-10). Read one name, write the other — verify the GET shape on staging before wiring, and confirm with Hamza which name is canonical.
> 2. **The old metadata fields look GONE from the PATCH body** — the example shows *only* `templateHtml`, no `displayData`/`issuedAt`/`scorePercentage`/`courseTitle`. If they were removed (not just omitted from the example), the committed structured-form path (`cece4e1`) now sends a payload the DTO strips/rejects. Moot once the rich-text modal replaces it, but don't leave the old modal live in the interim.

**FE build — done 2026-06-11 (tat-ws `dev`, committed `d5a6d25`; tsbuildinfo untracked + gitignored in `d86ff72`):**
- [x] `enrollments.ts`: added `templateHtmlSnapshot?` to `OnlineCourseIssuedCertificate`; `UpdateIssuedCertificatePayload` reworked to `{ id, templateHtml }` (old metadata fields removed).
- [x] **Deleted `IssuedCertificateEditModal.tsx`** (the superseded structured form) and instead **reused the general `CertificateEditModal`** from certificate-catalog — literally the same fullscreen quill editor the BA asked to mirror. Added an optional `courseType` prop to `CertificateEditModal` (passed through to `CertificateEditor`) so the online path gets the `{{ ... }}` online placeholder catalog instead of the aircraft one.
- [x] `ManageTrainees/index.tsx`: edit intent now opens `CertificateEditModal` with `filledContent={cert.templateHtmlSnapshot ?? ''}`; `handleSaveIssuedCert` → `mutateAsync({ id, templateHtml })`, success toast "PDF is regenerating", **re-throws on error so the modal stays open** (CertificateEditModal catches and keeps the admin's edits). Invalidation of `['enrollmentCertificates']` unchanged in the hook.
- [x] Permission gate: `OC_UPDATE_CERTIFICATE` **not in `actionsEnums.ts` yet** — kept `UCE` (AD-gating nuance stands).
- Verified: `tsc --noEmit` clean (only pre-existing `specs/index.spec.tsx` `@testing-library/react` error, confirmed present on baseline too); eslint clean on my changes (the 2 issues in `ManageTrainees/index.tsx` are the known pre-existing ones, now at lines 240/408).
- **Untested against staging** — needs a real issued cert: confirm the GET actually returns `templateHtmlSnapshot`, edit → save → PDF regenerates from edited HTML.

## ✅ DONE (2026-07-05)

Marked complete. All three cert-edit paths shipped, and the online-course rich-text path is **contract-verified against backend source** (`tat-app-ws` `dev`):
- **Field-name mismatch is real and the FE handles it right** — schema stores `templateHtmlSnapshot` (`online-course-certificate.schema.ts:51`); `UpdateOnlineCourseCertificateDTO` accepts `templateHtml` (`online-course.dto.ts:618`); `updateCertificate()` reads `dto.templateHtml` → writes `cert.templateHtmlSnapshot` (`:665`). FE reads the snapshot into the editor, PATCHes `{ templateHtml }` — exact match.
- **Metadata fields intentionally stripped** — DTO has *only* `templateHtml`; the abandoned `cece4e1` structured form would've been rejected. `d5a6d25` correctly deleted it.
- **PDF regenerates from the edited HTML** — `updateCertificate()` sets the snapshot, flips `pdfGenerationStatus`, `enqueueCertificateRegeneration()` (`:665–672`); worker renders `generatePdfFromHtml(cert.templateHtmlSnapshot)` (`:125`). Async via queue.
- Live click-through (SA → Manage Trainees → edit → save → PDF re-render) left as a lightweight manual follow-up; the contract that gates it is proven.

## Status summary
- ✅ Editable certs (general): catalog edit + permission gate (Step 1–3)
- ✅ Online-course certs (trainee row): view PDF (Step 4)
- ✅ Editing online-course certs (rich-text HTML, per BA): **FE built 2026-06-11, committed `d5a6d25`** (tat-ws `dev`) — reuses the general `CertificateEditModal`/quill editor bound to `templateHtmlSnapshot`, PATCHes `{ templateHtml }`; also fixed the modal's oversized Close button (IconButton → Button). Replaces the `cece4e1` structured form. **Contract-verified from source 2026-07-05; live E2E is a manual follow-up.**

## Remaining / notes
- [x] If product wants online-course certs editable too → backend must add editable content + `PATCH` (separate, backend team). **Backend notified 2026-06-04 → shipped 2026-06-07.**
- [x] Build the online-course cert edit FE path (checklist above). **Done 2026-06-11, committed `d5a6d25`.**
- [x] Verify against staging (needs an issued cert): GET returns `templateHtmlSnapshot`; edit → save → PDF regenerates from the edited HTML. **Contract-verified from backend source 2026-07-05** (schema + DTO + `updateCertificate` regen path all confirmed); live click-through deferred as a manual follow-up.
- [ ] Backend (later, not us): tighten general `UPDATE_CERTIFICATE` to SA-only (and confirm the SA/AD/TM scope on the new endpoint vs ticket's SA-only); add the dedicated `OC_UPDATE_CERTIFICATE` action (still absent from `actionsEnums.ts` as of 2026-06-11), then switch the FE gate from `UCE`.

## Related
- [[tat-ws]] · [[tat-app-ws Backend]] · [[TAT API & Auth Model]] · [[TAT Platform]]
- Prior ticket: [[TAT-434 Email Verification]]
- Competencies: [[Systems Thinking]] — discovered the two independent cert systems; diagnosed the DTO gap from backend source · [[Delivery & Scope Management]] — re-scoped the mis-filed ticket + flagged the RBAC contradiction; absorbed the BA rejection with a same-day rebuild · [[Debugging & Root Cause Analysis]] — caught the `templateHtml`/`templateHtmlSnapshot` mismatch + stripped-fields hazard from the Swagger alone · [[Code Quality]] — reused the general editor instead of rewriting; deleted the superseded modal
