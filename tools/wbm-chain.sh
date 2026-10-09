#!/usr/bin/env bash
# Lock turn BM (asheib-c5): qa:bar-geometry's CONTROL on main. M11 read the visual pass's tree (90cb52ea) red on /markets
# (the drive's own reference: "if /markets fails, the instrument is the defect"), on no [data-filter-rail] across seven
# routes, and on the sticky checks at 1280. No green run of this drive exists tonight on either tree, so the same drive
# runs on main (the tip's base) to tell the pass's regressions from the instrument's or main's own.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wbm-chain.log"; WT="wbm-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wbm-chain.done"
. "$S/chain-lib.sh"
wait_done wm13-chain.done
. "$S/kp-lock.sh"
take_lock "wbm-chain: qa:bar-geometry on main as the control for M11, ~25 min" || { echo "exit=5" > "$R/wbm-chain.done"; exit 5; }
trap release EXIT
BASE=$(git -C /f/kipindi-vis merge-base "$(cat "$R/vis-ready5.sha")" origin/main)
git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach "$BASE" || { note "STOP: could not detach kipindi-a8i2 at $BASE"; echo "exit=2" > "$R/wbm-chain.done"; exit 2; }
( cd /f/kipindi-a8i2 && npx prisma generate ) > "$R/wbm-prisma.log" 2>&1; note "kipindi-a8i2 at $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (main, the base) · prisma generate exit=$?"
run kipindi-a8i2 3071 wbm-bar npm run qa:bar-geometry -- http://localhost:3071
note "chain end"
echo "exit=0" > "$R/wbm-chain.done"
