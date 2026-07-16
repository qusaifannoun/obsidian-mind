---
date: 2026-06-18
description: "Backend bugs and gaps blocking the Staff Management / PreRequisites FE, found while matching tat-prereq against tickets TAT-410–435. Endpoint-level handoff for the backend team."
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q2-2026
project: tat-app-ws
ticket: TAT-409
---

# TAT-409 — Backend Open Items

Bugs and gaps found while wiring the [[tat-prereq]] frontend to staging and matching it against the [[TAT-409 Staff Management Subsystem|TAT-409]] tickets (TAT-410 → TAT-435).

- **Base URL (staging):** `https://staging.api.tat147.com/api`
- **Verified as:** Hamza Dawahreh (Super Admin, has action grants)
- **Repo:** [[tat-app-ws Backend]]

Each item lists the **endpoint**, **how to reproduce**, what's **observed**, and what's **expected**. Ordered by impact — **#1 is the critical path**.

---

## ✅ Resolved

- **Instructor can't open own TOR** (was 🔴 blocking) — backend **granted instructors
  access to `GET /tors/:torId/details`** (2026-06-21). FE already called `/details`
  for all roles, so no FE change was needed. See [[TAT-409 Instructor TOR View - API Spec]].
- **Form 285 CARC-only filter**, **matrix email/phone**, **`expired` status**,
  **History basic-info engine**, **sync/expiry recompute** — shipped by backend (range `7f4cdec8..b0c669c1`).
- **FE this session:** History Form wired with field-level rejection; Form 32 pointed at the renamed `/form-32` routes.

---

## 🔴 Blocking — write paths

### 1. Action-grant gap — `401` on writes for non-SA roles/accounts
**Tickets:** TAT-414, TAT-415, TAT-435 · **Severity:** High

**Endpoints affected (all writes):**
| Action | Method + path |
|--------|---------------|
| Form 285 save draft | `PATCH /staff-management/tors/:torId/form-285` |
| Form 285 submit | `POST /staff-management/tors/:torId/form-285/submit` |
| Form 285 upload/replace signed | `POST` / `PATCH /staff-management/tors/:torId/form-285/signed` |
| Document upload | `POST /staff-management/tor-documents` |
| Document approve/reject | `PATCH /staff-management/tor-documents/:docType/approve` · `/reject` |

**Observed:** as Instructor (and several seeded TM/QM accounts) every write returns:
```
HTTP 401
{ "message": "Sorry, you are not permitted to perform this action." }
```
Same calls succeed as SA. So the route logic is correct — the **action grants / role permissions** are missing for TM, QM, and Instructor.

**Expected:** TM/QM can review + approve/reject; Instructor can save + submit their own Form 285. Grant the corresponding actions to those roles.

> This is the gate, not an FE gap. The write-side ACs of TAT-414/415/435 can't be verified until the grants land.

---

### 2. No persistence backend for two form engines
**Tickets:** TAT-417, TAT-423 · **Severity:** High

No endpoints exist — the FE runs on dummy data (`src/api/Forms/dummy-*.ts`, React-Query cache only).

- **History Form** (TAT-417) — needs GET + save/submit + per-field approve/reject. Field-level rejection is currently impossible (FE can only do whole-form).
- **Assessment Form / Report** (TAT-423) — needs GET + save/submit + approval, assignment notifications, and real video upload.
- **Form 32 / 032-A** (TAT-415) — editor is fully built; **no endpoint at all** under `src/api/Form32` (none exists). Needs GET + save + submit + approve, mirroring the Form 285 shape.

**Expected:** endpoints mirroring the Form 285 contract (`GET/PATCH /tors/:torId/<form>`, `POST .../submit`, approve/reject).

---

## 🟠 Data correctness

### 3. Form 285 seeded for all licenses (should be CARC-only)
**Ticket:** TAT-414 AC-01 · **Severity:** Medium

**Endpoint:** `GET /staff-management/tors/:torId/details` (the `sections[].forms[]` list) and `GET /staff-management/tors/:torId/form-285`.

**How to reproduce:** open a TOR whose `licenseAuthority.name` is `EASA` or `GCAA` → the response still includes a `form_285` entry.

**Observed:** Form 285 is present on EASA and GCAA TORs.
**Expected:** Form 285 only exists for **CARC** TORs. The FE filters it by authority as a guard (`src/api/Tor/adapters.ts` → `allowedForLicense`), but the backend should not generate/return it for non-CARC. Check the TOR seed/creation logic that attaches forms to sections.

---

### 4. TOR Matrix card DTO missing `email` & `phone`
**Ticket:** TAT-433 AC-04 / AC-07 · **Severity:** Medium

**Endpoint:** `GET /staff-management/tor-matrix`

**Observed:** the per-staff card object returns:
```jsonc
{ "userId": "...", "name": "...", "role": {...}, "torSummary": {...}, "tors": [...] }
// no `email`, no `phone`
```
Search by email/phone works (server-side `?search=` matches), but because the card omits the fields, they render **blank** in the expanded staff card.

**Expected:** add `email` and `phone` to each `data[]` card object so AC-04/AC-07 can display them. (FE type: `MatrixStaffCard` in `src/types/tor-api.ts` — fields will be consumed the moment they're returned.)

---

### 5. `expired` form status must be computed server-side
**Ticket:** TAT-435 AC-11 · **Severity:** Medium

**Endpoint:** `GET /staff-management/tors/:torId/details` → `sections[].forms[].status`

**Context:** AC-11 requires **Expired** and **Missing** as distinct indicators. The FE now renders `expired` distinctly (orange) from `missing` (gray) — but only if the backend actually returns `status: "expired"`.

**How to reproduce:** find a TOR with a lapsed-validity form → confirm its status.
**Observed/Risk:** forms past validity may still report `active` instead of `expired`.
**Expected:** compute and return `"expired"` when a form's validity window has passed. (Valid `status` values the FE maps: `active`, `pending_approval`, `rejected`, `expired`, `missing`.)

---

## 🟢 New gap — found while wiring the FE (2026-06-21)

### History Form: aircraft quals & training history have no CRUD
**Ticket:** TAT-417 · **Severity:** Medium

The shipped History Form (`b0c669c1`) implements **basic info** fully
(get/save/submit/approve + field-level reject) — FE now wired to it. But the
shell only returns **`aircraftQualificationCount`** and **`trainingHistoryCount`**;
there are no list/create/delete endpoints for either section (AC-08–18). The FE
renders them as **read-only counts** until endpoints exist.

**Needed:** GET list + add/remove for aircraft qualifications and for relevant
training records on the instructor's shared History Form.

---

## 🟢 New gap — found while wiring the FE (2026-07-15)

### Assessment audit entries are TOR-scoped, not assessment-scoped — blocks the per-assessment audit timeline
**Source:** Word-doc bug list (not on Jira) · **Feature:** [[TAT-423 Assessment Report Rubric|assessment report]] · **Severity:** Medium · **Not started — blocks the FE audit-timeline feature**

Product wants a **form-level audit log on each Staff assessment** (a reusable timeline on every assessment card). The backend **already writes the events** — the problem is read-side isolation.

**Observed:** `StaffTorAuditLog` rows are scoped to **`torId` only**. Assessment `writeAudit(tor, …)` passes just `tor._id`, but a TOR has **multiple assessments (one per aircraft type)**, so every assessment on a TOR shares one undifferentiated trail — the FE can't isolate a single assessment's history.

**Evidence:**
```
staff-tor-audit-log.schema.ts   stores torId/userId/historyFormId/event/from/to/triggeredBy
                                 — no generic entity ref
staff-assessment.service.ts:691 writeAudit(tor, event, from, to, actor)  — only tor._id
                                 events recorded at :161 / :251 / :422 / :474 / :578 / :646  (six call sites)
enums.ts:1224                    StaffAssessmentStatus = assigned/draft/pending_tm_review/approved
                                 — NO rejected state
```

**Requested (backend):**
1. Add a generic **`subjectType` + `subjectId`** pair to `StaffTorAuditLog` (so any entity — assessment, later others — can be isolated, not just TOR/HF).
2. Thread **`assessmentId`** through **all six** `writeAudit` call sites.
3. New **`GET …/assessments/:assessmentId/audit-log`** — events + `triggeredBy` resolved to a name, sorted **ascending**. Mirror the History Form read side (dedup, name resolution) — see [[History Form Audit Log#Read side (added 2026-07-11)]].
4. **Product decision:** is a **reject-back** flow in scope? The assessment status enum has no `REJECTED` today; adding the audit view may expose the need for it.

**FE follow-up (separate):** one reusable `AuditTimeline` component on each assessment card, reused for Form 32. The History Form already shipped `HistoryFormAuditTimeline.tsx` — generalize that rather than build a new one.

**Touches (backend):** `libs/schemas/.../staff-tor-audit-log.schema.ts` · `libs/database/.../staff-assessment.service.ts` · the staff-management assessment controller/module.

Related: [[TAT-423 Assessment Report Rubric]] (the assessment feature) · [[History Form Audit Log]] (the schema + the read-side pattern to mirror).

---

## 🟡 Auto-behaviour / enrichment

### 6. Auto-update TOR indicators
**Tickets:** TAT-433 AC-11, TAT-435 · **Severity:** Low

TOR/section status (from `/tor-matrix` and `/tors/:torId/details`) should **recompute automatically** as underlying forms are approved/rejected/expire, so the Matrix and Pending pages reflect current state without manual intervention. Verify the rollup is derived, not stored-and-stale.

### 7. `/profiles/me` returns thin data
**Severity:** Low

The self endpoint is thin, so the rich profile view falls back to a second call `GET /user/details/:id` (`src/api/Staff/fetchers.ts` → `BackendUserDetail`). `me` should return the full detail object to avoid the extra round-trip.

---

## ⚪ Contract alignment (works today, worth fixing)

### 8. `401` / `403` inversion
**Severity:** Low

**Observed across the API:**
- Authorization failures → **`401`** with `"Sorry, you are not permitted to perform this action."` or `"Prerequisites for this action are not met"`
- Expired / invalid token → **`403 "Forbidden resource"`**

This is inverted from convention (`401` = unauthenticated/expired, `403` = authenticated-but-forbidden). The FE interceptor special-cases it (`src/lib/axios/client.ts` → `isAuthzFailure`, skips token-refresh on authz-401s so the user isn't logged out). Aligning to the standard would let the FE drop that workaround.

---

## Related
- [[TAT-409 Staff Management Subsystem]]
- [[Staff Management Subsystem & TOR Model]] — the TOR/forms data model
- [[TAT API & Auth Model]] — auth/contract reference
- [[tat-app-ws Backend]] — target repo
