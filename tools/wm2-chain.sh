#!/usr/bin/env bash
# Lock turn M2 (asheib-c5), after M1: the visual pass's tiles and what it changes for a classic viewer.
#   1 · the 335 journey tiles (qa:journey-shell, a 40-minute cell budget) on vodacom-visual, into visual/tiles-m.
#   2 · qa:classic-shell-parity v2: a baseline at main (kipindi-a8i2, port 3073), then --compare on vodacom-visual
#       (kipindi-a8i2-ctl, port 3074). Every difference must be one of the pass's named fixes to shared parts.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm2-chain.log"; WT="wm2-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm2-chain.done"
. "$S/chain-lib.sh"
wait_done wm1-chain.done
. "$S/kp-lock.sh"
take_lock "wm2-chain: the visual pass - the 335 journey tiles + the classic parity baseline at main and compare, ~95 min" || { echo "exit=5" > "$R/wm2-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm1-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] && git -C /f/$TREE diff --quiet || { note "STOP: $TREE is not clean at M1's $VIS"; echo "exit=2" > "$R/wm2-chain.done"; exit 2; }
note "$TREE at $VIS (the tree M1 proved)"

rm -rf "$S/visual/tiles-m"; mkdir -p "$S/visual/tiles-m"
run $TREE 3074 wm2-tiles env KP_BUDGET_MIN=40 npm run qa:journey-shell -- "$S/visual/tiles-m"

MAINT=kipindi-a8i2
git -C /f/$MAINT diff --quiet || { note "STOP: $MAINT has tracked changes"; echo "exit=2" > "$R/wm2-chain.done"; exit 2; }
git -C /f/$MAINT checkout -q --detach origin/main || { note "STOP: could not detach $MAINT at origin/main"; echo "exit=2" > "$R/wm2-chain.done"; exit 2; }
MAIN=$(git -C /f/$MAINT rev-parse --short HEAD)
( cd /f/$MAINT && npx prisma generate ) > "$R/wm2-prisma-main.log" 2>&1
note "$MAINT at main $MAIN · prisma generate exit=$?"
PB="$S/visual/parity-main-$MAIN.json"
rm -f "$PB" "$PB.rejected.json" "$PB.current.json"
run $MAINT 3073 wm2-par-base npm run qa:classic-shell-parity -- --baseline "$PB"
run $TREE 3074 wm2-par-cmp npm run qa:classic-shell-parity -- --compare "$PB"
note "chain end"
echo "exit=0" > "$R/wm2-chain.done"
