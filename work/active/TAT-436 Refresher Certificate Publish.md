---
date: 2026-07-05
description: "TAT-436 — control certificate visibility for refresher courses: FE wiring of the SA-only publish endpoint + Unpublished indicator/Publish button on Manage Trainees (tat-ws)"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-ws
ticket: TAT-436
---

# TAT-436 Refresher Certificate Publish

Jira: [TAT-436](https://cryptonic-art.atlassian.net/browse/TAT-436) · *Highest* · part of the [[TAT-409 Staff Management Subsystem|TAT-409]] epic. Extends the [[TAT-428 Edit Issued Certificates|certificate]] surface directly. Reassigned to me from the original assignee (2026-07-05).

## Requirement

For **refresher / TOR-assigned** online-course enrollments, the generated certificate must stay **hidden from the trainee until a Super Admin publishes it**. Manage Trainees needs an **"Unpublished" indicator** on such certs and a **Publish button** (Super Admin only).

## Backend — already shipped (`cb267288`, Hamza, 2026-06-30, tat-app-ws `dev`)

The backend half was merged before I picked up the FE. Verified from source ([[tat-app-ws Backend]]):

**Data model**
- `OnlineCourseCertificate.publishedAt: Date|null` + `publishedBy: ObjectId|null` — `null` = awaiting SA publish. **Legacy certs (field absent) count as published** (`isOnlineCourseCertificatePublished`), so [[TAT-428 Edit Issued Certificates|TAT-428]] is unaffected.
- `OnlineCourseEnrollment.requiresCertificatePublish: boolean` (default false) — set true for TOR/refresher assignments. Auto-resolved (`resolveRequiresCertificatePublish`): refresher course **+** a `StaffHistoryForm` exists for the user ⇒ true; or forced via the new optional `requiresCertificatePublish` on `AddTraineeToOnlineCourseDTO`.

**Response shape** — every cert GET now returns a computed **`isPublished: boolean`** (`mapCertificatePublishStatus`). The trainees-list method (`getCourseTrainees`) returns each row's `certificates` as objects `{ _id, type ('ATTENDANCE'|'EXAM'), certificateNumber, issuedAt, isPublished, publishedAt }` — so `_id` + `isPublished` are on the row already (no extra fetch to publish).

**New endpoint** — `POST /online-courses/certificates/:id/publish` — **SUPERADMIN only**. Sets `publishedAt`/`publishedBy`. 400s: `onlineCourseCertificateAlreadyPublished`, `onlineCourseCertificateNotEligibleForPublish` (enrollment doesn't require publish).

**Server-side visibility (already enforced — no FE work to hide)**
- `GET /certificates/my` (trainee portal) filters out unpublished → [[tat-portal]] just works.
- Completion-action flags (`showCourseCompletionCertificate` / `showExamCertificate`) now gate on published certs only.
- `getCertificateById` / `getCertificateByEnrollmentId` take the actor's id+role: **SA/AD see everything** (incl. unpublished); trainee sees only their own *published* cert, else 404.

## FE — done (tat-ws `dev`, uncommitted 2026-07-05)

Two files, both tsc-clean and lint-clean on my changes:

- `services/api-hooks/online-courses/enrollments.ts`:
  - Fixed a **stale type** — `OnlineCourseEnrollment.certificates` was declared `Array<'ATTENDANCE'|'COURSE_AND_EXAM'>` but the `/trainees` endpoint has returned **objects** since before TAT-436. Introduced `OnlineCourseRowCertificate { _id, type: 'ATTENDANCE'|'EXAM', certificateNumber, issuedAt?, isPublished, publishedAt? }`.
  - New hook `usePublishIssuedCertificate` → `POST /online-courses/certificates/{id}/publish`. Invalidates `['onlineCourseEnrollments']` (flips the row) + `['enrollmentCertificates']`. **Named to avoid the collision** with `certificates/usePublishCertificate` (general `Certificate` at `/certificates/{id}/publish`) — same gotcha class as the TAT-428 `usePatchOnlineCourseCertificate` clash.
- `.../ManageTrainees/index.tsx`:
  - `CertificateCell` reworked to iterate cert **objects** (`cert.type` / `cert._id`), fixing the latent string-vs-object mismatch. Adds an amber **"Unpublished"** pill (`FaEyeSlash`) when `!isPublished`, and a green **Publish** button (SA-gated, per-button loading) when `!isPublished && canPublish`.
  - Publish is **Super Admin-gated by role** (`useUserRole().userRole.code === SystemRolesCodes.SUPER_ADMIN`), *not* by a role-action — the endpoint is role-locked to SA and there's no dedicated permission action. Contrast with the edit affordance, which is permission-gated (`Actions.UPDATE_CERTIFICATE`).
  - `handlePublishCertificate` publishes straight from the row `_id` (no fetch); success/error toasts parse the backend message like the TAT-428 save handler.

## Notes / deferred

- **Not wired:** the optional `requiresCertificatePublish` on the Add-Trainee modal. Refresher/TOR enrollments come through the staff/prereq flow and the backend auto-resolves the flag, so the manual admin Add-Trainee path doesn't need it. Revisit only if product wants manual control.
- [ ] Live E2E on staging: enroll a refresher/TOR trainee → cert issues `isPublished:false` → row shows "Unpublished" → SA clicks Publish → row flips + trainee can access. (Same manual-verify pattern as [[TAT-428 Edit Issued Certificates]].)
- [ ] Commit + push once verified.

## Related
- [[TAT-428 Edit Issued Certificates]] — the cert surface this extends (view/edit issued online-course certs)
- [[TAT-455 Final TOR Certificate - SA Publish Gate]] — the same SA publish-gate concept applied to the **TOR** certificate in [[tat-prereq]] (2026-08-02); different subsystem, same "approved ≠ visible" split
- [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]] — the epic + domain (refresher-cert publish is a TOR-model requirement)
- [[tat-ws]] · [[tat-app-ws Backend]] · [[TAT API & Auth Model]]
- Competencies: [[Systems Thinking]] — traced the full publish contract across schema/DTO/service/visibility before writing FE · [[Debugging & Root Cause Analysis]] — caught the stale `certificates` row type (objects, not strings) from backend source · [[Code Quality]] — reused the existing cell/toast patterns, renamed the hook to dodge the publish-name collision
