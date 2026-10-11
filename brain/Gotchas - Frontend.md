---
date: 2026-07-28
description: "Component and framework traps across tat-prereq, tat-portal, tat-ws and tat-website — Next.js, MUI, styling, auth cookies, forms and layout"
tags:
  - brain
---

# Gotchas - Frontend

Split out of [[Gotchas]] on 2026-07-28, which had reached 96KB. Entries moved verbatim; [[Gotchas]] keeps the one-line index. **Add new entries here, not to the index.**

Data-layer and API-contract entries moved verbatim to [[Gotchas - Frontend Data & API Contracts]] on 2026-09-15, when this note reached 29KB. **Add data-layer and api-contract entries there.**

## The shared `RHFDateInput` has no year selector — a date of birth is effectively unreachable (tat-ws, 2026-10-11)

`RHFComponents/RHFDateInput` wraps `react-datepicker` with month arrows only, and typed input does not take. Reaching 1990 from today means hundreds of clicks — the old course sign-up used it for date of birth, so the field was close to unusable. For dates far from today use `RHFTextInput type="date"` (native input; the year is typed). `"date"` was added to `RHFTextInput`'s `type` union for this. Separate trap: the date input's container is `h-full`, so as a grid item it stretches to the row's height — wrap it in a plain `div`. [[TAT-482 + TAT-483 Enrollment Forms]].

## A route gate that tests cookie *presence* cannot detect an expired session (all TAT frontends, 2026-09-20)

> [!danger] `const token = request.cookies.get('access_token')?.value; if (!token) redirect('/login')` — a 30-day-dead JWT is a **present cookie**. The gate passes, the user keeps navigating, and nothing in the UI says otherwise.
> Every frontend had this shape: [[tat-prereq]] `proxy.ts`, [[tat-portal]] `middleware.ts`, `exam-portal` `middleware.ts`. None of them decoded `exp`. The only thing that knew a token was expired was the backend, and the only way the app found out was a 401 arriving on a request it had not exempted — so on any screen fed by cached data or an unguarded route, the expired session simply continued.
>
> Two rules came out of it. **Decode `exp` at the gate.** And test the **refresh token**, not the access token — the access token is short-lived and renewable, so bouncing on it logs people out mid-session. See [[Decision - Refresh Token as the Session Boundary]] and [[Expired Sessions Undetected Across All TAT Frontends]].
>
> Reading order matters too: `tat-prereq` is on Next 16, where `middleware.ts` was renamed **`proxy.ts`** — grepping for `middleware.ts` finds nothing and it looks like the app has no gate at all.

## A cookie `max-age` longer than its token's `exp` keeps a dead credential in the browser (tat-prereq, tat-portal, 2026-09-20)

> [!warning] `setCookie(ACCESS_TOKEN_KEY, accessToken, ONE_YEAR)` — the storage outlives the credential by a year, so the browser keeps presenting a long-expired JWT and the app keeps believing it has a session.
> Derive the lifetime from the token: `secondsUntilExpiry(token)`. Then the cookie disappearing *is* the session ending, and the two stores can never disagree.
>
> Watch the second-order effect: once cookies expire honestly, any gate that requires the access-token cookie to be **present** in order to attempt a refresh will start bouncing users who still hold a valid refresh token. [[tat-ws]]'s `middleware.ts` had exactly that condition and it only surfaced after the expiry fix.

## A vendor stylesheet imported inside a component is scoped to that route's CSS chunk — the library looks unstyled everywhere else (tat-ws, 2026-09-10)

> [!danger] `import 'tippy.js/dist/tippy.css'` sitting in a component is **not** an app-wide import. In the Next.js App Router it is bundled into that route's CSS chunk, so the library is themed on that one route and renders as bare unstyled text on every other.
> [[tat-ws]] had exactly this. `tippy.css` was imported inside two `MiniCalendar` components and nowhere else, so ~38 `<Tippy>` instances across 27 files showed naked strings with no background. `react-tooltip`'s stylesheet (6 usages) was imported **nowhere in the repo at all**.
>
> **What made it read as random rather than broken:** MUI's `Tooltip` styles itself. [[tat-ws]] runs three tooltip libraries side by side — `@mui/material`, `react-tooltip` and `@tippyjs/react` — so the same screen could show one perfectly styled tooltip beside a naked one, purely by which library that call site happened to use. That defeats "is the CSS loaded?" as a first question, because the obvious answer on screen is "yes, sometimes".
>
> **So when a third-party UI library renders unstyled, grep for its stylesheet across the whole repo before theorizing** — and check whether the import you find is at the global entry point or buried in a component. A component-level import looks correct in review and is invisible in a build.
>
> Fix: hoist to `src/styles/global.scss`, where `react-phone-input-2/lib/style.css` already established the idiom. **Placement inside that file is load-bearing** — put vendor CSS between `@tailwind components` and `@tailwind utilities`, not at the bottom. `.tippy-box` sets `background-color` at single-class specificity, so vendor CSS emitted *after* `@tailwind utilities` beats Tailwind on source order and silently kills every `bg-*` class applied to a tooltip (here: `bg-red-600` on `QuestionDropdown`'s disabled state, `bg-customColorSeven` on the material cards). Verify by grepping the built chunk, not the source: `grep -c 'tippy-box' .next/static/css/app/layout.css`. Context: [[tat-ws Tooltips Unstyled]].

## A tooltip that closes when the pointer leaves the trigger can never be copied from (tat-ws, 2026-09-10)

> [!warning] Tippy dismisses on pointer-leave unless `interactive` is set, and `react-tooltip` does the same unless `clickable` is set. Both default to off. A tooltip showing truncated text — a file name, a course name, a full question — is then **unreadable by copy**: reaching for it dismisses it.
> In [[tat-ws]], 2 of ~38 Tippy instances set `interactive`, and 0 of 6 `react-tooltip` usages set `clickable`. Every truncated-text tooltip in the app was look-only.
>
> **Tippy has a global default; react-tooltip does not.** `tippy.setDefaultProps({ interactive: true, interactiveBorder: 10 })` called once from a client component mounted in the root layout covers all 27 files — no per-call-site edit, and no future call site missing it. `react-tooltip` has no equivalent, so `clickable` has to go on each usage and will be forgotten on the next one.
>
> Note the second-order effect before reaching for the global switch: it makes *every* tooltip interactive, including plain icon labels ("Edit Chapter", "Clear all filters") that have nothing worth copying and now linger before closing. Context: [[tat-ws Tooltips Unstyled]].

## `httpOnly` set once by middleware makes every `js-cookie` clear a silent no-op (tat-ws, 2026-08-19)

> [!warning] Logout couldn't delete a cookie it was no longer allowed to see — and only for sessions that had lived long enough to refresh
> tat-ws writes all auth cookies through **`js-cookie`**, which uses `document.cookie` and therefore *physically cannot* set `httpOnly`. Exactly one line disagreed: `middleware.ts` re-set `accessToken` with `httpOnly: true` on the **token-refresh path**. Once that flag lands, client JS can no longer read, overwrite **or delete** that cookie — so `clearAllTokens()`'s `Cookies.remove('accessToken')` silently did nothing, middleware still saw a valid token at `/login`, and bounced the user to `/dashboard`. Logout appeared to do nothing at all.
>
> **The reason it hid for so long is that it is condition-dependent:** fresh login → logout works perfectly. Login, then sit until the access token expires and middleware refreshes it → logout is broken. Any bug gated on "has a refresh happened yet" will pass every quick manual test.
>
> **Rule: cookie *flags* are part of the contract, not a per-write detail.** A cookie written from two places (server middleware and client JS) must agree on `httpOnly`, `domain`, `path` and `sameSite`, because the *clearing* code only ever runs from one side. `grep -rn httpOnly` across the app whenever a cookie won't die.
>
> Resolved by dropping the flag — tat-ws tokens are JS-readable by design ([[TAT API & Auth Model#Cookie storage (tat-ws)]]). Real httpOnly would need server-side writes plus a logout route handler. Related smell in the same function: `clearAllTokens` passes `domain: window.location.hostname` to `Cookies.remove` for cookies that were set **host-only**, which only works because of the no-options fallback right after it. See [[tat-ws Sign-Out 404]].

## A `<Link>` where an action belongs — sign out 404'd and never logged anyone out (tat-ws, 2026-08-19)

> [!danger] One line produced two unrelated-looking symptoms, and the second one is the dangerous half
> tat-ws's only "Sign out" control was `<Link href="/signin">`. There is no `/signin` — login is `/login` — so Next fell through to `not-found.tsx` and rendered a 404. That part is loud and gets reported. **The quiet part: a `<Link>` only navigates**, so `usePostLogout` was never called and the logout request, `clearAllTokens()`, `updateCachedToken(null)`, the React Query cache clear and the cross-tab broadcast never ran. The user saw a 404 and assumed a routing bug; the actual exposure was a session that stayed fully authenticated.
>
> **When a control's job is to *do* something, a wrong `href` doesn't degrade it — it replaces the behaviour entirely.** A broken `href` on a nav link costs you a page. A broken `href` on an *action* costs you the action, silently, and the 404 is the only thing that surfaces. Audit any "Sign out / Delete / Disconnect" rendered as an anchor.
>
> **Second trap, same fix:** `usePostLogout` accepted `mutationArgs: { onSuccess }` and **never passed it to `useMutation`**. The other logout button (`Logout.tsx`) was dutifully passing a callback with `router.push('/login')` + `clearAllTokens()` that could never fire. An accepted-but-unwired param is worse than a missing one — the call site reads as correct, typechecks, and is dead. **If a hook takes a callback, grep that it reaches the config object.**
>
> Both entry points to logout were broken, for different reasons, at the same time. See [[tat-ws Sign-Out 404]].

## A hidden form section still submits its defaults — one shared form, and self-edit silently wipes admin-only data (2026-07-30)

> [!danger] An instructor editing their own profile would have cleared `instructorType` on every one of their TORs, having never seen the control that sets it
> `StaffForm` is one component serving admin-create, admin-edit and self-edit. The new *Instructor authorization* card renders only when `!self && role === 'IN'` ([[Instructor Type - Per-Authority Form 32 Split]]) — but **the Zod schema still carries the field, and `EMPTY_STAFF_FORM` still defaults it to all-`None`**. Submit handlers pass the whole values object straight through (`onSubmit={(values) => mutate(values)}`), so self-edit would have POSTed `{CARC:'none', EASA:'none', GCAA:'none'}` and the backend would have obediently applied it.
>
> **Conditional *rendering* is not conditional *submission*.** RHF keeps every registered default in the values object regardless of what is on screen, and a shared form multiplies the blast radius: the person triggering the wipe is the one with the least authority to change the field.
>
> **Fix:** strip the field at the submit boundary, where the component already knows whether the section was shown — not in the fetcher, which only sees a payload. `onSubmit(shown ? values : {...values, field: undefined})`.
>
> Generalises to any form reused across roles: **audit which defaults survive when a section is hidden**, and treat "hidden" as "must not be transmitted", not merely "not editable".

## Card-morph slider: keep the OUTGOING card full-screen until the new one covers it

When one element morphs into a full-screen background (a thumbnail "opening" into the hero — the [[TAT Website Hero Card-Morph Slider]] effect), the naïve approach shrinks the old background into a thumbnail *while* the new one grows — leaving a moment where **neither covers the viewport**, so the page background flashes through (white). Fix (the CodePen's actual trick): keep the outgoing card **full-screen** (slight `scale` zoom, behind the incoming one) for the whole tween and only **snap** it into its thumbnail slot `onComplete`. Belt-and-suspenders: give the hero container a dark background so any micro-gap (incl. first paint before measure) never shows white. Three more traps from the same build:
- **Auto-advance must restart the timer on every slide change.** A GSAP indicator-bar `onComplete` that only calls `next()` advances the slide but never resets the timer → it fires once then stalls until a manual click. Key the timer `useEffect` on `activeIndex` so it restarts after *any* change (auto or manual).
- Animate `borderRadius` in **px** (`28 → 0`), not `'50%' → '0%'` — percent interpolation on a growing box looks wrong mid-tween.
- A portrait **rounded-rectangle** thumbnail is `width≠height` + a fixed px radius. `rounded-full` on a non-square box is an **ellipse/oval**, not the rounded-rect you usually want.

## App-shell layout: pin to the viewport, scroll only `<main>`

A dashboard shell must be `h-screen overflow-hidden` on the outer flex container so the sidebar + topbar stay fixed and **only the content area scrolls**. Using `min-h-screen` lets the container grow past the viewport, so the whole page (body) scrolls and the sidebar scrolls away with it — a basic but easy-to-miss bug (hit it in [[tat-prereq]]'s first dashboard layout). Correct shape: `flex h-screen overflow-hidden` → `Sidebar` (h-full) + a `flex-1 flex-col overflow-hidden` column → `Topbar` (shrink-0) + `main flex-1 overflow-y-auto`.

## Next.js 16 scaffolding traps (hit on [[tat-prereq]] 2026-06-04)

Cloning [[tat-portal]]'s conventions into a fresh Next 16 repo surfaced three:
- **`next lint` is removed.** Use `eslint` directly (the `package.json` `lint` script is just `"eslint"`). `npx next lint` errors with "Invalid project directory ... /lint".
- **`react-hooks/set-state-in-effect` is now an error.** The stock shadcn `use-mobile` hook (synchronous `setState` in a `useEffect`) fails lint. Fix: rewrite with `useSyncExternalStore` (subscribe + `getSnapshot` + SSR `false` snapshot).
- **`middleware.ts` is deprecated → use `proxy.ts`.** [[tat-prereq]] uses `proxy.ts`: export a function named `proxy` (or a default export), same `config.matcher`, same `NextRequest`/`NextResponse` from `next/server`. **Having both `middleware.ts` and `proxy.ts` is a hard build error.** Confirmed working at runtime (protected route → 307 → /login). Two harmless quirks under Turbopack 16.0.1: the build summary omits the `ƒ Proxy (Middleware)` line and `.next/server/middleware-manifest.json` is empty — Next compiles `proxy.js` then renames it to `middleware.js` internally, and the real manifest is `middleware-build-manifest.js`. **Don't trust the manifest/summary — verify with a runtime curl.** tat-portal still uses `middleware.ts`; migrate it later.
- Also: `lib/env.ts` throws on missing `NEXT_PUBLIC_API_URL`, so **`build` fails at prerender without a `.env.local`** — expected, not a scaffold bug.

## Next 16's react-hooks rules false-positive on react-hook-form primitives

eslint-config-next 16 ships stricter `react-hooks` rules that flag standard RHF usage in the shared `RHFInput` components: `react-hooks/refs` errors on `ref={field.ref}` ("Cannot access ref value during render") even though `field.ref` is a callback ref (correct usage), and `react/display-name` errors on the `forwardRef` phone input. **[[tat-portal]] has the identical 21 problems** — `npm run lint` fails there too; it only stays green because lint-staged checks *changed* files and these aren't usually touched. On a **fresh repo's first commit, lint-staged lints everything and would block it.** Fix in [[tat-prereq]]: a scoped `eslint.config.mjs` override turning `react-hooks/refs`, `react/display-name`, and `@typescript-eslint/no-unused-vars` off for `src/components/ui/RHFInput/**` — keeps the files byte-identical to portal. Portal should adopt the same override.

## tat-ws modals: use MUI `<Dialog>`, not hand-rolled `fixed inset-0`

A hand-rolled `fixed inset-0 flex items-center justify-center` modal **clips behind the fixed top navbar** once its content is tall: vertical-centering puts the header/close-X in the top ~5vh, which the navbar overlaps — so on the online-courses trainees "Exam Answers" modal the title and close button were unreachable (hit 2026-06-28). It can also break entirely if any ancestor has a `transform`/`filter` (then `position: fixed` resolves against that ancestor, not the viewport, and the modal scrolls with the page). **Fix: use MUI `<Dialog>`** — it's the house standard (~246 usages) and portals to `body`, centers against the viewport, scrolls within `max-h`, and gives a reliable close + backdrop/ESC. Mirror `QuestionViewModal` (questions-bank) for a question+options+correct-answer layout. Don't invent a new overlay div when a working dialog pattern exists. Context: [[TAT Certificates - Open Items]].

## MUI X Date Pickers v7 use `.MuiPickers*` classes, not `.MuiOutlinedInput-*` (2026-07-05)

> [!warning] `sx` targeting `.MuiOutlinedInput-*` silently does nothing on MUI X v7 date pickers
> v7 renders a segmented field with `.MuiPickersOutlinedInput-root`, `.MuiPickersOutlinedInput-notchedOutline`, `.MuiPickersSectionList-root` — NOT the legacy `.MuiOutlinedInput-*`. The app's `DatePickerField` `sx` targeted the old names, so styling never applied and it fell back to MUI defaults (Roboto 16px, wrong border/height). Fix: target the `.MuiPickers*` classes. Applies to `ControlledDatePicker` + `DatePickerField` in tat-prereq. Verify the actual class names in the DOM before writing MUI `sx`.
