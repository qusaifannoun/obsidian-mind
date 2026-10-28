---
date: 2026-10-28
description: "The backend's basic_info_approved History Form status was unknown to tat-prereq, which showed Draft and re-offered Submit; now Basic Info Approved"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-520
---

# History Form Basic Info Approved Shown as Draft

**Status (as of 2026-10-28):** fixed on every branch, not browser-tested. Part of [[Staff Management QA - Oct 2026]].

## Root cause

`approveBasicInfo` sets `basic_info_approved`; full `approved` comes later — through the sit-in for instructors, or a direct Training Manager approval for others. tat-prereq's `HISTORY_STATUS` map lacked the value and fell back with `?? 'Draft'`, so the form, the TOR card and the instructor all saw Draft, and the instructor was offered "Submit for approval" again (which the backend refuses).

**Evidence:** `StaffHistoryFormStatus.BASIC_INFO_APPROVED = "basic_info_approved"`; TAT-417 AC-23 says the *basic information* status becomes Approved.

**Fix:** [[tat-prereq]] `b55c5f7` — new **Basic Info Approved** status: green badge, not editable, "Basic information approved." message.

## Still open

- [ ] The label wording is Qusai's session choice, not the BA's.

## Related

- [[TAT-409 Staff Management Subsystem]] · [[tat-prereq]]
