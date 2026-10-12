#!/bin/bash
export PATH=/opt/node24/bin:$PATH
cd /home/user/kipindi-l3
OUT=/tmp/claude-0/l3/gates24b; mkdir -p $OUT; : > $OUT/SUMMARY
for t in betting-ink chart-one-home design-frozen dial-stake enter-where-pressed failure-reasons feedback-law journey-funnel journey-tickets kyc-gate label-lexicon market-result-announce popup-fit sell-grace-truth sell-price-guard timer-date type-scale updown-bet-feedback updown-handover updown-quickbet updown-window visual-pass-r4i visual-pass-r5e visual-pass-r5h visual-pass-r5i visual-pass-r5j visual-pass-r6a visual-pass-r6c visual-pass-r7c visual-pass-r8b visual-pass-r9c action-redirect orphans guards-exist source-bytes client-graph-safe implicit-submit decomment docs; do
  key="test:$t"
  if ! node -e "process.exit(require('./package.json').scripts['$key']?0:1)"; then echo "NOKEY $key" >> $OUT/SUMMARY; continue; fi
  timeout 900 npm run -s $key > $OUT/$t.log 2>&1; echo "$? $key" >> $OUT/SUMMARY
done
for r in action-redirect enter-where-pressed implicit-submit; do timeout 900 npm run -s red:$r > $OUT/red-$r.log 2>&1; echo "$? red:$r" >> $OUT/SUMMARY; done
echo DONE >> $OUT/SUMMARY
