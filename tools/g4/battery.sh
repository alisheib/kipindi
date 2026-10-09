#!/usr/bin/env bash
# G4 visual pass: tsc + every suite that reads a touched file + the brief's list. Run under the shared lock.
cd /f/kipindi-v4 || exit 9
S=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/g4
LOG=$S/battery.log
: > "$LOG"
rm -f "$S"/fail-*.txt
run() {
  local name=$1; shift
  local out rc
  out=$("$@" 2>&1); rc=$?
  echo "$name rc=$rc" >> "$LOG"
  if [ $rc -ne 0 ]; then printf '%s\n' "$out" | tail -60 > "$S/fail-${name//:/_}.txt"; fi
}
run tsc npx tsc --noEmit -p .
for s in \
  test:ui-consistency test:density-contract test:design-frozen test:measure test:type-scale test:tokens test:dead-css \
  test:css-vars-defined test:stacking test:journey-shell test:journey-account test:journey-tickets test:gold-is-money \
  test:contrast test:hooks-order \
  test:agent-fee-wallet-path test:cashback-hidden test:implicit-submit test:journey-funnel test:kyc-approved-copy \
  test:kyc-at-withdrawal test:msisdn-prefill test:payments test:payout-destination test:cert-f1 test:route-census \
  test:timer-date test:wallet-freeze \
  test:kyc-copy-truth test:layout-staleness \
  test:landing-mine test:popup-fit test:wallet-reach \
  test:chat-availability test:chat-safety test:marketing-optout \
  test:admin-charts test:betting-ink test:bridge test:card-share test:chat-focus-ring test:chip-contract \
  test:design-one-door test:featured-card test:filter-language test:grid-paging test:integrity test:keyframes \
  test:m1-light test:money-format test:motion-ladder test:one-sided test:position-permalink test:presence-class \
  test:reduce-motion test:sell-grace-truth test:spacing-scale test:tap-target test:ticker-honesty \
  test:updown-filter-sheet ; do
  run "$s" npm run -s "$s"
done
echo DONE >> "$LOG"
