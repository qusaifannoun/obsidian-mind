---
date: 2026-07-19
description: "SA-only absolute-date override that replaces the computed mandatory-training refresher date at two scopes — per-instructor slot and course-wide fleet stamp; design only, backend handed to BE"
tags:
  - work-note
  - decision
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-prereq
---

# Refresher Date Override — SA-Only Absolute-Date Override

The BA reframed a "make the period configurable" ask mid-grill. The 2-year mandatory-training validity period is **not** becoming configurable. Instead we add **one** mechanism — an **absolute-date override that replaces the computed date** — exposed at **two scopes, both SuperAdmin-only**:

- **Per-instructor** (tat-prereq Training & Validity row): SA sets the date on **one instructor's slot**.
- **Course fleet stamp**: SA sets one date, **one-time bulk-written** onto **every ACCOMPLISHED** history-form slot for that mandatory course.

Scope is locked to the **7 mandatory training courses only** (`StaffHistoryMandatoryTraining`). The override sets the stored date on those slots — mirroring the existing aircraft-qualification refresher override precedent — and does **not** touch the 2-year period constant itself.

> [!abstract] Ticket
> To be created and assigned to [[Dania]]. Not started.

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

## Status

Design only. Nothing built. FE (tat-prereq + tat-ws) is the next session's work; backend handed to the BE team.

## Still open (backend, BE team)

- [ ] **Schema:** add `refresherOverrideBy` / `refresherOverrideAt` / `refresherOverrideSource` / `refresherOverrideReason?` to `StaffHistoryMandatoryTraining`.
- [ ] **Service:** SA-only `setSlotRefresherDate` (per-instructor) + `bulkStampCourseRefresherDate` (mandatoryCourseCode → all accomplished slots) + audit + review-history timeline entry.
- [ ] Gate the fleet stamp to **mandatory-training courses only**; allow **past dates**; **reset-to-computed deferred**.
- [ ] **Notifications** fire immediately when an override pushes a reminder into the past (accepted — no handling this pass).

## Related

- [[History Form - Training & Validity Records]] — the section this override acts on
- [[Staff Management Subsystem & TOR Model]] — domain reference (Due = Accomplished + 2y; Refresher = Due − 1 month)
- [[tat-prereq Forms Refactor - Zod + RHF]] — the FE form conventions the per-instructor control must follow
- [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]] — where the past-date reminder fires
- [[TAT-409 Staff Management Subsystem]] · [[tat-prereq]] · [[tat-ws]] · [[tat-app-ws Backend]]
