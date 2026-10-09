#!/usr/bin/env bash
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/r5i"
cd F:/kipindi-r5i || exit 1
node "$S/mutate.cjs" > "$S/mutate.log" 2>&1
echo "MUTATE exit=$?" >> "$S/mutate.log"
bash "$S/run-suites.sh" red-results red-list
