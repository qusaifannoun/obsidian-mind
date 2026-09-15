---
date: 2026-09-15
description: "The seeded Super Admin has no name, so every mandatory-training review entry it wrote had reviewerName empty, and Mongoose rejected the whole History Form save"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Mandatory Training Review Log - Nameless Super Admin

Reported 2026-09-14 while working in [[tat-prereq]]: saving a History Form failed with

```
StaffHistoryForm validation failed: mandatoryTraining.0.reviewHistory.1.reviewerName: Path `reviewerName` is required.
```

Fix committed on `dev` as `60dd2ec3` (2026-09-15), **not pushed, typecheck-only, never reproduced** — see [[#Still open]].

## Root cause — a user with no name writes an empty reviewer name

Every mandatory-training review entry is created by `buildReviewHistoryEntry` in `staff-history-mandatory-training.service.ts`, with the name coming from one of two helpers:

```ts
private actorDisplayName(actor: User): string {
  return [actor.firstName, actor.familyName].filter(Boolean).join(" ");
}
```

For a user with neither name this is `""`, and `StaffHistoryMandatoryTrainingReviewHistoryEntry.reviewerName` is `@Prop({ type: String, required: true })`. **Mongoose treats `""` as missing for a required String**, so the whole `StaffHistoryForm` save is rejected.

The nameless user is not test data. [[tat-app-ws Backend]] creates the Super Admin at boot with only three fields:

```ts
// user.service.ts — initializeSuperAdmin
const superAdmin: AdminUserDTO = {
  email: this.configService.get(envKeys.SUPER_ADMIN_EMAIL),
  password: this.configService.get(envKeys.SUPER_ADMIN_PASSWORD),
  role: adminRole as Role,
};
```

and `User.firstName` / `familyName` are plain optional `@Prop()`s. So **in every environment, the Super Admin could not perform any action that appends a mandatory-training review entry** — privileged record/approve, submit, field reject, refresher override. The user confirmed the actor was a user seeded without a name.

Nothing bad was stored: the failing save never persisted, so no data repair was needed. Had a blank entry been stored some other way, every later save of that form would fail, because re-record copies `reviewHistory` verbatim (line 707) and Mongoose re-validates every entry on save. That is why the diagnosis stayed "possible" until the actor was confirmed.

## Decision

Chosen by the user from three options: **fall back to the email in code** — over naming the seeded Super Admin (fragile: the next nameless user breaks again), or both.

## Fix

`staff-history-mandatory-training.service.ts`:

- `actorDisplayName` → the name, or `actor.email` when it is empty.
- `actorDisplayNameById` → also selects `email` and falls back to it; its existing `"Reviewer"` fallback for a missing user is unchanged.

This matches the idiom already used by `staff-tor-form-285.service.ts:646` and `staff-tor-document.service.ts:458`. The Super Admin now appears in review history as their email address.

## Evidence

```
$ npx tsc --noEmit -p apps/api/tsconfig.app.json | grep "staff-history-mandatory-training"
(no output)
```

A read-only query for stored blank-name entries was **blocked by the Claude Code permission classifier** (it reads user names and emails), so the stored data was never inspected.

## Still open

- **Not reproduced before or after the fix**, and no save as the Super Admin has been exercised. Built, **not verified** — per [[Patterns - Method & Conventions]]. Needs a backend deploy.
- Committed local on `dev` (`60dd2ec3`) — but see [[Gotchas - Tooling & Method]] on why "local only" is not a safe claim in these repos.
- `User.email` is also optional in the schema. Safe here only because both callers pass the logged-in user, who was found by email.
- **The same trap elsewhere, unchecked:** a user's display name is hand-built in about a dozen places across `libs/database`, with five different empty-name fallbacks (`""`, `"Reviewer"`, `"Unknown"`, email, `_id`). `staff-history-form.service.ts:1097` and `staff-training-course-request.service.ts:343` can still return `""` into `instructorName`; whether those fields are required was not checked. Consolidating needs a new shared helper — ask first.

## Related

- [[History Form - Training & Validity Records]] — the form this log belongs to
- [[tat-app-ws Backend]] — where the fix lives
- [[Gotchas - Backend Schema & Data]] — the empty-string `required` trap written up
- [[Additional Training Edit - History Form Row Action]] — same service, same subsystem
