/**
 * red:section-rail — THE CONTROL FOR `test:section-rail` (§K rule 7g).
 *
 * ⛔ BUILD THE CONTROL BEFORE BELIEVING THE GATE. `test:section-rail` sits at ZERO findings at
 * HEAD, and a gate at zero is indistinguishable from a gate that cannot find anything — this
 * programme has shipped that exact mistake more than once (session 82's contrast fix scored the
 * real defect as PASS until its own control caught it).
 *
 * 7g specifies the control: delete `aria-current` from `bottom-nav.tsx`, `legal-nav.tsx` or
 * `admin-mobile-nav.tsx` and the finding count must rise, WITH THE POPULATION HELD STEADY — so
 * the control moves the FINDING and not the DENOMINATOR. It is proved three ways here, once per
 * named file, plus a fourth run that removes the rail entirely to prove the VACUITY floor bites.
 *
 * ⛔ EVERY MUTATION IS DONE ON A COPY OF THE TREE AND THE ORIGINAL IS NEVER WRITTEN. The copy
 * is a temp dir; the gate is pointed at it through KP_SRC.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { MUTATIONS, VACUITY_TARGETS } from "./anchors/section-rail.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "section-rail.test.mts");

/** Run the gate against a given src root; return { code, population, findings }. */
function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8", env: { ...process.env, KP_SRC: srcRoot }, shell: process.platform === "win32",
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const pop = /rails in population\s+(\d+)/.exec(out);
  const find = /🔴 (\d+) rail\(s\) map destinations/.exec(out);
  return { code: r.status, population: pop ? Number(pop[1]) : null, findings: find ? Number(find[1]) : 0, out };
}

function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-rail-"));
  const src = join(dir, "src");
  cpSync(join(REPO, "src"), src, { recursive: true });
  try { return fn(src); } finally { rmSync(dir, { recursive: true, force: true }); }
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:section-rail — the control for §K rule 7g");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(join(REPO, "src"));
console.log(`  HEAD                     population ${base.population} · findings ${base.findings} · exit ${base.code}`);
if (base.findings !== 0) {
  console.log("\n🔴 HEAD is not at zero findings — the control cannot prove anything from here.");
  process.exit(1);
}

let bad = 0;

for (const mut of MUTATIONS) {
  const rel = mut.file.replace(/^src\//, "");
  const res = withCopy((src) => {
    const f = join(src, rel);
    let s;
    try { s = readFileSync(f, "utf8"); } catch { return { missing: true }; }
    // ⛔ AN EXACT ANCHOR, NOT A REGEX SWEEP. A global `replace(/aria-current/g, …)` would also
    // rewrite the word inside COMMENTS and CSS selectors — `legal-nav.tsx:120` documents
    // `.kp-navlink[aria-current="page"]` in prose — so the "control" would be mutating text
    // that never reaches the DOM, and a gate could appear to notice a defect that was never
    // planted. If the anchor no longer matches, that is reported as ANCHOR ROT, never skipped
    // quietly: an anchor that stops matching is how a control silently stops controlling.
    if (!s.includes(mut.from)) return { rot: true };
    writeFileSync(f, s.replace(mut.from, mut.to));
    return runGate(src);
  });
  if (res.missing || res.rot) {
    console.log(`  🔴 ${mut.file} — ${res.missing ? "FILE NOT FOUND" : "ANCHOR ROT: `from` no longer matches"}`);
    console.log(`       ${res.rot ? "The rail was reformatted. Re-anchor it in scripts/anchors/section-rail.anchors.mjs." : ""}`);
    bad = 1;
    continue;
  }
  const movedFinding = res.findings > base.findings;
  const steadyPopulation = res.population === base.population;
  const ok = movedFinding && steadyPopulation && res.code !== 0;
  console.log(`  ${ok ? "✅" : "🔴"} ${mut.name}`);
  console.log(`       population ${res.population} (HEAD ${base.population}) · findings ${res.findings} (HEAD ${base.findings}) · exit ${res.code}`);
  if (!steadyPopulation) console.log("       🔴 the DENOMINATOR moved — the control changed the subject set, not the finding.");
  if (!movedFinding) console.log("       🔴 the gate did NOT notice. It is blind to the very thing it claims to test.");
  if (!ok) bad = 1;
}

// A fourth run: delete the rails outright and prove the VACUITY floor exits non-zero rather
// than reporting a serene zero findings over an empty subject set.
const vac = withCopy((src) => {
  for (const rel of VACUITY_TARGETS.map((t) => t.replace(/^src\//, ""))) {
    const f = join(src, rel);
    try { writeFileSync(f, readFileSync(f, "utf8").replace(/<nav\b/g, "<div").replace(/<\/nav>/g, "</div>")); } catch { /* absent */ }
  }
  return runGate(src);
});
const vacuityBites = vac.population !== null && vac.population < base.population && vac.code !== 0;
console.log(`  ${vacuityBites ? "✅" : "🔴"} rails removed → population ${vac.population} (HEAD ${base.population}) · exit ${vac.code}`);
if (!vacuityBites) {
  console.log("       🔴 the population shrank and the gate still passed — that is a vacuous gate.");
  bad = 1;
}

console.log(bad ? "\n🔴 the control did not hold." : "\n✅ the gate moves when the defect is planted, and refuses an empty population.");
process.exit(bad);
