#!/usr/bin/env bash
# Landing v3 · WP3 + WP4 (+ the data-market-* attributes V18 reads) — ONE heavy-node lock hold: boot dev (in-memory),
# seed, then three phases of the book, each captured and measured:
#   P1  one-sided money only — the ONE-SIDED featured card (no mark, "One side only", the refund note, the count
#       withheld below the floor) and one-sided board rows (dashed rail, bare YES/NO, the note).
#   P2  a priced book + market T with a real 24h move (wp34-seed.mjs STEP=tick: its first readings moved 30 hours
#       back, then today's bets) closing in 5 hours, so T is the featured card: the mark at 38, "▲17 · 24h ago",
#       9 bettors (count withheld). `/`, `/markets`, `/results`, T's detail page and `/watchlist` (signed in) at
#       360/768/1280 × sw/en/zh; the first-screen budget; the rows drive + its RED; the gate's base pass; RED V15,
#       V17 and V18 once per part; qa:card-geometry (after).
#   P3  T crowded past the floor (12 bettors: the count shows) and closing in 40 minutes (SOON + minutes): `/` and
#       `/markets`, the budget again (the top row at its most crowded), the gate on base-360-sw.
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-wp34.sh <label>
# Optional: CLEAN_NEXT=1 removes .next first (whole, never a sub-folder); SKIP_GATE=1 skips the gate + REDs.
# Frames, reports and logs land in .qa-shots/landing-v3/<label>/{p1,p2,p3}/; <label>/verify.done marks the end.
# ⛔ Never wrap the lock in `timeout`. Run it detached. It needs the in-memory store (no DATABASE_URL).
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:-wp34}"
OUT=".qa-shots/landing-v3/$LABEL"
PORT=3057
BASE="http://localhost:$PORT"
mkdir -p "$OUT/p1" "$OUT/p2" "$OUT/p3"
rm -f "$OUT/verify.done"
LOG="$OUT/verify.log"
: > "$LOG"
say() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }

if [ -n "${DATABASE_URL:-}" ]; then say "DATABASE_URL is set — this drive seeds the IN-MEMORY store only; refusing"; touch "$OUT/verify.done"; exit 2; fi
if [ "${CLEAN_NEXT:-0}" = "1" ]; then say "removing .next (whole)"; rm -rf .next; fi

say "boot next dev on $PORT"
SESSION_SECRET="landing-v3-local-session-secret-0123456789abcdef" \
OTP_PEPPER="landing-v3-pepper-0123" \
DISABLE_ADMIN_TOTP=true \
NEXT_TELEMETRY_DISABLED=1 \
npx next dev -p $PORT > "$OUT/dev.log" 2>&1 &
DEV_PID=$!
cleanup() {
  say "stopping dev server"
  pid=$(netstat -ano 2>/dev/null | grep "LISTENING" | grep ":$PORT " | awk '{print $NF}' | head -1)
  [ -n "${pid:-}" ] && taskkill //PID "$pid" //T //F >/dev/null 2>&1
  kill "$DEV_PID" 2>/dev/null
  touch "$OUT/verify.done"
}
trap cleanup EXIT

for i in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/health" || true)
  [ "$code" = "200" ] && break
  sleep 3
done
say "health=$code after ${i} polls"
[ "$code" = "200" ] || { say "dev server did not come up"; tail -40 "$OUT/dev.log" | tee -a "$LOG"; exit 1; }

say "seed markets + updown"
curl -s -X POST "$BASE/api/dev-test/seed-markets" -o "$OUT/seed-markets.json" -w "seed-markets %{http_code}\n" | tee -a "$LOG"
curl -s -X POST "$BASE/api/dev-test/updown-seed" -o "$OUT/seed-updown.json" -w "updown-seed %{http_code}\n" | tee -a "$LOG"
curl -s -X POST "$BASE/api/dev-test/updown-advance" -o "$OUT/updown-advance.json" -w "updown-advance %{http_code}\n" | tee -a "$LOG"
warm() { for p in "$@"; do curl -s -o /dev/null -w "warm $p %{http_code} %{time_total}s\n" "$BASE$p" | tee -a "$LOG"; done; }
warm / /markets /results

gate_cell() { # $1 = file tag · runs the gate's base pass on base-360-sw only
  BASE="$BASE" node scripts/qa/landing-ten.mjs --pass=base --cell=base-360-sw > "$OUT/gate-$1-360-sw.txt" 2>&1
  say "gate ($1, base-360-sw) exit=$? — V15/V17/V18:"
  grep -E "V15|V17|V18|GATE|TOTAL" "$OUT/gate-$1-360-sw.txt" | tail -8 | tee -a "$LOG"
}
red() { # $1 = class · $2 = file tag · [RED_PART in env]
  RED=$1 BASE="$BASE" node scripts/qa/landing-ten.mjs --red --cell=base-360-sw > "$OUT/red-$2.txt" 2>&1
  say "RED $2: $(grep -E "PROVED|BLIND|INCONCLUSIVE" "$OUT/red-$2.txt" | tail -1)"
}

# ── P1 · the one-sided featured card ────────────────────────────────────────────────────────────────
say "P1 — one-sided money only (the featured card is one-sided)"
BASE="$BASE" OUT="$OUT" PHASE=1 node scripts/qa/landing-v3/seed-onesided.mjs 2>&1 | tee -a "$LOG"
warm /
MODE=build BASE="$BASE" OUT="$OUT/p1" MAX_TILES=4 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
BASE="$BASE" OUT="$OUT/p1" TAG=budget CELLS=360x740,360x780 node scripts/qa/landing-v3/featured-budget.mjs 2>&1 | tee -a "$LOG"
BASE="$BASE" OUT="$OUT/p1" TAG=rows node scripts/qa/landing-v3/rows.mjs 2>&1 | tee -a "$LOG"
if [ "${SKIP_GATE:-0}" != "1" ]; then
  gate_cell p1
  RED_PART=price red V18 V18-price-p1   # the STATE arm: a one-sided featured card states "One side only"
fi

say "settled rows — resolve-seed-markets bets on the FIRST live markets, never the seeded seats"
curl -s -X POST -H "content-type: application/json" -d '{"markets":3,"bettors":4,"stake":1000}' "$BASE/api/dev-test/resolve-seed-markets" -o "$OUT/resolve-seed.json" -w "resolve-seed-markets %{http_code}\n" | tee -a "$LOG"

# ── P2 · a priced book, and T with a real 24h move below the floor ──────────────────────────────────────
say "P2 — contested + lopsided markets (seed-onesided PHASE=2) and T (wp34-seed STEP=tick)"
BASE="$BASE" OUT="$OUT" PHASE=2 node scripts/qa/landing-v3/seed-onesided.mjs 2>&1 | tee -a "$LOG"
BASE="$BASE" OUT="$OUT" STEP=tick node scripts/qa/landing-v3/wp34-seed.mjs 2>&1 | tee -a "$LOG"
T=$(node -e "try{console.log(require('./$OUT/wp34-seats.json').T)}catch{}")
[ -n "$T" ] || { say "no T seat — stopping (the mark would never be measured)"; exit 1; }
warm / /markets /results "/markets/$T"
MODE=build BASE="$BASE" OUT="$OUT/p2" MAX_TILES=8 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
MODE=build BASE="$BASE" OUT="$OUT/p2" PAGE=markets MAX_TILES=4 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
MODE=build BASE="$BASE" OUT="$OUT/p2" PAGE=results MAX_TILES=4 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
MODE=build BASE="$BASE" OUT="$OUT/p2" PAGE="markets/$T" MAX_TILES=6 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
MODE=build BASE="$BASE" OUT="$OUT/p2" PAGE=watchlist AUTH=demo1 SEED_WATCHLIST=1 MAX_TILES=4 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
BASE="$BASE" OUT="$OUT/p2" TAG=budget CELLS=360x740,360x780 node scripts/qa/landing-v3/featured-budget.mjs 2>&1 | tee -a "$LOG"
BASE="$BASE" OUT="$OUT/p2" TAG=rows node scripts/qa/landing-v3/rows.mjs 2>&1 | tee -a "$LOG"
BASE="$BASE" OUT="$OUT/p2" TAG=rows RED=1 node scripts/qa/landing-v3/rows.mjs 2>&1 | tee -a "$LOG"
npm run -s qa:card-geometry -- "$LABEL-after" "$BASE" > "$OUT/card-geometry.txt" 2>&1
say "qa:card-geometry exit=$? → .qa-design-geometry/card-geometry-$LABEL-after.json"
if [ "${SKIP_GATE:-0}" != "1" ]; then
  say "gate: base pass (V1-V18) against local P2"
  BASE="$BASE" node scripts/qa/landing-ten.mjs --pass=base > "$OUT/gate-base.txt" 2>&1
  say "gate exit=$? — summary:"; sed -n '/SUMMARY/,$p' "$OUT/gate-base.txt" | tee -a "$LOG"
  [ -f .qa-shots/landing-ten/gate.json ] && cp .qa-shots/landing-ten/gate.json "$OUT/gate-base.json"
  red V15 V15
  red V17 V17
  for P in price time pool predictors source order; do RED_PART=$P red V18 "V18-$P"; done
fi

# ── P3 · T past the floor, closing in 40 minutes ───────────────────────────────────────────────────────
say "P3 — T crowded past the floor (the count shows) and closing in 40 minutes (SOON, minutes)"
BASE="$BASE" OUT="$OUT" STEP=crowd node scripts/qa/landing-v3/wp34-seed.mjs 2>&1 | tee -a "$LOG"
warm / /markets
MODE=build BASE="$BASE" OUT="$OUT/p3" MAX_TILES=3 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
MODE=build BASE="$BASE" OUT="$OUT/p3" PAGE=markets WIDTHS=360 MAX_TILES=4 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
BASE="$BASE" OUT="$OUT/p3" TAG=budget CELLS=360x740,360x780 node scripts/qa/landing-v3/featured-budget.mjs 2>&1 | tee -a "$LOG"
[ "${SKIP_GATE:-0}" != "1" ] && gate_cell p3
say "done"
