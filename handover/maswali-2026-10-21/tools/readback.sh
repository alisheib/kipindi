#!/usr/bin/env bash
# readback.sh <full-sha> — AGENTS.md §4 production read-back, read-only and signed out (no QA sign-in): the three hosts
# serve ?dpl=<sha>, /api/health, qa:chunks-prod on www and apex, production qa:live. Adapted from U43's u43-readback.sh
# (branch u43-handover-20261021) for the Maswali lead's tree and scratchpad. Runs from C:/50pick-ssd/kipindi-mln-rb, a
# detached tree checked out at <sha> (its node_modules is a junction into the release tree; same package-lock as main).
set -u
SHA=$1
S=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad
cd C:/50pick-ssd/kipindi-mln-rb || exit 2
git checkout -q --detach "$SHA" || exit 3
echo "tree at $(git rev-parse --short=9 HEAD)"
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
mkdir -p "$S/lead/readback"
echo "== waiting for all three hosts to serve dpl=$SHA ($(date -u +%T)Z)"
for i in $(seq 1 90); do
  allok=1
  for h in https://www.50pick.tz https://50pick.tz https://kipindi-production.up.railway.app; do
    d=$(curl -s -m 20 "$h/" | grep -o 'dpl=[0-9a-f]\{7,40\}' | sort -u | tr '\n' ' ')
    case "$d" in *"dpl=$SHA"*) ;; *) allok=0 ;; esac
  done
  [ $allok = 1 ] && break
  sleep 20
done
for h in https://www.50pick.tz https://50pick.tz https://kipindi-production.up.railway.app; do
  echo "$h -> $(curl -s -m 20 "$h/" | grep -o 'dpl=[0-9a-f]\{7,40\}' | sort -u | tr '\n' ' ')"
done
echo "== /api/health"
curl -s -m 20 https://www.50pick.tz/api/health | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const j=JSON.parse(s);console.log(JSON.stringify({ok:j.ok,database:j.database&&{reachable:j.database.reachable,migrated:j.database.migrated,configured:j.database.configured}}))}catch{console.log(s.slice(0,300))}})"
echo "== qa:chunks-prod www"; node scripts/qa-chunks-prod.mjs --origin https://www.50pick.tz 2>&1 | tail -n 3
echo "== qa:chunks-prod apex"; node scripts/qa-chunks-prod.mjs --origin https://50pick.tz 2>&1 | tail -n 3
echo "== production qa:live (signed out)"; BASE=https://www.50pick.tz node scripts/pre-deploy-live-check.mjs > "$S/lead/readback/qa-live-prod-$SHA.log" 2>&1; echo "rc=$?"; grep -a -E "ALL PASS|passed, [0-9]+ failed|✗" "$S/lead/readback/qa-live-prod-$SHA.log" | tail -n 6
echo "== done $(date -u +%T)Z"
