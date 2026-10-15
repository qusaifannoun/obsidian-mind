---
date: 2026-10-01
description: "New TAT forms that output an editable Word document fill a .docx template with docxtemplater instead of building HTML for the server to convert"
status: accepted
tags:
  - decision
---

# Decision: Word Templates for Generated Documents

## Context

Upcoming TAT forms (a proposal first) need to produce an **editable Word document**: the same document with different client names, companies, prices and so on. The existing way to generate documents is an HTML builder rendered server-side (the Puppeteer pipeline behind Form 031/032), which produces a locked PDF and needs a developer for every wording or layout change.

## Options Considered

1. **HTML template → server → Word.** The document is written as HTML, and the server converts it. Converting HTML to `.docx` always loses some layout, and every change to the document is a code change.
2. **Word `DOCPROPERTY` fields** in a `.dotx`. Works for a person filling the document by hand, but a generated file shows stale cached values until someone presses F9 in Word.
3. **A `.docx` template with `{placeholders}` filled by docxtemplater.** The form sends values, and the template is a normal Word file.

## Decision

**Option 3.** New forms whose output is an editable Word document use a `.docx` template filled by `docxtemplater` + `pizzip`. How it works and the template rules: [[Word Template Document Generation]].

Why: the output looks exactly like the template, non-developers can edit the template in Word, the frontend sends only data, and loops/conditionals (pricing rows, optional sections) are built in.

**Scope:** editable Word output only. Locked compliance PDFs (TAT Form 031/032, Form 32/285) stay on the HTML → Puppeteer pipeline.

## Consequences

- The form schema / backend DTO is the contract with the template: placeholder names must match field names.
- **Settled for the TAT-314 forms (2026-10-15):** rendering runs **in the browser** (can view = can export, no new endpoint), templates ship **inside the build** (`apps/tat-ws/src/assets/templates/forms/`, imported so webpack serves them from `/_next/static/media/` — `public/` is not served by the live servers), and signatures/stamps go in through an in-house image helper rather than a paid or CVE-carrying module — see [[Forms - No Field Validation & Export to Word]].
- **Still open (as of 2026-10-15):** template storage outside a deploy, and how a `.docx` gets past the upload endpoint's PDF conversion — both only matter if admins ever upload templates.
- Adds `docxtemplater` + `pizzip` to [[tat-ws]] (and to tat-app-ws if rendering moves there).

## Related

- [[Word Template Document Generation]]
- [[Proposal Generator - Word Template Spike]]
- [[Patterns - Backend & Domain#Server-generated form PDFs — reuse the shared Puppeteer pipeline; aggregate cross-service data in the controller]]
