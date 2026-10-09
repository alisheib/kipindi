#!/usr/bin/env bash
# A8j's real-browser proof: the drive on the A8j tree in all three engines (fresh server each: C3 closes the demo
# account), then its Chromium control on the tree before A8j (F:\kipindi-a8i2 = main 586c5183, A8i-2 included).
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"
for eng in chromium firefox webkit; do
  rm -f "$R/j-$eng.log"*
  bash "$S/kp-with-server.sh" kipindi-a8j 3073 "$R/j-$eng.log" env ENGINE=$eng node scripts/qa-implicit-submit.mjs
done
rm -f "$R/j-ctl-chromium.log"*
bash "$S/kp-with-server.sh" kipindi-a8i2 3071 "$R/j-ctl-chromium.log" env ENGINE=chromium node F:/kipindi-a8j/scripts/qa-implicit-submit.mjs
echo done > "$R/a8j-chain.done"
# appended 2026-10-07 ~10:01 UTC: the drive's Cancel selector fixed (the scrim's aria-label) — Chromium and Firefox again,
# then A8j's battery (non-database suites; scratch Postgres on 5471 for any that need it).
for eng in chromium firefox; do
  rm -f "$R/j2-$eng.log"*
  bash "$S/kp-with-server.sh" kipindi-a8j 3073 "$R/j2-$eng.log" env ENGINE=$eng node scripts/qa-implicit-submit.mjs
done
cd /f/kipindi-a8j && env KP_SCRATCH_PORT=5471 node scripts/test-all.mjs --skip responsive,motion > "$R/j-battery.log" 2>&1; echo "exit=$?" > "$R/j-battery.log.done"
echo done > "$R/a8j-chain2.done"
# appended ~10:03 UTC: WebKit was refused (the Firefox server's last process was still exiting); run it now.
rm -f "$R/j2-webkit.log"*
bash "$S/kp-with-server.sh" kipindi-a8j 3073 "$R/j2-webkit.log" env ENGINE=webkit node scripts/qa-implicit-submit.mjs
echo done > "$R/a8j-chain3.done"
