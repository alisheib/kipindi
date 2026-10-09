#!/usr/bin/env bash
# Lock turn I (asheib-c5): S7 WP1's calibration, on F:/kipindi-a8i2 (real node_modules) detached at WP1's commit
# (vodacom-s7-wp1's tip, committed only after §0i recorded S6's last v2 compares — S7-PLAN A2 item 3). Each run on a
# fresh in-memory server:
#   1 · qa:classic-shell-parity v3: --prove-red, --baseline into wp1/parity-v3-<sha8>.json, a null --compare; when the
#       null compare differs, a second round under the normalisers the first round's differences name.
#   2 · qa:served-skeleton: the null pair (two captures, compared offline after the turn).
#   3 · qa:first-load: the production build at the commit, then its reading.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wi-chain.log"; WT="wi-chain"; W="$S/wp1"
mkdir -p "$R" "$W"; : > "$LOG"; rm -f "$R/wi-chain.done"
. "$S/chain-lib.sh"
wait_done wh-chain.done
wait_done wp1-commit.done
. "$S/kp-lock.sh"
take_lock "wi-chain: S7 WP1 calibration - parity v3 prove-red/baseline/null compare, skeleton null pair, first-load build, ~80 min" || { echo "exit=5" > "$R/wi-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2
TIP=$(git -C /f/kipindi-main rev-parse --short vodacom-s7-wp1)
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wi-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach "$TIP" && note "$TREE at $TIP (S7 WP1)"
( cd /f/$TREE && npx prisma generate ) > "$R/wi-prisma.log" 2>&1; note "prisma generate exit=$?"
P="$W/parity-v3-$TIP.json"; rm -f "$P" "$P.current.json" "$P.rejected.json"
run $TREE 3071 wi-red npm run qa:classic-shell-parity -- --prove-red
run $TREE 3071 wi-base npm run qa:classic-shell-parity -- --baseline "$P"
run $TREE 3071 wi-null npm run qa:classic-shell-parity -- --compare "$P"
if ! grep -q "^exit=0" "$R/wi-null.log.done"; then
  P2="$W/parity-v3-$TIP-norm.json"; rm -f "$P2" "$P2.current.json"
  NORM="market-ids,eat-dates,time-left,relative-times"
  note "the null compare differed: a second round under $NORM (to be narrowed from the first round's report)"
  run $TREE 3071 wi-base2 env KP_PARITY_NORMALISE=$NORM npm run qa:classic-shell-parity -- --baseline "$P2"
  run $TREE 3071 wi-null2 env KP_PARITY_NORMALISE=$NORM npm run qa:classic-shell-parity -- --compare "$P2"
fi
rm -f "$W/skel-$TIP-a.json" "$W/skel-$TIP-b.json"
run $TREE 3071 wi-skel-a env KP_TREE=/f/$TREE npm run -s qa:served-skeleton -- --capture "$W/skel-$TIP-a.json"
run $TREE 3071 wi-skel-b env KP_TREE=/f/$TREE npm run -s qa:served-skeleton -- --capture "$W/skel-$TIP-b.json"
( cd /f/$TREE && node scripts/qa-first-load.mjs --build --log "$R/wi-build.log" ) > "$R/wi-first-load.log" 2>&1
note "first-load build exit=$? — $(cat "$R/wi-build.log.done" 2>/dev/null)"
( cd /f/$TREE && node scripts/qa-first-load.mjs --read ) > "$R/wi-first-load-read.log" 2>&1
note "first-load read exit=$? — $(grep -v '^\s*$' "$R/wi-first-load-read.log" | tail -2 | tr '\n' ' ' | cut -c1-400)"
note "fingerprint after: $(fp_of $TREE)"
note "chain end"
echo "exit=0" > "$R/wi-chain.done"
