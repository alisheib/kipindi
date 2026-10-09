#!/usr/bin/env bash
# Lock turn K (asheib-c5), after J: production read-back of the six WP12 fixes (main 8e0f1e69) — qa:live against
# www.50pick.tz from F:/kipindi-a8j detached at that tip (rec/prod-qalive.sh: mobile01 signs in once, the password file
# copied in only where git ignores it and removed after).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wk-chain.log"; WT="wk-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wk-chain.done"
. "$S/chain-lib.sh"
wait_done wj-chain.done
. "$S/kp-lock.sh"
take_lock "wk-chain: production qa:live read-back of 8e0f1e69 (mobile01 signs in once), ~10 min" || { echo "exit=5" > "$R/wk-chain.done"; exit 5; }
trap release EXIT
git -C /f/kipindi-a8j diff --quiet || { note "STOP: kipindi-a8j has tracked changes"; echo "exit=2" > "$R/wk-chain.done"; exit 2; }
bash "$S/rec/prod-qalive.sh" 8e0f1e69 > "$R/wk-prod.log" 2>&1
note "prod qa:live exit=$? — $(grep -E 'ALL PASS|passed|qa:live exit|removed' "$R/wk-prod.log" | tail -3 | tr '\n' ' ' | cut -c1-400)"
note "chain end"
echo "exit=0" > "$R/wk-chain.done"
