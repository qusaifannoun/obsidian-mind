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

## Surfaces vs page background (TailAdmin reference)

[[tat-prereq]] follows **TailAdmin** for page styling. Core rule (Qusai, 2026-06-04): **content surfaces must NOT share the page's background** — tables/inputs/selects/cards need their own surface so they read as distinct, not melted into the container.

- **Page bg:** `bg-gray-50 dark:bg-gray-900` (dashboard shell). *(Not `gray-950` — that's too dark for `gray-800` cards to lift off.)*
- **Surfaces** (cards, tables, inputs, selects, chips): `bg-white dark:bg-gray-800` + a border (`border-gray-200 dark:border-gray-800`, or `gray-300/gray-700` for inputs) + `shadow-theme-sm`.
- **Table header row:** a step darker than the card — `bg-gray-50 dark:bg-gray-900/50`. **Row hover:** `hover:bg-gray-50 dark:hover:bg-white/[0.04]`. **Dividers/borders inside a `gray-800` card:** `gray-700` (not `gray-800`, which vanishes).
- The bug this fixes: transparent inputs/tables (`bg-transparent`) inherit the page bg and disappear. Always give them a surface.

## Radial layouts = data array + polar math, not hand-tuned offsets (tat-website)

[[tat-website]]'s home-page client "orbit" originally placed ~20 logos with individual `top/left/right/bottom` pixel offsets and inconsistent box sizes — logos drifted off the orbit lines and every addition meant guessing another offset. Fixed (2026-06-10, see [[TAT-440 Client Logos & Safran]]) by driving each ring from a `{ src, alt }[]` array and an `orbitStyle(radius, index, count)` helper: `angle = 360/count × index − 90`, translate to `(r·cosθ, r·sinθ)` from center. Logos land exactly on a fixed radius, evenly spaced, in a uniform `object-contain` box (consistent size, aspect preserved). Adding one logo = one array entry; spacing rebalances automatically. General rule: **any "elements arranged on a circle/arc" UI should be array-driven with trig, never enumerated offsets.**
