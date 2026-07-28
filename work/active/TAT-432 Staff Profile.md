---
date: 2026-06-04
description: "Progress tracker for TAT-432 Staff Profile Management — FE in tat-prereq, real /user/details when signed in, dummy TORs + stubbed deactivation (those backends not built)"
tags:
  - work-note
  - project/tat
status: active
quarter: Q2-2026
project: tat-prereq
ticket: TAT-432
---

# TAT-432 Staff Profile

Part of [[TAT-409 Staff Management Subsystem|epic TAT-409]] · built in [[tat-prereq]]. **Tracked here, not Jira** (working ahead of assignment — see the epic note).

Jira: [TAT-432](https://cryptonic-art.atlassian.net/browse/TAT-432) · *Fully Approved* · the Staff Profile Management page (Add New Staff / Edit Staff target).

## Scope (ACs)
Profile info + roles + contacts + status + **related TORs at the bottom** (AC-02/03/04); **Deactivate Staff** (SA only) with continue-vs-suspend qualification tracking + active-assignment guard (AC-05–13).

## Backend (see [[TAT-409 Staff Management Subsystem#Backend APIs — available vs held (staging Swagger, 2026-06-04)]])
- ✅ `GET /user/details/{id}` — profile. **Wired** (dummy fallback when no session).
- ✅ `POST /auth/internal-user/signup` — create staff (Add New). *(form not built yet)*
- ✅ `PATCH /user/admin/update-profile/{userId}` · `/change-roles/{userId}` — edit. *(form not built yet)*
- ⛔ **TORs** — no backend (TAT-410/411). Related-TORs section is **dummy**.
- ⛔ **Deactivation + qualification tracking + assignment guard** — no backend (this is TAT-432's own new BE). Dialog UI built; **confirm is stubbed**.

## Progress

### Done (2026-06-04) — Profile view
- [x] Data layer: `getStaffDetail` → `GET /user/details/{id}` (+ `dummyStaffDetail` fallback), `useStaffDetail` hook.
- [x] `StaffProfileView` at `/staff/[id]`: header (avatar, name, role badges, status, SA-only kebab → Deactivate), Contact & profile card, Assigned roles card, **Related TORs** (`StaffRelatedTors`, dummy, "Open TOR" kebab action).
- [x] `DeactivateStaffDialog` — SA only; the two tracking options + active-assignment guard note; **confirm stubbed** (backend pending).
- [x] Reusable `Card` surface + `TorStatusBadge` (Draft/Active/Paused).
- [x] Role map corrected to the real backend enum (`SA|AD|AM|CA|TM|EM|PA|QM|IV|IN|EX|TR|AU|CO|TP`).
- Verified: build + tsc + lint green; `/staff/[id]` renders.

### Done (2026-06-04) — Add New Staff form
- [x] `AddStaffForm` at `/staff/new` (SA-gated): Personal / Contact / Identity & role sections via `useZodForm`; required scalar fields + role/gender/language selects + National ID image `FileInput`.
- [x] New reusable `SelectField` (RHFInput) + `useCreateStaff` mutation (invalidates the list).
- [x] `createStaff` fetcher: uploads the ID image via `POST /file/upload-file`, then `POST /auth/internal-user/signup`; **stubbed success offline**. ⚠️ Upload + signup responses undocumented — **verify against staging**.
- Verified: build + tsc + lint green; `/staff/new` renders.

### Done (2026-06-04) — Edit Staff (inferred scope)
> [!note] No explicit edit ACs exist
> Editing is only *implied* (TAT-431 "edit"/AC-10 "profile edit page", TAT-432 story "maintain staff information" + AC-01 "Edit Staff"). The only specified profile mutation is deactivate. Backend supports it (`PATCH /user/admin/update-profile/{id}` covers role + secondaryRoles; **`email` is NOT in the DTO** → read-only in edit). Built on this inference — flag to BA if formal ACs are wanted.

- [x] Extracted shared **`StaffForm`** (`create`/`edit` modes) — `AddStaffForm` + `EditStaffForm` are thin wrappers.
- [x] `EditStaffForm` at **`/staff/[id]/edit`**: prefilled from `/user/details/{id}`, saves via `useUpdateStaff` → `PATCH /user/admin/update-profile/{id}` (email disabled, ID image optional/replace). **TORs shown at the bottom** (AC-10). Offline → stubbed success.
- [x] Routing: Manage Staff "Edit" kebab → `/staff/[id]/edit`; profile header kebab re-gains "Edit profile" → `/staff/[id]/edit`; row click still → `/staff/[id]` (view).
- Verified: tsc + lint green (build/dev skipped — not interfering with the running dev server).

### Done (2026-06-07) — Staging verification + 3 contract fixes
Drove the real Add/Edit flows against staging (logged in as a Super Admin; every fetcher is gated on `getAccessToken()`, so a session is mandatory or you only hit the dummy fallback). **GET list/details and the signup/update contracts are sound** (signup returns the user with top-level `_id` → the FE's `_id ?? user._id` parse is correct; `email`-omit on PATCH correct). But three FE bugs made create fail outright — now fixed and re-verified end-to-end. Full detail in [[Gotchas - Backend Services & Environment#Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)]].

- [x] **`nationalIdImage` required on create** — was `optional` (BE 400s without it). Fix: per-mode `superRefine` in `StaffForm` (required on create, optional on edit). Verified: create with no image now blocks client-side with "National ID image is required" — no bad request sent.
- [x] **`uploadFile` parsed the wrong keys** — `/file/upload-file` returns `{ Location, Key }`; FE read `url`/`fileUrl`/`key` → got `''` → image silently dropped → create failed even *with* a file. Fix: read `data.Location` first. Verified: editing the test record's image produced a fresh S3 URL on the profile.
- [x] **`officeLocation` is an ObjectId, not free text** — `"HQ"` → 500 cast error. Fix: new `src/api/OfficeLocation/` module (`GET /office-location`, dummy fallback) feeding a `SelectField` keyed by `_id`; fetcher omits the field when blank; `StaffDetail` now carries `officeLocation` (id) + `officeLocationName` (display). Verified: edit → select "TAT Dubai" → PATCH 200 → profile shows "TAT Dubai".
- tsc + lint green. Left one labeled test record on staging: `ZZ Verify Test` (`6a255bc8d1f9a7964118c38a`).

### Next sub-tasks
- [ ] Wire **Deactivate** confirm + replace dummy **Related TORs** once those backends land.
- [ ] Wire **Deactivate** confirm once the deactivation backend exists.
- [ ] Replace dummy **Related TORs** when the TOR backend lands.
- [ ] Confirm `status` (Active/Inactive) mapping vs real data (currently soft-delete guess).

## Related
- [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]] · [[tat-prereq]]
- Competencies:
  - [[Delivery & Scope Management]] — built FE against existing APIs, kept missing BE on dummy/stub
  - [[Debugging & Root Cause Analysis]] — staging verification caught 3 contract bugs across schema / response-parsing / data-type layers; each turned into a [[Gotchas]] entry
  - [[Code Quality]] — fixed root contract issues (per-mode schema, correct response parsing, a real OfficeLocation API module) rather than symptoms
  - [[Systems Thinking]] — saw the `/file/upload-file` parse bug affects every upload in the subsystem, not just this one call
