#!/usr/bin/env bash
# WP12 lock turn A2 (asheib-c5): WP12 REBASED onto main b6652201 over the db:scratch fix (da35f89c, branch wp12-rb).
# Turn A ran on ec4734af (WP12 on 012cccbc) with the OLD sweep: twelve database suites of test:all failed to start their
# cluster ("gave no reason"), and red:all's database harnesses ran on port 5433 with orphans cleared by a stand-in watcher
# from 16:17Z. This turn: typecheck, test:all with the database suites (5471), then every harness turn A's red:all failed,
# again (not the long house-bot drives: turn G) through red-all.mjs --filter with room (5471), and a census of postgres processes after each database step - with
# the fix in the tree no orphan may be left behind. The tree's fingerprint is read before, between and after.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wa2-chain.log"; WT="kipindi-wp12"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wa2-chain.done"
. "$S/chain-lib.sh"
wait_done wb-chain.done
# WP12 is pushed by hand between B and this turn, and wp12-rb is rebuilt as main + the db:scratch fix; the operator
# writes runs/wp12-pushed.done (exit=0) when both are done — only then does this turn move the branch and queue.
wait_done wp12-pushed.done
cd /f/kipindi-wp12 || { note "no worktree"; echo "exit=2" > "$R/wa2-chain.done"; exit 2; }
# Turn A's red:all had timed-out harnesses running on beside later ones (red:all's Windows timeout), so its tree may come
# back changed. Never clean it here (a `git clean` could take the node_modules junction): WAIT for the operator to put
# it back from git — it is fully committed — and go on once it is clean, for up to two hours.
w=0
until [ -z "$(git status --porcelain)" ] || [ $w -ge 7200 ]; do
  [ $((w % 600)) -eq 0 ] && { note "kipindi-wp12 is not clean — waiting for it to be put back from git:"; git status --short | head -8 >> "$LOG"; }
  sleep 30; w=$((w + 30))
done
if [ -n "$(git status --porcelain)" ]; then note "STOP: kipindi-wp12 still not clean after 2 h"; echo "exit=2" > "$R/wa2-chain.done"; exit 2; fi
git checkout -q -B vodacom-wp12 wp12-rb && note "vodacom-wp12 moved to $(git rev-parse --short HEAD) (main $(git rev-parse --short origin/main), the fix $(git log --format=%h -1 --grep='^fix(db-scratch)' HEAD))"
. "$S/kp-lock.sh"
take_lock "wa2-chain: WP12 rebased - typecheck, test:all with the DB suites, turn A's red failures again, ~60 min" || { echo "exit=5" > "$R/wa2-chain.done"; exit 5; }
trap release EXIT
census() {  # postgres processes alive now, and which of them are orphans (parent gone)
  powershell -NoProfile -ExecutionPolicy Bypass -File "$S/dbfix/census.ps1" 2>&1 | tr -d '\r'
}
T0=$(fp_of kipindi-wp12)
note "tree $(git rev-parse --short HEAD), fingerprint $T0 · census: $(census)"

timeout 1800 npx tsc --noEmit > "$R/wa2-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wa2-typecheck.log") error(s)"

env KP_SCRATCH_PORT=5471 node scripts/test-all.mjs --skip responsive,motion > "$R/wa2-battery.log" 2>&1
note "battery exit=$? — $(sed 's/\x1b\[[0-9;]*m//g' "$R/wa2-battery.log" | grep -E 'green ·|FAILED:' | tr '\n' ' ' | cut -c1-1200)"
note "  sweeps reported by db:scratch: $(grep -c 'swept [0-9]* lingering' "$R/wa2-battery.log") · retries: $(grep -c 'cleared [0-9]* orphaned' "$R/wa2-battery.log") · 'gave no reason': $(grep -c 'gave no reason' "$R/wa2-battery.log")"
note "  census after the battery: $(census)"
note "fingerprint after the battery: $(fp_of kipindi-wp12)"

# ⭐ THE BATTERY'S CONTROL: every suite test:all failed runs ALONE here and ALONE on main (kipindi-a8i2, real node_modules,
# detached at origin/main) — alone, because test:all runs eight at a time and a timing suite can fail for the company
# it keeps. A suite that fails on WP12 and passes on main is WP12's to answer for; one that fails on both is main's.
TFAIL=$(sed 's/\x1b\[[0-9;]*m//g' "$R/wa2-battery.log" | grep -E 'FAILED:' | tail -1 | sed 's/.*FAILED: *//' | tr ',' '\n' | sed 's/^ *//; s/ *$//' | grep '^test:')
if [ -n "$TFAIL" ]; then
  A8I2_OK=0
  git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach origin/main && A8I2_OK=1
  note "the battery's control: $(echo $TFAIL | wc -w) suite(s), alone on WP12 and on main $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (a8i2 ready: $A8I2_OK)"
  for t in $TFAIL; do
    n=${t#test:}
    ( env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" > "$R/wa2-alone-$n.log" 2>&1 ); e1=$?
    e2=-
    if [ $A8I2_OK = 1 ]; then ( cd /f/kipindi-a8i2 && env KP_SCRATCH_PORT=5471 FORCE_COLOR=0 timeout 1800 npm run -s "$t" > "$R/wa2-main-$n.log" 2>&1 ); e2=$?; fi
    note "  $t alone: WP12 exit=$e1 · main exit=$e2$([ "$e1" != 0 ] && [ "$e2" = 0 ] && echo '   ⛔ WP12 ONLY')"
  done
  note "  census after the alone runs: $(census) · a8i2 $(git -C /f/kipindi-a8i2 diff --quiet && echo clean || echo CHANGED) · wp12 fingerprint $(fp_of kipindi-wp12)"
fi

# Turn A's red:all: FAIL and DIRTY harnesses again — but not the long house-bot drives. Those run past red:all's 300 s on
# this PC (red:house-bot-c5's own header: ~45 min; console: 484 cases), and red:all's timeout kills npm but NOT the
# harness's node child on Windows, so a timed-out drive runs on BESIDE the next harness, mutating files: in turn A the
# console drive (TIME at 16:19Z) made red:house-bot-c5 refuse (a target off HEAD) and red:agent-policy read DIRTY (its
# zz-ruling-513 control file) until it was stopped through its console-stop status at 16:31Z. They measure house-bot
# files WP12 does not touch; they are queued after WP12 (turn G) with room to finish. TIME rows are never re-run here.
LONG="house-bot-engine house-bot-money house-bot-c5 house-bot-console dal-parity"
ALLBAD=$(sed 's/\x1b\[[0-9;]*m//g' "$R/wa-redall.log" | awk '($1=="FAIL" || $1=="DIRTY" || $1=="TIME") && $2 ~ /^red:/ {sub(/^red:/,"",$2); print $1" "$2}' | sort -u)
note "turn A's red:all, not passed: $(echo "$ALLBAD" | tr '\n' ';')"
FAILED=$(echo "$ALLBAD" | awk -v long=" $LONG " '($1=="FAIL" || $1=="DIRTY") && index(long, " "$2" ")==0 {print $2}' | sort -u | paste -sd, -)
note "again here: ${FAILED:-none} · left to turn G: $(echo "$ALLBAD" | awk -v long=" $LONG " '$1=="TIME" || index(long, " "$2" ")>0 {print $2}' | sort -u | paste -sd, -)"
if [ -n "$FAILED" ]; then
  # --timeout 1800: a harness given room never outlives the runner, so no two ever mutate at once
  env KP_SCRATCH_PORT=5471 node scripts/red-all.mjs --filter "$FAILED" --skip results-filter,header-fit --timeout 1800 > "$R/wa2-reds.log" 2>&1
  note "reds again exit=$? — $(sed 's/\x1b\[[0-9;]*m//g' "$R/wa2-reds.log" | grep -E '^\s+(PASS|FAIL|TIME|DIRTY)' | awk '{print $1, $2, $3}' | tr '\n' ';' | cut -c1-1500)"
  note "  census after the reds: $(census)"
  # ⭐ THE CONTROL: whatever still fails on WP12 runs on main alone (kipindi-a8i2, real node_modules, detached at
  # origin/main), so a failure is named main's or WP12's by measurement, not by reading the diff.
  STILL=$(sed 's/\x1b\[[0-9;]*m//g' "$R/wa2-reds.log" | awk '($1=="FAIL" || $1=="DIRTY" || $1=="TIME") && $2 ~ /^red:/ {sub(/^red:/,"",$2); print $2}' | sort -u | paste -sd, -)
  if [ -n "$STILL" ]; then
    if git -C /f/kipindi-a8i2 diff --quiet && git -C /f/kipindi-a8i2 checkout -q --detach origin/main; then
      note "the control on main $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) in kipindi-a8i2: $STILL"
      ( cd /f/kipindi-a8i2 && env KP_SCRATCH_PORT=5471 node scripts/red-all.mjs --filter "$STILL" --skip results-filter,header-fit --timeout 1800 ) > "$R/wa2-reds-main.log" 2>&1
      note "  on main: $(sed 's/\x1b\[[0-9;]*m//g' "$R/wa2-reds-main.log" | grep -E '^\s+(PASS|FAIL|TIME|DIRTY)' | awk '{print $1, $2, $3}' | tr '\n' ';' | cut -c1-1500)"
      git -C /f/kipindi-a8i2 diff --quiet && note "  kipindi-a8i2 clean after the control" || { note "  ⛔ kipindi-a8i2 CHANGED by the control:"; git -C /f/kipindi-a8i2 status --short | head -8 >> "$LOG"; }
    else
      note "  the control could not run: kipindi-a8i2 has tracked changes or could not detach"
    fi
  fi
fi
T1=$(fp_of kipindi-wp12)
note "fingerprint at the end: $T1 — tree $([ "$T0" = "$T1" ] && echo same || echo CHANGED)"
[ "$T0" = "$T1" ] || git status --short >> "$LOG"
note "chain end"
echo "exit=0" > "$R/wa2-chain.done"
