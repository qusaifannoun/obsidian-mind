---
date: 2026-06-02
description: "Leaving the codebase healthier — fixing real bugs, removing dead code, keeping lint/types green, and not papering over issues"
current-level:
target-level:
tags:
  - perf
  - competency
---

# Code Quality

## Definition

Writing and repairing code so it's correct and maintainable: fixing genuine bugs (not just lint cosmetics), removing dead code, keeping the type and lint gates green, reusing existing patterns, and distinguishing real issues from noise when a backlog appears.

## Proficiency Levels

| Level | Description |
|-------|-------------|
| Working | Follows conventions; passes review |
| Strong | Fixes root issues, keeps gates green, reuses patterns |
| Lead | Unblocks tooling, triages backlogs by real risk, raises the bar for the codebase |

## Growth Notes

Keep separating genuine bug-class issues (rules-of-hooks, unsafe optional chaining, N² renders) from cosmetic noise, and fix the former first.

## Related

- Evidence accumulates via backlinks (work notes link here).
- [[Q2 2026]] · [[Debugging & Root Cause Analysis]]
