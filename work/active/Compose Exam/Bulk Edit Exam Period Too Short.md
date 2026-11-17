---
date: 2026-11-17
description: "Bulk edit sized phase exam periods from the rounded phase total; the exam backend needs ceil(hours) questions per chapter, so exams didn't fit their period"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-ws
---

# Bulk Edit Exam Period Too Short

**Status (as of 2026-11-17):** [[tat-ws]] `92a47e0a`, on dev, prepod and main. **Not deployed or run in a browser.**

## Context

On production, creating the PH.01 exam failed with `Failed to create exam: Exam duration (42 minutes) cannot exceed the scheduled period duration (40 minutes)`. The exam had 28 questions (3+3+3+2+2+2+2+1+4+2+2+2), and 28 × 1.5 min = 42. The client's rule: questions = learning hours rounded up to a multiple of 4; exam duration = questions × 1.5 min; exam period = exam duration + 10%.

## Root cause

The same rule was written twice, with different rounding:
- **The exam backend and Compose Exam** (`exam.service.ts`, `requiredQuestionsFor`): each chapter needs `ceil(chapter hours)` questions. The total is then padded to a multiple of 4.
- **Bulk edit** (`bulk-edit/services/scheduleGenerator.ts`, `calculateExamDuration`): it summed the phase's raw hours and rounded once.

Every chapter with half an hour was undercounted, so the generated period was shorter than the minimum exam. A 40-minute period means the generator saw at most 24 questions; the course's real chapter hours are inferred, not read from production.

## Fix

[[tat-ws]] `92a47e0a`: each chapter's hours are rounded up first, then summed. The total is rounded up to a multiple of 4, × 1.5 min, + 10%.

## Evidence

The real generator on 12 chapters totalling 22 h (`[2.5, 2.5, 2.5, 1.5, 1.5, 1.5, 1.5, 0.5, 3.5, 1.5, 1.5, 1.5]`):
- before: `exam period 08:00 - 08:40 = 40 min; backend needs 42 min`
- after: `exam period 08:00 - 08:47 = 47 min; backend needs 42 min`

tat-ws typecheck clean; no new lint warnings.

## Still open

- [ ] Not deployed. The production course still holds the 40-minute period. Lengthen it in Bulk Edit to ≥ 42 min, or use "Regenerate from Course" after deploy, which wipes manual assignments.
- [ ] Picking more questions than required can still exceed the period; the backend rejects that, correctly.
- [ ] The rule still lives in two repos. The frontend now mirrors the backend instead of sharing it.
- [ ] The manual time recalculation in `useScheduleGeneration.ts` gives exam periods a flat 120 minutes.

## Related

- [[Course Phase Order]]: the same bulk-edit generator
- [[Compose Exam - Period Chapters, Course Reset & Day Labels]]
- [[Patterns - Architecture & Boundaries#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]]
- [[tat-ws]] · [[tat-app-ws Backend]]
