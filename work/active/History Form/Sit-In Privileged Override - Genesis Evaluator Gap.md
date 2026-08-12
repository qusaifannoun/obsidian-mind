---
date: 2026-08-12
description: "A second circular dependency one edge around from TAT-429 — a new scope has no qualified evaluator, so its first instructor was unbootstrappable"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
---

# Sit-In Privileged Override — Genesis Evaluator Gap

> [!success] Committed to `dev` 2026-08-12 — [[tat-prereq]] `e8883c3`, 6 files, FE only
> `tsc --noEmit` and `eslint` clean. **Nothing browser-verified.** See [[#Still open]].

## The root cause: a second circular dependency

[[TAT-429 Sit-In Eligibility & Move Semantics|TAT-429]] broke the loop on **who can be added** to a sit-in. It did not break the loop on **who can evaluate one**.

`pickEvaluatorUserId(traineeUserId, courseId)` picks the evaluator from the course's *schedule* instructors — which was the correct fix for TAT-429's AC-01/02, and which assumes a qualified instructor already exists.

```
no qualified instructor in scope  →  no evaluator can be picked
       →  sit-in never leaves PENDING_EVALUATOR_SUBMISSION
       →  History Form never reaches APPROVED
       →  no TOR activates  →  still no qualified instructor
```

**This recurs per scope, not once at seed.** The first instructor for a new authority (CARC/EASA/GCAA), a new aircraft type, or a new course re-enters the same genesis state. Prior framing as a one-time bootstrap problem was wrong.

## The backend already solved it — the FE could never reach it

`completeFinalAssessment` fills the evaluator's half itself when the actor is a privileged editor and the request carries `subject` + `sitInDate`. Two FE gaps kept that branch unreachable: the form was **status-gated** to `PendingReview`, and the fetcher never sent the two fields the branch requires.

Same **status-gated, not role-gated** shape as [[Assessment Privileged Approval - TM Section While Assigned]] — the third instance of that trap in this subsystem.

## Evidence

`tat-app-ws` `libs/database/src/lib/staff-management/staff-sit-in.service.ts:329`

```ts
const isPrivileged = this.isPrivilegedEditor(this.getActorRoleCode(actor));
const canFillEvaluatorFields =
  isPrivileged ||
  (sitIn.evaluatorUserId && String(sitIn.evaluatorUserId) === String(actor._id));

if (sitIn.status === StaffSitInStatus.PENDING_EVALUATOR_SUBMISSION &&
    canFillEvaluatorFields && dto.subject?.trim() && dto.sitInDate) {
  sitIn.subject = dto.subject.trim();
  sitIn.sitInDate = sitInDate;
  sitIn.status = StaffSitInStatus.PENDING_TM_REVIEW;
  sitIn.evaluatorSubmittedBy = actor._id;
  sitIn.evaluatorSubmittedAt = new Date();
}
if (sitIn.status !== StaffSitInStatus.PENDING_TM_REVIEW) {
  throw new BadRequestException(ErrorMessages.sitInInvalidWorkflowTransition);
}
```

`tat-prereq` `src/components/forms/SitInSection.tsx:98` (before)

```ts
const canAssess = !!sitIn && isReviewer && sitIn.status === 'PendingReview';
```

`tat-prereq` `src/api/Forms/fetchers.ts:796` (before) — neither field was ever sent

```ts
const body: CompleteFinalAssessmentApi = {
  assessments: ..., assessorName, assessorSignatureKey, assessmentDate,
};
```

`CompleteFinalAssessmentApi` (`src/types/history-form-api.ts:223`) **already declared** optional `subject`/`sitInDate`. Only the domain type and the body builder lacked them — the contract mirror was ahead of the code that used it.

## Fix

- **`config/access.ts`** — new `hasPrivilegedEditorRole(roleCodes)` = SA/AD/QM/TM, mirroring the backend's `HISTORY_FORM_PRIVILEGED_EDITOR_ROLES` (= `FORM_285_AUTO_APPROVE_ROLES`). Replaces the inline expression at `HistoryFormView.tsx:100` and serves `SitInDetailView` instead of a fourth copy.
- **`types/form.ts` + `api/Forms/fetchers.ts`** — carry `subject`/`sitInDate` through.
- **`SitInSection.tsx`** — `canAssess = status !== 'Approved' && (isPrivileged || (isReviewer && status === 'PendingReview'))`. Final-assessment form extracted into `FinalAssessmentForm` so it mounts with the sit-in loaded and seeds defaults from the record; `subject`/`sitInDate` always in the schema and always sent — prefilled at `PendingReview`, typed by the SA at `PendingEvaluator`, where the form shows *"No evaluator submission yet — recording it as the assessor."* `key={sitIn.status}` remounts on status change so defaults can't go stale.
- **`HistoryFormView` + `SitInDetailView`** — both pass `isPrivileged`, so `/staff/:id/history-form` and `/sit-ins/:id` behave identically. Wiring only one would have reproduced the [[Form 32 Approved Lock - Owner Read-Only|Form 32 partial-coverage trap]].

## Design note: why the override is unconditional

The tempting version is to show the override *only when no eligible evaluator exists*. Rejected: that makes the escape hatch depend on the exact eligibility machinery it exists to escape — and eligibility computation is precisely what has failed repeatedly here ([[TAT-429 Sit-In Eligibility & Move Semantics|the TAT-429 cycle]], the `requestedRoleCodes` fail-open, the `aircraftTypeIds` claim). If the calc is wrong the hatch vanishes exactly when it is needed, and invisibly. **Unconditional is the safer choice, not the looser one.**

## Still open

- [ ] **Nothing browser-verified.** `tsc` + `eslint` clean is not verification. Unexercised: SA opening the form at `PendingEvaluator`, the one-shot round trip, the resulting record, and the History Form flip to `APPROVED`.
- [ ] **FE SA/AD/QM/TM vs backend `FORM_285_AUTO_APPROVE_ROLES` matched from the constant name, NOT confirmed member-by-member.** If they disagree the button renders for a role the backend 403s — the AD/Form 32 trap again ([[Gotchas - Forms & Approval#Form 32 privileged-editor (AC-415-12) is unimplemented — AD sees buttons that 403 (2026-07-05)]]).
- [ ] **`assertHistoryFormReadyForApproval` still gates on all three legs** — `BASIC_INFO_APPROVED` exactly, valid mandatory training, no other active sit-ins. A genesis instructor usually fails those, so the override 400s with a *basic-info* or *mandatory-training* message surfaced under the **sit-in** form. Reads as a broken button. Undecided whether to pre-check and disable with a reason. **This is the one QA will report as "the SA override doesn't work".**
- [ ] **Audit gap.** The privileged inline branch sets `evaluatorSubmittedBy` without writing `SIT_IN_EVALUATOR_SUBMITTED`, so an override logs only `SIT_IN_FINAL_ASSESSMENT_COMPLETED`. The override *is* recoverable from data (same actor id in `evaluatorSubmittedBy` and `finalAssessmentBy`) but nothing marks it explicitly. An SA-filled sit-in feeds "Successfully assessed as" on the [[Export History Form - TAT Form 031 PDF|Form 031 PDF]], which a CARC/EASA auditor reads as a third-party observation. See [[History Form Audit Log]].
- [ ] **Pre-existing duplication, reported not touched** — the SA/AD/QM/TM predicate also lives at `types/form32.ts:20` (`PIC_ROLES`, used by `Form32Editor` and `Form32InstanceList`) and as a local fork at `components/documents/InitialDocuments.tsx:16`. Consolidating onto `hasPrivilegedEditorRole` is a separate commit awaiting go-ahead.

## Related

- [[TAT-429 Sit-In Eligibility & Move Semantics]] — the first circular dependency; this is the second edge of the same cycle
- [[Assessment Privileged Approval - TM Section While Assigned]] — same status-gated-not-role-gated shape, same deliberate privileged bypass
- [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]] · [[History Form - Training & Validity Records]]
- [[Gotchas - Forms & Approval]] · [[Patterns - Architecture & Boundaries]] · [[History Form Audit Log]]
- [[tat-prereq]] · [[tat-app-ws Backend]]
- [[Systems Thinking]] — the deadlock lived in the gap between a correct fix (TAT-429's evaluator selection) and an unstated precondition
- [[Debugging & Root Cause Analysis]] — traced a missing UI affordance to a backend branch that already existed and had never been reachable
