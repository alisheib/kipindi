/**
 * RED PROOF for `npm run qa:results-board`.
 *
 * ⛔ WHY THIS FILE EXISTS AND WHY THE OBVIOUS PROOF WAS NOT ONE. Running the new guard against
 * production makes it go red — but for the WRONG REASON: production predates the `data-chip`
 * attributes, so the guard cannot read any promise and correctly refuses on an absent premise. A
 * red light caused by a missing selector is not evidence that the guard catches the DEFECT. (This
 * codebase has been burned by a guard and its own red proof agreeing and both being wrong.)
 *
 * So this reintroduces the real defect — the category being dropped whenever a search is active,
 * which is what production actually did — and asserts the guard fails on the COMPOSITION
 * assertion specifically, not on a rotted selector.
 *
 * ⚠️ Needs a dev server on the target URL; it edits `src/app/results/page.tsx` in place, lets the
 * server recompile, then restores from an in-memory copy in a `finally`.
 *
 * Run: npm run red:results-filter -- [baseUrl]      (default http://localhost:3009)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";

const BASE = process.argv[2] || "http://localhost:3009";
const SRC = "src/app/results/page.tsx";

/** The defect exactly as production shipped it: a search wipes the category out of the read. */
const DEFECT = {
  name: "the category is dropped whenever a search is active (what production did)",
  from: "  const all = activeCat === \"all\" ? searched : searched.filter((m) => m.category === activeCat);",
  to: "  const all = searching ? searched : (activeCat === \"all\" ? searched : searched.filter((m) => m.category === activeCat));",
};

const original = readFileSync(SRC, "utf8");
let failures = 0;

/** @returns {{code:number, out:string}} */
function guard() {
  try {
    const out = execFileSync("node", ["scripts/live-results-board.mjs", BASE], { encoding: "utf8", stdio: "pipe" });
    return { code: 0, out };
  } catch (e) {
    return { code: e.status ?? 1, out: `${e.stdout ?? ""}${e.stderr ?? ""}` };
  }
}

const settle = () => execFileSync("node", ["-e", "setTimeout(()=>{},4000)"], { stdio: "ignore" });

try {
  console.log("\n── baseline: the guard must be GREEN before the defect goes back in ──");
  const base = guard();
  if (base.code === 0) console.log("  PASS baseline green");
  else { console.log(`  FAIL baseline is already red (exit ${base.code})\n${base.out}`); failures++; }

  console.log(`\n── reintroducing: ${DEFECT.name} ──`);
  writeFileSync(SRC, injectDefect(original, DEFECT.from, DEFECT.to), "utf8");
  settle(); // let the dev server recompile the route

  const red = guard();
  if (red.code === 0) {
    console.log("  FAIL the guard stayed GREEN with the defect reintroduced");
    failures++;
  } else {
    // ⛔ Insist it failed for the RIGHT reason. A red caused by "no [data-chip] found" would mean
    // the harness had broken the page rather than restored the defect.
    // ⚠️ This pattern used to be the guard's exact sentence, `promised N, delivered N`. The guard's
    // wording changed and the pattern silently stopped matching, so a correct red proof reported
    // "not on promise-vs-delivery" — a harness coupled to another file's prose. It now keys on the
    // durable parts: a failing line that names a category AND reports a delivered/stated number.
    const failLines = red.out.split("\n").filter((l) => l.includes("FAIL"));
    const composed =
      failLines.some((l) => /cat=\w+/.test(l) && /(delivered|states|delivers)/.test(l)) &&
      !/selector may have rotted/.test(red.out);
    if (composed) {
      console.log(`  PASS the guard went red (exit ${red.code}) on the promise-vs-delivery assertion`);
      for (const line of failLines.slice(0, 8)) console.log(`      ${line.trim()}`);
      if (failLines.length > 8) console.log(`      … and ${failLines.length - 8} more`);
    } else {
      console.log("  FAIL the guard went red, but not on promise-vs-delivery — it could not read the rail");
      console.log(red.out);
      failures++;
    }
  }
} finally {
  writeFileSync(SRC, original, "utf8");
  const restored = readFileSync(SRC, "utf8") === original;
  console.log(restored ? `\n  restored ${SRC}` : `\n  ⛔ RESTORE FAILED — check git diff ${SRC}`);
  if (!restored) failures++;
  settle();
}

console.log(failures === 0
  ? "\n✅ qa:results-board catches the defect production shipped\n"
  : `\n❌ ${failures} problem(s) — the guard does not prove what it claims\n`);
process.exit(failures === 0 ? 0 : 1);
