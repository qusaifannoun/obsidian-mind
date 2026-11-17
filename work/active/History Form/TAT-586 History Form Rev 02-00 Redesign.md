---
date: 2026-11-16
description: "History Form moved to TAT Form 031 rev 02/00: Duties became four role flags defaulted from roles and TOR instructor types, plus a new Years of Experience field"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-586
---

# TAT-586 — History Form Rev 02/00 Redesign

**Status (as of 2026-11-16):** Jira **READY FOR QA**. [[tat-app-ws Backend]] `6578c43d` and [[tat-prereq]] `3c86c2a`, on dev, prepod and master/main. **Not opened in a browser and not exercised on staging.**

## Context

Dania's task, with the client's new TAT Form 031 rev 02/00 (05.26) attached as a PDF. The old form was rev 01/01 (03.23), built in [[Export History Form - TAT Form 031 PDF]]. The ticket covers both the Staff Management screen and the exported PDF.

The attachment was first missed: `jira.mjs get` does not fetch attachments, so the ticket looked design-less. See [[Gotchas - Tooling & Method]].

## What changed in the design

- Duties went from free text to YES/NO ticks for Theor. Insrt., Examiner, Pract. Insrt. and Assessor.
- Years of Experience in Aircraft Maintenance Environment now has a value cell. Nothing stored it before.
- Type Training Course: one aircraft per row with B1/B2 ticks, at least 5 rows.
- "Updated Training & Validity = Min 35 hrs / 2 years" became **Training Courses** with 7 fixed rows: MTOE, Human Factors, Aviation Legislation, Current technologies, Train the trainers / examiners / assessors.
- Sit Ins became a 4-column Subject/Date grid.
- "Successfully assessed as" splits Instructor into Theoretical and Practical.
- "Valid Until" and "Due Date" became "Expiry Date". The footer now cites Form 020/020A and 032/033.

## Decisions (Qusai, 2026-11-16)

- **Duties:** pre-ticked from the user, and the staff member can change them. Examiner comes from the EX role, Assessor from PA. Theoretical and Practical Instructor come from the IN role plus any non-archived TOR whose `instructorType` is that type or `both`.
- **Years of Experience:** a new staff-entered field, required on submit, rejectable like the other basic-info fields.
- **Additional training:** printed as rows after the fixed 7.
- **Assessed-as split:** not built. Shipped to QA as is; QA returns a bug if it's wanted.

## What was built

[[tat-app-ws Backend]] `6578c43d`:
- `basicInfo.duties` (string) is replaced by `basicInfo.dutyRoles`, a four-boolean subdocument that stays `null` until the staff member saves. The new key avoids casting the old strings. Also added `yearsOfExperience` (number).
- Field ids `DUTY_ROLES = "dutyRoles"` and `YEARS_OF_EXPERIENCE` were added, so both can be rejected per field.
- `defaultHistoryDutyRoles(roleCodes, torInstructorTypes)` lives in `history-form-basic-info-field.util`. `toBasicInfoDTO` is now async because it fills the defaults.
- Submit requires at least one duty and a years value.
- `history-form-031-pdf.util` was rewritten to rev 02/00 with the TAT logo. The "Valid Until" field label is now "Expiry Date".

[[tat-prereq]] `3c86c2a`:
- Duty checkboxes, using the RHF `Checkbox` and `FormFieldWrapper`, plus the years field.
- B1/B2 tick columns in Type Training Course.
- `brand-50` section bands; `SectionBar` is only used by this form.
- New title, Special Notes wording and footer. "Due date" renamed to "Expiry date".

## Evidence

- Rendered through the real `generatePdfFromHtml` with sample data: `pages 1`, Duties row `☒ ☒ ☐ ☐`, years `14`.
- Backend: API `tsc` exit 0. Staff-management jest: `Test Suites: 13 passed`, `Tests: 109 passed`, including 3 new `defaultHistoryDutyRoles` cases.
- tat-prereq: `tsc` clean, eslint clean on the changed files.

## Still open

- [ ] Not opened in a browser; not deployed or exercised on staging.
- [ ] Backend and tat-prereq must deploy together, because the save body changed (`dutyRoles`, `yearsOfExperience`).
- [ ] Old free-text `duties` values remain in Mongo, unused.
- [ ] Approved forms export an empty Years of Experience until the staff member fills it in.
- [ ] "Successfully assessed as" still has 3 roles. Proposal if QA returns it: 4 roles in the TM final assessment, with old `INSTRUCTOR` records mapped through the TOR instructor type.
- [ ] On screen the fixed courses keep catalog order (HF first); the PDF uses the design's order (MTOE first).

## Related

- [[Export History Form - TAT Form 031 PDF]] — the rev 01/01 export this replaces
- [[History Form - Training & Validity Records]] · [[History Form Audit Log]]
- [[Patterns - Backend & Domain#History Form is now real + rendered as TAT Form 031 (2026-06-28)]]
- [[Gotchas - Forms & Approval]] · [[Staff Management Subsystem & TOR Model]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
