#!/usr/bin/env bash
# Lock turn M12 (asheib-c5), after M11, on the tree M8 proved: local qa:live. M7's run (on fd7a1fe6) failed only its 16
# "no words run together after an inline tag" checks — DotSeq's hidden dot against the next word on the 8 legal pages
# in en and sw — fixed by b5492614 (real spaces around the dot); every other check passed (318).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm12-chain.log"; WT="wm12-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm12-chain.done"
. "$S/chain-lib.sh"
wait_done wm11-chain.done
. "$S/kp-lock.sh"
take_lock "wm12-chain: the visual pass - local qa:live on the tip (the DotSeq fix), ~8 min" || { echo "exit=5" > "$R/wm12-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm8-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] && git -C /f/$TREE diff --quiet || { note "STOP: $TREE is not clean at M8's $VIS"; echo "exit=2" > "$R/wm12-chain.done"; exit 2; }
git -C /f/$TREE merge-base --is-ancestor b5492614 HEAD || note "⚠ $VIS does not hold b5492614 — qa:live will read the old dot"
run $TREE 3074 wm12-live npm run qa:live
note "chain end"
echo "exit=0" > "$R/wm12-chain.done"
