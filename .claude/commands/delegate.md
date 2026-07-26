# Delegate

Hand a task to a coder station (codex, claude, gemini, …) through the [[Loom]]. It runs in an isolated git worktree, gets test-gated, and reports back — no plan file or job JSON to write.

## Usage

```
/delegate <task in plain words>
```

Optionally name a station or a test gate:

```
/delegate --station claude --test "npm test -- auth" add a logout button to the navbar
```

## Workflow

### 1. Read the task

Everything after `/delegate` (minus any `--flags`) is the task. If the task is vague enough that a coder would guess wrong, ask ONE clarifying question first — otherwise proceed.

### 2. Pick the station and gate

- Default station is `codex` (the proven one). Honor `--station` if given.
- If the user gave `--test`, use it. If not, and the task implies a checkable outcome (a file exists, a build passes), propose a one-line test and confirm it. If there's no sensible gate, run without one (green then means "produced a change").

### 3. Run it (dry-run first, always)

```bash
node --experimental-strip-types scripts/loom/delegate.ts "<task>" \
  --station <station> [--test "<cmd>"] --keep
```

`--keep` leaves the worktree so the diff can be inspected. Run in the background if the station is slow; stream the output so the user sees the agent work.

### 4. Show what the agent did

Read the produced diff before judging it:

```bash
git -C ../.loom/worktrees/<id> diff <base>
```

Report GREEN/RED, the diff stat, and — for anything non-trivial — a short summary of the actual change. Never call it done on the report alone; the diff is the truth.

### 5. Integrate only on request

If the user approves, re-run with `--merge` (or `git merge` the branch). Then clean up the worktree. Leave `main` untouched until then.

## Notes

- The station inherits the target repo's own `CLAUDE.md`/`AGENTS.md` — run from the repo you want changed.
- Only `sim` and `codex` are exercised; other stations are wired but unproven. Say so if you use one.
- See `scripts/loom/README.md` for the full model.
