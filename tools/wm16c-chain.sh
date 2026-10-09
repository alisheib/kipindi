#!/usr/bin/env bash
# Lock turn M16c (asheib-c5): the journey's edge scenarios on the visual pass's final tip (M16a's tree) into
# edges/tiles-r6 with the drive as R4-G and R4-J left it (the pointer parked before every tile, every failed subresource
# logged, the offline scenario's cache / notice / document probes and its classic cells, the Needle's resting() wait and
# the per-tile not-found / overlay record), then R4-J's verdict over the log (V1 header and rail in the first paint, V2 no
# dimmed or blank tap frame, V3 content lands on its ghost, V4 the disc clear of text, V5 the not-found pages).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm16c-chain.log"; WT="wm16c-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm16c-chain.done"
. "$S/chain-lib.sh"
wait_done wm16b-chain.done
. "$S/kp-lock.sh"
take_lock "wm16c-chain: the visual pass's final tip - the journey's edge scenarios, ~550 tiles, then R4-J's verdict, ~115 min (watchdog at 165)" || { echo "exit=5" > "$R/wm16c-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm16a-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] || { note "STOP: $TREE is not at M16a's $VIS"; echo "exit=2" > "$R/wm16c-chain.done"; exit 2; }
note "$TREE at $VIS (M16a's tree)"
node --check "$S/edges/qa-journey-edges.mjs" || { note "STOP: the edges drive does not parse"; echo "exit=2" > "$R/wm16c-chain.done"; exit 2; }
rm -rf "$S/edges/tiles-r6"; mkdir -p "$S/edges/tiles-r6"
run $TREE 3074 wm16c-edges node "$S/edges/qa-journey-edges.mjs" "$S/edges/tiles-r6"
( cd /f/$TREE && node "$S/r4j/r4j-verdict.mjs" "$S/edges/tiles-r6" ) > "$R/wm16c-verdict.log" 2>&1
note "r4j-verdict exit=$? — $(grep -v '^\s*$' "$R/wm16c-verdict.log" | tail -2 | tr '\n' ' ' | cut -c1-300)"
note "chain end"
echo "exit=0" > "$R/wm16c-chain.done"
