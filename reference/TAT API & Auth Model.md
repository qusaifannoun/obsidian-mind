---
date: 2026-06-02
description: "The shared API contract all TAT frontends consume — JWT auth with refresh rotation, CCAvenue payment callbacks, and S3 signed-URL media"
tags:
  - reference
  - project/tat
---

# TAT API & Auth Model

The contract that [[tat-app-ws Backend]] exposes and that [[tat-portal]], [[tat-website]], and [[tat-ws]] all consume. Documenting it once here because it's the seam where the repos meet — a change to any of these patterns is a cross-repo change.

## Base & Docs

- REST under `/api`. Swagger at `http://localhost:3333/api/docs`.
- Frontends point at it via env: `NEXT_PUBLIC_API_URL` (portal/website), `@tat-ws/configs/env` (tat-ws). Dev/staging hosts under `api*.tat147.com`.
- Response envelope (frontends): `{ data, message?, success, status }`.

## Auth (JWT)

- `POST /auth/login` → `{ user, accessToken, refreshToken }`. Token fields are **camelCase**.
- `POST /auth/refresh-token` with `{ refreshToken }` → new token pair.
- Access token sent as `Authorization: Bearer <token>`.
- **Refresh flow (client interceptor):** on `401` → pause in-flight requests → refresh → resume; on refresh failure → clear tokens + redirect to login.
- Role-based guards on the backend: `SUPERADMIN`, `ADMIN`, `INSTRUCTOR`, `STUDENT` (+ tat-ws uses a wider 13+ role set).
- SSO: `tat-portal` exchanges a code at `/auth/exchange-sso-token`.

> [!warning] Never desync token + state
> In `tat-portal`, always use the atomic auth thunks (`loginSuccess` / `logout`) — never `saveTokens` + `dispatch(setUser)` separately. This caused subtle logged-in/out mismatches. See `tat-portal/ARCHITECTURE.md §4`.

## Payments — CCAvenue

- `POST /online-courses/orders/checkout` → `{ orderId, encRequest, accessCode, paymentUrl }`.
- Frontend builds a hidden form and POSTs straight to CCAvenue (gateway-hosted; app never handles card data).
- Gateway → backend callback (public, no-auth) creates enrollments + clears cart, then redirects to `/payment?status=...`.
- **Gotcha:** backend sends `"faild"` (typo) for failures — the portal's `normalizePaymentStatus` handles it explicitly. Don't "fix" the typo without coordinating both repos.

## Email links (verification / password reset) — cross-app gotcha

The backend builds the links it emails (verify-email, reset-password) based on a request header, and the links are **query-param**, not path-param. Two things every frontend must get right:

- **`X-Client-App` header** — each frontend must send it (e.g. `online-courses` for [[tat-portal]]) on its Axios client + server clients. The backend keys off it to point email links at the right app (portal vs. backoffice), **even on localhost**. Missing it → emails link to the wrong app.
- **Query-param landing routes** — the backend emails:
  - `/email-verify?token=<token>`  (NOT `/verify-email/<token>`)
  - `/reset-password?token=<token>`
  The frontend route must read `?token=` via `useSearchParams` (wrap in `<Suspense>`), then call `PATCH /auth/external-user/verify-email/{token}`.

> [!warning] Verified the hard way (TAT-434)
> tat-portal originally had only a path-param `/verify-email/[token]` route, so real verification emails 404'd. Fixed by adding `/email-verify?token=` + the `X-Client-App` header. See [[TAT-434 Email Verification]]. When auditing an auth flow, check the *actual emailed link format* — don't assume the existing frontend route matches the backend.

## Certificates — two independent systems

TAT has **two separate certificate models/collections** (the "two cert types" — easy to conflate):

| | General `Certificate` | `OnlineCourseCertificate` |
|---|---|---|
| API | `/certificates/*` | `/online-courses/certificates/*` |
| Content | `filledContent` (editable HTML) + templates | generated `pdfUrl` only |
| Editable? | **Yes** — `PATCH /certificates/{id}` (`{filledContent,issueDate,expiryDate}`) | **No** — controller is GET-only (`my`, `enrollment/:enrollmentId`, `:id`) |
| Used by | certificate-catalog (admin); covers course + license/aircraft via `courseId`/`licenseId` | online-courses Manage Trainees row (per `enrollmentId`) |

They're **independent** — `OnlineCourseCertificate` doesn't reference `Certificate`. So "edit a certificate" only applies to the general system; online-course certs are view-only PDFs. The `PATCH /online-courses/{id}/certificates/{type}` endpoint edits a course's certificate **template HTML**, not an issued cert. Verified building [[TAT-428 Edit Issued Certificates]].

### Certificate template preview (two endpoints, by domain)

The shared `CertificateEditor` has a Preview button that renders the in-progress template HTML with **dummy data**. There are **two** preview endpoints — they differ by which placeholder token syntax the backend substitutes:

| | Aircraft / general | Online course |
|---|---|---|
| Endpoint | `POST /certificate-templates/preview` | `POST /online-courses/certificate-templates/preview` |
| Token syntax | single-brace `{ token }` | double-brace `{{ token }}` |
| Request / response | `{ content }` → `{ previewContent }` (identical shape) | same: `{ content }` → `{ previewContent }` |

The editor routes by its `courseType` prop (`'online'` → online endpoint). Using the wrong one is silent — the aircraft endpoint won't touch `{{ }}` tokens, so an online preview comes back with placeholders unfilled. See [[Gotchas - Frontend#Two certificate-template preview endpoints — wrong one leaves tokens unsubstituted]]. Wired 2026-06-26 ([[TAT Certificates - Open Items]]).

## Media (protected content)

- Learning media served via **S3 signed URLs**; backend ideally tags explicit `IMAGE`/`AUDIO` types.
- Frontends deter download/copy (canvas PDF, Plyr video) but signed URLs are still visible in DevTools — deters casual exfiltration only.

## Related

- [[TAT Platform]] — system overview
- [[tat-app-ws Backend]] — where this contract is implemented
- Authoritative detail for the storefront side: `tat-portal/ARCHITECTURE.md` §4–§6
