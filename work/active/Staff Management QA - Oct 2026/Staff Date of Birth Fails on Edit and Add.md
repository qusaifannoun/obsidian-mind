---
date: 2026-10-28
description: "Edit Staff showed an empty date of birth and Add Staff without one hit a raw ISO 8601 API error; both fixed in tat-prereq"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-510
---

# Staff Date of Birth Fails on Edit and Add

**Status (as of 2026-10-28):** fixed on every branch, not browser-tested. Part of [[Staff Management QA - Oct 2026]]. Tickets: TAT-510, TAT-511.

## Root cause

- The API returns `dateOfBirth` as `"1998-01-01T00:00:00.000Z"`; a native date input needs `"1998-01-01"`, so Edit showed empty (TAT-510).
- An empty date was sent as `""`, which `@IsDateString() @IsOptional()` rejects — `@IsOptional` only skips null/undefined (TAT-511).

## Evidence

Staging `/user/details` values: `"1998-01-01T00:00:00.000Z"`, `null`, `undefined`. `toDateInput` on them: `"1998-01-01"`, `""`, `""`.

## Fix

- `815060b` — the three copies of dropping an empty office location moved into `withoutEmptyOptionalFields`; no behaviour change.
- `06945af` — Edit loads the date through the existing `toDateInput`; every staff save leaves an empty date of birth out.

## Still open

- [ ] Clearing a stored date of birth in Edit Staff can't remove it (the omitted field keeps the stored value).

## Related

- [[tat-prereq]]
