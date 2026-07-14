---
date: 2026-06-02
description: "Getting oriented and productive on tat-portal — local setup, reading order, and a landing pad for the first tasks on the TAT storefront"
tags:
  - work-note
  - project/tat
status: backlog
quarter: Q2-2026
project: tat-portal
---

# TAT Portal Onboarding

## Context

Starting work across the [[TAT Platform]] (5 repos). First focus: [[tat-portal]], the student e-learning storefront. The whole system is mapped in `reference/` — this note is the working landing pad for getting productive on the portal and tracking the first tasks.

## Notes

### Get it running
- [ ] `cd tat-portal && npm install`
- [ ] Set `NEXT_PUBLIC_API_URL` to a running [[tat-app-ws Backend]] (local `:3333`, or dev/staging `api*.tat147.com`)
- [ ] `npm run dev`, confirm landing + `/courses` load
- [ ] `npm run test:unit` (also runs on pre-push)

### Reading order (don't skip)
- [ ] `tat-portal/ARCHITECTURE.md` — the handoff doc
- [ ] `tat-portal/obsidian/Home.md` + `architecture/` patterns
- [ ] [[TAT API & Auth Model]] — the contract you'll be calling

### Internalize the rules
- [ ] The 6 "always remember" rules ([[tat-portal#The "always remember" rules]]) — no `any`, `useZodForm` only, types in `src/types/`, typed Redux hooks, thin pages, `formatApiError`
- [ ] How DI fetchers work (`src/api/`, Axios is always arg 1; cache keys from `queryKeys.ts`)

## Action Items
- [ ] Confirm what the actual first task/feature is, then split into its own work note
- [ ] Note any drift between `ARCHITECTURE.md` and `src/` (docs last fully synced 2026-04-26..29)

## Related
- [[TAT Platform]] — system overview
- [[tat-portal]] — repo reference
- [[TAT API & Auth Model]] — shared contract
- [[tat-app-ws Backend]] — the API this calls
