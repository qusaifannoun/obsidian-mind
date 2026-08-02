---
date: 2026-07-16
description: "HistoryFormView had 14 hand-rolled inline buttons with 2–3 divergent styles per action; extracted one reusable InlineAction primitive (tone-based) and routed all 14 through it, plus a client copy fix"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-prereq
---

# History Form Buttons Unified — InlineAction Primitive

`HistoryFormView.tsx` had **14 hand-rolled inline `<button>`s** with 2–3 divergent styles for the *same* action — Approve appeared as both a green text-link and a broken `bg-success-600 hover:underline` (solid fill + underline, no text color); Reject as both a red text-link and a solid red pill; Delete as a red pill but Remove as a gray link. Every client button tweak meant hunting down N copies — the exact duplication [[Patterns|the reusable-components rule]] exists to prevent.

## What shipped

- **New primitive `src/components/ui/InlineAction.tsx`** (cva, matching the existing shadcn `button.tsx`) with a `tone` prop — `brand | approve | reject | neutral`. All 14 inline buttons now route through it; one tone change propagates everywhere. Grep confirms **0 raw `<button>` left, 14 `<InlineAction>`**.
- **Form-level buttons** (Save / Submit / Cancel / Approve) already used the shared `<Button>` and were left as-is.
- **Client-driven copy fix:** the ambiguous mandatory-training **"Record"** button → **"Add Certificate"** (client: "Record" was unclear; it opens the accomplished-date + certificate editor).
- **Client-driven visual change:** first shipped as subtle colored text-links; the client said they were "not clear / not visible," so `InlineAction` was restyled to **filled high-contrast pill buttons** (brand=solid blue, approve=green, reject=red, neutral=outlined).

## Evidence

- `tsc --noEmit` exit 0; `eslint --max-warnings=0` on the changed files exit 0.
- Committed `dev` `4d3a82b` (bundled with the [[Aircraft Category Filter - TOR Matrix|TOR-matrix filter]] + the History-Form Export button).

## Still open

- **Not browser-verified** — filled pills are taller than the old text-links; row layouts (Approve+Reject side-by-side, and the "Reject this field" / "Undo" buttons that sit inside text lines in Basic Info) need an eyeball.
- **This-file-first:** the same inline-button mess still exists in `Form32Editor.tsx`, `AssignedSitInsView.tsx`, `AssignedAssessmentsView.tsx` — `InlineAction` is shared and ready for them.

## Sweep continued + kebab reversal (2026-07-16)

The `InlineAction` rollout reached two more files:

- **`TypeTrainingCourseSection.tsx`** — the 4 hand-rolled Edit / Delete / Save / Cancel buttons routed through `InlineAction` (tones brand / reject / neutral). Committed `f924363`.
- **`InitialDocuments.tsx`** — **replaced the kebab (⋮ `RowActionsMenu`) with inline tone-coded `InlineAction` buttons** (Upload/Replace = brand, Approve = green, Reject/Delete = red) side by side, per Qusai's request. Committed `823828b`. Also fixed a stray broken `bg-error-600` style on the assessment Delete button.

> [!important] Kebab-rule reversal
> This **overrides** the standing *"Table row actions = kebab menu only"* rule (Qusai, 2026-06-04) for the Initial-TOR-Documents list — he explicitly asked for inline buttons. The kebab-only rule is **no longer absolute**; inline `InlineAction` buttons are an accepted alternative when he asks. Recorded in [[Patterns]].

Still remaining with the same inline-button mess: `AssignedSitInsView`, `AssignedAssessmentsView`.

## Related

- [[History Form - Training & Validity Records]] — the view this refactor lives in
- [[tat-prereq Forms Refactor - Zod + RHF]] — the earlier reusable-forms sweep; same "reach for the existing primitive" discipline
- [[Form 32 Field Sizing - Shared Components Over Document Fidelity]] — prior shared-component-over-bespoke decision
- [[TAT-409 Staff Management Subsystem]] · [[tat-prereq]]
- [[Code Quality]] — reusable primitive replacing duplicated per-call styling
