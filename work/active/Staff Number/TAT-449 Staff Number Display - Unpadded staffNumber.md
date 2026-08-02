---
date: 2026-08-02
description: "TAT-449's backend was complete but the staff number was displayed nowhere; built both surfaces, and the value's unpadded shape proves the staffNumber backfill never ran on staging"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
ticket: TAT-449
---

# TAT-449 — Staff Number Display & the Unpadded `staffNumber`

**The backend was complete and two stated requirements were never built.** `grep -rn
"staffNumber|userNumber" src` in [[tat-prereq]] returned **zero hits** — the Manage Staff
table was Name/Email/Role/Status, and the profile card had no such field. The number had
been allocated, indexed, made immutable and backfilled, and **nothing displayed it**.

Same class as the [[Staff Management - Unreachable Backend Endpoints|dead-endpoint sweep]]:
a finished backend capability with no frontend affordance, which reads from the outside as
an unbuilt feature.

## Only one API needed changing, not two

The obvious assumption — *two display surfaces, so two DTOs* — was wrong, and checking cost
one read each:

- **`StaffCatalogItemDTO` had no `staffNumber`.** The Manage Staff list genuinely needed a
  backend change.
- **Both profile paths already carried it.** `/user/details/:id` passes the user through
  `sanitizeUser`, which strips only `password`, `__v`, `resetPassToken`, `emailToken` — so
  every other field, `staffNumber` included, survives by default. `getMyProfile` spreads two
  objects that each already contain it.

**A deny-list sanitizer means new fields are exposed by default**, which is why the profile
half needed no backend work at all. The catalog DTO is an allow-list, so it needed the
opposite.

## Shipped

- **`1e08eca5`** [[tat-app-ws Backend]] — `staffNumber` on `StaffCatalogItemDTO` +
  `listStaffProfiles` mapping
- **`ab8481f`** [[tat-prereq]] — Staff No. column, Staff number profile field, carried
  through **all three mappers** (`toStaff`, `toStaffDetail`, `getMyStaffProfile`)

## The value on staging is the number `3`, not a padded string

> [!danger] The shape of the value disproves where it came from
> TAT-449's spec: *"Assign numbers in ascending order based on the creation date and time
> (e.g., 0001, 0002, 0003)."* Staging returns **`3`** — a **number**, unpadded.
>
> **All three writers produce a padded string**, so none of them wrote this value:
>
> | writer | what it produces |
> |---|---|
> | schema | `@Prop({ type: String, immutable: true })` |
> | `pre("save")` allocator | `String(seq).padStart(4, "0")` |
> | migration `format()` helper | pads |
>
> **Therefore the backfill has never run on staging under this name, and the `3` came from
> somewhere else** — (inferred) from the three writers above; the actual fourth source is
> **unidentified**.

This settles most of the contradiction parked in
[[Sequential User Number - Atomic Allocation & Backfill]] on 2026-08-01 — that note records
a backfill *applied* (40 users, `001..040`), the certificate evidence said *unrun*. The
reconciliation it guessed at (field renamed after the backfill, leaving the new name
unpopulated) is consistent with a value that no current writer could have produced. Note
the **pad widths also disagree**: that note records 3-wide `001..040`, the current allocator
pads to **4**.

## Evidence

Staging catalog row lacks the field entirely (pre-deploy) while the detail endpoint returns
an unpadded number:

```json
{"catalogFirstRowKeys":["userId","name","email","role","staffStatus"],
 "catalogStaffNumber":"ABSENT",
 "detailStaffNumber":3,
 "detailHasField":true}
```

Rendered on the profile card as `STAFF NUMBER: 3`.

## Still open

- **The Manage Staff column renders but is empty until `1e08eca5` deploys.** Confirmed this
  is the deploy lag and **not an FE bug**, via the catalog probe above — the field is
  `ABSENT` from the row, so there is nothing for the column to read.
- **The unpadded value breaks the `0001` format requirement of TAT-450 AC-12**, so the
  certificate's Authorization Number would read **`"3"`**. Parked with the rest of the
  legacy-data work, pending the `dev` DB clear.
- **The FE type declares `string | null` while runtime yields a number.** It renders fine,
  so nothing fails — but **the type is a lie against real data**, and the next person to
  call a string method on it finds out at runtime.
- **Where `3` actually came from is unknown.** Worth settling before the DB clear, because a
  fourth writer that bypasses the allocator would also bypass the counter and the unique
  index.

## Related

- [[Sequential User Number - Atomic Allocation & Backfill]] — the allocator, the migration,
  and the backfill-status contradiction this narrows
- [[TAT-450 TOR Certificate FE - Read Path Only]] — AC-12's Authorization Number reads this
  field; its blank render was the first sign
- [[TAT-455 Final TOR Certificate - SA Publish Gate]] — the certificate work this feeds
- [[Staff Management - Unreachable Backend Endpoints]] — the same finished-backend /
  no-affordance shape
- [[TAT-432 Staff Profile]] — the profile surface the field landed on
- [[Staff Management Subsystem & TOR Model]] · [[TAT-409 Staff Management Subsystem]]
- [[tat-prereq]] · [[tat-app-ws Backend]]
- [[Gotchas - Backend Services & Environment#A deny-list sanitizer exposes new fields by default; an allow-list DTO hides them — the same field needs opposite work on each path (2026-08-02)]]
- [[Index|Work Notes]]

### Competencies

- [[Debugging & Root Cause Analysis]] — read the **format** of a value as evidence about its
  **provenance**: since all three writers pad and the value was unpadded, none of them wrote
  it. That turns "the number looks wrong" into "the backfill never ran here" without needing
  database access.
- [[Systems Thinking]] — checked each display path's serialization rather than assuming
  symmetry, which found that a deny-list sanitizer and an allow-list DTO need opposite work
  for the same field, and halved the backend change.
- [[Delivery & Scope Management]] — separated the deploy lag from an FE bug with a probe
  before reporting the empty column, and declared the type/runtime mismatch rather than
  leaving a passing render to imply correctness.
