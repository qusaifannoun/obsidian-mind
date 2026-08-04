---
date: 2026-06-02
description: "Living document of goals, focus areas, and aspirations — read at session start, updated when direction shifts"
tags:
  - brain
  - north-star
aliases:
  - Goals
  - Focus
---

# North Star

A living document of goals, aspirations, and current focus areas. Both you and Claude write to this. Claude reads it at the start of meaningful work sessions and references it when making suggestions.

## Current Focus

_What am I working toward right now?_

- Building across the [[TAT Platform]] — an aviation e-learning product spanning 6 repos (backend + 4 frontends + this vault).
- **Nothing is in flight as of 2026-08-04.** The whole board went to QA and `work/active/` holds no `status: active` note for the first time since 2026-06-02 — 22 archived as delivered, 3 archived by decision. What comes back from QA, and what gets picked up next, is **not yet decided**.
- **Primary repo remains [[tat-prereq]]** — the Staff Management subsystem (instructors + TORs), scaffolded 2026-06-04 mirroring [[tat-portal]], built out through [[TAT-409 Staff Management Subsystem|TAT-409]] and now handed over in full.
- Prior focus: [[tat-portal]] (the student storefront), kickoff in [[TAT Portal Onboarding]].

## Goals

### Short-term (This Quarter)

- ~~Ship the [[TAT-409 Staff Management Subsystem]]~~ — **delivered and handed to QA, 2026-08-04.** Two months from an FE-only build on dummy data to a full-stack subsystem across [[tat-prereq]] + [[tat-app-ws Backend]]. The delivery record is [[TAT-409 Delivery Log]]; the archived notes are in `work/archive/2026/`.
  - ✅ **The onboarding loop runs end to end (2026-07-12)** — instructor added → sit-in → evaluator → TM → History Form `APPROVED`. It had **never once completed** before; a [[TAT-429 Sit-In Eligibility & Move Semantics|circular dependency]] made it impossible.
  - ✅ Staff create/edit verified on staging (2026-06-07) · History Form slice wired + verified across roles (2026-06-28) · Form 32 rejection history · [[TAT-423 Assessment Report Rubric|assessment rubric + assessor model]] · [[History Form - Training & Validity Records|training & validity records]] · [[Instructor Type - Per-Authority Form 32 Split|per-authority Form 32 split]] · [[TAT-455 Final TOR Certificate - SA Publish Gate|the TOR certificate publish gate]].

- **The goal that did not get met: verification.** Delivery leaving my hands is not the same as the work being exercised, and archiving the board did not change that. Every archived note keeps its `## Still open` section. What is genuinely unresolved:
  - **No certificate on staging has ever reached `APPROVED`** (all 16 staff show 0 active TORs), so [[TAT-450 TOR Certificate FE - Read Path Only|TAT-450]]'s write path and [[TAT-455 Final TOR Certificate - SA Publish Gate|TAT-455]]'s publish round-trip have never run. QA hits this before I do.
  - **Two migrations, one order.** The `instructorType` backfill exists but has never run, and running it before a `requestedRoleCodes` backfill — which is **still unwritten** — writes `instructorType: NONE` and hides both Form 32s from every instructor ([[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]]).
  - **Latent bugs surface in a burst the first time a blocked path is actually walked** — see [[Gotchas - Tooling & Method#Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)]]. Expect the QA pass to behave the same way.
  - **Spec debt QA will trip over, not code debt**: TAT-450's AC-45 is still unedited in Jira after the BA ruled it superseded, and TAT-453's Jira status is still *"Ready for Dev"* while the work is complete.
  - **Open, needing a BA call**: nobody can pause a TOR; requested roles frozen at creation ([[Staff Management - Unreachable Backend Endpoints]]); TAT-424 ↔ TAT-429 contradiction unrecorded in Jira.

- **Next focus is undecided.** The 14 `backlog` notes in `work/active/` are the standing candidates — [[Pending Review Requests - Reviewer Worklist]] is the only unbuilt spec among them; the rest are shipped-but-unverified slices and handoffs. TAT-430 — the subsystem shell the rest of the epic sits on — is still unbuilt.

### Medium-term (This Half)

-

### Long-term (This Year+)

-

## Aspirations

_What kind of engineer/person am I becoming?_

-

## Anti-goals

_What am I explicitly NOT optimizing for?_

-

## Shifts Log

Record when focus changes, with date and reason.

| Date | Shift | Reason |
|------|-------|--------|
|      | Created North Star | Initial setup |
| 2026-06-02 | Focus set to TAT Platform, starting with tat-portal | Beginning work across the TAT repos |
| 2026-06-07 | TAT-432 staff create/edit verified against staging + fixed | First live-backend validation of the tat-prereq FE-first build |
| 2026-08-04 | TAT-409 delivery closed — whole board handed to QA, `work/active/` emptied of active work | Build phase done from my side. Focus shifts off building and onto whatever QA returns; next assignment not yet set. Verification debt carried into the archive rather than resolved |
