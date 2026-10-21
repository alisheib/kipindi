#!/usr/bin/env bash
# mln-readback.sh <full-sha> <tree> : the AGENTS.md §4 production read-back after a push to main.
#  1. polls www, the apex and the Railway host until each serves dpl=<sha prefix> (max 40 min);
#  2. /api/health on each (database reachable and migrated);
#  3. qa:chunks-prod on both public origins; 4. production qa:live (read-only: no QA sign-in) on www.
# Runs the node scripts from C:/50pick-ssd/<tree> (a tree at or after the pushed commit). MASWALI-BUILD, 2026-10-19.
set -u
SHA="$1"; TREE="$2"; P=${SHA:0:9}
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
  if [ $all -eq 1 ]; then echo "$(date -u +%T) ALL THREE LIVE after ${el}s:$line"; break; fi
  if [ $el -ge 2400 ]; then echo "$(date -u +%T) TIMEOUT after ${el}s:$line"; exit 3; fi
  sleep 20
done
for h in $HOSTS; do echo "health ${h#https://}: $(curl -s -m 25 "$h/api/health" | head -c 400)"; done
cd "C:/50pick-ssd/$TREE" || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
for o in https://www.50pick.tz https://50pick.tz; do
  echo "== qa:chunks-prod $o"; npm run -s qa:chunks-prod -- --origin "$o" 2>&1 | tail -4
done
echo "== production qa:live (www, read-only)"
BASE=https://www.50pick.tz node scripts/pre-deploy-live-check.mjs > "$(dirname "$0")/lead/prod-qalive-$P.log" 2>&1
rc=$?
grep -E "✗|ALL PASS|passed, |NOT MEASURED" "$(dirname "$0")/lead/prod-qalive-$P.log" | tail -12
echo "production qa:live rc=$rc"
