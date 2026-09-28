---
date: 2026-09-22
description: "One live classroom exam exposed three independent bugs, all the same shape — state computed once at an event and never re-derived when its inputs changed later"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Live Exam Failure

A single test exam (`Test Exam qusai 1`, exam `6ab25a73bebdf203ddf97ee9`) surfaced three unrelated defects in one sitting. They share a shape worth naming: **a value is computed at one event and never re-derived when its inputs change afterwards.** See [[Patterns - Architecture & Boundaries]].

| # | Bug | State computed at | Never re-derived when | Status |
|---|---|---|---|---|
| 1 | [[Exam Submissions Never Created - Enroll Before Compose]] | enrollment (cron) | the exam is composed later | Fixed `0a2fdb1d` |
| 2 | [[Exam Start Split - Period Start vs Exam Start]] | whichever start endpoint is called | the other half is never written | **Open — needs a decision** |
| 3 | [[Certificate Eligibility Is a Snapshot]] | course completion | a re-grade flips a trainee to passed | Partly fixed `55e4e1c5` |

## Why it took a live exam to find

Each one is invisible until the exact path is walked. #1 only bites trainees enrolled before the exam was composed, and the failure is swallowed by a `try/catch` that logs to console. #2 only bites because the mobile app calls one endpoint of two. #3 only bites when someone re-grades after completion. None throws anywhere an operator looks.

Related: [[Gotchas - Tooling & Method#Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)]] — the same effect, a second time.

## Related
- [[tat-app-ws Backend]], [[TAT Platform]], [[tat-ws]]
- [[Gotchas - Backend Services & Environment]]
- [[Patterns - Architecture & Boundaries]]
