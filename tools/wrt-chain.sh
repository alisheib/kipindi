#!/usr/bin/env bash
# Lock turn WRT (asheib-c5): R5-H's route-transition question in a browser. The RouteTransition wrapper's opacity on
# every frame from a journey tab tap and through a throttled cold load, on vodacom-visual's tip as it is ("before") and
# with S/r5h/route-transition.r5h.patch applied ("after"), each on a fresh in-memory server; then the static suites
# that read route-transition.tsx on the patched tree. The control tree is restored byte-identical at the end.
# Starts once the R5-H merge is committed (runs/vis-r5h.done, written by hand).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wrt-chain.log"; WT="wrt-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wrt-chain.done"
. "$S/chain-lib.sh"
wait_done vis-r5h.done
. "$S/kp-lock.sh"
take_lock "wrt-chain: the route entrance's frames - tab taps and a throttled cold load, before and after R5-H's patch, ~40 min" || { echo "exit=5" > "$R/wrt-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
VIS=$(git -C /f/kipindi-vis rev-parse --short vodacom-visual)
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wrt-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$VIS" || { note "STOP: could not detach $TREE at $VIS"; echo "exit=2" > "$R/wrt-chain.done"; exit 2; }
( cd /f/$TREE && npx prisma generate ) > "$R/wrt-prisma.log" 2>&1; note "$TREE at $VIS · prisma generate exit=$?"
run $TREE 3074 wrt-before node "$S/r5h/probe-route-blink.mjs" http://localhost:3074 before "$R/wrt-before.json"
if git -C /f/$TREE apply --check "$S/r5h/route-transition.r5h.patch" 2>/dev/null; then
  git -C /f/$TREE apply "$S/r5h/route-transition.r5h.patch"
  note "patch applied: $(git -C /f/$TREE diff --stat | tail -1)"
  run $TREE 3074 wrt-after node "$S/r5h/probe-route-blink.mjs" http://localhost:3074 after "$R/wrt-after.json"
  for t in test:visual-pass-r4j test:journey-shell test:visual-pass-r5h test:hooks-order test:red-anchors; do
    ( cd /f/$TREE && FORCE_COLOR=0 timeout 900 npm run -s "$t" ) > "$R/wrt-${t//:/-}.log" 2>&1
    note "patched $t exit=$? — $(grep -v '^\s*$' "$R/wrt-${t//:/-}.log" | tail -1 | cut -c1-140)"
  done
  git -C /f/$TREE checkout -q -- src/components/ui/route-transition.tsx
  note "$TREE restored: $(git -C /f/$TREE status --short | wc -l) change(s) left"
else
  note "⚠ the patch does not apply on $VIS — no after run"
fi
note "chain end"
echo "exit=0" > "$R/wrt-chain.done"
