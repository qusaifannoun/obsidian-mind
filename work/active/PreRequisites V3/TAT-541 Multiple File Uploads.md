---
date: 2026-11-02
description: "Hamza's backend turned every single fileKey into a file array and dropped the replace routes; all seven tat-prereq upload areas moved to multi-file on one shared StaffFileList"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-541
---

# TAT-541 — Multiple File Uploads

**Status (as of 2026-11-03):** Jira **Needs Fixes** after Ayat's retest. New uploads work on staging; files uploaded before the change are missing because **the staging database was not cleared** (corrected 2026-11-03; the 2026-11-02 "DB cleared, no migration" claim was wrong). Migration written, **not yet run on any real database**.

## Context

The ticket asks for every file field in Staff Management to take several files: view, add, download and remove by permission, with existing files kept. Hamza built the backend in [[tat-app-ws Backend]] `dd098a84` and deployed it to staging on 2026-11-01, together with [[TAT-539 Multiple Nationalities|TAT-539]].

## Root cause of the breakage

- `dd098a84` replaced every single `fileKey` with an array: `files`, `signedFiles`, `videoFiles` and `evidenceFiles` (`StaffFileDTO {id, fileKey, fileType, fileSize, uploadedBy, uploadedByName, uploadedAt}`).
- It also **removed** `PATCH tor-documents/:docType` and `PATCH form-285/signed`. Every upload screen in [[tat-prereq]] broke on staging.
- His service had `addEvidenceFiles` / `removeEvidenceFile` (aircraft qualification) and `addExternalTeachingFiles` / `removeExternalTeachingFile`, **but no routes**. Those files couldn't be removed through the API at all. Same shape as [[Patterns - Architecture & Boundaries|confirm the far side exists before wiring a control to it]].
- The old single-file endpoints (`PATCH …/aircraft-qualifications/:id/evidence`, `POST …/replace`) now **append** one file.

## Evidence

- Staging `/api/docs-json` lists `tor-documents/{docType}/files` and `form-285/signed/files`. `PATCH tor-documents/{docType}` is gone, leaving only DELETE. Checked 2026-11-02.

## Fix

**[[tat-app-ws Backend]] `f6a8c8ed`.** Qusai chose to add the routes himself rather than wait for Hamza.
- `POST`/`DELETE tors/:torId/aircraft-qualifications/:qualificationId/evidence/files[/:fileId]`
- `POST`/`DELETE tors/:torId/external-teaching/:activityId/files[/:fileId]`
- tsc clean; 82 staff-management specs pass.

**[[tat-prereq]] `b2f38d6`.** New shared files, approved by Qusai:
- `components/common/StaffFileList.tsx`: each file with uploader, date, open and remove, plus multi-select "Add files". It has a `renderName` hook so History Form evidence keeps opening through its signed-URL `EvidenceLink`.
- `types/staff-file.ts`: `StaffFile` plus `toStaffFiles`, which normalises `id`/`_id`.

Helpers added to existing modules: `uploadFileKeys` in `api/uploadFileKey.ts`, and `requiredFiles`/`optionalFiles` in `lib/validation.ts`.

| Area | Now |
|---|---|
| TOR documents | Create with several files, add, remove. Required documents keep at least one file. Removing the last External TOR file deletes the document. Version-upload history is gone; the review history stays. |
| Signed Form 285 | The SA uploads several files at Pending SA; once Approved, the SA adds and removes them (at least one). The iframe shows the first file. |
| Form 32 sections | `files[]` lives in form state and saves as the full `fileKeys[]` list. |
| Assessment video | `videoFiles` with add and remove. |
| Aircraft qualification | Files listed with add and remove. Submit needs at least one file already uploaded. The "Replace / renew" form is removed: adding a file to an Approved qualification sends it back to pending, which is how the backend's `applyEvidenceChange` handles it. |
| External teaching | Submit with several files; add and remove while pending or rejected. |
| History Form (mandatory + additional) | Several certificates per record; remove them in the edit panel. |

## Retest 2026-11-03 — legacy files lost

Ayat's retest: multiple upload, add and remove all **work**. Fails:
- QA Sync TAT-412's CV, Passport, Degree, AML and 145 Auth are "Approved" but show "No files uploaded."
- Old History Form certificates return 404 "NoSuchKey" (see [[#Still open]]).
- National ID image takes one file only. That's the [[TAT-539 Multiple Nationalities|TAT-539]] contract (`nationalIdImage` is a single string), so it needs Dania's answer before anything is built.

**Root cause:** `dd098a84` removed the single `fileKey` fields from the schemas. Pre-change records still hold the key in Mongo, but the model no longer reads it, so `files[]` comes back empty. Only the History Form has a read fallback (`listHistoryEvidence`).

**Fix:** [[tat-app-ws Backend]] `99220831` adds `scripts/migrations/2026-11-03-staff-files-from-single-keys.js`. It is a dry run unless `--apply` is passed and reads `MIGRATION_MONGO_URI`. It copies the legacy keys into the arrays:

| Collection | From | To |
|---|---|---|
| `stafftordocuments` | `fileKey`/`fileType`/`fileSize` | `files` |
| `stafftorforms` (Form 285) | `signedFileKey`/`…Type`/`…Size`/`…UploadedBy`/`…UploadedAt` | `signedFiles` |
| `stafftorforms` (Form 32, Mixed `data`) | `data.sections.*.fileKey` | `data.sections.*.files` (string ids/dates) |
| `staffassessments` | `videoFileKey`/`…Type`/`…Size` | `videoFiles` |
| `staffqualifications` | `evidenceFileKey` + `archivedRecords[].evidenceFileKey` | `evidenceFiles` |
| `staffexternalteachingactivities` | `evidenceFileKey` | `evidenceFiles` |

It skips records that already have files and leaves the legacy fields in place. `fileType` falls back to the key's extension, which is what `StaffFileService` stores. Exercised **only against an in-memory stub of the collections**: Docker wasn't running, and the repo `.env` points at a remote Atlas cluster.

**Kept as is:** [[TOR Document History - Hide File Key]] hid file names in the version history, and that history no longer exists, since files now carry their own uploader and date.

## Still open

- [ ] Run one upload, add and remove in each area on staging, plus the Form 32 save, copy and PDF with several files.
- [ ] **Renewing an expired qualification is broken in the backend.** `replaceEvidence` → `addEvidenceFiles` → `assertEvidenceChangeAllowed` rejects `EXPIRED`. Hamza to fix.
- [ ] **Run the migration** on staging (dry run, then `--apply`), and on production **before** the TAT-541 backend reaches it. The staging DB was not cleared (corrected 2026-11-03), so production almost certainly wasn't either (inferred).
- [ ] **History Form 404 "NoSuchKey".** `downloadEvidence` signs any key without checking it exists, and a newly added certificate opens through the same route. So the old S3 objects look missing, not mis-keyed (inferred; staging data not inspected). Someone with AWS access should check one old key.
- [ ] Multiple National ID images: ask Dania. Today it's one image per nationality ([[TAT-539 Multiple Nationalities|TAT-539]]).
- History Form evidence's legacy fallback (`staff-history-evidence.util.ts`) reports `uploadedAt` as the epoch; `StaffFileList` hides dates at or before it.
- [ ] Training-history records have no evidence upload in the UI. Hamza's endpoints exist, if Dania wants it.
- [ ] `f6a8c8ed` reached `origin/dev` through a push I didn't run; the reflog says "update by push" (possibly the IDE).

## Related

- [[TAT-539 Multiple Nationalities]]: same deploy
- [[Staff Profile & TOR Page Simplification]]: where the upload cards live
- [[Staff Management Subsystem & TOR Model]]
