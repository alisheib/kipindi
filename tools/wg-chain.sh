#!/usr/bin/env bash
# Lock turn G (asheib-c5), between D and E:
#   1 · the responsible-gambling hydration fix (2b98b99e) proved in a browser, on F:/kipindi-a8i2-ctl (no other turn
#       uses it), port 3074: the probe's CONTROL on its parent first (it must SEE the error), then the fix; the journey
#       tiles' tabs section on the fix (15.1, and the page's own tiles); the preview drive once more, then a
#       diagnostic copy of it (§5's dialog, dumped).
#   2 · the two WP12 runs whose server never came up (Turbopack's Google-font start-up failure): G1's plain drive
#       (turn D) and qa:footer-reachable --journey --prove-red (turn C), on F:/kipindi-a8j at the vodacom-wp12 tip.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wg-chain.log"; WT="wg-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wg-chain.done"
. "$S/chain-lib.sh"
wait_done wd-chain.done
. "$S/kp-lock.sh"
take_lock "wg-chain: RG hydration fix in a browser (control + fix), tabs tiles, preview drive + diag, G1 + footer reruns, ~50 min" || { echo "exit=5" > "$R/wg-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl; CTL=75487060; FIX=2b98b99e
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wg-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$CTL" && note "$TREE at $CTL (the control: main without the fix)"
run $TREE 3074 wg-ctl node "$S/hyd/rg-hyd-probe.mjs" --expect-red
git -C /f/$TREE checkout -q --detach "$FIX" && note "$TREE at $FIX (the fix)"
run $TREE 3074 wg-fix node "$S/hyd/rg-hyd-probe.mjs"
rm -rf "$S/hyd/tabs" "$S/hyd/preview" "$S/hyd/preview-diag"; mkdir -p "$S/hyd/tabs" "$S/hyd/preview" "$S/hyd/preview-diag"
run $TREE 3074 wg-tabs env KP_ONLY=tabs KP_BUDGET_MIN=30 npm run qa:journey-shell -- "$S/hyd/tabs"
run $TREE 3074 wg-preview env KP_SHOTS="$S/hyd/preview" npm run qa:journey-preview
run $TREE 3074 wg-diag env KP_SHOTS="$S/hyd/preview-diag" node "$S/hyd/preview-diag-run.mjs"
wp12_trees
git -C /f/kipindi-a8j diff --quiet && git -C /f/kipindi-a8j checkout -q --detach "$AFTER" && note "kipindi-a8j at $AFTER for the two WP12 reruns"
SECRET=omega-a8i2-local-secret-0123456789abcdef
run kipindi-a8j 3073 wg-g1 env SESSION_SECRET=$SECRET npm run qa:journey-unread-handover
run kipindi-a8j 3073 wg-footer-j-red npm run qa:footer-reachable -- --journey --prove-red
note "chain end"
echo "exit=0" > "$R/wg-chain.done"
