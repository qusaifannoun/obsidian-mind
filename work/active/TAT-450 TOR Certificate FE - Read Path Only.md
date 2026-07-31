---
date: 2026-08-01
description: "TOR certificate frontend built against the new backend endpoint; read path verified on staging, the entire write path — upload, submit, QM save and approve — never exercised"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
ticket: TAT-450
---

# TAT-450 — TOR Certificate FE (Read Path Only)

The other half of the **2026-07-28 → 07-31** backend drop (Dawahreh), which shipped
TAT-449/454/450 with no frontend — see
[[TAT-454 Instructor Assignment Filtering - courseMethod]]. Its integration guide, like
TAT-454's, described a frontend state that did not exist.

Unblocks the certificate clause **[[Instructor Type - Per-Authority Form 32 Split]]** recorded
as un-implementable (TAT-451 AC-07, blocked on TAT-450 being unbuilt).

## Shipped

`tat-prereq` **`9459415`** — on `dev`, **unpushed**.

The certificate row in the TOR forms list **is now a link**. Before the `formHref` branch it
was a **dead, unclickable row for a template the backend seeds as `mandatory: true`** — the
same dead-affordance class as the [[Staff Management - Unreachable Backend Endpoints|endpoint sweep]],
inverted.

## Verified — read path only

Staging: `GET /staff-management/tors/6a32e22a7d5fab715e6668db/certificate` → **200 (657ms)**.

Page rendered from the **real** response, not a fixture: auto fields populated, the
"Not available yet" lock shown, the aircraft empty state, both read-only sections.

**Authorization Number rendered `—`**, which is itself a confirmation: it's the unrun
`staffNumber` backfill showing through, not an FE mapping bug. See
[[Sequential User Number - Atomic Allocation & Backfill]].

## Still open

> [!danger] The write path is **entirely unexercised**
> No signature upload, no submit, no QM save, no approve has ever run. The
> `instructorEditable` / `qmEditable` branches and the aircraft-row selects have **never
> rendered**. No error path tested. Unblocking this needs **a TOR that has reached the
> certificate phase** — none exists yet.

- **`staffNumber` backfill still unrun**, so Authorization Number is blank for every existing
  instructor regardless of FE correctness.
- **`staffNumber` is not displayed** on `StaffProfileView` or my-profile.
- **Form 285/32 lock when `available === true`: deliberately NOT built.** Two unknowns first —
  whether certificate approval **gates TOR ACTIVE**, and what happens to **already-ACTIVE
  TORs** now that `tor_certificate` seeds `mandatory: true` for CARC/EASA/GCAA. A mandatory
  form appearing on TORs that are already active is a status question, not a UI one.
- **No `tor-certificate` `FileUploadCategory` exists backend-side** — signatures currently
  upload under `tor-documents`, i.e. the wrong folder. Same shape as the History Form's
  category gap.
- **Permission smell: QM save *and* approve are both gated on `SM_VIEW_PENDING_TORS`** — a
  **view** permission gating an **approve**. Needs a backend/BA call, not an FE workaround.

## Trap worth keeping

> [!warning] `GET /certificate` creates a draft shell as a side effect
> A read endpoint that writes. And because **`dev` IS `staging` IS the only database** here
> ([[Gotchas - Backend Services & Environment#`dev` and `staging` are the same database in this project — not two environments (2026-07-28)]]),
> **merely browsing a TOR seeds certificate rows** in the one real database. Investigation is
> not read-only on this setup.

## Related

- [[TAT-454 Instructor Assignment Filtering - courseMethod]] — same backend drop, same guide problem
- [[Instructor Type - Per-Authority Form 32 Split]] — TAT-451 AC-07 was blocked on this
- [[Sequential User Number - Atomic Allocation & Backfill]] — the `staffNumber` backfill behind the blank field
- [[TAT-409 Backend Open Items]] — where the FileUploadCategory + permission gaps are handed back
- [[Staff Management - Unreachable Backend Endpoints]] · [[Staff Management Subsystem & TOR Model]]
- [[tat-prereq]] · [[tat-app-ws Backend]] · [[TAT-409 Staff Management Subsystem]]
- [[Gotchas - Frontend#tat-prereq Form 32 cache keys are shaped `[Form32, kind, torId, …]` — a `[Form32, torId]` invalidation silently no-ops (2026-08-01)]]
- [[Index|Work Notes]]

### Competencies

- [[Delivery & Scope Management]] — built the read path against a live endpoint and **stopped
  at the two genuine unknowns** (does certificate approval gate TOR ACTIVE; what happens to
  already-ACTIVE TORs) rather than guessing the Form 285/32 lock into existence.
- [[Debugging & Root Cause Analysis]] — read a blank Authorization Number as **evidence of an
  unrun backfill** rather than an FE mapping bug, by knowing what the field's source was.
