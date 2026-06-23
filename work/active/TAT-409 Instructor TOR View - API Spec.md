---
date: 2026-06-21
description: "RESOLVED — backend granted instructors access to /tors/:torId/details, so the existing FE works unchanged. Spec kept for reference (the /tors/:id enrichment route was not taken)."
tags:
  - work-note
status: completed
quarter: Q2-2026
team: Backend
---

> [!success] Resolved 2026-06-21
> The backend **granted instructors access to `GET /tors/:torId/details`** (the
> chosen fix, rather than enriching `/tors/:id`). Since the FE already calls
> `/details` for every role, **no frontend change was needed** — the instructor
> TOR view now works. This spec is retained only as reference for the alternate
> approach that wasn't taken.

# TAT-409 — Instructor TOR View: `GET /tors/:id` Field Spec

**For:** Backend team · **Base URL (staging):** `https://staging.api.tat147.com/api`

## Problem

An **instructor cannot open their own TOR**. The FE TOR Details page calls
`GET /staff-management/tors/:torId/details`, but that endpoint is reviewer-only:

- Route guard `@Action(SM_VIEW_PENDING_TORS)` — instructors don't have it.
- `getTorDetails()` also throws `ForbiddenException` when `!canViewPendingTors(actor)`.

The instructor self-endpoint `GET /staff-management/tors/:id` (`getTorById`,
gated by `SM_VIEW_STAFF`) **is** reachable by instructors — but it returns the
**raw `StaffTor` document**: no assembled `sections[].forms[]`, and `licenseId`
is an unpopulated ObjectId. So the page would load with no license name and an
empty component list.

## Ask

Make `GET /staff-management/tors/:id` return the **same shape** as
`/tors/:id/details` (the `TorDetailsResponseDTO`). Simplest implementation:
reuse `buildTorDetailsSections(tor)` + `evaluateTorCompletion(...)` inside
`getTorById`, and populate the license.

> Alternative (also fine): allow the **TOR owner** through `/details` by adding a
> self check to `canViewPendingTors` / the route action. Either keeps a single
> shape the FE already consumes.

## Required response shape

```jsonc
{
  "torId": "string",
  "userId": "string",

  // POPULATE — currently a raw ObjectId. name ∈ CARC | EASA | GCAA
  "licenseAuthority": { "id": "string", "name": "CARC" },

  "authorityName": "string",          // = license name; currently absent

  // DERIVED status (recompute from forms), NOT the raw stored value.
  // draft | active | paused | archived
  "torStatus": "active",

  "scopeOfApproval": "string | null",
  "activatedAt":     "ISO date | null",   // FE shows this as creation date
  "expiresAt":       "ISO date | null",

  // The core of the page — currently absent entirely (TAT-435 AC-09/10/11)
  "sections": [
    {
      "section": "string",            // section name / label
      "forms": [
        {
          "formId": "string | null",  // null when the form doesn't exist yet
          "formKey": "form_285",      // form_285 | form_32a | form_32b | form_32c | form_32d | history | assessment_report
          "title": "string",
          "status": "active",         // active | pending_approval | rejected | expired | missing
          "expiresAt": "ISO date | null",
          "highlights": {             // AC-11 indicators
            "isRejected": false,
            "isWaitingApproval": false,
            "isExpired": false,
            "isMissingMandatory": false
          }
        }
      ]
    }
  ]
}
```

## Field checklist

| Field | On `/tors/:id` today | Action |
|---|---|---|
| `torId`, `userId` | ✅ present | — |
| `licenseAuthority` `{id,name}` | ❌ raw ObjectId | **populate** |
| `authorityName` | ❌ missing | add (= license name) |
| `torStatus` | ⚠️ raw stored value | return **derived** status |
| `scopeOfApproval` | ✅ present | — |
| `activatedAt`, `expiresAt` | ✅ present | — |
| `sections[]` → `forms[]` | ❌ missing entirely | **add full tree** |
| `forms[].formId` | ❌ | add (null if not created) |
| `forms[].formKey` | ❌ | add (enum above) |
| `forms[].title` | ❌ | add |
| `forms[].status` | ❌ | add (5-state enum) |
| `forms[].expiresAt` | ❌ | add |
| `forms[].highlights` | ❌ | add (4 booleans) |

## Also apply here

**CARC-only Form 285 filter** — reuse `filterTorFormTemplatesForLicense` (the
one already added to `/details` and the sync processor) so an instructor on an
EASA / GCAA TOR doesn't get a Form 285 entry.

## Related
- [[TAT-409 Backend Open Items]] — full backend bug/gap list
- [[TAT-409 Staff Management Subsystem]]
- [[Staff Management Subsystem & TOR Model]] — TOR/forms data model
- [[tat-app-ws Backend]] — target repo
