#!/usr/bin/env bash
# DIAGNOSTIC ONLY. Proves the declaration in licence-basis.mts is what clears 2.1 (and that 2.1 still bites),
# on a scratchpad COPY of src/ + scripts/ run with the worktree's tsx. The worktree is never touched.
S="/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/triage-3suites"
D="$S/prove-hb"
TSX="F:/kipindi-rot2/node_modules/tsx/dist/cli.mjs"
rm -rf "$D"; mkdir -p "$D"
cp -r /f/kipindi-rot2/src "$D/src"; cp -r /f/kipindi-rot2/scripts "$D/scripts"
run() { (cd "$D" && node "$TSX" scripts/house-bot-holder-lifecycle.test.mts > out.txt 2>&1; echo $?); }
line() { grep -E "^(PASS|FAIL) $1" "$D/out.txt" | cut -c1-210; }

echo "A. as edited:                                      exit=$(run)"; line "2\.1"; line "2\.2"
# B · take the declaration back out of licence-basis.mts
node -e '
const fs=require("fs"); const p=process.argv[1]; const t=fs.readFileSync(p,"utf8"); const nl=t.includes("\r\n")?"\r\n":"\n";
const L=t.split(nl); const k=L.filter(l=>!/^\/\/ (house-bot: covered by L2 sweep|hook fires; the holder sweep|accounts it creates itself)/.test(l));
console.log("removed",L.length-k.length,"declaration lines"); fs.writeFileSync(p,k.join(nl));
' "$D/scripts/marketing-consent/licence-basis.mts"
echo "B. declaration taken back out:                     exit=$(run)"; line "2\.1"
