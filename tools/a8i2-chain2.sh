#!/usr/bin/env bash
# A8i-2, after the battery: the drive (balance read over HTTP, no second page) on the new tree in all three engines, and
# Firefox on live main's code as the control for anything engine-specific. Each run its own lock job and fresh server.
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"
until [ -f "$R/battery.log.done" ]; do sleep 15; done
for eng in chromium firefox webkit; do
  rm -f "$R/v2-$eng.log"*
  bash "$S/kp-with-server.sh" kipindi-a8i2 3071 "$R/v2-$eng.log" env ENGINE=$eng node scripts/qa-enter-where-pressed.mjs
done
rm -f "$R/v2-ctl-firefox.log"*
bash "$S/kp-with-server.sh" kipindi-a8i2-ctl 3072 "$R/v2-ctl-firefox.log" env ENGINE=firefox node F:/kipindi-a8i2/scripts/qa-enter-where-pressed.mjs
echo "chain2 done" > "$R/a8i2-chain2.done"
