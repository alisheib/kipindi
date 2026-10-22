#!/usr/bin/env bash
# Batch 3 · P2 (production build, Millionea ACTIVE, a classic guest): the ghost sequence, then qa:route-entrance on production CSS.
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/platform
echo "== ghost sequence (classic, production)"; node $F/ghost-seq-prod.mjs $F/ghost-prod classic; echo "rc=$? :: ghost-seq-prod classic"
echo "== qa:route-entrance (production)"; node scripts/qa-route-entrance.mjs; echo "rc=$? :: qa:route-entrance prod"
exit 0
