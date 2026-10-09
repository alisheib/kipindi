#!/usr/bin/env bash
# Lock turn M10 (asheib-c5), after M9, on the tree M8/M9 proved: qa:landmark-seal --journey again. M7's run lost its
# dev server at ~00:19Z (the server's log ends in a normal exit with no error; something outside stopped it) and then
# read connection-refused on all 25 zh cells; the classic seal right after it, on a fresh server, measured 276 cells
# with 0 problems.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm10-chain.log"; WT="wm10-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm10-chain.done"
. "$S/chain-lib.sh"
wait_done wm9-chain.done
. "$S/kp-lock.sh"
take_lock "wm10-chain: the visual pass - the journey landmark seal again (M7's lost its server), ~12 min" || { echo "exit=5" > "$R/wm10-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm8-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] && git -C /f/$TREE diff --quiet || { note "STOP: $TREE is not clean at M8's $VIS"; echo "exit=2" > "$R/wm10-chain.done"; exit 2; }
run $TREE 3074 wm10-seal-j env LIVE_BASE=http://localhost:3074 npm run qa:landmark-seal -- --journey
note "chain end"
echo "exit=0" > "$R/wm10-chain.done"
