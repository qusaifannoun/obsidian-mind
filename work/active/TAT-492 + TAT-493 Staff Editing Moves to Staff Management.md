---
date: 2026-10-25
description: "Staff are now edited only in Staff Management: its role pickers offer staff roles only, and Dashboard Edit on a staff user signs in over SSO and opens Edit Staff"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-492
---

# TAT-492 + TAT-493 — Staff Editing Moves to Staff Management

**Status (as of 2026-10-25):** built, pushed to `dev`, cherry-picked and pushed to `main` and `prepod` in both repos. **Only the redirect itself has been clicked through, locally, by Qusai.** Not typechecked on `main`/`prepod` after the picks.

Two tickets from dania.baradie under epic TAT-491 *PreRequisites V3*, both Highest, created 2026-10-25. Neither had attachments or comments.

## Context

- [TAT-492](https://cryptonic-art.atlassian.net/browse/TAT-492): remove Super Admin, Training Provider, Trainee, Certificate Authority, Company, Third Party and Auditor from the **Select Roles** dropdown on Add New Staff and Edit Staff.
- [TAT-493](https://cryptonic-art.atlassian.net/browse/TAT-493): Dashboard → Manage Users → **Edit** on a staff user must open that user's Edit Staff page in Staff Management; non-staff users (CA, Trainee, Company, Third Party, Admin, Auditor) keep the Dashboard's Edit User page.

The two tickets **disagree on Admin**: TAT-493 calls it non-staff, TAT-492 keeps it in the staff dropdown. Qusai's call (2026-10-25): **Admin is staff for now**, and he asked the reporter. So the non-staff set for the redirect is CA, TR, CO, TP, AU.

## What was built

**TAT-492 — [[tat-prereq]] `57a3d62`**
- Both role pickers in `StaffForm.tsx` now offer `ALL_STAFF_ROLES` from `src/config/access.ts` minus SA, the same list the route gates use.
- A non-staff role the user **already holds** is still listed, so it can be seen and removed. Without that it would stay hidden in the form value and be re-saved forever. The form already did this for SA; it now does it for every non-staff role.
- "Training Provider" and "Third Party" are one entry: the backend has no Training Provider role, and code `TP` is `THIRD_PARTY`. tat-prereq labels it "Training Provider" everywhere (inferred to be a mislabel, unfixed).

**TAT-493 — [[tat-ws]] `6c1d78e0` + `5ac5ad66`, [[tat-prereq]] `3dddd26`**
- tat-ws had no link to Staff Management and no URL for it. The only cross-app sign-on was the Online Courses button in `LandingNavbar`. Its SSO-code request was moved into `utilities/ssoToken.ts` first, as a commit of its own, then reused.
- `ManageProfiles/index.tsx`: Edit on a user whose primary role is not CA/TR/CO/TP/AU calls `POST /auth/generate-sso-token` and goes to `<staff URL>/sso?code=…&returnTo=/staff/:id/edit`. If the code request fails, it goes to `/staff/:id/edit` directly and Staff Management's proxy asks for a login.
- New env var **`NEXT_PUBLIC_STAFF_MANAGEMENT_URL`** in `configs/env.ts`.
- Edit Staff was **Super-Admin-only** (`StaffForm.tsx` gate), so an Admin sent there hit "no access". Qusai: anyone with permission should be able to open it. The backend already allowed it (`PATCH user/admin/update-profile` is `@Roles(SA, AD)`), so Edit Staff now admits Admin in **edit mode only**; Add New Staff stays SA-only.

## Evidence

First local click, before the env var existed:

```
http://localhost:4200/undefined/sso?code=eyJhbGciOiJIUzI1NiIs…&returnTo=%2Fstaff%2F6aa663e837e3bba700988eea%2Fedit
```

After the var was added to `tat-ws/.env` (not tracked), the server still had it undefined — it had started at 14:59:11 and the line was added at 15:00:45. See [[Gotchas - Frontend#A `NEXT_PUBLIC_*` variable added while the dev server runs stays `undefined` until a full restart (tat-ws, 2026-10-25)|the restart gotcha]]. After a restart Qusai reported "it worked".

## Commits (all pushed 2026-10-25)

| Repo | `dev` | `main` | `prepod` |
|---|---|---|---|
| [[tat-prereq]] | `57a3d62`, `3dddd26` (+ TAT-490's `30aca19`) | up to `0834bd1` | up to `68f7d98` |
| [[tat-ws]] | `6c1d78e0`, `5ac5ad66` (+ TAT-490's `77e4ef2a`) | up to `23587c18` | up to `8b5caef4` |

## Still open

- [ ] **Set `NEXT_PUBLIC_STAFF_MANAGEMENT_URL` on every tat-ws deployment**: staging `https://staging.staff.tat147.com`, production `https://staff.tat147.com` (the values the backend's `STAFF_MANAGEMENT_URL` uses). Without it the deployed Dashboard sends users to `/undefined/sso`.
- [ ] Not exercised: an Admin opening and saving Edit Staff; Super Admin rows (they redirect too); the Add/Edit dropdowns themselves; editing someone who holds a non-staff role.
- [ ] tat-prereq has ~25 other `isSuperAdmin` checks. After saving, an Admin lands on the staff profile page, where some of them may hide things (unverified).
- [ ] The reporter's answer on whether Admin is staff.
- [ ] The Manage Staff role **filter** still lists every role (out of the ticket's scope).

## Related

- [[TAT-490 Profile Signature for Every Signing Role]] — same session; moving staff editing here is why Staff Management needed signature fields
- [[Staff Management Role Switcher]] — SSO still lands on the primary role
- [[TAT-432 Staff Profile]] — the Edit Staff page this now targets
- [[Gotchas - Frontend]] · [[tat-prereq]] · [[tat-ws]] · [[TAT Platform]]
