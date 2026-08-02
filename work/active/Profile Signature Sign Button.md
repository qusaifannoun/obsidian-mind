---
date: 2026-07-16
description: "A shared 'Sign' button that fills any signature field from the current user's saved role signatureImage (already returned by /auth/me) — FE-only, works in every signature section; instructors excluded (no role signature)"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-prereq
---

# Profile Signature "Sign" Button

Across all signature sections (Assessment instructor/TM, Form 32, Form 285), added a **"Sign"** button that fills the signature field from the current user's **saved** signature instead of drawing/uploading each time.

## Keystone finding — no backend needed

`/auth/me` already returns the **full** user (`sanitizeUser` only strips password/tokens), so the role-scoped **`signatureImage`** S3 keys come through untouched — and they're **storage-compatible** with the forms' `signatureKey`. So the "Sign" button just calls `onChange(profileKey)` and the existing image-preview + Clear UI takes over. Frontend-only.

## Implementation

- `useMySignature()` (in `api/Profile/useProfile.ts`) resolves the key via `resolveProfileSignature(user)` — first non-null across the manager role sub-objects (`trainingManager` / `qualityManager` / `examinationManager` / `accountableManager`).
- The shared `SignatureInput` shows the "Sign" button when a saved signature exists **and** the field is empty; `null` → normal draw/upload input. Lives in the one shared component, so it covers **every** signature section at once.

Committed `dev` `c86dd5e`. `tsc` clean (the 2 eslint `<img>` warnings are pre-existing, not mine).

## Limitation

> [!warning] Instructors have no role signature
> Only the **manager roles** carry a `signatureImage`. **Instructors do not** — so the most common signer (an instructor signing an assessment) won't get the button; they still draw/upload. Covering instructors would mean building a **real per-user profile signature** (upload UI + storage + `profiles/me` exposure) — the fuller option that was deferred.

Not browser/live-verified (assumes those keys are populated and `fileViewUrl` renders them).

## Related

- [[TAT-423 Assessment Report Rubric]] — assessment signatures (a primary consumer)
- [[Auto-Populate Instructor Name in Forms]] — sibling "prefill from profile" convenience shipped the same day
- [[tat-prereq]]
