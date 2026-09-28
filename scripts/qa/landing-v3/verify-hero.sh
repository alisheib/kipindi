#!/usr/bin/env bash
# Landing v3 · hero v3 (R7/R8/R9) — one heavy-node lock hold: typecheck, clear .next WHOLE, boot an in-memory
# `next dev` on localhost, seed, then the spec §11 checks on a REAL render:
#   1. served HTML (sw/en/zh): the h1's spaces, no warning sentence / "Tangu" / "Dar es Salaam" / "EST." in the
#      hero, `lang="en"` only on the sign-off, a tel: link, the claim in state P, the four rail names;
#   2. frames — viewport tiles, never full-page — 320, 360×740, 360×780, 768×1024, 1024×768, 1280×800 × sw/en/zh,
#      visitor; signed in (zero and funded) at 360/1280 × sw/en/zh; the YES/NO bottom recorded per cell;
#   3. the gate's base pass incl. the 360×740 cells, then RED V15/V16/V17, V21 (360×740 sw) and V22 (360 sw).
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-hero.sh <label>
# Frames and reports land in .qa-shots/landing-v3/<label>/; <label>/verify.done marks the end.
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:-hero}"
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

say "seed markets + updown + settled rows"
curl -s -X POST "$BASE/api/dev-test/seed-markets" -o "$OUT/seed-markets.json" -w "seed-markets %{http_code}\n" | tee -a "$LOG"
curl -s -X POST "$BASE/api/dev-test/updown-seed" -o "$OUT/seed-updown.json" -w "updown-seed %{http_code}\n" | tee -a "$LOG"
curl -s -X POST "$BASE/api/dev-test/updown-advance" -o "$OUT/updown-advance.json" -w "updown-advance %{http_code}\n" | tee -a "$LOG"
curl -s -X POST -H "content-type: application/json" -d '{"markets":3,"bettors":4,"stake":1000}' "$BASE/api/dev-test/resolve-seed-markets" -o "$OUT/resolve-seed.json" -w "resolve-seed-markets %{http_code}\n" | tee -a "$LOG"
curl -s -o /dev/null -w "warm / %{http_code} %{time_total}s\n" "$BASE/" | tee -a "$LOG"

if [ "${ONLY_GATE:-0}" != "1" ]; then
say "served HTML (spec §11.2)"
BASE="$BASE" OUT="$OUT" node scripts/qa/landing-v3/hero-served.mjs 2>&1 | tee -a "$LOG"

say "frames — visitor: 320, 360x780, 768, 1024x768, 1280x800 x sw/en/zh"
MODE=build BASE="$BASE" OUT="$OUT/visitor" WIDTHS=320,360,768,1024,1280 HEIGHTS=1024:768,1280:800 MAX_TILES=3 \
  node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
say "frames — visitor: 360x740 x sw/en/zh (the delivery's own first screen)"
MODE=build BASE="$BASE" OUT="$OUT/visitor740" WIDTHS=360 HEIGHTS=360:740 MAX_TILES=2 \
  node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
say "frames — signed in, zero balance and funded: 360 + 1280 x sw/en/zh"
MODE=build BASE="$BASE" OUT="$OUT/player" AUTH=demo0 WIDTHS=360,1280 MAX_TILES=2 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
MODE=build BASE="$BASE" OUT="$OUT/player" AUTH=demo1 WIDTHS=360,1280 MAX_TILES=2 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
say "frames — 360 sw at 130% root text, and focus/hover on both CTAs and the helpline"
BASE="$BASE" OUT="$OUT/states" node scripts/qa/landing-v3/hero-states.mjs 2>&1 | tee -a "$LOG"

fi   # ONLY_GATE=1 skips the served-HTML check and every frame (a gate-only rerun)
if [ "${SKIP_GATE:-0}" != "1" ]; then
  say "gate: base pass (every cell, incl. 360x740) against local"
  BASE="$BASE" node scripts/qa/landing-ten.mjs --pass=base > "$OUT/gate-base.txt" 2>&1
  say "gate exit=$? — summary:"; sed -n '/SUMMARY/,$p' "$OUT/gate-base.txt" | tee -a "$LOG"
  [ -f .qa-shots/landing-ten/gate.json ] && cp .qa-shots/landing-ten/gate.json "$OUT/gate-base.json"
  for V in V15 V16 V17 V22; do
    say "RED $V on base-360-sw"
    RED=$V BASE="$BASE" node scripts/qa/landing-ten.mjs --red --cell=base-360-sw > "$OUT/red-$V.txt" 2>&1
    grep -E "PROVED|BLIND|INCONCLUSIVE" "$OUT/red-$V.txt" | tail -3 | tee -a "$LOG"
  done
  say "RED V21 on base-360x740-sw"
  RED=V21 BASE="$BASE" node scripts/qa/landing-ten.mjs --red --cell=base-360x740-sw > "$OUT/red-V21.txt" 2>&1
  grep -E "PROVED|BLIND|INCONCLUSIVE" "$OUT/red-V21.txt" | tail -3 | tee -a "$LOG"
fi
say "done"
