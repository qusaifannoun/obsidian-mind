---
date: 2026-07-19
description: "SA-only absolute-date override replacing the computed mandatory-training refresher date at two scopes (per-instructor slot + course fleet stamp); FE shipped & aligned to the backend the BE team delivered — TAT-447, pending staging verification"
tags:
  - work-note
  - decision
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
ticket: TAT-447
---

# Refresher Date Override — SA-Only Absolute-Date Override

The BA reframed a "make the period configurable" ask mid-grill. The 2-year mandatory-training validity period is **not** becoming configurable. Instead we add **one** mechanism — an **absolute-date override that replaces the computed date** — exposed at **two scopes, both SuperAdmin-only**:

- **Per-instructor** (tat-prereq Training & Validity row): SA sets the date on **one instructor's slot**.
- **Course fleet stamp**: SA sets one date, **one-time bulk-written** onto **every ACCOMPLISHED** history-form slot for that mandatory course.

Scope is locked to the **7 mandatory training courses only** (`StaffHistoryMandatoryTraining`). The override sets the stored date on those slots — mirroring the existing aircraft-qualification refresher override precedent — and does **not** touch the 2-year period constant itself.

> [!abstract] Ticket
> [TAT-447](https://cryptonic-art.atlassian.net/browse/TAT-447) — created, written in the team's Current/Desired/Requirements format, assigned to [[Dania]]. Backend + FE shipped.

## Decisions (resolved in the grill)

- **Picked date = `dueDate`.** The Refresher column always derives as **due − 1 month** — SA never sets the refresher date directly.
- **Only accomplished rows are overridden.** Not-yet-accomplished ("computed") rows stay computed.
- **Last-write-wins.** The fleet stamp **CLOBBERS** existing per-instructor overrides — no preserve, no merge.
- **Overrides are transient.** A **real course completion** recomputes accomplished + 2y, **wiping** any override.
- **Both actions are SUPERADMIN-only, on every platform** (corrected from an initial SA/AD/QM/TM answer).
- **Audit:** full trail on the slot (`refresherOverrideBy` / `refresherOverrideAt` / `refresherOverrideSource`) **plus** a review-history timeline entry; reason optional.

## Evidence

- **Period is a global constant, not per-course:** `libs/app-data/src/lib/enums.ts:1222` — `AIRCRAFT_QUALIFICATION_REFRESHER_YEARS = 2`; `TWO_YEARS_MS` inline in `mandatory-training.util.ts:10`.
- **Per-user mandatory dates already stored on the slot:** `staff-history-form.schema.ts:163-174` (`StaffHistoryMandatoryTraining.accomplishedDate / dueDate / refresherDate`).
- **Existing compute paths that recompute on completion (unchanged by this work):** `staff-history-mandatory-training.service.ts` — `saveMandatoryTraining:526`, `submitMandatoryTraining:789`, `applyOnlineCourseCompletion:995` — all call `applyTrainingValidityDates()`.
- **Audit precedent to mirror:** `staff-qualification.schema.ts:125-134` (`refresherUpdateSource` / `refresherUpdateNote` / `refresherUpdatedAt`).
- **Role set to reuse for gating (but narrowed to SA per BA):** `MANDATORY_TRAINING_PRIVILEGED_EDITOR_ROLES = FORM_285_AUTO_APPROVE_ROLES` [SA, AD, QM, TM] at `enums.ts:1054`. SA-only precedent = cert publish `@Roles(SUPERADMIN)` at `online-course-certificate.controller.ts:77`.

## Shipped (2026-07-20)

Built end-to-end. Wrote a self-contained backend handoff prompt for the BE team (they don't share this vault); they shipped both endpoints in [[tat-app-ws Backend]], and I read their shipped contract and aligned the FE to it.

**One correction surfaced by reading the shipped code:** the per-instructor route shipped as `.../refresher-date`, **not** the `.../refresher-override` I'd originally assumed and wired — the tat-prereq call would have 404'd. Fixed the fetcher URL. The tat-ws fleet-stamp path, both request bodies `{ dueDate, reason? }`, and the `{ affected }` JSON response all matched as assumed; also surfaced the real affected-instructor count in the tat-ws success toast.

**Confirmed backend model (from tat-app-ws):**
- One DTO `OverrideMandatoryRefresherDTO` `{ dueDate: YYYY-MM-DD (@IsDateString), reason?: string (max 500) }` for **both** scopes.
- `refresherDate = dueDate − 30 days` — a **fixed 30-day** subtraction (`ONE_MONTH_MS`), not a calendar month.
- Only **accomplished** slots are touched; fleet stamp is **mandatory-courses-only** and returns `{ affected: number }`; per-instructor returns the updated `MandatoryTrainingItemResponseDTO`.
- Four new slot audit fields (`refresherOverrideSource / By / At / Reason`), **cleared on a real completion**.
- Both routes gated by action `SM_OVERRIDE_MANDATORY_TRAINING_REFRESHER`.

**Shipped endpoints:**
- Per-instructor: `PATCH /staff-management/profiles/:userId/history-form/mandatory-training/:courseCode/refresher-date` (`staff-management.controller.ts`).
- Fleet stamp: `PATCH /online-courses/:id/refresher-date` → `{ affected }` (`online-course.controller.ts`).

**Commits (all on `dev`, tsc-clean):** tat-prereq `9ff648b` (FE) + `1771a68` (URL fix) · tat-ws `e2ee0e0` (fleet stamp) + `82b0273` (affected-count toast).

## Status

Backend + FE shipped and aligned. **Not browser/staging-verified.** No FE work outstanding.

## Still open (verification)

- [ ] **Per-instructor:** as SA, set a date on an **accomplished** row → Due updates, Refresher shows −1 month, row refreshes.
- [ ] **Fleet stamp:** as SA, set a date on a mandatory course → toast shows the real count; only **accomplished** holders change; not-started rows untouched.
- [ ] **Confirm SA users actually have the `SM_OVERRIDE_MANDATORY_TRAINING_REFRESHER` action granted** — otherwise both calls 403 despite the SA-only FE gate.

## Related

- [[History Form - Training & Validity Records]] — the section this override acts on
- [[Staff Management Subsystem & TOR Model]] — domain reference (Due = Accomplished + 2y; Refresher = Due − 1 month)
- [[tat-prereq Forms Refactor - Zod + RHF]] — the FE form conventions the per-instructor control must follow
- [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]] — where the past-date reminder fires
- [[TAT-409 Staff Management Subsystem]] · [[tat-prereq]] · [[tat-ws]] · [[tat-app-ws Backend]]
