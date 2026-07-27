# Tables & ledger rows — spec

INVENTED (2026-06) — recent-settled ledger row: container border 1px --border, bg --bg-elevated, r-md, rows divided by 1px color-mix(--border 50%, transparent); row pad 12px 16px; title 13px/500 ellipsised; meta mono 10px --text-muted; amount mono 13px/700 tabular (--gilt win / --no-300 loss); status mono 9px uppercase ls 0.08em; hover bg color-mix(--bg-overlay 50%, transparent).
GIVEN — LeaderboardRow (kit/markets.jsx): grid 40px 1fr 80px 80px 90px 90px, gap 16, pad 14px 18px; rank padStart(2,"0") mono 18px/600, --gold-400 for ranks ≤3; ROI signed mono, gold-400 positive / no-400 negative. SUPERSEDED DETAIL: the 🔥 emoji streak chip in the specimen is banned by the no-emoji invariant — render streak as a number.
GAP — admin tables (D4): not yet designed; brief requires Asset|Duration|State chip|countdown|rounds|volume|commission|actions and an expandable proof drawer. See OPEN-GAPS.md.
