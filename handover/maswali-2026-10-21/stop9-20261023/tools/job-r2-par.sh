#!/usr/bin/env bash
# job-r2-par.sh base <mainsha> | compare <candsha> — classic parity for round 2 with the harness both commits carry
# byte-identical (scripts/qa-classic-shell-parity.mjs). base: a FRESH baseline of what production serves (main), in the
# parity tree, plus a null compare on a second server of the same tree. compare: the candidate (gate tree) against it,
# --allow-base. Every difference must be a NAMED classic change.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
F="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad"
MODE="$1"; SHA="$2"; BASESHA="${3:-$2}"; OUT="$F/lead/r2gate/parity"; mkdir -p "$OUT"; SUM="$OUT/summary.txt"
BASEFILE="$OUT/parity-main-${BASESHA:0:9}.json"
note() { echo "$(date -u +%T) $*" | tee -a "$SUM"; }
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
if [ "$MODE" = base ]; then TREE=kipindi-mln-par; PORT=3597; else TREE=kipindi-mln-gate; PORT=3596; fi
cd "/c/50pick-ssd/$TREE" || exit 9
[ -n "$(git status --short)" ] && { note "$TREE not clean"; exit 8; }
git fetch -q origin && git checkout -q --detach "$SHA" || exit 8
note "== parity $MODE in $TREE at $(git rev-parse --short=9 HEAD)"
H="C:/50pick-ssd/$TREE/scripts/qa-classic-shell-parity.mjs"
step() { local name="$1"; shift
  bash "$S/mln-server-run.sh" "$TREE" "$PORT" "$OUT/$name.log" -- env KP_TREE="C:/50pick-ssd/$TREE" node "$H" "$@"
  note "$name exit=$(cat "$OUT/$name.log.done" 2>/dev/null) :: $(grep -E 'passed —|baseline written|REFUSED|differ' "$OUT/$name.log" | tail -2 | tr '\n' ' ' | cut -c1-300)"; }
if [ "$MODE" = base ]; then
  step baseline --baseline "$BASEFILE"
  step null-compare --compare "$BASEFILE"
else
  [ -f "$BASEFILE" ] || { note "no baseline yet"; exit 2; }
  step compare --compare "$BASEFILE" --allow-base
fi
note "== $MODE done; tree after: $(git status --short | tr '\n' ' ')"
