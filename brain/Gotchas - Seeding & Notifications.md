---
date: 2026-09-15
description: "tat-app-ws boot-time seeding and notification plumbing traps — destructive re-seeds, skip-existing seeders, and the enum and mapping gates a notification must pass"
tags:
  - brain
---

# Gotchas - Seeding & Notifications

Split out of [[Gotchas - Backend Services & Environment]] on 2026-09-15, when it reached 25KB. Entries moved verbatim; [[Gotchas]] keeps the one-line index. **Add new entries here, not to the index.**

## Notification URLs baked at seed time + skip-existing seeding = env-var changes silently ignored (2026-07-09)

> [!danger] Setting `STAFF_MANAGEMENT_URL` after the first seed never took effect — staff-management notification links kept pointing at the dashboard host
> Two [[tat-app-ws Backend]] behaviors compounded into a "we added the env var but links are still wrong" bug:
> - **Bootstrap resolved the base URL *once, at seed time* and stored it as an absolute URL.** `bootstrap.service.ts` called `generateNotificationUrl(param.url, {}, {clientApp})` while seeding, baking e.g. `https://<base>/staff/{{userId}}` into `NotificationSetting.parameters[].url`. If `staffManagementUrl` was empty when the settings were first seeded, `resolveClientBaseUrl` fell back to `dashboardUrl` — so the rows permanently held the dashboard host.
> - **Re-seeding skips any setting whose name already exists** (`if (settingExists) { skippedCount++; continue }`). So adding `STAFF_MANAGEMENT_URL` later and rebooting did **nothing** — bootstrap never re-processes existing rows.
> - **The runtime resolver was dead code.** `sendNotification` re-calls `generateNotificationUrl` on the stored URL and *does* pass `param.client` as context — but `generateNotificationUrl` only resolves a base when `!url.startsWith("http")`. Since the stored URL was already absolute, the guard was skipped and the send-time context never mattered.
>
> **Fix (option A, 2026-07-09):** stop baking — store the **relative** `param.url` + `client` on the setting, and let `sendNotification` resolve the base per-client on every send. Plus a migration (`2026-07-09-relativize-notification-urls.js`) to relativize the already-baked rows so the runtime resolver takes over. Future host changes now just work with a redeploy. Deleted the earlier `2026-07-08-repoint-staff-notification-urls.js` (it re-baked absolute — re-running it would reintroduce the bug).
>
> **Two general rules:** (1) **resolve environment-dependent values at use time, not at seed/write time** — anything baked into a DB row on first seed is frozen against whatever config existed then, and idempotent-skip seeders never refresh it. (2) When a re-runnable seeder is **skip-if-exists**, changing the seed data (URLs, params) is a **no-op on existing rows** — you need a migration, not a reboot. Same shared-DB re-seed family as [[Gotchas - Seeding & Notifications|Booting tat-app-ws against a shared DB re-runs ALL seeders — role-action seeding is DESTRUCTIVE]] against a shared DB re-runs ALL seeders — and role-action seeding is DESTRUCTIVE (2026-07-07)|the destructive role-action seeder]]. Context: [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]].

## Booting [[tat-app-ws Backend]] against a shared DB re-runs ALL seeders — and role-action seeding is DESTRUCTIVE (2026-07-07)

`BootstrapService.onModuleInit()` runs the full seeder chain on **every** app start (`nx serve api`, or any deploy). It is **not** a safe way to trigger one seeder against a shared DB. `seedRoleActions` calls **`editRoleActions`, which REPLACES a role's entire action set** with the hard-coded local `roleActionsMap` — so booting a **local branch** against the **shared dev cluster** overwrites every role's permissions with the local definitions. If local ≠ deployed, this **regresses permissions for everyone on that dev DB** (observed: instructor `/details` went 200→403 after a local `nx serve` pointed at dev).

- **Confirmed 2026-07-07** while running a one-off `instanceKey` backfill via the app (see [[Staff Creation Blocked - qualificationTrackingMode Enum Bug]] neighbourhood / Form 285 work). The backfill itself worked (`/form-285` 404→403), but the collateral role-action overwrite did not.
- **Self-healing:** redeploy/restart staging (or run the *deployed* branch) → bootstrap re-seeds role-actions to the deployed truth.
- **Rule:** never boot the app against shared dev/prod to run a single data fix. Use a **standalone script** with the DB driver (needs the current `MONGO_URI` — the local `.env` dev URI is stale/NXDOMAIN; grab the live one from AWS ECS task def / Bitbucket vars / Atlas). Or gate the fix so only it runs.
- Related: `.env` values have stray **trailing commas** (`redis,`, `tat147-dev,`) that break Redis/host lookups. See [[Patterns - Method & Conventions#Propose before implementing — don't jump to code (Qusai, 2026-07-07)]].
- **Updated 2026-07-10:** the local `.env` `MONGO_URI` now points at the live cluster (`…oemqsva…`, db `tat-dev`), not the dead `cqtcwb3` host — that part of this gotcha is stale. It still won't connect from a laptop: **Atlas IP allowlist** rejects un-whitelisted IPs (`MongooseServerSelectionError: ReplicaSetNoPrimary`). Whitelist your IP or run migrations from a host that's already allowed.
- **The allowlist rejection wears two different masks — neither mentions the firewall.** Seen as `ReplicaSetNoPrimary` (2026-07-10) *and* as a bogus TLS error (2026-07-12): `MongoServerSelectionError: SSL routines:ssl3_read_bytes:tlsv1 alert internal error … SSL alert number 80`. Atlas kills the TLS handshake for an unknown source IP, so the driver reports an OpenSSL fault. **It is not a cert problem — do not debug TLS. Check the allowlist first.**
- **Your egress IP rotates.** Whitelisted `188.123.164.132` on 2026-07-11; by 2026-07-12 it was `188.123.164.137` — same `/24`, ISP re-leased the last octet (dynamic DHCP; it can change overnight with no action). Re-whitelisting one address means doing it again in days. **Whitelist `188.123.164.0/24`** (acceptable for the *dev* cluster; not for prod), or route through a fixed egress. Check current IP with `curl -s https://api.ipify.org`.
- **`REDIS_HOST=redis` only resolves inside Docker.** Running `nx serve api` on the host with Docker down leaves the API retrying `getaddrinfo ENOTFOUND redis` forever — it never reaches `app.listen`, so port 3333 is simply dead with no error saying why. Redis usually runs natively on `localhost:6379` anyway: override with `REDIS_HOST=localhost npx nx serve api` rather than editing `.env`.

## Bootstrap silently SKIPS any notification setting with no mapping entry (2026-07-12)

> [!warning] Add a setting to `notification-settings.json` without a `notificationSettingMappings` entry and it is never created — no error, and the notification then never fires
> `seedNotificationSettings` (`bootstrap.service.ts:1218`) looks up `notificationSettingMappings[setting.name]` for the action + template code. On a miss it `console.warn`s and `continue`s — the setting is **never inserted**. Downstream, `sendNotification` no-ops when `notificationSettingModel.findOne({name})` misses. So a new notification fails **silently at both ends**: nothing throws, nothing logs at runtime, the recipient just never hears anything.
>
> **Adding a notification needs FOUR edits, not two** (I originally wrote THREE here — that was wrong, see the next gotcha): (1) `seed_data/notification-settings.json`, (2) `seed_data/notification-template.json` (with a unique `code`), (3) the `notificationSettingMappings` object in `bootstrap.service.ts` keyed by the exact setting `name`, and (4) **the `code` must also be a member of the `SystemActions` enum**. Caught on the `SIT_IN_MOVED` work — the first two were done and it would have shipped mute. The seeder itself is **upsert-style and non-destructive** (it updates existing settings' parameters, never deletes), unlike the role-action seeder above.

## The 4th notification edit: `NotificationTemplate.code` is validated against the `SystemActions` enum (2026-07-12)

> [!danger] `SIT_IN_MOVED` and `Assessment Assessor Assigned` shipped mute for 9 days. The three-edit rule above was **incomplete** — and I only found out by reading a startup log Qusai pasted.
> `notification-template.schema.ts:8` is `@Prop({ unique: true, enum: SystemActions })`. The template `code` is therefore not a free string — it must **also exist as a `SystemActions` enum member**. `SIMV` and `ASNAR` never were, so Mongoose rejected the template on create:
> ```
> NotificationTemplate validation failed: code: `SIMV` is not a valid enum value for path `code`.
> ```
> No template → `seedNotificationSettings` can't create the setting → `sendNotification` no-ops on the missing setting. **Dead at three layers, and the only trace is a `console.error` at boot** that nobody reads. Fixed by adding `SIT_IN_MOVED = "SIMV"` and `ASSESSMENT_ASSESSOR_ASSIGNED = "ASNAR"` to `SystemActions` (`enums.ts`); both then seeded on the next boot.
>
> **How to check a notification is actually live** (don't assume): query `notificationsettings` + `notificationtemplates` for the name/code, and grep the boot log for `not a valid enum value` / `No mapping found` / `Action not found`. All three failure modes are silent at runtime.

## The notification seeder only re-syncs `parameters` — `destination` drift is permanent (2026-07-12)

> [!warning] Editing `destination` in `notification-settings.json` for an already-seeded setting is a **silent no-op, forever**
> `seedNotificationSettings` takes an early `continue` on any existing setting after syncing **only `parameters`** — it never updates `destination`, `action`, or `notificationTemplate`. The seed file says "Assessment Pending TM Review" goes to `["TM", "SA"]`; the DB row still says `["TM"]` from its first seed, so **Super Admins never receive it** no matter what the JSON claims. 67 settings are "synced" on every boot, parameters only — so any of them can be drifted the same way.
>
> Fixing it properly means making the seeder sync `destination` too, which would overwrite destinations deliberately customized in the DB. **Unresolved — needs a product call.**
