---
date: 2026-07-08
description: "Root-caused + shipped 6 bugs in one session — Form 32 PIC save clobber & create-401 (tat-app-ws), signature draw reuse (tat-prereq), and a cross-frontend auth bundle (reset endpoint, login min, x-client-app routing) across 3 repos."
tags:
  - work-note
  - project/tat
status: completed
quarter: Q3-2026
project: tat-app-ws
---

# Form 32 PIC Bugs & Cross-Frontend Auth Fixes

> One session (2026-07-08) of root-cause debugging across [[tat-app-ws Backend]], [[tat-prereq]], and [[tat-portal]] — six bugs found, fixed, and pushed to `dev`. Part of [[TAT-409 Staff Management Subsystem]].

**Repos:** [[tat-app-ws Backend]] · [[tat-prereq]] · [[tat-portal]]
**Status:** All fixes committed + pushed to `dev`; awaiting staging deploy to re-verify end-to-end.

---

## What / Why

### 1. Form 32 PIC save clobber (high) — `0969d044`
Every **first-time** PIC (SA/AD/QM/TM) save of a Form 32 failed with a misleading *"All Form 32 sections require a selected option and supporting evidence"*. Root cause: `Object.assign(merged, this.mergeAssessment(current, dto.assessment))` — the helper returns `{ ...current, assessment }`, so the assign **spread the stale `current` over the freshly-merged data**, wiping name/date/sections. Masked on already-saved forms; the FE always sends a truthy `assessment: {}`, so every first save tripped it. Fix: assign only `merged.assessment = mergeAssessment(...).assessment`. Full writeup + the staging-bisection debugging method: [[Gotchas]].

### 2. Form 32 create 401 for PIC — `977f05f8`
The `@Action(SM_CREATE_FORM_32)` controller guard rejected before any service code, because `SM_CREATE_FORM_32` was only in the **instructor** role→action seed bucket, not the PIC bucket. Permission for a guarded endpoint lives in the **seed**, not a service check — and needs a re-seed to apply. See [[Gotchas]].

### 3. Form 32 signature draw — `3dcdded` ([[tat-prereq]])
Generalized the Form 285 `SignatureInput` (canvas draw + upload) with `category`/`label` props and reused it for the Form 32 assessor signature instead of building a new upload-only control.

### 4. Cross-frontend auth bundle (all 3 repos)
- **Reset endpoint contract** — FE called `POST /auth/reset-password` (→ "Cannot POST"); backend only exposes `PATCH /auth/reset-password/:token` with `{ password }`. Fixed [[tat-prereq]] + [[tat-portal]].
- **Login length** — login enforced `min(8)`, blocking valid admin-issued/legacy short passwords; loosened to `min(1)` (strength belongs on creation/reset, not sign-in).
- **Dead Email field** removed from the reset page (the token identifies the user).
- **Reset-link platform routing** — `resolveResetPasswordUrl` never learned about `staff-management`, so staff forgot-password links fell through to the dashboard host. Added the `x-client-app: staff-management` branch. Lesson: each client-routed link type has its **own** resolver/branch list — audit all of them. See [[Patterns]].

## Related

- [[TAT-409 Staff Management Subsystem]] — parent
- [[TAT-409 Backend Open Items]] — Form 32 endpoints listed there as "not built" are now stale
- [[Gotchas]] · [[Patterns]] — durable writeups
- Competencies: [[Debugging & Root Cause Analysis]] · [[Systems Thinking]] · [[Code Quality]] · [[Delivery & Scope Management]]
