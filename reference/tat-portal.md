---
date: 2026-06-02
description: "tat-portal — the Udemy-style student storefront (Next.js 16): buy courses, learn from protected media, take exams, earn certificates. Where current work starts"
tags:
  - reference
  - project/tat
---

# tat-portal

The student-facing **e-learning storefront** of the [[TAT Platform]] — buy courses, learn from protected media, take exams, earn certificates. **This is the repo current work focuses on** (see [[North Star]]).

> [!tip] Source of truth
> This repo is well documented in-place. Read these first, in order:
> - `tat-portal/ARCHITECTURE.md` — the handoff doc (stack, structure, flows, decisions)
> - `tat-portal/obsidian/Home.md` — repo-local vault index
> - `tat-portal/obsidian/architecture/*` — patterns (API fetchers, RHF+Zod forms, content protection, "always remember" rules)
>
> This note is a *pointer + orientation*, not a duplicate. When in doubt, `src/` is authoritative.

## Stack (quick)

Next.js 16 (App Router, React 19, TS strict) · Tailwind v4 + MUI v9 · shadcn/ui · Redux Toolkit (**auth only**) · Axios + TanStack React Query v5 · React Hook Form + Zod v4 (via `useZodForm`) · Jest. Auth/payments per [[TAT API & Auth Model]].

## Shape

- Route groups = layout boundaries: `(public)` (SEO, server-rendered), `(auth)`, `(private)` (gated), `(sso)`.
- `src/api/` — plain DI fetchers (Axios instance is always arg 1; works server + client), cache keys from `queryKeys.ts`.
- Middleware does auth redirects only (no locale). `PROTECTED_PATHS = ['/cart','/my-orders','/my-courses','/profile']`.
- Localization was **removed** (2026-04-26) — `next-intl`/`messages/` remain but routing is single-locale.

## The "always remember" rules

1. No explicit `any` (ESLint error). 2. Forms only via `useZodForm`. 3. Shared types → `src/types/<domain>.ts`. 4. Typed Redux hooks only. 5. Keep pages thin — extract into `src/components/<feature>/`. 6. Mutations use `formatApiError(error, fallback)`.

## Run locally

```bash
npm install
npm run dev      # Next dev
npm run test:unit
```
Needs `NEXT_PUBLIC_API_URL` → a running [[tat-app-ws Backend]]. Git hooks: pre-commit lint-staged, pre-push unit tests.

## Related

- [[TAT Platform]] · [[TAT API & Auth Model]] · [[tat-app-ws Backend]]
