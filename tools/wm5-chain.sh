#!/usr/bin/env bash
# Lock turn M5 (asheib-c5), after M4: what the visual pass changes for a classic viewer. M2's --compare was refused
# (A18): its baseline was captured at main d9b7a5b6, a docs-only commit made after vodacom-visual was cut from e16f9353,
# so the base was not an ancestor. vodacom-visual is rebased onto d9b7a5b6 (src/ and scripts/ byte-identical to the
# pre-rebase tip plus 8c683440). Here: --compare of the rebased tip against M2's baseline, on a fresh server.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm5-chain.log"; WT="wm5-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm5-chain.done"
. "$S/chain-lib.sh"
wait_done wm4-chain.done
. "$S/kp-lock.sh"
take_lock "wm5-chain: the visual pass - the classic parity compare against main's baseline, ~25 min" || { echo "exit=5" > "$R/wm5-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
git -C /f/kipindi-vis diff --quiet && git -C /f/kipindi-vis diff --cached --quiet || { note "STOP: kipindi-vis has uncommitted changes"; echo "exit=2" > "$R/wm5-chain.done"; exit 2; }
VIS=$(git -C /f/kipindi-vis rev-parse --short HEAD)
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wm5-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$VIS" || { note "STOP: could not detach $TREE at $VIS"; echo "exit=2" > "$R/wm5-chain.done"; exit 2; }
note "$TREE at $VIS (vodacom-visual, rebased on main $(git -C /f/kipindi-vis rev-parse --short origin/main))"
echo "$VIS" > "$R/wm5-vis.sha"
PB="$S/visual/parity-main-d9b7a5b6.json"
run $TREE 3074 wm5-par-cmp npm run qa:classic-shell-parity -- --compare "$PB"
note "chain end"
echo "exit=0" > "$R/wm5-chain.done"
