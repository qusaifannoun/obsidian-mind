---
date: 2026-06-02
description: "tat-website — the public marketing site for TAT (Next.js 14, Nx): home, about, careers, aircraft types, training categories, calendar, contact, legal pages"
tags:
  - reference
  - project/tat
---

# tat-website

The **public marketing site** for the [[TAT Platform]] (tat147.com) — the front door, distinct from the [[tat-portal]] storefront where students actually buy and learn.

## Stack

Next.js 14 (App Router, TS) · **Nx monorepo** · Tailwind 3 + Styled Components + SCSS · Axios + TanStack React Query · GSAP + AOS (animation) · FullCalendar · Swiper/React-Slick · Playwright E2E. Auth/API per [[TAT API & Auth Model]].

## Shape

- `apps/tat-website/` (site) + `apps/tat-website-e2e/` (Playwright).
- Pages: home, about, careers, team, partners, contact-us, calendar, aircraft-types, training-categories, clients, specialized-aviation, dangerous-goods, + legal (privacy/terms/refund/cancellation).
- `src/lib/api/` — `axios-client.ts`, `api-service.ts` (generic get/post/...), `token-utils.ts`.
- Links to the storefront via `NEXT_PUBLIC_PORTAL_URL`.

## Run locally

```bash
npm install
npx nx dev tat-website        # ~:3000
npx nx build tat-website
npx nx e2e tat-website-e2e
```
Backend base default `api-dev.tat147.com/api`, override via `NEXT_PUBLIC_API_URL`.

> [!note] Undocumented
> Only an Nx boilerplate README; no architecture notes. Self-contained and low-risk, but capture anything non-obvious here as you touch it.

## Related

- [[TAT Platform]] · [[TAT API & Auth Model]] · [[tat-portal]]
- Home page: [[TAT Website Hero Card-Morph Slider]] (GSAP card-morph hero), [[TAT-440 Client Logos & Safran]] (client orbit)
