#!/usr/bin/env bash
# watch-deploy.sh <sha-prefix> : polls 50pick.tz and www until both serve dpl=<sha-prefix>, max 35 min
P="$1"; t0=$(date +%s)
while :; do
  a=$(curl -s -m 20 https://50pick.tz/ | grep -o "dpl=[a-zA-Z0-9]*" | head -1)
  b=$(curl -s -m 20 https://www.50pick.tz/ | grep -o "dpl=[a-zA-Z0-9]*" | head -1)
  el=$(( $(date +%s) - t0 ))
  case "$a$b" in *"dpl=$P"*"dpl=$P"*) echo "$(date -u +%T) BOTH LIVE after ${el}s: $a | $b"; break;; esac
  if [ $el -ge 2100 ]; then echo "$(date -u +%T) TIMEOUT after ${el}s: $a | $b"; exit 3; fi
  sleep 20
done
curl -s -m 20 https://www.50pick.tz/api/health | head -c 260; echo
curl -s -m 20 https://50pick.tz/api/health | head -c 120; echo
