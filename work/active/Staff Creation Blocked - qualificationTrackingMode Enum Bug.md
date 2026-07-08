---
date: 2026-07-07
description: "Backend bug — enum Prop with default:null on User.qualificationTrackingMode blocked ALL staff creation on staging. Root-caused + fixed (dc8f3a4f). Includes the tracking-mode domain logic."
tags:
  - work-note
status: active
quarter: Q3-2026
team: Backend
---

# Staff Creation Blocked — `qualificationTrackingMode` Enum Bug

> Backend regression found while testing the [[tat-prereq]] "Add New Staff" flow against staging (2026-07-07). Root-caused, fixed, and pushed to `dev` (`dc8f3a4f`). Repo: [[tat-app-ws Backend]].

**Component:** `tat-app-ws` — `User` schema (`libs/schemas/src/lib/user.schema.ts`)
**Severity:** High — **every** `POST /auth/internal-user/signup` failed; no staff (any role) could be created on staging, via [[tat-prereq]] *or* the existing backoffice.
**Status:** Fixed on `dev` (`dc8f3a4f`), pushed. Awaiting staging deploy to re-verify create end-to-end.

---

## Symptom

Both the new [[tat-prereq]] create form **and** the live backoffice (`staging.backoffice.tat147.com`) signup returned an identical Mongoose validation error:

```
User validation failed: qualificationTrackingMode: `null` is not a valid
enum value for path `qualificationTrackingMode`.
```

Identical failure from two independent frontends = **backend, not frontend**. tat-prereq's payload is a valid `IntSignUpDTO` subset — it was never the cause.

## Root cause

`user.schema.ts:351` declared a **top-level** enum Prop with a **null default**:

```ts
@Prop({
  type: String,
  enum: StaffQualificationTrackingMode,   // { CONTINUE:"continue", SUSPEND:"suspend" } — no null
  default: null,                          // ← the bug
})
qualificationTrackingMode?: StaffQualificationTrackingMode | null;
```

Mongoose stamps the `null` default onto **every** new `User` document, then runs the `enum` validator against it. `null ∉ {continue, suspend}` → validation fails → the insert is rejected. Because the field is top-level (not inside a role sub-doc), it validated on every signup regardless of role.

**Introduced:** 2026-06-05, commit `7f5063da` ("TAT-432", Dawahreh) — the qualification-tracking feature. The [[TAT-432 Staff Profile]] staging verify passed on 2026-06-07 because that commit hadn't deployed to staging yet; it has since.

## The tracking-mode domain logic (why the fix is correct)

`qualificationTrackingMode` is **not** an active/inactive switch — that's a separate field, `staffStatus` (`ACTIVE`/`INACTIVE`). Tracking mode is a **second, sub-question answered only at deactivation**:

| Field | Meaning | Values |
|-------|---------|--------|
| `staffStatus` | Is the staff member active? | `ACTIVE` ↔ `INACTIVE` |
| `qualificationTrackingMode` | *If inactive,* keep tracking their qualification/training expiry? | `continue` (keep) / `suspend` (freeze) |

- **The ONLY writer** is the deactivate endpoint (`staff-management.service.ts:516`), which `$set`s `staffStatus: INACTIVE` **and** `qualificationTrackingMode: dto.qualificationTrackingMode` together. The value is a required human choice in `DeactivateStaffDTO` (`@IsEnum`). Both `continue` and `suspend` mean the person is **inactive** — the difference is only what happens to their expiry tracking afterward.
- **Everything else only reads it.** The three expiry crons (`aircraft-qualification-expiry`, `mandatory-training-expiry`, `staff-aircraft-qualification.markExpiredQualifications`) query `{ qualificationTrackingMode: SUSPEND }` to build a **skip-list** — suspended staff are excluded from expiry marking + refresher-course push. No cron writes the field. There is **no automatic path** to `continue`.
- An **active** staff member should therefore have **no** tracking mode (the choice hasn't been made yet). Forcing `null` at creation was semantically wrong *and* mechanically fatal.

## The fix (`dc8f3a4f`)

Removed `default: null` from **two** enum Props in `user.schema.ts`:

```diff
   @Prop({
     type: String,
     enum: StaffQualificationTrackingMode,
-    default: null,
   })
   qualificationTrackingMode?: StaffQualificationTrackingMode | null;
```
```diff
-  @Prop({ type: String, enum: AuditorTypes, default: null })
+  @Prop({ type: String, enum: AuditorTypes })
   type!: AuditorTypes;
```

With no default, the path stays **`undefined`** on create; Mongoose skips enum validation on `undefined`. Verified safe against every consumer: `Auditor.type` is the latent twin (dormant until an auditor sub-doc is created). All reads already guard (`user.qualificationTrackingMode ?? null` at `staff-management.service.ts:281`), so the API still returns `null` — **observable behavior unchanged, except staff can now be created.**

> [!note] Fix-style divergence
> The repo's existing convention for this anti-pattern is **additive** — `enum: [...Object.values(E), null]` (see `staff-tor-form.schema.ts:77`, `staff-qualification.schema.ts:125`, `exam-submission.schema.ts:24`). This fix uses **remove-default** instead. Both are correct; remove-default is arguably cleaner here since the field should be truly unset until deactivation. Flagged in case the team prefers consistency.

## Recurring pattern

This is the **3rd/4th instance** of `enum + default:null` in `tat-app-ws` schemas — see [[Gotchas#Nullable enum + `default: null` crashes Mongoose on create (backend, 2026-07-05, recurring)]]. The two earlier siblings (`refresherUpdateSource`, `workflowStage`) are now fixed with the additive style; these two (`qualificationTrackingMode`, `Auditor.type`) were the remaining open ones. Worth a lint rule / schema review to catch the next one.

## Follow-ups (separate from this fix)

- [ ] **Re-verify create E2E on staging** once `dev` deploys — via the [[tat-prereq]] form or a signed curl.
- [ ] **`preferredLanguage` contract** — tat-prereq sends `"en"`/`"ar"`; the backoffice sends `"English"`. Confirm the backend accepts the short codes once creation is unblocked.
- [ ] **Reactivation doesn't clear `qualificationTrackingMode`** — no reactivate code resets it, so a `suspend`ed staff member reactivated later stays on the crons' skip-list (still not tracked) while `ACTIVE`. Possible gap; confirm intended.

## Related

- [[tat-app-ws Backend]] · [[tat-prereq]] · [[TAT Platform]]
- [[TAT-432 Staff Profile]] — the create/edit forms this unblocks · [[TAT-409 Staff Management Subsystem]]
- [[Staff Management Subsystem & TOR Model]] — subsystem domain
- [[Gotchas#Nullable enum + `default: null` crashes Mongoose on create (backend, 2026-07-05, recurring)]] — the recurring anti-pattern
- [[Gotchas#Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)]] — prior create-flow contract lessons
