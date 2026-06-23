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

- [[TAT-409 Staff Management Subsystem]] — **new** internal subsystem (instructors + TORs) on an SSO subdomain; 21-ticket epic. Domain: [[Staff Management Subsystem & TOR Model]]
  - [[TAT-432 Staff Profile]] — profile view done; Add/Edit forms next
  - [[TAT-409 Backend Open Items]] — backend bugs/gaps blocking the FE, found in the TAT-410→435 ticket sweep (endpoint-level handoff)
  - [[TAT-409 Instructor TOR View - API Spec]] — field spec for `GET /tors/:id` so instructors can open their own TOR
- [[TAT Portal Onboarding]] — getting productive on [[tat-portal]] (the [[TAT Platform]] storefront)
- [[TAT-434 Email Verification]] — done, committed `533bf70`, Passed Code Review
- [[TAT-428 Edit Issued Certificates]] — tat-ws: catalog edit + trainee-row cert view/edit; rich-text HTML editing per BA re-scope, committed `d5a6d25`. Pending staging verification
- [[TAT Certificates - Open Items]] — all remaining gaps/bugs from the certificate work (frontend, backend, product)

## Review Prep

-

## Recently Completed

- [[TAT Website Hero Card-Morph Slider]] — rebuilt the [[tat-website]] home hero as an integrated GSAP card-morph slider (port of CodePen "timed cards opening"): next thumbnail expands into the full background, no white flash, auto-advance loop. Pushed `dev` `727946e` + fixes.
- [[TAT-440 Client Logos & Safran]] — [[tat-website]] client logos: added Safran to the `/clients` grid (TAT-441) + refactored the home-page orbit to polar-coordinate positioning (TAT-440). Committed `dev` `639458c`; orbit radius + Air NZ logo size tweaked later (`2d678ab`).

## Completed

### Current Quarter
-

### Previous Quarters
-

## Reference

- [[TAT Platform]] — system map of all 5 repos and how they connect
- [[TAT API & Auth Model]] — the shared backend contract
- [[Staff Management Subsystem & TOR Model]] — domain reference for the new TOR/staff subsystem ([[TAT-409 Staff Management Subsystem|TAT-409]])
- Repo notes: [[tat-app-ws Backend]] · [[tat-portal]] · [[tat-website]] · [[tat-ws]] · [[tat-prereq]]

## Decisions Log

| Date | Decision | Status | Link |
|------|----------|--------|------|
|      |          |        |      |

## Open Questions

-

## Archive

-
