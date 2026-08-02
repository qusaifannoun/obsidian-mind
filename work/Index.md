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

Multi-note workstreams inside `active/` are grouped into topic folders — currently `Assessment/`, `Form 32/`, `History Form/`, `Staff Number/`, `TOR Certificate/`. Grouping is the lifecycle axis only: wikilinks resolve by name across folders, so a move never breaks a link, QMD, or the graph. The archive mirrors the grouping when a cluster is archived.

## Incidents

Incident docs live in `work/incidents/`. See `Incidents.base` for overview.

-

## Active Projects

- [[TAT-409 Staff Management Subsystem]] — **new** internal subsystem (instructors + TORs) on an SSO subdomain; 21-ticket epic. Domain: [[Staff Management Subsystem & TOR Model]]. **History Form slice (417/418/419/420/421/429) wired to the real backend + verified across roles, rendered as the single-document TAT Form 031 (2026-06-28).**
  - **[[TAT-409 Delivery Log]] — the per-ticket delivery timeline (28 shipped slices) moved here 2026-08-02** when this index crossed 25KB. New TAT-409 slice entries go there, not here.
- [[TAT-434 Email Verification]] — done, committed `533bf70`, Passed Code Review. **Status conflict (2026-08-02):** the note itself still lists *"Manual check in running dev server, then move toward Code Review"* as an open item, so note and index disagree on whether Code Review happened. Left `active` pending your read
- [[Sequential User Number - Atomic Allocation & Backfill]] — [[tat-app-ws Backend]]: a max-scan `userNumber` allocator produced duplicates **three independent ways** (read-then-write race; the `BaseSchema` soft-delete plugin hiding the highest holder so their number got reused; and lexicographic `String` sort putting `"999"` above `"1000"`, which breaks the sequence permanently at 1000 users). Replaced with an atomic `$inc` counter + a **partial** unique index (plain `unique` can't build — every legacy user is a duplicate `null`), and locked the field write-once (`immutable`, removed from `AdminUserDTO`/`ExtSignUpDTO` where a client could set it and silently stall the counter). Backfill migration **applied to `tat-dev` (2026-07-28)** — 40 users hold `001..040` in signup order, counter at `40`, index in place, verified by re-reading the collection. **`dev` is wired to the staging DB and the cluster holds only one app database, so this *was* the staging migration** — and it landed before the code was pushed. **Still unexercised: the allocator itself has never run** (the backfill was a raw-driver bulk write and bypassed `pre("save")` entirely). **Correction (2026-08-02): all of the above describes the pre-rename `userNumber` field, not the live `staffNumber`** — staging holds an unpadded `3` that none of the three padding writers could have produced, so the backfill has **not** run under the new name and the value's source is unidentified ([[TAT-449 Staff Number Display - Unpadded staffNumber]])

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
