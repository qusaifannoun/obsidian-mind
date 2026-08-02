---
date: 2026-07-16
description: "Pre-fill the instructor's name in the assessment/history/285/32 forms from the staff profile (useStaffDetail) — only when empty and editable, via a useEffect setValue so it never clobbers a saved value"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-prereq
---

# Auto-Populate Instructor Name in Forms

Instructor-identity **name** fields sat blank and had to be typed by hand (e.g. the Assessment report's "Name"). Now they pre-fill from the staff profile.

## What shipped (frontend-only)

- Source: **`useStaffDetail(staffId)`** → `GET /user/details/{id}` → `firstName` / `lastName`. No backend change.
- Fields filled: **Assessment report** `assessedName`; **History Form** basic-info `name` / `surname`; **Form 285** `firstName` / `surname`; **Form 32** `name`.
- **Only when empty and editable** — a `useEffect` `setValue`s the field only if it's currently blank, so it **never overwrites a saved value**; the query is `enabled` on emptiness so it doesn't fire on already-filled / read-only forms.
- Signer-name fields (signature sections, sit-in assessor) were **left alone** — scope is instructor identity only.

Committed `dev` `c11b5c7`. (That commit also carried the [[History Form Online Course Deep-Links|online-course link]] placement fix, since it edited the same `HistoryFormView.tsx`.) `tsc` + `eslint` clean.

## Pattern

The async default-value trick (recorded in [[Patterns]]): RHF `defaultValues` are captured at mount, so a value that arrives from an async fetch won't appear unless you `setValue` it later — do so in a `useEffect`, guarded on the field being empty, and gate the query `enabled` on emptiness.

Not browser-verified — should confirm it pre-fills on a **draft** form and does **not** overwrite an already-saved name.

## Related

- [[Profile Signature Sign Button]] — sibling "prefill from profile" convenience, same day
- [[Export Assessment Report - TAT Form 032 PDF]] · [[Export History Form - TAT Form 031 PDF]]
- [[tat-prereq]]
