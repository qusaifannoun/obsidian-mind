---
date: 2026-11-17
description: "History Form certifier signature opened S3 NoSuchKey: the 6-hourly cleanup deleted sit-in signatures, and the screen showed a link instead of an image"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-585
---

# TAT-585 — Certifier Signature Shown as Image

**Status (as of 2026-11-17):** Jira **READY FOR QA** (moved there with Hamza's backend fix). [[tat-prereq]] `6b5e72e`, on dev, prepod and main. **Not opened in a browser.**

## Context

Reported by Dania. On the History Form, the "Certified by Training Manager" signature was a "Signature" link, and clicking it opened raw S3 XML: `NoSuchKey – The specified key does not exist`. The expected result was the Training Manager's signature shown as an image, taken from the signer's saved signature.

## Root cause

Two separate causes:

1. **The file was deleted.** `S3CleanupService` did not list `StaffSitIn.assessorSignatureKey`, so the 6-hourly cron deleted every sit-in final-assessment signature. This is the same failure as [[TAT-587 S3 Cleanup Deleted Examiner Signatures]], on a different field. Hamza fixed it in [[tat-app-ws Backend]] `64472b78`, which adds `staffSitIn: { fields: ["assessorSignatureKey"], isKey: true, keyPrefix: "bucket/" }` to `FILE_FIELD_CONFIG`.
2. **The screen used a link.** `CertifiedBySection` in `HistoryFormView` rendered the key as an `EvidenceLink`, not an image.

## Fix

[[tat-prereq]] `6b5e72e`: `CertifiedBySection` renders `<img src={fileViewUrl(sitIn.assessorSignatureKey)}>`. This is the same display used by `TorCertificateView` and the assessment signatures, which live in the same `tor-assessment` folder.

## Evidence

- tat-prereq `tsc` clean. eslint: 0 errors, 1 `no-img-element` warning, the same as the other signature displays.

## Still open

- [ ] Not opened in a browser.
- [ ] "QA Sync TAT-412" lost its signature before the cleanup fix, so it shows "—" until a new final assessment is recorded.
- [ ] **"Taken from the signer's saved signature" is not built.** The sit-in final assessment still takes a plain file upload. The backend's `assertStaffEvidenceFileKey` only allows `tor-assessment` / `tor-documents` keys, so `SignatureField`'s "use saved signature" option (a profile key) would be rejected. It needs a backend change first, then the form switches to `SignatureField`. QA may return this part.
- [ ] The screen (sit-in uploaded file) and the PDF (approving TM's profile signature, see [[TAT-586 History Form Rev 02-00 Redesign]]) can show different signatures.

## Related

- [[TAT-587 S3 Cleanup Deleted Examiner Signatures]] · [[TAT-586 History Form Rev 02-00 Redesign]]
- [[Gotchas - Backend Schema & Data#A file field the S3 cleanup doesn't list is deleted within 6 hours (2026-11-16)]]
- [[tat-prereq]] · [[tat-app-ws Backend]]
