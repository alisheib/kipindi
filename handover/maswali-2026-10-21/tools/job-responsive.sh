#!/usr/bin/env bash
# job-responsive.sh — the server-bound `test:responsive` the S5 render jobs never ran (lead asheib-f3, 2026-10-22).
# Runs from the tree (cwd) with BASE and LOGBASE set by $S/mln-server-run.sh, in all three languages (AGENTS §7:
# Swahili is the longest; the overlays stay en by the suite's own rule). Its screenshots are READ afterwards, tile by
# tile — a green suite is not a readable screen.
all=0
echo "== test:responsive (LOCALES=en,sw,zh) on $BASE"
LOCALES=en,sw,zh node scripts/responsive-audit.mjs > "$LOGBASE-responsive.txt" 2>&1; rc=$?
grep -E "FAIL|✗|passed|failed|overflow|clipped" "$LOGBASE-responsive.txt" | tail -25
echo "responsive rc=$rc"; [ $rc -ne 0 ] && all=1
exit $all
