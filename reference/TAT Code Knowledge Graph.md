---
date: 2026-08-13
description: "Graphify builds a per-repo code knowledge graph for the five TAT code repos — generated vaults live in each repo, never merged into this one, because generated notes would drown QMD"
tags:
  - reference
  - project/tat
  - tooling
---

# TAT Code Knowledge Graph

[Graphify](https://github.com/Graphify-Labs/graphify) turns each [[TAT Platform]] repo into a queryable knowledge graph — nodes for files, symbols and concepts, edges for imports, calls and containment — plus a generated Obsidian vault and a `graph.canvas` per repo.

> [!important] The generated vaults are separate. They are never merged into this one.
> Graphify emits one thin note per graph node — 23,265 of them across the five code repos, with its own frontmatter (`graphify/code`, `community/…`) and no `date`/`description`/`status`. Merging them would swamp [[Skills|QMD]] (the primary retrieval surface), trip every `/om-vault-audit`, and drown `Recently Touched.base` on each re-export. This vault stays the hand-curated human layer; the graph stays the machine layer underneath it.

## Where each graph lives

Each repo owns its own output at `<repo>/graphify-out/`, git-ignored via `.git/info/exclude` (local only — no tracked `.gitignore` was modified, since the team hasn't opted in).

| Repo | Nodes | Edges | Communities | Notes | Built from |
|---|---|---|---|---|---|
| [[tat-ws]] | 11,164 | 21,547 | 889 | 12,053 | `cf1a168e` (dev) |
| [[tat-app-ws Backend\|tat-app-ws]] | 7,007 | 21,636 | 402 | 7,409 | `948e1515` (dev) |
| [[tat-prereq]] | 1,433 | 3,616 | 99 | 1,530 | `086d00b0` (dev) |
| [[tat-portal]] | 1,055 | 1,838 | 101 | 1,156 | `60ea95bd` (main) |
| [[tat-website]] | 977 | 1,279 | 140 | 1,117 | `d87b993a` (dev) |

_Counts as of 2026-08-13._ Each `GRAPH_REPORT.md` records the commit it was built from — compare against `git rev-parse HEAD` to detect staleness.

## What it is actually good for

The value is in the **community layer**, not the leaf notes. A leaf note for a symbol is skeletal — frontmatter plus one `contains` edge. The communities are what map onto real domain vocabulary this vault already uses:

> [!example] tat-prereq community hubs
> `TOR Certificate API` · `Sit-In Final Assessment` · `History Form Audit Log` · `Form 32 API` · `Form 285 View` · `Pending TOR Reviews` · `Staff Management Pages` · `TOR Matrix Types & Stats` · `Assessment Assignment Form`

Those line up almost one-to-one with [[Staff Management Subsystem & TOR Model]], [[History Form Audit Log]], and the [[TAT-409 Ticket Groups & Inspection Map]] — which is the point. Use it to answer "where does X actually live, and what touches it" before opening files.

## Rebuilding

```bash
graphify update <repo>                        # AST re-extract, no LLM, no cost
graphify label <repo> --backend=claude-cli    # (re)name communities via the Claude plan
graphify export obsidian                      # regenerate the vault + canvas
```

- `update` is free — pure static analysis. Run it after any meaningful merge.
- `label` costs plan usage, not API credit: `--backend=claude-cli` shells out to `claude -p` against the Pro/Max subscription. tat-prereq's run was ~42k input / ~1.3k output tokens.
- Only `label` needs re-running when community names go stale; `update` alone keeps the structure current.

> [!tip] Cross-repo graph
> `graphify merge-graphs` combines several `graph.json` files into one. Not yet built for TAT — it's the obvious next step if a question spans frontend and backend (most [[TAT API & Auth Model]] questions do).

## Traps

> [!warning] Export refuses to overwrite notes it didn't write
> The exporter keeps `.graphify_obsidian_manifest.json` listing the files it owns; a pre-existing file not in that manifest is skipped, not overwritten. That is what makes pointing `--obsidian-dir` at a real vault survivable — but it also means renamed communities leave **stale notes behind** until a prune runs. Prefer the default `graphify-out/obsidian` target.

> [!warning] Unlabeled communities are named after npm packages
> Before `graphify label` runs, community names come from a shared-import heuristic — `@muimaterial`, `@radix-uireact-tooltip`. That is not a graph-quality problem, only a naming one, and it makes the export look worthless until labelling runs. Always `label` before judging a fresh graph.

## Related

- [[TAT Platform]] — the six-repo map this graph mirrors
- [[Skills]] — QMD is the retrieval surface for *this* vault; graphify is the retrieval surface for the *code*
- [[Patterns - Method & Conventions]] — verification bias: a graph is evidence of structure, not of behaviour
