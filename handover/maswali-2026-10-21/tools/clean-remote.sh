#!/usr/bin/env bash
# clean-remote.sh [--delete] — Ali 2026-10-21: "make sure no stale stays … delete anything old or codex … keep a clean repo".
# Every remote branch NOT on the keep list: merged into origin/main → deleted; unmerged → archived in a verified bundle,
# then deleted. Without --delete it only classifies and writes the bundle.
set -u
cd F:/kipindi-main || exit 2
git fetch -q --prune origin
KEEP="main
claude/maswali-s5-release
codex/maswali-coord-20261019
claude/maswali-s5-fix-srv
claude/maswali-s5-fix-player
claude/maswali-s5-fix-platform
claude/maswali-s5-design-doors
claude/maswali-s5-design-hub
claude/maswali-s5-design-slip
claude/maswali-s5-design-tickets
claude/maswali-s5-design-register
claude/maswali-s5-parity
claude/maswali-s7
codex/maswali-s7-integration-20261019
mln-s6-notices
mln-s6-int
mln-s6-reports
codex/maswali-s6-n-cont-20261019
codex/maswali-s6-n-r17-finish-20261019
codex/maswali-s6-ld-prep-20261019
codex/maswali-s5-vis-p
codex/maswali-s5-vis-r
maswali-handover-20261019
u43-handover-20261021
u43-seal
phosphor-2d-v2
phosphor-3-v2
vodacom-a8i
vodacom-handover
vodacom-s12-timeleft
house-bots-p2-desk-price
simple-journey"
OUT=C:/50pick-ssd/tmp/clean-remote; mkdir -p "$OUT"
: > "$OUT/merged.txt"; : > "$OUT/unmerged.txt"; : > "$OUT/kept.txt"
for r in $(git for-each-ref --format='%(refname:short)' refs/remotes/origin/ | grep -vE '^origin(/HEAD)?$'); do
  b=${r#origin/}
  if echo "$KEEP" | grep -qx "$b"; then echo "$b" >> "$OUT/kept.txt"; continue; fi
  if git merge-base --is-ancestor "$r" origin/main; then echo "$b" >> "$OUT/merged.txt"; else echo "$b" >> "$OUT/unmerged.txt"; fi
done
echo "kept: $(wc -l < "$OUT/kept.txt") · merged (delete): $(wc -l < "$OUT/merged.txt") · unmerged (archive, then delete): $(wc -l < "$OUT/unmerged.txt")"
B=F:/kipindi-archive/stale-remote-branches-20261021.bundle
if [ -s "$OUT/unmerged.txt" ]; then
  refs=$(sed 's#^#refs/remotes/origin/#' "$OUT/unmerged.txt")
  git bundle create "$B" $refs > "$OUT/bundle.log" 2>&1 || { echo "bundle FAILED"; tail -5 "$OUT/bundle.log"; exit 3; }
  git bundle verify "$B" > "$OUT/verify.log" 2>&1 || { echo "bundle VERIFY FAILED"; tail -5 "$OUT/verify.log"; exit 4; }
  n=$(git bundle list-heads "$B" | wc -l)
  echo "bundle ok: $B ($n heads, $(du -h "$B" | cut -f1))"
  [ "$n" -eq "$(wc -l < "$OUT/unmerged.txt")" ] || { echo "bundle head count mismatch"; exit 5; }
fi
if [ "${1:-}" = "--delete" ]; then
  cat "$OUT/merged.txt" "$OUT/unmerged.txt" | xargs -n 25 git push -q origin --delete 2>&1 | tail -5
  git fetch -q --prune origin
  echo "remote branches left: $(git for-each-ref refs/remotes/origin/ | grep -vcE 'refs/remotes/origin/HEAD$')"
fi
