---
date: 2026-08-01
description: "Receipt for the 2026-08-01 /om-tidy pass — Patterns split into four domain notes, Q3 brag July archive, History Form cluster grouped, 32 deep links retargeted"
tags:
  - thinking
---

# 2026-08-01 — Tidy Report

Receipt for the `/om-tidy` pass. Delete once the deferred items below are resolved.

## Actions taken

### 1. Completed-not-archived — nothing to do

No `status: completed` notes in `work/active/`. Flag was already clean.

### 2. Oversized: [[Patterns]] 46KB → split into four domain notes

Mirrors the [[Gotchas]] precedent (split 2026-07-28). All 31 sections moved **verbatim by line range**, not retyped.

| New note | Sections | Size |
|---|---|---|
| [[Patterns - Method & Conventions]] | 8 | 11KB |
| [[Patterns - Architecture & Boundaries]] | 4 | 6.6KB |
| [[Patterns - Frontend & UI]] | 13 | 16KB |
| [[Patterns - Backend & Domain]] | 6 | 15KB |
| [[Patterns]] (now an index) | — | 6.9KB |

**Verified zero loss:** all 31 original section bodies present verbatim in exactly one domain note — 0 lost, 0 duplicated, checked against `HEAD:brain/Patterns.md`.

### 3. Oversized: [[Q3 2026]] 42KB → July archived

`## Impact & Deliverables` was 32KB of the 42KB (19 fat entries, all dated 2026-07-05 → 07-30). Moved verbatim to [[Q3 2026 Archive — July]]; the live note keeps a one-liner index + link and drops to 13KB.

> [!note] Why an Archive note and not an event-log satellite
> First attempt named it `Q3 2026 — July Impact Log`. At 33KB that **re-triggers the same 25KB flag** — event-log satellites are not hygiene-exempt. July is a *closed* window and bulk is the note's job, which is the template's documented **Archive note** type (`<Live Name> Archive[ — <window>]`, exempt by design). Renamed before shipping.

August entries accumulate in [[Q3 2026]]; archive September-style at the next month boundary.

### 4. Cluster grouping — one acted, rest deferred

Created `work/active/History Form/` and `git mv`'d 4 notes in: Export History Form - TAT Form 031 PDF, History Form - Training & Validity Records, History Form Buttons Unified - InlineAction Primitive, History Form Online Course Deep-Links. Unambiguous — all four are literally TAT Form 031.

> [!warning] The "form" cluster is a name collision, not a workstream
> **"Form 32" and "TAT Form 032" are different artifacts.** Evidence:
> - [[Pending Review Requests - Reviewer Worklist]] lists them as separate row types: `"Form 32A — Theoretical Instructor", "285 Form", "Assessment Report"`
> - [[Gotchas - TOR & Staff Management]]: "The Assessment Report is **NOT** a TOR form"
> - [[Patterns - Backend & Domain]] enumerates "Form 031, Form 032, **and the pre-existing Form 32**" as distinct
>
> Grouping the hook's "form" cluster would have merged two domain objects on a filename match. Deferred — see below.

### 5. Link integrity

- **32 `[[Patterns#…]]` deep links retargeted** across 23 files to their new domain notes. Residual: 0. All 63 resulting anchors verified to resolve against real `##` headings.
- **`[[TAT-429]]` was broken in 2 files** (pre-existing, not caused by this pass) — retargeted to `[[TAT-429 Sit-In Eligibility & Move Semantics|TAT-429]]`, matching the alias form already used elsewhere.
- All 5 new notes have inbound links (5–11 files each). No orphans.

### 6. Index + semantic-linking pass

- [[Memories]] — registered the four Patterns domain notes under the [[Patterns]] entry, mirroring the Gotchas block.
- [[Brag Doc]] — Q3 row now points at [[Q3 2026 Archive — July]].
- QMD-confirmed missing edges added: [[Patterns - Backend & Domain]] → [[Staff Management Subsystem & TOR Model]] · [[tat-app-ws Backend]] · [[TAT API & Auth Model]]; [[Patterns - Architecture & Boundaries]] → [[TAT Platform]] · [[TAT API & Auth Model]].
- `work/Index.md` needed no edit — it links the moved notes by name, and wikilinks resolve across folders.

### 7. Fixed the permanently-stuck meetings-inbox flag (hook code)

`findInboxPressure` walked every `.md` in `work/meetings/` with no exclusion for the folder's own scaffolding README. The inbox is empty, but the README is 59 days old — so the flag fired every session and **could never clear**, no matter how often `/om-intake` ran.

Added `isInboxScaffolding()` in `.claude/scripts/lib/active-hygiene.ts`, mirroring the local `isMonolithExempt()` idiom, and skipped those files in the walk. Deliberately **not** reused `shouldSkipFile()` from `lib/frontmatter.ts`: that is the validate-write skip list (templates/, thinking/, …), so coupling the hygiene scan to it would let a future validation change silently alter hygiene behaviour — same shape, different concept.

Two regression tests added (`tests/active-hygiene.test.ts`), both on isolated temp dirs since the fixture root is shared via `before()`, not `beforeEach()`:
- a drained inbox holding only an aged README reports `null`
- a real export still counts, and the README does not inflate `oldestDays`

**Verified:** 21/21 active-hygiene tests pass; the flag is gone from both the live `stop-checklist` scan and `tidy-fix --dry-run`; `work/meetings/README.md` is untouched.

## Flags cleared

- ✅ 25KB oversize (both notes) — confirmed gone from the re-run hygiene scan
- ✅ "history" cluster — dropped from 6 notes to 2 coincidental ones
- ✅ Broken `[[TAT-429]]` links
- ✅ Meetings-inbox false positive — root-caused and fixed in the hook code

## Pre-existing, not from this pass

`tests/vault-wikilinks.test.ts` (ratchet gate, `allowedBroken: 0`) fails on `[[Dania]]` in `work/archive/2026/Refresher Date Override…`. **Verified pre-existing** by running the gate in a clean worktree at `HEAD` — it fails there identically, on a file this pass never touched. This pass introduced zero net-new broken links. Clearing it needs a person note for Dania or an alias on an existing one — see deferred item 3.

## Deferred — judgment calls, not executed

1. **The "form" / Form 32 cluster.** Needs the Form 32 vs TAT Form 032 distinction settled before a folder encodes it. Candidate true-Form-32 set: Form 32 Approved Lock, Form 32 Field Sizing, Form 32 Rejection History, Instructor Type - Per-Authority Form 32 Split — explicitly **excluding** Export Assessment Report - TAT Form 032 PDF and TAT-423 Assessment Report Rubric.
2. **12 remaining hook clusters** ("staff", "assessment", "backend", "instructor", "aircraft", "approval", "course", "forms", "management", "open", "prereq", "profile") read as token coincidence. Note that ~25 of 30 loose notes are TAT-409 work, so a "staff management" folder would swallow the folder and organize nothing.
3. **`[[Dania]]` has no person note** (`org/people/` is empty vault-wide). Not created — inventing a role/team would violate the mark-inference law.
4. **Recency signal disturbed.** The link retarget rewrote 19 notes whose *only* change is the `[[Patterns#…]]` migration, bumping their real mtime to 2026-08-01. [[Recently Touched.base]] will show them as freshly touched when no work happened on them. mtimes were **not** faked back — this vault treats real mtime as provenance ([[Vault Provenance & Verification Model]]), and writing false timestamps to flatter a Base is worse than the noise.

## Open loops (report only — 21 notes, 98 items)

Oldest first; staleness as of 2026-08-01. Ages for the 19 retargeted notes are understated per the note above.

| Stale | Open | Note |
|---|---|---|
| 18d | 11 | TAT Portal Onboarding |
| 18d | 5 | Online-Course Exam Timeout - Backend Bug |
| 18d | 4 | TAT-434 Email Verification |
| 18d | 2 | TAT-436 Refresher Certificate Publish |
| 17d | 2 | Course Purchase Important-Notes Acknowledgment Gate |
| 4d | 14 | Form 32 Rejection History & Round-Scoped Stamps |
| 4d | 5 | TAT-423 Assessment Report Rubric · TAT-429 Sit-In Eligibility |
| 4d | 3–4 | TAT-432 Staff Profile · Sequential User Number · Stale Sit-In Index · Staff Creation Blocked |
| 1d | 7 | Staff Management - Unreachable Backend Endpoints |

The dominant shape is **verification debt, not unbuilt features** — consistent with [[North Star]]'s "the real risk now is verification, not build."

## Competency evidence freshness — all healthy

No thin competencies. Inbound links from notes modified this half (H2 2026):

| Competency | Inbound | Fresh (H2) |
|---|---|---|
| [[Systems Thinking]] | 21 | 20 |
| [[Code Quality]] | 18 | 17 |
| [[Debugging & Root Cause Analysis]] | 17 | 16 |
| [[Delivery & Scope Management]] | 8 | 8 |

## Related

- [[Patterns]] · [[Gotchas]] · [[Q3 2026]] · [[Brag Doc]] · [[Skills]]
