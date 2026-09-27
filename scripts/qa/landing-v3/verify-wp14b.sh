#!/usr/bin/env bash
# Landing v3 · WP14b — one heavy-node lock hold: typecheck + suites, then boot dev (in-memory), seed a
# settled book and one-sided money, drive the share on settled cards (share-drive.mjs), read every share
# preview locally (og-prod.mjs), and capture /, /markets and /results. Stops the server.
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-wp14b.sh <label>
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:-wp14b}"
OUT=".qa-shots/landing-v3/$LABEL"
PORT=3057
BASE="http://localhost:$PORT"
mkdir -p "$OUT"
rm -f "$OUT/verify.done"
LOG="$OUT/verify.log"
: > "$LOG"
say() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }

if [ "${ONLY_SHARE:-0}" != "1" ]; then
say "typecheck"
npm run -s typecheck > "$OUT/typecheck.txt" 2>&1; say "typecheck exit=$?"
say "suites"
node scripts/test-all.mjs --no-tsc --filter share-preview,card-share,one-sided,outcome,hero-contract,landing-contract,landing-ten-plan,i18n,labels,rate-copy,design-frozen,dead-css,client-graph-safe,ui-consistency,orphans,red-anchors,decomment,contrast > "$OUT/suites.txt" 2>&1
say "suites exit=$? — $(grep -E 'FAILED:' "$OUT/suites.txt" | tail -1)"
fi

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

say "seed markets + settled rows + one-sided money"
curl -s -X POST "$BASE/api/dev-test/seed-markets" -o "$OUT/seed-markets.json" -w "seed-markets %{http_code}\n" | tee -a "$LOG"
curl -s -X POST -H "content-type: application/json" -d '{"markets":3,"bettors":4,"stake":1000}' "$BASE/api/dev-test/resolve-seed-markets" -o "$OUT/resolve-seed.json" -w "resolve-seed-markets %{http_code}\n" | tee -a "$LOG"
BASE="$BASE" OUT="$OUT" PHASE=1 node scripts/qa/landing-v3/seed-onesided.mjs 2>&1 | tee -a "$LOG"
BASE="$BASE" OUT="$OUT" PHASE=2 node scripts/qa/landing-v3/seed-onesided.mjs 2>&1 | tee -a "$LOG"
for p in "" results markets; do curl -s -o /dev/null -w "warm /$p %{http_code} %{time_total}s\n" "$BASE/$p" | tee -a "$LOG"; done

say "share on settled cards (share-drive)"
BASE="$BASE" OUT="$OUT" node scripts/qa/landing-v3/share-drive.mjs 2>&1 | tee -a "$LOG"
[ "${ONLY_SHARE:-0}" = "1" ] && { say "done (ONLY_SHARE)"; exit 0; }
say "share previews, read as WhatsApp reads them (og-prod against local)"
BASE="$BASE" OG_HOST="https://www.50pick.tz" OUT="$OUT" node scripts/qa/landing-v3/og-prod.mjs > "$OUT/og-local.txt" 2>&1
say "og-local exit=$? — $(tail -1 "$OUT/og-local.txt")"
grep -E "^  (priced|oneSided|none|row) " "$OUT/og-local.txt" | head -12 | tee -a "$LOG"

say "capture / , /results, /markets"
MODE=build BASE="$BASE" OUT="$OUT/cap" MAX_TILES=6 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
MODE=build BASE="$BASE" OUT="$OUT/cap" PAGE=results MAX_TILES=4 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
MODE=build BASE="$BASE" OUT="$OUT/cap" PAGE=markets MAX_TILES=3 WIDTHS=360,1280 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
say "done"
