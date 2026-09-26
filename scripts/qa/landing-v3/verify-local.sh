#!/usr/bin/env bash
# Landing v3 — one heavy-node lock hold: boot dev (in-memory), seed, capture build + concept, run the gate, stop.
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-local.sh <label>
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:-run}"
OUT=".qa-shots/landing-v3/$LABEL"
PORT=3057
BASE="http://localhost:$PORT"
mkdir -p "$OUT"
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
# settled markets, so the results strip exists locally and V12/V14/V4 measure it (v3 pass-2 review)
curl -s -X POST -H "content-type: application/json" -d '{"markets":3,"bettors":4,"stake":1000}' "$BASE/api/dev-test/resolve-seed-markets" -o "$OUT/resolve-seed.json" -w "resolve-seed-markets %{http_code}\n" | tee -a "$LOG"
say "warm /"
curl -s -o /dev/null -w "warm / %{http_code} %{time_total}s\n" "$BASE/" | tee -a "$LOG"
curl -s -o /dev/null -w "warm / %{http_code} %{time_total}s\n" "$BASE/" | tee -a "$LOG"

say "capture build (signed out)"
MODE=build BASE="$BASE" OUT="$OUT/build" node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
say "capture build (signed in, zero balance) 360+1280 sw"
MODE=build BASE="$BASE" OUT="$OUT/build" AUTH=demo0 WIDTHS=360,1280 LOCALES=sw MAX_TILES=3 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
say "capture build (signed in, funded) 360+1280 sw"
MODE=build BASE="$BASE" OUT="$OUT/build" AUTH=demo1 WIDTHS=360,1280 LOCALES=sw MAX_TILES=3 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"

if [ "${SKIP_GATE:-0}" != "1" ]; then
  say "gate: base pass (V1-V17) against local"
  BASE="$BASE" node scripts/qa/landing-ten.mjs --pass=base > "$OUT/gate-base.txt" 2>&1
  say "gate exit=$? — tail:"; tail -30 "$OUT/gate-base.txt" | tee -a "$LOG"
  [ -f .qa-shots/landing-ten/gate.json ] && cp .qa-shots/landing-ten/gate.json "$OUT/gate-base.json"
  for V in V15 V16 V17; do
    say "RED $V on base-360-sw"
    RED=$V BASE="$BASE" node scripts/qa/landing-ten.mjs --red --cell=base-360-sw > "$OUT/red-$V.txt" 2>&1
    grep -E "PROVED|BLIND|INCONCLUSIVE" "$OUT/red-$V.txt" | tail -3 | tee -a "$LOG"
  done
fi

if [ "${SKIP_CONCEPT:-0}" != "1" ]; then
  say "capture concept"
  MODE=concept OUT="$OUT/concept" node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
fi
say "done"
