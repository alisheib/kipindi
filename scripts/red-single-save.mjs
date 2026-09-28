/**
 * red:single-save — THE CONTROL FOR `test:single-save` (ONE SAVE ON SCREEN, owner 2026-09-22 / 2026-09-26).
 *
 * ⛔ BUILD THE CONTROL BEFORE BELIEVING THE GATE. It sits green at HEAD, and a green gate is
 * indistinguishable from a gate that cannot fail until something has been planted for it to find.
 *
 * ⛔ EVERY MUTATION RUNS ON A COPY OF THE TREE; the real `src/` is never written. The copy is a temp
 * dir and the gate is pointed at it through KP_SRC. A killed run leaves a temp dir behind, never a
 * defect in the worktree.
 *
 * ⭐ EACH CASE MUST FAIL FOR ITS OWN REASON, AND ONLY THAT ONE. Every string in the case's `expect`
 * must appear on a FAIL line (each names its site, so the RIGHT bar went red, not merely some bar),
 * and no other check may fail — collateral red means the case proved something other than it claims.
 * ⭐ AND THE POPULATION MUST HOLD STILL: a case may move the count of bars offering a Save only by the
 * `offersDelta` it declares. A control that shrinks the denominator has changed the subject.
 *
 * Anchors are declared in `scripts/anchors/single-save.anchors.mjs` and injected through the shared
 * `red-anchor.mjs` (CRLF-safe, refuses an anchor that matches 0 or 2+ times), so `test:red-anchors`
 * audits every one of them without running anything.
 */
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { injectDefect } from "./red-anchor.mjs";
import { MUTATIONS } from "./anchors/single-save.anchors.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const REPO = join(here, "..");
const GATE = join(here, "single-save.test.mts");

function runGate(srcRoot) {
  const r = spawnSync("npx", ["tsx", GATE], {
    cwd: REPO, encoding: "utf8", env: { ...process.env, KP_SRC: srcRoot }, shell: process.platform === "win32",
  });
  const out = (r.stdout || "") + (r.stderr || "");
  const pop = /(\d+) bars in (\d+) files · (\d+) offer a Save/.exec(out);
  return {
    code: r.status,
    out,
    bars: pop ? Number(pop[1]) : null,
    offers: pop ? Number(pop[3]) : null,
    failLines: out.split("\n").filter((l) => l.startsWith("FAIL ")),
    failed: new Set([...out.matchAll(/^FAIL (\d+\.[a-z0-9]+)/gm)].map((m) => m[1])),
  };
}

function withCopy(fn) {
  const dir = mkdtempSync(join(tmpdir(), "kp-red-single-save-"));
  const src = join(dir, "src");
  cpSync(join(REPO, "src"), src, { recursive: true });
  try { return fn(src); } finally { rmSync(dir, { recursive: true, force: true }); }
}

console.log("──────────────────────────────────────────────────────────────────────");
console.log("red:single-save — the control for test:single-save");
console.log("──────────────────────────────────────────────────────────────────────");

const base = runGate(join(REPO, "src"));
console.log(`  HEAD · exit ${base.code} · ${base.bars} bars · ${base.offers} offer a Save`);
if (base.code !== 0 || base.failLines.length || base.bars === null) {
  console.log("\n🔴 HEAD is not green — the control cannot prove anything from here.");
  console.log(base.failLines.join("\n") || base.out.slice(-2000));
  process.exit(1);
}

let bad = 0;
for (const mut of MUTATIONS) {
  const expect = Array.isArray(mut.expect) ? mut.expect : [mut.expect];
  const res = withCopy((src) => {
    if (mut.kind === "path") {
      // Only deletion is declared today; the anchors file says which path, and red-anchors audits it.
      try { rmSync(join(src, mut.path.replace(/^src\//, "")), { recursive: true }); } catch (e) { return { rot: e.message }; }
      return runGate(src);
    }
    const f = join(src, mut.file.replace(/^src\//, ""));
    let s;
    try { s = readFileSync(f, "utf8"); } catch { return { missing: true }; }
    // ⛔ An anchor that no longer matches exactly once is ANCHOR ROT — reported, never skipped.
    try { writeFileSync(f, injectDefect(s, mut.from, mut.to)); } catch (e) { return { rot: e.message }; }
    return runGate(src);
  });
  if (res.missing || res.rot) {
    console.log(`  🔴 ${mut.name}\n       ${res.missing ? "FILE NOT FOUND" : `ANCHOR ROT (${res.rot}) — re-anchor in scripts/anchors/single-save.anchors.mjs`}: ${mut.file ?? mut.path}`);
    bad = 1;
    continue;
  }
  const wentRed = res.code !== 0;
  const missed = expect.filter((x) => !res.failLines.some((l) => l.includes(x)));
  const wantIds = new Set(expect.map((x) => x.split(" ")[0]));
  const collateral = [...res.failed].filter((id) => !wantIds.has(id));
  const wantOffers = base.offers + (mut.offersDelta ?? 0);
  const steady = mut.kind === "path" || (res.bars === base.bars && res.offers === wantOffers);
  const good = wentRed && missed.length === 0 && collateral.length === 0 && steady;
  console.log(`  ${good ? "✅" : "🔴"} ${mut.name}`);
  console.log(`       exit ${res.code} · failed {${[...res.failed].join(", ") || "none"}} · expected ${expect.map((x) => `"${x}"`).join(" + ")}`);
  if (!wentRed) console.log("       🔴 the gate did NOT notice. It is blind to the thing it claims to test.");
  if (wentRed && missed.length) console.log(`       🔴 WRONG REASON — no FAIL line for: ${missed.join(" · ")}`);
  if (collateral.length) console.log(`       🔴 COLLATERAL — also failed ${collateral.join(", ")}:\n         ${res.failLines.filter((l) => collateral.some((id) => l.startsWith(`FAIL ${id} `))).join("\n         ")}`);
  if (!steady) console.log(`       🔴 POPULATION MOVED — ${res.bars} bars / ${res.offers} offering a Save vs ${base.bars} / ${wantOffers} declared`);
  if (!good) bad = 1;
}

console.log(bad ? "\n🔴 the control did not hold." : `\n✅ all ${MUTATIONS.length} planted defects are caught, each on its own assertion and nothing else.`);
process.exit(bad);
