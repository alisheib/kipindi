#!/usr/bin/env bash
# run-light.sh <label> <test-file...> — runs each static suite with tsx from the slip worktree, keeps each log under
# $F/slip/logs/<label>/, prints the FAIL lines and the summary (last 2 lines) of each.
set -u
LABEL=$1; shift
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/slip
mkdir -p "$F/logs/$LABEL"
cd C:/50pick-ssd/kipindi-mln-dslp || exit 3
export TEMP='C:\50pick-ssd\tmp' TMP='C:\50pick-ssd\tmp'
# The local dummies mln-server-run.sh gives every dev server (never a real secret): suites that sign a cookie need one.
export SESSION_SECRET=omega-mln-local-secret-0123456789abcdef0123 OTP_PEPPER=omega-mln-pepper-0123456
for f in "$@"; do
  name=$(basename "$f" .test.mts)
  name=$(basename "$name" .mts)
  log="$F/logs/$LABEL/$name.log"
  npx tsx "$f" > "$log" 2>&1
  rc=$?
  echo "=== $name rc=$rc"
  grep -E "FAIL|✗|not ok" "$log" | head -12
  tail -2 "$log"
done
