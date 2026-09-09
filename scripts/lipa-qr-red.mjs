/**
 * RED harness for `npm run test:lipa-qr`.                       `npm run red:lipa-qr`
 *
 * ⭐ WHY. The gate it proves stands between an applicant and a QR code that moves real
 * money. Every failure mode it guards is SILENT by nature — a swapped image still
 * renders, a broken safety rule still shows a tidy panel, a QR on the deposit page
 * still looks like a feature. A guard against silent failures that has never itself
 * been watched fail is indistinguishable from no guard at all.
 *
 * ⛔ IT DOES NOT WRITE TO src/, scripts/ OR public/. Two sessions share this checkout.
 * Every mutation goes to a COPY and the gate is RUN FROM that copy, so its relative
 * imports resolve to the mutant.
 *
 * ⛔ THE MUTANT TREE LIVES INSIDE node_modules/. The gate imports `sharp` and `jsqr` by
 * bare specifier; Node resolves those by walking parents for a `node_modules`, and a
 * tree in %TEMP% never finds one. (Lesson ① of `ai-cycles-red.mjs`, inherited rather
 * than rediscovered.)
 *
 * ⛔ "IT EXITED NON-ZERO" IS NOT EVIDENCE. A run counts as CAUGHT only when the gate
 * read the mutant tree, resolved its modules inside it, AND printed a FAIL naming the
 * CHECK this mutation targets. Failing on a different check is a WRONG CHECK, not a
 * pass — that is how a guard ends up certified by an error it happens to throw.
 *
 * ⛔ AN UNMATCHED ANCHOR IS A BROKEN HARNESS, reported as such and never as a MISS.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, existsSync, rmSync, readdirSync, renameSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { createRequire } from "node:module";
import { resolveAnchor, toEol } from "./red-anchor.mjs";

const require = createRequire(import.meta.url);

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GATE = "scripts/lipa-qr.test.mts";
/** Modules the gate reports; each must resolve inside the mutant tree. */
const UNDER_TEST = 2;

/**
 * Each mutation plants ONE defect that a careless change could genuinely introduce,
 * and names the check that must catch it.
 *
 * `file`+`from`/`to` is a source edit; `mutate` is an arbitrary edit on the copied
 * tree (used where the defect is in a binary asset rather than in text).
 */

import { MUTATIONS } from "./anchors/lipa-qr.anchors.mjs";


/**
 * ⛔ NOT inside `node_modules/`. In this checkout `node_modules` is a JUNCTION to the
 * sibling worktree's copy, so a nest under it would write mutants into the tree the
 * other session is working in. The repo root is itself a `node_modules` ancestor, so a
 * nest beside it resolves bare specifiers just as well and touches nothing shared.
 */
const NEST = join(cwd, ".red-lipa-qr");
mkdirSync(NEST, { recursive: true });

let caught = 0, missed = 0, broken = 0;
const results = [];
const roots = [];

for (const [i, m] of MUTATIONS.entries()) {
  const root = mkdtempSync(join(NEST, "m-"));
  roots.push(root);
  cpSync(join(cwd, "src"), join(root, "src"), { recursive: true });
  cpSync(join(cwd, "scripts"), join(root, "scripts"), { recursive: true });
  cpSync(join(cwd, "public", "pay"), join(root, "public", "pay"), { recursive: true });

  const label = `${String(i + 1).padStart(2)}. ${m.name}\n        ${m.why}`;

  if (m.mutate) {
    const problem = await m.mutate(root);
    if (problem) {
      broken++;
      results.push(`  BROKEN HARNESS  ${label}\n        ${problem} — this proves NOTHING; fix the mutation`);
      continue;
    }
  } else {
    const p = join(root, m.file);
    if (!existsSync(p)) {
      broken++;
      results.push(`  BROKEN HARNESS  ${label}\n        ${m.file} does not exist — this proves NOTHING; fix the anchor`);
      continue;
    }
    const src = readFileSync(p, "utf8");
    const a = resolveAnchor(src, m.from);
    if (!a.ok) {
      broken++;
      results.push(`  BROKEN HARNESS  ${label}\n        ${m.file}: ${a.reason} — this proves NOTHING; fix the anchor`);
      continue;
    }
    const mutated = src.replace(a.needle, toEol(m.to, a.eol));
    if (mutated === src) {
      broken++;
      results.push(`  BROKEN HARNESS  ${label}\n        the mutation produced an IDENTICAL file — nothing was injected`);
      continue;
    }
    writeFileSync(p, mutated, "utf8");
  }

  let out = "", exit = 0;
  try {
    out = execSync(`npx tsx "${join(root, GATE)}"`, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, NODE_ENV: "test" },
    });
  } catch (e) {
    out = `${e.stdout ?? ""}${e.stderr ?? ""}`;
    exit = e.status ?? 1;
  }

  // Prove the gate read THIS mutant tree…
  const normalised = root.split("\\").join("/");
  const inMutant = (line) => line.includes(normalised) || line.includes(root);

  const rootLine = out.split("\n").find((l) => l.trim().startsWith("root:")) ?? "";
  if (!inMutant(rootLine)) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        it read some other tree: ${rootLine.trim() || "(no root line printed)"}`);
    continue;
  }

  // …and that every module under test RESOLVED inside it.
  const moduleLines = out.split("\n").filter((l) => l.trim().startsWith("module:"));
  const strays = moduleLines.filter((l) => !inMutant(l));
  if (moduleLines.length < UNDER_TEST || strays.length > 0) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        ${moduleLines.length} module path(s) reported (expected ${UNDER_TEST}), ` +
      `${strays.length} resolved OUTSIDE the mutant tree` + (strays.length ? `\n        ${strays[0].trim()}` : ""));
    continue;
  }

  const failed = out.split("\n").filter((l) => l.trim().startsWith("FAIL "));
  const named = failed.find((l) => l.includes(m.check));

  if (exit !== 0 && named) {
    caught++;
    results.push(`  CAUGHT          ${label}\n        → ${named.trim().slice(0, 150)}`);
  } else if (exit !== 0) {
    missed++;
    results.push(`  WRONG CHECK     ${label}\n        gate failed, but not on "${m.check}" — it failed on: ` +
      (failed.map((l) => l.trim().slice(5, 70)).join(" | ") || "(none named — it may have crashed)"));
  } else {
    missed++;
    results.push(`  MISSED          ${label}\n        the gate reported ALL PASS on a mutant tree`);
  }
}

for (const r of roots) { try { rmSync(r, { recursive: true, force: true }); } catch { /* best effort */ } }
try { rmSync(NEST, { recursive: true, force: true }); } catch { /* best effort */ }

console.log("\nRED — test:lipa-qr\n");
for (const r of results) console.log(r);
console.log(`\n${caught}/${MUTATIONS.length} CAUGHT · ${missed} missed · ${broken} broken harness`);
process.exit(caught === MUTATIONS.length ? 0 : 1);
