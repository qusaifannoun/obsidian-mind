---
date: 2026-08-12
description: "The certificate availability check counts mandatory templates unfiltered, so the Not-available-yet banner never clears — display-only, NOT what blocked activation"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-app-ws
---

# Final TOR Certificate Never Becomes Available — Unfiltered Mandatory-Template Check

> [!warning] CORRECTED 2026-08-12 — this is a display bug, not the activation blocker
> This note originally claimed the gate meant "no certificate can be signed and no TOR can
> ever reach `ACTIVE`". **That was wrong.** `assertCertificatePhaseAvailable` is called from
> exactly two places — `loadCertificateContext` (which sets the `available` flag driving the
> *"Not available yet"* banner) and `isInstructorFormsLocked`. It gates **none** of the write
> paths: `saveInstructorSignature`, `submitInstructor`, `saveQmFields`, `approve` and `publish`
> are all ungated. Qusai signed and approved the certificate on staging with the banner still
> showing and the old code still deployed.
>
> **What actually kept every TOR at `Draft` is [[TOR Sync Never Re-Ran - Stale BullMQ Job Id]].**
> Read that first; this note is the smaller, adjacent bug.
>
> Shipped as [[tat-app-ws Backend]] `b6d866f9` (Qusai). Still worth fixing: the banner would
> otherwise read *"Not available yet"* forever for any instructor who isn't all four roles, and
> `isInstructorFormsLocked` is real behaviour, not cosmetic.

## Root cause

`assertCertificatePhaseAvailable` decides whether the Final TOR Certificate can be signed by requiring an `APPROVED` form for **every mandatory template on the TOR's licence — queried raw**, with none of the role, instructor-type, or authority filtering the rest of the subsystem applies.

The sync processor answers the same question correctly (`staff-tor-sync.processor.ts:130`), filtering first. The certificate service skipped both filters.

All four Form 32 templates are seeded `mandatory: true` (32A/32B/32C/32D), and Form 285 is seeded `mandatory: true` but **CARC-only**. A TOR whose requested roles are a subset — an Instructor who is not also an Examiner *and* a Practical Assessor — legitimately has no 32C/32D form instances, and a GCAA TOR legitimately has no 285. So:

```ts
const form = byTemplate.get(String(t._id));      // undefined for 32C / 32D / 285
return form?.workflowStage === APPROVED;         // → false
```

**A missing form is indistinguishable from a rejected one**, so `allComplete` is false *permanently* — for every TOR not requesting all four roles, not just this one.

~~The certificate can never leave `Draft` … so the TOR can never reach `ACTIVE` either.~~ **Wrong, corrected same day.** The flag is consumed in only two places and neither is a write path:

```
loadCertificateContext  → `available` → the "Not available yet" banner
isInstructorFormsLocked → whether the instructor's other forms lock
```

`saveInstructorSignature`, `submitInstructor`, `saveQmFields`, `approve`, `publish` — **all ungated**. The certificate was signable and approvable the whole time; only the banner lied. The mistake was reasoning from `mandatory: true` in the seed to "therefore it blocks `formsStatus`" without checking who calls the gate. See [[Patterns - Method & Conventions#Grep the call sites before reasoning from a flag's name (2026-08-12)]].

## This is the same rule, written a third time

[[Gotchas - TOR & Staff Management#The TOR "is it active?" rule was written TWICE — the reader lied and the writer was right (2026-07-12)|The 2026-07-12 fix]] found this rule implemented twice, extracted `staff-tor-activation.util.ts`, and converged both callers. **The certificate service was a third caller and was never converged** — it kept its own weaker, unfiltered version. Extracting a shared helper does not retire the forks you didn't know about.

## Evidence

Found by walking the seven activation gates on `/staff/6a7c3471bca64542ab758325/tor/6a7c3475bca64542ab758354` (GCAA, "demo in in", staff number `0003`) — everything on screen read Approved while the TOR stayed `Draft`:

| Gate | |
|---|---|
| `allRequiredDocsApproved` | ✅ 6/6 |
| `historyApproved` | ✅ |
| `mandatoryTrainingValid` | ✅ |
| `aircraftQualificationsValid` | ✅ after approving the A320 qualification |
| `assessmentsValid` | ✅ after approving the A320 assessment |
| `instructorTypeValid` | ✅ **inferred, not read** — see [[#Still open]] |
| `formsStatus` | ❌ Final TOR Certificate stuck in `Draft` |

Certificate page, unchanged after every other gate went green: *"Not available yet — Complete the remaining TOR requirements before the certificate can be signed."*

`staff-tor-certificate.service.ts:692` (before):

```ts
const templates = await this.templateModel
  .find({ licenseId: tor.licenseId, mandatory: true })
  .select("_id formKey")
  .lean();

const nonCertTemplates = templates.filter(
  (t) => t.formKey !== StaffTorFormKey.TOR_CERTIFICATE,
);
...
const allComplete = nonCertTemplates.every((t) => {
  const form = byTemplate.get(String(t._id));
  return form?.workflowStage === StaffTorFormWorkflowStage.APPROVED;
});
```

`staff-tor-sync.processor.ts:130` — the correct version of the same question:

```ts
const applicableTemplates = filterTemplatesByRequestedRoles(
  filterTorFormTemplatesForLicense(templates, license?.name),
  tor.requestedRoleCodes ?? [],
  tor.instructorType,
);
const mandatoryTemplates = applicableTemplates.filter((t) => t.mandatory);
```

`bootstrap.service.ts:1349-1378` — the seeding that makes it bite:

```ts
const form32Templates = FORM_32_AUTHORITIES.flatMap((licenseName) =>
  FORM_32_DEFS.map((def) => ({ /* … */ mandatory: true })));   // 32A/B/C/D
const assessmentReportTemplates = /* … */ mandatory: false
const torCertificateTemplates   = /* … */ mandatory: true
// plus Form 285: licenseName "CARC", mandatory: true
```

## Fix

`assertCertificatePhaseAvailable` now applies the same two filters as the sync processor before selecting which mandatory forms must be approved. Both helpers already existed and `licenseModel` was already injected — no new logic, no new dependency:

```ts
const [templates, license] = await Promise.all([
  this.templateModel.find({ licenseId: tor.licenseId, mandatory: true })
    .select("_id formKey").lean(),
  tor.licenseId
    ? this.licenseModel.findById(tor.licenseId).select("name").lean()
    : Promise.resolve(null),
]);

const applicableTemplates = filterTemplatesByRequestedRoles(
  filterTorFormTemplatesForLicense(templates, license?.name),
  tor.requestedRoleCodes ?? [],
  tor.instructorType,
);

const nonCertTemplates = applicableTemplates.filter(
  (t) => t.formKey !== StaffTorFormKey.TOR_CERTIFICATE,
);
```

Covers both mismatches: role/instructor-type scoping (32C/32D) and authority scoping (Form 285 on a non-CARC TOR). Two stale comments stripped — one (*"Lightweight check: history-approved path is heavy"*) described the very shortcut that caused the bug.

`npx tsc --noEmit -p libs/database/tsconfig.lib.json` → exit `0`.

## Open question for the BA / [[tat-app-ws Backend|Hamza]]

Filtering at read time is the right fix for the gate, but **is all four Form 32s being `mandatory: true` even correct seeding?** If a 32C is genuinely not required for a plain Instructor, the wrongness starts in the seed data, not the reader. That is a product call, not an engineering one. Raised by phone 2026-08-12.

## Still open

- [ ] **NOT VERIFIED, and not verifiable from this machine.** The [[tat-prereq]] frontend on `:3000` talks to `https://staging.api.tat147.com`; nothing listens on `:3333`, so no local backend is running and staging still serves the old code. Needs tat-app-ws run locally with the FE repointed, or a deploy.
- [ ] **ESLint could not run** — this checkout is missing `@nx/eslint-plugin`, so the config fails to load. Pre-existing, but lint is unverified, not passing.
- [ ] **`instructorType` on this TOR is inferred, not read.** Taken as `BOTH` from the certificate rendering "Theoretical, Practical". If it is actually null, `filterTemplatesByRequestedRoles` short-circuits (`if (!requestedRoleCodes?.length && instructorType == null) return templates`) and the fix is a **no-op for this specific TOR** while still correct in general — and `instructorTypeValid` would be failing too. Read the TOR row before concluding this unblocks the record.
- [ ] **Uncommitted, deliberately** — [[tat-prereq]] `e8883c3` reached `origin/dev` **and** `origin/main` today with no push issued ([[Gotchas - Tooling & Method#A commit reached `origin/dev` with no `git push` run — "local only" is not a safe claim here (2026-08-02, recurred 2026-08-12, 2026-09-09/10 and 2026-09-15)|the unexplained auto-push]]). Do not assume a commit here stays local.
- [ ] **Product gap, not fixed: no TOR page states which gate is blocking.** `staff-management.service.ts:1919` computes all seven gates and returns only `{ derivedStatus, incomplete }` — a bare boolean, discarding every failing gate name. Widening that return and rendering the names on the TOR header turns this investigation into one glance. QA will hit this wall repeatedly.
- [ ] **Dev fixtures named after statuses** — Form 32A holds aircraft *"A320 Approved (TOR Dev)"*, 32B holds *"A320 Rejected (TOR Dev)"*. Those words are aircraft names, not statuses, and they make the page unreadable at a glance. Worth renaming.

## Related

- [[TAT-455 Final TOR Certificate - SA Publish Gate]] · [[TAT-450 TOR Certificate FE - Read Path Only]] — both blocked behind this; their write paths have never run
- [[TAT-450 AC-45 Superseded by TAT-455 - Certificate Not Auto-Released]] — the spec ruling on the same certificate
- [[Form 32 C-D Fail-Open - Empty requestedRoleCodes on Legacy TORs]] · [[Instructor Type - Per-Authority Form 32 Split]] — the two fields this gate now reads
- [[Staff Management Subsystem & TOR Model]] · [[TAT-409 Staff Management Subsystem]]
- [[Patterns - Architecture & Boundaries]] · [[Gotchas - TOR & Staff Management]]
- [[tat-app-ws Backend]] · [[tat-prereq]]
- [[Systems Thinking]] — the gate and the writer each read coherently; the bug was that they answered the same question by different rules
- [[Debugging & Root Cause Analysis]] — eliminated six gates one at a time against live staging before reading the seventh's source
