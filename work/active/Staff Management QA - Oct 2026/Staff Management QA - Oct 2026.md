---
date: 2026-10-28
description: "Hub for Ayat's QA bug batch on staging Staff Management (TAT-496 to TAT-522), all fixed and synced to every branch, none browser-tested"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-496
---

# Staff Management QA — Oct 2026

**Status (as of 2026-10-28):** every ticket below has a fix on all branches. Synced 2026-10-28 by merging `dev` (tat-prereq `dev b55c5f7` → `prepod d69f1b1` / `main f5369df`; tat-app-ws `dev 24b357bb` → `prepod 0ac8e5ec` / `master 36c3f241`). **Nothing has been browser-tested**; backend changes are inert on staging until deployed.

QA bug reports from Ayat Obeidat on staging Staff Management, filed 2026-10-26/27 against the done TAT-409 stories. Each ticket carried screenshots, downloaded via `.claude/scripts/jira.mjs` — see [[Skills]] for the attachment recipe.

| Ticket(s) | Note |
|---|---|
| TAT-501, TAT-504, TAT-516 | [[Deleted Licenses Orphaned 28 Staging TORs]] |
| TAT-499 | [[TOR Matrix Status Used Unfiltered Templates]] |
| TAT-496, TAT-505 | [[Session and Cache Leaks Across Logins]] |
| TAT-508 | [[Instructor Type Per Authority Must Be Chosen]] |
| TAT-510, TAT-511 | [[Staff Date of Birth Fails on Edit and Add]] |
| TAT-515, TAT-519 | [[History Lists Show Date-Time and File Names]] |
| TAT-514, TAT-522 | [[Fixed-Length Years Made Expiries Land Early]] |
| TAT-520 | [[History Form Basic Info Approved Shown as Draft]] |

## Process decisions from this batch

- Branches are synced by **merging `dev`** — no cherry-picks, no force-push. A planned history rewrite was stopped because others work on these repos. See [[Patterns - Method & Conventions]].
- Commit and GitHub text is **a header plus bullets** — now global HARD RULE 5.

## Related

- [[TAT-409 Staff Management Subsystem]] · [[tat-prereq]] · [[tat-app-ws Backend]] · [[TAT Platform]]
