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

## Open question (flagged to BA)

On the paper form the **Assessor** (a distinct person) fills the rubric + first signature, evaluating the instructor. Our model calls that block `instructorSection` and AC-06/07 has the instructor self-filling. Confirm who authoritatively fills the rubric/first signature before finalizing the schema's naming. Schema is role-agnostic (rubric is just data on the assessment), so this does not block the build — only naming/labels.

## Related
- [[TAT-409 Staff Management Subsystem]] — parent epic
- [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]] — the assessment assign/submit/approve notifications
- [[Staff Management Subsystem & TOR Model]] — domain reference
- [[tat-app-ws Backend]] · [[tat-prereq]] — the two repos changed
- [[work/Index]]
