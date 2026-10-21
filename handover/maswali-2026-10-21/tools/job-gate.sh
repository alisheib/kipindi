#!/usr/bin/env bash
# job-gate.sh — the lead's heavy checks on the S5 release head, one at a time through the
# Maswali slots; each job's log in lead/gate/; a summary line per job; the tree checked after each (a red twin's plant).
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
cd /c/50pick-ssd/maswali-coord-20261019 || exit 9
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp' KP_SCRATCH_PORT=5477
mkdir -p "$S/lead/gate"
SUM="$S/lead/gate/summary.txt"
echo "== start $(date -u +%FT%TZ) head $(git rev-parse --short HEAD)" >> "$SUM"
run() {
  local name="$1"; shift
  local log="$S/lead/gate/${name//[: \/]/_}.log"
  local start; start=$(date +%s)
  bash "$S/mln-slot-s5x.sh" lead "$@" > "$log" 2>&1
  local rc=$?
  local last; last=$(grep -E "ALL PASS|FAILURES|RED:|caught|missed|passed, |passed,|FLOOR|error TS|exit [0-9]" "$log" | tail -2 | tr '\n' ' ' | cut -c1-300)
  echo "$name rc=$rc $(( $(date +%s) - start ))s | $last" >> "$SUM"
  if [ -n "$(git status --short)" ]; then echo "!! tree not clean after $name: $(git status --short | tr '\n' ' ')" >> "$SUM"; fi
}
for job in "$@"; do
  case "$job" in
    tsc) run tsc npx tsc --noEmit ;;
    *) run "$job" npm run "$job" ;;
  esac
done
echo "== done $(date -u +%FT%TZ)" >> "$SUM"
