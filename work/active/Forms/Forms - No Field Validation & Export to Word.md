---
date: 2026-10-15
description: "Forms TAT-482/483/485–488 lost all field validation (signature still required) and gained Export to Word, filling the client's own Word forms in the browser"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-ws
---

# Forms - No Field Validation & Export to Word

Two asks from me on 2026-10-15 for every **TAT-314 Forms** ticket from TAT-482 to TAT-488 **except TAT-484** (all six **IN QA**, as of 2026-10-15): *"we do not need form validations"* and *"we need to have an export to docx, all users with permission to view can export to docx"*. Ticket notes: [[TAT-482 + TAT-483 Enrollment Forms]] · [[TAT-485 Training Order Check List]] · [[TAT-484 Assigned Forms Inbox]] (inbox, out of scope).

> [!info] Status (2026-10-15)
> Pushed and synced to `dev`, `prepod` and `main`/`master` in both repos — [[tat-app-ws Backend]] `afb1d48a`, [[tat-ws]] `97fb5e90` (templates bundled into the build after the first deploy 404'd — see below). **Not yet exported on a deployed server, not exercised against real data for 485–488, never opened in Microsoft Word** — see Still open.

## Decisions (2026-10-15, from me)

- **Signatures stay required** on submit and approve; only field checks go.
- **Word is rendered in the browser**, not the backend: the browser only holds a form if one of the existing view checks let it through, so *can view = can export* with no new permission code. Answers the "where does rendering run" question left open in [[Decision - Word Templates for Generated Documents]].
- **Signatures/stamps via a small in-house image helper**, not `docxtemplater-image-module-free` — that module is unmaintained since 2022 and pulls `xmldom` 0.1.x, deprecated for CVE-2021-21366.
- **Attendance Report fills the fixed paper grid** (5 days × 4 periods per page), accepting that a 5th+ period in a day is dropped. Alternative offered and declined: generate the grid from the data.

## What changed

**Validation removed**
- [[tat-app-ws Backend]] `afb1d48a`: enrollment forms require only `signatureImage` (was 9 / 6 fields); the course forms' `assertSubmittable` hook deleted outright (it no longer checked anything). Kept: value integrity (yes/no/n.a., unknown keys), auto-field locking, permissions, stage order, Application-before-Planning-Sheet.
- [[tat-ws]] `401765d`: every RHF `required` rule on the six editors removed; the signature and *Choose Next Instructor* stay required.

**Export to Word** — [[tat-ws]] `3382c68` → `db9d07de`, delivery fix `97fb5e90`
- `utilities/docxTemplate.ts` — `renderDocxTemplate(url, values, images)`, shared with the proposal spike (moved onto it in its own commit). Images: the template carries a normal `{tag}`, the renderer fills it with a marker, then swaps the marker for an inline `<w:drawing>` inside the same run, adding the media file, relationship and content type.
- `forms/utils/formDocx.ts` — one mapper per form type, reusing the screen's helpers (`text`, `date`, `names`, `hours`, `box`, `categoryTicks`, `attendanceMark`, `dayLabel`…) so screen and Word cannot disagree.
- `ExportDocxButton` on all three view surfaces: SA catalog `/forms/view/[id]`, staff inbox `/my-forms/[id]`, TM enrollment modal (`TraineeProfileModal`). Trainees cannot view a submitted form anywhere, so they have no button.
- **Templates:** `apps/tat-ws/src/assets/templates/forms/<formType>.docx`, **imported** in `formDocx.ts` so webpack emits them to `/_next/static/media/<name>.<hash>.docx` (rule `{ test: /\.docx$/, type: 'asset/resource' }` in `next.config.js`, `*.docx` module type in `index.d.ts`). One per form, built from the client's EASA Word file attached to each ticket. The CARC/EASA/GCAA versions differ **only in the footer reference**, so the footer carries `{referenceId}` from the form's template record.
- Paper constraints kept: Training Order pads trainees to 15 rows (grows beyond) and prints 4 instructor slots; Attendance Report prints 2 instructors per page and repeats one Word page per 5 days.

**Screen fixes asked for mid-way**
- `4c3d72cf` — long values (a training order number like `TAT/MTO/EASA/Theoretical/JOR/01/10/26`) pushed the 4-column header past the form's edge. Fixed once in the shared `cell` class (`overflow-wrap: anywhere`), so it holds for every form.
- `e394cf59` — the Check List's bottom block now matches the paper: Circulation / Notification / Training Manager / Signature / Date down the side, stamp beside them, on screen and in Word.

## The first deploy: every export 404'd (2026-10-15)

Root cause: **the live [[tat-ws]] servers serve nothing from `public/`.** On `staging.tat147.com` the templates, the weeks-old `proposal-template.docx` *and* `pdf.worker.min.js` all return Next's own 404 (`x-powered-by: Next.js` behind CloudFront); only `/favicon.ico` answers, because the app serves it as a route. The middleware is not the cause — it passes any path containing a `.`. Which deploy step drops `public/` was **not pinned down**: the only pipeline in the repo (`bitbucket-pipelines.yml`, `Dockerfile.dev`) covers `dev`, and prepod/main deploy from somewhere not visible.

Fix (`97fb5e90`, my call over S3 — no credentials, no per-environment upload): bundle the templates as webpack assets. Verified on a local production build (`nx build tat-ws --production`, as the Dockerfile runs it) started **with `public/` deleted**: old path 404 (reproduces staging), new `/_next/static/media/*.docx` 200 with the Word content type, and an Export to Word in the browser generated the Planning Sheet from it. Also asked: rebuild the templates as backend HTML instead — declined, HTML → .docx loses the forms' layout; backend HTML → PDF stays the right call only if the client never needs to edit the file (open question).

## Evidence

- Backend forms + course-forms jest: 6 suites, 62 tests passed after the change.
- Real browser, SA, catalog Planning Sheet `6acc9b3fb0ddd8785dca26c3`: export intercepted in-page and unzipped — every value present, EASA footer `TAT Form 008 04.24 ISSUE/REV. 01/02`, the one valid signature embedded (`docx-image-2.jpeg`, 16 195 B), drawing ids unique. The record's other two signatures 403 on S3 for everyone, page included.
- All six templates rendered through the macOS Quick Look previewer; the real `formDocx.ts` mappers run in Node for all six on sample data.

## Still open

- [ ] **Never opened in Microsoft Word** — validated by Quick Look and XML inspection only.
- [ ] **485–488 mappers never ran on a real record** — no account in reach could view a checklist, training order, assessment or attendance report. Export one of each on staging.
- [ ] **S3 CORS on staging/prod buckets unverified** — the dev bucket allows it (needs `cache: 'no-store'`, see [[Gotchas - Frontend#A browser-cached image fetched without CORS fails a later `fetch()` (tat-ws, 2026-10-15)]]).
- [ ] **QA will test the old ACs** — required-field ACs on all six tickets now describe removed behaviour; tell QA / reword.
- [ ] Stamps appear only on the Check List export; the other paper forms have no stamp spot.
- [ ] The proposal page (`/proposal-test`) was moved onto the shared renderer but not clicked through.
- [ ] **Export on staging after the `97fb5e90` deploy** — the first real-server test of the bundled templates.
- [ ] **`pdf.worker.min.js` is very likely broken live too** (same missing `public/`) — raise with whoever owns the deploy pipeline, or bundle it the same way.
- [ ] Does the client need to *edit* the exported file? If print/sign only, backend HTML → PDF would be the better long-term shape.

## Related

- [[Decision - Word Templates for Generated Documents]] · [[Word Template Document Generation]] · [[Proposal Generator - Word Template Spike]]
- [[TAT-482 + TAT-483 Enrollment Forms]] · [[TAT-485 Training Order Check List]] · [[TAT-481 Super Admin Forms Browser]]
- [[Gotchas - Frontend]] — the docx and grid traps hit here
- [[Patterns - Architecture & Boundaries]] — one rule, one implementation: screen and Word share the same formatting helpers
- [[tat-ws]] · [[tat-app-ws Backend]] · [[TAT Platform]]
