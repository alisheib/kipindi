#!/usr/bin/env bash
# WP12 lock turn B2 (asheib-c5), on F:/kipindi-a8j detached at the vodacom-wp12 tip: qa:journey-header-fit (66 cells),
# red:header-fit (classic) and red:journey-header-fit --alone, each on a fresh server, the tree read before and after.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wb2-chain.log"; WT="wb2-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wb2-chain.done"
. "$S/chain-lib.sh"
wait_done wb-chain.done
. "$S/kp-lock.sh"
take_lock "wb2-chain: WP12 journey header fit + red:header-fit + red:journey-header-fit, ~30 min" || { echo "exit=5" > "$R/wb2-chain.done"; exit 5; }
trap release EXIT
wp12_trees
git -C /f/kipindi-a8j diff --quiet || { note "STOP: kipindi-a8j has tracked changes"; echo "exit=2" > "$R/wb2-chain.done"; exit 2; }
git -C /f/kipindi-a8j checkout -q --detach "$AFTER" || { note "STOP: could not detach"; echo "exit=2" > "$R/wb2-chain.done"; exit 2; }
note "AFTER $AFTER in kipindi-a8j"
run kipindi-a8j 3073 wb2-jhf npm run qa:journey-header-fit
run kipindi-a8j 3073 wb2-red-hf npm run red:header-fit
run kipindi-a8j 3073 wb2-red-jhf npm run red:journey-header-fit -- --alone
note "chain end"
echo "exit=0" > "$R/wb2-chain.done"
