---
date: 2026-07-23
description: "Design note: spec gaps come in three kinds, each cheapest to catch at a different stage — traceability gaps automate, conventional omissions go to a grilling agent, contextual intent is human-only"
tags:
  - reference
  - project/tat
---

# Spec Gap Taxonomy & Grilling Agent

A **design-stage** process note for the [[TAT Delivery Orchestrator]]. The orchestrator writes **tests from the acceptance criteria, never from coder output** — which only works if the ACs are *complete* before decomposition. This note is how the ACs get complete: catching each kind of spec gap at the stage where it's cheapest to catch.

> [!warning] Design note
> Nothing built or measured. The gap-catch rate by stage is unknown (see Still open).

## The taxonomy — three kinds, three stages

**Pushing all three to end-stage QA is the most expensive place to find any of them.** Each kind has a natural catcher:

| Gap kind | What it is | Caught by |
|----------|-----------|-----------|
| **Traceability gap** | The spec says it, the code doesn't | **Automate** — every AC → ≥1 test → ≥1 code path |
| **Conventional omission** | A missing convention the spec forgot (no "forgot password", no undo) | **Grilling agent** |
| **Contextual intent** | The client-specific *why* behind a rule | **Human only** — *mined* by the grilling agent |

The grilling agent sits in the middle: it catches conventional omissions outright, and for contextual intent it can't answer — it can only surface the question and route it to the human.

## Grilling agent design

**Lenses, not vibes.** A grilling agent that just "looks for problems" produces noise. It needs fixed interrogation lenses:

1. **Collision** — where do two rules contradict each other?
2. **Order sensitivity** — does A-then-B differ from B-then-A?
3. **Exclusion** — what does "must update X" *exclude*? (what it silently doesn't touch)

**Ask before suggesting an answer.** If the agent proposes an answer with its question, the user **rubber-stamps the model's guess** instead of supplying real intent. The question comes first, naked; the answer comes from the human.

**Terminates in a written artifact.** A grilling session isn't done when the talking stops — it's done when the **resolved rules are appended as new ACs**. The output is spec, not a chat log. (Same shape as [[Agent Handoff Protocol]]: the session ends in a durable artifact, not shared context.)

**Stopping rule.** Only ask about ambiguities that would **change code or a test assertion**. An ambiguity that changes neither is not worth a question — this is what keeps the grilling bounded instead of infinite.

## Still open

- **Gap-catch rate by stage is unmeasured** — no data yet on how many gaps the grilling agent catches vs the traceability check vs human QA. Until measured, the stage-routing above is a hypothesis, not a validated allocation.

## Related

- [[TAT Delivery Orchestrator]] — this note supplies the *complete ACs* that the orchestrator's "tests from ACs" stage depends on
- [[Agent Handoff Protocol]] — same principle: a session ends in a written artifact, never in shared context
- [[Patterns#Route each spec-gap kind to the stage that catches it cheapest (2026-07-23)]]
- [[TAT Platform]] — the delivery this process feeds
