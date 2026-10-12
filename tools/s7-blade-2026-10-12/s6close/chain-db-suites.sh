#!/usr/bin/env bash
# S6 close, the database half: put the scratch cluster's PostgreSQL binaries back (the junction incident's `npm ci`
# removed the --no-save package on 2026-10-11) and run the 17 suites test:all could not start without them, plus R8-D's
# guard after its 10.2 fix (eefc1eec). One job, under the lock; --jobs 2 as tonight's full run.
export PATH=/usr/bin:/mingw64/bin:$PATH
S=/c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/0719ce89-589d-484d-8a37-be05d46c6068/scratchpad
R=$S/r10db
note() { echo "$(date '+%H:%M:%S') $*" >> "$R/STATUS"; }
freegb() { powershell -NoProfile -Command "[math]::Round((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB,1)" | tr -d '\r'; }
J=/c/kipindi-journey
T=/c/kipindi-r10
note "start · journey at $(git -C $J rev-parse --short HEAD) · r10 at $(git -C $T rev-parse --short HEAD) · free $(freegb) GB"
git -C $J diff --quiet HEAD origin/main -- package-lock.json || { note "STOP: journey's package-lock differs from main's"; echo "exit=2" > $R/DONE; exit 2; }
[ -z "$(git -C $J status --porcelain --untracked-files=no)" ] || { note "STOP: journey worktree dirty"; echo "exit=2" > $R/DONE; exit 2; }
( cd $J && npm i -D --no-save embedded-postgres@18.3.0-beta.17 ) > $R/1-npm-i.log 2>&1; rc=$?
note "1 npm i embedded-postgres: exit $rc · $(tail -3 $R/1-npm-i.log | tr '\n' ' ' | cut -c1-160)"
git -C $J status --porcelain --untracked-files=no | head -3 >> $R/STATUS
( cd $T && node -e "console.log(require.resolve('embedded-postgres'))" ) >> $R/STATUS 2>&1 || { note "STOP: embedded-postgres not resolvable from r10"; echo "exit=3" > $R/DONE; exit 3; }
sleep 30
LIST="cashout-price-guard,results-freshness,agent-fee-expiry,contacts-import-db,contacts-staging-db,kyc-restart-docs,house-bot-migrations,house-bot-money,house-bot-caps,house-bot-designation,house-bot-engine,house-bot-comms,house-bot-info-edge,house-bot-reports,house-bot-console,house-bot-ops,visual-pass-r8d"
( cd $T && node scripts/test-all.mjs --no-tsc --jobs 2 --filter "$LIST" ) > $R/2-db-suites.log 2>&1; rc=$?
note "2 db suites: exit $rc · $(sed 's/\x1b\[[0-9;]*m//g' $R/2-db-suites.log | grep -E 'green ·|FAILED:' | tr '\n' ' ' | cut -c1-400) · free $(freegb) GB"
echo "done" > $R/DONE
