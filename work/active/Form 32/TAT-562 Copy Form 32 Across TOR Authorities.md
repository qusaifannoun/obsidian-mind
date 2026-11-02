---
date: 2026-11-01
description: "After saving a Form 32 the owner can copy it as a draft to their other TOR authorities — only TORs that exist and use that form, no duplicates, evidence reused"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-562
---

# TAT-562 — Copy Form 32 Across TOR Authorities

dania's ticket: after saving a Form 32, ask *"Would you like to copy this Form 32 to another TOR Authority?"*; on Yes pick one or more of CARC / EASA / GCAA (not the current one); each copy is separate, keeps type, aircraft, category, fields, options and evidence, follows its own approval, and duplicates are prevented.

**Status (as of 2026-11-01):** on `dev` and merged into `prepod` in [[tat-app-ws Backend]] and [[tat-prereq]]. **No spec, nothing run in a browser.**

## Model facts that shaped it

- One TOR per staff member per license (`StaffTor` unique index `{ userId, licenseId }`), and each authority has its own Form 32 templates. An instance is keyed by `torId` + `templateId` + `instanceKey` (= aircraft type id).
- The Form 32 service never deletes evidence files, so copies safely reuse the source `fileKey`s.
- The owner's only save paths are **Submit Form** (save → submit → back) and, for an owner who is also a reviewer, **Save & approve** — there is no plain Save button.

## Decision

Copy only to authorities where the staff member **already has a TOR that qualifies for this form** (`formKeyMatchesRequestedRoles` + a template for that license). No TOR is created by copying. Qusai: "the task explains it — only for available".

## Built

- [[tat-app-ws Backend]] `59b77b10`:
  - `GET tors/:torId/form-32/:formKey/:aircraftTypeId/copy-targets` → `{ torId, authority, alreadyExists }[]`.
  - `POST …/copy` `{ targetTorIds }` → creates draft copies (`status MISSING`, stage `DRAFT`), audit `FORM_CREATED` per target.
  - Validates every target first, then creates (all or nothing on bad target / duplicate). `form32CopyTargetInvalid` error added.
  - Copy keeps name, date, aircraft, category, each section's option / file / file history / notes; drops rejections, assessment and review history.
- [[tat-prereq]] `7620c16`: `Form32CopyDialog` (Yes / No, then checkboxes; authorities that already have the form are disabled). Shown to the form's owner after either save path, only when an authority without the form exists; on submit it opens before navigating back.

## Still open

- [ ] Browser-test: copy 32B from CARC to EASA; the EASA draft opens with the same answers and evidence; a second copy attempt shows EASA disabled.
- [ ] No spec for `copyInstance` / `listCopyTargets` (no Form 32 service test harness exists).
- [x] ~~Copying is offered only to the owner~~. Ayat failed it on 2026-11-01: the Super Admin's "Save & approve" showed no prompt. [[tat-prereq]] `c54dd7a` now offers the copy to the owner **and** SA/AD/QM/TM (the backend's `FORM_32_AUTO_APPROVE_ROLES`), after "Save & approve" and after approving. On dev + prepod; **not browser-run**.
- [ ] Her second case was correct behaviour, to explain to Ayat: the instructor's CARC submit showed no prompt because the EASA A350 32B already existed (`alreadyExists`), and the ticket forbids duplicates.
- [ ] Move TAT-562 back to READY FOR QA.

## Related

- [[Form 32 PDF Option Marks, 32B Page Spill & Editor Gaps]] · [[Instructor Type - Per-Authority Form 32 Split]]
- [[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]] — the same `requestedRoleCodes` gate decides copy targets
- [[Staff Management Subsystem & TOR Model]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Index|Work Index]]
