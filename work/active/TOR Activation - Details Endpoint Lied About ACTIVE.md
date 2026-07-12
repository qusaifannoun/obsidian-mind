---
date: 2026-07-12
description: "The TOR details endpoint reported ACTIVE while checking only 3 of the 6 activation gates — so TORs showed Active with null creation/expiry dates and the Assessment Report hid two outstanding assessments"
tags:
  - work-note
status: active
quarter: Q3-2026
team: Backend
---

# TOR Activation — the Details Endpoint Lied About ACTIVE

**Reported by Qusai:** *"the creation date and expiry date are not showing on the licence TOR after it gets to the active state."*

It looked like a rendering bug. It wasn't. **The TOR was never activated** — the badge was lying, and the dates were correctly absent.

## Root cause — the rule was written twice

| Gate | `staff-tor-sync.processor` (writes status + dates) | `evaluateTorCompletion` (behind `GET /tors/:id/details`) |
|---|---|---|
| Forms complete | ✅ | ✅ |
| History form approved | ✅ | ✅ |
| Mandatory training valid | ✅ | ✅ |
| Required documents approved | ✅ | ❌ **missing** |
| Aircraft qualifications valid | ✅ | ❌ **missing** |
| Assessments approved | ✅ | ❌ **missing** |

`activatedAt` / `expiresAt` are stamped **only** by the processor, on first activation (+2-year expiry). The details endpoint returns a **live-derived** `torStatus` but the **persisted** dates. So any TOR between the 3-gate bar and the 6-gate bar renders as `Active` with `—` for both dates, permanently.

The same weak rule fed `incomplete`, so the **Pending TORs worklist under-reported** too. And the *list* endpoint returns the persisted status — so list and details could contradict each other on the same TOR.

## The evidence that settled it

Staging `GET /tors/6a537eaf…/details`:

```json
"torStatus":   "active",
"activatedAt":  null,
"expiresAt":    null,
sections → Forms → assessment_report: { "status": "missing", "formId": null }
```

And in the dev DB: **46 `tor_sync_completed` audit rows** (the BullMQ worker is alive and running) with **every TOR still persisted as `draft`**. Worker running + nothing ever activated ⇒ the writer never agreed, so the *reader* was wrong. The only two `status: active` rows are June-6 seed fixtures with zero audit history and a dead `effectiveFrom`/`effectiveTo` schema — **no TOR has ever legitimately activated.**

## Why Qusai's TOR wasn't actually complete

He said *"but all records are approved and successfully completed"* — and every record he could see was. The TOR has **3 aircraft types**, all 3 qualifications approved, but only **1 approved assessment**:

| Aircraft type | Qualification | Assessment |
|---|---|---|
| `…e91b77` | ✅ | ❌ none |
| `…e91bb5` | ✅ | ❌ none |
| `…e91bb9` | ✅ | ✅ approved |

Activation needs an approved assessment **per aircraft type**. Nothing in the UI said so — the Forms section showed **one** `Assessment Report — missing` row, which is wrong twice: it says "missing" though one *is* approved, and it's a single row where three are required. Assessments aren't `StaffTorForm` records at all, so that row could never reflect reality.

## Fix — `57bb7a1c` (tat-app-ws) + `ea43544` (tat-prereq)

1. **Extracted `staff-tor-activation.util.ts`** — `resolveTorStatusFromGates()` + `areRequiredTorDocsApproved()`. The processor and `evaluateTorCompletion` now both call it. One rule, one implementation.
2. **`evaluateTorCompletion` now computes all six gates**, reusing the *same* service methods the processor uses (`isAllAircraftQualificationsValidForTor`, `isAllAssessmentsApprovedForTor`) so they cannot drift again. Injected `StaffAircraftQualificationService` + `StaffAssessmentService` (no circular dep; verified by booting).
3. **`mapTorDetailsAssessmentForms()`** — the Assessment Report expands into **one row per aircraft type**, each with its real status (`approved → active`, `pending_tm_review → pending_approval`, else `missing`), titled `Assessment Report — <aircraft type>`, carrying `aircraftTypeId` / `aircraftTypeName`.

`assessment_report` **must stay `mandatory: false`** — making it mandatory would make `deriveTorStatusFromForms` hunt for a `StaffTorForm` instance that never exists, and no TOR would ever activate. The assessment gate enforces it instead.

## Open

- [ ] **Not yet exercised end-to-end.** Build + DI boot verified only; I couldn't drive the endpoint (minting a local admin JWT was blocked). Restart the API and reload the TOR page.
- [ ] Complete the two outstanding assessments on the CARC TOR — the processor should then activate it and stamp both dates **on its own**. No backfill, no migration. *This is finally the answer to "confirm the TOR actually activates", open since [[TAT-429 Sit-In Eligibility & Move Semantics]].*
- [ ] Consider making the details endpoint return the **persisted** status rather than deriving live, so it can't contradict the list endpoint.

## Related

- [[TAT-409 Staff Management Subsystem]] · [[TAT-423 Assessment Report Rubric]] · [[TAT-429 Sit-In Eligibility & Move Semantics]]
- [[Staff Management Subsystem & TOR Model]] — domain reference
- [[Patterns#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]]
- [[Gotchas#The TOR "is it active?" rule was written TWICE — the reader lied and the writer was right (2026-07-12)]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Debugging & Root Cause Analysis]] · [[Systems Thinking]]
- [[work/Index]]
