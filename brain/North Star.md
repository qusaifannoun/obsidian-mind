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
- **Active repo: [[tat-prereq]]** (new) — the Staff Management subsystem (instructors + TORs). Scaffolded 2026-06-04 mirroring [[tat-portal]]; building out [[TAT-409 Staff Management Subsystem|TAT-409]].
- Prior focus: [[tat-portal]] (the student storefront), kickoff in [[TAT Portal Onboarding]].

## Goals

### Short-term (This Quarter)

- Ship the [[TAT-409 Staff Management Subsystem]] ([[tat-prereq]] + [[tat-app-ws Backend]]). **No longer FE-only and no longer blocked on backend** — I'm now working across both, and the dummy data is long gone. The backend fix drop (2026-07-06) resolved the keystone gaps; everything since has been real end-to-end delivery.
  - ✅ **The onboarding loop runs end to end (2026-07-12)** — instructor added → sit-in → evaluator → TM → History Form `APPROVED`. It had **never once completed** before; a [[TAT-429 Sit-In Eligibility & Move Semantics|circular dependency]] made it impossible.
  - ✅ Staff create/edit verified on staging (2026-06-07) · History Form slice wired + verified across roles (2026-06-28) · Form 32 rejection history · [[Pending Review Requests - Reviewer Worklist|reviewer worklist]] · [[TAT-423 Assessment Report Rubric|assessment rubric + assessor model]] · [[History Form - Training & Validity Records|training & validity records]].
  - **The real risk now is verification, not build.** Every feature touched this week had latent bugs the moment it was first actually driven — see [[Gotchas - Tooling & Method#Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)]]. Large parts of what shipped this week are **still unexercised**.
  - **Open, needing a BA call**: nobody can pause a TOR; requested roles frozen at creation ([[Staff Management - Unreachable Backend Endpoints]]); TAT-424 ↔ TAT-429 contradiction unrecorded in Jira.

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
