---
date: 2026-06-10
description: "tat-website client-logo work — added the Safran logo to the /clients grid (TAT-441) and refactored the home-page orbit to polar-coordinate positioning so logos sit on the orbit paths (TAT-440)"
tags:
  - work-note
  - project/tat
status: completed
quarter: Q2-2026
project: tat-website
ticket: TAT-440
---

# TAT-440 / TAT-441 — Client Logos & Safran

Two sibling tickets under epic [TAT-167](https://cryptonic-art.atlassian.net/browse/TAT-167) (TATT Website), both adding the **Safran** logo to the [[tat-website]] client surfaces. Done and verified against the running app on 2026-06-10; committed to `dev` as `639458c`.

- Jira: [TAT-440](https://cryptonic-art.atlassian.net/browse/TAT-440) (Align Client Logos and Add New One) · [TAT-441](https://cryptonic-art.atlassian.net/browse/TAT-441) (Add Safran Logo to Clients Page)

## What & Why

The Safran logo needed to appear on both client surfaces of the marketing site:

- **TAT-441 — `/clients` grid page.** A flat grid of logo cards driven by `src/constants/clients.ts`. Added `safran.png` to `public/assets/logos/` and a single array entry. Positioned after `client18` (the highlighted slot). The card uses `object-contain`, so the wide 1280×270 logo fits while preserving aspect ratio.
- **TAT-440 — home-page orbit.** The `Clients` section renders logos on circular "orbit" paths around a central aircraft (`RotatableLogo`). The ask was to align all logos onto the orbit lines (no overlap, consistent sizing), then add Safran.

## How — the orbit refactor (TAT-440)

The component placed all 20 logos with **hand-tuned `top/left/right/bottom` pixel offsets** and inconsistent box sizes (some 15rem squares, some 4rem strips). Logos didn't sit on the orbit lines, and adding a 21st by guessing another offset would compound the drift.

Replaced that with **two data-driven rings positioned by polar coordinates**:

- Each ring is an array of `{ src, alt }`; an `orbitStyle(radius, index, count, offset)` helper computes `angle = 360/count × index − 90` and translates each logo to `(r·cosθ, r·sinθ)` from center.
- Every logo sits exactly on a fixed radius (outer 30rem ≈ the Layer1 orbit, inner 20.5rem), evenly spaced by angle, in a **uniform 9rem `object-contain` box** → consistent footprint, preserved aspect ratio.
- Adding Safran = one array entry on the outer ring; spacing rebalances automatically.
- Preserved the existing behaviour: counter-rotating `animate-spin-logo`/`-reverse` keeps logos upright, hover pauses the system.

> [!note] Pattern
> Driving repeated positioned elements from a data array + trig beats N hand-tuned offsets — see [[Patterns]].

## Verification

Ran the dev server (`npx nx dev tat-website`, port 3001) and checked both surfaces in-browser:

- **Orbit**: screenshot confirmed logos on both circular paths, evenly spaced, no overlap, Safran integrated at top, plane clear in the center.
- **Grid**: Safran asset serves `200 image/png`, decodes at 640×135, all 54 cards render (the apparent "0 loaded" was a background-tab lazy-load artifact, not a bug).
- No type errors in the changed files; no console errors from the change. (The Next "1 error" badge is a pre-existing `key` warning in `<PartnersCarousel>`, unrelated.)

## Files

- `src/components/HomeSections/RotatableLogo/index.tsx` — orbit refactor
- `src/constants/clients.ts` — Safran grid entry
- `public/assets/logos/safran.png`, `public/assets/images/SolarLogos/safranLogo.png` — assets

## Related

- [[tat-website]] · [[TAT Platform]]
- [[Code Quality]] · [[Systems Thinking]]
- [[Patterns]]
