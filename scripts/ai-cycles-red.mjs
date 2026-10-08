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
 * ⭐ THREE THINGS THIS HARNESS LEARNED THE HARD WAY, all of which made it certify nothing:
 *
 *   ① THE MUTANT TREE CANNOT LIVE IN `%TEMP%`. The gate imports the product, which imports
 *      `@prisma/client` — a BARE specifier. Node resolves those by walking parents for a
 *      `node_modules`, and a tree outside the repo never finds one. Every run died before
 *      printing a line and reported 23/23 "broken harness".
 *
 *   ② THE GATE'S OWN LOCATION IS NOT PROOF THE PRODUCT WAS MUTATED. `tsx` resolves a `@/…`
 *      import through the tsconfig paths of the CWD — the real repo — so the gate could sit
 *      in the mutant tree while loading the ORIGINAL module, and this harness would have
 *      called that PROVEN. The gate now prints the resolved URL of every module under test,
 *      and each one must be inside the tree that was mutated.
 *
 *   ③ AND THE TREE CANNOT LIVE INSIDE `node_modules/` EITHER (2026-10-08) — which is where ①
 *      had put it. `tsx` never applies tsconfig `paths` to a file whose path contains
 *      `/node_modules/` (its `resolveTsPaths` skips that parent), so a nested tree cannot
 *      resolve ANY `@/…` import. The meter's four modules import each other relatively, so that
 *      held — until `418f1b59` (2026-09-20) made `platform-config.ts`, which `ai-cycles.ts`
 *      imports, re-export from `@/lib/platform-timezone`. From then on every mutant died on
 *      `Cannot find module '@/lib/platform-timezone'` before it printed a line, and the harness
 *      read "no root line" as "it read some other tree": 29/29 "broken harness", for a reason
 *      it never showed. (In a worktree whose `node_modules` is a junction the nest also landed
 *      in a SIBLING's package folder.) The tree now lives in the repo root as
 *      `.red-ai-cycles-<pid>.red-tmp/` — covered by `.gitignore`'s `*.red-tmp`, so no ignore
 *      line has to be remembered — with its own copy of `tsconfig.json` and `package.json`, and
 *      the gate runs with the mutant as its CWD: bare specifiers still resolve by walking up to
 *      the repo's `node_modules`, and `@/…` now resolves INSIDE the mutant — its own
 *      `tsconfig.json` is the NEAREST one, so that is the one tsx reads (drop that copy and tsx
 *      silently falls back to an ancestor's, the repo's: ②'s trap again). It is the layout
 *      `red:refused-funds` and `red:tax-report` already use. And the UNMUTATED copy is run first:
 *      a copy that cannot run is reported once, with the gate's own error, instead of as 29
 *      mutations.
 *
 * ⭐ A MUTATION THAT MISSES IS A FINDING. `pause-mode-splits-the-straddling-call` exists
 * because a fixture's float dust made a check fail for what looked like the wrong reason,
 * and the "wrong reason" turned out to be a real shipped defect in the meter.
 */
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, cpSync, existsSync, rmSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { MUTATIONS } from "./anchors/ai-cycles.anchors.mjs";
import { resolveAnchor, toEol } from "./red-anchor.mjs";

const cwd = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const GATE = "scripts/ai-cycles.test.mts";
const TSX = join(cwd, "node_modules", "tsx", "dist", "cli.mjs");

/** Every module the anchors mutate. Each must resolve INSIDE the mutant tree. */
const UNDER_TEST = 4;

/** What the gate needs to run on its own: the product, the gate (it imports nothing else from
 *  scripts/), and the two files that decide how `@/…` and the module type resolve. See ③. */
const COPY = ["src", GATE, "tsconfig.json", "package.json"];

// ⛔ IN THE REPO ROOT, NOT UNDER node_modules/ — see ③ in the header. `*.red-tmp` is already ignored.
const NEST = join(cwd, `.red-ai-cycles-${process.pid}.red-tmp`);

const leftovers = readdirSync(cwd).filter((n) => /^\.red-ai-cycles-\d+\.red-tmp$/.test(n));
if (leftovers.length) console.log(`NOTE a previous run's tree is still on disk (${leftovers.join(", ")}) — not touched; delete it once no run is live\n`);

// Removed on a clean finish and on a crash alike. A hard kill cannot run it, which is why the tree is git-ignored
// and why the next run names a survivor above rather than deleting it (it may be another session's live run).
const cleanup = () => { try { rmSync(NEST, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* the next run's NOTE names it */ } };
process.on("exit", cleanup);
mkdirSync(NEST, { recursive: true });

/** A private copy of exactly what the gate runs against. */
function makeTree() {
  const root = mkdtempSync(join(NEST, "m-"));
  for (const rel of COPY) {
    const dest = join(root, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(join(cwd, rel), dest, { recursive: true });
  }
  return root;
}

/** The gate, run FROM the copy and with the copy as its CWD, so tsx reads the copy's tsconfig and `@/…` stays inside it. */
function runGate(root) {
  try {
    const out = execFileSync(process.execPath, [TSX, join(root, GATE)], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: 180_000,
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NODE_ENV: "test" },
    });
    return { out, exit: 0 };
  } catch (e) {
    return { out: `${e.stdout ?? ""}${e.stderr ?? ""}`, exit: e.status ?? 1 };
  }
}

/**
 * "It exited non-zero" is not evidence. Prove the gate read THIS tree, and that every module under
 * test RESOLVED inside it (see ② in the header).
 * @returns {string | null} why it did not, or null when it did
 */
function misread(out, root) {
  const normalised = root.split("\\").join("/");
  const inMutant = (line) => line.includes(normalised) || line.includes(root);

  const rootLine = out.split("\n").find((l) => l.trim().startsWith("root:")) ?? "";
  if (!inMutant(rootLine)) {
    // No root line at all means the gate died before it printed anything (an import that did not resolve). Say what it said.
    const lines = out.split("\n");
    const said = (lines.find((l) => /^\s*\w*Error\b/.test(l)) ?? lines.find((l) => /Error/.test(l)))?.trim().slice(0, 200);
    return `it read some other tree: ${rootLine.trim() || `(no root line printed${said ? ` — the gate said: ${said}` : ""})`}`;
  }
  const moduleLines = out.split("\n").filter((l) => l.trim().startsWith("module:"));
  const strays = moduleLines.filter((l) => !inMutant(l));
  if (moduleLines.length < UNDER_TEST || strays.length > 0) {
    return `${moduleLines.length} module path(s) reported (expected ${UNDER_TEST}), ` +
      `${strays.length} resolved OUTSIDE the mutant tree` + (strays.length ? `\n        ${strays[0].trim()}` : "");
  }
  return null;
}

// ⭐ THE UNMUTATED COPY MUST BE GREEN FIRST. That proves the copy resolves and runs at all, so a mutant
// that turns it red is the defect and not a broken copy — and a copy that cannot run (③) is reported
// here, once, with the gate's own error, rather than as every mutation "broken".
let precondition = "";
{
  const root = makeTree();
  const { out, exit } = runGate(root);
  const why = misread(out, root);
  if (exit !== 0 || why) {
    console.error("REFUSING TO RUN — the gate is not GREEN on the UNMUTATED copy, so nothing below could be attributed to a mutation:");
    console.error(`  exit ${exit}${why ? ` · ${why}` : ""}`);
    console.error(out.split("\n").filter((l) => /^\s*(\w*Error\b|FAIL )/.test(l)).slice(0, 6).map((l) => `  ${l.trim().slice(0, 200)}`).join("\n"));
    process.exit(1);
  }
  const n = /ai-cycles: (\d+) passed/.exec(out)?.[1];
  precondition = `precondition: the gate is GREEN on the unmutated copy${n ? ` (${n} checks)` : ""}, and every module under test resolved inside it\n`;
}

let caught = 0, missed = 0, broken = 0;
const results = [];

for (const [i, m] of MUTATIONS.entries()) {
  const root = makeTree();

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

  const { out, exit } = runGate(root);

  // "It exited non-zero" is not evidence. Prove the gate read THIS mutant tree, and that every
  // module under test RESOLVED inside it. See ② in the header.
  const why = misread(out, root);
  if (why) {
    broken++;
    results.push(`  BROKEN HARNESS  ${label}\n        ${why}`);
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

cleanup();

console.log("RED harness — npm run test:ai-cycles (AI spend cycles)\n");
console.log(precondition);
console.log(results.join("\n"));
console.log(`\n${caught}/${MUTATIONS.length} proven · ${missed} missed · ${broken} broken harness`);
process.exit(missed || broken ? 1 : 0);
