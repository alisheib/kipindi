#!/usr/bin/env bash
# DIAGNOSTIC ONLY. Proves the EDITED orphan gate inputs still fail the way they should, on a scratchpad COPY of
# scripts/ + package.json (the worktree is never touched):
#   A. the edited tree as-is                                     -> exit 1, exactly the three panels/ files
#   B. a brand-new unreferenced script                           -> exit 1, named UNDECLARED
#   C. an allowlist entry for something that IS reachable        -> exit 1, named "no longer orphaned"
#   D. a wired script whose package.json line is removed again   -> exit 1, named UNDECLARED   (proves the wiring is what clears it)
#   E. panels/ out of scripts/  (what the owner's decision would do) -> exit 0
S="/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/triage-3suites"
D="$S/prove-or"
fresh() { rm -rf "$D"; mkdir -p "$D"; cp -r /f/kipindi-rot2/scripts "$D/scripts"; cp /f/kipindi-rot2/package.json "$D/package.json"; }
run() { (cd "$D" && node scripts/orphan-scripts.mjs > out.txt 2> err.txt; echo $?); }
undecl() { grep -E "^     ✗" "$D/out.txt" | sed 's/^     ✗ //' | tr '\n' ' '; }

fresh
echo "A. edited tree as-is:                         exit=$(run)   undeclared: $(undecl)"

fresh
printf '// a brand-new script nothing runs\nconsole.log("planted");\n' > "$D/scripts/zz-planted-orphan.mjs"
echo "B. planted unreferenced script:               exit=$(run)   undeclared: $(undecl)"

fresh
node -e '
const fs=require("fs"); const p=process.argv[1]; const a=JSON.parse(fs.readFileSync(p,"utf8"));
a.orphans.push("qa/landing-v3/capture.mjs"); a.orphans.sort(); fs.writeFileSync(p, JSON.stringify(a,null,2)+"\n");
' "$D/scripts/orphan-allowlist.json"
echo "C. allowlisted but reachable (capture.mjs):   exit=$(run)"; grep -A3 "no longer orphaned" "$D/out.txt" | tail -3

fresh
node -e '
const fs=require("fs"); const p=process.argv[1]; let t=fs.readFileSync(p,"utf8");
const before=t.length; t=t.split(/\r?\n/).filter(l=>!l.includes("qa:landing-v3:band-drive")).join("\r\n"); JSON.parse(t); fs.writeFileSync(p,t); console.log("(package.json: band-drive entry removed, "+(before-t.length)+" chars)");
' "$D/package.json"
echo "D. band-drive unwired again:                  exit=$(run)   undeclared: $(undecl)"

fresh
rm -rf "$D/scripts/qa/landing-v3/panels"
echo "E. panels/ moved out of scripts/:             exit=$(run)"; grep -E "orphaned|declared " "$D/out.txt" | head -3
