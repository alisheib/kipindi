#!/usr/bin/env bash
# Landing v3 — after a push to main: wait until production serves <sha>, then capture + gate it.
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-prod.sh <label> <sha>
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:?label}"; SHA="${2:?sha}"
BASE="https://www.50pick.tz"
OUT=".qa-shots/landing-v3/$LABEL"
mkdir -p "$OUT"; LOG="$OUT/verify.log"; : > "$LOG"
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

say "capture production (signed out)"
MODE=build BASE="$BASE" OUT="$OUT/prod" node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
say "gate: base pass against production"
BASE="$BASE" node scripts/qa/landing-ten.mjs --pass=base > "$OUT/gate-base.txt" 2>&1
say "gate exit=$?"; sed -n '/SUMMARY/,$p' "$OUT/gate-base.txt" | tee -a "$LOG"
[ -f .qa-shots/landing-ten/gate.json ] && cp .qa-shots/landing-ten/gate.json "$OUT/gate-base.json"
for V in V3 V14 V15 V16 V17; do
  say "RED $V on production base-360-sw"
  RED=$V BASE="$BASE" node scripts/qa/landing-ten.mjs --red --cell=base-360-sw > "$OUT/red-$V.txt" 2>&1
  grep -E "PROVED|BLIND|INCONCLUSIVE" "$OUT/red-$V.txt" | tail -2 | tee -a "$LOG"
done
say "done"
