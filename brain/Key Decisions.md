---
date: 2026-06-04
description: "Architectural and workflow decisions worth recalling across sessions — each links to its source work note"
tags:
  - brain
---

# Key Decisions

Architectural or workflow decisions worth recalling. Link to the full [[Decision Record]] when one exists.

## 2026-06-04 — tat-portal is the canonical design/theme reference for all TAT frontends

Consistency across the [[TAT Platform]] frontends beats per-repo Figma fidelity. Qusai has authority to make minimal design changes to keep platforms consistent, so **[[tat-portal]]'s theme is the source of truth**: shared `globals.css` (brand palette `brand-500 #285ea8` / `brand-950 #101828`, type scale, shadows, sidebar utilities), **Geist** font config, and the **real TAT logo assets** (`logo-white.svg`, `logo.svg`, `grid-01.svg`). [[tat-prereq]] now copies these verbatim (auth panel + sidebar use the real logo + GridShape, not placeholder icons). New TAT frontends should copy portal's theme rather than re-deriving from Figma; design tweaks land in portal first, then propagate.

## 2026-06-04 — Staff Management subsystem is a new repo, mirroring tat-portal

[[TAT-409 Staff Management Subsystem|TAT-409]] ships as a **new dedicated repo [[tat-prereq]]** (not a section of [[tat-ws]]), structured by **copying [[tat-portal]]'s conventions** — same stack (Next 16 / React 19 / Tailwind v4 / shadcn / RTK / RQ / RHF+Zod), same infra layer (axios DI, `lib/env`, store, middleware), same TAT theme tokens, same "always remember" rules. Rationale: the ticket calls for a "separate subdomain" with cross-subsystem SSO, and tat-portal is the best-documented, most modern TAT frontend to clone. Keeps the two frontends feeling identical to work in. Scaffold verified green 2026-06-04.
