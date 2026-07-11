---
date: 2026-07-11
description: "What the tat-app-ws backend records to StaffTorAuditLog for History Form (TAT Form 031) actions — record shape, the full event list by section, the per-TOR fan-out quirk, and the read-side gap"
tags:
  - reference
---

# History Form Audit Log

How [[tat-app-ws Backend]] records audit trail for the [[Staff Management Subsystem & TOR Model|History Form]] (TAT Form 031, the shared shell across all of a staff member's TORs). Captured 2026-07-11.

## Storage

One collection: **`StaffTorAuditLog`** (`libs/schemas/src/lib/staff-tor-audit-log.schema.ts`). Every entry:

| Field | Meaning |
|-------|---------|
| `event` | the action, a `StaffTorAuditEvent` enum value |
| `userId` | the staff member the form belongs to |
| `historyFormId` | the HF shell (set for all HF events) |
| `torId` | the TOR this row was fanned to (or `null` if the user has no TORs) |
| `from` / `to` | value or status transition |
| `triggeredBy` | **the actor's userId** for manual actions, `"system"` for automatic |
| `createdAt` | timestamp (`timestamps: { createdAt: true, updatedAt: false }`) |

## The per-TOR fan-out (important)

HF audit is written by two **identical** helpers: `writeHistoryFormAuditForUser` (`history-form-audit.util.ts`) and the private `writeAuditForUser` in `staff-history-form.service.ts`. Both do:

```
find non-archived TORs for userId → write ONE audit entry PER TOR
(if zero TORs → one entry with torId: null)
```

So a single HF action on a staff member with **N TORs writes N identical rows** (differing only by `torId`). Because Form 031 is *shared* across all their TORs, this is by-design for **TOR-scoped** timelines — but any **HF-scoped** read must dedup by `historyFormId` + `event` + `createdAt` + `triggeredBy` or it shows each event N times. Do **not** "fix" this by changing the write model; dedup at read time.

## What's logged, by HF section

Write coverage is **complete** — every mutation method in each HF service writes an audit entry. Actor is captured (`triggeredBy`).

- **Form shell / lifecycle** (`staff-history-form.service`) — `HISTORY_FORM_CREATED`, `HISTORY_FORM_STATUS_CHANGED`, `HISTORY_FORM_APPROVED`
- **Basic info** (`staff-history-form.service`) — `HISTORY_FORM_BASIC_INFO_SAVED`, `_SUBMITTED`, `_RESUBMITTED`, `_UPDATED` (privileged direct edit), `_APPROVED`, `_FIELD_REJECTED`
- **Type training / aircraft qualifications** (`staff-history-form.service`) — `HISTORY_FORM_AIRCRAFT_QUALIFICATION_CREATED`, `_UPDATED`, `_DELETED`
- **Training history** (`staff-history-training-record.service`) — `TRAINING_HISTORY_CREATED`, `_APPROVED`, `_REJECTED`, `_DELETED`
- **Mandatory training** (`staff-history-mandatory-training.service`) — `MANDATORY_TRAINING_SAVED`, `_SUBMITTED`, `_APPROVED`, `_REJECTED`, `_FIELD_REJECTED`, `_FIELD_CORRECTED`, `_EVIDENCE_REPLACED`, `_ONLINE_COMPLETED`
- **Training course requests** (`staff-training-course-request.service`) — `TRAINING_COURSE_REQUESTED`, `_APPROVED`, `_REJECTED`
- **Sit-ins** (`staff-sit-in.service`) — `SIT_IN_CREATED`, `SIT_IN_EVALUATOR_SUBMITTED`, `SIT_IN_FINAL_ASSESSMENT_COMPLETED`

## NOT History Form

Same collection, but these carry `torId` (not `historyFormId`) and belong to other subsystems: Form 285/32 (`FORM_*`), documents (`DOCUMENT_*`), assessments (`ASSESSMENT_*`), the per-TOR aircraft-qualification + external-teaching workflow (`AIRCRAFT_QUALIFICATION_*`, `EXTERNAL_TEACHING_*`), plus `TOR_SYNC_COMPLETED`, `FIRST_ACTIVATED`, `EXPIRY_SET`, `STATUS_CHANGED`.

## Read side (added 2026-07-11)

- **Endpoint:** `GET profiles/me/history-form/audit-log` and `GET profiles/:userId/history-form/audit-log` (`?page`, `?limit`, default 20). Gated by the same `SM_VIEW_STAFF` / `findFormForActor` access as every other HF read → **reviewers (SA/TM/QM) + the owner**. Service: `StaffHistoryFormService.listAuditLog`.
- **Dedup:** the per-TOR fan-out is collapsed in the service by key `event|from|to|triggeredBy|createdAt-to-second`, so each logical event appears once. `triggeredBy` is resolved to a name (`"System"` for automatic).
- **UI:** collapsible **"Activity log"** section at the bottom of the History Form (`HistoryFormAuditTimeline.tsx`), reverse-chron, paginated, shown to reviewers + owner. Fetches lazily (only when expanded). Event strings map to friendly labels in `EVENT_LABELS`.

## Remaining gaps

- **Dead enum members** (not cleaned up — out of scope for the read-side work): `HISTORY_FORM_TRAINING_HISTORY_CREATED`, `HISTORY_FORM_TRAINING_HISTORY_UPDATED` (superseded by the non-prefixed `TRAINING_HISTORY_*`), and `TRAINING_HISTORY_EVIDENCE_REPLACED` (no replace-evidence action exists). Safe to delete from `StaffTorAuditEvent` if touched later.
- The dedup groups to the **second**, so two identical (event, actor, from, to) actions within the same second would collapse — a non-issue for manual HF actions.

## Related

- [[Staff Management Subsystem & TOR Model]] — the HF/TOR domain
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[TAT-409 Staff Management Subsystem]]
