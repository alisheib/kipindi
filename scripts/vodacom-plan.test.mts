/**
 * THE VODACOM PLAN'S TRACKER CANNOT LIE — the guard on `docs/VODACOM-PLAN.md` §0 and §1.
 *
 *   npx tsx scripts/vodacom-plan.test.mts               (npm run test:vodacom-plan)
 *   npx tsx scripts/vodacom-plan.test.mts --prove-red   (npm run red:vodacom-plan)
 *
 * Ali, 2026-09-29: "in any new session when i say continue vodacom plan they should continue it perfectly".
 * A session resumes from §0 **Next:** and trusts §1's statuses, so both must be true:
 *   §1 every session row exists once, and no unknown row appears
 *   §2 status discipline:
 *      - ✅ cites a commit that exists in this repository;
 *      - ⬜ cites none;
 *      - ⛔ cites a ruling (R-n or SJ-n) that the v5 INHERIT-MANIFEST defines
 *   §3 §0 has a State line and a **Next:** line, and Next names no finished (✅/⛔) session
 *   §4 docs/NEXT-PLAN.md carries a ▶ row for `VODACOM-PLAN` that links the tracker, and its "N/M sessions ✅" count
 *      equals the board
 *
 * Modelled on scripts/landing-ten-plan.test.mts. The red twin works on in-memory copies only, so it never touches a
 * file on disk.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8").replace(/\r\n/g, "\n");
const DOC = "docs/VODACOM-PLAN.md";
const MANIFEST = "docs/design-system/v5-2026-09-29-simplified-journey/INHERIT-MANIFEST.md";
const BOARD = "docs/NEXT-PLAN.md";
const TOKEN = "`VODACOM-PLAN`";
const IDS = ["S0", "S1", "S2", "S3", "S3b", "S4", "S5", "S6", "S7", "S8", "S9", "S10", "S11", "S12", "S13", "S14", "S15", "S16"];
const STATUSES = ["⬜", "🔨", "✅", "⛔"];
const SHA = /\b[0-9a-f]{7,40}\b/;
const RULING = /\b(R\d+|SJ-\d+b?)\b/g;

type Row = { id: string; title: string; status: string; note: string };
type World = { doc: string; manifest: string; board: string; commitExists: (sha: string) => boolean };

function rowsOf(doc: string): Row[] {
  const start = doc.indexOf("## §1 · Board");
  if (start < 0) return [];
  const rest = doc.slice(start);
  const end = rest.indexOf("\n## ", 5);
  return (end < 0 ? rest : rest.slice(0, end))
    .split("\n")
    .filter((l) => l.startsWith("| ") && !l.startsWith("| Session ") && !l.startsWith("|---"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length === 4)
    .map(([id, title, status, note]) => ({ id, title, status, note }));
}

function check(w: World): string[] {
  const f: string[] = [];
  const rows = rowsOf(w.doc);

  // §1 — the rows are the rows.
  const seen = new Map<string, number>();
  for (const r of rows) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
  for (const id of IDS) if (!seen.has(id)) f.push(`§1 row ${id} is missing from the board`);
  for (const [id, n] of seen) {
    if (n > 1) f.push(`§1 row ${id} appears ${n} times`);
    if (!IDS.includes(id)) f.push(`§1 row ${id} is not a known session (add it to IDS on purpose)`);
  }

  // §2 — status discipline.
  const defined = new Set([...w.manifest.matchAll(/^\| (R\d+|SJ-\d+b?) \|/gm)].map((m) => m[1]));
  for (const r of rows) {
    if (!STATUSES.includes(r.status)) {
      f.push(`§2 ${r.id}: status "${r.status}" is not one of ${STATUSES.join(" ")}`);
      continue;
    }
    const sha = r.note.match(SHA)?.[0];
    if (r.status === "✅") {
      if (!sha) f.push(`§2 ${r.id}: ✅ cites no commit`);
      else if (!w.commitExists(sha)) f.push(`§2 ${r.id}: commit ${sha} does not exist in this repository`);
    }
    if (r.status === "⬜" && sha) f.push(`§2 ${r.id}: ⬜ yet cites commit ${sha}`);
    if (r.status === "⛔") {
      const refs = [...r.note.matchAll(RULING)].map((m) => m[1]);
      if (!refs.length) f.push(`§2 ${r.id}: ⛔ cites no ruling (R-n or SJ-n)`);
      for (const ref of refs) if (!defined.has(ref)) f.push(`§2 ${r.id}: cites ${ref}, which the INHERIT-MANIFEST does not define`);
    }
  }

  // §3 — §0 is where a session resumes.
  const s0 = w.doc.match(/## §0 · RESUME AT[\s\S]*?(?=\n## )/)?.[0] ?? "";
  if (!s0) f.push("§3 §0 RESUME AT is missing");
  else {
    if (!/\*\*State \(\d{4}-\d{2}-\d{2}\):\*\*/.test(s0)) f.push("§3 §0 has no **State (YYYY-MM-DD):** line");
    const next = s0.match(/\*\*Next:\*\*([^\n]*)/)?.[1];
    if (next === undefined) f.push("§3 §0 has no **Next:** line");
    else {
      const done = new Set(rows.filter((r) => r.status === "✅" || r.status === "⛔").map((r) => r.id));
      for (const id of next.match(/\bS\d+b?\b/g) ?? []) if (done.has(id)) f.push(`§3 §0 Next names ${id}, which is already finished`);
    }
  }

  // §4 — the board row and the tracker agree.
  const lines = w.board.split("\n");
  const hi = lines.findIndex((l) => l.startsWith("## ▶") && l.includes(TOKEN));
  if (hi < 0) f.push("§4 docs/NEXT-PLAN.md has no ▶ row for VODACOM-PLAN");
  else {
    const nh = lines.findIndex((l, k) => k > hi && /^## /.test(l));
    if (!lines.slice(hi, nh < 0 ? undefined : nh).join("\n").includes("(VODACOM-PLAN.md)")) f.push("§4 the ▶ row never links VODACOM-PLAN.md");
    const m = lines[hi].match(/(\d+)\/(\d+) sessions ✅/);
    if (!m) f.push("§4 the ▶ heading states no 'N/M sessions ✅' count");
    else {
      const verified = rows.filter((r) => r.status === "✅").length;
      if (Number(m[1]) !== verified) f.push(`§4 ▶ row says ${m[1]} ✅, the board has ${verified}`);
      if (Number(m[2]) !== rows.length) f.push(`§4 ▶ row says ${m[2]} sessions, the board has ${rows.length}`);
    }
  }
  return f;
}

const commitExists = (sha: string) => {
  try {
    execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: ROOT, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};
const world: World = { doc: read(DOC), manifest: read(MANIFEST), board: read(BOARD), commitExists };

if (!process.argv.includes("--prove-red")) {
  const fails = check(world);
  for (const x of fails) console.log(`FAIL ${x}`);
  const rows = rowsOf(world.doc);
  console.log(`\n${rows.length} rows · ${rows.filter((r) => r.status === "✅").length} ✅ · ${fails.length} failure(s)`);
  process.exit(fails.length ? 1 : 0);
}

// ── --prove-red: every rule must be able to fail. Plants live on in-memory copies. ──
const swapRow = (doc: string, id: string, fn: (c: string[]) => string[]) =>
  doc
    .split("\n")
    .map((l) => {
      if (!l.startsWith(`| ${id} |`)) return l;
      const c = l.split("|").slice(1, -1).map((x) => x.trim());
      return `| ${fn(c).join(" | ")} |`;
    })
    .join("\n");
const headSha = execFileSync("git", ["rev-parse", "--short=8", "HEAD"], { cwd: ROOT }).toString().trim();

const plants: [string, RegExp, World][] = [
  ["a row vanishes", /§1 row S7 is missing/, { ...world, doc: world.doc.split("\n").filter((l) => !l.startsWith("| S7 |")).join("\n") }],
  ["a row is doubled", /§1 row S2 appears 2 times/, { ...world, doc: world.doc.replace(/(\| S2 \|[^\n]*\n)/, "$1$1") }],
  ["an unknown status", /§2 S3: status "done"/, { ...world, doc: swapRow(world.doc, "S3", (c) => [c[0], c[1], "done", c[3]]) }],
  ["✅ without a commit", /§2 S4: ✅ cites no commit/, { ...world, doc: swapRow(world.doc, "S4", (c) => [c[0], c[1], "✅", "looked fine"]) }],
  ["✅ with an invented commit", /commit deadbeef1 does not exist/, { ...world, doc: swapRow(world.doc, "S4", (c) => [c[0], c[1], "✅", "deadbeef1"]) }],
  ["⬜ claiming a commit", /§2 S6: ⬜ yet cites commit/, { ...world, doc: swapRow(world.doc, "S6", (c) => [c[0], c[1], "⬜", headSha]) }],
  ["⛔ with no ruling", /§2 S8: ⛔ cites no ruling/, { ...world, doc: swapRow(world.doc, "S8", (c) => [c[0], c[1], "⛔", "not wanted"]) }],
  ["⛔ citing a ruling nobody made", /§2 S8: cites SJ-999/, { ...world, doc: swapRow(world.doc, "S8", (c) => [c[0], c[1], "⛔", "SJ-999"]) }],
  ["§0 Next names a finished row", /§3 §0 Next names S5/, { ...world, doc: world.doc.replace(/\*\*Next:\*\*[^\n]*/, "**Next:** S5, the colours") }],
  ["the ▶ row disagrees", /§4 ▶ row says 99 ✅/, { ...world, board: world.board.replace(/(## ▶[^\n]*`VODACOM-PLAN`[^\n]*?)\d+\/(\d+) sessions ✅/, "$199/$2 sessions ✅") }],
  ["the ▶ row stops linking the plan", /never links VODACOM-PLAN\.md/, { ...world, board: world.board.split("(VODACOM-PLAN.md)").join("(elsewhere.md)") }],
];

const clean = check(world);
if (clean.length) {
  console.log(`INCONCLUSIVE: the clean world already fails (${clean[0]})`);
  process.exit(1);
}
let proved = 0;
for (const [name, want, w] of plants) {
  const planted = w.doc !== world.doc || w.board !== world.board;
  const fired = check(w).some((x) => want.test(x));
  if (planted && fired) proved++;
  console.log(`${(!planted ? "INCONCLUSIVE (plant did not apply)" : fired ? "PROVED" : "BLIND").padEnd(36)} ${name}`);
}
console.log(`\n${proved}/${plants.length} caught`);
process.exit(proved === plants.length ? 0 : 1);
