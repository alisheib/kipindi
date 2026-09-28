#!/usr/bin/env bash
# Landing v3 · WP12 (R5, "the Match") — after the push: the band re-measured on PRODUCTION (spec §15.9).
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-band-prod.sh <label> <sha>
# 1. wait until production serves <sha> (the ?dpl= on the asset URLs);
# 2. the frame gate on whatever state production's band is in, frames kept (band-metrics.mjs, SHOTS);
# 3. the agreement drive three times, 75 s apart, sw/en/zh (band-agree.mjs) — band vs round page, same minute;
# 4. the landing gate's base pass + REDs (verify-prod.sh, which re-captures / at 360/768/1280 × sw/en/zh).
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:?label}"; SHA="${2:?sha}"
BASE="https://www.50pick.tz"
OUT=".qa-shots/landing-v3/$LABEL"
mkdir -p "$OUT"; LOG="$OUT/band-prod.log"; : > "$LOG"
say() { echo "[$(date -u +%H:%M:%S)] $*" | tee -a "$LOG"; }

say "waiting for production to serve $SHA"
live=""
for i in $(seq 1 60); do
  live=$(curl -s "$BASE/?v=$RANDOM" | grep -o 'dpl=[0-9a-f]\{7,40\}' | head -1 | cut -d= -f2)
  case "$live" in "$SHA"*|"${SHA:0:7}"*) break;; esac
  sleep 20
done
say "production dpl=$live (wanted $SHA) after $i polls"
case "$live" in "$SHA"*|"${SHA:0:7}"*) ;; *) say "production is NOT serving $SHA — stopping"; exit 3;; esac

say "band-metrics on production (frames kept)"
BASE="$BASE" SHOTS="$OUT/band" CELLS="360-sw,360-en,360-zh,768-sw,768-en,768-zh,1280-sw,1280-en,1280-zh,320-sw,1024-en" \
  node scripts/qa/landing-v3/band-metrics.mjs > "$OUT/band-metrics.txt" 2>&1
say "band-metrics exit=$?"; cat "$OUT/band-metrics.txt" | tee -a "$LOG"

say "band-agree on production ×3, 75 s apart"
BASE="$BASE" RUNS=3 GAP_S=75 node scripts/qa/landing-v3/band-agree.mjs > "$OUT/band-agree.txt" 2>&1
say "band-agree exit=$?"; cat "$OUT/band-agree.txt" | tee -a "$LOG"

say "the landing gate (verify-prod.sh)"
bash scripts/qa/landing-v3/verify-prod.sh "$LABEL" "$SHA" >> "$LOG" 2>&1
say "verify-prod exit=$?"
touch "$OUT/band-prod.done"
say "done"
