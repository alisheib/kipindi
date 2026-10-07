// WP12.json -> WP12-r2.json for main of 2026-10-07: the CHANGELOG edit re-anchored above A8i's 2026-10-07 entry (now
// the file's first entry), and rule 8's "added" date, its provenance citation and the CHANGELOG heading dated the day
// they land. Every other edit and both new files are byte-for-byte the handover's.
const fs = require("fs");
const [, , src, out] = process.argv;
const cs = JSON.parse(fs.readFileSync(src, "utf8"));
const swapOnce = (s, a, b, label) => {
  const n = s.split(a).length - 1;
  if (n !== 1) throw new Error(`${label}: ${JSON.stringify(a)} occurs ${n}x`);
  return s.replace(a, b);
};
const da = cs.edits.findIndex((e) => e.file === "docs/DESIGN_AUTHORITY.md");
const ch = cs.edits.findIndex((e) => e.file.endsWith("07-provenance/CHANGELOG.md"));
if (da < 0 || ch < 0) throw new Error("edits not found");
let r = cs.edits[da].replace;
r = swapOnce(r, "(added 2026-10-04,", "(added 2026-10-07,", "rule 8 added");
r = swapOnce(r, "CHANGELOG.md`, 2026-10-04.", "CHANGELOG.md`, 2026-10-07.", "rule 8 provenance");
cs.edits[da].replace = r;

const OLD_FIND = "# Changelog (reconstructed)\n\n## 2026-10-04 (design-system · Sell button) — the free strip keeps its parts whole, and a row that cannot hold one line puts its note under its figure";
const NEW_FIND = "# Changelog (reconstructed)\n\n## 2026-10-07 (design-system · dialogs) — Enter acts only where it is pressed";
const e = cs.edits[ch];
if (e.find !== OLD_FIND) throw new Error("CHANGELOG find is not the expected one");
const tail = "## 2026-10-04 (design-system · Sell button) — the free strip keeps its parts whole, and a row that cannot hold one line puts its note under its figure";
if (!e.replace.endsWith(tail)) throw new Error("CHANGELOG replace does not end with the old heading");
let cr = e.replace.slice(0, -tail.length) + "## 2026-10-07 (design-system · dialogs) — Enter acts only where it is pressed";
cr = swapOnce(cr, "## 2026-10-04 (design-system · the simplified journey)", "## 2026-10-07 (design-system · the simplified journey)", "CHANGELOG heading");
e.find = NEW_FIND;
e.replace = cr;
fs.writeFileSync(out, JSON.stringify(cs, null, 1));
console.log("written", out);
