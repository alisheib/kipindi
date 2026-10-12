// Scratch (outside the repo): this session's own mutants for the v3 checks OMEGA's mutate.mjs does not cover. Each copies
// qa-classic-shell-parity.mjs here with ONE deliberate defect (one or more edits), runs it under the offline stub, and
// checks that the defect is seen:
//   · mode "prove"  — the stubbed --prove-red: every line of the named check PASSES on the clean file, and one FAILS on
//                     the mutant;
//   · mode "expect" — a run with `args` (and `env`): the clean file prints `expect` (and exits `exit`), the mutant does not.
// The copy reads the real worktree through KP_TREE; the browser is stubbed (preload.mjs), so only in-memory code runs.
// File arguments name files in this folder (the stubbed baseline's accepted, v2 and other-normaliser copies).
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = "C:/kipindi-s7/scripts/qa-classic-shell-parity.mjs";
const original = readFileSync(SRC, "utf8");
const PRELOAD = pathToFileURL(join(HERE, "preload.mjs")).href;

const EXTRA = [
  { check: "P.check B.0", why: "B.0 forgets to count the book's cells",
    from: '...(all.length === size && keys.every(([k]) => k in (book ?? {})) ? [] : [`the book holds ${all.length} cells`])', to: "...[]" },
  { check: "P.check B.0", why: "B.0 forgets A8 item 1's verdict",
    from: "fails: [...verdict.problems, ...(all.length", to: "fails: [...(all.length" },
  { check: "P.check B.1", why: "B.1 forgets the status (a 500 passes)",
    from: "fails: bad((r, c) => !c.stable || c.status !== 200 || c.landed !== r) },", to: "fails: bad((r, c) => !c.stable || c.landed !== r) }," },
  { check: "P.check B.2", why: "the probe stops asking /results for a settled NO card",
    from: 'if (!has(probe.results, "resolved-no")) results.push("no settled NO card on /results");', to: "" },
  { check: "P.check B.3", why: "the probe stops asking /watchlist for a done card",
    from: 'if (!has(probe.watchlist, "resolved-yes") && !has(probe.watchlist, "resolved-no")) watchlist.push("no done card on /watchlist");', to: "" },
  { check: "P.check B.4", why: "B.4 forgets og:url in /'s head",
    from: " || !/^og:url \\S/m.test(head(c));", to: ";" },
  { check: "P.check B.4", why: "B.4 forgets the similar rail",
    from: "(r === BOOK.similar ? c.regions?.similar?.count !== 1 : c.regions?.main?.count !== 1)", to: "(r === BOOK.similar ? false : c.regions?.main?.count !== 1)" },
  { check: "P.check B.8", why: "B.8 lets any page error be filed DEV-only",
    from: ".some((x) => !isDevMeasure(x))).map(([k, c]) => `${k} (filed DEV-only:", to: ".some((x) => false)).map(([k, c]) => `${k} (filed DEV-only:" },
  { check: "P.8s", why: "the verdict forgets the pool's floor of twelve",
    from: "if (m && pool < BOOK.markets) problems.push(", to: "if (false) problems.push(" },
  { check: "P.8s", why: "the verdict takes a door's 404 that still says ok",
    from: "if (d.status !== 200 || d.reply?.ok !== true) {", to: "if (d.reply?.ok !== true) {" },
  { check: "P.8p", why: "the probe accepts the voided question's card drawn as anything",
    from: 'else if (voided.state !== "void") results.push(', to: "else if (false) results.push(" },
  { check: "P.8p", why: "the classifier reads a one-sided card as an empty pool",
    from: 'if (marks.includes("mcardp-oneside")) return "one-sided";', to: "" },
  { check: "P.8h", why: "the head reader reads inside scripts (the RSC payload)",
    from: 'body.replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script\\s*>/gi, "")', to: "body" },
  { check: "P.8h", why: "the head reader reads inside comments",
    from: '.replace(/<!--[\\s\\S]*?-->/g, "")', to: "" },
  { check: "P.8n", why: "chart-paths' selector is handed to the page while it is off",
    from: 'chart: BOOK.normalise.includes("chart-paths") ? CHART_SVGS : null,', to: "chart: CHART_SVGS," },
  { mode: "expect", check: "--compare refuses a v2 file", why: "the version check takes any version of the kind",
    args: ["--compare", "stub-v2.json"], exit: 2, expect: "is not a v3 kp-classic-shell-parity capture",
    from: "if (baseline?.kind !== KIND || baseline.version !== VERSION) {", to: "if (baseline?.kind !== KIND) {" },
  { mode: "expect", check: "--compare names the normaliser set it refuses", why: "the set check is skipped (only the matrix check is left)",
    args: ["--compare", "stub-norm.json"], exit: 2, expect: "was captured with the book normalisers [market-ids], and this run uses [none]",
    from: "if (!theirs || [...theirs].sort().join() !== [...BOOK.normalise].sort().join()) {", to: "if (!theirs) {" },
  { mode: "expect", check: "--compare refuses another normaliser set at all", why: "the set check and the matrix check both look past the set",
    args: ["--compare", "stub-norm.json"], exit: 2, expect: "REFUSED — ",
    edits: [
      ["if (!theirs || [...theirs].sort().join() !== [...BOOK.normalise].sort().join()) {", "if (!theirs) {"],
      ["if (JSON.stringify(baseline.matrix) !== JSON.stringify(MATRIX)) refuse(", "if (JSON.stringify({ ...baseline.matrix, book: { ...baseline.matrix.book, normalise: BOOK.normalise } }) !== JSON.stringify(MATRIX)) refuse("],
    ] },
  { mode: "expect", check: "KP_PARITY_NORMALISE refuses a name that is no candidate", why: "the switch takes any name",
    args: [], env: { KP_PARITY_NORMALISE: "dates" }, exit: 2, expect: "KP_PARITY_NORMALISE names no candidate normaliser: dates",
    from: "if (unknown.length || !asked.length) refuse(", to: "if (false) refuse(" },
  { mode: "expect", check: "--norm switches the book's normalisers on for one run", why: "--norm is read no more (only the environment)",
    args: ["--compare", "stub-norm.json", "--norm", "market-ids"], exit: 1, expect: "the book's normalisers ON: market-ids — ⚠ set by --norm for this run",
    from: 'const NORM_SWITCHES = [["--norm", valueOf("--norm")], ["KP_PARITY_NORMALISE", process.env.KP_PARITY_NORMALISE || null]]', to: 'const NORM_SWITCHES = [["KP_PARITY_NORMALISE", process.env.KP_PARITY_NORMALISE || null]]' },
];

const run = (file, args = ["--prove-red"], env = {}) => {
  const r = spawnSync(process.execPath, ["--import", PRELOAD, file, ...args.map((a) => (/\.json$/.test(a) ? join(HERE, a) : a))], {
    encoding: "utf8", env: { ...process.env, KP_TREE: "C:/kipindi-s7", ...env }, maxBuffer: 64 * 1024 * 1024,
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
};
const lineOf = (out, check) => out.split(/\r?\n/).filter((l) => l.includes(` ${check} `) || l.includes(` ${check}—`) || l.includes(` ${check} —`));
const editsOf = (m) => m.edits ?? [[m.from, m.to]];

let bad = 0;
const cleanProve = run(SRC);
for (const m of EXTRA) {
  const edits = editsOf(m);
  const missing = edits.filter(([from]) => original.split(from).length !== 2);
  if (missing.length) { console.log(`ANCHOR NOT ONCE  ${m.check} — ${m.why}`); bad++; continue; }
  const file = join(HERE, "mutant-extra.mjs");
  writeFileSync(file, edits.reduce((s, [from, to]) => s.split(from).join(to), original), "utf8");
  let ok, note;
  if (m.mode === "expect") {
    const clean = run(SRC, m.args, m.env);
    const res = run(file, m.args, m.env);
    const cleanOk = clean.out.includes(m.expect) && (m.exit === undefined || clean.code === m.exit);
    ok = cleanOk && !res.out.includes(m.expect);
    note = `clean: exit ${clean.code}, says it ${clean.out.includes(m.expect)}; mutant: exit ${res.code}, says it ${res.out.includes(m.expect)} — ${res.out.split(/\r?\n/).find((l) => l.startsWith("REFUSED")) ?? "no refusal"}`.slice(0, 260);
  } else {
    const res = run(file);
    const fails = lineOf(res.out, m.check).filter((l) => l.includes("FAIL"));
    const cleanPass = lineOf(cleanProve.out, m.check).length > 0 && lineOf(cleanProve.out, m.check).every((l) => l.includes("PASS"));
    ok = fails.length > 0 && cleanPass;
    note = `clean passes: ${cleanPass}; failing lines: ${fails.length}; first: ${(fails[0] ?? "none").trim().slice(0, 150)}`;
  }
  if (!ok) bad++;
  console.log(`${ok ? "CAUGHT " : "MISSED "} ${m.check} — ${m.why}${ok ? "" : `  (${note})`}`);
  if (ok && m.mode === "expect") console.log(`         ${note}`);
}
console.log(`${EXTRA.length - bad}/${EXTRA.length} extra mutants caught`);
process.exit(bad ? 1 : 0);
