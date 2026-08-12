---
date: 2026-08-12
description: "Course Rating/T1/T2 were per-aircraft but belong to the certificate once, per TAT Form 020 — plus the missing PDF export that finally consumes nonTrainingAuthorities"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Final TOR Certificate — Form 020 Alignment & Export

> [!success] Pushed to `dev` — [[tat-app-ws Backend]] `ecaf1316` + `948e1515`, [[tat-prereq]] `e25bbbe` + `086d00b`
> `tsc` clean both repos, eslint clean on the FE. **The PDF has never been rendered.** See [[#Still open]].

Triggered by Qusai producing a real signed certificate (`M. Awni _GCAA ToR.pdf`) and comparing it to the UI. Reading the actual artifact settled in one pass what the code alone could not.

## What the paper form says

**TAT Form 020** has two distinct tables:

| Table | Scope | Columns |
|---|---|---|
| *Aircraft Type Training Authorization Capability* | **per aircraft** | Aircraft Type · DSL · B1/B2 · Theor. Insrt. · Exam. · Pract. Insrt. · Assessor |
| *He may exercise the above duties as follows* | **once per certificate** | Course Rating · T1 · T2, over one Limitations row |

The model had all four editable fields on `TorCertificateAircraftRow`, so a QM was asked for course rating, T1 and T2 **once per aircraft**. With two aircraft those answers can disagree, and the printed form has nowhere to put a second set.

## Changes

- **`courseRating` / `t1` / `t2` moved** from `TorCertificateAircraftRow` to `TorCertificateData`. `dsl` stays per-row.
- `assertQmFieldsComplete` now requires DSL on every row **plus** the three certificate fields once — 8 dropdowns down to 5 on a two-aircraft TOR.
- Amendment reset clears them at certificate level; `rebuildAutoFields` carries them through its existing spread.
- FE drops the three columns, adds a card headed *"He may exercise the above duties as follows:"*.
- **No migration** — the dev DB is being cleared, so old rows keep their now-unread fields until then (Qusai's call).

## The export

There was no way to produce the document the certificate exists to issue. Added `tor-certificate-020-pdf.util.ts` + `downloadPdf` + `GET …/certificate/download`, mirroring the [[Export History Form - TAT Form 031 PDF|Form 031]] export: build HTML → shared Puppeteer generator → S3 → signed URL.

**The PDF is where `nonTrainingAuthorities` finally goes.** The paper form has a *"Non-CAR147 Training Authorization Capability"* row. Earlier the same day I recorded that nothing consumed that field and it was write-only — true, but the reason was a missing output, not a dead field. Corrected on the spot by reading the artifact.

Export is deliberately allowed at **any** stage so a draft can be checked against the paper form before signing.

## Still open

- [ ] **The PDF has never been rendered.** Puppeteer has not run against this template once — column widths, the signature `<img>` embeds and page fit are all unexercised. Expect a layout pass on first real export.
- [ ] **Roles render differently from the form.** The paper has four Y/N columns (Theor. Insrt. / Exam. / Pract. Insrt. / Assessor); the UI still shows one "Roles" text cell. The PDF renders the four columns correctly, so this is a UI-only divergence from the artifact.
- [ ] **`escapeHtml` / `fmtDate` duplicated a fourth time.** All three existing PDF utils define them locally, so this follows the repo idiom rather than folding a cleanup into feature work. Extracting them is its own commit and needs a new shared file, so it needs a go-ahead.
- [ ] **Open BA question, raised by phone:** is all four Form 32s being seeded `mandatory: true` even correct? If a 32C is genuinely not required for a plain Instructor, the wrongness starts in the seed data, not the reader.
- [ ] **Dev fixtures named after statuses** — aircraft types *"A320 Approved (TOR Dev)"*, *"A320 Rejected (TOR Dev)"* (codes `TOR-DEV-APPROVED`, `2-4-3`). Those words read as statuses on the TOR page, the Form 32 pages and the TOR Matrix. **Misread three separate times in one session**, twice by me. Renaming them is cheap and prevents a recurring false diagnosis.

## Related

- [[TOR Sync Never Re-Ran - Stale BullMQ Job Id]] — the real activation blocker, found in the same investigation
- [[Final TOR Certificate Never Available - Unfiltered Mandatory Templates]] — the display bug, corrected
- [[TAT-455 Final TOR Certificate - SA Publish Gate]] · [[TAT-450 TOR Certificate FE - Read Path Only]]
- [[Export History Form - TAT Form 031 PDF]] — the export precedent copied
- [[Staff Management Subsystem & TOR Model]] · [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Patterns - Method & Conventions]] — reading the real artifact beat reasoning from the code
- [[Code Quality]] · [[Systems Thinking]]
