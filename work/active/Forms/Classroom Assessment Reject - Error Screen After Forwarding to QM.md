---
date: 2026-10-18
description: "Reject → QM moves a Classroom Assessment off the Training Manager, so the page's own refetch 403'd into an error screen; tat-ws now leaves the page instead"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-ws
---

# Classroom Assessment Reject — Error Screen After Forwarding to QM

Part of the **TAT-314 Forms** epic, on the [[TAT-484 Assigned Forms Inbox|inbox]] detail page (`/my-forms/:id`). No ticket. Reported by me with a screenshot on 2026-10-18.

**Symptom:** a Training Manager clicks **Reject and Forward to QM** on a Classroom Assessment. The toast says *"Form forwarded to the Quality Manager"*, then the page turns into *"Something went wrong — This list could not be loaded."*

## Root cause — the hand-off removes the caller's own read access

The reject **worked**. The failure was the page reloading the form it had just handed off.

1. [[tat-app-ws Backend]] `course-forms.service.ts` `reject()` sets `stage = QUALITY_MANAGER_REVIEW` and **replaces** `assignedUserIds` with the Quality Managers:
   ```ts
   form.assignedUserIds = (await this.findRoleUsers(SystemRolesCodes.QUALITY_MANAGER)).map((u) => u._id);
   ```
   (`course-forms.service.ts:368`, as of 2026-10-18)
2. `GET /forms/inbox/:id` → `forms.service.ts:585` `getInboxForm()` → `assertAssigned(form, userId)` → `ForbiddenException(formNotAssignedToUser)` for anyone no longer assigned.
3. [[tat-ws]] `useRejectForm` invalidated `['inboxForm', id]` on success, so the still-mounted page refetched as the now-unassigned TM and got the Forbidden.
4. `my-forms/[id]/page.tsx` rendered `EmptyState` with `isError`, whose error copy was written for lists, which is why a single form said "This list could not be loaded".

**Submit has the same shape.** The instructor chain (`course-forms.service.ts:234`, `assignedUserIds = [next]`) and the hand-off to Training Managers (`:528`, the working draft's `assignedUserIds = []`) both drop the submitter. Submit already navigated to `/my-forms` from its caller, but the hook's invalidation ran first, so it may have flashed the error before leaving the page *(inferred, never seen)*.

The Forbidden response is **inferred from reading the code**. It was not captured in a network tab.

## Fix — frontend only ([[tat-ws]] `2b209883`, pushed to `main`, `dev` and `prepod` 2026-10-18)

**Decision (me, 2026-10-18): option A, leave the page, over option B, widening backend read access.** Option B (let past signers keep reading the form via `getInboxForm`) is an API contract change. Option A keeps the backend's assignment model as the single source of who can see a form.

- `useFormsInbox.ts`: new `useInvalidateFormsInbox` (inbox list only). `useRejectForm` and `useSubmitCourseForm` use it instead of `useInvalidateInboxForm`, so they no longer refetch the form they just handed off. Approve and Save Draft still refetch, because the backend keeps the caller assigned there.
- `ApprovalPanel.tsx`: on reject success → `router.push('/my-forms')`, matching what `CourseFormEditor` already does on submit.
- `EmptyState.tsx`: new optional `errorDescription`, defaulting to the old list copy. `my-forms/[id]` and `forms/view/[id]` pass *"This form could not be loaded…"*, `forms/templates/[id]` passes *"This template…"*.

**Checks:** `tsc --noEmit` reports one error, `@testing-library/react` missing in `specs/index.spec.tsx`, which fails the same way on a clean tree. `eslint` on the changed files has no errors (one existing `<img>` warning). Running prettier with the repo's `.prettierrc` reflows these files to 80 columns, but they are written at ~120, so the diff was kept hand-formatted to the files' existing width.

## Still open

- [ ] **Not exercised in a browser.** Reject as a TM on a Classroom Assessment → lands on `/my-forms`, no error screen, form gone from the inbox.
- [ ] Submit as an instructor → confirm no error flash before `/my-forms`.
- [x] Committed in [[tat-ws]] as `2b209883` and pushed to `main`, `dev` and `prepod` (2026-10-18), fast-forward from `6ed7513a` on all three.

## Related

- [[TAT-484 Assigned Forms Inbox]] — the inbox and detail page this lives on
- [[TAT-485 Training Order Check List]] · [[Forms - No Field Validation & Export to Word]] — same epic, same `course-forms` service
- [[Gotchas - Frontend Data & API Contracts#A hand-off that removes your own assignment 403s the page's success refetch (tat-ws, 2026-10-18)]] — the reusable trap
- [[Gotchas - Frontend Data & API Contracts#A query hook read without `isError` turns every server failure into an empty-state card (2026-09-09)]] — why the page showed an error state at all (the good half of this)
- [[tat-ws]] · [[tat-app-ws Backend]] · [[TAT Platform]]
