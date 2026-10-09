// Builds the records commit's pair lists: VODACOM-PLAN (the WP12 bullet's owed runs → what ran; §0h point 64) and
// DESIGN_AUTHORITY (rule 8c's owed clause). S6's own close (§1, State, NEXT-PLAN) is NOT in here: S6 closes after the
// visual perfection pass.
const fs = require("fs");
const D = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/0e745525-51fe-4451-ace7-c9987576fc15/scratchpad/rec/s6close/";
const H =
  "typecheck 0, `test:all` 467/474 (every failure run alone on both trees: main's own), local `qa:live` 334/334 and\n" +
  "  `qa:journey-shell` 1645/0 over 333 tiles (turn H/H2), then production `qa:live` 343/343 as mobile01 after the deploy";
const fill = (t) => t.replaceAll("{FIXES}", "8e0f1e69").replaceAll("{H}", H);
const read = (f) => fs.readFileSync(D + f, "utf8").replace(/\r\n/g, "\n");
const plan = [
  { label: "WP12 bullet: the owed runs, as run", old: read("owed-old.txt"), new: fill(read("owed-new.txt")) },
  { label: "§0h point 64", old: read("p64-old.txt"), new: fill(read("p64-new.txt")) },
];
for (const p of plan) if (/\{[A-Z]+\}/.test(p.new)) throw new Error(`${p.label}: a placeholder remains`);
fs.writeFileSync(D + "pairs-plan.json", JSON.stringify(plan, null, 1));
const da = [{
  label: "DESIGN_AUTHORITY rule 8c: G1 has run",
  old: "row and the tab's dot on a shared phone — its first run and its `--prove-red` are owed by WP12's run list).",
  new: "row and the tab's dot on a shared phone — first run green 2026-10-08, 14/14, and its `--prove-red` caught).",
}];
fs.writeFileSync(D + "pairs-da.json", JSON.stringify(da, null, 1));
console.log("pairs written");
