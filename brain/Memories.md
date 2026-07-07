---
date: 2026-06-02
description: "Index of memory topics — key decisions, patterns, gotchas, people context"
tags:
  - brain
  - index
---

# Memories

Persistent context and knowledge retained across sessions. Each topic lives in its own note — follow the links.

- [[Key Decisions]] — architectural and workflow decisions worth recalling
- [[Patterns]] — recurring patterns and conventions discovered across work
- [[Gotchas]] — things that have bitten before and will bite again
- [[People & Context]] — org structure, teams, review history, dynamics
- [[North Star]] — living goals document, read at session start
- [[Skills]] — custom slash commands and workflows

## Recent Context

- **2026-07-06** — TAT-409 fix cycle: the backend shipped a fix drop (commit `db6922f7` "TAT Gap list" + TAT-422/423/424/429) — re-verified **18 of 37 gaps fixed**, incl. the **keystone** (`tor.aircraftTypeIds` now populated) and a new `requestedRoleCodes` concept using the **same role→form mapping** as [[tat-prereq]]'s FE gate. Then fixed + **shipped 6 FE gaps to `main`** (M5 cert preview, M6 request-course-online, M8 pagination, M9 server-side role gating, M12 AD editor, H8 2y window), **removed all dummy data + the dev-auth bypass**, and **verified live in-browser** (M5/M6/M9 confirmed). See [[TAT-409 Bug & Gap List]] resolution status. New [[Gotchas]]: sharing HTML in Teams (JS stripped + UTF-8 mojibake → prefer `.docx`); IDE TS-server falls back to `any` on React-Query data where batch `tsc` passes (fix with explicit param annotations).
- **2026-07-05** — Completed the full [[TAT-409 Ticket Groups & Inspection Map|TAT-409 functionality inspection]] (all 11 groups, backend + FE vs Jira ACs). Output: [[TAT-409 Bug & Gap List]] — 37 gaps by severity + platform + fix (`.md`/`.html`/`.docx`). Keystone defect: `tor.aircraftTypeIds` is never populated (cascades into 422 create, 424 eligibility pickers, Form 32 role-scoping). Also shipped the [[tat-prereq]] FE Form 32 role gate (hide A/B/C/D by the TOR owner's roles) + section-status recompute fix, verified in-browser. New [[Gotchas]]: Form 32 privileged-editor unimplemented (AD 403), History Form 3-approval eligibility chain + arbitrary sit-in evaluator, training-history-requires-approval divergence, static-HTML-for-Teams + docx-for-encoding.
