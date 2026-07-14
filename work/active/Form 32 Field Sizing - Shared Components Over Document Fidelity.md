---
date: 2026-07-14
description: "Form 32 drops its bespoke 38px docInput styling for the shared 44px RHFInput fields — shared-component consistency wins over per-document fidelity, setting the precedent for every document-style form"
tags:
  - decision
  - project/tat
status: accepted
quarter: Q3-2026
project: tat-prereq
---

# Decision: Form 32 Field Sizing — Shared Components Over Document Fidelity

**Decided by Qusai, 2026-07-14**, during the [[tat-prereq Forms Refactor - Zod + RHF]] sweep.

## Context

Form 32 renders as the official **TAT FORM 032-A** document, and was deliberately built to look like one: a compact **38px** field style (`docInput`). `ControlledDatePicker` had even been custom-styled to match it, and carried a comment whose whole job was keeping the two in sync:

```
// Match the app's docInput text field: 38px tall, 8px radius, gray-300
// border, Outfit 14px, 8/12 padding. MUI X v7 uses the segmented
// `.MuiPickers*` classes (not `.MuiOutlinedInput-*`), so target those.
```

The shared `RHFInput` components are **44px**. Adopting them — which the Zod+RHF rule requires — forced the question.

## Options Considered

1. **Extend every shared field with a `size="compact"` variant.** Preserves the 032-A document look exactly. Cost: a size axis through the whole shared component library, maintained forever, for one form's benefit.
2. **Let the document take the standard sizes.** Fewer moving parts, internally consistent with the rest of the app. Cost: a chunkier-looking 032-A.

## Decision

**Option 2.** Shared-component consistency wins over per-document fidelity.

The comment above is itself the argument: a bespoke style that must be *manually kept in sync* with a shared one is a drift bug waiting to happen — the same shape as [[Patterns#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]]. A `size="compact"` variant would have preserved the look and kept the coupling.

Shipped in `2615d91` (`docInput` deleted from `Form32Editor`; the document now uses `InputField` / `DatePickerField` / `TextArea` / `Radio` at default sizes) and `50ae353` (`ControlledDatePicker` removed once nothing called it).

## Consequences

- **Sets the precedent for every future document-style form** — Form 285, TAT Form 031. Shared components win; don't rebuild a bespoke look to match paper.
- The `Radio` now renders as the shared styled control (**circle-then-label**) rather than the old label-then-native-radio. That is a visible change to the document, not just a size change.
- **Nobody has judged the visual result.** Qusai confirmed Form 32 *functions* in the browser (reject → correct → approve), but "does it still look right as a document" was never the thing under test. The 032-A is a form real people submit to an aviation authority; if the chunkier layout breaks the paper resemblance badly enough to matter, this decision is the thing to revisit.

## Related

- [[tat-prereq Forms Refactor - Zod + RHF]] — the sweep that forced the question
- [[Form 32 Rejection History & Round-Scoped Stamps]] — also lands in `Form32Editor.tsx`
- [[TAT-409 Staff Management Subsystem]] · [[tat-prereq]]
- [[Key Decisions]] · [[Code Quality]]
- [[Index|Work Notes]]
