---
date: 2026-09-09
description: "A leading space in StaffTor.aircraftTypeIds' ref threw MissingSchemaError on populate, 500ing the TOR Matrix — and a missing FE error state rendered the crash as an empty list"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# TOR Matrix 500 — Leading Space in the `aircraftTypeIds` Schema Ref

**Reported by Qusai:** *"in tat-prereq, the tor matrix is not showing any data why?"* — followed by the clarification that it should list **all** staff with their TORs: instructors, examiners and assessors.

## Root cause

`libs/schemas/src/lib/staff-tor.schema.ts:32` declared:

```ts
type: [{ type: mongoose.Schema.Types.ObjectId, ref: " TrainingTypes" }],
```

Wrong twice — a **leading space**, and a model name that is not registered under any spelling (the class is `AircraftTrainingTypes`). `getTorMatrix` populates that path, so Mongoose threw `MissingSchemaError` and `GET /staff-management/tor-matrix` returned **500 for every result set containing at least one TOR**. It was the only leading-space `ref` in the repo; the neighbouring `phase.schema.ts:20` already used `ref: AircraftTrainingTypes.name`.

## Why it cost real time — the frontend, not the backend

[[tat-prereq]]'s `TorMatrixView` destructured only `{ data, isLoading }`. With no `isError` branch, React Query's failure left `data` undefined, `staff` fell back to `[]`, and the page rendered **"No staff match your search or filter."** A server crash and a genuinely empty result were pixel-identical, and the stat cards showed `EMPTY_SUMMARY` zeros rather than real counts. The app logged nothing.

**Building the error state was the diagnostic.** The Mongoose message appeared on screen the moment the branch existed — after a full static trace through both repos had failed to find it.

## Evidence

The message, once the error state existed:

```
Schema hasn't been registered for model " TrainingTypes".
Use mongoose.model(name, schema)
```

Browser bisect against staging (read-only), before the fix:

| request | result |
|---|---|
| `GET /staff-management/tor-matrix?limit=1000` | **500** |
| `GET /staff-management/profiles?limit=20` | 200 — 23 active staff |
| `?search=Accountable` (1 user, **0 TORs**) | 200 — renders 23 staff / 48 TORs |
| `?search=Mohammad` \| `Hamza` \| `Tor` | **500** |

`performance.getEntriesByType('resource')` put the failures at **178–292 ms** — a throw, not a timeout. The zero-TOR query succeeding is what localised it to the per-TOR path: with no TORs, populate has nothing to resolve.

Ruled out along the way, each conclusively: role/permission mismatch (FE `ROUTE_ACCESS['/tor-matrix']` and the backend's `SM_VIEW_TOR_MATRIX` grants are both exactly `SA, AD, QM, TM, EM`), `limit: 1000` failing validation (`Pagination` has `@IsPositive()`, no `@Max`), matrix scoping excluding examiners/assessors (`STAFF_ROLE_CODES` is all of `StaffManagementAccessRoles`, `EX` and `PA` included), and an adapter throw (`formatRole` coalesces, so `card.role.code` can't be null).

## Fix

- [[tat-app-ws Backend]] **`bad7584f`** (on `origin/dev`) — `ref: AircraftTrainingTypes.name`.
- [[tat-prereq]] **`dcacb9a`** (on `origin/dev`) — `TorMatrixView` handles `isError`, renders the API message through the shared `formatApiError` helper, adds a retry.

`tsc --noEmit` clean on both repos; `nx run api:build` succeeded; `eslint` clean on `TorMatrixView.tsx`.

## Still open

- [ ] **The backend fix is NOT verified.** [[tat-prereq]] points at `staging.api.tat147.com`, which still runs the old code — the matrix keeps 500ing until `bad7584f` is deployed. After deploy, confirm **23 staff / 48 TORs**. Only the FE error state was browser-verified.
- [ ] Retry button renders but was never clicked.
- [ ] **Stat-card counts are wrong independently of this crash.** The one successful response reported **48 total TORs but CARC 0 + EASA 19 + GCAA 1 = 20**. Twenty-eight TORs carry a `licenseId` resolving to no CARC/EASA/GCAA license. Visible the moment the page loads.
- [ ] Stale dead code: `adapters.ts:70-72` hardcodes `email`/`phoneNumber` to `''` behind a comment claiming the card DTO carries neither — the service returns both (`staff-management.service.ts:492-493`). This was the open backend ask in [[TAT-409 Backend Open Items]] and has been delivered.
- [ ] **Design gap, backend ask:** the mockup shows role *and* team ("Senior Instructor · Flight Operations"); the card DTO carries `role` only.
- [ ] **Worth a sweep:** no other `ref: " ` exists today, but nothing prevents the next one. A schema test asserting every `ref` resolves to a registered model would catch this at boot rather than in a 500.

## Related

- [[TAT-409 Staff Management Subsystem]] — the epic the TOR Matrix belongs to
- [[Staff Management Subsystem & TOR Model]] — domain reference
- [[Aircraft Category Filter - TOR Matrix]] — the other TOR Matrix change, which added the `aircraftCategory` filter this endpoint still serves
- [[TOR Activation - Details Endpoint Lied About ACTIVE]] — the previous time `getTorMatrix`/`evaluateTorCompletion` was the scene
- [[TAT-409 Backend Open Items]] — where the email/phone card-DTO ask was filed
- [[Gotchas - Backend Schema & Data#A one-character typo in a Mongoose `ref` is invisible until populate runs — and only when there is something to populate (2026-09-09)]]
- [[Gotchas - Frontend Data & API Contracts#A query hook read without `isError` turns every server failure into an empty-state card (2026-09-09)]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Index|Work Notes]]

### Competencies

- [[Debugging & Root Cause Analysis]] — static tracing through both repos exhausted itself; a browser bisect (which searches succeed vs 500) plus resource-timing to separate a throw from a timeout localised the fault to the per-TOR path, and shipping the error state surfaced the exact message.
- [[Systems Thinking]] — treated "the screen cannot distinguish failure from emptiness" as the primary defect rather than a side note, which is what turned an unbounded hunt into a one-line answer.
