# Brief #1 — Positions "Portfolio" surface (P&L summary + performance)

## What & why
The Positions area is where a player sees their own money: open bets, settled results,
and overall performance. Today it's functional but was never designed as a coherent
"portfolio" surface (no design-kit spec exists for it — this is genuinely new design,
which is why we're commissioning it). We want it to feel like a serious, trustworthy
portfolio view — the emotional home a player returns to.

See `current-state/positions-page.tsx`, `current-state/positions-performance-page.tsx`,
and `current-state/position-card.tsx` for exactly what exists now (match the data, elevate
the design). `current-state/EXAMPLE-resolution-panel.tsx` shows our house style.

## Design these two, as one coherent system
1. **P&L summary strip** (top of /positions) — an at-a-glance header of the player's
   standing. Real metrics available: amount at risk (open stakes), current live value of
   open positions, settled profit/loss, win-rate, number of markets resolved.
2. **Performance page** (/positions/performance) — a fuller breakdown: the P&L over time,
   the same KPIs, and a clean history. (We already have a kit chart — `PriceChart` /
   ProbabilityChart in `kit-specimens/microstructure.jsx` — reuse that chart style; don't
   invent a new chart.)

## Hard constraints (money surface)
- **Real data only.** Unrealised P&L on OPEN positions is allowed but must be clearly
  labelled "current value / if settled now" — never stated as guaranteed winnings
  (regulatory: no payout promises pre-resolution).
- Use our money format `TZS 1,234,567` (tabular mono). Positive P&L may use gold/gilt
  (this is an earned-money context); losses use rose/no. Neutral uses muted ink.
- No emojis. Line-art glyphs only.

## States to cover
- Empty (no positions yet) — reuse our EmptyState pattern (see globals.css `.` + kit).
- Loading (skeleton).
- Open positions present / only settled history / mix.
- Big-win and net-loss states (make sure both read with dignity — losses reframed
  calmly, not punishing).

## Deliverable
On-theme React JSX + CSS using our tokens/classes, mobile (390px) + desktop (1440px),
reduced-motion safe. Return the summary strip and the performance page.

## Reminder
Follow `00-README` (golden rule: no new colors) and `01-RULES-and-invariants.md`
(gold = earned money, no emojis, Needle signature, perfect motion).
