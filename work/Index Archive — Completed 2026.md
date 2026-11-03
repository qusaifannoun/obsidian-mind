---
date: 2026-11-03
description: "Completed work notes by quarter, moved verbatim out of the Work Index when it crossed 25KB — Q3 and Q2 2026"
tags:
  - index
  - moc
---

# Index Archive — Completed 2026

Split out of [[Index|Work Index]] on 2026-11-03, when it reached 32KB. Moved verbatim; the Index keeps a pointer. Completed notes archived from now on can still be listed here.

All archived to `work/archive/2026/`.

### Q3 2026

**Handed to QA and archived 2026-08-04** — 22 notes moved out of `active/` in one pass. `completed` here means *delivery left my hands*, **not verified**: every note keeps its `## Still open` section verbatim, and the items below outlive the archive.

- `TOR Certificate/` — [[TAT-450 TOR Certificate FE - Read Path Only]] · [[TAT-455 Final TOR Certificate - SA Publish Gate]]. **Write path and publish round-trip have never run** — no staging certificate has ever reached `APPROVED`
- `Form 32/` — [[Form 32 Approved Lock - Owner Read-Only]] · [[Form 32 Rejection History & Round-Scoped Stamps]] · [[Instructor Type - Per-Authority Form 32 Split]]. **The TAT-451 `instructorType` backfill migration has still never run**, and must not run before `requestedRoleCodes` is backfilled
- `Assessment/` — [[TAT-423 Assessment Report Rubric]] · [[TAT-453 Assessor Eligibility - instructorType Load-Bearing Twice]]. TAT-453's Jira status is still *"Ready for Dev"* while the work is complete
- `History Form/` — [[Export History Form - TAT Form 031 PDF]] · [[History Form - Training & Validity Records]]. The 031 export has **never been run against a live DB record**
- `Staff Number/` — [[Sequential User Number - Atomic Allocation & Backfill]] · [[TAT-449 Staff Number Display - Unpadded staffNumber]]. Staging holds an unpadded `3` **no known writer could have produced**; the backfill has not run under the `staffNumber` name
- Loose slices — [[TAT-429 Sit-In Eligibility & Move Semantics]] · [[TAT-432 Staff Profile]] · [[TAT-434 Email Verification]] · [[TAT-454 Instructor Assignment Filtering - courseMethod]] · [[Aircraft Category Filter - TOR Matrix]] · [[Aircraft Qualification Approval Invisible - Status String Mismatch]] · [[Staff Creation Blocked - qualificationTrackingMode Enum Bug]] · [[Stale Sit-In Index & Orphaned Instructor Enrollments]] · [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]] · [[TOR Activation - Details Endpoint Lied About ACTIVE]] · [[tat-prereq Forms Refactor - Zod + RHF]]
  - **[[TAT-434 Email Verification]] settles the 2026-08-02 status conflict** — the index's *"Passed Code Review"* reading was the correct one
  - Per-ticket delivery detail for the TAT-409 slices lives in [[TAT-409 Delivery Log]]

**Archived the same day by decision, not by delivery** — these three never went to QA and `completed` does **not** describe them. Archived on Qusai's explicit call (2026-08-04) to clear the board; their open items are live and belong to whoever picks the subsystem back up:

- [[TAT-409 Staff Management Subsystem]] — the 21-ticket epic tracker, **Parked in Jira**. Open children include **TAT-430**, the subsystem shell everything else sits on. Per-ticket history stays in [[TAT-409 Delivery Log]]
- [[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]] — **root cause only, no code written.** The fix was deferred on 2026-08-02 until QA flags the symptom; the `requestedRoleCodes` backfill script is still unwritten and gates the [[Instructor Type - Per-Authority Form 32 Split|instructorType]] migration
- [[Staff Management - Unreachable Backend Endpoints]] — the 108-route sweep. Its 7 open items are **BA questions, not deliverables**: nobody can pause a TOR, and an instructor's requested roles are frozen at creation

- [[Refresher Date Override - SA-Only Absolute-Date Override]] — TAT-447, **shipped + verified end-to-end on staging (2026-07-23)**: SA-only absolute-date override replacing the computed mandatory-training refresher date at **two scopes** — per-instructor slot ([[tat-prereq]]) + course fleet stamp ([[tat-ws]]); last-write-wins, a real completion wipes it. SA confirmed to hold the `SM_OVERRIDE_MANDATORY_TRAINING_REFRESHER` grant (overrides took effect, not 403). tat-prereq `9ff648b`+`1771a68` · tat-ws `e2ee0e0`+`82b0273`. Two resolver-level spec gaps (precedence ordering, revert path) lifted onto [[Loom]] Slice 0
- [[Form 32 PIC Bugs & Cross-Frontend Auth Fixes]] — Form 32 PIC save clobber (`0969d044`) + create-401 seed gap, signature-draw reuse, and a cross-repo auth bundle (reset endpoint, login min, `x-client-app` routing); all pushed to `dev` (2026-07-08)
- [[Staff Self-Service Polish - Nationality, Password, Profile Data]] — QA batch: nationality dropdown, national-ID validation, self-service change-password, `profiles/me` full-mapping fix, per-TOR quals/assessments aggregation, DOB format, Form 285 title dropdown, Manage Staff eye icon; shipped `dev` + verified on staging (`c267616`/`4a17423`/`af17500`, 2026-07-08)

### Q2 2026
- [[TAT-428 Edit Issued Certificates]] — [[tat-ws]]: general catalog edit + permission gate, trainee-row cert view, and rich-text HTML editing of issued online-course certs (per BA re-scope), committed `d5a6d25`. Contract-verified against backend source 2026-07-05; live E2E a manual follow-up.
- [[TAT Website Hero Card-Morph Slider]] — rebuilt the [[tat-website]] home hero as an integrated GSAP card-morph slider (port of CodePen "timed cards opening"): next thumbnail expands into the full background, no white flash, auto-advance loop. Pushed `dev` `727946e` + fixes.
- [[TAT-440 Client Logos & Safran]] — [[tat-website]] client logos: added Safran to the `/clients` grid (TAT-441) + refactored the home-page orbit to polar-coordinate positioning (TAT-440). Committed `dev` `639458c`; orbit radius + Air NZ logo size tweaked later (`2d678ab`).
- [[TAT-409 Instructor TOR View - API Spec]] — **resolved without the work**: backend granted instructors access to `/tors/:torId/details`, so the existing FE worked unchanged and the `/tors/:id` enrichment route was never taken. Spec kept for reference.

