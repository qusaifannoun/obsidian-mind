---
date: 2026-10-29
description: "Form 32 PDF ticked Yes for any saved option and never marked which one; 32B's footer spilled onto page 2; 32C optional section couldn't be cleared; no Aircraft Category field"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-547
---

# Form 32 PDF Option Marks, 32B Page Spill & Editor Gaps

Four tickets, one form: TAT-547, TAT-546 (PDF), TAT-542 (32C optional section), TAT-545 (Aircraft Category). **Status (as of 2026-10-29):** on `dev`, merged into `prepod`, all four in READY FOR QA. PDF render checked locally; **editor changes not run in a browser**.

## Root causes

- **TAT-547 — the chosen option was never shown.** `renderSectionRow` in `form-32-pdf.util.ts` printed every option label and ticked **Yes** whenever `selectedOptionId` was non-empty, never comparing it to the section's option ids.
- **TAT-546 — the "ID Number" alone on page 2.** The ticket's "ID Number" is the footer `TAT FORM 032-B 01.18 | ISSUE/REV. 01/00`. The Puppeteer wrapper (`generatePdfFromHtml`) adds 20px body padding, and the form added its own body margin on top, pushing 32B's footer onto a page by itself.
- **TAT-542 — 32C optional section.** It still demanded evidence on submit and had no way to be cleared once filled.
- **TAT-545 — no Aircraft Category field.** The backend accepted edits to `aircraftCategory`; the [[tat-prereq]] editor never rendered one.

## Fix

- [[tat-app-ws Backend]] `6eb613fe`: a checkbox per option with the chosen one ticked; Yes only when the saved id matches an existing option; body `margin: 0`; assessment block and footer wrapped in `.form-end { break-inside: avoid }`.
- [[tat-app-ws Backend]] `db332fb2`: `validateSectionsComplete` requires evidence only for non-optional sections.
- [[tat-prereq]] `c1afd4d`: Clear button on optional sections (resets option, notes and evidence); evidence without an option is still an error.
- [[tat-prereq]] `cecff4b`: Aircraft Category select in the editor header, with rejection and item history.

## Evidence

Local Puppeteer render (Chrome) with realistic data:

| Form | Before | After |
|---|---|---|
| form_32a | 1 page | 1 page |
| form_32b | 2 pages (page 2 = footer only) | 1 page |
| form_32c | 1 page | 1 page |
| form_32d | 1 page | 1 page |

A first attempt bolded the chosen option; the extra line wraps kept 32B at 2 pages, so bold was dropped and only the checkbox kept.

## Still open

- [ ] Very long comments can still make 32B two pages (the signature block and footer now move together).
- [ ] 32C/32D instances from before the 2026-08-22 option change may hold option ids that no longer exist — they now print with Yes unticked (inferred, not checked against data).
- [ ] Form 32 `aircraftCategory` is independent of the staff qualification category the TOR certificate reads; changing one does not update the other.
- [ ] Browser-test the Clear button and the Aircraft Category select.

## Related

- [[TAT-562 Copy Form 32 Across TOR Authorities]] — copying a Form 32 to other authorities (2026-11-01)

- [[Export Assessment Report - TAT Form 032 PDF]] · [[Export History Form - TAT Form 031 PDF]] — the same Puppeteer pipeline
- [[Form 32 Approved Lock - Owner Read-Only]] · [[Form 32 Rejection History & Round-Scoped Stamps]] · [[Form 32 Field Sizing - Shared Components Over Document Fidelity]]
- [[Gotchas - Forms & Approval]] · [[Patterns - Backend & Domain]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Index|Work Index]]
