#!/usr/bin/env bash
# railway-deploy-watch.sh — Railway paused builds platform-wide (incident 2026-10-21, "builds paused"); pushes made during a
# pause are dropped. Every 10 minutes: ask Railway to deploy origin/main's head; stop at the first answer that is not
# "paused" (accepted, or any other error, which a human must read). Max 8 hours.
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
for i in $(seq 1 48); do
  git -C F:/kipindi-main fetch -q origin 2>/dev/null
  SHA=$(git -C F:/kipindi-main rev-parse origin/main)
  out=$(node "$S/railway-deploy-main.mjs" "$SHA" 2>&1)
  echo "$(date -u +%T) try $i main=${SHA:0:9} :: $out"
  case "$out" in *"paused"*) sleep 600 ;; *) echo "STOP: $out"; exit 0 ;; esac
done
echo "gave up after 8 hours"
exit 1
