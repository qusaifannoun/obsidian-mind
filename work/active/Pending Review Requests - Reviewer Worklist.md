---
date: 2026-07-09
description: "Spec: turn the Pending TORs page from a per-staff list into a per-review-request worklist — each form/assessment/history item in a pending-review state as its own actionable row"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-prereq
---

# Pending Review Requests — Reviewer Worklist

Redesign the [[tat-prereq]] **Pending TORs** page (`PendingTorsView`) so it lists **actual pending review requests** (one row per item awaiting a reviewer's approve/reject), not one row per staff member. A staff member can have several requests in flight (Form 32A for aircraft X, Form 285, an assessment) — the current per-staff list hides that. Option A from the 2026-07-09 discussion.

> [!success] Implemented + pushed to `dev` (2026-07-09) — COMPLETE coverage
> Full reviewer worklist: **every** reviewer-actionable pending state as its own row, with staff-name search, kind filter, and server pagination.
> - **Phase 1** (Form 285 + Form 32) — backend `10c0d1cf`, FE `fa8aed5`/`3224249`
> - **Search + server pagination** — `07ee072`
> - **Kind filter** (+`form_32` umbrella) — backend `b6ddbca6`, FE `33a46a2`
> - **Phase 2** (History: basic-info/mandatory/training-history/sit-in + `history` umbrella) — backend `c64a73be`, FE `70a9a7a`
> - **Initial TOR Documents** (`StaffTorDocument` DRAFT) — backend `e2f1f687`, FE `a907828`
> - **Aircraft Qualifications** (`PENDING_PIC`, → TOR detail) **+ Training Course Requests** (`pending`) — backend `b520fd7d`, FE `3728a08`
>
> Sources covered: **Form 285, Form 32 A–D, Assessment, Aircraft Qualification, Documents, History (basic-info/mandatory/training-history/sit-in), Course Request.** Still out: **External Teaching** (`PENDING_PIC` — separate model, not chased). Remaining: live E2E once `dev` deploys; per-role queue scoping (285 `pending_am`=AM vs `pending_sa`=SA) deferred to v2.

## Current state (why a reshape isn't enough)

- `listPendingTors` (`staff-management.service.ts:1164`) returns **per-user** rows (`{ userId, name, email, role }`) for users with an *incomplete TOR* (`findUserIdsWithIncompleteTors`). "Incomplete" = TOR not fully ACTIVE — broader than "review requested".
- `getStaffPendingTors` (drill-in) returns **per-TOR** `{ torId, licenseAuthority, authorityName, torStatus }` — no form-level review detail.
- **No endpoint lists items in a pending-review state.** So this needs a new backend read; the FE doesn't receive request-level data today.

## Review sources + their pending states

| Source | Model | Pending state | Scope |
|---|---|---|---|
| Form 285 | `StaffTorForm` (workflowType `INSTRUCTOR_AM_SA_SIGNED`) | `workflowStage ∈ {pending_am, pending_sa}` | per-TOR |
| Form 32 A/B/C/D | `StaffTorForm` (`INSTRUCTOR_SA_REVIEW`) | `workflowStage = pending_review` | per-TOR, per-aircraft (`instanceKey`) |
| Assessment Report | `StaffAssessment` | `status = pending_tm_review` | per-TOR, per-aircraft |
| History Form basic-info | `StaffHistoryForm` | `status = pending_approval` | per-instructor |
| Mandatory training | `StaffHistoryForm.mandatoryTraining[]` | slot `status = pending_approval` | per-instructor, per-course |
| Training-history record | `StaffHistoryForm.trainingHistory[]` | `status = pending_approval` | per-instructor, per-record |
| Sit-in final assessment | `StaffSitIn` | `status = pending_tm_review` | per-instructor |

`StaffTorForm` has no `userId` — resolve it via `torId → tor.userId`. `instanceKey` = the aircraftTypeId for Form 32/assessment.

## Unified row shape (`PendingReviewRequestDTO`)

```ts
{
  requestId: string;         // underlying record _id (form/assessment/sit-in/history)
  kind: 'form_285' | 'form_32a' | 'form_32b' | 'form_32c' | 'form_32d'
      | 'assessment' | 'history_basic_info' | 'mandatory_training'
      | 'training_history' | 'sit_in';
  title: string;             // "Form 32A — Theoretical Instructor", "285 Form", "Assessment Report", …
  staffId: string;
  staffName: string;
  role: string;
  torId?: string | null;             // TOR-scoped kinds
  aircraftTypeId?: string | null;
  aircraftTypeName?: string | null;  // resolved for display
  submittedAt?: string | null;       // form submit timestamp; else updatedAt
}
```

The FE derives the **review deep-link** from `kind` + ids (mirrors `Form32Editor`/`TorDetailView` `formHref`):
- `form_285` → `/staff/{staffId}/tor/{torId}/form-285`
- `form_32x` → `/staff/{staffId}/tor/{torId}/form-32/{kind}/{aircraftTypeId}`
- `assessment` → `/staff/{staffId}/tor/{torId}/assessment-form`
- `history_basic_info | mandatory_training | training_history | sit_in` → `/staff/{staffId}/history-form`

## Backend spec (`tat-app-ws`)

New read on `staff-management.service.ts` + a controller endpoint.

- **Endpoint:** `GET /staff-management/pending-review-requests` — query `{ search?, kind?, skip?, limit? }`. Guard: `canViewPendingTors` (SA/TM/QM), same as the existing pending-tors gate.
- **`listPendingReviewRequests(actor, query)`:**
  1. Query each source for its pending state (table above), each `.lean()`.
  2. Resolve staff (name/role) and, for TOR forms/assessments, the TOR (`userId`, license) + aircraft type name.
  3. Normalize every hit to `PendingReviewRequestDTO`; label `title` from the template (`formKey` → title) or a static map for History kinds.
  4. Merge, filter by `search` (staff name) / `kind`, sort by `submittedAt` desc, paginate → `{ data, totalCount }`.
- **Phasing** (ship in slices):
  - **Phase 1 — TOR review requests:** `StaffTorForm` (285 + 32 A–D) + `StaffAssessment`. Single clean query per collection; covers the primary reviewer worklist.
  - **Phase 2 — History-Form requests:** basic-info + mandatory training + training-history + sit-in (per-instructor sub-documents — needs `$unwind`-style extraction or in-memory flattening of the History-Form arrays).
- DTOs in `libs/dtos/src/lib/staff-management.dto.ts`: `PendingReviewRequestDTO`, `PendingReviewRequestsListResponseDTO`, `GetPendingReviewRequestsQueryDTO`.

## Frontend spec (`tat-prereq`)

- **Data:** `getPendingReviewRequests` fetcher + `usePendingReviewRequests` hook (`src/api/Tor/`); types in `src/types/tor-api.ts` (wire) + `src/types/tor.ts` (view).
- **`PendingTorsView` reshape:** table columns **Staff · Request · Aircraft · Submitted · →**. Row / "Review" action deep-links via a `reviewHref(kind, ids)` helper (extract/rename the existing `formHref` pattern). Count badge → "N requests pending review". Keep the `canAccess('/pending-tors')` gate + empty state.
- Optional: a `kind` filter (All / Form 285 / Form 32 / Assessment / History) and staff search wired to the backend query.

## Open questions / decisions

- **Scope of "request":** Phase 1 = TOR forms + assessment (recommended first). Confirm History-Form items (Phase 2) are wanted here vs. surfaced on the History Form itself.
- **Role scoping:** should the list respect *who can review what* (e.g. Form 285 pending_am is the Accounting Manager's queue, pending_sa the SA's), or show all pending to any authorized viewer? Current pending-tors gate is coarse (SA/TM/QM). Recommend: show all pending to authorized viewers in v1; add per-role queue filtering later.
- **Keep the old per-staff page?** Recommend replacing it (this is strictly more useful), keeping the drill-in `/pending-tors/[id]` overview reachable from a staff-name link.

## Related

- [[Form 32 Rejection History & Round-Scoped Stamps]] — same review/workflow surface (workflowStage, reviewer actions)
- [[tat-app-ws Backend]] · [[tat-prereq]] · [[Staff Management Subsystem & TOR Model]] · [[TAT-409 Staff Management Subsystem]]
- [[Systems Thinking]] · [[Delivery & Scope Management]]
