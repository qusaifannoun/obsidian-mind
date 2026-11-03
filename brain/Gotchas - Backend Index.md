---
date: 2026-11-03
description: "One-line index of every tat-app-ws backend trap — schema and data, merging, services and environment, seeding and notifications, TOR and staff management, forms and approval"
tags:
  - brain
  - index
---

# Gotchas - Backend Index

Split out of [[Gotchas]] on 2026-11-03, when the index reached 32KB. Moved verbatim: one line per trap, linking into the domain notes. **Add new entries to the domain note, and its one-liner here.**

## [[Gotchas - Backend Schema & Data]]

_Mongoose document and schema mechanics that bite — enum defaults, index lifecycle, subdocument spreads, soft-delete, and sequence allocation._

- [[Gotchas - Backend Schema & Data#`$lookup` does not preserve the local array's order — a populated list comes back in index order (2026-09-22)|`$lookup` does not preserve the local array's order — a populated list comes back in index order (2026-09-22)]]
- [[Gotchas - Backend Schema & Data#A `required` String rejects `""` — and the seeded Super Admin has no name, so a joined display name is empty (2026-09-15)|A `required` String rejects `""` — and the seeded Super Admin has no name, so a joined display name is empty (2026-09-15)]]
- [[Gotchas - Backend Schema & Data#A one-character typo in a Mongoose `ref` is invisible until populate runs — and only when there is something to populate (2026-09-09)|A one-character typo in a Mongoose `ref` is invisible until populate runs — and only when there is something to populate (2026-09-09)]]
- [[Gotchas - Backend Schema & Data#A guard that reads an unprojected field never fires — and looks identical to one that passes (2026-07-30)|A guard that reads an unprojected field never fires — and looks identical to one that passes (2026-07-30)]]
- [[Gotchas - Backend Schema & Data#A max-scan sequence generator has THREE independent duplicate paths — and the String one only detonates at row 1000 (2026-07-28)|A max-scan sequence generator has THREE independent duplicate paths — and the String one only detonates at row 1000 (2026-07-28)]]
- [[Gotchas - Backend Schema & Data#A soft-delete via `.save()` cannot delete an invalid document — and invalid documents are what you want to delete (2026-07-12)|A soft-delete via `.save()` cannot delete an invalid document — and invalid documents are what you want to delete (2026-07-12)]]
- [[Gotchas - Backend Schema & Data#Mongoose enum + `default: null` rejects null — 5th instance, now CI-checked (2026-07-12)|Mongoose enum + `default: null` rejects null — 5th instance, now CI-checked (2026-07-12)]]
- [[Gotchas - Backend Schema & Data#`autoIndex: true` creates indexes but NEVER drops them — renaming an indexed field leaves a live unique constraint (2026-07-10)|`autoIndex: true` creates indexes but NEVER drops them — renaming an indexed field leaves a live unique constraint (2026-07-10)]]
- [[Gotchas - Backend Schema & Data#Nullable enum + `default: null` crashes Mongoose on create (backend, 2026-07-05, recurring)|Nullable enum + `default: null` crashes Mongoose on create (backend, 2026-07-05, recurring)]]

## [[Gotchas - Backend Merging & Subdocuments]]

_Object spread and merge traps in tat-app-ws — Object.assign clobbering merged data, spread Mongoose subdocuments dropping patches and nested arrays, shared refs hiding diffs._

- [[Gotchas - Backend Merging & Subdocuments#`Object.assign(merged, mergeFn(current, …))` clobbers freshly-merged data with stale `current` (Form 32 PIC save, 2026-07-08)|`Object.assign(merged, mergeFn(current, …))` clobbers freshly-merged data with stale `current` (Form 32 PIC save, 2026-07-08)]]
- [[Gotchas - Backend Merging & Subdocuments#Spreading a Mongoose single-nested subdocument drops the patch (History Form basic-info, 2026-07-09)|Spreading a Mongoose single-nested subdocument drops the patch (History Form basic-info, 2026-07-09)]]
- [[Gotchas - Backend Merging & Subdocuments#Shallow spread shares nested refs — a before/after diff of a mutated object is always empty (Form 32, 2026-07-09)|Shallow spread shares nested refs — a before/after diff of a mutated object is always empty (Form 32, 2026-07-09)]]
- [[Gotchas - Backend Merging & Subdocuments#Spreading a Mongoose subdocument (`{...subdoc}`) drops nested arrays on re-save (2026-07-09)|Spreading a Mongoose subdocument (`{...subdoc}`) drops nested arrays on re-save (2026-07-09)]]

## [[Gotchas - Backend Services & Environment]]

_tat-app-ws service-layer and environment traps — API contract shapes, serializers, queues, schedule mapping, and which database an environment actually points at_

- [[Gotchas - Backend Services & Environment#"The database was cleared" is not a reason to skip a migration — staging still held pre-change records (2026-11-03)|"The database was cleared" is not a reason to skip a migration (2026-11-03)]]
- [[Gotchas - Backend Services & Environment#`S3Service.uploadFile` keeps only the extension of the name you pass — the object is always `<timestamp>-<random>` (2026-11-01)|`S3Service.uploadFile` keeps only the extension of the name you pass — the object is always `<timestamp>-<random>` (2026-11-01)]]
- [[Gotchas - Backend Services & Environment#A year is not 365.25 days of milliseconds — fixed spans made every expiry and due date land 12 hours to a day early (2026-10-28)|A year is not 365.25 days of milliseconds — fixed spans made every expiry and due date land 12 hours to a day early (2026-10-28)]]
- [[Gotchas - Backend Services & Environment#"Is this license used?" checked courses and certificate templates only — deleting a TOR-only license orphaned 28 TORs (2026-10-27)|"Is this license used?" checked courses and certificate templates only — deleting a TOR-only license orphaned 28 TORs (2026-10-27)]]
- [[Gotchas - Backend Services & Environment#A "did it change" check built on a `Set` is blind to reorders — the course schedule survived every phase reorder (2026-09-28)|A "did it change" check built on a `Set` is blind to reorders — the course schedule survived every phase reorder (2026-09-28)]]
- [[Gotchas - Backend Services & Environment#An exam enrollment can exist with no exam submission — the cron enrols against the *schedule*, before the exam is composed (2026-09-22)|An exam enrollment can exist with no exam submission — the cron enrols against the *schedule*, before the exam is composed (2026-09-22)]]
- [[Gotchas - Backend Services & Environment#`cache-manager` v3 `ttl` is SECONDS — a helper returning ms made a 30-day Redis TTL ~82 years (2026-09-20)|`cache-manager` v3 `ttl` is SECONDS — a helper returning ms made a 30-day Redis TTL ~82 years (2026-09-20)]]
- [[Gotchas - Backend Services & Environment#The Redis cache silently falls back to in-process memory — and refresh tokens live in it (2026-09-20)|The Redis cache silently falls back to in-process memory — and refresh tokens live in it (2026-09-20)]]
- [[Gotchas - Backend Services & Environment#`Schedule.createdBy` is whoever scheduled the course, not who created it — and `Course.createdBy` isn't in any course response (2026-09-15)|`Schedule.createdBy` is whoever scheduled the course, not who created it — and `Course.createdBy` isn't in any course response (2026-09-15)]]
- [[Gotchas - Backend Services & Environment#A scheduled exam period has no chapters and no day — its template period is found only by date rank + period number (2026-09-15)|A scheduled exam period has no chapters and no day — its template period is found only by date rank + period number (2026-09-15)]]
- [[Gotchas - Backend Services & Environment#`/courses/my-courses/:id` is participant-only — a staff screen cannot reuse the trainee course/schedule payload (2026-09-13)|`/courses/my-courses/:id` is participant-only — a staff screen cannot reuse the trainee course/schedule payload (2026-09-13)]]
- [[Gotchas - Backend Services & Environment#`evidenceFileKey` without its type/size NULLS both on the stored record (2026-08-23)|`evidenceFileKey` without its type/size NULLS both on the stored record (2026-08-23)]]
- [[Gotchas - Backend Services & Environment#BullMQ silently discards an `add()` whose `jobId` still exists — a retained completed job blocks every later enqueue (2026-08-12)|BullMQ silently discards an `add()` whose `jobId` still exists — a retained completed job blocks every later enqueue (2026-08-12)]]
- [[Gotchas - Backend Services & Environment#A deny-list sanitizer exposes new fields by default; an allow-list DTO hides them — the same field needs opposite work on each path (2026-08-02)|A deny-list sanitizer exposes new fields by default; an allow-list DTO hides them — the same field needs opposite work on each path (2026-08-02)]]
- [[Gotchas - Backend Services & Environment#`dev` and `staging` are the same database in this project — not two environments (2026-07-28)|`dev` and `staging` are the same database in this project — not two environments (2026-07-28)]] — plus the 2026-08-01 corollary: a GET can lazy-create, so browsing seeds rows
- [[Gotchas - Backend Services & Environment#Send the enum's *name*, not the object's `_id` — `courseMethod` is `@IsEnum`, the course carries `{_id, name}` (2026-08-01)|Send the enum's *name*, not the object's `_id` — `courseMethod` is `@IsEnum`, the course carries `{_id, name}` (2026-08-01)]]
- [[Gotchas - Backend Services & Environment#Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)|Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)]]
- [[Gotchas - Backend Services & Environment#A browser MIME type is not a file extension — assessment video upload never worked (2026-07-12)|A browser MIME type is not a file extension — assessment video upload never worked (2026-07-12)]]
- [[Gotchas - Backend Services & Environment#TAT backend user: `role` is an OBJECT, not a string|TAT backend user: `role` is an OBJECT, not a string]]
- [[Gotchas - Backend Services & Environment#Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)|Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)]]

## [[Gotchas - Seeding & Notifications]]

_tat-app-ws boot-time seeding and notification plumbing traps — destructive re-seeds, skip-existing seeders, and the enum and mapping gates a notification must pass_

- [[Gotchas - Seeding & Notifications#Notification URLs baked at seed time + skip-existing seeding = env-var changes silently ignored (2026-07-09)|Notification URLs baked at seed time + skip-existing seeding = env-var changes silently ignored (2026-07-09)]]
- [[Gotchas - Seeding & Notifications|Booting tat-app-ws Backend against a shared DB re-runs ALL seeders — and role-action seeding is DESTRUCTIVE (2026-07-07)]]
- [[Gotchas - Seeding & Notifications#Bootstrap silently SKIPS any notification setting with no mapping entry (2026-07-12)|Bootstrap silently SKIPS any notification setting with no mapping entry (2026-07-12)]]
- [[Gotchas - Seeding & Notifications#The 4th notification edit: `NotificationTemplate.code` is validated against the `SystemActions` enum (2026-07-12)|The 4th notification edit: `NotificationTemplate.code` is validated against the `SystemActions` enum (2026-07-12)]]
- [[Gotchas - Seeding & Notifications#The notification seeder only re-syncs `parameters` — `destination` drift is permanent (2026-07-12)|The notification seeder only re-syncs `parameters` — `destination` drift is permanent (2026-07-12)]]

## [[Gotchas - TOR & Staff Management]]

_TOR activation, sit-in eligibility, staff profile and qualification traps in the staff-management subsystem._

- [[Gotchas - TOR & Staff Management#A TOR owner's role was hard-coded to `IN` — Examiner and Assessor owners could not open or save their own TOR (2026-11-03)|A TOR owner's role was hard-coded to `IN` (2026-11-03)]]
- [[Gotchas - TOR & Staff Management#A role-data placeholder `{}` erases the stored subdocument — the backend `$set`s role objects whole (tat-prereq, 2026-10-25)|A role-data placeholder `{}` erases the stored subdocument — the backend `$set`s role objects whole (tat-prereq, 2026-10-25)]]
- [[Gotchas - TOR & Staff Management#`instructorType` is unbackfilled and now load-bearing in two subsystems — Form 32 A/B and assessor eligibility (2026-08-02)|`instructorType` is unbackfilled and now load-bearing in two subsystems — Form 32 A/B and assessor eligibility (2026-08-02)]]
- [[Gotchas - TOR & Staff Management#Two backfills, one order — deriving from a field nothing has backfilled yet writes a confidently wrong value (2026-08-01)|Two backfills, one order — deriving from a field nothing has backfilled yet writes a confidently wrong value (2026-08-01)]]
- [[Gotchas - TOR & Staff Management#A THIRD copy of the TOR activation rule survived the 2026-07-12 consolidation — it makes the certificate banner permanent (2026-08-12)|A THIRD copy of the TOR activation rule survived the 2026-07-12 consolidation — it makes the certificate banner permanent (2026-08-12)]]
- [[Gotchas - TOR & Staff Management#The TOR "is it active?" rule was written TWICE — the reader lied and the writer was right (2026-07-12)|The TOR "is it active?" rule was written TWICE — the reader lied and the writer was right (2026-07-12)]]
- [[Gotchas - TOR & Staff Management#An "ACTIVE" record with null timestamps means the WRITE path never ran — check the writer, not the renderer (2026-07-12)|An "ACTIVE" record with null timestamps means the WRITE path never ran — check the writer, not the renderer (2026-07-12)]]
- [[Gotchas - TOR & Staff Management#The Assessment Report is NOT a TOR form — one hardcoded "missing" row hid two outstanding assessments (2026-07-12)|The Assessment Report is NOT a TOR form — one hardcoded "missing" row hid two outstanding assessments (2026-07-12)]]
- [[Gotchas - TOR & Staff Management#`refresherDate` is when the LAST refresher happened, not when the next is due (2026-07-12)|`refresherDate` is when the LAST refresher happened, not when the next is due (2026-07-12)]]
- [[Gotchas - TOR & Staff Management#The 35h/2yr badge summed the wrong collection (2026-07-12)|The 35h/2yr badge summed the wrong collection (2026-07-12)]]
- [[Gotchas - TOR & Staff Management#`StaffSitIn.active` means "in progress", NOT "exists" — completing the flow makes the record invisible (2026-07-12)|`StaffSitIn.active` means "in progress", NOT "exists" — completing the flow makes the record invisible (2026-07-12)]]
- [[Gotchas - TOR & Staff Management#tat-prereq staff self-profile — stale mapper, dead per-user record endpoints, and an unmapped-enum crash (2026-07-08)|tat-prereq staff self-profile — stale mapper, dead per-user record endpoints, and an unmapped-enum crash (2026-07-08)]]
- [[Gotchas - TOR & Staff Management#~~`tor.aircraftTypeIds` is never populated — the keystone gap~~ — RESOLVED, and I got this badly wrong (2026-07-05 → corrected 2026-07-12)|~~`tor.aircraftTypeIds` is never populated — the keystone gap~~ — RESOLVED, and I got this badly wrong (2026-07-05 → corrected 2026-07-12)]]
- [[Gotchas - TOR & Staff Management#Sit-in eligibility was circular — the TOR gate made new-instructor onboarding impossible (2026-07-12)|Sit-in eligibility was circular — the TOR gate made new-instructor onboarding impossible (2026-07-12)]]

## [[Gotchas - Forms & Approval]]

_TAT form traps — Form 32/285, History Form, approval and permission rules, and post-approval locking._

- [[Gotchas - Forms & Approval#A UI edit flag computed from the workflow stage alone shows a reviewer's controls to everyone in that stage (TOR certificate, 2026-11-01)|A UI edit flag computed from the workflow stage alone shows a reviewer's controls to everyone in that stage (TOR certificate, 2026-11-01)]]
- [[Gotchas - Forms & Approval#Edit and Delete gates are not the same gate — an `approved` additional-training row is editable but not removable (2026-08-23)|Edit and Delete gates are not the same gate — an `approved` additional-training row is editable but not removable (2026-08-23)]]
- [[Gotchas - Forms & Approval#Two different 403s on one endpoint with no error code — the FE can only tell them apart by message string (2026-08-02)|Two different 403s on one endpoint with no error code — the FE can only tell them apart by message string (2026-08-02)]]
- [[Gotchas - Forms & Approval#"Approved" doesn't lock itself — each tat-prereq form type enforces its own post-approval read-only, so one ships unlocked (2026-07-15)|"Approved" doesn't lock itself — each tat-prereq form type enforces its own post-approval read-only, so one ships unlocked (2026-07-15)]]
- [[Gotchas - Forms & Approval#The same state has two names — backend serializes `PENDING_PIC` as `'pending'`, the FE expects `'pending_pic'` (2026-07-15)|The same state has two names — backend serializes `PENDING_PIC` as `'pending'`, the FE expects `'pending_pic'` (2026-07-15)]]
- [[Gotchas - Forms & Approval#The Approve button approved the form, then asked the backend to approve it again — and showed you the 400 (2026-07-14)|The Approve button approved the form, then asked the backend to approve it again — and showed you the 400 (2026-07-14)]]
- [[Gotchas - Forms & Approval#A form with a schema can still be unvalidated — partial Zod compliance looks clean and isn't (2026-07-14)|A form with a schema can still be unvalidated — partial Zod compliance looks clean and isn't (2026-07-14)]]
- [[Gotchas - Forms & Approval#History Form writes: privileged (SA) vs instructor paths differ — evidence is REQUIRED for the instructor (2026-06-28)|History Form writes: privileged (SA) vs instructor paths differ — evidence is REQUIRED for the instructor (2026-06-28)]]
- [[Gotchas - Forms & Approval#Form 32 assessment Signature is a FILE key, not text (2026-07-05)|Form 32 assessment Signature is a FILE key, not text (2026-07-05)]]
- [[Gotchas - Forms & Approval#~~Form 32 forms are license-scoped, not role-scoped — shows all 4 A-B-C-D~~ — the gate exists and fails open on legacy data (2026-07-05 → corrected 2026-08-01)|~~Form 32 forms are license-scoped, not role-scoped~~ — the role gate exists and fails open on legacy data (2026-07-05 → corrected 2026-08-01)]]
- [[Gotchas - Forms & Approval#History Form: eligibility needs THREE approvals (2026-07-05)|History Form: eligibility needs THREE approvals (2026-07-05)]]
- [[Gotchas - Forms & Approval#History Form spec-vs-impl divergences: training-history approval + FE 2-year window (2026-07-05)|History Form spec-vs-impl divergences: training-history approval + FE 2-year window (2026-07-05)]]
- [[Gotchas - Forms & Approval#Form 32 privileged-editor (AC-415-12) is unimplemented — AD sees buttons that 403 (2026-07-05)|Form 32 privileged-editor (AC-415-12) is unimplemented — AD sees buttons that 403 (2026-07-05)]]
- [[Gotchas - Forms & Approval#Certified-by / approver identity lives only in the audit log — the form wipes field reviews on approval (2026-07-16)|Certified-by / approver identity lives only in the audit log — the form wipes field reviews on approval (2026-07-16)]]
