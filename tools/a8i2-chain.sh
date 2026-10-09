#!/usr/bin/env bash
# A8i-2's remaining proof on OMEGA-COMPILE01, each step its own lock job so the marketing lane interleaves:
#   1 · qa:enter-where-pressed under WebKit, 2 · under Firefox (fresh in-memory server each),
#   3 · test:all --skip responsive,motion (scratch Postgres on 5471).
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"
for eng in webkit firefox; do
  rm -f "$R/eng-$eng.log"*
  bash "$S/kp-with-server.sh" kipindi-a8i2 3071 "$R/eng-$eng.log" env ENGINE=$eng node scripts/qa-enter-where-pressed.mjs
done
rm -f "$R/battery.log"*
bash "$S/kp-locked.sh" kipindi-a8i2 "$R/battery.log" env KP_SCRATCH_PORT=5471 node scripts/test-all.mjs --skip responsive,motion
echo "chain done" > "$R/a8i2-chain.done"
