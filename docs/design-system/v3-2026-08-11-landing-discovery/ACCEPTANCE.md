# INHERIT-MANIFEST — the returned Claude Design kit, file by file

**Date:** 2026-08-12 · **Session:** FINAL inherit-apply-cleanup
**KIT_PATH:** `docs/design-system/v3-2026-08-11-landing-discovery/` (this folder — the kit is
filed here raw and untouched per DESIGN_AUTHORITY §0b, with this acceptance record beside it.
It arrived as `Reviewing shipping code files.zip`, placed by Ali 2026-08-12 18:59; the raw zip
is archived at `F:\50pick-design-archive\2026-08-12-final\`)

**What the kit is:** the round-2 **negotiated** delivery — "50pick — landing page composition &
market discovery · round 2 final · 11 August 2026". It is scoped to exactly the three surfaces the
strategy keeps: the hero/banner, the `/markets` filtering + sorting (with a full data contract),
and the landing composition plan. It is **not** the total-replacement kit (that commission was
assembled separately and its outcome is irrelevant to this session — the total-replacement
strategy is dead).

**The kit's own manifest** (quoted from `START-HERE.md` §"What is in the box"):

> ```
> START-HERE.md              ← you are here
> README.md                  the handover
> TOKENS.md                  every value, name and resolved
> COMPONENTS.md              nine components, to the pixel
> GEOMETRY-AUDIT.md          the checks, and the script to re-run them
> SPEC.md                    full build spec incl. every correction round
> MOTION.md                  motion table, entry budget, reduced-motion, loop count
> DISCOVERY-RATIONALE.md     why this filter and sort model
> RATIONALE.md               why this landing composition
> OPEN-QUESTIONS.md          guesses made, and constraints disagreed with
> tokens-LOCKED.css          your file, unmodified
> brand/                     the shipped SVGs — reference, never redraw
> layouts/ (01–07)           landing desktop/mobile · header · markets desktop/mobile · states · hero-alternative
> prototype/                 50pick Discovery Prototype.dc.html — working
> ```

---

## The verdicts

| Kit file | Verdict | Why |
|---|---|---|
| `START-HERE.md` | **INHERIT** | Plan doc describing the inherited designs; carries the non-negotiables (tokens-only, no colour literals, 44×44, no `transition: all`) |
| `README.md` | **INHERIT** | The handover: hero spec, landing composition, header model, the full `/markets` data contract (state model, URL contract, sort keys, defaults, paging), data-to-wire table |
| `SPEC.md` | **INHERIT** | Full build spec incl. correction rounds, for the named surfaces only |
| `COMPONENTS.md` | **INHERIT** | The nine NEW components (filter bar, chips, sort, density, watchlist star, typeahead, paging, empty states, aggregate-conviction bar) to the pixel |
| `GEOMETRY-AUDIT.md` | **INHERIT** | The alignment/overflow checks run on the design + re-run script — verification method for the inherited surfaces |
| `MOTION.md` | **INHERIT** | Entry budget (550ms), per-row reduced-motion behaviour, loop count for the inherited surfaces. It names the EXISTING `motion.css` tokens (`--m-glide`, `--t-quick/base/move`) — it is behaviour spec, not a new motion system |
| `DISCOVERY-RATIONALE.md` | **INHERIT** | Why this filter/sort model; what was rejected (infinite scroll, token row) |
| `RATIONALE.md` | **INHERIT** | Why this landing composition |
| `OPEN-QUESTIONS.md` | **INHERIT** | Every guess + disagreement — decisions resolved in §Reconciliation below |
| `TOKENS.md` | **INHERIT (reference only)** | The palette rule (blue = view state · gold = value · green/red = outcome) and token usage map. ⚠️ Its *resolved values* are non-authoritative — `src/app/globals.css` / `motion.css` outrank it on every value (DESIGN_AUTHORITY §0d) |
| `tokens-LOCKED.css` | **IGNORE** | A LOCKED *copy* of our own token layer, cut for the commission. Never a source of truth; `globals.css` is. Deleted with the kit remainder in Phase 3 |
| `brand/favicon.svg` `lockup-horizontal.svg` `mark-color.svg` `mark-white.svg` | **IGNORE** | Copies of our shipped brand SVGs (sent out with the commission). The live `public/brand/` files are the authority |
| `brand/mpesa.svg` | **IGNORE**, conditional | Also from our pack. If the live repo turns out not to carry an M-Pesa asset when the trust band is built, take THIS file in (it is the one asset the band needs); otherwise it is a duplicate |
| `layouts/01-landing-desktop.html` | **INHERIT** | The landing recommendation at 1440 — the composition we apply |
| `layouts/02-landing-mobile.html` | **INHERIT** | Landing at 390 (we verify at our measured 360) |
| `layouts/03-header.html` | **INHERIT** | Header at rest/scrolled, language listbox, mobile rail — part of the landing plan |
| `layouts/04-markets-discovery-desktop.html` | **INHERIT** | `/markets` at 1440, filters active |
| `layouts/05-markets-discovery-mobile.html` | **INHERIT** | `/markets` at 390, board + filter sheet |
| `layouts/06-states.html` | **INHERIT** | Empty · loading · control states · paging · SW/ZH stress — the state inventory |
| `layouts/07-hero-alternative.html` | **IGNORE** | The alternative hero that was **not chosen** in the negotiation. The decided hero is the `01` recommendation, whose hero-foot holds a real live `<MarketCard/>` |
| `prototype/50pick Discovery Prototype.dc.html` | **INHERIT (behaviour reference)** | Working filtering/sorting/paging/watchlist/typeahead against 18 markets — the executable spec of the interaction model. Reference, never production code |
| `prototype/support.js` | **INHERIT (behaviour reference)** | Drives the prototype; same status |
| `prototype/tokens-LOCKED.css` | **IGNORE** | Second copy of the copy |
| `prototype/brand/*` (5 SVGs) | **IGNORE** | Second copies of the brand copies |

**All layout HTML is design reference, not production code** (kit's own words). Nothing is ported;
everything is recreated in the existing Next.js/React/Tailwind codebase from existing primitives.

---

## Reconciliation — where the decided calls, measured numbers and laws beat the kit

1. **Hero — decided call SATISFIED by the kit's recommendation.** The `01` hero is built from the
   brand mark (backdrop `mark-color.svg`, rotate −14°, opacity token, never recoloured), the type
   (headline **"The wisdom of YES & NO."** — verbatim, intact), the tokens, and **a real live
   `<MarketCard/>`** in the hero foot (featured variant, same query as the question board:
   closing-soonest, real pool). "No photography. No illustration. No new asset is required." —
   `public/hero/hero-bg.webp` + `src/app/page.tsx:80` go out in the same commit the new hero lands.
   `07-hero-alternative` stays ignored.
2. **Cold start.** The kit treats every figure as a placeholder and does not define the hero's
   cold-start/loading state. The existing cold-start rule's three consumers govern; the hero
   becomes the fourth consumer and must agree with them. Concrete behaviour goes in the
   plan-of-record before the hero batch (Phase 2 · batch 3).
3. **Measured language widths beat the kit's stress test.** The kit proved the layout at ~+25%
   string growth and asks to be told if a real Swahili label exceeds ~+40%. Our measured corpus
   (`LANGUAGE-AND-CONTENT.md`) says: median +8.3%, but **1.74× p90 / 2.25× p95 on short labels** —
   exactly the chips, status segments, sort values and nav items this design is made of. Every
   container we build is sized to the measured widths, not the kit's 25%. The kit's own
   wrap-and-ellipsis mechanics (topic-tile meta on its own row, sort value ellipsising while the
   key never truncates) are kept — they are the right shapes; only the width assumptions change.
4. **Primary width is 360px** (measured), not the kit's 390. All mobile verification runs at 360;
   the kit's 390 layouts are treated as ≤390 guidance.
5. **The laws stay law.** `LAWS.md` (93 invariants, 85 must-survive, 4 licence conditions —
   recovered to the archive, relocating to its §0b home in Phase 3) is the contract. Where any kit
   detail collides with a law, the law wins — nothing in this manifest weakens one.
6. **Gold discipline (Q5, settled 2026-08-10: gold is money and nothing else) narrows the kit's
   palette rule.** The kit's rule — gold = "value and possession" — is wider than the system law.
   Resolution, surface by surface, defaulting to the law:
   - Pool figures, payout amounts in the settled strip: **gold stays** (real money).
   - Sort control: **no gold** — the kit's README (round-2 final) itself withdrew the gold shell;
     the prototype's `giltSort` switch ships OFF. Sort is view state → blue family.
   - Result count, watch star, question-board YES-% prices: **decide against the written law at
     implementation, defaulting to non-gold**; each of these is possession/odds/count, not money.
     If stripping gold visibly guts the hero's "priced in gold" idea, that goes to Ali as a named
     question rather than being decided silently.
7. **First-visit modal copy duplication** (kit Open Q7): the how-it-works band lifts the modal's
   heading + lede. Resolution: both surfaces read the SAME i18n keys — one definition, two
   render sites. Whether the modal itself is retired is Ali's call, later; nothing here forces it.
8. **`New` follows the card** — if `isNew` in `market-card.tsx` means something other than
   "added recently", the filter follows the card's definition (kit's own recommendation).
9. **`Biggest move` sorts absent `move24h` last** (kit's recommendation, adopted).
10. **RG line above the footer** and **public source attributions in the settled strip**
    (TMA / Transfermarkt / TwelveData) are regulatory/contractual questions. Both are built as
    designed (all strings verbatim from `public-footer.tsx`; sources already govern settlement),
    and both are flagged to Ali for compliance sign-off in the final report — each is one deletion
    if refused.
11. **Frozen-card tap targets** (38px YES/NO, 34px info): NOT worked around, NOT redesigned here —
    the token file already schedules Phase 3 (`--h-control-md: 38px → 44`). Recorded only.
12. **`--type-nano`/`--type-label` raise** proposed by the designer: NOT applied — it is a change
    to the frozen system outside this scope. Recorded as an open decision for Ali.

---

## What is NOT in this kit (and therefore not in scope)

The anticipated from-scratch **visual system** — new token file, new type scale, new colour ramps,
restyled existing components, new glyph set, new motion language — did not come back in this kit
and would be IGNORED if it had. The market card, side picker, needle, footer, palette and type
scale are frozen in the kit's own contract and stay exactly as the live system defines them.
