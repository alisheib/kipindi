/**
 * THE PHOSPHOR MIGRATION'S TRACKER CANNOT LIE — the guard on `docs/PHOSPHOR-MIGRATION.md` §0, §1 and §2, and on the
 * doors to it.
 *
 *   npx tsx scripts/phosphor-plan.test.mts               (npm run test:phosphor-plan)
 *   npx tsx scripts/phosphor-plan.test.mts --prove-red   (npm run red:phosphor-plan)
 *
 * Ali, 2026-10-17: "so if it sone done here any the rmahcine when we sya continue phosphor migration they know becuas
 * ewe hav emultipek ongoing plans alreya dnto tolose any progress … if ay new pages are cretaed we tlel them impelemtn
 * on any new pages rth ephosphor plan and they knwow".
 * A session on any machine resumes from §0 **Next:** and trusts §1's statuses, so all of these must hold:
 *   §1 every wave row exists once, and no unknown row appears
 *   §2 status discipline: ✅ cites a commit that exists · ⬜ cites none · ⛔ cites an R- key that §2 defines
 *   §3 §0 has a dated State line and a **Next:** line, and Next names no finished (✅/⛔) wave
 *   §4 the ordering law: W1 needs W0 ✅ · W2 (the swap) needs W1 ✅ · W3–W8 need W2 ✅ · W9 needs W0–W8 finished
 *   §5 docs/NEXT-PLAN.md carries exactly one live ▶ row for `PHOSPHOR-MIGRATION`; it links the tracker and its
 *      "N/M waves ✅" equals §1; any other heading carrying the key is struck
 *   §6 AGENTS.md points at the tracker, carries the phrase "continue phosphor migration", and states the law for
 *      every page (every icon comes from the glyph family)
 *   §7 docs/README.md indexes the tracker
 *   §8 the COMPLIANCE-DECISIONS entry the tracker names exists, and DESIGN_AUTHORITY's no-icon-library rule points at
 *      the migration, so the rulebook never contradicts the ruling unannounced
 *
 * Modelled on scripts/maswali-plan.test.mts. The red twin works on in-memory copies only: no file is written.
 */
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url);
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8").replace(/\r\n/g, "\n");
const DOC = "docs/PHOSPHOR-MIGRATION.md";
const BOARD = "docs/NEXT-PLAN.md";
const AGENTS = "AGENTS.md";
const INDEX = "docs/README.md";
const DECISIONS = "docs/COMPLIANCE-DECISIONS.md";
const DESIGN = "docs/DESIGN_AUTHORITY.md";
const TOKEN = "`PHOSPHOR-MIGRATION`";
const IDS = ["W0", "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9"];
const STATUSES = ["⬜", "🔨", "✅", "⛔"];
/** A commit: 7–40 hex characters holding at least one digit, standing alone. */
const SHA = /(?<![0-9A-Za-z])(?=[0-9a-f]*[0-9])[0-9a-f]{7,40}(?![0-9A-Za-z])/;
const WAVE = /(?<![0-9A-Za-z])W\d(?![0-9])/g;
const ENTRY = "2026-10-17 · Icons — every icon and glyph moves to Phosphor, in waves, live as each is proven (owner)";
/** The sentence AGENTS.md states for every page, new or old. */
const LAW = "Every icon on every page";

type Row = { id: string; title: string; status: string; note: string };
type World = {
  doc: string;
  board: string;
  agents: string;
  index: string;
  decisions: string;
  design: string;
  commitExists: (sha: string) => boolean;
};

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
    .filter((l) => l.startsWith("| ") && !l.startsWith("| Wave ") && !l.startsWith("|---"))
    .map((l) => l.split("|").slice(1, -1).map((c) => c.trim()))
    .filter((c) => c.length === 4)
    .map(([id, title, status, note]) => ({ id, title, status, note }));
}

function check(w: World): string[] {
  const f: string[] = [];
  const rows = rowsOf(w.doc);
  const status = (id: string) => rows.find((r) => r.id === id)?.status;
  const started = (id: string) => status(id) === "🔨" || status(id) === "✅";
  const finished = (id: string) => status(id) === "✅" || status(id) === "⛔";

  // §1 — the rows are the rows.
  const seen = new Map<string, number>();
  for (const r of rows) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
  for (const id of IDS) if (!seen.has(id)) f.push(`§1 row ${id} is missing from the board`);
  for (const [id, n] of seen) {
    if (n > 1) f.push(`§1 row ${id} appears ${n} times`);
    if (!IDS.includes(id)) f.push(`§1 row ${id} is not a known wave (add it to IDS on purpose)`);
  }

  // §2 — status discipline.
  const rKeys = new Set([...section(w.doc, "## §2 ·").matchAll(/^\| (R-[A-Z-]+) \|/gm)].map((m) => m[1]));
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
      const refs = [...r.note.matchAll(/(?<![A-Za-z])(R-[A-Z-]+)/g)].map((m) => m[1]);
      if (!refs.length) f.push(`§2 ${r.id}: ⛔ cites no ruling (an R- key)`);
      for (const ref of refs) if (!rKeys.has(ref)) f.push(`§2 ${r.id}: cites ${ref}, which §2 does not define`);
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
      for (const id of next.match(WAVE) ?? []) if (done.has(id)) f.push(`§3 §0 Next names ${id}, which is already finished`);
    }
  }

  // §4 — the ordering law. Nothing visual moves before the engine is proven, nothing builds on the family before the swap.
  if (started("W1") && status("W0") !== "✅") f.push("§4 W1 has started before W0 (the specimen and Ali's answers) is ✅");
  if (started("W2") && status("W1") !== "✅") f.push("§4 W2 (the swap) has started before W1 (the engine) is ✅");
  for (const id of ["W3", "W4", "W5", "W6", "W7", "W8"]) {
    if (started(id) && status("W2") !== "✅") f.push(`§4 ${id} has started before W2 (the swap) is ✅`);
  }
  if (started("W9")) {
    const open = IDS.filter((id) => id !== "W9" && !finished(id));
    if (open.length) f.push(`§4 W9 (the close) has started while ${open.join(", ")} are not finished`);
  }

  // §5 — the board row and the tracker agree.
  const lines = w.board.split("\n");
  const live = lines.map((l, i) => [l, i] as const).filter(([l]) => l.startsWith("## ▶") && l.includes(TOKEN));
  if (live.length !== 1) f.push(`§5 docs/NEXT-PLAN.md has ${live.length} live ▶ rows for PHOSPHOR-MIGRATION (want exactly 1)`);
  for (const l of lines) {
    if (/^## /.test(l) && l.includes(TOKEN) && !l.startsWith("## ▶") && !l.includes("~~")) {
      f.push(`§5 a heading carries PHOSPHOR-MIGRATION without being struck: ${l.slice(0, 60)}`);
    }
  }
  if (live.length === 1) {
    const [head, hi] = live[0];
    const nh = lines.findIndex((l, k) => k > hi && /^## /.test(l));
    if (!lines.slice(hi, nh < 0 ? undefined : nh).join("\n").includes("(PHOSPHOR-MIGRATION.md)")) {
      f.push("§5 the ▶ row never links PHOSPHOR-MIGRATION.md");
    }
    const m = head.match(/(\d+)\/(\d+) waves ✅/);
    if (!m) f.push("§5 the ▶ heading states no 'N/M waves ✅' count");
    else {
      const verified = rows.filter((r) => r.status === "✅").length;
      if (Number(m[1]) !== verified) f.push(`§5 ▶ row says ${m[1]} ✅, the board has ${verified}`);
      if (Number(m[2]) !== rows.length) f.push(`§5 ▶ row says ${m[2]} waves, the board has ${rows.length}`);
    }
  }

  // §6 — AGENTS.md is the door a cold session reads first, on every machine.
  if (!w.agents.includes("docs/PHOSPHOR-MIGRATION.md")) f.push("§6 AGENTS.md does not point at docs/PHOSPHOR-MIGRATION.md");
  if (!/continue phosphor migration/i.test(w.agents)) f.push("§6 AGENTS.md does not carry the phrase \"continue phosphor migration\"");
  const lawAt = w.agents.indexOf(LAW);
  if (lawAt < 0 || !w.agents.slice(lawAt, lawAt + 400).includes("`src/components/ui/glyphs`")) {
    f.push("§6 AGENTS.md does not state the law for every page (every icon comes from `src/components/ui/glyphs`)");
  }

  // §7 — the index lists the tracker.
  if (!w.index.split("\n").some((l) => l.startsWith("| [`PHOSPHOR-MIGRATION.md`](PHOSPHOR-MIGRATION.md) |"))) {
    f.push("§7 docs/README.md has no row for PHOSPHOR-MIGRATION.md");
  }

  // §8 — the ruling exists, and the rulebook points at it where it would otherwise contradict it.
  if (!w.doc.includes(ENTRY.slice(0, 60))) f.push("§8 the tracker no longer names its COMPLIANCE-DECISIONS entry");
  if (!w.decisions.includes(`## ${ENTRY}`)) f.push("§8 COMPLIANCE-DECISIONS.md has no entry headed with the 2026-10-17 Phosphor ruling");
  const dl = w.design.split("\n");
  const k3 = dl.findIndex((l) => l.includes("Never import an icon library"));
  if (k3 < 0) {
    if (!w.design.includes("(PHOSPHOR-MIGRATION.md)")) f.push("§8 DESIGN_AUTHORITY.md names neither the old rule nor the migration");
  } else if (!dl.slice(k3, k3 + 6).join("\n").includes("(PHOSPHOR-MIGRATION.md)")) {
    f.push("§8 DESIGN_AUTHORITY.md's no-icon-library rule does not point at PHOSPHOR-MIGRATION.md");
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
const world: World = {
  doc: read(DOC),
  board: read(BOARD),
  agents: read(AGENTS),
  index: read(INDEX),
  decisions: read(DECISIONS),
  design: read(DESIGN),
  commitExists,
};

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

const plants: [string, RegExp, World][] = [
  ["a row vanishes", /§1 row W5 is missing/, D((d) => d.split("\n").filter((l) => !l.startsWith("| W5 |")).join("\n"))],
  ["a row is doubled", /§1 row W2 appears 2 times/, D((d) => d.replace(/(\| W2 \|[^\n]*\n)/, "$1$1"))],
  ["an unknown status", /§2 W3: status "done"/, D(mark("W3", "done", "x"))],
  ["✅ without a commit", /§2 W4: ✅ cites no commit/, D(mark("W4", "✅", "looked fine"))],
  ["✅ with an invented commit", /commit deadbeef1 does not exist/, D(mark("W4", "✅", "deadbeef1"))],
  ["⬜ claiming a commit", /§2 W6: ⬜ yet cites commit/, D(mark("W6", "⬜", headSha))],
  ["⛔ with no ruling", /§2 W7: ⛔ cites no ruling/, D(mark("W7", "⛔", "not wanted"))],
  ["⛔ citing a ruling nobody made", /§2 W7: cites R-NOPE/, D(mark("W7", "⛔", "R-NOPE"))],
  ["§0 loses its State line", /§3 §0 has no \*\*State/, D((d) => d.replace(/\*\*State \(\d{4}-\d{2}-\d{2}\):\*\*/, "**State:**"))],
  ["§0 Next names a finished row", /§3 §0 Next names W8/, D((d) => mark("W8", "✅", headSha)(d).replace(/\*\*Next:\*\*[^\n]*/, "**Next:** W8, again"))],
  // Each ordering plant first re-opens the prerequisite, so it fires whatever the live board says.
  ["W1 before W0 is done", /§4 W1 has started before W0/, D((d) => mark("W1", "🔨", "codegen")(mark("W0", "🔨", "reopened")(d)))],
  ["the swap before the engine", /§4 W2 \(the swap\) has started before W1/, D((d) => mark("W2", "🔨", "swap")(mark("W1", "⬜", "")(d)))],
  ["a surface wave before the swap", /§4 W5 has started before W2/, D((d) => mark("W5", "🔨", "plates")(mark("W2", "⬜", "")(d)))],
  ["the close with waves open", /§4 W9 \(the close\) has started while/, D((d) => mark("W9", "🔨", "closing")(mark("W3", "⬜", "")(d)))],
  ["the ▶ row disagrees", /§5 ▶ row says 99 ✅/, { ...world, board: world.board.replace(/(## ▶[^\n]*`PHOSPHOR-MIGRATION`[^\n]*?)\d+\/(\d+) waves ✅/, "$199/$2 waves ✅") }],
  ["the ▶ row stops linking the plan", /never links PHOSPHOR-MIGRATION\.md/, { ...world, board: world.board.split("(PHOSPHOR-MIGRATION.md)").join("(elsewhere.md)") }],
  ["a second live ▶ row", /has 2 live ▶ rows/, { ...world, board: world.board + "\n## ▶ 9 · again — `PHOSPHOR-MIGRATION` · 0/10 waves ✅\n" }],
  ["an old heading un-struck", /a heading carries PHOSPHOR-MIGRATION without being struck/, { ...world, board: world.board + "\n## 9 · PHOSPHOR — `PHOSPHOR-MIGRATION` · live again\n" }],
  ["AGENTS.md loses the pointer", /AGENTS\.md does not point/, { ...world, agents: world.agents.split("docs/PHOSPHOR-MIGRATION.md").join("docs/ELSEWHERE.md") }],
  ["AGENTS.md loses the phrase", /does not carry the phrase/, { ...world, agents: world.agents.replace(/continue phosphor migration/gi, "carry on") }],
  ["AGENTS.md loses the law for every page", /does not state the law for every page/, { ...world, agents: world.agents.split(LAW).join("Some icons on some pages") }],
  ["the index loses the row", /§7 docs\/README\.md has no row/, { ...world, index: world.index.split("\n").filter((l) => !l.startsWith("| [`PHOSPHOR-MIGRATION.md`]")).join("\n") }],
  ["the ruling entry vanishes", /§8 COMPLIANCE-DECISIONS\.md has no entry/, { ...world, decisions: world.decisions.split(`## ${ENTRY}`).join("## renamed") }],
  ["the tracker stops naming its ruling", /§8 the tracker no longer names/, D((d) => d.split(ENTRY.slice(0, 60)).join("a ruling"))],
  ["the rulebook stops pointing at the migration", /does not point at PHOSPHOR-MIGRATION\.md/, { ...world, design: world.design.split("(PHOSPHOR-MIGRATION.md)").join("(elsewhere.md)") }],
];

const clean = check(world);
if (clean.length) {
  console.log(`INCONCLUSIVE: the clean world already fails (${clean[0]})`);
  process.exit(1);
}
let proved = 0;
for (const [name, want, w] of plants) {
  const planted =
    w.doc !== world.doc ||
    w.board !== world.board ||
    w.agents !== world.agents ||
    w.index !== world.index ||
    w.decisions !== world.decisions ||
    w.design !== world.design;
  const fired = check(w).some((x) => want.test(x));
  if (planted && fired) proved++;
  console.log(`${(!planted ? "INCONCLUSIVE (plant did not apply)" : fired ? "PROVED" : "BLIND").padEnd(36)} ${name}`);
}
console.log(`\n${proved}/${plants.length} caught`);
process.exit(proved === plants.length ? 0 : 1);
