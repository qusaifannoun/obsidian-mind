---
date: 2026-06-02
description: "Index of things that have bitten before and will bite again — one line per domain note, with the per-trap one-liners in the backend and frontend sub-indexes"
tags:
  - brain
  - index
---

# Gotchas

Things that have bitten before and will bite again.

Split into domain notes on 2026-07-28, when the single file reached 96KB. Substance lives in the domain notes — **add new entries there, not here.** The one-liners per trap live in the two sub-indexes below.

The one-line-per-trap lists moved verbatim to two sub-indexes on 2026-11-03, when this note reached 32KB:

- **[[Gotchas - Backend Index]]**
  - [[Gotchas - Backend Schema & Data]] — Mongoose document and schema mechanics that bite — enum defaults, index lifecycle, subdocument spreads, soft-delete, and sequence allocation.
  - [[Gotchas - Backend Merging & Subdocuments]] — Object spread and merge traps in tat-app-ws — Object.assign clobbering merged data, spread Mongoose subdocuments dropping patches and nested arrays, shared refs hiding diffs.
  - [[Gotchas - Backend Services & Environment]] — tat-app-ws service-layer and environment traps — API contract shapes, serializers, queues, schedule mapping, and which database an environment actually points at
  - [[Gotchas - Seeding & Notifications]] — tat-app-ws boot-time seeding and notification plumbing traps — destructive re-seeds, skip-existing seeders, and the enum and mapping gates a notification must pass
  - [[Gotchas - TOR & Staff Management]] — TOR activation, sit-in eligibility, staff profile and qualification traps in the staff-management subsystem.
  - [[Gotchas - Forms & Approval]] — TAT form traps — Form 32/285, History Form, approval and permission rules, and post-approval locking.
- **[[Gotchas - Frontend & Method Index]]**
  - [[Gotchas - Frontend]] — Component and framework traps across tat-prereq, tat-portal, tat-ws and tat-website — Next.js, MUI, styling, auth cookies, forms and layout
  - [[Gotchas - Frontend Data & API Contracts]] — Frontend data-layer traps across tat-prereq, tat-portal and tat-ws — React Query errors and cache keys, endpoint contracts, uploads and certificate hooks
  - [[Gotchas - Tooling & Method]] — Toolchain and working-method traps — vault tooling, lint and IDE behaviour, and recurring reasoning failures.
