---
date: 2026-06-02
description: "Central map of all work notes — active projects, completed work by quarter, decisions log"
tags:
  - index
  - moc
---

# Work Notes

Central map of content. All work notes and decisions link back here. For quick navigation, use [[Home]] or open `bases/Work Dashboard.base`.

**Folder structure**: `active/` = current projects, `archive/` = completed (by year), `incidents/` = incident docs, `1-1/` = meetings.

## Incidents

Incident docs live in `work/incidents/`. See `Incidents.base` for overview.

-

## Active Projects

- [[TAT-409 Staff Management Subsystem]] — **new** internal subsystem (instructors + TORs) on an SSO subdomain; 21-ticket epic. Domain: [[Staff Management Subsystem & TOR Model]]. **History Form slice (417/418/419/420/421/429) wired to the real backend + verified across roles, rendered as the single-document TAT Form 031 (2026-06-28).**
  - [[TAT-432 Staff Profile]] — profile view done; Add/Edit forms next
  - [[TAT-409 Backend Open Items]] — backend bugs/gaps blocking the FE, found in the TAT-410→435 ticket sweep (endpoint-level handoff)
  - [[TAT-409 Instructor TOR View - API Spec]] — field spec for `GET /tors/:id` so instructors can open their own TOR
- [[TAT Portal Onboarding]] — getting productive on [[tat-portal]] (the [[TAT Platform]] storefront)
- [[Online-Course Exam Timeout - Backend Bug]] — [[tat-portal]] exam-timer fix shipped (`f858fb8`); backend handoff to score saved answers on timeout instead of forfeiting
- [[TAT-436 Refresher Certificate Publish]] — tat-ws: SA-only publish for refresher/TOR certs (hidden from trainee until published). Backend shipped (`cb267288`); FE wired — Unpublished indicator + Publish button on Manage Trainees. Pending staging verification
- [[TAT-434 Email Verification]] — done, committed `533bf70`, Passed Code Review
- [[TAT Certificates - Open Items]] — all remaining gaps/bugs from the certificate work (frontend, backend, product)

## Review Prep

-

## Recently Completed

- [[TAT Website Hero Card-Morph Slider]] — rebuilt the [[tat-website]] home hero as an integrated GSAP card-morph slider (port of CodePen "timed cards opening"): next thumbnail expands into the full background, no white flash, auto-advance loop. Pushed `dev` `727946e` + fixes.
- [[TAT-440 Client Logos & Safran]] — [[tat-website]] client logos: added Safran to the `/clients` grid (TAT-441) + refactored the home-page orbit to polar-coordinate positioning (TAT-440). Committed `dev` `639458c`; orbit radius + Air NZ logo size tweaked later (`2d678ab`).

## Completed

### Current Quarter
- [[TAT-428 Edit Issued Certificates]] — tat-ws: general catalog edit + permission gate, trainee-row cert view, and rich-text HTML editing of issued online-course certs (per BA re-scope), committed `d5a6d25`. Contract-verified against backend source 2026-07-05; live E2E a manual follow-up. Archived 2026.

### Previous Quarters
-

## Reference

- [[TAT Platform]] — system map of all 5 repos and how they connect
- [[TAT API & Auth Model]] — the shared backend contract
- [[Staff Management Subsystem & TOR Model]] — domain reference for the new TOR/staff subsystem ([[TAT-409 Staff Management Subsystem|TAT-409]])
- [[TAT-409 Ticket Groups & Inspection Map]] — business-logic grouping of all 22 TAT-409 tickets + cross-ticket tensions + the group-by-group functionality-inspection tracker (backend↔FE↔Jira). **✅ Inspection COMPLETE (2026-07-05) — all 11 groups.**
- [[TAT-409 Bug & Gap List]] — consolidated output of the inspection: 37 gaps by severity + missing AC + platform + fix. **Update 2026-07-06: 24/37 resolved** — 18 by the backend fix drop (keystone included) + 6 FE gaps shipped to `main`. Shareable `.docx`/`.html` need regenerating before re-sharing.
- Repo notes: [[tat-app-ws Backend]] · [[tat-portal]] · [[tat-website]] · [[tat-ws]] · [[tat-prereq]]

## Decisions Log

| Date | Decision | Status | Link |
|------|----------|--------|------|
|      |          |        |      |

## Open Questions

-

## Archive

-
