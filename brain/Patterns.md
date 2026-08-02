---
date: 2026-06-04
description: "Index of recurring patterns and conventions discovered across work — one line per pattern, linking into the four domain notes"
tags:
  - brain
  - index
---

# Patterns

Recurring patterns discovered across work.

Split into domain notes on 2026-08-01, when the single file reached 46KB. Substance lives in the domain notes — **add new entries there, not here.** This page keeps one line per pattern.

## [[Patterns - Method & Conventions]]

_How work gets done in the TAT repos — verification bias, spec-gap routing, ticket hygiene, the propose-before-implementing rule, and where a convention has to live to be reachable._

- [[Patterns - Method & Conventions#`org/people/` is deliberately unused — don't create person notes (Qusai, 2026-08-01)|`org/people/` is deliberately unused — don't create person notes (Qusai, 2026-08-01)]]
- [[Patterns - Method & Conventions#An "Approved" stamp is not a consistency check — approved tickets contradict each other (2026-08-02)|An "Approved" stamp is not a consistency check — approved tickets contradict each other (2026-08-02)]]
- [[Patterns - Method & Conventions#An integration guide describes the FE the backend imagined — verify against the code (2026-08-01)|An integration guide describes the FE the backend imagined — verify against the code (2026-08-01)]]
- [[Patterns - Method & Conventions#Vault-state drift is asymmetric — bias every doubt toward NOT-DONE (2026-07-23)|Vault-state drift is asymmetric — bias every doubt toward NOT-DONE (2026-07-23)]]
- [[Patterns - Method & Conventions#Route each spec-gap kind to the stage that catches it cheapest (2026-07-23)|Route each spec-gap kind to the stage that catches it cheapest (2026-07-23)]]
- [[Patterns - Method & Conventions#TAT bugs often live in a Word doc, not Jira — never back-fill a ticket number (2026-07-16)|TAT bugs often live in a Word doc, not Jira — never back-fill a ticket number (2026-07-16)]]
- [[Patterns - Method & Conventions#No comments or ticket numbers in code (all TAT repos)|No comments or ticket numbers in code (all TAT repos)]]
- [[Patterns - Method & Conventions#Propose before implementing — don't jump to code (Qusai, 2026-07-07)|Propose before implementing — don't jump to code (Qusai, 2026-07-07)]]
- [[Patterns - Method & Conventions#Git workflow — commit to `dev` (TAT repos)|Git workflow — commit to `dev` (TAT repos)]]
- [[Patterns - Method & Conventions#A convention that lives only in a docstring is unreachable — write it where startup reads (2026-07-14)|A convention that lives only in a docstring is unreachable — write it where startup reads (2026-07-14)]]
- [[Patterns - Method & Conventions#A wired hook with an empty branch is where a feature is supposed to live (2026-07-12)|A wired hook with an empty branch is where a feature is supposed to live (2026-07-12)]]

## [[Patterns - Architecture & Boundaries]]

_Where logic belongs — the backend owns business rules and the frontend renders them, one rule means one implementation, and confirm the far side exists before wiring a control to it._

- [[Patterns - Architecture & Boundaries#The backend owns business rules; the frontend renders the answer (2026-07-12)|The backend owns business rules; the frontend renders the answer (2026-07-12)]]
- [[Patterns - Architecture & Boundaries#A fallback branch turns an empty filtered pool into a plausible wrong answer (2026-08-02)|A fallback branch turns an empty filtered pool into a plausible wrong answer (2026-08-02)]]
- [[Patterns - Architecture & Boundaries#The control renders from the server's capability flag, never from a client-side role check (2026-08-02)|The control renders from the server's capability flag, never from a client-side role check (2026-08-02)]]
- [[Patterns - Architecture & Boundaries#One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)|One rule, one implementation — a duplicated rule doesn't drift, it lies (2026-07-12)]]
- [[Patterns - Architecture & Boundaries#A guard that fails open on absent data is disabled by the data, silently (2026-08-01)|A guard that fails open on absent data is disabled by the data, silently (2026-08-01)]]
- [[Patterns - Architecture & Boundaries#Confirm the backend can filter before wiring a frontend filter — an FE select for data the backend doesn't expose is a dead control|Confirm the backend can filter before wiring a frontend filter — an FE select for data the backend doesn't expose is a dead control]]
- [[Patterns - Architecture & Boundaries#Confirm the config/URL exists before wiring a cross-app link (tat-prereq)|Confirm the config/URL exists before wiring a cross-app link (tat-prereq)]]

## [[Patterns - Frontend & UI]]

_Component and UI conventions across tat-prereq, tat-portal, tat-ws and tat-website — forms, tables, uploads, auth gating, cache invalidation and layout._

- [[Patterns - Frontend & UI#All tat-prereq forms must use Zod + react-hook-form — I violated this repeatedly (2026-07-12)|All tat-prereq forms must use Zod + react-hook-form — I violated this repeatedly (2026-07-12)]]
- [[Patterns - Frontend & UI#FE-first dummy-data layer (tat-prereq)|FE-first dummy-data layer (tat-prereq)]]
- [[Patterns - Frontend & UI#Dev auth bypass (tat-prereq)|Dev auth bypass (tat-prereq)]]
- [[Patterns - Frontend & UI#Role gating (tat-prereq)|Role gating (tat-prereq)]]
- [[Patterns - Frontend & UI#Tables|Tables]]
- [[Patterns - Frontend & UI#Table row actions = kebab menu only|Table row actions = kebab menu only]]
- [[Patterns - Frontend & UI#tat-ws: always use the shared `Table` component|tat-ws: always use the shared `Table` component]]
- [[Patterns - Frontend & UI#tat-portal: paginate via the shared URL-driven `CoursePagination`|tat-portal: paginate via the shared URL-driven `CoursePagination`]]
- [[Patterns - Frontend & UI#File uploads: always pass a `FileUploadCategory` (tat-ws)|File uploads: always pass a `FileUploadCategory` (tat-ws)]]
- [[Patterns - Frontend & UI#Surfaces vs page background (TailAdmin reference)|Surfaces vs page background (TailAdmin reference)]]
- [[Patterns - Frontend & UI#Centralized cache-invalidation map for React Query mutations (tat-portal)|Centralized cache-invalidation map for React Query mutations (tat-portal)]]
- [[Patterns - Frontend & UI#Radial layouts = data array + polar math, not hand-tuned offsets (tat-website)|Radial layouts = data array + polar math, not hand-tuned offsets (tat-website)]]
- [[Patterns - Frontend & UI#Async default-value prefill in react-hook-form (tat-prereq)|Async default-value prefill in react-hook-form (tat-prereq)]]

## [[Patterns - Backend & Domain]]

_tat-app-ws service patterns and TAT domain modelling — staff-management wiring, section placement by data ownership, notifications, reject flows and server-generated form PDFs._

- [[Patterns - Backend & Domain#Staff Management is wired to real `/staff-management/*` APIs|Staff Management is wired to real `/staff-management/*` APIs]]
- [[Patterns - Backend & Domain#Staff subsystem section placement: per-instructor lives on the profile (+read-only TOR mirror), per-license lives in the TOR (2026-07-09)|Staff subsystem section placement: per-instructor lives on the profile (+read-only TOR mirror), per-license lives in the TOR (2026-07-09)]]
- [[Patterns - Backend & Domain#History Form is now real + rendered as TAT Form 031 (2026-06-28)|History Form is now real + rendered as TAT Form 031 (2026-06-28)]]
- [[Patterns - Backend & Domain#Notifications: one action → target the right frontend by env-driven base URL (tat-app-ws)|Notifications: one action → target the right frontend by env-driven base URL (tat-app-ws)]]
- [[Patterns - Backend & Domain#Multi-item reject flows: accumulate-and-send only when items share ONE parent status (tat-prereq / tat-app-ws)|Multi-item reject flows: accumulate-and-send only when items share ONE parent status (tat-prereq / tat-app-ws)]]
- [[Patterns - Backend & Domain#Server-generated form PDFs — reuse the shared Puppeteer pipeline; aggregate cross-service data in the controller|Server-generated form PDFs — reuse the shared Puppeteer pipeline; aggregate cross-service data in the controller]]
