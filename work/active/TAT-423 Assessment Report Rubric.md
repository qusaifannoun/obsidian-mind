---
date: 2026-07-09
description: "TAT-423 gap: the Assessment Report (TAT FORM 032) captured only the sign/approve shell, not the graded rubric. Contract + build plan to model the rubric, scores, objective, Part 147 compliance, and comments across backend + frontend."
project: TAT-409 Staff Management Subsystem
status: active
quarter: Q3-2026
tags:
  - work-note
---

# TAT-423 Assessment Report Rubric

The [[TAT-409 Staff Management Subsystem|TAT-423]] Assessment Form was implemented as the **workflow shell** (assign → instructor sign → TM approve + optional video), but captures **none of the graded content** of the real paper form (`TAT FORM 032.08.25`, "Instructors/Examiners/Assessors Assessment Report"). This note is the shared contract for adding the rubric across backend ([[tat-app-ws Backend]]) and frontend ([[tat-prereq]]).

## Gap — paper form vs. current model

Current `StaffAssessment` stores: `assessmentType` (Initial/Continuation/Extension), `aircraftTypeId`, `instructorSection` (name/signatureKey/signedAt), `tmSection` (name/signatureKey/signedAt), optional evidence video, workflow status/history.

**Missing (the entire body of the form):** TAT ID, task, reference, Objective Pass Y/N, the 3-section scored rubric (14 criteria, each 1–4), the per-section DSL/INSTR/EXAM/ASS discipline flags, overall rating (Excellent/Good/Average/Needs Development), Complies-with-Part-147 Y/N, assessor comments, TM comments.

## Contract — data model

New nested `report` block on `StaffAssessment` (filled by the assessing party before submit; comments split instructor-side vs TM-side).

**Enums (`libs/app-data/src/lib/enums.ts`):**
- `AssessmentOverallRating`: `excellent | good | average | needs_development`
- Score is a plain integer 1–4 (validate `@Min(1) @Max(4)`), optional per criterion until completeness check.

**Criteria keys (fixed, match the form):**
- `knowledge`: qualified, understanding, educated, trained, instructed
- `skills`: communication, expertise, flexible, organized, thoughtful, motivated
- `competence`: specific, selfEsteem, versed

**`report` subdocument shape:**
```
report: {
  task?: string
  reference?: string
  objectivePass?: boolean            // Objective: Pass = Y/N
  knowledge: {
    scores: { qualified?, understanding?, educated?, trained?, instructed? }   // each 1–4
    disciplines: { dsl?: boolean, instr?: boolean, exam?: boolean, ass?: boolean }
  }
  skills: {
    scores: { communication?, expertise?, flexible?, organized?, thoughtful?, motivated? }
    disciplines: { dsl?, instr?, exam?, ass? }
  }
  competence: {
    scores: { specific?, selfEsteem?, versed? }
    disciplines: { dsl?, instr?, exam?, ass? }
  }
  overallRating?: AssessmentOverallRating
  compliesWithPart147?: boolean
  assessorComments?: string
}
```
- **TM comments**: add `comments?: string` to `tmSection`.
- **TAT ID**: derive from the assessed user (`userId`) in the GET/detail response — do not store a copy.

## Contract — API

- **New endpoint** `PATCH /tors/:torId/assessments/:assessmentId/report` → save/patch the `report` (draft, incremental). Same authorization as the instructor save (owner or privileged SA/AD/QM/TM per AC-22). New DTO `SaveStaffAssessmentReportDTO` (all rubric fields optional, scores `@Min(1)@Max(4)`).
- **Extend** `ApproveStaffAssessmentDTO` with optional `comments` → persisted to `tmSection.comments`.
- **Completeness on submit** (mirror Form 32's `assertComplete`): before moving to `pending_tm_review`, require all 14 scores + `objectivePass` + `overallRating` + `compliesWithPart147`. Throw a clear message listing what's missing.
- **GET `/tors/:torId/assessments` + detail** must return the full `report` and `tmSection.comments` so the FE prefills.

## Build plan (parallel agents)

- **Backend (`tat-app-ws`)** — schema + enums + DTOs + report endpoint + approve `comments` + submit completeness + include `report` in responses. Ships first.
- **Frontend (`tat-prereq`)** — build the rubric UI in `AssessmentFormView.tsx` + FE types mirroring this contract, driven by **local/dummy state**. **Integration is on hold** — do NOT call the new endpoints until the backend agent ships; keep the component render-complete against mock data so wiring is a small follow-up.

## Shipped (2026-07-09)

Built by two parallel platform agents against the contract above, then FE-integrated after the backend shipped. Both pushed to `dev`.

- **Backend ([[tat-app-ws Backend]])** — `report` subdocument + `AssessmentOverallRating` enum, `SaveStaffAssessmentReportDTO`, `PATCH /staff-management/tors/:torId/assessments/:assessmentId/report`, TM `comments` on approve, rubric completeness gate on submit (all 14 scores + objectivePass + overallRating + compliesWithPart147), and `report`/`tmSection.comments`/`tatId` in list+detail responses. AC-21 (instructor-editable type, additive to assign default) and AC-16 (no edits after approved; owner blocked past `draft`) gated via `assertCanEditReport`. `api:build` green. Merges via `.toObject()` + `markModified("report")` (avoids the Mongoose subdoc-spread trap — see [[Gotchas]]).
- **Frontend ([[tat-prereq]])** — full rubric UI in `AssessmentFormView.tsx` (editable Initial/Continuation/Extension, task/reference, objective pass, 3 scored sections with per-section DSL/INSTR/EXAM/ASS flags, overall rating, Part 147, assessor + TM comments), read-only once approved. Wired to the report endpoint (`useSaveAssessmentReport`) + approve `comments`; partial-save prunes null/empty. tsc + eslint clean.
- **AC-11 decision**: kept the richer `assigned → draft → pending_tm_review → approved` status model (not collapsed to the AC's literal `Draft`).

**Still open / follow-ups:**
- **TAT ID has no real source** — no staff-ID field exists on `User` in either repo; backend emits `String(userId)` (a Mongo ObjectId) as a placeholder, so the form's "TAT ID #" box is meaningless until a real staff-ID attribute is added. Needs BA/product.
- **Assessor-vs-instructor naming** — the paper form's first signer is a distinct *Assessor*; our model calls it `instructorSection` and AC-06/07 has the instructor self-filling. Confirm with BA.
- **Clear-vs-unset on partial save** — FE omits empty `task`/`reference`/`assessorComments` rather than sending `""`, so blanking a previously-saved value isn't persisted. Follow-up if explicit clears are needed.
- **Live E2E pending** — needs the backend deployed to `dev` + a real session to drive assign → fill rubric → submit (completeness) → approve.

## The assessor lands — both open questions answered (2026-07-12)

The two questions this note flagged to the BA on 2026-07-09 came back, and the answers reshaped the model. Grilled out via `/grill-me`; shipped across `f336c3f1`→`4f541a86` ([[tat-app-ws Backend]]) and `cd829f2`→`85ebc1c` ([[tat-prereq]]).

> [!danger] The instructor could grade and sign their own assessment
> `assertCanEditReport` permitted the **TOR owner** — the person *being assessed* — to edit `report`: their own scores, rating, and comments. The paper form has **no signature box for the assessed instructor**; its two signers are the **Assessor** and the **Training Manager**. There was no assessor concept in the code at all. **Answer: `instructorSection` means the *assigned* instructor — and the assessor IS the assigned instructor.** No rename needed; the field was never populated by the right person.

**Assessor assignment.** `assessorUserId`, **optional** at creation. Optional is load-bearing, not laziness: an eligible assessor needs an **ACTIVE TOR**, but a TOR only activates once its assessments are approved — so the *first* assessor for any aircraft cannot exist. Privileged users fill it in instead. **Same circular-dependency shape as [[TAT-429 Sit-In Eligibility & Move Semantics|the sit-in deadlock]] — caught in design this time, not in production.**

**Eligible assessors** (`GET tors/:torId/assessments/eligible-assessors?aircraftTypeId=`): an active TOR on the **same licence** + an **APPROVED `StaffQualification`** for that aircraft type, **B1/B2 category ignored**, assessee excluded. Reads `StaffQualification` directly rather than `buildStaffTorEligibilityFilter`. Privileged users always appear, so the list is never empty.

**Permissions — filling ≠ approving.** My first pass read "SA/AD/TM/QM can fill the form completely" as including approval and widened the approve roles to all four, which let **QM and AD self-approve**. Corrected:

| Actor | Fill every section | Submit | Approve |
|---|---|---|---|
| Assessed instructor | ✗ (video only) | ✗ | ✗ |
| Assigned assessor | ✓ | → TM review | ✗ |
| **QM / AD** | ✓ | **→ TM review** | ✗ |
| **SA / TM** | ✓ | **auto-approved** | ✓ |

`STAFF_ASSESSMENT_TM_ROLES` → **`STAFF_ASSESSMENT_APPROVER_ROLES` = [SA, TM]** — renamed because the set now contains SA, and a constant called `TM_ROLES` holding a non-TM is [[Gotchas#`StaffSitIn.active` means "in progress", NOT "exists" — completing the flow makes the record invisible (2026-07-12)|the name-that-lies trap]] again. Auto-approve keys off `isApprover`, not `isPrivilegedEditor` — **that was the actual bug**. The guard against auto-approving an assessment you were *assigned to carry out* is kept, so a TM acting as assessor submits then approves as a separate audited act.

**RBAC didn't match the intent either**: `SM_ASSIGN_ASSESSMENT` was SA+TM only, **AD and QM had no assessment actions at all**, and even SA lacked approve. Now: all four assign; only SA + TM approve.

## Three bugs found by building it

1. **The TAT ID was the Mongo ObjectId.** This note predicted it ("backend emits `String(userId)` as a placeholder") — and the FE rendered it **read-only**: `<ReadOnly label="TAT ID" value={assessment.tatId ?? assessment.userId} />`. **Answer: it's typed per-form, not derived.** Name / TAT ID / Date are now real inputs; the form had no header row at all. Assessment type became a dropdown.
2. **Video upload was broken for every file, always** (`f336c3f1`). The FE sends `file.type` — a **MIME type** (`video/mp4`) — and the backend compared it against bare **extensions** (`mp4`). Nothing could ever match; every upload 400'd `staffAssessmentInvalidVideoType`. Now validates the uploaded **fileKey's extension** (the backend rewrites extensions on upload — [[Gotchas]]'s own rule), across a broad set incl. `mkv`/`avi`/`3gp`. Both the assessee and the assessor may upload.
3. **Assessment create 500'd on every attempt** (`c59680b7`) — `enum + default: null` on `report.overallRating`. See [[Gotchas#Mongoose enum + `default: null` rejects null — 5th instance, now CI-checked (2026-07-12)]].

**Also:** `assessorComments` deleted — on the paper form "COMMENTS BY THE ASSESSOR" **is** the rating scale (Excellent/Good/Average/Needs Development), not a free-text box. The enum values already matched 1–4; only the label was wrong. And signatures now use the shared **`SignatureInput`** (draw *or* upload), the same component Form 285 and Form 32 use — the assessment form had its own upload-only duplicate.

**`/my-assessments`** — the assessor's queue, mirroring `/sit-ins`. An assigned assessor previously had no way to find their work.

## Approval requires a signature — reversing my own auto-approve (2026-07-12)

BA rule: *the form is not approved until SA or TM has approved **and signed** it.* That killed the auto-approve-on-submit I'd shipped in `4f541a86` — and it was worse than merely wrong: an SA or TM submitting flipped the form straight to `APPROVED` with an **empty `tmSection`**. An approved Part-147 assessment carrying **no approver signature at all** — exactly what the paper form exists to prevent.

Now **everyone** submits → `PENDING_TM_REVIEW`, and `APPROVED` is reachable **only** through the approve endpoint, which writes the approver's name/signature/date. SA's privilege is *"can do the approve step immediately themselves"*, not *"skips signing"*. `shouldAutoApproveAssessmentOnSubmit` / `resolveAssessmentStatusAfterSubmit` **deleted** rather than left as dead code describing a workflow that no longer exists. (`0bde7866`)

Submission notifies **TM *and every SA*** ("Assessment Pending TM Review" destination `TM` → `TM, SA`) and lands in their `/my-assessments` queue — which already surfaced `PENDING_TM_REVIEW` to approvers.

**SA force-delete** (`SM_DELETE_ASSESSMENT`, SA only): soft-delete via the `Base` plugin, so the record vanishes from every query (including the already-open guard, freeing a new assessment) but is recoverable. Writes an audit row and **enqueues a TOR re-sync** — deleting an *approved* assessment can legitimately drop the TOR out of `ACTIVE`, which the confirmation modal warns about.

**Eligible assessors**: PIC users are now a **fallback**, listed only when no qualified instructor exists. Once a real assessor is available the PICs drop out.

## Three more bugs, all found by driving it

1. **`toAssessmentResponse` overwrote `tatId` with the Mongo userId** on *every read* (`8bbee3b8`): `return { ...assessment, tatId: String(assessment.userId) }`. So the TAT ID the assessor types is saved correctly and then **clobbered on the way back out**. This is the real source of the "TAT ID is auto-filled with an ObjectId" bug — I fixed the FE's read-only fallback earlier and **never checked the backend was doing the same thing at the source**.
2. **The delete couldn't delete the records it exists to delete** (`df235b8c`). Soft-deleting via `assessment.save()` makes Mongoose re-validate the *whole* document — and staging has raw-inserted `StaffAssessment` docs missing `assignedBy` / `assignedAt` / `assessmentType`. **A delete implemented via `save()` can only delete documents that don't need deleting.** Now writes `deletedAt` with `updateOne`. See [[Gotchas#A soft-delete via `.save()` cannot delete an invalid document — and invalid documents are what you want to delete (2026-07-12)]].
3. **`TYPE_LABEL[assessmentType]` crashed the UI** (`d56e33e`) — `undefined.toLowerCase()`. Those same malformed records have no `assessmentType`. Guarded via `typeLabelOf()`. Same class as the `STATUS[value].cls` crash already in the vault: **a UI must never hard-crash on a backend enum value it doesn't know.**

## Open

- [ ] **None of this has been exercised.** Every feature touched this week had latent bugs the moment it was first actually driven ([[Gotchas#Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)]]). Expect the same.
- [ ] The **destructive role-action seeder** re-seeds AD/QM on deploy (their action sets changed). Correct here — but do not run this branch locally against the shared dev DB.
- [ ] Confirm the assessor-assigned notification actually seeds (all three edits were made: settings, template, **and** the bootstrap mapping).
- [ ] Clear-vs-unset on partial save (carried over, still open).

## Related
- [[TAT-409 Staff Management Subsystem]] — parent epic
- [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]] — the assessment assign/submit/approve notifications
- [[Staff Management Subsystem & TOR Model]] — domain reference
- [[tat-app-ws Backend]] · [[tat-prereq]] — the two repos changed
- [[work/Index]]
