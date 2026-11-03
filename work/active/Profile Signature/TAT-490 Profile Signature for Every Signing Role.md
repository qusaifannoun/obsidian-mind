---
date: 2026-10-25
description: "Every Super Admin, Admin, manager, Instructor and Trainee profile now needs a signature to save — enforced in the backend, uploaded in tat-ws and in Staff Management"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-490
---

# TAT-490 — Profile Signature for Every Signing Role

**Status (as of 2026-10-25):** built, pushed to `dev`, cherry-picked and pushed to `master`/`main` and `prepod` in all three repos. **Nothing run beyond `tsc`/eslint and one scripted run of the tat-ws rule.** Not typechecked on `master`/`main`/`prepod` after the picks. The backend half does nothing on staging until it's deployed.

## Context

[TAT-490](https://cryptonic-art.atlassian.net/browse/TAT-490) (Low, epic TAT-119 *Exam Session and Certificates*, from dania.baradie, no attachments): add a **required** signature upload to the profiles of Super Admin, Admin, Training Manager, Examination Manager, Quality Manager, Accountable Manager, Instructor and Trainee; each can upload, view, change **or remove** it at any time.

"Required" and "remove at any time" contradict each other. **Qusai chose required, replace only** (2026-10-25), knowing it blocks existing users without a signature.

## What existed

- Backend `user.schema.ts`: TM, EM, AM, QM and SA each had `signatureImage` + `stampImage`; only SA's were enforced (see [[Super Admin Profile Signature & Stamp]]). **Admin, Instructor and Trainee had no signature field**; `Admin` was an empty class.
- [[tat-ws]] `DynamicUserFields` (My Profile, Add User, Edit User) had signature uploads for those five roles. `RHFFileInput` can show and replace but has no remove.
- [[tat-prereq]] passed the manager signatures through `StaffForm` **but never rendered an upload**. After [[TAT-492 + TAT-493 Staff Editing Moves to Staff Management|TAT-493]] staff are edited there, so it had to get one.

## What was built

**[[tat-app-ws Backend]] `1c67ef5f`**
- `signatureImage` on the `Admin`, `Instructor` and `Trainee` schema classes and DTOs; the three paths added to `s3-cleanup.service.ts`.
- `updateProfile` now looks up every held role (primary + `dto.secondaryRoles`) that is in `PROFILE_SIGNATURE_FIELDS` and returns 400 *"Please upload a signature for the role: <name>"* if `(dto[field] ?? user[field])?.signatureImage` is empty. Same `dto ?? stored` semantics as the SA rule, which stays for the stamp.
- Enforced on **profile save only**, like the SA rule — not on internal signup or `completeProfile`.

**[[tat-ws]] `77e4ef2a`**
- One shared rule, `apps/tat-ws/src/schema/profileSignature.schema.ts` (`requireProfileSignatures`, a `superRefine`), new file approved by Qusai, called from `updateUser`, `adminUpdateUser` and `user` schemas. It replaced the SA-only signature refine.
- Signature uploads on the Trainee and Instructor cards and a new Admin card; the four manager signatures relabelled `Signature*`.
- `admin` defaults on the three pages and in My Profile's user→form mapping. Without it the form sent an empty `admin` object, which would have erased a saved Admin signature.
- Add User's schema had **no `superAdmin` object**, so zod stripped the SA signature and stamp on create. Added.

**[[tat-prereq]] `30aca19`**
- A `SignatureField` (draw or upload, category `signature`) per held Admin, Instructor, TM, EM, AM and QM role on Add New Staff and Edit Staff, required through `ROLE_DATA_REQUIREMENTS`.
- `SignatureField`/`SignatureInput` got an opt-out `offerSavedSignature` (default `true`). Edit Staff passes `false`: the [[Profile Signature Sign Button|Sign button]] fills from the **signed-in** user's signature, which would have put a Super Admin's own signature on someone else's profile.
- `withRoleData` sent `admin: {}` for a secondary Admin, which erased the admin object on every save; it now sends the Admin's signature. See [[Gotchas - TOR & Staff Management#A role-data placeholder `{}` erases the stored subdocument — the backend `$set`s role objects whole (tat-prereq, 2026-10-25)|the gotcha]].

## Evidence

The tat-ws rule, run with `tsx` against sample data:

```
AD no sig         admin.signatureImage
AD with sig       OK
TR + IN missing   instructor.signatureImage
Examiner only     OK
Auditor only      OK
```

The upload category `signature` is not in the backend's `FileUploadCategory` enum. That doesn't break anything: `file.controller.ts` reads `category` straight off `req.body` with no validation, so it just becomes the S3 folder, as it already was for tat-ws.

## Commits (all pushed 2026-10-25)

| Repo | `dev` | `main` / `master` | `prepod` |
|---|---|---|---|
| [[tat-app-ws Backend]] | `1c67ef5f` | `4a80e50a` | `a882bdfb` |
| [[tat-ws]] | `77e4ef2a` | `23587c18` | `8b5caef4` |
| [[tat-prereq]] | `30aca19` | `0834bd1` | `68f7d98` |

## Still open

- [ ] **Existing users without a signature get 400 on their next profile save** once the backend deploys — Trainees saving My Profile in tat-ws included.
- [ ] **tat-prereq My Profile can't upload a signature** (self mode strips every role object), so a staff self-save there dead-ends; they must use tat-ws My Profile, or an SA/Admin adds it via Edit Staff.
- [ ] A staff member with a **secondary Trainee** role can't be saved from tat-prereq: its `trainee: {}` placeholder erases their trainee data (an existing bug) and now also fails the rule.
- [ ] A Super Admin edited in tat-prereq has no signature field there; their stored one is used.
- [ ] Clear in tat-prereq's `SignatureInput` still exists, but the form refuses to save empty, so a saved signature can't be removed.
- [ ] Stamps are not shown in tat-prereq (passed through untouched).
- [ ] `resolveProfileSignature` (Sign button, tat-prereq) and the backend `resolveProfileSignatureKey` still don't read the new Admin/Instructor/Trainee signatures (inferred from the TM→QM→EM→AM→SA chain; not changed).
- [ ] **Suspected, unverified:** backend `updateProfile` sets `secondaryRoles` to `[]` whenever the request omits them, and tat-prereq's My Profile always omits them — a self-save there may wipe secondary roles. See [[Gotchas - TOR & Staff Management]].
- [ ] Not exercised: upload, replace and save for each role in both apps; the 400 path; Add New Staff with an Admin secondary role.

## Related

- [[Super Admin Profile Signature & Stamp]] — the SA-only version this generalises
- [[Profile Signature Sign Button]] — its "instructors have no role signature" limitation is now half-closed: the field exists, the resolver doesn't read it
- [[TAT-492 + TAT-493 Staff Editing Moves to Staff Management]] — same session
- [[Patterns - Architecture & Boundaries#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]] — why the tat-ws rule is one file
- [[tat-app-ws Backend]] · [[tat-ws]] · [[tat-prereq]] · [[TAT Platform]]
