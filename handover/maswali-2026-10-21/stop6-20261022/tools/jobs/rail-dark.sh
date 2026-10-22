#!/usr/bin/env bash
# qa:classic-rail RAIL=dark (production's configuration) and qa:hover-touch on this tree, each on a fresh server —
# the same drives as the round-2 batch, to tell a tree's own result from the runner's.
. "$CI_RUN/lib.sh"
if [ -f scripts/qa-classic-rail.mjs ]; then
  step rail-dark serve 3501 -- env RAIL=dark node scripts/qa-classic-rail.mjs "$OUT/rail-dark"
else
  echo "no qa-classic-rail.mjs on this tree"
fi
if [ -f scripts/qa-hover-touch.mjs ]; then
  step hover-touch serve 3514 -- node scripts/qa-hover-touch.mjs
fi
finish
