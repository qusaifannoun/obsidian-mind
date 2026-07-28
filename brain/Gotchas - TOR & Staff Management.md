---
date: 2026-07-28
description: "TOR activation, sit-in eligibility, staff profile and qualification traps in the staff-management subsystem"
tags:
  - brain
---

# Gotchas - TOR & Staff Management

Split out of [[Gotchas]] on 2026-07-28, which had reached 96KB. Entries moved verbatim; [[Gotchas]] keeps the one-line index. **Add new entries here, not to the index.**
## The TOR "is it active?" rule was written TWICE — the reader lied and the writer was right (2026-07-12)

> [!danger] The TOR details page showed **Active with no creation/expiry date**. Not a display bug — the TOR was never activated, and the badge was lying.
> Two implementations of the same rule, drifted:
> - **`staff-tor-sync.processor`** (persists `status`, stamps `activatedAt` + 2-year `expiresAt`) required **six** gates: forms, required docs, history form, mandatory training, aircraft qualifications, assessments.
> - **`evaluateTorCompletion`** (`staff-management.service`, behind `GET /tors/:id/details`) checked only **three**: forms, history form, mandatory training. It never looked at documents, qualifications, or assessments.
>
> So a TOR sitting between the two bars reads `ACTIVE` on the details page while the processor correctly keeps it `DRAFT` — and because the dates are only stamped by the processor, `activatedAt`/`expiresAt` stay `null` **forever**. The same weak rule fed `incomplete`, so the Pending-TORs worklist under-reported too. Meanwhile the *list* endpoint returns the **persisted** status, so list and details could contradict each other on the same TOR.
>
> **Diagnosis trick that settled it in one query:** 46 `tor_sync_completed` audit rows (worker alive and running) + **every TOR still persisted as `draft`** ⇒ the writer never agreed the TOR was active, so the reader was the liar. Fixed by extracting `staff-tor-activation.util.ts` (`resolveTorStatusFromGates`) and having both callers use it (`57bb7a1c`).
>
> **This is the THIRD duplicated-rule bug this week** ([[Gotchas - Backend Services & Environment#Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)|the 35h badge]], [[#The 35h/2yr badge summed the wrong collection (2026-07-12)|the collection mismatch]], and this). See [[Patterns#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]].

## An "ACTIVE" record with null timestamps means the WRITE path never ran — check the writer, not the renderer (2026-07-12)

> [!warning] When a status field and its timestamp disagree, the status is derived-at-read and the timestamp is persisted. The persisted one is the truth.
> Qusai reported "creation date and expiry date don't show on the TOR once it's active". Instinct says *rendering bug* → check the FE. Wrong. The FE was reading the right fields (`activatedAt → creationDate`, `expiresAt → expiryDate`); they were simply `null` in Mongo.
>
> **A status that comes from a live derivation and a timestamp that comes from a persisted column can disagree.** Whenever a record looks like it's in state X but the timestamp for entering X is empty, the transition into X never actually happened — go read whatever is supposed to *write* it. Don't debug the renderer.
>
> Also worth knowing: the two "active" TORs in the dev DB are **June-6 seed fixtures** inserted straight into Mongo with `status: active`, zero audit rows, and a dead `effectiveFrom`/`effectiveTo` schema. They are not evidence of a working activation path — **no TOR has ever legitimately activated**.

## The Assessment Report is NOT a TOR form — one hardcoded "missing" row hid two outstanding assessments (2026-07-12)

> [!warning] Activation requires an approved assessment **per aircraft type**, but the TOR details page showed a single `Assessment Report — missing` row
> Assessments live in `staffassessments`, not in `stafftorforms`. So the details page — which builds the Forms section by matching templates to `StaffTorForm` instances — always found no instance for `assessment_report` and rendered `status: "missing"`, **even when an assessment existed and was approved**.
>
> On Qusai's CARC TOR: 3 aircraft types, 3 approved qualifications, **1** approved assessment. Two assessments outstanding — and nothing on the screen said so. He reasonably believed "all records are approved and successfully completed". The UI gave him no way to know otherwise.
>
> Fixed by expanding the template into one row per aircraft type (`mapTorDetailsAssessmentForms`), each with its real status (`approved → active`, `pending_tm_review → pending_approval`, else `missing`). **Note `assessment_report` must stay `mandatory: false`** — making it mandatory would make `deriveTorStatusFromForms` look for a `StaffTorForm` instance that never exists, and no TOR would ever activate. The assessment gate enforces it instead.

## `refresherDate` is when the LAST refresher happened, not when the next is due (2026-07-12)

> [!warning] The aircraft-qualification card labelled `refresherDate` as "Refresher" — it read `Refresher: 10 Jul 2026 / Expires: 09 Jul 2028`, two years apart
> Two distinct dates: **`refresherDate`** = when the refresher was performed (an input the PIC sets on approval); **`refresherExpiresAt`** = that + 2 years. The date a user actually wants — *when is the next one due* — is **neither**: it's `refresherExpiresAt − 1 month`, the same rule mandatory training already used (`calculateTrainingRefresherDate`).
> Added `calculateAircraftRefresherDueDate` and a derived `refresherDueDate` on the response; the card now says **"Refresher due"**, which also makes the label honest — it's a deadline, not a record of the past. **A field name that describes the past being rendered as a future deadline is the same class as [[#`StaffSitIn.active` means "in progress", NOT "exists" — completing the flow makes the record invisible (2026-07-12)|`StaffSitIn.active`]].**

## The 35h/2yr badge summed the wrong collection (2026-07-12)

> [!warning] The History Form's "Min 35 hrs / 2 years" total was computed from mandatory training; the rule is met by training history
> The FE summed **`mandatoryTraining` items** client-side (2-year window, **no status filter**, so it counted unapproved records). The Part-147 rule is met by **`trainingHistory`** records, which the backend sums properly — approved-only, windowed — in `calculateTotalTrainingDurationHours`. Different collections, different numbers.
> The FE was **already fetching the authoritative value** (`totalDurationHours` on the training-history response), mapping it into its type, and **throwing it away**. Fixed `5159a07` by using it and deleting the client-side reduce.
> **Two lessons.** (1) A duplicated business rule in the FE isn't just a drift risk — it can be computing something else *entirely* while looking plausible. (2) **I nearly "refactored" this silently** on the assumption it was the same rule implemented twice; reading the backend showed it summed a different collection, and swapping the number in a regulatory context is a BA decision, not a cleanup. **Check what a number means before you make it authoritative.**
> Related: **the 35h minimum is enforced NOWHERE server-side** — no `MIN_HOURS`/`35` anywhere in `libs/database` or `libs/app-data`, and `isMandatoryTrainingValidForUser` (which gates TOR activation) never reads hours. The badge is decorative.

## `StaffSitIn.active` means "in progress", NOT "exists" — completing the flow makes the record invisible (2026-07-12)

> [!danger] `completeFinalAssessment` sets `status = APPROVED` **and** `active = false` together. Any read that filters `active: true` loses the record the instant the cycle succeeds.
> Three separate read paths made this mistake. **I wrote one of them myself, hours after diagnosing the other two.**
>
> - `getSitInForTrainee` queried `{ userId, active: true }` → threw `sitInNotFound`. The FE treats 404 as "no sit-in yet", so the History Form rendered an **empty section** right after a successful approval — signature, assessments, assessor name all intact in the DB, just unreachable. (Fixed `0bab2340`.)
> - `getCourseInstructors` (the new Instructors tab) joined sit-ins on `active: true` → a completed instructor rendered as **"No sit-in" / "Unassigned"**. (Fixed `0c1f1cbb`.)
>
> **The correct predicate for a read is `active OR status === APPROVED`** — that also excludes a *moved-away* sit-in (`active: false`, non-approved), which should stay hidden. `active: true` alone is correct **only** where "in progress" is genuinely the question: the eligible-instructor list (which separately queries completed ones), the move pre-check, the evaluator worklist, and the `otherActiveSitIns` guard.
>
> **The general trap: a boolean that flips as a side effect of success.** Every reader reaches for it as an existence check, and the bug only appears on the happy path — so it survives every test that stops short of completion. Prefer deriving "in progress" from `status` over a denormalised flag; failing that, never let a read filter on it.
>
> Meta-lesson: I fixed this in one service and then reproduced it in a new endpoint I wrote the same day, because I'd written that endpoint *before* understanding the field. **After learning a field's semantics, grep every existing use — including your own uncommitted code.** See [[TAT-429 Sit-In Eligibility & Move Semantics]].

## tat-prereq staff self-profile — stale mapper, dead per-user record endpoints, and an unmapped-enum crash (2026-07-08)

Three distinct traps from the [[Staff Self-Service Polish - Nationality, Password, Profile Data]] batch on [[tat-prereq]], all only visible with a **real staging login** (offline fetchers return dummy data):

- **A FE mapper written against a "thin" endpoint silently drops fields once the backend expands it.** `getMyStaffProfile` (`GET /staff-management/profiles/me`) was mapped when the endpoint returned identity + role only ("no personal fields yet"), so it hard-omitted nationality, national ID, DOB, gender, place of birth, and office location. Staging now returns the **full** record, but the stale mapper kept dropping them → every field rendered `—` on My Profile. The endpoint's *view* looked broken; the bug was the mapper. Lesson: a mapper is a contract snapshot — re-diff it against the live response whenever "the page shows blanks but the API has data." Same class as the [[Gotchas - Frontend#FE hook built against a speculative endpoint the backend never shipped|speculative-endpoint]] gotcha, inverted (endpoint grew, mapper didn't).
- **`/staff-management/qualifications` & `/assessments` (per-user, `?userId=`) do NOT exist — 404.** The profile panels were built against these speculative routes. The real data is **per-TOR** (`tors/:torId/aircraft-qualifications`, `tors/:torId/assessments`); there is **no per-user list route**. To show them on a profile you must **aggregate across the member's TORs** (`useStaffTors` → fan-out per TOR via `useQueries` → flatten; reuse the TOR-detail query keys so nothing double-fetches). Compounding it: the global React Query `retry: 1` **doubles** every 404 (a 4xx never recovers on retry), and dev StrictMode doubles again — so a dead endpoint shows up as a burst of 2–4 identical failing requests, not one. Set `retry: false` on known-missing/4xx-only queries, or aggregate the real endpoints.
- **`STATUS[value].cls` crashes when the backend sends an enum value the local style map doesn't have.** A `Record<Enum, {label,cls}>` lookup returns `undefined` for any unmapped status/type, and `.cls` then throws (`Cannot read properties of undefined`) — it took down the whole Qualifications panel. Always go through a fallback (`STATUS[v] ?? { label: v, cls: NEUTRAL }`) so an unmapped backend enum degrades to a neutral badge instead of white-screening. The TS union gives false confidence — the backend enum can hold values the FE union doesn't.

## ~~`tor.aircraftTypeIds` is never populated — the keystone gap~~ — RESOLVED, and I got this badly wrong (2026-07-05 → corrected 2026-07-12)

> [!success] `tor.aircraftTypeIds` **IS** populated. Do not act on the original claim below.
> `addAircraftTypeToTor()` `$addToSet`s the aircraft type whenever an aircraft qualification reaches **`APPROVED`** (three call sites in `staff-aircraft-qualification.service.ts`), and `resolveTorAircraftTypeIds(…, { backfill: true })` lazily derives + writes it from approved qualifications for any TOR that predates that.
>
> **How I got it wrong — and the vault already had the answer.** The 2026-07-05 inspection recorded it as never-written; the backend fixed it in the 2026-07-06 drop, and **the vault says so in two places**: [[TAT-409 Bug & Gap List]] (*"The keystone C1 is now populated on qual approval"*) and [[TAT-409 Ticket Groups & Inspection Map]] (*"the keystone is resolved — populated via idempotent `$addToSet` when an aircraft qual is approved"*). On **2026-07-12 I "re-confirmed" it as still live anyway** and told Qusai every aircraft-type course returns zero eligible instructors.
>
> **Two failures stacked:**
> 1. **A grep that couldn't find the truth.** I searched for `aircraftTypeIds` and a write-keyword (`$addToSet|push|updateOne|save`) **on the same line** — and both writers are multi-line `$addToSet` blocks. A grep requiring two tokens on one line silently misses any multi-line construct, and multi-line is the *norm* for Mongo update operators. **A negative grep is not proof of absence.** Same failure that made the first nullable-enum CI check worthless (it matched per-`@Prop` instead of per-field, and both false-positived *and* false-negatived on the very bug it was written for).
> 2. **I trusted a stale Gotcha over newer notes in the same vault.** The Gotchas entry was the *oldest* record and the one I reached for. **When a Gotcha and a work note disagree, the work note is usually newer — and either way, the code decides.** This is the second time in a week a stale vault note nearly produced a wrong fix (the other: [[Patterns]] claiming SA lacks `SM_SAVE_MANDATORY_TRAINING`, when SA has it). **Gotchas rot. Re-verify against source before repeating one, and correct it in place when it's wrong.**
>
> Original (now stale) claim, kept for the record: *"The only write is `[]` at TOR creation. No endpoint/logic ever adds an aircraft type. TAT-422's `create` calls `assertAircraftOnTor` → always fails on app-created TORs."* The `assertAircraftOnTor` half may still warrant a look, but the never-populated premise it rested on is false.

## Sit-in eligibility was circular — the TOR gate made new-instructor onboarding impossible (2026-07-12)

> [!danger] The Add Instructor list required an Active TOR to grant the sit-in that is a precondition for an Active TOR
> A sit-in is how a **new** instructor is onboarded: they're enrolled into a live course as a *student* to learn from its teaching instructor, who then evaluates them. So the candidate has nothing yet — no license, no qualification, no active TOR. But `getEligibleCourseInstructors` applied [[TAT-429 Sit-In Eligibility & Move Semantics|TAT-424's]] Active-TOR filter, closing a loop across four services:
>
> `TOR → ACTIVE` needs `historyApproved` (`staff-tor-sync.processor.ts:155`) → needs the **sit-in final assessment** (`assertHistoryFormReadyForApproval`) → needs a **sit-in**, and the *only* `sitInModel.create` in the repo is `addCourseInstructor` → which required an **ACTIVE TOR**.
>
> **How to spot this class of bug:** the eligible list wasn't wrong, it was *empty* — and an empty list reads as "nobody qualifies", not "the gate is impossible to pass". The tell was that the ticket's own story sentence (*"instructors who still require Sit-In completion"*) describes someone who **cannot** satisfy the gate the code applied. **When a precondition and the thing it guards can only be satisfied by each other, no amount of data setup will fix it — check for a cycle before hunting for missing records.**
>
> Root process cause: **TAT-424 and TAT-429 contradict, and each carries a lone "Approved" comment 13 days apart — nobody read them together.** 424's AC-09 ("applies to Course instructor assignment") over-reached into 429's bootstrap path. Gate the *qualification* flows on TOR; never gate the *pre-qualification* flow on it.
