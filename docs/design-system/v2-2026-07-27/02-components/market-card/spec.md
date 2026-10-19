> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# MarketCard — spec (GIVEN, kit/markets.jsx; rendered here on current tokens)

Contract: MarketCard { title, titleSw?, category, yesPct, volume, predictors, timeLeft, status: live|resolved|pending, resolved?, hover? }

Redlines:
- container: bg --bg-elevated, border 1px --border (hover: --teal-500 + translateY(-2px) + 0 8px 28px -12px rgba(0,0,0,0.45)), radius --r-lg (16px), pad 18px, width 360 in specimen (fluid in grid)
- status + category chips top-left; title --font-display 17px/600 lh 1.3 ls -0.01em; optional Swahili subtitle 13px italic --text-subtle
- ProbabilityBar micro + price row mono 11px: YES n¢ in --yes-300 / lean word 9px italic uppercase --text-subtle ("tipping" within ±4 pts) / n¢ NO in --no-300
- meta row mono 12px --text-muted: vol · predictors · timeLeft (right)
- actions: 2-col grid gap 8, .btn-yes/.btn-no .btn-md, labels "YES @ n%" / "NO @ n%" — ⚠️ since Ali's ruling of
  2026-10-19 (DESIGN_AUTHORITY §C3, no figure on any card choice) the side word alone, "YES" / "NO", named "Back {side}"

RULE (Up & Down brief §7): do NOT restyle this card. UpDownCard is a sibling; both must sit on /live together as one product.

---

## COLD-START — a LIVE market with no activity (added 2026-07-29)

**The defect.** A brand-new market has `yesPool === noPool === 0`, so
`impliedYesPct()` returns the *default* 50 — not a signal, an artefact. The card
rendered that 50 as a real crowd price: a big "50%", a centred needle, a
**TIPPING** badge, `0 predictors`, `TZS 0`, and buttons reading `YES @ 50%`.
Every one of those is a statement about a crowd that does not exist, on a
money surface. And because a fresh board is *all* such markets, launch day would
have shown a wall of identical, perfectly-balanced, apparently-dead contests.

**The state.** `fresh = live && (isNew ?? (volume === 0 && predictors === 0))`.
Derived when the caller omits `isNew`, so it is correct at every call site —
including the ones that don't know to pass it.

| Slot | Normal | `fresh` |
|---|---|---|
| signal chip | HOT / SOON / TIPPING | **NEW** (`.chip-new`, brand blue) |
| probability | `62%` over a "YES" caption | **`—`** (`.mcardp-pct--empty`), no caption — there is no figure to label |
| bar | split + needle | `TippingBar empty` → neutral dashed rail |
| under bar | — | "No bets yet" (`.mcardp-nobets`) |
| trader row | `0 predictors` | **"Be the first to predict"** (`.mcardp-befirst`) |
| pool | `TZS 0` | **"No pool yet"** |
| buttons | `YES @ 50%` | **`YES`** — no fabricated price |
| sparkline / 24h move | shown | hidden (a fresh market has no history) |

**TIPPING now requires real activity** (`volume > 0 || predictors > 0`). An empty
50/50 is not a contest, and that badge was the loudest lie on the board.

**Law compliance.** Honest by construction (law 5: real data or nothing) — it
never invents a price, it shows emptiness *as an invitation*. NEW is brand blue,
never gold (law 3: gold = earned money; nobody has earned anything here).
`empty` is a **prop on TippingBar**, not an `EmptyTippingBar` (B9).

**Also folded in:** the category chip is now localised
(`t.market.catSports|…|catOther`, falling back to `catOther`). It was the
most-seen untranslated token in the product — a Swahili player read `SPORTS` on
the card under a `MICHEZO` filter chip (POLISH-BACKLOG §1.1). Built inline from
the dictionary, *not* via `categoryLabel()`, which has no "other" arm and renders
blank for it.

⚠️ The delivered bundle shipped the em-dash, the caption and the invitation as
inline `style={{…}}`. They are `.mcardp-*` classes here: law 15's "broken looks
like" names that exact shape ("a cold-start look shipped as inline style in
market-card.tsx instead of a token/class") as the failure to avoid.

---

## THE JOURNEY STATE — the journey card (added 2026-10-12, effective at the S15 flip)

**What it is.** The market card as the Vodacom plan's simplified journey draws it (`docs/VODACOM-PLAN.md` §3.2;
`S7-PLAN.md` WP5 with amendments A12, A15, A16 and A24; the S4 boards `s4-3-card-*` and `pick-1-home`): one question,
its two picks, nothing else. It is built as its own server component, `JourneyCard`
(`src/components/journey/cards/journey-card.tsx`), beside `MarketCard` rather than as a variant prop on it (S7-PLAN Open
point 3): the classic card's client chunk, its red anchors and the scripts that read it stay untouched, and phone
density cannot reach the journey card. Its states are B9's rule inside it — the live, closed and settled cards are one
component, the state the market's own. Until the flip it is drawn for a journey request alone (a staff preview pass);
every other reader sees this file's classic card. At the flip the classic card is shelved (`docs/SHELVED.md`) and this
is the card.

Contract: `JourneyCard { m (the market row), nowMs (the render's clock), t, locale, heading?: h2|h3, from?: "home", roundId? }`.
It decides nothing: every figure and word comes from the journey's pure rules, called once on the server —
`cardFigures` (bettable now, each side's `cardEstimate`: what the bet sheet serves), `cardFace`, `cardCloseLabel` with
`cardCloseText`, `cardTitle`, `normaliseCompetition` with `competitionLabel`.

Redlines (the live values are `.kp-jcard*` and the `--jcard-*` tokens in `src/app/globals.css`):
- container: `--bg-elevated`, 1px `--border`, radius `--r-lg`, padding `--jcard-pad` (16), rows `--jcard-gap` (12) apart;
  flat — no wash, shadow, hover lift or ring (the boards draw none). It isolates its own stacking context.
- meta row: `--type-small` on a 1.4 line (`--jcard-meta-line`) in `--text-subtle`: "category · competition" on the
  left (`DotSeq`); the label on the right, never broken — "Inafungwa leo" with a clock and "Inasubiri matokeo" with the
  closed hourglass in `--text-muted`; "Siku N", "Imetatuliwa" with a check and "Imebatilishwa" in the row's ink (A12).
- title: the reader's short title, else the full one, Sora 600 on the `title-sm` rung (18px) on a 24px line
  (`--jcard-title-line`), `keepFigures`, balanced; only the full-title fallback clamps to two lines. No line is
  reserved for it, in one column or in several: in a grid the cards share their rows instead (`.kp-jgrid`, below).
- picks: a 2-column grid 12px apart (the platform's one pair gap, R9-A5; the board drew 10), each a link in `.btn-yes` /
  `.btn-no`'s ink and tracking without `.btn`'s height or nowrap, radius `--r-md`, at least `--jcard-act-h` (64) tall,
  growing together when a second line wraps, and moving as the side buttons move (the `--m-lift` hover where a pointer
  hovers, the `--m-press` scale when pressed). In forced colours a pick keeps a 1px border in the system's ink: its
  ring is the fill's inset shadow, which a forced palette strips with the fill (E-129). The side word Sora on
  `--type-h4` (17, A15); under it, at `--type-small` 500 and balanced, a pool fact in words: "Kuwa wa kwanza" or
  "Upande mmoja tu". Every other pick — a priced pool, a hidden figure, an Up & Down side — shows its side word alone,
  centred. ⚠️ The win line "Shinda ≈2.8× dau", the thin side's "Faida ndogo · ≈1.0×" and the over-cap "Upande mdogo,
  ona makadirio" left the card by Ali's ruling of 2026-10-19 (DESIGN_AUTHORITY §C3: no figure on any card choice); the
  estimate is the bet sheet's.
- closed row (selection closed, not a control) and result row (settled): the picks' height, an inset well
  (`--bg-inset`, 1px `--border`, `--r-md`). Closed: a lock and "Imefungwa", `--type-body` 600 `--text-subtle`.
  Result: "Matokeo" (14px, the `body` rung, 500, `--text-muted`) over the settled instant (`settledAt`, else
  `resolutionAt`; `formatEatDateTime`, the year once it is not this year) at `--type-small` in `--text-subtle` (the
  board's 12px is under §T4's floor), and the outcome as the kit `Chip` (lg) in its own ink — YES, NO, a void neutral.
- under the action, on an unsettled one-sided pool: the refund sentence (`market.oneSidedNote`, naming the empty side),
  in the one note rule this file's card and the landing rows share. Outside a shared grid the action block stands on
  the card's floor (`margin-block-start: auto`) in a card that fills its cell.
- grid: `.kp-jgrid`, the one journey card grid (WP7's home and WP10's lists lay their cards in it): one column, two
  from 640, three from 1024, 16px apart (min-width steps only). Where subgrid is supported, each card — or the list
  item holding one — spans three of the grid's row tracks as a subgrid (the meta row, the question, the action block),
  each standing at its track's top and the action block's auto margin reset, so across a row the questions start on
  one line and so do the picks, whatever the titles' line counts or a refund sentence (A16 item 5; the 2026-10-12 WP5
  review's ruling, after S6's tickets, in place of A16 item 3's 48px two-line reserve). Without subgrid the cards fall
  back to the floor rule above.
- links: the card is ONE stretched link (the question; an Up & Down row on /live its round, or /updown), named by the
  reader's full title, under the picks, which rise above it on the card's local plane (z 2 / 3). The picks go where
  today's buttons go — `/markets/<id>?side=YES|NO`, `&from=home` on the home — never prefetched. No click handler.

Never on it: a pool, a predictor count, a bar, a sparkline, a 24-hour move, a status or signal chip, the category
watermark, the info popup, Share or Details; `data-market-surface`, `.mcardp` or `.market-grid`.

Guards: `test:journey-home` §4 and `red:journey-home` (the card rendered in every state, its source and its rules),
`test:timer-date` §3 with two declared anchors (its one date), `test:visual-pass-r5e` §2 (a title surface),
`test:visual-pass-r5i` §1 (its side inks, ruled), `test:contrast` (the result label's pair).
