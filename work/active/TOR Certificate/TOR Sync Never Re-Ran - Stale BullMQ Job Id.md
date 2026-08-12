---
date: 2026-08-12
description: "A fixed BullMQ jobId outliving its completed job meant every TOR re-sync was silently discarded for 24h — why 40 TORs across 18 staff showed 0 active"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# TOR Sync Never Re-Ran — Stale BullMQ Job Id

> [!success] Root cause of "no TOR has ever been activated" — [[tat-app-ws Backend]] `9896faa3`, pushed to `dev`
> Two lines. `tsc` exit 0. **Not verified** — needs a deploy plus a Redis flush. See [[#Still open]].

## Root cause

BullMQ ignores an `add()` whose `jobId` already exists in Redis **in any retained state, including completed**, and returns the existing job as though it succeeded. `addStandardJob-9.lua:89`:

```lua
jobIdKey = args[1] .. jobId
if rcall("EXISTS", jobIdKey) == 1 then
    return handleDuplicatedJob(...)   -- no job created, no execution
end
```

`handleDuplicatedJob` emits a `duplicated` event and `return jobId` — so the caller's `.then()` fires normally.

The queue used a fixed id per TOR alongside long retention:

```ts
removeOnComplete: { age: 24 * 3600, count: 1000 },   // key kept 24h after success
removeOnFail:     { age: 7 * 24 * 3600 },            // key kept 7 days after failure
jobId: `tor-sync-${torId}`,
```

**So the key outlived the job it belonged to.** One early sync ran while the TOR was still incomplete, persisted `draft`, and completed. Every approval afterwards — aircraft qualification, assessment, certificate — enqueued a job Redis threw away. The TOR was never re-evaluated.

**The drop was invisible and logged as success:** `add()` resolves with the existing job, so `.then((job) => logger.debug("Queued TOR sync job …"))` ran and `.catch` never did.

## Why it presented as a lying status badge

The TOR details endpoint mixes two sources (`staff-management.service.ts:1625`):

```ts
torStatus:   derivedStatus,           // computed live, this request
activatedAt: tor.activatedAt ?? null, // persisted — only the sync processor writes it
expiresAt:   tor.expiresAt  ?? null,  // persisted
```

Status flips to `Active` the instant the gates pass. Dates only appear once the writer runs. So the details page showed **Active with `—` Creation and Expiry dates**, while the TOR Matrix — which returns the persisted status — showed **0 active** for all 18 staff across 40 TORs. Same record, two screens, contradictory.

This is [[Gotchas - TOR & Staff Management#An "ACTIVE" record with null timestamps means the WRITE path never ran — check the writer, not the renderer (2026-07-12)|the 2026-07-12 gotcha]] recurring. That session's fix converged the *status rule* onto `resolveTorStatusFromGates`; it left the reader computing live while dates come from the writer, so any writer lag or failure still surfaces as Active-with-no-dates.

**It also retro-explains the 2026-07-12 diagnosis.** That note recorded *"46 `tor_sync_completed` rows (worker alive) + every TOR still draft ⇒ the writer never agreed."* The worker was alive and correct. Nothing was ever asking it again.

## Fix

```diff
-  removeOnComplete: { age: 24 * 3600, count: 1000 },
-  removeOnFail: { age: 7 * 24 * 3600 },
+  removeOnComplete: true,
+  removeOnFail: true,
```

The fixed `jobId` stays — collapsing duplicate syncs for one TOR is intended. What was wrong is retaining the key after the job settled. Removing it immediately frees the id for the next enqueue while still deduplicating jobs that are waiting or in flight.

Rejected alternatives: dropping the `jobId` loses dedupe and floods the queue; removing the job before each `add` races an in-flight sync.

## Still open

- [ ] **Not verified.** No Redis access, no local backend; staging ran the old code throughout. Diagnosis is grounded in the BullMQ source, not in a fixed run.
- [ ] **Stale keys survive the deploy.** Any TOR whose `tor-sync-<id>` key is still retained keeps being deduplicated until flushed or aged out. **Without a flush the fix will look like it didn't work** — the most likely way this gets misdiagnosed.
- [ ] **Residual race, not fixed.** A change landing while a sync is *active* is still deduplicated and lost until the next event. Seconds rather than a day; closing it needs a re-enqueue on completion when the TOR changed mid-run.
- [ ] **`scheduleRenewal` has the identical shape** — fixed `tor-renewal-${torId}`, same retention. Harmless at a two-year cadence, deliberately untouched. Same "two of three fixed reads as done" trap as the Form 32 lock.
- [ ] **The reader/writer split is still open.** A screen should not show a status nothing has committed. Either return the persisted status (with a "pending sync" hint when the derived answer differs), or have the reader trigger the write.

## Related

- [[Final TOR Certificate Never Available - Unfiltered Mandatory Templates]] — the adjacent display bug found on the way here; **not** the activation blocker
- [[Final TOR Certificate - Form 020 Alignment & Export]] — the same investigation's other output
- [[TAT-450 TOR Certificate FE - Read Path Only]] · [[TAT-455 Final TOR Certificate - SA Publish Gate]] — both unverifiable until a TOR actually activates
- [[Gotchas - Backend Services & Environment]] · [[Gotchas - TOR & Staff Management]] · [[Patterns - Architecture & Boundaries]]
- [[Staff Management Subsystem & TOR Model]] · [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Debugging & Root Cause Analysis]] — eliminated six activation gates against live staging, then read the queue's Lua source rather than trusting recalled library semantics
- [[Systems Thinking]] — the worker, the gates and the enqueue were each correct; the bug lived in a retention setting nobody associated with correctness
