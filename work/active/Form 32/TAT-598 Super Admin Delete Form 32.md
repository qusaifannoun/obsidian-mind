---
date: 2026-11-19
description: "Super Admin can delete any Form 32A–D from the editor after a confirm dialog that warns approved forms recalculate qualifications and TOR status"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-598
---

# TAT-598 Super Admin Delete Form 32

**Status (as of 2026-11-19):** [[tat-prereq]] `cfe0467` on dev, prepod and main. Jira READY FOR QA. **Not opened in a browser.** The backend (`ced18ab8`) is on [[tat-app-ws Backend]] `dev` only; Delete fails on prepod and master until it is merged.

## Context

Ticket under TAT-491: a Super Admin needs to remove a wrong Form 32. Hamza added `DELETE tors/:torId/form-32/:formKey/:aircraftTypeId`, action `SM_DELETE_FORM_32 = "SMF3X"`, Super Admin only.

## What changed

- `form32.ts` gains `deleteForm32`; `useForm32.ts` gains a `remove` mutation that drops the instance query, invalidates the Form 32 and qualification queries, and returns `remove(opts)`.
- `Form32Editor.tsx`: a destructive **Delete** button for Super Admin on 32A–D in any status, behind the editor's existing local `ConfirmDialog`. For an approved form the dialog warns that qualifications and TOR status are recalculated and copies in other TOR authorities are untouched. On success: `router.replace(backHref)`.

## Evidence

- tat-prereq `tsc` clean, ESLint clean on the changed files.

## Still open

- [ ] Not opened in a browser.
- [ ] Backend on tat-app-ws `dev` only; prepod and master need the merge.
- [ ] Duplicate noticed, not consolidated: `ConfirmDeleteAssessment` (AssessmentFormView) and the local `ConfirmDialog` in `Form32Editor` are the same dialog. Merging needs a new shared component, so it waits for Qusai's approval.

## Related

- [[TAT-562 Copy Form 32 Across TOR Authorities]]: why the warning mentions other authorities' copies
- [[TAT-591 Initial TOR Documents Audit Log]]
- [[Form 32 PDF Option Marks, 32B Page Spill & Editor Gaps]]
- [[Gotchas - Frontend Data & API Contracts#tat-prereq Form 32 cache keys are shaped `[Form32, kind, torId, …]` — a `[Form32, torId]` invalidation silently no-ops (2026-08-01)]]
- [[tat-prereq]] · [[tat-app-ws Backend]]
