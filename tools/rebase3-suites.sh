#!/usr/bin/env bash
# vodacom-visual rebased onto main 118fc75c: every suite that reads a file main changed (2174fb02..118fc75c), every
# visual-pass suite and the always-run list. One at a time; results in S/runs/rebase3-results.txt.
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
OUT="$S/runs/rebase3-results.txt"; L="$S/runs/rebase3-logs"; mkdir -p "$L"; : > "$OUT"
cd F:/kipindi-vis || exit 1
node -e '
const fs=require("fs"),path=require("path"),cp=require("child_process");
const changed=cp.execSync("git diff --name-only 2174fb02 118fc75c",{encoding:"utf8"}).split("\n").filter(Boolean);
const p=JSON.parse(fs.readFileSync("package.json","utf8")).scripts;
const names=new Set(Object.keys(p).filter(k=>/^test:visual-pass-/.test(k)));
for(const k of ["test:red-anchors","test:decomment","test:hooks-order","test:ui-consistency","test:i18n","test:journey-shell","test:simple-journey-flag","test:eyebrow-roles","test:type-scale","test:spacing-scale","test:design-frozen","test:css-vars-defined","test:stacking","test:gold-is-money","test:feedback-law","test:docs","test:guards-exist","test:proxy-scope","test:static-cache-scope","test:house-bot-disclosure","test:orphans","test:dead-css","test:campaign-gates"]) if(p[k]) names.add(k);
const files=fs.readdirSync("scripts").filter(n=>/\.(mts|mjs|ts|js|cjs)$/.test(n));
for(const f of files){let t;try{t=fs.readFileSync(path.join("scripts",f),"utf8")}catch{continue}
  if(!changed.some(c=>[c,c.replace(/^src\//,""),c.replace(/^src\//,"@/").replace(/\.(tsx?|css)$/,"")].some(n=>t.includes(n))))continue;
  for(const [k,v] of Object.entries(p)) if(/^test:/.test(k)&&v.includes("scripts/"+f)) names.add(k);}
console.log([...names].sort().join("\n"));' > "$S/runs/rebase3-list.txt"
echo "suites: $(wc -l < "$S/runs/rebase3-list.txt")" >> "$OUT"
while read -r n; do t0=$(date +%s); FORCE_COLOR=0 timeout 900 npm run -s "$n" > "$L/${n//:/_}.log" 2>&1; e=$?; echo "$n exit=$e $(( $(date +%s)-t0 ))s — $(grep -v '^\s*$' "$L/${n//:/_}.log" | tail -1 | cut -c1-150)" >> "$OUT"; done < "$S/runs/rebase3-list.txt"
echo "ALL DONE" >> "$OUT"
