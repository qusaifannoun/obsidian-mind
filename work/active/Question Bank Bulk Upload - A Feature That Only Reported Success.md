---
date: 2026-09-10
description: "Nine commits across two repos on the question bank — every defect reported success or emptiness instead of failing, so each one hid the next"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Question Bank Bulk Upload — A Feature That Only Reported Success

**Reported by Qusai:** *"i tried on local host and it said success but nothing happened why?"* — then, after each fix, the next failure underneath it.

Nine commits across [[tat-app-ws Backend]] and [[tat-ws]] over 2026-09-09/10. The defects were independent, but they share one shape: **none of them produced an error.** Each reported success or an empty list, so each concealed the one below it, and they could only be found one at a time.

## The defects, in the order they surfaced

| # | Defect | Where | Commit |
|---|---|---|---|
| 1 | `wb.SheetNames[0]` read the workbook's empty leading `Statuses` tab; the 150 questions sat on sheet 2. Returned `{inserted: 0, errors: []}` — a clean success that imported nothing | `question-bank.service.ts` | `15734f07` |
| 2 | `toast.success('Questions uploaded successfully')` fired without reading `inserted` or `errors`, so zero-row and 150-failure responses both rendered green | `useBulkUploadQuestions.ts` | `3b7078e` |
| 3 | Mimetype allow-list was inverted — anything unlisted fell through to `buffer.toString("utf-8")`, turning binary `.xlsb`/`.ods` into mojibake rather than a parse error | controller | `030fb736` |
| 4 | Browser-mimetype validation, duplicated in two functions, rejected valid files before any request (a `.csv` reports four different mimetypes depending on OS) | `useBulkUploadQuestions.ts` | `bf16eec` |
| 5 | `isSuccess` came from the mutation and `resetModal` cleared only local state, so **Upload Another File** left the Upload button unrenderable — the modal looked functional and was inert | `BulkUploadModal.tsx` | `7c82e8c` |
| 6 | `enrichQuestions` used `Promise.all`, so one question that failed to enrich blanked the **entire** list | `question-bank.service.ts` | `7d767e87` |
| 7 | The list had no `isError` branch, no `staleTime` (its two siblings use 1 min) and no `placeholderData` | `page.tsx` + hook | `ba9446d` |
| 8 | `Number("")` is `0`, and the criteria builder discarded only `undefined` — an empty Question ID box became `find({ questionId: 0 })`, matching nothing. **Two commits, one per repo** | DTO + `stripEmpty` | `aa59290d`, `14e8e2a` |

## The two that are worth remembering

**#8 was misread as a pagination bug.** The symptom was "next page shows 0 items". It was never about the page — going *back* to page 1 with `questionId=` still in the query also returned zero. Three layers each had a chance to drop a blank filter and none did: the frontend serialised it, `@Transform` coerced `""` to `0`, `@IsNumber` accepted `0`, and the builder kept it because it only tested `!== undefined`.

**#6 is created by our own importer.** `resolveChapterId` returns any syntactically valid ObjectId **without checking it exists**, so a bulk upload can write questions pointing at chapters that aren't there — exactly the input that makes `Promise.all` blank the page.

## Verified

- **Sheet fix**, against the real workbook: **0 rows before, 150 after**.
- **Format support**, by converting that workbook and re-reading each: `.xlsx .xlsm .xlsb .xls .ods .csv` — **150 rows every time**.
- **Pagination**, live in the browser: pages 2–5 render 10 rows each, QIDs descending 148 → 138 → 128 → 118 → 108.

## Still open

- [ ] **Five backend commits are unverified** — `15734f07`, `030fb736`, `7d767e87`, `aa59290d`, and they need a deploy. Only the frontend half of #8 was confirmed live.
- [ ] **`resolveChapterId` still trusts ObjectId syntax** (`question-bank.service.ts`). Until it verifies existence, an import can create the dangling rows that #6 now tolerates but does not prevent.
- [ ] **The upload's own error text names no email.** "reviewer not found" doesn't say *which* address failed — that cost a round trip to diagnose.
- [ ] **`findAll` uses `req.user._id`** while every other handler in that controller uses `req.user.id`. If `_id` is ever absent, `findById(undefined)` → `null` is passed non-null-asserted into per-question permission logic.
- [ ] **Sheet columns silently ignored**: `verifier`, `verifier_name`, `verifiedAt`, `reviewerNotes` aren't in the header map, so a verifier is never imported.
- [ ] The DEV-exported workbook carries DEV user emails and chapter ids; uploading it anywhere else fails on the reviewer and, per the point above, would import dangling chapters if it didn't.

## Related

- [[TOR Matrix 500 - Leading Space in aircraftTypeIds Ref]] — the same session, the same lesson: the error state *was* the diagnosis
- [[Gotchas - Frontend#A query hook read without `isError` turns every server failure into an empty-state card (2026-09-09)]] — recorded that morning, then hit again the same week on a second screen
- [[Patterns - Method & Conventions#A screen that cannot fail is a screen that cannot be debugged (2026-09-10)]]
- [[Gotchas - Tooling & Method]] — the environment traps this session produced
- [[tat-app-ws Backend]] · [[tat-ws]]
- [[Index|Work Notes]]

### Competencies

- [[Debugging & Root Cause Analysis]] — every defect here was a "reports success, does nothing" trap. Found by measuring behaviour rather than trusting the response: running the repo's own `xlsx` against the real workbook to prove `SheetNames[0]` yielded 0 rows, and reproducing the filter bug by going *backwards* to page 1 to show the page was never the variable.
- [[Systems Thinking]] — recognised the missing-`isError` gap recurring on a second, independent screen within the same week it was first recorded, and treated unobservability as the primary defect rather than a cosmetic one.
