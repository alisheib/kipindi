#!/usr/bin/env bash
# Lock turn WTC (asheib-c5): an early typecheck of the rebased visual-pass tip (round 4's merges R4-G/H/I/J/K and R5-F,
# never typechecked since M14) in the control tree, whose node_modules and Prisma client are its own.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wtc-chain.log"; WT="wtc-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wtc-chain.done"
. "$S/chain-lib.sh"
. "$S/kp-lock.sh"
take_lock "wtc-chain: an early typecheck of the rebased visual-pass tip, ~4 min" || { echo "exit=5" > "$R/wtc-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(git -C /f/kipindi-vis rev-parse --short HEAD)
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wtc-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$VIS" || { note "STOP: could not detach $TREE at $VIS"; echo "exit=2" > "$R/wtc-chain.done"; exit 2; }
note "$TREE at $VIS (the rebased tip)"
( cd /f/$TREE && npx prisma generate ) > "$R/wtc-prisma.log" 2>&1; note "prisma generate exit=$?"
( cd /f/$TREE && timeout 1800 npx tsc --noEmit -p . ) > "$R/wtc-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wtc-typecheck.log") error(s)"
note "chain end"
echo "exit=0" > "$R/wtc-chain.done"
