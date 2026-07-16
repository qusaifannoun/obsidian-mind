---
date: 2026-07-16
description: "Full-stack landscape PDF export of the Assessment Report (TAT Form 032) — the 14-criterion rubric grid + embedded S3 signatures + TAT logo, reusing the shared Puppeteer pipeline"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Export Assessment Report — TAT Form 032 PDF

The Assessment Report ([[TAT-423 Assessment Report Rubric|TAT Form 032]]) had no export — no PDF/print anywhere. Added a full-stack **server-generated landscape PDF** reproducing the official form, using the same pipeline as the [[Export History Form - TAT Form 031 PDF|History Form export]].

## What shipped

**Backend ([[tat-app-ws Backend]]):**
- `assessment-report-032-pdf.util.ts` — `buildAssessmentReportPdfHtml` reproduces the form: **TAT logo** (inlined as a data-URI from the FE `logo.svg` → `tat-logo.data.ts`), identity row, Initial/Continuation/Extension boxes, Aircraft/Task/Reference, Objective Pass, and the **14-criterion rubric** across Knowledge (5) / Skills (6) / Competence (3) — each criterion with 1–4 checkboxes reflecting the stored score, plus the **DSL/INSTR/EXAM/ASS** discipline columns aligned across all three sections (per-section colgroups). Overall rating, Part 147, assessor + TM sign-off, `TAT FORM 032.08.25` footer. Matches the form's exact spellings ("ASSESSEMENT", "COMUNCATION", "REFFERENCE"). Dates `DD-MON-YYYY`.
- `StaffAssessmentService.downloadPdf(actor, torId, assessmentId)` — loads via `getById`, resolves aircraft + assessed names, and **embeds each signature from S3 as a base64 image** (assessor = `instructorSection`, TM = `tmSection` — confirmed from the save/approve guards, despite the "instructor" naming). → Puppeteer → S3 → signed URL. Added `S3Service`/`ConfigService` injection + `signFileKey`/`signatureDataUri` helpers.
- Route `GET tors/:torId/assessments/:assessmentId/download`, gated `@Action(SM_VIEW_STAFF)`. New `AssessmentDownloadResponseDTO`.
- **`generatePdfFromHtml` gained an optional `landscape` flag** (default false — all existing callers stay portrait). The assessment renders **A4 landscape** so the wide rubric spreads across the page like the reference.

**Frontend ([[tat-prereq]]):** `downloadAssessmentPdf` fetcher + `actions.downloadPdf` + an **Export PDF** button on each assessment card. Also fixed the card's Delete button (stray `bg-error-600` → `text-error-600`).

## Evidence

- Backend `tsc` on `helpers` + `dtos` + `database` + `api` all exit 0; FE `tsc` + `eslint` clean.
- **Template verified:** rendered a real landscape PDF from the exact builder + Puppeteer with the reference doc's data — faithful match (logo, rubric grid, checkboxes reflecting scores, aligned disciplines, ratings, sign-offs, footer).
- Committed `dev`: [[tat-app-ws Backend|tat-app-ws]] `40d58dd0` + [[tat-prereq]] `a0f1949`.

## Still open

- **Not run against a live DB record or browser.** Signatures render **blank** in the local test (no S3) — they embed from `signatureKey` at runtime. Signature **MIME is inferred from the key extension** (defaults to PNG); a typeless/other-format key may not render.
- Puppeteer needs Chromium on the server.

## Related

- [[Export History Form - TAT Form 031 PDF]] — sibling feature; shared `generatePdfFromHtml` pipeline (which this feature extended with `landscape`)
- [[TAT-423 Assessment Report Rubric]] — the rubric + assessor model this renders
- [[History Form Buttons Unified - InlineAction Primitive]] — same file family (assessment/history forms)
- [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]]
- [[tat-prereq]] · [[tat-app-ws Backend]]
