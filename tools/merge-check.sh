#!/usr/bin/env bash
# merge-check.sh <name> <mutation command run from F:/kipindi-vis> [extra list files...]
# On F:/kipindi-vis with a merge STAGED: every suite that reads a file the staged merge touches, the helper's own list(s),
# the always-run list, the visual-pass suites, then the merge-relevant red twins and the helper's mutation proof.
# Heavy suites (test:all, database suites, live browser drives) are left to the locked final proof.
S="C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad"
NAME="$1"; MUT="$2"; shift 2
OUT="$S/runs/merge-$NAME.txt"; L="$S/runs/merge-$NAME-logs"; mkdir -p "$L"; : > "$OUT"
cd F:/kipindi-vis || exit 1
LIST="$S/runs/merge-$NAME-list.txt" REDS="$S/runs/merge-$NAME-reds.txt" node -e '
const fs=require("fs"),path=require("path"),cp=require("child_process");
const changed=cp.execSync("git diff --cached --name-only",{encoding:"utf8"}).split("\n").filter(Boolean);
const p=JSON.parse(fs.readFileSync("package.json","utf8")).scripts;
const names=new Set(Object.keys(p).filter(k=>/^test:visual-pass-/.test(k)));
for(const k of ["test:red-anchors","test:decomment","test:hooks-order","test:ui-consistency","test:i18n","test:journey-shell","test:simple-journey-flag","test:eyebrow-roles","test:type-scale","test:spacing-scale","test:design-frozen","test:css-vars-defined","test:stacking","test:gold-is-money","test:feedback-law","test:guards-exist","test:docs","test:offline-neutral","test:measure"]) names.add(k);
const listedReds=new Set();
for(const f of process.argv.slice(1)) for(const l of fs.readFileSync(f,"utf8").split(/\s+/)){const m=/^((?:test|red):[a-z0-9:-]+)/.exec(l.trim()); if(m) (m[1].startsWith("red:")?listedReds:names).add(m[1]);}
const files=fs.readdirSync("scripts").filter(n=>/\.(mts|mjs|ts|js|cjs)$/.test(n));
const lib=fs.existsSync("scripts/lib")?fs.readdirSync("scripts/lib").map(n=>"lib/"+n):[];
for(const f of [...files,...lib]){let t;try{t=fs.readFileSync(path.join("scripts",f),"utf8")}catch{continue}
  if(!changed.some(c=>[c,c.replace(/^src\//,""),c.replace(/^src\//,"@/").replace(/\.(tsx?|css)$/,"")].some(n=>t.includes(n))))continue;
  for(const [k,v] of Object.entries(p)) if(/^test:/.test(k)&&v.includes("scripts/"+f)) names.add(k);}
const skip=new Set(["test:all","test:responsive","test:admin-section-gate"]);
const db=k=>/db:|scratch|postgres|pg-|KP_SCRATCH|with-db|test-db/i.test(p[k]||"");
const keep=[...names].filter(k=>p[k]&&!skip.has(k)&&!db(k)).sort();
const reds=Object.keys(p).filter(k=>k.startsWith("red:")&&k!=="red:all"&&!db(k)&&(listedReds.has(k)||[p[k],p["test:"+k.slice(4)]].join(" ").split(/\s+/).filter(w=>w.startsWith("scripts/")).some(f=>changed.includes(f)))).sort();
fs.writeFileSync(process.env.LIST,keep.join("\n")+"\n");fs.writeFileSync(process.env.REDS,reds.join("\n")+"\n");' "$@" || { echo "selector failed" >> "$OUT"; exit 1; }
echo "suites: $(wc -l < "$S/runs/merge-$NAME-list.txt") · reds: $(tr '\n' ' ' < "$S/runs/merge-$NAME-reds.txt")" >> "$OUT"
run() { local n="$1" log="$L/${1//:/_}.log" t0=$(date +%s); FORCE_COLOR=0 timeout 900 npm run -s "$n" > "$log" 2>&1; local e=$?; echo "$n exit=$e $(( $(date +%s)-t0 ))s — $(grep -v '^\s*$' "$log" | grep -v -i deprecation | tail -1 | cut -c1-150)" >> "$OUT"; }
while read -r n; do [ -n "$n" ] && run "$n"; done < "$S/runs/merge-$NAME-list.txt"
while read -r n; do [ -n "$n" ] && run "$n"; done < "$S/runs/merge-$NAME-reds.txt"
echo "--- mutation proof" >> "$OUT"
eval "$MUT" > "$S/runs/merge-$NAME-mutation.log" 2>&1; echo "mutation exit=$? — $(grep -v '^\s*$' "$S/runs/merge-$NAME-mutation.log" | tail -1 | cut -c1-200)" >> "$OUT"
echo "unstaged after: $(git diff --name-only | tr '\n' ' ')" >> "$OUT"
echo "ALL DONE" >> "$OUT"
