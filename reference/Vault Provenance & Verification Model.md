---
date: 2026-07-23
description: "Design note: the vault's 'verified' marker is only a timestamp, not proof a fact still holds; proposes code-pointer + provenance fields and names the drift asymmetry the orchestrator DAG depends on"
tags:
  - reference
  - project/tat
---

# Vault Provenance & Verification Model

A **design-stage** note on how the vault stores *truth* — the state store the [[Loom]] reads when its dependency DAG decides a slice's prerequisites are satisfied. If the vault says DONE and it isn't, the DAG consumes a false satisfied dependency and builds on sand.

> [!warning] Proposal only
> The schema changes below are **not applied** — they are a proposed change to the frontmatter schema in `vault-manifest.json`. Nothing has been written to the manifest. Left as a proposal per propose-before-implement.

## The trap — "verified" is a timestamp, not a property

The vault's verified marker is **just a timestamp**. It records *when* someone checked, not that the fact is *still* true. A bullet marked verified three weeks ago is treated as true today even if the code moved underneath it.

Worse, a **consistency-based write gate filters noise, not falsehood.** A gate that admits writes which agree with what's already stored **rejects a correction exactly as readily as it rejects an error** — both disagree with the incumbent. Consistency is not truth; a confidently-wrong incumbent becomes self-protecting.

## Proposed schema fixes

Two additions to each verified bullet's provenance:

1. **A code pointer** — `file:line` / symbol / test name attached to the verified claim. Re-verification then becomes a **grep or a CI run**, not re-reasoning from scratch. A claim you can re-check mechanically is a claim that can *expire* when the pointer moves.
2. **A provenance field** — which model/harness wrote the bullet. Optional today, **required once multiple providers write back** (Claude Code, codex, Gemini all landing facts into one store). Without it, a first-pass-acceptance A/B by harness is impossible.

## The drift asymmetry — the two directions are not equally bad

Vault state drifts from reality in two directions, and they cost wildly differently:

- **Dangerous: vault says DONE when it isn't.** The orchestrator's [[Loom|dependency DAG]] consumes a **false satisfied dependency** and proceeds — the failure propagates downstream and surfaces far from its cause.
- **Cheap: vault says NOT DONE when it is.** The agent just **redoes work that was already finished.** Wasted cycles, no corruption.

So the verification model should be **asymmetric**: bias every doubt toward NOT-DONE. A stale "unverified" is a redo; a stale "verified" is a landmine. Same spirit as [[Agent Handoff Protocol]]'s rule — *never claim verified if you only built or typechecked it* — and the recurring "unexercised fixes go under Still open" discipline.

## Still open — verified-ratio metrics, all uncounted and scriptable from the git repo

None of these are measured yet; all are computable from the git history:

1. **Global verified ratio** — felt ~80%, never counted.
2. **Verified ratio of the context actually loaded per task** — not the whole vault, the slice a task pulls in.
3. **Is the needs-verification queue growing or shrinking** — the trend, not the snapshot.
4. **First-pass acceptance rate by model/harness** — the A/B that **justifies or kills multi-harness routing** (needs the provenance field above).
5. **Routing accuracy of vault-based repo inference — and is failure loud** — when the vault guesses the wrong repo for a task, does it fail visibly or silently?

## Related

- [[Loom]] — the DAG that consumes vault state; a false "satisfied dependency" is the dangerous drift direction above
- [[Spec Gap Taxonomy & Grilling Agent]] — sibling design note; grilling produces ACs, this governs whether the vault's record of them stays true
- [[Agent Handoff Protocol]] — the handoff rule this generalizes: verified must mean exercised, not built
- [[Gotchas#"Verified" is a timestamp, not proof the fact still holds — and a consistency gate rejects corrections as readily as errors (2026-07-23)]]
- [[Patterns#Vault-state drift is asymmetric — bias every doubt toward NOT-DONE (2026-07-23)]]
