---
date: 2026-11-03
description: "The work decisions table, moved verbatim out of the Work Index when it crossed 25KB — every decision record with its date and outcome"
tags:
  - index
  - moc
---

# Index - Decisions Log

Split out of [[Index|Work Index]] on 2026-11-03, when it reached 32KB. Moved verbatim. **Add new decisions here.** Significant ones also go in [[Key Decisions]].

| Date | Decision | Status | Link |
|------|----------|--------|------|
| 2026-11-01 | **Per-authority Form 020 values (approval reference, title, footer) live in one table in code**, not on the License record | accepted | [[Final TOR Certificate QA Batch - Nov 2026]] · [[Key Decisions#2026-11-01 — Per-authority Form 020 values live in code, not on the License]] |
| 2026-11-01 | **TAT-543 means finding users by role, not widening what the requester may do.** Permission change reverted; the 2026-10-15 active-role gating stands | accepted | [[TAT-543 Secondary Roles Count Everywhere]] · [[Key Decisions#2026-11-01 — TAT-543 is about finding users by role, not about what the requester may do]] |
| 2026-10-01 | **New forms that output an editable Word document fill a `.docx` template with docxtemplater**, not HTML converted server-side. The form sends values, the template is a plain Word file anyone can edit. Locked compliance PDFs stay on the Puppeteer pipeline. Open: where rendering runs in production, and template storage that survives the upload endpoint's PDF conversion | accepted | [[Decision - Word Templates for Generated Documents]] |
| 2026-09-20 | **The refresh token is the session boundary; cookies outrank client-side stores.** An expired access token is renewable state, not signed-out — gating on it logs people out mid-session. Cookies are authoritative over `localforage` (only cookies reach server middleware). Rotation **retires** the presented refresh token with a **30s grace window** rather than deleting it, because a hard delete logs out the loser of a two-tab race. Accepted cost: a stolen refresh token stays usable ~30s after the victim refreshes — against the previous state of infinite validity. Trap for the fixer: don't re-add a module-level token cache, it cannot see a server-side rotation | accepted | [[Decision - Refresh Token as the Session Boundary]] |
| 2026-08-19 | **tat-ws auth tokens stay JS-readable** — dropped the lone `httpOnly` the middleware stamped on the refresh path rather than moving all ~20 cookie writes server-side. That inconsistency, not the posture, was the bug: the cookie became undeletable by `clearAllTokens()`, so logout silently failed for refreshed sessions. Accepted cost: tokens remain XSS-readable. Trap for the fixer — re-adding `httpOnly` to that line reintroduces the bug; the fix is moving every write server-side together | accepted | [[tat-ws Sign-Out 404]] |
| 2026-08-02 | **QM approval does not release the Final TOR Certificate.** TAT-450 AC-45 (*"make the finalized certificate available to the instructor"*) contradicts TAT-455 AC-02/AC-03 (unpublished until a Super Admin publishes). BA ruled **TAT-455 correct, AC-45 wrong**. Spec-only correction — the code already followed TAT-455. **Not yet edited in Jira**, so QA testing TAT-450 literally will file a false defect | accepted | [[TAT-450 AC-45 Superseded by TAT-455 - Certificate Not Auto-Released]] |
| 2026-08-02 | **The Form 32 `requestedRoleCodes` fail-open stays open** until QA flags it, then fix or hand to Dawahreh. The dev-DB clear makes the symptom vanish on fresh data. Declined: closing it *during* the clear, the only zero-cost window — so nothing will prompt a revisit until production data reintroduces the empty case. Trap for the fixer: the gate also covers `TOR_CERTIFICATE` | accepted | [[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]] |
| 2026-07-23 | Multi-agent delivery pipeline is an **assembly line, not an org chart** — parallelism for throughput, not role specialization. Worktree+branch per slice, merge-on-green one at a time, tests from ACs not coder output, handoff via filesystem+diffs. Design-stage; first action is Slice 0 (the resolver) | proposed | [[Loom]] |
| 2026-07-19 | Don't make the 2y mandatory-training period configurable — add **one** SA-only absolute-date override that replaces the computed refresher date at two scopes (per-instructor slot + course fleet stamp). Last-write-wins; a real completion wipes it; SA-only on every platform | accepted | [[Refresher Date Override - SA-Only Absolute-Date Override]] |
| 2026-07-15 | Course-purchase Important-Notes acknowledgment is a frontend **UX nudge, not provable consent** — no backend, deliberately bypassable. Revisit with a per-order acknowledgment only if consent must become provable | accepted | [[Course Purchase Important-Notes Acknowledgment Gate]] |
| 2026-07-14 | Form 32 drops its bespoke 38px document styling for the shared 44px fields — shared-component consistency beats per-document fidelity. Precedent for Form 285 / TAT Form 031 | accepted | [[Form 32 Field Sizing - Shared Components Over Document Fidelity]] |

