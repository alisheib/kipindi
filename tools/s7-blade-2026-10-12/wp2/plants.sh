#!/usr/bin/env bash
# S7 WP2: the four widened populations, proven. A defect planted in the moved home body must turn each guard red on its
# own check; the file is restored after every plant and the tree must be clean again. Usage: plants.sh <wp2 worktree>
export PATH=/usr/bin:/mingw64/bin:$PATH
T="$1"
R=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0719ce89-589d-484d-8a37-be05d46c6068/scratchpad/r12wp2
F=src/components/home/legacy-landing.tsx
BAK="$R/legacy-landing.bak"
caught=0; missed=0
plant() {  # name · guard key · the line appended · the failing check's label (a fixed string)
  local name="$1" key="$2" text="$3" want="$4"
  cp "$T/$F" "$BAK"
  printf '%s\r\n' "$text" >> "$T/$F"
  ( cd "$T" && npm run "$key" ) > "$R/plant-$name.log" 2>&1; local rc=$?
  cp "$BAK" "$T/$F"
  git -C "$T" diff --quiet -- "$F" || { echo "RESTORE FAILED for $name"; exit 9; }
  # caught = the guard exits non-zero AND a FAILING line (✗ / FAIL) carries the expected check's words
  if [ $rc -ne 0 ] && grep -a -F "$want" "$R/plant-$name.log" | grep -a -q -E "✗|FAIL"; then echo "CAUGHT  $name ($key exit $rc)"; caught=$((caught+1));
  else echo "MISSED  $name ($key exit $rc)"; missed=$((missed+1)); fi
}
plant withdrawn-key  test:withdrawn-features  '// the withdrawn copy read again: t.affiliate.inviteComingSoonTitle' 'no player route reads the invite coming-soon copy'
plant fee-destination test:agent-terms-binding 'export const __plantFee = (cfg: { feeDestinationAccount: string }) => cfg.feeDestinationAccount;' 'no rendered page interpolates the fee DESTINATION'
plant inline-skeleton test:visual-pass-r5l     'function PlantSkeleton() { return null; }' 'an inline skeleton function'
plant deleted-code   test:failure-reasons     'export const __plantRefusal = { ok: false, code: "MAINTENANCE" };' '9b.deleted.MAINTENANCE'
git -C "$T" diff --quiet || { echo "TREE DIRTY after the plants"; exit 9; }
echo "$caught/$((caught+missed)) population plants caught · tree clean"
