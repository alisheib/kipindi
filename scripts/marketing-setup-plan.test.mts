/**
 * THE MARKETING PROGRAMME'S TRACKER CANNOT LIE — the guard on
 * `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`.
 *
 *   npx tsx scripts/marketing-setup-plan.test.mts               (npm run test:marketing-setup-plan)
 *   npx tsx scripts/marketing-setup-plan.test.mts --prove-red   (npm run red:marketing-setup-plan)
 *
 * Ali, 2026-09-16: *"we need the right planner and progress planner to see where we are in any
 * session on any machine."* The plan IS the tracker, and a fresh session on a fresh PC trusts its
 * board. So every claim the board makes must be mechanically checkable, and this file checks it.
 *
 * Copied from the Mobile Visual Plan's guard (same harness, same helpers, same commit check), with
 * the anchors re-pointed at THIS programme and four checks that guard does not have:
 *
 * §1  · STATUS DISCIPLINE — ✅ needs a commit that exists, a measured before → after, a RED cell that
 *       starts `yes`, and a live date. 🔵 needs a commit and no date. ⏸ needs a reason. ⬜ claims nothing.
 * §1b · ⭐ THE GUARD AND RED COLUMNS ARE RESOLVED, NOT READ. A ✅/🔵 row's Guard key must exist in
 *       `package.json` and the script it runs must exist on disk; a ✅ row's RED cell must name a
 *       backticked red key that exists and is in-process (a `--prove-red` run whose source makes no
 *       file-writing call) or names a declared anchors file. Without this, "yes" beside a harness
 *       nobody wrote passes every other rule.
 * §1c · VISUAL UNITS SHOW THEIR STATES. A ✅ `visual` unit's §9 body carries a **States:** line naming
 *       at least six states, `loading` and `error` among them. Ali asked for progress bars, loading
 *       systems and rendering perfection; this is the only mechanical hold on them.
 * §2  · BOARD ↔ UNITS — every board row has a §9 heading and every heading has a board row.
 * §3  · DEFECTS — one register entry each, an owner that exists, the SAME owner on the board, the id
 *       written inside the owning unit's §9 text, and never ✅ before its unit.
 * §4  · §0's ▶ NEXT names no finished unit.
 * §5  · THE TWO DOORS AGREE — `docs/NEXT-PLAN.md`'s ▶ row for THIS programme (found by its own token,
 *       read from its own heading line only, so it cannot read the neighbouring programme's counts).
 * §6  · CLOSURE IS EARNED — 🏁 CLOSED only with every unit and defect ✅, every §1a condition dated,
 *       and the live-drive unit ✅.
 * §7  · EVERY TABLE RENDERS.
 * §8  · EVERY LEGAL QUESTION NAMED ANYWHERE HAS A §4a ROW WITH A SAFE DEFAULT. An open legal question
 *       with no built default is the failure this programme is written against.
 *
 * ⛔ IN-PROCESS BY CONSTRUCTION. `--prove-red` plants every lie IN MEMORY — on copies of the two
 * documents and of `package.json`, with a virtual file table — and requires the matching rule to
 * fire. This file makes no file-writing call of any kind (see `test:red-anchors` §4), so it stays
 * outside that ratchet's undeclared count. Keep it that way: add plants, never temp trees.
 *
 * ⛔ WHAT IT CANNOT SEE: whether a measurement is TRUE. Only whether it is present and consistent.
 * The live re-measure is proven by the unit's own drive (plan §11), not here.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url);
/* ⚠️ LINE ENDINGS ARE NORMALISED ON READ (S6, 2026-09-25). A checkout with `core.autocrlf=true` (the
 * Ali-Blade15 PC) holds every file as CRLF on disk while the index is LF, so two plants anchored on
 * "\n---\n\n## §10 —" found nothing and the red control scored 26/28 on CLEAN main there — it said so
 * ("PLANT DID NOT APPLY", exit 1), but it could not prove the tracker on that machine at all. A guard
 * whose verdict depends on which PC ran it is two guards. */
const read = (rel: string) => readFileSync(new URL(rel, ROOT), "utf8").replace(/\r\n/g, "\n");
const PLAN_FILE = "MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md";
const TOKEN = "MARKETING-CAMPAIGN-AND-CONTACTS-SETUP";

/** A split may only ADD units or defects. Lowering either needs a §2 log entry saying why. */
const MIN_UNITS = 52;
const MIN_DEFECTS = 25;
/** The unit whose ✅ is the live drive — closure is impossible without it. */
const LIVE_DRIVE_UNIT = "U52";

type Pkg = { scripts: Record<string, string> };
type World = {
  doc: string;
  board: string;
  pkg: Pkg;
  /** repo-relative path → exists? */
  exists: (rel: string) => boolean;
  /** repo-relative path → source text, or null */
  source: (rel: string) => string | null;
  anchorNames: string[];
  commitExists: (sha: string) => boolean;
};

const SHA = /\b[0-9a-f]{7,40}\b/;
const DATE = /\b20\d{2}-\d{2}-\d{2}\b/;
const BT = String.fromCharCode(96);
/** The write calls `test:red-anchors` treats as "not in-process". Built from parts on purpose. */
const WRITE_CALL = new RegExp(
  "\\b(?:" + ["write" + "FileSync", "write" + "File", "append" + "FileSync", "rm" + "Sync", "unlink" + "Sync",
    "rename" + "Sync", "copy" + "FileSync", "cp" + "Sync"].join("|") + ")\\s*\\(",
);

const cells = (row: string) => row.split("|").slice(1, -1).map((c) => c.trim());
const isTableRow = (l: string) => /^\|/.test(l) && !/^\|\s*:?-{3,}/.test(l);
const scriptOf = (cmd: string) => (cmd.match(/(scripts\/[\w./-]+\.(?:mts|mjs|cjs|ts|js))/) || [])[1] || null;

function check(w: World, log: (line: string) => void): string[] {
  const fails: string[] = [];
  const ok = (name: string, cond: boolean, detail = "") => {
    if (cond) log(`  ok   ${name}`);
    else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  };
  const lines = w.doc.split(/\r?\n/);
  /** From a heading that starts with `startsWith` to the next level-2 heading. */
  const section = (startsWith: string): string[] => {
    const i = lines.findIndex((l) => l.startsWith(startsWith));
    if (i < 0) return [];
    const j = lines.findIndex((l, k) => k > i && /^## /.test(l));
    return lines.slice(i, j < 0 ? undefined : j);
  };

  // ── §1 · unit rows ──────────────────────────────────────────────────────────────────────────
  log("\n§1 · STATUS DISCIPLINE");
  const boardLines = section("## §1 —");
  const unitRows = boardLines.filter((l) => isTableRow(l) && /^\|\s*U\d+\b/.test(l));
  ok(`§1 the board carries at least ${MIN_UNITS} unit rows`, unitRows.length >= MIN_UNITS, `found ${unitRows.length}`);
  const unitIds = new Set<string>();
  const unitStatus = new Map<string, string>();
  const unitKind = new Map<string, string>();
  for (const row of unitRows) {
    // | Unit | Kind | Status | Session | Commit | Before → After | Guard | RED | Live · notes |
    const c = cells(row);
    const id = (c[0].match(/^U\d+/) || ["?"])[0];
    unitIds.add(id);
    const kind = c[1] ?? "", status = c[2] ?? "", commit = c[4] ?? "", measured = c[5] ?? "";
    const guard = c[6] ?? "", red = c[7] ?? "", live = c.slice(8).join(" ");
    unitStatus.set(id, status);
    unitKind.set(id, kind);
    const sha = (commit.match(SHA) || [""])[0];

    if (status.includes("✅")) {
      ok(`§1 ${id} ✅ names a commit that exists`, !!sha && w.commitExists(sha), `commit cell: "${commit}"`);
      ok(`§1 ${id} ✅ records a measured before → after`,
        /\S\s*→\s*\S/.test(measured) && measured.replace(/[→\s—-]/g, "").length > 0, `measured cell: "${measured}"`);
      ok(`§1 ${id} ✅ says its guard was RED-proven`, /^(yes|y|✅)/i.test(red), `RED cell: "${red}"`);
      ok(`§1 ${id} ✅ carries a live-verification date`, DATE.test(live), `live cell: "${live}"`);
    } else if (status.includes("🔵")) {
      ok(`§1 ${id} 🔵 names a commit that exists`, !!sha && w.commitExists(sha), `commit cell: "${commit}"`);
      ok(`§1 ${id} 🔵 has no live date yet`, !DATE.test(live), `live cell: "${live}" — mark it ✅ instead`);
    } else if (status.includes("⏸")) {
      ok(`§1 ${id} ⏸ states a reason`, live.replace(/[—\s-]/g, "").length > 3, "held rows must say why");
    } else if (status.includes("⬜") || status.includes("🟡")) {
      if (status.includes("⬜")) {
        ok(`§1 ${id} ⬜ claims nothing`, !SHA.test(commit) && !/→/.test(measured) && !DATE.test(live),
          `commit "${commit}" measured "${measured}" live "${live}"`);
      }
    } else {
      ok(`§1 ${id} uses a legend status`, false, `status cell: "${status}"`);
    }

    // §1b · the Guard and RED columns resolve to real things
    if (status.includes("✅") || status.includes("🔵")) {
      const key = (guard.match(/`([a-z0-9:-]+)`/) || [])[1] || "";
      const cmd = key ? w.pkg.scripts[key] : undefined;
      ok(`§1b ${id} guard key resolves in package.json`, !!cmd, `guard cell: "${guard}"`);
      if (cmd) {
        const target = scriptOf(cmd);
        ok(`§1b ${id} guard script exists on disk`, !!target && w.exists(target), `command: "${cmd}"`);
      }
    }
    if (status.includes("✅")) {
      const redKey = (red.match(/`(red:[a-z0-9:-]+)`/) || [])[1] || "";
      const redCmd = redKey ? w.pkg.scripts[redKey] : undefined;
      ok(`§1b ${id} RED cell names a red control that exists`, !!redCmd, `RED cell: "${red}"`);
      if (redCmd) {
        const target = scriptOf(redCmd);
        const src = target ? w.source(target) : null;
        const inProcess = /--prove-red/.test(redCmd) && src !== null && !WRITE_CALL.test(src);
        const anchored = w.anchorNames.some((n) => redCmd.includes(n));
        ok(`§1b ${id} red control is in-process or declares anchors`, inProcess || anchored, `command: "${redCmd}"`);
      }
    }
  }

  // ── §2 · board ↔ units ──────────────────────────────────────────────────────────────────────
  log("\n§2 · BOARD ↔ UNITS");
  const unitsSection = section("## §9 —");
  const unitBody = new Map<string, string>();
  {
    let cur = "";
    for (const l of unitsSection) {
      const h = l.match(/^\*\*(U\d+)\s·/);
      if (h) { cur = h[1]; unitBody.set(cur, l); continue; }
      if (/^###? /.test(l)) { cur = ""; continue; }
      if (cur) unitBody.set(cur, `${unitBody.get(cur)}\n${l}`);
    }
  }
  for (const id of unitIds) ok(`§2 ${id} has a unit section in §9`, unitBody.has(id));
  for (const id of unitBody.keys()) ok(`§2 ${id} has a row on the board`, unitIds.has(id));

  // §1c · visual units show their states (needs the §9 bodies)
  for (const [id, status] of unitStatus) {
    if (!status.includes("✅") || !/visual/i.test(unitKind.get(id) || "")) continue;
    const body = (unitBody.get(id) || "").split("\n");
    const at = body.findIndex((l) => /^-?\s*\*\*States:\*\*/.test(l));
    ok(`§1c ${id} ✅ visual unit shows its states`, at >= 0, "no **States:** line in its §9 body");
    if (at >= 0) {
      const para: string[] = [];
      for (let k = at; k < body.length; k++) {
        if (k > at && (/^\s*$/.test(body[k]) || /^\*\*/.test(body[k]))) break;
        para.push(body[k]);
      }
      const states = para.join(" ").replace(/^-?\s*\*\*States:\*\*/, "").split(" · ").map((s) => s.trim()).filter(Boolean);
      const joined = states.join(" | ").toLowerCase();
      ok(`§1c ${id} names at least six states, loading and error among them`,
        states.length >= 6 && /\bloading\b/.test(joined) && /\berror\b/.test(joined), `states: ${states.length} — "${joined.slice(0, 120)}"`);
    }
  }

  // ── §3 · defects ────────────────────────────────────────────────────────────────────────────
  log("\n§3 · DEFECTS");
  // The register (§8) is a list: `- **D1 · …** … **U1**`, the LAST bold unit id is the owner.
  const register: { id: string; owner: string }[] = [];
  {
    let cur: { id: string; text: string } | null = null;
    const flush = () => {
      if (!cur) return;
      const owners = cur.text.match(/\*\*(U\d+)\*\*/g) || [];
      register.push({ id: cur.id, owner: (owners[owners.length - 1] || "").replace(/\*/g, "") });
      cur = null;
    };
    for (const l of section("## §8 —")) {
      const m = l.match(/^- \*\*(D\d+)\s·/);
      if (m) { flush(); cur = { id: m[1], text: l }; continue; }
      if (/^(- |#|---)/.test(l)) { flush(); continue; }
      if (cur) cur.text += `\n${l}`;
    }
    flush();
  }
  ok(`§3 the register carries at least ${MIN_DEFECTS} defects`, register.length >= MIN_DEFECTS, `found ${register.length}`);
  const regIds = register.map((r) => r.id);
  ok("§3 every defect is registered exactly once in §8", new Set(regIds).size === regIds.length,
    `duplicates: ${regIds.filter((id, i) => regIds.indexOf(id) !== i).join(", ")}`);
  const regOwner = new Map(register.map((r) => [r.id, r.owner]));
  for (const r of register) ok(`§3 ${r.id} names an owning unit that exists`, !!r.owner && unitIds.has(r.owner), `owner: "${r.owner}"`);

  // The board's defect table: | Id | Owner | State | One line |
  const defectRows = boardLines.filter((l) => isTableRow(l) && /^\|\s*D\d+\b/.test(l));
  const boardOwner = new Map<string, string>();
  let defectsDone = 0;
  for (const row of defectRows) {
    const c = cells(row);
    const id = (c[0].match(/^D\d+/) || ["?"])[0];
    const owner = ((c[1] ?? "").match(/U\d+/) || [""])[0];
    const status = c[2] ?? "";
    boardOwner.set(id, owner);
    if (status.includes("✅")) {
      defectsDone++;
      const reg = regOwner.get(id) || owner;
      ok(`§3 ${id} ✅ only after its unit ${reg || "?"} is ✅`, !!reg && (unitStatus.get(reg) || "").includes("✅"),
        `unit status: "${unitStatus.get(reg) || "unknown"}"`);
    } else if (status.includes("🔵")) {
      const sha = (status.match(SHA) || [""])[0];
      ok(`§3 ${id} 🔵 names the commit that shipped it`, !!sha && w.commitExists(sha), `state cell: "${status}"`);
    } else if (status.includes("⬜")) {
      ok(`§3 ${id} ⬜ claims no commit`, !SHA.test(status), `state cell: "${status}"`);
    } else {
      ok(`§3 ${id} uses a legend status`, false, `state cell: "${status}"`);
    }
  }
  for (const id of new Set(regIds)) {
    ok(`§3 ${id} has a row on the §1 board`, boardOwner.has(id), "registered but not tracked");
    const reg = regOwner.get(id) || "";
    if (boardOwner.has(id)) ok(`§3 ${id} has one owner in §1 and §8`, reg === boardOwner.get(id), `board ${boardOwner.get(id) || "?"}, register ${reg || "?"}`);
    ok(`§3 ${id} is named inside its owning unit ${reg || "?"}`, new RegExp(`\\b${id}\\b`).test(unitBody.get(reg) || ""),
      `${reg || "?"} never mentions ${id} — its fix is not written anywhere`);
  }
  for (const id of boardOwner.keys()) ok(`§3 ${id} on the board is in the §8 register`, regIds.includes(id), "tracked but never described");

  // ── §4 · NEXT does not point at finished work ──────────────────────────────────────────────
  log("\n§4 · RESUME AT");
  const nextLine = (section("## §0 —").join("\n").match(/^\s*▶ NEXT:.*$/m) || [""])[0];
  ok("§4 §0 has a ▶ NEXT line", nextLine.trim().length > 0);
  for (const id of new Set(nextLine.match(/U\d+/g) || [])) {
    ok(`§4 NEXT names ${id}, which is not finished`, !(unitStatus.get(id) || "").includes("✅"), `status: "${unitStatus.get(id)}"`);
  }

  // ── §5 · the two doors agree ───────────────────────────────────────────────────────────────
  log("\n§5 · BOARD COUNTS AGREE WITH NEXT-PLAN");
  const unitsDone = [...unitStatus.values()].filter((s) => s.includes("✅")).length;
  const boardDoc = w.board.split(/\r?\n/);
  const hi = boardDoc.findIndex((l) => /^## ▶/.test(l) && l.includes(TOKEN));
  ok("§5 NEXT-PLAN has a ▶ row for this programme", hi >= 0, `no '## ▶ … ${TOKEN} …' heading`);
  if (hi >= 0) {
    const m = boardDoc[hi].match(/(\d+)\s*\/\s*(\d+)\s*units[^\d]{0,20}(\d+)\s*\/\s*(\d+)\s*defects/i);
    const nextHeading = boardDoc.findIndex((l, k) => k > hi && /^## /.test(l));
    const rowBody = boardDoc.slice(hi, nextHeading < 0 ? undefined : nextHeading).join("\n");
    ok("§5 that row links this plan", rowBody.includes(`(${PLAN_FILE})`), "the row never links the file it counts");
    ok("§5 that row's heading carries the counts", !!m, `heading: "${boardDoc[hi].slice(0, 140)}"`);
    if (m) {
      const [, uDone, uTotal, dDone, dTotal] = m.map(Number);
      ok("§5 units done agree", uDone === unitsDone, `NEXT-PLAN ${uDone} vs plan ${unitsDone}`);
      ok("§5 unit total agrees", uTotal === unitRows.length, `NEXT-PLAN ${uTotal} vs plan ${unitRows.length}`);
      ok("§5 defects done agree", dDone === defectsDone, `NEXT-PLAN ${dDone} vs plan ${defectsDone}`);
      ok("§5 defect total agrees", dTotal === register.length, `NEXT-PLAN ${dTotal} vs plan ${register.length}`);
    }
  }

  // ── §6 · closure is earned ─────────────────────────────────────────────────────────────────
  log("\n§6 · CLOSURE");
  if (/🏁\s*CLOSED/.test(lines.slice(0, 40).join("\n"))) {
    ok("§6 every unit is ✅", unitsDone === unitRows.length, `${unitsDone}/${unitRows.length}`);
    ok("§6 every defect is ✅", defectsDone === defectRows.length, `${defectsDone}/${defectRows.length}`);
    const conditions = section("### §1a —").filter((l) => /^\d+\.\s/.test(l));
    ok("§6 every §1a closure condition is dated", conditions.length > 0 && conditions.every((l) => DATE.test(l)),
      `${conditions.filter((l) => DATE.test(l)).length}/${conditions.length} dated`);
    ok(`§6 the live-drive unit ${LIVE_DRIVE_UNIT} is ✅`, (unitStatus.get(LIVE_DRIVE_UNIT) || "").includes("✅"));
  } else {
    ok("§6 the programme does not claim closure yet", true);
  }

  // ── §7 · every table renders ───────────────────────────────────────────────────────────────
  log("\n§7 · TABLES RENDER");
  {
    const isLine = (l: string | undefined) => /^\s*\|/.test(l || "");
    const isSep = (l: string | undefined) => /^\s*\|(\s*:?-{3,}:?\s*\|)+\s*$/.test(l || "");
    let fenced = false;
    const orphans: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*```/.test(lines[i])) { fenced = !fenced; continue; }
      if (fenced || !isLine(lines[i]) || isLine(lines[i - 1])) continue;
      let end = i;
      while (isLine(lines[end + 1])) end++;
      if (end === i || !isSep(lines[i + 1])) orphans.push(`line ${i + 1}: ${lines[i].trim().slice(0, 60)}`);
      i = end;
    }
    ok("§7 no table row sits outside a table", orphans.length === 0, orphans.join(" · "));
  }

  // ── §8 · every legal question has a built default ──────────────────────────────────────────
  log("\n§8 · LEGAL QUESTIONS");
  const oqRows = section("### §4a —").filter((l) => isTableRow(l) && /^\|\s*OQ\d+\b/.test(l));
  ok("§8 §4a lists the legal questions", oqRows.length > 0);
  const oqDefault = new Map(oqRows.map((r) => { const c = cells(r); return [(c[0].match(/OQ\d+/) || [""])[0], c[2] ?? ""]; }));
  for (const [id, def] of oqDefault) ok(`§8 ${id} ships with a safe default`, def.replace(/[—\s-]/g, "").length > 3, `default cell: "${def}"`);
  for (const id of new Set(w.doc.match(/\bOQ\d+\b/g) || [])) ok(`§8 ${id} has a §4a row`, oqDefault.has(id), "named but never asked");

  return fails;
}

// ── the real world ───────────────────────────────────────────────────────────────────────────
const realWorld = (): World => {
  const anchorsDir = new URL("scripts/anchors/", ROOT);
  return {
    doc: read(`docs/${PLAN_FILE}`),
    board: read("docs/NEXT-PLAN.md"),
    pkg: JSON.parse(read("package.json")) as Pkg,
    exists: (rel) => existsSync(new URL(rel, ROOT)),
    source: (rel) => (existsSync(new URL(rel, ROOT)) ? read(rel) : null),
    anchorNames: existsSync(anchorsDir)
      ? readdirSync(anchorsDir).filter((f) => f.endsWith(".anchors.mjs")).map((f) => f.replace(/\.anchors\.mjs$/, ""))
      : [],
    commitExists: (sha) => {
      try { execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: ROOT, stdio: "ignore" }); return true; }
      catch { return false; }
    },
  };
};

if (!process.argv.includes("--prove-red")) {
  const fails = check(realWorld(), (l) => console.log(l));
  console.log(`\nMARKETING SETUP TRACKER — ${fails.length === 0 ? "all checks passed" : `${fails.length} failed`}\n`);
  for (const f of fails) console.log(`  · ${f}`);
  process.exitCode = fails.length === 0 ? 0 : 1;
} else {
  // ── RED CONTROL, in memory ─────────────────────────────────────────────────────────────────
  const base = realWorld();
  const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim().slice(0, 10);
  const today = "2026-09-17";
  const quiet = () => {};

  const rowOf = (doc: string, id: string) => doc.split(/\r?\n/).find((l) => new RegExp(`^\\|\\s*${id}\\s*\\|`).test(l)) || "";
  const setRow = (doc: string, id: string, f: (c: string[]) => string[]) => {
    const row = rowOf(doc, id);
    return row ? doc.replace(row, `| ${f(cells(row)).join(" | ")} |`) : doc;
  };
  const bumpBoard = (board: string, units: number, defects = 0) =>
    board.replace(new RegExp(`(## ▶[^\\n]*${TOKEN}[^\\n]*?)(\\d+)\\s*/\\s*(\\d+)\\s*units([^\\d]{0,20})(\\d+)\\s*/\\s*(\\d+)\\s*defects`),
      (_m, pre, _u, ut, mid, _d, dt) => `${pre}${units}/${ut} units${mid}${defects}/${dt} defects`);
  const redCell = "yes · " + BT + "red:marketing-setup-plan" + BT;
  const guardCell = BT + "test:marketing-setup-plan" + BT;
  /** A fully valid ✅ row, so a plant is caught by the ONE break it makes and nothing else. */
  const done = (c: string[], extra: Partial<Record<number, string>> = {}) => {
    const out = [c[0], c[1], "✅", "S1", head, "1 → 2", guardCell, redCell, `${today} · proven`];
    for (const [k, v] of Object.entries(extra)) out[Number(k)] = v as string;
    return out;
  };
  /**
   * 🔴 THE BOARD IS BUMPED TO THE COUNT THE PLANTED DOC ACTUALLY HAS, AND IT USED TO BE
   * HARD-CODED TO 1.
   *
   * ⛔ THIS HARNESS'S CONTROLS HAD BEEN FAILING SINCE THE PROGRAMME PASSED ITS FIRST ✅ UNIT,
   * WHICH MEANS `red:marketing-setup-plan` HAS BEEN PROVING NOTHING FOR FOUR SESSIONS. It read
   * `bumpBoard(w.board, 1)` — correct on the day it was written, when exactly one unit was done
   * — so every control world claimed "1 unit done" on a board whose plan said 7. §5 rightly
   * reported the disagreement, the run printed RED CONTROL INVALID, and none of the fifteen
   * planted lies below was ever evaluated. Measured 2026-09-25 against the previous commit:
   * the plan had 7 ✅ rows and the control wrote 1.
   *
   * ⭐ A CONTROL THAT ENCODES A NUMBER THE WORLD IS GOING TO MOVE PAST IS A CONTROL WITH AN
   * EXPIRY DATE ON IT. The counts are now DERIVED from the planted document, so this cannot rot
   * again at 9 units, or at 52.
   */
  /**
   * 🔴 THE STATUS CELL, NEVER THE WHOLE ROW — AND THE FIRST VERSION OF THESE HELPERS READ
   * THE WHOLE ROW, WHICH IS HOW `firstUnitNotDone` ANSWERED "U5".
   *
   * U5 is ✅, and its NOTES cell legitimately says "⛔ D6 stays ⬜ — its substance is OQ4". A
   * scan of the row for the glyph ⬜ therefore matched a sentence ABOUT another row's status,
   * and the plant was aimed at a finished unit — where setting a commit breaks nothing, so it
   * went MISSED against a tracker that was working perfectly.
   * ⭐ A STATUS IS A CELL, NOT A WORD THAT APPEARS SOMEWHERE ON THE LINE. Every one of these
   * reads column 2 and nothing else.
   */
  const rowCells = (line: string): string[] => line.replace(/^\||\|$/g, "").split("|").map((x) => x.trim());
  const statusOf = (line: string): string => rowCells(line)[2] ?? "";
  const idRows = (doc: string, prefix: string): string[] =>
    doc.split(/\r?\n/).filter((l) => new RegExp(`^\\|\\s*${prefix}\\d+\\s*\\|`).test(l));
  const doneUnitsIn = (doc: string): number =>
    idRows(doc, "U").filter((l) => statusOf(l).includes("✅")).length;
  const doneDefectsIn = (doc: string): number =>
    idRows(doc, "D").filter((l) => statusOf(l).includes("✅")).length;

  /**
   * ⭐ A PLANT MUST FIND ITS OWN TARGET, OR IT DIES THE DAY THAT UNIT IS FINISHED.
   *
   * Three plants below aimed at `U3` and `U1` because those were ⬜ when this harness was
   * written. They are ✅ now, so "a ⬜ row claiming a commit" was planted onto a row that
   * legitimately claims one, and "▶ NEXT naming a finished unit" marked a unit ▶ NEXT does not
   * name. Both went MISSED against a tracker that was working correctly — the harness was
   * describing a board from four sessions ago.
   */
  const firstUnitNotDone = (doc: string): string => {
    const hit = idRows(doc, "U").find((l) => statusOf(l) === "⬜");
    return hit ? rowCells(hit)[0] : "U9";
  };
  /** The first unit id the ▶ NEXT line actually names — that is the one §4 is about. */
  const unitNamedByNext = (doc: string): string => {
    const line = (doc.match(/^\s*▶ NEXT:.*$/m) || [""])[0];
    return (line.match(/U\d+/) || ["U9"])[0];
  };
  /** A defect whose OWNING unit is still ⬜ — the only shape "✅ before its unit" can take. */
  const defectAheadOfItsUnit = (doc: string): string => {
    const owners = new Map<string, string>();
    for (const m of doc.matchAll(/^- \*\*(D\d+)\s·[^\n]*\*\*(U\d+)\*\*/gm)) owners.set(m[1], m[2]);
    const status = new Map<string, string>();
    for (const l of idRows(doc, "U")) status.set(rowCells(l)[0], statusOf(l));
    for (const [d, u] of owners) if ((status.get(u) || "") === "⬜") return d;
    return "D1";
  };

  const withDone = (id: string, extra: Partial<Record<number, string>> = {}) => (w: World): World => {
    const doc = setRow(w.doc, id, (c) => done(c, extra));
    return { ...w, doc, board: bumpBoard(w.board, doneUnitsIn(doc), doneDefectsIn(doc)) };
  };
  const unitSlice = (doc: string, id: string) => {
    const start = doc.search(new RegExp(`^\\*\\*${id}\\s·`, "m"));
    const rest = doc.slice(start + 3);
    const nextRel = rest.search(/^(\*\*U\d+\s·|###? )/m);
    return { start, end: nextRel < 0 ? doc.length : start + 3 + nextRel };
  };
  const editUnit = (doc: string, id: string, f: (body: string) => string) => {
    const { start, end } = unitSlice(doc, id);
    return start < 0 ? doc : doc.slice(0, start) + f(doc.slice(start, end)) + doc.slice(end);
  };

  type Plant = { name: string; expect: RegExp; apply: (w: World) => World };
  const plants: Plant[] = [
    { name: "✅ naming a commit that does not exist", expect: /names a commit that exists/,
      apply: withDone("U3", { 4: "deadbeefdeadbeef" }) },
    { name: "✅ with no measurement", expect: /measured before → after/, apply: withDone("U3", { 5: "—" }) },
    { name: "✅ with an arrow and nothing either side", expect: /measured before → after/, apply: withDone("U3", { 5: "→" }) },
    { name: "✅ whose RED cell says no", expect: /RED-proven/, apply: withDone("U3", { 7: "no · " + BT + "red:marketing-setup-plan" + BT }) },
    { name: "✅ with no live date", expect: /live-verification date/, apply: withDone("U3", { 8: "proven" }) },
    { name: "🔵 already carrying a live date", expect: /has no live date yet/,
      apply: (w) => ({ ...w, doc: setRow(w.doc, "U3", (c) => { const d = done(c); d[2] = "🔵"; return d; }) }) },
    { name: "⬜ claiming a commit", expect: /claims nothing/,
      apply: (w) => ({ ...w, doc: setRow(w.doc, firstUnitNotDone(w.doc), (c) => { c[4] = head; return c; }) }) },
    { name: "⏸ with no reason", expect: /states a reason/,
      apply: (w) => ({ ...w, doc: setRow(w.doc, "U3", (c) => { c[2] = "⏸"; c[8] = "—"; return c; }) }) },
    { name: "a status that is not in the legend", expect: /uses a legend status/,
      apply: (w) => ({ ...w, doc: setRow(w.doc, "U3", (c) => { c[2] = "🟢"; return c; }) }) },
    { name: "✅ whose guard key is not in package.json", expect: /guard key resolves in package.json/,
      apply: withDone("U3", { 6: BT + "test:ghost" + "-guard" + BT }) },
    { name: "✅ whose guard script is missing from disk", expect: /guard script exists on disk/,
      apply: (w) => { const v = withDone("U3")(w); return { ...v, exists: (rel) => !rel.includes("marketing-setup-plan.test") && w.exists(rel) }; } },
    { name: "✅ whose RED cell names no red control", expect: /RED cell names a red control that exists/,
      apply: withDone("U3", { 7: "yes" }) },
    { name: "✅ whose red control writes files and declares no anchors", expect: /red control is in-process or declares anchors/,
      apply: (w) => {
        const v = withDone("U3", { 7: "yes · " + BT + "red:fake-writer" + BT })(w);
        return {
          ...v,
          pkg: { scripts: { ...w.pkg.scripts, ["red:" + "fake-writer"]: "node scripts/fake-writer-red.mjs" } },
          exists: (rel) => rel === "scripts/fake-writer-red.mjs" || w.exists(rel),
          source: (rel) => (rel === "scripts/fake-writer-red.mjs" ? "cp" + "Sync(a, b);" : w.source(rel)),
        };
      } },
    { name: "a ✅ visual unit with its States line deleted", expect: /shows its states/,
      apply: (w) => { const v = withDone("U8")(w); return { ...v, doc: editUnit(v.doc, "U8", (b) => b.replace(/\*\*States:\*\*[^\n]*\n/, "")) }; } },
    { name: "a ✅ visual unit naming only five states", expect: /at least six states/,
      apply: (w) => { const v = withDone("U8")(w); return { ...v, doc: editUnit(v.doc, "U8", (b) => b.replace(/(\*\*States:\*\*[^\n]*?) · [^·\n]*error\./, "$1.")) }; } },
    { name: "a board row with no §9 section", expect: /has a unit section in §9/,
      apply: (w) => ({ ...w, doc: w.doc.replace(rowOf(w.doc, "U52"), `${rowOf(w.doc, "U52")}\n| U53 | pure | ⬜ | — | — | — | — | — | planted |`) }) },
    { name: "a §9 section with no board row", expect: /has a row on the board/,
      apply: (w) => ({ ...w, doc: w.doc.replace("\n---\n\n## §10 —", "\n**U54 · Planted**\nnothing\n\n---\n\n## §10 —") }) },
    { name: "a defect owned by a unit that does not exist", expect: /names an owning unit that exists/,
      apply: (w) => ({ ...w, doc: w.doc.replace(/(- \*\*D1 ·[\s\S]*?)\*\*U1\*\*/, "$1**U99**") }) },
    { name: "a defect with a different owner on the board", expect: /one owner in §1 and §8/,
      apply: (w) => ({ ...w, doc: setRow(w.doc, "D6", (c) => { c[1] = "U4"; return c; }) }) },
    { name: "a defect its owning unit never mentions", expect: /is named inside its owning unit/,
      apply: (w) => ({ ...w, doc: editUnit(w.doc, "U12", (b) => b.replace(/\bD12\b/g, "Dxx")) }) },
    { name: "a defect ✅ while its unit is ⬜", expect: /only after its unit/,
      // ⛔ THE BOARD IS BUMPED TO THE COUNTS THE PLANTED DOC HAS, so §5 stays quiet and the
      // ONE break this plant makes is the one that gets reported. A plant that also breaks the
      // counts is a plant whose failure could be attributed to either.
      apply: (w) => {
        const doc = setRow(w.doc, defectAheadOfItsUnit(w.doc), (c) => { c[2] = "✅"; return c; });
        return { ...w, doc, board: bumpBoard(w.board, doneUnitsIn(doc), doneDefectsIn(doc)) };
      } },
    // ⛔ THE UNIT ▶ NEXT ACTUALLY NAMES, read from the document. Hard-coding `U1` meant this
    // plant marked a unit ▶ NEXT has not named since session 1 — it broke nothing §4 looks at.
    { name: "▶ NEXT naming a finished unit", expect: /which is not finished/,
      apply: (w) => withDone(unitNamedByNext(w.doc))(w) },
    { name: "NEXT-PLAN counts that disagree", expect: /units done agree/, apply: (w) => ({ ...w, board: bumpBoard(w.board, 3) }) },
    { name: "a NEXT-PLAN row that never links the plan", expect: /that row links this plan/,
      apply: (w) => ({ ...w, board: w.board.split(`(${PLAN_FILE})`).join("(elsewhere.md)") }) },
    { name: "a table row outside any table", expect: /no table row sits outside a table/,
      apply: (w) => ({ ...w, doc: w.doc.replace("\n---\n\n## §10 —", "\n| orphan | row |\n\n---\n\n## §10 —") }) },
    { name: "a closure claim that is not earned", expect: /every unit is ✅/,
      apply: (w) => ({ ...w, doc: w.doc.replace(/^\*\*STATUS — [^\n]*/m, "**STATUS — 🏁 CLOSED**") }) },
    { name: "a legal question named but never asked", expect: /has a §4a row/,
      // ⛔ ANCHORED ON THE MARKER, NOT ON A SENTENCE. This plant used to quote
      // "◐ HALF-DONE: nothing." verbatim — a line §0 stopped carrying the moment a unit went
      // half-done, so the plant silently became a no-op. A control anchored to prose is a
      // control that dies the next time somebody writes an honest status line.
      apply: (w) => ({ ...w, doc: w.doc.replace(/^◐ HALF-DONE:.*$/m, "◐ HALF-DONE: waiting on OQ99.") }) },
    { name: "a legal question with no safe default", expect: /ships with a safe default/,
      apply: (w) => ({ ...w, doc: w.doc.replace(/^(\| OQ1 \|[^|]*\|)[^|]*\|/m, "$1 — |") }) },
  ];

  let bad = 0;
  const controls: [string, World][] = [
    ["the untouched plan", base],
    ["a fully valid ✅ pure unit (U3)", withDone("U3")(base)],
    ["a fully valid ✅ visual unit (U8)", withDone("U8")(base)],
  ];
  for (const [name, world] of controls) {
    const f = check(world, quiet);
    if (f.length === 0) console.log(`control  ${name} passes cleanly`);
    else { bad++; console.log(`CONTROL FAILED  ${name}:\n    ${f.join("\n    ")}`); }
  }
  if (bad) {
    console.log("\nRED CONTROL INVALID — a control fails, so no planted lie below would prove anything.");
    process.exitCode = 1;
  } else {
    let caught = 0;
    for (const p of plants) {
      const planted = p.apply(base);
      if (planted.doc === base.doc && planted.board === base.board && planted.pkg === base.pkg && planted.exists === base.exists) {
        console.log(`PLANT DID NOT APPLY  ${p.name}`);
        continue;
      }
      const f = check(planted, quiet);
      const hit = f.some((x) => p.expect.test(x));
      if (hit) caught++;
      console.log(`${hit ? "CAUGHT" : "MISSED"}  ${p.name}${hit ? "" : ` — failures: ${f.length ? f.slice(0, 3).join(" | ") : "none"}`}`);
    }
    console.log(`\nRED — ${caught}/${plants.length} planted lies caught`);
    process.exitCode = caught === plants.length ? 0 : 1;
  }
}
