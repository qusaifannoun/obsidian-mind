---
date: 2026-07-12
description: "Sweep of all 108 staff-management endpoints against every frontend — 4 with no caller (TOR manual pause, requested-roles, a redundant training-duration route), plus the Form 32 approve endpoint: reachable by URL but dead by role algebra"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Staff Management — Unreachable Backend Endpoints

Four times in one week a bug turned out to be **a working backend capability with no frontend affordance** (see [[Gotchas - Tooling & Method#An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)]]). Rather than keep finding these one bug report at a time, swept **all 108 `staff-management` routes** against every URL called by [[tat-prereq]], [[tat-ws]] and [[tat-portal]].

**Result: 4 routes have no caller in any frontend.** Two are missing product capability; two are redundant.

Method: extract every `@Get/@Post/@Patch/@Delete` from `staff-management.controller.ts`, reduce each to its non-generic literal path segments, and check whether any single FE file contains all of them (handles the `${base(torId)}/…/suffix` split that defeats a naive prefix grep).

> [!warning] What this sweep does NOT catch
> It finds **dead endpoints** (nothing calls the URL). It cannot find the inverse — an endpoint that *is* called but only ever by the wrong role, which is how [[#Related|the mandatory-training privileged save]] hid. That class needs a role-vs-guard audit, not a URL diff.

## 1. Nobody can pause a TOR — `PATCH /tors/:torId/manual-status`

`StaffTorService.setManualStatus` (`staff-tor.service.ts:203`) sets `manualStatusLocked = true` and pins a status; `dto.unlock` clears it and resumes auto-derivation. The flag is load-bearing — `staff-tor-sync.processor.ts:82` does `if (tor.manualStatusLocked) return;`, so the sync skips that TOR entirely.

**No frontend calls it.** So a TOR can only reach `Paused` *automatically*, when a previously-active one falls out of compliance (`derivedStatus = wasEverActive ? PAUSED : DRAFT`).

**Impact:** an admin cannot deliberately suspend an instructor's TOR — e.g. pending an investigation, or a licence issue. [[Staff Management Subsystem & TOR Model|TAT-424]] AC-06 and AC-13 are written around Paused TORs being hidden from assignment lists and removed "immediately" when paused, but nothing can *put* one in that state on purpose. The manual override exists in full and is unreachable.

**Fix:** a Pause / Resume control on the TOR detail page, gated to whatever `assertManualStatusActor` allows. Needs BA confirmation of who may pause.

## 2. An instructor's requested roles are frozen at creation — `PATCH /tors/:torId/requested-roles`

`StaffTorService.updateRequestedRoles` (`staff-tor.service.ts:186`) sets `tor.requestedRoleCodes` and enqueues a TOR re-sync.

`requestedRoleCodes` is **not cosmetic**. It is read by:
- **`buildStaffTorEligibilityFilter`** — the assignment-eligibility filter (TAT-424 AC-11: role must match the requested qualification; see [[TAT-429 Sit-In Eligibility & Move Semantics]])
- **Form 32 role scoping** — which of A / B / C / D (Theoretical Instructor · Practical Instructor · Examiner · Assessor) an instructor gets

It is set **once**, at TOR creation, from `resolveDefaultRequestedRoleCodes(user)` (`staff-tor.service.ts:105`). **No frontend can change it afterwards.**

**Impact:** you cannot change what an instructor is qualified *as*. If someone is meant to become an Examiner, or a role was wrong at creation, there is no way to correct it — and it silently governs both their Form 32 set and their assignment eligibility.

**Fix:** a requested-roles editor on the TOR detail page (privileged only). Note it triggers a TOR re-sync, so status may legitimately change on save.

## 3. `GET .../history-form/training-duration` (×2) — redundant, safe to delete

Both `listTrainingHistory` (line 67) and `getTrainingDurationSummary` (line 81) call the **identical** `calculateTotalTrainingDurationHours(form.trainingHistory)`. The list endpoint already returns `totalDurationHours`, so the standalone route adds nothing.

**But the sweep did surface a real bug through it.** See [[Gotchas - TOR & Staff Management#The 35h/2yr badge summed the wrong collection (2026-07-12)]] — the FE badge summed **mandatory training** items while the rule is met by **training history** records. Fixed (`5159a07`): the FE already fetched the authoritative `totalDurationHours` and was **discarding it**.

Worth confirming before deleting the route: nothing external (a report, an export) depends on it.

## 4. The Form 32 approve endpoint is dead by role algebra — the class this sweep is blind to (2026-07-14)

**This is the exact case the warning above says the URL diff cannot catch** — the route *is* called, so no URL is missing. It is unreachable for a different reason: **no role can ever legally call it.**

The role sets are aliases of each other (`libs/app-data/src/lib/enums.ts`):

```ts
export const FORM_285_AUTO_APPROVE_ROLES = [
  SystemRolesCodes.SUPERADMIN,
  SystemRolesCodes.ADMIN,
  SystemRolesCodes.QUALITY_MANAGER,
  SystemRolesCodes.TRAINING_MANAGER,
] as const;

export const FORM_32_AUTO_APPROVE_ROLES = FORM_285_AUTO_APPROVE_ROLES;
```

`FORM_32_REVIEWER_ROLES` is `[TM, QM, SA]` — a **strict subset** of `FORM_32_AUTO_APPROVE_ROLES` `[SA, AD, QM, TM]`. So **every role that can review a Form 32 is also an auto-approver**, whose *save* already approves:

```ts
form.workflowStage = StaffTorFormWorkflowStage.APPROVED;   // staff-tor-form-32.service.ts:242
form.status = syncFormStatusFromWorkflowStage(form.workflowStage);
await form.save();
```

Which means the `assertCanReviewInstructorSaReview` fallthrough inside `assertCanApproveInstructorSaReview` is **dead code**: by the time anyone calls approve, their own save has already set the stage to `APPROVED`, and the guard throws:

```ts
if (ctx.stage === StaffTorFormWorkflowStage.APPROVED) {
  throw new BadRequestException(ErrorMessages.torFormInvalidWorkflowTransition);
}
```

**Needs a human who knows the intent — I did not touch it.** Either the endpoint should be deleted, *or* the role sets are wrong and a reviewer was meant to exist who approves **without** their save auto-approving. Those are very different products, and the code cannot tell you which was meant.

## Open

- [ ] **Decide the intent behind the Form 32 approve endpoint (#4)** — delete the route, or fix the role sets so a non-auto-approving reviewer exists. Do not "fix" this by guessing
- [ ] Ticket: TOR manual pause / resume UI (**#1**)
- [ ] Ticket: requested-roles editor (**#2**)
- [ ] Confirm with the BA who may pause a TOR, and whether requested-roles is privileged-only
- [ ] Consider deleting the redundant `training-duration` route (**#3**)
- [ ] **The 35h minimum is enforced nowhere in the backend** — no `MIN_HOURS`, no `35` in `libs/database` or `libs/app-data`. `isMandatoryTrainingValidForUser` (which gates TOR activation) never looks at hours. The badge is decorative. If Part 147 requires it, eligibility is not enforcing it
- [ ] Run the inverse audit: endpoints that *are* called but gated to the wrong role (the class the URL sweep is blind to)

## Related

- [[TAT-429 Sit-In Eligibility & Move Semantics]] — the session that surfaced the pattern
- [[TAT-409 Staff Management Subsystem]] · [[Staff Management Subsystem & TOR Model]]
- [[TAT-409 Bug & Gap List]] — the earlier manual inspection; this sweep is its mechanical counterpart
- [[Aircraft Category Filter - TOR Matrix]] — the **inverse** case: an FE control with no backend data (vs a backend capability with no FE control here)
- [[TOR Document History - Hide File Key]] — the unbounded document-history growth + orphaned-S3 cleanup is another backend follow-up in this subsystem
- [[tat-app-ws Backend]] · [[tat-prereq]] · [[tat-ws]]
- [[Systems Thinking]] — replaced one-bug-at-a-time discovery with an exhaustive reachability diff
