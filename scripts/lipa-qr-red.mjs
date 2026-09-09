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
const MUTATIONS = [
  {
    name: "the shipped artwork is a DIFFERENT QR",
    why: "the exact failure a swapped or re-exported poster produces: it still renders, still scans, and pays someone else",
    check: "1.3 the decoded payload is byte-identical",
    async mutate(root) {
      // ⭐ A VALID, SCANNABLE, DIFFERENT QR — not a corrupted file. Corrupting the bytes
      // would only prove "the guard notices an unopenable image", which is the easy half.
      // The failure that actually costs money is a perfectly good QR belonging to someone
      // else, so that is what gets planted: same filename, same everything, different
      // merchant. Anything less and §1.3 has not really been exercised.
      const dir = join(root, "public", "pay");
      const f = readdirSync(dir).find((n) => /^selcom-lipa-qr\./.test(n));
      if (!f) return "no QR asset in the copied tree";
      const QRCode = require("qrcode");
      await QRCode.toFile(join(dir, f), "00020101021130160012tz.co.selcom0208999999995204599953038345802TZ5910NOT US LTD6013DAR ES SALAAM6304FFFF", {
        type: "png", width: 760, margin: 4, errorCorrectionLevel: "H",
      });
      return null;
    },
  },
  {
    name: "the pinned payload is edited by one character",
    why: "a hand-edited config value is how the pin stops describing the image it is meant to police",
    check: "1.3 the decoded payload is byte-identical",
    file: "src/lib/server/lipa-config.ts",
    from: '"000201010211041552545429990002026390014tz.go.bot.tips',
    to: '"000201010211041552545429990002026390014tz.go.bot.TIPS',
  },
  {
    name: "the asset filename loses its content hash",
    why: "the cache-first service worker then pins a REISSUED QR in every returning player's browser",
    check: "1.6 the filename's hash matches the payload",
    // ⛔ THIS CASE WAS BROKEN BY THE SVG MIGRATION AND SCORED ITSELF 10/10 ANYWAY. It used to
    // rename the asset to `selcom-lipa-qr.png` and rewrite the config with a regex ending
    // `\.png`. Once the artwork became a vector the config held `.svg`, so the rewrite matched
    // NOTHING: the config kept pointing at the hashed path, the renamed file was simply gone,
    // and the gate failed on 1.1/1.2/1.3 while the targeted 1.6 — which reads the CONFIG STRING,
    // never the file on disk — still passed. Recorded as `9/10 · WRONG CHECK` only because the
    // scorer demands the NAMED check; a harness that merely counted a non-zero exit would have
    // reported this as caught forever.
    //
    // ⭐ SO THE MUTATION REMOVES THE HASH AND NOTHING ELSE. The extension comes from the file
    // that is actually there, so the asset stays findable (1.1), decodable (1.2) and byte-identical
    // to the pin (1.3) — leaving 1.6 as the ONLY check that can fail. A mutation that strands the
    // asset proves the gate notices a missing file, which is not what 1.6 is for.
    mutate(root) {
      const dir = join(root, "public", "pay");
      const f = readdirSync(dir).find((n) => /^selcom-lipa-qr\./.test(n));
      if (!f) return "no QR asset in the copied tree";
      // Extension taken from disk, never hard-coded — that hard-coding is what rotted last time.
      const parts = /^selcom-lipa-qr\.[0-9a-f]{8}(\.[A-Za-z0-9]+)$/.exec(f);
      if (!parts) return `the asset is not content-hashed to begin with (${f}) — there is no hash to remove`;
      const ext = parts[1];
      const dehashed = `selcom-lipa-qr${ext}`;
      renameSync(join(dir, f), join(dir, dehashed));
      const p = join(root, "src", "lib", "server", "lipa-config.ts");
      const before = readFileSync(p, "utf8");
      const after = before.replace(
        new RegExp(`/pay/selcom-lipa-qr\\.[0-9a-f]{8}\\${ext}`),
        `/pay/${dehashed}`,
      );
      // ⭐ The silent no-op is the whole defect above, so it is now LOUD. The text-anchor path
      // already refuses a mutation that leaves the file identical; a `mutate` that rewrites a
      // file owes the same proof.
      if (after === before) return `the config still points at a hashed ${ext} path — nothing was de-hashed`;
      writeFileSync(p, after, "utf8");
      return null;
    },
  },
  {
    name: "the safety rule always says yes",
    why: "the QR would render beside ANY destination account — a code paying 7006 3747 under words naming a different account",
    check: "2.2 hides when the destination is a DIFFERENT account",
    file: "src/lib/lipa.ts",
    from: "  return a.length > 0 && l.length > 0 && a === l;",
    to: "  return true;",
  },
  {
    name: "the safety rule degrades to a substring match",
    why: "the subtle version of the same defect — 170063747 and 700637470 are different accounts that both 'contain' the number",
    check: "2.7 a number that merely CONTAINS the Lipa number does not match",
    file: "src/lib/lipa.ts",
    from: "  return a.length > 0 && l.length > 0 && a === l;",
    to: "  return a.length > 0 && l.length > 0 && a.includes(l);",
  },
  {
    name: "the operator switch is ignored",
    why: "an operator turning the QR off would be told it is off while applicants keep seeing it",
    check: "2.3 hides when the operator switch is off",
    file: "src/lib/lipa.ts",
    from: "  if (!lipa || !lipa.enabled) return false;",
    to: "  if (!lipa) return false;",
  },
  {
    name: "an empty destination counts as agreement",
    why: "an unset fee destination would show a QR anyway — absence read as consent",
    check: "2.4 hides when the destination is empty",
    file: "src/lib/lipa.ts",
    from: "  return a.length > 0 && l.length > 0 && a === l;",
    to: "  return l.length > 0 && a === l || a.length === 0;",
  },
  {
    name: "the static QR is wired onto the deposit page",
    why: "⛔ THE MONEY DEFECT THIS WHOLE GUARD EXISTS FOR: the player pays, the company receives, no wallet moves, nothing goes red",
    check: "4.4 no wallet surface renders the static QR",
    file: "src/app/wallet/deposit/page.tsx",
    from: 'import { PageContainer } from "@/components/layout/page-container";',
    to: 'import { PageContainer } from "@/components/layout/page-container";\nimport { LipaQrPanel } from "@/components/pay/lipa-qr-panel";',
  },
  {
    name: "the config accepts a Lipa number that is not digits",
    why: "a validator that waves anything through lets an operator store a number no wallet app can dial — and one that never equals the fee destination, so the QR silently vanishes",
    check: "3.1 rejects a non-numeric Lipa number",
    file: "src/lib/server/lipa-config.ts",
    // ⚠️ The DIGITS-ONLY rule, not the length rule. An earlier version of this mutation
    // disabled the length check and was scored WRONG CHECK — correctly: it proved 3.2,
    // not 3.1. The harness catching its own mis-aimed anchor is the behaviour that makes
    // its verdicts worth reading.
    from: "  if (digits !== c.lipaNumber)",
    to: "  if (false)",
  },
  {
    name: "the config accepts an asset path outside /pay/",
    why: "the QR could then be pointed at any image in the deployment, including an uploaded one",
    check: "3.5 rejects an asset path outside /pay/",
    file: "src/lib/server/lipa-config.ts",
    from: '  if (!/^\\/pay\\/[A-Za-z0-9._-]+\\.svg$/.test(c.qrAssetPath))',
    to: "  if (false)",
  },
];

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
