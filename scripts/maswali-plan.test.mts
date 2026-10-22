/**
 * THE MASWALI PLAN'S TRACKER CANNOT LIE — the guard on `docs/MASWALI-PLAN.md` §0, §1 and §6, and on the doors to it.
 *
 *   npx tsx scripts/maswali-plan.test.mts               (npm run test:maswali-plan)
 *   npx tsx scripts/maswali-plan.test.mts --prove-red   (npm run red:maswali-plan)
 *
 * Ali, 2026-10-16: "so if any session come in future we tell it proceed with maswali plan i know what to do".
 * A session resumes from §0 **Next:** and trusts §1's statuses, so all of these must hold:
 *   §1 every session row exists once, and no unknown row appears
 *   §2 status discipline: ✅ cites a commit that exists · ⬜ cites none · ⛔ cites an OD-nn that §9 defines or an R- key
 *      that §2 defines
 *   §3 §0 has a dated State line and a **Next:** line, and Next names no finished (✅/⛔) session
 *   §4 the ordering law: D1 needs S0 ✅ · S1, S2 and S3 need S0.5 ✅ · S5 needs D3 ✅ · S8 starts once §6 holds no
 *      unticked ☐ but its "(after ACTIVE)" line, and is ✅ only with every ☐ ticked (Ali, 2026-10-22: the first public
 *      week is the drive, so the drive record can only be ticked after ACTIVE)
 *   §5 docs/NEXT-PLAN.md carries exactly one live ▶ row for `MASWALI-BUILD`; it links the tracker and its
 *      "N/M sessions ✅" equals §1; any other heading carrying the key is struck
 *   §6 AGENTS.md points at the tracker and carries the phrase "proceed with Maswali plan"
 *   §7 docs/README.md indexes the tracker
 *   §8 the COMPLIANCE-DECISIONS entry the tracker names exists
 *
 * Modelled on scripts/vodacom-plan.test.mts. The red twin works on in-memory copies only.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8").replace(/\r\n/g, "\n");
const DOC = "docs/MASWALI-PLAN.md";
const BOARD = "docs/NEXT-PLAN.md";
const AGENTS = "AGENTS.md";
const INDEX = "docs/README.md";
const DECISIONS = "docs/COMPLIANCE-DECISIONS.md";
const TOKEN = "`MASWALI-BUILD`";
const IDS = ["S0", "D1", "S0.5", "S1", "S2", "S3", "D2", "S4", "D3", "S5", "S6", "S7", "S8"];
const STATUSES = ["⬜", "🔨", "✅", "⛔"];
const SHA = /\b[0-9a-f]{7,40}\b/;
const SESSION = /\b(S0\.5|S\d|D\d)\b/g;
const ENTRY = "2026-10-16 · Maswali Millionea — the management-reviewed proposal of 2026-10-16 is final; every 2026-08-29 Maswali ruling is void (owner)";

type Row = { id: string; title: string; status: string; note: string };
type World = { doc: string; board: string; agents: string; index: string; decisions: string; commitExists: (sha: string) => boolean };

const section = (doc: string, head: string) => {
  const at = doc.indexOf(`\n${head}`);
  if (at < 0) return "";
  const rest = doc.slice(at + 1);
  const end = rest.indexOf("\n## ", 3);
  return end < 0 ? rest : rest.slice(0, end);
};

function rowsOf(doc: string): Row[] {
  return section(doc, "## §1 · Board")
    .split("\n")
    .filter((l) => l.startsWith("| ") && !l.startsWith("| Session ") && !l.startsWith("|---"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length === 4)
    .map(([id, title, status, note]) => ({ id, title, status, note }));
}

function check(w: World): string[] {
  const f: string[] = [];
  const rows = rowsOf(w.doc);
  const status = (id: string) => rows.find((r) => r.id === id)?.status;
  const started = (id: string) => status(id) === "🔨" || status(id) === "✅";

  // §1 — the rows are the rows.
  const seen = new Map<string, number>();
  for (const r of rows) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
  for (const id of IDS) if (!seen.has(id)) f.push(`§1 row ${id} is missing from the board`);
  for (const [id, n] of seen) {
    if (n > 1) f.push(`§1 row ${id} appears ${n} times`);
    if (!IDS.includes(id)) f.push(`§1 row ${id} is not a known session (add it to IDS on purpose)`);
  }

  // §2 — status discipline.
  const ods = new Set([...section(w.doc, "## §9 ·").matchAll(/\bOD-\d{2}b?\b/g)].map((m) => m[0]));
  const rKeys = new Set([...section(w.doc, "## §2 ·").matchAll(/^\| (R-[A-Z]+) \|/gm)].map((m) => m[1]));
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
      const refs = [...r.note.matchAll(/\b(OD-\d{2}b?|R-[A-Z]+)\b/g)].map((m) => m[1]);
      if (!refs.length) f.push(`§2 ${r.id}: ⛔ cites no ruling (OD-nn or R-…)`);
      for (const ref of refs) if (!ods.has(ref) && !rKeys.has(ref)) f.push(`§2 ${r.id}: cites ${ref}, which §2 and §9 do not define`);
    }
  }

  // §3 — §0 is where a session resumes.
  const s0 = section(w.doc, "## §0 · RESUME AT");
  if (!s0) f.push("§3 §0 RESUME AT is missing");
  else {
    if (!/\*\*State \(\d{4}-\d{2}-\d{2}\):\*\*/.test(s0)) f.push("§3 §0 has no **State (YYYY-MM-DD):** line");
    const next = s0.match(/\*\*Next:\*\*([^\n]*)/)?.[1];
    if (next === undefined) f.push("§3 §0 has no **Next:** line");
    else {
      const done = new Set(rows.filter((r) => r.status === "✅" || r.status === "⛔").map((r) => r.id));
      for (const id of next.match(SESSION) ?? []) if (done.has(id)) f.push(`§3 §0 Next names ${id}, which is already finished`);
    }
  }

  // §4 — the ordering law.
  if (started("D1") && status("S0") !== "✅") f.push("§4 D1 has started before S0 is ✅");
  for (const id of ["S1", "S2", "S3"]) if (started(id) && status("S0.5") !== "✅") f.push(`§4 ${id} has started before S0.5 (the fence) is ✅`);
  if (started("S5") && status("D3") !== "✅") f.push("§4 S5 has started before D3 (Ali's motion rulings) is ✅");
  const gate = section(w.doc, "## §6 ·");
  if (!gate.includes("☑") && !gate.includes("☐")) f.push("§4 §6 carries no launch-gate lines (☐ / ☑)");
  // The first public week is the S8 drive (Ali, 2026-10-22): the "(after ACTIVE)" line — the drive's record — can only
  // be ticked once ACTIVE has run, so it does not hold S8 back from starting; every other ☐ does, and S8 ✅ needs all.
  const beforeActive = gate.split("\n").filter((l) => l.includes("☐") && !l.includes("(after ACTIVE)"));
  if (started("S8") && beforeActive.length) f.push("§4 S8 has started while §6 still holds an unticked ☐ before ACTIVE");
  if (status("S8") === "✅" && gate.includes("☐")) f.push("§4 S8 is ✅ while §6 still holds an unticked ☐");

  // §5 — the board row and the tracker agree.
  const lines = w.board.split("\n");
  const live = lines.map((l, i) => [l, i] as const).filter(([l]) => l.startsWith("## ▶") && l.includes(TOKEN));
  if (live.length !== 1) f.push(`§5 docs/NEXT-PLAN.md has ${live.length} live ▶ rows for MASWALI-BUILD (want exactly 1)`);
  for (const l of lines) if (/^## /.test(l) && l.includes(TOKEN) && !l.startsWith("## ▶") && !l.includes("~~")) f.push(`§5 a heading carries MASWALI-BUILD without being struck: ${l.slice(0, 60)}`);
  if (live.length === 1) {
    const [head, hi] = live[0];
    const nh = lines.findIndex((l, k) => k > hi && /^## /.test(l));
    if (!lines.slice(hi, nh < 0 ? undefined : nh).join("\n").includes("(MASWALI-PLAN.md)")) f.push("§5 the ▶ row never links MASWALI-PLAN.md");
    const m = head.match(/(\d+)\/(\d+) sessions ✅/);
    if (!m) f.push("§5 the ▶ heading states no 'N/M sessions ✅' count");
    else {
      const verified = rows.filter((r) => r.status === "✅").length;
      if (Number(m[1]) !== verified) f.push(`§5 ▶ row says ${m[1]} ✅, the board has ${verified}`);
      if (Number(m[2]) !== rows.length) f.push(`§5 ▶ row says ${m[2]} sessions, the board has ${rows.length}`);
    }
  }

  // §6 — AGENTS.md is the door a cold session reads first.
  if (!w.agents.includes("docs/MASWALI-PLAN.md")) f.push("§6 AGENTS.md does not point at docs/MASWALI-PLAN.md");
  if (!/proceed with Maswali plan/i.test(w.agents)) f.push("§6 AGENTS.md does not carry the phrase \"proceed with Maswali plan\"");

  // §7 — the index lists the tracker.
  if (!w.index.split("\n").some((l) => l.startsWith("| [`MASWALI-PLAN.md`](MASWALI-PLAN.md) |"))) f.push("§7 docs/README.md has no row for MASWALI-PLAN.md");

  // §8 — the rulings the tracker cites exist.
  if (!w.doc.includes(ENTRY.slice(0, 60))) f.push("§8 the tracker no longer names its COMPLIANCE-DECISIONS entry");
  if (!w.decisions.includes(`## ${ENTRY}`)) f.push("§8 COMPLIANCE-DECISIONS.md has no entry headed with the 2026-10-16 Maswali ruling");
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
const world: World = { doc: read(DOC), board: read(BOARD), agents: read(AGENTS), index: read(INDEX), decisions: read(DECISIONS), commitExists };

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
const mark = (id: string, s: string, note: string) => (doc: string) => swapRow(doc, id, (c) => [c[0], c[1], s, note]);
const D = (fn: (d: string) => string): World => ({ ...world, doc: fn(world.doc) });
// §6 with every ☐ ticked but the "(after ACTIVE)" one — the state on the eve of the first public week.
const onlyAfterActive = (d: string) => {
  const g = section(d, "## §6 ·");
  const ticked = g.split("\n").map((l) => (l.includes("(after ACTIVE)") ? l : l.split("☐").join("☑"))).join("\n");
  return d.replace(g, () => ticked);
};

const plants: [string, RegExp, World][] = [
  ["a row vanishes", /§1 row S4 is missing/, D((d) => d.split("\n").filter((l) => !l.startsWith("| S4 |")).join("\n"))],
  // Anchored at the line start, like `swapRow`: §0's route table also carries an "| S2 |" cell (2026-10-17), and an
  // unanchored plant doubled the tail of THAT line — the board was untouched and the plant reported BLIND.
  ["a row is doubled", /§1 row S2 appears 2 times/, D((d) => d.replace(/^(\| S2 \|[^\n]*\n)/m, "$1$1"))],
  ["an unknown status", /§2 S3: status "done"/, D(mark("S3", "done", "x"))],
  ["✅ without a commit", /§2 S6: ✅ cites no commit/, D(mark("S6", "✅", "looked fine"))],
  ["✅ with an invented commit", /commit deadbeef1 does not exist/, D(mark("S6", "✅", "deadbeef1"))],
  ["⬜ claiming a commit", /§2 S7: ⬜ yet cites commit/, D(mark("S7", "⬜", headSha))],
  ["⛔ with no ruling", /§2 S6: ⛔ cites no ruling/, D(mark("S6", "⛔", "not wanted"))],
  ["⛔ citing a ruling nobody made", /§2 S6: cites OD-99/, D(mark("S6", "⛔", "OD-99"))],
  ["§0 loses its State line", /§3 §0 has no \*\*State/, D((d) => d.replace(/\*\*State \(\d{4}-\d{2}-\d{2}\):\*\*/, "**State:**"))],
  ["§0 Next names a finished row", /§3 §0 Next names S7/, D((d) => mark("S7", "✅", headSha)(d).replace(/\*\*Next:\*\*[^\n]*/, "**Next:** S7, again"))],
  // Each ordering plant first re-opens the prerequisite, so it fires whatever the live board says.
  ["D1 before S0 is done", /§4 D1 has started before S0/, D((d) => mark("D1", "🔨", "sending")(mark("S0", "🔨", "reopened")(d)))],
  ["S2 before the fence", /§4 S2 has started before S0\.5/, D((d) => mark("S2", "🔨", "engine")(mark("S0.5", "⬜", "")(d)))],
  ["S5 before Ali's motion rulings", /§4 S5 has started before D3/, D((d) => mark("S5", "🔨", "surfaces")(mark("D3", "⬜", "")(d)))],
  ["S8 with the gate unticked", /§4 S8 has started while §6/, D((d) => mark("S8", "🔨", "drive")(d).replace(/(## §6 ·[^\n]*\n)/, "$1\n☐ planted\n"))],
  ["S8 ✅ with only the after-ACTIVE line unticked", /§4 S8 is ✅ while §6/, D((d) => mark("S8", "✅", headSha)(onlyAfterActive(d)))],
  ["the ▶ row disagrees", /§5 ▶ row says 99 ✅/, { ...world, board: world.board.replace(/(## ▶[^\n]*`MASWALI-BUILD`[^\n]*?)\d+\/(\d+) sessions ✅/, "$199/$2 sessions ✅") }],
  ["the ▶ row stops linking the plan", /never links MASWALI-PLAN\.md/, { ...world, board: world.board.split("(MASWALI-PLAN.md)").join("(elsewhere.md)") }],
  ["a second live ▶ row", /has 2 live ▶ rows/, { ...world, board: world.board + "\n## ▶ 9 · again — `MASWALI-BUILD` · 0/13 sessions ✅\n" }],
  ["an old heading un-struck", /a heading carries MASWALI-BUILD without being struck/, { ...world, board: world.board.replace(/## 2 · ~~MASWALI MILLIONEA[^\n]*/, "## 2 · MASWALI MILLIONEA — `MASWALI-BUILD` · live again") }],
  ["AGENTS.md loses the pointer", /AGENTS\.md does not point/, { ...world, agents: world.agents.split("docs/MASWALI-PLAN.md").join("docs/ELSEWHERE.md") }],
  ["AGENTS.md loses the phrase", /does not carry the phrase/, { ...world, agents: world.agents.replace(/proceed with Maswali plan/gi, "carry on") }],
  ["the index loses the row", /§7 docs\/README\.md has no row/, { ...world, index: world.index.split("\n").filter((l) => !l.startsWith("| [`MASWALI-PLAN.md`]")).join("\n") }],
  ["the ruling entry vanishes", /§8 COMPLIANCE-DECISIONS\.md has no entry/, { ...world, decisions: world.decisions.split(`## ${ENTRY}`).join("## renamed") }],
];

const clean = check(world);
if (clean.length) {
  console.log(`INCONCLUSIVE: the clean world already fails (${clean[0]})`);
  process.exit(1);
}
let proved = 0;
for (const [name, want, w] of plants) {
  const planted = w.doc !== world.doc || w.board !== world.board || w.agents !== world.agents || w.index !== world.index || w.decisions !== world.decisions;
  const fired = check(w).some((x) => want.test(x));
  if (planted && fired) proved++;
  console.log(`${(!planted ? "INCONCLUSIVE (plant did not apply)" : fired ? "PROVED" : "BLIND").padEnd(36)} ${name}`);
}
// The control: on the eve of the first public week S8 may run — the after-ACTIVE line alone must not hold it back.
const eve = D((d) => mark("S8", "🔨", "drive")(onlyAfterActive(d)));
const eveFired = eve.doc === world.doc ? ["(plant did not apply)"] : check(eve).filter((x) => x.startsWith("§4 S8"));
console.log(`${(eveFired.length ? `FALSE ALARM ${eveFired[0]}` : "QUIET").padEnd(36)} control: S8 runs with only the after-ACTIVE line unticked`);
console.log(`\n${proved}/${plants.length} caught · control ${eveFired.length ? "failed" : "held"}`);
process.exit(proved === plants.length && !eveFired.length ? 0 : 1);
