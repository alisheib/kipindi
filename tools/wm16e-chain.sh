#!/usr/bin/env bash
# Lock turn M15x (asheib-c5): qa:bar-geometry's four tip-only "did not stick" cells (/results sw/en/zh 1280,
# /notifications zh 1280) — the stick-probe records the bar, its parent and the page after the drive's scroll, on M15's tree (88ee1a42, the filter bars as the tip has them)
# and on main, so a bar pushed off by its parent's end on a thin in-memory page is told from a real one.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm16e-chain.log"; WT="wm16e-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm16e-chain.done"
. "$S/chain-lib.sh"
wait_done wbm-chain.done
. "$S/kp-lock.sh"
take_lock "wm16e-chain: why four filter bars did not stick (tip vs main), ~12 min" || { echo "exit=5" > "$R/wm16e-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(git -C /f/$TREE rev-parse --short HEAD)
[ "$VIS" = "$(cat "$R/wm14-vis.sha")" ] || { note "STOP: $TREE is not at M14/M15's tree"; echo "exit=2" > "$R/wm16e-chain.done"; exit 2; }
BASE=$(git -C /f/$TREE merge-base HEAD origin/main)
run $TREE 3074 wm16e-stick-tip env LIVE_BASE=http://localhost:3074 node "$S/stick-probe.mjs" "tip $VIS"
git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach "$BASE" || { note "STOP: could not detach kipindi-a8i2 at $BASE"; echo "exit=2" > "$R/wm16e-chain.done"; exit 2; }
run kipindi-a8i2 3071 wm16e-stick-main env LIVE_BASE=http://localhost:3071 node "$S/stick-probe.mjs" "main $(git -C /f/kipindi-a8i2 rev-parse --short HEAD)"
note "chain end"
echo "exit=0" > "$R/wm16e-chain.done"
