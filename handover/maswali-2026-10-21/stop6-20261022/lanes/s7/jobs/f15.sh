#!/usr/bin/env bash
# S7-F9 14 and 15 on the runner: item 3's suites (the law's sunset paragraph and its guard L8, with its plants), the
# merged tree's two reds fixed (the facts census, the slip's lone-marker plant), the design floor; and the slip-design red
# proven on the branch's base before S7-MERGE 4 (a7feccbef), in a worktree that shares this tree's node_modules.
. "$CI_RUN/lib.sh"
step facts npm run test:maswali-facts
step slip-design npm run test:maswali-slip-design
step design npm run test:maswali-design
step law npm run test:maswali-law
step law-red npm run red:maswali-law
step rules-copy npm run test:rules-copy
step config npm run test:maswali-config
step plan npm run test:maswali-plan
step docs npm run test:docs
step rush-target npm run test:maswali-rush-target
step rush-target-red npm run red:maswali-rush-target
git worktree add -q /tmp/s7-base a7feccbef && ln -s "$PWD/node_modules" /tmp/s7-base/node_modules
( cd /tmp/s7-base && npx tsx scripts/maswali-slip-design.test.mts ) > "$OUT/slip-design-at-a7feccbef.log" 2>&1
rc=$?
echo "slip-design-at-a7feccbef rc=$rc (a red here is the proof that it predates S7-MERGE 4)" >> "$OUT/summary.txt"
echo "---- [slip-design-at-a7feccbef] rc=$rc :: the same suite at the branch's base, before S7-MERGE 4"
grep -a -E "PLANT TARGET ABSENT|passed|failed" "$OUT/slip-design-at-a7feccbef.log" | tail -5
git worktree remove --force /tmp/s7-base
finish
