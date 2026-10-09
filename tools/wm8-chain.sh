#!/usr/bin/env bash
# Lock turn M8 (asheib-c5), after M7, on vodacom-visual's tip: what M6's tree (17087f07) predates or could not hold —
# the DB suites round 3 touched (house-bot-reports re-pinned in fd7a1fe6, house-bot-money), the two ratchets fixed in
# daf8a599 (icon-sizes, decomment), implicit-submit and its red (e649212b), house-bot-disclosure (its D19a byte pin is
# red on any branch touching src/app/legal/ — recorded, not a gate here) — then qa:classic-shell-parity --compare
# against M2's baseline at main d9b7a5b6 (what the pass changes for a classic viewer).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm8-chain.log"; WT="wm8-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm8-chain.done"
. "$S/chain-lib.sh"
wait_done wm7-chain.done
. "$S/kp-lock.sh"
take_lock "wm8-chain: the visual pass - round 3's DB suites and ratchets on the tip, the classic parity compare, ~60 min" || { echo "exit=5" > "$R/wm8-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
git -C /f/kipindi-vis diff --quiet && git -C /f/kipindi-vis diff --cached --quiet || { note "STOP: kipindi-vis has uncommitted changes"; echo "exit=2" > "$R/wm8-chain.done"; exit 2; }
VIS=$(git -C /f/kipindi-vis rev-parse --short HEAD)
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wm8-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$VIS" || { note "STOP: could not detach $TREE at $VIS"; echo "exit=2" > "$R/wm8-chain.done"; exit 2; }
note "$TREE at $VIS (vodacom-visual's tip)"
echo "$VIS" > "$R/wm8-vis.sha"
( cd /f/$TREE && npx prisma generate ) > "$R/wm8-prisma.log" 2>&1; note "prisma generate exit=$?"
for t in test:house-bot-reports test:house-bot-money test:icon-sizes test:decomment test:implicit-submit red:implicit-submit test:needle-host test:visual-pass-r3c test:house-bot-disclosure; do
  f0=$(fp_of $TREE)
  ( cd /f/$TREE && env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" ) > "$R/wm8-${t//:/-}.log" 2>&1; e=$?
  f1=$(fp_of $TREE)
  note "$t exit=$e · tree $([ "$f0" = "$f1" ] && echo same || echo CHANGED) — $(sed 's/\x1b\[[0-9;]*m//g' "$R/wm8-${t//:/-}.log" | grep -v '^\s*$' | grep -v -i deprecation | tail -1 | cut -c1-220)"
done
PB="$S/visual/parity-main-d9b7a5b6.json"
run $TREE 3074 wm8-par-cmp npm run qa:classic-shell-parity -- --compare "$PB"
note "chain end"
echo "exit=0" > "$R/wm8-chain.done"
