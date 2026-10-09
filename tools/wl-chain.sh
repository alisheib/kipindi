#!/usr/bin/env bash
# Lock turn L (asheib-c5): the Modal's opening-focus fix (branch vodacom-modal-focus) in a real browser, on
# F:/kipindi-a8i2-ctl detached at it: the preview drive's diagnostic copy three times (turn J on the unfixed tree: 2 of 3
# NEVER ARMED), then the dialog drives that hold A8i-2's and A8j's rules — qa:enter-where-pressed in Chromium and in
# WebKit, and qa:implicit-submit in Chromium. Each on a fresh server.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wl-chain.log"; WT="wl-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wl-chain.done"
. "$S/chain-lib.sh"
wait_done wk-chain.done
. "$S/kp-lock.sh"
take_lock "wl-chain: the Modal focus fix - preview drive x3, enter-where-pressed (chromium, webkit), implicit-submit, ~30 min" || { echo "exit=5" > "$R/wl-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl; FIX=$(git -C /f/kipindi-main rev-parse --short vodacom-modal-focus)
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wl-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$FIX" && note "$TREE at $FIX (the Modal focus fix)"
( cd /f/$TREE && npx prisma generate ) > "$R/wl-prisma.log" 2>&1; note "prisma generate exit=$?"
for n in 1 2 3; do
  mkdir -p "$S/hyd/preview-fix-$n"
  run $TREE 3074 wl-preview-$n env KP_SHOTS="$S/hyd/preview-fix-$n" node "$S/hyd/preview-diag2-run.mjs"
  note "  run $n: $(grep -E 'DIAG2 §5' "$R/wl-preview-$n.log" | head -1)"
done
run $TREE 3074 wl-ewp-chromium node scripts/qa-enter-where-pressed.mjs
run $TREE 3074 wl-ewp-webkit env ENGINE=webkit node scripts/qa-enter-where-pressed.mjs
run $TREE 3074 wl-implicit node scripts/qa-implicit-submit.mjs
note "chain end"
echo "exit=0" > "$R/wl-chain.done"
