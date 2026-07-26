---
date: 2026-07-14
description: "How agents working in the TAT code repos hand work back to this vault — they emit a VAULT HANDOFF block, never write notes directly, because only the vault agent knows the link graph"
tags:
  - brain
---

# Agent Handoff Protocol

Agents running inside the TAT code repos ([[tat-prereq]], [[tat-app-ws Backend|tat-app-ws]], [[tat-portal]], [[tat-ws]], [[tat-website]]) **must not write notes into this vault.** They emit a **VAULT HANDOFF** block; Qusai pastes it into `/om-dump` here, and the vault agent files it.

## Why not let them write directly

Frontmatter is the easy part. The hard part is the **links**, and a coding agent cannot see them. [[TOR Activation - Details Endpoint Lied About ACTIVE]] wires into eight existing notes, including deep links to specific headings in [[Gotchas]] and [[Patterns]] — an agent in `tat-prereq` has no way to know those headings exist. It would produce a structurally valid orphan, and per [[CLAUDE.md]] *a note without links is a bug*.

The vault agent has the [[Skills|slash commands]], QMD semantic search, and the hooks. It knows what to link. Keep the judgment where the context is.

## The prompt (paste into each repo's `CLAUDE.md` / `AGENTS.md`)

```
When we finish a meaningful piece of work — a bug root-caused, a feature
shipped, a decision made, a trap discovered — do NOT write to my Obsidian
vault. Instead output a VAULT HANDOFF block, verbatim format:

## VAULT HANDOFF
**Title:** <short, states the finding — not the ticket number alone>
**Repo:** tat-prereq | tat-app-ws | tat-portal | tat-ws | tat-website
**Ticket:** TAT-### (or none)
**Type:** bug | feature | decision | gotcha | pattern
**What happened:** 2-4 sentences. Lead with the root cause, not the symptom.
**Evidence:** the log line, JSON payload, DB row, or test output that settled
it. Paste the real thing, do not paraphrase.
**Fix:** what changed + commit SHAs, per repo.
**Still open:** unchecked items, honestly — including anything you did NOT
verify end to end.
**Touches:** other tickets/subsystems this interacts with.

Rules: never claim something is verified if you only built or typechecked it.
If a fix is unexercised, say so in Still open.
```

## On this side of the handoff

Run `/om-dump <paste the block>`. The vault agent classifies it, applies the [[Work Note]] template, writes the canonical frontmatter (schema in [[CLAUDE.md]]), and QMD-searches for the notes it should link to.

**`Repo:` maps straight onto the `project:` frontmatter field** — that field is the repo, and `Work Dashboard.base` groups by it. That mapping is the whole reason the handoff block names a repo rather than a program.

## Why the block is shaped this way

Each field exists because its absence caused a real problem:

- **Lead with root cause, not symptom** — the symptom is usually a lie. The TOR "dates aren't showing" bug was never a display bug; the TOR had never activated.
- **Paste real evidence** — a paraphrased log is unverifiable six weeks later, at review time.
- **"Still open" must admit what wasn't exercised** — the recurring failure mode is calling something verified when it only compiled. See [[Gotchas]].

## Related

- [[Loom]] — the code→code sibling of this protocol; same refusal of shared context in favor of filesystem + git diffs, applied to coder stations instead of the vault
- [[Skills]] — the vault's commands, including `/om-dump`
- [[Patterns]] · [[Gotchas]] — where durable lessons from a handoff end up
- [[TAT Platform]] — the repos this protocol covers
- [[Index|Work Notes]]
