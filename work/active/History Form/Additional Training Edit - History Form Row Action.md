---
date: 2026-08-23
description: "Backend's additional-training PATCH had no FE caller — added the Edit row action; its gating differs from Remove's, because approved rows ARE editable with a new certificate"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
---

# Additional Training Edit — History Form Row Action

The **Updated Training & Validity** section of the [[Staff Management Subsystem & TOR Model|History Form]] could add, approve, reject and remove an external training record — but never **edit** one. A typo in the subject or a wrong duration meant Remove + re-add, and on an `approved` row even that was impossible (Remove excludes approved).

The backend half already existed. `PATCH /staff-management/profiles/:userId/history-form/additional-training/:recordId` shipped on [[tat-app-ws Backend]] as `aadfaf4a` *"added new API to edit additional-training"* — **with no frontend caller**. This is the same shape as [[Gotchas - Tooling & Method#An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)|the standing lesson that the capability usually already exists]], inverted: the endpoint was built and then left unreachable.

Changed in [[tat-prereq]], **uncommitted**:

| File | Change |
|------|--------|
| `src/api/Forms/fetchers.ts` | `updateAdditionalTraining` → `PATCH …/additional-training/:recordId` |
| `src/api/Forms/useForms.ts` | `editExtra` mutation + `updateAdditional(recordId, fields, file)` on `useMandatoryTrainingActions`, folded into `isMutating` |
| `src/components/forms/AddAdditionalTrainingForm.tsx` | schema extracted to exported `buildAdditionalTrainingSchema(requireEvidence)` — the add form passes `true`, behaviour unchanged |
| `src/components/forms/HistoryFormView.tsx` | `AdditionalTrainingRow` gains an **Edit** action + inline edit row, mirroring `MandatoryCourseRow`'s existing pattern |

## The gating is asymmetric to Remove's — read off the service, not the curl

The rules came from `staff-history-mandatory-training.service.ts:252`, not from the request shape. Reading the curl alone would have produced the wrong gate three times over:

- **Who**: owner *or* privileged (SA/AD/QM/TM). The FE's `hasPrivilegedEditorRole` already matches that set exactly.
- **Online-source rows**: privileged only — an instructor cannot edit a record the platform auto-created from their own course completion.
- **`approved` rows ARE editable** — unlike Remove, which is `canManage && !isOnline && status !== 'approved'`. Edit is `canManage && (isPrivileged || !isOnline)`.
- **Privileged**: certificate optional, and the save flips the record straight to `APPROVED` — the same [[Patterns - Backend & Domain|privileged-role auto-approve]] shape as every other History Form write.
- **Non-privileged**: a certificate key is *always* required, and on an `approved` row it must be a **different** key or the request 400s. `approved`/`rejected` → back to `PENDING_APPROVAL`, with a `SUBMITTED` entry appended to `reviewHistory`.

This is the [[Gotchas - Forms & Approval#History Form writes: privileged (SA) vs instructor paths differ — evidence is REQUIRED for the instructor (2026-06-28)|2026-06-28 privileged-vs-instructor split]] extending to a fourth write path.

## Decision — a non-privileged edit always forces a fresh certificate upload

The alternative was to resend the record's existing `evidenceFileKey` when the user picks no new file. Rejected for two reasons:

1. The backend **rejects it outright on approved rows** — it compares against the stored key and requires `evidenceChanged`.
2. `AdditionalTrainingItem` carries `evidenceFileKey` but **not** `evidenceFileType`/`evidenceFileSize`, so resending the key alone would null both out — see [[Gotchas - Backend Services & Environment#`evidenceFileKey` without its type/size NULLS both on the stored record (2026-08-23)|the write-shape trap]].

Forcing a fresh upload sidesteps both, at the cost of making a subject-only typo fix require re-attaching the PDF. Allowing a no-file edit on `pending`/`rejected` rows is a real option — it needs the two evidence fields added to the FE type and the `getMandatoryTraining` adapter first.

## Reuse

Nothing here is a new primitive. `AddAdditionalTraining` is byte-identical to the backend's `UpdateAdditionalTrainingDTO extends AddAdditionalTrainingDTO`, so it is reused as the PATCH body rather than twinned. The zod schema is now shared with the add form. `useForms.ts`'s `withEvidence` helper had **already** been duplicated inline inside `addExtra`; rather than add a third copy it was consolidated to one `evidenceFields(file)` used by all three mutations — that consolidation belongs in its own commit, separate from the feature.

## Still open

- [ ] **Nothing has been run in a browser.** `tsc --noEmit` and `eslint` are clean on all four files — per [[Patterns - Method & Conventions]] that is built, **not verified**.
- [ ] The **approved-row path** is the one most likely to surprise: new-certificate-required → status returns to `PENDING_APPROVAL` → the TM sees it in review again. Entirely unexercised.
- [ ] Not committed. When it is, it wants **two commits** — the `evidenceFields` consolidation separate from the feature.
- [ ] **Backend trap left unfixed**: sending `evidenceFileKey` without `evidenceFileType`/`evidenceFileSize` nulls both on the stored record. The FE avoids it by always uploading fresh; any other caller will hit it.
- [ ] The add form still requires a certificate for **privileged** users, though the backend does not. Pre-existing, untouched here.

## Related

- [[History Form - Training & Validity Records]] — the feature this edits into; where `additionalTraining` came from
- [[History Form Buttons Unified - InlineAction Primitive]] — the `InlineAction` primitive the Edit button uses
- [[Gotchas - Forms & Approval]] · [[Gotchas - Backend Services & Environment]]
- [[Patterns - Architecture & Boundaries]] — the backend owns the edit rules; the FE gates on them rather than re-deriving them
- [[tat-prereq]] · [[tat-app-ws Backend]] · [[TAT-409 Staff Management Subsystem]]
- [[Code Quality]] · [[Systems Thinking]]
