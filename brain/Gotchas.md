---
date: 2026-06-02
description: "Index of things that have bitten before and will bite again — one line per trap, linking into the six domain notes"
tags:
  - brain
  - index
---

# Gotchas

Things that have bitten before and will bite again.

Split into domain notes on 2026-07-28, when the single file reached 96KB. Substance lives in the domain notes — **add new entries there, not here.** This page keeps one line per trap.

## [[Gotchas - Backend Schema & Data]]

_Mongoose document and schema mechanics that bite — enum defaults, index lifecycle, subdocument spreads, soft-delete, and sequence allocation._

- [[Gotchas - Backend Schema & Data#A guard that reads an unprojected field never fires — and looks identical to one that passes (2026-07-30)|A guard that reads an unprojected field never fires — and looks identical to one that passes (2026-07-30)]]
- [[Gotchas - Backend Schema & Data#A max-scan sequence generator has THREE independent duplicate paths — and the String one only detonates at row 1000 (2026-07-28)|A max-scan sequence generator has THREE independent duplicate paths — and the String one only detonates at row 1000 (2026-07-28)]]
- [[Gotchas - Backend Schema & Data#A soft-delete via `.save()` cannot delete an invalid document — and invalid documents are what you want to delete (2026-07-12)|A soft-delete via `.save()` cannot delete an invalid document — and invalid documents are what you want to delete (2026-07-12)]]
- [[Gotchas - Backend Schema & Data#Mongoose enum + `default: null` rejects null — 5th instance, now CI-checked (2026-07-12)|Mongoose enum + `default: null` rejects null — 5th instance, now CI-checked (2026-07-12)]]
- [[Gotchas - Backend Schema & Data#`autoIndex: true` creates indexes but NEVER drops them — renaming an indexed field leaves a live unique constraint (2026-07-10)|`autoIndex: true` creates indexes but NEVER drops them — renaming an indexed field leaves a live unique constraint (2026-07-10)]]
- [[Gotchas - Backend Schema & Data#`Object.assign(merged, mergeFn(current, …))` clobbers freshly-merged data with stale `current` (Form 32 PIC save, 2026-07-08)|`Object.assign(merged, mergeFn(current, …))` clobbers freshly-merged data with stale `current` (Form 32 PIC save, 2026-07-08)]]
- [[Gotchas - Backend Schema & Data#Spreading a Mongoose single-nested subdocument drops the patch (History Form basic-info, 2026-07-09)|Spreading a Mongoose single-nested subdocument drops the patch (History Form basic-info, 2026-07-09)]]
- [[Gotchas - Backend Schema & Data#Shallow spread shares nested refs — a before/after diff of a mutated object is always empty (Form 32, 2026-07-09)|Shallow spread shares nested refs — a before/after diff of a mutated object is always empty (Form 32, 2026-07-09)]]
- [[Gotchas - Backend Schema & Data#Nullable enum + `default: null` crashes Mongoose on create (backend, 2026-07-05, recurring)|Nullable enum + `default: null` crashes Mongoose on create (backend, 2026-07-05, recurring)]]
- [[Gotchas - Backend Schema & Data#Spreading a Mongoose subdocument (`{...subdoc}`) drops nested arrays on re-save (2026-07-09)|Spreading a Mongoose subdocument (`{...subdoc}`) drops nested arrays on re-save (2026-07-09)]]

## [[Gotchas - Backend Services & Environment]]

_tat-app-ws service-layer and environment traps — seeding, notification plumbing, API contract shapes, and which database an environment actually points at._

- [[Gotchas - Backend Services & Environment#A deny-list sanitizer exposes new fields by default; an allow-list DTO hides them — the same field needs opposite work on each path (2026-08-02)|A deny-list sanitizer exposes new fields by default; an allow-list DTO hides them — the same field needs opposite work on each path (2026-08-02)]]
- [[Gotchas - Backend Services & Environment#`dev` and `staging` are the same database in this project — not two environments (2026-07-28)|`dev` and `staging` are the same database in this project — not two environments (2026-07-28)]] — plus the 2026-08-01 corollary: a GET can lazy-create, so browsing seeds rows
- [[Gotchas - Backend Services & Environment#Send the enum's *name*, not the object's `_id` — `courseMethod` is `@IsEnum`, the course carries `{_id, name}` (2026-08-01)|Send the enum's *name*, not the object's `_id` — `courseMethod` is `@IsEnum`, the course carries `{_id, name}` (2026-08-01)]]
- [[Gotchas - Backend Services & Environment#Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)|Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)]]
- [[Gotchas - Backend Services & Environment#A browser MIME type is not a file extension — assessment video upload never worked (2026-07-12)|A browser MIME type is not a file extension — assessment video upload never worked (2026-07-12)]]
- [[Gotchas - Backend Services & Environment#Notification URLs baked at seed time + skip-existing seeding = env-var changes silently ignored (2026-07-09)|Notification URLs baked at seed time + skip-existing seeding = env-var changes silently ignored (2026-07-09)]]
- [[Gotchas - Backend Services & Environment|Booting tat-app-ws Backend against a shared DB re-runs ALL seeders — and role-action seeding is DESTRUCTIVE (2026-07-07)]]
- [[Gotchas - Backend Services & Environment#TAT backend user: `role` is an OBJECT, not a string|TAT backend user: `role` is an OBJECT, not a string]]
- [[Gotchas - Backend Services & Environment#Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)|Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)]]
- [[Gotchas - Backend Services & Environment#Bootstrap silently SKIPS any notification setting with no mapping entry (2026-07-12)|Bootstrap silently SKIPS any notification setting with no mapping entry (2026-07-12)]]
- [[Gotchas - Backend Services & Environment#The 4th notification edit: `NotificationTemplate.code` is validated against the `SystemActions` enum (2026-07-12)|The 4th notification edit: `NotificationTemplate.code` is validated against the `SystemActions` enum (2026-07-12)]]
- [[Gotchas - Backend Services & Environment#The notification seeder only re-syncs `parameters` — `destination` drift is permanent (2026-07-12)|The notification seeder only re-syncs `parameters` — `destination` drift is permanent (2026-07-12)]]

## [[Gotchas - TOR & Staff Management]]

_TOR activation, sit-in eligibility, staff profile and qualification traps in the staff-management subsystem._

- [[Gotchas - TOR & Staff Management#`instructorType` is unbackfilled and now load-bearing in two subsystems — Form 32 A/B and assessor eligibility (2026-08-02)|`instructorType` is unbackfilled and now load-bearing in two subsystems — Form 32 A/B and assessor eligibility (2026-08-02)]]
- [[Gotchas - TOR & Staff Management#Two backfills, one order — deriving from a field nothing has backfilled yet writes a confidently wrong value (2026-08-01)|Two backfills, one order — deriving from a field nothing has backfilled yet writes a confidently wrong value (2026-08-01)]]
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

## [[Gotchas - Frontend]]

_Component and framework traps across tat-prereq, tat-portal and tat-ws — Next.js, MUI, React Query, uploads and layout._

- [[Gotchas - Frontend#Bulk Edit reads a different query-config source — patching one leaves the page looking wired and unfiltered (tat-ws, 2026-08-01)|Bulk Edit reads a different query-config source — patching one leaves the page looking wired and unfiltered (tat-ws, 2026-08-01)]]
- [[Gotchas - Frontend#tat-prereq Form 32 cache keys are shaped `[Form32, kind, torId, …]` — a `[Form32, torId]` invalidation silently no-ops (2026-08-01)|tat-prereq Form 32 cache keys are shaped `[Form32, kind, torId, …]` — a `[Form32, torId]` invalidation silently no-ops (2026-08-01)]]
- [[Gotchas - Frontend#A hidden form section still submits its defaults — one shared form, and self-edit silently wipes admin-only data (2026-07-30)|A hidden form section still submits its defaults — one shared form, and self-edit silently wipes admin-only data (2026-07-30)]]
- [[Gotchas - Frontend#Card-morph slider: keep the OUTGOING card full-screen until the new one covers it|Card-morph slider: keep the OUTGOING card full-screen until the new one covers it]]
- [[Gotchas - Frontend#`router.refresh()` does NOT invalidate the React Query cache (tat-portal)|`router.refresh()` does NOT invalidate the React Query cache (tat-portal)]]
- [[Gotchas - Frontend#App-shell layout: pin to the viewport, scroll only `<main>`|App-shell layout: pin to the viewport, scroll only `<main>`]]
- [[Gotchas - Frontend#tat-ws cert hooks: `usePatchOnlineCourseCertificate` is NOT for issued certs|tat-ws cert hooks: `usePatchOnlineCourseCertificate` is NOT for issued certs]]
- [[Gotchas - Frontend#Online-course certs ARE trainee-reachable (storefront)|Online-course certs ARE trainee-reachable (storefront)]]
- [[Gotchas - Frontend#tat-portal: derive pass/fail from backend `passed`, not a local `examPassed` hardcoded to `>= 70`|tat-portal: derive pass/fail from backend `passed`, not a local `examPassed` hardcoded to `>= 70`]]
- [[Gotchas - Frontend#Two certificate-template preview endpoints — wrong one leaves tokens unsubstituted|Two certificate-template preview endpoints — wrong one leaves tokens unsubstituted]]
- [[Gotchas - Frontend|Next.js 16 scaffolding traps (hit on tat-prereq 2026-06-04)]]
- [[Gotchas - Frontend#Next 16's react-hooks rules false-positive on react-hook-form primitives|Next 16's react-hooks rules false-positive on react-hook-form primitives]]
- [[Gotchas - Frontend#tat-ws modals: use MUI `<Dialog>`, not hand-rolled `fixed inset-0`|tat-ws modals: use MUI `<Dialog>`, not hand-rolled `fixed inset-0`]]
- [[Gotchas - Frontend#FE hook built against a speculative endpoint the backend never shipped|FE hook built against a speculative endpoint the backend never shipped]]
- [[Gotchas - Frontend#tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original|tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original]]
- [[Gotchas - Frontend#tat-ws online-course trainees endpoint: no server search + fake pagination|tat-ws online-course trainees endpoint: no server search + fake pagination]]
- [[Gotchas - Frontend#tat-prereq `uploadFileKey` must send a `FileUploadCategory` — else `bucket/undefined/` (2026-07-05)|tat-prereq `uploadFileKey` must send a `FileUploadCategory` — else `bucket/undefined/` (2026-07-05)]]
- [[Gotchas - Frontend#MUI X Date Pickers v7 use `.MuiPickers*` classes, not `.MuiOutlinedInput-*` (2026-07-05)|MUI X Date Pickers v7 use `.MuiPickers*` classes, not `.MuiOutlinedInput-*` (2026-07-05)]]

## [[Gotchas - Tooling & Method]]

_Toolchain and working-method traps — vault tooling, lint and IDE behaviour, and recurring reasoning failures._

- [[Gotchas - Tooling & Method#A commit's ticket label doesn't mean it contains that ticket's code (2026-08-02)|A commit's ticket label doesn't mean it contains that ticket's code (2026-08-02)]]
- [[Gotchas - Tooling & Method#A commit reached `origin/dev` with no `git push` run — "local only" is not a safe claim here (2026-08-02)|A commit reached `origin/dev` with no `git push` run — "local only" is not a safe claim here (2026-08-02)]]
- [[Gotchas - Tooling & Method#The browser extension's network capture under-reports cross-origin calls — read `performance.getEntriesByType('resource')` instead (2026-08-01)|The browser extension's network capture under-reports cross-origin calls — read `performance.getEntriesByType('resource')` instead (2026-08-01)]]
- [[Gotchas - Tooling & Method#A git worktree has no `node_modules`, so a delegated agent writes code it cannot verify (2026-07-30)|A git worktree has no `node_modules`, so a delegated agent writes code it cannot verify (2026-07-30)]]
- [[Gotchas - Tooling & Method#Installing the qmd Claude Code plugin shadows the vault's scoped MCP server and silently serves an EMPTY index (2026-07-28)|Installing the qmd Claude Code plugin shadows the vault's scoped MCP server and silently serves an EMPTY index (2026-07-28)]]
- [[Gotchas - Tooling & Method#"Verified" is a timestamp, not proof the fact still holds — and a consistency gate rejects corrections as readily as errors (2026-07-23)|"Verified" is a timestamp, not proof the fact still holds — and a consistency gate rejects corrections as readily as errors (2026-07-23)]]
- [[Gotchas - Tooling & Method#Scoping debt from the files you happen to be looking at under-counts it (2026-07-14)|Scoping debt from the files you happen to be looking at under-counts it (2026-07-14)]]
- [[Gotchas - Tooling & Method#An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)|An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)]]
- [[Gotchas - Tooling & Method#Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)|Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)]]
- [[Gotchas - Tooling & Method#tat-ws — `nx lint` crashed on asset imports (FIXED 2026-06-02)|tat-ws — `nx lint` crashed on asset imports (FIXED 2026-06-02)]]
- [[Gotchas - Tooling & Method#IDE TS-server flags "implicit any" where batch `tsc` passes — annotate React-Query callbacks (2026-07-06)|IDE TS-server flags "implicit any" where batch `tsc` passes — annotate React-Query callbacks (2026-07-06)]]
- [[Gotchas - Tooling & Method#Sharing an HTML deliverable in Teams: JS is stripped + UTF-8 mojibakes → prefer a `.docx` (2026-07-05)|Sharing an HTML deliverable in Teams: JS is stripped + UTF-8 mojibakes → prefer a `.docx` (2026-07-05)]]
