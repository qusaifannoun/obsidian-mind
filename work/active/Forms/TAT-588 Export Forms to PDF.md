---
date: 2026-11-16
description: "Export to PDF converts the same filled Word template with LibreOffice on the backend, because mammoth-to-HTML lost the form layout and Puppeteer needs per-form HTML"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-588
---

# TAT-588 — Export Forms to PDF

**Status (as of 2026-11-16):** Jira **READY FOR QA**. [[tat-app-ws Backend]] `68fa3a7c` and [[tat-ws]] `6a06e79b`, on dev, prepod and main/master. **Conversion run locally only; the Docker image with LibreOffice has not been built, and the button has not been clicked in a browser.**

## Context

Dania's task (Low), under TAT-314 Forms: add Export to PDF next to Export to Word on every form. Qusai scoped it to the six tat-ws forms that have a Word export: Application, Planning Sheet, Training Order Check List, Training Order, Classroom Assessment, Attendance Report. The Staff Management forms in [[tat-prereq]] already export PDF from the backend.

## Why LibreOffice

The six forms exist only as the client's `.docx` templates, filled in the browser ([[Forms - No Field Validation & Export to Word]]). The backend's two PDF tools can't reproduce them:
- **`generatePdfFromHtml` (Puppeteer):** needs each form's layout rewritten as HTML, a second copy that drifts from the Word files.
- **`FileConversionProcessor` (mammoth → HTML → Puppeteer):** rendered `application_for_training.docx` as plain text with no table borders, no header box and no layout.

Qusai chose converting the filled `.docx` with LibreOffice over printing the screen view or a screenshot-to-PDF.

See [[Patterns - Backend & Domain#PDF of a Word-template form — convert the filled .docx with LibreOffice, not mammoth (2026-11-16)|the pattern]].

## What was built

[[tat-app-ws Backend]] `68fa3a7c`:
- `convertDocxToPdf(buffer)` in `libs/helpers/.../pdf-generator.util.ts`, beside `generatePdfFromHtml`. Runs `soffice --headless --convert-to pdf` in a temp dir with its own `-env:UserInstallation` and a 60s timeout; throws `ErrorMessages.failedToConvertFormToPdf`.
- `POST /forms/export-pdf`: SA, Instructor, Admin, QM, TM, Exam Manager; `.docx` mimetype only, 10MB limit; returns the PDF bytes.
- `Dockerfile.api` runner stage adds `libreoffice-writer`, `ttf-liberation` (Arial/Times metrics) and `font-carlito` (Calibri metrics; the templates are mostly Calibri).

[[tat-ws]] `6a06e79b`:
- `formDocx.ts`: `buildFormDocx` shared by `exportFormDocx` and the new `exportFormPdf`, which uploads the filled `.docx` and downloads the PDF.
- `ExportDocxButton` renamed to `FormExportButtons`, showing both buttons on the three pages that had the Word button.

## Evidence

- Template fonts: 222× Calibri, 56× Segoe UI Symbol, 42× Times New Roman, 14× Arial.
- LibreOffice converted all six templates in 9.8s total with borders, logo header and shaded bars intact.
- The real `convertDocxToPdf` on a filled Application: `✓ converts a filled Application form (1864 ms)`, one page, values in place.
- A non-docx buffer: `Received promise resolved instead of rejected`. LibreOffice converts anything, so the endpoint's mimetype check is the only filter.
- Alpine v3.22 community: `libreoffice-writer 25.2.5.2-r0`, `font-carlito`, `/usr/bin/soffice` from `libreoffice-common`.
- Master's `Dockerfile.api` had its own build-stage changes; the merge kept them and added the packages.

## Still open

- [ ] The API image has not been built with LibreOffice; the first staging build confirms the install.
- [ ] Not clicked in a browser on any of the three pages.
- [ ] DevOps: the image grows by a few hundred MB and builds slower.
- [ ] LibreOffice was installed on Qusai's Mac (`brew install --cask libreoffice`) for the local check.

## Related

- [[Forms - No Field Validation & Export to Word]]: the Word export this builds on
- [[Decision - Word Templates for Generated Documents]]
- [[TAT-482 + TAT-483 Enrollment Forms]] · [[TAT-485 Training Order Check List]]
- [[tat-app-ws Backend]] · [[tat-ws]]
- [[Delivery & Scope Management]]
