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
  - [[TAT-432 Staff Profile]] — profile view + Add/Edit forms done
  - [[Staff Self-Service Polish - Nationality, Password, Profile Data]] — QA batch: nationality dropdown, national-ID validation, self-service change-password, `profiles/me` full-mapping fix, per-TOR quals/assessments aggregation, DOB format, Form 285 title dropdown, Manage Staff eye icon; shipped `dev` (`c267616`/`4a17423`/`af17500`, 2026-07-08)
  - [[Staff Creation Blocked - qualificationTrackingMode Enum Bug]] — backend `enum + default:null` on `User.qualificationTrackingMode` blocked ALL staff creation on staging; fixed + pushed (`dc8f3a4f`), awaiting deploy re-verify (2026-07-07)
  - [[Form 32 PIC Bugs & Cross-Frontend Auth Fixes]] — Form 32 PIC save clobber (`0969d044`) + create-401 seed gap, signature-draw reuse, and a cross-repo auth bundle (reset endpoint, login min, `x-client-app` routing); all pushed to `dev` (2026-07-08)
  - [[Form 32 Rejection History & Round-Scoped Stamps]] — **plan** (grill-me, 2026-07-09): clear-on-submit so field rejections stop accumulating across rounds + a full per-item review timeline (unified `reviewHistory` event log: rejected/edited/uploaded/approved)
  - [[Pending Review Requests - Reviewer Worklist]] — **spec** (2026-07-09): reshape the Pending TORs page from a per-staff list into a per-review-request worklist (each Form 285/32/assessment/history item in a pending-review state as its own row); needs a new backend aggregate endpoint
  - [[History Form - Training & Validity Records]] — **shipped `dev` (2026-07-12)**: Updated Training & Validity was a hard-coded 5-course catalog. Instructors can now add **external training records** (same approval cycle), and completing **any non-mandatory online course auto-adds an approved record** — that feature turned out to be a `return` statement in an already-wired hook. Expiry derived, no cron. Also **fixed a 35h-badge bug I shipped that morning** (0/35h for everyone) by moving the rule server-side, and the aircraft **refresher date** (was showing when the last one happened, not when the next is due)
  - [[TAT-423 Assessment Report Rubric]] — **assessor model landed (2026-07-12)**: the form had **no assessor concept** — the instructor being assessed could grade and sign themselves. Added `assessorUserId` (optional, to break the same active-TOR circular dependency as TAT-429), an eligible-assessor endpoint (same licence + approved aircraft qualification, B1/B2 ignored), the missing header row (TAT ID was rendering the raw Mongo ObjectId, read-only), `/my-assessments`, shared draw/upload signatures, and split *filling* from *approving* (QM/AD submit to TM; only SA/TM approve). Fixed: assessment create 500'd on every attempt (`enum + default:null`), and video upload had **never** worked (MIME vs extension). 7 commits
  - [[TAT-423 Assessment Report Rubric]] — **shipped `dev` (2026-07-09)**: the Assessment Report (TAT FORM 032) captured only the sign/approve shell; added the full graded rubric (14 scored criteria + discipline flags, objective/task/reference, overall rating, Part 147, comments) across backend + FE via parallel platform agents. Also fixed the CARC-only `assessment_report` form template → now per-license for all authorities
  - [[Staff Management - Unreachable Backend Endpoints]] — **sweep (2026-07-12)**: after four bugs in one week turned out to be working backends with no FE affordance, diffed all **108 staff-management routes** against every frontend. 4 have no caller — headline: **nobody can pause a TOR** (`manual-status`), and **an instructor's requested roles are frozen at creation** (`requested-roles`, which silently governs Form 32 scoping *and* assignment eligibility). Fixed the 35h badge summing the wrong collection (`5159a07`)
  - [[TAT-429 Sit-In Eligibility & Move Semantics]] — **shipped `dev` + verified on staging (2026-07-12)**: the Add Instructor list applied TAT-424's Active-TOR rule to the sit-in path, which is **circular** (TOR ACTIVE ← HF approved ← sit-in ← addCourseInstructor ← TOR ACTIVE) — a new instructor could never be onboarded and every aircraft-type course returned an empty list. Dropped the TOR gate (TAT-429 AC-03 implemented as written for the first time) + sit-in move semantics. **Then ran the cycle end to end for the first time ever**, which surfaced 4 latent bugs behind the old deadlock (completed sit-in 404, "No sit-in" on the list, audit misattribution, unlabelled event) + built the Instructors tab (list endpoint, status column, search/status filters). 7 commits. Open: confirm the TOR actually activates; the move path is still unexercised
  - [[Stale Sit-In Index & Orphaned Instructor Enrollments]] — **staging-blocking (2026-07-10)**: a stale `unique` non-sparse `enrollmentId_1` index left by the TAT-429 field rename broke *every* sit-in insert since 2026-06-26; the missing rollback in `addCourseInstructor` left orphan enrollments that silently hide instructors from the eligible list. Migration + service fix written; migration run blocked on Atlas IP allowlist
  - [[TAT-409 Backend Open Items]] — backend bugs/gaps blocking the FE, found in the TAT-410→435 ticket sweep (endpoint-level handoff)
  - [[TAT-409 Instructor TOR View - API Spec]] — field spec for `GET /tors/:id` so instructors can open their own TOR
  - [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]] — tat-prereq navbar bell + real-time flashing dot (Socket.IO) + notification detail page; backend repoints prereq notifications to the staff-management host (`STAFF_MANAGEMENT_URL`) + non-destructive migration (2026-07-08)
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
- [[History Form Audit Log]] — what `StaffTorAuditLog` records for HF actions (events by section, the per-TOR fan-out quirk, write-only gap)
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
