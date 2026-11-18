---
date: 2026-11-17
description: "History Form certifier signature opened S3 NoSuchKey because the 6-hourly cleanup deleted it; the sit-in final assessment now prefills the TM's saved signature"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
ticket: TAT-585
---

# TAT-585 — Certifier Signature Shown as Image

**Status (as of 2026-11-18):** QA returned it on 2026-11-17 (Ready for Dev). The return is fixed in [[tat-prereq]] `45dfc4d` on dev, prepod and main, on top of Hamza's backend `d89e46c5`. Earlier fix: `6b5e72e`. Jira moved back to **READY FOR QA** on 2026-11-18. **Never opened in a browser.**

## Context

Reported by Dania. On the History Form, the "Certified by Training Manager" signature was a "Signature" link, and clicking it opened raw S3 XML: `NoSuchKey – The specified key does not exist`. The expected result was the Training Manager's signature shown as an image, taken from the signer's saved signature.

## Root cause

Two separate causes:

1. **The file was deleted.** `S3CleanupService` did not list `StaffSitIn.assessorSignatureKey`, so the 6-hourly cron deleted every sit-in final-assessment signature. This is the same failure as [[TAT-587 S3 Cleanup Deleted Examiner Signatures]], on a different field. Hamza fixed it in [[tat-app-ws Backend]] `64472b78`, which adds `staffSitIn: { fields: ["assessorSignatureKey"], isKey: true, keyPrefix: "bucket/" }` to `FILE_FIELD_CONFIG`.
2. **The screen used a link.** `CertifiedBySection` in `HistoryFormView` rendered the key as an `EvidenceLink`, not an image.

## Fix

[[tat-prereq]] `6b5e72e`: `CertifiedBySection` renders `<img src={fileViewUrl(sitIn.assessorSignatureKey)}>`. This is the same display used by `TorCertificateView` and the assessment signatures, which live in the same `tor-assessment` folder.

## QA return (2026-11-17) and fix (2026-11-18)

Ayat returned it, with the BA confirming: the sit-in final assessment Signature was a plain "Choose File" upload. It was not filled from the Training Manager's saved signature and could not be drawn.

- **Backend (Hamza, [[tat-app-ws Backend]] `d89e46c5`, 2026-11-17, on dev, prepod and master):** `SitInResponseDTO` fills `assessorSignatureKey` from the viewer's saved profile signature while the final assessment is open, and adds `assessorSignatureUrl`. `CompleteSitInFinalAssessmentDTO.assessorSignatureKey` is optional. It accepts an uploaded key, a drawn `data:image/...` URL, or nothing, which keeps the saved signature.
- **Frontend ([[tat-prereq]] `45dfc4d`):** `FinalAssessmentForm` uses `SignatureField` (category `TorAssessment`) and starts from `sitIn.assessorSignatureKey`. The TM can keep it, or clear it and then draw, upload, or click "Sign" for their saved signature. The schema now takes a string key. `useSitInActions.completeFinalAssessment` sends the key directly instead of uploading a `File`.

## Evidence

- `6b5e72e`: tat-prereq `tsc` clean. eslint: 0 errors, 1 `no-img-element` warning, the same as the other signature displays.
- `45dfc4d`: tat-prereq `tsc` exit 0; ESLint clean on `SitInSection.tsx` and `useForms.ts`.

## Still open

- [ ] Not opened in a browser.
- [ ] "QA Sync TAT-412" lost its signature before the cleanup fix, so it shows "—" until a new final assessment is recorded.
- [x] ~~"Taken from the signer's saved signature" is not built~~: built 2026-11-18 (backend `d89e46c5` + tat-prereq `45dfc4d`). Why it needed the backend: `assertStaffEvidenceFileKey` accepts any `bucket/` key (since `db6922f7`, 2026-07-05), but profile signatures are stored as full S3 URLs ([[Gotchas - Frontend Data & API Contracts]]). These only pass once `d89e46c5` converts them with `s3Service.toObjectKey`.
- [ ] Not opened in a browser: check the prefill, draw, upload and "Sign" options as a TM.
- [ ] The screen (sit-in uploaded file) and the PDF (approving TM's profile signature, see [[TAT-586 History Form Rev 02-00 Redesign]]) can show different signatures.

## Related

- [[TAT-587 S3 Cleanup Deleted Examiner Signatures]] · [[TAT-586 History Form Rev 02-00 Redesign]]
- [[Gotchas - Backend Schema & Data#A file field the S3 cleanup doesn't list is deleted within 6 hours (2026-11-16)]]
- [[tat-prereq]] · [[tat-app-ws Backend]]
