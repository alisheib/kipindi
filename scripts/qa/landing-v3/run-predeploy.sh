#!/usr/bin/env bash
# Landing v3 — the repo's pre-push gate (`npm run predeploy`) for one unit, logged, with its exit code, and a .done
# marker. Run it under the lock, detached:
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/run-predeploy.sh <label>
set -u
cd "$(dirname "$0")/../../.." || exit 1
LABEL="${1:-unit}"
OUT=".qa-shots/landing-v3"
LOG="$OUT/predeploy-$LABEL.log"
mkdir -p "$OUT"
rm -f "$OUT/predeploy-$LABEL.done"
echo "[$(date -u +%H:%M:%S)] predeploy start ($(git rev-parse --short HEAD))" > "$LOG"
npm run predeploy >> "$LOG" 2>&1
code=$?
echo "[$(date -u +%H:%M:%S)] predeploy EXIT=$code" >> "$LOG"
touch "$OUT/predeploy-$LABEL.done"
