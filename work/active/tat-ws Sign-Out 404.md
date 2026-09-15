---
date: 2026-08-19
description: "Sign out was a <Link> to /signin, a route that never existed — one line caused both the 404 and the never-cleared session; a second httpOnly trap was found underneath"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-ws
---

# tat-ws Sign-Out 404

Reported symptom: signing out lands on a 404 page **and** doesn't clear the cache. Both came from the same line.

Committed `dev` `0009831` (4 files). **Not pushed. Not run in a browser** — see [[#Still open]].

## Root cause — one line, both symptoms

`apps/tat-ws/src/layouts/EnhancedLayout/header/UserDropdown.tsx:179`:

```tsx
<Link href="/signin" onClick={closeDropdown}>… Sign out</Link>
```

1. **The 404.** There is no `/signin`. Login is `/login` (`app/(auth)/login/page.tsx`; `routes.ts:15` `login: '/login'`). `find apps/tat-ws/src/app -type d -name signin -o -name sign-in` → no match. Next fell through to `app/not-found.tsx` → `<Error404 />`.
2. **The un-cleared session.** A `<Link>` only navigates. It never invoked `usePostLogout`, so the `/auth/logout` call, `clearAllTokens()`, `updateCachedToken(null)`, the React Query cache clear and the cross-tab logout broadcast **all never ran**.

Blast radius was every authenticated page: `app/(private)/layout.tsx` → `EnhancedLayout` → `AppHeader` → `UserDropdown`, and that dropdown holds the app's **only** "Sign out" control.

## The dead callback underneath it

`usePostLogout` accepted `mutationArgs: { onSuccess }` and **never passed it to `useMutation`**. So `Logout.tsx` — the other, working logout button — was handing it a callback containing `router.push('/login')` and `clearAllTokens()` that could never fire. Two logout entry points, both broken, different reasons. See [[Gotchas - Frontend#A `<Link>` where an action belongs — sign out 404'd and never logged anyone out (tat-ws, 2026-08-19)]].

## Second, independent trap — httpOnly vs js-cookie

`middleware.ts:88` re-set `accessToken` with `httpOnly: true` on the token-refresh path. Every *other* cookie write in the app goes through `js-cookie`, which physically cannot set that flag. Once stamped, client JS could no longer read, overwrite **or delete** the cookie — so `clearAllTokens()` silently failed on it, middleware still saw a valid token at `/login`, and redirected back to `/dashboard`.

Condition-dependent, which is why it hid: fresh login → logout works; a session that had refreshed → logout bounces. `grep -rn httpOnly apps libs src` → that one line only (plus one commented). Dropped it, per [[Gotchas - Frontend#`httpOnly` set once by middleware makes every `js-cookie` clear a silent no-op (tat-ws, 2026-08-19)]].

Decision taken: **tat-ws auth tokens stay JS-readable.** A real httpOnly posture needs server-side cookie writes plus a logout route handler; that was considered and explicitly not taken here, so the one inconsistent line was removed rather than the other ~20 converted. Contract recorded in [[TAT API & Auth Model#Cookie storage (tat-ws)]].

## Fix

| File | Change |
|---|---|
| `layouts/EnhancedLayout/header/UserDropdown.tsx` | `<Link href="/signin">` → button calling `logout()` from `usePostLogout`, disabled while pending |
| `services/api-hooks/auth/usePostLogout.ts` | dropped the never-wired `mutationArgs` param |
| `components/shared/Logout.tsx` | dropped the `onSuccess` that could never run |
| `middleware.ts` | dropped `httpOnly` on the refresh-path cookie |

## Still open

- **Nothing was run in a browser.** The whole fix is typecheck-only — `tsc --noEmit` clean, sole error a pre-existing missing `@testing-library/react` in `specs/index.spec.tsx`. Per [[Patterns - Method & Conventions]] this is built, **not verified**.
- Needs both paths walked manually: fresh login → sign out, and login → wait for a token refresh → sign out.
- Commit is **local only on `dev`** — but see [[Gotchas - Tooling & Method#A commit reached `origin/dev` with no `git push` run — "local only" is not a safe claim here (2026-08-02, recurred 2026-08-12, 2026-09-09/10 and 2026-09-15)|the standing warning that "local only" is not a safe claim in this repo]]. Confirm before assuming it hasn't shipped.
- Noticed, not fixed: `clearAllTokens` passes `domain: window.location.hostname` to `Cookies.remove` for cookies set **host-only** — only works because of the no-options fallback immediately after.
- Noticed, not fixed: `routes.private.notification` is `/notification`; the real route is `/notifications`.

## Related

- [[tat-ws]] — the repo
- [[TAT API & Auth Model]] — the auth contract this sits on
- [[Gotchas - Frontend]] — both traps written up
- [[TAT-434 Email Verification]] — same failure family: a frontend route that didn't match what the other side actually emits
