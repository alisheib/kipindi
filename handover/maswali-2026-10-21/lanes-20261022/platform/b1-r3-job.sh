#!/usr/bin/env bash
# R3 (journey + Millionea ACTIVE): the five-tab rail's gaps, then the ghost sequence in the journey shell. From the tree, BASE set.
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/platform
echo "== qa:journey-rail-gaps (five tabs)"; node scripts/qa-journey-rail-gaps.mjs $F/r2-rail5; echo "rc=$? :: qa:journey-rail-gaps five"
echo "== ghost sequence (journey)"; node $F/ghost-seq.mjs $F/ghost journey; echo "rc=$? :: ghost-seq journey"
exit 0
