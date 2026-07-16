---
date: 2026-07-16
description: "The History Form had no export/print; added a full-stack server-generated PDF of TAT Form 031 reusing the Form 32/285 Puppeteer pipeline, aggregating six data sources across four services"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Export History Form — TAT Form 031 PDF

The [[History Form - Training & Validity Records|History Form]] had no export/print — only evidence-attachment downloads. Added a full-stack **server-generated PDF of TAT Form 031**, reusing the exact Form 32/285 machinery: `generatePdfFromHtml` (HTML → Puppeteer → A4 PDF) → S3 → signed URL → FE opens it.

## What shipped

**Backend ([[tat-app-ws Backend]]):**
- `history-form-031-pdf.util.ts` — `buildHistoryFormPdfHtml` reproduces the reference doc as bordered per-section tables: identity grid, Years of Experience, Part 66, Type Training Course (**aircraft paired 2-per-row + category**, narrow category columns), Relevant Training History, Updated Training & Validity (durations **zero-padded** `06`/`30` to match the doc), Sit Ins, Successfully assessed as, Special Notes, Certified by, `TAT Form 031 03.23` footer; dates `DD/MM/YYYY`.
- `StaffHistoryFormService.downloadPdf(actor, userId, sections)` — **owns** basic info + aircraft quals (resolving `aircraftTypeWithEngine` names from the model) + the audit log; the **controller passes in** mandatory-training, training-history and sit-in fetched from their own services. This follows the existing **compose-in-controller idiom** that `getMyHistoryForm` already uses, which sidesteps a circular DI (the mandatory/sit-in services already depend on `StaffHistoryFormService`). See [[Patterns#Server-generated form PDFs — reuse the shared Puppeteer pipeline; aggregate cross-service data in the controller]].
- Routes `GET profiles/me|:userId/history-form/download`, gated `@Action(SM_VIEW_STAFF)` (view ⇒ export — no new permission grant).

**Frontend ([[tat-prereq]]):** `downloadHistoryFormPdf` fetcher + an Export PDF button in the History Form header (shared `<Button>`, opens the signed URL).

## Two non-obvious data findings

1. The aircraft **name** and **category (B1/B2)** are NOT on the matrix/qual read DTOs — the name is resolved from `AircraftTrainingTypes.aircraftTypeWithEngine`. (Same gap the [[Aircraft Category Filter - TOR Matrix]] work hit from the other side.)
2. **"Certified by" has no form-level `approvedBy` field** — `approveBasicInfo` *wipes* `basicInfoFieldReviews` on approval, so the only persistent record of the approver identity + date is the **audit log** (event `HISTORY_FORM_APPROVED` → `actorName`/`createdAt`). See [[History Form Audit Log]] and [[Gotchas#Certified-by / approver identity lives only in the audit log — the form wipes field reviews on approval (2026-07-16)]].

## Evidence

- Backend `tsc` on `dtos` + `database` + `api` app all exit 0; FE `tsc` + `eslint` clean.
- **Template verified:** ran the exact builder + the same Puppeteer wrapper with the reference doc's data and rendered the PDF — faithful single-page match (title, identity, aircraft pairing/category, all 7 updated-training rows, certified-by, footer).
- Committed `dev`: [[tat-app-ws Backend|tat-app-ws]] `1541a3f8` + [[tat-prereq]] `4d3a82b`.

## Still open

- **Not run against a live DB record** — aircraft-name resolution, audit-log "Certified by", and sit-in aggregation are wired + typecheck-clean but unexercised end-to-end. Not browser-verified.
- Puppeteer needs Chromium on the server (Form 32/285 already rely on it).
- **Product confirm:** the "Certified by" *role* is hardcoded `Training Manager` (matches the doc) — if QM/SA can also approve, derive the approver's actual role.

## Related

- [[Export Assessment Report - TAT Form 032 PDF]] — sibling feature, same Puppeteer/S3 pipeline
- [[History Form - Training & Validity Records]] · [[Staff Management Subsystem & TOR Model]] · [[History Form Audit Log]]
- [[Aircraft Category Filter - TOR Matrix]] · [[Staff Management - Unreachable Backend Endpoints]]
- [[TAT-409 Staff Management Subsystem]] · [[tat-prereq]] · [[tat-app-ws Backend]]
