---
date: 2026-06-04
description: "Architectural and workflow decisions worth recalling across sessions — each links to its source work note"
tags:
  - brain
---

# Key Decisions

Architectural or workflow decisions worth recalling. Link to the full [[Decision Record]] when one exists.

## 2026-08-02 — The Form 32 fail-open stays open until QA flags it

The `requestedRoleCodes` fail-open ([[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]]) is **deliberately left in place**. Qusai's call: ship a fix or hand it to Dawahreh once QA raises it. Rationale — the dev DB is being cleared, and on fresh data every TOR populates `requestedRoleCodes` at creation, so the symptom disappears without code. **The recommendation Qusai declined** was to close it *during* the clear, the only window where doing so costs nothing (closing it beforehand strips all four forms from every legacy TOR). The cost of deferring: after the clear the symptom vanishes on its own and the guard *looks* correct, so nothing prompts a revisit until production data reintroduces the empty case — with real users, on a Part-147 compliance surface where the failure direction is *showing forms someone isn't authorised to hold*. **The trap for whoever eventually takes it:** `FORM_32_ROLE_BY_KEY` includes `TOR_CERTIFICATE`, so closing the gate also hides the Final TOR Certificate — guard at write first, then flip the pinning spec. See [[Gotchas - Forms & Approval#~~Form 32 forms are license-scoped, not role-scoped — shows all 4 A-B-C-D~~ — the gate exists and fails open on legacy data (2026-07-05 → corrected 2026-08-01)]].

## 2026-08-02 — QM approval does NOT release the Final TOR Certificate; TAT-450 AC-45 is superseded by TAT-455

Two **approved** ACs required opposite behaviour: TAT-450 AC-45 says approval must *"make the finalized certificate available to the instructor"*, TAT-455 AC-02/AC-03 say it must remain unpublished and inaccessible until a **Super Admin** publishes it. They are irreconcilable — AC-45 would delete the publish gate entirely. **Qusai asked the BA (2026-08-02): TAT-455 is correct, AC-45 is the wrong one.** The shipped code already followed TAT-455, so **no code change results** — this corrects the written spec only. **Not yet edited in Jira**, and until it is, QA testing TAT-450 literally will file a false defect. Second recorded instance of contradicting approved tickets after TAT-424 ↔ TAT-429 — see [[Patterns - Method & Conventions#An "Approved" stamp is not a consistency check — approved tickets contradict each other (2026-08-02)]]. Full record: [[TAT-450 AC-45 Superseded by TAT-455 - Certificate Not Auto-Released]].

## 2026-07-23 — Multi-agent delivery is an assembly line: parallel vertical slices, not role specialization

The only surviving rationale for a multi-agent delivery pipeline is **throughput via parallelism** — running vertical slices at different pipeline stations at once. **Role specialization was rejected** (a discipline-split agent was not shown to beat one well-prompted agent). Because agents are **stateless**, the whole problem reduces to what's in each agent's context window at run time: [[Loom|Claude Code is the control plane]], `codex exec` is a coder station. Load-bearing constraints Qusai fixed: **worktree+branch per task · merge-on-green one slice at a time · the branch's own coder resolves conflicts (not the manager) · dependencies are a DAG topologically sorted, never runtime judgment · tests written from the ACs, never from coder output · handoff via filesystem + git diffs, never shared context.** Design-stage — nothing built; first action is Slice 0, the pure refresher-date resolver. Full record: [[Loom]].

## 2026-07-16 — A privileged approver can approve an Assessment from any pre-approval state

To let a Super Admin operate the Assessment TM section without waiting for the two-role flow, the backend `approve()` was relaxed to reject only when already `APPROVED` (it stays `assertApprover`-gated). **Implication Qusai accepted:** a privileged SA/TM can now approve an assessment straight from `assigned`/`draft` — i.e. **without the assessor filling the rubric or signing**. The sequential *"instructor fills & submits → TM approves"* flow is bypassable by a privileged user. Open guardrail question (require rubric filled first?) is flagged, not decided. Full record: [[Assessment Privileged Approval - TM Section While Assigned]].

## 2026-07-16 — "Row actions = kebab only" is now a default, not a hard rule

Qusai asked to replace the kebab (⋮) with **inline [[History Form Buttons Unified - InlineAction Primitive|InlineAction]] buttons** on the Initial-TOR-Documents list. The 2026-06-04 kebab-only rule still stands as the default, but **inline tone-coded buttons are an accepted alternative when he explicitly asks per surface** — don't auto-convert either way. See [[Patterns - Frontend & UI#Table row actions = kebab menu only]].

## 2026-07-15 — Purchase-terms acknowledgment is a nudge, not provable consent

The [[tat-portal]] course-detail *Important Notes* (auto-close forfeiture, exam-retake fees, 3-day refund — all material money terms) now require a checkbox acknowledgment before Add-to-Cart/Enroll. **Qusai scoped it deliberately as a UX nudge, not provable consent — frontend-only, no backend.** Nothing is recorded server-side and the gate is bypassable by a direct `POST` to cart-add/checkout. Rationale: keep scope small; the modal's job is to make a buyer *see* the terms, not to produce a legal record. **Revisit trigger:** if consent ever needs to be *provable*, add a thin per-order acknowledgment on the backend. Full record: [[Course Purchase Important-Notes Acknowledgment Gate]].

## 2026-07-14 — Shared components beat per-document fidelity, even on official forms

Form 32 renders as the official **TAT FORM 032-A** and had a bespoke compact **38px** field style (`docInput`) to look like the paper document; the shared `RHFInput` fields are **44px**. Offered the choice between adding a `size="compact"` variant across the shared library (exact document fidelity, a size axis maintained forever) or letting the document take standard sizes, **Qusai chose standard sizes** — fewer moving parts, internally consistent with the app, at the cost of a chunkier-looking 032-A.

The tell was in the code: `ControlledDatePicker` carried a comment whose only purpose was keeping the bespoke style *manually in sync* with the shared one — the same drift trap as [[Patterns - Architecture & Boundaries#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]].

**Precedent for every document-style form** ([[tat-prereq]] Form 285, TAT Form 031). Caveat: nobody has yet judged the visual result against the paper form. Full record: [[Form 32 Field Sizing - Shared Components Over Document Fidelity]].

## 2026-06-04 — tat-portal is the canonical design/theme reference for all TAT frontends

Consistency across the [[TAT Platform]] frontends beats per-repo Figma fidelity. Qusai has authority to make minimal design changes to keep platforms consistent, so **[[tat-portal]]'s theme is the source of truth**: shared `globals.css` (brand palette `brand-500 #285ea8` / `brand-950 #101828`, type scale, shadows, sidebar utilities), **Geist** font config, and the **real TAT logo assets** (`logo-white.svg`, `logo.svg`, `grid-01.svg`). [[tat-prereq]] now copies these verbatim (auth panel + sidebar use the real logo + GridShape, not placeholder icons). New TAT frontends should copy portal's theme rather than re-deriving from Figma; design tweaks land in portal first, then propagate.

## 2026-06-04 — Staff Management subsystem is a new repo, mirroring tat-portal

[[TAT-409 Staff Management Subsystem|TAT-409]] ships as a **new dedicated repo [[tat-prereq]]** (not a section of [[tat-ws]]), structured by **copying [[tat-portal]]'s conventions** — same stack (Next 16 / React 19 / Tailwind v4 / shadcn / RTK / RQ / RHF+Zod), same infra layer (axios DI, `lib/env`, store, middleware), same TAT theme tokens, same "always remember" rules. Rationale: the ticket calls for a "separate subdomain" with cross-subsystem SSO, and tat-portal is the best-documented, most modern TAT frontend to clone. Keeps the two frontends feeling identical to work in. Scaffold verified green 2026-06-04.
