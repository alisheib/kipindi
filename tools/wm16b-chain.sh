#!/usr/bin/env bash
# Lock turn M16b (asheib-c5): the visual pass's final tip (M16a's tree) in a browser, each run on a fresh in-memory server.
#  · Classic parity against a baseline at the tip's base on main: re-used when it exists, otherwise captured there (A18)
#    and calibrated with a null compare first; then the tip's compare and --prove-red.
#  · The journey: header fit + red, both landmark seals, needle-rest twice, R4-K's E45 font probe, the preview drive,
#    local qa:live, round 6's tiles.
#  · qa:bar-geometry as R5-F repaired it: fixture:player, the drive and its red twin on ONE server (the fixture lives in
#    that server's memory), on the tip and — as the control — on main with only R5-F's four scripts applied.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm16b-chain.log"; WT="wm16b-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm16b-chain.done"
. "$S/chain-lib.sh"
wait_done wm16a-chain.done
. "$S/kp-lock.sh"
take_lock "wm16b-chain: the visual pass's final tip in a browser - parity, header fit, seals, needle-rest, bar geometry (+ main control), font probe, preview, qa:live, round 6's tiles, ~170 min" || { echo "exit=5" > "$R/wm16b-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm16a-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] || { note "STOP: $TREE is not at M16a's $VIS"; echo "exit=2" > "$R/wm16b-chain.done"; exit 2; }
BASE=$(git -C /f/$TREE merge-base HEAD origin/main); B8=$(echo "$BASE" | cut -c1-8)
note "$TREE at $VIS (M16a's tree) · its base on main $B8"
H="F:/kipindi-a8i2-ctl/scripts/qa-classic-shell-parity.mjs"
PB="$S/visual/parity-main-$B8.json"
git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach "$BASE" || { note "STOP: could not detach kipindi-a8i2 at $B8"; echo "exit=2" > "$R/wm16b-chain.done"; exit 2; }
( cd /f/kipindi-a8i2 && npx prisma generate ) > "$R/wm16b-prisma-main.log" 2>&1; note "kipindi-a8i2 at $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (the base) · prisma generate exit=$?"
if [ -f "$PB" ]; then
  note "the baseline at the base exists ($PB, A3: never overwritten) — comparing against it"
else
  run kipindi-a8i2 3071 wm16b-par-base env KP_TREE=F:/kipindi-a8i2 node "$H" --baseline "$PB"
  run kipindi-a8i2 3071 wm16b-par-null env KP_TREE=F:/kipindi-a8i2 node "$H" --compare "$PB"
  grep -q "^exit=0" "$R/wm16b-par-null.log.done" || note "⚠ the null compare on the base did not exit 0 — the tip's compare below cannot be trusted until it does"
fi
run $TREE 3074 wm16b-par-cmp npm run qa:classic-shell-parity -- --compare "$PB"
run $TREE 3074 wm16b-par-red npm run qa:classic-shell-parity -- --prove-red

# qa:bar-geometry (R5-F): the tip, then main with R5-F's four scripts as the control
BARCMD='npm run -s fixture:player -- "$BASE"; echo "fixture:player exit=$?"; npm run -s qa:bar-geometry -- "$BASE"; d=$?; echo "qa:bar-geometry exit=$d"; npm run -s red:bar-geometry -- "$BASE"; r=$?; echo "red:bar-geometry exit=$r"; [ $d -eq 0 ] && [ $r -eq 0 ]'
run $TREE 3074 wm16b-bar bash -c "$BARCMD"
if git -C /f/kipindi-a8i2 apply --check "$S/r5f/control-scripts.patch" 2>/dev/null; then
  git -C /f/kipindi-a8i2 apply "$S/r5f/control-scripts.patch"
  run kipindi-a8i2 3071 wm16b-bar-main bash -c "$BARCMD"
  git -C /f/kipindi-a8i2 checkout -q -- scripts/anchors/bar-geometry.anchors.mjs scripts/live/bar-geometry-drive.mjs scripts/red-bar-geometry.mjs
  rm -f /f/kipindi-a8i2/scripts/live/bar-geometry-rules.mjs
  note "kipindi-a8i2 restored: $(git -C /f/kipindi-a8i2 status --short | wc -l) change(s) left"
else
  note "⚠ R5-F's control patch does not apply on main $B8 — no main control for qa:bar-geometry this turn"
fi

rm -rf "$S/visual/preview-m16" "$S/visual/tiles-r6"; mkdir -p "$S/visual/preview-m16" "$S/visual/tiles-r6"
run $TREE 3074 wm16b-jhf npm run qa:journey-header-fit
run $TREE 3074 wm16b-red-jhf npm run red:journey-header-fit -- --alone
run $TREE 3074 wm16b-seal-j env LIVE_BASE=http://localhost:3074 npm run qa:landmark-seal -- --journey
run $TREE 3074 wm16b-seal env LIVE_BASE=http://localhost:3074 npm run qa:landmark-seal
run $TREE 3074 wm16b-needle npm run test:needle-rest
run $TREE 3074 wm16b-needle2 npm run test:needle-rest
run $TREE 3074 wm16b-e45 node "$S/r4k/e45-run.mjs" http://localhost:3074
run $TREE 3074 wm16b-preview env KP_SHOTS="$S/visual/preview-m16" npm run qa:journey-preview
run $TREE 3074 wm16b-live npm run qa:live
grep -q "^exit=0" "$R/wm16b-live.log.done" || run $TREE 3074 wm16b-live2 npm run qa:live
run $TREE 3074 wm16b-tiles env KP_BUDGET_MIN=40 npm run qa:journey-shell -- "$S/visual/tiles-r6"
note "chain end"
echo "exit=0" > "$R/wm16b-chain.done"
