---
date: 2026-09-22
description: "Phases had no reorder control and their order was rebuilt from the phase catalog on every edit; chapter order was lost to a $lookup; a reorder never reset the template schedule"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-ws
---

# Course Phase Order

**Reported by Qusai:** *"the phases here are order in a wrong order, i nee to be able to change the phases order (rearange them)"* — on Manage Courses → course details.

Three separate order problems under one request, in three different layers — and a fourth found on 2026-09-28, when a template-created course still showed the template's schedule after a reorder.

## 1. Phase order was discarded on every edit (frontend)

`PhasesMultiSelect.handleChange` rebuilt the selection as:

```ts
const next = ids.length > 0 ? phases.filter((p) => ids.includes(p._id)) : [];
```

`phases` is the **paginated phase catalog**, so the resulting order came from fetch order, never from what the user picked. There was also no way to reorder at all.

**The backend was never at fault here.** `Course.phases` is an embedded array (`EmbeddedPhase[]`), `findOrCreatePhases` preserves the incoming array order, and the read aggregation's `$unwind` → `$push` round-trip keeps it.

Fixed by `e91e2ce` (Qusai's own commit) plus `a81b387`: a dnd-kit sortable phases panel (`SortablePhaseItem`, grip handle, `verticalListSortingStrategy`), `movePhase` via `arrayMove` writing both `selectedPhases` and the RHF value with `shouldDirty`, and a selection-order-preserving multiselect that also reuses the already-selected phase object rather than the catalog copy — the old code could swap a course's phase for the template copy and discard chapter edits. Mirrors the existing dnd-kit idiom in `manage-exams/questions-bank/create-question`.

## 2. Chapter order inside each phase was lost (backend)

`buildCourseAggregation` did:

```js
{ $unwind: { path: "$phases", preserveNullAndEmptyArrays: true } },
{ $lookup: { from: "chapters", localField: "phases.chapters", foreignField: "_id", as: "phases.chapters" } }
```

`$lookup` does not preserve the local array's order, so **every course read** returned each phase's chapters in `_id` order rather than curriculum order — affecting the course list, course detail and bulk-edit alike.

Fixed by `60aa18c3` in [[tat-app-ws Backend]]: stash the stored id array before the lookup, land the lookup in a scratch field, then `$map` the documents back into the stored order and `$filter` out ids with no matching chapter. Both scratch fields are dropped by the inclusion `$project` that follows. Behaviour on a phase-less course is unchanged — the old `$lookup` already forced `phases.chapters` to `[]`.

See [[Gotchas - Backend Schema & Data]].

## 3. A saved bulk schedule never reflects a reorder

`ScheduleFormContainer.tsx:106` prefers an existing saved schedule over the generator, so a schedule generated before a reorder keeps its old order permanently. `useScheduleGeneration` already exposed a `generateSchedule` that `ScheduleList` destructured at line 72 and **never rendered**.

Fixed by `8be5815`: a "Regenerate from Course" button behind the shared `ConfirmationModal`, wired to that existing function. Writes to the form with `shouldDirty` so nothing persists until Save, and the modal states plainly that instructor, examiner and classroom assignments are discarded.

## 4. A reorder never reset the template-cloned schedule (backend)

**Reported by Qusai (2026-09-28):** a course created from a template kept the template's schedule in bulk edit after its phases were reordered — *"rearanging the phses should regenerate the bulk edit schedule to match the new order of the phases"*.

The reset mechanism already existed. `CourseService.create` clones the template's `courseSchedule` when `templateId` is set, and `CourseService.update` deletes that schedule and saves an empty one whenever `phasesChanged` — after which bulk edit's `ScheduleFormContainer` init sees an empty schedule and generates from the course in phase order. **The gap was the change detection:** `phasesChanged` compared the old and new chapter ids as two `Set`s —

```ts
existingChapterIds.size === newChapterIds.size &&
  Array.from(existingChapterIds).every((id) => newChapterIds.has(id)) &&
  Array.from(newChapterIds).every((id) => existingChapterIds.has(id));
```

— so a phase or chapter reorder, which keeps the same set, counted as no change, and the template's schedule survived every save. See [[Gotchas - Backend Services & Environment]].

Fixed by `d009258a` in [[tat-app-ws Backend]] (`course.service.ts` `update`, pushed to `dev` and `master` on 2026-09-28): both sides are flattened to the chapter-id sequence in phase order and compared by length and index. Phase reorders, chapter reorders, adds and removes all now reset the schedule. No [[tat-ws]] change was needed — `useFetchCourseBulkEdits` has `staleTime: 0`, so bulk edit refetches on mount.

**Consequences, all pre-existing for chapter adds/removes and now also triggered by a reorder:**
- The reset discards instructor, examiner and classroom assignments.
- The update guard blocks only Assigned and Completed courses, so a reorder on a **Scheduled** course wipes its schedule too.
- A course whose reorder was saved **before** this deploy is already stored in the new order, so re-saving it is a no-op. It needs a manual "Regenerate from Course" (section 3).

## Status — none of this is verified

Everything here is `tsc`-clean and **nothing was run**. All four sections are committed. Section 4 (`d009258a`) was pushed to `dev` and `master` on 2026-09-28, and a `master` push triggers the production deploy. Unexercised: the drag interaction, the save round-trip, whether a reordered array survives `findOrCreatePhases` on PATCH, the regenerate flow, and the chapter-order pipeline — which was never executed at all, as there is no local mongod and no `mongodb-memory-server` in the repo.

All of it is live on `master`/production: `deploy.prod.yml` triggers on push to `master`.

## Action Items
- [ ] Browser-verify phase drag + save, and confirm the order survives the PATCH round-trip
- [ ] Run the chapter-order aggregation against real data — load a course whose phase has chapters created out of curriculum order
- [ ] Exercise "Regenerate from Course" once; it reads `globalStartTime`/`breakMinutes` from the toolbar and has never run
- [x] Commit the ordered `phasesChanged` comparison in [[tat-app-ws Backend]]: `d009258a`, pushed to `dev` + `master` on 2026-09-28. Only `tsc`-checked (`libs/database/tsconfig.lib.json`, no errors in `course.service.ts`), never run
- [ ] After deploy: reorder phases on a template-created course, save, open bulk edit — it should regenerate in the new order; then save the course unchanged and confirm the schedule is **not** reset
- [ ] Decide whether a phase reorder on a Scheduled course should be allowed to wipe its schedule and assignments

## Related
- [[tat-ws]], [[tat-app-ws Backend]], [[TAT Platform]]
- [[Gotchas - Backend Schema & Data]], [[Gotchas - Backend Services & Environment]]
- [[Compose Exam - Period Chapters, Course Reset & Day Labels]] — same course/exam surface
- [[Live Exam Failure]] — same day, same repos
