---
date: 2026-10-28
description: "History entries on documents, Form 32, Form 285 and the History Form now show date and time; Form 32 uploads show file names"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-515
---

# History Lists Show Date-Time and File Names

**Status (as of 2026-10-28):** fixed on every branch, not browser-tested. Part of [[Staff Management QA - Oct 2026]]. Tickets: TAT-515, TAT-519.

Four history renderers printed `at.slice(0, 10)`, and Form 32 upload entries used the S3 key (`bucket/tor-form-32/…`) as the file name.

## Fix

- `07f87a8` — the History Form timeline's formatter moved into `lib/date` as `formatDateTime`; four copies of the key-to-file-name logic moved into `lib/file-url` as `fileNameFromKey`. No behaviour change.
- `e96c78d` — Initial TOR Documents, Form 32, Form 285 and the History Form show date and time; Form 32 shows file names.

**Evidence:** `formatDateTime` → `26 Oct 2026, 16:19`; `fileNameFromKey("bucket/tor-form-32/1793015858762-8fa49o6cqfKUGW71GRPYrq.jpg")` → `1793015858762-8fa49o6cqfKUGW71GRPYrq.jpg`.

## Related

- [[tat-prereq]]
