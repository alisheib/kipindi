#!/usr/bin/env bash
# Lock turn F (asheib-c5): S7 WP0's heavy half, after the WP12 turns.
#   1 · F:/kipindi-s7 (vodacom-s7, no server): red:ticker-honesty ALONE (file-mutating; the new exact-id verdict and its
#       control; 28/28 expected), then `git diff --exit-code`; red:simple-journey-flag (in-process; every plant PROVED).
#   2 · F:/kipindi-a8i2 detached at the vodacom-s7 tip, a fresh in-memory server: the bar probe (s7/bar-probe.mjs).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wf-chain.log"; WT="wf-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wf-chain.done"
. "$S/chain-lib.sh"
wait_done we-chain.done
. "$S/kp-lock.sh"
take_lock "wf-chain: S7 WP0 reds + the bar probe, and the A8i-2 drive under reduced motion, ~35 min" || { echo "exit=5" > "$R/wf-chain.done"; exit 5; }
trap release EXIT
S7TIP=$(git -C /f/kipindi-s7 rev-parse --short vodacom-s7)
git -C /f/kipindi-s7 diff --quiet && [ -z "$(git -C /f/kipindi-s7 status --porcelain -- src scripts)" ] || { note "STOP: kipindi-s7 is not clean"; echo "exit=2" > "$R/wf-chain.done"; exit 2; }
note "S7 tip $S7TIP"
( cd /f/kipindi-s7 && node scripts/ticker-honesty-red.mjs ) > "$R/wf-ticker-red.log" 2>&1
note "red:ticker-honesty exit=$? — $(grep -E 'control:|real defects caught|RED PROOF|PROBLEMS|REFUSING' "$R/wf-ticker-red.log" | tr '\n' ' ' | cut -c1-400)"
git -C /f/kipindi-s7 diff --exit-code > /dev/null && note "kipindi-s7 tree unchanged after the ticker red" || { note "⛔ kipindi-s7 CHANGED after the ticker red:"; git -C /f/kipindi-s7 status --short >> "$LOG"; }
( cd /f/kipindi-s7 && npm run -s red:simple-journey-flag ) > "$R/wf-sjf-red.log" 2>&1
note "red:simple-journey-flag exit=$? — $(grep -E 'INCONCLUSIVE|BLIND|caught$' "$R/wf-sjf-red.log" | tail -4 | tr '\n' ' ' | cut -c1-400)"
git -C /f/kipindi-a8i2 diff --quiet || { note "STOP: kipindi-a8i2 has tracked changes"; echo "exit=2" > "$R/wf-chain.done"; exit 2; }
git -C /f/kipindi-a8i2 checkout -q --detach "$S7TIP" && note "kipindi-a8i2 at $S7TIP for the probe"
run kipindi-a8i2 3071 wf-probe node "$S/s7/bar-probe.mjs" "$R/wf-probe.json"
# 3 · A8i-2's owed "reduced motion": its drive (as on the WP12 branch, which carries the switch) with the OS asking for
#     no motion, Chromium, on F:/kipindi-a8j detached at the vodacom-wp12 tip.
wp12_trees
git -C /f/kipindi-a8j diff --quiet && git -C /f/kipindi-a8j checkout -q --detach "$AFTER" && note "kipindi-a8j at $AFTER for the reduced-motion drive"
run kipindi-a8j 3073 wf-ewp-reduced env REDUCED_MOTION=1 node scripts/qa-enter-where-pressed.mjs
note "chain end"
echo "exit=0" > "$R/wf-chain.done"
