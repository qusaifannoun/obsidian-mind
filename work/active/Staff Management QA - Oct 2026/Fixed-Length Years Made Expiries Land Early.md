---
date: 2026-10-28
description: "TOR expiry, training due and refresher dates used 365.25-day years and 30-day months, landing 12 hours to a day early; now calendar arithmetic"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-514
---

# Fixed-Length Years Made Expiries Land Early

**Status (as of 2026-10-28):** fixed on every branch; **existing stored dates not recomputed**; backend inert until deployed. Part of [[Staff Management QA - Oct 2026]]. Tickets: TAT-514 (TOR dates), TAT-522 (training due date).

## Root cause

TOR expiry (2 × 365.25 days), training due date (730.5 days), training refresher (−30 days) and aircraft refresher (years × 365.25 days, −30 days) were fixed millisecond spans. Across a leap year they end 12 hours to a day early. The TOR page also printed raw ISO dates.

## Evidence

- `2026-08-12T12:08` → old expiry `2028-08-12T00:08`, new `12:08`.
- Accomplished `2026-09-01` → old due `2028-08-31`, new `2028-09-01`; `2026-06-15` → due `2028-06-15`, refresher `2028-05-15`.
- `calendar-date.util.spec.ts`: 5 passing. The aircraft refresher spec asserted the old 365.25 formula; updated to the calendar date, 10/10 pass.

## Fix

- [[tat-prereq]] `304df43` — readable TOR creation and expiry dates.
- [[tat-app-ws Backend]] `726c9360` — TOR expiry in calendar years.
- `55bfada2` — shared `calendar-date.util.ts` (`addYears`/`addMonths`, UTC, clamps to month end).
- `a9d26fcc` — training due date, refresher and 2-year window (TAT-522).
- `24b357bb` — aircraft refresher expiry and reminder (no ticket, approved by Qusai).

## Still open

- [ ] Existing TORs, training records and refreshers keep their old dates until recomputed — a dry-run data fix was offered, not written.

## Related

- [[Gotchas - Backend Services & Environment]] — the fixed-length-year trap
- [[tat-app-ws Backend]] · [[tat-prereq]]
