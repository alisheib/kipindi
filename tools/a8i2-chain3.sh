#!/usr/bin/env bash
# A8i-2: Firefox and WebKit again with the primer kept shut (after chain2 and the database suites finish).
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"
until [ -f "$R/a8i2-chain2.done" ] && [ -f "$R/battery-db.log.done" ]; do sleep 15; done
for eng in firefox webkit; do
  rm -f "$R/v3-$eng.log"*
  bash "$S/kp-with-server.sh" kipindi-a8i2 3071 "$R/v3-$eng.log" env ENGINE=$eng node scripts/qa-enter-where-pressed.mjs
done
echo "chain3 done" > "$R/a8i2-chain3.done"
