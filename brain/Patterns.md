---
date: 2026-06-04
description: "Recurring patterns and conventions discovered across work — architecture, naming, tooling, and implementation patterns"
tags:
  - brain
---

# Patterns

Recurring patterns discovered across work.

## Git workflow — commit straight to `main` (TAT repos)

Qusai is the **sole developer** on the TAT repos ([[tat-prereq]] et al.), so the workflow is **commit directly to `main`** — no feature branches, no PRs (confirmed 2026-06-18). When work is done on a throwaway branch, fast-forward `main` to it and delete the branch. Don't push unless asked; he pushes on his own cadence. Still end commit messages with the `Co-Authored-By` trailer.

## Staff Management is wired to real `/staff-management/*` APIs

As of 2026-06-18, the [[TAT-409 Staff Management Subsystem|TAT-409]] FE dummies have been **replaced with the real backend** (staging Swagger): staff-management-login, TOR matrix/details/pending, tor-documents, Form 285, Form 32 (rebuilt schema-driven), profiles catalog + `profiles/me`, qualifications, assessments, deactivate. Read paths verified vs staging; write paths wired but largely unexercised. The "FE-first dummy-data layer" pattern below is now historical for this subsystem (History + Assessment *forms* remain dummy — no backend). Instructor self-service is wired but **backend-blocked**: the instructor role 403s on `profiles/me` / `tor-documents` / `qualifications` until granted those actions server-side. Rule going forward: **FE follows the backend contract; align the FE to a ticket once its backend is approved.**

## History Form is now real + rendered as TAT Form 031 (2026-06-28)

The History Form is no longer dummy (updates the note above). The whole TAT-417/418/419/421 + [[TAT-429]] backend shipped and the FE was wired + verified against staging across roles:

- **One `HistoryFormView` (`/staff/[id]/history-form`) = the whole TAT Form 031 document.** Restructured from stacked cards into a single bordered document with centered `SectionBar`s, in the form's order: identity → Years of Experience → Part 66 → Type Training Course → Relevant Training History → Updated Training & Validity → Sit-ins & Successfully Assessed As → Special Notes → Certified by. Sections with **no backend** (License/Valid Until, Part 66, aircraft-qual editing, Certified-by) render as **disabled placeholders with a "pending backend" note** so the document is visually complete.
- **Wired sub-resources** (all `/staff-management/profiles/:userId/history-form/*` + `/sit-ins/*`): basic info (TM approve / field-reject), mandatory training (record → submit → approve / field-reject the 3 fields accomplishedDate/durationHours/evidence), training history (add → approve / reject-with-reason, with a Due Date column), sit-in (evaluator submit → TM final assessment). Hooks/fetchers in `src/api/Forms/*`; query keys per entity.
- **Gating is per-action, approximated by role** (the FE only has role codes, no action list): mandatory training is **instructor-only** (`!isReviewer`; SA lacks `SM_SAVE_MANDATORY_TRAINING`); training history allows SA too (`isSuperAdmin || !isReviewer`); reviewer approve/reject shows for `isReviewer` on Pending items; the sit-in evaluator form shows only to the assigned `evaluatorUserId`.
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

## Dev auth bypass (tat-prereq)

FE pages are auth-gated by `proxy.ts`, but FE-only dev has no backend session. A **dev-only, env-flagged** bypass (`NEXT_PUBLIC_DEV_AUTH_BYPASS=true`, **non-production only**) makes the proxy skip gating and `AuthHydrator` seed a dummy Super Admin, so role-gated pages render without logging in. Hard-disabled in prod (`NODE_ENV` guard). Default `false` in `.env.example`.

## Role gating (tat-prereq)

`useUserRole()` reads the role **code** from the Redux user and exposes `isSuperAdmin` (`roleCodes.includes('SA')`). The backend user carries `role` as an **object** (`role.code`), plus optional `secondaryRoles[]` and an `activeRole` code — the hook looks across all of them (see [[Gotchas]]). No-session dev access is handled by the proxy/AuthHydrator bypass (dummy SA), not a fallback in the hook. Pages gate on `isSuperAdmin` (e.g. Manage Staff renders an access-restricted state otherwise).

## Tables

Plain Tailwind tables styled with the shared theme tokens (no MUI X DataGrid / TanStack Table yet) — matches the [[tat-portal]] design system and needs no new dep. Revisit a headless table lib only if a later page (e.g. the TOR Matrix, TAT-433) needs heavy sorting/virtualization.

## Table row actions = kebab menu only

Hard rule (Qusai, 2026-06-04): **never expose row actions as bare icons/buttons**. Every table row's actions live in a **kebab (⋮) button → dropdown menu**, each item rendered as **icon + text**. Reusable component: `src/components/ui/RowActionsMenu.tsx` (Radix dropdown; takes `actions: { label, icon, onClick, destructive?, disabled? }[]`; trigger/menu items `stopPropagation` so a clickable row doesn't fire). The actions column header is empty (`sr-only "Actions"`). Used by the Manage Staff table (Edit; Deactivate etc. will be added as menu items, not new buttons).

## tat-ws: always use the shared `Table` component

Standing rule (Qusai, 2026-06-28): in [[tat-ws]], **every table uses the shared `components/Table/Table.tsx`**. New tables are built with it; any existing hand-rolled `<table>` we touch gets **migrated** to it. Don't hand-roll `<table>`/`<thead>`/`<tbody>` markup in tat-ws anymore.

Why: the component bakes in the things hand-rolled tables keep getting wrong — `overflow-x-auto` (no columns clipped off-screen on narrow viewports — the bug that triggered this rule), built-in `TablePagination`, loading/empty states, consistent surface styling, and a portaled kebab (⋮) `TableActionDropdown` for row actions (which satisfies the kebab-only row-actions rule below).

API (import from `@tat-ws/components/Table`): `<Table<T> data columns pagination onPageChange onRowsPerPageChange isLoading emptyState showActionsColumn actions />`. Columns are `ColumnDefinition<T>[]`, each with a `render(value, item, index)` for custom cells (badges, buttons, nested components all fine). Row actions = `TableAction[]` or `(item) => TableAction[]`, each `{ id, label, onClick, variant?: 'default' | 'danger', disabled? }`. For server pagination feed `pagination={{ current_page, last_page, per_page, total }}` and wire `onPageChange`/`onRowsPerPageChange` (first migration: Manage Trainees, 2026-06-28 — see [[TAT Certificates - Open Items]]).

Scope: this is the **tat-ws** component. [[tat-prereq]] keeps its own separate table convention (plain Tailwind + `RowActionsMenu` — see "## Tables" and "## Table row actions = kebab menu only" above). Don't cross-apply; each repo uses its own table primitive.

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
