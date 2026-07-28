---
date: 2026-07-12
description: "The Zod+RHF rule lived only in a hook docstring, so it was unreachable — six files broke it, not the two we knew. All six swept and the rule written into a repo CLAUDE.md; five of the six forms are still unexercised on shared dev"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
---

# tat-prereq Forms Refactor — Zod + RHF

**Raised by Qusai, 2026-07-12**, reviewing the assessment-form code:

> "it is not following any of my guidelines, for example all forms must be using the zod schema and react hook form, but i noticed manual states and useState in many places, and so many repetitive code all around in the same repo, instead of having component, utilities, function and so on — am i wrong?"

He was not wrong. Both offending files are **mine** (TAT-423 assessment rubric + Form 32 editor).

## The rule

[[tat-prereq]] already has the full infrastructure — see [[Patterns#All tat-prereq forms must use Zod + react-hook-form — I violated this repeatedly (2026-07-12)]]. `src/hooks/use-zod-form.ts` states it outright: *"All forms in this project must use this hook — never `useForm()` directly."*

> [!warning] This initial scope was wrong — kept to show how the estimate moved
> I believed only two files broke the rule, and that `HistoryFormView` / `SitInSection` complied. The repo-wide grep found **six** violators, including both of those. See [[Gotchas - Forms & Approval#A form with a schema can still be unvalidated — partial Zod compliance looks clean and isn't (2026-07-14)]].

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

## Root cause (fixed first)

**There was no `CLAUDE.md` / `AGENTS.md` / `.cursorrules` in `tat-prereq`.** The convention existed only in a hook docstring, which is exactly why it got missed twice. The repo now has a `CLAUDE.md` stating it.

## The root cause was reachability, not discipline

The rule was written in exactly **one** place — a docstring inside `src/hooks/use-zod-form.ts`:

```
/**
 * Typed form hook that enforces Zod schema validation via react-hook-form.
 * All forms in this project must use this hook — never useForm() directly.
```

Nowhere an agent or a new dev reads at startup. No `CLAUDE.md`, no `AGENTS.md`, no `.cursorrules`. **The rule was unreachable, not ignored** — which is why it got broken repeatedly by someone (me) who would have followed it.

## Outcome — swept 2026-07-14

A repo-wide grep found **six** violators, not the two originally named. Two of them (`Form32InstanceList`, `SitInSection`) were on nobody's list:

| `useState` | `useZodForm` | File |
|---|---|---|
| 15 | 4 | `forms/HistoryFormView.tsx` |
| 9 | 0 | `tor/TorQualifications.tsx` |
| 3 | 2 | `forms/SitInSection.tsx` |
| 2 | 0 | `forms/Form32InstanceList.tsx` |

The audit also **corrected the framing on the two known ones**: `Form32Editor`'s "11 `useState`" was really 5 form-state buckets, the rest legitimate dialog/UI state. The original count overstated it.

`TorQualifications` was the worst: **8 distinct forms crammed into 18 `useState`**, with buckets *shared across mutually-exclusive flows* — one `file` served both the submit-evidence and renew paths; one `reason` served two different rejection actions.

| Commit | What |
|---|---|
| `992d812` | `AssessmentFormView` — 4 schemas; `InstructorForm`/`ApproveForm` were near-identical and collapsed into one. Promoted `ScoreField`, `SegmentedField`, `SignatureField` into `ui/RHFInput`. **Added `CLAUDE.md` + `AGENTS.md`** |
| `2615d91` | `Form32Editor` + `RejectReasonDialog` — schema built at runtime from the backend-supplied `schema.sections`. **Two validity rules, not one**: submit needs the complete document (`formState.isValid`); approve needs only the assessment block (a separate schema parse on `getValues()`) |
| `85b970a` | `TorQualifications` split into 6 components; `RejectReasonForm` extracted (the reason input was hand-rolled **twice in one file**) |
| `2770a81` | `HistoryFormView`, 1584 → **1128 lines** |
| `9cb30a4` | `Form32InstanceList` + `SitInSection` — the sit-in's real rule (*"fill at least one role date"*) was buried in a boolean chain; now a schema `refine` |
| `50ae353` | `ControlledDatePicker` deleted — **dead by construction**: its own docstring said it existed "for local-state forms that were on a raw `<input type=date>`", exactly what the refactor abolished |
| `063e0df` | Follow-up: `onApprove` calls save **only**. Form 32's Approve was firing `save` *then* `approve` — but every role that sees that button auto-approves on save, so the second call hit an already-`APPROVED` stage and threw a 400. **The approval had succeeded; the UI showed the error anyway.** Pre-existing — the refactor carried the two-call sequence over verbatim, exposing it rather than causing it. See [[Gotchas - Forms & Approval#The Approve button approved the form, then asked the backend to approve it again — and showed you the 400 (2026-07-14)]] |

Killed repo-wide along the way: `readError` (3 private copies → `formatApiError`), hand-rolled `primaryBtn`/`secondaryBtn`/`dangerBtn` (the shadcn `Button` already existed), a duplicated `SectionHeader`, and 2 of 4 `formatDate` copies.

## Still open

- [ ] **Five of the six forms are unexercised.** Only Form 32 has been driven in a browser (reject → correct → approve, 2026-07-14, worked — and surfaced the `063e0df` double-approve bug). The other five are typecheck + lint + `next build` clean **and nothing more**. Highest remaining risk: the **assessment rubric → sign → submit → TM approve** path, whose submit gating moved from a truthiness chain to a Zod schema.
- [ ] **The `063e0df` double-approve fix is itself unexercised.** It typechecks, lints and builds; nobody has re-run reject → correct → approve to confirm the 400 is gone *and* the approval still lands. Verifying the fix means checking **both**, since the bug's whole nature was a success that reported failure.
- [ ] **These are on shared `dev`.** Whoever next touches the five untested forms is the one who finds what's left.
- [ ] Visible UI changes not yet eyeballed — assessment labels now use the app-standard style rather than bespoke ones; file pickers moved to the shared `FileInput`.
- [ ] `formatDate` still has **two** private copies — `src/components/tor/TorAssessments.tsx:25` and `src/components/tor/PendingTorsView.tsx:18`. The shared one is `src/lib/date.ts`. Root cause: `date.ts` was **not in the repo's reuse table**, so nothing pointed anyone at it — now added.
- [x] **Filter toolbars stay on raw inputs — confirmed and written into the rule (2026-07-14).** `StaffToolbar`, `PendingTorsView`, `TorMatrixToolbar` narrow a list that's already on screen: they submit nothing, validate nothing, have no error state. A Zod schema on a search box is cargo-culting the rule, not following it. The `tat-prereq` CLAUDE.md now says so explicitly, so a future sweep won't "fix" them.

## Rulebook drift caught 2026-07-14

The `tat-prereq` CLAUDE.md this refactor created was **already stale**: it still advertised `ControlledDatePicker` in the available-fields list, a component `50ae353` deleted in the same sweep. Fixed, and the three promoted fields (`ScoreField`, `SegmentedField`, `SignatureField`) added. **A rules file is code — it rots exactly as fast, and nothing typechecks it.**

## Decision it forced

Form 32's bespoke 38px `docInput` styling could not survive adopting the 44px shared fields. Qusai chose the standard sizes over adding a `size="compact"` variant to the shared library — **shared-component consistency over per-document fidelity**, now the precedent for Form 285 and TAT Form 031. See [[Form 32 Field Sizing - Shared Components Over Document Fidelity]].

## Merge-conflict warning

This refactor rewrites `Form32Editor.tsx`, which is exactly where [[Form 32 Rejection History & Round-Scoped Stamps]] lands. It also changed `RejectReasonDialog`'s internals (its API is unchanged), which the documents review flow shares.

## Related

- [[TAT-409 Staff Management Subsystem]] · [[TAT-423 Assessment Report Rubric]] · [[tat-prereq]]
- [[Patterns#All tat-prereq forms must use Zod + react-hook-form — I violated this repeatedly (2026-07-12)]]
- [[Code Quality]] — the whole note is a code-quality debt item
