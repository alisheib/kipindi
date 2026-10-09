#!/usr/bin/env bash
# Lock turn WH3 (asheib-c5): the proxy-scope HOTFIX (11167ae2 on main 33547d73) — typecheck in the control tree (its own
# node_modules and Prisma client), the guard and the suites that read src/proxy.ts, then an in-memory `next dev
# --webpack` of the hotfix tree and the real response headers: every page address carries the security headers; the
# static files keep their immutable cache.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wh3-chain.log"; WT="kipindi-hotfix"; PORT=3077
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wh3-chain.done"
. "$S/chain-lib.sh"
. "$S/kp-lock.sh"
take_lock "wh3-chain: the proxy-scope hotfix - typecheck, its guard, response headers on a dev server, ~12 min" || { echo "exit=5" > "$R/wh3-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wh3-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach 11167ae2 || { note "STOP: could not detach $TREE at the hotfix"; echo "exit=2" > "$R/wh3-chain.done"; exit 2; }
note "$TREE at $(git -C /f/$TREE rev-parse --short HEAD) (the proxy hotfix on main)"
( cd /f/$TREE && npx prisma generate ) > "$R/wh3-prisma.log" 2>&1; note "prisma generate exit=$?"
( cd /f/$TREE && timeout 1800 npx tsc --noEmit -p . ) > "$R/wh3-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wh3-typecheck.log") error(s)"
SUITES="test:proxy-scope test:static-cache-scope $(cd /f/$TREE && grep -l 'src/proxy.ts\|proxy\.ts' scripts/*.mts scripts/*.mjs 2>/dev/null | sed 's#scripts/##; s#\.test\.mts$##; s#\.mjs$##; s#\.mts$##' | while read b; do node -e 'const p=require("./package.json").scripts; for (const [k,v] of Object.entries(p)) if (k.startsWith("test:") && v.includes(process.argv[1])) console.log(k)' "$b"; done | sort -u | tr '\n' ' ') test:red-anchors test:decomment test:guards-exist test:docs"
for t in $SUITES; do
  ( cd /f/$TREE && FORCE_COLOR=0 timeout 900 npm run -s "$t" ) > "$R/wh3-${t//:/-}.log" 2>&1; e=$?
  note "$t exit=$e — $(grep -v '^\s*$' "$R/wh3-${t//:/-}.log" | tail -1 | cut -c1-140)"
done
cd /f/kipindi-hotfix || { note "STOP: no hotfix tree"; echo "exit=2" > "$R/wh3-chain.done"; exit 2; }
rm -rf .next
env -u DATABASE_URL SESSION_SECRET=omega-a8i2-local-secret-0123456789abcdef OTP_PEPPER=omega-a8i2-pepper-0123 DISABLE_ADMIN_TOTP=true \
  npx next dev --webpack -p "$PORT" > "$R/wh3-server.log" 2>&1 &
up=0
for i in $(seq 1 180); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/" || true)
  if [ "$code" = "200" ]; then up=1; note "server up after $((i * 2))s"; break; fi
  sleep 2
done
if [ $up -eq 1 ]; then
  bad=0
  for p in /markets/zz-probe.png /positions/abc.jpg /u/federico.svg /markets/mexico /markets /; do
    curl -s -o /dev/null "http://localhost:$PORT$p"
    hd=$(curl -s -o /dev/null -D - "http://localhost:$PORT$p" | tr -d '\r')
    xf=$(echo "$hd" | grep -i '^x-frame-options:' | head -1); csp=$(echo "$hd" | grep -ic '^content-security-policy'); cc=$(echo "$hd" | grep -i '^cache-control:' | head -1)
    case "$xf" in *DENY*) [ "$csp" -ge 1 ] && note "  ok page $p — $xf · CSP · $cc" || { bad=$((bad+1)); note "  ⛔ PAGE $p — $xf but no CSP"; };; *) bad=$((bad+1)); note "  ⛔ PAGE $p — no X-Frame-Options DENY (${xf:-none}) · $cc";; esac
    case "$cc" in *immutable*) bad=$((bad+1)); note "  ⛔ PAGE $p is immutable";; esac
  done
  for p in /icons/icon-192.png /brand/mark-color.svg /favicon.ico; do
    cc=$(curl -s -o /dev/null -D - "http://localhost:$PORT$p" | tr -d '\r' | grep -i '^cache-control:' | head -1)
    case "$cc" in *immutable*) note "  ok static $p — $cc";; *) bad=$((bad+1)); note "  ⛔ STATIC $p — ${cc:-no cache-control}";; esac
  done
  note "headers: $bad problem(s)"
else
  note "server never came up"
fi
left=$(powershell -NoProfile -ExecutionPolicy Bypass -File "$S/kp-procs.ps1" -Wt "$WT" -Port "$PORT" -Stop | tr -dc "0-9"); note "server stopped (left: ${left:-?})"
note "chain end"
echo "exit=0" > "$R/wh3-chain.done"
