#!/usr/bin/env bash
# DIAGNOSTIC ONLY. Proves the PATCHED eyebrow gate still fails in the way it should, on a scratchpad COPY of src/:
#   A. the patched tree as-is                                  -> exit 0
#   B. one planted uppercase+tracked site nobody has read      -> exit 5
#   C. one declared site stops being uppercase (read is stale) -> exit 4
#   D. a declared INLINE eyebrow loses its 0.14em              -> exit 6
S="/c/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/triage-3suites"
D="$S/prove-eb"
rm -rf "$D"; mkdir -p "$D/scripts/design-gate"
cp -r /f/kipindi-rot2/src "$D/src"
cp /f/kipindi-rot2/scripts/design-gate/eyebrow-sweep.mjs /f/kipindi-rot2/scripts/design-gate/eyebrow-roles.mjs "$D/scripts/design-gate/"
run() { (cd "$D" && node scripts/design-gate/eyebrow-sweep.mjs --tracking > out.txt 2> err.txt; echo $?); }

echo "A. patched tree as-is:                       exit=$(run)   (want 0)"

# B · plant a new, unread site
cat > "$D/src/app/zz-planted-eyebrow.tsx" <<'EOF'
export default function Planted() {
  return <span className="font-mono text-micro tracking-[0.10em] uppercase text-text-tertiary">planted</span>;
}
EOF
echo "B. planted unread site:                      exit=$(run)   (want 5)"; grep -E "zz-planted|neither" "$D/err.txt" | head -3 | cut -c1-160
rm -f "$D/src/app/zz-planted-eyebrow.tsx"

# C · a declared site leaves the population (finance 'all time · not this window' stops being uppercase)
node -e '
const fs=require("fs"); const p=process.argv[1]; let t=fs.readFileSync(p,"utf8"); const nl=t.includes("\r\n")?"\r\n":"\n"; const L=t.split(nl);
const i=L.findIndex((l,k)=>/uppercase/.test(l) && (L[k+1]||"").includes("all time · not this window"));
if(i<0) throw new Error("site not found"); L[i]=L[i].replace(" uppercase",""); fs.writeFileSync(p,L.join(nl)); console.log("edited line",i+1);
' "$D/src/app/admin/finance/page.tsx"
echo "C. a declared read goes stale:               exit=$(run)   (want 4)"; grep -E "no longer match|all time" "$D/err.txt" | head -3 | cut -c1-200
cp /f/kipindi-rot2/src/app/admin/finance/page.tsx "$D/src/app/admin/finance/page.tsx"

# D · an inline eyebrow loses its 0.14em
node -e '
const fs=require("fs"); const p=process.argv[1]; let t=fs.readFileSync(p,"utf8"); const n=(t.match(/letterSpacing:\s*"0\.14em"/g)||[]).length; t=t.replace(/letterSpacing:\s*"0\.14em"/g,"letterSpacing: \"0.10em\""); fs.writeFileSync(p,t); console.log("brand.tsx 0.14em occurrences rewritten:",n);
' "$D/src/components/brand.tsx"
echo "D. an inline eyebrow loses 0.14em:           exit=$(run)   (want 6)"; grep -E "no longer read|brand" "$D/err.txt" | head -3 | cut -c1-200
