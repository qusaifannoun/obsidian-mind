---
date: 2026-08-02
description: "Instructor visibility of an approved Final TOR Certificate became a separate publication state; SA publish/unpublish built off DTO capability flags, nothing verified — no cert has ever reached APPROVED"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-prereq
ticket: TAT-455
---

# TAT-455 — Final TOR Certificate: SA Publish Gate

**Publication is now its own state, not a consequence of QM approval.** An approved Final TOR
Certificate stays invisible to the instructor until a Super Admin publishes it — approval and
visibility were previously the same event, and TAT-455 splits them.

> [!success] BA-confirmed 2026-08-02 — this ticket wins the contradiction with TAT-450 AC-45
> TAT-450 AC-45 requires the opposite (release on QM approval). The BA ruled **TAT-455
> correct**; AC-45 is the wrong AC. No code change — the implementation already followed this
> ticket. See
> [[TAT-450 AC-45 Superseded by TAT-455 - Certificate Not Auto-Released]].

Fourth consecutive ticket where **Dawahreh shipped the backend with no frontend**
(`35736850`, [[tat-app-ws Backend]]), the same shape as TAT-449/454/450 in the
2026-07-28 → 07-31 drop — see [[TAT-450 TOR Certificate FE - Read Path Only]] and
[[TAT-454 Instructor Assignment Filtering - courseMethod]].

Same publish-gate concept as [[TAT-436 Refresher Certificate Publish]], one subsystem over:
there it's the online-course certificate in [[tat-ws]], here the TOR certificate in
[[tat-prereq]].

## Shipped

`tat-prereq` — on `dev`:

- **`251dde6`** — publish/unpublish mutations, types, and the instructor pending-publication state
- **`44c1f92`** — AC-05: the control on the TOR details page, card extracted. **Unpushed.**

**The control is driven purely off `canPublish` / `canUnpublish` from the DTO — never a
client-side role check**, so the button cannot disagree with the server about who may act.
See [[Patterns - Architecture & Boundaries#The control renders from the server's capability flag, never from a client-side role check (2026-08-02)]].

**AC-05 was missed on the first cut.** It requires publishing from the **TOR details page**;
the control went on the certificate sub-page. Corrected by extracting
`TorCertificatePublicationCard` as an exported component consumed by both views — second
occurrence, so extract rather than fork.

## Evidence

The contract the FE types were written against, confirmed by a live `GET` on staging:

```json
{"status":200,"workflowStage":"draft","available":false,
 "published":false,"publishedAt":null,"publishedBy":null,
 "canPublish":false,"canUnpublish":false,"dataPublished":false}
```

**Route probe distinguishing "deployed" from "guarded"** — a bogus sibling route 404s while
the real ones 403 on the auth guard, which proves they exist on staging rather than merely
being absent:

| route | status |
|---|---|
| bogus sibling | 404 |
| publish | 403 |
| unpublish | 403 |

The backend gate (`staff-tor-certificate.service.ts`): owner **+** non-privileged **+**
`APPROVED` **+** `!published` → `ForbiddenException`. `draft` / `pending_qm` stay open, so
the instructor can still sign their own certificate before it is approved.

## Still open

> [!danger] **Nothing is verified.** `tsc` + `eslint` clean and the contract confirmed by a live `GET` — that is all.
> No publish/unpublish round-trip has run. The instructor 403 has never fired. No QM or TM
> view of this feature has ever rendered.
>
> **Blocked upstream:** no certificate on staging has ever reached `APPROVED` — all 16 staff
> show 0 active TORs — so [[TAT-450 TOR Certificate FE - Read Path Only|TAT-450]]'s write
> path remains unexercised and this gate has no reachable state to test against.

> [!warning] The instructor 403 is discriminated by **exact message string**
> `isTorCertificateNotPublished` matches on copy, because `torCertificateNotAuthorized` is
> **also a 403 on the same endpoint** and the backend returns **no error code**. Asked Hamza
> for a code; not yet provided. **If the copy changes, the instructor sees a generic load
> error instead of "Pending publication"** — a silent regression with nothing to fail on.
> See [[Gotchas - Forms & Approval#Two different 403s on one endpoint with no error code — the FE can only tell them apart by message string (2026-08-02)]].

- **Global React Query `retry: 1`** means the instructor's 403 fires **twice** before the
  blocked state renders. Left alone deliberately — changing a global retry policy for one
  error path is the wrong trade.
- **`44c1f92` is unpushed.**

> [!bug] Unexplained: `251dde6` reached `origin/dev` with no `git push` ever run
> No post-commit hook exists in either repo. `git reflog show origin/dev` records it as
> **"update by push"**. Mechanism unknown. Until it is explained, **treat "local only" claims
> in this environment as unreliable** — the assumption that an uncommitted-to-remote SHA is
> private is not currently safe.
> See [[Gotchas - Tooling & Method#A commit reached `origin/dev` with no `git push` run — "local only" is not a safe claim here (2026-08-02)]].

## Related

- [[TAT-450 TOR Certificate FE - Read Path Only]] — the read path this publishes; its
  unexercised write path is what blocks verification here
- [[TAT-436 Refresher Certificate Publish]] — the same publish-gate concept for online-course
  certificates in [[tat-ws]]
- [[TAT-454 Instructor Assignment Filtering - courseMethod]] — same backend-without-frontend
  pattern, prior drop
- [[TAT-449 Staff Number Display - Unpadded staffNumber]] — the `staffNumber` behind
  **TAT-450 AC-12**'s Authorization Number; it holds an unpadded `3`, which breaches the
  `0001` format the AC requires
- [[Sequential User Number - Atomic Allocation & Backfill]] — the allocator and backfill
  behind that field
- [[TAT Certificates - Open Items]] · [[TAT-409 Backend Open Items]]
- [[Staff Management Subsystem & TOR Model]] · [[TAT-409 Staff Management Subsystem]]
- [[tat-prereq]] · [[tat-app-ws Backend]]
- [[Patterns - Architecture & Boundaries#The control renders from the server's capability flag, never from a client-side role check (2026-08-02)]]
- [[Index|Work Notes]]

### Competencies

- [[Delivery & Scope Management]] — caught a missed AC (AC-05, publish from the TOR details
  page) against the ticket rather than shipping the plausible placement, and stated the
  feature as **entirely unverified** instead of letting clean `tsc` imply working.
- [[Code Quality]] — the second consumer of the publication control triggered an
  **extraction** (`TorCertificatePublicationCard`), not a second copy, so the two views cannot
  drift.
- [[Systems Thinking]] — separated "the route is missing" from "the route is guarded" with a
  bogus-sibling probe, turning a pair of 403s into positive evidence of deployment.
