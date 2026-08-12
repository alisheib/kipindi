# START HERE

**50pick — landing page composition & market discovery · round 2 final · 11 August 2026**

---

## Read in this order

| # | File | Why |
|---|---|---|
| 1 | **`README.md`** | What this is, what is frozen, every screen described, state model, URL contract, build sequence and estimate |
| 2 | **`TOKENS.md`** | Every colour, size, radius, shadow and duration — token name *and* resolved value, plus the palette rule that governs the whole design |
| 3 | **`COMPONENTS.md`** | The nine new components, to the pixel: exact boxes, every state, keyboard behaviour, markup contracts |
| 4 | **`GEOMETRY-AUDIT.md`** | The alignment and overflow checks that were run, and the script to re-run them |
| 5 | Open `prototype/50pick Discovery Prototype.dc.html` in a browser | Filtering, sorting, paging, watchlist and typeahead all actually run. Faster than reading about them |
| 6 | `MOTION.md` | When you reach animation |
| 7 | `DISCOVERY-RATIONALE.md` · `RATIONALE.md` | Why these decisions, and what was deliberately rejected |
| 8 | **`OPEN-QUESTIONS.md`** | Every guess made, and the frozen constraints disagreed with. **Read before you start**, not after |

---

## The one-paragraph version

Two pieces of work on 50pick.tz. **The landing page** is recomposed around a new hero — the open
market questions themselves, set as editorial type and priced in gold — with a real vertical rhythm
(144 · 96 · 96 · 144), the zero-counters deleted, "How it works" promoted and rewritten, and a new
strip proving markets actually settle. **`/markets`** loses its 340px left rail for a sticky
two-row filter bar with status, sort, odds, pool and multi-select topic, plus a compact list
density, a watchlist, typeahead and one consistent paging contract.

Everything is built on `tokens-LOCKED.css` as shipped. No token was added, changed or re-scoped.
No approved component was edited.

---

## Non-negotiables

```
1. Use tokens. Never a hex, rgb(), oklch() or hsl() in your styles.
2. Never edit market-card.tsx, side-picker.tsx, needle.css, or any token.
3. Never touch footer, licence, helpline or legal copy.
4. 44 × 44 minimum on everything you build.
5. --type-micro (11px) is the type floor for new work.
6. transition: all must never appear.
7. Blue = view state · Gold = value and possession · Green/red = outcome.
```

---

## What is in the box

```
START-HERE.md              ← you are here
README.md                  the handover
TOKENS.md                  every value, name and resolved
COMPONENTS.md              nine components, to the pixel
GEOMETRY-AUDIT.md          the checks, and the script to re-run them
SPEC.md                    full build spec incl. every correction round
MOTION.md                  motion table, entry budget, reduced-motion, loop count
DISCOVERY-RATIONALE.md     why this filter and sort model
RATIONALE.md               why this landing composition
OPEN-QUESTIONS.md          guesses made, and constraints disagreed with

tokens-LOCKED.css          your file, unmodified
brand/                     the shipped SVGs — reference, never redraw

layouts/
  01-landing-desktop.html            1440 — the recommendation
  02-landing-mobile.html             390
  03-header.html                     rest · scrolled · language open + values table
  04-markets-discovery-desktop.html  1440, filters active
  05-markets-discovery-mobile.html   390, board + filter sheet
  06-states.html                     empty · loading · every control state · paging · SW / 中文
  07-hero-alternative.html           the live-card hero that was not chosen

prototype/
  50pick Discovery Prototype.dc.html  working — open it in a browser
```

**The HTML in `layouts/` is a design reference, not production code.** Recreate it in the existing
Next.js + React + TypeScript + Tailwind codebase using its components and patterns. Do not port the
CSS classes. Do not copy the reproduced market card — the codebase has `<MarketCard/>`, and it is
the authority.

---

## Before you write a line

Four things only the client can answer. Two of them can change what ships.

1. **Compliance must sign off on the responsible-gambling line's placement.** Every string is
   verbatim from `public-footer.tsx`, but moving RG messaging above the footer may change how it is
   assessed. If the answer is "footer only", delete the block — the page still works.
2. **Are the public source attributions permitted at that prominence?** The settled strip names
   TMA, Transfermarkt and TwelveData.
3. **Every figure in these files is a placeholder.** `README.md` §"Data you must wire" lists each
   one and its real source. The per-topic counts must reconcile to the header or the page
   contradicts itself.
4. **The Swahili and Chinese strings are not real copy.** They exist to prove the layout survives a
   25% longer string. Localisation must replace all of them.
