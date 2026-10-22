#!/usr/bin/env bash
# R4 (Millionea ACTIVE, classic shell): D13's break nav, then the ghost sequence in the classic shell. From the tree, BASE set.
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/platform
echo "== qa:millionea-break-nav (D13)"; node scripts/qa-millionea-break-nav.mjs $F/r2-d13; echo "rc=$? :: qa:millionea-break-nav"
echo "== ghost sequence (classic)"; node $F/ghost-seq.mjs $F/ghost classic; echo "rc=$? :: ghost-seq classic"
exit 0
