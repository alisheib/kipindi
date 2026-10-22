#!/usr/bin/env bash
# S7 lane · one typecheck of the merge tree, through the S7 slot helper. Usage: bash job-tsc.sh <log>
LOG="$1"
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/408dbc60-fcd0-43af-899c-8602858935b5/scratchpad"
cd C:/50pick-ssd/maswali-s7-integrate-20261019 || exit 2
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
{
  echo "tsc at $(git rev-parse --short HEAD) (+ staged merge) $(date -u +%FT%TZ)"
  bash "$S/mln-slot-s7c.sh" s7 npx tsc --noEmit
  echo "tsc exit=$?"
} > "$LOG" 2>&1
