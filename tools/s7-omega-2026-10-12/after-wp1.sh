#!/usr/bin/env bash
# Starts WP2's proof chain only once WP1's calibration is done AND its null compare exited 0; the lock helper then
# waits for the lock WP1's chain releases. Usage: bash after-wp1.sh
export PATH=/usr/bin:/mingw64/bin:$PATH
S=/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/ac776495-2d6d-4c28-8534-f93a90c6f786/scratchpad
R1=$S/s7/wp1cal
until [ -f "$R1/DONE" ]; do sleep 15; done
if [ "$(cat "$R1/3-null.code" 2>/dev/null)" != "0" ]; then
  echo "NOT STARTED: WP1's chain ended '$(cat "$R1/DONE")', null compare code '$(cat "$R1/3-null.code" 2>/dev/null)'"
  exit 1
fi
echo "WP1 null compare exit 0 - starting WP2's proof chain under the lock at $(date +%T)"
cd /f/kipindi-s7b && LOCK_ME=vodacom-s7 bash /f/kipindi-locks/withlock.sh wp2-proof bash "$S/s7/chain-wp2.sh" 8e2729d0c 090bbf76b "$R1/parity-v3-090bbf76.json"
echo "WP2 chain exit $? at $(date +%T)"
cat "$S/s7/wp2proof/STATUS" 2>/dev/null
