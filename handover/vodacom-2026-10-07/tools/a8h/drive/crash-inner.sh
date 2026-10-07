S=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0cb4430f-1841-4f87-b929-7c29d30c9a10/scratchpad/s6
LOG="$1"
cd /c/kipindi-journey || exit 2
if ! git diff --quiet -- src/components/layout/shell-lazy.tsx; then echo "REFUSED: shell-lazy.tsx is not the commit's" >> "$LOG"; exit 5; fi
python $S/a8h/drive/crash-edit.py strip >> "$LOG" 2>&1 || exit 6
bash $S/run-with-server.sh "$LOG" node $S/a8h/drive/result-drive.mjs $S/a8h/drive/out-crash expect-crash
RC=$?
python $S/a8h/drive/crash-edit.py restore >> "$LOG" 2>&1
if git diff --quiet -- src/components/layout/shell-lazy.tsx; then echo "restored: shell-lazy.tsx is the commit's again" >> "$LOG"
else echo "⛔ NOT RESTORED: shell-lazy.tsx differs from the commit — restoring with git checkout" >> "$LOG"; git checkout -- src/components/layout/shell-lazy.tsx; fi
exit $RC
