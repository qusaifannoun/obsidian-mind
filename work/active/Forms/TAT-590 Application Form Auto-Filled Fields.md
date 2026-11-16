---
date: 2026-11-16
description: "Application birth fields were browser-prefilled into an editable draft, so wrong values stuck; the backend now fills them from the profile and Type uses the aircraft type"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-590
---

# TAT-590 — Application Form Auto-Filled Fields

**Status (as of 2026-11-16):** Jira **READY FOR QA**. Fixed in [[tat-app-ws Backend]] `070e9bb7` and [[tat-ws]] `5525a4eb`, on dev, prepod and main/master. **Typecheck and unit tests only; not tried in a browser or on staging.**

## Context

Dania's task (High), under TAT-314 Forms, on the trainee's Application for Training/Examinations ([[TAT-482 + TAT-483 Enrollment Forms]]):
1. Place of Birth showed the trainee's date of birth.
2. Date of Birth was empty.
3. The ID field needed the hint "Passport ID.".
4. Type showed the internal course name instead of the course's aircraft type.

## Root cause

- **Birth fields (points 1–2):** `useProfilePrefill` in the trainee's browser copied `user.dateOfBirth` and `user.placeOfBirth` into the form, **only into empty fields**, and the result was saved in the editable draft. A wrong value stored once stayed for good, and the trainee could type anything.
  - No code path that swaps the two was found: the editor, read-only view, Word export (code and `.docx` placeholders), Training Order views and backend all map them correctly, and the editor never had them swapped. **The actual trigger is unconfirmed.**
  - Only users holding the Trainee role get a date-of-birth field on their profile, so others have none to fill in.
- **Type (point 4):** `forms.service.ts` filled the Application's `courseName` and the Planning Sheet's `aircraftType` with `course.name`. The course name is built as `<trainingCategory> <aircraftTypeWithEngine>`, so it is not the aircraft type.

See [[Gotchas - Frontend Data & API Contracts#A browser prefill that only fills empty fields freezes a wrong stored value (tat-ws, 2026-11-16)|the gotcha]].

## Fix

Qusai approved making the backend the only source, plus the Planning Sheet's aircraft type.

[[tat-app-ws Backend]] `070e9bb7`, `forms.service.ts`:
- `enrichAutoFields(formType, data, courseId, traineeId)` loads the course with `aircraftType` populated and the trainee's `dateOfBirth`, `placeOfBirth` and signature.
- Application: sets `aircraftType`, `dateOfBirth` (`YYYY-MM-DD`) and `placeOfBirth` **unconditionally**, so values the trainee sends are overwritten. Planning Sheet: sets `aircraftType`.
- The aircraft type label is `aircraftTypeWithEngine`, falling back to `course.name` when the course has none.
- `createWorkingDraftsForEnrollment` and `listEnrollmentForms` (for PENDING/DRAFT forms) go through it, so old drafts correct themselves when opened.

[[tat-ws]] `5525a4eb`:
- Birth fields shown read-only (`LockedField`, date via the shared `date` helper).
- "Passport ID." placeholder on the ID field.
- `CourseTypeTable`, `FormView` and the Word export use `aircraftType ?? courseName`.

## Evidence

`forms.service.spec`: draft creation expects `aircraftType: "A350-900 (RR Trent XWB)"`, `dateOfBirth: "1990-04-17"`, `placeOfBirth: "Amman, Jordan"` from the profile; the save test sends `dateOfBirth`/`placeOfBirth: "2000-01-01"` and expects `null` from a profile without them. `Test Suites: 4 passed, Tests: 33 passed`. API `tsc` and tat-ws `tsc` clean.

## Still open

- [ ] Not tried in a browser or on staging: opening an existing draft, a new enrollment, the Word export.
- [ ] Root cause of the date in Place of Birth never confirmed.
- [ ] A trainee without a profile date of birth sees "-" and can't enter one; they have to add it to the profile first. QA may report it.
- [ ] Forms submitted before the fix keep the course name as Type (they are not re-enriched).

## Related

- [[TAT-482 + TAT-483 Enrollment Forms]]: the two enrollment forms this changes
- [[Forms - No Field Validation & Export to Word]]: the Word export path
- [[Patterns - Architecture & Boundaries]]: the backend owns derived values
- [[tat-app-ws Backend]] · [[tat-ws]]
- [[Debugging & Root Cause Analysis]]
