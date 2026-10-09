#!/usr/bin/env bash
# Does R4-I's working diff (tracked changes + the new files) apply with -3 onto vodacom-visual's tip? Read-only for the
# worktree: the patch is applied to a TEMPORARY index file built from vodacom-visual's tree, never to F:\kipindi-r4i.
S="/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r4i"
cd /f/kipindi-r4i || exit 1
git diff --binary > "$S/r4i.patch"
for f in $(git ls-files --others --exclude-standard); do
  git diff --no-index --binary -- /dev/null "$f" >> "$S/r4i.patch"
done
echo "patch: $(wc -l < "$S/r4i.patch") lines"
export GIT_INDEX_FILE="$S/vv.index"
rm -f "$GIT_INDEX_FILE"
git read-tree vodacom-visual
git apply --cached -3 "$S/r4i.patch" > "$S/apply.out" 2>&1
echo "apply exit=$?"
cat "$S/apply.out" | tail -40
echo "unmerged:"
git ls-files -u | awk '{print $4}' | sort -u
rm -f "$GIT_INDEX_FILE"
