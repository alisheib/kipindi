#!/usr/bin/env bash
# S5-R2-HUB 6 · THE DRIVE'S PLANT RUN: three plants applied to the tree at once, each of which must turn its own new drive
# check red, then the files restored byte for byte (plant_check) and the tree proved clean.
#   P1 · the hub's own strike back on a voided question (the release's row)   → voiding: "item 24 … struck through the one strike"
#   P2 · the no-week state back on the kit's plain EmptyState (no numeral part) → noweek: "§T5 every numeral … numerals' face"
#   P3 · the ledger's carry following its props again (the round-1 island)     → after: "H6 a render while the token flies"
. "$CI_RUN/lib.sh"
{ echo "zh faces before: $(fc-list :lang=zh family | sort -u | head -4 | tr '\n' ';')"; } > "$OUT/env.txt" 2>&1
if ! fc-list :lang=zh | grep -q .; then
  ( sudo apt-get update -q && sudo apt-get install -y -q fonts-noto-cjk ) > "$OUT/fonts-install.log" 2>&1
  echo "fonts-noto-cjk install rc=$?" >> "$OUT/env.txt"
fi
cat "$OUT/env.txt"

node --input-type=module > "$OUT/plants.log" 2>&1 <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";
const PLANTS = [
  ["P1", "src/app/millionea/page.tsx",
    'voided ? "text-text-muted" : "text-text")}>{voided ? <MaswaliStrike text={textIn(locale, q.text)} /> : textIn(locale, q.text)}</span>',
    'voided ? "text-text-muted line-through decoration-border-strong" : "text-text")}>{textIn(locale, q.text)}</span>'],
  ["P2", "src/app/millionea/page.tsx",
    "<MaswaliEmptyState title={t.millionea.hubNoWeek}",
    "<EmptyState title={t.millionea.hubNoWeek}"],
  ["P2", "src/app/millionea/page.tsx",
    'import { NoticeBar } from "@/components/ui/notice-bar";\n',
    'import { NoticeBar } from "@/components/ui/notice-bar";\nimport { EmptyState } from "@/components/ui/empty-state";\n'],
  ["P3", "src/app/millionea/hub-pool.tsx",
    "live.input, live.moved, carry, spent)} />",
    "live.input, live.moved, carryFrom ? { from: carryFrom, play: !!carryPlay && live.tick === 0 && live.moved.n === 0 } : null)} />"],
];
for (const [id, file, from, to] of PLANTS) {
  const s = readFileSync(file, "utf8");
  const n = s.split(from).length - 1;
  if (n !== 1) { console.log(`PLANT ${id} NOT APPLIED — its text is in ${file} ${n} times`); process.exit(3); }
  writeFileSync(file, s.replace(from, to));
  console.log(`PLANT ${id} applied to ${file}`);
}
EOF
prc=$?
cat "$OUT/plants.log"
echo "plants rc=$prc" | tee -a "$OUT/summary.txt"
git diff --stat | tee -a "$OUT/plants.log"

if [ $prc -eq 0 ]; then
  export WARM="/millionea /millionea/how /millionea/tickets /markets"
  serve 3550 FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=a MLN_HUB_STATES=noweek,after,voiding -- \
    bash -c 'node scripts/maswali-hub-states.mjs > "$OUT/drive-plants.log" 2>&1; echo "drive-plants rc=$? (red expected)" | tee -a "$OUT/summary.txt"; grep -a -E "^FAIL|maswali-hub-states \(run" "$OUT/drive-plants.log" | cut -c1-260 | head -90'
fi
plant_check P1-P2 src/app/millionea/page.tsx
plant_check P3 src/app/millionea/hub-pool.tsx
git status --short | tee "$OUT/status-after.txt"
[ -s "$OUT/status-after.txt" ] && LIB_FAILED=1
# The plant run is red by design: what it proves is in drive-plants.log (each plant's check red, nothing else).
finish
