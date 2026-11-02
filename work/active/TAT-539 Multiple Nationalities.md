---
date: 2026-11-02
description: "Hamza's backend swapped nationality/nationalId for a nationalities list and went to staging; every frontend profile save failed until all three apps moved over"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-539
---

# TAT-539 — Multiple Nationalities

**Status (2026-11-02):** frontends moved in all three apps, on `dev` + `prepod`. **Built and typechecked only. Nothing has been saved against staging yet.**

## Context

The ticket asks for more than one nationality per user, each with its own National ID (required) and ID image (optional), in Staff Management and the Dashboard. Hamza built the backend in [[tat-app-ws Backend]] `2ac489b0` and deployed it to staging on 2026-11-01. The frontends hadn't been updated.

## Root cause of the breakage

- `2ac489b0` removed `nationality`, `nationalId` and `nationalIdImage` from the User schema and DTOs. It replaced them with `nationalities: [{ nationality, nationalId, nationalIdImage | null }]`.
- The API's `ValidationPipe` runs with `whitelist` + `forbidNonWhitelisted`, so the old fields are now **rejected**. As a result, every profile save in [[tat-prereq]], [[tat-portal]] and [[tat-ws]] returned a 400 once staging ran the new code.
- The list **replaces the whole set**. An entry sent without its `nationalIdImage` stores `null`, which wipes the image. → [[Gotchas - Frontend Data & API Contracts#`nationalities` replaces the whole list — send each existing ID image back or it is wiped (2026-11-02)]]
- Completeness now requires `nationalities`. No migration was written; no migration needed: the database was cleared (per Qusai, 2026-11-02).

## Evidence

- Staging `/api/docs-json` lists `"nationalities"` and `tor-documents/{docType}/files`. Production `api.tat147.com/api/docs-json` has neither. Checked 2026-11-02.

## Fix

| Repo | Commit | Change |
|---|---|---|
| [[tat-prereq]] | `36992c3` | New `StaffNationalitiesField` (`useFieldArray`; the first use of field arrays in the repo). `toStaffBody` uploads each entry's image and keeps existing ones. ID image is no longer required on create. |
| [[tat-portal]] | `0831707` | New `NationalitiesField`. `uploadFile` was ported from tat-prereq `api/Staff/fetchers.ts` into `api/Profile/fetchers.ts`. The profile view lists every nationality. |
| [[tat-ws]] | `14ef2559` | `NationalityFields`, modelled on `DynamicDocumentFields`. The shared `schema/nationality.schema.ts` (approved new file) is used by `user`, `updateUser` and `adminUpdateUser`. The profiles list and the trainee profile show every nationality. |

**Decision:** tat-portal gets the full editor too, not a read-only view (Qusai, 2026-11-02), even though the ticket only names Staff Management and the Dashboard.

## Still open

- [ ] Save a profile on staging in each app: add, remove and replace an ID image, plus a duplicate National ID (should return "already used").
- [x] ~~Nationality data migration~~: no migration needed: the database was cleared (per Qusai, 2026-11-02).
- [ ] The [[tat-portal]] country picker has only 28 countries and stores Intl region names, not the `/country` names the other two apps use. A spelling mismatch can slip past the "only once" rule.
- [ ] Unused old-field code in [[tat-ws]]: `DynamicFormGenerator.tsx`, `libs/configs/IntSignUpSchema.ts`, and two `ProfilesList.tsx` copies.

## Related

- [[TAT-541 Multiple File Uploads]]: same deploy
- [[Staff Self-Service Polish - Nationality, Password, Profile Data]]: where nationality became a `/country` select storing the country name
- [[Staff Management Subsystem & TOR Model]]
- [[TAT-492 + TAT-493 Staff Editing Moves to Staff Management]]
