#!/usr/bin/env bash
# Lock turn WH (asheib-c5): the static-cache HOTFIX on F:/kipindi-hotfix (main + the scoped immutable rule) — typecheck,
# test:static-cache-scope, then a fresh in-memory `next dev --webpack` (a junctioned worktree) and the real response
# headers: page addresses must NOT be sent `immutable`, public/'s static files must be.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wh-chain.log"; WT="kipindi-hotfix"; PORT=3077
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wh-chain.done"
. "$S/chain-lib.sh"
. "$S/kp-lock.sh"
take_lock "wh-chain: the static-cache hotfix - typecheck, its guard, response headers on a dev server, ~10 min" || { echo "exit=5" > "$R/wh-chain.done"; exit 5; }
trap release EXIT
cd /f/kipindi-hotfix || { note "STOP: no hotfix tree"; echo "exit=2" > "$R/wh-chain.done"; exit 2; }
note "kipindi-hotfix at $(git rev-parse --short HEAD) + $(git status --short | wc -l) changed file(s)"
( timeout 1800 npx tsc --noEmit -p . ) > "$R/wh-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wh-typecheck.log") error(s)"
( npm run -s test:static-cache-scope ) > "$R/wh-guard.log" 2>&1
note "test:static-cache-scope exit=$? — $(tail -1 "$R/wh-guard.log")"
rm -rf .next
env -u DATABASE_URL SESSION_SECRET=omega-a8i2-local-secret-0123456789abcdef OTP_PEPPER=omega-a8i2-pepper-0123 DISABLE_ADMIN_TOTP=true \
  npx next dev --webpack -p "$PORT" > "$R/wh-server.log" 2>&1 &
up=0
for i in $(seq 1 180); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" || true)
  if [ "$code" = "200" ]; then up=1; note "server up after $((i * 2))s"; break; fi
  sleep 2
done
if [ $up -eq 1 ]; then
  bad=0
  for p in /markets/zz-probe.png /markets/mexico /u/federico /positions/abc.jpg /markets /; do
    curl -s -o /dev/null "http://localhost:$PORT$p"
    h=$(curl -s -o /dev/null -D - "http://localhost:$PORT$p" | tr -d '\r' | grep -i '^cache-control:' | head -1)
    case "$h" in *immutable*) bad=$((bad+1)); note "  ⛔ PAGE $p — $h";; *) note "  ok page $p — ${h:-no cache-control}";; esac
  done
  for p in /icons/icon-192.png /brand/mark-color.svg /favicon.ico /favicon.svg; do
    h=$(curl -s -o /dev/null -D - "http://localhost:$PORT$p" | tr -d '\r' | grep -i '^cache-control:' | head -1)
    case "$h" in *immutable*) note "  ok static $p — $h";; *) bad=$((bad+1)); note "  ⛔ STATIC $p — ${h:-no cache-control}";; esac
  done
  note "headers: $bad problem(s)"
else
  note "server never came up"
fi
left=$(powershell -NoProfile -ExecutionPolicy Bypass -File "$S/kp-procs.ps1" -Wt "$WT" -Port "$PORT" -Stop | tr -dc "0-9"); note "server stopped (left: ${left:-?})"
note "chain end"
echo "exit=0" > "$R/wh-chain.done"
