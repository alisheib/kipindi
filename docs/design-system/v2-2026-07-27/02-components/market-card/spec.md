# MarketCard — spec (GIVEN, kit/markets.jsx; rendered here on current tokens)

Contract: MarketCard { title, titleSw?, category, yesPct, volume, predictors, timeLeft, status: live|resolved|pending, resolved?, hover? }

Redlines:
- container: bg --bg-elevated, border 1px --border (hover: --teal-500 + translateY(-2px) + 0 8px 28px -12px rgba(0,0,0,0.45)), radius --r-lg (16px), pad 18px, width 360 in specimen (fluid in grid)
- status + category chips top-left; title --font-display 17px/600 lh 1.3 ls -0.01em; optional Swahili subtitle 13px italic --text-subtle
- ProbabilityBar micro + price row mono 11px: YES n¢ in --yes-300 / lean word 9px italic uppercase --text-subtle ("tipping" within ±4 pts) / n¢ NO in --no-300
- meta row mono 12px --text-muted: vol · predictors · timeLeft (right)
- actions: 2-col grid gap 8, .btn-yes/.btn-no .btn-md, labels "YES @ n%" / "NO @ n%"

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
