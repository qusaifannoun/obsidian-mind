---
date: 2026-11-17
description: "Three Staff Management notification bugs: expiry reminder skipped QM/TM, Form 32 links 404'd, and removing a TOR file reused the 'uploaded' notification"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-583
---

# TAT-583 + TAT-592 + TAT-593 — Staff Notification Fixes

**Status (as of 2026-11-17):** fixed and pushed to dev, prepod and master/main. **Jira not yet transitioned. Nothing deployed or run in a browser.** All three depend on the API restarting, because the boot seeder writes the new action, role grants and notification settings.

## TAT-583 — Assessment Form near-expiry reminder skipped QM and TM

**Root cause:** Hamza's `AssessmentFormExpiryCronService` picks the recipients in code (the owner plus Admin users). The seeded `destination` on "Assessment Form Near Expiry" is not used for this notification, so the Quality Manager and Training Manager never received it. Dania updated the ticket to require the owner (instructor, examiner or assessor), QM, TM and Admin.

**Fix:** [[tat-app-ws Backend]] `9ec91895`. `getReviewerUsers` finds users holding QM, TM or AD as a primary or secondary role. The seed `destination` now lists the same roles, for reference only. The spec asserts QM, TM and AD recipients.

**Retest note:** a form already reminded by Hamza's version has `expiryReminderSentAt` set and will not be reminded again. QA needs a form that hasn't had a reminder yet.

## TAT-593 — Form 32 notification links opened a 404

**Root cause:** "Form 32 Pending Review" and "Form 32 Fields Rejected" linked to `/staff/{{userId}}/tor/{{torId}}/form-32`. [[tat-prereq]] only has `/form-32/[formKey]/[aircraftTypeId]`, so every link 404'd, for the Super Admin and for the instructor.

**Fix:**
- [[tat-app-ws Backend]] `dc59fbb6`: both notifiers pass `formKey` and `aircraftTypeId` (already in the submit/reject response), and the seed links go to `/form-32/{{formKey}}/{{aircraftTypeId}}`. The seeder re-syncs `parameters` on boot, so existing databases pick up the new links.
- [[tat-prereq]] `9faf3f9`: a page at the bare `/form-32` redirects to the TOR page, so notifications sent before the fix stop 404ing.

## TAT-592 — Removing a TOR document file said "uploaded"

**Root cause:** Hamza's [[TAT-541 Multiple File Uploads]] tagged `DELETE tor-documents/:docType/files/:fileId` with `SM_REPLACE_TOR_DOCUMENT`. The action on a route also picks the notification, so a removal fired "TOR Document Pending Review", whose only template (`TDPR`) says "uploaded".

**Fix:** [[tat-app-ws Backend]] `36e1972b`. A new action `SM_REMOVE_TOR_DOCUMENT_FILE` (`SMTDF`) is granted to the same roles as upload. A new "TOR Document File Removed" setting uses the new `TDFR` template: *"Instructor {{instructorName}} removed a file from {{docTypeLabel}} and it is waiting for your review."* A removal sends the document back for review, so the wording holds.

## Evidence

- tat-app-ws: `tsc` exit 0. Staff-management + bootstrap jest: `Test Suites: 16 passed, Tests: 121 passed`.
- On every boot, bootstrap overwrites each role's action list (`seedRoleActions` → `editRoleActions`) and each existing setting's `parameters`.

## Still open

- [ ] Not deployed or exercised; the API must restart for the action, grants and settings.
- [ ] No spec covers TAT-592 or TAT-593. `notifications.service.spec.ts` is an empty placeholder.
- [ ] Jira: move TAT-583, TAT-592 and TAT-593 to Ready for QA.

## Related

- [[Gotchas - Seeding & Notifications]] · [[TAT-541 Multiple File Uploads]]
- [[TAT-585 Certifier Signature Shown as Image]]: another Hamza ticket finished the same week
- [[tat-app-ws Backend]] · [[tat-prereq]]
