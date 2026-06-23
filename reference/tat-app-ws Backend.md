---
date: 2026-06-02
description: "TAT backend — NestJS/Nx monorepo (MongoDB, Redis/BullMQ, S3, CCAvenue) serving every frontend; the api and exam-portal deployables and their modules"
tags:
  - reference
  - project/tat
---

# tat-app-ws Backend

The backend hub of the [[TAT Platform]] — one NestJS/Nx monorepo serving all three frontends. The contract it exposes is documented in [[TAT API & Auth Model]].

## Stack

- **NestJS 9** (TypeScript), **Nx 20** monorepo, REST + Swagger.
- **MongoDB** (Mongoose; a second connection for the question bank).
- **Redis** — BullMQ job queues (Bull Board admin at `/api/admin/queues`) + cache-manager.
- **AWS S3** (signed URLs, file-conversion queues), **Puppeteer** (PDF/cert generation), **Nodemailer** (Office365 SMTP).
- **CCAvenue** payments.

## Deployables (apps/)

| App | What | Port |
|-----|------|------|
| `api` | Main NestJS REST API | 3333 |
| `exam-portal` | Next.js + Electron exam delivery | 4200 |
| `api-e2e` | Cypress E2E | — |

Dockerfiles: `Dockerfile.api` (installs Chromium for Puppeteer), `Dockerfile.exam-portal`.

## Domains (apps/api/src/app/)

`auth`, `user`, `course`, `enrollment`, `exam`, `exam-enrollment`, `exam-submission`, `online-course` (the e-learning side: enrollments, progress, materials, orders, cart, certificates), `payment`, `certificate`, `notifications` (WebSocket + email), `file` (S3 + conversion), `license` (aircraft type licensing), `attendance`, `schedule`, `classroom`, `action` + `role-action` (audit + RBAC), `country`, `config`.

## Shared libs (libs/)

`schemas` (Mongoose models), `database` (module, auth service, guards, filters), `dtos`, `entities`, `app-data` (enums/constants/bootstrap), `email` (Handlebars templates), `question-bank` (separate DB), `helpers`/`utils`/`validators`/`models`.

## Run locally

Needs Node 20, MongoDB, Redis (`:6379`). Key env: `MONGO_URI`, `REDIS_*`, `ACCESS_TOKEN_SECRET`/`REFRESH_TOKEN_SECRET`, `AWS_*`/`BUCKET_NAME`, `CCAVENUE_*`, `SMTP_*`, `SUPER_ADMIN_*`.

```bash
npm install
nx serve api          # API, hot reload, :3333
npm run exam:dev      # Electron exam-portal
nx graph              # dependency graph
```

> [!warning] No architecture doc
> This repo has only an Nx boilerplate README — knowledge lives in code + seed_data/. Highest-risk repo to change blind. Capture decisions here as you learn them.

## Related

- [[TAT Platform]] · [[TAT API & Auth Model]]
- Consumers: [[tat-portal]] · [[tat-website]] · [[tat-ws]]
