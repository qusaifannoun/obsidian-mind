---
date: 2026-10-21
description: "Super Admin profiles got a required signature and stamp (2026-10-12); the signature reached Forms but not staff management until the two resolver copies were merged"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
---

# Super Admin Profile Signature & Stamp

A Super Admin profile now holds its own `superAdmin.signatureImage` and `superAdmin.stampImage`, both required. It was built on 2026-10-12 to close the blank "Prepared by – Signature" gap in [[TAT-481 Super Admin Forms Browser]]. It was never written down here, and on 2026-10-21 I first answered that it did not exist: I had searched the vault but not the code (see [[Gotchas - Tooling & Method#An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)|the same trap]]).

## What exists (as of 2026-10-21)

**2026-10-12. Profile fields + Forms**
- [[tat-app-ws Backend]] `68632d3f` (on `dev`, `master`, `prepod`): a `SuperAdmin` sub-document on the user schema, a `SuperAdminDTO` on `IntSignUpDTO`, and S3 cleanup tracking for both images. `user.service.ts` returns 400 *"A Super Admin profile needs a signature and a stamp"* when a user whose **primary** role is Super Admin saves without both. It checks `dto.superAdmin ?? user.superAdmin`, so a payload that omits the field keeps the stored images. The planning sheet's "Prepared by" now falls back to the creator's Super Admin signature.
- [[tat-ws]] `fabf9bbe` (on `main`, `dev`, `origin/prepod`): a "Super Admin Information" card with Signature and Stamp uploads in `DynamicUserFields`. Both profile schemas refuse to save without them, and `roleObjectCleaner` keeps `superAdmin` only for that role.

**2026-10-21. Staff management**
- The backend had **two copies** of the "find this user's saved signature" chain: Forms' `buildPreparedByFields` and the History Form's `resolveActorSignatureKey`. Only the Forms copy got the Super Admin, so a History Form approved by a Super Admin printed a blank "certified by" signature. They were also ordered differently: Forms checked EM before QM, the History Form QM before EM.
- [[tat-app-ws Backend]] `dd13bafd`, re-committed by me as `4125703b` *"Commit changes"* (identical diff) and merged into `master` (`23d6c2dc`) and `prepod` (`90ba2ada`); all three pushed 2026-10-21: one `resolveProfileSignatureKey(user)` in `libs/helpers/src/lib/pdf/signature-data-uri.util.ts`, checking TM → QM → EM → AM → SA, which both services now call. The History Form query also selects `superAdmin.signatureImage`. Side effect: for a course creator with both EM and QM signatures, "Prepared by" now picks the QM one.
- [[tat-prereq]] `3108cc4` on `prepod`, picked onto `dev`/`main` as `9194cc9`; all three pushed 2026-10-21: `superAdmin` added to `User` and to `resolveProfileSignature`, so the [[Profile Signature Sign Button]] fills the field for a Super Admin.
- Not changed, on purpose: Form 285 reads only the Accountable Manager signature, the TOR certificate only the Quality Manager signature, and assessment approval stores the signature sent in the request.

## Still open

- **Nothing here has been run.** Only `tsc` and eslint, both clean. To check: approve a History Form as a Super Admin who has a saved signature and download the PDF; press "Sign" on any tat-prereq signature field as that Super Admin; create a course as a Super Admin and open its Planning Sheet.
- **The Super Admin stamp is stored and required, but nothing displays it.** Every stamp on the forms is still the Training Manager's.
- **The seeded Super Admin has neither image**, so any save of that profile returns 400 until both are uploaded.
- **Not yet deployed:** the backend half does nothing on staging until it's deployed (as of 2026-10-21).

## Related

- [[TAT-481 Super Admin Forms Browser]] — where the blank "Prepared by" gap was found
- [[TAT-482 + TAT-483 Enrollment Forms]] — the Planning Sheet's "Prepared by" block
- [[Export History Form - TAT Form 031 PDF]] — the PDF whose approver signature this fills
- [[Profile Signature Sign Button]] — the tat-prereq Sign button
- [[Patterns - Architecture & Boundaries#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]] — the duplicated resolver is another case
- [[tat-app-ws Backend]] · [[tat-ws]] · [[tat-prereq]] · [[TAT Platform]]
