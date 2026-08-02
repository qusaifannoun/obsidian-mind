---
date: 2026-08-02
description: "Two approved ACs contradict on whether QM approval releases the Final TOR Certificate to the instructor; the BA ruled TAT-455 correct and TAT-450 AC-45 wrong — a spec correction, no code change"
status: accepted
quarter: Q3-2026
project: tat-app-ws
ticket: TAT-450
tags:
  - decision
  - project/tat
---

# Decision: TAT-450 AC-45 is superseded by TAT-455 — the certificate is not auto-released

## Context

**Two approved acceptance criteria contradict each other**, and the conflict is about the
single most important behaviour of the feature: whether QM approval makes the Final TOR
Certificate visible to the instructor.

| Ticket | What it requires |
|---|---|
| **TAT-450 AC-45**, bullet 2 | *"Make the finalized certificate available to the instructor"* — on QM approval |
| **TAT-455 AC-02** | *"After the Final TOR Certificate is generated, it must remain unpublished by default."* |
| **TAT-455 AC-03** | *"An unpublished Final TOR Certificate must not be visible or accessible to the instructor."* |

**The shipped code follows TAT-455.** `staff-tor-certificate.service.ts`, in `approve()`:

```
// AC-02: remain unpublished by default (do not flip published on appr…
```

So the implementation had already picked a side — correctly, as it turns out — and the
written spec still contained both instructions.

## Options considered

1. **Implement AC-45 as written** — flip the certificate to visible on QM approval. This
   would delete the entire [[TAT-455 Final TOR Certificate - SA Publish Gate|publish gate]]:
   if approval releases the certificate, there is nothing left for a Super Admin to publish.
2. **Treat TAT-455 as authoritative and correct AC-45** — approval and visibility stay
   separate states, with publication under SA control.

The two are not reconcilable by scoping or sequencing. One of them had to be wrong.

## Decision

**TAT-455 is correct. TAT-450 AC-45 is the wrong one.** — Qusai asked the BA, **2026-08-02**.

**No code change results.** The implementation was already correct; this decision corrects the
**written spec** only.

## Consequences

- **The publish gate stands** as built and documented in
  [[TAT-455 Final TOR Certificate - SA Publish Gate]]. Approval and visibility remain two
  distinct states.
- **TAT-450 AC-45 has not been edited in Jira.** Until it is, **QA testing that story
  literally will raise a false defect** — they will approve a certificate, observe that the
  instructor cannot see it, and file it as a bug against correct behaviour.
- **Proposed replacement bullet** for AC-45:
  > Leave the certificate unpublished — instructor visibility is controlled by the Super Admin
  > (see TAT-455 AC-02/AC-03).

## The second instance of this failure

This is the **second** time two *approved* TAT tickets have been found to contradict, with the
conflict surviving because approval never checked for it. The first was
**[[TAT-429 Sit-In Eligibility & Move Semantics|TAT-424 ↔ TAT-429]]**, where each ticket
carried a lone rubber-stamp "Approved" 13 days apart and TAT-424's AC-09 over-reached into
TAT-429's bootstrap path — producing a circular dependency that made instructor onboarding
impossible.

The difference in cost is instructive and worth keeping:

- **TAT-424/429 was caught by its symptom**, months later, as an unexplainable empty dropdown.
- **TAT-450/455 was caught by reading both specs against the code** before the contradiction
  could produce anything — the cost is one BA question and a Jira edit.

See [[Patterns - Method & Conventions#An "Approved" stamp is not a consistency check — approved tickets contradict each other (2026-08-02)]].

## Related

- [[TAT-455 Final TOR Certificate - SA Publish Gate]] — the winning spec, and the FE built on it
- [[TAT-450 TOR Certificate FE - Read Path Only]] — the ticket whose AC-45 is superseded
- [[TAT-429 Sit-In Eligibility & Move Semantics]] — the prior instance of contradicting
  approved ACs (TAT-424 AC-09)
- [[TAT-409 Backend Open Items]] — adjacent backend/Jira-hygiene handoffs (the AC-45 edit
  itself is tracked here and in the [[Index#Decisions Log|Decisions Log]])
- [[Staff Management Subsystem & TOR Model]] · [[TAT-409 Staff Management Subsystem]] ·
  [[TAT-409 Delivery Log]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Key Decisions]] · [[Index|Work Notes]]

### Competencies

- [[Systems Thinking]] — read two approved specs against each other and against the shipped
  code, and recognised that the conflict was **structural** (AC-45 would delete TAT-455
  entirely) rather than a wording difference that could be scoped around.
- [[Delivery & Scope Management]] — took a spec contradiction to the **BA for a ruling**
  instead of picking the interpretation the code already matched, and produced a concrete
  replacement bullet so the correction is actionable rather than a complaint.
