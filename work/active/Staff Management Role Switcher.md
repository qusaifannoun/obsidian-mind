---
date: 2026-10-15
description: "tat-prereq merged every role a user held for UI gating while the backend acted only as the token's role; added a tat-ws-style switcher and gated by the active role"
tags:
  - work-note
  - project/tat
status: active
quarter: Q4-2026
project: tat-prereq
---

# Staff Management Role Switcher

Request: a role switcher in [[tat-prereq]] that behaves like [[tat-ws]]'s. Committed `8161ec7` ("feat(auth): add a role switcher and gate the app by the active role"), pushed to `origin/dev` **and** `origin/prepod` 2026-10-15. **Typecheck, lint and build only — never run in a browser.** See [[#Still open]].

## Root cause — the UI and the backend disagreed about who you are

`roleCodesOf()` in `src/config/access.ts` returned the **union** of `user.activeRole`, `user.role.code` and every `secondaryRoles[].code`. That list drove the sidebar, the `proxy.ts` route guard and every `useUserRole()` check. The backend does the opposite: `jwt-at-strategy.ts` replaces `req.user.role` with the role in the token's payload, so a request is authorized as **one** role.

So an Instructor holding a secondary Training Manager role saw Pending TORs and TM controls, while every request they made was evaluated as an Instructor. A switcher layered on top of the union would have changed nothing visible. See [[Gotchas - Frontend#Unioning a user's roles for UI gating lets the UI promise what the token can't do (tat-prereq, 2026-10-15)]].

## Decision

**Gate by the active role only**, the same as tat-ws and the backend. Chosen by Qusai over "keep the union and let the switcher change only the token". Consequence: multi-role users must switch to reach their other roles' pages. Logged in [[Key Decisions#2026-10-15 — Staff Management gates by the active role only]].

## What the backend already provided (no backend change)

From `tat-app-ws` `libs/database/src/lib/auth/auth.service.ts`:

- `switchRole(userId, roleCode)` checks the code is the user's primary or a secondary, signs a new access + refresh pair with `role: roleCode`, and returns `user: { ...sanitizedUser, activeRole: roleCode }`.
- `refreshToken()` re-signs with `role: decodedToken.role`, so a switched role survives refresh.
- `staffManagementLogin()` resolves the active role (`resolveStaffManagementActiveRole`: primary if it is a Staff Management role, else the first eligible secondary) and calls `switchRole` when it differs from the primary.
- `switchRole` does **not** restrict to Staff Management roles: it would happily switch to Trainee. The frontend filters the list.

## Fix — `8161ec7`

- `config/access.ts`: `activeRoleOf(user)` (`activeRole ?? role.code`, so old `auth_user` cookies still work); `roleCodesOf` returns only that; `switchableRolesOf(user)` = primary + secondaries, filtered to `ALL_STAFF_ROLES` (now exported) and de-duplicated.
- `hooks/use-user-role.ts`: `primaryRole` → `activeRole`. Its two consumers in `HistoryFormView.tsx` (`canApproveForm`, `canRequest`) now follow the active role.
- `api/Auth`: `switchRole` fetcher + `useSwitchRole` hook (`meta.successMessage` → global toast).
- `components/layout/RoleSwitcher.tsx` in `Topbar`, before the notification bell. Radix dropdown in the `UserMenu` style; a plain label with one role. On success: `loginSuccess` (tokens + `auth_user` cookie + Redux), `queryClient.invalidateQueries()`, then push to `firstAccessibleRoute` for the new role.
- `UserMenu` shows the active role's label instead of `user.role.name`.

## Still open

- [ ] Browser-verify with a multi-role Staff Management user: the sidebar changes on switch, the landing page follows the new role, and the role survives a reload. Chrome was unresponsive on 2026-10-15, and the test needs a login.
- [ ] No cross-tab sync. tat-ws broadcasts a role switch to other tabs; tat-prereq has no cross-tab code, so other tabs keep the old role until they reload.
- [ ] **SSO lands on the primary role regardless of eligibility.** `exchangeSsoToken` signs with `sanitizedUser.role.code` and never applies `resolveStaffManagementActiveRole`. A user whose primary role is not a Staff Management role arrives with an empty sidebar and must use the switcher. Backend gap, Hamza Dawahreh's code (unverified that any such user exists).

## Related

- [[tat-prereq]] · [[tat-ws]] · [[tat-app-ws Backend]]
- [[Staff Management Subsystem & TOR Model]]
- [[Patterns - Architecture & Boundaries#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]]
- [[Expired Sessions Undetected Across All TAT Frontends]]: the previous change to the same auth layer
- [[Index|Work Index]]
