---
date: 2026-08-01
description: "Form 32C/32D visible to plain instructors: the role gate fails open when a TOR's requestedRoleCodes is empty, and no migration backfills legacy TORs"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
ticket: TAT-451
---

# Form 32 C-D Fail-Open — Empty `requestedRoleCodes` on Legacy TORs

Follow-on to [[Instructor Type - Per-Authority Form 32 Split]] (TAT-451 + TAT-448), which
split **32A/32B** by the new per-TOR `instructorType` and left **32C/32D** on
`requestedRoleCodes`. A plain instructor still sees all four.

**Root-cause only — no code written, nothing fixed.**

> [!info] Two unbackfilled fields, not one (2026-08-02)
> This note's field is **`requestedRoleCodes`** (32C/32D). Its sibling is **`instructorType`**
> (32A/32B), whose migration exists but has never run — and which TAT-453 has now made
> load-bearing in **assessor eligibility** too
> ([[TAT-453 Assessor Eligibility - instructorType Load-Bearing Twice]]). They are entangled
> by the ordering trap: **`requestedRoleCodes` must be backfilled first**, because the
> `instructorType` migration derives from it. Easy to conflate; they fail differently.

## Root cause — stale data, not broken logic

Three things everyone suspects are all fine:

- The role gate is **not** missing.
- The mapping is **not** wrong — `32C → EXAMINER`, `32D → PRACTICAL_ASSESSOR` are correct.
- The filter **is** applied in all four paths.

The defect is a **deliberate fail-open**: `formKeyMatchesRequestedRoles` returns `true` for
every form when the TOR's `requestedRoleCodes` is empty. TORs created before that field
existed have it empty, and **no migration ever backfills it** — so every pre-TAT-448 TOR
shows all four forms, while TORs created after TAT-448 filter correctly.

## Evidence

`libs/database/src/lib/staff-management/staff-tor-requested-role.util.ts`:

```ts
export function formKeyMatchesRequestedRoles(formKey, requestedRoleCodes, instructorType) {
  if (isInstructorForm32Key(formKey) && instructorType != null) { ... }
  if (!requestedRoleCodes?.length) {
    return true;              // <-- fail open
  }
  const requiredRole = FORM_32_ROLE_BY_KEY[formKey];
  if (!requiredRole) return true;
  return requestedRoleCodes.includes(requiredRole);
}
```

Pinned by its own spec (`staff-tor-requested-role.util.spec.ts`) — the behaviour is
intentional and tested, not an oversight:

```ts
it("returns everything when nothing is configured", () => {
  expect(filterTemplatesByRequestedRoles(templates, [], null)).toHaveLength(4);
});
```

**Browser repro, staging, 2026-08-01** — "Tor Instructor Dev"
(`tor-dev-instructor@tat.test`, role Instructor, "No secondary roles"),
TOR `6a32e22a7d5fab715e6668db` (CARC). Forms list rendered:

| Form | Should appear? |
|---|---|
| Form 32A — Theoretical Instructor | yes |
| Form 32B — Practical Instructor | yes |
| Form 32C — Examiner | **no** |
| Form 32D — Assessor | **no** |

**The discriminating contrast** (Qusai, 2026-08-01): a **newly created** user's TOR filters
correctly. Same code, opposite outcome, decided only by whether `requestedRoleCodes` was
populated at creation. That is what makes this stale data rather than broken logic.

**Grep for a backfill:** only `2026-07-30-backfill-tor-instructor-type.js` mentions
`requestedRoleCodes`, and it only **reads** it (lines 18/36/56) to derive a type. Its single
write is line 60: `$set: { instructorType }`. **Nothing in the repo ever writes
`requestedRoleCodes`** after TOR creation — consistent with there being no frontend for it
either (see [[Staff Management - Unreachable Backend Endpoints#2. An instructor's requested roles are frozen at creation — `PATCH /tors/:torId/requested-roles`]]).

## The ordering trap

> [!danger] Running the existing instructor-type backfill on legacy TORs makes this **worse**, not better
> `2026-07-30-backfill-tor-instructor-type.js` derives the type from `requestedRoleCodes`.
> On a legacy TOR that array is empty, so `resolveType([])` returns **`NONE`** and the
> migration writes `instructorType: NONE`. `FORM_32_KEYS_BY_INSTRUCTOR_TYPE[NONE]` is `[]`,
> which **hides 32A/32B — the forms the instructor actually needs** — while 32C/32D stay
> visible through the fail-open. It also trips the activation guard that holds TORs whose
> type is `NONE`.
>
> **Backfill `requestedRoleCodes` FIRST, then instructor type.** Two migrations that each
> look independently safe are order-dependent because one derives its input from the other's
> unwritten field.

## The gate also covers the Final TOR Certificate (2026-08-02)

`FORM_32_ROLE_BY_KEY` maps **five** keys, not four:

```ts
export const FORM_32_ROLE_BY_KEY = {
  [FORM_32A]: INSTRUCTOR,  [FORM_32B]: INSTRUCTOR,
  [FORM_32C]: EXAMINER,    [FORM_32D]: PRACTICAL_ASSESSOR,
  [TOR_CERTIFICATE]: INSTRUCTOR,        // <-- easily missed
};
const STAFF_ASSIGNMENT_ROLES = new Set([INSTRUCTOR, EXAMINER, PRACTICAL_ASSESSOR]);
```

So closing the fail-open would **also hide the Final TOR Certificate** on any TOR with empty
`requestedRoleCodes` — the artifact [[TAT-450 TOR Certificate FE - Read Path Only]] and
[[TAT-455 Final TOR Certificate - SA Publish Gate]] are built around.

The branch is narrower than it looks in the other direction: the following line,
`if (!requiredRole) return true`, already means *"this template isn't role-scoped → allow"*,
so the empty-array check affects **only** those five keys. Removing it is surgical by
construction — every non-Form-32 template is untouched.

**`resolveDefaultRequestedRoleCodes` can legitimately return `[]`** — for any user whose
primary and secondary roles contain none of the three assignment roles. Reachable for a QM or
TM who also instructs. That is the case to close at *write* before closing the *read* gate.

> [!info] Decision — deferred (Qusai, 2026-08-02)
> **Leave the fail-open as is.** Ship a fix or hand it to Dawahreh once QA flags it. The dev
> DB will be cleared, which makes the symptom vanish on fresh data since new TORs populate
> `requestedRoleCodes` at creation.
>
> Recommended but **not** adopted: do it during the clear — the only window where closing it
> costs nothing. After the clear the symptom disappears on its own and the guard looks
> correct, until production data reintroduces the empty case with real users.

**Browser, staging 2026-08-02:** the TOR details page for plain instructor "Tor Instructor
Dev" still lists Form 32A, 32B **and 32C** — the fail-open, unchanged.

## Still open

- **Needed: `scripts/migrations/2026-08-01-backfill-tor-requested-role-codes.js`** — join
  each TOR to its user, derive via the **existing exported** `resolveDefaultRequestedRoleCodes`
  (primary + secondary roles filtered to `INSTRUCTOR`/`EXAMINER`/`PRACTICAL_ASSESSOR`), set
  only where missing/empty, dry-run by default like the others. **Not written.**
- **UNKNOWN: how many TORs are affected.** A dry run answers this; no DB query was run.
- ~~**Open decision — close the fail-open for Form 32 keys at all?**~~ **Decided 2026-08-02:
  deferred, leave as is** until QA flags it — see [[#The gate also covers the Final TOR
  Certificate (2026-08-02)]]. The "arguably never for non-Form-32 templates" caveat is now
  answered: `if (!requiredRole) return true` already covers them, so the empty-array branch
  was only ever load-bearing for the five mapped keys.
- The ordering trap above blocks running the TAT-451 backfill, which was already listed as
  never-run in [[Instructor Type - Per-Authority Form 32 Split#Still open]].

## Related

- [[Instructor Type - Per-Authority Form 32 Split]] — TAT-451 fixed A/B, left C/D
- [[Staff Management - Unreachable Backend Endpoints]] — no surface can edit `requestedRoleCodes`
- [[Staff Management Subsystem & TOR Model]] · [[TAT-409 Backend Open Items]]
- [[TAT-409 Staff Management Subsystem]] · [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Gotchas - Forms & Approval#~~Form 32 forms are license-scoped, not role-scoped — shows all 4 A-B-C-D~~ — the gate exists and fails open on legacy data (2026-07-05 → corrected 2026-08-01)]]
- [[Gotchas - TOR & Staff Management#Two backfills, one order — deriving from a field nothing has backfilled yet writes a confidently wrong value (2026-08-01)]]
- [[Patterns - Architecture & Boundaries#A guard that fails open on absent data is disabled by the data, silently (2026-08-01)]]
- [[Index|Work Notes]]

### Competencies

- [[Debugging & Root Cause Analysis]] — the discriminating contrast (new user filters, legacy
  user doesn't) separated data from logic in one observation, after three plausible code-level
  hypotheses were each checked and eliminated.
- [[Systems Thinking]] — the finding that matters most isn't the bug, it's the **ordering
  dependency between two migrations** that would have surfaced only as a worse regression in
  production.
