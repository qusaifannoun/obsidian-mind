---
date: 2026-06-14
description: "tat-website home hero rebuilt as an integrated GSAP card-morph slider (port of a CodePen 'timed cards opening' effect): next thumbnail expands into the full background while the old one shrinks back into a thumbnail"
tags:
  - work-note
  - project/tat
status: completed
quarter: Q2-2026
project: tat-website
---

# TAT Website Hero Card-Morph Slider

Rebuilt the [[tat-website]] home-page hero slider to match the "Timed Cards Opening" effect ([CodePen NWodZMd](https://codepen.io/dilums/pen/NWodZMd)) the team had asked for. The previous version did a plain background slide with a **separate** circular thumbnail carousel — the two were disconnected and there was no "card opens" motion. Pushed to `dev` (`727946e`, plus `8a6f9bd` for the hero label colour). No Jira ticket — direct request.

## What & Why

All slides are now **one set of cards** (same DOM elements in both roles): `order[0]` fills the hero as the background; the rest are rounded-rectangle thumbnails bottom-right. Advancing rotates the `order` array and **morphs** the next thumbnail into the full background (`x/y/width/height/borderRadius`), while the previous background shrinks back into a thumbnail and re-queues. A timed indicator bar wipes left→right to auto-advance; prev/next, thumbnail-click, progress bar + `N/total` counter all wired. Kept all existing content (navbar, title/desc, Discover More, TOTAL plane, Upcoming Courses, curve + course buttons).

## How

- `useHeroCards.ts` (new hook) owns the `order` rotation, geometry, GSAP morph, and auto-loop. `index.tsx` renders a flat card layer + content + controls so z-index interleaves in one stacking context (active bg `z10–15`, content `z20`, thumbnails `z30`).
- **No-white-flash technique** — the key fix, see [[Gotchas]]: keep the outgoing background full-screen until the incoming card fully covers it, then snap it to a thumbnail. Naïvely shrinking the old card immediately leaves the hero momentarily uncovered → white flash.
- Shape iterated to match the live site exactly: not an oval, not a circle — a **portrait rounded-rectangle** (`152×196`, radius `28px`, 2px white ring + inner gap) that animates to square corners as it opens.
- Extra cards parked fully off-screen (not peeking) so the row is never "pushed out"; they only slide in during a transition.

## Files

- `src/components/HomeSections/TopSection/useHeroCards.ts` — morph hook (new)
- `src/components/HomeSections/TopSection/index.tsx` — rebuilt hero
- Tuning knobs live as constants in the hook (`TW/TH`, `RADIUS_THUMB`, `GAP`, margins, `DUR`, `AUTO_INTERVAL_MS`).

## Related

- [[tat-website]] · [[TAT Platform]]
- [[Gotchas]] · [[Patterns]]
- [[Code Quality]] · [[Systems Thinking]]
