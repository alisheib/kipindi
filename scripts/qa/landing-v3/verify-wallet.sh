#!/usr/bin/env bash
# Landing v3 · WP14 — one heavy-node lock hold: tsc, boot dev (in-memory), seed, drive the Wallet, capture, stop.
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-wallet.sh <label>
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:-wallet}"
OUT=".qa-shots/landing-v3/$LABEL"
PORT=3057
BASE="http://localhost:$PORT"
mkdir -p "$OUT"
LOG="$OUT/verify.log"
: > "$LOG"
say() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }

say "tsc"
npx tsc --noEmit -p . > "$OUT/tsc.txt" 2>&1
TSC=$?
say "TSC_EXIT=$TSC"; tail -15 "$OUT/tsc.txt" | tee -a "$LOG"

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
curl -s -X POST "$BASE/api/dev-test/seed-markets" -o /dev/null -w "seed-markets %{http_code}\n" | tee -a "$LOG"
curl -s -X POST "$BASE/api/dev-test/updown-seed" -o /dev/null -w "updown-seed %{http_code}\n" | tee -a "$LOG"
curl -s -o /dev/null -w "warm / %{http_code} %{time_total}s\n" "$BASE/" | tee -a "$LOG"
curl -s -o /dev/null -w "warm / %{http_code} %{time_total}s\n" "$BASE/" | tee -a "$LOG"
curl -s -o /dev/null -w "warm /wallet %{http_code} %{time_total}s\n" "$BASE/wallet" | tee -a "$LOG"

say "drive the Wallet"
BASE="$BASE" OUT="$OUT/wallet" node scripts/qa/landing-v3/wallet.mjs 2>&1 | tee -a "$LOG"

say "drive the signed-in hero (WP14 part 2)"
BASE="$BASE" OUT="$OUT/hero" node scripts/qa/landing-v3/hero-mine.mjs 2>&1 | tee -a "$LOG"

say "capture landing signed in (zero + funded) 360/768/1280 sw,en"
MODE=build BASE="$BASE" OUT="$OUT/build" AUTH=demo0 WIDTHS=360,768,1280 LOCALES=sw,en MAX_TILES=2 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
MODE=build BASE="$BASE" OUT="$OUT/build" AUTH=demo1 WIDTHS=360,768,1280 LOCALES=sw,en MAX_TILES=2 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
say "done"
