---
date: 2026-07-28
description: "Toolchain and working-method traps — vault tooling, lint and IDE behaviour, and recurring reasoning failures"
tags:
  - brain
---

# Gotchas - Tooling & Method

Split out of [[Gotchas]] on 2026-07-28, which had reached 96KB. Entries moved verbatim; [[Gotchas]] keeps the one-line index. **Add new entries here, not to the index.**
## A git worktree has no `node_modules`, so a delegated agent writes code it cannot verify (2026-07-30)

> [!danger] codex followed `AGENTS.md`'s "run lint and build before you finish" and got `sh: next: command not found`, exit 127
> `git worktree add` gives you a checkout of tracked files — **nothing gitignored comes with it.** No `node_modules`, no `vendor/`, no `.venv`. Every build, lint, typecheck, and test command in the repo's own agent instructions fails instantly inside a fresh worktree.
>
> **The damage is silent, not loud.** The station doesn't stop; it writes the code anyway, blind. On the first live [[Loom]] slice ([[TAT-451 Instructor Type - Form 32 Resolver|TAT-451]]) the output happened to be correct — but it was correct by luck, not because anything checked it. A larger slice would have come back subtly wrong with the same GREEN.
>
> **A test gate does not save you**, because the gate runs *after* the station is finished. It catches a bad result; it cannot give the agent the feedback loop it needed while working.
>
> **Fix:** a `setup` step that runs in the worktree *before* the station, declared once per repo in `.loom/stations.config.json`. `ln -sfn ../../<repo>/node_modules node_modules` is enough and beats `npm ci` on speed. A non-zero exit must fail the slice without starting the station — an agent that cannot verify itself should not run at all. Shipped in Loom v1.1.0.
>
> **Generalises past Loom.** Any harness that hands an agent an isolated checkout owns this problem: CI containers, sandboxes, fresh clones. The rule is *provision the ignored deps before the agent starts*, not before the gate.

## Installing the qmd Claude Code plugin shadows the vault's scoped MCP server and silently serves an EMPTY index (2026-07-28)

> [!danger] `mcp__..._qmd__status` returns `{"totalDocuments":0,"collections":[]}` while `qmd --index obsidian-mind status` reports 84 documents — at the same moment, on the same machine
> QMD stores each index in its own SQLite file. This vault's lives at `~/.cache/qmd/obsidian-mind.sqlite` (the `qmd_index` field in `vault-manifest.json`); QMD's *default* store is `~/.cache/qmd/index.sqlite` and is empty.
>
> **Why the plugin can only ever read the empty one.** The qmd plugin registers its MCP server as bare `command: "qmd", args: ["mcp"]` with no index scoping. Per the header comment in `.claude/scripts/qmd-mcp.mjs`, **`qmd --index <name> mcp` ignores the `--index` flag** (`mcp/server.js` calls `getDefaultDbPath()` regardless) — which is precisely why this vault ships a wrapper that forces `INDEX_PATH` instead. The plugin has no wrapper, so it always opens the default store.
>
> **Both servers connect, so nothing looks broken.** `claude mcp list` showed `plugin:qmd:qmd ✔ Connected` *and* `qmd ✔ Connected`. They register identical tool names; the plugin's won the namespace and surfaced as `mcp__plugin_qmd_qmd__*`, while the vault's correctly-scoped tools were never exposed to the model at all.
>
> **Rules:**
> - Do **not** install the qmd plugin in this vault — the vault already ships the same capability, correctly scoped, via `.mcp.json` → `.claude/scripts/qmd-mcp.mjs` and its own `qmd` skill. Remove it with `claude plugin uninstall qmd@qmd -y`.
> - A `0 documents` reading is only the harmless stale connect-time banner CLAUDE.md warns about **if a live `status` call disagrees with it.** Here the live call *agreed* — 0 documents *and* 0 collections, matching the default store exactly. That distinction is the whole diagnosis: compare against `qmd --index <name> status` before concluding either way.
> - Uninstalling does **not** restore the tools mid-session — the tool registry is fixed at session start. Use the CLI (`qmd --index obsidian-mind query "<topic>" --no-rerank`) until the next session.
> - Add `--no-rerank` to CLI queries or the first reranked query stalls downloading a 639MB model.
>
> Do not "fix" this by re-running `scripts/qmd-bootstrap.ts` — the index was never the problem. The bootstrap reported `0 new, 0 updated, 84 unchanged`, confirming it was already current.

## "Verified" is a timestamp, not proof the fact still holds — and a consistency gate rejects corrections as readily as errors (2026-07-23)

> [!warning] The vault's `verified` marker records *when* a fact was checked, not that it is *still* true. A bullet verified three weeks ago is trusted today even if the code moved underneath it.
> This is a property of the vault-as-state-store, and it bites the [[Loom|delivery pipeline]] hardest: the dependency DAG reads vault state to decide a slice's prerequisites are done, so a stale "verified" becomes a **false satisfied dependency** the whole pipeline builds on.
>
> **Second trap in the same place: a consistency-based write gate filters noise, not falsehood.** A gate that only admits writes agreeing with the incumbent rejects a *correction* exactly as readily as an *error* — both disagree with what's stored. Consistency is not truth; a confidently-wrong bullet becomes self-protecting.
>
> **Mitigation direction** (proposal, not built): store a **code pointer** (`file:line`/symbol/test) with each verified bullet so re-verification is grep/CI instead of re-reasoning, and a **provenance field** (which model/harness wrote it). Full design + the drift asymmetry: [[Vault Provenance & Verification Model]]. Same family as [[Agent Handoff Protocol]]'s "never claim verified if you only built or typechecked it."

## Scoping debt from the files you happen to be looking at under-counts it (2026-07-14)

> [!warning] Qusai named two files that broke the Zod+RHF rule. A repo-wide grep found **six**. Two (`Form32InstanceList`, `SitInSection`) were on nobody's list.
> The two he spotted were simply the two he had open. **The only honest scope for a convention violation comes from grepping the whole repo for the convention** — never from the sample that prompted the complaint.
>
> Worst offender was the one nobody mentioned: `TorQualifications`, **8 distinct forms in 18 `useState`**, with state buckets *shared across mutually-exclusive flows* — one `file` serving both the submit-evidence and renew paths, one `reason` serving two different rejection actions. That sharing is invisible until you try to give each form its own schema.

## An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)

> [!danger] Four times in one week, a "missing feature" was a **fully-working backend endpoint with no frontend affordance**
> - **Aircraft-qualification writes** — FE stubbed the section read-only with a "no endpoint yet" note. `GET/POST/PATCH …/aircraft-qualifications` had existed all along.
> - **Mandatory-training privileged save** — backend auto-approves for SA/AD/QM/TM and doesn't require evidence. The FE only ever built the *instructor* path: one button, disabled without a certificate, wired to the one endpoint that rejects privileged editors by design. SA could not record training for an instructor at all.
> - **Course instructors list** — the endpoint existed; nothing displayed it, so adding an instructor gave zero feedback.
> - **External teaching** — the code said *"backend has no list/approve surface yet"*. `GET …/external-teaching`, `PATCH …/approve` and `PATCH …/reject` all existed, and the FE even had approve/reject **mutations that nothing could call** because no UI listed the activities.
>
> **Rule: grep the backend controller before believing a frontend gate, a stub, or a comment.** In two of the four, the misleading comment is *why* the gap survived — someone read it, believed it, and moved on.
>
> **The mechanical version:** diff every backend route against every URL the frontends call. Reduce each route to its non-generic literal path segments and check whether any single FE file contains all of them — this survives the `${base(id)}/…/suffix` split that defeats a naive prefix grep. Run on all 108 `staff-management` routes it found **4 dead endpoints in one pass**, including *nobody can pause a TOR*. See [[Staff Management - Unreachable Backend Endpoints]].
>
> **Its blind spot:** it only finds endpoints nothing *calls*. It cannot find an endpoint that is called but only ever by the wrong role — which is exactly how the mandatory-training privileged save hid. That needs a role-vs-guard audit.

## Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)

> [!warning] Fixing a deadlock doesn't reveal one bug — it reveals every bug downstream of it, all at once
> The sit-in cycle had **never once run end to end** (the [[Gotchas - TOR & Staff Management#Sit-in eligibility was circular — the TOR gate made new-instructor onboarding impossible (2026-07-12)|circular TOR dependency]] made it impossible). Within an hour of unblocking it, driving the flow for real surfaced: the completed sit-in 404'ing, the instructors list showing "No sit-in", `SIT_IN_CREATED` recording the **instructor** as the actor instead of the SA/TM who clicked Add Instructor (an audit trail that lies is worse than one that's missing), and `sit_in_moved` rendering as a raw enum string.
>
> None were regressions — all were **pre-existing and unreachable**, sitting behind the deadlock since TAT-421 shipped. Same shape as the [[Gotchas - Backend Schema & Data#`autoIndex: true` creates indexes but NEVER drops them — renaming an indexed field leaves a live unique constraint (2026-07-10)|stale sit-in index]]: code that has never been exercised is not "working", it's **untested**, and it will fail in a cluster the moment someone reaches it. **When you unblock a dead path, budget for the bugs behind it rather than treating the unblock as done.**

## tat-ws — `nx lint` crashed on asset imports (FIXED 2026-06-02)

`nx lint tat-ws` used to **throw instead of linting**: `@nx/enforce-module-boundaries` (nx 19.6.4) did `ENOENT … open '.../apps/tat-ws/src/assets/*'` while autofixing **any** SVG/asset import (alias `@tat-ws/assets/...` *or* relative `../../assets/...`). It treats `src/assets` as a boundary via the tsconfig path mapping and the autofixer reads the literal glob path.

**Fix applied:** disabled the rule in `.eslintrc.json` (`"@nx/enforce-module-boundaries": ["off", …]`). Justified because its `depConstraints` were wide-open (`sourceTag "*" → onlyDependOnLibsWithTags ["*"]`), so it enforced no real boundaries — only the broken autofix. Lint now runs.

> [!warning] Disabling it revealed a ~225-error pre-existing lint backlog
> The crash had hidden the whole codebase's violations (unused vars, `no-explicit-any`, non-null assertions, `no-unsafe-optional-chaining` errors). CI `nx lint` will now fail on these real issues until they're cleaned — a separate effort. `tsc --noEmit -p apps/tat-ws/tsconfig.json` is the clean type gate meanwhile.

Alternative fix (not taken): bump `@nx/eslint-plugin` to a version where the autofix bug is gone. Context: [[TAT-428 Edit Issued Certificates]], [[TAT Certificates - Open Items]].

## IDE TS-server flags "implicit any" where batch `tsc` passes — annotate React-Query callbacks (2026-07-06)

> [!warning] The editor shows TS errors that `tsc --noEmit` (the source of truth) does not
> On [[tat-prereq]]'s `HistoryFormView.tsx`, VS Code's TS language server flagged `implicit any` on `.map`/`.filter`/`.reduce` callbacks and a `{} | null` on a `Map.get()` — but `tsc --noEmit` (fresh, strict, cache cleared) reported **0 errors**. Cause: the LS falls back to `any` on **React-Query-derived values** (`useX().data`, destructured `data`/`records`) when deep/generic inference times out in the editor; batch `tsc` has no such limit and resolves them. Don't chase phantom errors by re-reading `tsc` output — confirm with `mcp__ide__getDiagnostics` (the live editor view) vs a clean `npx tsc --noEmit`. **Fix:** give the flagged callbacks/vars **explicit type annotations** (`(it: MandatoryTrainingItem) =>`, `const requestByCourse: Map<string, TrainingCourseRequest> = …`) so the editor doesn't need to infer the container type. Bonus: doing so caught a real bug (`useSitIn().data` is `SitIn | null | undefined`, not just `| undefined`). Zsh caveat: `${PIPESTATUS[0]}` is empty in zsh (it's `$pipestatus`), so a piped `tsc | head` can hide the real exit code — capture to a file + `grep -c "error TS"`.

## Sharing an HTML deliverable in Teams: JS is stripped + UTF-8 mojibakes → prefer a `.docx` (2026-07-05)

> [!warning] A JS-rendered HTML page shows blank in Teams' preview, and its em-dashes/quotes render as `â€"`
> When sharing the [[TAT-409 Bug & Gap List]] dashboard: (1) Microsoft Teams (and most chat/file previewers) **sandbox the preview and strip `<script>`** — so any content built by JS at load renders as an empty page. Fix: **pre-render the content as static HTML** and use JS only for progressive enhancement (filters). Verify the `<article>` rows exist in the file source, not just after `appendChild`. (2) Teams decoded the file as Latin-1, so UTF-8 `—`/`"`/`→` showed as mojibake (`â€"`, `â€œ`). A **`.docx` stores Unicode natively** and renders cleanly everywhere — build one with `python-docx` (installable via `pip install --user python-docx`; hyperlinks need a small `add_hyperlink` OOXML helper). Rule of thumb: **browser/artifact → interactive HTML; Teams/email → `.docx`.** Keep the `.md` as the canonical source and generate the others from it.
