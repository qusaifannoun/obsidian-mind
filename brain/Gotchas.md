---
date: 2026-06-02
description: "Things that have bitten before and will bite again — pitfalls, edge cases, and testing traps"
tags:
  - brain
---

# Gotchas

Things that have bitten before and will bite again.

## Card-morph slider: keep the OUTGOING card full-screen until the new one covers it

When one element morphs into a full-screen background (a thumbnail "opening" into the hero — the [[TAT Website Hero Card-Morph Slider]] effect), the naïve approach shrinks the old background into a thumbnail *while* the new one grows — leaving a moment where **neither covers the viewport**, so the page background flashes through (white). Fix (the CodePen's actual trick): keep the outgoing card **full-screen** (slight `scale` zoom, behind the incoming one) for the whole tween and only **snap** it into its thumbnail slot `onComplete`. Belt-and-suspenders: give the hero container a dark background so any micro-gap (incl. first paint before measure) never shows white. Three more traps from the same build:
- **Auto-advance must restart the timer on every slide change.** A GSAP indicator-bar `onComplete` that only calls `next()` advances the slide but never resets the timer → it fires once then stalls until a manual click. Key the timer `useEffect` on `activeIndex` so it restarts after *any* change (auto or manual).
- Animate `borderRadius` in **px** (`28 → 0`), not `'50%' → '0%'` — percent interpolation on a growing box looks wrong mid-tween.
- A portrait **rounded-rectangle** thumbnail is `width≠height` + a fixed px radius. `rounded-full` on a non-square box is an **ellipse/oval**, not the rounded-rect you usually want.

## App-shell layout: pin to the viewport, scroll only `<main>`

A dashboard shell must be `h-screen overflow-hidden` on the outer flex container so the sidebar + topbar stay fixed and **only the content area scrolls**. Using `min-h-screen` lets the container grow past the viewport, so the whole page (body) scrolls and the sidebar scrolls away with it — a basic but easy-to-miss bug (hit it in [[tat-prereq]]'s first dashboard layout). Correct shape: `flex h-screen overflow-hidden` → `Sidebar` (h-full) + a `flex-1 flex-col overflow-hidden` column → `Topbar` (shrink-0) + `main flex-1 overflow-y-auto`.

## TAT backend user: `role` is an OBJECT, not a string

The `/auth` user object (same across [[tat-portal]] / [[tat-ws]] / [[tat-prereq]]) has **`role: { _id, code, name }`** — the role code lives at `role.code` (e.g. `'SA'`). There's also `secondaryRoles: UserRole[]` and an `activeRole` code (users can hold/switch multiple roles), and the id field is **`_id`**, name is **`familyName`** (not `lastName`). Gating with `user.role === 'SA'` silently fails (object ≠ string) — it bit the [[TAT-409 Staff Management Subsystem|Manage Staff]] SA gate: a real super-admin login was wrongly shown "access restricted." Correct check: `user.role?.code === 'SA'` (or look across `activeRole` + `role.code` + `secondaryRoles[].code`). Mirror tat-portal's `User`/`UserRole` types verbatim rather than inventing a `{ role: string }` shape.

## tat-ws cert hooks: `usePatchOnlineCourseCertificate` is NOT for issued certs

Two confusingly-named things in [[tat-ws]]. `usePatchOnlineCourseCertificate` (in `online-courses/usePatchOnlineCourseCertificate.ts`) edits a **course's certificate _template_ HTML** (`PATCH /online-courses/{id}/certificates/{type}`, body `{ certificateHtml }`) — course-level, not trainee-level. To edit an **issued** online-course certificate (a trainee's generated cert), use `useUpdateIssuedCertificate` (`PATCH /online-courses/certificates/{id}`, body `{ templateHtml }`, queues async PDF regen). *(The DTO changed 2026-06-11: it used to take `{ courseTitle, issuedAt, scorePercentage, displayData }`; those metadata fields are gone — it's the cert's HTML now.)* **Naming trap on top:** the PATCH field is `templateHtml`, but the GETs return the same value as `templateHtmlSnapshot` — read one name, write the other. Don't reuse the template hook for issued-cert edits. RBAC nuance: the issued-cert PATCH allows **SA/AD/TM** (role-based, hardcoded in the route), but the FE gates on `UPDATE_CERTIFICATE` (`UCE`) which is seeded **SA+TM** — so an **AD** user is allowed by the backend yet hidden by the FE gate. Context: [[TAT-428 Edit Issued Certificates]].

## Online-course certs ARE trainee-reachable (storefront)

`GET /online-courses/certificates/my` returns the logged-in user's own issued certs **including `pdfUrl`**, and its `@Roles(...SystemRolesCodes)` guard **includes `TRAINEE = "TR"`** — so [[tat-portal]] (the student storefront) can call it directly. Don't assume the `/online-courses/certificates/*` endpoints are admin-only just because [[tat-ws]] uses them; the `/my` variant is for trainees. Each cert carries `enrollmentId` + `type` (`EXAM` | `ATTENDANCE`) for matching to a course card. Context: [[TAT Certificates - Open Items]].

## Next.js 16 scaffolding traps (hit on [[tat-prereq]] 2026-06-04)

Cloning [[tat-portal]]'s conventions into a fresh Next 16 repo surfaced three:
- **`next lint` is removed.** Use `eslint` directly (the `package.json` `lint` script is just `"eslint"`). `npx next lint` errors with "Invalid project directory ... /lint".
- **`react-hooks/set-state-in-effect` is now an error.** The stock shadcn `use-mobile` hook (synchronous `setState` in a `useEffect`) fails lint. Fix: rewrite with `useSyncExternalStore` (subscribe + `getSnapshot` + SSR `false` snapshot).
- **`middleware.ts` is deprecated → use `proxy.ts`.** [[tat-prereq]] uses `proxy.ts`: export a function named `proxy` (or a default export), same `config.matcher`, same `NextRequest`/`NextResponse` from `next/server`. **Having both `middleware.ts` and `proxy.ts` is a hard build error.** Confirmed working at runtime (protected route → 307 → /login). Two harmless quirks under Turbopack 16.0.1: the build summary omits the `ƒ Proxy (Middleware)` line and `.next/server/middleware-manifest.json` is empty — Next compiles `proxy.js` then renames it to `middleware.js` internally, and the real manifest is `middleware-build-manifest.js`. **Don't trust the manifest/summary — verify with a runtime curl.** tat-portal still uses `middleware.ts`; migrate it later.
- Also: `lib/env.ts` throws on missing `NEXT_PUBLIC_API_URL`, so **`build` fails at prerender without a `.env.local`** — expected, not a scaffold bug.

## Next 16's react-hooks rules false-positive on react-hook-form primitives

eslint-config-next 16 ships stricter `react-hooks` rules that flag standard RHF usage in the shared `RHFInput` components: `react-hooks/refs` errors on `ref={field.ref}` ("Cannot access ref value during render") even though `field.ref` is a callback ref (correct usage), and `react/display-name` errors on the `forwardRef` phone input. **[[tat-portal]] has the identical 21 problems** — `npm run lint` fails there too; it only stays green because lint-staged checks *changed* files and these aren't usually touched. On a **fresh repo's first commit, lint-staged lints everything and would block it.** Fix in [[tat-prereq]]: a scoped `eslint.config.mjs` override turning `react-hooks/refs`, `react/display-name`, and `@typescript-eslint/no-unused-vars` off for `src/components/ui/RHFInput/**` — keeps the files byte-identical to portal. Portal should adopt the same override.

## Staff signup/update DTO: 3 contract traps the FE got wrong (verified on staging 2026-06-07)

Driving the [[TAT-432 Staff Profile]] create/edit forms against staging surfaced three backend-contract mismatches — all silently shipped because the FE-first build had no live backend to test against:

- **`nationalIdImage` is REQUIRED on create**, not optional. `POST /auth/internal-user/signup` without it → `400 "nationalIdImage must be a string"`. The FE schema had it `optional`. Fix: per-mode schema (`superRefine` requires it on create, optional on edit so an unchanged image is kept).
- **`POST /file/upload-file` returns `{ Location, Key }` (capitalized, S3-style)** — NOT `url`/`fileUrl`/`key`/`data.url`. The FE's `uploadFile` parsed only the lowercase shapes, so it returned `''` → the image got omitted from the body → create failed **even with an image selected**. This bites EVERY upload in the subsystem (documents TAT-412/413, forms, assessment video). Always read `data.Location` first. Note: the returned S3 key contains `bucket/undefined/...` — a backend quirk, harmless.
- **`officeLocation` is an OfficeLocation ObjectId, not free text.** Sending `"HQ"` → `500 "Cast to ObjectId failed for value \"HQ\" at path \"_id\" for model OfficeLocation"`. Source the value from `GET /office-location` (`[{ _id, name, cityId{name} }]`) as a select keyed by `_id`, and **omit the field entirely when blank** (a blank string also fails the cast). On read, `/user/details` returns `officeLocation` populated as `{ _id, name }` — store the `_id` for the form, carry the `name` separately for display.

Method note: every real-staging path in `tat-prereq` is gated on `getAccessToken()`; with no session the fetchers silently return dummy data. To verify "against staging" you MUST be logged in — otherwise you're only exercising the offline fallback. Context: [[TAT-432 Staff Profile]], [[TAT-409 Staff Management Subsystem]].

## tat-ws — `nx lint` crashed on asset imports (FIXED 2026-06-02)

`nx lint tat-ws` used to **throw instead of linting**: `@nx/enforce-module-boundaries` (nx 19.6.4) did `ENOENT … open '.../apps/tat-ws/src/assets/*'` while autofixing **any** SVG/asset import (alias `@tat-ws/assets/...` *or* relative `../../assets/...`). It treats `src/assets` as a boundary via the tsconfig path mapping and the autofixer reads the literal glob path.

**Fix applied:** disabled the rule in `.eslintrc.json` (`"@nx/enforce-module-boundaries": ["off", …]`). Justified because its `depConstraints` were wide-open (`sourceTag "*" → onlyDependOnLibsWithTags ["*"]`), so it enforced no real boundaries — only the broken autofix. Lint now runs.

> [!warning] Disabling it revealed a ~225-error pre-existing lint backlog
> The crash had hidden the whole codebase's violations (unused vars, `no-explicit-any`, non-null assertions, `no-unsafe-optional-chaining` errors). CI `nx lint` will now fail on these real issues until they're cleaned — a separate effort. `tsc --noEmit -p apps/tat-ws/tsconfig.json` is the clean type gate meanwhile.

Alternative fix (not taken): bump `@nx/eslint-plugin` to a version where the autofix bug is gone. Context: [[TAT-428 Edit Issued Certificates]], [[TAT Certificates - Open Items]].
