---
date: 2026-07-16
description: "Removed the raw S3 filename from each TOR-document history-log entry (display-only); the underlying unbounded history growth + orphaned S3 objects remain a backend follow-up"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-prereq
---

# TOR Document History — Hide File Key

Each `InitialDocuments` history entry (`Uploaded/Approved vN …`) printed the raw S3 filename/link. Qusai wanted it hidden. Removed the `{ev.fileName && …}` block — **display-only**; the current-file link in the main row is unchanged, rejection reasons still show.

Committed `dev` `c5396b0`. `tsc` + `eslint` clean.

## Still open — the real issue is backend

This is a UI hide, not a fix. The reason history accumulates is that **`replaceDocument()` pushes the old version onto `history` unbounded** and leaves the **superseded S3 objects orphaned** (never deleted). If storage growth ever matters, the fix is backend: cap/prune history + delete superseded keys — a companion to the dead-endpoint / capability-gap work in [[Staff Management - Unreachable Backend Endpoints]].

## Related

- [[Staff Management - Unreachable Backend Endpoints]] — same subsystem's backend gaps
- [[tat-prereq]]
