#!/usr/bin/env bash
# Landing v3 · WP14 — after a push: wait until production serves <sha>, then sign in ONCE as mobile01
# (never-funded) and prove signed-in pages render with the Wallet code and the zero-balance header.
#   bash ~/heavy-node-lock.sh run landing bash scripts/qa/landing-v3/verify-wallet-prod.sh <label> <sha>
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

say "signed-in check (mobile01, once)"
LIVE_BASE="$BASE" OUT="$OUT/wallet" node scripts/qa/landing-v3/wallet-prod.mjs 2>&1 | tee -a "$LOG"
say "done"
