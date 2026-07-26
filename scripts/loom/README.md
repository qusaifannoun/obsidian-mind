# Loom

The control plane for [[Loom]] — System B, moving from design to running.

It runs vertical slices of work through **coder stations**, each in its own isolated
git worktree, and integrates a slice only when it goes green (produces a diff and
passes its test). The core knows nothing about any specific AI vendor: a station is
just a command template, so any headless coding CLI is a station.

## Run

```bash
node --experimental-strip-types scripts/loom/run.ts <job.json> [--config path] [--merge] [--keep]
```

- Default is a **dry run**: worktrees are created, stations run, results are gated
  and reported, then worktrees are removed. `main` is never touched.
- `--merge` integrates every green slice into the base branch (one at a time, only
  when the base is checked out and the tree is clean).
- `--keep` leaves worktrees on disk for inspection.

Proof of the loop (no AI, no auth — a deterministic `sim` station):

```bash
node --experimental-strip-types scripts/loom/run.ts scripts/loom/jobs/hello.slice.json
```

## Add any agent — it's a config line, not code

`stations.config.json` maps a station name to a command template. Placeholders are
substituted per slice: `{worktree}`, `{promptFile}` (path to the plan), `{promptText}`
(the plan's contents), `{output}` (where the station may write its report).

```json
"opencode": {
  "command": "opencode",
  "args": ["run", "{promptText}"],
  "cwd": "{worktree}",
  "timeoutMs": 900000
}
```

Ships with presets for `sim`, `codex`, `claude`, `gemini`, and `aider`. Switch the
default with `defaultStation`, or per slice with the slice's `station` field.

## A job

A job is a set of slices with a dependency DAG. Independent slices in the same
topological layer run in parallel; the base of every worktree is the job's `base`
(or the current branch).

```json
{
  "base": "main",
  "slices": [
    { "id": "schema", "plan": "plans/schema.md", "station": "codex", "test": "npm test -- schema" },
    { "id": "api", "plan": "plans/api.md", "station": "codex", "deps": ["schema"], "test": "npm test -- api" }
  ]
}
```

## Safety model

Bias toward not-done, per [[Vault Provenance & Verification Model]]: a slice is green
only when it **produced a change AND its test passed**. No change, or a failing test,
is red — never silently accepted. Dry-run is the default so nothing merges by accident.

## Next: Slice 0

The first real slice is the refresher-date resolver — see
[[Refresher Date Override - SA-Only Absolute-Date Override]]. It is blocked on two
open ACs (precedence ordering, revert path) that must be resolved first; see
[[Loom]] Slice 0 open questions.
