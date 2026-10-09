#!/usr/bin/env bash
# Lock turn M15 (asheib-c5): the visual pass's final tip in a browser, each run on a fresh in-memory server.
#  · Classic parity (S6-PLAN A18): the tip was REBASED onto main, whose history since the d9b7a5b6 baseline holds merges
#    that carried served files in (the contacts lane), so that baseline is refused. A NEW baseline is captured at the
#    tip's base on main (F:/kipindi-a8i2 detached there, the tip's harness run against it with KP_TREE naming it), a
#    null --compare on that same base must exit 0 (the calibration), then the --compare at the tip, and --prove-red at
#    the tip. ⚠ F:/kipindi-a8i2 is moved to the base: no docs commits from it while this turn runs.
#  · The journey's checks: header fit + red, the landmark seals (journey and classic), needle-rest twice, bar geometry +
#    red (the address passed), the preview drive, local qa:live, then round 5's 335 tiles into visual/tiles-r5.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm15-chain.log"; WT="wm15-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm15-chain.done"
. "$S/chain-lib.sh"
wait_done wm14-chain.done
. "$S/kp-lock.sh"
take_lock "wm15-chain: the visual pass's final tip in a browser - classic parity (new baseline at main), header fit, seals, needle-rest, bar geometry, preview, qa:live, round 5's tiles, ~130 min" || { echo "exit=5" > "$R/wm15-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm14-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] || { note "STOP: $TREE is not at M14's $VIS"; echo "exit=2" > "$R/wm15-chain.done"; exit 2; }
BASE=$(git -C /f/$TREE merge-base HEAD origin/main); B8=$(echo "$BASE" | cut -c1-8)
note "$TREE at $VIS (M14's tree) · its base on main $B8"
H="F:/kipindi-a8i2-ctl/scripts/qa-classic-shell-parity.mjs"
PB="$S/visual/parity-main-$B8.json"
git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach "$BASE" || { note "STOP: could not detach kipindi-a8i2 at $B8"; echo "exit=2" > "$R/wm15-chain.done"; exit 2; }
( cd /f/kipindi-a8i2 && npx prisma generate ) > "$R/wm15-prisma-main.log" 2>&1; note "kipindi-a8i2 at $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (the base) · prisma generate exit=$?"
if [ -f "$PB" ]; then note "the baseline $PB exists already (A3: never overwritten) — comparing against it"; else
  run kipindi-a8i2 3071 wm15-par-base env KP_TREE=F:/kipindi-a8i2 node "$H" --baseline "$PB"
fi
run kipindi-a8i2 3071 wm15-par-null env KP_TREE=F:/kipindi-a8i2 node "$H" --compare "$PB"
grep -q "^exit=0" "$R/wm15-par-null.log.done" || note "⚠ the null compare on the base did not exit 0 — the tip's compare below cannot be trusted until it does"
run $TREE 3074 wm15-par-cmp npm run qa:classic-shell-parity -- --compare "$PB"
run $TREE 3074 wm15-par-red npm run qa:classic-shell-parity -- --prove-red

rm -rf "$S/visual/preview-m15" "$S/visual/tiles-r5"; mkdir -p "$S/visual/preview-m15" "$S/visual/tiles-r5"
run $TREE 3074 wm15-jhf npm run qa:journey-header-fit
run $TREE 3074 wm15-red-jhf npm run red:journey-header-fit -- --alone
run $TREE 3074 wm15-seal-j env LIVE_BASE=http://localhost:3074 npm run qa:landmark-seal -- --journey
run $TREE 3074 wm15-seal env LIVE_BASE=http://localhost:3074 npm run qa:landmark-seal
run $TREE 3074 wm15-needle npm run test:needle-rest
run $TREE 3074 wm15-needle2 npm run test:needle-rest
run $TREE 3074 wm15-bar npm run qa:bar-geometry -- http://localhost:3074
run $TREE 3074 wm15-red-bar npm run red:bar-geometry -- http://localhost:3074
run $TREE 3074 wm15-preview env KP_SHOTS="$S/visual/preview-m15" npm run qa:journey-preview
run $TREE 3074 wm15-live npm run qa:live
grep -q "^exit=0" "$R/wm15-live.log.done" || run $TREE 3074 wm15-live2 npm run qa:live
run $TREE 3074 wm15-tiles env KP_BUDGET_MIN=40 npm run qa:journey-shell -- "$S/visual/tiles-r5"
note "chain end"
echo "exit=0" > "$R/wm15-chain.done"
