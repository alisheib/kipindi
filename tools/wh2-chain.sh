#!/usr/bin/env bash
# Lock turn WH2 (asheib-c5): the static-cache hotfix (9cb95938, main + the scoped rule) typechecked in the control tree,
# whose node_modules are its own (prisma generate from the hotfix's schema), then its guard and the suites that read
# next.config.ts or package.json's scripts.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wh2-chain.log"; WT="wh2-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wh2-chain.done"
. "$S/chain-lib.sh"
. "$S/kp-lock.sh"
take_lock "wh2-chain: the static-cache hotfix's typecheck in the control tree, ~6 min" || { echo "exit=5" > "$R/wh2-chain.done"; exit 5; }
trap release EXIT
TREE=kipindi-a8i2-ctl
git -C /f/$TREE diff --quiet || { note "STOP: $TREE has tracked changes"; echo "exit=2" > "$R/wh2-chain.done"; exit 2; }
git -C /f/$TREE checkout -q --detach 9cb95938 || { note "STOP: could not detach $TREE at the hotfix"; echo "exit=2" > "$R/wh2-chain.done"; exit 2; }
note "$TREE at $(git -C /f/$TREE rev-parse --short HEAD) (the hotfix on main 6f276f04)"
( cd /f/$TREE && npx prisma generate ) > "$R/wh2-prisma.log" 2>&1; note "prisma generate exit=$?"
( cd /f/$TREE && timeout 1800 npx tsc --noEmit -p . ) > "$R/wh2-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wh2-typecheck.log") error(s)"
for t in test:static-cache-scope test:red-anchors test:decomment test:guards-exist test:docs test:source-bytes; do
  ( cd /f/$TREE && FORCE_COLOR=0 timeout 900 npm run -s "$t" ) > "$R/wh2-${t//:/-}.log" 2>&1; e=$?
  note "$t exit=$e — $(grep -v '^\s*$' "$R/wh2-${t//:/-}.log" | tail -1 | cut -c1-160)"
done
note "chain end"
echo "exit=0" > "$R/wh2-chain.done"
