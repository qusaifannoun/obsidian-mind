---
date: 2026-11-19
description: "Initial TOR Documents had no audit log; Hamza's endpoint now feeds a shared AuditTimeline that also drives the History Form activity log"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-591
---

# TAT-591 Initial TOR Documents Audit Log

**Status (as of 2026-11-19):** [[tat-prereq]] `8af78de` on dev, prepod and main (fast-forward to `cfe0467`). Jira READY FOR QA. **Not opened in a browser.** The backend (`624db026`) is on [[tat-app-ws Backend]] `dev` only, so prepod and master return nothing yet.

## Context

QA (TAT-491 PreRequisites V3): the Initial TOR Documents section had no log of who uploaded, removed or reviewed each file. Hamza added `GET tors/:torId/documents/audit-log` (action `SMVS`), returning `{ data: [{ event, docType, actorName, from, to, createdAt }], totalCount }`.

## What changed

- New `components/documents/InitialDocumentsAuditLog.tsx`: a collapsible card under Initial Documents on the TOR page, shown to SA, AD, QM and TM only (`hasPrivilegedEditorRole`). Instructors can't call the endpoint.
- Each line shows the document, the event, who did it and when, plus "Removed:" / "Added:" file names.
- `HistoryFormAuditTimeline.tsx` now exports a generic `AuditTimeline<TKey>({ title, query, labelFor, detailFor })`, so the History Form log and this one share one timeline (searched `components/` for an existing timeline: found the History Form one and generalised it rather than copying it).
- Both logs use the TanStack `queryOptions` pattern (`initialDocumentsAuditLogQuery`, `historyFormAuditLogQuery`). Calling a hook inside a callback failed `rules-of-hooks`; making `AuditTimeline` generic over `QueryKey` fixed the TS variance error.
- `invalidateAfterDocumentChange` also invalidates `DocumentsQueryKey.AuditLog`, so the log updates after any upload, removal or review.

## Evidence

- tat-prereq `tsc` clean, ESLint clean on the changed files.

## Still open

- [ ] Not opened in a browser.
- [ ] Hamza's backend must reach prepod and master (merge tat-app-ws `dev`) before QA can test there.

## Related

- [[TAT-598 Super Admin Delete Form 32]]: the other half of the same frontend batch over Hamza's backend
- [[TAT-602 Portal Login Replays a Cached Redirect]]
- [[Staff Profile & TOR Page Simplification]]: the TOR page this sits on
- [[tat-prereq]] · [[tat-app-ws Backend]]
