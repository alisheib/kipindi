#!/usr/bin/env bash
# S6 ✅: the three plan docs edited from origin/main's blobs, committed on top of eefc1eec (r8d's 10.2 fix) without
# touching any working tree; the doc gates run on a detached checkout of the result; then (with --push) main fast-forwards.
set -e
S=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0719ce89-589d-484d-8a37-be05d46c6068/scratchpad/s6close
REPO=/c/kipindi-main
PARENT=eefc1eec
cd $REPO
git fetch -q origin
MAIN=$(git rev-parse origin/main)
[ "$(git rev-parse $PARENT^)" = "$MAIN" ] || { echo "STOP: origin/main moved to $(git rev-parse --short $MAIN) — rebase $PARENT first"; exit 2; }
F=$S/final; rm -rf $F; mkdir -p $F
D=docs/design-system/v5-2026-09-29-simplified-journey
git show $MAIN:docs/VODACOM-PLAN.md > $F/VODACOM-PLAN.md
git show $MAIN:docs/NEXT-PLAN.md > $F/NEXT-PLAN.md
git show $MAIN:$D/S6-VISUAL-PASS-STATE.md > $F/S6-VISUAL-PASS-STATE.md
git show $MAIN:$D/S7-PLAN.md > $F/S7-PLAN.md
python -I $S/docs_s6close.py $F $S/r.json
export GIT_INDEX_FILE=$S/docs_index
git read-tree $PARENT
for pair in "VODACOM-PLAN.md:docs/VODACOM-PLAN.md" "NEXT-PLAN.md:docs/NEXT-PLAN.md" "S6-VISUAL-PASS-STATE.md:$D/S6-VISUAL-PASS-STATE.md" "S7-PLAN.md:$D/S7-PLAN.md"; do
  src=${pair%%:*}; dst=${pair#*:}
  blob=$(git hash-object -w --no-filters $F/$src)
  git update-index --cacheinfo 100644,$blob,$dst
done
TREE=$(git write-tree); unset GIT_INDEX_FILE
C=$(git commit-tree $TREE -p $PARENT -F $S/msg.txt)
echo "commit $C"
git diff --stat $PARENT $C
# the doc gates on a detached checkout of the result
git -C /c/kipindi-vdocs checkout -q --detach $C
[ "$(git -C /c/kipindi-vdocs rev-parse HEAD)" = "$C" ] || { echo "STOP: vdocs not at $C"; exit 3; }
( cd /c/kipindi-vdocs && node scripts/docs-links.mjs 2>&1 | tail -2 )
( cd /c/kipindi-vdocs && node /c/kipindi-journey/node_modules/tsx/dist/cli.mjs scripts/vodacom-plan.test.mts 2>&1 | tail -4 )
echo "$C" > $S/COMMIT
if [ "$1" = "--push" ]; then git push origin $C:refs/heads/main 2>&1 | tail -2; git fetch -q origin; echo "origin/main now $(git rev-parse --short origin/main)"; fi
