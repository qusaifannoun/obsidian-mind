---
date: 2026-09-10
description: "Two tooltip libraries' vendor CSS was never imported globally, so tooltips rendered as bare text — and a component-level CSS import turned out to be route-scoped, not app-wide"
tags:
  - work-note
  - project/tat
status: active
quarter: Q3-2026
project: tat-ws
---

# tat-ws Tooltips Unstyled

Reported symptom: tooltips "show text without a background, and it looks bad", across many screens including course creation and the question bank. A second symptom followed: the tooltip vanishes when you move the mouse toward it, so its text cannot be copied.

Committed on `dev` `4c7c67a` + `1894aeb` (13 files), fast-forwarded from a temp branch that was then deleted. **Not pushed. Never opened in a browser** — see [[#Still open]].

## Root cause — vendor CSS that was never loaded

[[tat-ws]] uses **three** tooltip libraries. MUI's `Tooltip` styles itself; the other two ship their theme as a separate CSS file, and neither file was imported at the global entry point.

| Library | Usages | Stylesheet |
|---|---|---|
| `@mui/material` `Tooltip` | most of the app | self-styling — never broke |
| `react-tooltip` 5.30.0 | 6 | imported **nowhere in the repo** |
| `@tippyjs/react` (tippy.js 6.3.7) | ~38 across 27 files | `tippy.css` imported inside two `MiniCalendar` components only |

The Tippy half is the interesting one. In the Next.js App Router a CSS import inside a component is bundled into **that route's** CSS chunk — so `tippy.css` was loaded on the calendar route and nowhere else. It looked like a working import.

**MUI self-styling is why the bug read as random**: the same screen could show one correct tooltip and one naked string, depending on which library that particular call site happened to use.

## Second, independent defect — tooltips that flee the pointer

Tippy closes the moment the pointer leaves the trigger unless `interactive` is set. A survey across all 27 files found **2 of ~38 instances** set it (`QuestionDropdown`, `ValueHolder`). `react-tooltip`'s equivalent, `clickable`, was set on **none** of its 6 usages. So tooltip text could never be selected or copied — reaching for it dismissed it.

## Fix

| File | Change |
|---|---|
| `src/styles/global.scss` | import `tippy.js/dist/tippy.css` + `react-tooltip/dist/react-tooltip.css` |
| `components/common/MiniCalendar/index.tsx`, `CalendarGrid.tsx` | dropped the two now-redundant route-scoped `tippy.css` imports |
| `components/common/TippyDefaultsProvider.tsx` *(new)* | `tippy.setDefaultProps({ interactive: true, interactiveBorder: 10 })` |
| `app/layout.tsx` | mount `<TippyDefaultsProvider />` |
| 6 `react-tooltip` call sites | added `clickable` |
| `package.json` / `package-lock.json` | `"tippy": "^0.0.0"` → `"tippy.js": "^6.3.7"` |

Both stylesheets went into `global.scss` following the idiom already there for `react-phone-input-2`. The global default replaced editing 27 files, and `TippyDefaultsProvider` copies the shape of the existing `CrossTabSyncProvider` — a null-rendering `'use client'` component mounted from the root layout.

**The placement inside `global.scss` is load-bearing.** They sit between `@tailwind components` and `@tailwind utilities`, not at the file bottom where the other vendor import lives. `QuestionDropdown` colors its disabled-state tooltip with `bg-red-600`, and `my-materials/Card` + `MaterialCard` use `bg-customColorSeven`; vendor CSS emitted *after* `@tailwind utilities` would win on equal specificity and silently kill all three. Written up in [[Gotchas - Frontend#A vendor stylesheet imported inside a component is scoped to that route's CSS chunk — the library looks unstyled everywhere else (tat-ws, 2026-09-10)]].

## The empty package underneath it

`package.json` carried `"tippy": "^0.0.0"` — an unrelated abandoned name-squat, not `tippy.js`. Its entire contents:

```
node_modules/tippy/
└── package.json      (261 bytes)
```

No `index.js` despite `"main": "index.js"`. Nothing in `apps/` or `libs/` ever imported it. Someone typed `npm i tippy` meaning `tippy.js`.

Meanwhile `tippy.js` itself reached the build only by hoisting, as a transitive of `@tippyjs/react` (which declares `"tippy.js": "^6.3.1"`). Once `global.scss` imported `tippy.js/dist/tippy.css` by name it became a **direct** dependency, so it needed declaring. `^6.3.7` satisfies `^6.3.1`, so npm deduped — `find` confirms exactly one copy in `node_modules`, no nested second install, and the lockfile's existing `node_modules/tippy.js` entry was untouched.

## Evidence

```
$ grep -rn "react-tooltip/dist" apps libs --include="*.tsx" --include="*.css"
(no output)

$ grep -rn "tippy.js/dist|tippy.css" apps libs --include="*.tsx"
components/common/MiniCalendar/index.tsx:5:import 'tippy.js/dist/tippy.css';
components/common/MiniCalendar/CalendarGrid.tsx:3:import 'tippy.js/dist/tippy.css'

after the fix — both themes now reach the global chunk:
$ grep -c 'tippy-box'     apps/tat-ws/.next/static/css/app/layout.css
11
$ grep -c 'rt-color-dark' apps/tat-ws/.next/static/css/app/layout.css
3
$ npx nx build tat-ws
NX   Successfully ran target build for project tat-ws
```

## Still open

- **Nothing was opened in a browser.** The build proves it compiles and that both stylesheets land in `layout.css`; it does **not** prove the tooltips look right, that the Tailwind-over-vendor ordering actually preserves the `bg-red-600` and `bg-customColorSeven` backgrounds, or that a 10px `interactiveBorder` feels natural when reaching for a tooltip to copy from it. All of that is static reasoning. Per [[Patterns - Method & Conventions]] this is built, **not verified**.
- **Every Tippy in the app is now interactive**, not just the reported screens — all ~38 linger briefly before closing. Chosen deliberately over a surgical per-component fix, but unvalidated against plain icon-label tooltips ("Edit Chapter", "Clear all filters") where the lingering may read as sluggish.
- **Three tooltip libraries for one job remains unaddressed.** No shared wrapper exists, so the next tooltip inherits whichever library its author picks and this class of bug can recur. Consolidation was neither proposed nor scoped — see [[Patterns - Architecture & Boundaries]].
- Noticed, not fixed: `QuestionDropdown` still hand-rolls the disabled-button tooltip workaround (wrapper `<span>` + `pointerEvents: 'none'`) that MUI's `Tooltip` does natively.
- Pre-existing and untouched: `npm install` reports **120 vulnerabilities (5 low, 24 moderate, 82 high, 9 critical)**. `audit fix --force` pulls breaking majors.
- Commits are **local only on `dev`** — but see [[Gotchas - Tooling & Method#A commit reached `origin/dev` with no `git push` run — "local only" is not a safe claim here (2026-08-02, recurred + escalated 2026-08-12)|the standing warning that "local only" is not a safe claim in this repo]]. Confirm before assuming it hasn't shipped.
- The repo's checked-out branch moved from `dev` to `main` partway through the session (both were at the identical commit `14e8e2a9`, so the merge was a clean fast-forward). Worth knowing something else is moving `tat-ws` branches.

## Related

- [[tat-ws]] — the repo
- [[Gotchas - Frontend]] — both traps written up
- [[Patterns - Frontend & UI]] — where vendor CSS belongs, and configuring a library once instead of at N call sites
- [[tat-ws Sign-Out 404]] — same repo, same family: a defect whose real cause sat one layer under the reported symptom, with a second independent trap underneath
