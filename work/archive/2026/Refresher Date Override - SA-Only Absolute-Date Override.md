---
date: 2026-07-19
description: "SA-only absolute-date override replacing the computed mandatory-training refresher date at two scopes (per-instructor slot + course fleet stamp); shipped, aligned to the BE team's contract, and verified end-to-end on staging — TAT-447, feature complete"
tags:
  - work-note
  - decision
  - project/tat
status: completed
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

**Verified end-to-end on staging (2026-07-23) — feature complete.** SuperAdmin successfully overrode the date on both scopes: per-instructor (tat-prereq Training & Validity row) and the course fleet stamp (tat-ws `/manage-courses/online-courses/[id]/refresher`). No FE work outstanding.

## Verified (2026-07-23)

- [x] **Per-instructor:** as SA, set a date on an **accomplished** row in tat-prereq — the override took effect (not 403).
- [x] **Fleet stamp:** as SA, set a date on a mandatory course in tat-ws — the override took effect (not 403).
- [x] **SA holds the `SM_OVERRIDE_MANDATORY_TRAINING_REFRESHER` action grant** — the load-bearing unknown from the checklist. Confirmed by the overrides succeeding rather than 403'ing.

tat-ws UI route: `apps/tat-ws/src/app/(private)/manage-courses/online-courses/[id]/refresher/page.tsx` + `_components/ManageRefresherDate/index.tsx`. Shipped commits unchanged: tat-prereq `9ff648b`+`1771a68` · tat-ws `e2ee0e0`+`82b0273`.

## Open spec questions — block the Slice 0 resolver (2026-07-23)

This feature is the target of [[Loom|Slice 0]] — a pure resolver `(instructor, course) → effective refresher date` rebuilt **from the ACs, not from the shipped code**. Running that lens over the Override ACs surfaced **four precedence/lifecycle questions the ACs never state.** They map onto the [[Spec Gap Taxonomy & Grilling Agent|grilling lenses]] (collision · order-sensitivity · exclusion); a human must answer them before the resolver can be coded correctly, because "tests from ACs, never from coder output" means the shipped code's ad-hoc choices don't count as spec.

1. **Precedence between calculated / per-instructor / course-level is never stated** *(collision lens)*. The grill decided "accomplished rows override, not-yet-accomplished stay computed" and "fleet stamp clobbers per-instructor (last-write-wins)" — but a full read-time ordering across all three sources is **not an AC**. Partially implied, not written.
2. **A new per-instructor override applied *after* a course override — allowed or blocked?** *(order-sensitivity lens)*. The grill states the reverse (fleet clobbers per-instructor); last-write-wins *implies* instructor-after-course is allowed, but it is **not stated explicitly**.
3. **Future course completion recalculates — does it wipe an existing override?** *(order-sensitivity lens)*. **Effectively answered:** the grill says overrides are transient and a real completion recomputes accomplished + 2y, and the shipped backend **clears the four audit fields on completion**. This decision exists but was never promoted to an AC — do that.
4. **How to remove an override and revert to the calculated date** *(exclusion lens)*. **Genuinely unspecified** — no AC, no grill decision, and nothing in the shipped contract describes an un-override / revert path. This is the real gap.

> [!question] Honest status vs the dump
> The dump framed all four as open; on inspection #3 is already decided-and-shipped (completion wipes) and #2 is implied by last-write-wins. Truly undecided: **#1** (a full precedence ordering as an AC) and **#4** (a revert path, which doesn't exist anywhere). Resolving these = promote #2/#3 into written ACs and get a product decision on #1/#4.

## Related

- [[Loom]] — Slice 0 rebuilds this feature's resolver from ACs; these four questions block it
- [[Spec Gap Taxonomy & Grilling Agent]] — the four questions are a live instance of the three grilling lenses
- [[History Form - Training & Validity Records]] — the section this override acts on
- [[Staff Management Subsystem & TOR Model]] — domain reference (Due = Accomplished + 2y; Refresher = Due − 1 month)
- [[tat-prereq Forms Refactor - Zod + RHF]] — the FE form conventions the per-instructor control must follow
- [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]] — where the past-date reminder fires
- [[TAT-409 Staff Management Subsystem]] · [[tat-prereq]] · [[tat-ws]] · [[tat-app-ws Backend]]
