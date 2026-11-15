---
date: 2026-11-09
description: "QA retest failed on three causes: shared inputs never showed errors right, the assessment rubric had no required rule, and Form 32 labels were spans that skipped the asterisk"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-570
---

# TAT-570 — Highlight Required Fields

**Status (as of 2026-11-09):** Jira **Needs Fixes**. The retest fixes are in [[tat-prereq]] `b4ac1b2`, committed locally and **not pushed**. Most of it was checked in the browser on localhost against staging (see [[#Evidence]]); the gaps are listed under [[#Still open]].

## Context

The ticket asks every Staff Management form to mark required fields with `*`, highlight empty ones, and validate the same way everywhere. The first pass (`7e74934` shared inputs, `1c9091a` per form) went to QA on 2026-11-09. Ayat's retest passed Add/Edit Staff and Aircraft Qualifications and failed the History Form, Assign Assessment, the Assessment Report and Form 32.

## Root causes

1. **Shared inputs.** `TextArea`'s error state kept `border-gray-300` and turned red only on focus, so an empty Duties field looked fine. `DatePickerField` printed its error twice: once through MUI's `helperText`, once through `FormFieldWrapper`. See [[Gotchas - Frontend#MUI picker `helperText` inside `FormFieldWrapper` prints the error twice (2026-11-09)|the double-error gotcha]].
2. **Assessment rubric.** Every rubric field was nullable with no required rule. Completeness lived only in the backend's `assertReportComplete`, whose message uses internal keys (`Missing: qualified, understanding…`). The instructor Submit is a separate form, and its own `handleSubmit` stopped on the empty signature section before any rubric check could run.
3. **Form 32.** The header labels ("Date:", "Name:") and section titles are plain spans, so `required` on the input never drew an asterisk (the wrapper only draws it beside a `label`). The buttons were disabled on `!isValid`, with the reason only in a hover tooltip.

## Fix

[[tat-prereq]] `b4ac1b2`:
- **Shared inputs:** `TextArea` gets a red error border; `DatePickerField` drops `helperText`; `RequiredMark` is exported from `FormFieldWrapper` for labels the wrapper doesn't render.
- **Assessment Report:** Qusai chose that **Save rubric validates too**, so a half-filled rubric can no longer be saved. A `useAssessmentReport` hook moved up into `AssessmentFormView`. Missing fields are listed by their on-screen names ("Objective: Pass, Knowledge – Qualified, …"). `AssessmentSignatureForm` gained `validateBefore`, so Submit highlights both forms at once and saves unsaved rubric changes before submitting. Score labels get asterisks.
- **Required rule:** written as `.refine(isFilled, 'Required')` with an explicit `boolean` return. See [[Gotchas - Frontend#A `v !== null` refine narrows `z.infer` under TS 5.5 (2026-11-09)|the type-predicate gotcha]].
- **Assign Assessment:** `z.enum([...], { error: 'Required' })` replaces the raw enum message.
- **Form 32:**
  - Submit and Save & approve are enabled. `checkComplete` triggers validation, highlights each incomplete section with its reason, and shows a live list of what's missing.
  - Asterisks added to the header labels and required section titles.
  - The new-instance fields get labels.

## Evidence

From the localhost check against staging, as SA on the "Tor Instructor Dev" test user. Every check stopped at validation, and nothing was saved.
- **Save rubric, empty:** `red borders: 17`. Message: "Complete the highlighted rubric fields: Objective: Pass, Knowledge – Qualified, …"
- **Submit, both sections empty:**
  - form 0: `red=17`
  - form 1: "Name is required | Date is required | Signature is required | Complete the highlighted rubric fields…"
- **History Form:** an empty Duties field gives `border-error-500` and a single "Required". The sit-in Date shows "Required" once.
- **Form 32:** asterisks on Date, Name, Aircraft Category and the required sections. An empty Name turns red with a single "Name is required".

## Still open

- [ ] Form 32 draft Submit / Save & approve not exercised; only an approved instance was reachable.
- [ ] The Assign Assessment "Required" message couldn't be reproduced, because the type defaults to Initial.
- [ ] Submit with a complete rubric (auto-save, then submit) not exercised.
- [ ] Old seeded assessment `6a32e22b7d5fab715e6668eb` ("A320 Pending (TOR Dev)") crashes `AssessmentSignatureForm` because `instructorSection` is undefined. This is old data; the code involved wasn't part of this fix.
- [ ] Push and move to READY FOR QA.

## Related

- [[TAT-537 Mandatory Profile Completion]] — same PreRequisites V3 batch
- [[Export Assessment Report - TAT Form 032 PDF]] — the same assessment report
- [[Form 32 Field Sizing - Shared Components Over Document Fidelity]] — earlier Form 32 shared-component work
- [[Patterns - Frontend & UI]]
- [[tat-prereq]]
