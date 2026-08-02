---
date: 2026-08-02
description: "TAT-453 needed no frontend work — the real finding is that the unbackfilled instructorType is now load-bearing in a second subsystem, where an else branch disguises an empty pool as a list of admins"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
ticket: TAT-453
---

# TAT-453 — Assessor Eligibility: `instructorType` Becomes Load-Bearing Twice

The assessor pool is now filtered to **Practical/Both** instructors with a **matching aircraft
category** and a **live refresher**. Backend shipped by Dawahreh in `4d993461`.

**The frontend needed no work at all.** `AssessmentAssignForm` already drove the dropdown off
`eligible-assessors` after aircraft-type selection, reset on type change, and omitted
`assessorUserId` when empty. The backend **narrowed what the same endpoint returns**, and the
FE was already conformant. **TAT-453 was a verification task, not a build one** — the
deliverable was establishing that, not changing code.

## The consequence that matters

The filter keys on `TOR.instructorType` — **whose backfill has never run**, and whose schema
default is `NONE`:

```ts
// staff-assessment.service.ts — the added TOR predicate
instructorType: { $in: ASSESSOR_INSTRUCTOR_TYPES }   // [PRACTICAL, BOTH]
```

```ts
// staff-tor.schema.ts:52
@Prop({ type: String, enum: InstructorType, default: InstructorType.NONE })
instructorType!: InstructorType;
```

That field was already load-bearing for the **Form 32 A/B split**
([[Instructor Type - Per-Authority Form 32 Split]]). It is now load-bearing in a **second,
unrelated subsystem** — assessor eligibility — while still holding its default on every
legacy TOR. **An unbackfilled field's blast radius grows every time someone keys a new rule
off it**, and nothing about adding the second consumer signals that the first one is still
unmigrated.

> [!danger] Three independent legacy-data conditions each collapse the pool to empty
> `instructorType: NONE` · null `refresherExpiresAt` · missing `aircraftCategory`. Any one of
> them is sufficient. And a **pre-existing `else` branch then substitutes privileged roles**,
> so **the picker does not look broken — it looks like a working list containing only
> admins.**
>
> Same shape as [[TAT-429 Sit-In Eligibility & Move Semantics|TAT-429]], where an unpassable
> gate presented as an empty list: the symptom points at *"nobody qualifies"* rather than
> *"this rule cannot currently be satisfied by any row in the database"*.

## The half that is right

Save-side `assertEligibleAssessor` calls the **same** `findQualifiedAssessorUserIds` as the
picker, so **the list and the validation cannot drift**. That is the correct shape — the
inverse of [[TAT-454 Instructor Assignment Filtering - courseMethod|TAT-454]], where an inert
read sat next to a hard-rejecting save.

## Still open

- **The commit is labelled TAT-435** (Pending TORs Page — *already Passed QA*) **but contains
  TAT-453's code.** Qusai's call, 2026-08-02: **not worth chasing.** Recorded because it means
  git history cannot be searched by ticket number to find this work.
- **`ErrorMessages.staffAssessmentAssessorRequired` was added and is referenced nowhere**,
  while `assessorUserId` remains `@IsOptional()`. Dead code — a handoff for Hamza.
- **The valid-refresher rule is enforced but appears in no Jira requirement.** Scope beyond
  the AC, which **will surprise QA** — they will test against a requirement that doesn't
  mention it.
- **Jira status is still "Ready for Dev"** while the work is complete.

## Related

- [[Instructor Type - Per-Authority Form 32 Split]] — TAT-451 + TAT-448, where
  `instructorType` was introduced and where its backfill still sits unrun
- [[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]] — the **sibling**
  unbackfilled field (`requestedRoleCodes`) and the ordering trap that entangles the two
- [[TAT-429 Sit-In Eligibility & Move Semantics]] — the same empty-list-as-symptom shape
- [[TAT-423 Assessment Report Rubric]] — where the assessor model came from
- [[TAT-454 Instructor Assignment Filtering - courseMethod]] — the picker/save-drift failure
  this one avoids
- [[Staff Management Subsystem & TOR Model]] · [[TAT-409 Staff Management Subsystem]] ·
  [[TAT-409 Delivery Log]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Patterns - Architecture & Boundaries#A fallback branch turns an empty filtered pool into a plausible wrong answer (2026-08-02)]]
- [[Gotchas - TOR & Staff Management#`instructorType` is unbackfilled and now load-bearing in two subsystems — Form 32 A/B and assessor eligibility (2026-08-02)]]
- [[Index|Work Notes]]

### Competencies

- [[Systems Thinking]] — traced a backend filter to the **data** it keys on and recognised
  that a field already known to be unmigrated had just acquired a second consumer, which is a
  blast-radius change nobody would see from either ticket alone.
- [[Delivery & Scope Management]] — verified the frontend was already conformant and
  **reported no work needed** rather than manufacturing a change to match the ticket; and
  flagged the un-specified refresher rule as a QA surprise before QA finds it.
- [[Debugging & Root Cause Analysis]] — identified that the failure would present as a
  *plausible* list of admins rather than an obvious break, so the bug would be reported as
  wrong behaviour rather than missing data, if at all.
