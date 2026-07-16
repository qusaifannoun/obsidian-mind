---
date: 2026-07-15
description: "FE/BE drift — backend PENDING_PIC serializes as 'pending' but the FE expects 'pending_pic', so the reviewer's Approve/Reject block never rendered and the badge was blank."
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
---

# Aircraft Qualification Approval Invisible — Status-String Mismatch

> [[tat-prereq]] bug: an instructor-submitted aircraft qualification sat in limbo — the reviewing PIC saw no Approve/Reject controls and a blank status badge — because the frontend's status literal never matched what the backend actually sends. Repo: [[tat-prereq]]. Domain: [[Staff Management Subsystem & TOR Model]].

## Root cause

The backend enum value and the frontend literal for the same state **disagree on the wire**:

- Backend `StaffAircraftQualificationStatus.PENDING_PIC` serializes as **`"pending"`** (`enums.ts:1184`). External-teaching activities share the same value (`enums.ts:1192`).
- The FE type and **every** comparison expect **`"pending_pic"`** (`qualification.ts:14`).

So an instructor-submitted qualification arrives with `status: "pending"`, which:

- never matches the reviewer gate `canReview && status === 'pending_pic'` (`TorQualifications.tsx:238`) → the **Approve/Reject block never renders**, and
- misses `STATUS_LABEL["pending"]` / `STATUS_STYLE["pending"]` (both `undefined`) → a **blank badge**.

Every other status value matched byte-for-byte; **only `pending` differed**, which is why the rest of the qualifications UI looked fine and this one state silently dead-ended. Instructor stuck waiting, admin had no action to take.

## Evidence

```
enums.ts:1184   PENDING_PIC = "pending"           (backend, authoritative)
enums.ts:1192   external-teaching                 (same value)
qualification.ts:14   FE type expects 'pending_pic'
TorQualifications.tsx:238   gate = canReview && status === 'pending_pic'
```

## Fix

Normalize at the **fetcher boundary** — `src/api/Qualifications/qualifications.ts` maps `"pending" → "pending_pic"` on every read, for both `StaffQualification` and `ExternalTeachingActivity`. One translation point; the rest of the FE keeps comparing against its own `'pending_pic'` literal unchanged.

- **No write-side mapping** — `status` is server-controlled, so nothing sends it back.
- Privileged **auto-approve-on-submit** left intact (intended behavior).

**Touches:** `src/api/Qualifications/qualifications.ts`

## Still open

- [ ] **Not browser-verified.** Submit a qualification as a **non-privileged** instructor, confirm the PIC now sees Approve/Reject + the correct badge, then round-trip **approve** and **reject**.

## Related

- [[tat-prereq]] · [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]]
- [[Pending Review Requests - Reviewer Worklist]] — the reviewer approve/reject worklist this state feeds
- [[TAT-423 Assessment Report Rubric]] — reads `StaffQualification` (APPROVED) for eligible assessors; same qualification domain
- [[Staff Creation Blocked - qualificationTrackingMode Enum Bug]] — sibling FE/BE enum mismatch in the same subsystem
- [[Gotchas#The same state has two names — backend serializes PENDING_PIC as 'pending', the FE expects 'pending_pic' (2026-07-15)]]
- [[Patterns]] — keep the FE enum mirrored to the backend; this is the read-boundary corollary
