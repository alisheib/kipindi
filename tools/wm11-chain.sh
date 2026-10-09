#!/usr/bin/env bash
# Lock turn M11 (asheib-c5), after M10, on the tree M8 proved: qa:bar-geometry and red:bar-geometry, given the server's
# address as an ARGUMENT. In M7 the drive refused ("could not sign in at /auth/demo") because both scripts read their
# base from argv (default http://localhost:3031) and ignore the KP_BASE kp-with-server sets — they knocked on an empty
# port. This is the live proof of a94e6229 (the filter row's kp-qbar-row) and round 3's filter-row fixes.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm11-chain.log"; WT="wm11-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm11-chain.done"
. "$S/chain-lib.sh"
wait_done wm10-chain.done
. "$S/kp-lock.sh"
take_lock "wm11-chain: the visual pass - qa:bar-geometry and its red with the address passed, ~30 min" || { echo "exit=5" > "$R/wm11-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm8-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] && git -C /f/$TREE diff --quiet || { note "STOP: $TREE is not clean at M8's $VIS"; echo "exit=2" > "$R/wm11-chain.done"; exit 2; }
run $TREE 3074 wm11-bar npm run qa:bar-geometry -- http://localhost:3074
run $TREE 3074 wm11-red-bar npm run red:bar-geometry -- http://localhost:3074
note "chain end"
echo "exit=0" > "$R/wm11-chain.done"
