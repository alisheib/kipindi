#!/usr/bin/env bash
# u43-readback.sh <full-sha>  — AGENTS.md §4 production read-back, read-only (signed out, no QA sign-in).
set -u
SHA=$1
S=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/369118b0-cff5-4315-9366-aad1558bd40d/scratchpad
cd C:/50pick-ssd/kipindi-udv || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
echo "== waiting for all three hosts to serve dpl=$SHA"
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
echo "== production qa:live (signed out)"; BASE=https://www.50pick.tz node scripts/pre-deploy-live-check.mjs > "$S/logs/qa-live-prod-$SHA.log" 2>&1; echo "rc=$?"; grep -a -E "ALL PASS|passed, [0-9]+ failed|✗" "$S/logs/qa-live-prod-$SHA.log" | tail -n 6
