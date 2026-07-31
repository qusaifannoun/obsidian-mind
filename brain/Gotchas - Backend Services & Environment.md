---
date: 2026-07-28
description: "tat-app-ws service-layer and environment traps — seeding, notification plumbing, API contract shapes, and which database an environment actually points at"
tags:
  - brain
---

# Gotchas - Backend Services & Environment

Split out of [[Gotchas]] on 2026-07-28, which had reached 96KB. Entries moved verbatim; [[Gotchas]] keeps the one-line index. **Add new entries here, not to the index.**
## `dev` and `staging` are the same database in this project — not two environments (2026-07-28)

> [!warning] The vault says "staging deploys from `dev`". That describes the **branch**, not the data store — and reading it as two databases produced three confidently wrong warnings in a row
> The `tat-development.oemqsva.mongodb.net` cluster holds exactly one application database: **`tat-dev`** (the others are `questionbank`, `admin`, `local`). The `dev` branch, `api-dev.tat147.com`, and "staging" all point at it. So a migration run against `tat-dev` **is** the staging migration — there is no second run pending.
>
> Verify with a `listDatabases` call before reasoning about environment ordering; it is one read-only query and it settles the question. As of 2026-07-28 there is **no production environment at all** (Qusai) — `dev` is the only one. Context: [[Sequential User Number - Atomic Allocation & Backfill]].

## Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)

> [!danger] I shipped a wrong compliance number because the FE recomputed a rule the backend already owns
> The History Form's "Min 35 hrs / 2 years" badge was summed **client-side** from the mandatory-training rows. I asked Qusai whether the rule read mandatory training or training history, framed the question badly, got a reasonable answer to the wrong question, and rewired it to training history (`5159a07`) — which stores `durationHours: 0`, so the badge would have read **0 / 35 h for everyone**. A screenshot showing `56 / 35 h` is what caught it; I had changed a Part-147 number without checking it against real data.
>
> **The fix is not "revert" — it's to move the rule.** `calculateTrainingValidityHours` now computes the total on the backend (approved + non-expired, across the catalog *and* additional training) and returns it as `totalDurationHours`. The FE displays it and never recomputes. Same for the aircraft-qualification refresher date (`calculateAircraftRefresherDueDate`).
>
> **Rule: if a number is a business rule, the backend owns it and the FE renders it.** A duplicated rule doesn't just drift — it can be computing something else entirely while looking perfectly plausible. Two of the worst bugs this week were duplicated-rule bugs ([[Gotchas - TOR & Staff Management#The 35h/2yr badge summed the wrong collection (2026-07-12)|the collection mismatch]] and this one).

## A browser MIME type is not a file extension — assessment video upload never worked (2026-07-12)

> [!warning] The FE sends `file.type` (`video/mp4`); the backend compared it to bare extensions (`mp4`). Nothing could ever match, so **every** upload 400'd.
> `assertValidVideo` normalised `fileType` and checked it against `STAFF_ASSESSMENT_VIDEO_EXTENSIONS = ["mp4","webm","mov",…]`. The browser's `File.type` is a **MIME type**, so `"video/mp4" !== "mp4"` — the whitelist was unreachable and the feature had never once worked. Widening the whitelist would have fixed nothing.
> **Validate the uploaded `fileKey`'s extension, not the browser's MIME.** The backend already rewrites extensions on upload (see [[Gotchas - Frontend#tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original]]), so the key is the authoritative source. The browser's MIME is *also* unreliable — it's frequently an empty string for `.mkv`/`.avi`.

## Notification URLs baked at seed time + skip-existing seeding = env-var changes silently ignored (2026-07-09)

> [!danger] Setting `STAFF_MANAGEMENT_URL` after the first seed never took effect — staff-management notification links kept pointing at the dashboard host
> Two [[tat-app-ws Backend]] behaviors compounded into a "we added the env var but links are still wrong" bug:
> - **Bootstrap resolved the base URL *once, at seed time* and stored it as an absolute URL.** `bootstrap.service.ts` called `generateNotificationUrl(param.url, {}, {clientApp})` while seeding, baking e.g. `https://<base>/staff/{{userId}}` into `NotificationSetting.parameters[].url`. If `staffManagementUrl` was empty when the settings were first seeded, `resolveClientBaseUrl` fell back to `dashboardUrl` — so the rows permanently held the dashboard host.
> - **Re-seeding skips any setting whose name already exists** (`if (settingExists) { skippedCount++; continue }`). So adding `STAFF_MANAGEMENT_URL` later and rebooting did **nothing** — bootstrap never re-processes existing rows.
> - **The runtime resolver was dead code.** `sendNotification` re-calls `generateNotificationUrl` on the stored URL and *does* pass `param.client` as context — but `generateNotificationUrl` only resolves a base when `!url.startsWith("http")`. Since the stored URL was already absolute, the guard was skipped and the send-time context never mattered.
>
> **Fix (option A, 2026-07-09):** stop baking — store the **relative** `param.url` + `client` on the setting, and let `sendNotification` resolve the base per-client on every send. Plus a migration (`2026-07-09-relativize-notification-urls.js`) to relativize the already-baked rows so the runtime resolver takes over. Future host changes now just work with a redeploy. Deleted the earlier `2026-07-08-repoint-staff-notification-urls.js` (it re-baked absolute — re-running it would reintroduce the bug).
>
> **Two general rules:** (1) **resolve environment-dependent values at use time, not at seed/write time** — anything baked into a DB row on first seed is frozen against whatever config existed then, and idempotent-skip seeders never refresh it. (2) When a re-runnable seeder is **skip-if-exists**, changing the seed data (URLs, params) is a **no-op on existing rows** — you need a migration, not a reboot. Same shared-DB re-seed family as [[Gotchas - Backend Services & Environment|Booting tat-app-ws against a shared DB re-runs ALL seeders — role-action seeding is DESTRUCTIVE]] against a shared DB re-runs ALL seeders — and role-action seeding is DESTRUCTIVE (2026-07-07)|the destructive role-action seeder]]. Context: [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]].

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

## TAT backend user: `role` is an OBJECT, not a string

The `/auth` user object (same across [[tat-portal]] / [[tat-ws]] / [[tat-prereq]]) has **`role: { _id, code, name }`** — the role code lives at `role.code` (e.g. `'SA'`). There's also `secondaryRoles: UserRole[]` and an `activeRole` code (users can hold/switch multiple roles), and the id field is **`_id`**, name is **`familyName`** (not `lastName`). Gating with `user.role === 'SA'` silently fails (object ≠ string) — it bit the [[TAT-409 Staff Management Subsystem|Manage Staff]] SA gate: a real super-admin login was wrongly shown "access restricted." Correct check: `user.role?.code === 'SA'` (or look across `activeRole` + `role.code` + `secondaryRoles[].code`). Mirror tat-portal's `User`/`UserRole` types verbatim rather than inventing a `{ role: string }` shape.

## Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)

Driving the [[TAT-432 Staff Profile]] create/edit forms against staging surfaced three backend-contract mismatches — all silently shipped because the FE-first build had no live backend to test against:

- **`nationalIdImage` is REQUIRED on create**, not optional. `POST /auth/internal-user/signup` without it → `400 "nationalIdImage must be a string"`. The FE schema had it `optional`. Fix: per-mode schema (`superRefine` requires it on create, optional on edit so an unchanged image is kept).
- **`POST /file/upload-file` returns `{ Location, Key }` (capitalized, S3-style)** — NOT `url`/`fileUrl`/`key`/`data.url`. The FE's `uploadFile` parsed only the lowercase shapes, so it returned `''` → the image got omitted from the body → create failed **even with an image selected**. This bites EVERY upload in the subsystem (documents TAT-412/413, forms, assessment video). Always read `data.Location` first. Note: the returned S3 key contains `bucket/undefined/...` — a backend quirk, harmless.
- **`officeLocation` is an OfficeLocation ObjectId, not free text.** Sending `"HQ"` → `500 "Cast to ObjectId failed for value \"HQ\" at path \"_id\" for model OfficeLocation"`. Source the value from `GET /office-location` (`[{ _id, name, cityId{name} }]`) as a select keyed by `_id`, and **omit the field entirely when blank** (a blank string also fails the cast). On read, `/user/details` returns `officeLocation` populated as `{ _id, name }` — store the `_id` for the form, carry the `name` separately for display.

Method note: every real-staging path in `tat-prereq` is gated on `getAccessToken()`; with no session the fetchers silently return dummy data. To verify "against staging" you MUST be logged in — otherwise you're only exercising the offline fallback. Context: [[TAT-432 Staff Profile]], [[TAT-409 Staff Management Subsystem]].

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
