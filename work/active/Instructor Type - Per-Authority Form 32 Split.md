---
date: 2026-07-30
description: "Every instructor saw both Form 32A and 32B — both mapped to the single IN code. Adds InstructorType per TOR (= per authority), the create/edit UI, and an audit trail"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
ticket: TAT-451
---

# Instructor Type - Per-Authority Form 32 Split

Covers **TAT-451** (which Form 32 sections apply) and **TAT-448** (configuring the type at
staff creation). Backend on `dev`; two commits and the frontend still unpushed.

## Root cause — one line, not a missing subsystem

Every instructor saw **both** Form 32A (Theoretical) and Form 32B (Practical), on every
authority. `FORM_32_ROLE_BY_KEY` mapped both keys to `SystemRolesCodes.INSTRUCTOR`, and that
enum has exactly one instructor code, so any instructor satisfied both checks.

**The filtering machinery already existed and was already enforced** in all four paths — TOR
details, TOR matrix, form provisioning, and a `ForbiddenException` on direct form fetch.
Nothing needed building. The vocabulary needed splitting.

> [!warning] Two wrong diagnoses preceded the right one
> First: "the backend has no role→form filtering at all." False — it has had it all along.
> Second: instructor type belongs at *(authority × aircraft)*. Also false, from over-reading
> an example. **The grain is per-TOR, and a TOR is one-per-`licenseId`**, so the
> per-authority independence TAT-451 AC-01 and TAT-448 AC-04 require falls out of existing
> structure for free.

## The two layers people conflate

| Layer | Decides | Lives on |
|---|---|---|
| **Instructor type** | *which* forms appear — 32A, 32B, both, neither | the TOR (= the authority) |
| **Aircraft type + B1/B2** | how many *instances* inside a form already shown | the form instance |

`StaffTorFormSchema.index({ torId, templateId, instanceKey }, { unique: true })` with
`instanceKey: String(aircraftTypeId)` — a form *instance* is per (authority × form ×
aircraft). The *type* is not.

## What shipped

**Backend** — `InstructorType` (none/theoretical/practical/both) on `staff-tor.schema.ts`;
`formKeyMatchesRequestedRoles` consults it for 32A/32B only (C/D untouched);
`PATCH tors/:torId/instructor-type`; `instructorType` on the TOR details **and** list
responses; `IntSignUpDTO` takes `instructorAuthorities` and `UpdateUserDto` inherits it via
`PartialType(OmitType(…))`; `provisionInstructorTors` creates TORs only for authorities that
aren't `none` and updates types on ones that exist;
`StaffTorAuditEvent.INSTRUCTOR_TYPE_CHANGED` written from all three mutation paths including
creation (`from=null`).

**Frontend** — an *Instructor authorization* card on the staff form, shown only when the
primary role is Instructor, prefilled on edit from existing TORs (AC-07).

**Deliberately not done:** theoretical/practical were **not** added to `SystemRolesCodes`.
That enum is the RBAC vocabulary shared with auth; instructor type is a *qualification*, not
a permission.

| Repo | Commit | State |
|---|---|---|
| tat-app-ws | `60b4a2ec`, `fddfd758`, merge `9eb0d31f` | pushed |
| tat-app-ws | `c1395759`, `9110fdad` | **unpushed** |
| tat-prereq | `338def5` | pushed |
| tat-prereq | `6674ce3` | **unpushed** |

## The FE was holding a fork of the rule

`tat-prereq`'s `FORM32_REQUIRED_ROLE` mapped the same four keys to the same three codes as
the backend — but was fed from the **staff member's** roles while the backend reads the
**TOR's** `requestedRoleCodes`. Two sources of truth, different inputs, free to disagree, and
only one of them per-authority. Its doc comment claimed *"the backend has no `role` field on
Form 32 templates"*, which was false and is exactly what made the duplication look justified.
`grep -rn "requestedRoleCodes" src` returned nothing — the FE never consumed the field the
backend was already sending.

Removed. Both screens now render what the server sends: **63 lines deleted, 14 added**. See
[[Patterns - Architecture & Boundaries#The backend owns business rules; the frontend renders the answer (2026-07-12)]].

## Three traps caught before shipping

1. **`npm run check:schemas` caught a nullable enum** — `default: null` on an enum would have
   failed validation on *every* TOR document. `tsc` passed it happily. 6th instance of that
   bug class, and the first caught by the guard the 5th created — see
   [[Gotchas - Backend Schema & Data]].
2. **A silent self-wipe** — the staff form passes its whole values object to the mutation, so
   an instructor editing *their own* profile would have submitted the schema's all-`None`
   default and cleared `instructorType` on every one of their TORs.
3. **A guard that would never have fired** — `findUserIdsWithIncompleteTors` projected four
   fields, so the new activation guard read `undefined` and passed every time.

## Verified

`check:schemas` clean · `tsc` clean both repos · **18 backend unit tests** · full database
suite at the same 24 pre-existing failures as untouched `dev`, passing 35 → 53 · frontend
lint 0 errors · card confirmed in the browser.

## Still open

- **The migration has never run** — not even a dry run, against any database.
  `scripts/migrations/2026-07-30-backfill-tor-instructor-type.js`, dry-run by default, needs
  `MIGRATION_MONGO_URI`. Until it runs, existing TORs have no type and fall back to old
  behaviour. **That fallback is the only thing preventing every instructor losing both Form
  32s if the deploy precedes the backfill.**
  > [!danger] Do not run it first (2026-08-01)
  > It derives the type from `requestedRoleCodes`, which is **empty on every legacy TOR and
  > backfilled by nothing** — so it writes `instructorType: NONE`, hiding 32A/32B and tripping
  > the activation guard, i.e. it *causes* the loss the fallback was preventing. Backfill
  > `requestedRoleCodes` first. See
  > [[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]].
- **32C/32D were left on `requestedRoleCodes` and are still wrong for legacy TORs** — the
  gate there fails open on the empty field, so a plain instructor still sees Examiner and
  Assessor forms. Root-caused 2026-08-01, unfixed, and it needs the same backfill.
- **Nothing verified end to end.** No instructor created through the new path, no API call
  against a running server, no audit row ever written. Types, unit tests and rendering only.
- **The activation guard is on `dev` and the BA has not reviewed it.** TORs that activate
  today will be held if an instructor's type is `NONE`.
- ~~**TAT-451 AC-07's Final TOR Certificate clause is not implementable** — TAT-450 is
  unbuilt.~~ **Unblocked 2026-08-01** — the backend shipped TAT-450 in the 2026-07-28→31 drop
  and the FE read path is built and verified
  ([[TAT-450 TOR Certificate FE - Read Path Only]]). The clause is now implementable; whether
  it *is* implemented has not been rechecked. Every other AC on both tickets was already
  covered.
- `provisionInstructorTors`' selection branch and the audit writes have **no tests** — both
  need mongo and the repo has no integration harness.
- Setting an existing authority to `None` does **not** delete its TOR (it may hold Form 285,
  documents, history). Creation decides which TORs exist; editing can add and neutralise,
  never destroy. No AC covers deletion — needs a product call.
- `INSTRUCTOR_TYPE_OPTIONS` emits `{value,label}` where `STAFF_ROLE_OPTIONS` emits
  `{code,label}`. Idiom drift, unaligned.
- `nx lint` is broken repo-wide in `tat-app-ws` — backend lint has not run all session.

## Unblocks

**TAT-454 shipped on it (2026-08-01)** — the FE now sends `courseMethod` on all three
instructor pickers, verified end to end against staging:
[[TAT-454 Instructor Assignment Filtering - courseMethod]]. TAT-453 still open.

TAT-454 and TAT-453 both need exactly this theoretical/practical distinction for instructor
assignment filtering, and were unimplementable without it.

## Loom's first live slice lived here briefly

The original TAT-451 slice was a pure FE resolver written by a live `codex` station through
[[Loom]] — its first non-`sim` run, executed twice (blind, then with the toolchain) for a
byte-identical diff. Investigating the backend then showed the decision belongs server-side,
where it is *enforced* rather than merely displayed, so that code was removed again in
`338def5`. The provenance is kept in [[Loom]]; the logic now lives in
`staff-tor-requested-role.util.ts` with tests.

## Related

- [[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]] — the follow-on: why
  C/D are still wrong, and why this note's backfill must not run first
- [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Loom]] — delivered the first version of this slice
- [[Gotchas - Backend Schema & Data]] · [[Gotchas - Frontend]] · [[Gotchas - Tooling & Method]]
- [[Index|Work Notes]]

### Competencies

- [[Debugging & Root Cause Analysis]] — two wrong diagnoses, both corrected by reading the
  code rather than reasoning further; the actual cause was one line in a table everyone had
  read past.
- [[Systems Thinking]] — separating *which forms apply* (per authority) from *how many
  instances* (per aircraft), and recognising the filter already existed and was enforced,
  so the fix was vocabulary rather than machinery.
- [[Code Quality]] — deleting a duplicated business rule fed from a different source rather
  than extending it; 63 lines removed against 14 added.
