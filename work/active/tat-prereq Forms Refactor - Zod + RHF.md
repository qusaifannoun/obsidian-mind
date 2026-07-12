---
date: 2026-07-12
description: "Refactor plan — AssessmentFormView and Form32Editor bypass the mandatory useZodForm + RHFInput pattern with 33 manual useState calls and duplicated field components"
tags:
  - work-note
status: active
quarter: Q3-2026
team: Frontend
---

# tat-prereq Forms Refactor — Zod + RHF

**Raised by Qusai, 2026-07-12**, reviewing the assessment-form code:

> "it is not following any of my guidelines, for example all forms must be using the zod schema and react hook form, but i noticed manual states and useState in many places, and so many repetitive code all around in the same repo, instead of having component, utilities, function and so on — am i wrong?"

He was not wrong. Both offending files are **mine** (TAT-423 assessment rubric + Form 32 editor).

## The rule

[[tat-prereq]] already has the full infrastructure — see [[Patterns#All tat-prereq forms must use Zod + react-hook-form — I violated this repeatedly (2026-07-12)]]. `src/hooks/use-zod-form.ts` states it outright: *"All forms in this project must use this hook — never `useForm()` directly."*

Most forms comply (`HistoryFormView`, `SitInSection`, `Form285View`, `StaffForm`, all auth pages). Two do not.

## Scope

| Component | `useState` | Zod/RHF | Locally re-declared components |
|---|---|---|---|
| `AssessmentFormView.tsx` | 22 | ❌ none | `TextField`, `DateField`, ~~`TextAreaField`~~, `ScoreSelect`, `SegmentedChoice`, `ReadOnly` |
| `Form32Editor.tsx` | 11 | ❌ none | (to audit) |

`AssessmentFormView` imports exactly **one** thing from the shared library (`ControlledDatePicker`) and hand-rolls the rest — `TextField`/`DateField`/`TextAreaField` shadow `RHFInput/InputField`, `DatePickerField`, `TextArea`. Validation is ad-hoc truthiness (`canApprove = !!name.trim() && !!signedAt && !!signatureKey`) instead of a schema.

## Plan

1. **`AssessmentFormView.tsx`** — four distinct sub-forms, so four schemas:
   - `assignSchema` (assessor + aircraft type)
   - `instructorSectionSchema` (name / date / signature)
   - `approveSchema` (name / date / signature — TM comments field was **removed** 2026-07-12)
   - `reportSchema` (the 14 scored criteria + discipline flags + objective/task/reference + overall rating + Part 147)

   Drive each with `useZodForm`, replace local field components with `RHFInput` equivalents, delete the duplicates. The rubric's score grid is the fiddly part — `ScoreSelect`/`SegmentedChoice` may deserve to become *shared* `RHFInput` components rather than being deleted, since Form 32 likely needs the same controls.

2. **`Form32Editor.tsx`** — same treatment, separately. Audit its local components first.

3. **Verify against staging** — the assessment flow was only just made to work end to end; a refactor must not regress it.

## Root cause (fix this first)

**There is no `CLAUDE.md` / `AGENTS.md` / `.cursorrules` in `tat-prereq`.** The convention exists only in a hook docstring, which is exactly why it got missed twice. Write the conventions into the repo before (or alongside) the refactor, or this recurs.

## Related

- [[TAT-409 Staff Management Subsystem]] · [[TAT-423 Assessment Report Rubric]] · [[tat-prereq]]
- [[Patterns#All tat-prereq forms must use Zod + react-hook-form — I violated this repeatedly (2026-07-12)]]
- [[Code Quality]] — the whole note is a code-quality debt item
