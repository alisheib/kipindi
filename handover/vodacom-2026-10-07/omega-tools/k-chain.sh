#!/usr/bin/env bash
# One heavy-lock turn (asheib-c5, 2026-10-07), its own queue place and lock for the whole chain:
#   A · A8j's owed WebKit proof: the drive (its sleeping page now in a fresh context) on the A8j tree, then its WebKit
#       control on the tree before A8j (F:/kipindi-a8i2 = 586c5183); then the final drive in Chromium and Firefox.
#   B · S6's three owed close-out items on main (F:/kipindi-a8i2 detached to the A8j worktree's HEAD): the `lost` result
#       drive, the crash control (the host's guard stripped and restored inside this one lock turn), and a production
#       build read by first-load-parts.
# Every step logs to runs/k-*.log; the chain's own summary is runs/k-chain.log, and runs/k-chain.done marks its end.
set -u
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
R="$S/runs"; LOG="$R/k-chain.log"; WT="k-chain"
mkdir -p "$R"; : > "$LOG"; rm -f "$R/k-chain.done"
note() { echo "$(date -u +%T) $*" >> "$LOG"; }
. "$S/kp-lock.sh"
A8J=$(git -C /f/kipindi-a8j rev-parse --short HEAD)
take_lock "k-chain: A8j WebKit runs + S6 close-out (drives, crash control, build), ~30 min" || { echo "exit=5" > "$R/k-chain.done"; exit 5; }
restore_shell() {
  if ! git -C /f/kipindi-a8i2 diff --quiet -- src/components/layout/shell-lazy.tsx; then
    git -C /f/kipindi-a8i2 checkout -- src/components/layout/shell-lazy.tsx && note "shell-lazy.tsx restored by git checkout"
  fi
}
finish() { restore_shell; release; }
trap finish EXIT
run() { # run <worktree> <port> <name> <command...>
  local wt="$1" port="$2" name="$3"; shift 3
  rm -f "$R/$name.log" "$R/$name.log.done" "$R/$name.log.server"
  KP_NO_LOCK=1 bash "$S/kp-with-server.sh" "$wt" "$port" "$R/$name.log" "$@"
  note "$name: $(cat "$R/$name.log.done" 2>/dev/null) — $(grep -E "IMPLICIT SUBMIT \(drive|REFUSED|never came up|^(PASS|FAIL) " "$R/$name.log" | tail -4 | tr '\n' ' ' | cut -c1-500)"
}

[ "$(git -C /f/kipindi-a8i2 rev-parse --short HEAD)" = "586c5183" ] || { note "STOP: kipindi-a8i2 is not at 586c5183"; echo "exit=2" > "$R/k-chain.done"; exit 2; }
git -C /f/kipindi-a8i2 diff --quiet || { note "STOP: kipindi-a8i2 has tracked changes"; echo "exit=2" > "$R/k-chain.done"; exit 2; }
note "chain start: A8j tree $A8J, control tree 586c5183"

# A · A8j
run kipindi-a8j 3073 k-webkit env ENGINE=webkit node scripts/qa-implicit-submit.mjs
run kipindi-a8i2 3071 k-ctl-webkit env ENGINE=webkit node F:/kipindi-a8j/scripts/qa-implicit-submit.mjs
run kipindi-a8j 3073 k-chromium env ENGINE=chromium node scripts/qa-implicit-submit.mjs
run kipindi-a8j 3073 k-firefox env ENGINE=firefox node scripts/qa-implicit-submit.mjs

# B · the close-out, on main
git -C /f/kipindi-a8i2 checkout -q --detach "$A8J" || { note "STOP: could not detach kipindi-a8i2 to $A8J"; echo "exit=2" > "$R/k-chain.done"; exit 2; }
note "kipindi-a8i2 now at $(git -C /f/kipindi-a8i2 rev-parse --short HEAD) (detached)"
rm -rf "$R/out-lost" "$R/out-crash"; mkdir -p "$R/out-lost" "$R/out-crash"
run kipindi-a8i2 3071 k-lost node "$S/closeout/result-drive.mjs" "$R/out-lost" lost
if node "$S/closeout/crash-edit.mjs" strip >> "$LOG" 2>&1; then
  run kipindi-a8i2 3071 k-crash node "$S/closeout/result-drive.mjs" "$R/out-crash" expect-crash
  node "$S/closeout/crash-edit.mjs" restore >> "$LOG" 2>&1
  restore_shell
else
  note "crash control NOT run: the strip refused"
fi
if git -C /f/kipindi-a8i2 diff --quiet; then note "kipindi-a8i2 clean after the crash control"; else note "⛔ kipindi-a8i2 NOT clean: $(git -C /f/kipindi-a8i2 status --short | head -3 | tr '\n' ' ')"; fi

free=$(powershell -NoProfile -Command "[int]((Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory/1MB)" | tr -dc "0-9")
note "free memory before the build: ${free:-?} GB"
if [ "${free:-0}" -ge 5 ]; then
  ( cd /f/kipindi-a8i2 && rm -rf .next && env -u DATABASE_URL SESSION_SECRET=omega-a8i2-local-secret-0123456789abcdef OTP_PEPPER=omega-a8i2-pepper-0123 npx next build ) > "$R/k-build.log" 2>&1
  brc=$?
  note "build: exit=$brc — $(grep -E "Compiled|Failed|rror" "$R/k-build.log" | tail -2 | tr '\n' ' ' | cut -c1-240)"
  if [ $brc -eq 0 ]; then
    node "$S/closeout/first-load-parts.mjs" F:/kipindi-a8i2 / /markets /positions /help > "$R/k-flp.log" 2>&1
    note "first-load-parts: exit=$? — $(tail -4 "$R/k-flp.log" | tr '\n' ' ' | cut -c1-500)"
  fi
else
  note "build NOT run: under 5 GB free"
fi
note "chain end"
echo "exit=0" > "$R/k-chain.done"
