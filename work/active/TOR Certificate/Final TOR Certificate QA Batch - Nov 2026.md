---
date: 2026-11-01
description: "QM fields were editable by the instructor because edit flags read the stage, not the viewer; approval reference never set; PDF hardcoded CARC title and GCAA footer; signatures shown as text"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-app-ws
ticket: TAT-554
---

# Final TOR Certificate QA Batch — Nov 2026

Five tickets on the Final TOR Certificate (TAT Form 020): TAT-557, TAT-558, TAT-559 (Ayat, QA on staging) and TAT-554, TAT-560 (dania). Follows [[Final TOR Certificate - Form 020 Alignment & Export]].

**Status (as of 2026-11-01):** on `dev` and merged into `prepod` in [[tat-app-ws Backend]] and [[tat-prereq]]. Specs pass; **nothing run in a browser**; Jira not yet moved.

## Root causes

- **TAT-559 — the instructor saw the QM review fields with Save/Approve live.** `toDTO` set `qmEditable` / `instructorEditable` from the workflow stage alone (`available && stage === PENDING_QM`), never from who is viewing. The backend still refused the save, so the buttons silently did nothing.
- **TAT-557 — approval reference "—".** The certificate read `License.approvalReference`, a field no API or screen ever sets, so it was always null.
- **TAT-554 — wrong authority wording.** The 020 PDF hardcoded `Non-CARC Part 147 Training Authorization Capability` and the GCAA footer `TAT Form 020 08.26 ISSUE/REV. 02/03` for every authority. T1/T2 had no notes.
- **TAT-558 — signatures not shown.** The read-only view printed `On file` instead of rendering the key, and the QM block showed only name and date. Underneath: profile signatures are full S3 URLs while form signatures are bare keys — see [[Gotchas - Frontend Data & API Contracts#Profile signatures are full S3 URLs, form signatures are bare keys — a key-only resolver breaks one of them (tat-prereq, 2026-11-01)]].

## Fix

- **Edit flags follow the edit rule:** `canEditTorCertificate(ctx, section)` wraps `assertCanEditTorCertificate`, and `toDTO` takes the actor — one rule, not a second copy.
- **Per-authority values in code** (Qusai's call, [[Key Decisions#2026-11-01 — Per-authority Form 020 values live in code, not on the License]]): `TOR_CERTIFICATE_AUTHORITY_DETAILS` in `tor-certificate.types.ts` — CARC `CARC.MTO.06` / `TAT Form 020 09.26 ISSUE/REV. 01/03`, EASA `EASA 147.0147` / `TAT Form 020 05.26 ISSUE/REV. 02/00`, GCAA `U.A.E. CAR 147/66/2023` / `TAT Form 020 08.26 ISSUE/REV. 02/03`; `nonTrainingCapabilityTitle(authority)`. The certificate is rebuilt and saved on every read, so existing ones pick the values up when next opened.
- **Limitation notes:** `t1Notes` / `t2Notes`; T1/T2 shown as Yes/No; notes required on Yes (frontend schema and `assertQmFieldsComplete`); `limitationDisplay` prints the notes or `No Limitation`.
- **Signatures:** read-only `SignatureValue` renders both images via `fileViewUrl`, which now passes full URLs through (approved by Qusai — shared helper); backend `signFileKey` normalises with `s3Service.toObjectKey` so the PDF signs URLs too.
- **TAT-560 — aircraft selection:** rows gain `included` (default true, kept across rebuilds) and `displayName`; the QM edits both while Pending QM (Qusai's call); PDF and read-only view list only included rows by display name; DSL required only for included rows; read-only after approval.

## Evidence

- `tor-certificate.types.spec.ts` (new) 14/14: each authority's reference/footer/title, PDF prints EASA title and footer and not `Non-CARC`, limitation notes, `canEditTorCertificate` (instructor blocked from QM section, QM allowed, owner/non-owner draft), included/displayName rows, legacy rows without `included` still print.
- staff-management specs 78/78.
- Commits: tat-app-ws `23f93743` (554/557/558/559), `cd40a8e0` (560); tat-prereq `6e7e0b9`, `fee1d73`.

## Still open

- [ ] Browser-test on staging: instructor in Pending QM sees read-only QM section; both signatures render (page and PDF); EASA/GCAA certificate shows its reference, title and footer; QM unticks and renames an aircraft.
- [ ] `License.approvalReference` is now unread — candidate for removal (not done).
- [ ] Move TAT-554/557/558/559/560 to READY FOR QA.

## Related

- [[Final TOR Certificate - Form 020 Alignment & Export]] · [[TAT-450 AC-45 Superseded by TAT-455 - Certificate Not Auto-Released]]
- [[Gotchas - Forms & Approval#A UI edit flag computed from the workflow stage alone shows a reviewer's controls to everyone in that stage (TOR certificate, 2026-11-01)]]
- [[Patterns - Architecture & Boundaries]] · [[Staff Management Subsystem & TOR Model]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Index|Work Index]]
