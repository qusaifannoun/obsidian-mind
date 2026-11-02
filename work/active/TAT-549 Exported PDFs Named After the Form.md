---
date: 2026-11-01
description: "Exported Staff Management PDFs downloaded as '<timestamp>-<random>.pdf' because the S3 upload discards the caller's file name; signed links now carry the form's name"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-549
---

# TAT-549 — Exported PDFs Named After the Form

dania's ticket: exported forms must be named after the form, not a generated name.

**Status (as of 2026-11-01):** [[tat-app-ws Backend]] `f5bf86a7` on `dev`, merged into `prepod` (`25dac6dd`). **Not run against S3 or in a browser.**

## Root cause

`S3Service.uploadFile` builds the key as `bucket/<folder>/<Date.now()>-<random>.<ext>` and uses the passed `fileName` only for its extension, so every generated PDF (Form 32, 285, History Form 031, Assessment 032, TOR Certificate 020) opened as a random name. See [[Gotchas - Backend Services & Environment#`S3Service.uploadFile` keeps only the extension of the name you pass — the object is always `<timestamp>-<random>` (2026-11-01)]].

The [[tat-ws]] Word exports already used the form name (`${source.name}.docx`), so no change there.

## Fix

- `S3Service.getSignedUrl(fileKey, bucket, expiresIn, downloadFileName?)` — optional, sends `ResponseContentDisposition: inline; filename="<ascii>"; filename*=UTF-8''<encoded>`. Inline keeps the current open-in-new-tab behaviour. Shared-helper change approved by Qusai.
- Each service's private `signFileKey` gains the optional name. Names: Form 32 / 285 / TOR certificate use the template title (`Form 32B — Practical Instructor`, `285 Form`, `Final TOR Certificate`); `Assessment Report` and `History Form` are fixed (not TOR templates).

## Evidence

Node check of the header builder: `inline; filename="Form 32B - Practical Instructor.pdf"; filename*=UTF-8''Form%2032B%20%E2%80%94%20Practical%20Instructor.pdf`. staff-management specs 78/78; `tsc` clean for `libs/helpers`, `libs/database`, `apps/api`.

## Still open

- [ ] Download each of the five PDFs on staging and confirm the saved name (browser PDF viewers differ on honouring `inline` filenames).
- [ ] `signFileKey` is duplicated across five staff-management services (Form 32, 285, assessment, History Form, certificate) — consolidation not done, needs Qusai's go-ahead.
- [ ] Move TAT-549 to READY FOR QA.

## Related

- [[Export History Form - TAT Form 031 PDF]] · [[Export Assessment Report - TAT Form 032 PDF]] · [[Final TOR Certificate - Form 020 Alignment & Export]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Index|Work Index]]
