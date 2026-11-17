---
date: 2026-11-16
description: "The S3 cleanup cron protected only the profile signature fields in its hard-coded list, so Examiner, Assessor and Invigilator signatures were deleted every 6 hours"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-587
---

# TAT-587 — S3 Cleanup Deleted Examiner Signatures

**Status (as of 2026-11-16):** Jira **READY FOR QA**. Fixed in [[tat-app-ws Backend]] `0ca3b83d`, on dev, prepod and master. **Unit-tested only; not run on any deployed environment.** Mahmoud's certificate still needs repairing.

## Context

Ayat's bug (High), under TAT-491 PreRequisites V3. On **production**, Mahmoud Khanfar's Final TOR Certificate (EASA TOR, created and approved 14 Nov 2026) shows a broken image in "Instructor signature", and the exported PDF has no signature. The Quality Manager signature on the same page loads. Staging works.

## Root cause

- **The cleanup only keeps files it knows about.** Hamza's `S3CleanupService` runs every 6 hours. It lists every S3 object and deletes those not referenced by a hard-coded list of database fields.
- **New roles never joined the list.** When Examiner, Practical Assessor and Invigilator signatures and the Examiner stamp were added (`5eddf44a`, 2026-10-28, TAT-527/528/532), nobody added them to that list. [[TAT-490 Profile Signature for Every Signing Role]] had added its own three fields, but the next batch was missed.
- **So those files were deleted on production within 6 hours of upload.**
- **The certificate snapshots the profile signature.** `torOwnerSignatureKey` copies the owner's role signature into `data.instructorSignatureKey` at submit. Page and PDF both read that address, so both broke together.
- **Why QM still worked:** `qualityManager.signatureImage` was on the list.
- **Why staging looked fine:** probably the staging tester's signature was an Instructor one, which was protected (inferred).

See [[Gotchas - Backend Schema & Data#A file field the S3 cleanup doesn't list is deleted within 6 hours (2026-11-16)|the gotcha]].

## Fix

Qusai chose to derive the list over hand-adding four paths or handing it back to Hamza.

[[tat-app-ws Backend]] `0ca3b83d`, `s3-cleanup.service.ts`:
- The protected user signature fields are built from `PROFILE_SIGNATURE_FIELDS`, the same table that decides which roles must have a signature. A new signing role is protected automatically.
- Stamps have no shared list, so the stamp groups stay hand-kept in the cleanup; `examiner.stampImage` was added.
- The Mongo projection is built from the same list.
- New `s3-cleanup.service.spec.ts` runs `handleS3Cleanup` against a fake user model that applies the real projection.

## Evidence

The new spec against the **original** code:

```
- Expected  - 0
+ Received  + 4
+   "bucket/staff/examiner-sig.png",
+   "bucket/staff/examiner-stamp.png",
+   "bucket/staff/assessor-sig.png",
+   "bucket/staff/invigilator-sig.png",
Tests:       1 failed, 1 total
```

With the fix: `Tests: 1 passed`. With the profile-completeness spec: `Test Suites: 2 passed, Tests: 13 passed`. API `tsc` exit 0. Local ESLint wouldn't start (`@nx/eslint-plugin` missing).

## Still open

- [ ] Not run on any deployed environment. Until production runs `0ca3b83d`, every new Examiner, Assessor or Invigilator signature and Examiner stamp is still deleted within 6 hours.
- [ ] **Repairing Mahmoud's certificate.** Qusai chose re-upload + resubmit, but an approved certificate has no resubmit: it only reopens through `archiveAndReopenForAmendment` (TOR renewal or a new aircraft qualification). After deploy, Mahmoud re-uploads, then either someone updates `data.instructorSignatureKey` on production or the certificate waits for a reopen.
- [ ] Other Examiners, Assessors and Invigilators on production have probably lost their signatures since 28 Oct (inferred; no production access to list them).
- [ ] **Snapshot gap (not fixed):** signature addresses copied into `staffTorForm.data` are full URLs, and the cleanup's `bucket/` prefix check skips them. When anyone replaces their profile signature, the old file is deleted and their approved certificates break. For Hamza or a later ticket.
- [x] Moved to READY FOR QA (2026-11-16).

## Related

- [[TAT-490 Profile Signature for Every Signing Role]]: the last time signature fields were added to the cleanup by hand
- [[TAT-585 Certifier Signature Shown as Image]]: the same failure on sit-in signatures, found the same day
- [[Final TOR Certificate QA Batch - Nov 2026]] · [[Final TOR Certificate - Form 020 Alignment & Export]]: the certificate page and PDF
- [[Patterns - Architecture & Boundaries#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]]: why the list is derived
- [[tat-app-ws Backend]] · [[Staff Management Subsystem & TOR Model]]
- [[Debugging & Root Cause Analysis]]
