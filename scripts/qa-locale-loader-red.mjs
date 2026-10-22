#!/usr/bin/env node
/**
 * red:locale-loader — every guard of the language-change loader's green and red goes RED on the defect it names.
 *
 *   npm run red:locale-loader                                  the offline guards (light; what `red:all` runs)
 *   BASE=http://localhost:3600 npm run red:locale-loader       and `qa:locale-loader`, against a `next dev` of THIS tree
 *
 * The owner's ruling of 2026-10-22 (DESIGN_AUTHORITY §B2a, "The owner's exception: the language-change loader") is held
 * by three offline guards — `test:visual-pass-r5i` §2.15⁗ and its census, `test:betting-ink` §7i, `test:design-frozen` —
 * and on screen by `qa:locale-loader`. Each case in `scripts/anchors/locale-loader.anchors.mjs` is written INTO
 * `src/lib/i18n.tsx` on disk, every guard it names must FAIL on that guard's NAMED check (red for another reason does not
 * count), and the file is restored byte-identical after each case and verified at the end.
 *
 * ⭐ THE BROWSER HALF. With `BASE` (a dev server of this working tree, which recompiles the planted file), each case's
 * `browser` checks must fail in `qa:locale-loader` (`LL_QUICK=1`: one width, one change), and the restored tree must pass
 * it again before the next case — so a stale page from the previous plant can never answer for this one. Without `BASE`
 * those cases print NOT RUN, by name; `greyed-ring` is proved ONLY there (no offline guard reads pixels).
 * ⛔ Before anything is planted, every guard must be GREEN on the untouched tree, or the harness refuses.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/locale-loader.anchors.mjs";

const SUITES = {
  "visual-pass-r5i": ["--import", "tsx", "scripts/visual-pass-r5i.test.mts"],
  "betting-ink": ["--import", "tsx", "scripts/betting-ink.test.mts"],
  "design-frozen": ["--import", "tsx", "scripts/design-frozen.test.mts"],
};
const BASE = process.env.BASE || process.env.KP_BASE || "";
const run = (args, env = {}) => {
  const r = spawnSync(process.execPath, args, { encoding: "utf8", env: { ...process.env, ...env }, maxBuffer: 64 * 1024 * 1024 });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
};
const browser = () => run(["scripts/qa-locale-loader.mjs"], { LL_QUICK: "1", BASE });
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
/** The dev server recompiles a planted file on the next request; give it three tries to answer with the new code. */
async function browserUntil(want) {
  let last = { code: 0, out: "" };
  for (let i = 0; i < 3; i++) {
    last = browser();
    if (want(last)) return { ok: true, last };
    await pause(5000);
  }
  return { ok: false, last };
}

const files = [...new Set(MUTATIONS.map((m) => m.file))];
const originals = new Map(files.map((f) => [f, readFileSync(f, "utf8")]));
const restore = () => { for (const [f, s] of originals) writeFileSync(f, s, "utf8"); };
let caught = 0, total = 0;
const problems = [];
const notRun = [];

try {
  for (const [name, args] of Object.entries(SUITES)) {
    const r = run(args);
    if (r.code !== 0) {
      console.error(`REFUSING: ${name} is already RED on the untouched tree:\n${r.out.split("\n").filter((l) => /FAIL/.test(l)).slice(0, 6).join("\n")}`);
      process.exit(1);
    }
  }
  console.log(`precondition: ${Object.keys(SUITES).join(", ")} GREEN on the untouched tree`);
  if (BASE) {
    const g = await browserUntil((r) => r.code === 0);
    if (!g.ok) { console.error(`REFUSING: qa:locale-loader is RED on the untouched tree at ${BASE}:\n${g.last.out.split("\n").filter((l) => /FAIL/.test(l)).slice(0, 6).join("\n")}`); process.exit(1); }
    console.log(`precondition: qa:locale-loader GREEN at ${BASE}`);
  } else {
    console.log("browser half: NOT RUN — no BASE (BASE=http://localhost:PORT npm run red:locale-loader, a dev server of this tree)");
  }

  for (const m of MUTATIONS) {
    const original = originals.get(m.file);
    let planted;
    try { planted = injectDefect(original, m.from, m.to); }
    catch (e) { problems.push(`${m.name}: ${e.message}`); console.log(`BROKEN ${m.name}: ${e.message}`); continue; }
    writeFileSync(m.file, planted, "utf8");
    try {
      for (const [suite, label, mention] of m.expect) {
        total++;
        const r = run(SUITES[suite]);
        const hit = r.code !== 0 && r.out.includes(`FAIL ${label}`) && (!mention || r.out.includes(mention));
        if (hit) { caught++; console.log(`RED ${m.name} → ${suite}: ${label}${mention ? ` (names ${mention})` : ""}`); }
        else { problems.push(`${m.name} → ${suite}: ${label}`); console.log(`MISSED ${m.name} → ${suite}: "${label}" (exit ${r.code})`); }
      }
      if (m.browser.length) {
        if (!BASE) { notRun.push(`${m.name} → qa:locale-loader: ${m.browser.join(" · ")}`); }
        else {
          total++;
          const b = await browserUntil((r) => r.code !== 0 && m.browser.every((l) => r.out.includes("FAIL") && r.out.split("\n").some((x) => x.includes("FAIL") && x.includes(l))));
          if (b.ok) { caught++; console.log(`RED ${m.name} → qa:locale-loader: ${m.browser.join(" · ")}`); }
          else { problems.push(`${m.name} → qa:locale-loader: ${m.browser.join(" · ")}`); console.log(`MISSED ${m.name} → qa:locale-loader (exit ${b.last.code})\n${b.last.out.split("\n").filter((l) => /FAIL|ok /.test(l)).slice(0, 12).join("\n")}`); }
        }
      }
    } finally {
      writeFileSync(m.file, original, "utf8");
    }
    if (BASE && m.browser.length) {
      const g = await browserUntil((r) => r.code === 0);
      if (!g.ok) { problems.push(`${m.name}: qa:locale-loader did not come back GREEN after the restore`); console.log(`NOT GREEN after restoring ${m.name}`); }
    }
  }
} finally {
  restore();
}

const intact = files.every((f) => readFileSync(f, "utf8") === originals.get(f));
console.log(`\ntree restored byte-identical: ${intact ? "yes" : "NO"} (${files.join(", ")})`);
for (const n of notRun) console.log(`NOT RUN (no BASE): ${n}`);
console.log(`red:locale-loader: ${caught}/${total} defects caught${problems.length ? `\n  ${problems.join("\n  ")}` : ""}`);
process.exitCode = problems.length || !intact ? 1 : 0;
