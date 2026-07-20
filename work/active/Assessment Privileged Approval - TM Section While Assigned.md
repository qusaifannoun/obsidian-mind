---
date: 2026-07-16
description: "Privileged SA/TM can now see + operate the Assessment TM section (incl. comments) while the assessment is still 'assigned' — and approve directly from assigned/draft, bypassing the assessor-submit step"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
---

# Assessment Privileged Approval — TM Section While Assigned

Qusai (Super Admin) couldn't see the Training-Manager section (or the new TM [[Export Assessment Report - TAT Form 032 PDF|comments]] field) on an assessment sitting at **"Assigned"**.

## Root cause — status-gated, not role-gated

The TM section's visibility was gated by **status**, independent of role: the whole section rendered only when `status !== 'assigned'`, and the editable approve form only at `pending_tm_review`. So even a privileged SA (who *can* approve) saw nothing on an Assigned assessment — the two-role flow (*instructor fills & submits → TM approves*) hadn't reached the TM step. Role wasn't the blocker; the workflow stage was.

## What changed (per Qusai's instruction "show the TM section for privileged users even while assigned")

- **FE gate** (`AssessmentFormView`): `status !== 'assigned' || canApprove` — privileged users see the TM section upfront. `tmEditable = canApprove && status !== 'approved'` (was `=== 'pending_tm_review'`), so the approve form + comment box are editable at any pre-approval stage for privileged users.
- **Backend** (`approve()`): the comment only persists via `approve()`, which hard-required `PENDING_TM_REVIEW`. Relaxed it to reject **only when already `APPROVED`** — it's already `assertApprover`-gated, so this scopes to privileged approvers.

Committed `dev`: [[tat-app-ws Backend|tat-app-ws]] `12647d0d`, [[tat-prereq]] `71cf8b8`. `tsc` clean both sides.

## Decision + implication (recorded in [[Key Decisions]])

A privileged SA/TM can now **approve an assessment directly from `assigned`/`draft`** — i.e. **without the assessor filling the rubric or signing**. The sequential two-role flow can be bypassed by a privileged approver. Qusai chose this deliberately.

> [!question] Open guardrail question
> Should a privileged early-approval still require the **rubric to be filled** (or the assessor section signed) first? Currently it doesn't — an assessment can be approved empty. Flagged; not yet decided.

Not browser-verified.

## Related

- [[TAT-423 Assessment Report Rubric]] — the assessment model + the assessor/TM split
- [[Export Assessment Report - TAT Form 032 PDF]] — the TM comment this made reachable
- [[Key Decisions]] · [[tat-app-ws Backend]] · [[tat-prereq]]
