# Integration reality — what your decisions actually cost us

None of this constrains your design. It is here so that when you choose, you choose knowing
the price, and so nothing in this package reads as easier than it is. We would rather you
made an expensive decision deliberately than a cheap-looking one by accident.

---

## 1 · Re-mapping YES/NO is ~350 decisions, not a token swap

We told you the YES/NO colour mapping is fully open, and we mean it. But it is worth knowing
that the mapping is **not** confined to two tokens. Measured:

- The nine `--bet-*` semantic aliases have **zero** `var()` readers — they are reachable only
  through the Tailwind bridge, so changing them changes nothing on its own.
- `chip.tsx` carries the entire **17-variant palette as 12 inline `oklch()` literals**.
- Two Open-Graph share-image routes **hard-code the brand hexes**, because the image renderer
  cannot parse `oklch()`.
- `needle.tsx` — a vendored do-not-edit physics file — carries **35 hex gradient stops**.
- Two existing gates pin parts of the mapping.

So: if you propose a non-red/green pair, **please say so loudly in your rationale** and treat it
as a headline decision rather than a detail. We will do the work; we just need to plan it.

## 2 · Changing the mark's axis changes the lighting model

The current mark's needle sits at a measured **−14°**, derived from the artwork itself
(`atan(23.22/93.14) = 13.998°`). That single angle is reused in **seven** downstream places,
including the surface light angle (`180 − 14 = 166°`), a literal `skewX(-14deg)` in a keyframe
that **cannot be tokenised** (the transform function rejects custom properties in some
engines), the specular highlight centre, and a bar component's ±14° mapping. It also sits
beside a dial at a deliberately different ±22°.

You are free to change or abandon this relationship. **Just tell us if you do**, because the
lighting model follows the mark and we will need to re-derive it rather than discover it.

## 3 · Our page-width system is barely adopted, so retuning it moves little

We have a typed page-width primitive and seven width tiers. **Zero of 93 page files use it** —
only two loading skeletons do. Forty-six pages carry hand-typed widths, and two are on no tier
at all.

If your system defines a measure/width scale, it will land on a codebase that mostly ignores
the current one. That is our migration problem, not your design problem — but it means "change
the tier" is not a one-line change for us, and you should not assume our current widths
represent a considered system. They mostly represent whatever someone typed.

## 4 · Our type scale is in three pieces and nothing guards it

Three type scales coexist and **disagree at every step** — the CSS tokens run
8.5/9.5/11/13/15/17/20/24/32/44/60/72 and the build's own scale runs
10/11/12/13/14/16/18/22/28/36/48/64. **Not one shared value.** Semantic classes are used ~299
times against **1,879 arbitrary `text-[Npx]` call sites over 33 distinct pixel values**, and
font-size, line-height, letter-spacing, spacing and z-index are guarded by **no gate at all**.

This is the strongest argument for the closed-scale requirement in `07-contract/OUTPUT-SPEC.md`.
Whatever you deliver, we will gate it — but the scale has to be closed and small enough that
gating it is realistic.

## 5 · The tap floor is currently enforced by a warning calibrated to the defect

Our rulebook says 40px minimum with 44 preferred. Our shipped control heights include **30px
and 38px**. The only automated check warns below **38** — a threshold chosen so the current
medium button does not warn.

If you return 44px controls, roughly 148 call sites move. **We would like you to return 44px
controls.** We are telling you this so the number is not a surprise to either of us.

## 6 · About 95 player-visible surfaces are in no screenshot in this package

The gallery in `05-current-state/` covers the main routes. It does **not** include 32 loading
states, 15 error states, 3 not-found states, or the four root-level states. They are real
screens with real users on them, and they are the weakest part of the product.

⚠️ One specific trap: the markets grid skeleton **hard-codes a 349px card height**, copied by
hand from the real card. Any card whose height differs will make every page load jump — which
is precisely the defect (a 152px jump) that put a "page and skeleton must agree" rule in our
book. **If you redesign the card, please state its height explicitly** so we can move that
literal with it.

## 7 · Two icon vocabularies exist and one is invisible

Our empty-state component ships **12 bespoke illustrations at one stroke weight**, while the
glyph set carries a **parallel 8-key empty-state family** at a different weight and grid — and
all 8 are unreferenced precisely because the bespoke set shadows them.

A designer told "178 glyphs" would faithfully redraw the dead set and leave the live one.
Please treat empty-state illustration as **one** decision, and tell us which vocabulary wins.

---

## And one thing we will fix on our side before your work lands

Only **4 of our 22 static design gates** currently run before deploy. A redesign could reach
production having failed eighteen of them. That is ours to repair, and we will, before we merge
anything you send — otherwise the system you deliver is defended by nothing.

*All figures measured from the repository on 2026-08-11.*
