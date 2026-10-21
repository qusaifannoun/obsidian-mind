---
date: 2026-10-21
description: "Staff profile cut to its header and TORs; documents upload, History Form and every TOR form moved onto the TOR page as cards; assessments and Form 32 now share one aircraft-card pattern"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
---

# Staff Profile & TOR Page Simplification

Five UI changes to the [[tat-prereq]] staff management screens, asked for by me on 2026-10-21. No backend change. One commit, `ab155be` on `dev` and `main`, picked onto `prepod` as `efea560`, all pushed.

## What changed

1. **Staff profile** (`StaffProfileView`): removed the *Contact & profile*, *Assigned roles*, *Initial TOR Documents* and *History Form* cards. What's left: the name/roles/status header, Related TORs, and Change Password on your own profile. `StaffHistoryFormCard.tsx` deleted.
2. **Initial documents on the TOR page**: the read-only `DocumentsMirror` was replaced by the existing `InitialDocuments` card (Upload / Replace / Approve / Reject / Delete), the one the pending-TOR page already used.
3. **Every TOR form is its own card**: the collapsible *Forms* section is gone. Each form renders as a card with the History Form card's layout (one shared `FormCard`). Order: 285 (CARC only) → 32A–D → **History Form** → Assessment Report → Final TOR Certificate. The History Form sits after the last Form 32, or last if a TOR has no Form 32.
4. **Assessments follow the Form 32 pattern**: the backend returns one *Assessment Report — <aircraft>* row per aircraft type. `adaptTorDetail` merges them into a single *Assessment Report* row, whose status is the worst of the aircraft statuses (via `sectionStatus`). That row opens a list of aircraft cards plus the SA/TM Assign form. Each card opens the new `/staff/[id]/tor/[torId]/assessment-form/[assessmentId]` page. Pending Review Requests and My Assessments now link straight to that page. The old *Assessments* card at the bottom of the TOR page was deleted (`TorAssessments.tsx`). `'assessment_report'` is now one constant, `ASSESSMENT_REPORT_FORM_KEY` in `types/assessment.ts`.
5. **Form 32 roles hub removed**: `/form-32` and `Form32RoleList` deleted. The aircraft cards page now goes *Back to TOR*. Inside an open Form 32, back still goes to the aircraft cards (my call). No backend notification linked to the hub.

## Verification

- `tsc`, eslint and `next build` clean. The first build failed on a stale `.next/dev/types` from Oct 15 that still listed the deleted hub route; clearing that generated folder fixed it.
- **Partly browser-checked by me** (2026-10-21): *"so far I didn't find any issue on the browser."* Exactly which screens were clicked wasn't recorded (TBC).

## Still open

- **The History Form is now only reachable from a TOR page or from Pending Review Requests.** Examiners and practical assessors usually have no TOR, and they used to reach it through the profile card.
- **Contact details** (staff number, phone, national ID, DOB, address) now only show on the Edit page.
- **The assessment list only shows assigned assessments.** Qualified aircraft with no assessment no longer get their own *Missing* row; they show up only in the merged row's status.
- **This supersedes the 2026-07-09 placement rule** (per-instructor sections live on the profile, the TOR only mirrors them). See [[Patterns - Backend & Domain#Staff subsystem section placement: per-instructor lives on the profile (+read-only TOR mirror), per-license lives in the TOR (2026-07-09)]].

## Related

- [[TAT-409 Staff Management Subsystem]] — the subsystem these screens belong to
- [[Pending Review Requests - Reviewer Worklist]] — its assessment links now open the single assessment
- [[Super Admin Profile Signature & Stamp]] — same session; its tat-prereq commit was synced onto `dev`/`main` alongside this
- [[Patterns - Frontend & UI]] · [[tat-prereq]] · [[TAT Platform]]
