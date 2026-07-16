---
date: 2026-06-04
description: "Architectural and workflow decisions worth recalling across sessions — each links to its source work note"
tags:
  - brain
---

# Key Decisions

Architectural or workflow decisions worth recalling. Link to the full [[Decision Record]] when one exists.

## 2026-07-15 — Purchase-terms acknowledgment is a nudge, not provable consent

The [[tat-portal]] course-detail *Important Notes* (auto-close forfeiture, exam-retake fees, 3-day refund — all material money terms) now require a checkbox acknowledgment before Add-to-Cart/Enroll. **Qusai scoped it deliberately as a UX nudge, not provable consent — frontend-only, no backend.** Nothing is recorded server-side and the gate is bypassable by a direct `POST` to cart-add/checkout. Rationale: keep scope small; the modal's job is to make a buyer *see* the terms, not to produce a legal record. **Revisit trigger:** if consent ever needs to be *provable*, add a thin per-order acknowledgment on the backend. Full record: [[Course Purchase Important-Notes Acknowledgment Gate]].

## 2026-07-14 — Shared components beat per-document fidelity, even on official forms

Form 32 renders as the official **TAT FORM 032-A** and had a bespoke compact **38px** field style (`docInput`) to look like the paper document; the shared `RHFInput` fields are **44px**. Offered the choice between adding a `size="compact"` variant across the shared library (exact document fidelity, a size axis maintained forever) or letting the document take standard sizes, **Qusai chose standard sizes** — fewer moving parts, internally consistent with the app, at the cost of a chunkier-looking 032-A.

The tell was in the code: `ControlledDatePicker` carried a comment whose only purpose was keeping the bespoke style *manually in sync* with the shared one — the same drift trap as [[Patterns#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]].

**Precedent for every document-style form** ([[tat-prereq]] Form 285, TAT Form 031). Caveat: nobody has yet judged the visual result against the paper form. Full record: [[Form 32 Field Sizing - Shared Components Over Document Fidelity]].

## 2026-06-04 — tat-portal is the canonical design/theme reference for all TAT frontends

Consistency across the [[TAT Platform]] frontends beats per-repo Figma fidelity. Qusai has authority to make minimal design changes to keep platforms consistent, so **[[tat-portal]]'s theme is the source of truth**: shared `globals.css` (brand palette `brand-500 #285ea8` / `brand-950 #101828`, type scale, shadows, sidebar utilities), **Geist** font config, and the **real TAT logo assets** (`logo-white.svg`, `logo.svg`, `grid-01.svg`). [[tat-prereq]] now copies these verbatim (auth panel + sidebar use the real logo + GridShape, not placeholder icons). New TAT frontends should copy portal's theme rather than re-deriving from Figma; design tweaks land in portal first, then propagate.

## 2026-06-04 — Staff Management subsystem is a new repo, mirroring tat-portal

[[TAT-409 Staff Management Subsystem|TAT-409]] ships as a **new dedicated repo [[tat-prereq]]** (not a section of [[tat-ws]]), structured by **copying [[tat-portal]]'s conventions** — same stack (Next 16 / React 19 / Tailwind v4 / shadcn / RTK / RQ / RHF+Zod), same infra layer (axios DI, `lib/env`, store, middleware), same TAT theme tokens, same "always remember" rules. Rationale: the ticket calls for a "separate subdomain" with cross-subsystem SSO, and tat-portal is the best-documented, most modern TAT frontend to clone. Keeps the two frontends feeling identical to work in. Scaffold verified green 2026-06-04.
