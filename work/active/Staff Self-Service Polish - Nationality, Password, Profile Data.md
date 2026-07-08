---
date: 2026-07-08
quarter: Q3-2026
status: active
description: "tat-prereq staff self-service batch — nationality dropdown, national-ID validation, self-service change-password, full profiles/me mapping, per-TOR qualifications/assessments aggregation, DOB formatting, Form 285 title dropdown, manage-staff eye icon"
tags:
  - work-note
team: Backend
---

# Staff Self-Service Polish — Nationality, Password, Profile Data

A QA-driven batch of [[tat-prereq]] staff-management FE fixes (self-profile + Manage Staff + Form 285), all against real [[tat-app-ws Backend]] endpoints verified on staging. Extends [[TAT-432 Staff Profile]]. Shipped to `dev` in three commits: `c267616`, `4a17423`, `af17500`.

## What shipped

- **Nationality → searchable dropdown.** Converted the staff-form free-text field to a searchable country select fed by `GET /country`, storing the country **name** (e.g. `"Jordan"`) to match [[tat-ws]]'s nationality field exactly (cross-app parity, shared backend user collection). New `SearchableSelectField` (radix + filter box, modelled on the repo's existing `CountrySelectField`), `src/api/Country/` fetcher+hook mirroring `OfficeLocation`.
- **National ID → exactly 10 digits.** `z.string().regex(/^\d{10}$/)` + `inputMode="numeric"` + `maxLength={10}` (added optional passthrough props to the shared `InputField`).
- **Self-service change password.** New `ChangePasswordForm` on the My Profile view **and** self-edit page (gated on `self`, hidden from admins editing others), wired to the existing `POST /auth/change-password` (`{ oldPassword, newPassword, confirmPassword }`). Zod rules mirror the backend `IsStrongPassword` DTO (≥8, upper/lower/number/symbol, new≠old, confirm match).
- **`profiles/me` full mapping (bug fix).** The self-profile mapper was stale — written when the endpoint returned identity+role only — so nationality, national ID, DOB, gender, place of birth, and office location all rendered `—`. Expanded the response type + mapper to read the full record staging now returns. See [[Gotchas#tat-prereq staff self-profile — stale mapper, dead per-user record endpoints, and an unmapped-enum crash (2026-07-08)]].
- **Qualifications/Assessments → real per-TOR endpoints (bug fix).** The panels hit non-existent `/staff-management/qualifications` & `/assessments` (404, retry-storm). No per-user list route exists — the real data is per-TOR — so they now aggregate across the member's TORs (`useStaffTors` → fan-out `tors/:torId/aircraft-qualifications` and `/assessments` via `useQueries`, flatten), reusing the TOR-detail query keys for cache sharing.
- **DOB date-only.** Was rendering the raw ISO (`1998-08-22T00:00:00.000Z`); now formats to `22 Aug 1998` in **UTC** (so a UTC-midnight date doesn't slip a day).
- **Form 285 Title → dropdown.** Free-text Title swapped for a Mr./Ms./Mrs. select matching [[tat-ws]]'s profile title options (`RHFNameInput`).
- **Manage Staff row (QA).** Removed the row click-through and the kebab actions menu; added a dedicated **eye icon** linking to the details page. Edit stays reachable from the details page.

## Method

Every path is gated on a real access token (fetchers silently return dummy data offline), so I verified endpoint shapes with live `curl` against `staging.api.tat147.com` using the signed-in token — confirming `/country`, `profiles/me` (full shape), the per-TOR `aircraft-qualifications`/`assessments` (200, empty for this user), and that the flat `/qualifications`/`/assessments` routes 404. Same "verify against staging, logged in" discipline as the [[Gotchas#Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)|TAT-432 contract work]].

## Related

- [[TAT-432 Staff Profile]] · [[TAT-409 Staff Management Subsystem]]
- [[tat-prereq]] · [[tat-ws]] · [[tat-app-ws Backend]]
- [[Gotchas]] · [[Patterns]]
- Competencies: [[Debugging & Root Cause Analysis]] · [[Code Quality]] · [[Delivery & Scope Management]]
