#!/usr/bin/env bash
# Lock turn M16 (asheib-c5): the journey's edge scenarios again on the visual pass's final tip (M14's tree), 532 tiles
# into edges/tiles-r5, read against M9's.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm16-chain.log"; WT="wm16-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm16-chain.done"
. "$S/chain-lib.sh"
wait_done wm15-chain.done
. "$S/kp-lock.sh"
take_lock "wm16-chain: the visual pass's final tip - the journey's edge scenarios, 532 tiles, ~100 min (watchdog at 165)" || { echo "exit=5" > "$R/wm16-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm14-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] || { note "STOP: $TREE is not at M14's $VIS"; echo "exit=2" > "$R/wm16-chain.done"; exit 2; }
note "$TREE at $VIS (M14's tree)"
rm -rf "$S/edges/tiles-r5"; mkdir -p "$S/edges/tiles-r5"
run $TREE 3074 wm16-edges node "$S/edges/qa-journey-edges.mjs" "$S/edges/tiles-r5"
note "chain end"
echo "exit=0" > "$R/wm16-chain.done"
