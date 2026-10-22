#!/usr/bin/env bash
# watch-deploy.sh <short-sha> — READ-ONLY: poll Railway's deployments every 30 s until the deployment of <short-sha> ends
# (SUCCESS, FAILED, CRASHED, REMOVED) or 40 minutes pass; prints each status change.
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
SHA=$1
last=""
for i in $(seq 1 80); do
  line=$(node "$S/railway-read.mjs" 2>&1 | grep " ${SHA:0:9} " | head -1)
  st=$(echo "$line" | awk '{print $2}')
  if [ "$st" != "$last" ]; then echo "$(date -u +%T)Z $line"; last=$st; fi
  case "$st" in SUCCESS|FAILED|CRASHED|REMOVED) exit 0 ;; esac
  sleep 30
done
echo "gave up after 40 min (last: $last)"
exit 1
