#!/usr/bin/env bash
# Lock turn M6 (asheib-c5): the visual pass after round 3's fixes (vodacom-visual with R3-A, R3-B, R3-D; R3-C follows in M7), the kp-qbar-row and
# money-form fixes), on F:/kipindi-a8i2-ctl (real node_modules + Postgres binaries), scratch Postgres 5471:
#   typecheck · test:all with the DB suites, each failure ALONE here and ALONE on main · the red twins of every suite
#   round 3 changed, the tree read after each.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wm6-chain.log"; WT="wm6-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wm6-chain.done"
. "$S/chain-lib.sh"
. "$S/kp-lock.sh"
take_lock "wm6-chain: the visual pass after round 3 - typecheck, test:all with DB suites, round 3's red twins, ~100 min" || { echo "exit=5" > "$R/wm6-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
git -C /f/kipindi-vis diff --quiet && git -C /f/kipindi-vis diff --cached --quiet || { note "STOP: kipindi-vis has uncommitted changes"; echo "exit=2" > "$R/wm6-chain.done"; exit 2; }
VIS=$(git -C /f/kipindi-vis rev-parse --short HEAD)
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wm6-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$VIS" || { note "STOP: could not detach $TREE at $VIS"; echo "exit=2" > "$R/wm6-chain.done"; exit 2; }
note "$TREE at $VIS (vodacom-visual after round 3, on main $(git -C /f/kipindi-vis rev-parse --short "$(git -C /f/kipindi-vis merge-base HEAD origin/main)"))"
echo "$VIS" > "$R/wm6-vis.sha"
( cd /f/$TREE && npx prisma generate ) > "$R/wm6-prisma.log" 2>&1; note "prisma generate exit=$?"
( cd /f/$TREE && timeout 1800 npx tsc --noEmit -p . ) > "$R/wm6-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wm6-typecheck.log") error(s)"

( cd /f/$TREE && env KP_SCRATCH_PORT=5471 node scripts/test-all.mjs --skip responsive,motion ) > "$R/wm6-battery.log" 2>&1
note "battery exit=$? — $(sed 's/\x1b\[[0-9;]*m//g' "$R/wm6-battery.log" | grep -E 'green ·|FAILED:' | tr '\n' ' ' | cut -c1-1200)"
note "  'gave no reason': $(grep -c 'gave no reason' "$R/wm6-battery.log") · fingerprint after: $(fp_of $TREE)"
TFAIL=$(sed 's/\x1b\[[0-9;]*m//g' "$R/wm6-battery.log" | grep -E 'FAILED:' | tail -1 | sed 's/.*FAILED: *//' | tr ',' '\n' | sed 's/^ *//; s/ *$//' | grep '^test:')
if [ -n "$TFAIL" ]; then
  MAIN_OK=0
  git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach origin/main \
    && ( cd /f/kipindi-a8i2 && npx prisma generate ) > "$R/wm6-prisma-main.log" 2>&1 && MAIN_OK=1
  note "the battery's control: $(echo $TFAIL | wc -w) suite(s), alone here and on main $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (ready: $MAIN_OK)"
  for t in $TFAIL; do
    n=${t#test:}
    ( cd /f/$TREE && env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" > "$R/wm6-alone-$n.log" 2>&1 ); e1=$?
    e2=-
    if [ $MAIN_OK = 1 ]; then ( cd /f/kipindi-a8i2 && env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" > "$R/wm6-main-$n.log" 2>&1 ); e2=$?; fi
    note "  $t alone: visual exit=$e1 · main exit=$e2$([ "$e1" != 0 ] && [ "$e2" = 0 ] && echo '   ⛔ THE BRANCH ONLY')"
  done
fi

for red in red:journey-shell red:wallet-reach red:journey-tickets red:density-contract red:hero-copy red:featured-card \
           red:ticker-honesty red:market-columns red:money-format red:measure red:share-link-readable \
           red:updown-filter-sheet red:id-documents red:social-panel red:install-invite red:enter-where-pressed \
           red:marketing-optout; do
  f0=$(fp_of $TREE)
  ( cd /f/$TREE && FORCE_COLOR=0 timeout 1800 npm run -s "$red" ) > "$R/wm6-${red#red:}-red.log" 2>&1; e=$?
  f1=$(fp_of $TREE)
  note "$red exit=$e · tree $([ "$f0" = "$f1" ] && echo same || echo CHANGED) — $(grep -v '^\s*$' "$R/wm6-${red#red:}-red.log" | grep -v -i deprecation | tail -1 | cut -c1-200)"
  [ "$f0" = "$f1" ] || { note "  ⛔ $TREE changed under $red"; git -C /f/$TREE status --short | head -5 >> "$LOG"; }
done
note "chain end"
echo "exit=0" > "$R/wm6-chain.done"
