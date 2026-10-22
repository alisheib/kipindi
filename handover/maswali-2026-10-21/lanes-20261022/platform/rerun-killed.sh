#!/usr/bin/env bash
# Re-run every sweep-2 script that was killed (rc=4294967295) by a server stop, one at a time, nothing else running.
F=C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/platform
grep "rc=4294967295" $F/sw2-summary.txt | awk '{print $1}' > $F/sw2-killed.txt
rm -f $F/sw2b-summary.txt
node $F/sweep.mjs $F/sw2-killed.txt $F/sw2b $F/sw2b-summary.txt 1 serial
