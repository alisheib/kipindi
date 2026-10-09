#!/usr/bin/env bash
# Lock turn M4 (asheib-c5), after M3: local qa:live again on the tree M1 proved. M1's run stopped on a 30 s page.goto
# timeout at the sw pass's /legal/agent-terms — the server never logged that request; the en pass had served the page
# (200 in 1976 ms), and earlier runs on main served the sw page twice each. One fresh server; a second run only if the
# first fails, so a flake and a defect read differently.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm4-chain.log"; WT="wm4-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm4-chain.done"
. "$S/chain-lib.sh"
wait_done wm3-chain.done
. "$S/kp-lock.sh"
take_lock "wm4-chain: the visual pass - local qa:live again (M1's stopped on one timeout), ~8 min" || { echo "exit=5" > "$R/wm4-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm1-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] && git -C /f/$TREE diff --quiet || { note "STOP: $TREE is not clean at M1's $VIS"; echo "exit=2" > "$R/wm4-chain.done"; exit 2; }
run $TREE 3074 wm4-live npm run qa:live
grep -q "^exit=0" "$R/wm4-live.log.done" || run $TREE 3074 wm4-live2 npm run qa:live
note "chain end"
echo "exit=0" > "$R/wm4-chain.done"
