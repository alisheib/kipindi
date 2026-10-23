#!/usr/bin/env bash
# cleanup-trees.sh — remove the stale Maswali lane worktrees on OMEGA (every one audited clean and pushed on 2026-10-23
# 07:10 UTC). A JUNCTIONED node_modules is unlinked FIRST (rmdir on the link only), so deleting the tree can never follow
# the link into the tree it points at. Kept: maswali-coord-20261019 (merge), kipindi-mln-gate (gates), kipindi-mln-par
# (parity harness), kipindi-mln-int (S6) and maswali-s7-integrate-20261019 (S7).
set -u
cd /c/50pick-ssd/maswali-coord-20261019 || exit 9
for t in kipindi-mln-adm kipindi-mln-ddoor kipindi-mln-dhub kipindi-mln-dreg kipindi-mln-dslp kipindi-mln-dtkt kipindi-mln-fplt \
         kipindi-mln-fply kipindi-mln-fsrv kipindi-mln-not kipindi-mln-rep kipindi-mln-pbase kipindi-mln-rb maswali-s7-red-20261021; do
  p="C:/50pick-ssd/$t"
  [ -d "$p" ] || { echo "$t: gone already"; continue; }
  if [ -n "$(git -C "$p" status --short 2>/dev/null)" ]; then echo "$t: NOT CLEAN — kept"; continue; fi
  if [ -L "$p/node_modules" ] || powershell -NoProfile -Command "if ((Get-Item '$p/node_modules' -Force -ErrorAction SilentlyContinue).Attributes -band [IO.FileAttributes]::ReparsePoint) { exit 0 } else { exit 1 }"; then
    cmd //c rmdir "$(cygpath -w "$p/node_modules")" && echo "$t: junction unlinked"
  fi
  if git worktree remove --force "$p" 2>/tmp/wt-err.txt; then echo "$t: removed"; else echo "$t: git worktree remove failed: $(head -2 /tmp/wt-err.txt)"; fi
done
git worktree prune
echo "== remaining worktrees:"; git worktree list
