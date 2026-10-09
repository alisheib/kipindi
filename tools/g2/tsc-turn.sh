#!/usr/bin/env bash
# G2's one heavy step: tsc over the vodacom-visual-v2 worktree, run inside the shared lock by withlock.sh.
S=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/g2
cd /f/kipindi-v2 || exit 9
date -u +%FT%TZ > "$S/tsc.started"
npx tsc --noEmit -p . > "$S/tsc.out" 2>&1
echo $? > "$S/tsc.exit"
date -u +%FT%TZ > "$S/tsc.done"
