---
date: 2026-07-28
description: "Max-scan sequential userNumber had three independent duplicate paths; replaced with an atomic $inc counter + partial unique index, plus a backfill for 40 legacy users."
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Sequential User Number - Atomic Allocation & Backfill

> [!warning] The field was renamed to `staffNumber` — every `userNumber` below is the old name (2026-08-01)
> Surfaced while building [[TAT-450 TOR Certificate FE - Read Path Only]]: the certificate's
> **Authorization Number renders `—`**, sourced from **`staffNumber`**, and that backfill is
> **unrun**. This note's `userNumber` names — the schema field, the `counters._id`, the
> `userNumber_unique` index, the migration — have **not** been re-verified under the new name.
>
> **Unresolved contradiction, do not act on either half yet.** This note records the backfill
> as *applied to `tat-dev` on 2026-07-28* (40 users, `001..040`, verified by re-reading the
> collection); the 2026-08-01 evidence says the `staffNumber` backfill is *unrun*. The
> reconciliation that fits both — **`userNumber` was backfilled, then the field was renamed in
> the 2026-07-28→31 backend drop, leaving the renamed field unpopulated** — is **(inferred)**
> and unverified. Settle it by reading the current `user.schema.ts` and the `counters`
> collection before trusting anything below.

## Context

Users needed a human-readable sequential identifier (`001`, `002`, …) alongside their ObjectId. The first implementation added a `userNumber` string to `User` and a `pre("save")` hook that derived the next value by scanning for the current maximum:

```ts
const maxUser = await UserModel.findOne({}).sort({ userNumber: -1 }).lean();
const nextNumber = maxUser?.userNumber ? parseInt(maxUser.userNumber, 10) + 1 : 1;
```

The question that opened this — *"it should be unique, but what about the old users' data?"* — turned out to have two answers, and the uniqueness half was the more serious one.

## Notes

### The max-scan produced duplicates three independent ways

Each of these is sufficient on its own; none would surface in single-user manual testing.

1. **Read-then-write race.** The scan and the assignment are not atomic. Two concurrent signups both read max `007` and both write `008`. Nothing at the database level rejected it, because there was no unique index.
2. **Soft-deleted users had their numbers reused.** `UserSchema` is built with `.add(BaseSchema)`, and Mongoose's `Schema.prototype.add` merges the source schema's `callQueue` — so the soft-delete plugin in `base.schema.ts` (which injects `deletedAt: null` into every `findOne`) applied to the scan. The highest-numbered user being soft-deleted made their number invisible, and the next signup took it.
3. **Permanent breakage at 1000 users.** `userNumber` is a `String`, so `sort({ userNumber: -1 })` is lexicographic. `"999"` sorts *above* `"1000"` (`'9' > '1'`), so once the collection passed 999 the scan would return `"999"` forever and every subsequent user would be assigned `"1000"`.

The third is the one worth remembering: it is silent, it is permanent, and it only triggers long after the code looks proven in production.

### The fix

**Allocation** is now an atomic `$inc` against a `counters` document (`_id: "userNumber"`), via the raw driver so no Mongoose middleware — including the soft-delete filter — participates. Single round trip, no collection sort, no race.

**Uniqueness** is enforced by the database, not by application code: a `userNumber_unique` index on `{ userNumber: 1 }`. It must be **partial** (`partialFilterExpression: { userNumber: { $type: "string" } }`) — a plain `unique: true` would read every pre-existing user as a duplicate `null` and fail to build.

**Write-once** is enforced by `immutable: true` on the `@Prop`. Mongoose strips the path from `updateOne` / `findOneAndUpdate` / admin edits, while still permitting the allocator to set it during `isNew`. The backfill migration is unaffected because it uses the raw driver.

### The field must never be client-settable

Mid-session the field had been added as an input on `AdminUserDTO` and `ExtSignUpDTO` and forwarded into `userModel.create()`. That silently defeats the whole design: the hook's guard is `!this.userNumber`, so any request supplying a value skips allocation entirely **and the counter never advances**. Worse, once the unique index is live, a client sending a taken value gets a raw `E11000` instead of a clean validation error — and `ExtSignUpDTO` is the *public* signup path. All three call sites were removed; `userNumber` now appears only in `user.schema.ts`.

The general rule: a server-allocated identifier that a caller can set is not server-allocated. See [[Patterns]].

### Old users

`pre("save")` never fires retroactively, and the `isNew` guard (correctly) stops an existing user from picking up a fresh number on their next password change. So the 40 pre-existing users would have sat at `undefined` indefinitely — a backfill was mandatory, not optional.

`scripts/migrations/2026-07-28-backfill-user-numbers.js` assigns in `createdAt` order via the raw driver (so soft-deleted users are included and keep their numbers reserved), seeds the counter with `$max` so a re-run can never walk it backwards into already-issued territory, repairs duplicates if the buggy version already ran anywhere, then builds the index. Dry run by default, `--apply` to write — matching the existing scripts in that folder.

**Deploy order matters:** run the migration *before* the new schema code takes traffic. The script allocates above whatever is already issued so it stays correct either way, but if the app boots first the oldest users end up numbered above the newest.

This worked out correctly here by accident of sequencing: `dev` is wired to the staging DB, and the `tat-development` cluster has exactly one application database, so the `tat-dev` backfill *was* the staging migration — and it ran before the commit was pushed. Do not read "dev" and "staging" as separate databases in this project.

### Verification state (as of 2026-07-28)

Verified:
- `tsc --noEmit` on `libs/schemas`: 365 errors, byte-identical to the pre-change baseline, **zero** in any touched file. (The 365 are pre-existing `strictPropertyInitialization` noise in `libs/dtos`.)
- `node --check` on the migration.
- Migration **dry run** against `tat-dev`: 40 users, 0 already numbered, 0 duplicates, would assign `001..040`.

**Migration applied to `tat-dev` 2026-07-28**, and the end state independently re-read afterwards rather than trusted from the script's own output:

| Check | Result |
|---|---|
| Users holding a number | 40 / 40 |
| Distinct numbers | 40 — no duplicates |
| `001..040` in `createdAt` order | true |
| `counters.userNumber.seq` | 40 → next signup allocates `041` |
| `userNumber_unique` | `{userNumber: 1}`, `unique: true`, partial on `$type: "string"` |

**Still not verified — the allocator has never executed.** The backfill was a raw-driver bulk write; it exercised none of the application path. The `$inc` allocation in `pre("save")`, the `immutable` stripping behaviour, and a real collision hitting the index are all still unexercised. Index *enforcement* was confirmed from the index spec, not by forcing a duplicate write. Per [[Gotchas]], this is exactly the shape of change where latent bugs surface in a burst the first time the path is actually walked.

### On using a package instead

`mongoose-sequence@6.0.1` (last release 2024-01-31, peer dep `mongoose >=5`) implements the same counter-plus-`$inc` mechanism. Not adopted: it stores a `Number` rather than the zero-padded string, and it addresses neither of the parts that carried the actual risk — the backfill and the partial unique index. Reconsider if the Staff Management subsystem starts numbering TORs and forms too; four hand-rolled counters is where a plugin wins. `mongoose-auto-increment` is effectively unmaintained.

## Action Items

- [x] **Migration applied to `tat-dev` (2026-07-28)** — 40 users hold `001..040` in signup order, counter at `40`, `userNumber_unique` in place. Verified by re-reading the collection, not from the script's output.
- [ ] **Allocator never exercised.** Create a user on `tat-dev` and confirm it receives `041` and that `counters.userNumber.seq` advanced to `41`. This is the real test — the backfill bypassed the application path entirely.
- [x] **Staging is covered — it is the same database.** The `dev` branch is wired to the staging DB, and the `tat-development` cluster holds exactly one application database (`tat-dev`; the others are `questionbank`, `admin`, `local`). So the backfill *was* the staging migration, and it landed **before** the schema code deploys — the correct order. An earlier version of this note claimed staging was unmigrated; that was wrong.
- [x] **No production environment exists yet** (Qusai, 2026-07-28) — `dev` is the only one. So the migration is complete everywhere it applies; there is no second environment pending. Whenever production is stood up, it will need the backfill run against it **before** the schema code reaches it, or its first users get numbered out of signup order.
- [ ] Confirm `immutable` actually strips the field: attempt to change `userNumber` through an admin update and verify it is silently ignored rather than applied.
- [ ] Decide whether the 3-wide pad is the long-term format. Past 999 the string simply widens to `"1000"` — correct, but no longer fixed-width for display.
- [ ] Nothing reads `userNumber` yet — it reaches responses via `IUser extends User` but no frontend surfaces it. Confirm with the BA where it should be displayed.

## Related

- [[tat-app-ws Backend]] — the repo this landed in
- [[TAT API & Auth Model]] — user creation and signup paths (`createSuperAdmin`, `ExtSignUpDTO`, `IntSignUpDTO`)
- [[TAT Platform]] — program context
- [[Patterns]] — the no-comments rule was violated and re-recorded during this work (third strike)
- [[Gotchas]] — latent bugs surfacing on first real traversal
- [[Systems Thinking]] — three independent failure modes in one naive implementation, none visible in manual testing
- [[Debugging & Root Cause Analysis]] — tracing the soft-delete interaction through `Schema.prototype.add` middleware merging
- [[Code Quality]] — moving the uniqueness guarantee from application code into a database constraint
