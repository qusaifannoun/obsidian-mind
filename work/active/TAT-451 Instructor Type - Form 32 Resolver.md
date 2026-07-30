---
date: 2026-07-30
description: "First slice of TAT-451 — a pure instructor-type → Form 32 A/B resolver, delivered by a live codex station through Loom. Built, tested, unmerged: it has no callers until TAT-448 lands"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q3-2026
project: tat-prereq
ticket: TAT-451
---

# TAT-451 Instructor Type - Form 32 Resolver

The pure resolver mapping an instructor's authorization type to the Form 32 role forms that
apply. **Built and green, deliberately unmerged** — see Still open.

This was also [[Loom]]'s first slice driven by a real coder station rather than the
deterministic `sim` one.

## Why this slice existed

`src/types/form32.ts` had documented the gap in its own doc comment for months:

> A/B both map to `IN` because there is no separate theoretical/practical instructor code,
> so an instructor sees both.

TAT-451 AC-02–AC-05 close exactly that: Theoretical → Form 32 A, Practical → Form 32 B,
Both → both, None → neither. The resolver is pure — no UI, no API, no state — which made it
the smallest real unit that could exercise the whole delegation loop, matching the Slice 0
doctrine in [[Loom]].

## What shipped

Two files, 26 insertions, on branch `loom/tat-451-instructor-type` (not merged to `dev`):

- `src/enums/instructor-type.ts` — `INSTRUCTOR_TYPES` const map, `InstructorType` derived via
  `keyof typeof`, sorted options array. Mirrors `src/enums/staff-role.ts` exactly.
- `src/types/form32.ts` — `instructorForm32Keys(type): Form32FormKey[]`, exhaustive switch,
  fresh array per call.

## Evidence

```
✓ tat-451-instructor-type  [codex]  GREEN
    changes produced, test passed
    src/enums/instructor-type.ts | 12 ++++++++++++
    src/types/form32.ts          | 14 ++++++++++++++
    2 files changed, 26 insertions(+)
```

Re-verified independently rather than trusting the station's report — per
[[Loom]], the report is not evidence:

```
Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
tsc: clean
eslint: clean
```

The six tests were **written from the ACs before codex ran**, and injected at gate time —
never authored by the station. That is the load-bearing constraint: a test written from
coder output only ratifies whatever the coder did.

## On the delegation itself

codex read `AGENTS.md` first, then `staff-role.ts` and `form32.ts`, and adopted the repo's
existing idiom instead of inventing one. It added no comments, used no `any`, touched
exactly the two files named, and left `FORM32_REQUIRED_ROLE` and `form32VisibleForRoles`
alone. **Review nit:** `INSTRUCTOR_TYPE_OPTIONS` emits `{value, label}` where
`STAFF_ROLE_OPTIONS` emits `{code, label}` — small idiom drift, worth aligning before merge.

It also could not build, lint, or test its own work — the worktree had no `node_modules`.
The code was right by luck, not by verification. See
[[Gotchas - Tooling & Method#A git worktree has no `node_modules`, so a delegated agent writes code it cannot verify (2026-07-30)]].

## Still open

- **Unmerged, and dead code if merged today.** `instructorForm32Keys` has **zero callers**
  until **TAT-448** (Configure Instructor Type During Creation, Ready for Dev, unbuilt)
  supplies the configured per-authority type. Merge as groundwork or hold the branch and
  land both together — a decision, not an oversight.
- **Only AC-02–AC-05 of TAT-451.** AC-01 (per-authority independence), AC-06 (feeding the TOR
  approval workflow), AC-07 (cascade on type change) and AC-08 (audit log) are untouched.
- Not wired into `form32VisibleForRoles`. Visibility still gates A and B on the `IN` role,
  so **user-visible behaviour is unchanged** — nothing was verified in a running app.
- The `{value, label}` vs `{code, label}` drift above.

## Related

- [[Loom]] — the pipeline that delivered it; this was its first live-station slice
- [[Gotchas - Tooling & Method]] — the worktree/`node_modules` trap this surfaced
- [[tat-prereq]] · [[TAT-409 Staff Management Subsystem]]
- [[Index|Work Notes]]
