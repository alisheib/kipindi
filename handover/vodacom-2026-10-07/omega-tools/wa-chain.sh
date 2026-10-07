#!/usr/bin/env bash
# WP12 lock turn A (asheib-c5): in F:/kipindi-wp12 (WP12 committed; no server) — typecheck, test:all with the database
# suites (scratch Postgres on 5471), then red:all --skip results-filter,header-fit. The tree's fingerprint (status with
# untracked files + a hash of the diff against HEAD) is read before, between and after: every red restores what it plants.
# Starts queuing only once the k-chain has ended, so a session that queued meanwhile goes first.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/wa-chain.log"; WT="kipindi-wp12"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/wa-chain.done"
note() { echo "$(date -u +%T) $*" >> "$LOG"; }
note "waiting for the k-chain to end"
until [ -f "$R/k-chain.done" ]; do sleep 30; done
. "$S/kp-lock.sh"
# 2026-10-07 ~12:35Z, agreed with money doors (asheib-0b): their release (Ali is waiting on it) takes the slot after
# marketing's drives2, and they write OUR wait note when they take the lock. So stand back until the lock is theirs or
# the note is ours (3 h at most, then queue as usual).
md=0
until [ "$(first_word "$LOCK/owner")" = "money-doors-0e" ] || [ "$(first_word "$WAITF")" = "$ME" ] || [ $md -ge 10800 ]; do sleep 30; md=$((md + 30)); done
note "standing back over: lock $(head -c 60 "$LOCK/owner" 2>/dev/null) · note $(head -c 60 "$WAITF" 2>/dev/null) (${md}s)"
take_lock "wa-chain: WP12 typecheck + test:all (db suites) + red:all, ~90 min" || { echo "exit=5" > "$R/wa-chain.done"; exit 5; }
trap release EXIT
cd /f/kipindi-wp12 || { note "no worktree"; echo "exit=2" > "$R/wa-chain.done"; exit 2; }
fp() { { git status --porcelain --untracked-files=all; git diff HEAD --binary | sha1sum; } | sha1sum | cut -c1-12; }
T0=$(fp)
note "WP12 tree at $(git rev-parse --short HEAD), fingerprint $T0, clean: $([ -z "$(git status --porcelain)" ] && echo yes || echo NO)"

timeout 1800 npx tsc --noEmit > "$R/wa-typecheck.log" 2>&1
note "typecheck exit=$? — $(grep -c 'error TS' "$R/wa-typecheck.log") error(s)"

env KP_SCRATCH_PORT=5471 node scripts/test-all.mjs --skip responsive,motion > "$R/wa-battery.log" 2>&1
note "battery exit=$? — $(sed 's/\x1b\[[0-9;]*m//g' "$R/wa-battery.log" | grep -E 'green ·|FAILED:' | tr '\n' ' ' | cut -c1-1200)"
note "fingerprint after the battery: $(fp)"

node scripts/red-all.mjs --skip results-filter,header-fit > "$R/wa-redall.log" 2>&1
note "red:all exit=$? — $(sed 's/\x1b\[[0-9;]*m//g' "$R/wa-redall.log" | grep -v '^\s*$' | tail -4 | tr '\n' ' ' | cut -c1-900)"
T1=$(fp)
note "fingerprint after red:all: $T1 — tree $([ "$T0" = "$T1" ] && echo same || echo CHANGED)"
[ "$T0" = "$T1" ] || git status --short >> "$LOG"
note "chain end"
echo "exit=0" > "$R/wa-chain.done"
