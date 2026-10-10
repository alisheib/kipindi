#!/usr/bin/env bash
# Lock turn M16a2 (asheib-c5), 2026-10-10: the visual pass's MERGED tip 4b754b89 (every round, main merged in up to
# e7a979c6) — prisma generate, typecheck, test:all with the database suites; each failing suite re-run alone here and on
# main's control tree. The red twins are NOT in this turn: the long ones (house-bot-c5 ~2 h, -engine, campaign-visuals,
# contacts-import) need their own long turn, and a red cut by a cap can leave its plant on disk (seen 2026-10-10).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm16a2-chain.log"; WT="wm16a2-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm16a2-chain.done"
. "$S/chain-lib.sh"
. "$S/kp-lock.sh"
KP_WAIT_MAX=600 take_lock "wm16a2-chain: the visual pass's merged tip 4b754b89 - typecheck + test:all with DB suites, ~70 min" || { echo "exit=5" > "$R/wm16a2-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=4b754b8983f63bc1b9d8fba6b1d30faa662491ec
git -C /f/kipindi-vis merge-base --is-ancestor "$VIS" origin/vodacom-visual || { note "STOP: $VIS is not on origin/vodacom-visual"; echo "exit=2" > "$R/wm16a2-chain.done"; exit 2; }
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wm16a2-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$VIS" || { note "STOP: could not detach $TREE at $VIS"; echo "exit=2" > "$R/wm16a2-chain.done"; exit 2; }
BASE=$(git -C /f/kipindi-vis merge-base "$VIS" origin/main)
note "$TREE at $VIS (the merged tip, on main $(git -C /f/kipindi-vis rev-parse --short "$BASE"))"
( cd /f/$TREE && npx prisma generate ) > "$R/wm16a2-prisma.log" 2>&1; note "prisma generate exit=$?"
( cd /f/$TREE && timeout 1800 npx tsc --noEmit -p . ) > "$R/wm16a2-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wm16a2-typecheck.log") error(s)"

( cd /f/$TREE && env KP_SCRATCH_PORT=5471 node scripts/test-all.mjs --skip responsive,motion ) > "$R/wm16a2-battery.log" 2>&1
note "battery exit=$? — $(sed 's/\x1b\[[0-9;]*m//g' "$R/wm16a2-battery.log" | grep -E 'green ·|FAILED:' | tr '\n' ' ' | cut -c1-1200)"
note "  'gave no reason': $(grep -c 'gave no reason' "$R/wm16a2-battery.log") · fingerprint after: $(fp_of $TREE)"
TFAIL=$(sed 's/\x1b\[[0-9;]*m//g' "$R/wm16a2-battery.log" | grep -E 'FAILED:' | tail -1 | sed 's/.*FAILED: *//' | tr ',' '\n' | sed 's/^ *//; s/ *$//' | grep '^test:')
if [ -n "$TFAIL" ]; then
  MAIN_OK=0
  git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach "$BASE" \
    && ( cd /f/kipindi-a8i2 && npx prisma generate ) > "$R/wm16a2-prisma-main.log" 2>&1 && MAIN_OK=1
  note "the battery's control: $(echo $TFAIL | wc -w) suite(s), alone here and on main $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (ready: $MAIN_OK)"
  for t in $TFAIL; do
    n=${t#test:}
    ( cd /f/$TREE && env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" > "$R/wm16a2-alone-$n.log" 2>&1 ); e1=$?
    e2=-
    if [ $MAIN_OK = 1 ]; then ( cd /f/kipindi-a8i2 && env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" > "$R/wm16a2-main-$n.log" 2>&1 ); e2=$?; fi
    note "  $t alone: visual exit=$e1 · main exit=$e2$([ "$e1" != 0 ] && [ "$e2" = 0 ] && echo '   ⛔ THE BRANCH ONLY')"
  done
fi
note "tree after: $(git -C /f/$TREE status --short | head -5 | tr '\n' ' ')"
note "chain end"
echo "exit=0" > "$R/wm16a2-chain.done"
