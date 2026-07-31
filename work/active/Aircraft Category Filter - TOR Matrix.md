---
date: 2026-07-16
description: "TOR Matrix B1/B2 filter couldn't be FE-only — aircraftCategory lives only on StaffQualification, not the TOR/response/query DTO — so it shipped full-stack: new query param + qualification distinct-userId intersect + FE select"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
---

# Aircraft Category Filter — TOR Matrix

The [[TAT-409 Staff Management Subsystem|TOR Matrix]] (TAT-433) toolbar had **search + aircraft-type** only; the ask was to add a **B1/B2 aircraft-category** filter.

## Why it wasn't a frontend change

The obvious read — "add a `<select>` to the toolbar" — was a trap. **`aircraftCategory` (`B1` / `B2` / `B1/B2`) lives solely on `StaffQualification`** (keyed by `userId` + `aircraftTypeId`, `staff-qualification.schema.ts`). It is **not** on the TOR row, **not** in the matrix response DTO (`TorMatrixQualificationProgressDTO` carries `aircraftTypeId/Name`, `qualificationStatus`, `expiresAt`, `assessmentStatus` — no category), and **not** in the query DTO.

So the two frontend-only paths both fail:
- **Client-side filter** — impossible; the category is absent from the payload.
- **A lone FE select** posting `aircraftCategory` — class-validator's whitelist drops the unknown param and the list never narrows. A **dead control** — the inverse of the [[Staff Management - Unreachable Backend Endpoints|dead-endpoint sweep]] (there: a working backend with no FE affordance; here: an FE affordance with no backend data). See [[Patterns - Architecture & Boundaries#Confirm the backend can filter before wiring a frontend filter — an FE select for data the backend doesn't expose is a dead control]].

## What shipped (full-stack)

**Backend — [[tat-app-ws Backend]]** (+17, 2 files)
- `GetTorMatrixQueryDTO` gains `aircraftCategory?: qualificationCategory` (`@IsEnum`, optional) — `staff-management.dto.ts`.
- `buildTorMatrixStaffFilter` gains a category block **mirroring the existing `aircraftTypeId` filter**: `qualificationModel.distinct("userId", { aircraftCategory })` intersected into the staff `$and` — `staff-management.service.ts`. Semantics: **staff who hold ≥1 qualification in that category**; category ∧ aircraft-type is an AND (must match both).

**Frontend — [[tat-prereq]]** (+28 / −8, 4 files)
- `TorMatrixParams` + `getTorMatrix` pass `aircraftCategory` through — `Tor/fetchers.ts`.
- `useTorMatrix(search, aircraftTypeId, aircraftCategory)`, added to the query key so switching category refetches — `Tor/useTor.ts`.
- Category `<select>` next to the aircraft-type one, **reusing the existing `CATEGORY_OPTIONS` enum** (no new list) — `TorMatrixToolbar.tsx`.
- `aircraftCategory` state wired in — `TorMatrixView.tsx`.

This is the [[Patterns|"move filter into fetcher params when the backend supports it"]] pattern realized — the matrix search/aircraft filters already ran server-side, so category joined them rather than being bolted on client-side.

## Evidence

- [[tat-prereq]]: `tsc --noEmit` exit 0; `eslint` on the 4 changed files exit 0.
- [[tat-app-ws Backend]]: `tsc` on `dtos` and `database` libs both exit 0.
- Built + typechecked only — **not exercised against a running backend or browser.**

## Open

- [ ] **Not browser/staging-verified.** Pick **B1** → list narrows to staff holding a B1 qualification; **B2** likewise.
- [ ] Confirm class-validator's whitelist **accepts** the new `aircraftCategory` param at runtime (didn't 400/strip it).
- [ ] Confirm **category ∧ aircraft-type intersect** correctly with real data (staff with B1 on one type, B2 on another).

## Related

- [[TAT-409 Staff Management Subsystem]] — TAT-433 TOR Matrix
- [[Staff Management Subsystem & TOR Model]] — TOR Matrix domain ("filter by aircraft")
- [[Staff Management - Unreachable Backend Endpoints]] — the inverse case (dead backend vs dead frontend control)
- [[tat-prereq]] · [[tat-app-ws Backend]]
- [[Systems Thinking]] — traced the data source before writing the control, which turned a "small FE task" into the correct full-stack change
