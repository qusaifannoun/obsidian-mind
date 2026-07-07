---
date: 2026-07-05
description: "Consolidated bug & gap list for the TAT-409 Staff Management epic — every gap found in the group-by-group inspection, by severity, with the missing AC and the platform (repo) not implementing it"
tags:
  - reference
  - project/tat
  - moc
aliases:
  - TAT-409 Bugs
  - Staff Management Gap List
---

# TAT-409 — Bug & Gap List

Consolidated output of the full [[TAT-409 Ticket Groups & Inspection Map|group-by-group inspection]] (all 22 tickets, backend `tat-app-ws` + FE `tat-prereq`/`tat-ws` vs the real Jira ACs). Each row = one gap, its **missing AC**, the **platform** (repo) responsible, and a one-line evidence/fix note. Domain model: [[Staff Management Subsystem & TOR Model]]. Durable traps: [[Gotchas]].

> [!tip] Shareable versions (kept in sync with this note)
> - **`TAT-409 Bug & Gap List.docx`** — Word document. Best for sharing in **Microsoft Teams / email** (renders reliably, clickable Jira links, no encoding issues).
> - **`TAT-409 Bug & Gap List.html`** — interactive dashboard (severity/platform filters + search). Best opened in a **browser** or as a claude.ai artifact. Rows are static so they still show where scripts are blocked.
> - This markdown note is the canonical text source.

**Platforms:** `tat-app-ws` = NestJS backend · `tat-prereq` = Staff Management FE · `tat-ws` = admin/enrollment FE · `tat-portal` = student storefront.

> [!danger] The one defect to fix first — `tor.aircraftTypeIds` is never populated
> A single unowned field cascades into **three** broken flows. Nothing ever writes `tor.aircraftTypeIds` (created `[]`, no code path adds to it). That breaks: (1) **aircraft-qual creation** — `assertAircraftOnTor` requires it → 422 create 400s; (2) **assignment eligibility** — an aircraftType requirement filters on it → pickers render **empty**; (3) **aircraft-qual validation** short-circuits to `true`. Combined with the sibling **missing "requested role" concept**, it also breaks Form 32 role-scoping and role-type eligibility. Resolve ownership (TAT-410 link-at-creation vs TAT-422 derive-from-approved-quals) before anything else.

> [!success] Resolution status — 2026-07-06 (24 of 37 resolved)
> This list was the input to a fix cycle; most of it is now **closed**. The tables below are the *original* findings — treat them as historical, read against this status:
> - **Backend shipped fixes (commit `db6922f7` "TAT Gap list" + TAT-422/423/424/429): 18 fixed** — verified by re-inspection. **Every Critical (C1–C4) and every High (H1–H8)** that was backend-owned, plus M4, M10, L1, L2, L7, L8, L12. The keystone C1 (`tor.aircraftTypeIds`) is now populated on qual approval; the backend adopted the same role→form mapping the FE gate uses.
> - **Frontend fixed + shipped to `main` ([[tat-prereq]], 2026-07-06): 6** — M5 cert preview/download, M6 request-course-online, M8 Manage Staff pagination, M9 server-side role gating, M12 AD privileged editor, H8 2-year hours window. Verified live in-browser.
> - **Still open (~13):** product-decision items needing BA sign-off (M1 training-history approval, M2 instructor selection, M3 assessment type, L6, L9, L10); FE polish (C5 SSO initiator, M11 upload categories, L4/L5 matrix, L11). See [[TAT-409 Ticket Groups & Inspection Map]] for per-group post-fix verdicts.
> The `.html`/`.docx` exports still show all 37 as open — **regenerate them before re-sharing**.

## 🔴 Critical — blocks a core flow end-to-end

| # | Missing AC | Gap | Platform | Evidence / fix |
|---|---|---|---|---|
| C1 | 410 AC-02 · 422 AC-01 · 424 AC-10/12 | **`tor.aircraftTypeIds` never populated** (keystone). Created `[]`, nothing writes it. | `tat-app-ws` | `staff-tor.service.ts` writes `[]` only. Fix: populate/derive from approved quals (or link at TOR creation). Owner decision pending. |
| C2 | 422 AC-01 | **Nullable-enum crash blocks all aircraft-qual creates.** `StaffQualification.refresherUpdateSource` has `enum + default:null` → Mongoose validation error on every create. | `tat-app-ws` | `staff-qualification.schema.ts:123-128`. Fix `enum:[...Object.values(Enum), null]` (applied-then-reverted; still OPEN). |
| C3 | 422 AC-01 | **`assertAircraftOnTor` self-blocks create** — requires the aircraft type to already be on the TOR, which 422 itself is meant to add (depends on C1). | `tat-app-ws` | `staff-aircraft-qualification.service.ts:107,1066`. Drop/relax the guard + derive `aircraftTypeIds`. |
| C4 | 424 AC-10/12 | **Eligibility pickers render EMPTY when a course requires an aircraft type** (`aircraftTypeIds:<id>` filter over an always-empty field → `distinct`→`[]`); qual validation short-circuits to `true`. | `tat-app-ws` | `staff-tor-assignment-eligibility.util.ts:60-62`; `staff-aircraft-qualification.service.ts:669-671`. Fixed by C1. |
| C5 | 430 AC-01, AC-09 | **SSO is not real end-to-end.** tat-prereq has a working `/sso` receiver + standalone login, but **no dashboard-side initiator** issues the bridge token and cookies are subdomain-local (no shared session / logout propagation). | `tat-portal`/`tat-ws` (initiator) + `tat-prereq` | No outbound "Staff Management" link/token issuer in dashboards; `token-cookies.ts:8-11` no `domain=`. Today only standalone login works. |

## 🟠 High — AC violated, feature partially broken

| # | Missing AC | Gap | Platform | Evidence / fix |
|---|---|---|---|---|
| H1 | 415 AC-02/03 · 424 AC-11 | **No "requested role" concept.** Form 32 templates/TOR have no role field → all 4 A/B/C/D show; role-type eligibility unenforced (context has no role dimension). | `tat-app-ws` (+ `tat-prereq`) | `staff-tor-form-template.schema.ts` (no role); `...eligibility.util.ts:5-8`. FE mitigated by the role gate added this session (cosmetic only). |
| H2 | 415 AC-12 | **Privileged-editor auto-approve unimplemented.** `isPrivilegedForm32Editor` is dead code; reviewer save only merges the assessment block; **AD** gets FE Save/Approve/Reject buttons that all 403 backend-side. | `tat-app-ws` + `tat-prereq` | `staff-tor-form-32.service.ts` (helper unused); FE `PIC_ROLES` includes AD. |
| H3 | 417 AC-08/09/35 | **Aircraft quals inside the History Form have no write path.** Embedded array is read-only count; audit event `HISTORY_FORM_AIRCRAFT_QUALIFICATION_CREATED` is dead. | `tat-app-ws` + `tat-prereq` | `staff-history-form.service.ts:473`; FE shows count-only placeholder. (TOR-scoped `StaffQualification`/422 is a different collection.) |
| H4 | 421 AC-01/02 | **Sit-in evaluator is arbitrary, not the teaching instructor.** `pickEvaluatorUserId(traineeUserId)` takes no `courseId`; returns first active instructor ≠ trainee. | `tat-app-ws` | `staff-sit-in.service.ts:343-364`. |
| H5 | 432 AC-08 | **"Suspend Qualification Tracking" is a no-op.** Mode persisted on deactivate but no refresher/expiry cron reads `qualificationTrackingMode`. | `tat-app-ws` | `staff-management.service.ts:515`; zero cron references. |
| H6 | 432 AC-09 | **Deactivated staff may still be assignment-eligible.** No `staffStatus:INACTIVE` filter in eligibility/enrollment/selection. | `tat-app-ws` | No filter found in `staff-tor-assignment-eligibility.*` / enrollment. Confirm + add. |
| H7 | 424 AC-01/07 | **`getEligibleCourseInstructors` bypasses TOR** — filters role+history-form+sit-in only, so TOR-ineligible instructors show in the list and are only blocked at save (violates "hidden entirely"). | `tat-app-ws` | `enrollment.service.ts:1213-1284`. |
| H8 | 418 AC-07/08 | **FE total training duration not windowed to 2 years** — sums all dated items; backend correctly windows. FE total can overcount vs eligibility. | `tat-prereq` | `HistoryFormView.tsx:259-261` (BE `mandatory-training.util.ts` is correct). |

## 🟡 Medium — noticeable gap / spec divergence

| # | Missing AC | Gap | Platform | Evidence / fix |
|---|---|---|---|---|
| M1 | 417 AC-17 | **Training-history records require approval** (created `PENDING_APPROVAL` + approve/reject + required cert), contradicting "must NOT require approval." | `tat-app-ws` + `tat-prereq` | `staff-history-training-record.service.ts:104-120`. (One entity conflates 417's list with 418's external course.) |
| M2 | 423 AC-03 | **No instructor selection on assessment** — hard-bound to `tor.userId`; no `instructorId` in DTO or FE picker. | `tat-app-ws` + `tat-prereq` | `staff-assessment.service.ts:104`; DTO `:1987`. |
| M3 | 423 AC-21 | **Assessment type (Initial/Continuation/Extension) chosen by the assigner (SA/TM), not the instructor.** | `tat-app-ws` + `tat-prereq` | `AssessmentFormView.tsx:128`; DTO `assessmentType`. |
| M4 | 422 AC-19 | **No list/GET endpoint for external-teaching activities** — PIC can approve/reject by id but can't discover pending ones. | `tat-app-ws` | Controller has POST/approve/reject only; no list method. |
| M5 | 419 (review) | **Reviewer can't preview/download certificates** — evidence keys are write-only, never mapped into view types; no history-form evidence download endpoint. | `tat-prereq` | `fetchers.ts` omit `evidenceFileKey` on read. |
| M6 | 418 AC-25/26 | **No FE surface for "request course online"** (and 419 online-request review) — backend fully built, FE absent. | `tat-prereq` | Only a passive `refresherOnlineCourseId` note in `HistoryFormView`. |
| M7 | 429 AC-03 | **Eligible-instructor list under-checks "already assigned"** (only excludes INSTRUCTOR enrollment rows, not the schedule subsystem); **instructors with no history form silently dropped.** | `tat-app-ws` | `enrollment.service.ts:1264-1274`. |
| M8 | 431 (Manage Staff) | **No pagination** — fetcher hardcodes `limit:1000, skip:0`, no UI pager. Won't scale. | `tat-prereq` | `fetchers.ts:63`. |
| M9 | 430 AC-07/08 | **Role enforcement is client-side only** — `proxy.ts` gates on token presence, not role; route guards run in React. Relies on backend for real authz. | `tat-prereq` | `proxy.ts:25`. |
| M10 | 421 AC-09 | **Sit-in `assessorSignatureKey` not validated as an evidence file** (plain string; Form 32 validates). | `tat-app-ws` | `staff-sit-in.service.ts:256-267`. |
| M11 | 412/413 uploads · history | **Staff-history uploads reuse TOR `FileUploadCategory`** (`TorDocuments`/`TorAssessment`) — wrong S3 folder; no history-form category exists. | `tat-prereq` | `useForms.ts:172,227,303`; `uploadFileKey.ts` has TOR categories only. |
| M12 | 415 AC-12 (FE) | **AD mis-bucketed** in the History Form FE — falls into the instructor branch (no FE privileged auto-approve path). | `tat-prereq` | `HistoryFormView.tsx` reviewer set excludes AD. |

## 🟢 Low — polish / doc / config

| # | Missing AC | Gap | Platform | Evidence / fix |
|---|---|---|---|---|
| L1 | 419 AC-13 | Online-request approval notification omits **Approval Date/Time** (Course Name only). | `tat-app-ws` | `notifications.service.ts:3871-3874`. |
| L2 | 418 AC-16 | "Auto-remove expired" is **read-time exclusion only** — no delete, no TOR re-sync when an external duration ages out. | `tat-app-ws` | `mandatory-training.util.ts:71-79`; cron covers mandatory dueDate only. |
| L3 | 420 (content) | The 7 protected refresher courses are seeded + undeletable but **content is placeholder** (`hasExam:false`); seeding **skips on a fresh DB with zero users**. | `tat-app-ws` | `mandatory-refresher-online-course.service.ts:66-84,32-39`. Content-population task. |
| L4 | 433 AC-11 | Matrix auto-update is **refetch-only** (react-query remount/refocus) — no realtime/event-driven invalidation. | `tat-prereq` | `useTor.ts:17-21`. |
| L5 | 433 AC-04 | Matrix cards show **blank email/phone** (card DTO omits them); search works server-side. | `tat-prereq` (+ backend DTO) | `adapters.ts:66-67`. |
| L6 | 423 AC-11 | Assessment submit → `PENDING_TM_REVIEW`, a status the ACs don't name (they only define Draft/Approved). | `tat-app-ws` | Naming divergence only. |
| L7 | 421 AC-14 · 423 AC-20 | **Audit coverage gaps** — notification dispatch + TOR-recalc + the History-Form APPROVED transition aren't all persisted as audit entries. | `tat-app-ws` | `staff-sit-in.service.ts`, `staff-assessment.service.ts`. |
| L8 | 421 AC-04 · 429 | Sit-in notification carries **no direct link** to the sit-in form (only trainee name + course title). | `tat-app-ws` | `notifications.service.ts:3986-3990`. |
| L9 | 411 AC-03 | No manual QM **suspend/revoke** of a TOR (status is auto-computed only). | `tat-app-ws` | From group-1 inspection. |
| L10 | 415 AC-10 | Form 32: evidence `fileHistory` archived, but **no whole-form versioning** for "replaced Form 32 records." | `tat-app-ws` | Minor. |
| L11 | various | **Stale "dummy" comments** on real-wired FE pages (assessment, tor-matrix, pending-tors, tor-detail, history-form) — misleading for reviewers. | `tat-prereq` | Doc-only. |
| L12 | many notify ACs | **Notification recipients are DB-config-driven** (NotificationSetting `destination`) — mechanism is wired, but exact role sets (e.g. EM for 422 AC-06) depend on seed data; verify seeds per environment. | `tat-app-ws` | Verify seeds. |

## Notes on what's actually solid (not gaps)

- **Notifications ARE wired** platform-wide via a `NotificationInterceptor` (switch on `@Action` → `notifyX`) — contradicts earlier "prepared but not sent" assumptions for 2a/2b; recipients are config-driven (L12).
- **Privileged auto-approve is genuinely implemented** for aircraft quals (422) and sit-in/assessment (421/423) — only Form 32's (H2) is dead.
- **Online-refresher auto-completion is real** (418) — `syncRefresherCourseCompletions` + exam-service integration, not a stub (only content is placeholder, L3).
- **Protected courses (420)** are properly seeded + undeletable; **Manage Staff/Profile/Matrix/Pending (431-435)** are real-endpoint wired; **cert visibility (436)** is done.

## Related
- [[TAT-409 Ticket Groups & Inspection Map]] — the per-group tracker with full findings
- [[TAT-409 Staff Management Subsystem]] — the epic tracker · [[Staff Management Subsystem & TOR Model]] — domain reference
- [[Gotchas]] — the durable traps (keystone gap, nullable-enum, Form 32 privileged-editor, History Form eligibility chain)
- [[TAT-409 Backend Open Items]] · [[TAT-436 Refresher Certificate Publish]]
