# MarketCard — spec (GIVEN, kit/markets.jsx; rendered here on current tokens)

Contract: MarketCard { title, titleSw?, category, yesPct, volume, predictors, timeLeft, status: live|resolved|pending, resolved?, hover? }

Redlines:
- container: bg --bg-elevated, border 1px --border (hover: --teal-500 + translateY(-2px) + 0 8px 28px -12px rgba(0,0,0,0.45)), radius --r-lg (16px), pad 18px, width 360 in specimen (fluid in grid)
- status + category chips top-left; title --font-display 17px/600 lh 1.3 ls -0.01em; optional Swahili subtitle 13px italic --text-subtle
- ProbabilityBar micro + price row mono 11px: YES n¢ in --yes-300 / lean word 9px italic uppercase --text-subtle ("tipping" within ±4 pts) / n¢ NO in --no-300
- meta row mono 12px --text-muted: vol · predictors · timeLeft (right)
- actions: 2-col grid gap 8, .btn-yes/.btn-no .btn-md, labels "YES @ n%" / "NO @ n%"

RULE (Up & Down brief §7): do NOT restyle this card. UpDownCard is a sibling; both must sit on /live together as one product.
