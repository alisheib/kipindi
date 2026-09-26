/**
 * THE LANDING v3 TRACKER CANNOT LIE — the guard on `docs/LANDING-TEN.md` §0/§1.
 *
 *   npx tsx scripts/landing-ten-plan.test.mts               (npm run test:landing-ten-plan)
 *   npx tsx scripts/landing-ten-plan.test.mts --prove-red   (npm run red:landing-ten-plan)
 *
 * Ali, 2026-09-26, handing over the v3 concept: *"provide a plan and progress for other sessions in
 * case we proceed on another machine, to know where to proceed from perfectly and cleanly."* The board
 * in §1 IS that progress, and a fresh session on a fresh PC trusts it. So each claim it makes is
 * checked here:
 *
 * §1 · THE ROWS ARE THE ROWS — the exact unit set, once each. A row that silently vanishes is how a
 *      tracker starts claiming completeness it never had.
 * §2 · STATUS DISCIPLINE — one legal status; 🔵/✅ cite a commit that exists; ✅ carries the date it
 *      was measured on production; ⛔ cites a ruling (R1–R4) or law (L1–L15) that the delivery's
 *      INHERIT-MANIFEST actually defines; ⬜ claims no commit.
 * §3 · §0 NAMES WHERE WE ARE — a dated state line and a Next line that names no finished row.
 * §4 · THE TWO DOORS AGREE — the ▶ 0b row in `docs/NEXT-PLAN.md` states the same ✅ count.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION: `--prove-red` plants every lie on in-memory copies and requires the
 * matching rule to fire. This file writes no file.
 * ⛔ WHAT IT CANNOT SEE: whether a measurement is TRUE — only that it is present and consistent.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url);
/* Line endings are normalised on read: this machine checks files out as CRLF. */
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8").replace(/\r\n/g, "\n");

const DOC = "docs/LANDING-TEN.md";
const MANIFEST = "docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md";
const BOARD = "docs/NEXT-PLAN.md";

/** The full unit set. A split may ADD ids here; removing one needs a §0 note saying why. */
const IDS = [
  "D0", "WP1", "WP2", "WP3", "WP4", "WP5", "WP6", "WP7", "WP8", "WP9", "WP10", "WP11", "WP12",
  "WP13", "WP14", "WP14b", "WP15", "WP16", "WP17", "RG",
  "V15", "V16", "V17", "V18", "V19", "V20", "V21", "PANEL", "FUNNEL", "SW", "ZH", "DEV",
];
const STATUSES = ["⬜", "🔨", "🔵", "✅", "⛔", "⏳"];
const SHA = /\b[0-9a-f]{7,40}\b/;
const DATE = /\b20\d{2}-\d{2}-\d{2}\b/;

type Row = { id: string; unit: string; status: string; commit: string; note: string };
type World = { doc: string; manifest: string; board: string; commitExists: (sha: string) => boolean };

function rowsOf(doc: string): Row[] {
  const start = doc.indexOf("## §1 · Status board");
  if (start < 0) return [];
  const rest = doc.slice(start);
  const end = rest.indexOf("\n## ", 5);
  const body = end < 0 ? rest : rest.slice(0, end);
  return body.split("\n")
    .filter((l) => l.startsWith("| ") && !l.startsWith("| ID ") && !l.startsWith("|---"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length === 5)
    .map(([id, unit, status, commit, note]) => ({ id, unit, status, commit, note }));
}

/** Every rule, returning the list of failures. Pure: the same world always gives the same answer. */
function check(w: World): string[] {
  const f: string[] = [];
  const rows = rowsOf(w.doc);

  // §1 · the exact unit set, once each
  const seen = new Map<string, number>();
  for (const r of rows) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
  for (const id of IDS) if (!seen.has(id)) f.push(`§1 row ${id} is missing from the board`);
  for (const [id, n] of seen) {
    if (n > 1) f.push(`§1 row ${id} appears ${n} times`);
    if (!IDS.includes(id)) f.push(`§1 row ${id} is not a known unit (add it to IDS on purpose)`);
  }

  // §2 · status discipline
  const defined = new Set([...w.manifest.matchAll(/^\| (R\d+|L\d+) \|/gm)].map((m) => m[1]));
  for (const r of rows) {
    if (!STATUSES.includes(r.status)) { f.push(`§2 ${r.id}: status "${r.status}" is not one of ${STATUSES.join(" ")}`); continue; }
    const sha = r.commit.match(SHA)?.[0];
    if (r.status === "🔵" || r.status === "✅") {
      if (!sha) f.push(`§2 ${r.id}: ${r.status} cites no commit`);
      else if (!w.commitExists(sha)) f.push(`§2 ${r.id}: commit ${sha} does not exist in this repository`);
    }
    if (r.status === "✅" && !DATE.test(r.note)) f.push(`§2 ${r.id}: ✅ carries no production-measure date`);
    if (r.status === "⬜" && sha) f.push(`§2 ${r.id}: ⬜ yet cites commit ${sha}`);
    if (r.status === "⛔") {
      const refs = [...r.note.matchAll(/\b(R\d+|L\d+)\b/g)].map((m) => m[1]);
      if (!refs.length) f.push(`§2 ${r.id}: ⛔ cites no ruling or law`);
      for (const ref of refs) if (!defined.has(ref)) f.push(`§2 ${r.id}: cites ${ref}, which the INHERIT-MANIFEST does not define`);
    }
  }

  // §3 · §0 names where we are
  const s0 = w.doc.match(/## §0 · RESUME AT[\s\S]*?(?=\n## )/)?.[0] ?? "";
  if (!s0) f.push("§3 §0 RESUME AT is missing");
  else {
    if (!/\*\*State \(20\d{2}-\d{2}-\d{2}\):\*\*/.test(s0)) f.push("§3 §0 has no dated **State (YYYY-MM-DD):** line");
    const next = s0.match(/\*\*Next:\*\*([^\n]*)/)?.[1];
    if (next === undefined) f.push("§3 §0 has no **Next:** line");
    else {
      const done = new Set(rows.filter((r) => r.status === "✅" || r.status === "⛔").map((r) => r.id));
      for (const id of next.match(/\b(WP\d+b?|V\d+|D\d|RG|PANEL|FUNNEL)\b/g) ?? []) {
        if (done.has(id)) f.push(`§3 §0 Next names ${id}, which is already finished`);
      }
    }
  }

  // §4 · the two doors agree
  const line = w.board.split("\n").find((l) => l.startsWith("## ▶ 0b ·")) ?? "";
  if (!line) f.push("§4 docs/NEXT-PLAN.md has no ▶ 0b row");
  else {
    const verified = rows.filter((r) => r.status === "✅").length;
    const m = line.match(/v3 build (\d+)\/(\d+) ✅/);
    if (!m) f.push("§4 the ▶ 0b heading states no 'v3 build N/M ✅' count");
    else {
      if (Number(m[1]) !== verified) f.push(`§4 ▶ 0b says ${m[1]} ✅, the board has ${verified}`);
      if (Number(m[2]) !== rows.length) f.push(`§4 ▶ 0b says ${m[2]} units, the board has ${rows.length}`);
    }
  }
  return f;
}

const commitExists = (sha: string) => {
  try { execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: ROOT, stdio: "ignore" }); return true; }
  catch { return false; }
};
const world: World = { doc: read(DOC), manifest: read(MANIFEST), board: read(BOARD), commitExists };

if (!process.argv.includes("--prove-red")) {
  const fails = check(world);
  const rows = rowsOf(world.doc);
  for (const x of fails) console.log(`FAIL ${x}`);
  console.log(`\n${rows.length} rows · ${rows.filter((r) => r.status === "✅").length} ✅ · ${fails.length} failure(s)`);
  process.exit(fails.length ? 1 : 0);
}

/* ── --prove-red: plant each lie in memory; the named rule must fire, and the clean world must not ── */
const swapRow = (doc: string, id: string, fn: (cells: string[]) => string[]) =>
  doc.split("\n").map((l) => {
    if (!l.startsWith(`| ${id} |`)) return l;
    const c = l.split("|").slice(1, -1).map((x) => x.trim());
    return `| ${fn(c).join(" | ")} |`;
  }).join("\n");
const firstSha = execFileSync("git", ["rev-parse", "--short=8", "HEAD"], { cwd: ROOT }).toString().trim();

const plants: [string, RegExp, World][] = [
  ["a row vanishes", /§1 row WP9 is missing/, { ...world, doc: world.doc.split("\n").filter((l) => !l.startsWith("| WP9 |")).join("\n") }],
  ["a row is doubled", /§1 row WP2 appears 2 times/, { ...world, doc: world.doc.replace(/(\| WP2 \|[^\n]*\n)/, "$1$1") }],
  ["an unknown status", /§2 WP3: status "done"/, { ...world, doc: swapRow(world.doc, "WP3", (c) => [c[0], c[1], "done", c[3], c[4]]) }],
  ["✅ without a commit", /§2 WP4: ✅ cites no commit/, { ...world, doc: swapRow(world.doc, "WP4", (c) => [c[0], c[1], "✅", "", "2026-09-26 prod"]) }],
  ["✅ with an invented commit", /commit deadbeef1 does not exist/, { ...world, doc: swapRow(world.doc, "WP4", (c) => [c[0], c[1], "✅", "deadbeef1", "2026-09-26 prod"]) }],
  ["✅ without a measure date", /§2 WP4: ✅ carries no production-measure date/, { ...world, doc: swapRow(world.doc, "WP4", (c) => [c[0], c[1], "✅", firstSha, "looked fine"]) }],
  ["⬜ claiming a commit", /§2 WP8: ⬜ yet cites commit/, { ...world, doc: swapRow(world.doc, "WP8", (c) => [c[0], c[1], "⬜", firstSha, c[4]]) }],
  ["⛔ with no ruling", /§2 WP7: ⛔ cites no ruling/, { ...world, doc: swapRow(world.doc, "WP7", (c) => [c[0], c[1], "⛔", "", "not wanted"]) }],
  ["⛔ citing a ruling nobody made", /§2 WP7: cites R9/, { ...world, doc: swapRow(world.doc, "WP7", (c) => [c[0], c[1], "⛔", "", "R9"]) }],
  ["§0 undated", /§3 §0 has no dated/, { ...world, doc: world.doc.replace(/\*\*State \(20\d{2}-\d{2}-\d{2}\):\*\*/, "**State:**") }],
  ["§0 Next names a finished row", /§3 §0 Next names WP1/, { ...world, doc: world.doc.replace(/\*\*Next:\*\*[^\n]*/, "**Next:** WP1, the header") }],
  ["the board row disagrees", /§4 ▶ 0b says 7 ✅/, { ...world, board: world.board.replace(/v3 build \d+\//, "v3 build 7/") }],
];

let proved = 0;
const clean = check(world);
if (clean.length) { console.log(`INCONCLUSIVE: the clean world already fails (${clean[0]}) — fix it before proving red`); process.exit(1); }
for (const [name, want, w] of plants) {
  const planted = w.doc !== world.doc || w.board !== world.board;
  const fired = check(w).some((x) => want.test(x));
  const verdict = !planted ? "INCONCLUSIVE (plant did not apply)" : fired ? "PROVED" : "BLIND";
  if (planted && fired) proved++;
  console.log(`${verdict.padEnd(36)} ${name}`);
}
console.log(`\n${proved}/${plants.length} proved`);
process.exit(proved === plants.length ? 0 : 1);
