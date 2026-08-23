/**
 * `npm run test:red-anchors` — THE STATIC AUDIT OF THE RED FLEET.
 *
 *   npx tsx scripts/red-anchors.test.mts
 *
 * ⛔ IT READS. IT NEVER MUTATES. That is what makes it safe inside `test:all`, and it is not a
 * convenience: every harness in this fleet rewrites real source, so an auditor that RAN one
 * would be `docs/FAILURE-INVENTORY.md` §3.8 wearing a lab coat — a mutation left on disk,
 * `git diff` printing nothing, and a commit shipping it to 50pick.tz. Nothing below opens a
 * file for writing or spawns a child process.
 *
 * ⭐ WHAT IT IS FOR. `red:all` answers *"does every guard still catch its defect?"* in ~13
 * minutes by executing the fleet. This answers a different and cheaper question in under a
 * second: *"is every harness still POINTED at the product, and is every one of them reachable
 * at all?"* Those are the two failure modes that hide — a harness whose anchor rotted reports
 * a problem it invented, and a harness in no runner reports nothing to nobody.
 *
 * ── THE FOUR CHECKS ──────────────────────────────────────────────────────────────────────
 *
 * §1 · every `red:*` names a script that exists.
 * §2 · ⭐ every `red:*` is REACHABLE FROM `red:all`. This is the check with a body count:
 *      `red:updown-bet-feedback` (`red-e64.cjs`) sat outside the runner for **eight days**
 *      while it was broken and honest, exiting 1 into a void (§6.2.3). ⛔ Enumerated from
 *      `package.json` and from `red:all`'s own definition — never from a list in this file.
 * §3 · every DECLARED anchor resolves EXACTLY ONCE, through `red-anchor.mjs`'s own
 *      `resolveAnchor`. Not a re-implementation: the same function the harnesses inject with,
 *      so this cannot certify an anchor the harness would then fail to find.
 *      ⛔ 0 matches = the harness is broken. ⛔ ≥2 = worse: it would inject into whichever site
 *      came first and leave the other intact, so the gate might go red for a different reason
 *      than the case claims *while the harness prints PASS*.
 * §4 · the ratchet on harnesses that do NOT declare their anchors — see below.
 *
 * ── ⛔ WHY §4 IS A RATCHET AND NOT A PASS ────────────────────────────────────────────────
 *
 * §3 can only audit a harness that DECLARES its targets, as importable data
 * (`scripts/anchors/<name>.anchors.mjs`). The alternative — parsing 68 harness sources and
 * guessing which array holds the mutations and which key holds the anchor, across four
 * different shapes (`from`/`to`, `find`/`with`, `file` as a `URL`, `file` as a string) — is a
 * guess that **fails open**: a harness the parser did not understand would be reported CLEAN.
 * This inventory records what that costs; a check that cannot fail is the disease.
 *
 * ⚠️ SO THE COVERAGE IS STATED, NOT IMPLIED. Today **one** harness declares. The ratchet below
 * pins that number and lets it only ever grow, printing every harness still outside the audit,
 * so the gap is a line of output every run rather than a paragraph nobody reads. ⛔ Raising
 * `UNDECLARED_CEILING` is the one edit this file forbids.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolveAnchor } from "./red-anchor.mjs";

const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const pkg = JSON.parse(readFileSync(`${ROOT}/package.json`, "utf8")) as { scripts: Record<string, string> };

let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

// ⛔ STRUCTURAL. Every `red:*` in package.json except the aggregator — never a literal here.
// A list of harnesses written beside the harnesses is `RULES.md` §7's "a number written twice"
// applied to file paths, and §3.9 records it going stale silently.
const harnesses = Object.keys(pkg.scripts).filter((k) => k.startsWith("red:") && k !== "red:all");

console.log(`\nred-anchors — ${harnesses.length} declared red:* harness(es)\n`);
console.log("§1 · every red:* names a script that exists");
{
  ok("1.0 · fixture · the fleet was enumerated from package.json", harnesses.length > 20, `${harnesses.length} harnesses`);
  for (const key of harnesses) {
    const m = /node\s+(scripts\/[\w.-]+)/.exec(pkg.scripts[key]);
    const rel = m?.[1];
    ok(`1.${key} · runs a script that exists`, !!rel && existsSync(`${ROOT}/${rel}`), rel ?? `cannot parse: ${pkg.scripts[key]}`);
  }
}

console.log("\n§2 · ⭐ every red:* is reachable from red:all");
{
  const runner = pkg.scripts["red:all"] ?? "";
  // `red:all` is a reporting runner that enumerates package.json structurally. If it ever goes
  // back to naming harnesses one by one, this check reads the names it lists and holds it to
  // covering all of them — so the property survives either implementation.
  const named = new Set([...runner.matchAll(/npm run (red:[a-z0-9-]+)/g)].map((m) => m[1]));
  const enumerates = /red-all\.mjs/.test(runner);
  ok("2.0 · red:all exists", runner.length > 0, runner.slice(0, 60));
  if (enumerates) {
    // ⭐ The runner reads package.json itself, so reachability is total BY CONSTRUCTION.
    // Assert the property that makes that true rather than trusting the file name.
    const src = readFileSync(`${ROOT}/scripts/red-all.mjs`, "utf8");
    ok("2.1 · ⭐ red:all enumerates package.json rather than naming harnesses",
       /Object\.keys\(pkg\.scripts\)[\s\S]{0,120}startsWith\("red:"\)/.test(src),
       "the runner must derive its list, or a harness can be left out of it again");
    ok("2.2 · …and excludes only itself", /k !== "red:all"/.test(src));
  } else {
    for (const key of harnesses) {
      ok(`2.${key} · is named by red:all`, named.has(key),
         "outside every runner — it can fail for days and report to nobody (§6.2.3)");
    }
  }
}

console.log("\n§3 · every DECLARED anchor resolves exactly once");
const declaredDir = `${ROOT}/scripts/anchors`;
const declFiles = existsSync(declaredDir) ? readdirSync(declaredDir).filter((f) => f.endsWith(".anchors.mjs")) : [];
{
  ok("3.0 · fixture · at least one harness declares its anchors", declFiles.length >= 1, `${declFiles.length} declaration file(s)`);
  for (const f of declFiles) {
    const mod = await import(`./anchors/${f}`) as { MUTATIONS: Array<{ name: string; file: string; from: string; combineInto?: string }> };
    const muts = mod.MUTATIONS ?? [];
    ok(`3.${f} · declares mutations`, muts.length > 0, `${muts.length}`);

    // ⛔ A `combineInto` THAT NAMES NOTHING IS A SILENTLY DETACHED MUTATION.
    // `measure-red.mjs` pairs entries with `DECLARED.filter(x => x.combineInto === m.name)`,
    // so a typo in that string does not error — the paired edit simply stops being applied,
    // and the mutation it belonged to keeps reporting success while testing half of what it
    // claims. That is precisely the shape of an anchor rotting in silence, which is what this
    // file exists to prevent, and until 2026-08-23 nothing checked the link at all.
    const names = new Set(muts.map((m) => m.name));
    for (const m of muts.filter((x) => x.combineInto)) {
      const linked = names.has(m.combineInto as string);
      ok(`3.${f}:${m.name.slice(0, 40)} · combineInto names a real mutation`, linked,
         linked ? "" : `"${m.combineInto}" matches no mutation in this file — the pairing is dead`);
    }

    for (const m of muts) {
      const path = `${ROOT}/${m.file}`;
      if (!ok(`3.${f}:${m.name.slice(0, 44)} · target file exists`, existsSync(path), m.file)) continue;
      // ⛔ THE SAME RESOLVER THE HARNESS INJECTS WITH. A second implementation here could
      // certify an anchor the harness would then fail to find — a guard agreeing with itself.
      const r = resolveAnchor(readFileSync(path, "utf8"), m.from);
      ok(`3.${f}:${m.name.slice(0, 44)} · anchor resolves exactly once`, r.ok,
         r.ok ? "" : `${m.file}: ${(r as { reason: string }).reason}`);
    }
  }
}

console.log("\n§3b · CONTROL — the audit can fail, in both directions");
{
  // ⭐ A POSITIVE CONTROL, because §3 passing over a fleet whose anchors are all fine is
  // indistinguishable from §3 being unable to fail. Both failure modes are exercised against a
  // fixture built here, so the control cannot rot with the product.
  const fixture = "alpha\nbeta\ngamma\nbeta\n";
  ok("3b.1 · a MISSING anchor is reported missing", !resolveAnchor(fixture, "delta").ok);
  const dup = resolveAnchor(fixture, "beta");
  ok("3b.2 · ⛔ an anchor matching TWICE is reported ambiguous, never injected",
     !dup.ok && /2/.test((dup as { reason: string }).reason), dup.ok ? "resolved!" : (dup as { reason: string }).reason);
  ok("3b.3 · a unique anchor resolves", resolveAnchor(fixture, "gamma").ok);
  // ⚠️ And the CRLF property this module exists for: an anchor written with \n must resolve in
  // a file that holds \r\n, or every multi-line case in the fleet is a coin flip on checkout.
  ok("3b.4 · ⭐ a \\n anchor resolves inside a CRLF file — the trap red-anchor.mjs exists for",
     resolveAnchor("alpha\r\nbeta\r\ngamma\r\n", "alpha\nbeta").ok);
}

console.log("\n§4 · the ratchet — harnesses still outside the anchor audit");
{
  // ⛔ THE CEILING MAY ONLY GO DOWN. Converting a harness to a declaration lowers it; nothing
  // else may raise it. This is the same shape as `test:failure-reasons` §10's raw-string
  // ratchet and `test:labels` §4's, and for the same reason: a gap that is printed every run
  // gets closed, a gap described in a comment does not.
  const UNDECLARED_CEILING = 67;
  const declaredNames = new Set(declFiles.map((f) => f.replace(/\.anchors\.mjs$/, "")));
  // A harness "declares" when a declaration file exists whose name appears in its command.
  const undeclared = harnesses.filter((key) => {
    const cmd = pkg.scripts[key];
    return ![...declaredNames].some((n) => cmd.includes(n));
  });
  ok(`4.1 · ★ ${undeclared.length} harness(es) do not declare their anchors (ceiling ${UNDECLARED_CEILING})`,
     undeclared.length <= UNDECLARED_CEILING, `${undeclared.length} vs ${UNDECLARED_CEILING}`);
  ok("4.2 · ⛔ …and if that count drops, LOWER THE CEILING in the same commit",
     undeclared.length === UNDECLARED_CEILING,
     `${undeclared.length} vs ${UNDECLARED_CEILING} — a ceiling above the real count stops being a ratchet`);
  console.log(`     still un-audited (${undeclared.length}): ${undeclared.join(", ")}`);
}

console.log(`\nred-anchors: ${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length ? 1 : 0);
