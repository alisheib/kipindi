/**
 * RED harness for `npm run test:ai-cycles`.                    `npm run red:ai-cycles`
 *
 * ⭐ WHY. The gate it proves guards a number Ali PRICES FROM. A metering guard that has
 * never been watched fail is a guard that may be asserting nothing — and this one sits on
 * top of a deliberately best-effort meter, so a hole in it looks exactly like health.
 *
 * ⛔ IT DOES NOT WRITE TO src/ OR scripts/. Two sessions share this working tree. Every
 * mutation goes to a COPY of the repo and the gate is RUN FROM that copy, so its relative
 * imports resolve to the mutant.
 *
 * ⛔ AN UNMATCHED ANCHOR IS A BROKEN HARNESS, reported as such and never as a MISS. And "it
 * exited non-zero" is not evidence: the run must name the CHECK that failed, and that check
 * must be the one the mutation targets.
 *
 * ⭐ TWO THINGS THIS HARNESS LEARNED THE HARD WAY, both of which made it certify nothing:
 *
 *   ① THE MUTANT TREE CANNOT LIVE IN `%TEMP%`. The gate imports the product, which imports
 *      `@prisma/client` — a BARE specifier. Node resolves those by walking parents for a
 *      `node_modules`, and a tree outside the repo never finds one. Every run died before
 *      printing a line and reported 23/23 "broken harness". The tree is now nested inside
 *      `node_modules/` (already git-ignored), where the walk succeeds.
 *
 *   ② THE GATE'S OWN LOCATION IS NOT PROOF THE PRODUCT WAS MUTATED. `tsx` resolves a `@/…`
 *      import through the tsconfig paths of the CWD — the real repo — so the gate could sit
 *      in the mutant tree while loading the ORIGINAL module, and this harness would have
 *      called that PROVEN. The gate now prints the resolved URL of every module under test,
 *      and each one must be inside the tree that was mutated.
 *
 * ⭐ A MUTATION THAT MISSES IS A FINDING. `pause-mode-splits-the-straddling-call` exists
 * because a fixture's float dust made a check fail for what looked like the wrong reason,
 * and the "wrong reason" turned out to be a real shipped defect in the meter.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, existsSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";
import { join } from "node:path";
import { MUTATIONS } from "./anchors/ai-cycles.anchors.mjs";
import { resolveAnchor, toEol } from "./red-anchor.mjs";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GATE = "scripts/ai-cycles.test.mts";

/** Every module the anchors mutate. Each must resolve INSIDE the mutant tree. */
const UNDER_TEST = 4;

const NEST = join(cwd, "node_modules", ".red-ai-cycles");
mkdirSync(NEST, { recursive: true });

let caught = 0, missed = 0, broken = 0;
const results = [];
const roots = [];

for (const [i, m] of MUTATIONS.entries()) {
  const root = mkdtempSync(join(NEST, "m-"));
  roots.push(root);
  cpSync(join(cwd, "src"), join(root, "src"), { recursive: true });
  cpSync(join(cwd, "scripts"), join(root, "scripts"), { recursive: true });

  const label = `${String(i + 1).padStart(2)}. ${m.name}\n        ${m.why}`;
  const p = join(root, m.file);

  if (!existsSync(p)) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        ${m.file} does not exist — this proves NOTHING; fix the anchor`);
    continue;
  }
  const src = readFileSync(p, "utf8");
  // ⛔ THE SHARED RESOLVER, so an anchor this harness can find is exactly the one
  // `test:red-anchors` certifies — and so a `\n` anchor still resolves in a CRLF checkout.
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

  // "It exited non-zero" is not evidence. Prove the gate read THIS mutant tree…
  const normalised = root.split("\\").join("/");
  const inMutant = (line) => line.includes(normalised) || line.includes(root);

  const rootLine = out.split("\n").find((l) => l.trim().startsWith("root:")) ?? "";
  if (!inMutant(rootLine)) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        it read some other tree: ${rootLine.trim() || "(no root line printed)"}`);
    continue;
  }

  // …and that every module under test RESOLVED inside it. See ② in the header.
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
    results.push(`  CAUGHT          ${label}\n        → ${named.trim().slice(0, 140)}`);
  } else if (exit !== 0) {
    missed++;
    results.push(`  WRONG CHECK     ${label}\n        gate failed, but not on "${m.check}" — it failed on: ` +
      (failed.map((l) => l.trim().slice(5, 70)).join(" | ") || "(none named — it may have crashed)"));
  } else {
    missed++;
    results.push(`  MISSED          ${label}\n        the gate reported ALL PASS on a mutant tree`);
  }
}

for (const r of roots) { try { rmSync(r, { recursive: true, force: true }); } catch { /* mutant tree */ } }
try { rmSync(NEST, { recursive: true, force: true }); } catch { /* nest */ }

console.log("RED harness — npm run test:ai-cycles (AI spend cycles)\n");
console.log(results.join("\n"));
console.log(`\n${caught}/${MUTATIONS.length} proven · ${missed} missed · ${broken} broken harness`);
process.exit(missed || broken ? 1 : 0);
