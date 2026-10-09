#!/usr/bin/env bash
# Lock turn M16d (asheib-c5): what the visual pass costs a page's first document. R4-J's route ghosts ride in every
# journey document (the root loading's fallback); the same docsize probe runs on the final tip (M16a's tree) and on main
# (the tip's base), each on a fresh in-memory dev server, journey (preview pass) and classic, sw and en.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm16d-chain.log"; WT="wm16d-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm16d-chain.done"
. "$S/chain-lib.sh"
wait_done wm16c-chain.done
. "$S/kp-lock.sh"
take_lock "wm16d-chain: the visual pass's document weight, tip vs main, ~15 min" || { echo "exit=5" > "$R/wm16d-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(cat "$R/wm16a-vis.sha")
[ "$(git -C /f/$TREE rev-parse --short HEAD)" = "$VIS" ] || { note "STOP: $TREE is not at M16a's $VIS"; echo "exit=2" > "$R/wm16d-chain.done"; exit 2; }
BASE=$(git -C /f/$TREE merge-base HEAD origin/main)
run $TREE 3074 wm16d-size-tip env LIVE_BASE=http://localhost:3074 node "$S/docsize.mjs" "tip $VIS" "$R/wm16d-size-tip.json"
git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach "$BASE" || { note "STOP: could not detach kipindi-a8i2 at $BASE"; echo "exit=2" > "$R/wm16d-chain.done"; exit 2; }
( cd /f/kipindi-a8i2 && npx prisma generate ) > "$R/wm16d-prisma-main.log" 2>&1; note "kipindi-a8i2 at $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) · prisma generate exit=$?"
run kipindi-a8i2 3071 wm16d-size-main env LIVE_BASE=http://localhost:3071 node "$S/docsize.mjs" "main $(git -C /f/kipindi-a8i2 rev-parse --short HEAD)" "$R/wm16d-size-main.json"
note "chain end"
echo "exit=0" > "$R/wm16d-chain.done"
