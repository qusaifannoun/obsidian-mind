---
date: 2026-07-15
description: "An approved Form 32 stayed editable by the owning instructor — could reopen/resubmit. Locked: approved rows non-clickable, editor redirects the locked owner, reviewers keep full access."
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
---

# Form 32 Approved Lock — Owner Read-Only

> [[tat-prereq]] behavior change: once a Form 32 instance (per aircraft type) is **Approved**, the owning instructor must no longer be able to edit it — while reviewers keep full access. It wasn't locked: the approved row was a live link and the editor offered the owner a "Re-open & edit" path. Repo: [[tat-prereq]]. Domain: [[Staff Management Subsystem & TOR Model]].

## The gap

- **List:** approved rows were wrapped in a live `<Link>` (`Form32InstanceList.tsx`) — one click straight back into the editor.
- **Editor:** the reopen affordance was gated on ownership alone — `canReopen = isOwner && status === 'Approved'` (`Form32Editor.tsx:188`) — so the **instructor could reopen and resubmit their own approved form**.

Net effect: an approval was not final for the person it certifies.

## Fix

Lock the owner out of an approved instance while leaving reviewers untouched. The gate is **`isSelf && !canReview && status === 'Approved'`**:

- **List** — approved rows render as non-clickable **muted cards** (no `<Link>`) for the locked owner.
- **Editor** — a locked instructor is redirected back to the instance list (`useEffect` → `router.replace` + early return), so a **direct URL** can't bypass the list-level lock. `canReopen` is restricted to **owner-reviewers** (reviewers who also own the form), not owners in general.
- **Dedup** — `PIC_ROLES` moved to `src/types/form32.ts` (shared, no duplicate copy). Reaching for the shared definition instead of re-declaring, per the standing [[Patterns|no-duplication rule]].

**Already correct, no change needed:** Form 285 already locks + renders a PDF on approval; the Assessment cards already render read-only on approval (`reportReadOnly`). Only Form 32 was missing the lock.

**Touches:** `src/components/forms/Form32InstanceList.tsx` · `src/components/forms/Form32Editor.tsx` · `src/types/form32.ts`

## Still open

- [ ] **Not browser-verified.** As **instructor**: approved row is not clickable **and** a direct editor URL redirects to the list. As **reviewer**: the approved instance is still fully accessible.
- [ ] **Product confirm:** removing the owner's reopen entirely is acceptable (there is no longer any owner self-service path to amend an approved Form 32).

## Related

- [[tat-prereq]] · [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]]
- [[Form 32 Rejection History & Round-Scoped Stamps]] — the other end of the lifecycle (reject → resubmit rounds) on the same form
- [[Form 32 Field Sizing - Shared Components Over Document Fidelity]] — same editor/list surface
- [[Aircraft Qualification Approval Invisible - Status String Mismatch]] — sibling tat-prereq approval-gating fix from the same day
- [[Form 32 PIC Bugs & Cross-Frontend Auth Fixes]] — earlier Form 32 reviewer/role work
- [[tat-prereq Forms Refactor - Zod + RHF]] — `Form32InstanceList` / `Form32Editor` were part of that sweep
- [[Gotchas#"Approved" doesn't lock itself — each tat-prereq form type enforces its own post-approval read-only, so one ships unlocked (2026-07-15)]]
