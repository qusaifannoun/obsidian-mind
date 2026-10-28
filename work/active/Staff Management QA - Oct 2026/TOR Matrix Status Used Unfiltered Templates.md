---
date: 2026-10-28
description: "TOR Matrix and pending-TOR statuses counted mandatory forms a TOR doesn't need, so once-active TORs showed Paused there and Active on their page"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-499
---

# TOR Matrix Status Used Unfiltered Templates

**Status (as of 2026-10-28):** fixed on every branch, **not verified** against QA's five TORs after deploy. Part of [[Staff Management QA - Oct 2026]].

## Root cause

`getTorMatrix` (`staff-management.service.ts:459`) and `filterIncompleteTors` (`:1727`) passed **every** mandatory template of the license to `evaluateTorCompletion`. The TOR page first runs `filterTemplatesByRequestedRoles`. Forms a TOR doesn't need counted as missing, so a once-active TOR derived **Paused** in the matrix and **Active** on its page. Same family as [[Final TOR Certificate Never Available - Unfiltered Mandatory Templates]].

## Fix

- `af94ab1a` — the three existing copies of the filter (`:1070`, `:1676`, `loadTemplatesForTor`) moved into one `applicableTemplates` method; no behaviour change.
- `00146f22` — the matrix and the pending-TOR list use it.

## Related

- [[tat-app-ws Backend]] · [[Staff Management Subsystem & TOR Model]]
