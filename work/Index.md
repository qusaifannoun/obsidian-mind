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
  - [[Staff Creation Blocked - qualificationTrackingMode Enum Bug]] — backend `enum + default:null` on `User.qualificationTrackingMode` blocked ALL staff creation on staging; fixed + pushed (`dc8f3a4f`), awaiting deploy re-verify (2026-07-07)
  - [[Form 32 Rejection History & Round-Scoped Stamps]] — **plan** (grill-me, 2026-07-09): clear-on-submit so field rejections stop accumulating across rounds + a full per-item review timeline (unified `reviewHistory` event log: rejected/edited/uploaded/approved)
  - [[History Form - Training & Validity Records]] — **shipped `dev` (2026-07-12)**: Updated Training & Validity was a hard-coded 5-course catalog. Instructors can now add **external training records** (same approval cycle), and completing **any non-mandatory online course auto-adds an approved record** — that feature turned out to be a `return` statement in an already-wired hook. Expiry derived, no cron. Also **fixed a 35h-badge bug I shipped that morning** (0/35h for everyone) by moving the rule server-side, and the aircraft **refresher date** (was showing when the last one happened, not when the next is due)
  - [[TAT-423 Assessment Report Rubric]] — **shipped `dev` (2026-07-09)**: the Assessment Report (TAT FORM 032) captured only the sign/approve shell; added the full graded rubric (14 scored criteria + discipline flags, objective/task/reference, overall rating, Part 147, comments) across backend + FE. Also fixed the CARC-only `assessment_report` template → now per-license for all authorities. **Assessor model landed (2026-07-12)**: the form had **no assessor concept** — the instructor being assessed could grade and sign themselves. Added `assessorUserId` (optional, to break the same active-TOR circular dependency as TAT-429), an eligible-assessor endpoint, the missing header row (TAT ID was rendering the raw Mongo ObjectId), `/my-assessments`, shared draw/upload signatures, and split *filling* from *approving* (QM/AD submit to TM; only SA/TM approve). Fixed: assessment create 500'd on every attempt (`enum + default:null`), and video upload had **never** worked (MIME vs extension)
  - [[TOR Activation - Details Endpoint Lied About ACTIVE]] — **(2026-07-12)**: "creation/expiry dates don't show once the TOR is Active" was never a display bug — the TOR was **never activated**. The activation rule is written **twice**: 6 gates in the sync processor (which persists status + stamps the dates), only **3** in the details endpoint (it never checked documents, qualifications or assessments). So a TOR reads Active with null dates forever, and the Pending-TORs worklist under-reports. Extracted `staff-tor-activation.util` so both callers share one rule; also expanded the Assessment Report into **one row per aircraft type** — it was a single hardcoded "missing" row hiding 2 outstanding assessments. `57bb7a1c` / `ea43544`
  - [[Auto-Populate Instructor Name in Forms]] — **(2026-07-16)**: pre-fill the instructor's name (assessment/history/285/32) from `useStaffDetail` only when empty & editable (async `useEffect` setValue). FE-only. `c11b5c7`
  - [[Profile Signature Sign Button]] — **(2026-07-16)**: a shared "Sign" button fills any signature field from the user's saved role `signatureImage` (already on `/auth/me`). FE-only; **instructors excluded** (no role signature). `c86dd5e`
  - [[History Form Online Course Deep-Links]] — **(2026-07-16)**: deep-link related online courses to [[tat-portal]] (refresher → `/courses/{id}`, online records → `/my-courses/{id}`). Gated on a new `NEXT_PUBLIC_ONLINE_COURSES_URL` (**unset locally → no link**). `474e8d8e` + prereq
  - [[Assessment Privileged Approval - TM Section While Assigned]] — **(2026-07-16)**: privileged users see/operate the Assessment TM section (+comments) while `assigned`; backend `approve()` relaxed so they can approve from any pre-approval state — **bypassing the assessor-submit step** (deliberate; guardrail TBD). `12647d0d`/`71cf8b8`
  - [[TOR Document History - Hide File Key]] — **(2026-07-16)**: hid the raw S3 filename from document history logs (display-only); unbounded history + orphaned S3 remain a backend follow-up. `c5396b0`
  - [[Export Assessment Report - TAT Form 032 PDF]] — **(2026-07-16)**: full-stack **landscape** server PDF of the Assessment Report — the 14-criterion rubric grid + DSL/INSTR/EXAM/ASS disciplines + TAT logo + **S3 signatures embedded as base64**. Reuses the Form 32/285 Puppeteer pipeline (added an optional `landscape` flag to `generatePdfFromHtml`). Committed `dev` `40d58dd0`/`a0f1949`; template-verified via rendered PDF, not live-verified
  - [[Export History Form - TAT Form 031 PDF]] — **(2026-07-16)**: full-stack server PDF of TAT Form 031, same pipeline. `downloadPdf` aggregates six sources across four services via the compose-in-controller idiom (avoids circular DI). "Certified by" pulled from the audit log (no form-level `approvedBy`). Committed `dev` `1541a3f8`/`4d3a82b`; template-verified, not live-verified
  - [[History Form Buttons Unified - InlineAction Primitive]] — **(2026-07-16)**: 14 hand-rolled inline buttons with 2–3 styles per action → one reusable `InlineAction` (tone-based) primitive; also renamed the confusing "Record" button to "Add Certificate". Committed `dev` `4d3a82b`. Same mess still in Form32Editor / AssignedSitIns / AssignedAssessments views
  - [[Aircraft Category Filter - TOR Matrix]] — **(2026-07-16)**: the TOR Matrix B1/B2 filter couldn't be FE-only — `aircraftCategory` lives only on `StaffQualification`, not the TOR row / matrix response / query DTO, so a lone FE select would've been a dead control. Shipped full-stack: new enum query param + `qualificationModel.distinct("userId", { aircraftCategory })` intersect (mirroring the aircraft-type filter) + the FE select reusing `CATEGORY_OPTIONS`. tsc/eslint clean both repos; not browser-verified yet
  - [[Staff Management - Unreachable Backend Endpoints]] — **sweep (2026-07-12)**: after four bugs in one week turned out to be working backends with no FE affordance, diffed all **108 staff-management routes** against every frontend. 4 have no caller — headline: **nobody can pause a TOR** (`manual-status`), and **an instructor's requested roles are frozen at creation** (`requested-roles`, which silently governs Form 32 scoping *and* assignment eligibility). Fixed the 35h badge summing the wrong collection (`5159a07`). **+1 (2026-07-14): the Form 32 approve endpoint is reachable by URL but dead by role algebra** — every reviewer role is also an auto-approver, so their save already approved and the approve call always throws. Exactly the class the URL sweep said it was blind to. Needs a product decision (delete the route, or fix the role sets), *not* a guess
  - [[Form 32 Approved Lock - Owner Read-Only]] — **(2026-07-15)**: an Approved Form 32 stayed editable by the owning instructor (live `<Link>` + owner-only `canReopen`), so they could reopen/resubmit an approved form. Locked on `isSelf && !canReview && Approved` — approved rows non-clickable, editor redirects the locked owner, reviewers keep full access; `PIC_ROLES` moved to shared `types/form32.ts`. Not browser-verified yet
  - [[Aircraft Qualification Approval Invisible - Status String Mismatch]] — **(2026-07-15)**: backend `PENDING_PIC` serializes as `"pending"` but the FE expects `"pending_pic"`, so the reviewing PIC saw no Approve/Reject controls and a blank badge on instructor-submitted qualifications. Normalized `"pending" → "pending_pic"` at the fetcher boundary (`qualifications.ts`, both StaffQualification + ExternalTeachingActivity). Not browser-verified yet
  - [[TAT-429 Sit-In Eligibility & Move Semantics]] — **shipped `dev` + verified on staging (2026-07-12)**: the Add Instructor list applied TAT-424's Active-TOR rule to the sit-in path, which is **circular** (TOR ACTIVE ← HF approved ← sit-in ← addCourseInstructor ← TOR ACTIVE) — a new instructor could never be onboarded and every aircraft-type course returned an empty list. Dropped the TOR gate (TAT-429 AC-03 implemented as written for the first time) + sit-in move semantics. **Then ran the cycle end to end for the first time ever**, which surfaced 4 latent bugs behind the old deadlock + built the Instructors tab. 7 commits. Open: confirm the TOR actually activates; the move path is still unexercised
  - [[Stale Sit-In Index & Orphaned Instructor Enrollments]] — **staging-blocking (2026-07-10)**: a stale `unique` non-sparse `enrollmentId_1` index left by the TAT-429 field rename broke *every* sit-in insert since 2026-06-26; the missing rollback in `addCourseInstructor` left orphan enrollments that silently hide instructors from the eligible list. Migration + service fix written; migration run blocked on Atlas IP allowlist
  - [[tat-prereq Forms Refactor - Zod + RHF]] — **swept 2026-07-14** (`992d812`…`9cb30a4`): the mandatory `useZodForm` + `RHFInput` rule lived only in a hook docstring — **unreachable, so six files broke it**, not the two originally spotted. Wrote the rule into a repo `CLAUDE.md` *first*, then swept all six; `HistoryFormView` 1584→1128 lines, `ControlledDatePicker` deleted as dead by construction. **Still active: five of the six forms are unexercised on shared `dev`** (only Form 32 driven in a browser), highest risk being the assessment rubric → sign → submit → TM approve path
  - [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]] — tat-prereq navbar bell + real-time flashing dot (Socket.IO) + notification detail page; backend repoints prereq notifications to the staff-management host (`STAFF_MANAGEMENT_URL`) + non-destructive migration (2026-07-08)
- [[Course Purchase Important-Notes Acknowledgment Gate]] — [[tat-portal]]: course-detail purchase now opens an Important-Notes acknowledgment modal (checkbox-gated confirm) before Add-to-Cart/Enroll. Deliberate **UX nudge, not provable consent** — no backend, bypassable by design. Shared `ImportantNotes` component so section + modal can't drift. tsc/eslint clean; **not browser-verified yet** (2026-07-15)
- [[TAT-436 Refresher Certificate Publish]] — [[tat-ws]]: SA-only publish for refresher/TOR certs (hidden from trainee until published). Backend shipped (`cb267288`); FE wired — Unpublished indicator + Publish button on Manage Trainees. Pending staging verification
- [[TAT-434 Email Verification]] — done, committed `533bf70`, Passed Code Review

## Backlog

Real, unfinished, but **not being worked right now** — specs awaiting a build, handoffs waiting on another team, standing open-item lists. `status: backlog`, so `Work Dashboard.base` keeps them out of **Active Work**.

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
| 2026-07-23 | Multi-agent delivery pipeline is an **assembly line, not an org chart** — parallelism for throughput, not role specialization. Worktree+branch per slice, merge-on-green one at a time, tests from ACs not coder output, handoff via filesystem+diffs. Design-stage; first action is Slice 0 (the resolver) | proposed | [[Loom]] |
| 2026-07-19 | Don't make the 2y mandatory-training period configurable — add **one** SA-only absolute-date override that replaces the computed refresher date at two scopes (per-instructor slot + course fleet stamp). Last-write-wins; a real completion wipes it; SA-only on every platform | accepted | [[Refresher Date Override - SA-Only Absolute-Date Override]] |
| 2026-07-15 | Course-purchase Important-Notes acknowledgment is a frontend **UX nudge, not provable consent** — no backend, deliberately bypassable. Revisit with a per-order acknowledgment only if consent must become provable | accepted | [[Course Purchase Important-Notes Acknowledgment Gate]] |
| 2026-07-14 | Form 32 drops its bespoke 38px document styling for the shared 44px fields — shared-component consistency beats per-document fidelity. Precedent for Form 285 / TAT Form 031 | accepted | [[Form 32 Field Sizing - Shared Components Over Document Fidelity]] |

## Open Questions

- **Refresher-date resolver — 2 unresolved precedence/lifecycle ACs** (block [[Loom|Slice 0]]): a full precedence ordering (calculated/per-instructor/course) and a revert-to-calculated path are genuinely unspecified. Completion-wipes and last-write-wins are decided, just not yet written as ACs. The shipped feature is done + staging-verified; these belong to the *resolver rebuild*, so they now live on [[Loom#Slice 0 open questions (inherited from the archived Override note)]]. Pending product decision

## Archive

-
