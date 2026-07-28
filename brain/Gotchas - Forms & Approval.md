---
date: 2026-07-28
description: "TAT form traps — Form 32/285, History Form, approval and permission rules, and post-approval locking"
tags:
  - brain
---

# Gotchas - Forms & Approval

Split out of [[Gotchas]] on 2026-07-28, which had reached 96KB. Entries moved verbatim; [[Gotchas]] keeps the one-line index. **Add new entries here, not to the index.**
## "Approved" doesn't lock itself — each tat-prereq form type enforces its own post-approval read-only, so one ships unlocked (2026-07-15)

> [!warning] An Approved **Form 32** was still editable by the owning instructor — they could reopen and resubmit it — while **Form 285** and the **Assessment** report had locked on approval all along.
> There is no shared "approved ⇒ read-only" mechanism across the [[tat-prereq]] forms; each one re-implements it. Form 285 locks + renders a PDF; the Assessment cards flip to `reportReadOnly`; **Form 32 did neither.** Its list wrapped approved rows in a live `<Link>`, and its editor gated reopen on ownership alone (`canReopen = isOwner && status === 'Approved'`), so approval wasn't final for the person it certifies.
>
> **The trap: partial coverage reads as done.** Two of three forms locked, so "approved forms are read-only" felt true — until you check the third. When a cross-cutting rule (lock-on-approve, audit-on-write, evidence-required) is implemented per-instance instead of shared, **audit every instance, not the one in front of you** — same shape as the Zod+RHF and TOR-activation duplications.
>
> Fix locks the owner (`isSelf && !canReview && status === 'Approved'`): non-clickable rows + an editor redirect so a direct URL can't bypass it; reviewers keep full access. **Still unexercised in a browser**, and *whether* to remove the owner's reopen entirely is an open product question. See [[Form 32 Approved Lock - Owner Read-Only]].

## The same state has two names — backend serializes `PENDING_PIC` as `'pending'`, the FE expects `'pending_pic'` (2026-07-15)

> [!danger] An instructor's aircraft qualification was invisible to its reviewer — no Approve/Reject controls, blank badge — because the FE literal for that state never equalled the string the backend actually sends.
> Backend `StaffAircraftQualificationStatus.PENDING_PIC` serializes as **`"pending"`** (`enums.ts:1184`; external-teaching shares it at `:1192`), but the FE type and **every** comparison expect **`"pending_pic"`** (`qualification.ts:14`). So `status === 'pending_pic'` was always false: the reviewer gate `canReview && status === 'pending_pic'` (`TorQualifications.tsx:238`) never rendered, and `STATUS_LABEL/STATUS_STYLE["pending"]` were `undefined` → blank badge.
>
> **The tell: exactly one status value misbehaved.** Every other enum member matched byte-for-byte, so the whole qualifications UI looked healthy and only this one state silently dead-ended — instructor stuck, admin with no action. When a status-driven UI works for N-1 states and mysteriously dies on the Nth, suspect the *string*, not the logic.
>
> Fixed by normalizing at the **fetcher boundary** (`src/api/Qualifications/qualifications.ts` maps `"pending" → "pending_pic"` on every read, both `StaffQualification` and `ExternalTeachingActivity`). No write-side mapping — `status` is server-controlled. **Still unexercised in a browser.** Same family as the [[Patterns]] "keep the FE enum mirrored to the backend" rule: the enum *member* matched, its *serialized value* didn't. See [[Aircraft Qualification Approval Invisible - Status String Mismatch]].

## The Approve button approved the form, then asked the backend to approve it again — and showed you the 400 (2026-07-14)

> [!danger] The approval **succeeded**. The error on screen was the *second* attempt failing because the first one worked.
> Form 32's Approve fired **two** calls — `save`, then `approve`. But every role that can see that button (SA/AD/QM/TM) is in `FORM_32_AUTO_APPROVE_ROLES`, so **the save already performs the approval**: it sets `workflowStage = APPROVED`, writes the `FORM_APPROVED` audit entry, and enqueues the TOR sync. The follow-up `approve` then hit the guard with the stage already `APPROVED` and threw *"Invalid form workflow transition for your role"*.
>
> **The scary shape of this bug: a destructive-looking error message on a write that fully succeeded.** The user sees failure, retries, or escalates — while the audit log and the TOR sync say it worked. Trust the persisted state over the toast.
>
> **What gave the diagnosis away:** the *same file* had a "Save & approve" path that called save **only** — correct. Two paths, one right, one wrong. When a codebase contains both the right and the wrong version of the same call sequence, the right one is your spec; diff them before you debug anything else.
>
> Fixed in `063e0df` (`onApprove` calls save only) — **and the fix is still unexercised.** Pre-existing bug; the Zod+RHF refactor carried the original two-call sequence over verbatim, so the refactor exposed it rather than caused it. Root cause upstream: [[Staff Management - Unreachable Backend Endpoints#4. The Form 32 approve endpoint is dead by role algebra — the class this sweep is blind to (2026-07-14)]].

## A form with a schema can still be unvalidated — partial Zod compliance looks clean and isn't (2026-07-14)

> [!danger] `MandatoryCourseRow` (`HistoryFormView`) **had** a Zod schema — and kept its evidence file in a `useState` **outside** it. So the file was never validated, by anything.
> A grep for `useZodForm` marks that file compliant. It isn't. **The dangerous state is partial compliance, not absence** — a file with zero schemas advertises itself; a file with four schemas and one escaped field looks done.
>
> `HistoryFormView` showed **15 `useState` alongside 4 `useZodForm`**, and `SitInSection` 3 alongside 2. Both were on my "complies" list. Both were violators.
>
> **Audit by counting fields against schemas, not by asking "does this file import the hook?"** And the inverse error is just as real: `Form32Editor`'s "11 `useState`" was really **5 form-state buckets** — the rest were legitimate dialog/UI state the rule never covered. The first count overstated the debt; the compliance list understated it.

## History Form writes: privileged (SA) vs instructor paths differ — evidence is REQUIRED for the instructor (2026-06-28)

The [[TAT-409 Staff Management Subsystem|History Form]] (TAT-417/418/419) backend branches on `isPrivileged` (SA/AD/QM/TM), and the difference is invisible until you test as a **real instructor** — the SA path masks every one of these:

- **A certificate/evidence is REQUIRED for a non-privileged (instructor) save** — both mandatory training (`saveMandatoryTraining`/`submitMandatoryTraining`) and training-history (`addTrainingHistory`) do `if (!isPrivileged && !dto.evidenceFileKey) → 400 (…Incomplete)`. The FE-first build had the certificate as **"optional"** (mandatory) or **absent entirely** (training history), so an instructor's record **400'd every time** while SA worked. Fix: certificate required (disabled submit + hint until attached) for the instructor; optional for SA. Found only by logging in as the instructor.
- **SA writes auto-approve and skip the workflow.** A privileged save sets status **APPROVED** directly (the "privileged-role auto-approve" pattern, see [[Patterns]]) and **computes Due/Refresher immediately**; the instructor's submit goes to **PENDING_APPROVAL** and Due/Refresher stay null until a reviewer approves. So SA can't reach a PENDING state through the normal UI, and `submit` 403s for SA (SA lacks `SM_SUBMIT_MANDATORY_TRAINING`) — the save already auto-approved, so there's nothing to submit.
- **Sit-in eligibility needs a slot in `PENDING_SIT_IN`, which only an instructor submit produces** — so the whole **[[TAT-429 Sit-In Eligibility & Move Semantics|TAT-429]] add-instructor → sit-in → [[TAT-409 Staff Management Subsystem|TAT-421]]** chain is un-testable as SA (the eligible-instructors list is empty). Verifying it requires a real instructor submit first.
- **The History Form GET 404s until the form exists.** It's created lazily by `ensureForUser` on **TOR creation** and on writes (`POST training-history` etc.) — **not** by the GET, which hard-404s. Pre-existing dev instructors have no form → the page errored; the FE now treats a 404 as a not-yet-created empty Draft (`getHistoryForm`/`getTrainingHistory`/`getSitIn` return empty on 404). `PATCH basic-info` does **not** ensure either, so a brand-new instructor relies on the form existing from TOR creation.
- **Refresher date = accomplished + 23 months** (= Due − 1 month, Due = accomplished + 2y). Verified on staging.
- **Aircraft qualifications have no write API.** The `StaffHistoryForm.aircraftQualifications` schema field exists and the shell returns a count, but **no service writes it** and there's no list/CRUD endpoint — so the "Type Training Course" section stays read-only/count-only until the backend ships it.

Method reminder (reinforces the [[Gotchas - Backend Services & Environment#Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)|TAT-432 lesson]]): **a privileged login is a different code path** — verify staff-management write flows as the *actual* role that performs them (instructor records, TM reviews), not just as SA.

## Form 32 assessment Signature is a FILE key, not text (2026-07-05)

> [!danger] Backend validates `assessment.signatureKey` as an evidence file (`bucket/…` + allowed ext)
> The FE rendered Signature as a free-text input; typing anything → save 400s with `"Invalid file type. Supported: PDF, DOC, DOCX, JPG, JPEG, PNG."` (`assertValidEvidenceFileKey`). Fixed: the FE now uploads a signature file (category `tor-form-32`) and stores the returned key. If a backend field is named `*Key`, assume it's an uploaded file, not text.

## Form 32 forms are license-scoped, not role-scoped — shows all 4 A/B/C/D (2026-07-05)

> [!warning] Every TOR shows Form 32 A/B/C/D regardless of the person's role → violates TAT-415 AC-02
> `createFormInstances` attaches a form for **every template matching the `licenseId`**; the Form 32 A/B/C/D templates are seeded per authority (CARC/EASA/GCAA) with **no role field**. So an Instructor's TOR shows Examiner (C) + Assessor (D) forms. AC-415-02 says the form type is "selected based on the role (multi-select)." The "requested role" concept doesn't exist in the impl. See [[TAT-409 Ticket Groups & Inspection Map]].

## History Form: eligibility needs THREE approvals (2026-07-05)

> [!warning] A TOR isn't eligible on basic-info approval alone
> The [[TAT-409 Staff Management Subsystem|History Form]] flips to `APPROVED` (the state `isHistoryFormApprovedForUser` / TOR eligibility gates on) only when **all three** hold: basic-info `BASIC_INFO_APPROVED` **+** mandatory training valid **+** the sit-in final assessment completes (`assertHistoryFormReadyForApproval`, `staff-sit-in.service.ts`). Approving basic info alone leaves the form at `BASIC_INFO_APPROVED` — not eligible. The **sit-in final assessment is the capstone** that sets `APPROVED` (fused into `completeFinalAssessment`, no separate approve step). So "approve the History Form" is not one action — testing eligibility requires driving all three.
> Still open from the sit-in (TAT-421): **`assessorSignatureKey` is stored as a plain string, never validated as an evidence file** (contrast Form 32's `assertValidEvidenceFileKey` — see [[#Form 32 assessment Signature is a FILE key, not text (2026-07-05)]]). Privileged auto-approve here IS live (unlike Form 32's dead helper). See [[TAT-409 Ticket Groups & Inspection Map]].
>
> **Correction (2026-07-12): the "arbitrary sit-in evaluator" bug recorded here was fixed and this note was stale.** `pickEvaluatorUserId(traineeUserId, courseId)` now takes a `courseId` and picks from the course's *schedule* instructors (`staff-sit-in.service.ts:396`) — i.e. the actual teaching instructor, satisfying AC-01/02. **Lesson: re-verify a gotcha against source before repeating it — I asserted the stale version out loud before checking.**

## History Form spec-vs-impl divergences: training-history approval + FE 2-year window (2026-07-05)

> [!warning] Two mismatches between AC and code in the History Form training area
> - **Training-history records require approval, but TAT-417 AC-17 says they must NOT.** ~~`addTrainingHistory` creates non-privileged records as `PENDING_APPROVAL` with approve/reject endpoints and a required evidence file.~~ **Fixed 2026-07-09:** the section is now a plain free-text table (Subject · Organization · Accomplished · Due Date) — `addTrainingHistory` no longer validates, stores no evidence/hours, lands directly `APPROVED` (no `PENDING_APPROVAL` round), and gained a `deleteTrainingHistory` + `DELETE` endpoint. The FE reviewer approve/reject UI is gone. The backend `approveTrainingHistory`/`rejectTrainingHistory` methods + routes remain but are now unreachable (no record is ever `PENDING_APPROVAL`) — candidate for later cleanup.
> - **The backend windows total training duration to the last 2 years; the FE sums everything.** `calculateTotalTrainingDurationHours` (`mandatory-training.util.ts`) filters `accomplishedDate >= now-2y`; the tat-prereq `HistoryFormView` `totalHours` sums all dated items regardless of age. So the FE "total" can overcount vs what the backend uses for eligibility. Also FE-only: there's **no "request course online" surface** and **no reviewer cert preview**, uploads reuse **TOR** `FileUploadCategory` (wrong folder — no history-form category), and **AD falls into the instructor branch** (no FE privileged auto-approve path). See [[TAT-409 Ticket Groups & Inspection Map]].
>
> **Correction (2026-07-09): the "aircraft-quals are count-only, no write API" claim above was wrong** — the backend already had `GET/POST/PATCH …/history-form/aircraft-qualifications` (`listAircraftQualifications`/`addAircraftQualification`/`replaceAircraftQualification`, owner-or-privileged), it was only the FE that stubbed the section as read-only with a "no endpoint yet" note. Built the FE add/edit table this day (list type + B1/B2 category, owner/SA/AD/QM/TM can edit; no delete endpoint). **Lesson: an FE "// no backend yet" stub comment is not evidence — grep the backend controller before trusting it.** See [[Patterns#Multi-item reject flows: accumulate-and-send only when items share ONE parent status (tat-prereq / tat-app-ws)]] neighbour and [[Staff Management Subsystem & TOR Model]].

## Form 32 privileged-editor (AC-415-12) is unimplemented — AD sees buttons that 403 (2026-07-05)

> [!warning] The "PIC can fill/update any field, auto-approved" promise is dead code; and AD is a FE reviewer but not a backend one
> AC-415-12 says SA/AD/QM/TM must be able to fill/update **any** Form 32 field with auto-approve. Reality in `staff-tor-form-32.service.ts`:
> - `isPrivilegedForm32Editor`/`FORM_32_AUTO_APPROVE_ROLES` (= SA/AD/QM/TM) is **defined but never called** — dead code.
> - `saveDraft`'s reviewer branch is gated on `isForm32Reviewer` (`FORM_32_REVIEWER_ROLES` = **TM/QM/SA only, no AD**) *and* only merges `dto.assessment` — a reviewer's edits to instructor **section** fields (`dto.sections`/name/date) are **silently dropped**. No per-field auto-approve exists.
> - **AD mismatch:** `AD` has RBAC `SM_SAVE_FORM_32` (bootstrap `smForm32PrivilegedEditorActions`) and the FE `Form32Editor` `PIC_ROLES=['SA','AD','QM','TM']` renders AD the Save/Approve/Reject buttons — but backend `assertCan*InstructorSaReview` reject AD → **every AD action 403s**. FE affordance ≠ backend contract.
> Same "verify write flows as the *actual* role" lesson as the [[#History Form writes: privileged (SA) vs instructor paths differ — evidence is REQUIRED for the instructor (2026-06-28)|History Form privileged-path]] gotcha. Contrast: Form 32's **notifications ARE wired** (submit→TM/QM/SA, reject→instructor via `notifications.service.ts`) — don't assume the whole subsystem's notification layer is unsent. See [[TAT-409 Ticket Groups & Inspection Map]].

## Certified-by / approver identity lives only in the audit log — the form wipes field reviews on approval (2026-07-16)

Building the [[Export History Form - TAT Form 031 PDF|History Form PDF]], the "Certified by" block needed the approving Training Manager's name + date. There is **no form-level `approvedBy`/`approvedAt`/`certifiedBy`** on `StaffHistoryForm` — and `approveBasicInfo` **wipes** `basicInfoFieldReviews = {}` on approval (per-field `reviewedBy`/`reviewedAt` only survive for *rejected* fields). So an approved form retains **no** in-document record of who approved it. The only persistent source is the **audit log**: filter `listAuditLog` for event `HISTORY_FORM_APPROVED` (fallback `HISTORY_FORM_BASIC_INFO_APPROVED`) → its `actorName` + `createdAt`. See [[History Form Audit Log]].

Related data-locality trap in the same subsystem: the aircraft **name** and **category (B1/B2)** are NOT on the TOR-matrix / qualification read DTOs — resolve the name from `AircraftTrainingTypes.aircraftTypeWithEngine`, and category lives only on `StaffQualification` (see [[Aircraft Category Filter - TOR Matrix]]). And "Successfully assessed as" comes from the **sit-in** record's `assessments[]`, not `StaffAssessmentService` (which has no per-user lister).
