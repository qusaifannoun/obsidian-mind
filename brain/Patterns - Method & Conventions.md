---
date: 2026-06-04
description: "How work gets done in the TAT repos — verification bias, spec-gap routing, ticket hygiene, the propose-before-implementing rule, and where a convention has to live to be reachable"
tags:
  - brain
---

# Patterns — Method & Conventions

How work gets done in the TAT repos — verification bias, spec-gap routing, ticket hygiene, the propose-before-implementing rule, and where a convention has to live to be reachable.

Split out of [[Patterns]] on 2026-08-01. **Add new entries here, not to the index.**

## An integration guide describes the FE the backend imagined — verify against the code (2026-08-01)

A backend handoff doc states what the frontend *should* be doing as if it already is. **Both** guides in the 2026-07-28→31 drop asserted FE behaviour that did not exist — TAT-454's said to *"keep sending `courseMethod`"*, a param the frontend **had never sent**. Taken at face value, the work looks done and gets skipped.

**The failure mode is worse than a no-op.** The backend had already begun **rejecting on write** while the new filter sat **inert on read** — so the picker offered instructors the save would refuse. A guide that says "keep doing X" hides exactly this: it describes a steady state that was never entered, so nobody looks for the half that already went live.

**Rule: an integration guide is a statement of the author's assumptions about your code, not a description of it.** Grep for the field before believing you already send it. This is the same class as the [[Refresher Date Override - SA-Only Absolute-Date Override|TAT-447]] refresher-date route mismatch — where reading the backend's actual code caught that the route landed as `refresher-date`, not the `refresher-override` that had been wired — and it's why *"read their code, not their handoff doc"* keeps paying. Cross-team docs drift **at the boundary**, which is precisely where nothing typechecks. See [[TAT-454 Instructor Assignment Filtering - courseMethod]] and [[TAT-450 TOR Certificate FE - Read Path Only]].

## Vault-state drift is asymmetric — bias every doubt toward NOT-DONE (2026-07-23)

When the vault's record of what's done drifts from reality, the two directions cost wildly differently, so the verification model should be **asymmetric**:

- **Dangerous — vault says DONE when it isn't.** The [[Loom|orchestrator DAG]] consumes a **false satisfied dependency** and builds downstream on it; the failure surfaces far from its cause.
- **Cheap — vault says NOT DONE when it is.** The agent just redoes finished work. Wasted cycles, no corruption.

**Rule: bias every doubt toward NOT-DONE.** A stale "unverified" is a redo; a stale "verified" is a landmine. Corollary: `verified` is a *timestamp, not a property* — it says when it was checked, not that it still holds (see [[Gotchas - Tooling & Method#"Verified" is a timestamp, not proof the fact still holds — and a consistency gate rejects corrections as readily as errors (2026-07-23)]]). Make re-verification mechanical (a code pointer → grep/CI) so a claim can *expire* when its pointer moves. Full design: [[Vault Provenance & Verification Model]]. Same spirit as [[Agent Handoff Protocol]] — verified must mean *exercised*, not built.

## Route each spec-gap kind to the stage that catches it cheapest (2026-07-23)

Design rule for the [[Loom|delivery pipeline]]: spec gaps are **three kinds, each cheapest to catch at a different stage** — pushing all three to end-stage QA is the most expensive place to find any of them.

- **Traceability gap** (spec says it, code doesn't) → **automate**: every AC → ≥1 test → ≥1 code path.
- **Conventional omission** (forgot "forgot password", forgot undo) → a **grilling agent**.
- **Contextual intent** (the client-specific *why*) → **human only**, *mined* by the grilling agent — it can surface the question but never answer it.

The grilling agent needs **fixed lenses, not vibes**: (1) where two rules collide, (2) whether A-then-B differs from B-then-A, (3) what "must update X" silently excludes. It **asks before suggesting an answer** (a suggested answer gets rubber-stamped instead of yielding real intent), **terminates in a written artifact** (resolved rules appended as new ACs, not a chat log), and **only asks about ambiguities that would change code or a test assertion** (the stopping rule). Full design: [[Spec Gap Taxonomy & Grilling Agent]].

## `org/people/` is deliberately unused — don't create person notes (Qusai, 2026-08-01)

Convention: **`org/people/` and `org/teams/` are empty on purpose.** Do not create a person note when a name shows up in a dump — name the person inline in the work note and move on. Confirmed when a backend drop was credited to Dawahreh and I asked whether to start the folder.

Note that the vault `CLAUDE.md` routing table still says *"Writing about a person? → `org/people/`"* and lists a `people-profiler` agent. **This entry overrides it** for the TAT vault. Same class as [[Patterns - Method & Conventions#TAT bugs often live in a Word doc, not Jira — never back-fill a ticket number (2026-07-16)|never back-filling a ticket number]] — a general template convention that doesn't hold here, where following the default produces a note nobody wants rather than an error.

## TAT bugs often live in a Word doc, not Jira — never back-fill a ticket number (2026-07-16)

Convention (Qusai, 2026-07-16): a large share of TAT bug/task work is written up in a **Word document**, not on Jira. When a `/om-dump` (or any handoff) arrives with **`Ticket: —`**, that means there is no ticket — **leave the ticket field blank; do not infer a Jira number from the feature or a related note.** I did exactly that once — labelled an assessment-audit backend item `Ticket: TAT-423` because it touched the assessment feature — and it was wrong; the item wasn't on Jira at all.

- Real ticket numbers come **only** from an explicit `Ticket:` value or the TAT-410→435 ticket sweep already recorded in [[TAT-409 Backend Open Items]] — not from feature association.
- If a dumped bug clearly *should* have a ticket but doesn't, note it as an open question; don't manufacture one. Reference the **feature** note instead (e.g. `Feature: [[TAT-423 Assessment Report Rubric]]`), which carries the association without falsely claiming a ticket.

## No comments or ticket numbers in code (all TAT repos)

Hard rule (Qusai, 2026-07-07): **do not leave comments in any code file I write or touch — and never write ticket/task numbers (e.g. `// TAT-409`) into the code.** Qusai's feedback: it leaves too many comments and task numbers behind, which makes the code look bad. Write self-explanatory code (clear names) instead of explanatory comments.

- Applies to every repo: [[tat-app-ws Backend]], [[tat-ws]], [[tat-prereq]], [[tat-portal]], [[tat-website]].
- Covers new code **and** files I edit — don't add comments while I'm in there. (Don't strip *pre-existing* comments unless asked; the rule is about what *I* add.)
- Ticket numbers live in commit messages / the vault work notes, **not** in source.
- Only exception: Qusai explicitly asks for a comment in a specific spot.
- **Re-emphasized 2026-07-08** (raised again, firmly) after I shipped the notification-system code full of explanatory comments. Default to **zero comments** from the first line — don't write them and then strip later. Self-documenting code only.
- **Third strike 2026-07-28** ([[Sequential User Number - Atomic Allocation & Backfill]]). Two gaps that let me rationalize past the rule: (1) I treated **rationale comments** as exempt — notes explaining *why* a design beats the alternative felt like documentation rather than clutter. They are not exempt. Put the reasoning in the vault note or the PR body, never in the source. (2) I treated **scripts** as outside "code" and wrote a commented usage header into a migration. Also not exempt — the existing `scripts/migrations/*.js` carry zero comments, so the repo already showed the convention and I didn't check. **Read a neighbouring file first; the convention is visible in it.**

## Propose before implementing — don't jump to code (Qusai, 2026-07-07)

When Qusai asks *"what can we do"*, *"what is the fix"*, *"can we…"*, or otherwise asks about **options/approach**, that is a **discussion**, not a go-ahead. **Do not edit files until he explicitly says to implement.** He'll say "fix it", "do it", "go ahead", or similar. Present the options, recommend one, and **wait**.

- Bitten twice on 2026-07-07: implemented the Form 285 comment cleanup and later started editing `bootstrap.service.ts` for the `instanceKey` backfill before being asked — both times he interrupted.
- Applies across repos ([[tat-app-ws Backend]], [[tat-prereq]], et al.). Investigating/reading is fine; **writing** needs a green light.
- Pairs with [[Patterns - Method & Conventions#No comments or ticket numbers in code (all TAT repos)]] — both are about respecting his control over what lands in the code.

## Git workflow — commit to `dev` (TAT repos)

The TAT repos ([[tat-prereq]], [[tat-app-ws Backend]], et al.) use **`dev`** as the shared integration branch — **commit directly to `dev`**, no feature branches, no PRs (corrected 2026-07-09; the note previously said `main`, but all real work — this session and prior — lands on `dev`, and staging deploys from it). When work is done on a throwaway branch, fast-forward `dev` to it and delete the branch. **Push to `origin/dev` when asked** — Qusai directs pushes explicitly ("push", "commit and push"); don't push on your own. **Never add a `Co-Authored-By` trailer, a "Generated with Claude Code" line, or any other Claude attribution** — commits must read as authored solely by Qusai (corrected 2026-07-28; this line previously said the opposite. The global `~/.claude/CLAUDE.md` hard rule forbids attribution and explicitly overrides any convention, and older commits in the TAT repos still carry the trailer — that history is what made the old instruction look right). Keep commits focused — **leave Qusai's own uncommitted edits out** (he often has in-progress polish in the same files; stage only the files for the task at hand). Note: `origin/dev` sometimes already contains a just-committed SHA (a push returns "Everything up-to-date") — verify with `git branch -r --contains <sha>` rather than assuming the push failed.

## A convention that lives only in a docstring is unreachable — write it where startup reads (2026-07-14)

The Zod+RHF rule was stated clearly, imperatively, and in exactly one place: a docstring inside `src/hooks/use-zod-form.ts`. You only read it if you already opened the hook you were supposed to know to use. **The rule was unreachable, not ignored** — six files broke it, mine included, and I would have followed it had I seen it.

**Rule:** a convention only exists if it lives where an agent or a new dev reads *at startup* — `CLAUDE.md`, `AGENTS.md`, `.cursorrules`. Anywhere else (a docstring, a wiki page, a Slack message, one reviewer's memory) it is decoration, and the violation it produces is the *repo's* fault, not the author's.

**Corollary — fix the reachability before the code.** The refactor's first commit added the `CLAUDE.md`, then swept the six files. Sweeping first would have left the rule just as unreachable, and the seventh violation would already be on its way. This is the same shape as [[Agent Handoff Protocol]]: put the instruction where the reader actually starts.

**Smell to grep for:** an imperative in a code comment — *"must"*, *"never"*, *"always"* — in a repo with no agent-readable rules file. That comment is a rule that has already failed.

**But a rules file is code, and it rots just as fast — with nothing to typecheck it.** Two days after the `tat-prereq` CLAUDE.md was written, it still advertised `ControlledDatePicker`, a component the *same sweep* had deleted. An agent reading it would have reached for a component that no longer exists. **When you delete or promote a shared primitive, the rules file is part of the blast radius** — grep it by name in the same commit. Nothing else will catch it.

## A wired hook with an empty branch is where a feature is supposed to live (2026-07-12)

Twice this week the "missing feature" was an existing, already-fired hook whose non-matching branch just `return`ed:

```ts
const courseCode = await findCourseCodeByOnlineCourseId(onlineCourseId);
if (!courseCode) return;   // ← not a mandatory refresher? do nothing at all
```

`applyOnlineCourseCompletion` was already called on every completion from **both** the progress and exam services. Completing one of the 5 mandatory refreshers filled its slot; completing **anything else silently did nothing**. The new auto-add-training-record feature is that `return` replaced with a branch — no new hook, no new call site.

**When asked for "X should happen when Y happens", grep for the Y handler first.** The plumbing is usually already there and already fired, with a bare `return` where the behaviour belongs. Sibling of [[Gotchas - Tooling & Method#An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)]].

## Related

- [[Patterns]] · [[Gotchas]] · [[Key Decisions]]
