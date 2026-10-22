#!/usr/bin/env bash
# Item 6 · red:house-bot-console in parts (each its own machine and tree), by its plants' ids (each id matching exactly
# one declaration), the parts' ranges disjoint and together every plant; with a slice of red:house-bot-c5 where named.
. "$CI_RUN/lib.sh"
sel() {
  node --input-type=module -e '
const [file, kind, a, b] = process.argv.slice(1);
const { MUTATIONS } = await import(process.cwd() + "/" + file);
const idOf = (n) => { if (kind === "paren") return n.slice(0, n.indexOf(")") + 1); const i = n.indexOf(" · "); return i > 0 ? n.slice(0, i + 2) : n; };
const ids = MUTATIONS.map((d) => idOf(d.name));
const bad = ids.filter((id) => !id || id.includes(",") || MUTATIONS.filter((d) => d.name.startsWith(id)).length !== 1);
if (bad.length) { console.error("REFUSING — ids not unique or not comma-free: " + bad.slice(0, 10).join(" | ")); process.exit(3); }
console.error("ids " + a + ".." + b + " of " + ids.length);
console.log(ids.slice(Number(a), Number(b)).join(","));
' "$@"
}
SEL=$(sel scripts/anchors/house-bot-console.anchors.mjs dot 0 125) || { echo "selector refused"; LIB_FAILED=1; finish; }
echo "house-bot-console selector [0,125): $(echo "$SEL" | tr ',' '\n' | wc -l) ids"
echo "start $(date -u +%T)"
step console-0-125 npm run red:house-bot-console -- --only "$SEL"
echo "end $(date -u +%T)"
step c5-0-50 npm run red:house-bot-c5 -- --slice 0:50
echo "end c5 $(date -u +%T)"
finish
