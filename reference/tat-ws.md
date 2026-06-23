---
date: 2026-06-02
description: "tat-ws — desktop + web dashboard for TAT staff (Next.js 14 + Electron): courses, exams, certificates, documents, scheduling, with kiosk-hardened proctored exams"
tags:
  - reference
  - project/tat
---

# tat-ws

The **staff/operations dashboard** of the [[TAT Platform]] — a hybrid **Next.js 14 + Electron** app. Multi-role LMS (13+ roles: trainees, instructors, managers, examiners, auditors, admin…) covering course catalog, exam composition, certificate issuance, company documents, and training scheduling. The Electron build runs **kiosk-hardened proctored exams**.

## Desktop vs web

- Web: Next.js (`tat:dev`, ~`:4200`). Desktop: Electron (`tat:electron`) — hardened runtime, context isolation, frameless kiosk (`fullscreen`, `alwaysOnTop`), preload IPC bridge.
- Some features are **Electron-only** (e.g. `/my-documents`) with web fallback modals.
- Packaging: `tat:package:mac|win|linux` (DMG / NSIS / AppImage).

## Stack

Next.js 14 + Electron 39 · **Nx monorepo** · MUI 6 + Tailwind + Styled Components · TanStack React Query + **Zustand** · FullCalendar, ApexCharts/Chart.js/MUI X-Charts · RHF + Formik + Zod/Yup · @dnd-kit · TinyMCE/Quill. Auth/API per [[TAT API & Auth Model]] (axios interceptors in `apps/tat-ws/src/utilities/apiClient.js`).

## Shape

- `apps/tat-ws/` — App Router groups `(public)`/`(private)`/`(auth)`/`(error)`; `src/electron.js` (main), `src/preload.js` (IPC).
- libs: `configs` (enums/routes/roles), `services` (API + RQ hooks), `ui`, `hooks` (`useElectron`…), `models`, `utils`.
- Repo-local notes in `tat-ws/obsidian/`: Home, a public-pages redesign session, a manage-profile execution plan.

## Run locally

```bash
yarn install
yarn tat:electron     # Next + Electron
yarn tat:dev          # web only, :4200
yarn tat:package:mac  # build installer
```
Needs a running [[tat-app-ws Backend]].

## Related

- [[TAT Platform]] · [[TAT API & Auth Model]] · [[tat-app-ws Backend]]
