# Simplified Journey — the S4 design pass (Vodacom plan)

> **Record of the S4 design commission.** The brief itself is the plan's §6 ("Claude Design: needed, in a focused
> form") in [`docs/VODACOM-PLAN.md`](../../docs/VODACOM-PLAN.md). The design rules are `docs/DESIGN_AUTHORITY.md`
> and the `globals.css` tokens. This file links to them; it carries no copy of either.

## The canvas

- **Where:** https://claude.ai/artifact/UGVgjpiQFwep2hzfYLf3M6 (a Design-type Artifact).
  - It is private to Ali until he shares it from the page's Share menu.
  - It is the only copy of the frames. To revise it, read its `project/*.dc.html` files and publish to the same URL.
- **Built:** 2026-10-01, in-session, from the §6 brief, the agency's five frames
  (`docs/design-system/v5-2026-09-29-simplified-journey/frames/`) and the rulings SJ-1 … SJ-24.
- **Verified:** every frame was rendered locally in Chromium at its own size (real fonts, the product's wallet
  logos) and read tile by tile. Overflow was checked frame by frame. Figures come from the payout formula on stated
  pools.

## What is on it (brief §6 items 1–11)

| Row | Item | Frames |
|---|---|---|
| Main | Component map, "what never changes", three numbered choices | 1 |
| 1 | The agency's five frames, as delivered | 5 |
| 2 | The same five screens in 50pick's system, tappable end to end | 5 |
| 2 · Header | Signed in at 360 and 320 (long balance), guest at 390 and 320, held wallet, balance hidden, desktop | 7 |
| 3 · Card | Priced, closes today, empty pool, one side only, over the cap, legacy fee, selection closed, settled, longest title at 360, at 320 | 10 |
| 3 · Home | Loading, seven chips scrolled, empty category, end of the first page, desktop | 5 |
| 4 · Bet sheet | Guest, bounds, estimate updated, legacy, one-sided, holder, thin, placing, receipt, closed, 5 blocking + 4 inline refusals, keyboard at 360×640, desktop dialog | 19 |
| 5 · Balance too low | One frame per `shortfallPlan` branch | 6 |
| 6 · Deposit | Email-code step (6 states), no history, paused rail, below the shortfall, payout notice, waiting (6 states), return (2), desktop | 19 |
| 7 · How to Play | English, Chinese, 320×640, desktop | 4 |
| 8 · Akaunti | Signed in, guest, the staff row | 3 |
| 9 · Tiketi zangu | Open, settled, empty, guest sheet | 4 |
| 10–11 | The market page; Juu/Chini stake panel and its low-balance state | 3 |

The design calls made while drawing (each with its reason and measurement) are in `docs/VODACOM-PLAN.md` §0g. The
words each state uses, and which of them are drafts, are in
[`S4-COPY-AUDIT.md`](../../docs/design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md).

## Decisions waiting on Ali

1. **Choice 1:** 1A gold or 1B neutral How-to step numerals.
2. **Choice 2:** 2A royal ring or 2B filled light chip for the chosen amount.
3. **Choice 3:** 3A royal or 3B neutral play plate on the How-to card.
   - Each choice is a switch in its frame's Tweaks panel. My picks are 1A, 2A, 3A.
4. **The drafted Swahili.** Every state with no existing string carries a draft, listed on the canvas and in §0g. A
   native review signs them off before S7–S11 ship them.

## The four-expert panel (2026-10-01)

Four independent reviewers read every rendered tile and the frame sources against `DESIGN_AUTHORITY.md`, the kit
components (`chip.tsx`, `callout.tsx`, the wallet pill), the rulings and the engine code (`estimate.ts`,
`shortfall.ts`, `payout.ts`).

| Expert | First-pass score | Findings |
|---|---|---|
| Design-system fidelity | 6.5 / 10 | D1–D20 |
| Deck fidelity and flow logic | 6.5 / 10 | F1–F20 |
| Words (Swahili, terms, money truth) | 6 / 10 | C1–C25 |
| Accessibility, responsible gambling, consumer protection | 5 / 10 | A1–A20 |

**What they found, in short:**
- **Figures:** five state frames reused the reference pools with figures that contradicted them; the Juu/Chini pair
  (× 1.84 / × 2.17) cannot occur under a 13% fee; the frames mixed two "todays" (29 Sep and 1 Okt).
- **Kit drift:** the side chip existed at five sizes; notices were a hand-rolled royal box; the header figure was
  white where the product paints it gold; the market chart ignored the four-ink chart law.
- **Money honesty:** the card's over-cap "zaidi ya 100×" over-promised; "Weka dau la TZS 2,000 badala yake" placed a
  bet with only the 5,000 estimate on screen; the loss-limit return pre-filled the player's remaining limit.
- **Missing states:** hedge, empty side, empty pool and over-cap sheets; loss room; still short on return; waiting
  past 30 minutes; a break on home; keyboard focus.
- **Words:** existing mistranslations ("Lipo" for Payout, "HALIJAONDOKA", "pesa yote") and SJ-19 term drift.

**Resolution:** every finding was verified against the code and is applied in one revision pass. The rulings it
amends, and why, are in `docs/VODACOM-PLAN.md` §0g ("The four-expert panel"). _The revision's outcome (frames
changed, frames added, re-render result) is recorded here when it is published._
