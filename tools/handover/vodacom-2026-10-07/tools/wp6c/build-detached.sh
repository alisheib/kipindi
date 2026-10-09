#!/usr/bin/env bash
# One production build under the heavy lock, detached: build-detached.sh <log>; writes <log>.done with the exit code.
LOG="$1"
cd /c/kipindi-journey || exit 2
~/heavy-node-lock.sh run s6-wp6c-build bash -c 'rm -rf .next && npx next build' > "$LOG" 2>&1
echo "exit=$?" > "$LOG.done"
