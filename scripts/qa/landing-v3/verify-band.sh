#!/usr/bin/env bash
# Landing v3 · WP12 (R5, "the Match") — one heavy-node lock hold: typecheck, clear .next WHOLE (a corrupted
# Turbopack cache once made every page 500), boot one in-memory `next dev` on localhost, run the band's
# drive through every state (band-drive.mjs: frames, band-metrics, band-agree, served HTML, focus,
# Back/Forward, R5(a) refresh, the RED control), stop the server.
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-band.sh <label>
# Frames land in .qa-shots/landing-v3/<label>/frames/, the figures in band-report.json; <label>/verify.done
# marks the end. SKIP_TSC=1 skips the typecheck when nothing typed changed since the last green one.
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:-band}"
OUT=".qa-shots/landing-v3/$LABEL"
PORT=3057
BASE="http://localhost:$PORT"
mkdir -p "$OUT"
rm -f "$OUT/verify.done"
LOG="$OUT/verify.log"
: > "$LOG"
say() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }

if [ "${SKIP_TSC:-0}" != "1" ]; then
  say "typecheck"
  npx tsc --noEmit > "$OUT/tsc.txt" 2>&1
  say "tsc exit=$? ($(grep -c 'error TS' "$OUT/tsc.txt") errors)"
fi

say "rm -rf .next (whole)"
rm -rf .next

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

say "warm / (first compile)"
curl -s -o /dev/null -w "warm / %{http_code} %{time_total}s\n" "$BASE/" | tee -a "$LOG"

say "band drive"
BASE="$BASE" OUT="$OUT" node scripts/qa/landing-v3/band-drive.mjs >> "$LOG" 2>&1
say "band drive exit=$?"
grep -E "SUMMARY|^\[.*\]   - |PASS|FAIL" "$LOG" | tail -60
say "done"
