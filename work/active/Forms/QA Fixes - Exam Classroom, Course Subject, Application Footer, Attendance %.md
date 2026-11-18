---
date: 2026-11-18
description: "Four QA tickets: View Exam read the legacy classroom field, Course Subject ignored aircraft type, the Application footer was a body line, and attendance % was missing"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-ws
ticket: TAT-600
---

# QA Fixes: Exam Classroom, Course Subject, Application Footer, Attendance %

**Status (as of 2026-11-18):** pushed. [[tat-ws]] `8038abb2` is on dev, prepod and main, fast-forwarded. [[tat-app-ws Backend]] `51504845` is on dev and merged into prepod and master. **Nothing opened in a browser or on staging. Jira not yet moved.**

## Context

Four tickets from Ayat and Dania's QA round on 2026-11-17 and 18. TAT-595 and TAT-601 sit under TAT-491 PreRequisites V3; TAT-596 and TAT-600 under TAT-314 Forms. TAT-594 (signatures missing from exports) came in the same round. It is not fixed here; see [[Forms - No Field Validation & Export to Word]].

## Root causes and fixes

| Ticket | Root cause | Fix |
|---|---|---|
| TAT-601: View Exam shows "Classroom: N/A" | `ExamDetails.tsx` read the legacy `exam.classroomId`, but Edit Exam saves classrooms in `exam.classrooms[]`, each with a `classroomName` | `be57ebfd`: joins the `exam.classrooms` names through the existing `extractClassroomName` (`classroom-assignment/utils/classroomHelpers.ts`), falling back to the legacy field |
| TAT-595: Course Subject shows "No Subject" | Course Information showed only `courseSubject`, which aircraft-type courses never set | `48a91a0e`: falls back to `aircraftType.aircraftTypeWithEngine` before "No Subject" |
| TAT-596: the Application export puts the page number and reference on page 2 | In `application_for_training.docx`, "Page 1/1 {referenceId}" was an ordinary paragraph after the table, not a page footer, so a full page pushed it onto page 2 | `53a57ee3`: the line moved into a real `footer1.xml` with a `footerReference`; a hairline paragraph stays after the table |
| TAT-600: % of Att column missing | The client's form has "% of Att (Type Tr. Only)" (4.00 h → 6.67%, so 60 total hours). Neither the screen nor our template had it | Backend `51504845`: `attendancePercent` = attended minutes ÷ all non-exam period minutes × 100, rounded to 2. Frontend `8038abb2`: a shared `attendancePercentLabel` used by the view and `formDocx`. The template splits the 3150-twip Std. Hours column into 1350 + 1800, and the signature and TM cells span both |

## Evidence

- Filled Application template converted with LibreOffice (as the PDF export does): old `pages 2`, new `pages 1`. Still 1 page with a two-line Signature row.
- Attendance template render: `pages 1`, with the Std. Hours and % of Att columns side by side.
- Backend course-forms specs: `Test Suites: 4 passed`, `Tests: 41 passed`, including `attendancePercent` = 50 for 1 hour attended out of 2.
- tat-ws `tsc`: only the old error in `specs/index.spec.tsx` (`@testing-library/react` not found). ESLint: 0 errors on the changed files.

## Still open

- [ ] Not opened in a browser or exercised on staging, for any of the four.
- [ ] Existing attendance reports show a blank % until the hourly refresh rebuilds them; approved reports stay blank because they no longer refresh.
- [ ] The % denominator (all scheduled training hours, including future periods) is inferred from the client sample (TBC with the BA).
- [ ] Move TAT-601, TAT-595, TAT-596 and TAT-600 to READY FOR QA.

## Related

- [[Forms - No Field Validation & Export to Word]]: the six Word templates and their export
- [[Word Template Document Generation]]: footers must be real Word footers
- [[TAT-588 Export Forms to PDF]]: the LibreOffice conversion that showed the page split
- [[TAT-482 + TAT-483 Enrollment Forms]]: the Application for Training form
- [[tat-ws]] · [[tat-app-ws Backend]]
