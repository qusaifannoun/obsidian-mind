---
date: 2026-10-15
description: "Training Order Check List rebuilt to the paper form — one Available Yes/No per listed form, not per section; pushed to dev in both repos, not browser-run"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-ws
ticket: TAT-485
---

# TAT-485 Training Order Check List

Jira: [TAT-485](https://cryptonic-art.atlassian.net/browse/TAT-485) Training Order Check List Forms · *Highest*, **IN QA** (as of 2026-10-15), under epic **TAT-314 Forms**, reporter dania.baradie. Siblings: [[TAT-481 Super Admin Forms Browser]] · [[TAT-482 + TAT-483 Enrollment Forms]] · [[TAT-484 Assigned Forms Inbox]].

Flow per the ticket: a course becoming *Scheduled* assigns the checklist to the Admins → Admin drafts and submits → Training Manager signs and approves → stamp, CARC/EASA/GCAA footer by authority.

## Decision (2026-10-15, from me): comply with the paper form, not the ACs

AC-07/AC-08 ask for **one Yes/No per section** ("Before Commencing Training Forms Attached", "After Training Completion Forms Attached"), and that is what had been built. The client's paper form has an **"Available Yes/No" column per listed form**. My call: *"lets make it comply with the paper form"*. The ticket text now contradicts the build — see Still open.

## What changed (made from another session, handed over 2026-10-15)

**[[tat-app-ws Backend]]** — pushed to `origin/dev` (seen there 2026-10-15; pushed outside this session):
- `19ac6211` — consolidation only: the Classroom Assessment's map-of-answers validation moved into a `mergeAnswers` helper in `course-form-definitions.ts`.
- `9fe0036e` — the checklist stores `formsAvailable: Record<key, "yes" | "no">` instead of `beforeCommencingFormsAttached` / `afterTrainingFormsAttached`. Keys are the exported `CHECKLIST_FORM_KEYS`: `applicationForTraining, trainingOrder, planningSheet, classroomAssessment, authorityApproval, attendanceSheet, feedbackQuestionnaire`. Unknown keys and non-yes/no values → 400. Submit requires all seven (`missing formsAvailable.<key>`); drafts merge with earlier answers.

**[[tat-ws]]** — `178f129`, pushed to `origin/dev` (seen there 2026-10-15; pushed outside this session):
- `TrainingOrderChecklistView`: one "Available" header spanning Yes/No, Form Name and Form Number spanning two header rows; only the first section carries the header row, as on paper.
- Each row shows a tick, or in the editor a radio per Yes/No cell via a `renderChecklistAnswer` slot passed through `FormView` — same pattern as `AttendanceReportView`'s `renderChapter`.
- `CourseFormEditor` sends `formsAvailable`; the two section-level radio rows under the table are gone.
- `trainingOrderChecklist.ts` gains a key per form and `CHECKLIST_FORM_KEYS`, **copied from `tat-app-ws` `course-form-definitions.ts`** — the repos share no code, so this is a named cross-repo twin.

## Checks run

- `tat-app-ws` course-forms jest: 4 suites, 41 tests passed, including new tests for a bad value, an unknown key, a refused partial submit, draft merging and a full submit.
- `tsc` clean in both repos (tat-ws keeps its existing `apps/tat-ws/specs/index.spec.tsx` `@testing-library/react` error).
- eslint on the changed tat-ws files: 0 errors, 1 existing `<img>` warning.

## Still open

> [!warning] Not run in a browser
> Local tat-ws points at the staging API, which still runs the old backend. The "Available" header layout and the radios inside the cells are unchecked.

- **Deploy order:** `tat-app-ws` with or before `tat-ws`. The new web sends `formsAvailable`; the old API ignores it and refuses submit on the missing old fields.
- **Old answers render empty.** Checklists answered the old way show empty rows. Assumed to be QA test data only *(unverified — no database checked)*.
- **The ticket describes the old behaviour.** AC-07, AC-08 and AC-10 still say per-section Yes/No; the ticket is IN QA, so QA will test against the old ACs unless they are reworded.

## Action Items

- [x] Push `19ac6211` + `9fe0036e` (tat-app-ws) and `178f129` (tat-ws) — both on `origin/dev` as of 2026-10-15; deploy backend with or before web
- [x] Synced to every branch 2026-10-15 at my call, backend first: tat-app-ws `prepod` ← merge `7fbdb77a`, `master` → `9fe0036e`; tat-ws `prepod` + `main` → `3a60c3c`. **Production now carries this unverified** (whether pipelines ran: unknown — `gh` gets 404 on Actions)
- [ ] After staging deploys, browser-run the Admin draft → submit → TM approve path and check the header and in-cell radios
- [ ] Check staging for checklists answered the old way
- [ ] Get AC-07 / AC-08 / AC-10 reworded to per-form "Available Yes/No" before QA tests them

## Related

- [[TAT-484 Assigned Forms Inbox]] — where the Admin and Training Manager open the checklist
- [[Gotchas - Forms & Approval]] — approval and post-approval locking traps
- [[Patterns - Method & Conventions]] — spec-gap routing: the paper form beat the ACs, and the ticket now lags the build
- [[tat-ws]] · [[tat-app-ws Backend]] · [[TAT Platform]]
