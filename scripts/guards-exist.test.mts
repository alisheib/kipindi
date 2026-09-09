/**
 * EVERY GUARD A COMMENT NAMES MUST ACTUALLY EXIST.
 *
 *   npx tsx scripts/guards-exist.test.mts     (npm run test:guards-exist)
 *
 * ⛔ THE DEFECT THIS EXISTS FOR, FOUND BY WALKING INTO IT. Two docblocks cited
 * `test:agent-fee-copy` — one of them saying *"A guard (`test:agent-fee-copy`) now holds that
 * shut."* There was no such script and no such npm entry, and had never been. And the thing it
 * claimed to prevent — copy asserting a VAT treatment the config does not have — is exactly
 * what then happened in the BINDING agent contract, for a day, on production.
 * (`MONEY-GATE-REMEDIATION.md` §7.11.)
 *
 * ⭐ A COMMENT NAMING A GUARD IS WORSE THAN SILENCE. Silence invites a reader to check; a
 * confident citation makes them stop looking. This programme's whole subject is instruments
 * that lie, and a guard that exists only in prose is the purest form of it.
 *
 * ⚠️ WHAT THIS CHECKS AND WHAT IT DOES NOT. It proves the npm script EXISTS and that its
 * target file exists — nothing about whether the guard is any good, or whether it would go
 * red. A vacuous guard passes this. It closes exactly one hole: the cited guard that is not
 * there at all.
 *
 * ⛔ It deliberately does NOT fail on a name that appears only inside this file's own prose,
 * or on the `<sev>`-style placeholders the docs use for a family of scripts.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
const scripts = new Set(Object.keys(pkg.scripts));

/**
 * A script name as it is CITED: `npm run test:foo`, or backticked `` `test:foo` ``.
 *
 * ⚠️ A BARE COLON-WORD IS NOT A CITATION, and the first draft of this guard proved it by
 * reporting `test:5433` (a port), `red:true` (a YAML value) and `red:52:human` as missing
 * guards. A checker that cries wolf gets switched off, which would be worse than not having
 * it. Requiring `npm run` or backticks is what makes a hit mean "someone told a reader this
 * guard exists".
 */
const NAME = /(?:npm run\s+([a-z0-9][a-z0-9:-]*)|`((?:test|red|qa|ops|e2e|verify|migrate):[a-z0-9][a-z0-9:-]*)`)/g;

/** Placeholders and families that are not real script names. */
const PLACEHOLDER = /[<>{}$]|:-|:$|-$/;

const SKIP_FILES = new Set(["scripts/guards-exist.test.mts"]);

/**
 * ⛔ THE PHANTOMS THIS GUARD INHERITED — EXACT NAMES, AND THIS LIST MAY ONLY SHRINK.
 *
 * Eight source-file citations of guards that do not exist, all pre-dating 2026-09-09. They are
 * listed rather than fixed because seven of the eight are one-word slips naming a guard that
 * DOES exist under a neighbouring prefix (`qa:install-invite` → `red:install-invite`,
 * `qa:market-columns` → `red:market-columns`, `red:refusal` → `qa:refusal`, and so on), and
 * they sit in files owned by other lanes — `scripts/anchors/` in particular belongs to the
 * anchors ratchet and is not this programme's to edit.
 *
 * ⭐ IT IS A LIST OF NAMES, NOT A COUNT. A ratchet on a NUMBER can be satisfied by deleting an
 * unrelated citation, and can overstate the debt without ever going red — this programme has
 * already been bitten by that. Naming each one means removing an entry is the only way to make
 * progress and adding one is impossible without editing this file.
 *
 * ⛔ Never add to it. A NEW citation of a non-existent guard is the defect §7.11 exists for.
 */
const INHERITED_PHANTOMS = new Set([
  "ops:updown-digest-preview", // src/lib/server/updown-digest.ts — cf. test:updown-digest
  "qa:card-share-hit",         // scripts/card-share.test.mts     — cf. qa:card-share-glow
  "qa:install-invite",         // src/components/pwa/…            — cf. red:install-invite
  "qa:market-columns",         // scripts/market-columns.test.mts — cf. red:market-columns
  "red:anchors",               // scripts/anchors/… ⛔ another lane's file — cf. test:red-anchors
  "red:refusal",               // scripts/design-gate/…           — cf. qa:refusal
  "test:invite-coming-soon",   // scripts/withdrawn-features.test.mts
  "test:script-types",         // scripts/db-backup.mts
]);
const EXTS = [".ts", ".tsx", ".mts", ".mjs", ".cjs", ".js", ".md", ".prisma"];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".next" || e === ".git") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (EXTS.some((x) => e.endsWith(x))) out.push(p);
  }
  return out;
}

const files = ["src", "scripts", "docs", "prisma"].filter(existsSync).flatMap((d) => walk(d));
const named = new Map<string, Set<string>>();

for (const f of files) {
  const rel = relative(".", f).split(sep).join("/");
  if (SKIP_FILES.has(rel)) continue;
  const txt = readFileSync(f, "utf8");
  for (const m of txt.matchAll(NAME)) {
    const name = m[1] ?? m[2];
    if (!name || PLACEHOLDER.test(name)) continue;
    if (!named.has(name)) named.set(name, new Set());
    named.get(name)!.add(rel);
  }
}

const isCode = (p: string) => p.startsWith("src/") || p.startsWith("scripts/") || p.startsWith("prisma/");

const missing: [string, string[]][] = [];
for (const [name, where] of [...named].sort()) {
  if (!scripts.has(name)) missing.push([name, [...where].sort()]);
}
const inCode = missing.filter(([, w]) => w.some(isCode));
const inDocs = missing.filter(([, w]) => !w.some(isCode));

const fresh = inCode.filter(([n]) => !INHERITED_PHANTOMS.has(n));
const stillThere = new Set(inCode.map(([n]) => n));

console.log(`\n§1 · a guard cited FROM CODE must exist`);
console.log(`   scanned ${files.length} files · ${named.size} distinct script names cited\n`);
for (const [name, where] of fresh) {
  console.log(`   ⛔ NEW PHANTOM ${name}  — cited in:`);
  for (const w of where.filter(isCode)) console.log(`        ${w}`);
}
ok(
  `no NEW citation of a guard that does not exist (${named.size} cited)`,
  fresh.length === 0,
  fresh.length ? `${fresh.length} new phantom: ${fresh.map(([n]) => n).join(", ")}` : "",
);

// ⭐ THE RATCHET ONLY TURNS ONE WAY. An allowlist entry whose citation is gone must be deleted
// from the list, or the list quietly becomes permission to re-introduce it.
const stale = [...INHERITED_PHANTOMS].filter((n) => !stillThere.has(n));
for (const n of stale) console.log(`   ✅ fixed since the list was written: ${n}`);
ok(
  `the inherited list carries no dead entries (${INHERITED_PHANTOMS.size} left)`,
  stale.length === 0,
  stale.length ? `remove from INHERITED_PHANTOMS: ${stale.join(", ")}` : "",
);

// ⚠️ DOCS ARE REPORTED, NOT FAILED. An implementation PLAN legitimately names the scripts it
// intends to create — the whole `maswali-*` family belongs to a product that is proposed and
// not built. Failing on those would make this guard noise, and a noisy guard gets deleted.
// ⛔ The exception is a doc that claims a guard ENFORCES something today; those are listed
// here so a reader can tell the two apart, and §7.11 records why that distinction matters.
console.log(`\n§2 · cited only in docs — ${inDocs.length} name(s), reported not failed`);
for (const [name, where] of inDocs) console.log(`   · ${name.padEnd(34)} ${where.join(", ")}`);

console.log(`\n§3 · every npm script points at a file that exists`);
{
  const broken: string[] = [];
  for (const [name, cmd] of Object.entries(pkg.scripts)) {
    const m = cmd.match(/(?:tsx|node|ts-node)\s+(\S+\.(?:mts|mjs|cjs|ts|js))/);
    if (!m) continue;
    if (!existsSync(m[1])) broken.push(`${name} -> ${m[1]}`);
  }
  for (const b of broken) console.log(`   ⛔ ${b}`);
  ok("every tsx/node script target is on disk", broken.length === 0, broken.join(" · "));
}

console.log(`\n§4 · ⚠️ POSITIVE CONTROL — the checker must catch a phantom`);
{
  // A name that certainly is not a script. If the matcher cannot see this, §1 proves nothing.
  // ⚠️ IT MUST BE FED A REAL CITATION, NOT A BARE NAME. The matcher deliberately only
  // recognises `npm run x` or a backticked `x` — so a probe written as a bare colon-word tests
  // nothing and reports the checker broken. That is the first thing this control caught.
  const probe = "test:this-guard-does-not-exist";
  const seen = [...`see \`${probe}\` for details`.matchAll(NAME)].map((m) => m[1] ?? m[2]);
  ok("⚠️ the matcher recognises a backticked citation", seen.includes(probe), JSON.stringify(seen));
  const bare = [...`see ${probe} for details`.matchAll(NAME)].map((m) => m[1] ?? m[2]);
  ok("⚠️ …and a BARE mention is not treated as a citation", !bare.includes(probe), JSON.stringify(bare));
  const viaNpm = [...`run npm run ${probe} now`.matchAll(NAME)].map((m) => m[1] ?? m[2]);
  ok("⚠️ …and `npm run x` is", viaNpm.includes(probe), JSON.stringify(viaNpm));
  ok("⚠️ …and that name is absent from package.json", !scripts.has(probe));
  ok("⚠️ …while a REAL one is present", scripts.has("test:ledger"));
  // And it must not fire on a placeholder family.
  ok("⚠️ a placeholder like `verify-<sev>` is not treated as a script", PLACEHOLDER.test("test:verify-<sev>"));
}

console.log(`\n${"═".repeat(70)}\n  GUARDS EXIST: ${pass} passed, ${fail} failed\n${"═".repeat(70)}`);
process.exit(fail === 0 ? 0 : 1);
