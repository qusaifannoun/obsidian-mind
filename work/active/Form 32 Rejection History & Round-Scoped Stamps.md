---
date: 2026-07-09
description: "Fix Form 32 rejection accumulation (round-scoped field stamps via clear-on-submit) and add a full per-item review timeline built on a unified reviewHistory event log"
tags:
  - work-note
status: active
quarter: Q3-2026
team: Backend
---

# Form 32 Rejection History & Round-Scoped Stamps

Plan from a `/grill-me` design session (2026-07-09). Two coupled changes: **(1)** stop field-level rejections accumulating across rounds, and **(2)** surface a **full per-item review timeline** (Form 32 currently has no history UI at all, unlike [[tat-prereq]]'s Form 285 / Initial Documents).

> [!success] Implemented + pushed to `dev` (2026-07-09)
> Backend [[tat-app-ws Backend]]: `63bce30a` (clear-on-submit + unified event log) → `8ad91259` (diff-snapshot fix, see below). Frontend [[tat-prereq]]: `fe78ce1` (per-item timeline) → `64ae543` (reviewer warning). All `nx run api:build` / tsc + eslint clean. Remaining: live E2E on staging once deployed.

## Two things surfaced during implementation

- **Reviewer-edits-discarded warning (`64ae543`).** `sendRejections()` calls `actions.reject(fields)` which sends *only* the rejected field ids/reasons — it does **not** call `save(buildBody())`. So a reviewer's edits to Name/Date/assessment/sections are silently dropped on reject; only Approve (which saves first) persists them. Added an amber warning in the review state. (Open: could make it dirty-aware, or add a standalone Save button — deferred.)
- **The diff was always empty — a shallow-copy mutation bug (`8ad91259`).** `computeForm32Changes(current, merged)` never detected an `edited`/`uploaded` event because `mergeSaveDto` does `const sections = { ...current.sections }` (shallow) then mutates `existing.fileKey = …` — mutating `current`'s nested objects in place, so `current` and `merged` end up equal. Fix: deep-clone `current` into a `before` snapshot *before* the merge and diff against that. Caught by Qusai testing a document replacement (rejection showed, the replace didn't). See [[Gotchas#Shallow spread shares nested refs — a before/after diff of a mutated object is always empty]].

## Problem (confirmed in code)

The BA reported: reject Section 1 → instructor fixes it → next round reject only Section 3 → the form returns to the owner with **2** rejected sections instead of 1. The first rejection never clears.

Root cause, traced in `staff-tor-form-32.service.ts`:

- `reject()` stamps `rejectionStatus: REJECTED` + `rejectionReason` onto `data.sections[fieldId]` and only touches the fields in *that* rejection — it never resets the others.
- Correcting a field (`mergeInstructorSave`) flips `REJECTED → CORRECTED` but **leaves the old `rejectionReason` string in place**.
- Neither `submit()` nor the next `reject()` clears it.
- The FE (`Form32Editor.tsx:223`) renders a section's note from `rejectionByLabel.get(title) ?? data.sections[id].rejectionReason` — **falling back to the stale per-field reason**, so a corrected section keeps showing "Rejected: \<old reason\>" forever.

`approve()` already resets everything via `clearFieldRejections()` — only the **reject / resubmit** paths fail to reset.

## Decisions (from the grill)

1. **Field stamp is current-round-only.** All multi-round history lives in `data.reviewHistory`, not as a permanent per-field stamp.
2. **Clear-on-submit (option B).** `submit()` wipes the per-field stamps as the form re-enters review; `reviewHistory` is preserved. This is the actual round boundary and keeps the form clean for both reviewer (mid-review) and owner (post-reject).
3. **Per-item expandable "History (N)"** UI, mirroring Form 285 / Initial Documents.
4. **Unified event log** in `data.reviewHistory` (schemaless `Mixed` → no DB migration). One entry shape for all event types; FE filters by `fieldId`.
5. **Events: `rejected`, `edited`, `uploaded`, `approved`.** `edited` is **diff-based** (real value changes only, no no-op saves). `edited` covers **all** edits (initial fill + every change), not just corrections.
6. **Expander shows on any item with ≥1 event** (initial "rejected-only" gate was overridden — history must include everything).
7. **Header fields** (Name / Date / Aircraft Category) get the same per-item history as sections.
8. **Approved is form-level** (items aren't individually approved) — shown as the terminal entry on each item's timeline.
9. **Assessment / sign-off block is out of scope** — represented by the `approved` event, no separate history.
10. **Historical data is partial** — corrections and uploader identity were never recorded, so timelines are complete only from this change forward.

## Data model

Evolve `Form32ReviewHistoryEntry` (`libs/database/src/lib/staff-management/form-32/form-32.types.ts:42`) — keep `reviewerId`/`reviewerName`/`reviewedAt` as the generic **actor + timestamp** (reused for every action):

```ts
action: "field_rejected" | "approved" | "edited" | "uploaded";
items?: Array<{ fieldId: string; fieldLabel: string; reason?: string; fileName?: string }>;
// legacy entries keep `rejectedSections`; FE reads items ?? rejectedSections
```

- **rejected** → `items` = rejected fields (+ `reason`); actor = reviewer
- **edited** → `items` = fields whose value actually changed (diff `current` vs `merged`); actor = editor
- **uploaded** → `items` = section (+ `fileName`, derived from the new fileKey); actor = uploader
- **approved** → `items = []` (form-level); actor = reviewer

Mirror the shape in `Form32ReviewHistoryEntryDTO` (`libs/dtos/src/lib/staff-management.dto.ts:~1042`). `toDTO` already returns the whole `data`, so no response wiring needed.

## Backend changes (`tat-app-ws`)

`libs/database/src/lib/staff-management/staff-tor-form-32.service.ts`:

- [ ] **`submit()`** — after `assertNoRejectedForm32Fields(data)`, call `this.clearFieldRejections(data)` (already resets `headerRejections` + every section's `rejectionStatus`/`rejectionReason` to null), then `form.data = data; form.markModified("data")`. This is the clear-on-submit fix. `reviewHistory` is untouched.
- [ ] **`reject()`** — write the appended `reviewHistory` entry in unified shape (`action: "field_rejected"`, `items` with reason). `rejectedEntries` already carries `fieldId/fieldLabel/reason`.
- [ ] **`saveDraft` (instructor + privileged)** — after merge, diff `current` vs `merged`:
  - append **`edited`** for each section/header field whose `selectedOptionId`/`notes` (or header value) changed;
  - append **`uploaded`** for each section that gained a new evidence `fileKey`.
  - The privileged path already appends `approved` (keep) — actor = the SA, so the timeline reads "SA edited · SA approved".
- [ ] **`approve()`** — align its existing `approved` append to the unified shape (`items: []`).
- [ ] Add a small **diff helper** (changed sections/header fields between `current` and `merged`) driving the `edited`/`uploaded` appends.

`form-32.types.ts` + `staff-management.dto.ts` — expand `action` enum + add `items`/`fileName`.

## Frontend changes (`tat-prereq`)

`src/types/form32.ts`:
- [ ] Add `reviewHistory` (with `action`, `items`, `actorName`/`reviewedAt`, `fileName`) to the Form 32 data type.
- [ ] Normalizer: legacy `field_rejected` + `rejectedSections` → unified `rejected` + `items`.

`src/components/forms/Form32Editor.tsx`:
- [ ] Per item (each section **and** header field): build a timeline = events whose `items` contain that `fieldId` **+ all form-level `approved` events**, sorted by `at` ascending (approval last).
- [ ] Render an expandable **"History (N)"** (N = timeline length), shown whenever N ≥ 1. Entry formats:
  - `Rejected · {date} · {actor} — {reason}`
  - `Edited · {date} · {actor}`
  - `Uploaded {fileName} · {date} · {actor}`
  - `Approved · {date} · {actor}`
- [ ] The **current** round's rejection still renders via the live stamp; after clear-on-submit the per-field `rejectionReason` only ever holds the current round, so the `Form32Editor.tsx:223` fallback stops surfacing stale reasons (the original bug is gone).

## Verification

- [ ] Multi-round repro: reject S1 → correct → resubmit → reject only S3 → owner sees **only S3** stamped; S1's expander shows its past rejection + correction.
- [ ] Timeline shows edits, uploads (with uploader), and the terminal form approval, each with actor + date.
- [ ] Diff-based `edited`: a no-op save creates **no** entry.
- [ ] `nx run api:build` + tsc/eslint clean; tat-prereq tsc/eslint clean.

## Out of scope

- Assessment / sign-off block history (represented by `approved`).
- Audit-log changes — the per-TOR audit sink stays; it can't scope per Form 32 instance (field events omit formKey/aircraftTypeId), which is why `reviewHistory` (per-instance, in `form.data`) is the home.
- Backfilling historical corrections / uploader identity.

## Related

- [[Form 32 PIC Bugs & Cross-Frontend Auth Fixes]] — prior Form 32 privileged-editor / auto-approve work (same `saveDraft` / merge surface)
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Staff Management Subsystem & TOR Model]] · [[TAT-409 Staff Management Subsystem]]
- [[Debugging & Root Cause Analysis]] · [[Systems Thinking]]
