---
date: 2026-06-04
description: "Recurring patterns and conventions discovered across work — architecture, naming, tooling, and implementation patterns"
tags:
  - brain
---

# Patterns

Recurring patterns discovered across work.

## Vault-state drift is asymmetric — bias every doubt toward NOT-DONE (2026-07-23)

When the vault's record of what's done drifts from reality, the two directions cost wildly differently, so the verification model should be **asymmetric**:

- **Dangerous — vault says DONE when it isn't.** The [[TAT Delivery Orchestrator|orchestrator DAG]] consumes a **false satisfied dependency** and builds downstream on it; the failure surfaces far from its cause.
- **Cheap — vault says NOT DONE when it is.** The agent just redoes finished work. Wasted cycles, no corruption.

**Rule: bias every doubt toward NOT-DONE.** A stale "unverified" is a redo; a stale "verified" is a landmine. Corollary: `verified` is a *timestamp, not a property* — it says when it was checked, not that it still holds (see [[Gotchas#"Verified" is a timestamp, not proof the fact still holds — and a consistency gate rejects corrections as readily as errors (2026-07-23)]]). Make re-verification mechanical (a code pointer → grep/CI) so a claim can *expire* when its pointer moves. Full design: [[Vault Provenance & Verification Model]]. Same spirit as [[Agent Handoff Protocol]] — verified must mean *exercised*, not built.

## Route each spec-gap kind to the stage that catches it cheapest (2026-07-23)

Design rule for the [[TAT Delivery Orchestrator|delivery pipeline]]: spec gaps are **three kinds, each cheapest to catch at a different stage** — pushing all three to end-stage QA is the most expensive place to find any of them.

- **Traceability gap** (spec says it, code doesn't) → **automate**: every AC → ≥1 test → ≥1 code path.
- **Conventional omission** (forgot "forgot password", forgot undo) → a **grilling agent**.
- **Contextual intent** (the client-specific *why*) → **human only**, *mined* by the grilling agent — it can surface the question but never answer it.

The grilling agent needs **fixed lenses, not vibes**: (1) where two rules collide, (2) whether A-then-B differs from B-then-A, (3) what "must update X" silently excludes. It **asks before suggesting an answer** (a suggested answer gets rubber-stamped instead of yielding real intent), **terminates in a written artifact** (resolved rules appended as new ACs, not a chat log), and **only asks about ambiguities that would change code or a test assertion** (the stopping rule). Full design: [[Spec Gap Taxonomy & Grilling Agent]].

## TAT bugs often live in a Word doc, not Jira — never back-fill a ticket number (2026-07-16)

Convention (Qusai, 2026-07-16): a large share of TAT bug/task work is written up in a **Word document**, not on Jira. When a `/om-dump` (or any handoff) arrives with **`Ticket: —`**, that means there is no ticket — **leave the ticket field blank; do not infer a Jira number from the feature or a related note.** I did exactly that once — labelled an assessment-audit backend item `Ticket: TAT-423` because it touched the assessment feature — and it was wrong; the item wasn't on Jira at all.

- Real ticket numbers come **only** from an explicit `Ticket:` value or the TAT-410→435 ticket sweep already recorded in [[TAT-409 Backend Open Items]] — not from feature association.
- If a dumped bug clearly *should* have a ticket but doesn't, note it as an open question; don't manufacture one. Reference the **feature** note instead (e.g. `Feature: [[TAT-423 Assessment Report Rubric]]`), which carries the association without falsely claiming a ticket.

## No comments or ticket numbers in code (all TAT repos)

Hard rule (Qusai, 2026-07-07): **do not leave comments in any code file I write or touch — and never write ticket/task numbers (e.g. `// TAT-409`) into the code.** Qusai's feedback: it leaves too many comments and task numbers behind, which makes the code look bad. Write self-explanatory code (clear names) instead of explanatory comments.

- Applies to every repo: [[tat-app-ws Backend]], [[tat-ws]], [[tat-prereq]], [[tat-portal]], [[tat-website]].
- Covers new code **and** files I edit — don't add comments while I'm in there. (Don't strip *pre-existing* comments unless asked; the rule is about what *I* add.)
- Ticket numbers live in commit messages / the vault work notes, **not** in source.
- Only exception: Qusai explicitly asks for a comment in a specific spot.
- **Re-emphasized 2026-07-08** (raised again, firmly) after I shipped the notification-system code full of explanatory comments. Default to **zero comments** from the first line — don't write them and then strip later. Self-documenting code only.

## Propose before implementing — don't jump to code (Qusai, 2026-07-07)

When Qusai asks *"what can we do"*, *"what is the fix"*, *"can we…"*, or otherwise asks about **options/approach**, that is a **discussion**, not a go-ahead. **Do not edit files until he explicitly says to implement.** He'll say "fix it", "do it", "go ahead", or similar. Present the options, recommend one, and **wait**.

- Bitten twice on 2026-07-07: implemented the Form 285 comment cleanup and later started editing `bootstrap.service.ts` for the `instanceKey` backfill before being asked — both times he interrupted.
- Applies across repos ([[tat-app-ws Backend]], [[tat-prereq]], et al.). Investigating/reading is fine; **writing** needs a green light.
- Pairs with [[Patterns#No comments or ticket numbers in code (all TAT repos)]] — both are about respecting his control over what lands in the code.

## Git workflow — commit to `dev` (TAT repos)

The TAT repos ([[tat-prereq]], [[tat-app-ws Backend]], et al.) use **`dev`** as the shared integration branch — **commit directly to `dev`**, no feature branches, no PRs (corrected 2026-07-09; the note previously said `main`, but all real work — this session and prior — lands on `dev`, and staging deploys from it). When work is done on a throwaway branch, fast-forward `dev` to it and delete the branch. **Push to `origin/dev` when asked** — Qusai directs pushes explicitly ("push", "commit and push"); don't push on your own. Still end commit messages with the `Co-Authored-By` trailer, and keep commits focused — **leave Qusai's own uncommitted edits out** (he often has in-progress polish in the same files; stage only the files for the task at hand). Note: `origin/dev` sometimes already contains a just-committed SHA (a push returns "Everything up-to-date") — verify with `git branch -r --contains <sha>` rather than assuming the push failed.

## Staff Management is wired to real `/staff-management/*` APIs

As of 2026-06-18, the [[TAT-409 Staff Management Subsystem|TAT-409]] FE dummies have been **replaced with the real backend** (staging Swagger): staff-management-login, TOR matrix/details/pending, tor-documents, Form 285, Form 32 (rebuilt schema-driven), profiles catalog + `profiles/me`, qualifications, assessments, deactivate. Read paths verified vs staging; write paths wired but largely unexercised. The "FE-first dummy-data layer" pattern below is now historical for this subsystem (History + Assessment *forms* remain dummy — no backend). Instructor self-service is wired but **backend-blocked**: the instructor role 403s on `profiles/me` / `tor-documents` / `qualifications` until granted those actions server-side. Rule going forward: **FE follows the backend contract; align the FE to a ticket once its backend is approved.**

## The backend owns business rules; the frontend renders the answer (2026-07-12)

If a number or date encodes a **rule** — a compliance total, a validity window, a due date — it is computed **once, server-side**, and returned. The FE displays it and never recomputes it.

- **35h / 2-year total** → `calculateTrainingValidityHours` on the backend, returned as `totalDurationHours` on the mandatory-training response.
- **Aircraft refresher due date** → `calculateAircraftRefresherDueDate` (= expiry − 1 month), returned as a derived `refresherDueDate`.
- **Training due date** → `calculateTrainingDueDate` (= accomplished + 2 years); the FE mirrors it *only* as a live preview in the add-form, never as the stored value.

**Why this is a rule and not a preference:** a duplicated business rule doesn't merely drift — it can be computing something else entirely while looking completely plausible. Both of the worst bugs of the week were duplicated-rule bugs (see [[Gotchas#Don't reimplement a business rule in the frontend — compute it server-side and return the answer (2026-07-12)]]). A number that comes off the API can be wrong once; a number the FE derives can be wrong *differently* from the one eligibility actually uses, and nothing will ever reconcile them.

## One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)

The pattern above is the FE-vs-BE case. The **general** rule is stronger, because the third instance this week was entirely inside the backend:

> **TOR activation** was implemented twice in the same codebase — six gates in `staff-tor-sync.processor` (the writer), three gates in `evaluateTorCompletion` (the reader). The reader said `ACTIVE`; the writer said `DRAFT`. See [[Gotchas#The TOR "is it active?" rule was written TWICE — the reader lied and the writer was right (2026-07-12)]].

Three duplicated-rule bugs in one week, all with the same shape: **each copy is individually plausible, so nothing looks broken — and the mismatch surfaces as a downstream symptom that points somewhere else entirely** (a blank date, a 0/35h badge, a wrong compliance number). Nobody ever gets an error.

**Rule:** if two places need the same decision, extract it — a shared util (`staff-tor-activation.util.ts` → `resolveTorStatusFromGates`), and both call it. Not "keep them in sync"; there is no in-sync, only not-yet-drifted.

**Smell to grep for:** the same set of boolean gates `&&`-ed together in more than one file. And when a read path and a write path both decide the same thing, the **writer is the source of truth** — reads should report the persisted value, not recompute it.

## All tat-prereq forms must use Zod + react-hook-form — I violated this repeatedly (2026-07-12)

[[tat-prereq]] has the infrastructure and most forms follow it. **My TAT-423/Form-32 code did not**, and Qusai caught it.

The rule is stated in the repo, in the docstring of `src/hooks/use-zod-form.ts`:

> *"All forms in this project must use this hook — never `useForm()` directly."*

- **`useZodForm({ schema, defaultValues })`** — every form. Validation is a Zod schema, never ad-hoc truthiness (`canApprove = !!name.trim() && !!signedAt`).
- **`src/components/ui/RHFInput/`** — `InputField`, `SelectField`, `TextArea`, `DatePickerField`, `FileInput`, `SearchableSelectField`, `Checkbox`, `Radio`, `PhoneInputField`, `CountrySelectField`, `TimePickerField`, `ControlledDatePicker`, `FormFieldWrapper`. **Never hand-roll a field component** — check this folder first.

**Why I missed it:** the rule lives only in a hook's docstring — there is no `CLAUDE.md`/`AGENTS.md` in `tat-prereq`. That's the actual root cause, and it will keep biting until the convention is written down in the repo. Refactor tracked in [[tat-prereq Forms Refactor - Zod + RHF]].

> [!done] Resolved 2026-07-14 — and the 2026-07-12 audit above was wrong twice.
> The repo now has a `CLAUDE.md` + `AGENTS.md` (`992d812`). The compliance audit I wrote here listed **two** violators and cleared `HistoryFormView`/`SitInSection`; a repo-wide grep found **six**, including both of those. See [[tat-prereq Forms Refactor - Zod + RHF]] and [[Gotchas#A form with a schema can still be unvalidated — partial Zod compliance looks clean and isn't (2026-07-14)]].

## A convention that lives only in a docstring is unreachable — write it where startup reads (2026-07-14)

The Zod+RHF rule was stated clearly, imperatively, and in exactly one place: a docstring inside `src/hooks/use-zod-form.ts`. You only read it if you already opened the hook you were supposed to know to use. **The rule was unreachable, not ignored** — six files broke it, mine included, and I would have followed it had I seen it.

**Rule:** a convention only exists if it lives where an agent or a new dev reads *at startup* — `CLAUDE.md`, `AGENTS.md`, `.cursorrules`. Anywhere else (a docstring, a wiki page, a Slack message, one reviewer's memory) it is decoration, and the violation it produces is the *repo's* fault, not the author's.

**Corollary — fix the reachability before the code.** The refactor's first commit added the `CLAUDE.md`, then swept the six files. Sweeping first would have left the rule just as unreachable, and the seventh violation would already be on its way. This is the same shape as [[Agent Handoff Protocol]]: put the instruction where the reader actually starts.

**Smell to grep for:** an imperative in a code comment — *"must"*, *"never"*, *"always"* — in a repo with no agent-readable rules file. That comment is a rule that has already failed.

**But a rules file is code, and it rots just as fast — with nothing to typecheck it.** Two days after the `tat-prereq` CLAUDE.md was written, it still advertised `ControlledDatePicker`, a component the *same sweep* had deleted. An agent reading it would have reached for a component that no longer exists. **When you delete or promote a shared primitive, the rules file is part of the blast radius** — grep it by name in the same commit. Nothing else will catch it.

## A wired hook with an empty branch is where a feature is supposed to live (2026-07-12)

Twice this week the "missing feature" was an existing, already-fired hook whose non-matching branch just `return`ed:

```ts
const courseCode = await findCourseCodeByOnlineCourseId(onlineCourseId);
if (!courseCode) return;   // ← not a mandatory refresher? do nothing at all
```

`applyOnlineCourseCompletion` was already called on every completion from **both** the progress and exam services. Completing one of the 5 mandatory refreshers filled its slot; completing **anything else silently did nothing**. The new auto-add-training-record feature is that `return` replaced with a branch — no new hook, no new call site.

**When asked for "X should happen when Y happens", grep for the Y handler first.** The plumbing is usually already there and already fired, with a bare `return` where the behaviour belongs. Sibling of [[Gotchas#An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)]].

## Staff subsystem section placement: per-instructor lives on the profile (+read-only TOR mirror), per-license lives in the TOR (2026-07-09)

Where a section renders in [[tat-prereq]] follows its **data ownership**, confirmed with the BA and grounded in the backend endpoints:

- **Per-instructor / shared-across-TORs** → the section's home is the **profile** (`/staff/[id]`); each TOR shows a **read-only mirror** linking back. Applies to the **History Form** (one shared form, auto-created on first TOR — `historyFormService.ensureForUser`) and **Initial TOR Documents** (synced across the instructor's TORs). The route already reflected this: `/staff/[id]/history-form` is a **sibling** of `/staff/[id]/tor/[torId]`, not nested under it. Mirror = a compact card (History) or the full read-only grid (Documents) on the TOR detail; editing stays on the profile.
- **Per-license / per-TOR** → the section **lives inside the TOR**, never aggregated on the profile. **Aircraft Qualifications** and **Assessments** are per-TOR on the backend (`GET /tors/:torId/aircraft-qualifications`, `/assessments`) — there is **no per-user list route**. The profile used to flatten them across all TORs into one list (mixing CARC/EASA/GCAA), which the BA flagged as confusing. Fix: removed the flattened profile cards + their `useStaffRecords` aggregating hooks; the TOR detail shows each TOR's own (via `TorQualifications` / new `TorAssessments`).

Rule of thumb: **check whether the backend exposes the data per-user or per-TOR** — that dictates the home. A per-user aggregate that fans out across TORs and flattens is a smell for something that should live in the TOR. Context: [[Form 32 Rejection History & Round-Scoped Stamps]] neighbourhood (same 2026-07-09 session), [[Gotchas#tat-prereq staff self-profile — stale mapper, dead per-user record endpoints, and an unmapped-enum crash (2026-07-08)]].

## History Form is now real + rendered as TAT Form 031 (2026-06-28)

The History Form is no longer dummy (updates the note above). The whole TAT-417/418/419/421 + [[TAT-429]] backend shipped and the FE was wired + verified against staging across roles:

- **One `HistoryFormView` (`/staff/[id]/history-form`) = the whole TAT Form 031 document.** Restructured from stacked cards into a single bordered document with centered `SectionBar`s, in the form's order: identity → Years of Experience → Part 66 → Type Training Course → Relevant Training History → Updated Training & Validity → Sit-ins & Successfully Assessed As → Special Notes → Certified by. Sections with **no backend** (License/Valid Until, Part 66, aircraft-qual editing, Certified-by) render as **disabled placeholders with a "pending backend" note** so the document is visually complete.
- **Wired sub-resources** (all `/staff-management/profiles/:userId/history-form/*` + `/sit-ins/*`): basic info (TM approve / field-reject), mandatory training (record → submit → approve / field-reject the 3 fields accomplishedDate/durationHours/evidence), training history (add → approve / reject-with-reason, with a Due Date column), sit-in (evaluator submit → TM final assessment). Hooks/fetchers in `src/api/Forms/*`; query keys per entity.
- **Gating is per-action, approximated by role** (the FE only has role codes, no action list): training history allows SA too (`isSuperAdmin || !isReviewer`); reviewer approve/reject shows for `isReviewer` on Pending items; the sit-in evaluator form shows only to the assigned `evaluatorUserId`.
  - **Correction (2026-07-12): the claim here that "mandatory training is instructor-only — SA lacks `SM_SAVE_MANDATORY_TRAINING`" was WRONG.** SA *has* that RBAC action (`bootstrap.service.ts:559`) and *is* in `MANDATORY_TRAINING_PRIVILEGED_EDITOR_ROLES` = `[SA, AD, QM, TM]`. A privileged **save auto-approves** (`status = APPROVED`) and requires **no evidence**; **submit** is owner-only and explicitly *rejects* privileged editors, because they never need it. The FE had only ever built the instructor path, so SA couldn't record training at all (fixed `53c775f`). **Had I trusted this note instead of reading the code, I'd have "fixed" it by adding a permission that already existed.** See [[Gotchas#An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)]].
- **404 = not-started**: the GET 404s until the form exists, so fetchers return an empty Draft / null on 404 (see [[Gotchas#History Form writes: privileged (SA) vs instructor paths differ — evidence is REQUIRED for the instructor (2026-06-28)]]).

Reusable shape going forward: **a multi-section form that maps 1:1 to a paper form = one document component + a `SectionBar` primitive + per-section sub-components**, each wired to its own endpoint and gated by the actor who fills it.

## FE-first dummy-data layer (tat-prereq)

Building [[tat-prereq]] FE pages ahead of the backend ([[TAT-409 Staff Management Subsystem|TAT-409]] is FE-only for now). To keep the swap-to-real trivial, dummy data is wired **through the real DI-fetcher + React Query pattern**, not faked in the component:

- `src/api/<Entity>/dummy-<entity>.ts` — fixtures (clearly marked ⚠️ DUMMY, "delete when backend exists").
- `src/api/<Entity>/fetchers.ts` — keeps the real `(client, params)` signature but returns the fixtures with a simulated delay. Going live = **one line**: `return client.get('/path').then(r => r.data)`.
- `src/api/<Entity>/use<Entity>.ts` — normal RQ hook injecting `apiClient`; components never know it's dummy.
- Search/filter done **client-side** in the view for now (small lists); move into fetcher `params` when the backend supports it.
- Example: `src/api/Staff/*` for the Manage Staff table (TAT-431).

**Where a real API already exists** (some do — see [[TAT-409 Staff Management Subsystem#Backend APIs — available vs held (staging Swagger, 2026-06-04)]]), the fetcher calls it when there's a **session** and falls back to dummy only when there's **no token** (offline FE dev / dev auth bypass): `if (!getAccessToken()) return DUMMY; return client.get(realEndpoint)...`. So logging in hits the real backend; no login renders dummy. Manage Staff uses `GET /user/all` this way.

## Confirm the backend can filter before wiring a frontend filter — an FE select for data the backend doesn't expose is a dead control

Before adding any filter control, trace the field to its source. A `<select>` is trivial to render, but if the field it filters on isn't in the response payload **and** isn't an accepted query param, the control is dead two ways over: you can't filter client-side (data absent) and a param the query DTO doesn't declare gets silently dropped by class-validator's whitelist. This is the inverse of the [[Staff Management - Unreachable Backend Endpoints|dead-endpoint]] class — there a working backend had no FE affordance; here an FE affordance has no backend data.

The [[Aircraft Category Filter - TOR Matrix|TOR Matrix B1/B2 filter]] (2026-07-16) looked like a one-line toolbar addition but `aircraftCategory` lived only on `StaffQualification` — not the TOR row, the matrix response DTO, or the query DTO — so it shipped full-stack: a new enum query param + a `qualificationModel.distinct("userId", { aircraftCategory })` intersect, mirroring the existing `aircraftTypeId` filter, then the FE select. When the matrix filters already run server-side, a new filter joins them **server-side** (see the dummy-data note above: "move filter into fetcher params when the backend supports it") rather than being bolted on in the view.

## Dev auth bypass (tat-prereq)

FE pages are auth-gated by `proxy.ts`, but FE-only dev has no backend session. A **dev-only, env-flagged** bypass (`NEXT_PUBLIC_DEV_AUTH_BYPASS=true`, **non-production only**) makes the proxy skip gating and `AuthHydrator` seed a dummy Super Admin, so role-gated pages render without logging in. Hard-disabled in prod (`NODE_ENV` guard). Default `false` in `.env.example`.

## Role gating (tat-prereq)

`useUserRole()` reads the role **code** from the Redux user and exposes `isSuperAdmin` (`roleCodes.includes('SA')`). The backend user carries `role` as an **object** (`role.code`), plus optional `secondaryRoles[]` and an `activeRole` code — the hook looks across all of them (see [[Gotchas]]). No-session dev access is handled by the proxy/AuthHydrator bypass (dummy SA), not a fallback in the hook. Pages gate on `isSuperAdmin` (e.g. Manage Staff renders an access-restricted state otherwise).

## Tables

Plain Tailwind tables styled with the shared theme tokens (no MUI X DataGrid / TanStack Table yet) — matches the [[tat-portal]] design system and needs no new dep. Revisit a headless table lib only if a later page (e.g. the TOR Matrix, TAT-433) needs heavy sorting/virtualization.

## Table row actions = kebab menu only

Hard rule (Qusai, 2026-06-04): **never expose row actions as bare icons/buttons**. Every table row's actions live in a **kebab (⋮) button → dropdown menu**, each item rendered as **icon + text**. Reusable component: `src/components/ui/RowActionsMenu.tsx` (Radix dropdown; takes `actions: { label, icon, onClick, destructive?, disabled? }[]`; trigger/menu items `stopPropagation` so a clickable row doesn't fire). The actions column header is empty (`sr-only "Actions"`). Used by the Manage Staff table (Edit; Deactivate etc. will be added as menu items, not new buttons).

> [!warning] No longer absolute (Qusai, 2026-07-16)
> Qusai explicitly asked to **replace the kebab with inline buttons** on the Initial-TOR-Documents list (→ [[History Form Buttons Unified - InlineAction Primitive#Sweep continued + kebab reversal (2026-07-16)]]). So the kebab-only rule is now the *default*, not a hard law: **inline tone-coded [[History Form Buttons Unified - InlineAction Primitive|InlineAction]] buttons are an accepted alternative when he asks for them.** Don't silently convert kebabs to inline (or vice-versa) — follow the explicit request per surface.

## tat-ws: always use the shared `Table` component

Standing rule (Qusai, 2026-06-28): in [[tat-ws]], **every table uses the shared `components/Table/Table.tsx`**. New tables are built with it; any existing hand-rolled `<table>` we touch gets **migrated** to it. Don't hand-roll `<table>`/`<thead>`/`<tbody>` markup in tat-ws anymore.

Why: the component bakes in the things hand-rolled tables keep getting wrong — `overflow-x-auto` (no columns clipped off-screen on narrow viewports — the bug that triggered this rule), built-in `TablePagination`, loading/empty states, consistent surface styling, and a portaled kebab (⋮) `TableActionDropdown` for row actions (which satisfies the kebab-only row-actions rule below).

API (import from `@tat-ws/components/Table`): `<Table<T> data columns pagination onPageChange onRowsPerPageChange isLoading emptyState showActionsColumn actions />`. Columns are `ColumnDefinition<T>[]`, each with a `render(value, item, index)` for custom cells (badges, buttons, nested components all fine). Row actions = `TableAction[]` or `(item) => TableAction[]`, each `{ id, label, onClick, variant?: 'default' | 'danger', disabled? }`. For server pagination feed `pagination={{ current_page, last_page, per_page, total }}` and wire `onPageChange`/`onRowsPerPageChange` (first migration: Manage Trainees, 2026-06-28 — see [[TAT Certificates - Open Items]]).

Scope: this is the **tat-ws** component. [[tat-prereq]] keeps its own separate table convention (plain Tailwind + `RowActionsMenu` — see "## Tables" and "## Table row actions = kebab menu only" above). Don't cross-apply; each repo uses its own table primitive.

## tat-portal: paginate via the shared URL-driven `CoursePagination`

Standing pattern in [[tat-portal]]: list/grid pages paginate through the shared **`CoursePagination`** component (`src/components/courses/CoursePagination.tsx`) plus the constants in `src/components/courses/pagination.ts` (`DEFAULT_PAGE_SIZE = 9`, `PAGE_SIZE_OPTIONS = [9, 18, 27, …90]`). Don't hand-roll page controls — reuse these across pages.

How it works: pagination state lives in the **URL** (`?page=` / `?pageSize=`), so it survives refresh and back/forward. The component owns the nav + a "per page" `<select>` and writes the params via `router.push`; the page reads them back and drives a **server-side** fetch (`skip = (page-1)*pageSize`, `limit = pageSize`) against an endpoint that returns `{ data, total }`. Feed `<CoursePagination total={total} page={page} pageSize={pageSize} />` below the grid. Changing page size resets to page 1 automatically (handled inside the component).

Two consumers so far: the public catalog `/courses` (server component — reads `searchParams` prop) and `/my-courses` (client component — reads `useSearchParams()`, so its content must sit inside a `<Suspense>` boundary; uses React Query with `placeholderData: keepPreviousData` so paging doesn't flash skeletons). Both share the same component + constants. Note the out-of-range guard is intentionally absent — a `?page=` past the last page shows an empty grid rather than clamping, matching both pages. Distinct from the [[tat-ws]] `Table`/`TablePagination` convention above — each repo has its own pagination primitive; don't cross-apply.

## File uploads: always pass a `FileUploadCategory` (tat-ws)

Standing rule (Qusai, 2026-06-28): every file upload (`POST /file/upload-file` via `usePostFile` or the RHF file inputs) **must send a `category`** from `FileUploadCategory`, chosen to match the content — the backend routes the file to the matching S3 prefix by category. Never upload without a category or with a mismatched one.

Category map (the ones that matter so far):
- **Online-course learning materials** — Manage Learning Materials for an online course (`manage-courses/online-courses/[id]/materials` → `ManageMaterials` → `LearningMaterialsStep` → `MaterialFileUpload`) → **`ONLINE_COURSE_CONTENT`** (`"online-course-content"`). Already wired correctly (verified 2026-06-28).
- **General Learning Materials Management** (`learning-materials-management/[id]/[tab]` → `AddNewMaterialModal`) → `LEARNING_MATERIALS` — a *separate* feature from online-course materials; don't confuse the two.
- Company documents → `COMPANY_DOCUMENTS`; signatures/stamps → `SIGNATURE`/`STAMP`; certificates → `CERTIFICATE_DOCUMENTS` / `ONLINE_COURSE_CERTIFICATES`; TOR docs/forms → `TOR_DOCUMENTS` / `TOR_FORM_285` / `TOR_FORM_32`.

⚠️ **The FE enum has drifted from the backend.** Authoritative source is the backend `FileUploadCategory` (`tat-app-ws/libs/app-data/src/lib/enums.ts`, 15 values). The FE copy (`tat-ws/apps/tat-ws/src/types/fileUpload.ts`) is **missing** `APPS`, `ONLINE_COURSE_PARTS`, `ONLINE_COURSE_CERTIFICATES`, `TOR_DOCUMENTS`, `TOR_FORM_285`, `TOR_FORM_32`, and has **extras** `SIGNATURE`/`STAMP` the backend enum doesn't list (used in `DynamicUserFields.tsx` — confirm the backend actually accepts them, else those uploads may be rejected). Rule: keep the FE enum mirrored to the backend; when an upload needs a category the FE lacks, add it from the backend list — don't invent strings. Related: the upload response is `{ Location, Key }` (capitalized), see [[Gotchas#Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)]].

## Surfaces vs page background (TailAdmin reference)

[[tat-prereq]] follows **TailAdmin** for page styling. Core rule (Qusai, 2026-06-04): **content surfaces must NOT share the page's background** — tables/inputs/selects/cards need their own surface so they read as distinct, not melted into the container.

- **Page bg:** `bg-gray-50 dark:bg-gray-900` (dashboard shell). *(Not `gray-950` — that's too dark for `gray-800` cards to lift off.)*
- **Surfaces** (cards, tables, inputs, selects, chips): `bg-white dark:bg-gray-800` + a border (`border-gray-200 dark:border-gray-800`, or `gray-300/gray-700` for inputs) + `shadow-theme-sm`.
- **Table header row:** a step darker than the card — `bg-gray-50 dark:bg-gray-900/50`. **Row hover:** `hover:bg-gray-50 dark:hover:bg-white/[0.04]`. **Dividers/borders inside a `gray-800` card:** `gray-700` (not `gray-800`, which vanishes).
- The bug this fixes: transparent inputs/tables (`bg-transparent`) inherit the page bg and disappear. Always give them a surface.

## Centralized cache-invalidation map for React Query mutations (tat-portal)

[[tat-portal]] had recurring "I had to refresh to see it" bugs: mutations changed one entity but never invalidated the *other* queries holding that data (e.g. submitting an exam updated `examDetails` but left `myCourses` / `myCourseDetail` / `myCertificates` stale; refund used `router.refresh()` which doesn't touch the React Query cache at all). Compounded by a global `staleTime: 5min` + `refetchOnWindowFocus: false`, so stale data persisted.

Fix (2026-06-23): one module — `src/api/cacheInvalidation.ts` — encodes **which caches each domain action affects**, and every mutation's `onSuccess` calls the matching helper instead of sprinkling ad-hoc `invalidateQueries` (which is how it drifted in the first place).

- Helpers are **action-named, not key-named**: `invalidateAfterExamSubmit(qc, id)`, `invalidateAfterFinishCourse`, `invalidateAfterRefund`, `invalidateAfterCheckout`, plus primitives (`invalidateEnrollment(id?)`, `invalidateCart`, `invalidateCertificates`, `invalidateProfile`). The cross-entity ripple lives in the helper, so adding a mutation = pick the right helper, not re-derive the fan-out.
- **Over-invalidation is safe**: React Query only refetches *mounted* queries; the rest are marked stale and refetched lazily. So invalidating a superset is fine for correctness.
- Detail keys take an optional id: `[MyCourseDetail, id]` when known, else `[MyCourseDetail]` (prefix match) when one action can touch any of them (e.g. refund from the orders page).
- Gotcha baked in: Next's `router.refresh()` only re-runs RSC/server data — it does **not** invalidate the client React Query cache. Mutations that change RQ-held lists must call the invalidation helper explicitly.

General rule: **mutation cache invalidation is a cross-entity concern — centralize the "what affects what" map in one place; never scatter `invalidateQueries` per call site.**

## Radial layouts = data array + polar math, not hand-tuned offsets (tat-website)

[[tat-website]]'s home-page client "orbit" originally placed ~20 logos with individual `top/left/right/bottom` pixel offsets and inconsistent box sizes — logos drifted off the orbit lines and every addition meant guessing another offset. Fixed (2026-06-10, see [[TAT-440 Client Logos & Safran]]) by driving each ring from a `{ src, alt }[]` array and an `orbitStyle(radius, index, count)` helper: `angle = 360/count × index − 90`, translate to `(r·cosθ, r·sinθ)` from center. Logos land exactly on a fixed radius, evenly spaced, in a uniform `object-contain` box (consistent size, aspect preserved). Adding one logo = one array entry; spacing rebalances automatically. General rule: **any "elements arranged on a circle/arc" UI should be array-driven with trig, never enumerated offsets.**

## Notifications: one action → target the right frontend by env-driven base URL (tat-app-ws)

The TAT backend serves several frontends (admin **dashboard** [[tat-ws]], **online-courses** [[tat-portal]], **staff-management** [[tat-prereq]]). Notification deep-links are stored as relative paths in `seed_data/notification-settings.json` and the base host is resolved by `CommonService.resolveClientBaseUrl(context)` — so the *same* notification pipeline can point links at different apps. Pattern (2026-07-08, see [[TAT Notification System - Bell, Detail Page & Prereq Deep-Links]]):

- **Add a client = add an env URL + a `resolveClientBaseUrl` branch.** New `staffManagementUrl` from `STAFF_MANAGEMENT_URL` (staging `staging.staff.tat147.com`, prod `staff.tat147.com`); the branch keys off `FrontendUrlContext.clientApp === 'staff-management'`. Env value carries the staging↔prod switch, exactly like `DASHBOARD_URL`. **Dashboard is the default** — untagged notifications don't move.
- **Mark only the settings you want to move.** Each seed parameter can carry `client: "staff-management"`; the setting stores the **relative** URL + `client`, and `sendNotification` resolves the base per-client at **send time** via `resolveClientBaseUrl`. So changing a link's target = seed edit, not code.
- **Resolve the base at send time, NOT seed time (corrected 2026-07-09).** The original impl baked the absolute URL into the stored setting at seed time — that was a bug: because re-seeding skips existing settings, setting `STAFF_MANAGEMENT_URL` after the first seed never took effect (see [[Gotchas#Notification URLs baked at seed time + skip-existing seeding = env-var changes silently ignored (2026-07-09)]]). `bootstrap.service.ts` now stores `param.url` relative and lets the send-time resolver run. **General rule: resolve environment-dependent values at use time, never freeze them into a DB row on first write.**
- **Deep-linking needs the id in `templateValues`.** A link like `.../tor/{{torId}}/form-285` only resolves if the notify function forwards `torId`. The form responses already carried `torId`/`userId` via `toDTO`, so it was just adding them to `templateValues` — check the response shape before assuming a placeholder is populated.
- **Re-seed is destructive + skips existing settings** (see [[Gotchas]]) — so data changes to already-seeded envs need a **non-destructive migration** (`$set parameters` by setting `name`), not a reboot. Keep the seed JSON the single source of truth and have the migration derive from it.

Frontend side: the backend pushes new notifications over **Socket.IO** (`emit("notification", ...)`, room = user `_id`, auth via `handshake.auth.Authorization` Bearer). Consume by connecting to the API **origin** (strip the `/api` REST prefix), then invalidate the inbox query + flash the bell on each event.

## Multi-item reject flows: accumulate-and-send only when items share ONE parent status (tat-prereq / tat-app-ws)

The "reject one item → the whole form rejects and the remaining Reject buttons vanish" bug is **specific to review surfaces where many fields share a single parent status**. Diagnose by asking *what status the reject button is gated on*, not *how many things can be rejected*.

- **Shared parent status → needs the fix.** History-Form **basic-info** fields all live on the one `StaffHistoryForm.status`; the old per-field `rejectBasicInfoField` did `form.status = REJECTED` on the first reject, so the next reject threw `historyFormInvalidWorkflowTransition` and the FE (gated on `form.status === PENDING_APPROVAL`) hid every other field's button. Same shape as [[Form 32 Rejection History & Round-Scoped Stamps|Form 32]] sections. **Fix = accumulate-and-send:** stage rejections client-side (`pendingRejections` map) and POST them in **one** plural `rejectBasicInfoFields` call, so the parent flips to REJECTED exactly once, after the reviewer has picked everything.
- **Per-item status → already safe, no fix.** Audited 2026-07-09: **Mandatory Training** (each `mandatoryTraining[]` slot has its own `status`; `rejectMandatoryTraining` guards on `slot.status`, and the dialog already sends multiple fields per course) and **Training History** (each `trainingHistory[]` record has its own `status`) reject **per sub-record** and never touch `form.status` — rejecting slot A leaves slot B `PENDING_APPROVAL`, so its FE button (gated on the *item's* status) stays. **Assessment** is approve-only (no reject flow at all). None needed the accumulate-and-send change.

Rule: **before replicating a multi-reject fix, confirm the items actually share one status.** Independent per-row records with their own status are already correct — forcing accumulate-and-send onto them is wasted work. Related: [[Gotchas]].

**Same mechanism drives auth links (reset-password / verify-email), but the per-client branch list is DUPLICATED per resolver (2026-07-08).** The client is detected from the **`x-client-app` request header** — every FE sets it (`tat-prereq` → `staff-management`, `tat-portal` → `online-courses`; `tat-ws`/website send nothing → default dashboard). But `CommonService` has a **separate resolver per link type** — `resolveClientBaseUrl`, `resolveResetPasswordUrl`, `resolveVerifyEmailUrl`, `resolveLoginUrl` — each with its **own** branch list. `resolveClientBaseUrl` handled `staff-management`, but `resolveResetPasswordUrl` only branched on `online-courses`, so staff forgot-password links fell through to the **dashboard** URL. Fix = add the `clientApp === 'staff-management'` branch to `resolveResetPasswordUrl` too (derives `${staffManagementUrl}/reset-password`). **Rule: adding/fixing a client means auditing ALL the resolvers, not just `resolveClientBaseUrl`.** Related auth fixes same day: reset-password FE calls **`PATCH /auth/reset-password/:token`** with `{ password }` (not `POST /auth/reset-password` → "Cannot POST"); the reset page's Email field was dead UI (token identifies the user); and **login forms must not enforce password strength/length** (`min(1)`, not `min(8)`) — that belongs on creation/reset, else admin-issued/legacy short passwords can't sign in.

## Server-generated form PDFs — reuse the shared Puppeteer pipeline; aggregate cross-service data in the controller

Exporting a TAT form as a PDF ([[Export History Form - TAT Form 031 PDF|Form 031]], [[Export Assessment Report - TAT Form 032 PDF|Form 032]], and the pre-existing Form 32/285) all use **one shared pipeline**: a pure `build<Form>PdfHtml(input)` util produces an HTML string → `generatePdfFromHtml(html, forPrint?, landscape?)` (HTML → Puppeteer → A4 PDF) → `s3Service.uploadFile(..., FileUploadCategory.<X>)` → `signFileKey` → return `{ downloadUrl }`. The FE fetcher hits `GET .../download` and does `window.open(url, '_blank', 'noopener,noreferrer')`. **Never hand-roll a second Puppeteer path** — extend the shared util instead (the `landscape` flag was added this way, default `false` so every existing caller stays portrait).

HTML reproduction tips that worked: one bordered `<table>` **per section** (not one giant table) with a `<colgroup>` per section for column control; `table-layout: fixed` + `margin-bottom: -1px` to collapse the seams between section tables; checkboxes as `&#9746;`/`&#9744;`; embed images (logo, **signatures**) as base64 `data:` URIs *before* rendering (`s3Service.getFile` returns raw base64 — wrap it as `data:image/png;base64,…`, inferring MIME from the key extension). Match the official form's exact spelling, even typos ("ASSESSEMENT", "COMUNCATION", "REFFERENCE").

**Cross-service aggregation goes in the controller, not the service.** The History-Form export needs data from four services (history-form + mandatory-training + training-history + sit-in). Putting all four injections into `StaffHistoryFormService` would create a **circular DI** (the mandatory/sit-in services already depend on it). Instead the **controller** — which already injects every service — fetches the sibling sections and passes them into `historyFormService.downloadPdf(actor, userId, sections)`, exactly the compose-in-controller idiom `getMyHistoryForm` already used. The service owns only the data it already owns (basic info, quals, audit log) plus S3/PDF.

## Async default-value prefill in react-hook-form (tat-prereq)

`useZodForm`/RHF captures `defaultValues` **at mount**, so a value that arrives later from an async fetch (staff profile, saved signature, etc.) will **not** appear in the field. To prefill from async data without clobbering user/saved input:

```ts
const { data: staff } = useStaffDetail(staffId, { enabled: !field }); // don't fetch if already filled
useEffect(() => {
  if (!staff || form.getValues('name')) return;      // only when still empty
  form.setValue('name', `${staff.firstName} ${staff.lastName}`.trim());
}, [staff, form]);
```

Rules: **`setValue` only when the field is empty** (never overwrite a saved value), and gate the query `enabled` on emptiness so it doesn't fire on already-filled / read-only forms. Used by [[Auto-Populate Instructor Name in Forms]] (instructor name from the staff profile) and [[Profile Signature Sign Button]] (saved signature from `/auth/me`). Note this is a **convenience prefill, not auto-save** — the value is set client-side; the user still has to Save/Submit for it to persist.

## Confirm the config/URL exists before wiring a cross-app link (tat-prereq)

Companion to [[Patterns#Confirm the backend can filter before wiring a frontend filter — an FE select for data the backend doesn't expose is a dead control|"confirm the backend can filter"]]. A link to another app (e.g. History Form → the [[tat-portal]] online courses) needs that app's **base URL as config** — tat-prereq only had `API_URL` / `S3_BASE` / `DASHBOARD_URL`. Added an **optional** `NEXT_PUBLIC_ONLINE_COURSES_URL` and made the link helper return `null` when unset, so the control simply doesn't render until the env var is provided per environment. See [[History Form Online Course Deep-Links]] — the link was invisible locally purely because the var wasn't set. Rule: a cross-app deep link is a **dead control** until its base URL is configured; make it null-safe and flag the deploy dependency.
