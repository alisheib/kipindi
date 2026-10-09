#!/usr/bin/env bash
# Lock turn M13 (asheib-c5), after M12, on the tree M8 proved: test:needle-rest in a browser again. M7's run was 49/50
# (§1 "no teleport" 6.50 — the host fed the engine real frame intervals, and a leftover on a step boundary made frames
# alternate three steps and one); 90cb52ea makes the host's rest glide advance whole steps per frame.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm13-chain.log"; WT="wm13-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm13-chain.done"
. "$S/chain-lib.sh"
wait_done wm12-chain.done
. "$S/kp-lock.sh"
take_lock "wm13-chain: the visual pass - needle-rest in a browser on the glide fix, ~6 min" || { echo "exit=5" > "$R/wm13-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm8-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] && git -C /f/$TREE diff --quiet || { note "STOP: $TREE is not clean at M8's $VIS"; echo "exit=2" > "$R/wm13-chain.done"; exit 2; }
git -C /f/$TREE merge-base --is-ancestor 90cb52ea HEAD || note "⚠ $VIS does not hold 90cb52ea — needle-rest reads the old glide"
run $TREE 3074 wm13-needle npm run test:needle-rest
run $TREE 3074 wm13-needle2 npm run test:needle-rest
note "chain end"
echo "exit=0" > "$R/wm13-chain.done"
