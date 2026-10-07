#!/usr/bin/env bash
# WP12 lock turn C (asheib-c5), on F:/kipindi-a8j detached at the vodacom-wp12 tip: the tile drive qa:journey-shell
# (335 cells, tiles outside the repo, a 40-minute cell budget), the preview drive's tiles, and qa:footer-reachable four
# ways (classic, its prove-red, --journey, --journey --prove-red), each on a fresh server.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wc-chain.log"; WT="wc-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wc-chain.done"
. "$S/chain-lib.sh"
wait_done wb2-chain.done
. "$S/kp-lock.sh"
take_lock "wc-chain: WP12 tiles (335 cells) + preview + footer x4, ~75 min" || { echo "exit=5" > "$R/wc-chain.done"; exit 5; }
trap release EXIT
wp12_trees
git -C /f/kipindi-a8j diff --quiet || { note "STOP: kipindi-a8j has tracked changes"; echo "exit=2" > "$R/wc-chain.done"; exit 2; }
git -C /f/kipindi-a8j checkout -q --detach "$AFTER" || { note "STOP: could not detach"; echo "exit=2" > "$R/wc-chain.done"; exit 2; }
note "AFTER $AFTER in kipindi-a8j"
T="$S/wp12/tiles"; P="$S/wp12/preview-shots"
rm -rf "$T" "$P"; mkdir -p "$T" "$P"
run kipindi-a8j 3073 wc-tiles env KP_BUDGET_MIN=40 npm run qa:journey-shell -- "$T"
run kipindi-a8j 3073 wc-preview env KP_SHOTS="$P" npm run qa:journey-preview
run kipindi-a8j 3073 wc-footer npm run qa:footer-reachable
run kipindi-a8j 3073 wc-footer-red npm run qa:footer-reachable -- --prove-red
run kipindi-a8j 3073 wc-footer-j npm run qa:footer-reachable -- --journey
run kipindi-a8j 3073 wc-footer-j-red npm run qa:footer-reachable -- --journey --prove-red
note "chain end"
echo "exit=0" > "$R/wc-chain.done"
