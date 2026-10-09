#!/usr/bin/env bash
# WP12 lock turn D (asheib-c5), on F:/kipindi-a8j detached at the vodacom-wp12 tip: the landmark seal's local rehearsal
# (classic 264 cells, --journey 483 cells through a preview pass), qa:live against a local in-memory server ([E2], [E3]
# on the demo player, the real-bytes control), and the G1 unread-handover drive with its --prove-red (the server's own
# SESSION_SECRET), each on a fresh server.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wd-chain.log"; WT="wd-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wd-chain.done"
. "$S/chain-lib.sh"
wait_done wc-chain.done
. "$S/kp-lock.sh"
take_lock "wd-chain: WP12 landmark seal x2 + local qa:live + G1 drive x2, ~70 min" || { echo "exit=5" > "$R/wd-chain.done"; exit 5; }
trap release EXIT
wp12_trees
git -C /f/kipindi-a8j diff --quiet || { note "STOP: kipindi-a8j has tracked changes"; echo "exit=2" > "$R/wd-chain.done"; exit 2; }
git -C /f/kipindi-a8j checkout -q --detach "$AFTER" || { note "STOP: could not detach"; echo "exit=2" > "$R/wd-chain.done"; exit 2; }
note "AFTER $AFTER in kipindi-a8j"
SECRET=omega-a8i2-local-secret-0123456789abcdef
run kipindi-a8j 3073 wd-seal env LIVE_BASE=http://localhost:3073 npm run qa:landmark-seal
run kipindi-a8j 3073 wd-seal-j env LIVE_BASE=http://localhost:3073 npm run qa:landmark-seal -- --journey
run kipindi-a8j 3073 wd-live env BASE=http://localhost:3073 npm run qa:live
run kipindi-a8j 3073 wd-g1 env SESSION_SECRET=$SECRET npm run qa:journey-unread-handover
run kipindi-a8j 3073 wd-g1-red env SESSION_SECRET=$SECRET npm run qa:journey-unread-handover -- --prove-red
note "chain end"
echo "exit=0" > "$R/wd-chain.done"
