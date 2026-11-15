---
date: 2026-11-12
description: "The footer moved to page 2 because the Quill certificate editor strips all CSS, so saved templates printed unstyled; the backend now adds a base A4 style"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-580
---

# TAT-580 — Online Certificate Template Placeholders

**Status (as of 2026-11-12):** Jira **Needs Fixes**. The fix for page 2 is in [[tat-app-ws Backend]] `c32a3b5a`, on dev, prepod and master. **Rendered locally only.** The Without Exam certificate and the brace format are still open.

## Context

Dania's ticket under TAT-377 Online Courses:
- **Placeholders:** add 16 placeholders to both online certificate templates (With Exam and Without Exam).
- **QR preview:** fix the preview, which showed the TAT logo for `{QR_code}`.

**First round:**
- [[tat-app-ws Backend]] `ca4195d5` added the new values: place of birth, logo, course name and duration, end date, and the accountable manager's stamp.
- The preview's QR now uses its own image instead of the logo.
- [[tat-ws]] `78f3a73a` added the new entries to the editor's placeholder list.

Ayat's retest on 2026-11-11 passed all 16 placeholders, the QR and the logo. It failed on:
- **Brace format:** the ticket writes `{name}`, the system uses `{{ name }}`.
- **QR name:** the ticket writes `{QR_code}`, the system uses `{{ qr_code }}`.
- **Without Exam:** finished courses show no certificate button, so that certificate couldn't be checked.
- **PDF footer:** in the generated PDF, the "TAT Form 012 …" footer lands on a second, otherwise empty page.

## Root cause: footer on page 2

- **The editor drops the CSS.** [[tat-ws]]'s `CertificateEditor` is Quill, and Quill can't hold `<style>` or `<head>`. A template saved through "Create Template" is plain `<p>`/`<h1>` HTML.
- **So the PDF prints unstyled.** `generatePdfFromHtml` renders it with the browser's default paragraph margins. With the new logo, stamp, place-of-birth and end-date lines, the footer no longer fits on one page.
- **Ayat's PDF shows exactly that:** no styling, the page `<title>` printed as text, and the footer alone on page 2.
- **The default templates are fine.** They carry their own `<style>` and fit on one page with about 15% to spare.

See [[Gotchas - Frontend#The tat-ws certificate editor is Quill — any template saved through it loses its CSS (2026-11-12)|the gotcha]].

## Fix

Qusai chose the backend option over two others: keeping the raw HTML in the editor, or scaling the shared PDF generator to fit.

[[tat-app-ws Backend]] `c32a3b5a`, `online-course-certificate.service.ts`:
- `renderAndUploadCertificatePdf` now passes the snapshot through `withPdfBaseStyle`.
- When the HTML has no `<style>`, that adds a compact A4 stylesheet: 12mm page margin, 13px text, tight paragraph and heading margins, and images capped at 120px tall.
- Templates with their own `<style>` are unchanged.
- The shared `generatePdfFromHtml` is not touched.

## Evidence

Local Puppeteer render through the real `generatePdfFromHtml`. QR images stood in for the logo, signature and stamp.

| Template | Pages |
|---|---|
| `attendance` default | 1 |
| `course-and-exam` default | 1 |
| Quill-flat copy of Ayat's template (`quill.html`) | 1 → 1 with the style |
| Same plus logo, place of birth, stamp, end date (`heavy.html`) | **2** → **1** with the style |

Online-course specs 36/36 passed; the API `tsc` is clean.

## Still open

- [ ] Not generated on staging. Certificates already issued keep their old PDF until they are regenerated.
- [ ] **Without Exam, no certificate button:** not root-caused.
  - The code path looks right: completing all parts queues the attendance certificate.
  - The button only shows once a *published* certificate exists.
  - Candidate causes (inferred): the course has no `attendanceCertificateHtml`, generation threw, or the certificate is awaiting publish (refresher courses).
  - Reading the staging data through the browser session was blocked by the permission check. Needs the course name, or the course's attendance-template state.
- [ ] Brace format `{name}` vs `{{ name }}` and `{QR_code}` vs `{{ qr_code }}`: waiting for Dania. I think the ticket's single braces are just how she wrote them (unconfirmed).
- [ ] Ayat's course "Demo 4" shows a blank Duration, so the course probably has no duration set (unconfirmed).
- [ ] Move back to READY FOR QA (waiting for Qusai's go-ahead).

## Related

- [[TAT Certificates - Open Items]]: the online certificate backlog
- [[TAT-581 Saved Exam Questions Not Shown on Reopen]]: the same Online Courses batch, 2026-11-12
- [[Patterns - Backend & Domain#Server-generated form PDFs — reuse the shared Puppeteer pipeline; aggregate cross-service data in the controller]]
- [[tat-app-ws Backend]] · [[tat-ws]]
- [[Debugging & Root Cause Analysis]]
