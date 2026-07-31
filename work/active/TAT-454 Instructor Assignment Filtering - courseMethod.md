---
date: 2026-08-01
description: "The backend's new instructor-eligibility filter was inert because the FE had never sent courseMethod, while assignment already hard-rejected on save. FE built and verified end to end"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-ws
ticket: TAT-454
---

# TAT-454 — Instructor Assignment Filtering by `courseMethod`

The backend drop of **2026-07-28 → 07-31** (Dawahreh) shipped TAT-449/454/450 with **no
frontend**. TAT-454's integration guide said to *"keep sending `courseMethod`"* — the
frontend had **never sent it**. So the new eligibility filter was **inert on read** while
assignment had already started **hard-rejecting on save**: the worst possible split, because
the picker happily offers instructors the save will refuse.

Consumes the theoretical/practical distinction added by
[[Instructor Type - Per-Authority Form 32 Split]], which listed TAT-454 as unblocked by it.

## Shipped

`tat-ws` **`cf1a168`** — on `dev`, **unpushed**. All three instructor pickers now send
`courseMethod`.

## Verified end to end

Browser, against staging. **The network panel lied** — the extension's capture
under-reported cross-origin calls, showing **1 of 11** — so the evidence was read from
`performance.getEntriesByType('resource')` instead:

| role | cat | courseMethod | status |
|---|---|---|---|
| IN | B1/B2 | Theoretical | 200 |
| IN | B1 | Theoretical | 200 |
| IN | B2 | Theoretical | 200 |
| EX | B1/B2 | `null` | 200 |
| EX | B1 | `null` | 200 |
| EX | B2 | `null` | 200 |

`courseMethod` is correctly **absent for Examiners** — it only applies to the instructor role.

Persisted React Query cache confirmed **all three pickers** carry it, not just the one under
test:

```
["instructors","B1/B2",[license],aircraftTypeId,"Theoretical"]
["instructors",{...,"courseMethod":"Theoretical","role":"IN"}]
["instructors",{"limit":20,...,"courseMethod":"Theoretical"...}]
```

## Traps worth keeping

> [!danger] Send `courseMethod.name`, never `courseMethod._id`
> The DTO is `@IsEnum(TrainingTypesEnums)` = `"Theoretical" | "Practical"`, but a course
> carries `{ _id, name }` **and the course forms submit the `_id`**. Reusing the value the
> way the neighbouring form does is a **400**. The object shape in hand and the shape the
> DTO wants are different projections of the same field.

> [!warning] Bulk Edit reads from a *different* query-config source
> Bulk Edit runs `preloadAll`, so its lists come from **`getAllInstructorQueryConfigs`**, not
> `getInstructorQueryConfig`. Patching only the latter leaves the page **looking wired while
> staying unfiltered** — a silent partial rollout with no error anywhere.

## Still open

- **The filter has never been shown to actually narrow the list.** Every call returned 200
  with the param attached; proving it *filters* needs instructors with differing
  `instructorType`, which the current data doesn't have.
- **Only `Theoretical` was exercised** — the `Practical` mapping is unproven.
- **The assignment 400 toast** (the hard-reject path this fix exists to prevent) was never
  triggered.

## Related

- [[Instructor Type - Per-Authority Form 32 Split]] — supplies the theoretical/practical grain
- [[TAT-450 TOR Certificate FE - Read Path Only]] — the other half of the same backend drop
- [[Aircraft Category Filter - TOR Matrix]] — the `@IsEnum` + class-validator whitelist
  question this answers in practice
- [[TAT-429 Sit-In Eligibility & Move Semantics]] · [[Staff Management Subsystem & TOR Model]]
- [[tat-ws]] · [[tat-app-ws Backend]] · [[TAT-409 Staff Management Subsystem]]
- [[Patterns - Method & Conventions#An integration guide describes the FE the backend imagined — verify against the code (2026-08-01)]]
- [[Index|Work Notes]]

### Competencies

- [[Debugging & Root Cause Analysis]] — distrusted the tool rather than the finding when the
  network panel showed 1 call of 11, and reached for `performance.getEntriesByType` to get
  evidence the panel couldn't provide.
- [[Systems Thinking]] — read the backend's actual code instead of its integration guide,
  which caught that the guide's premise ("keep sending `courseMethod`") described a frontend
  that never existed, and that the inert-read / rejecting-write split was the real hazard.
- [[Delivery & Scope Management]] — checked all three pickers and the separate Bulk Edit
  config source rather than the one under test.
