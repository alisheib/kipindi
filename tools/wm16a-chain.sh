#!/usr/bin/env bash
# Lock turn M16a (asheib-c5): the visual pass's FINAL TIP (round 4 + the edge read's fixes R4-G/H/I/J/K) — typecheck, test:all with
# the database suites (each failure re-run alone here and on main), then every red twin the pass and main's S9 touch.
# Starts once the bar-geometry control (wbm) ended AND a tip is declared ready (runs/vis-ready6.done + vis-ready6.sha, written by hand).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm16a-chain.log"; WT="wm16a-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm16a-chain.done"
. "$S/chain-lib.sh"
wait_done wbm-chain.done
wait_done vis-ready6.done
. "$S/kp-lock.sh"
take_lock "wm16a-chain: the visual pass's final tip - typecheck, test:all with DB suites, the red twins, ~110 min" || { echo "exit=5" > "$R/wm16a-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
# The commit declared ready (vis-ready6.sha), proved as it is — later commits on the branch do not stop this turn.
VIS=$(cat "$R/vis-ready6.sha" 2>/dev/null)
git -C /f/kipindi-vis merge-base --is-ancestor "$VIS" vodacom-visual || { note "STOP: the declared $VIS is not on vodacom-visual"; echo "exit=2" > "$R/wm16a-chain.done"; exit 2; }
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wm16a-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$VIS" || { note "STOP: could not detach $TREE at $VIS"; echo "exit=2" > "$R/wm16a-chain.done"; exit 2; }
BASE=$(git -C /f/kipindi-vis merge-base "$VIS" origin/main)
note "$TREE at $VIS (the final tip, on main $(git -C /f/kipindi-vis rev-parse --short "$BASE"))"
echo "$VIS" > "$R/wm16a-vis.sha"
( cd /f/$TREE && npx prisma generate ) > "$R/wm16a-prisma.log" 2>&1; note "prisma generate exit=$?"
( cd /f/$TREE && timeout 1800 npx tsc --noEmit -p . ) > "$R/wm16a-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wm16a-typecheck.log") error(s)"

( cd /f/$TREE && env KP_SCRATCH_PORT=5471 node scripts/test-all.mjs --skip responsive,motion ) > "$R/wm16a-battery.log" 2>&1
note "battery exit=$? — $(sed 's/\x1b\[[0-9;]*m//g' "$R/wm16a-battery.log" | grep -E 'green ·|FAILED:' | tr '\n' ' ' | cut -c1-1200)"
note "  'gave no reason': $(grep -c 'gave no reason' "$R/wm16a-battery.log") · fingerprint after: $(fp_of $TREE)"
TFAIL=$(sed 's/\x1b\[[0-9;]*m//g' "$R/wm16a-battery.log" | grep -E 'FAILED:' | tail -1 | sed 's/.*FAILED: *//' | tr ',' '\n' | sed 's/^ *//; s/ *$//' | grep '^test:')
if [ -n "$TFAIL" ]; then
  MAIN_OK=0
  git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach "$BASE" \
    && ( cd /f/kipindi-a8i2 && npx prisma generate ) > "$R/wm16a-prisma-main.log" 2>&1 && MAIN_OK=1
  note "the battery's control: $(echo $TFAIL | wc -w) suite(s), alone here and on main $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (ready: $MAIN_OK)"
  for t in $TFAIL; do
    n=${t#test:}
    ( cd /f/$TREE && env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" > "$R/wm16a-alone-$n.log" 2>&1 ); e1=$?
    e2=-
    if [ $MAIN_OK = 1 ]; then ( cd /f/kipindi-a8i2 && env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" > "$R/wm16a-main-$n.log" 2>&1 ); e2=$?; fi
    note "  $t alone: visual exit=$e1 · main exit=$e2$([ "$e1" != 0 ] && [ "$e2" = 0 ] && echo '   ⛔ THE BRANCH ONLY')"
  done
fi

for red in $(cat "$S/wm16-reds.txt"); do
  f0=$(fp_of $TREE)
  ( cd /f/$TREE && FORCE_COLOR=0 timeout 1800 npm run -s "$red" ) > "$R/wm16a-${red#red:}-red.log" 2>&1; e=$?
  f1=$(fp_of $TREE)
  note "$red exit=$e · tree $([ "$f0" = "$f1" ] && echo same || echo CHANGED) — $(grep -v '^\s*$' "$R/wm16a-${red#red:}-red.log" | grep -v -i deprecation | tail -1 | cut -c1-200)"
  [ "$f0" = "$f1" ] || { note "  ⛔ $TREE changed under $red"; git -C /f/$TREE status --short | head -5 >> "$LOG"; }
done
note "chain end"
echo "exit=0" > "$R/wm16a-chain.done"
