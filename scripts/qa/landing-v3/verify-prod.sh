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
# D2 rows change `market-card.tsx`, which /markets, /results and /watchlist render too — those pages are
# re-shot on every D2 deploy (LANDING-TEN §2.0). PAGES is a space-separated list WITHOUT leading slashes.
for P in ${PAGES:-}; do
  say "capture production /$P"
  MODE=build BASE="$BASE" OUT="$OUT/prod" PAGE="$P" MAX_TILES=4 node scripts/qa/landing-v3/capture.mjs 2>&1 | tee -a "$LOG"
done
say "gate: base pass against production"
BASE="$BASE" node scripts/qa/landing-ten.mjs --pass=base > "$OUT/gate-base.txt" 2>&1
say "gate exit=$?"; sed -n '/SUMMARY/,$p' "$OUT/gate-base.txt" | tee -a "$LOG"
[ -f .qa-shots/landing-ten/gate.json ] && cp .qa-shots/landing-ten/gate.json "$OUT/gate-base.json"
# WP14b (K50) — every landing market's share preview, read as WhatsApp reads it; fetch only.
say "og previews (qa:landing-v3:og-prod)"
BASE="$BASE" OUT="$OUT" node scripts/qa/landing-v3/og-prod.mjs > "$OUT/og-prod.txt" 2>&1
say "og-prod exit=$?"; tail -2 "$OUT/og-prod.txt" | tee -a "$LOG"
for V in V3 V14 V15 V16 V17; do
  say "RED $V on production base-360-sw"
  RED=$V BASE="$BASE" node scripts/qa/landing-ten.mjs --red --cell=base-360-sw > "$OUT/red-$V.txt" 2>&1
  grep -E "PROVED|BLIND|INCONCLUSIVE" "$OUT/red-$V.txt" | tail -2 | tee -a "$LOG"
done
# V18 — one RED run per part (D2 step 0). `source` and `order` stay INCONCLUSIVE until WP3 draws a source.
for P in price time pool predictors source order; do
  say "RED V18 ($P) on production base-360-sw"
  RED_PART=$P RED=V18 BASE="$BASE" node scripts/qa/landing-ten.mjs --red --cell=base-360-sw > "$OUT/red-V18-$P.txt" 2>&1
  grep -E "PROVED|BLIND|INCONCLUSIVE" "$OUT/red-V18-$P.txt" | tail -1 | tee -a "$LOG"
done
say "done"
