#!/usr/bin/env bash
# AGENTS.md §4's production read-back after a push to main, read-only and signed out, from the pushed tree:
#   1. www, the apex and the Railway host each serve ?dpl=<target> (polled for up to 40 minutes);
#   2. /api/health on each (the database reachable and migrated; the Millionea state);
#   3. qa:chunks-prod on both public origins; 4. production qa:live (signed out) on www.
. "$CI_RUN/lib.sh"
SHA=$(git rev-parse HEAD); P=${SHA:0:9}
HOSTS="https://www.50pick.tz https://50pick.tz https://kipindi-production.up.railway.app"
t0=$(date +%s)
echo "$(date -u +%T) waiting for dpl=$P on: $HOSTS"
while :; do
  all=1; line=""
  for h in $HOSTS; do
    d=$(curl -s -m 25 "$h/" | grep -o "dpl=[a-zA-Z0-9]*" | head -1)
    line="$line ${h#https://}:${d:-none}"
    case "$d" in "dpl=$P"*) ;; *) all=0 ;; esac
  done
  el=$(( $(date +%s) - t0 ))
  if [ $all -eq 1 ]; then echo "$(date -u +%T) ALL THREE LIVE after ${el}s:$line"; echo "dpl rc=0" >> "$OUT/summary.txt"; break; fi
  if [ $el -ge 2400 ]; then echo "$(date -u +%T) TIMEOUT after ${el}s:$line"; echo "dpl rc=1" >> "$OUT/summary.txt"; LIB_FAILED=1; finish; fi
  sleep 20
done
for h in $HOSTS; do
  echo "health ${h#https://}: $(curl -s -m 25 "$h/api/health" | head -c 900)"
done
step chunks-www npm run -s qa:chunks-prod -- --origin https://www.50pick.tz
step chunks-apex npm run -s qa:chunks-prod -- --origin https://50pick.tz
step qalive-prod env BASE=https://www.50pick.tz node scripts/pre-deploy-live-check.mjs
finish
