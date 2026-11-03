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

Multi-note workstreams inside `active/` are grouped into topic folders — currently `Assessment/`, `Compose Exam/`, `Form 32/`, `History Form/`, `TOR Certificate/`, each now holding only its backlog and decision notes. Grouping is the lifecycle axis only: wikilinks resolve by name across folders, so a move never breaks a link, QMD, or the graph. The archive mirrors the grouping — `archive/2026/` carries the same five folder names after the 2026-08-04 QA handoff.

## Incidents

Incident docs live in `work/incidents/`. See `Incidents.base` for overview.

-

## Active Projects

_The board was empty from 2026-08-04 (whole board handed to QA and archived) until 2026-08-12._

- `Forms/` — [[TAT-481 Super Admin Forms Browser]] · [[TAT-484 Assigned Forms Inbox]] · [[TAT-482 + TAT-483 Enrollment Forms]] · [[TAT-485 Training Order Check List]] · [[Forms - No Field Validation & Export to Word]] · [[Classroom Assessment Reject - Error Screen After Forwarding to QM]] · [[Super Admin Profile Signature & Stamp]] — the **TAT-314 Forms** epic. 2026-10-18: Reject → QM showed an error screen because the page refetched a form the TM no longer had access to; fixed in [[tat-ws]] by leaving the page, `2b209883` pushed to main/dev/prepod 2026-10-18, **not browser-run**. 2026-10-15: field validation removed from TAT-482/483/485–488 and Export to Word added on every form view (client's own Word layouts, rendered in the browser), synced to all branches; first deploy 404'd (live servers don't serve `public/`), templates bundled into the build in `97fb5e90` — **not yet exported on a deployed server; 485–488 never exported from a real record, never opened in Word**. TAT-485 rebuilt 2026-10-15 to the paper form's per-form Available Yes/No (tat-app-ws `9fe0036e`, tat-ws `178f129`, synced to dev, prepod and main/master 2026-10-15, **not browser-run**; ACs still say per-section). Hamza's backend landed 2026-10-10 (`0001ef0c`); the frontend in [[tat-ws]] was moved onto it 2026-10-11: SA catalog by course name → runs, staff inbox with Training Manager approval, and the trainee two-form enrollment with a drawn signature. **Committed 2026-10-11 as [[tat-ws]] `015a66c` (spike `89e6214` first), pushed to `origin/dev` + `origin/prepod` 2026-10-11. Run end to end on staging: trainee forms, SA catalog, TM approval.** Waiting on the approved forms for declarations and list columns. 2026-10-29 (TAT-540): both enrollment forms auto-fill the trainee's profile signature, [[tat-app-ws Backend]] `0d4dbc69` + [[tat-ws]] `520ece1d`, **not browser-tested**. Pushed together with the backend it depends on (preprod backend already has `0001ef0c`). The `Word Template Documents/` work below is part of this effort

- `Staff Management QA - Oct 2026/` — [[Staff Management QA - Oct 2026]] — Ayat's QA bug batch on staging (TAT-496 to TAT-522): deleted licenses orphaned 28 TORs (repaired on staging), matrix status, session and cache leaks, date-of-birth, history date-time, calendar-year expiries, Basic Info Approved. All on every branch since 2026-10-28. **Nothing browser-tested; backend inert until deployed**
- [[TAT-492 + TAT-493 Staff Editing Moves to Staff Management]] — [[tat-prereq]] `57a3d62` + `3dddd26`, [[tat-ws]] `6c1d78e0` + `5ac5ad66`, pushed to dev/main/prepod 2026-10-25: Staff Management's role pickers offer staff roles only (Admin kept as staff, pending the reporter), and Dashboard Edit on a staff user signs in over SSO and opens Edit Staff, which Admins can now open. **Needs `NEXT_PUBLIC_STAFF_MANAGEMENT_URL` on every tat-ws deployment; only the redirect was clicked through, locally**
- [[TAT-490 Profile Signature for Every Signing Role]] — [[tat-app-ws Backend]] `1c67ef5f`, [[tat-ws]] `77e4ef2a`, [[tat-prereq]] `30aca19`, pushed to every branch 2026-10-25: a required profile signature for SA, Admin, the four managers, Instructor and Trainee, enforced on profile save. **Existing users without one are blocked on their next save once the backend deploys; nothing run beyond tsc and one scripted rule check**
- [[Staff Profile & TOR Page Simplification]] — [[tat-prereq]] `ab155be` (picked onto `prepod` as `efea560`), pushed to all three branches 2026-10-21: the profile is cut down to its header and TORs; document upload, the History Form and every TOR form are cards on the TOR page; assessments use Form 32's aircraft-card pattern; the Form 32 roles hub is gone. Partly browser-checked by me.
- [[TAT-543 Secondary Roles Count Everywhere]] — lookups that find users by role skipped `secondaryRoles`. First built wrongly as "permissions accept every held role" (2026-10-29), reverted 2026-11-01 ([[tat-app-ws Backend]] `756daf58`, [[tat-prereq]] `d5108e2`, merged to prepod); course staffing, assessor and History Form lookups kept. remaining lookups (seed Super Admin, notification approval, tat-ws user lists) fixed 2026-11-01. **History Form course layout undecided; tsc/specs only**
- `Form 32/` — [[Form 32 PDF Option Marks, 32B Page Spill & Editor Gaps]] — TAT-547/546/542/545, [[tat-app-ws Backend]] `6eb613fe` + `db332fb2`, [[tat-prereq]] `c1afd4d` + `cecff4b`, 2026-10-29: the PDF ticked Yes for any saved option and never marked which; 32B's footer spilled onto page 2; 32C optional section clearable and evidence-free; Aircraft Category editable. **PDF render checked locally (32B 2 → 1 page); editor not browser-run**
- [[Staff Management Role Switcher]] — [[tat-prereq]] `8161ec7`, pushed to `origin/dev` + `origin/prepod` 2026-10-15: the UI gated on the **union** of a user's roles while the backend authorizes as the token's single role. Added a tat-ws-style switcher (`POST /auth/switch-role`, no backend change) and, by decision, gated everything by the active role. **Build-only, never run in a browser**; SSO still lands on the primary role
- `Live Exam Failure/` — [[Live Exam Failure]] — one test exam surfaced **three independent bugs of the same shape**: state computed once at an event, never re-derived when its inputs changed. [[Exam Submissions Never Created - Enroll Before Compose]] (fixed `0a2fdb1d`, **confirmed on preprod**), [[Exam Start Split - Period Start vs Exam Start]] (**diagnosed, open — needs a decision**), [[Certificate Eligibility Is a Snapshot]] (fixed `55e4e1c5` for the re-grade path only; three other eligibility inputs and the whole revoke direction still open)
- [[Course Phase Order]] — [[tat-ws]] `e91e2ce` + `a81b387` + `8be5815`, [[tat-app-ws Backend]] `60aa18c3`: phases had no reorder control and their order was rebuilt from the paginated catalog on every edit; separately `$lookup` discarded chapter order inside every phase on every course read; and a saved bulk schedule never reflects a reorder. **All tsc-only, nothing run, and live on master/production.** 2026-09-28: `phasesChanged` compared chapter ids as a `Set`, so a reorder never reset a template-cloned schedule — ordered comparison in [[tat-app-ws Backend]] `d009258a`, pushed to `dev` + `master`, **never run**
- `Session Expiry/` — [[Expired Sessions Undetected Across All TAT Frontends]] — 21 files across [[tat-app-ws Backend]], [[tat-prereq]], [[tat-portal]] and [[tat-ws]]: **no frontend ever decoded a token's `exp`** — every route gate tested cookie *presence*, so an expired session stayed navigable with nothing shown. The 401 refresh that would have caught it **could never succeed** in tat-prereq/tat-portal (refresh token posted in the body; the endpoint's guard reads a Bearer header). Underneath: rotated refresh tokens were never retired, and every Redis TTL was passed in ms to a seconds API (30d → ~82 years). **Uncommitted, and nothing exercised at runtime**
- [[Question Bank Bulk Upload - A Feature That Only Reported Success]] — nine commits across [[tat-app-ws Backend]] and [[tat-ws]]: the parser read the workbook's empty leading sheet and called it success, and six more defects underneath it, each hidden by the one above. Sheet fix and format support verified (0 → 150 rows, six formats); pagination verified live. **Five backend commits unverified, pending a deploy**
- [[TOR Matrix 500 - Leading Space in aircraftTypeIds Ref]] — [[tat-app-ws Backend]] `bad7584f` + [[tat-prereq]] `dcacb9a`, both on `origin/dev`: `StaffTor.aircraftTypeIds` carried `ref: " TrainingTypes"` (leading space, unregistered name), so populate threw `MissingSchemaError` and `/staff-management/tor-matrix` 500'd for any result set holding a TOR. **A missing `isError` branch rendered the crash as "No staff match your search or filter."** Backend fix **unverified — staging still runs the old code**
- `TOR Certificate/` — [[Final TOR Certificate QA Batch - Nov 2026]] — TAT-554/557/558/559/560, [[tat-app-ws Backend]] `23f93743` + `cd40a8e0`, [[tat-prereq]] `6e7e0b9` + `fee1d73`, merged to prepod 2026-11-01: instructor saw QM controls (edit flags read the stage, not the viewer); approval reference never set; PDF hardcoded CARC title + GCAA footer; signatures shown as "On file"; QM can now choose and rename aircraft. **Specs only, not browser-tested**
- `Form 32/` — [[TAT-562 Copy Form 32 Across TOR Authorities]] — [[tat-app-ws Backend]] `59b77b10`, [[tat-prereq]] `7620c16`, 2026-11-01: after saving, the owner can copy a Form 32 as drafts to their other qualifying TORs. **No spec, not browser-tested**
- [[TAT-537 Mandatory Profile Completion]]: Online Courses never showed Complete Profile in QA. Staging runs a pre-TAT-537 portal build (likely failing without `NEXT_PUBLIC_DASHBOARD_URL`), and login sent users to the ungated home. Login fix [[tat-portal]] `0ea2353`, 2026-11-02. **Blocked on the portal deploy env**
- [[TAT-541 Multiple File Uploads]]: Hamza's [[tat-app-ws Backend]] `dd098a84` turned every single `fileKey` into a file array and removed the replace routes, so every [[tat-prereq]] upload broke on staging. Add/remove routes for qualification and external-teaching files added in `f6a8c8ed`; all seven areas moved onto a shared `StaffFileList` in `b2f38d6`, on dev + prepod 2026-11-02. **Needs Fixes (2026-11-03):** legacy files lost because the staging DB was *not* cleared; migration `99220831` written, not yet run. Expired renewals still broken in the backend
- [[TAT-539 Multiple Nationalities]] — Hamza's [[tat-app-ws Backend]] `2ac489b0` (on staging) replaced `nationality`/`nationalId` with a `nationalities` list, and the API rejects the old fields, so every profile save failed. Frontends moved 2026-11-02: [[tat-prereq]] `36992c3`, [[tat-portal]] `0831707`, [[tat-ws]] `14ef2559`, on dev + prepod. **Build/tsc only.** The staging DB was not cleared (corrected 2026-11-03), so pre-change users may lack `nationalities`
- [[TAT-549 Exported PDFs Named After the Form]] — [[tat-app-ws Backend]] `f5bf86a7`, 2026-11-01: S3 upload keeps only the extension, so every PDF was `<timestamp>-<random>.pdf`; signed links now carry the form's name. **Not run against S3**
- `TOR Certificate/` — [[TOR Sync Never Re-Ran - Stale BullMQ Job Id]] — [[tat-app-ws Backend]] `9896faa3`: a fixed BullMQ `jobId` outlived its completed job, so every TOR re-sync for 24h was silently discarded and returned as success. **Why 40 TORs across 18 staff showed 0 active.** Pushed, **unverified** — needs a deploy plus a Redis flush
- `TOR Certificate/` — [[Final TOR Certificate - Form 020 Alignment & Export]] — Course Rating/T1/T2 moved off the aircraft rows to the certificate per TAT Form 020, plus the missing PDF export (`ecaf1316` + `948e1515`, `e25bbbe` + `086d00b`). **The PDF has never been rendered**
- `TOR Certificate/` — [[Final TOR Certificate Never Available - Unfiltered Mandatory Templates]] — the unfiltered mandatory-template gate (`b6d866f9`). **Corrected: display-only** — it drives the "Not available yet" banner, not activation
- `History Form/` — [[Sit-In Privileged Override - Genesis Evaluator Gap]] — [[tat-prereq]] `e8883c3`: a privileged user can now fill the sit-in final assessment at any pre-approval stage, so an instructor with no eligible evaluator is no longer unbootstrappable. **A second circular dependency, one edge around from [[TAT-429 Sit-In Eligibility & Move Semantics|TAT-429]]**, and it recurs per new authority / aircraft type / course. Committed, **not browser-verified**; two named follow-ups open
- `History Form/` — [[Additional Training Edit - History Form Row Action]] — [[tat-prereq]]: the additional-training `PATCH` shipped on the backend (`aadfaf4a`) with **no FE caller**; added the Edit row action. Its gate is deliberately *not* Remove's — an `approved` row is editable (with a new certificate) but not removable. **Uncommitted, typecheck-only, never run in a browser**
- [[tat-ws Sign-Out 404]] — [[tat-ws]] `0009831`: the app's only Sign out control was a `<Link>` to `/signin`, a route that never existed — one line caused both the 404 **and** a session that was never cleared. A second, independent `httpOnly`-vs-`js-cookie` trap underneath it. Committed local, **typecheck-only, never run in a browser**
- [[tat-ws Tooltips Unstyled]] — [[tat-ws]] `4c7c67a` + `1894aeb`: `react-tooltip`'s stylesheet was imported nowhere and `tippy.css` only inside two components, which in the App Router scopes it to that one route — so ~38 Tippy instances rendered as bare text. MUI's self-styling `Tooltip` alongside them is why it looked random. A second defect underneath: 2 of ~38 set `interactive`, so no tooltip could be copied from. Committed local, **build-only, never opened in a browser**
- [[Course Details Show Schedule]] — [[tat-ws]] + [[tat-app-ws Backend]]: Show Schedule on Manage Courses → Details **and** the public `/courses/:id` page, in a right-side drawer. The trainee endpoint `/courses/my-courses/:id` 403s for anyone not enrolled or assigned, so staff got `GET /courses/:id/schedule` and everyone (incl. anonymous, by decision) got `GET /courses/public/:id/schedule`, both on the same `getCourseSchedules()` path. Committed local on `dev`, **typecheck-only, never run; needs a backend deploy**
- `History Form/` — [[Mandatory Training Review Log - Nameless Super Admin]] — [[tat-app-ws Backend]]: the boot-seeded Super Admin has no name, so its review entries carried `reviewerName: ""` and Mongoose's `required` rejected every such History Form save, in every environment. Fixed with an email fallback (`60dd2ec3`). Committed local, **typecheck-only, never reproduced**
- `Compose Exam/` — [[Compose Exam Invigilators - Course Creator Silently Excluded]] — [[tat-app-ws Backend]] `ea388a80`: the only secondary-role invigilator never appeared because a 2025 refactor (`9a6c47e0`, no rationale) excluded the **course creator**, and that user created both courses. Isolated by read-only probes against production; rule removed by decision. Reached `origin/dev` + `origin/master` with no push, **never exercised**
- `Compose Exam/` — [[Compose Exam - Period Chapters, Course Reset & Day Labels]] — [[tat-ws]] + [[tat-app-ws Backend]]: the chapter lookup used the exam period only to find its course, so every period returned the whole course's exam chapters (since `06a07f8d`); two functions named `resetForm` meant clearing the course never reset the form; period labels counted exam days instead of course days. Committed local (`4b8b3e79` + `d8ebb62b`, `de46770` + `5d5a680`), **typecheck-only, never run; needs a backend deploy**
- `Word Template Documents/` — [[Proposal Generator - Word Template Spike]] — [[tat-ws]] `/proposal-test`: a form fills a sample proposal `.docx` in the browser with docxtemplater, proving [[Decision - Word Templates for Generated Documents]] before real forms use it. Node render verified; **committed as `89e6214` (pushed to `origin/dev` + `origin/prepod`), the browser path never run**

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

Completed work by quarter moved verbatim to [[Index Archive — Completed 2026]] (2026-11-03).

## Reference

- [[TAT Platform]] — system map of all 5 repos and how they connect
- [[Loom]] — **design-stage** multi-agent delivery pipeline (Claude Code control plane → codex-exec coder stations via git worktrees); nothing built yet
- [[Spec Gap Taxonomy & Grilling Agent]] — **design-stage** companion: three kinds of spec gap, each caught at the cheapest stage; how ACs get complete before the pipeline runs
- [[Vault Provenance & Verification Model]] — **design-stage**: why the vault's "verified" is only a timestamp, a proposed code-pointer + provenance schema, and the DONE-vs-NOT-DONE drift asymmetry the DAG depends on
- [[TAT API & Auth Model]] — the shared backend contract
- [[Word Template Document Generation]] — how forms produce editable Word documents: `{placeholder}` `.docx` templates filled by docxtemplater, authoring rules, template storage and the upload-conversion trap
- [[Staff Management Subsystem & TOR Model]] — domain reference for the new TOR/staff subsystem ([[TAT-409 Staff Management Subsystem|TAT-409]])
- [[History Form Audit Log]] — what `StaffTorAuditLog` records for HF actions (events by section, the per-TOR fan-out quirk, write-only gap)
- [[TAT-409 Ticket Groups & Inspection Map]] — business-logic grouping of all 22 TAT-409 tickets + cross-ticket tensions + the group-by-group functionality-inspection tracker (backend↔FE↔Jira). **✅ Inspection COMPLETE (2026-07-05) — all 11 groups.**
- [[TAT-409 Bug & Gap List]] — consolidated output of the inspection: 37 gaps by severity + missing AC + platform + fix. **Update 2026-07-06: 24/37 resolved** — 18 by the backend fix drop (keystone included) + 6 FE gaps shipped to `main`. Shareable `.docx`/`.html` need regenerating before re-sharing.
- Repo notes: [[tat-app-ws Backend]] · [[tat-portal]] · [[tat-website]] · [[tat-ws]] · [[tat-prereq]]

## Decisions Log

The decisions table moved verbatim to [[Index - Decisions Log]] (2026-11-03). Add new decisions there.

## Open Questions

- **Refresher-date resolver — 2 unresolved precedence/lifecycle ACs** (block [[Loom|Slice 0]]): a full precedence ordering (calculated/per-instructor/course) and a revert-to-calculated path are genuinely unspecified. Completion-wipes and last-write-wins are decided, just not yet written as ACs. The shipped feature is done + staging-verified; these belong to the *resolver rebuild*, so they now live on [[Loom#Slice 0 open questions (inherited from the archived Override note)]]. Pending product decision

## Archive

-
