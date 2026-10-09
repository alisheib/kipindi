#!/usr/bin/env bash
# Lock turn M7 (asheib-c5), after M6 and once R3-C is merged (vis-ready2.done): vodacom-visual's tip (M6's tree plus
# R3-C) — typecheck, then every browser check round 3 needs, each on a fresh in-memory server (port 3074), then the
# 335 journey tiles into visual/tiles-r4.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm7-chain.log"; WT="wm7-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm7-chain.done"
. "$S/chain-lib.sh"
wait_done wm6-chain.done
wait_done vis-ready2.done
. "$S/kp-lock.sh"
take_lock "wm7-chain: the visual pass after round 3 - typecheck, header fit + red, seals x2, needle-rest, bar geometry + red, preview, qa:live, the 335 tiles, ~100 min" || { echo "exit=5" > "$R/wm7-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
git -C /f/kipindi-vis diff --quiet && git -C /f/kipindi-vis diff --cached --quiet || { note "STOP: kipindi-vis has uncommitted changes"; echo "exit=2" > "$R/wm7-chain.done"; exit 2; }
VIS=$(git -C /f/kipindi-vis rev-parse --short HEAD)
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wm7-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$VIS" || { note "STOP: could not detach $TREE at $VIS"; echo "exit=2" > "$R/wm7-chain.done"; exit 2; }
note "$TREE at $VIS (M6's $(cat "$R/wm6-vis.sha") plus R3-C)"
echo "$VIS" > "$R/wm7-vis.sha"
( cd /f/$TREE && timeout 1800 npx tsc --noEmit -p . ) > "$R/wm7-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wm7-typecheck.log") error(s)"
rm -rf "$S/visual/preview-m7" "$S/visual/tiles-r4"; mkdir -p "$S/visual/preview-m7" "$S/visual/tiles-r4"
run $TREE 3074 wm7-jhf npm run qa:journey-header-fit
run $TREE 3074 wm7-red-jhf npm run red:journey-header-fit -- --alone
run $TREE 3074 wm7-seal-j env LIVE_BASE=http://localhost:3074 npm run qa:landmark-seal -- --journey
run $TREE 3074 wm7-seal env LIVE_BASE=http://localhost:3074 npm run qa:landmark-seal
run $TREE 3074 wm7-needle npm run test:needle-rest
run $TREE 3074 wm7-bar npm run qa:bar-geometry
run $TREE 3074 wm7-red-bar npm run red:bar-geometry
run $TREE 3074 wm7-preview env KP_SHOTS="$S/visual/preview-m7" npm run qa:journey-preview
run $TREE 3074 wm7-live npm run qa:live
grep -q "^exit=0" "$R/wm7-live.log.done" || run $TREE 3074 wm7-live2 npm run qa:live
run $TREE 3074 wm7-tiles env KP_BUDGET_MIN=40 npm run qa:journey-shell -- "$S/visual/tiles-r4"
note "chain end"
echo "exit=0" > "$R/wm7-chain.done"
