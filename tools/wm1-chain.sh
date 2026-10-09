#!/usr/bin/env bash
# Lock turn M1 (asheib-c5): the visual pass's combined branch (vodacom-visual: G1–G5, the journey home's edge, the
# break's Wallet, the preview settle) proved before it goes live, on F:/kipindi-a8i2-ctl (real node_modules with the
# Postgres binaries), port 3074, scratch Postgres 5471:
#   1 · typecheck; test:all with the database suites; every suite it fails, ALONE here and ALONE on main (kipindi-a8i2);
#       the two file-planting reds the branch extended (journey-shell, wallet-reach), the tree read after each.
#   2 · on fresh in-memory servers: the journey header fit (66 cells) and its red (--alone), the landmark seal in both
#       shells, needle-rest (G1's text rule), qa:journey-preview (the settle step), local qa:live.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm1-chain.log"; WT="wm1-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm1-chain.done"
. "$S/chain-lib.sh"
wait_done vis-ready.done
. "$S/kp-lock.sh"
take_lock "wm1-chain: the visual pass (vodacom-visual) - typecheck, test:all with DB suites, journey header fit + red, landmark seal x2, needle-rest, preview, qa:live, ~110 min" || { echo "exit=5" > "$R/wm1-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
git -C /f/kipindi-vis diff --quiet && git -C /f/kipindi-vis diff --cached --quiet || { note "STOP: kipindi-vis has uncommitted changes"; echo "exit=2" > "$R/wm1-chain.done"; exit 2; }
VIS=$(git -C /f/kipindi-vis rev-parse --short HEAD)
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wm1-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$VIS" || { note "STOP: could not detach $TREE at $VIS"; echo "exit=2" > "$R/wm1-chain.done"; exit 2; }
note "$TREE at $VIS (vodacom-visual, on main $(git -C /f/kipindi-vis rev-parse --short "$(git -C /f/kipindi-vis merge-base HEAD origin/main)"))"
echo "$VIS" > "$R/wm1-vis.sha"
( cd /f/$TREE && npx prisma generate ) > "$R/wm1-prisma.log" 2>&1
note "prisma generate exit=$?"

( cd /f/$TREE && timeout 1800 npx tsc --noEmit -p . ) > "$R/wm1-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wm1-typecheck.log") error(s)"

( cd /f/$TREE && env KP_SCRATCH_PORT=5471 node scripts/test-all.mjs --skip responsive,motion ) > "$R/wm1-battery.log" 2>&1
note "battery exit=$? — $(sed 's/\x1b\[[0-9;]*m//g' "$R/wm1-battery.log" | grep -E 'green ·|FAILED:' | tr '\n' ' ' | cut -c1-1200)"
note "  'gave no reason': $(grep -c 'gave no reason' "$R/wm1-battery.log") · fingerprint after: $(fp_of $TREE)"

# THE BATTERY'S CONTROL: a suite that fails here and passes alone on main is this branch's to answer for.
TFAIL=$(sed 's/\x1b\[[0-9;]*m//g' "$R/wm1-battery.log" | grep -E 'FAILED:' | tail -1 | sed 's/.*FAILED: *//' | tr ',' '\n' | sed 's/^ *//; s/ *$//' | grep '^test:')
if [ -n "$TFAIL" ]; then
  MAIN_OK=0
  git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach origin/main \
    && ( cd /f/kipindi-a8i2 && npx prisma generate ) > "$R/wm1-prisma-main.log" 2>&1 && MAIN_OK=1
  note "the battery's control: $(echo $TFAIL | wc -w) suite(s), alone here and on main $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (ready: $MAIN_OK)"
  for t in $TFAIL; do
    n=${t#test:}
    ( cd /f/$TREE && env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" > "$R/wm1-alone-$n.log" 2>&1 ); e1=$?
    e2=-
    if [ $MAIN_OK = 1 ]; then ( cd /f/kipindi-a8i2 && env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" > "$R/wm1-main-$n.log" 2>&1 ); e2=$?; fi
    note "  $t alone: visual exit=$e1 · main exit=$e2$([ "$e1" != 0 ] && [ "$e2" = 0 ] && echo '   ⛔ THE BRANCH ONLY')"
  done
fi

for red in red:journey-shell red:wallet-reach; do
  f0=$(fp_of $TREE)
  ( cd /f/$TREE && FORCE_COLOR=0 timeout 1800 npm run -s "$red" ) > "$R/wm1-${red#red:}-red.log" 2>&1; e=$?
  f1=$(fp_of $TREE)
  note "$red exit=$e · tree $([ "$f0" = "$f1" ] && echo same || echo CHANGED) — $(grep -v '^\s*$' "$R/wm1-${red#red:}-red.log" | grep -v DeprecationWarning | grep -v trace-deprecation | tail -2 | tr '\n' ' ' | cut -c1-300)"
done

rm -rf "$S/visual/preview-m1"; mkdir -p "$S/visual/preview-m1"
run $TREE 3074 wm1-jhf npm run qa:journey-header-fit
run $TREE 3074 wm1-red-jhf npm run red:journey-header-fit -- --alone
run $TREE 3074 wm1-seal-j env LIVE_BASE=http://localhost:3074 npm run qa:landmark-seal -- --journey
run $TREE 3074 wm1-seal env LIVE_BASE=http://localhost:3074 npm run qa:landmark-seal
run $TREE 3074 wm1-needle npm run test:needle-rest
run $TREE 3074 wm1-preview env KP_SHOTS="$S/visual/preview-m1" npm run qa:journey-preview
run $TREE 3074 wm1-live npm run qa:live
note "chain end"
echo "exit=0" > "$R/wm1-chain.done"
