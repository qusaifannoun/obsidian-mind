---
date: 2026-06-04
description: "Epic tracker for TAT-409 — a new internal Staff Management subsystem (instructors + TORs) on a separate SSO subdomain. 21 tickets organized into workstreams, with the repo/scope open questions surfaced"
project: TAT
status: active
quarter: Q2-2026
ticket: TAT-409
tags:
  - work-note
  - project/tat
  - project/staff-management
---

# TAT-409 Staff Management Subsystem

Jira: [TAT-409](https://cryptonic-art.atlassian.net/browse/TAT-409) *(epic, "PreRequisites", currently Parked)* · reporter dania.baradie · 21 child tickets, mostly **Fully Approved**.

The next major build on the [[TAT Platform]]: a **new internal subsystem** for managing staff (chiefly **instructors**) and their **TORs** (per-authority training authorizations). Hosted on a **separate subdomain** with **SSO** from the TAT dashboard. Domain model, lifecycle, and forms are documented in **[[Staff Management Subsystem & TOR Model]]** — read that first; this note is the *plan and status*.

> [!important] Progress is tracked HERE in the vault — not Jira
> Qusai is building **ahead of assignment**. **Do not** update Jira status/comments for these tickets; track all progress in this note + the per-ticket work notes. Jira gets updated later, once tickets are formally assigned. (Reading tickets for scope is fine.)

## What "new frontend subsystem" means here (refining the initial read)

The kickoff framing was "a new frontend subsystem." That's the centerpiece (**TAT-430** builds it; **TAT-431–435** are its pages), but the epic is **larger than frontend** — most tickets carry a heavy **backend** half: the TOR status engine, 2-year auto-renewal, eligibility recalculation, sync-across-TORs, and audit logging are all server-side. Treat this as **full-stack across [[tat-app-ws Backend]] + a new staff frontend**, not UI-only.

> [!success] Repo resolved (2026-06-04): new repo **`tat-prereq`**, scaffolded
> Per Qusai: a **new dedicated repo** ([[tat-prereq]]), structured by **mirroring [[tat-portal]]**. Scaffold is in place and **green** (build + typecheck + lint): infra layer (axios DI, env, store, routing via **`proxy.ts`** — the Next 16 successor to middleware), TAT theme tokens, `(auth)`/`(sso)`/`(dashboard)` route groups, and stub pages for all four screens (TAT-431/432/433/435). Page bodies are placeholders awaiting their tickets. Still open: **backend scope/ownership** of the TOR engine + the SSO exchange endpoint.
>
> **Auth pages (2026-06-04):** built from **tat-portal's auth pages**, then trimmed to the ticket scope — kept **login, forgot-password, reset-password, confirm-password** + the split-panel layout, full `RHFInput` set, auth components, and `format-api-error`. **Dropped the self-registration surface** (`sign-up`, `verify-email`, `email-verify` + their deps): the tickets have no self-signup/email-verification — staff are Super-Admin-created (TAT-431→432) and enter via SSO. Theme mirrors portal (Geist, full `globals.css`, real logo + GridShape). One portal-ism left to confirm: the `X-Client-App` identity (see [[tat-prereq]]). Verified green: tsc + lint (scoped ESLint override for the vendored RHF primitives — see [[Gotchas]]) + runtime route/redirect checks.

## Workstreams (21 tickets)

### 0 · Foundation — the subsystem shell
- [ ] **TAT-430** Build Staff Management Subsystem — new subdomain, SSO/session sync (TAT dashboard ↔ Staff Mgmt ↔ Online Courses), RBAC entry for ~10 internal roles. *Highest.* **Everything else sits on this.**

### 1 · TOR engine (backend-heavy, the core)
- [ ] **TAT-410** TOR Creation — auto-create CARC/EASA/GCAA on instructor creation; Draft; auto-spawn empty Form 285 under CARC. *Highest.*
- [ ] **TAT-411** TOR Status Calculation & Auto-Renewal — Draft/Active/Paused engine; +2y on activation; auto-renew every 2y; recalc on every requirement event; audit log; block manual edits. *High.*
- [ ] **TAT-424** Assignment Eligibility Based on TOR — TOR = source of truth for assignment; hide Draft/Paused instructors; no override; single + bulk. *Highest.* (Touches existing assignment flows in [[tat-ws]].)

### 2 · Initial documents
- [~] **TAT-412/413** Initial TOR Documents (upload + review) — CV/Passport/Degree/AML/145 Auth (+optional External TOR); PIC approve/reject-with-reason. *High.* **FE done 2026-06-04 (dummy).** `InitialDocuments` section on the staff profile: upload/replace (PIC + External auto-approve, AC-18), statuses (Approved/Waiting/Rejected/Missing), rejection reason shown, PIC Approve/Reject-with-reason dialog, delete (External only). Mutations update the RQ cache (no backend). `src/api/Documents` + `src/components/documents`. **Remaining (BE-dependent):** real upload/persistence, cross-TOR sync (AC-09–11), versions/archive (AC-08/16), notifications, audit log.

### 3 · Forms
- [~] **TAT-414** Form 285 Workflow — CARC only; Instructor → Accounting Manager → Super Admin signed-upload. *(Status: **Business Analysis** — only ticket not yet Fully Approved; may still change.)* *High.* **FE done 2026-06-04 (dummy).** `/staff/[id]/tor/[torId]/form-285` (opened from the TOR Details Form 285 component): instructor fields (Title/Name/Surname/Position multi-checkbox/Duties/Qualifications/Work Experience), auto-filled org section after submit, 4-stage status, stage actions (Submit→Accounting→Super Admin→Upload signed→Approved). Workflow advances in the RQ cache. ⚠️ Ticket still in BA — may change. **Remaining (BE):** real persistence, role-gated stages, notifications, signed-PDF, versions, audit.
- [~] **TAT-415/416** Form 32 (submission + review) — role-typed A/B/C/D, per aircraft type, section evidence; field-level reject w/ reason; reviewer assessment fields. *High.* **FE done 2026-06-04 (dummy).** `/staff/[id]/tor/[torId]/form-32` (opened from TOR Details): role-type multi-select (A/B/C/D) → dynamic sections (option + evidence + notes per section), header (name/date/aircraft type/category); submit → field-level Approve/Reject-with-reason per section; reviewer assessment (Assessed By/Position/Signature/Date); Approve Form 32 gated until every section approved. RQ-cache workflow. ⚠️ **Section questions + option choices are PLACEHOLDERS** pending the BA's Form 32 A/B/C/D template — likely rework. **Remaining (BE):** real template, persistence, notifications, audit.
- [~] **TAT-417** History Form Creation — one shared form/instructor; basic info (TM approval) + optional aircraft quals + training history. *High.* **FE done 2026-06-04 (dummy).** `/staff/[id]/history-form` (opened from TOR Details History Form component; shared per instructor): basic info (Name/Surname/DOB/Duties/ID No/Date of Employment) with submit → TM approve/reject-with-reason; aircraft qualifications list (type + B1/B2/B1B2, add/remove); training history list (subject/org/dates, add/remove). RQ-cache mutations. **Remaining (BE + later tickets):** field-level rejection (AC-24), Sit-In/final assessment (TAT-421), training validity (TAT-418/419), notifications, audit.
- [ ] **TAT-421** History Form Sit-In & Final Assessment — auto-assign course instructor as Sit-In evaluator; TM final assessment → approve. *High.* (Depends on [[TAT-429]].)
- [~] **TAT-423** Assessment Form Workflow — per aircraft type; Initial/Continuation/Extension; instructor fills → TM signs. *High.* **FE done 2026-06-04 (dummy).** `/staff/[id]/tor/[torId]/assessment-form` (opened from TOR Details): aircraft type + assessment type (Initial/Continuation/Extension); instructor section (Name/Signature/Date + optional evidence video) → Submit; TM final section (Name/Signature/Date) → Approve. RQ-cache workflow. **Remaining (BE):** SA assignment + notifications, real video upload/storage, role gating, audit.

### 4 · Mandatory training & refreshers
- [ ] **TAT-418** History Form Training & Validity — mandatory + role-based courses; duration math; Due/Refresher dates; external + online refresher courses. *High.*
- [ ] **TAT-419** History Training & Validity Review — TM review/approve; field-level reject; online-course request approval. *High.*
- [ ] **TAT-420** Add Protected Online Courses — seed 7 protected system courses; Delete → Archive. *Highest.* (Touches existing Online Courses in [[tat-ws]].)

### 5 · Pages (the frontend)
- [x] **TAT-431** Manage Staff Page — SA-only table, search/filter/active-count/add/edit. *Highest.* **FE done 2026-06-04** — wired to real `GET /user/all` (dummy fallback). Committed `22caa94`. Table (name/email/role/status/edit), client-side search (name/email/phone) + role filter, active count, Add→`/staff/new`, Edit→`/staff/[id]`, SA gate, empty + loading states. Data via `src/api/Staff`: **wired to the real `GET /user/all`** when a session exists, with `DUMMY_STAFF` as the no-session offline fallback (see [[#Backend APIs — available vs held (staging Swagger, 2026-06-04)]] · [[Patterns#FE-first dummy-data layer (tat-prereq)]]). Status (Active/Inactive) is provisional pending the TAT-432 deactivation backend.
- [~] **TAT-432** Staff Profile Management Page — profile + TORs; Deactivate (continue vs suspend tracking); block if active assignments. *Highest.* **View + Add + Edit done 2026-06-04** (real `/user/details`, `/user/all`, `internal-user/signup`, `update-profile`; dummy TORs; stubbed deactivate). Remaining: deactivate confirm + TOR backend. See [[TAT-432 Staff Profile]].
- [x] **TAT-433** Staff TOR Matrix Page — centralized matrix; expandable cards; aircraft filter; live indicators. *Highest.* **FE done 2026-06-04 (dummy — no TOR backend).** Stats (total staff/TORs + CARC/EASA/GCAA counts), search (name/email/phone), aircraft-type filter, expandable staff cards → TOR rows (license/aircraft/status) + "Open TOR" → TOR Details stub. Access: SA/AD/QM/TM/EM. Data via `src/api/Tor` (dummy).
- [x] **TAT-435** Pending TORs Page — staff with pending forms/fields; drill to TOR Details; highlight rejected/waiting/expired/missing. *Highest.* **FE done 2026-06-04 (dummy — no TOR backend).** List (name/email/role + count + View TORs) → per-staff Overview (`/pending-tors/[id]`): each TOR shows License Authority + Authority Name + Status + "Open TOR" → TOR Details; pending items highlighted (rejected/waiting/expired/missing). Access: SA/TM/QM. Data via `src/api/Tor` (dummy).

### 5b · TOR Details hub (FE, dummy)
- [x] **TOR Details page** (`/staff/[id]/tor/[torId]`) — the "Open TOR" target from the Matrix (TAT-433 AC-10) + Pending overview (TAT-435 AC-08/09). **FE done 2026-06-04 (dummy).** Header (license/authority/status/dates/scope) + the TOR's components: Initial Documents, **Form 285 (CARC only)**, Form 32, History Form, Assessment Form, Mandatory Training — each with a component status; documents/training expand to sub-items. Replaces the earlier stub. The individual forms/documents (TAT-412–423) remain per-ticket + backend-dependent.

### 6 · Cross-cutting / adjacent (touch existing surfaces)
- [ ] **TAT-429** Add Instructor To Course Enrollment List — "Add Instructor" on Course Enrollment; eligibility-filtered; feeds Sit-In. *Highest.* ([[tat-ws]] enrollment page.)
- [ ] **TAT-436** Control Certificate Visibility for Refresher Courses — refresher certs hidden until SA publishes; "Unpublished" indicator + Publish button on Manage Trainees. *Highest.* (Extends the [[TAT-428 Edit Issued Certificates|certificate]] work directly.)

## Suggested sequencing

1. Resolve the [[#Open questions]] (repo + scope) — blocks everything.
2. **TAT-430** shell + SSO, then the **TOR data model + status engine** (TAT-410/411) — the spine every form and page reads from.
3. Documents (412/413) and the **Manage Staff / Profile** pages (431/432) in parallel once the model exists.
4. Forms (414–423) + training (418–420) — large, parallelizable across the team.
5. Eligibility (424) + matrix/pending pages (433/435) last — they *consume* TOR status.
6. Adjacent [[tat-ws]] touches (429, 436, 420) can slot in independently.

## Backend APIs — available vs held (staging Swagger, 2026-06-04)

Spec: `https://staging.api.tat147.com/api/docs` (JSON at `/api/docs-json`). Strategy per Qusai: **wire pages to existing APIs; keep missing ones on dummy/hold until launched.**

**Available now (reuse):**
- `GET /user/all` → `{ users, totalSize }` — staff list (params: `name`/`email`/`phone`/`role[]`/`skip`/`limit`). **Wired for [[#5 · Pages (the frontend)|TAT-431]].**
- `GET /user/details/{id}` — staff profile (TAT-432).
- `POST /auth/internal-user/signup` — create staff (TAT-432 Add New Staff).
- `PATCH /user/admin/update-profile/{userId}`, `/change-roles/{userId}`, `/approve-user/{userId}`, `/decline-user/{userId}`.
- `GET /auth/all-roles`, `GET /role-actions`, `GET /role-actions/user/{userId}` (roles + permissions).

**Held (no API yet → dummy/hold):**
- All TOR + form endpoints (TAT-410/411/414–423/433/435).
- Staff **Active/Inactive deactivation** + qualification tracking (TAT-432 AC-05+) — status is derived provisionally from soft-delete for now.

## Open questions

- [x] **Repo / hosting** — RESOLVED: new repo [[tat-prereq]], mirroring [[tat-portal]] (2026-06-04).
- [ ] **Our scope** — frontend only, or full-stack including the TOR engine + audit infra? Most tickets are full-stack.
- [ ] **Backend ownership** — the TOR status/eligibility engine is net-new server work. Who builds it?
- [ ] **TAT-414 Form 285** still in *Business Analysis* — don't build until it lands at Fully Approved.
- [ ] **Epic is "Parked"** — confirm this is the active next effort vs [[TAT Portal Onboarding|tat-portal]] (current North Star focus).

## Related

- [[Staff Management Subsystem & TOR Model]] — full domain reference (TOR lifecycle, forms, training, eligibility)
- [[TAT Platform]] · [[tat-ws]] · [[tat-app-ws Backend]] · [[TAT API & Auth Model]]
- Adjacent: [[TAT-428 Edit Issued Certificates]] · [[TAT Certificates - Open Items]]
- Competencies: [[Systems Thinking]] — mapped a 21-ticket subsystem into workstreams + surfaced the repo/scope unknowns before any code
