#!/usr/bin/env bash
# S5-R2-HUB 9 · THE CARRY'S PLANT RUN, in two phases on two fresh servers (a missing inline block keeps the carry from ever
# playing, so it would hide the island's plant): each phase plants ONE change into the tree, runs the state drive's "after"
# state, and restores the file byte for byte (plant_check).
#   P3 · the ledger's carry following its props again (the round-1 island) → only "a render while the token flies" red
#   P4 · the carry's wrapper back to its own inline flex box (0px tall under the frame's numeral rule) → "the carry measured
#        its destination as a box of its line" red in both views, the desk's landing red, and the flight's two checks red
. "$CI_RUN/lib.sh"
if ! fc-list :lang=zh | grep -q .; then
  ( sudo apt-get update -q && sudo apt-get install -y -q fonts-noto-cjk ) > "$OUT/fonts-install.log" 2>&1
fi
export WARM="/millionea /millionea/how /millionea/tickets /markets"
plant() { # plant <id> <file> <from> <to>
  ID="$1" FILE="$2" FROM="$3" TO="$4" node --input-type=module <<'EOF'
import { readFileSync, writeFileSync } from "node:fs";
const { ID, FILE, FROM, TO } = process.env;
const s = readFileSync(FILE, "utf8");
const n = s.split(FROM).length - 1;
if (n !== 1) { console.log(`PLANT ${ID} NOT APPLIED — its text is in ${FILE} ${n} times`); process.exit(3); }
writeFileSync(FILE, s.replace(FROM, TO));
console.log(`PLANT ${ID} applied to ${FILE}`);
EOF
}
phase() { # phase <id> <from> <to>
  local id="$1" prc
  plant "$id" src/app/millionea/hub-pool.tsx "$2" "$3" > "$OUT/plant-$id.txt" 2>&1; prc=$?
  cat "$OUT/plant-$id.txt" | tee -a "$OUT/plants.log"
  if [ $prc -eq 0 ]; then
    git diff --stat | tee -a "$OUT/plants.log"
    serve 3550 FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=a MLN_HUB_STATES=after -- \
      bash -c "node scripts/maswali-hub-states.mjs > \"\$OUT/drive-$id.log\" 2>&1; echo \"drive-$id rc=\$? (red expected)\" | tee -a \"\$OUT/summary.txt\"; grep -a -E '^FAIL|maswali-hub-states \\(run' \"\$OUT/drive-$id.log\" | cut -c1-300"
  else
    echo "plant-$id rc=3 (not applied)" | tee -a "$OUT/summary.txt"; LIB_FAILED=1
  fi
  plant_check "$id" src/app/millionea/hub-pool.tsx
}
# GREEN first: the tree as committed — every H6 check must pass (the carry measures its box, lands, survives the render).
serve 3550 FEATURE_MILLIONEA=ACTIVE MLN_HUB_RUN=a MLN_HUB_STATES=after -- \
  bash -c 'node scripts/maswali-hub-states.mjs > "$OUT/drive-green.log" 2>&1; rc=$?; echo "drive-green rc=$rc" | tee -a "$OUT/summary.txt"; grep -a -E "^(FAIL|INFO H6)|maswali-hub-states \(run" "$OUT/drive-green.log" | cut -c1-1800; exit $rc' || LIB_FAILED=1
phase P3 "live.input, live.moved, carry, spent)} />" \
  "live.input, live.moved, carryFrom ? { from: carryFrom, play: !!carryPlay && live.tick === 0 && live.moved.n === 0 } : null)} />"
phase P4 'onEnd={onCarryEnd} className="inline-block">' 'onEnd={onCarryEnd}>'
git status --short | tee "$OUT/status-after.txt"
[ -s "$OUT/status-after.txt" ] && LIB_FAILED=1
finish
