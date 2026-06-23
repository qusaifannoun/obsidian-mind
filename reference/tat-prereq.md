---
date: 2026-06-04
description: "tat-prereq — the new Staff Management subsystem frontend (Next.js 16), scaffolded mirroring tat-portal. Hosts the instructor/TOR pages on a separate SSO subdomain"
tags:
  - reference
  - project/tat
  - project/staff-management
---

# tat-prereq

The **Staff Management subsystem** frontend of the [[TAT Platform]] — the new 6th repo. Implements [[TAT-409 Staff Management Subsystem|epic TAT-409]]: instructor/staff management and the **TOR** lifecycle (domain in [[Staff Management Subsystem & TOR Model]]). Runs on a **separate subdomain** with **SSO** from the TAT dashboard.

- **Repo:** `github.com/Cryptonic-Art/tat-prereq` · local `~/Desktop/WebProjects/obsidian-mind/TAT/tat-prereq`
- **Scaffolded 2026-06-04** mirroring [[tat-portal]] (per Qusai's call). Build + typecheck + lint green.

## Stack (mirrors [[tat-portal]])

Next.js 16 (App Router, React 19, TS strict, `any` banned) · Tailwind v4 + MUI 9 · shadcn/ui (new-york) · Redux Toolkit (auth only) · Axios (DI) + TanStack React Query v5 · RHF + Zod via `useZodForm`. Same [[TAT API & Auth Model|auth model]] (Bearer + refresh rotation).

> [!tip] Source of truth lives in the repo
> `tat-prereq/ARCHITECTURE.md` is the handoff doc. This note is a pointer. The infra layer (`lib/axios`, `lib/env`, `store`, `proxy`, theme) was copied from tat-portal so the two feel identical to work in.

> [!note] Theme = a verbatim mirror of [[tat-portal]]
> Per the [[Key Decisions|design-reference decision]], tat-prereq uses tat-portal's **exact** `globals.css`, **Geist** font config, and **real TAT logo assets** (`src/assets/svg/logo-white.svg` · `logo.svg` · `grid-01.svg`) + `GridShape`. The auth brand panel and sidebar render the real logo (not placeholder icons). Keep them in sync with portal; don't re-derive from Figma.

## Shape

- Route groups: `(auth)` — tat-portal's auth pages, trimmed to what the tickets need: **login, forgot-password, reset-password, confirm-password** + the split-panel layout, plus the full `RHFInput` field set and auth components (`AuthAlert`/`AuthSubmitButton`/`PasswordInput`) and `format-api-error`. **Dropped the self-registration surface — `sign-up` AND `verify-email`/`email-verify`** (+ `TermsModal`, `EmailVerification`, `isEmailNotVerifiedError`, the login footer link, the verify-email proxy exception, and the `external-user/signup`/`external-user/verify-email`/`resend-verification-link` no-refresh entries): the tickets have no self-registration or email-verification — staff are created by a Super Admin via "Add New Staff" (TAT-431 → TAT-432) and enter via SSO. `(sso)/sso` (token exchange), `(dashboard)` (sidebar shell) with the four pages: `manage-staff` (TAT-431), `staff/[id]` + `staff/new` (TAT-432), `tor-matrix` (TAT-433), `pending-tors` (TAT-435).
- **Routing uses `proxy.ts`, not `middleware.ts`** (the Next 16 convention). Auth redirects only, with a verify-email exception (mirrors portal) + an SSO-landing exception. See [[Gotchas]].

> [!warning] One portal-ism still to confirm with backend
> `X-Client-App` stays `staff-management` (app identity), so backend email links for the copied verify/reset flows may target the wrong app until the backend knows this client. Most staff enter via **SSO** anyway. Confirm with backend/product. *(The student `sign-up` flow was already removed — see above.)*
- `src/api/<Entity>/` — DI fetchers (Axios = arg 1) + RQ hooks; cache keys in `queryKeys.ts`. Seed example: `api/Profile/`.
- **Pages are stubs** — infra + theme + routing are real; the page bodies are placeholders awaiting their tickets.

## The "always remember" rules (same as [[tat-portal]])

No `any` · forms only via `useZodForm` · shared types in `src/types/` · typed Redux hooks · thin pages · mutations use `formatApiError`.

## Run locally

```bash
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL → a running tat-app-ws
npm run dev                  # :3000
npm run build                # green as of scaffold
```

## Backend-confirm items

- SSO exchange endpoint (assumed `POST /auth/exchange-sso-token`) + the `X-Client-App` header value (`staff-management`).
- The TOR engine (status/auto-renewal/eligibility) is **net-new backend** — this frontend consumes it.

## Related

- [[TAT-409 Staff Management Subsystem]] — the epic + plan · [[Staff Management Subsystem & TOR Model]] — domain
- [[TAT Platform]] · [[tat-portal]] (the reference) · [[tat-app-ws Backend]] · [[TAT API & Auth Model]]
- [[Gotchas]] — Next 16 scaffolding traps
