/**
 * `npm run test:docs` — every reference in docs/ must point at something real.
 *
 * WHY THIS EXISTS. This repo's documentation is load-bearing: the runbooks name the exact
 * command to run during a recovery or a payout outage. A doc that names a script which no
 * longer exists is worse than no doc, because it is read under pressure. The 2026-07-30
 * cleanup commit claimed "zero dead links" — true when written, and nothing kept it true.
 * One edit later, a runbook already pointed at a throwaway path in a temp directory.
 *
 * Checks three things:
 *   · relative markdown links resolve on disk
 *   · every `scripts/<file>.<ext>` mentioned exists
 *   · every `npm run <name>` is a real package.json script
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DOCS = join(ROOT, "docs");
const scripts = new Set(Object.keys(JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8")).scripts ?? {}));

/**
 * A doc may legitimately name a file that no longer exists — recording that something was
 * DELETED is the point of the sentence. Only lines that frame it that way are exempt.
 */
const documentsARemoval = (line) =>
  /~~|deleted|removed|no longer exists|does not exist|gone\b/i.test(line);

let bad = 0, links = 0, paths = 0, npms = 0;
const report = (kind, file, ref, line) => {
  console.log(`  ✗ ${kind.padEnd(14)} ${file}:${line}  →  ${ref}`);
  bad++;
};

for (const f of readdirSync(DOCS).filter((n) => n.endsWith(".md"))) {
  const p = join(DOCS, f);
  const lines = readFileSync(p, "utf8").split(/\r?\n/);

  lines.forEach((line, i) => {
    const n = i + 1;
    const exempt = documentsARemoval(line);

    for (const m of line.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const target = m[1].split("#")[0].trim();
      if (!target || /^(https?:|mailto:|#)/.test(target)) continue;
      links++;
      if (!existsSync(resolve(dirname(p), target)) && !exempt) report("dead link", f, target, n);
    }

    for (const m of line.matchAll(/\bscripts\/[\w.-]+\.(?:mjs|mts|ts|js|yml)\b/g)) {
      paths++;
      if (!existsSync(join(ROOT, m[0])) && !exempt) report("missing file", f, m[0], n);
    }

    // `npm run x:*` is permission-rule syntax in AGENT-ACCESS.md, not a command — skip it.
    for (const m of line.matchAll(/npm run ([\w:-]+)(\*?)/g)) {
      if (m[2] === "*" || m[1].endsWith(":")) continue;
      npms++;
      if (!scripts.has(m[1]) && !exempt) report("no such script", f, `npm run ${m[1]}`, n);
    }
  });
}

console.log(`\nchecked ${links} links · ${paths} script paths · ${npms} npm refs across docs/`);
if (bad) {
  console.log(`\n${bad} broken reference(s). Fix the doc, or say plainly that the thing is gone.\n`);
  process.exit(1);
}
console.log("\n✅ every reference in docs/ resolves.\n");
