---
date: 2026-07-08
description: "Notification system for tat-prereq — navbar bell with real-time flashing dot (Socket.IO), a notification detail page, and backend deep-links that route prereq notifications to the staff-management host."
project: TAT-409 Staff Management Subsystem
status: active
quarter: Q3-2026
tags:
  - work-note
---

# TAT Notification System — Bell, Detail Page & Prereq Deep-Links

Wired the notification system into [[tat-prereq]] (bell + real-time flashing dot + detail page) and, in [[tat-app-ws Backend]], repointed every prerequisite/staff-management notification link to the standalone tat-prereq host instead of the admin dashboard.

## Context

The backend already exposed a full `/api/notifications/*` surface (inbox / sent / archived / mark-all-read / toggle read / toggle archive / detail / create / approve) and pushes new notifications in real time over **Socket.IO**: `socketGateway.server.to(userId).emit("notification", notification)`, room = the user's `_id`, auth from `handshake.auth.Authorization` (`Bearer <jwt>`). Nothing consumed any of it on the [[tat-prereq]] side, and the staff-management notification deep-links pointed at the wrong app.

## Notes

### Frontend ([[tat-prereq]])
- **API layer** — `src/types/notification.ts`, `src/api/Notifications/{fetchers,useNotifications}.ts` covering all 9 endpoints; React-Query hooks, mutations invalidate the lists, read/archive toggles are silent (no toast).
- **Real-time** — `src/hooks/use-notification-socket.ts` opens a Socket.IO connection to the API **origin** (strips the `/api` REST prefix), authenticates with the access token, listens for `"notification"`, invalidates the inbox, and fires a callback.
- **Bell** — `src/components/notifications/NotificationBell.tsx` in the `Topbar`: unread badge + **flashing dot** (`animate-ping`) on live arrival, cleared when the dropdown opens; preview list with mark-all-read + per-item read/archive; rows open the detail page.
- **Detail page** — `app/(dashboard)/notifications/[id]/page.tsx` + `NotificationDetailView.tsx`. `GET /notifications/:id` marks it read; renders sender/time/title/body, the parameter deep-links as buttons, and read/archive actions.
- Added dep `socket.io-client`. tat-portal deliberately **not** touched.

### Backend ([[tat-app-ws Backend]]) — route prereq notifications to the staff host
- **New client base URL, env-driven** — `staffManagementUrl` from `STAFF_MANAGEMENT_URL` (staging `https://staging.staff.tat147.com`, prod `https://staff.tat147.com`). Switches per environment like `DASHBOARD_URL`.
- `resolveClientBaseUrl` learns a third client: `clientApp === 'staff-management'` → staff host. **Dashboard stays the default**; online-courses unchanged. Only prereq notifications move.
- `ParameterDto` gained an optional `client`; `bootstrap.service.ts` threads it into `generateNotificationUrl` so the staff base is baked in at seed time.
- `notification-settings.json` — 21 prereq settings (39 params) repointed to tat-prereq routes + tagged `client: "staff-management"`. Deep links: Form 285 → `/staff/{{userId}}/tor/{{torId}}/form-285`, Form 32 → `.../form-32`, assessments → `.../assessment-form`, history → `/staff/{{userId}}/history-form`, the rest → `/staff/{{userId}}`. #55 (portal `/online-courses/my-courses`) and #57–59 (dynamic sit-in URLs) left alone.
- **Deep-linked 285/32 with `torId`** — `notifyForm285Submitted` / `notifyForm32Submitted` / `notifyForm32FieldsRejected` now forward `torId` into `templateValues`. The form responses already carried it via `toDTO`, so no form-service changes were needed.

### Migration (existing DBs)
Bootstrap only seeds **new** settings — staging/prod already have all 66, so the URL changes don't apply on reboot, and a full re-seed is destructive on the shared dev DB (see [[Gotchas]]). Wrote a non-destructive, idempotent script: `scripts/migrations/2026-07-08-repoint-staff-notification-urls.js` — reads the seed JSON as source of truth, bakes each prereq path against `STAFF_MANAGEMENT_URL`, and `$set`s `parameters` on the 21 settings by name. Run with `node scripts/migrations/2026-07-08-repoint-staff-notification-urls.js`.

## Verification
- Backend: `nx run api:build` ✅. Migration syntax-checked + bake logic dry-run against the real seed (21 settings, correct staff-host URLs, placeholders preserved).
- Frontend: `tsc` + `eslint` + `next build` clean; `/notifications/[id]` route registered.
- **Live E2E pending** — needs an authenticated staging session to confirm the socket push flashes the dot and the deep-links resolve. Confirm staging Socket.IO CORS allows the tat-prereq origin.

## Action Items
- [ ] Run the migration against staging (and prod) once `STAFF_MANAGEMENT_URL` is set in each env.
- [ ] Live E2E: trigger a staff-management notification, verify the flashing dot + detail page + deep-link.
- [ ] Confirm staging Socket.IO CORS allows the tat-prereq origin.
- [ ] Decide whether to also deep-link #54/#56 (training-course-requests) — tat-prereq has no dedicated route yet, currently → `/staff/{{userId}}`.

## Related
- [[TAT-409 Staff Management Subsystem]] — parent epic; these notifications drive its TOR/form workflows
- [[tat-prereq]] · [[tat-app-ws Backend]] — the two repos changed
- [[TAT Platform]] — how the frontends (dashboard / portal / staff) map to base URLs
- [[Patterns#No comments or ticket numbers in code (all TAT repos)]] — followed throughout
- [[Gotchas]] — the destructive role-action seeder / re-seed hazard that motivated the migration script
- [[work/Index]]
