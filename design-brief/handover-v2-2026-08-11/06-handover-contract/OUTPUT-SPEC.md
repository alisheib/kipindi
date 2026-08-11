# OUTPUT SPEC — round 2

Read `FROZEN.md`, then `BRIEF.md`, then this. Return **exactly these six things** as separate files.

Your output goes to an engineering session that will implement it into a Next.js 16 + Tailwind
codebase with a **frozen, passing** design-token test suite. A deliverable that requires editing a
colour token or a frozen component will be rejected before it reaches code.

---

## 1. `layouts/` — HTML files, existing tokens only

Self-contained HTML. Inline CSS. No frameworks, no external JS libraries.

Each file must begin with:

```html
<link rel="stylesheet" href="../tokens-LOCKED.css">
```

…and **every colour in your CSS must be a `var(--token)` reference.** No hex values, no `rgb()`, no
`oklch()`, no named colours anywhere in your stylesheets. If you need a colour that does not exist as
a token, you have gone out of scope — use an existing one or raise it in `OPEN-QUESTIONS.md`.

Required files:

| File | Must show |
|---|---|
| `01-landing-desktop.html` | Full landing page, 1440px. Every section, in order, with the real rhythm. |
| `02-landing-mobile.html` | Full landing page, 390px. Not a squeezed desktop — a designed mobile page. |
| `03-header.html` | Desktop and mobile header: at rest, scrolled, language control open. **Must be opaque when scrolled.** |
| `04-markets-discovery-desktop.html` | `/markets` at 1440 with the new filter + sort layer, filters active, result count visible |
| `05-markets-discovery-mobile.html` | `/markets` at 390 with the same |
| `06-states.html` | Empty state (no matches), loading state, and the filter control in every state (default / hover / focus-visible / active / selected / disabled) |

**Market cards in these files must be visually identical to
`01-approved-design/screens/APPROVED-market-card-live.jpg`.** Reproduce it; do not improve it. It is
scaffolding for your layout, not a component you are designing. If reproducing it exactly is
impractical in flat HTML, use a grey placeholder box of the correct dimensions labelled
`[APPROVED MARKET CARD — 1 of N]` rather than drawing an approximation. **A placeholder is
better than a redesign.**

## 2. `SPEC.md` — the build specification

The document an engineer implements from. Per section of the landing page, and per element of the
discovery layer:

- exact spacing values (a scale, e.g. `4 · 8 · 12 · 16 · 24 · 32 · 48 · 64 · 96`) and which step
  goes where
- the grid at each breakpoint: columns, gutter, max-width, card count
- which existing tokens are used for what
- which existing components are used, by filename
- breakpoint behaviour: what changes at 390 / 768 / 1024 / 1440 / 1920

State the **vertical rhythm system** explicitly. The current page repeats one 80px gap between every
section; we want a deliberate scale where related sections sit closer and a new idea gets more air.

## 3. `MOTION.md` — a table, not prose

| Element | Trigger | Property | From → To | Duration | Curve | Delay |
|---|---|---|---|---|---|---|

Plus:

- a **total time budget in ms** for the landing entry sequence
- for every row, what happens under **`prefers-reduced-motion`** ("nothing" is a valid answer;
  silence is not)
- an explicit list of anything that **loops infinitely**, with a justification for each. Assume the
  budget is one. There are currently eight, and one of them ignores reduced-motion.

Motion inside frozen components is frozen too — do not respec the needle sweep. You are specifying
motion for **entry, layout transitions, filter changes and state changes** only.

## 4. `DISCOVERY-RATIONALE.md` — max 600 words

Why this filter and sort model. Specifically:

- which of the gambler's three questions (*what can I get into · what's about to close · where is the
  money*) each control answers
- what you chose **not** to include and why
- how it degrades at 390px
- what happens when a Swahili label is 25% longer than the English one

## 5. `RATIONALE.md` — max 600 words

Why this landing composition. What you kept and why. What you deliberately did not do. Write it as
an argument someone could disagree with, not a description of what you made.

## 6. `OPEN-QUESTIONS.md`

Everything you had to guess at, plus — importantly — **anything in `FROZEN.md` you think is wrong.**

This is the pressure valve. If the market card or a colour bothers you, this is where it goes, in
writing, as a proposal we can read and reject. It costs us nothing here and costs us a whole round if
you act on it instead.

**This file must not be empty.**

---

## Self-check before you return

Run these against your own output. State the results at the top of `SPEC.md`.

| Check | Pass condition |
|---|---|
| Colour discipline | `grep` your CSS for `#`, `rgb(`, `oklch(`, `hsl(` → **zero matches** outside comments |
| Frozen components | Could an engineer build this without editing `market-card.tsx`, `side-picker.tsx`, `needle.css`, or any token? → **yes** |
| Tap targets | Every interactive element ≥ 44 × 44 px → **yes**, and say how you verified |
| Mobile | Every deliverable exists at 390px → **yes** |
| Header | Opaque when scrolled, nothing bleeds through → **yes** |
| Reduced motion | Every animation has a defined reduced-motion behaviour → **yes** |
| Infinite loops | Count them → state the number and justify each |
| Swahili | Longest label +25% does not break any control → **yes** |

## What "done" looks like

An engineer opens `SPEC.md` and the six HTML files, and builds the landing page and the discovery
layer without editing a single token, without touching a frozen component, and without asking you
what a value should be.
