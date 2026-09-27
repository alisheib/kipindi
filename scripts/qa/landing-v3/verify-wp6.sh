#!/usr/bin/env bash
# Landing v3 · WP6 — one heavy-node lock hold: boot dev (in-memory), seed, then put money on the book
# in two phases (seed-onesided.mjs) and capture / and /markets after each, so the ONE-SIDED state is
# seen on the featured card and a board row (phase 1) and on the grid and /markets beside priced and
# lopsided markets (phase 2). Then the gate's base pass and RED V17 against phase 2. Stops the server.
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-wp6.sh <label>
# Frames, reports and logs land in .qa-shots/landing-v3/<label>/; <label>/verify.done marks the end.
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:-wp6}"
OUT=".qa-shots/landing-v3/$LABEL"
PORT=3057
BASE="http://localhost:$PORT"
mkdir -p "$OUT"
rm -f "$OUT/verify.done"
LOG="$OUT/verify.log"
: > "$LOG"
say() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }

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

# Phase 1 runs BEFORE the settled-row seed: that seed leaves one contested market OPEN, which would take
# the featured seat — and the one-sided FEATURED card is what phase 1 exists to show.
say "phase 1 — one-sided money only (no priced market open, so the featured card is one-sided)"
BASE="$BASE" OUT="$OUT" PHASE=1 node scripts/qa/landing-v3/seed-onesided.mjs 2>&1 | tee -a "$LOG"
curl -s -o /dev/null -w "warm / %{http_code} %{time_total}s\n" "$BASE/" | tee -a "$LOG"
curl -s -o /dev/null -w "warm /markets %{http_code} %{time_total}s\n" "$BASE/markets" | tee -a "$LOG"
say "capture phase 1: / at 360/768/1280 x sw/en/zh"
MODE=build BASE="$BASE" OUT="$OUT/p1" MAX_TILES=4 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
say "settled rows — resolve-seed-markets bets on the FIRST live markets, never the seeded seats"
curl -s -X POST -H "content-type: application/json" -d '{"markets":3,"bettors":4,"stake":1000}' "$BASE/api/dev-test/resolve-seed-markets" -o "$OUT/resolve-seed.json" -w "resolve-seed-markets %{http_code}\n" | tee -a "$LOG"

say "phase 2 — three contested markets and one lopsided two-sided market"
BASE="$BASE" OUT="$OUT" PHASE=2 node scripts/qa/landing-v3/seed-onesided.mjs 2>&1 | tee -a "$LOG"
curl -s -o /dev/null -w "warm / %{http_code} %{time_total}s\n" "$BASE/" | tee -a "$LOG"
curl -s -o /dev/null -w "warm /markets %{http_code} %{time_total}s\n" "$BASE/markets" | tee -a "$LOG"
say "capture phase 2: / and /markets at 360/768/1280 x sw/en/zh"
MODE=build BASE="$BASE" OUT="$OUT/p2" MAX_TILES=8 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
MODE=build BASE="$BASE" OUT="$OUT/p2" PAGE=markets MAX_TILES=4 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"

if [ "${SKIP_GATE:-0}" != "1" ]; then
  say "gate: base pass (V1-V17) against local phase 2"
  BASE="$BASE" node scripts/qa/landing-ten.mjs --pass=base > "$OUT/gate-base.txt" 2>&1
  say "gate exit=$? — summary:"; sed -n '/SUMMARY/,$p' "$OUT/gate-base.txt" | tee -a "$LOG"
  [ -f .qa-shots/landing-ten/gate.json ] && cp .qa-shots/landing-ten/gate.json "$OUT/gate-base.json"
  for V in V15 V16 V17; do
    say "RED $V on base-360-sw"
    RED=$V BASE="$BASE" node scripts/qa/landing-ten.mjs --red --cell=base-360-sw > "$OUT/red-$V.txt" 2>&1
    grep -E "PROVED|BLIND|INCONCLUSIVE" "$OUT/red-$V.txt" | tail -3 | tee -a "$LOG"
  done
fi
say "done"
