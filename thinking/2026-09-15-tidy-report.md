---
date: 2026-09-15
description: "Tidy pass receipt — three oversized notes split verbatim with every section link retargeted; five cluster flags judged unrelated; nothing archived or deleted"
tags:
  - thinking
---

# Tidy Report 2026-09-15

Receipt for one `/om-tidy` pass. Uncommitted — review the working tree. Delete once read.

## Actions taken

**Splits (verbatim, zero loss)** — each moved section was asserted byte-identical in its destination and every kept section unchanged:

| Source | Before → after | New note | Moved |
|---|---|---|---|
| [[Gotchas - Backend Services & Environment]] | 25KB → 15.8KB | [[Gotchas - Seeding & Notifications]] | 5 sections, 9.8KB — seed-time URLs, destructive re-seeding, skipped mappings, the `SystemActions` enum gate, `destination` drift |
| [[Gotchas - Frontend]] | 29KB → 15.3KB | [[Gotchas - Frontend Data & API Contracts]] | 12 sections, 14.0KB — `isError`, cache keys, `router.refresh`, endpoint contracts, uploads, certificate hooks |
| [[Q3 2026]] | 25KB → 11.8KB | [[Q3 2026 — Competency Evidence Log]] | the whole Competency Evidence section, 13.7KB; a stub with a link stays behind |

**Wiring**
- Each source note keeps a one-line pointer to its new note; [[Gotchas]] gained two index sections with the moved one-liners (5 + 12).
- Section links retargeted vault-wide: 11 on the backend split, 25 on the frontend split, across `brain/`, `reference/`, `work/active/` and `work/archive/`. Afterwards 73 section links into the five notes were checked — all resolve (two apparent failures were a checker artefact: the heading contains `]` inside backticks; both matched exactly).
- Descriptions updated on both slimmed Gotchas notes and on [[Gotchas]] (dropped its now-wrong "six domain notes" count).
- [[Brag Doc]] Q3 row now links the evidence log.
- `MEMORY.md` regenerated from `brain/` frontmatter — both new notes listed.

**Flags cleared:** all three 25KB oversize flags.

## Judgment calls deferred

- **Cluster flags — all left ungrouped.** None share context; each pair is a token-overlap false positive:
  - "course" — [[Compose Exam - Period Chapters, Course Reset & Day Labels]], [[Course Details Show Schedule]], [[Course Purchase Important-Notes Acknowledgment Gate]], [[Online-Course Exam Timeout - Backend Bug]] — four workstreams in three repos.
  - "exam" — compose-exam (staff, tat-ws) vs exam timeout (trainee, tat-portal).
  - "backend" — [[Online-Course Exam Timeout - Backend Bug]] vs [[TAT-409 Backend Open Items]].
  - "open" — [[TAT Certificates - Open Items]] vs [[TAT-409 Backend Open Items]].
  - "sign" — [[Profile Signature Sign Button]] vs [[tat-ws Sign-Out 404]].
- **Semantic-linking pass not run** — QMD is disconnected this session. The splits carried their existing links with them; notes that link bare `[[Gotchas - Frontend]]` for a data-layer topic were not re-pointed at the new note.
- Historical line in [[Memories]] ("split into six domain notes on 2026-07-28") left as is — accurate for its date.

## Report tier

- **Open loops:** none flagged by the hygiene scan this session.
- **Competency evidence freshness (H2 2026, from 2026-07-01):** every competency has fresh inbound evidence — Systems Thinking 35, Debugging & Root Cause Analysis 28, Code Quality 22, Delivery & Scope Management 16. Counts use file mtime, so notes touched by today's link retargeting are included; treat as "none empty", not as exact figures.
