---
date: 2026-07-15
description: "tat-portal course-detail purchase now opens an Important-Notes acknowledgment modal before Add-to-Cart/Enroll — a deliberate UX nudge, not provable consent, so no backend"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-portal
---

# Course Purchase Important-Notes Acknowledgment Gate

## Context

The [[tat-portal]] online-course **detail page** already displayed *Important Notes* — auto-close-after-N-hours (progress forfeited), exam-retake fees, and the 3-day refund policy. These are all **material money terms**, yet the buyer could Add to Cart / Enroll Now without ever acknowledging them. This adds an acknowledgment step in front of purchase. Same `EnrollmentOptions` component previously touched for the cart-remove fix ([[TAT Certificates - Open Items#Frontend (us — tat-portal)]] · P2).

## Decision — nudge, not provable consent

> [!note] Product decision (Qusai, 2026-07-15)
> The acknowledgment is a **UX nudge, not provable consent** — so **no backend**. Nothing is recorded server-side and the gate is intentionally **bypassable** (a direct `POST /online-courses/cart/add` or `/orders/checkout` skips it entirely). If consent ever needs to be *provable*, revisit with a thin backend acknowledgment stored on the order. Chosen deliberately to keep scope frontend-only for now. See [[Key Decisions]].

## What / Why

- **`ImportantNotes` (new, shared)** — extracted the notes markup into one component so the **detail section and the modal render from a single source of truth** and can't drift.
- **`ImportantNotesModal` (new)** — Radix, styled to match the existing `TermsModal`. Has an *"I have read and understood"* checkbox that **disables the confirm button** until checked.
- **`EnrollmentOptions`** — opens the modal *after* the existing auth check; the real `addToCart` (and enroll → route-to-cart) fires **only on Accept**. The checkbox **resets on every close/accept** so it re-prompts each time.
- **Not gated:** remove-from-cart, and the already-in-cart → go-to-cart path.
- Implementation note: reset the checkbox in the **close/accept handlers**, not a `useEffect` — that cleared a `react-hooks` set-state-in-effect eslint error (set state in the event handler, not in an effect).

## Evidence

- `tsc --noEmit` clean, `eslint` clean (incl. the set-state-in-effect fix above).
- **NOT browser-verified** — the click-through is unexercised (see Action Items).

## Action Items
- [ ] Browser-verify the click-through: Add to Cart / Enroll Now → modal → checkbox gate → Accept fires the mutation; checkbox re-prompts on reopen.
- [ ] If consent ever needs to be provable, add a backend acknowledgment on the order (revisit trigger from the decision above).

## Related
- [[tat-portal]] · [[TAT Platform]] · [[TAT API & Auth Model]] — cart/checkout endpoints
- [[TAT Certificates - Open Items]] — sibling `EnrollmentOptions` work (cart-remove) · [[TAT Portal Onboarding]]
- Competencies: [[Delivery & Scope Management]] — deliberately scoping the gate frontend-only · [[Code Quality]] — single-source-of-truth shared component to prevent drift

**Touches:** `src/components/courses/ImportantNotes.tsx` (new), `src/components/courses/ImportantNotesModal.tsx` (new), `src/components/courses/EnrollmentOptions.tsx`, `src/app/(public)/courses/[id]/page.tsx`
