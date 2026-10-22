#!/usr/bin/env bash
# Item 5 · the S17 rush with MB-97 (S7-F9 17 + 18 at the target), measured on ONE machine, one run after the other:
#   1. the BASELINE — the harness at 66ec6e9be (S7-F9 16: no MB-97 load; the product code is the same as the target's),
#      in a worktree sharing this tree's node_modules, with ONE change applied: S7-F9 18's Linux fix (the worker waits for
#      its answer to reach the pipe before it exits — without it no rush can finish on Linux; nothing it measures changes);
#   2. the HEAD — the target, MB-97's load beside the rush;
#   3. each new MB-97 identity's plant, in a short rush on the head (5 minutes: the product refuses to move a close to
#      under 6 minutes away): it must turn ITS identity red; every file restored.
. "$CI_RUN/lib.sh"
{
  echo "uname: $(uname -srm)"
  echo "cpus: $(nproc) · $(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | sed 's/^ *//')"
  free -m | sed -n '1,2p'
  grep PRETTY_NAME /etc/os-release
  echo "runner: ${RUNNER_NAME:-?} · image ${ImageOS:-?} ${ImageVersion:-?}"
} > "$OUT/machine.txt"
echo "==== the machine"; cat "$OUT/machine.txt"
step parse npx esbuild scripts/load/s17-maswali-rush.mts scripts/load/s17-maswali-rush-worker.mts --outdir=/tmp/s17-parse --format=esm --log-level=error
step rush-target npm run test:maswali-rush-target

rush_lines() {
  grep -a -E "^(PASS|FAIL|TARGET|NOT MEASURED|ALL PASS|FAILURES|RECORD|LATENCY|THE CLOSE|MB-97 —|S17 —|!!)|^  (Millionea|Up & Down|week page|a frame|one inclusion|the root|instance)" "$1" | cut -c1-420
}

BASE=66ec6e9be
git worktree add -q /tmp/s17-base "$BASE" && ln -s "$PWD/node_modules" /tmp/s17-base/node_modules
cat > /tmp/fix-from-1.txt <<'EOF'
const say = (v: unknown) => console.log(`@@RESULT ${JSON.stringify(v)}`);
EOF
cat > /tmp/fix-to-1.txt <<'EOF'
let answered: Promise<void> = Promise.resolve();
const say = (v: unknown) => {
  const line = `@@RESULT ${JSON.stringify(v)}${String.fromCharCode(10)}`;
  answered = new Promise<void>((resolve) => { process.stdout.write(line, () => resolve()); });
};
EOF
cat > /tmp/fix-from-2.txt <<'EOF'
process.exit(process.exitCode ?? 0);
EOF
cat > /tmp/fix-to-2.txt <<'EOF'
await answered;
process.exit(process.exitCode ?? 0);
EOF
node -e '
const fs = require("fs");
const [f, a1, b1, a2, b2] = process.argv.slice(1);
const t = (p) => fs.readFileSync(p, "utf8").replace(/\n$/, "");
let s = fs.readFileSync(f, "utf8");
for (const [a, b] of [[t(a1), t(b1)], [t(a2), t(b2)]]) {
  if (s.split(a).length !== 2) { console.error("BASELINE FLUSH FIX: anchor not found exactly once: " + a.slice(0, 70)); process.exit(3); }
  s = s.replace(a, () => b);
}
fs.writeFileSync(f, s);
' /tmp/s17-base/scripts/load/s17-maswali-rush-worker.mts /tmp/fix-from-1.txt /tmp/fix-to-1.txt /tmp/fix-from-2.txt /tmp/fix-to-2.txt
echo "baseline worker, the one change applied:"; git -C /tmp/s17-base diff --stat
( cd /tmp/s17-base && KP_SCRATCH_PORT=5434 npm run load:maswali-rush ) > "$OUT/rush-baseline.log" 2>&1
rc=$?
echo "rush-baseline rc=$rc" >> "$OUT/summary.txt"
echo "---- [rush-baseline] rc=$rc :: the harness at $BASE (no MB-97 load) + the Linux flush fix, this machine"
rush_lines "$OUT/rush-baseline.log"
git worktree remove --force /tmp/s17-base

npm run load:maswali-rush > "$OUT/rush-head.log" 2>&1
rc=$?
echo "rush-head rc=$rc" >> "$OUT/summary.txt"
echo "---- [rush-head] rc=$rc :: $(git rev-parse --short=9 HEAD) (MB-97's load beside the rush), this machine"
rush_lines "$OUT/rush-head.log"

# plant <name> <file> <identity> <from> <to>: the text replaced exactly once, a short rush, the identity must FAIL.
plant() {
  local name="$1" file="$2" expect="$3" from="$4" to="$5" v rc
  if ! node -e 'const fs=require("fs");const [f,a,b]=process.argv.slice(1);const s=fs.readFileSync(f,"utf8");if(s.split(a).length!==2){console.error("PLANT ANCHOR NOT FOUND EXACTLY ONCE: "+a.slice(0,80));process.exit(3)}fs.writeFileSync(f,s.replace(a,()=>b))' "$file" "$from" "$to"; then
    echo "PLANT $name NOT APPLIED"; echo "plant-$name NOT-APPLIED" >> "$OUT/summary.txt"; LIB_FAILED=1; return
  fi
  git diff --stat -- "$file"
  env RUSH_TEST_REFERENCE_PER_MIN=10 RUSH_MINUTES=5 RUSH_AFTER_CLOSE_SEC=30 npm run load:maswali-rush > "$OUT/plant-$name.log" 2>&1
  rc=$?
  if grep -a -q "^FAIL $expect " "$OUT/plant-$name.log"; then v=CAUGHT; else v=MISSED; LIB_FAILED=1; fi
  echo "PLANT $name $v by $expect (rush rc=$rc)"
  echo "plant-$name $v by $expect rc=$rc" >> "$OUT/summary.txt"
  grep -a -E "^(FAIL|NOT MEASURED|ALL PASS|FAILURES|!!)" "$OUT/plant-$name.log" | cut -c1-320 | head -10
  plant_check "plant-$name" "$file" || LIB_FAILED=1
}
plant coalesce src/lib/server/maswali-pool-feed.ts 3.3 "    if (pending.has(key)) return;" "    // PLANT: every note its own frame"
plant fanout src/lib/server/millionea-preview.ts 3.2 'if (ok) send(JSON.stringify({ type: "maswali:pool", data }));' 'if (ok && userId) send(JSON.stringify({ type: "maswali:pool", data }));'
plant ahead src/lib/server/maswali-player.ts 3.4 "carryFromCode, sales, floor," "carryFromCode, sales: sales + 500, floor,"
plant proof src/lib/maswali-commitment.ts 4.1 "return { ticketId, leaf: s[index].leaf, index, size: s.length, path };" "return { ticketId, leaf: s[index].leaf, index, size: s.length, path: [...path].reverse() };"
plant hubweek src/lib/server/maswali-player.ts 3.1 "week: lead ? await hubWeekOf(lead, viewer, nowMs, paused) : null," "week: null,"
finish
