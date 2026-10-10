// The history bar drawing's guard (visual-pass-r5l §7b), proved: each plant on disk, the suite run, the file restored.
// Run from F:/kipindi-wip (or the tree the drawing is in).
const fs = require("fs"), cp = require("child_process");
const G = "src/app/updown/history/history-ghost.tsx";
const orig = fs.readFileSync(G, "utf8");
const NL = orig.includes("\r\n") ? "\r\n" : "\n";
const plants = [
  ["a lens dropped", "t.market.udVoided, ", "", "7b.1"],
  ["two windows swapped", "t.common.range7d, t.common.range30d", "t.common.range30d, t.common.range7d", "7b.1"],
  ["a divider removed", `          <QueryGroupDivider />${NL}          <GroupGhost label={t.market.udDurations}>`, "          <GroupGhost label={t.market.udDurations}>", "7b.2"],
  ["a group key changed", "<GroupGhost label={t.common.when}>", "<GroupGhost label={t.common.topic}>", "7b.2"],
  ["the count's phrase back to a bar", '<CountGhost count={t.market.udNRounds.replace("{n}", "00")} />', '<div className="flex h-[17.25px] shrink-0 items-center"><div className="h-3 w-[80px] rounded bg-bg-elevated" /></div>', "7b.2"],
  ["the lens strip a plain row again", "<div className={QUERY_STRIP_CLASS}>", '<div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">', "7b.2"],
];
let caught = 0, landed = 0;
for (const [name, from, to, want] of plants) {
  const n = orig.split(from).length - 1;
  if (n !== 1) { console.log(`NOT LANDED ${name} (${n} matches)`); continue; }
  landed++;
  fs.writeFileSync(G, orig.replace(from, () => to));
  let out = "";
  try { out = cp.execSync("npx tsx scripts/visual-pass-r5l.test.mts", { encoding: "utf8", stdio: "pipe", shell: true, env: { ...process.env, FORCE_COLOR: "0" } }); }
  catch (e) { out = String(e.stdout) + String(e.stderr); }
  fs.writeFileSync(G, orig);
  const hit = out.split(/\r?\n/).some((l) => l.trimStart().startsWith(`FAIL ${want} `));
  if (hit) caught++;
  console.log(`${hit ? "CAUGHT" : "MISSED"} ${name} on ${want}`);
}
console.log(`plants: ${plants.length} · landed ${landed} · caught ${caught} · restored byte-identical: ${fs.readFileSync(G, "utf8") === orig}`);
process.exit(caught === plants.length ? 0 : 1);
