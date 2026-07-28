---
date: 2026-07-12
description: "Additional training records in Updated Training & Validity — manual external entries + auto-added online-course completions, with the 35h total moved server-side after I shipped it wrong"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# History Form — Training & Validity Records

The **Updated Training & Validity** section of the [[Staff Management Subsystem & TOR Model|History Form]] (TAT Form 031) was a **hard-coded catalog of 5 courses** — HF, MTOE, Aviation Legislation, Current Technologies, Train the Trainers (`MANDATORY_TRAINING_CATALOG`, keyed by `courseCode`). Instructors had no way to record any other training, and the 35h/2-year compliance total could only ever count those five.

> [!success] Shipped `dev` (2026-07-12)
> [[tat-app-ws Backend]] `74ce2dd5` → `fad80e1d` · [[tat-prereq]] `6e6f569` → `c99ad98`. Aircraft refresher fix: `c9854cb2` / `5c7e7a0`. **Not yet exercised on staging.**

## Two ways a record now lands

**1. Manual — external training.** Instructor adds subject + accomplished date + duration + certificate. Goes through the **same approval cycle** as the catalog rows (→ `PENDING_APPROVAL` → reviewer approves/rejects with a reason, full `History (N)` trail). Privileged (SA/AD/QM/TM) adds auto-approve and need no certificate, exactly as for catalog rows.

**2. Automatic — online-course completion.** Completing *any* online course that isn't one of the 5 mandatory refreshers now creates an **auto-approved** record. No certificate, no reviewer: TAT's own platform certified the completion, so there is nothing to check and no certificate for the instructor to upload — the same way mandatory refreshers completed online already behave.

`OnlineCourse.title` → subject · `OnlineCourse.duration` → hours (confirmed as *hours*, not minutes: the certificate service reads the same field as `courseDurationHours`) · `completedAt` → accomplished · due date derived. Records carry `source` + `onlineCourseId` + `onlineEnrollmentId`; **the enrollment id dedupes**, so re-firing completion is a no-op.

> [!note] The feature was a `return` statement
> `applyOnlineCourseCompletion` was **already fired on every completion** from both the progress and exam services — and did `if (!courseCode) return;`. Completing a mandatory refresher filled its slot; completing anything else **silently did nothing**. No new hook was needed. See [[Patterns#A wired hook with an empty branch is where a feature is supposed to live (2026-07-12)]].

## Design decisions

- **Separate `additionalTraining` array**, deliberately not merged into `mandatoryTraining`. Keeps the catalog derivation clean and — critically — keeps `isMandatoryTrainingValidForUser` (which gates TOR `ACTIVE`) checking **only the 5 required courses**. An instructor adding an extra course must never be able to block or unblock their own TOR.
- **Expiry is derived, not swept.** Past its due date (accomplished + 2y) a record drops out of the list and the total, but the row survives in the DB with its full `reviewHistory` — "no longer in the list, but in the history log". **No cron.**
- **A course with no `duration` still produces a record, at 0 h.** It appears but contributes nothing, rather than silently vanishing — which is the behaviour this feature exists to fix. Worth making `duration` required when creating an online course.

## The 35h badge — a bug I shipped and then fixed properly

`5159a07` (this morning) rewired the badge from summing mandatory-training rows to reading training-history's `totalDurationHours`. But `addTrainingHistory` hardcodes **`durationHours: 0`** — so it would have read **0 / 35 h for everyone**. A screenshot showing `56 / 35 h` is what caught it.

**I framed the question badly, got a reasonable answer to the wrong question, and changed a Part-147 compliance number without checking it against real data.**

The fix is not a revert — it's moving the rule. `calculateTrainingValidityHours` now computes the total **server-side** (approved + non-expired, across the catalog **and** the additional rows) and returns it as `totalDurationHours`. The FE displays it and never recomputes. See [[Gotchas - Backend Services & Environment#Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)]] and [[Patterns#The backend owns business rules; the frontend renders the answer (2026-07-12)]].

## Aircraft qualification — wrong refresher date

The qualification card labelled **`refresherDate`** as "Refresher" — but that's when the *last* refresher was **performed**, not when the next is **due**. It read `Refresher: 10 Jul 2026 / Expires: 09 Jul 2028`: two years apart.

The next refresher falls due **one month before expiry** — the same rule mandatory training already used. Added `calculateAircraftRefresherDueDate`, exposed a derived `refresherDueDate`, and the card now reads **"Refresher due"** — which makes the label honest. See [[Gotchas - TOR & Staff Management#`refresherDate` is when the LAST refresher happened, not when the next is due (2026-07-12)]].

## Open

- [ ] **Nothing here has been exercised.** Every feature touched this week had latent bugs the moment it was first actually driven.
- [ ] Consider making `OnlineCourse.duration` required — auto-added records are only as good as the course data.
- [ ] **Pre-existing bug left alone**, sitting right beside the code I touched: the mandatory branch of `applyOnlineCourseCompletion` does `{ ...slots[index] }` — spreading a live Mongoose subdocument, the trap that silently drops nested arrays (it already ate the mandatory-training review history once). See [[Gotchas - Backend Schema & Data#Spreading a Mongoose subdocument (`{...subdoc}`) drops nested arrays on re-save (2026-07-09)]].
- [ ] The training-history section still stores `durationHours: 0` and lands records straight at `APPROVED` (per TAT-417 AC-17). It no longer feeds the 35h total, so this is now harmless — but the field is dead weight.

## Related

- [[Refresher Date Override - SA-Only Absolute-Date Override]] — SA-only override of the computed refresher date on these mandatory-training slots (design, 2026-07-19)
- [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]]
- [[TAT-423 Assessment Report Rubric]] — the other half of this session
- [[History Form Audit Log]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Debugging & Root Cause Analysis]] · [[Systems Thinking]] · [[Code Quality]]
