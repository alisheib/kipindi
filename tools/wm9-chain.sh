#!/usr/bin/env bash
# Lock turn M9 (asheib-c5), after M8, on the tree M8 proved: the journey's edge scenarios — a break, self-exclusion, a
# 40-character name, the longest title, slow 3G, not-found, odd viewports, 130% text, offline, TZS 0 — 532 tiles into
# edges/tiles (edges/qa-journey-edges.mjs, its watchdog at warm-up + budget + 5 min). Exit 3 is expected on a clean
# run: the excluded person's 9 Wallet-sheet cells are BLOCKED by design.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm9-chain.log"; WT="wm9-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm9-chain.done"
. "$S/chain-lib.sh"
wait_done wm8-chain.done
. "$S/kp-lock.sh"
take_lock "wm9-chain: the visual pass - the journey's edge scenarios, 532 tiles, ~100 min (watchdog at 165)" || { echo "exit=5" > "$R/wm9-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm8-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] && git -C /f/$TREE diff --quiet || { note "STOP: $TREE is not clean at M8's $VIS"; echo "exit=2" > "$R/wm9-chain.done"; exit 2; }
note "$TREE at $VIS (the tree M8 proved)"
rm -rf "$S/edges/tiles"; mkdir -p "$S/edges/tiles"
run $TREE 3074 wm9-edges node "$S/edges/qa-journey-edges.mjs" "$S/edges/tiles"
note "chain end"
echo "exit=0" > "$R/wm9-chain.done"
