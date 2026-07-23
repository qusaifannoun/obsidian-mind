---
date: 2026-06-02
description: "Things that have bitten before and will bite again — pitfalls, edge cases, and testing traps"
tags:
  - brain
---

# Gotchas

Things that have bitten before and will bite again.

## "Verified" is a timestamp, not proof the fact still holds — and a consistency gate rejects corrections as readily as errors (2026-07-23)

> [!warning] The vault's `verified` marker records *when* a fact was checked, not that it is *still* true. A bullet verified three weeks ago is trusted today even if the code moved underneath it.
> This is a property of the vault-as-state-store, and it bites the [[TAT Delivery Orchestrator|delivery pipeline]] hardest: the dependency DAG reads vault state to decide a slice's prerequisites are done, so a stale "verified" becomes a **false satisfied dependency** the whole pipeline builds on.
>
> **Second trap in the same place: a consistency-based write gate filters noise, not falsehood.** A gate that only admits writes agreeing with the incumbent rejects a *correction* exactly as readily as an *error* — both disagree with what's stored. Consistency is not truth; a confidently-wrong bullet becomes self-protecting.
>
> **Mitigation direction** (proposal, not built): store a **code pointer** (`file:line`/symbol/test) with each verified bullet so re-verification is grep/CI instead of re-reasoning, and a **provenance field** (which model/harness wrote it). Full design + the drift asymmetry: [[Vault Provenance & Verification Model]]. Same family as [[Agent Handoff Protocol]]'s "never claim verified if you only built or typechecked it."

## "Approved" doesn't lock itself — each tat-prereq form type enforces its own post-approval read-only, so one ships unlocked (2026-07-15)

> [!warning] An Approved **Form 32** was still editable by the owning instructor — they could reopen and resubmit it — while **Form 285** and the **Assessment** report had locked on approval all along.
> There is no shared "approved ⇒ read-only" mechanism across the [[tat-prereq]] forms; each one re-implements it. Form 285 locks + renders a PDF; the Assessment cards flip to `reportReadOnly`; **Form 32 did neither.** Its list wrapped approved rows in a live `<Link>`, and its editor gated reopen on ownership alone (`canReopen = isOwner && status === 'Approved'`), so approval wasn't final for the person it certifies.
>
> **The trap: partial coverage reads as done.** Two of three forms locked, so "approved forms are read-only" felt true — until you check the third. When a cross-cutting rule (lock-on-approve, audit-on-write, evidence-required) is implemented per-instance instead of shared, **audit every instance, not the one in front of you** — same shape as the Zod+RHF and TOR-activation duplications.
>
> Fix locks the owner (`isSelf && !canReview && status === 'Approved'`): non-clickable rows + an editor redirect so a direct URL can't bypass it; reviewers keep full access. **Still unexercised in a browser**, and *whether* to remove the owner's reopen entirely is an open product question. See [[Form 32 Approved Lock - Owner Read-Only]].

## The same state has two names — backend serializes `PENDING_PIC` as `'pending'`, the FE expects `'pending_pic'` (2026-07-15)

> [!danger] An instructor's aircraft qualification was invisible to its reviewer — no Approve/Reject controls, blank badge — because the FE literal for that state never equalled the string the backend actually sends.
> Backend `StaffAircraftQualificationStatus.PENDING_PIC` serializes as **`"pending"`** (`enums.ts:1184`; external-teaching shares it at `:1192`), but the FE type and **every** comparison expect **`"pending_pic"`** (`qualification.ts:14`). So `status === 'pending_pic'` was always false: the reviewer gate `canReview && status === 'pending_pic'` (`TorQualifications.tsx:238`) never rendered, and `STATUS_LABEL/STATUS_STYLE["pending"]` were `undefined` → blank badge.
>
> **The tell: exactly one status value misbehaved.** Every other enum member matched byte-for-byte, so the whole qualifications UI looked healthy and only this one state silently dead-ended — instructor stuck, admin with no action. When a status-driven UI works for N-1 states and mysteriously dies on the Nth, suspect the *string*, not the logic.
>
> Fixed by normalizing at the **fetcher boundary** (`src/api/Qualifications/qualifications.ts` maps `"pending" → "pending_pic"` on every read, both `StaffQualification` and `ExternalTeachingActivity`). No write-side mapping — `status` is server-controlled. **Still unexercised in a browser.** Same family as the [[Patterns]] "keep the FE enum mirrored to the backend" rule: the enum *member* matched, its *serialized value* didn't. See [[Aircraft Qualification Approval Invisible - Status String Mismatch]].

## The Approve button approved the form, then asked the backend to approve it again — and showed you the 400 (2026-07-14)

> [!danger] The approval **succeeded**. The error on screen was the *second* attempt failing because the first one worked.
> Form 32's Approve fired **two** calls — `save`, then `approve`. But every role that can see that button (SA/AD/QM/TM) is in `FORM_32_AUTO_APPROVE_ROLES`, so **the save already performs the approval**: it sets `workflowStage = APPROVED`, writes the `FORM_APPROVED` audit entry, and enqueues the TOR sync. The follow-up `approve` then hit the guard with the stage already `APPROVED` and threw *"Invalid form workflow transition for your role"*.
>
> **The scary shape of this bug: a destructive-looking error message on a write that fully succeeded.** The user sees failure, retries, or escalates — while the audit log and the TOR sync say it worked. Trust the persisted state over the toast.
>
> **What gave the diagnosis away:** the *same file* had a "Save & approve" path that called save **only** — correct. Two paths, one right, one wrong. When a codebase contains both the right and the wrong version of the same call sequence, the right one is your spec; diff them before you debug anything else.
>
> Fixed in `063e0df` (`onApprove` calls save only) — **and the fix is still unexercised.** Pre-existing bug; the Zod+RHF refactor carried the original two-call sequence over verbatim, so the refactor exposed it rather than caused it. Root cause upstream: [[Staff Management - Unreachable Backend Endpoints#4. The Form 32 approve endpoint is dead by role algebra — the class this sweep is blind to (2026-07-14)]].

## A form with a schema can still be unvalidated — partial Zod compliance looks clean and isn't (2026-07-14)

> [!danger] `MandatoryCourseRow` (`HistoryFormView`) **had** a Zod schema — and kept its evidence file in a `useState` **outside** it. So the file was never validated, by anything.
> A grep for `useZodForm` marks that file compliant. It isn't. **The dangerous state is partial compliance, not absence** — a file with zero schemas advertises itself; a file with four schemas and one escaped field looks done.
>
> `HistoryFormView` showed **15 `useState` alongside 4 `useZodForm`**, and `SitInSection` 3 alongside 2. Both were on my "complies" list. Both were violators.
>
> **Audit by counting fields against schemas, not by asking "does this file import the hook?"** And the inverse error is just as real: `Form32Editor`'s "11 `useState`" was really **5 form-state buckets** — the rest were legitimate dialog/UI state the rule never covered. The first count overstated the debt; the compliance list understated it.

## Scoping debt from the files you happen to be looking at under-counts it (2026-07-14)

> [!warning] Qusai named two files that broke the Zod+RHF rule. A repo-wide grep found **six**. Two (`Form32InstanceList`, `SitInSection`) were on nobody's list.
> The two he spotted were simply the two he had open. **The only honest scope for a convention violation comes from grepping the whole repo for the convention** — never from the sample that prompted the complaint.
>
> Worst offender was the one nobody mentioned: `TorQualifications`, **8 distinct forms in 18 `useState`**, with state buckets *shared across mutually-exclusive flows* — one `file` serving both the submit-evidence and renew paths, one `reason` serving two different rejection actions. That sharing is invisible until you try to give each form its own schema.

## A soft-delete via `.save()` cannot delete an invalid document — and invalid documents are what you want to delete (2026-07-12)

> [!danger] Setting `deletedAt` and calling `doc.save()` makes Mongoose re-validate the WHOLE document. A record missing required fields cannot be saved — so it cannot be deleted.
> The SA force-delete 500'd on exactly the records it exists to remove:
> ```
> StaffAssessment validation failed: assignedBy is required, assignedAt is
> required, assessmentType is required.
> ```
> **A delete implemented via `save()` can only delete documents that don't need deleting.** Use `updateOne({_id}, {deletedAt: new Date()})` — it doesn't run full-document validation. Also tolerate missing fields when writing the audit row (`assessment.status ?? null`).
>
> **The wider trap: raw-inserted documents that predate a `required: true`.** Staging has `StaffAssessment` docs with no `assignedBy` / `assignedAt` / `assessmentType` — inserted straight into Mongo, bypassing the schema, before those fields existed. Same family as the CARC-only `assessment_report` template. **Every write through `.save()` fails on them**, so they can't be repaired in the app either — delete is the only operation that works. And they're why the FE crashed on `TYPE_LABEL[assessmentType]`: the field is simply absent.

## Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)

> [!danger] I shipped a wrong compliance number because the FE recomputed a rule the backend already owns
> The History Form's "Min 35 hrs / 2 years" badge was summed **client-side** from the mandatory-training rows. I asked Qusai whether the rule read mandatory training or training history, framed the question badly, got a reasonable answer to the wrong question, and rewired it to training history (`5159a07`) — which stores `durationHours: 0`, so the badge would have read **0 / 35 h for everyone**. A screenshot showing `56 / 35 h` is what caught it; I had changed a Part-147 number without checking it against real data.
>
> **The fix is not "revert" — it's to move the rule.** `calculateTrainingValidityHours` now computes the total on the backend (approved + non-expired, across the catalog *and* additional training) and returns it as `totalDurationHours`. The FE displays it and never recomputes. Same for the aircraft-qualification refresher date (`calculateAircraftRefresherDueDate`).
>
> **Rule: if a number is a business rule, the backend owns it and the FE renders it.** A duplicated rule doesn't just drift — it can be computing something else entirely while looking perfectly plausible. Two of the worst bugs this week were duplicated-rule bugs ([[Gotchas#The 35h/2yr badge summed the wrong collection (2026-07-12)|the collection mismatch]] and this one).

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
> **This is the THIRD duplicated-rule bug this week** ([[Gotchas#Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)|the 35h badge]], [[Gotchas#The 35h/2yr badge summed the wrong collection (2026-07-12)|the collection mismatch]], and this). See [[Patterns#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]].

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
> Added `calculateAircraftRefresherDueDate` and a derived `refresherDueDate` on the response; the card now says **"Refresher due"**, which also makes the label honest — it's a deadline, not a record of the past. **A field name that describes the past being rendered as a future deadline is the same class as [[Gotchas#`StaffSitIn.active` means "in progress", NOT "exists" — completing the flow makes the record invisible (2026-07-12)|`StaffSitIn.active`]].**

## Mongoose enum + `default: null` rejects null — 5th instance, now CI-checked (2026-07-12)

> [!danger] Mongoose's enum validator whitelists `undefined` but **rejects `null`** — so `default: null` on an enum fails its own validation on every document that instantiates the field
> `StaffAssessmentReport.overallRating` was `enum: AssessmentOverallRating, default: null`. The parent auto-creates the report subdoc (`default: () => ({})`), so **every assessment create 500'd**: `report.overallRating: `null` is not a valid enum value`. Latent since TAT-423 shipped.
>
> **The fix is to permit null in the values** — the pattern three other nullable enums in this codebase already use correctly (`staff-tor-form`, `staff-qualification`, `exam-submission`), which is exactly *why* those work and this one didn't:
> ```ts
> enum: [...Object.values(MyEnum), null],
> default: null,
> ```
>
> **This was the 5th instance.** The [[Gotchas#Nullable enum + `default: null` crashes Mongoose on create (backend, 2026-07-05, recurring)|2026-07-05 note]] already said it deserved *"a lint/schema-review rather than a one-off patch"* — that call was right, and it took three more instances to act on. Now enforced: **`npm run check:schemas`** (`scripts/check-nullable-enums.mjs`, `.github/workflows/checks.yml`). Three more latent copies were found and fixed in `user.schema` (`qualificationCategory` ×3 — unexploded only because those subdocs are `default: null` on `User`, so they're never instantiated on a plain user create).
>
> **The check itself nearly shipped useless.** My first version regexed the `@Prop({…})` body for `enum:` + `default: null` — and was wrong **in both directions**: it false-positived on `course-schedule` (an unrelated nested `default: null` in the same `@Prop`) and **false-negatived on the very bug it was written for** (a single-line prop let the enum-value capture run past the comma and swallow `default: null`, so it saw "null" in the enum and passed). **A check that misses the bug it was written for is worse than no check — it certifies the code as clean.** The working version resolves each `enum:` field's *enclosing object* and reads that object's own top-level `default:`. Verified both ways: clean on the fixed tree, catches all 4 real violations when the fixes are reverted.

## A browser MIME type is not a file extension — assessment video upload never worked (2026-07-12)

> [!warning] The FE sends `file.type` (`video/mp4`); the backend compared it to bare extensions (`mp4`). Nothing could ever match, so **every** upload 400'd.
> `assertValidVideo` normalised `fileType` and checked it against `STAFF_ASSESSMENT_VIDEO_EXTENSIONS = ["mp4","webm","mov",…]`. The browser's `File.type` is a **MIME type**, so `"video/mp4" !== "mp4"` — the whitelist was unreachable and the feature had never once worked. Widening the whitelist would have fixed nothing.
> **Validate the uploaded `fileKey`'s extension, not the browser's MIME.** The backend already rewrites extensions on upload (see [[Gotchas#tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original]]), so the key is the authoritative source. The browser's MIME is *also* unreliable — it's frequently an empty string for `.mkv`/`.avi`.

## An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)

> [!danger] Four times in one week, a "missing feature" was a **fully-working backend endpoint with no frontend affordance**
> - **Aircraft-qualification writes** — FE stubbed the section read-only with a "no endpoint yet" note. `GET/POST/PATCH …/aircraft-qualifications` had existed all along.
> - **Mandatory-training privileged save** — backend auto-approves for SA/AD/QM/TM and doesn't require evidence. The FE only ever built the *instructor* path: one button, disabled without a certificate, wired to the one endpoint that rejects privileged editors by design. SA could not record training for an instructor at all.
> - **Course instructors list** — the endpoint existed; nothing displayed it, so adding an instructor gave zero feedback.
> - **External teaching** — the code said *"backend has no list/approve surface yet"*. `GET …/external-teaching`, `PATCH …/approve` and `PATCH …/reject` all existed, and the FE even had approve/reject **mutations that nothing could call** because no UI listed the activities.
>
> **Rule: grep the backend controller before believing a frontend gate, a stub, or a comment.** In two of the four, the misleading comment is *why* the gap survived — someone read it, believed it, and moved on.
>
> **The mechanical version:** diff every backend route against every URL the frontends call. Reduce each route to its non-generic literal path segments and check whether any single FE file contains all of them — this survives the `${base(id)}/…/suffix` split that defeats a naive prefix grep. Run on all 108 `staff-management` routes it found **4 dead endpoints in one pass**, including *nobody can pause a TOR*. See [[Staff Management - Unreachable Backend Endpoints]].
>
> **Its blind spot:** it only finds endpoints nothing *calls*. It cannot find an endpoint that is called but only ever by the wrong role — which is exactly how the mandatory-training privileged save hid. That needs a role-vs-guard audit.

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

## Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)

> [!warning] Fixing a deadlock doesn't reveal one bug — it reveals every bug downstream of it, all at once
> The sit-in cycle had **never once run end to end** (the [[Gotchas#Sit-in eligibility was circular — the TOR gate made new-instructor onboarding impossible (2026-07-12)|circular TOR dependency]] made it impossible). Within an hour of unblocking it, driving the flow for real surfaced: the completed sit-in 404'ing, the instructors list showing "No sit-in", `SIT_IN_CREATED` recording the **instructor** as the actor instead of the SA/TM who clicked Add Instructor (an audit trail that lies is worse than one that's missing), and `sit_in_moved` rendering as a raw enum string.
>
> None were regressions — all were **pre-existing and unreachable**, sitting behind the deadlock since TAT-421 shipped. Same shape as the [[Gotchas#`autoIndex: true` creates indexes but NEVER drops them — renaming an indexed field leaves a live unique constraint (2026-07-10)|stale sit-in index]]: code that has never been exercised is not "working", it's **untested**, and it will fail in a cluster the moment someone reaches it. **When you unblock a dead path, budget for the bugs behind it rather than treating the unblock as done.**

## `autoIndex: true` creates indexes but NEVER drops them — renaming an indexed field leaves a live unique constraint (2026-07-10)

> [!danger] `E11000 duplicate key ... index: enrollmentId_1 dup key: { enrollmentId: null }` — on a field that no longer exists in the schema
> [[tat-app-ws Backend]] connects with `autoIndex: true` (`database.module.ts:232`). Mongoose **creates** every index the schema declares and **never drops** ones it no longer declares. So when `cd30796b` (TAT-429, 2026-06-26) renamed `StaffSitIn.enrollmentId` → `periodEnrollmentId`, the old `enrollmentId_1` index — **`unique: true` with no `sparse`** — stayed alive in `staffsitins`.
>
> **Why it detonates on the *second* insert, not the first.** A non-sparse index still indexes documents where the field is *missing*, storing them under `null`. No code writes `enrollmentId` anymore, so doc #1 indexed as `null` fine; doc #2 collided with it. Any smoke test that created a single sit-in passed. Every `sitInModel.create()` on staging had been broken for two weeks before anyone hit it.
>
> **Rules:**
> - Renaming or removing an **indexed** field needs a **migration that drops the old index**. `autoIndex` will not do it, and a redeploy will not do it.
> - A `unique` index without `sparse` on an optional field is a bug waiting for the second document. If the new field is `default: null`, it **must** be `sparse` (the rename got this right — the leftover was the problem).
> - Suspect a stale index whenever E11000 names a field that isn't in the current schema. Check with `db.<coll>.getIndexes()`, not the schema file.
>
> **Second-order damage: self-concealing orphans.** `addCourseInstructor` created the `Enrollment`, *then* the sit-in, with no transaction or rollback. Each failed attempt left an orphan enrollment behind. `getEligibleCourseInstructors` filters out anyone already enrolled — so the affected instructor silently **vanished from the eligible-instructors dropdown**, and a retry returned a misleading `400 "Instructor is not eligible"` instead of the real error. A half-completed write that makes its own victim invisible generates no bug report. **When two writes must both land, either transact them or compensate on failure — Atlas is a replica set, so transactions are available.**
>
> Fix: `scripts/migrations/2026-07-10-drop-stale-sitin-indexes.js` (drops stale indexes, soft-deletes orphans) + rollback & check-reorder in `enrollment.service.ts`. Context: [[Stale Sit-In Index & Orphaned Instructor Enrollments]].

## Notification URLs baked at seed time + skip-existing seeding = env-var changes silently ignored (2026-07-09)

> [!danger] Setting `STAFF_MANAGEMENT_URL` after the first seed never took effect — staff-management notification links kept pointing at the dashboard host
> Two [[tat-app-ws Backend]] behaviors compounded into a "we added the env var but links are still wrong" bug:
> - **Bootstrap resolved the base URL *once, at seed time* and stored it as an absolute URL.** `bootstrap.service.ts` called `generateNotificationUrl(param.url, {}, {clientApp})` while seeding, baking e.g. `https://<base>/staff/{{userId}}` into `NotificationSetting.parameters[].url`. If `staffManagementUrl` was empty when the settings were first seeded, `resolveClientBaseUrl` fell back to `dashboardUrl` — so the rows permanently held the dashboard host.
> - **Re-seeding skips any setting whose name already exists** (`if (settingExists) { skippedCount++; continue }`). So adding `STAFF_MANAGEMENT_URL` later and rebooting did **nothing** — bootstrap never re-processes existing rows.
> - **The runtime resolver was dead code.** `sendNotification` re-calls `generateNotificationUrl` on the stored URL and *does* pass `param.client` as context — but `generateNotificationUrl` only resolves a base when `!url.startsWith("http")`. Since the stored URL was already absolute, the guard was skipped and the send-time context never mattered.
>
> **Fix (option A, 2026-07-09):** stop baking — store the **relative** `param.url` + `client` on the setting, and let `sendNotification` resolve the base per-client on every send. Plus a migration (`2026-07-09-relativize-notification-urls.js`) to relativize the already-baked rows so the runtime resolver takes over. Future host changes now just work with a redeploy. Deleted the earlier `2026-07-08-repoint-staff-notification-urls.js` (it re-baked absolute — re-running it would reintroduce the bug).
>
> **Two general rules:** (1) **resolve environment-dependent values at use time, not at seed/write time** — anything baked into a DB row on first seed is frozen against whatever config existed then, and idempotent-skip seeders never refresh it. (2) When a re-runnable seeder is **skip-if-exists**, changing the seed data (URLs, params) is a **no-op on existing rows** — you need a migration, not a reboot. Same shared-DB re-seed family as [[Gotchas#Booting [[tat-app-ws Backend]] against a shared DB re-runs ALL seeders — and role-action seeding is DESTRUCTIVE (2026-07-07)]] against a shared DB re-runs ALL seeders — and role-action seeding is DESTRUCTIVE (2026-07-07)|the destructive role-action seeder]]. Context: [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]].

## tat-prereq staff self-profile — stale mapper, dead per-user record endpoints, and an unmapped-enum crash (2026-07-08)

Three distinct traps from the [[Staff Self-Service Polish - Nationality, Password, Profile Data]] batch on [[tat-prereq]], all only visible with a **real staging login** (offline fetchers return dummy data):

- **A FE mapper written against a "thin" endpoint silently drops fields once the backend expands it.** `getMyStaffProfile` (`GET /staff-management/profiles/me`) was mapped when the endpoint returned identity + role only ("no personal fields yet"), so it hard-omitted nationality, national ID, DOB, gender, place of birth, and office location. Staging now returns the **full** record, but the stale mapper kept dropping them → every field rendered `—` on My Profile. The endpoint's *view* looked broken; the bug was the mapper. Lesson: a mapper is a contract snapshot — re-diff it against the live response whenever "the page shows blanks but the API has data." Same class as the [[Gotchas#FE hook built against a speculative endpoint the backend never shipped|speculative-endpoint]] gotcha, inverted (endpoint grew, mapper didn't).
- **`/staff-management/qualifications` & `/assessments` (per-user, `?userId=`) do NOT exist — 404.** The profile panels were built against these speculative routes. The real data is **per-TOR** (`tors/:torId/aircraft-qualifications`, `tors/:torId/assessments`); there is **no per-user list route**. To show them on a profile you must **aggregate across the member's TORs** (`useStaffTors` → fan-out per TOR via `useQueries` → flatten; reuse the TOR-detail query keys so nothing double-fetches). Compounding it: the global React Query `retry: 1` **doubles** every 404 (a 4xx never recovers on retry), and dev StrictMode doubles again — so a dead endpoint shows up as a burst of 2–4 identical failing requests, not one. Set `retry: false` on known-missing/4xx-only queries, or aggregate the real endpoints.
- **`STATUS[value].cls` crashes when the backend sends an enum value the local style map doesn't have.** A `Record<Enum, {label,cls}>` lookup returns `undefined` for any unmapped status/type, and `.cls` then throws (`Cannot read properties of undefined`) — it took down the whole Qualifications panel. Always go through a fallback (`STATUS[v] ?? { label: v, cls: NEUTRAL }`) so an unmapped backend enum degrades to a neutral badge instead of white-screening. The TS union gives false confidence — the backend enum can hold values the FE union doesn't.

## `Object.assign(merged, mergeFn(current, …))` clobbers freshly-merged data with stale `current` (Form 32 PIC save, 2026-07-08)

The [[TAT-409 Staff Management Subsystem|Form 32]] privileged (PIC) save did `Object.assign(merged, this.mergeAssessment(current, dto.assessment))` — but `mergeAssessment` returns `{ ...current, assessment }`, so the `Object.assign` **spread the entire stale `current` record over `merged`**, resetting the just-merged `name`/`date`/`sections` back to their pre-save (empty) values. It only bit a **first-time** PIC save (blank `current`) that also sent a **truthy** `assessment` — and the FE *always* sends `assessment: {}` (truthy), so every first PIC save failed. The backend then failed completeness validation with a **misleading** message: *"All Form 32 sections require a selected option and supporting evidence"* — pointing at sections when the real victim was the clobbered header/sections. Fix: assign only the merged piece — `merged.assessment = this.mergeAssessment(current, dto.assessment).assessment`.

- **Two traps compounded it:** (1) a merge helper that returns the *whole* object (`{...current, x}`) is a landmine when the caller `Object.assign`s it onto an already-built object; return just the sub-object, or have the caller pick `.x`. (2) The same `form32SectionsIncomplete` error is thrown from **four** places (header validation, per-section validation, category, aircraft-type) — a shared error message hides *which* check failed.
- **Debugging method that cracked it (staging, real token):** craft **discriminating** payloads to bisect which validation fires. Sending an evidence `fileKey` that passes the empty-check but fails the file-type check (`badkey.xyz`) returned `InvalidFileType` **only if** sections were received — proving `dto.sections` *was* delivered and the failure was upstream (header clobber), not a dropped DTO field. Also ruled out a class-validator `whitelist:true` strip by **reproducing the transform locally** with the repo's own `class-validator`/`class-transformer` — `@IsOptional()`-only does **not** strip a property (my first hypothesis was wrong; verify, don't assume).
- Sibling fix same session: **PIC couldn't *create* a Form 32 (401)** — the `@Action(SM_CREATE_FORM_32)` controller guard rejects before any service code, and `SM_CREATE_FORM_32` was only in the **instructor** role→action seed bucket, not the PIC (`smForm32PrivilegedEditorActions`) bucket. Guarded-endpoint permission lives in the **seed**, not a service-level role check — and needs a re-seed to apply (see the "Booting [[tat-app-ws Backend]] against a shared DB re-runs ALL seeders" gotcha above for the re-seed caveat).

## Spreading a Mongoose single-nested subdocument drops the patch (History Form basic-info, 2026-07-09)

> [!danger] `doc.subdoc = { ...doc.subdoc, ...patch }` silently persists the OLD values and discards `patch`
> `StaffHistoryForm.basicInfo` is a **single nested subdocument** (`@Prop({ type: BasicInfoSchema })`). `saveBasicInfo` did `form.basicInfo = { ...form.basicInfo, ...patch }`. Spreading a hydrated Mongoose subdocument copies its **internal** keys (`_doc`, `$__`, `$__parent`), **not** the field values — and when that object is assigned back, Mongoose sees it's "document-like", rebuilds from the embedded `_doc`, and **ignores the sibling `patch` keys**. Result: every basic-info save returned `200` but persisted nothing → the form blanked on refresh, and instructors could **never** submit (`assertBasicInfoComplete` always saw an empty object). **Proven** with the repo's own Mongoose: the spread yields `{name:"",…}`; `{ ...form.basicInfo.toObject(), ...patch }` and an explicit field-by-field rebuild both persist correctly (and mark the path modified). Fixed by rebuilding `basicInfo` from the current field values + patch. Commit `7c359c08`.
> Same family as the [[Gotchas#`Object.assign(merged, mergeFn(current, …))` clobbers freshly-merged data with stale `current` (Form 32 PIC save, 2026-07-08)|Object.assign clobber]] — **never trust `{ ...mongooseDocOrSubdoc }`; use `.toObject()` or set fields explicitly.** Verify persistence, not just the 200.

## Shallow spread shares nested refs — a before/after diff of a mutated object is always empty (Form 32, 2026-07-09)

> [!danger] `const copy = { ...obj }` then mutating `copy.nested.x` also mutates `obj.nested.x`
> Building the Form 32 per-item review timeline, `computeForm32Changes(current, merged)` **never** detected an `edited`/`uploaded` event. Cause: `mergeSaveDto` does `const sections = { ...current.sections }` (a **shallow** copy — `sections[id]` *is* `current.sections[id]`) then mutates `existing.fileKey = incoming.fileKey`, updating `current` in place. By diff time `current` and `merged` point at the **same post-change objects**, so `before.fileKey === after.fileKey` → the diff finds nothing (e.g. replacing a section document went untracked). Fix: **deep-clone the pre-state** (`const before = JSON.parse(JSON.stringify(current))`) *before* the merge and diff against the clone. Commit `8ad91259`. Rule: if you need a genuine before/after diff, snapshot before ANY code that might mutate the object graph — a shallow spread does not isolate nested objects. Context: [[Form 32 Rejection History & Round-Scoped Stamps]].

## Booting [[tat-app-ws Backend]] against a shared DB re-runs ALL seeders — and role-action seeding is DESTRUCTIVE (2026-07-07)

`BootstrapService.onModuleInit()` runs the full seeder chain on **every** app start (`nx serve api`, or any deploy). It is **not** a safe way to trigger one seeder against a shared DB. `seedRoleActions` calls **`editRoleActions`, which REPLACES a role's entire action set** with the hard-coded local `roleActionsMap` — so booting a **local branch** against the **shared dev cluster** overwrites every role's permissions with the local definitions. If local ≠ deployed, this **regresses permissions for everyone on that dev DB** (observed: instructor `/details` went 200→403 after a local `nx serve` pointed at dev).

- **Confirmed 2026-07-07** while running a one-off `instanceKey` backfill via the app (see [[Staff Creation Blocked - qualificationTrackingMode Enum Bug]] neighbourhood / Form 285 work). The backfill itself worked (`/form-285` 404→403), but the collateral role-action overwrite did not.
- **Self-healing:** redeploy/restart staging (or run the *deployed* branch) → bootstrap re-seeds role-actions to the deployed truth.
- **Rule:** never boot the app against shared dev/prod to run a single data fix. Use a **standalone script** with the DB driver (needs the current `MONGO_URI` — the local `.env` dev URI is stale/NXDOMAIN; grab the live one from AWS ECS task def / Bitbucket vars / Atlas). Or gate the fix so only it runs.
- Related: `.env` values have stray **trailing commas** (`redis,`, `tat147-dev,`) that break Redis/host lookups. See [[Patterns#Propose before implementing — don't jump to code (Qusai, 2026-07-07)]].
- **Updated 2026-07-10:** the local `.env` `MONGO_URI` now points at the live cluster (`…oemqsva…`, db `tat-dev`), not the dead `cqtcwb3` host — that part of this gotcha is stale. It still won't connect from a laptop: **Atlas IP allowlist** rejects un-whitelisted IPs (`MongooseServerSelectionError: ReplicaSetNoPrimary`). Whitelist your IP or run migrations from a host that's already allowed.
- **The allowlist rejection wears two different masks — neither mentions the firewall.** Seen as `ReplicaSetNoPrimary` (2026-07-10) *and* as a bogus TLS error (2026-07-12): `MongoServerSelectionError: SSL routines:ssl3_read_bytes:tlsv1 alert internal error … SSL alert number 80`. Atlas kills the TLS handshake for an unknown source IP, so the driver reports an OpenSSL fault. **It is not a cert problem — do not debug TLS. Check the allowlist first.**
- **Your egress IP rotates.** Whitelisted `188.123.164.132` on 2026-07-11; by 2026-07-12 it was `188.123.164.137` — same `/24`, ISP re-leased the last octet (dynamic DHCP; it can change overnight with no action). Re-whitelisting one address means doing it again in days. **Whitelist `188.123.164.0/24`** (acceptable for the *dev* cluster; not for prod), or route through a fixed egress. Check current IP with `curl -s https://api.ipify.org`.
- **`REDIS_HOST=redis` only resolves inside Docker.** Running `nx serve api` on the host with Docker down leaves the API retrying `getaddrinfo ENOTFOUND redis` forever — it never reaches `app.listen`, so port 3333 is simply dead with no error saying why. Redis usually runs natively on `localhost:6379` anyway: override with `REDIS_HOST=localhost npx nx serve api` rather than editing `.env`.

## History Form writes: privileged (SA) vs instructor paths differ — evidence is REQUIRED for the instructor (2026-06-28)

The [[TAT-409 Staff Management Subsystem|History Form]] (TAT-417/418/419) backend branches on `isPrivileged` (SA/AD/QM/TM), and the difference is invisible until you test as a **real instructor** — the SA path masks every one of these:

- **A certificate/evidence is REQUIRED for a non-privileged (instructor) save** — both mandatory training (`saveMandatoryTraining`/`submitMandatoryTraining`) and training-history (`addTrainingHistory`) do `if (!isPrivileged && !dto.evidenceFileKey) → 400 (…Incomplete)`. The FE-first build had the certificate as **"optional"** (mandatory) or **absent entirely** (training history), so an instructor's record **400'd every time** while SA worked. Fix: certificate required (disabled submit + hint until attached) for the instructor; optional for SA. Found only by logging in as the instructor.
- **SA writes auto-approve and skip the workflow.** A privileged save sets status **APPROVED** directly (the "privileged-role auto-approve" pattern, see [[Patterns]]) and **computes Due/Refresher immediately**; the instructor's submit goes to **PENDING_APPROVAL** and Due/Refresher stay null until a reviewer approves. So SA can't reach a PENDING state through the normal UI, and `submit` 403s for SA (SA lacks `SM_SUBMIT_MANDATORY_TRAINING`) — the save already auto-approved, so there's nothing to submit.
- **Sit-in eligibility needs a slot in `PENDING_SIT_IN`, which only an instructor submit produces** — so the whole **[[TAT-429]] add-instructor → sit-in → [[TAT-409 Staff Management Subsystem|TAT-421]]** chain is un-testable as SA (the eligible-instructors list is empty). Verifying it requires a real instructor submit first.
- **The History Form GET 404s until the form exists.** It's created lazily by `ensureForUser` on **TOR creation** and on writes (`POST training-history` etc.) — **not** by the GET, which hard-404s. Pre-existing dev instructors have no form → the page errored; the FE now treats a 404 as a not-yet-created empty Draft (`getHistoryForm`/`getTrainingHistory`/`getSitIn` return empty on 404). `PATCH basic-info` does **not** ensure either, so a brand-new instructor relies on the form existing from TOR creation.
- **Refresher date = accomplished + 23 months** (= Due − 1 month, Due = accomplished + 2y). Verified on staging.
- **Aircraft qualifications have no write API.** The `StaffHistoryForm.aircraftQualifications` schema field exists and the shell returns a count, but **no service writes it** and there's no list/CRUD endpoint — so the "Type Training Course" section stays read-only/count-only until the backend ships it.

Method reminder (reinforces the [[#Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)|TAT-432 lesson]]): **a privileged login is a different code path** — verify staff-management write flows as the *actual* role that performs them (instructor records, TM reviews), not just as SA.

## Card-morph slider: keep the OUTGOING card full-screen until the new one covers it

When one element morphs into a full-screen background (a thumbnail "opening" into the hero — the [[TAT Website Hero Card-Morph Slider]] effect), the naïve approach shrinks the old background into a thumbnail *while* the new one grows — leaving a moment where **neither covers the viewport**, so the page background flashes through (white). Fix (the CodePen's actual trick): keep the outgoing card **full-screen** (slight `scale` zoom, behind the incoming one) for the whole tween and only **snap** it into its thumbnail slot `onComplete`. Belt-and-suspenders: give the hero container a dark background so any micro-gap (incl. first paint before measure) never shows white. Three more traps from the same build:
- **Auto-advance must restart the timer on every slide change.** A GSAP indicator-bar `onComplete` that only calls `next()` advances the slide but never resets the timer → it fires once then stalls until a manual click. Key the timer `useEffect` on `activeIndex` so it restarts after *any* change (auto or manual).
- Animate `borderRadius` in **px** (`28 → 0`), not `'50%' → '0%'` — percent interpolation on a growing box looks wrong mid-tween.
- A portrait **rounded-rectangle** thumbnail is `width≠height` + a fixed px radius. `rounded-full` on a non-square box is an **ellipse/oval**, not the rounded-rect you usually want.

## `router.refresh()` does NOT invalidate the React Query cache (tat-portal)

Next's `router.refresh()` only re-runs RSC / server-component data — it leaves the **client React Query cache untouched**. Bit [[tat-portal]]'s refund flow (2026-06-23): the refund modal's `onSuccess` called `router.refresh()`, which updated the server-rendered orders list but left the client-cached `myCourses` / `cart` queries stale, so a refunded course kept showing in My Courses until a hard refresh. Fix: mutations that change React-Query-held data must call `queryClient.invalidateQueries` explicitly (via the centralized helpers — see [[Patterns#Centralized cache-invalidation map for React Query mutations (tat-portal)]]). More broadly, the staleness came from mutations not invalidating the *other* queries they affect (e.g. submit-exam left `myCourses`/`myCourseDetail`/`myCertificates` stale), compounded by a global `staleTime: 5min` + `refetchOnWindowFocus: false`. Rule: `router.refresh()` and React Query are two separate caches — refreshing one never refreshes the other.

## App-shell layout: pin to the viewport, scroll only `<main>`

A dashboard shell must be `h-screen overflow-hidden` on the outer flex container so the sidebar + topbar stay fixed and **only the content area scrolls**. Using `min-h-screen` lets the container grow past the viewport, so the whole page (body) scrolls and the sidebar scrolls away with it — a basic but easy-to-miss bug (hit it in [[tat-prereq]]'s first dashboard layout). Correct shape: `flex h-screen overflow-hidden` → `Sidebar` (h-full) + a `flex-1 flex-col overflow-hidden` column → `Topbar` (shrink-0) + `main flex-1 overflow-y-auto`.

## TAT backend user: `role` is an OBJECT, not a string

The `/auth` user object (same across [[tat-portal]] / [[tat-ws]] / [[tat-prereq]]) has **`role: { _id, code, name }`** — the role code lives at `role.code` (e.g. `'SA'`). There's also `secondaryRoles: UserRole[]` and an `activeRole` code (users can hold/switch multiple roles), and the id field is **`_id`**, name is **`familyName`** (not `lastName`). Gating with `user.role === 'SA'` silently fails (object ≠ string) — it bit the [[TAT-409 Staff Management Subsystem|Manage Staff]] SA gate: a real super-admin login was wrongly shown "access restricted." Correct check: `user.role?.code === 'SA'` (or look across `activeRole` + `role.code` + `secondaryRoles[].code`). Mirror tat-portal's `User`/`UserRole` types verbatim rather than inventing a `{ role: string }` shape.

## tat-ws cert hooks: `usePatchOnlineCourseCertificate` is NOT for issued certs

Two confusingly-named things in [[tat-ws]]. `usePatchOnlineCourseCertificate` (in `online-courses/usePatchOnlineCourseCertificate.ts`) edits a **course's certificate _template_ HTML** (`PATCH /online-courses/{id}/certificates/{type}`, body `{ certificateHtml }`) — course-level, not trainee-level. To edit an **issued** online-course certificate (a trainee's generated cert), use `useUpdateIssuedCertificate` (`PATCH /online-courses/certificates/{id}`, body `{ templateHtml }`, queues async PDF regen). *(The DTO changed 2026-06-11: it used to take `{ courseTitle, issuedAt, scorePercentage, displayData }`; those metadata fields are gone — it's the cert's HTML now.)* **Naming trap on top:** the PATCH field is `templateHtml`, but the GETs return the same value as `templateHtmlSnapshot` — read one name, write the other. Don't reuse the template hook for issued-cert edits. RBAC nuance: the issued-cert PATCH allows **SA/AD/TM** (role-based, hardcoded in the route), but the FE gates on `UPDATE_CERTIFICATE` (`UCE`) which is seeded **SA+TM** — so an **AD** user is allowed by the backend yet hidden by the FE gate. Context: [[TAT-428 Edit Issued Certificates]].

## Online-course certs ARE trainee-reachable (storefront)

`GET /online-courses/certificates/my` returns the logged-in user's own issued certs **including `pdfUrl`**, and its `@Roles(...SystemRolesCodes)` guard **includes `TRAINEE = "TR"`** — so [[tat-portal]] (the student storefront) can call it directly. Don't assume the `/online-courses/certificates/*` endpoints are admin-only just because [[tat-ws]] uses them; the `/my` variant is for trainees. Each cert carries `enrollmentId` + `type` (`EXAM` | `ATTENDANCE`) for matching to a course card. Context: [[TAT Certificates - Open Items]].

## tat-portal: derive pass/fail from backend `passed`, not a local `examPassed` hardcoded to `>= 70`

A learner who fails an online-course exam only ever gets an **attendance** certificate, not a full one — but [[tat-portal]]'s `MyCourseCard` rendered a single hardcoded "Take Certificate" label for both outcomes, so a failed learner's button was indistinguishable from a passing learner's (2026-07-15). The data was already there: the enrollment carries a backend-authoritative **`passed`** boolean. The trap is the *other* field — a local `examPassed` that hardcodes `examMark >= 70`. Passing threshold is per-course (`passPercentage`), so `examPassed` silently drifts wrong the moment any course sets a threshold ≠ 70. Rule: branch outcome UI on the backend's `passed`, never on a client-recomputed threshold. Fix added `examFailed = hasExam && examMark !== null && !passed` and labeled the completion cert "Attendance Certificate" when true. Edge caveat: assumes `showCourseCompletionCertificate` isn't set true while retake attempts remain, else it could read "Attendance" prematurely. Context: [[TAT Certificates - Open Items#Frontend (us — tat-portal)]], sibling gotcha [[Gotchas#Online-course certs ARE trainee-reachable (storefront)]].

## Two certificate-template preview endpoints — wrong one leaves tokens unsubstituted

[[tat-ws]]'s shared `CertificateEditor` Preview button hit this (2026-06-26): there are **two** preview endpoints and the editor must pick by domain. Aircraft/general templates use single-brace `{ token }` and `POST /certificate-templates/preview`; online-course templates use double-brace `{{ token }}` and `POST /online-courses/certificate-templates/preview`. Both share the **identical** `{ content }` → `{ previewContent }` shape, so a mis-wire **type-checks and returns 200** — but the aircraft endpoint doesn't substitute `{{ }}` tokens, so the online preview renders with placeholders still showing. The editor was originally hardwired to the aircraft hook regardless of its `courseType` prop; fix routes online templates to `usePostPreviewOnlineCertificateTemplate`. Lesson: when two endpoints share a request/response shape but differ in server-side behavior (token dialect), nothing local catches the mismatch — only a visual/staging check does. Context: [[TAT Certificates - Open Items]], [[TAT API & Auth Model#Certificate template preview (two endpoints, by domain)]].

## Next.js 16 scaffolding traps (hit on [[tat-prereq]] 2026-06-04)

Cloning [[tat-portal]]'s conventions into a fresh Next 16 repo surfaced three:
- **`next lint` is removed.** Use `eslint` directly (the `package.json` `lint` script is just `"eslint"`). `npx next lint` errors with "Invalid project directory ... /lint".
- **`react-hooks/set-state-in-effect` is now an error.** The stock shadcn `use-mobile` hook (synchronous `setState` in a `useEffect`) fails lint. Fix: rewrite with `useSyncExternalStore` (subscribe + `getSnapshot` + SSR `false` snapshot).
- **`middleware.ts` is deprecated → use `proxy.ts`.** [[tat-prereq]] uses `proxy.ts`: export a function named `proxy` (or a default export), same `config.matcher`, same `NextRequest`/`NextResponse` from `next/server`. **Having both `middleware.ts` and `proxy.ts` is a hard build error.** Confirmed working at runtime (protected route → 307 → /login). Two harmless quirks under Turbopack 16.0.1: the build summary omits the `ƒ Proxy (Middleware)` line and `.next/server/middleware-manifest.json` is empty — Next compiles `proxy.js` then renames it to `middleware.js` internally, and the real manifest is `middleware-build-manifest.js`. **Don't trust the manifest/summary — verify with a runtime curl.** tat-portal still uses `middleware.ts`; migrate it later.
- Also: `lib/env.ts` throws on missing `NEXT_PUBLIC_API_URL`, so **`build` fails at prerender without a `.env.local`** — expected, not a scaffold bug.

## Next 16's react-hooks rules false-positive on react-hook-form primitives

eslint-config-next 16 ships stricter `react-hooks` rules that flag standard RHF usage in the shared `RHFInput` components: `react-hooks/refs` errors on `ref={field.ref}` ("Cannot access ref value during render") even though `field.ref` is a callback ref (correct usage), and `react/display-name` errors on the `forwardRef` phone input. **[[tat-portal]] has the identical 21 problems** — `npm run lint` fails there too; it only stays green because lint-staged checks *changed* files and these aren't usually touched. On a **fresh repo's first commit, lint-staged lints everything and would block it.** Fix in [[tat-prereq]]: a scoped `eslint.config.mjs` override turning `react-hooks/refs`, `react/display-name`, and `@typescript-eslint/no-unused-vars` off for `src/components/ui/RHFInput/**` — keeps the files byte-identical to portal. Portal should adopt the same override.

## Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)

Driving the [[TAT-432 Staff Profile]] create/edit forms against staging surfaced three backend-contract mismatches — all silently shipped because the FE-first build had no live backend to test against:

- **`nationalIdImage` is REQUIRED on create**, not optional. `POST /auth/internal-user/signup` without it → `400 "nationalIdImage must be a string"`. The FE schema had it `optional`. Fix: per-mode schema (`superRefine` requires it on create, optional on edit so an unchanged image is kept).
- **`POST /file/upload-file` returns `{ Location, Key }` (capitalized, S3-style)** — NOT `url`/`fileUrl`/`key`/`data.url`. The FE's `uploadFile` parsed only the lowercase shapes, so it returned `''` → the image got omitted from the body → create failed **even with an image selected**. This bites EVERY upload in the subsystem (documents TAT-412/413, forms, assessment video). Always read `data.Location` first. Note: the returned S3 key contains `bucket/undefined/...` — a backend quirk, harmless.
- **`officeLocation` is an OfficeLocation ObjectId, not free text.** Sending `"HQ"` → `500 "Cast to ObjectId failed for value \"HQ\" at path \"_id\" for model OfficeLocation"`. Source the value from `GET /office-location` (`[{ _id, name, cityId{name} }]`) as a select keyed by `_id`, and **omit the field entirely when blank** (a blank string also fails the cast). On read, `/user/details` returns `officeLocation` populated as `{ _id, name }` — store the `_id` for the form, carry the `name` separately for display.

Method note: every real-staging path in `tat-prereq` is gated on `getAccessToken()`; with no session the fetchers silently return dummy data. To verify "against staging" you MUST be logged in — otherwise you're only exercising the offline fallback. Context: [[TAT-432 Staff Profile]], [[TAT-409 Staff Management Subsystem]].

## tat-ws modals: use MUI `<Dialog>`, not hand-rolled `fixed inset-0`

A hand-rolled `fixed inset-0 flex items-center justify-center` modal **clips behind the fixed top navbar** once its content is tall: vertical-centering puts the header/close-X in the top ~5vh, which the navbar overlaps — so on the online-courses trainees "Exam Answers" modal the title and close button were unreachable (hit 2026-06-28). It can also break entirely if any ancestor has a `transform`/`filter` (then `position: fixed` resolves against that ancestor, not the viewport, and the modal scrolls with the page). **Fix: use MUI `<Dialog>`** — it's the house standard (~246 usages) and portals to `body`, centers against the viewport, scrolls within `max-h`, and gives a reliable close + backdrop/ESC. Mirror `QuestionViewModal` (questions-bank) for a question+options+correct-answer layout. Don't invent a new overlay div when a working dialog pattern exists. Context: [[TAT Certificates - Open Items]].

## FE hook built against a speculative endpoint the backend never shipped

tat-ws's "Exam Answers" preview was wired to `GET /online-courses/{id}/trainees/{enrollmentId}/exam-result` with an invented `EnrollmentExamResult` shape (`score`, `takenAt`, `answers[].options[{text,isCorrect,isTraineeAnswer}]`). The backend actually shipped **`/exam`** (`getAdminTraineeExamAttempt`) with a *different* shape: `scorePercentage`/`submittedAt`/`questions[]`, each question `optionA/B/C` + `userAnswer`/`correctAnswer` as **letters** `"A"|"B"|"C"` (enum — `SubmitAnswerDTO @IsIn(["A","B","C"])`, question-bank `correctAnswer enum ["A","B","C"]`), plus `attemptId`/`attemptNumber`/`status`/`timeLimitMinutes`/`passPercentage`. Backend returns **only the latest SUBMITTED attempt** and **404s** when none exists (so gate the hook with `retry:false` and render an empty state). Lesson: when a FE data hook is built before the backend lands, treat its types/URL as a guess — reconcile against the actual controller+DTO in [[tat-app-ws Backend]] before trusting it. Context: [[Online-Course Exam Timeout - Backend Bug]], [[TAT Certificates - Open Items]].

## tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original

`POST /file/upload-file` **transforms** files server-side and returns the **final** key with a possibly-different extension: office docs (`doc/docx/xls/xlsx/ppt/pptx/csv`) are queued for **PDF conversion** and the response Key is rewritten to `…​.pdf`; images are compressed/normalized to `.jpg`; HEIC → png/jpg. Conversion is gated in `s3.service.ts` on `category ∈ {LEARNING_MATERIALS, COMPANY_DOCUMENTS, ONLINE_COURSE_PARTS, ONLINE_COURSE_CONTENT}` **and** an office extension — so the FE must send one of those categories (online-course materials already send `ONLINE_COURSE_CONTENT`). Bug this caused (2026-06-28): `MaterialFileUpload` stored the part's `name`/`fileType` from the **original** file (`lesson.docx` → type `word` → saved as part type `OTHER`), even though the returned key was the converted `…​.pdf`, so a converted Word doc showed up as a Word/OTHER file — "it didn't convert." Fix: derive `name` + `fileType` from the **returned key** (`getFileType(url, '')`, rename to the returned extension), never from the uploaded `File`. Note the conversion is **async/background** — the response returns the `.pdf` key before the worker finishes, so the object may 404 briefly. Caveat: `FileConversionService` is an **optional** dep on `S3Service` (`fileConversionService?`); it's wired via `HelpersModule`, but if a module re-provides `S3Service` without it in scope, conversion silently no-ops. See [[Patterns#File uploads: always pass a `FileUploadCategory` (tat-ws)]]. Context: [[TAT Certificates - Open Items]].

## tat-ws online-course trainees endpoint: no server search + fake pagination

`GET /online-courses/{id}/trainees` (`getCourseTrainees`) **looks** paginated (`skip`/`limit`, returns `{ data, total }`) but the service `find()` has **no `.skip().limit()`** — it loads every enrollment, builds every row, then `rows.slice(skip, skip+limit)` in memory. So server pagination saves **zero** DB work; it only trims the JSON payload. There is also **no search param** (`OCAdminCourseTraineesListQueryDTO extends Pagination {}` — pagination-only). Consequence for [[tat-ws]]: the Manage Trainees search box worked only because the FE downloaded the *whole* list and filtered client-side; switching to true server pagination would make search match the **current page only** (a name on page 2 → "no results"). Decision (2026-06-28): wired server-side `skip`/`limit` via the shared `Table` and **disabled the FE search** until the backend adds a real `search` param (and ideally real DB-level paging). When picking client- vs server-side paging, first check whether the endpoint paginates at the DB or just slices — and whether search is server-supported. Context: [[TAT Certificates - Open Items]], [[tat-app-ws Backend]].

## tat-ws — `nx lint` crashed on asset imports (FIXED 2026-06-02)

`nx lint tat-ws` used to **throw instead of linting**: `@nx/enforce-module-boundaries` (nx 19.6.4) did `ENOENT … open '.../apps/tat-ws/src/assets/*'` while autofixing **any** SVG/asset import (alias `@tat-ws/assets/...` *or* relative `../../assets/...`). It treats `src/assets` as a boundary via the tsconfig path mapping and the autofixer reads the literal glob path.

**Fix applied:** disabled the rule in `.eslintrc.json` (`"@nx/enforce-module-boundaries": ["off", …]`). Justified because its `depConstraints` were wide-open (`sourceTag "*" → onlyDependOnLibsWithTags ["*"]`), so it enforced no real boundaries — only the broken autofix. Lint now runs.

> [!warning] Disabling it revealed a ~225-error pre-existing lint backlog
> The crash had hidden the whole codebase's violations (unused vars, `no-explicit-any`, non-null assertions, `no-unsafe-optional-chaining` errors). CI `nx lint` will now fail on these real issues until they're cleaned — a separate effort. `tsc --noEmit -p apps/tat-ws/tsconfig.json` is the clean type gate meanwhile.

Alternative fix (not taken): bump `@nx/eslint-plugin` to a version where the autofix bug is gone. Context: [[TAT-428 Edit Issued Certificates]], [[TAT Certificates - Open Items]].

## Nullable enum + `default: null` crashes Mongoose on create (backend, 2026-07-05, recurring)

> [!danger] `enum: SomeEnum` + `default: null` where the enum has no null → validation error on every create
> Mongoose runs enum validation on the **explicit `null` default**, and since `null` isn't in `Object.values(enum)` it throws `"… is not a valid enum value for path …"` — even though nothing set the field. **A recurring anti-pattern in `tat-app-ws` schemas — 4 instances found so far.**
>
> **Two fixes, both valid:** (a) additive — `enum: [...Object.values(SomeEnum), null]` (keeps a null value legal); (b) **remove `default: null`** — the path stays `undefined` on create and enum validation skips undefined (cleaner when the field should be unset until later). Pick remove-default when nothing should ever set the field at create time; additive when a stored `null` is meaningful.
>
> **Instance log:**
> - `StaffQualification.refresherUpdateSource` — blocked all aircraft-qualification creates. Surfaced via [[TAT-409 Ticket Groups & Inspection Map|TAT-422 testing]] (2026-07-05). **Fixed** (additive) — `staff-qualification.schema.ts:125`.
> - `StaffTorForm.workflowStage` — same latent pattern. **Fixed** (additive) — `staff-tor-form.schema.ts:77`. *(Both were fixed-then-reverted on 2026-07-05; the additive fix is back in the current `dev`.)*
> - `User.qualificationTrackingMode` — **top-level field → blocked ALL staff creation** (every role, both [[tat-prereq]] and the backoffice). **Fixed** (remove-default) — `user.schema.ts`, commit `dc8f3a4f`, pushed to `dev` 2026-07-07. See [[Staff Creation Blocked - qualificationTrackingMode Enum Bug]].
> - `Auditor.type` — latent twin (dormant until an auditor sub-doc is created). **Fixed** (remove-default) in the same commit.
>
> A lint rule / schema sweep for `enum:` + `default: null` would catch the next one before it ships.

## tat-prereq `uploadFileKey` must send a `FileUploadCategory` — else `bucket/undefined/` (2026-07-05)

> [!warning] Missing `category` → files land in `bucket/undefined/`, and the backend does NOT error
> The S3 key is built as `bucket/<category>/<...>`; the shared `src/api/uploadFileKey.ts` only appended `file`, not `category`, so every tat-prereq upload (Form 32/285, History evidence, signatures, qualifications) went to `bucket/undefined/`. Form 32's validator only checks the `bucket/` prefix + extension, so it silently misfiles instead of failing. Fix: `uploadFileKey(client, file, category)` now required; each call site passes the right `FileUploadCategory` (`tor-form-32`, `tor-aircraft-qualification`, `tor-documents`, `tor-assessment`, `tor-external-teaching`, `tor-form-285`). Same class as the [[Gotchas#tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original|tat-ws upload]] gotcha — third time this bit.

## MUI X Date Pickers v7 use `.MuiPickers*` classes, not `.MuiOutlinedInput-*` (2026-07-05)

> [!warning] `sx` targeting `.MuiOutlinedInput-*` silently does nothing on MUI X v7 date pickers
> v7 renders a segmented field with `.MuiPickersOutlinedInput-root`, `.MuiPickersOutlinedInput-notchedOutline`, `.MuiPickersSectionList-root` — NOT the legacy `.MuiOutlinedInput-*`. The app's `DatePickerField` `sx` targeted the old names, so styling never applied and it fell back to MUI defaults (Roboto 16px, wrong border/height). Fix: target the `.MuiPickers*` classes. Applies to `ControlledDatePicker` + `DatePickerField` in tat-prereq. Verify the actual class names in the DOM before writing MUI `sx`.

## Form 32 assessment Signature is a FILE key, not text (2026-07-05)

> [!danger] Backend validates `assessment.signatureKey` as an evidence file (`bucket/…` + allowed ext)
> The FE rendered Signature as a free-text input; typing anything → save 400s with `"Invalid file type. Supported: PDF, DOC, DOCX, JPG, JPEG, PNG."` (`assertValidEvidenceFileKey`). Fixed: the FE now uploads a signature file (category `tor-form-32`) and stores the returned key. If a backend field is named `*Key`, assume it's an uploaded file, not text.

## Form 32 forms are license-scoped, not role-scoped — shows all 4 A/B/C/D (2026-07-05)

> [!warning] Every TOR shows Form 32 A/B/C/D regardless of the person's role → violates TAT-415 AC-02
> `createFormInstances` attaches a form for **every template matching the `licenseId`**; the Form 32 A/B/C/D templates are seeded per authority (CARC/EASA/GCAA) with **no role field**. So an Instructor's TOR shows Examiner (C) + Assessor (D) forms. AC-415-02 says the form type is "selected based on the role (multi-select)." The "requested role" concept doesn't exist in the impl. See [[TAT-409 Ticket Groups & Inspection Map]].

## IDE TS-server flags "implicit any" where batch `tsc` passes — annotate React-Query callbacks (2026-07-06)

> [!warning] The editor shows TS errors that `tsc --noEmit` (the source of truth) does not
> On [[tat-prereq]]'s `HistoryFormView.tsx`, VS Code's TS language server flagged `implicit any` on `.map`/`.filter`/`.reduce` callbacks and a `{} | null` on a `Map.get()` — but `tsc --noEmit` (fresh, strict, cache cleared) reported **0 errors**. Cause: the LS falls back to `any` on **React-Query-derived values** (`useX().data`, destructured `data`/`records`) when deep/generic inference times out in the editor; batch `tsc` has no such limit and resolves them. Don't chase phantom errors by re-reading `tsc` output — confirm with `mcp__ide__getDiagnostics` (the live editor view) vs a clean `npx tsc --noEmit`. **Fix:** give the flagged callbacks/vars **explicit type annotations** (`(it: MandatoryTrainingItem) =>`, `const requestByCourse: Map<string, TrainingCourseRequest> = …`) so the editor doesn't need to infer the container type. Bonus: doing so caught a real bug (`useSitIn().data` is `SitIn | null | undefined`, not just `| undefined`). Zsh caveat: `${PIPESTATUS[0]}` is empty in zsh (it's `$pipestatus`), so a piped `tsc | head` can hide the real exit code — capture to a file + `grep -c "error TS"`.

## Sharing an HTML deliverable in Teams: JS is stripped + UTF-8 mojibakes → prefer a `.docx` (2026-07-05)

> [!warning] A JS-rendered HTML page shows blank in Teams' preview, and its em-dashes/quotes render as `â€"`
> When sharing the [[TAT-409 Bug & Gap List]] dashboard: (1) Microsoft Teams (and most chat/file previewers) **sandbox the preview and strip `<script>`** — so any content built by JS at load renders as an empty page. Fix: **pre-render the content as static HTML** and use JS only for progressive enhancement (filters). Verify the `<article>` rows exist in the file source, not just after `appendChild`. (2) Teams decoded the file as Latin-1, so UTF-8 `—`/`"`/`→` showed as mojibake (`â€"`, `â€œ`). A **`.docx` stores Unicode natively** and renders cleanly everywhere — build one with `python-docx` (installable via `pip install --user python-docx`; hyperlinks need a small `add_hyperlink` OOXML helper). Rule of thumb: **browser/artifact → interactive HTML; Teams/email → `.docx`.** Keep the `.md` as the canonical source and generate the others from it.

## History Form: eligibility needs THREE approvals (2026-07-05)

> [!warning] A TOR isn't eligible on basic-info approval alone
> The [[TAT-409 Staff Management Subsystem|History Form]] flips to `APPROVED` (the state `isHistoryFormApprovedForUser` / TOR eligibility gates on) only when **all three** hold: basic-info `BASIC_INFO_APPROVED` **+** mandatory training valid **+** the sit-in final assessment completes (`assertHistoryFormReadyForApproval`, `staff-sit-in.service.ts`). Approving basic info alone leaves the form at `BASIC_INFO_APPROVED` — not eligible. The **sit-in final assessment is the capstone** that sets `APPROVED` (fused into `completeFinalAssessment`, no separate approve step). So "approve the History Form" is not one action — testing eligibility requires driving all three.
> Still open from the sit-in (TAT-421): **`assessorSignatureKey` is stored as a plain string, never validated as an evidence file** (contrast Form 32's `assertValidEvidenceFileKey` — see [[Gotchas#Form 32 assessment Signature is a FILE key, not text (2026-07-05)]]). Privileged auto-approve here IS live (unlike Form 32's dead helper). See [[TAT-409 Ticket Groups & Inspection Map]].
>
> **Correction (2026-07-12): the "arbitrary sit-in evaluator" bug recorded here was fixed and this note was stale.** `pickEvaluatorUserId(traineeUserId, courseId)` now takes a `courseId` and picks from the course's *schedule* instructors (`staff-sit-in.service.ts:396`) — i.e. the actual teaching instructor, satisfying AC-01/02. **Lesson: re-verify a gotcha against source before repeating it — I asserted the stale version out loud before checking.**

## History Form spec-vs-impl divergences: training-history approval + FE 2-year window (2026-07-05)

> [!warning] Two mismatches between AC and code in the History Form training area
> - **Training-history records require approval, but TAT-417 AC-17 says they must NOT.** ~~`addTrainingHistory` creates non-privileged records as `PENDING_APPROVAL` with approve/reject endpoints and a required evidence file.~~ **Fixed 2026-07-09:** the section is now a plain free-text table (Subject · Organization · Accomplished · Due Date) — `addTrainingHistory` no longer validates, stores no evidence/hours, lands directly `APPROVED` (no `PENDING_APPROVAL` round), and gained a `deleteTrainingHistory` + `DELETE` endpoint. The FE reviewer approve/reject UI is gone. The backend `approveTrainingHistory`/`rejectTrainingHistory` methods + routes remain but are now unreachable (no record is ever `PENDING_APPROVAL`) — candidate for later cleanup.
> - **The backend windows total training duration to the last 2 years; the FE sums everything.** `calculateTotalTrainingDurationHours` (`mandatory-training.util.ts`) filters `accomplishedDate >= now-2y`; the tat-prereq `HistoryFormView` `totalHours` sums all dated items regardless of age. So the FE "total" can overcount vs what the backend uses for eligibility. Also FE-only: there's **no "request course online" surface** and **no reviewer cert preview**, uploads reuse **TOR** `FileUploadCategory` (wrong folder — no history-form category), and **AD falls into the instructor branch** (no FE privileged auto-approve path). See [[TAT-409 Ticket Groups & Inspection Map]].
>
> **Correction (2026-07-09): the "aircraft-quals are count-only, no write API" claim above was wrong** — the backend already had `GET/POST/PATCH …/history-form/aircraft-qualifications` (`listAircraftQualifications`/`addAircraftQualification`/`replaceAircraftQualification`, owner-or-privileged), it was only the FE that stubbed the section as read-only with a "no endpoint yet" note. Built the FE add/edit table this day (list type + B1/B2 category, owner/SA/AD/QM/TM can edit; no delete endpoint). **Lesson: an FE "// no backend yet" stub comment is not evidence — grep the backend controller before trusting it.** See [[Patterns#Multi-item reject flows: accumulate-and-send only when items share ONE parent status (tat-prereq / tat-app-ws)]] neighbour and [[Staff Management Subsystem & TOR Model]].

## Form 32 privileged-editor (AC-415-12) is unimplemented — AD sees buttons that 403 (2026-07-05)

> [!warning] The "PIC can fill/update any field, auto-approved" promise is dead code; and AD is a FE reviewer but not a backend one
> AC-415-12 says SA/AD/QM/TM must be able to fill/update **any** Form 32 field with auto-approve. Reality in `staff-tor-form-32.service.ts`:
> - `isPrivilegedForm32Editor`/`FORM_32_AUTO_APPROVE_ROLES` (= SA/AD/QM/TM) is **defined but never called** — dead code.
> - `saveDraft`'s reviewer branch is gated on `isForm32Reviewer` (`FORM_32_REVIEWER_ROLES` = **TM/QM/SA only, no AD**) *and* only merges `dto.assessment` — a reviewer's edits to instructor **section** fields (`dto.sections`/name/date) are **silently dropped**. No per-field auto-approve exists.
> - **AD mismatch:** `AD` has RBAC `SM_SAVE_FORM_32` (bootstrap `smForm32PrivilegedEditorActions`) and the FE `Form32Editor` `PIC_ROLES=['SA','AD','QM','TM']` renders AD the Save/Approve/Reject buttons — but backend `assertCan*InstructorSaReview` reject AD → **every AD action 403s**. FE affordance ≠ backend contract.
> Same "verify write flows as the *actual* role" lesson as the [[Gotchas#History Form writes: privileged (SA) vs instructor paths differ — evidence is REQUIRED for the instructor (2026-06-28)|History Form privileged-path]] gotcha. Contrast: Form 32's **notifications ARE wired** (submit→TM/QM/SA, reject→instructor via `notifications.service.ts`) — don't assume the whole subsystem's notification layer is unsent. See [[TAT-409 Ticket Groups & Inspection Map]].

## Spreading a Mongoose subdocument (`{...subdoc}`) drops nested arrays on re-save (2026-07-09)

> [!danger] Rebuilding a subdoc via `{...existingSubdoc}` + array reassignment silently loses nested subdocument arrays (e.g. `reviewHistory`) on re-cast
> Symptom: mandatory-training History (N) showed only `Submitted → Approved` — a reviewer reject + instructor resubmit cycle lost its `Rejected`/`Resubmitted` events. Root cause in `saveMandatoryTraining` (`staff-history-mandatory-training.service.ts`): it rebuilt the slot as `const nextSlot = { ...(existingSlot ?? {}), … reviewHistory: [...existingSlot.reviewHistory] }` then `form.mandatoryTraining = slots; form.save()`. **Spreading a live Mongoose subdocument yields internal `_doc`/`$__` keys, and the nested `reviewHistory` entries are subdocuments bound to the *old* parent** — when the whole array is reassigned and re-cast on save, that nested array gets dropped. The later resubmit then sees an empty history and writes a fresh `Submitted` (not `Resubmitted`), leaving exactly `[Submitted, Approved]`.
> **In-place mutation is safe** (`submit`/`approve`/`reject` do `slot.reviewHistory = [...]; form.save()` on the *live* subdoc — those events persisted fine). **Rebuild-via-spread is not.** Fix: convert to a plain object first — `existingSlot.toObject()` — before spreading, and `form.markModified("mandatoryTraining")` before save (also covers the **Mixed** `fieldReviews` field, which needs `markModified` regardless). Same family as [[Gotchas#Shallow spread shares nested refs — a before/after diff of a mutated object is always empty (Form 32, 2026-07-09)|the Form 32 shallow-spread diff bug]]. Rule: **never `{...doc}` a Mongoose document/subdoc — use `.toObject()`; and `markModified` any Mixed path or reassigned nested array.** (Fix committed; needs a live reject→resubmit→approve re-test to confirm.)

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

## Bootstrap silently SKIPS any notification setting with no mapping entry (2026-07-12)

> [!warning] Add a setting to `notification-settings.json` without a `notificationSettingMappings` entry and it is never created — no error, and the notification then never fires
> `seedNotificationSettings` (`bootstrap.service.ts:1218`) looks up `notificationSettingMappings[setting.name]` for the action + template code. On a miss it `console.warn`s and `continue`s — the setting is **never inserted**. Downstream, `sendNotification` no-ops when `notificationSettingModel.findOne({name})` misses. So a new notification fails **silently at both ends**: nothing throws, nothing logs at runtime, the recipient just never hears anything.
>
> **Adding a notification needs FOUR edits, not two** (I originally wrote THREE here — that was wrong, see the next gotcha): (1) `seed_data/notification-settings.json`, (2) `seed_data/notification-template.json` (with a unique `code`), (3) the `notificationSettingMappings` object in `bootstrap.service.ts` keyed by the exact setting `name`, and (4) **the `code` must also be a member of the `SystemActions` enum**. Caught on the `SIT_IN_MOVED` work — the first two were done and it would have shipped mute. The seeder itself is **upsert-style and non-destructive** (it updates existing settings' parameters, never deletes), unlike the role-action seeder above.

## The 4th notification edit: `NotificationTemplate.code` is validated against the `SystemActions` enum (2026-07-12)

> [!danger] `SIT_IN_MOVED` and `Assessment Assessor Assigned` shipped mute for 9 days. The three-edit rule above was **incomplete** — and I only found out by reading a startup log Qusai pasted.
> `notification-template.schema.ts:8` is `@Prop({ unique: true, enum: SystemActions })`. The template `code` is therefore not a free string — it must **also exist as a `SystemActions` enum member**. `SIMV` and `ASNAR` never were, so Mongoose rejected the template on create:
> ```
> NotificationTemplate validation failed: code: `SIMV` is not a valid enum value for path `code`.
> ```
> No template → `seedNotificationSettings` can't create the setting → `sendNotification` no-ops on the missing setting. **Dead at three layers, and the only trace is a `console.error` at boot** that nobody reads. Fixed by adding `SIT_IN_MOVED = "SIMV"` and `ASSESSMENT_ASSESSOR_ASSIGNED = "ASNAR"` to `SystemActions` (`enums.ts`); both then seeded on the next boot.
>
> **How to check a notification is actually live** (don't assume): query `notificationsettings` + `notificationtemplates` for the name/code, and grep the boot log for `not a valid enum value` / `No mapping found` / `Action not found`. All three failure modes are silent at runtime.

## The notification seeder only re-syncs `parameters` — `destination` drift is permanent (2026-07-12)

> [!warning] Editing `destination` in `notification-settings.json` for an already-seeded setting is a **silent no-op, forever**
> `seedNotificationSettings` takes an early `continue` on any existing setting after syncing **only `parameters`** — it never updates `destination`, `action`, or `notificationTemplate`. The seed file says "Assessment Pending TM Review" goes to `["TM", "SA"]`; the DB row still says `["TM"]` from its first seed, so **Super Admins never receive it** no matter what the JSON claims. 67 settings are "synced" on every boot, parameters only — so any of them can be drifted the same way.
>
> Fixing it properly means making the seeder sync `destination` too, which would overwrite destinations deliberately customized in the DB. **Unresolved — needs a product call.**

## Certified-by / approver identity lives only in the audit log — the form wipes field reviews on approval (2026-07-16)

Building the [[Export History Form - TAT Form 031 PDF|History Form PDF]], the "Certified by" block needed the approving Training Manager's name + date. There is **no form-level `approvedBy`/`approvedAt`/`certifiedBy`** on `StaffHistoryForm` — and `approveBasicInfo` **wipes** `basicInfoFieldReviews = {}` on approval (per-field `reviewedBy`/`reviewedAt` only survive for *rejected* fields). So an approved form retains **no** in-document record of who approved it. The only persistent source is the **audit log**: filter `listAuditLog` for event `HISTORY_FORM_APPROVED` (fallback `HISTORY_FORM_BASIC_INFO_APPROVED`) → its `actorName` + `createdAt`. See [[History Form Audit Log]].

Related data-locality trap in the same subsystem: the aircraft **name** and **category (B1/B2)** are NOT on the TOR-matrix / qualification read DTOs — resolve the name from `AircraftTrainingTypes.aircraftTypeWithEngine`, and category lives only on `StaffQualification` (see [[Aircraft Category Filter - TOR Matrix]]). And "Successfully assessed as" comes from the **sit-in** record's `assessments[]`, not `StaffAssessmentService` (which has no per-user lister).
