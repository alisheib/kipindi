#!/usr/bin/env bash
# Lock turn J (asheib-c5), after H2: qa:journey-preview's intermittent §5 stop, caught in the act — the diagnostic copy
# (hyd/preview-diag2-run.mjs: dialogs added/removed, every value the two fields take, every request and console line
# from the open click) three times, each on a fresh server, on F:/kipindi-a8i2-ctl at the fixes branch.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wj-chain.log"; WT="wj-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wj-chain.done"
. "$S/chain-lib.sh"
wait_done wh2-chain.done
. "$S/kp-lock.sh"
take_lock "wj-chain: the preview drive's section 5 stop, diagnosed (3 runs), ~12 min" || { echo "exit=5" > "$R/wj-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
note "$TREE at $(git -C /f/$TREE rev-parse --short HEAD)"
for n in 1 2 3; do
  mkdir -p "$S/hyd/preview-diag2-$n"
  run $TREE 3074 wj-diag2-$n env KP_SHOTS="$S/hyd/preview-diag2-$n" node "$S/hyd/preview-diag2-run.mjs"
  note "  run $n: $(grep -E 'DIAG2 §5' "$R/wj-diag2-$n.log" | head -1)"
done
note "chain end"
echo "exit=0" > "$R/wj-chain.done"
