---
date: 2026-10-01
description: "tat-ws /proposal-test page fills a sample proposal .docx template in the browser with docxtemplater — Node render verified, browser path never run, committed as 89e6214"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-ws
---

# Proposal Generator - Word Template Spike

**Status (2026-10-11): committed as [[tat-ws]] `89e6214`, pushed to `origin/dev` + `origin/prepod` 2026-10-11. Typecheck + lint clean; the browser path has never been run.**

## Context

A test page proving [[Decision - Word Templates for Generated Documents]] before real forms are built that way. It renders entirely in the browser, so no backend change was needed. Approach and template rules: [[Word Template Document Generation]].

## What was built

- `/proposal-test`, a form for Super Admin + Admin (React Hook Form + zod): client, proposal, "prepared by" details, and pricing items you can add and remove. **Generate Word Document** downloads `Proposal - <Client Company>.docx`.
- `apps/tat-ws/public/templates/proposal-template.docx`: a sample proposal with a cover page and seven sections (Introduction, Needs, Scope, Timeline, Investment, Terms, Acceptance). It has 15 scalar placeholders plus an `{#items}` row loop in the Investment table, and placeholders in the header and footer too.
- `src/app/(private)/proposal-test/hooks/useGenerateProposal.ts`: fetches the template, works out the formatted amounts and `totalPrice`, renders it, and downloads it through the existing `downloadBlob` (`utilities/documentViewerUtils.ts`).
- `src/schema/proposal.schema.ts` and a `proposalTest` entry in `libs/configs/src/lib/routes.ts`.
- New dependencies: `docxtemplater` and `pizzip`.

## Verification

- **Exercised:** the template was rendered with sample data through docxtemplater in Node. The output had **0** leftover `{` in the body, header or footer; the items loop produced one row per item; the client company filled all 5 body occurrences.
- `tsc` over `apps/tat-ws` reports one error, `specs/index.spec.tsx` (missing `@testing-library/react`). It is **pre-existing**: the same single error with the changes stashed.
- **Not exercised:** the page in a browser, fetching the template from `/public`, the download, and how the generated file looks in Word 2016.

## Action Items

- [ ] Run `/proposal-test` as Super Admin and open the downloaded `.docx` in Word
- [ ] Decide where rendering runs in production (browser vs [[tat-app-ws Backend]])
- [ ] Design template storage that bypasses the upload endpoint's PDF conversion
- [ ] Decide whether the spike is committed or removed once a real form replaces it

## Related

- [[TAT-481 Super Admin Forms Browser]] · [[TAT-484 Assigned Forms Inbox]] — the TAT-314 Forms stories this work belongs to
- [[Decision - Word Templates for Generated Documents]]
- [[Word Template Document Generation]]
- [[tat-ws]]
