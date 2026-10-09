#!/usr/bin/env bash
# Runs INSIDE the shared heavy-job lock (withlock.sh holds it for the duration). Type-checks F:/kipindi-tleft only.
# Read-only on the source tree: tsc --noEmit writes just the gitignored tsconfig.tsbuildinfo.
# The log records which tree was checked (HEAD + a hash of `git diff`), so the result can be tied to the exact edit.
SP=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad
LOG="$SP/tleft-tsc.log"
cd /f/kipindi-tleft || { echo "exit=2 (no worktree)" > "$SP/tleft-tsc.done"; exit 2; }
echo "start $(date -u +%FT%TZ) head=$(git rev-parse --short HEAD) changed_files=$(git status --short | wc -l) diff_sha256=$(git diff | sha256sum | cut -c1-16)" > "$LOG"
timeout 1500 npx tsc --noEmit -p . >> "$LOG" 2>&1
RC=$?
echo "end   $(date -u +%FT%TZ) exit=$RC errors=$(grep -c 'error TS' "$LOG") diff_sha256=$(git diff | sha256sum | cut -c1-16)" >> "$LOG"
echo "exit=$RC" > "$SP/tleft-tsc.done"
exit $RC
