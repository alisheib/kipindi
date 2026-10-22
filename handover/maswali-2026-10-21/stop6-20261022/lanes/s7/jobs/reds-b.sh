#!/usr/bin/env bash
# Item 4 · the reds, part B (its own machine and tree): red:maswali-money-path's plants [50,99) by their ids (each id
# matching exactly one plant), then red:maswali-fence and red:maswali-objections whole. Part A runs [0,50) and dal-parity.
. "$CI_RUN/lib.sh"
# sel <anchors.mjs> <paren|dot> <from> <to>: the ids [from, to) of a red's declared mutations, comma-joined, for its
# `--only` name-prefix filter; refuses unless every id is comma-free and matches exactly ONE declaration.
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
SEL=$(sel scripts/anchors/maswali-money-path.anchors.mjs paren 50 99) || { echo "selector refused"; LIB_FAILED=1; finish; }
echo "money-path selector [50,99): $(echo "$SEL" | tr ',' '\n' | wc -l) ids — $SEL"
step money-path-50-99 npm run red:maswali-money-path -- --only "$SEL"
step fence-red npm run red:maswali-fence
step objections-red npm run red:maswali-objections
finish
