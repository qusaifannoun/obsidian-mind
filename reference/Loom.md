---
date: 2026-07-23
description: "Loom — a portable, agent-agnostic delivery pipeline routing vertical slices to coder stations in isolated git worktrees, test-gated and merge-on-green. Extracted 2026-07-30 to Black-Lotus98/loom and shipped as a Claude Code plugin"
tags:
  - reference
  - project/tat
aliases:
  - Delivery Orchestrator
  - Orchestrator
---

# Loom

**Loom** is a portable, **agent-agnostic** delivery pipeline for driving code changes across a repo with multiple coding agents. It isn't tied to any one project — the same setup runs across repos; [[TAT Platform]] is its first instantiation. The repos it operates on are *stations*. The name is the weave: parallel worktree threads woven back into one `main`.

> [!success] Harness built & proven (2026-07-23), extracted and shipped as a plugin (2026-07-30)
> The delivery loop runs **end to end** — worktree → station → test-gate → merge-on-green, dry-run by default. Agent-agnosticism is real: stations are command templates in `stations.config.json`, so codex / claude / gemini / aider are config lines, not code. What remains design-stage is **Slice 0**, the first real *product* slice (the refresher-date resolver), still blocked on two open ACs — see the Slice 0 open questions below.

## Where Loom lives (as of 2026-07-30)

**Its own repo: `Black-Lotus98/loom`** — no longer `scripts/loom/` in this vault. It was extracted because a tool that only exists inside a personal vault can't be handed to anyone, and keeping a second copy would have forked it.

The repo is both a plugin and a plugin marketplace, so it installs through Claude Code's own machinery:

```
/plugin marketplace add Black-Lotus98/loom
/plugin install loom@qusaifannoun
```

The slash command is now **`/loom:delegate`** (plugin skills are namespaced), and `loom` / `loom-run` land on `PATH` via the plugin's `bin/` while it's enabled.

**Per-project scoping is the install scope**, not a Loom feature: *User* = every project, *Project* = everyone on this repo (committed `.claude/settings.json`), *Local* = you on this repo only. A repo can advertise Loom to whoever clones it via `extraKnownMarketplaces` + `enabledPlugins`.

**Per-project behavior** is a separate axis — a config chain where shipped defaults are always the base and each layer overrides the last: `<plugin>` → `~/.claude/loom/` → `./.loom/stations.config.json` → `--config`. Stations merge key by key, so a repo opts in with just `{"defaultStation": "claude"}`.

> [!bug] `--merge` reported success while merging nothing (found 2026-07-30)
> `stageAll()` staged the station's work inside the worktree but **nothing ever committed it**, so `loom/<id>` still pointed at the base commit. `git merge` answered "Already up to date", exited 0, and the report printed `merged: yes` while the base branch never moved and the file never appeared. The bug survived from the original build because **dry-run is the default, so the merge path had never once been driven** — the same class of trap as [[Gotchas - Tooling & Method#Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)]]. Fixed: slices commit in their worktree before the gate, and `--merge` now verifies `HEAD` actually advanced, reporting a no-op as a no-op.

## The core rationale

**The surviving reason for multi-agent is throughput via parallelism**, not role specialization. Running vertical slices at different pipeline stations simultaneously buys wall-clock; splitting agents by *discipline* (a "frontend agent", a "test agent") was **not** shown to beat one well-prompted agent, so it was dropped.

- **It's an assembly line, not an org chart.** Agents are stations that work passes through, not roles that own a domain.
- **Agents are stateless**, so the hard problem is entirely **what's in each agent's context window when it runs** — not who the agent "is". Get the context-window contents right and the same agent does any station's work.
- **Claude Code = the control plane.** `codex exec` = a station (a coder invocation).

## Decision table (verbatim, 2026-07-23)

| Concern | Decision |
|---------|----------|
| Isolation | **worktree + branch per task** |
| Merge | **merge-on-green, one slice at a time** — never big-bang |
| Conflicts | resolved by **the branch's own coder** at merge time, **not the manager** |
| Manager scope | **router + merge-order only** |
| Dependencies | a **DAG declared at decomposition**, resolved by **topological sort — not runtime judgment** |
| Slicing | **vertical**, never by discipline |
| Tests | written **from the ACs, never from coder output** |
| Handoff | via **filesystem + git diffs**, not shared context |
| Model downgrade | **manual only**, and only where an existing check already catches that model's failure mode |

The two load-bearing constraints: **tests come from acceptance criteria, not from what the coder produced** (else the test just ratifies the bug), and **handoff is filesystem + diffs, never shared context** — the same principle as [[Agent Handoff Protocol]], where a coding agent hands back a diff-and-report block rather than writing into a graph it can't see.

Tests-from-ACs only holds if the ACs are *complete* before decomposition. Making them complete — catching each kind of spec gap at the stage that catches it cheapest — is the upstream job of the [[Spec Gap Taxonomy & Grilling Agent|grilling agent and gap taxonomy]].

## Delegation loop v1

```bash
git worktree add ../wt-<slice> -b feat/<slice>
cd ../wt-<slice> && codex -a never -s workspace-write exec "$(cat plan.md)" -o report.md
# control plane reads: git diff main, report.md, test results; on green: rebase + merge
```

> [!bug] `codex exec` is read-only by default — and fails blocked ops *silently*
> `codex exec` runs **read-only** unless `-s workspace-write` is passed, so the write flag is mandatory for a coder station. With `-a never`, a blocked operation **fails silently back to the model** rather than prompting — the model may report success it didn't achieve. **Read `report.md` skeptically**, and trust the `git diff` + test results over the coder's own account. This is the same failure mode [[Agent Handoff Protocol]] guards against: "never claim something is verified if you only built or typechecked it."

## First live slice — delivered 2026-07-30

The loop has now run end to end with a **real coder station**, not the deterministic `sim` one: [[Instructor Type - Per-Authority Form 32 Split|the TAT-451 instructor-type resolver]] in [[tat-prereq]], delivered by `codex` 0.145.0. Two files, 26 insertions, GREEN, re-verified independently (6/6 AC tests, `tsc` clean, `eslint` clean). Dry-run — nothing merged.

**What it proved beyond "it runs":** the station read the repo's own `AGENTS.md` first and adopted the existing idiom rather than inventing one, and the tests-from-ACs constraint held in practice — the gate's tests were written from the ticket before the station ran and injected at gate time, so they could not ratify the coder's choices.

> [!danger] The station could not verify its own work — a fresh worktree has no `node_modules`
> codex followed `AGENTS.md`'s "run lint and build before you finish" and got `sh: next: command not found`, exit 127. It wrote the code blind. It was correct **by luck, not by verification**; a larger slice would have returned subtly wrong with the same GREEN. A test gate does not cover this — the gate runs *after* the station is done, so it catches a bad result but never gives the agent its feedback loop. Fixed in **Loom v1.1.0** by a `setup` command that runs in the worktree before the station, declared once per repo in `.loom/stations.config.json`. Full entry: [[Gotchas - Tooling & Method#A git worktree has no `node_modules`, so a delegated agent writes code it cannot verify (2026-07-30)]].

## The originally-planned Slice 0 — still blocked

Slice 0 was to be the **refresher-date resolver**: a pure function `(instructor, course) → effective refresher date`, plus override storage and an audit-log schema. **No UI.** It remains blocked on the two open ACs below, so TAT-451 took its place as the first real slice — same pure-resolver shape, no unresolved spec.

This grounds Loom in real TAT work: the refresher-date rule already shipped once by hand — see [[Refresher Date Override - SA-Only Absolute-Date Override]] — and its "compute the rule once, server-side" shape is exactly the kind of pure, testable slice the pipeline wants first.

> [!warning] Slice 0 is blocked on unresolved ACs (2026-07-23)
> Rebuilding the resolver *from ACs, not the shipped code* immediately hit precedence/lifecycle questions the Override ACs never state — full history in [[Refresher Date Override - SA-Only Absolute-Date Override#Open spec questions — block the Slice 0 resolver (2026-07-23)]] (now archived). This is the pipeline working as designed: the [[Spec Gap Taxonomy & Grilling Agent|grilling stage]] must clear these before any coder station touches Slice 0. The shipped code picked answers, but "tests from ACs, never from coder output" forbids reading them off it.

### Slice 0 open questions (inherited from the archived Override note)

The by-hand feature shipped and is verified on staging, but two spec gaps belong to the *resolver*, not the shipped UI, so they outlive the archive:

1. **Precedence ordering is unwritten** *(collision lens)*. No AC states a full read-time ordering across the three date sources — **calculated / per-instructor / course-level**. The grill decided "accomplished rows override, not-yet-accomplished stay computed" and "fleet stamp clobbers per-instructor (last-write-wins)", but a complete ordering is only partially implied, never written. **Needs a product decision.**
4. **No revert path** *(exclusion lens)*. Nothing — no AC, no grill decision, nothing in the shipped contract — describes how to **un-override back to the calculated date**. Genuinely unspecified; this is the real gap. **Needs a product decision.**

(#2 instructor-after-course and #3 completion-wipes are already **decided** — last-write-wins and completion-clears-the-audit-fields respectively — they just need promoting to written ACs, not a new decision.)

## Related

- [[Spec Gap Taxonomy & Grilling Agent]] — the upstream stage that makes the ACs complete before decomposition
- [[Vault Provenance & Verification Model]] — the state store this DAG reads; a stale "verified" is a false satisfied dependency
- [[Agent Handoff Protocol]] — the code→vault handoff; this note is the code→code handoff, and both refuse shared context in favor of filesystem + diffs
- [[TAT Platform]] — the repos this orchestrator operates on as stations
- [[Key Decisions#2026-07-23 — Multi-agent delivery is an assembly line: parallel vertical slices, not role specialization]]
- [[Refresher Date Override - SA-Only Absolute-Date Override]] — the by-hand version of the Slice 0 resolver
- [[Patterns#The backend owns business rules; the frontend renders the answer (2026-07-12)]] — why a pure server-side resolver is the right first slice
