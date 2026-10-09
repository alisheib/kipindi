#!/usr/bin/env bash
# R5-C merged onto R5-B + R5-D (F:/kipindi-vis, staged): every suite that reads a file the merge touches, the three
# rounds' own lists, the required ones, the red twins of the moved anchors — then the 59-plant mutation proof.
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
OUT="$S/r5c/merge-results.txt"; L="$S/r5c/logs-merge"; mkdir -p "$L"; : > "$OUT"
cd F:/kipindi-vis || exit 1
node -e '
const fs=require("fs"),path=require("path"),cp=require("child_process");
const changed=cp.execSync("git diff --cached --name-only",{encoding:"utf8"}).split("\n").filter(Boolean).filter(f=>f.startsWith("src/"));
const scripts=Object.entries(JSON.parse(fs.readFileSync("package.json","utf8")).scripts);
const files=fs.readdirSync("scripts").filter(n=>/\.(mts|mjs|ts|js|cjs)$/.test(n));
const lib=fs.existsSync("scripts/lib")?fs.readdirSync("scripts/lib").map(n=>"lib/"+n):[];
const names=new Set();
for(const f of [...files,...lib]){let t;try{t=fs.readFileSync(path.join("scripts",f),"utf8")}catch{continue}
  if(!changed.some(c=>[c,c.replace(/^src\//,""),c.replace(/^src\//,"@/").replace(/\.(tsx?|css)$/,"")].some(n=>t.includes(n))))continue;
  for(const [k,v] of scripts) if(/^test:/.test(k)&&v.includes("scripts/"+f)) names.add(k);}
console.log([...names].join("\n"));' > "$S/r5c/merge-list.raw"
{ cat "$S/r5c/merge-list.raw" "$S/r5c/suite-list.txt" "$S/r5b/suite-list.txt"; ls "$S/r5d/suites-final" | sed 's/\.log$//'; printf '%s\n' test:visual-pass-r5b test:visual-pass-r5c test:visual-pass-r5d test:gold-is-money test:spacing-scale test:red-anchors test:decomment test:design-frozen test:eyebrow-roles test:measure test:journey-shell test:visual-pass-r4j test:visual-pass-r4e test:offline-neutral; } | grep '^test:' | sort -u > "$S/r5c/merge-list.txt"
node -e 'const p=require("./package.json").scripts;const want=require("fs").readFileSync(process.argv[1],"utf8").split("\n").filter(Boolean);const miss=want.filter(n=>!p[n]);if(miss.length)console.log("NOT IN package.json: "+miss.join(" "))' "$S/r5c/merge-list.txt" >> "$OUT"
echo "suites: $(wc -l < "$S/r5c/merge-list.txt")" >> "$OUT"
run() { local n="$1" log="$L/${1//:/_}.log" t0=$(date +%s); FORCE_COLOR=0 timeout 900 npm run -s "$n" > "$log" 2>&1; local e=$?; echo "$n exit=$e $(( $(date +%s) - t0 ))s — $(grep -v '^\s*$' "$log" | tail -1 | cut -c1-150)" >> "$OUT"; }
while read -r n; do node -e 'process.exit(require("./package.json").scripts[process.argv[1]]?0:1)' "$n" && run "$n"; done < "$S/r5c/merge-list.txt"
for n in red:journey-shell red:visual-pass-r4k red:feedback-law red:simple-journey-flag red:offline-neutral red:measure red:wallet-reach red:deposit-phone red:journey-funnel; do run "$n"; done
echo "--- mutation proof (59 plants)" >> "$OUT"
node "$S/r5c/mutate-vis.cjs" > "$S/r5c/mutate-merge.log" 2>&1; echo "mutate exit=$? — $(tail -1 "$S/r5c/mutate-merge.log")" >> "$OUT"
git status --short | grep -v '^[MA] ' >> "$OUT"
echo "ALL DONE" >> "$OUT"
