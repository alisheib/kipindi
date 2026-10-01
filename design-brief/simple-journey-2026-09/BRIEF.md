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
| Main | Component map, "what never changes", the choices (1 settled, 2 and 3 open) | 1 |
| 1 | The agency's five frames, as delivered | 5 |
| 2 | The same five screens in 50pick's system, tappable end to end | 5 |
| 2 · Header | Signed in at 360 and 320 (long balance), guest at 390 and 320, held wallet, balance hidden, desktop | 7 |
| 3 · Card | Priced, closes today, empty pool, one side only, over the cap, legacy fee, selection closed, settled, longest title at 360, at 320 | 10 |
| 3 · Home | Loading, seven chips scrolled, empty category, end of the first page, on a break, desktop | 6 |
| 4 · Bet sheet | Guest, bounds, estimate updated, balance unknown, legacy, one-sided, empty side, empty pool, over the cap, thin, holder, hedge; placing, receipt, closed, loss-limit room, 5 blocking + 4 inline refusals, keyboard at 360×640, desktop dialog | 25 |
| 5 · Balance too low | One frame per `shortfallPlan` branch | 6 |
| 6 · Deposit | Email-code step (6 states), no history, paused rail, below the shortfall, payout notice, waiting (7 states, incl. past 30 minutes), return (3, incl. still short), desktop | 21 |
| 7 · How to Play | English, Chinese, 320×640, desktop | 4 |
| 8 · Akaunti | Signed in, guest, the staff row | 3 |
| 9 · Tiketi zangu | Open, settled, empty, guest sheet | 4 |
| 10–11 | The market page; Juu/Chini stake panel, its low-balance state, the round closed while paying | 4 |
| 12 | Keyboard focus on every control family, and the reduced-motion rule | 1 |

Every state frame names its pool in its board title, so each figure can be re-derived from the payout formula. Every
frame dates from the deck's own day, Tuesday 29 Sep 2026, 11:19 EAT.

The design calls made while drawing (each with its reason and measurement) are in `docs/VODACOM-PLAN.md` §0g. The
words each state uses, and which of them are drafts, are in
[`S4-COPY-AUDIT.md`](../../docs/design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md).

## Decisions waiting on Ali

1. **Choice 1 — settled:** 1B neutral step numerals. 1A (gold) would make gold decorative, which
   `DESIGN_AUTHORITY.md` §M3 forbids; Ali can still overrule it on the switch.
2. **Choice 2:** 2A royal ring or 2B filled light chip for the chosen amount.
3. **Choice 3:** 3A royal or 3B neutral play plate on the How-to card.
   - Each choice is a switch in its frame's Tweaks panel. My picks are 2A and 3A.
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

**Resolution:** every finding was verified against the code and applied in one revision pass. The rulings it
amends, and why, are in `docs/VODACOM-PLAN.md` §0g ("The four-expert panel").

**Outcome (canvas version 16, 2026-10-01):**
- Nearly every frame revised, and 11 added: 102 boards in 13 rows.
- Every frame was re-rendered in Chromium at its own size and read tile by tile. Nothing overflows; the only flags
  left are the chip rows, which scroll sideways by design.
- **The verification caught defects the panel did not**, all fixed before publishing:
  - a free-exit countdown on a ticket placed the day before (the window is the first 5 minutes);
  - four state frames carried the Yanga question with pools that contradict Yanga's real pool;
  - a no-break pattern that left the wallet list and the help line with no place to wrap;
  - the deposit footer wrapping off a 390 × 844 screen;
  - a "+ Weka pesa" button on the home screen during a break, when such a payment would be held and returned;
  - eleven frames where a quoting slip silently disabled two styles.
- Drafted words still need the native Swahili review, with the existing-word corrections listed in
  `S4-COPY-AUDIT.md`.
