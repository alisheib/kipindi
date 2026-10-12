#!/usr/bin/env bash
# One in-process gate in the branch worktree: its log to $R/2-<gate>.log, "<gate> <exit>" appended to $R/2-gates.txt.
export PATH=/opt/node24/bin:$PATH
g="$1"
( cd "$TIP" && timeout 1800 npm run -s "$g" ) > "$R/2-$g.log" 2>&1
echo "$g $?" >> "$R/2-gates.txt"
