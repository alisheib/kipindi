// R5-F mutation proof — plants each defect on disk in F:/kipindi-r5f, runs `npm run -s test:visual-pass-r5f`, requires
// the suite to FAIL on the named check, restores the file and proves it byte-identical (sha-256). Scratch; never in the repo.
//   node mutate.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const WT = "F:/kipindi-r5f";
const RULES = `${WT}/scripts/live/bar-geometry-rules.mjs`;
const DRIVE = `${WT}/scripts/live/bar-geometry-drive.mjs`;
const TWIN = `${WT}/scripts/red-bar-geometry.mjs`;
const ANCH = `${WT}/scripts/anchors/bar-geometry.anchors.mjs`;
const sha = (s) => createHash("sha256").update(s).digest("hex");

const PLANTS = [
  { name: "probe ignores sideways overflow clipping (the old layout-box overlap)", file: RULES, check: "2.sw.2",
    from: 'const cx = st.overflowX !== "visible", cy', to: 'const cx = false, cy' },
  { name: "findOverlaps compares LAYOUT x/w again", file: RULES, check: "2.sw.2",
    from: "const a = shown[i].seen, b = shown[j].seen;",
    to: "const a = { ...shown[i].seen, x: shown[i].x, w: shown[i].w }, b = { ...shown[j].seen, x: shown[j].x, w: shown[j].w };" },
  { name: "a display:contents ancestor clips", file: RULES, check: "2.sw.2b",
    from: 'if (st.display !== "contents" && st.display !== "inline") {', to: 'if (st.display !== "inline") {' },
  { name: "an absolute box no longer escapes a non-positioned clipper", file: RULES, check: "2.9",
    from: 'else if (pos === "absolute") {', to: 'else if (pos === "absolute-never") {' },
  { name: "the stick is measured at the page's end again (no release bound)", file: RULES, check: "3.tip.2",
    from: "const y = Math.floor(Math.min(start + reach, g.maxScroll, release - 1));", to: "const y = Math.floor(Math.min(start + reach, g.maxScroll));" },
  { name: "rows below the bar's parent no longer fail it (the 247px wrapper)", file: RULES, check: "3.5",
    from: "    if (g.rowsBelow > 0) {", to: "    if (false && g.rowsBelow > 0) {" },
  { name: "a sticky bar off its offset inside its range passes", file: RULES, check: "3.9",
    from: "if (Math.abs(after.top - g.offset) > tolerance) {", to: "if (false) {" },
  { name: "a non-sticky bar is judged by the old on-screen tolerance only", file: RULES, check: "3.7",
    from: '} else if (g.position !== "fixed") {', to: "} else if (false) {" },
  { name: "rows without a bar are not a failure", file: RULES, check: "1.1",
    from: "  if (book.rows > 0) {", to: "  if (false) {" },
  { name: "an empty book no longer skips the surface", file: RULES, check: "1.2",
    from: "    kind: \"not-measured\",\n    skips: true,", to: "    kind: \"not-measured\",\n    skips: false,", crlf: true },
  { name: "STICK_PROBE keeps the parent's bottom padding", file: RULES, check: "3.12",
    from: "- (parseFloat(pcs.paddingBottom) || 0) -", to: "- 0 -" },
  { name: "STICK_AFTER_PROBE counts a header that only TOUCHES the bar", file: RULES, check: "3.15",
    from: "if (v > 2 && h > 2) hits.push", to: "if (v >= 0 && h > 2) hits.push" },
  { name: "failLines lets a 🔶 line through", file: RULES, check: "4.5",
    from: '.filter((l) => l.includes("✗"))', to: '.filter((l) => l.includes("✗") || l.includes("🔶"))' },
  { name: "notMeasuredLines takes /positions/performance for /positions", file: RULES, check: "4.8",
    from: "l.includes(`${route} `)", to: "l.includes(route)" },
  { name: "the drive's population loses /wallet/receipts", file: DRIVE, check: "1.7",
    from: '  { id: "/wallet/receipts", path: "/wallet/receipts", minControls: 13 },', to: "" },
  { name: "the drive scrolls to 1200 again", file: DRIVE, check: "5.2",
    from: 'await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), plan.y);', to: "await page.evaluate(() => window.scrollTo(0, 1200));" },
  { name: "a skipped surface no longer exits 3", file: DRIVE, check: "5.5",
    from: 'if (skipped.length) { console.error("\\n" + skippedLine); process.exit(3); }', to: 'if (skipped.length) { console.error("\\n" + skippedLine); }' },
  { name: "the red twin's precondition is per ROUTE again", file: TWIN, check: "4.2",
    from: 'const keyOf = (c) => `${c.route} @ ${shapeOf(c).widths ?? "default"}/${shapeOf(c).locales ?? "default"}`;', to: "const keyOf = (c) => c.route;" },
  { name: "the red twin's 'green' is exit 0 alone", file: TWIN, check: "4.3",
    from: "ok: b.code === 0 && unposed.length === 0", to: "ok: b.code === 0" },
  { name: "the red twin matches expect on the whole output", file: TWIN, check: "4.4",
    from: "!failLines(r.out).some((l) => l.includes(c.expect))", to: "!r.out.includes(c.expect)" },
  { name: "bar-is-not-sticky expects \"stick\" again", file: ANCH, check: "4.9",
    from: 'expect: "THE BAR DID NOT STICK",', to: 'expect: "stick",' },
  { name: "sort-summary-unbound is proved on /markets again", file: ANCH, check: "4.10",
    from: '    route: "/watchlist",', to: '    route: "/markets",' },
];

const runSuite = () => {
  try { return { code: 0, out: execSync("npm run -s test:visual-pass-r5f", { cwd: WT, encoding: "utf8", stdio: "pipe" }) }; }
  catch (e) { return { code: e.status ?? 1, out: String(e.stdout ?? "") + String(e.stderr ?? "") }; }
};

const before = Object.fromEntries([RULES, DRIVE, TWIN, ANCH].map((f) => [f, sha(readFileSync(f))]));
const clean = runSuite();
console.log(`control · the untouched tree: exit ${clean.code} · ${(clean.out.match(/(\d+) passed · (\d+) failed/) ?? ["?"])[0]}`);
if (clean.code !== 0) { console.error("the suite is red before any plant — nothing can be proved"); process.exit(1); }

let caught = 0;
const problems = [];
for (const [i, p] of PLANTS.entries()) {
  const original = readFileSync(p.file, "utf8");
  const from = p.crlf ? p.from.replace(/\n/g, "\r\n") : p.from;
  const to = p.crlf ? p.to.replace(/\n/g, "\r\n") : p.to;
  const n = original.split(from).length - 1;
  if (n !== 1) { problems.push(`${i + 1} ${p.name}: anchor found ${n}×`); console.log(`  ${i + 1}. ANCHOR ×${n}  ${p.name}`); continue; }
  writeFileSync(p.file, original.replace(from, to), "utf8");
  const r = runSuite();
  writeFileSync(p.file, original, "utf8");
  const restored = sha(readFileSync(p.file)) === sha(Buffer.from(original, "utf8"));
  const failed = r.out.split("\n").filter((l) => l.includes("FAIL ")).map((l) => l.trim());
  const onCheck = failed.some((l) => l.startsWith(`FAIL ${p.check} `));
  if (!restored) problems.push(`${p.file} not restored after plant ${i + 1}`);
  if (r.code !== 0 && onCheck) { caught++; console.log(`  ${i + 1}. caught on ${p.check.padEnd(8)} ${p.name}  (${failed.length} FAIL line${failed.length === 1 ? "" : "s"})`); }
  else { problems.push(`${i + 1} ${p.name}: exit ${r.code}, FAIL lines: ${failed.slice(0, 3).join(" | ") || "none"}`); console.log(`  ${i + 1}. NOT CAUGHT on ${p.check}  ${p.name}`); }
}
const after = Object.fromEntries([RULES, DRIVE, TWIN, ANCH].map((f) => [f, sha(readFileSync(f))]));
const same = Object.keys(before).every((f) => before[f] === after[f]);
const final = runSuite();
console.log(`\n${caught}/${PLANTS.length} plants caught on their named check · every file byte-identical: ${same} · suite after: exit ${final.code}`);
for (const f of Object.keys(before)) console.log(`  sha-256 ${after[f].slice(0, 16)}…  ${f.replace(WT + "/", "")}${before[f] === after[f] ? "" : "  ⛔ CHANGED"}`);
if (problems.length || !same || final.code !== 0) { console.error("\nPROBLEMS:"); problems.forEach((x) => console.error("  ✗ " + x)); process.exit(1); }
console.log("MUTATION PROOF COMPLETE");
