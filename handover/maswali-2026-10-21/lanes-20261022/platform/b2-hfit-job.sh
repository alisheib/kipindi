#!/usr/bin/env bash
# Batch 2 · 4 (from the tree, KP_BASE set by mln-server-run.sh): red:journey-header-fit, alone, as its header asks; then
# the byte check of the file it rewrites (round 1's Run F recipe).
set -u
echo "== red:journey-header-fit --alone (rewrites src/app/globals.css, restores it; budget 1800 s)"
node scripts/journey-header-fit-red.mjs --alone; echo "rc=$? :: red:journey-header-fit"
git diff --stat --exit-code -- src/app/globals.css; echo "rc=$? :: globals.css byte-identical after the harness"
git status --short; echo "rc=$? :: git status after the header-fit twin"
