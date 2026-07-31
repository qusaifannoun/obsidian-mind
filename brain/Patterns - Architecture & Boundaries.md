---
date: 2026-06-04
description: "Where logic belongs — the backend owns business rules and the frontend renders them, one rule means one implementation, and confirm the far side exists before wiring a control to it"
tags:
  - brain
---

# Patterns — Architecture & Boundaries

Where logic belongs — the backend owns business rules and the frontend renders them, one rule means one implementation, and confirm the far side exists before wiring a control to it.

Split out of [[Patterns]] on 2026-08-01. **Add new entries here, not to the index.**

## The backend owns business rules; the frontend renders the answer (2026-07-12)

If a number or date encodes a **rule** — a compliance total, a validity window, a due date — it is computed **once, server-side**, and returned. The FE displays it and never recomputes it.

- **35h / 2-year total** → `calculateTrainingValidityHours` on the backend, returned as `totalDurationHours` on the mandatory-training response.
- **Aircraft refresher due date** → `calculateAircraftRefresherDueDate` (= expiry − 1 month), returned as a derived `refresherDueDate`.
- **Training due date** → `calculateTrainingDueDate` (= accomplished + 2 years); the FE mirrors it *only* as a live preview in the add-form, never as the stored value.

- **Which Form 32 sections apply to an instructor** → `formKeyMatchesRequestedRoles` on the backend, enforced with a `ForbiddenException` and applied to every list the FE receives. [[tat-prereq]] had held a *second* copy of that rule for months (`FORM32_REQUIRED_ROLE`), fed from the **staff member's** roles while the backend read the **TOR's** — same table, different input, free to disagree, and only the backend's was per-authority. Deleted 2026-07-30; see [[Instructor Type - Per-Authority Form 32 Split]].

**A fork can hide behind a comment that was true once.** The FE copy carried "the backend has no `role` field on Form 32 templates", which justified it at the time and was simply never revisited. Nobody re-checked because the comment read like a finding. **Stale justification is how duplicated rules survive review** — when a comment explains why a rule is duplicated, treat it as a claim to re-verify, not a reason to stop looking.

**Why this is a rule and not a preference:** a duplicated business rule doesn't merely drift — it can be computing something else entirely while looking completely plausible. Both of the worst bugs of the week were duplicated-rule bugs (see [[Gotchas - Backend Services & Environment#Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)]]). A number that comes off the API can be wrong once; a number the FE derives can be wrong *differently* from the one eligibility actually uses, and nothing will ever reconcile them.

## One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)

The pattern above is the FE-vs-BE case. The **general** rule is stronger, because the third instance this week was entirely inside the backend:

> **TOR activation** was implemented twice in the same codebase — six gates in `staff-tor-sync.processor` (the writer), three gates in `evaluateTorCompletion` (the reader). The reader said `ACTIVE`; the writer said `DRAFT`. See [[Gotchas - TOR & Staff Management#The TOR "is it active?" rule was written TWICE — the reader lied and the writer was right (2026-07-12)]].

Three duplicated-rule bugs in one week, all with the same shape: **each copy is individually plausible, so nothing looks broken — and the mismatch surfaces as a downstream symptom that points somewhere else entirely** (a blank date, a 0/35h badge, a wrong compliance number). Nobody ever gets an error.

**Rule:** if two places need the same decision, extract it — a shared util (`staff-tor-activation.util.ts` → `resolveTorStatusFromGates`), and both call it. Not "keep them in sync"; there is no in-sync, only not-yet-drifted.

**Smell to grep for:** the same set of boolean gates `&&`-ed together in more than one file. And when a read path and a write path both decide the same thing, the **writer is the source of truth** — reads should report the persisted value, not recompute it.

## A guard that fails open on absent data is disabled by the data, silently (2026-08-01)

`formKeyMatchesRequestedRoles` scopes Form 32 templates to a TOR's `requestedRoleCodes` — and returns `true` for **every** form when that array is empty. The intent is benign (don't hide everything from an unconfigured TOR) and the branch is pinned by its own test. The effect is that **any row missing the field turns the guard off entirely**, with no error, no log, and a passing test suite. Legacy TORs predate the field, nothing backfills it, so the rule looked enforced for months while being inert for most of the data.

**The rule:** a permission or visibility guard must decide from the data it has, not concede when data is absent. When "absent" genuinely can't be treated as "deny", make the concession **narrow and loud** — scope it to the specific keys it's meant to protect (not every template), and pair it with a backfill that removes the absent case, shipped in the same change as the guard. A fail-open branch with no backfill behind it is a permanent hole, not a transitional one.

**Two properties make this class hard to see:**

1. **It reads as defensive.** `if (!x?.length) return true` looks like graceful degradation, which is why it survives review — the reviewer evaluates the branch, not the population of rows that hit it.
2. **The bug's distribution is by record age, not by code path.** New records behave correctly, so every fresh test fixture and every newly created user passes. The tell is a **discriminating contrast** — same code, opposite outcome on an old row vs a new one — which points at data and away from logic in one observation. See [[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]].

Companion failure at the other end of the same subsystem: a guard that read `undefined` because the query feeding it selected the wrong fields, and so returned `true` for every document forever ([[Gotchas - Backend Schema & Data]]). **Both are the same shape — the guard never saw its input and defaulted to permissive.**

## Confirm the backend can filter before wiring a frontend filter — an FE select for data the backend doesn't expose is a dead control

Before adding any filter control, trace the field to its source. A `<select>` is trivial to render, but if the field it filters on isn't in the response payload **and** isn't an accepted query param, the control is dead two ways over: you can't filter client-side (data absent) and a param the query DTO doesn't declare gets silently dropped by class-validator's whitelist. This is the inverse of the [[Staff Management - Unreachable Backend Endpoints|dead-endpoint]] class — there a working backend had no FE affordance; here an FE affordance has no backend data.

The [[Aircraft Category Filter - TOR Matrix|TOR Matrix B1/B2 filter]] (2026-07-16) looked like a one-line toolbar addition but `aircraftCategory` lived only on `StaffQualification` — not the TOR row, the matrix response DTO, or the query DTO — so it shipped full-stack: a new enum query param + a `qualificationModel.distinct("userId", { aircraftCategory })` intersect, mirroring the existing `aircraftTypeId` filter, then the FE select. When the matrix filters already run server-side, a new filter joins them **server-side** (see the dummy-data note above: "move filter into fetcher params when the backend supports it") rather than being bolted on in the view.

## Confirm the config/URL exists before wiring a cross-app link (tat-prereq)

Companion to [[Patterns - Architecture & Boundaries#Confirm the backend can filter before wiring a frontend filter — an FE select for data the backend doesn't expose is a dead control|"confirm the backend can filter"]]. A link to another app (e.g. History Form → the [[tat-portal]] online courses) needs that app's **base URL as config** — tat-prereq only had `API_URL` / `S3_BASE` / `DASHBOARD_URL`. Added an **optional** `NEXT_PUBLIC_ONLINE_COURSES_URL` and made the link helper return `null` when unset, so the control simply doesn't render until the env var is provided per environment. See [[History Form Online Course Deep-Links]] — the link was invisible locally purely because the var wasn't set. Rule: a cross-app deep link is a **dead control** until its base URL is configured; make it null-safe and flag the deploy dependency.

## Related

- [[Patterns]] · [[Gotchas]] · [[Key Decisions]]
- [[TAT Platform]] — the six-repo layout these boundaries run between
- [[TAT API & Auth Model]] — the contract that carries the backend-owns-the-rule decisions
