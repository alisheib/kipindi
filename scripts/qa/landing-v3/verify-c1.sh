#!/usr/bin/env bash
# Landing v3 · C1 "one price rule everywhere" — one heavy-node lock hold: boot dev (in-memory), seed EVERY price
# state the spec's §7 names (c1-seed.mjs), then drive it (c1-drive.mjs) at 360/768/1280 × sw/en/zh, signed out
# and signed in (/auth/demo?deposit=1; the drive places no bets). Stops the server.
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-c1.sh <label>
#   RED baseline (the untouched tree, spec §7 "RED"): EXPECT_RED=1 … verify-c1.sh <label>-red
# Optional: CLEAN_NEXT=1 removes .next first (whole, never a sub-folder); WIDTHS / LOCALES / AUTHS narrow the grid.
# Frames, the seed, the drive's report and logs land in .qa-shots/landing-v3/<label>/; <label>/verify.done marks the end.
# ⛔ Never wrap the lock in `timeout`. Run it detached. It needs the in-memory store (no DATABASE_URL).
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:-c1}"
OUT=".qa-shots/landing-v3/$LABEL"
PORT=3057
BASE="http://localhost:$PORT"
mkdir -p "$OUT"
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
# Warm the boards once so the first seed call is not measured against a cold compile.
for p in / /markets /live /results /updown; do curl -s -o /dev/null -w "warm $p %{http_code} %{time_total}s\n" "$BASE$p" | tee -a "$LOG"; done

say "seed every C1 state (S1 S2 P1 · O1-O3 · E2 F · UD1 UD2 · C1-C3 L)"
BASE="$BASE" OUT="$OUT" node scripts/qa/landing-v3/c1-seed.mjs 2>&1 | tee -a "$LOG"
[ -f "$OUT/c1-seats.json" ] || { say "the seed wrote no c1-seats.json — stopping (nothing would be measured)"; exit 1; }
for p in /live /results /updown; do curl -s -o /dev/null -w "warm $p %{http_code} %{time_total}s\n" "$BASE$p" | tee -a "$LOG"; done

say "drive (EXPECT_RED=${EXPECT_RED:-0})"
BASE="$BASE" OUT="$OUT" EXPECT_RED="${EXPECT_RED:-0}" npx tsx scripts/qa/landing-v3/c1-drive.mjs > "$OUT/drive.txt" 2>&1
DRIVE=$?
say "drive exit=$DRIVE"
tail -12 "$OUT/drive.txt" | tee -a "$LOG"
say "done"
