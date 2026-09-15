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

Multi-note workstreams inside `active/` are grouped into topic folders — currently `Assessment/`, `Form 32/`, `History Form/`, `TOR Certificate/`, each now holding only its backlog and decision notes. Grouping is the lifecycle axis only: wikilinks resolve by name across folders, so a move never breaks a link, QMD, or the graph. The archive mirrors the grouping — `archive/2026/` carries the same five folder names after the 2026-08-04 QA handoff.

## Incidents

Incident docs live in `work/incidents/`. See `Incidents.base` for overview.

-

## Active Projects

_The board was empty from 2026-08-04 (whole board handed to QA and archived) until 2026-08-12._

- [[Question Bank Bulk Upload - A Feature That Only Reported Success]] — nine commits across [[tat-app-ws Backend]] and [[tat-ws]]: the parser read the workbook's empty leading sheet and called it success, and six more defects underneath it, each hidden by the one above. Sheet fix and format support verified (0 → 150 rows, six formats); pagination verified live. **Five backend commits unverified, pending a deploy**
- [[TOR Matrix 500 - Leading Space in aircraftTypeIds Ref]] — [[tat-app-ws Backend]] `bad7584f` + [[tat-prereq]] `dcacb9a`, both on `origin/dev`: `StaffTor.aircraftTypeIds` carried `ref: " TrainingTypes"` (leading space, unregistered name), so populate threw `MissingSchemaError` and `/staff-management/tor-matrix` 500'd for any result set holding a TOR. **A missing `isError` branch rendered the crash as "No staff match your search or filter."** Backend fix **unverified — staging still runs the old code**
- `TOR Certificate/` — [[TOR Sync Never Re-Ran - Stale BullMQ Job Id]] — [[tat-app-ws Backend]] `9896faa3`: a fixed BullMQ `jobId` outlived its completed job, so every TOR re-sync for 24h was silently discarded and returned as success. **Why 40 TORs across 18 staff showed 0 active.** Pushed, **unverified** — needs a deploy plus a Redis flush
- `TOR Certificate/` — [[Final TOR Certificate - Form 020 Alignment & Export]] — Course Rating/T1/T2 moved off the aircraft rows to the certificate per TAT Form 020, plus the missing PDF export (`ecaf1316` + `948e1515`, `e25bbbe` + `086d00b`). **The PDF has never been rendered**
- `TOR Certificate/` — [[Final TOR Certificate Never Available - Unfiltered Mandatory Templates]] — the unfiltered mandatory-template gate (`b6d866f9`). **Corrected: display-only** — it drives the "Not available yet" banner, not activation
- `History Form/` — [[Sit-In Privileged Override - Genesis Evaluator Gap]] — [[tat-prereq]] `e8883c3`: a privileged user can now fill the sit-in final assessment at any pre-approval stage, so an instructor with no eligible evaluator is no longer unbootstrappable. **A second circular dependency, one edge around from [[TAT-429 Sit-In Eligibility & Move Semantics|TAT-429]]**, and it recurs per new authority / aircraft type / course. Committed, **not browser-verified**; two named follow-ups open
- `History Form/` — [[Additional Training Edit - History Form Row Action]] — [[tat-prereq]]: the additional-training `PATCH` shipped on the backend (`aadfaf4a`) with **no FE caller**; added the Edit row action. Its gate is deliberately *not* Remove's — an `approved` row is editable (with a new certificate) but not removable. **Uncommitted, typecheck-only, never run in a browser**
- [[tat-ws Sign-Out 404]] — [[tat-ws]] `0009831`: the app's only Sign out control was a `<Link>` to `/signin`, a route that never existed — one line caused both the 404 **and** a session that was never cleared. A second, independent `httpOnly`-vs-`js-cookie` trap underneath it. Committed local, **typecheck-only, never run in a browser**
- [[tat-ws Tooltips Unstyled]] — [[tat-ws]] `4c7c67a` + `1894aeb`: `react-tooltip`'s stylesheet was imported nowhere and `tippy.css` only inside two components, which in the App Router scopes it to that one route — so ~38 Tippy instances rendered as bare text. MUI's self-styling `Tooltip` alongside them is why it looked random. A second defect underneath: 2 of ~38 set `interactive`, so no tooltip could be copied from. Committed local, **build-only, never opened in a browser**
- [[Course Details Show Schedule]] — [[tat-ws]] + [[tat-app-ws Backend]]: Show Schedule on Manage Courses → Details **and** the public `/courses/:id` page, in a right-side drawer. The trainee endpoint `/courses/my-courses/:id` 403s for anyone not enrolled or assigned, so staff got `GET /courses/:id/schedule` and everyone (incl. anonymous, by decision) got `GET /courses/public/:id/schedule`, both on the same `getCourseSchedules()` path. Committed local on `dev`, **typecheck-only, never run; needs a backend deploy**
- `History Form/` — [[Mandatory Training Review Log - Nameless Super Admin]] — [[tat-app-ws Backend]]: the boot-seeded Super Admin has no name, so its review entries carried `reviewerName: ""` and Mongoose's `required` rejected every such History Form save, in every environment. Fixed with an email fallback (`60dd2ec3`). Committed local, **typecheck-only, never reproduced**
- [[Compose Exam - Period Chapters, Course Reset & Day Labels]] — [[tat-ws]] + [[tat-app-ws Backend]]: the chapter lookup used the exam period only to find its course, so every period returned the whole course's exam chapters (since `06a07f8d`); two functions named `resetForm` meant clearing the course never reset the form; period labels counted exam days instead of course days. Committed local (`4b8b3e79` + `d8ebb62b`, `de46770` + `5d5a680`), **typecheck-only, never run; needs a backend deploy**

See **Backlog** below for what is real but parked, and [[North Star]] for where focus goes next.

## Backlog

Real, unfinished, but **not being worked right now** — specs awaiting a build, handoffs waiting on another team, standing open-item lists. `status: backlog`, so `Work Dashboard.base` keeps them out of **Active Work**.

_Reclassified from `active` on 2026-08-02 (dormant 2+ weeks, all shipped-but-unverified, none being worked):_

- [[Course Purchase Important-Notes Acknowledgment Gate]] — [[tat-portal]]: checkbox-gated Important-Notes modal before Add-to-Cart/Enroll. Deliberate **UX nudge, not provable consent** — no backend, bypassable by design. **Not browser-verified** (2026-07-15)
- [[TAT-436 Refresher Certificate Publish]] — [[tat-ws]]: SA-only publish for refresher/TOR certs. Backend `cb267288`; FE wired. Pending staging verification
- [[Auto-Populate Instructor Name in Forms]] · [[Profile Signature Sign Button]] · [[TOR Document History - Hide File Key]] — small [[tat-prereq]] slices, all shipped and **none browser-verified**
- [[Assessment Privileged Approval - TM Section While Assigned]] · [[Export Assessment Report - TAT Form 032 PDF]] — [[TAT-423 Assessment Report Rubric|Assessment]] cluster, awaiting verification
- [[History Form Buttons Unified - InlineAction Primitive]] · [[History Form Online Course Deep-Links]] — [[History Form - Training & Validity Records|History Form]] cluster; the deep-links one also blocks on `NEXT_PUBLIC_ONLINE_COURSES_URL` being set per environment

- [[Pending Review Requests - Reviewer Worklist]] — **spec** (2026-07-09): reshape the Pending TORs page from a per-staff list into a per-review-request worklist (each Form 285/32/assessment/history item in a pending-review state as its own row). Not started; needs a new backend aggregate endpoint
- [[TAT-409 Backend Open Items]] — backend bugs/gaps blocking the FE, found in the TAT-410→435 ticket sweep (endpoint-level handoff to the backend team)
- [[Online-Course Exam Timeout - Backend Bug]] — [[tat-portal]] exam-timer fix shipped (`f858fb8`); the remaining work is a backend handoff to score saved answers on timeout instead of forfeiting
- [[TAT Certificates - Open Items]] — standing list of remaining gaps/bugs from the certificate work (frontend, backend, product)
- [[TAT Portal Onboarding]] — getting productive on [[tat-portal]] (the [[TAT Platform]] storefront). Untouched since 2026-06-02 — focus moved to [[tat-prereq]]

## Review Prep

-

## Completed

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

## Reference

- [[TAT Platform]] — system map of all 5 repos and how they connect
- [[Loom]] — **design-stage** multi-agent delivery pipeline (Claude Code control plane → codex-exec coder stations via git worktrees); nothing built yet
- [[Spec Gap Taxonomy & Grilling Agent]] — **design-stage** companion: three kinds of spec gap, each caught at the cheapest stage; how ACs get complete before the pipeline runs
- [[Vault Provenance & Verification Model]] — **design-stage**: why the vault's "verified" is only a timestamp, a proposed code-pointer + provenance schema, and the DONE-vs-NOT-DONE drift asymmetry the DAG depends on
- [[TAT API & Auth Model]] — the shared backend contract
- [[Staff Management Subsystem & TOR Model]] — domain reference for the new TOR/staff subsystem ([[TAT-409 Staff Management Subsystem|TAT-409]])
- [[History Form Audit Log]] — what `StaffTorAuditLog` records for HF actions (events by section, the per-TOR fan-out quirk, write-only gap)
- [[TAT-409 Ticket Groups & Inspection Map]] — business-logic grouping of all 22 TAT-409 tickets + cross-ticket tensions + the group-by-group functionality-inspection tracker (backend↔FE↔Jira). **✅ Inspection COMPLETE (2026-07-05) — all 11 groups.**
- [[TAT-409 Bug & Gap List]] — consolidated output of the inspection: 37 gaps by severity + missing AC + platform + fix. **Update 2026-07-06: 24/37 resolved** — 18 by the backend fix drop (keystone included) + 6 FE gaps shipped to `main`. Shareable `.docx`/`.html` need regenerating before re-sharing.
- Repo notes: [[tat-app-ws Backend]] · [[tat-portal]] · [[tat-website]] · [[tat-ws]] · [[tat-prereq]]

## Decisions Log

| Date | Decision | Status | Link |
|------|----------|--------|------|
| 2026-08-19 | **tat-ws auth tokens stay JS-readable** — dropped the lone `httpOnly` the middleware stamped on the refresh path rather than moving all ~20 cookie writes server-side. That inconsistency, not the posture, was the bug: the cookie became undeletable by `clearAllTokens()`, so logout silently failed for refreshed sessions. Accepted cost: tokens remain XSS-readable. Trap for the fixer — re-adding `httpOnly` to that line reintroduces the bug; the fix is moving every write server-side together | accepted | [[tat-ws Sign-Out 404]] |
| 2026-08-02 | **QM approval does not release the Final TOR Certificate.** TAT-450 AC-45 (*"make the finalized certificate available to the instructor"*) contradicts TAT-455 AC-02/AC-03 (unpublished until a Super Admin publishes). BA ruled **TAT-455 correct, AC-45 wrong**. Spec-only correction — the code already followed TAT-455. **Not yet edited in Jira**, so QA testing TAT-450 literally will file a false defect | accepted | [[TAT-450 AC-45 Superseded by TAT-455 - Certificate Not Auto-Released]] |
| 2026-08-02 | **The Form 32 `requestedRoleCodes` fail-open stays open** until QA flags it, then fix or hand to Dawahreh. The dev-DB clear makes the symptom vanish on fresh data. Declined: closing it *during* the clear, the only zero-cost window — so nothing will prompt a revisit until production data reintroduces the empty case. Trap for the fixer: the gate also covers `TOR_CERTIFICATE` | accepted | [[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]] |
| 2026-07-23 | Multi-agent delivery pipeline is an **assembly line, not an org chart** — parallelism for throughput, not role specialization. Worktree+branch per slice, merge-on-green one at a time, tests from ACs not coder output, handoff via filesystem+diffs. Design-stage; first action is Slice 0 (the resolver) | proposed | [[Loom]] |
| 2026-07-19 | Don't make the 2y mandatory-training period configurable — add **one** SA-only absolute-date override that replaces the computed refresher date at two scopes (per-instructor slot + course fleet stamp). Last-write-wins; a real completion wipes it; SA-only on every platform | accepted | [[Refresher Date Override - SA-Only Absolute-Date Override]] |
| 2026-07-15 | Course-purchase Important-Notes acknowledgment is a frontend **UX nudge, not provable consent** — no backend, deliberately bypassable. Revisit with a per-order acknowledgment only if consent must become provable | accepted | [[Course Purchase Important-Notes Acknowledgment Gate]] |
| 2026-07-14 | Form 32 drops its bespoke 38px document styling for the shared 44px fields — shared-component consistency beats per-document fidelity. Precedent for Form 285 / TAT Form 031 | accepted | [[Form 32 Field Sizing - Shared Components Over Document Fidelity]] |

## Open Questions

- **Refresher-date resolver — 2 unresolved precedence/lifecycle ACs** (block [[Loom|Slice 0]]): a full precedence ordering (calculated/per-instructor/course) and a revert-to-calculated path are genuinely unspecified. Completion-wipes and last-write-wins are decided, just not yet written as ACs. The shipped feature is done + staging-verified; these belong to the *resolver rebuild*, so they now live on [[Loom#Slice 0 open questions (inherited from the archived Override note)]]. Pending product decision

## Archive

-
