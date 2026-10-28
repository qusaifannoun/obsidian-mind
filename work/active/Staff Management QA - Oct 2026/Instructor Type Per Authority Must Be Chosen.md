---
date: 2026-10-28
description: "Add New Staff silently pre-selected None for each authority; now each instructor authority must be chosen, None still allowed"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-508
---

# Instructor Type Per Authority Must Be Chosen

**Status (as of 2026-10-28):** fixed on every branch, not browser-tested. Part of [[Staff Management QA - Oct 2026]].

Add New Staff pre-selected **None** for CARC, EASA and GCAA, so an instructor could be created with no authorization. TAT-448 AC-01 requires the SA to specify each; AC-03 and AC-06 keep None a valid choice.

**Fix:** [[tat-prereq]] `054e40e` — authorities start unselected and are required whenever the staff member holds IN. Edit Staff is unchanged.

## Still open

- [ ] `fetchers.ts:258` only sends `instructorAuthorities` when IN is the **primary** role — likely Hamza's TAT-498 (In Progress), not touched.

## Related

- [[Instructor Type - Per-Authority Form 32 Split]] · [[tat-prereq]]
