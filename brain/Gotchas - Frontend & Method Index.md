---
date: 2026-11-03
description: "One-line index of every frontend, data-contract and tooling trap — Next.js and component traps, React Query and API contracts, vault tooling and reasoning failures"
tags:
  - brain
  - index
---

# Gotchas - Frontend & Method Index

Split out of [[Gotchas]] on 2026-11-03, when the index reached 32KB. Moved verbatim: one line per trap, linking into the domain notes. **Add new entries to the domain note, and its one-liner here.**

## [[Gotchas - Frontend]]

_Component and framework traps across tat-prereq, tat-portal, tat-ws and tat-website — Next.js, MUI, styling, auth cookies, forms and layout_

- [[Gotchas - Frontend#Static pages behind CloudFront skip the auth proxy — a cached 200 reaches logged-out users (2026-11-02)|Static pages behind CloudFront skip the auth proxy — a cached 200 reaches logged-out users (2026-11-02)]]
- [[Gotchas - Frontend#A `NEXT_PUBLIC_*` variable added while the dev server runs stays `undefined` until a full restart (tat-ws, 2026-10-25)|A `NEXT_PUBLIC_*` variable added while the dev server runs stays `undefined` until a full restart (tat-ws, 2026-10-25)]]
- [[Gotchas - Frontend#The live tat-ws servers serve nothing from `public/` — reference static files by import (tat-ws, 2026-10-15)|The live tat-ws servers serve nothing from `public/` — reference static files by import (tat-ws, 2026-10-15)]]
- [[Gotchas - Frontend#A CSS-grid `fr` column grows to its longest unbreakable word — one long ID pushes the whole form wider (tat-ws, 2026-10-15)|A CSS-grid `fr` column grows to its longest unbreakable word — one long ID pushes the whole form wider (tat-ws, 2026-10-15)]]
- [[Gotchas - Frontend#A browser-cached image fetched without CORS fails a later `fetch()` (tat-ws, 2026-10-15)|A browser-cached image fetched without CORS fails a later `fetch()` (tat-ws, 2026-10-15)]]
- [[Gotchas - Frontend#docxtemplater: loop tags that share a paragraph merge paragraphs; a one-cell row needs `{-w:tr name}` (tat-ws, 2026-10-15)|docxtemplater: loop tags that share a paragraph merge paragraphs; a one-cell row needs `{-w:tr name}` (tat-ws, 2026-10-15)]]
- [[Gotchas - Frontend#Unioning a user's roles for UI gating lets the UI promise what the token can't do (tat-prereq, 2026-10-15)|Unioning a user's roles for UI gating lets the UI promise what the token can't do (tat-prereq, 2026-10-15)]]
- [[Gotchas - Frontend#The shared `RHFDateInput` has no year selector — a date of birth is effectively unreachable (tat-ws, 2026-10-11)|The shared `RHFDateInput` has no year selector — a date of birth is effectively unreachable (tat-ws, 2026-10-11)]]
- [[Gotchas - Frontend#A route gate that tests cookie *presence* cannot detect an expired session (all TAT frontends, 2026-09-20)|A route gate that tests cookie *presence* cannot detect an expired session (all TAT frontends, 2026-09-20)]]
- [[Gotchas - Frontend#A cookie `max-age` longer than its token's `exp` keeps a dead credential in the browser (tat-prereq, tat-portal, 2026-09-20)|A cookie `max-age` longer than its token's `exp` keeps a dead credential in the browser (tat-prereq, tat-portal, 2026-09-20)]]
- [[Gotchas - Frontend#A vendor stylesheet imported inside a component is scoped to that route's CSS chunk — the library looks unstyled everywhere else (tat-ws, 2026-09-10)|A vendor stylesheet imported inside a component is scoped to that route's CSS chunk — the library looks unstyled everywhere else (tat-ws, 2026-09-10)]]
- [[Gotchas - Frontend#A tooltip that closes when the pointer leaves the trigger can never be copied from (tat-ws, 2026-09-10)|A tooltip that closes when the pointer leaves the trigger can never be copied from (tat-ws, 2026-09-10)]]
- [[Gotchas - Frontend#`httpOnly` set once by middleware makes every `js-cookie` clear a silent no-op (tat-ws, 2026-08-19)|`httpOnly` set once by middleware makes every `js-cookie` clear a silent no-op (tat-ws, 2026-08-19)]]
- [[Gotchas - Frontend#A `<Link>` where an action belongs — sign out 404'd and never logged anyone out (tat-ws, 2026-08-19)|A `<Link>` where an action belongs — sign out 404'd and never logged anyone out (tat-ws, 2026-08-19)]]
- [[Gotchas - Frontend#A hidden form section still submits its defaults — one shared form, and self-edit silently wipes admin-only data (2026-07-30)|A hidden form section still submits its defaults — one shared form, and self-edit silently wipes admin-only data (2026-07-30)]]
- [[Gotchas - Frontend#Card-morph slider: keep the OUTGOING card full-screen until the new one covers it|Card-morph slider: keep the OUTGOING card full-screen until the new one covers it]]
- [[Gotchas - Frontend#App-shell layout: pin to the viewport, scroll only `<main>`|App-shell layout: pin to the viewport, scroll only `<main>`]]
- [[Gotchas - Frontend|Next.js 16 scaffolding traps (hit on tat-prereq 2026-06-04)]]
- [[Gotchas - Frontend#Next 16's react-hooks rules false-positive on react-hook-form primitives|Next 16's react-hooks rules false-positive on react-hook-form primitives]]
- [[Gotchas - Frontend#tat-ws modals: use MUI `<Dialog>`, not hand-rolled `fixed inset-0`|tat-ws modals: use MUI `<Dialog>`, not hand-rolled `fixed inset-0`]]
- [[Gotchas - Frontend#MUI X Date Pickers v7 use `.MuiPickers*` classes, not `.MuiOutlinedInput-*` (2026-07-05)|MUI X Date Pickers v7 use `.MuiPickers*` classes, not `.MuiOutlinedInput-*` (2026-07-05)]]

## [[Gotchas - Frontend Data & API Contracts]]

_Frontend data-layer traps across tat-prereq, tat-portal and tat-ws — React Query errors and cache keys, endpoint contracts, uploads and certificate hooks_

- [[Gotchas - Frontend Data & API Contracts#`nationalities` replaces the whole list — send each existing ID image back or it is wiped (2026-11-02)|`nationalities` replaces the whole list — send each existing ID image back or it is wiped (2026-11-02)]]
- [[Gotchas - Frontend Data & API Contracts#Profile signatures are full S3 URLs, form signatures are bare keys — a key-only resolver breaks one of them (tat-prereq, 2026-11-01)|Profile signatures are full S3 URLs, form signatures are bare keys — a key-only resolver breaks one of them (tat-prereq, 2026-11-01)]]
- [[Gotchas - Frontend Data & API Contracts#A hand-off that removes your own assignment 403s the page's success refetch (tat-ws, 2026-10-18)|A hand-off that removes your own assignment 403s the page's success refetch (tat-ws, 2026-10-18)]]
- [[Gotchas - Frontend Data & API Contracts#`isLoading` is false while a query is paused, and on the server — key skeletons on `isPending` (tat-ws, 2026-10-11)|`isLoading` is false while a query is paused, and on the server — key skeletons on `isPending` (tat-ws, 2026-10-11)]]
- [[Gotchas - Frontend Data & API Contracts#`GET /courses/:id` 403s for trainees — read their enrollment status from `/courses/public/:id` (tat-ws, 2026-10-11)|`GET /courses/:id` 403s for trainees — read their enrollment status from `/courses/public/:id` (tat-ws, 2026-10-11)]]
- [[Gotchas - Frontend Data & API Contracts#`POST /auth/refresh-token` takes the token as a Bearer header, not a body field — the body form 401s every time (2026-09-20)|`POST /auth/refresh-token` takes the token as a Bearer header, not a body field — the body form 401s every time (2026-09-20)]]
- [[Gotchas - Frontend Data & API Contracts#A query hook read without `isError` turns every server failure into an empty-state card (2026-09-09)|A query hook read without `isError` turns every server failure into an empty-state card (2026-09-09)]]
- [[Gotchas - Frontend Data & API Contracts#Bulk Edit reads a different query-config source — patching one leaves the page looking wired and unfiltered (tat-ws, 2026-08-01)|Bulk Edit reads a different query-config source — patching one leaves the page looking wired and unfiltered (tat-ws, 2026-08-01)]]
- [[Gotchas - Frontend Data & API Contracts#tat-prereq Form 32 cache keys are shaped `[Form32, kind, torId, …]` — a `[Form32, torId]` invalidation silently no-ops (2026-08-01)|tat-prereq Form 32 cache keys are shaped `[Form32, kind, torId, …]` — a `[Form32, torId]` invalidation silently no-ops (2026-08-01)]]
- [[Gotchas - Frontend Data & API Contracts#`router.refresh()` does NOT invalidate the React Query cache (tat-portal)|`router.refresh()` does NOT invalidate the React Query cache (tat-portal)]]
- [[Gotchas - Frontend Data & API Contracts#tat-ws cert hooks: `usePatchOnlineCourseCertificate` is NOT for issued certs|tat-ws cert hooks: `usePatchOnlineCourseCertificate` is NOT for issued certs]]
- [[Gotchas - Frontend Data & API Contracts#Online-course certs ARE trainee-reachable (storefront)|Online-course certs ARE trainee-reachable (storefront)]]
- [[Gotchas - Frontend Data & API Contracts#tat-portal: derive pass/fail from backend `passed`, not a local `examPassed` hardcoded to `>= 70`|tat-portal: derive pass/fail from backend `passed`, not a local `examPassed` hardcoded to `>= 70`]]
- [[Gotchas - Frontend Data & API Contracts#Two certificate-template preview endpoints — wrong one leaves tokens unsubstituted|Two certificate-template preview endpoints — wrong one leaves tokens unsubstituted]]
- [[Gotchas - Frontend Data & API Contracts#FE hook built against a speculative endpoint the backend never shipped|FE hook built against a speculative endpoint the backend never shipped]]
- [[Gotchas - Frontend Data & API Contracts#tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original|tat-ws uploads: the backend rewrites the file extension — derive type/name from the RETURNED key, not the original]]
- [[Gotchas - Frontend Data & API Contracts#tat-ws online-course trainees endpoint: no server search + fake pagination|tat-ws online-course trainees endpoint: no server search + fake pagination]]
- [[Gotchas - Frontend Data & API Contracts#tat-prereq `uploadFileKey` must send a `FileUploadCategory` — else `bucket/undefined/` (2026-07-05)|tat-prereq `uploadFileKey` must send a `FileUploadCategory` — else `bucket/undefined/` (2026-07-05)]]

## [[Gotchas - Tooling & Method]]

_Toolchain and working-method traps — vault tooling, lint and IDE behaviour, and recurring reasoning failures._

- [[Gotchas - Tooling & Method#Jira ticket text does not include attachments — the mockups and the real forms were there all along (2026-10-11)|Jira ticket text does not include attachments — the mockups and the real forms were there all along (2026-10-11)]]
- [[Gotchas - Tooling & Method#A frontend on `localhost` can be pointed at PRODUCTION — check `.env` before clicking anything (2026-09-10)|A frontend on `localhost` can be pointed at PRODUCTION — check `.env` before clicking anything (2026-09-10)]]
- [[Gotchas - Tooling & Method#A commit's ticket label doesn't mean it contains that ticket's code (2026-08-02)|A commit's ticket label doesn't mean it contains that ticket's code (2026-08-02)]]
- [[Gotchas - Tooling & Method#A commit reached `origin/dev` with no `git push` run — "local only" is not a safe claim here (2026-08-02, recurred 2026-08-12, 2026-09-09/10 and 2026-09-15)|A commit reached `origin/dev` with no `git push` run — "local only" is not a safe claim here (2026-08-02)]]
- [[Gotchas - Tooling & Method#The browser extension's network capture under-reports cross-origin calls — read `performance.getEntriesByType('resource')` instead (2026-08-01)|The browser extension's network capture under-reports cross-origin calls — read `performance.getEntriesByType('resource')` instead (2026-08-01)]]
- [[Gotchas - Tooling & Method#A git worktree has no `node_modules`, so a delegated agent writes code it cannot verify (2026-07-30)|A git worktree has no `node_modules`, so a delegated agent writes code it cannot verify (2026-07-30)]]
- [[Gotchas - Tooling & Method#Installing the qmd Claude Code plugin shadows the vault's scoped MCP server and silently serves an EMPTY index (2026-07-28)|Installing the qmd Claude Code plugin shadows the vault's scoped MCP server and silently serves an EMPTY index (2026-07-28)]]
- [[Gotchas - Tooling & Method#"Verified" is a timestamp, not proof the fact still holds — and a consistency gate rejects corrections as readily as errors (2026-07-23)|"Verified" is a timestamp, not proof the fact still holds — and a consistency gate rejects corrections as readily as errors (2026-07-23)]]
- [[Gotchas - Tooling & Method#Scoping debt from the files you happen to be looking at under-counts it (2026-07-14)|Scoping debt from the files you happen to be looking at under-counts it (2026-07-14)]]
- [[Gotchas - Tooling & Method#An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)|An FE "no backend yet" comment is not evidence — the capability usually exists (2026-07-12)]]
- [[Gotchas - Tooling & Method#Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)|Latent bugs surface in a burst the first time a blocked path is actually walked (2026-07-12)]]
- [[Gotchas - Tooling & Method#tat-ws — `nx lint` crashed on asset imports (FIXED 2026-06-02)|tat-ws — `nx lint` crashed on asset imports (FIXED 2026-06-02)]]
- [[Gotchas - Tooling & Method#IDE TS-server flags "implicit any" where batch `tsc` passes — annotate React-Query callbacks (2026-07-06)|IDE TS-server flags "implicit any" where batch `tsc` passes — annotate React-Query callbacks (2026-07-06)]]
- [[Gotchas - Tooling & Method#Sharing an HTML deliverable in Teams: JS is stripped + UTF-8 mojibakes → prefer a `.docx` (2026-07-05)|Sharing an HTML deliverable in Teams: JS is stripped + UTF-8 mojibakes → prefer a `.docx` (2026-07-05)]]
