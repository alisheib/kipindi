> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# Positions P&L surfaces — spec (INVENTED 2026-06)

Components: PnlSummaryStrip ("Your standing" ledger), PnlChart (cumulative TZS with gilt break-even line), stat tiles, recent-settled ledger, position cards (open/settled).
Authoritative artifacts (in this archive):
- _specs-as-delivered/pnl-summary-strip.tsx — full contract + redlines in comments
- _specs-as-delivered/pnl-chart.tsx — chart geometry (viewBox 720×240, plot x 8..656 y 14..214, real max/0/min axis labels)
- _specs-as-delivered/README-handoff.md — invariants honoured + i18n keys
Ink rules: gold only on settled profit; --no-300 losses with calm copy; unrealised always labelled "if settled now".
