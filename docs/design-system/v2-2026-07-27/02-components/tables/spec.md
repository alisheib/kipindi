> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> This is the designer's original redline for this component (July 2026).
> 🔴 **Do NOT paste the fenced CSS below into `src/`.** Those blocks are a scrape of
> `globals.css` frozen at this folder's date: some carry button fills that FAIL WCAG AA
> (superseded by E-119) and several carry the one-sided `inset 0 1px 0` lamp that
> §M1 now bans outright. The live values are in `src/app/globals.css`.

# Tables & ledger rows — spec

INVENTED (2026-06) — recent-settled ledger row: container border 1px --border, bg --bg-elevated, r-md, rows divided by 1px color-mix(--border 50%, transparent); row pad 12px 16px; title 13px/500 ellipsised; meta mono 10px --text-muted; amount mono 13px/700 tabular (--gilt win / --no-300 loss); status mono 9px uppercase ls 0.08em; hover bg color-mix(--bg-overlay 50%, transparent).
GIVEN — LeaderboardRow (kit/markets.jsx): grid 40px 1fr 80px 80px 90px 90px, gap 16, pad 14px 18px; rank padStart(2,"0") mono 18px/600, --gold-400 for ranks ≤3; ROI signed mono, gold-400 positive / no-400 negative. SUPERSEDED DETAIL: the 🔥 emoji streak chip in the specimen is banned by the no-emoji invariant — render streak as a number.
GAP — admin tables (D4): not yet designed; brief requires Asset|Duration|State chip|countdown|rounds|volume|commission|actions and an expandable proof drawer. See OPEN-GAPS.md.
