---
date: 2026-07-28
description: "tat-app-ws service-layer and environment traps — API contract shapes, serializers, queues, schedule mapping, and which database an environment actually points at"
tags:
  - brain
---

# Gotchas - Backend Services & Environment

Split out of [[Gotchas]] on 2026-07-28, which had reached 96KB. Entries moved verbatim; [[Gotchas]] keeps the one-line index. **Add new entries here, not to the index.**

Seeding and notification entries moved verbatim to [[Gotchas - Seeding & Notifications]] on 2026-09-15, when this note reached 25KB. **Add seeding and notification entries there.**

## `cache-manager` v3 `ttl` is SECONDS — a helper returning ms made a 30-day Redis TTL ~82 years (2026-09-20)

> [!danger] `refreshTokenInMinutes()` was named for minutes, its body returned **milliseconds**, and `cacheManager.set(key, val, { ttl })` wanted **seconds**. `30d` → `2_592_000_000` seconds ≈ 82 years. Every refresh token written to Redis was effectively immortal.
> Three different units in one call chain, and nothing fails loudly — an over-long TTL just silently never expires. Fixed by `parseDurationToSeconds` + `refreshTokenTtlSeconds()`/`accessTokenTtlSeconds()` across all 7 call sites, including the logout access-token blacklist, which had the same bug and so blacklisted forever instead of for one token lifetime.
>
> **Deploying the fix changes live behaviour**: sessions that previously never expired start expiring at the configured lifetime. See [[Expired Sessions Undetected Across All TAT Frontends]].

## The Redis cache silently falls back to in-process memory — and refresh tokens live in it (2026-09-20)

> [!warning] `apps/api/src/app/cache-db/cache-db.module.ts:14-20` probes Redis with a 2s TCP connect and, on any failure, returns `{ ttl: 0, max: 100 }` — an in-process LRU. It logs `"Redis is not available. Using memory cache."` and boots normally.
> Refresh-token validity is a cache lookup, so on the fallback path: tokens vanish on every restart or redeploy, are invisible to any other ECS task behind the load balancer, and are **LRU-evicted past 100 entries**. Each one makes `refreshToken()` throw `invalidToken` and logs the user out for no visible reason.
> Noticed while tracing session expiry; **not fixed** — it is an infra/config decision. Check that boot log before diagnosing any "random logout" report.

## `Schedule.createdBy` is whoever scheduled the course, not who created it — and `Course.createdBy` isn't in any course response (2026-09-15)

> [!warning] Two `createdBy` fields, two different people
> Every scheduled period of a course carries `createdBy` = the user who ran the scheduling. `Course.createdBy` is set once, in `create` (`course.service.ts:817`), and **neither `GET /courses/:id` nor `/courses/all` returns it** — so the only `createdBy` visible from the API on a course's data is the wrong one. Mistaking the scheduler for the creator nearly ruled out the real cause of a missing invigilator.
>
> **Rule: when a filter excludes "the course creator", read `courses.createdBy` in the database** — the API cannot answer it. Source: [[Compose Exam Invigilators - Course Creator Silently Excluded]].

## A scheduled exam period has no chapters and no day — its template period is found only by date rank + period number (2026-09-15)

> [!warning] `Schedule` rows store `date` + `period`; `CourseSchedule` stores periods under `dayNumber`. Nothing links them directly.
> Scheduling writes `topic` only for CHAPTER periods — **exam `Schedule` rows get `topic: null`** — so an exam period cannot be matched to its template by chapter. It sorts template days by `dayNumber` and gives each its own date, so the template day is **the rank of the period's date among the course's scheduled dates**. Use `CourseService.getCourseDayNumbers` + `scheduleDateKey` (`4b8b3e79`) rather than re-deriving it.
>
> **Matching on `periodNumber` alone is wrong** whenever the same period number carries an exam on more than one day ("Exam 1" on days 1, 2 and 3). **A day index computed over a filtered query is not a course day** either — `getAllPeriods` counted exam-only dates as 1, 2, 3.
>
> The rank assumes every template day produced a date and dates keep their order after rescheduling. Source: [[Compose Exam - Period Chapters, Course Reset & Day Labels]].

## `/courses/my-courses/:id` is participant-only — a staff screen cannot reuse the trainee course/schedule payload (2026-09-13)

> [!warning] Admins and training managers get a 403 from the endpoint that carries the trainee schedule
> `getMyCourseById` throws `FORBIDDEN` ("User is not enrolled in this course or assigned as an instructor") unless the caller has an `ENROLLED`/`PENDING` enrollment **or** a `schedule` row as `instructorId`. The route's `@Roles(...SystemRolesCodes)` lists every role, which makes it look staff-callable — the gate lives in the service, not the decorator.
>
> The obvious staff substitute, `GET /schedule/course/:courseId`, is **not the same data**: no `dayNumber`, no `examiner`, no fallback to the `CourseSchedule` template. For the same view as trainees, go through `CourseService.getCourseSchedules()` — now exposed to staff as `GET /courses/:id/schedule` (`9e5bd7e7`) and to everyone as `GET /courses/public/:id/schedule` (`cb77bb27`), both undeployed as of 2026-09-15. Source: [[Course Details Show Schedule]].

## `evidenceFileKey` without its type/size NULLS both on the stored record (2026-08-23)

> [!danger] `updateAdditionalTraining` writes all three evidence fields whenever the key is present — the two it wasn't given become `null`.
> ```ts
> if (nextEvidenceKey) {
>   record.evidenceFileKey = nextEvidenceKey;
>   record.evidenceFileType = dto.evidenceFileType?.trim() ?? null;
>   record.evidenceFileSize = dto.evidenceFileSize ?? null;
> }
> ```

`staff-history-mandatory-training.service.ts:252` (History Form additional training). Send `{ evidenceFileKey }` alone — the obvious way to say "the certificate is unchanged" — and the file's type and size are **silently wiped** while the key survives. The record still points at a real file; the metadata describing it is gone.

The trap is baked into the FE type: `AdditionalTrainingItem` carries `evidenceFileKey` but **not** `evidenceFileType`/`evidenceFileSize`, so a caller wanting to resend the existing key *cannot* resend faithful metadata — it doesn't have it. [[Additional Training Edit - History Form Row Action]] sidesteps this by always uploading a fresh file on a non-privileged edit, which is a workaround, not a fix.

**Rule: a partial write that keys off one field but assigns a group rewrites the whole group.** Check what a `if (x) { … }` block assigns, not just what it reads. See also [[Gotchas - Backend Schema & Data]] for the sibling trap where spreading a Mongoose subdocument drops nested arrays.

## BullMQ silently discards an `add()` whose `jobId` still exists — a retained completed job blocks every later enqueue (2026-08-12)

> [!danger] `queue.add()` with a custom `jobId` that already exists in Redis — **in any retained state, including completed** — creates nothing, runs nothing, and **resolves as though it succeeded**.
> `addStandardJob-9.lua:89` short-circuits to `handleDuplicatedJob`, which emits a `duplicated` event and `return jobId`. So the caller's `.then()` fires and logs success; `.catch` never runs. **The drop is invisible and looks like a queue.**
>
> The TOR sync paired a fixed `jobId: \`tor-sync-${torId}\`` with `removeOnComplete: { age: 24h }` and `removeOnFail: { age: 7d }`, so **the key outlived the job**. One early sync ran while the TOR was incomplete, persisted `draft`, completed — and every approval for the next 24 hours enqueued a job Redis threw away. Result: 40 TORs across 18 staff, **0 active**, for weeks. See [[TOR Sync Never Re-Ran - Stale BullMQ Job Id]].
>
> **The rule: a fixed `jobId` is a lock on that id for as long as the key is retained, not just while the job runs.** If you dedupe by id, the retention window must be shorter than the interval between legitimate re-enqueues — in practice `removeOnComplete: true`. Retention for forensics and dedupe by id are mutually exclusive; pick one.
>
> **The tell is a silent no-op with healthy logs.** Worker alive, completions recorded, triggers firing, nothing happening. When a queued side effect stops occurring but nothing errors, check whether the job was ever *created*, not whether it *ran*.
>
> Generalises past BullMQ: any idempotency key that outlives its operation converts "run once per event" into "run once, ever, per key".

## A deny-list sanitizer exposes new fields by default; an allow-list DTO hides them — the same field needs opposite work on each path (2026-08-02)

> [!warning] Surfacing `staffNumber` on two screens looked like two backend changes. It was **one** — and knowing which one cost a single read per path.
> [[tat-app-ws Backend]] serializes users two different ways, and they have **opposite defaults**:
>
> - **`sanitizeUser` is a deny-list** — it strips `password`, `__v`, `resetPassToken`, `emailToken` and passes everything else through. `/user/details/:id` uses it, and `getMyProfile` spreads two objects that already carry the field. **New schema fields appear on these paths with no code change at all.**
> - **`StaffCatalogItemDTO` is an allow-list** — a field that isn't mapped doesn't exist to the client. `listStaffProfiles` needed an explicit addition.
>
> **The rule: check the serializer, not the screen count.** "Two surfaces need this field" says nothing about how many changes it takes — the answer is per-path and depends entirely on which strategy that path uses. Assuming symmetry doubles the estimate; assuming a deny-list everywhere ships a permanently empty column.
>
> **The security half is the same fact read the other way.** A deny-list means every field added to the schema is public until someone remembers to strip it — the sanitizer is a list of what's secret, and it is only correct on the day it was written. When adding a sensitive field, the deny-list is part of the change's blast radius; nothing will fail if you forget. See [[TAT-449 Staff Number Display - Unpadded staffNumber]].

## `dev` and `staging` are the same database in this project — not two environments (2026-07-28)

> [!warning] The vault says "staging deploys from `dev`". That describes the **branch**, not the data store — and reading it as two databases produced three confidently wrong warnings in a row
> The `tat-development.oemqsva.mongodb.net` cluster holds exactly one application database: **`tat-dev`** (the others are `questionbank`, `admin`, `local`). The `dev` branch, `api-dev.tat147.com`, and "staging" all point at it. So a migration run against `tat-dev` **is** the staging migration — there is no second run pending.
>
> Verify with a `listDatabases` call before reasoning about environment ordering; it is one read-only query and it settles the question. As of 2026-07-28 there is **no production environment at all** (Qusai) — `dev` is the only one. Context: [[Sequential User Number - Atomic Allocation & Backfill]].
>
> **Corollary (2026-08-01): investigation is not read-only here.** `GET …/tors/:torId/certificate` **creates a draft shell as a side effect** — a read endpoint that writes. With one database serving every environment, *merely browsing a TOR seeds `tor_certificate` rows in the only real data store*. Before poking an unfamiliar GET on this project, assume it may be a lazy-create (`ensureForUser` is the established idiom — the History Form does the same) and check the service, not the verb. See [[TAT-450 TOR Certificate FE - Read Path Only]].

## Send the enum's *name*, not the object's `_id` — `courseMethod` is `@IsEnum`, the course carries `{_id, name}` (2026-08-01)

> [!danger] Reusing the value the way the neighbouring form does is a **400**
> `courseMethod` on the instructor-eligibility DTO is `@IsEnum(TrainingTypesEnums)` — it wants the literal string `"Theoretical"` or `"Practical"`. But a **course** carries `courseMethod` as `{ _id, name }`, and the **course forms submit the `_id`**. So the obvious move — copy what the form next door sends — fails validation.
>
> **The general shape: one field name, two projections.** The relational shape (`{_id, name}`) and the enum shape (`"Theoretical"`) are the same concept at different layers, and nothing in the type of the object in hand tells you which the endpoint wants. **Read the DTO decorator before reusing a value across endpoints**, especially when the field name matches exactly — the matching name is what makes the wrong shape feel safe. Companion to the class-validator whitelist question in [[Aircraft Category Filter - TOR Matrix]] (an unknown param is silently *dropped*; a known param of the wrong shape *400s* — two different failure modes for the same mistake). See [[TAT-454 Instructor Assignment Filtering - courseMethod]].

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
> **Validate the uploaded `fileKey`'s extension, not the browser's MIME.** The backend already rewrites extensions on upload (see [[Gotchas - Frontend Data & API Contracts#tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original]]), so the key is the authoritative source. The browser's MIME is *also* unreliable — it's frequently an empty string for `.mkv`/`.avi`.

## TAT backend user: `role` is an OBJECT, not a string

The `/auth` user object (same across [[tat-portal]] / [[tat-ws]] / [[tat-prereq]]) has **`role: { _id, code, name }`** — the role code lives at `role.code` (e.g. `'SA'`). There's also `secondaryRoles: UserRole[]` and an `activeRole` code (users can hold/switch multiple roles), and the id field is **`_id`**, name is **`familyName`** (not `lastName`). Gating with `user.role === 'SA'` silently fails (object ≠ string) — it bit the [[TAT-409 Staff Management Subsystem|Manage Staff]] SA gate: a real super-admin login was wrongly shown "access restricted." Correct check: `user.role?.code === 'SA'` (or look across `activeRole` + `role.code` + `secondaryRoles[].code`). Mirror tat-portal's `User`/`UserRole` types verbatim rather than inventing a `{ role: string }` shape.

## Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)

Driving the [[TAT-432 Staff Profile]] create/edit forms against staging surfaced three backend-contract mismatches — all silently shipped because the FE-first build had no live backend to test against:

- **`nationalIdImage` is REQUIRED on create**, not optional. `POST /auth/internal-user/signup` without it → `400 "nationalIdImage must be a string"`. The FE schema had it `optional`. Fix: per-mode schema (`superRefine` requires it on create, optional on edit so an unchanged image is kept).
- **`POST /file/upload-file` returns `{ Location, Key }` (capitalized, S3-style)** — NOT `url`/`fileUrl`/`key`/`data.url`. The FE's `uploadFile` parsed only the lowercase shapes, so it returned `''` → the image got omitted from the body → create failed **even with an image selected**. This bites EVERY upload in the subsystem (documents TAT-412/413, forms, assessment video). Always read `data.Location` first. Note: the returned S3 key contains `bucket/undefined/...` — a backend quirk, harmless.
- **`officeLocation` is an OfficeLocation ObjectId, not free text.** Sending `"HQ"` → `500 "Cast to ObjectId failed for value \"HQ\" at path \"_id\" for model OfficeLocation"`. Source the value from `GET /office-location` (`[{ _id, name, cityId{name} }]`) as a select keyed by `_id`, and **omit the field entirely when blank** (a blank string also fails the cast). On read, `/user/details` returns `officeLocation` populated as `{ _id, name }` — store the `_id` for the form, carry the `name` separately for display.

Method note: every real-staging path in `tat-prereq` is gated on `getAccessToken()`; with no session the fetchers silently return dummy data. To verify "against staging" you MUST be logged in — otherwise you're only exercising the offline fallback. Context: [[TAT-432 Staff Profile]], [[TAT-409 Staff Management Subsystem]].
