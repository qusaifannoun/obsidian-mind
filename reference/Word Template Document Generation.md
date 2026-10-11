---
date: 2026-10-01
description: "How TAT generates editable Word documents — a .docx template with {placeholders} filled by docxtemplater from form values, instead of HTML templates rendered server-side"
tags:
  - reference
  - project/tat
---

# Word Template Document Generation

The approach for **new TAT forms whose output is an editable Word document** (proposals first). Decided in [[Decision - Word Templates for Generated Documents]]; first exercised by [[Proposal Generator - Word Template Spike]].

A form collects values → the values are merged into a `.docx` template → the user gets a finished `.docx`. Nobody writes HTML for the document, and the frontend never knows what the document looks like.

```
Form (RHF + zod) ──values──▶ docxtemplater( template.docx , values ) ──▶ filled .docx
                                    ▲
                     template bytes from /public, the backend, or S3
```

## When to use it — and when not

| Output | Use |
|---|---|
| Editable Word doc that a person sends on (proposal, letter, quote) | **This approach** |
| Locked compliance form rendered to PDF (TAT Form 031, 032, Form 32/285) | The existing HTML → Puppeteer pipeline — [[Patterns - Backend & Domain#Server-generated form PDFs — reuse the shared Puppeteer pipeline; aggregate cross-service data in the controller]] |

## Libraries

- `docxtemplater` + `pizzip` — both run in the browser **and** in Node, so the same render code moves from [[tat-ws]] to [[tat-app-ws Backend]] unchanged.
- Render options used: `{ paragraphLoop: true, linebreaks: true, nullGetter: () => '' }`. Without `nullGetter`, a missing value renders as the literal `undefined`.

```ts
const doc = new Docxtemplater(new PizZip(templateBytes), { paragraphLoop: true, linebreaks: true, nullGetter: () => '' });
doc.render(values);
const blob = doc.getZip().generate({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
```

## Template authoring rules

- **Plain `{camelCase}` placeholders** typed in the document text. Names must match the form schema / DTO field names exactly — the schema *is* the template contract.
- **Loops:** `{#items}…{/items}`. In a table, put `{#items}` in the first cell and `{/items}` in the last cell of **one** row → that row repeats per item.
- **Conditionals:** `{#hasDiscount}…{/hasDiscount}` shows the block only when truthy.
- **Headers and footers work** — placeholders there are filled like the body.
- **Computed values are computed before render** (totals, formatted money and dates) — the template only prints.
- **Type each placeholder in one go.** Editing inside an existing `{tag}` can make Word split it across runs; docxtemplater copes with most splits and throws a clear error otherwise.

> [!warning] Not Word fields
> Word `DOCPROPERTY` / custom-property fields were considered and **rejected** for generated documents: a field shows its *cached* value until someone presses F9 inside Word, so a server- or browser-generated file opens still showing the placeholder text (headers/footers worst). Fields only make sense for a person filling a template by hand.

## Where the template lives

| Option | Status |
|---|---|
| `apps/tat-ws/public/templates/*.docx`, fetched by URL | **What the spike does** — simplest, but a template change needs a deploy |
| Backend streams it — `api.get(...).blob()`, the same idiom as `useViewCompanyDocument` → `GET /company-documents/:id/view` | Proposed — bucket stays private, no S3 CORS |
| Pre-signed S3 URL fetched by the browser | Possible — needs an S3 **CORS rule** for the frontend origins |
| Backend reads from S3, renders, returns the file (frontend sends data only) | **Proposed production shape** — values validated server-side, generated file can be saved back to S3 as a record |

> [!danger] The upload endpoint will destroy a .docx template
> `POST /file/upload-file` queues office files for **PDF conversion** and rewrites the key to `.pdf` for certain `FileUploadCategory` values — see [[Gotchas - Frontend Data & API Contracts]]. A template uploaded through it comes back as a PDF that docxtemplater cannot read. Template storage needs a path that **skips conversion** (a category outside the conversion gate, or a dedicated endpoint). Not yet designed (as of 2026-10-01).

Worth adding once templates are stored, not before: a template id + version chosen on the form, and an upload-time check that opens the template with docxtemplater and rejects malformed tags.

## Related

- [[Decision - Word Templates for Generated Documents]]
- [[Proposal Generator - Word Template Spike]]
- [[tat-ws]] · [[tat-app-ws Backend]] · [[TAT Platform]]
- [[Patterns - Backend & Domain]]
