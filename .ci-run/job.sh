#!/usr/bin/env bash
# Regenerate ONLY docs/50pick-maswali-operator-guide.pdf from its HTML (R1 changed step B3), then rasterise every page
# for reading (RULES §5 step 7). generate-pdfs.mjs renders every target, so its list is narrowed to this one entry for
# the run and restored after.
. "$CI_RUN/lib.sh"
cp scripts/generate-pdfs.mjs "$OUT/generate-pdfs.orig.mjs"
node -e '
const fs=require("fs");const p="scripts/generate-pdfs.mjs";let s=fs.readFileSync(p,"utf8");
const a=s.indexOf("const TARGETS = [");const b=s.indexOf("];",a);
s=s.slice(0,a)+"const TARGETS = [\n  { in: \"docs/maswali-operator-guide.html\", out: \"docs/50pick-maswali-operator-guide.pdf\" },\n"+s.slice(b);
fs.writeFileSync(p,s);'
step pdf node scripts/generate-pdfs.mjs
cp "$OUT/generate-pdfs.orig.mjs" scripts/generate-pdfs.mjs
cp docs/50pick-maswali-operator-guide.pdf "$OUT/"
sudo apt-get update -qq > /dev/null 2>&1; sudo apt-get install -y -qq poppler-utils > /dev/null 2>&1; command -v pdftoppm || echo "NO pdftoppm"
mkdir -p "$OUT/pages" && pdftoppm -r 70 -png docs/50pick-maswali-operator-guide.pdf "$OUT/pages/p" && ls "$OUT/pages" | wc -l; pdftotext -layout docs/50pick-maswali-operator-guide.pdf "$OUT/guide.txt"
git checkout -- docs/50pick-maswali-operator-guide.pdf 2>/dev/null || true
finish
