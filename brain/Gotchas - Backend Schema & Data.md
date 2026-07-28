---
date: 2026-07-28
description: "Mongoose document and schema mechanics that bite — enum defaults, index lifecycle, subdocument spreads, soft-delete, and sequence allocation"
tags:
  - brain
---

# Gotchas - Backend Schema & Data

Split out of [[Gotchas]] on 2026-07-28, which had reached 96KB. Entries moved verbatim; [[Gotchas]] keeps the one-line index. **Add new entries here, not to the index.**
## A max-scan sequence generator has THREE independent duplicate paths — and the String one only detonates at row 1000 (2026-07-28)

> [!danger] `const max = await Model.findOne({}).sort({ seq: -1 }); next = parseInt(max.seq) + 1` — looks obviously correct, is wrong three separate ways, and passes every single-user test
> Each mechanism below is sufficient on its own to produce duplicates. None is visible when you create one record at a time by hand, which is how this kind of field always gets tested.
>
> **1. Read-then-write is not atomic.** Two concurrent creates read the same max and write the same next value. Without a unique index the database accepts both silently. **Use a counters document and `findOneAndUpdate({_id}, {$inc:{seq:1}}, {upsert:true, returnDocument:"after"})`** — atomic at the document level, one round trip, no sort.
>
> **2. Global query middleware silently applies to your scan.** `UserSchema = SchemaFactory.createForClass(User).add(BaseSchema)` — and **Mongoose's `Schema.prototype.add` merges the source schema's `callQueue`**, i.e. its registered pre/post hooks, not just its paths. So the [[tat-app-ws Backend]] soft-delete plugin (`base.schema.ts`, injects `deletedAt: null` into every `find`/`findOne`) applied to the max-scan. Soft-delete the highest holder and their number becomes invisible — the next create reuses it. **Any "internal" query through a Mongoose model inherits every plugin on every schema that was `.add()`-ed in. Use the raw driver (`this.db.db.collection(...)`) when you need to bypass them.**
>
> **3. Zero-padded numeric strings sort lexicographically.** `padStart(3,"0")` gives `"001".."999"`, then `"1000"`. `sort({field: -1})` on a String path compares character by character, so **`"999"` sorts above `"1000"`** (`'9' > '1'`). Past 999 rows the scan returns `"999"` forever and every subsequent record is assigned `"1000"`. Silent, permanent, and it only appears long after the code looks proven in production. **A padded string is a display format, not a sort key.**
>
> **Adding the unique index to existing data has its own trap.** A plain `unique: true` on a field the existing rows don't have indexes every one of them as `null` and fails to build on the second document — the same non-sparse behaviour as [[#`autoIndex: true` creates indexes but NEVER drops them — renaming an indexed field leaves a live unique constraint (2026-07-10)|the stale-index trap]]. Use a **partial** index: `partialFilterExpression: { field: { $type: "string" } }`.
>
> **A server-allocated identifier the client can set is not server-allocated.** The field had been added to `AdminUserDTO` and `ExtSignUpDTO` (the *public* signup path) and forwarded into `create()`. The allocator's guard is `if (!this.field)`, so any request supplying a value **skips allocation and leaves the counter un-advanced** — and once the unique index is live, a client sending a taken value gets a raw `E11000` instead of a validation error. Mark such fields `immutable: true` and keep them out of every DTO.
>
> **Backfilling does not test the allocator.** The migration was a raw-driver bulk write; it never went through `pre("save")`. Green migration output says nothing about whether the allocation path works. Fix: `ce3dd6cb`. Context: [[Sequential User Number - Atomic Allocation & Backfill]].

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
> **This was the 5th instance.** The [[#Nullable enum + `default: null` crashes Mongoose on create (backend, 2026-07-05, recurring)|2026-07-05 note]] already said it deserved *"a lint/schema-review rather than a one-off patch"* — that call was right, and it took three more instances to act on. Now enforced: **`npm run check:schemas`** (`scripts/check-nullable-enums.mjs`, `.github/workflows/checks.yml`). Three more latent copies were found and fixed in `user.schema` (`qualificationCategory` ×3 — unexploded only because those subdocs are `default: null` on `User`, so they're never instantiated on a plain user create).
>
> **The check itself nearly shipped useless.** My first version regexed the `@Prop({…})` body for `enum:` + `default: null` — and was wrong **in both directions**: it false-positived on `course-schedule` (an unrelated nested `default: null` in the same `@Prop`) and **false-negatived on the very bug it was written for** (a single-line prop let the enum-value capture run past the comma and swallow `default: null`, so it saw "null" in the enum and passed). **A check that misses the bug it was written for is worse than no check — it certifies the code as clean.** The working version resolves each `enum:` field's *enclosing object* and reads that object's own top-level `default:`. Verified both ways: clean on the fixed tree, catches all 4 real violations when the fixes are reverted.

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

## `Object.assign(merged, mergeFn(current, …))` clobbers freshly-merged data with stale `current` (Form 32 PIC save, 2026-07-08)

The [[TAT-409 Staff Management Subsystem|Form 32]] privileged (PIC) save did `Object.assign(merged, this.mergeAssessment(current, dto.assessment))` — but `mergeAssessment` returns `{ ...current, assessment }`, so the `Object.assign` **spread the entire stale `current` record over `merged`**, resetting the just-merged `name`/`date`/`sections` back to their pre-save (empty) values. It only bit a **first-time** PIC save (blank `current`) that also sent a **truthy** `assessment` — and the FE *always* sends `assessment: {}` (truthy), so every first PIC save failed. The backend then failed completeness validation with a **misleading** message: *"All Form 32 sections require a selected option and supporting evidence"* — pointing at sections when the real victim was the clobbered header/sections. Fix: assign only the merged piece — `merged.assessment = this.mergeAssessment(current, dto.assessment).assessment`.

- **Two traps compounded it:** (1) a merge helper that returns the *whole* object (`{...current, x}`) is a landmine when the caller `Object.assign`s it onto an already-built object; return just the sub-object, or have the caller pick `.x`. (2) The same `form32SectionsIncomplete` error is thrown from **four** places (header validation, per-section validation, category, aircraft-type) — a shared error message hides *which* check failed.
- **Debugging method that cracked it (staging, real token):** craft **discriminating** payloads to bisect which validation fires. Sending an evidence `fileKey` that passes the empty-check but fails the file-type check (`badkey.xyz`) returned `InvalidFileType` **only if** sections were received — proving `dto.sections` *was* delivered and the failure was upstream (header clobber), not a dropped DTO field. Also ruled out a class-validator `whitelist:true` strip by **reproducing the transform locally** with the repo's own `class-validator`/`class-transformer` — `@IsOptional()`-only does **not** strip a property (my first hypothesis was wrong; verify, don't assume).
- Sibling fix same session: **PIC couldn't *create* a Form 32 (401)** — the `@Action(SM_CREATE_FORM_32)` controller guard rejects before any service code, and `SM_CREATE_FORM_32` was only in the **instructor** role→action seed bucket, not the PIC (`smForm32PrivilegedEditorActions`) bucket. Guarded-endpoint permission lives in the **seed**, not a service-level role check — and needs a re-seed to apply (see the "Booting [[tat-app-ws Backend]] against a shared DB re-runs ALL seeders" gotcha above for the re-seed caveat).

## Spreading a Mongoose single-nested subdocument drops the patch (History Form basic-info, 2026-07-09)

> [!danger] `doc.subdoc = { ...doc.subdoc, ...patch }` silently persists the OLD values and discards `patch`
> `StaffHistoryForm.basicInfo` is a **single nested subdocument** (`@Prop({ type: BasicInfoSchema })`). `saveBasicInfo` did `form.basicInfo = { ...form.basicInfo, ...patch }`. Spreading a hydrated Mongoose subdocument copies its **internal** keys (`_doc`, `$__`, `$__parent`), **not** the field values — and when that object is assigned back, Mongoose sees it's "document-like", rebuilds from the embedded `_doc`, and **ignores the sibling `patch` keys**. Result: every basic-info save returned `200` but persisted nothing → the form blanked on refresh, and instructors could **never** submit (`assertBasicInfoComplete` always saw an empty object). **Proven** with the repo's own Mongoose: the spread yields `{name:"",…}`; `{ ...form.basicInfo.toObject(), ...patch }` and an explicit field-by-field rebuild both persist correctly (and mark the path modified). Fixed by rebuilding `basicInfo` from the current field values + patch. Commit `7c359c08`.
> Same family as the [[#`Object.assign(merged, mergeFn(current, …))` clobbers freshly-merged data with stale `current` (Form 32 PIC save, 2026-07-08)|Object.assign clobber]] — **never trust `{ ...mongooseDocOrSubdoc }`; use `.toObject()` or set fields explicitly.** Verify persistence, not just the 200.

## Shallow spread shares nested refs — a before/after diff of a mutated object is always empty (Form 32, 2026-07-09)

> [!danger] `const copy = { ...obj }` then mutating `copy.nested.x` also mutates `obj.nested.x`
> Building the Form 32 per-item review timeline, `computeForm32Changes(current, merged)` **never** detected an `edited`/`uploaded` event. Cause: `mergeSaveDto` does `const sections = { ...current.sections }` (a **shallow** copy — `sections[id]` *is* `current.sections[id]`) then mutates `existing.fileKey = incoming.fileKey`, updating `current` in place. By diff time `current` and `merged` point at the **same post-change objects**, so `before.fileKey === after.fileKey` → the diff finds nothing (e.g. replacing a section document went untracked). Fix: **deep-clone the pre-state** (`const before = JSON.parse(JSON.stringify(current))`) *before* the merge and diff against the clone. Commit `8ad91259`. Rule: if you need a genuine before/after diff, snapshot before ANY code that might mutate the object graph — a shallow spread does not isolate nested objects. Context: [[Form 32 Rejection History & Round-Scoped Stamps]].

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

## Spreading a Mongoose subdocument (`{...subdoc}`) drops nested arrays on re-save (2026-07-09)

> [!danger] Rebuilding a subdoc via `{...existingSubdoc}` + array reassignment silently loses nested subdocument arrays (e.g. `reviewHistory`) on re-cast
> Symptom: mandatory-training History (N) showed only `Submitted → Approved` — a reviewer reject + instructor resubmit cycle lost its `Rejected`/`Resubmitted` events. Root cause in `saveMandatoryTraining` (`staff-history-mandatory-training.service.ts`): it rebuilt the slot as `const nextSlot = { ...(existingSlot ?? {}), … reviewHistory: [...existingSlot.reviewHistory] }` then `form.mandatoryTraining = slots; form.save()`. **Spreading a live Mongoose subdocument yields internal `_doc`/`$__` keys, and the nested `reviewHistory` entries are subdocuments bound to the *old* parent** — when the whole array is reassigned and re-cast on save, that nested array gets dropped. The later resubmit then sees an empty history and writes a fresh `Submitted` (not `Resubmitted`), leaving exactly `[Submitted, Approved]`.
> **In-place mutation is safe** (`submit`/`approve`/`reject` do `slot.reviewHistory = [...]; form.save()` on the *live* subdoc — those events persisted fine). **Rebuild-via-spread is not.** Fix: convert to a plain object first — `existingSlot.toObject()` — before spreading, and `form.markModified("mandatoryTraining")` before save (also covers the **Mixed** `fieldReviews` field, which needs `markModified` regardless). Same family as [[#Shallow spread shares nested refs — a before/after diff of a mutated object is always empty (Form 32, 2026-07-09)|the Form 32 shallow-spread diff bug]]. Rule: **never `{...doc}` a Mongoose document/subdoc — use `.toObject()`; and `markModified` any Mixed path or reassigned nested array.** (Fix committed; needs a live reject→resubmit→approve re-test to confirm.)
