---
date: 2026-10-28
description: "Deleting a license used only by TORs hard-deleted it, orphaning 28 staging TORs with no forms; guard added, data repaired with a dry-run-first migration"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-501
---

# Deleted Licenses Orphaned 28 Staging TORs

**Status (as of 2026-10-28):** guard and label fixed on every branch; **staging data repaired and checked** 2026-10-27. Part of [[Staff Management QA - Oct 2026]]. Tickets: TAT-501 (Form 285 missing on CARC TORs), TAT-504 (CARC card 1 vs 29), and it also explained TAT-516 (nameless CARC cards).

## Root cause

`LicenseService.deleteLicense` hard-deletes unless `isLicenseUsed` finds the license in a **course or certificate template** — it never checked staff TORs or TOR form templates. Two licenses the dev seed created on 2026-06-17 (`6a32deb6…872` = CARC, `…87f` = GCAA) were deleted; 28 TORs kept pointing at them. The backend returned `license: null` → no templates → no Form 285, 32, assessment or certificate (TAT-501). tat-prereq's `mapLicenseType` fell back to `'CARC'`, so they looked like CARC rows while the card counted only the real CARC license (TAT-504).

My first theory — duplicate CARC license documents — was wrong; the staging API showed only one CARC license.

## Evidence

- Staging `torCountByLicenseType` before: EASA 27, deleted `…872` 15, deleted `…87f` 13, GCAA 3, CARC 2.
- Orphan TOR `6a967981…2854`: `license=null`, `sections=[]`.
- `…87f` = GCAA because all 13 of its users already held a TOR on the current EASA license (one TOR per authority).
- Dry run: 27 TORs to re-attach, 58 forms to re-link, 1 skipped (dania 11111 already has a GCAA TOR), 6 seed-junk forms left.
- After `--apply`: cards EASA 27 / CARC 17 / GCAA 15 / deleted 1 — equal to the rows. dania 11111's CARC TOR now lists `form_285, form_32a, form_32b, assessment_report, tor_certificate`.

## Fix

- [[tat-app-ws Backend]] `d9d24a91` — `StaffTorService.isLicenseUsedByTors`; a license TORs use is archived, not deleted. tat-ws's license table already switches Delete → Archive on `isUsed`.
- `11dda59d` — `scripts/migrations/2026-10-27-reattach-tors-to-current-license.js`: dry run unless `--apply`, CARC inferred from a Form 285 template, others via `--map=<id>:<authority>`. Applied on `tat-dev` 2026-10-27 with `--map=6a32deb6d65894472448d87f:GCAA`.
- [[tat-prereq]] `dbca637` — a TOR with no license shows "Unknown", not "CARC".
- Database access: Qusai pointed his `qusai- TAT` Atlas IP access entry at `176.29.246.191`.

## Still open

- [ ] dania 11111's duplicate GCAA TOR `6a7c60c6…` is still on the deleted license (shows Unknown).
- [ ] 6 June-seed forms sit on wrong templates; one pending "285 Form" still shows in Pending TORs for Tor Instructor Dev.
- [ ] 2 user profiles still list a deleted license in role licenses.
- [ ] "Dania IN" has 3 EASA TORs — the `{userId, licenseId}` unique index is probably not enforced (unverified).
- [ ] tat-app-ws `prepod` history contains a committed `deploy_key` — rotate it.

## Related

- [[Gotchas - Backend Services & Environment]] — the license-delete trap
- [[Staff Management Subsystem & TOR Model]] · [[tat-app-ws Backend]] · [[tat-prereq]]
