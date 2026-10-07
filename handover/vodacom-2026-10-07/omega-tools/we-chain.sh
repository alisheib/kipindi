#!/usr/bin/env bash
# Lock turn E (asheib-c5), on F:/kipindi-a8j detached at the vodacom-wp12 tip: qa:implicit-submit in WebKit once more,
# with the drive as last edited (P1x reports the engine's rule), on a fresh server.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/we-chain.log"; WT="we-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/we-chain.done"
. "$S/chain-lib.sh"
wait_done wd-chain.done
. "$S/kp-lock.sh"
take_lock "we-chain: A8j drive in WebKit once more (P1x reworded), ~6 min" || { echo "exit=5" > "$R/we-chain.done"; exit 5; }
trap release EXIT
wp12_trees
git -C /f/kipindi-a8j diff --quiet || { note "STOP: kipindi-a8j has tracked changes"; echo "exit=2" > "$R/we-chain.done"; exit 2; }
git -C /f/kipindi-a8j checkout -q --detach "$AFTER" || { note "STOP: could not detach"; echo "exit=2" > "$R/we-chain.done"; exit 2; }
note "AFTER $AFTER in kipindi-a8j"
run kipindi-a8j 3073 we-webkit env ENGINE=webkit node scripts/qa-implicit-submit.mjs
note "chain end"
echo "exit=0" > "$R/we-chain.done"
