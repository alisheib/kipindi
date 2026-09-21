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
import { resolveAnchor, resolvePath } from "./red-anchor.mjs";

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
/** The script a `red:*` command runs, whether through `node` or `tsx`. */
const scriptOf = (cmd: string): string | undefined => /(?:node|tsx)\s+(scripts\/[\w./-]+)/.exec(cmd)?.[1];

console.log(`\nred-anchors — ${harnesses.length} declared red:* harness(es)\n`);
console.log("§1 · every red:* names a script that exists");
{
  ok("1.0 · fixture · the fleet was enumerated from package.json", harnesses.length > 20, `${harnesses.length} harnesses`);
  for (const key of harnesses) {
    // ⚠️ `tsx` TOO (2026-09-14). Seven harnesses are a test run with a `--prove-red*` flag
    // (`tsx scripts/social-links.test.mts --prove-red-home`); a parser that knew only `node`
    // reported all seven as "cannot parse" — standing failures about the parser, not the fleet.
    const rel = scriptOf(pkg.scripts[key]);
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
    const mod = await import(`./anchors/${f}`) as { MUTATIONS: Array<{ name: string; file: string; from: string; combineInto?: string; kind?: string; path?: string; presence?: "present" | "absent" }> };
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
      // ⭐ TWO KINDS OF SUBJECT, TWO RESOLVERS. A mutation that edits a STRING inside a file is
      // audited by `resolveAnchor`; one whose subject is a PATH — a file it creates, or an asset
      // it rewrites in place — is audited by `resolvePath`. Before the second resolver existed
      // the path-shaped harnesses simply could not declare, and §4's ratchet was RAISED to make
      // room for one of them. See `red-anchor.mjs` for that history.
      if (m.kind === "path") {
        // ⛔ Injected predicate, so this stays a reader: it asks whether a path is there, and
        // never opens one for writing.
        const r = resolvePath((rel) => existsSync(`${ROOT}/${rel}`), m as unknown as { path: string; presence: "present" | "absent" });
        ok(`3.${f}:${m.name.slice(0, 44)} · declared path is ${m.presence}`, r.ok,
           r.ok ? m.path ?? "" : (r as { reason: string }).reason);
        continue;
      }
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

  // ⭐ THE SECOND RESOLVER GETS THE SAME TREATMENT, and for the same reason §3b exists at all:
  // §3 passing over a fleet whose declared paths all happen to be fine is indistinguishable from
  // §3 being unable to fail on them. The predicate is injected, so these run against a fixture
  // rather than the tree — nothing here touches disk.
  const present = (p: string) => p === "here.txt";
  ok("3b.5 · a CREATION whose target already exists is REFUSED",
     !resolvePath(present, { path: "here.txt", presence: "absent" }).ok,
     "a creation-mutation would overwrite it, and its undo would delete it");
  ok("3b.6 · a creation whose target is absent resolves",
     resolvePath(present, { path: "nowhere.txt", presence: "absent" }).ok);
  ok("3b.7 · ⛔ an asset mutation whose subject has MOVED is REFUSED — it would plant nothing",
     !resolvePath(present, { path: "gone.png", presence: "present" }).ok);
  ok("3b.8 · an asset mutation whose subject is there resolves",
     resolvePath(present, { path: "here.txt", presence: "present" }).ok);
  // ⛔ AND THE ONE THAT MATTERS MOST: an UNDECLARED presence must not silently mean "present".
  // Defaulting would pass every creation-mutation ever written, which is the exact case this
  // resolver was added for.
  ok("3b.9 · ⛔ a mutation that declares NO presence is refused, never defaulted",
     !resolvePath(present, { path: "here.txt" } as unknown as { path: string; presence: "present" }).ok);
  ok("3b.10 · a mutation that declares no path at all is refused",
     !resolvePath(present, {} as unknown as { path: string; presence: "present" }).ok);
}

console.log("\n§4 · the ratchet — harnesses still outside the anchor audit");
{
  // ⛔ THE CEILING MAY ONLY GO DOWN. Converting a harness to a declaration lowers it; nothing
  // else may raise it. This is the same shape as `test:failure-reasons` §10's raw-string
  // ratchet and `test:labels` §4's, and for the same reason: a gap that is printed every run
  // gets closed, a gap described in a comment does not.
  // 67 → 65 on 2026-09-06: `red:board-discovery` and `red:discovery-contract` both moved their
  // cases into `scripts/anchors/`. ⭐ The board one is why: its inline `new` anchor rotted the
  // moment a live defect in that arm was repaired, and this ratchet was structurally unable to
  // notice — §3 audits declaration files, and it had none.
  /**
   * ✅ BACK TO 65 ON 2026-09-09 — THE DEBT BELOW IS PAID, AND THE NOTE THAT REPLACED IT WAS WRONG
   * IN A WAY WORTH KEEPING ON THE RECORD.
   *
   * ⚠️ WHAT THE 65 → 66 BUMP ACTUALLY WAS. Re-derived from history rather than believed:
   *
   *     37f8ed2e   ceiling 65 · real 65     ← the last legitimately green state
   *     adc3718f   ceiling 66 · real 67     ← RED the moment it merged, and red for a day after
   *     0ac97836   ceiling 66 · real 70     ← three more harnesses arrived undeclared
   *
   * TWO harnesses landed in the `adc3718f` merge, from two sessions working the same day:
   * `red:route-census` and `red:lipa-qr`. The bump counted only the one its author could see, and
   * the note left here claimed in writing that *"the one addition is red-route-census.mjs"* — a
   * sentence that was false the instant the other branch merged. Nobody re-ran this gate, so it
   * sat red on `main` while reading as a considered decision.
   *
   * 🎯 **A RATCHET CONSTANT BUMPED BY ONE SESSION IS WRONG AS SOON AS A SECOND SESSION MERGES ITS
   * OWN ADDITION.** Neither can see the other's at bump time. That is the argument for the rule
   * this file already states: ⛔ the COUNT comes down to meet the ceiling, never the reverse.
   *
   * ⭐ AND THE CLAIM THAT ONE OF THEM *COULD NOT* DECLARE WAS TWO-THIRDS FALSE. `red-route-census`
   * was said to be unanchorable because it edits a markdown table and creates a `page.tsx`. But
   * `resolveAnchor` neither knows nor cares whether a file is `.ts` or `.md`, so two of its three
   * cases were ordinary anchors all along; only the CREATION needed anything new, and what it
   * needed was one resolver — `resolvePath` in `red-anchor.mjs` — not a higher number.
   *
   * ⭐ WHAT DECLARING BOUGHT, beyond stopping anchors from rotting: moving `red:levy-allocation`
   * onto the shared resolver immediately exposed a defect its hand-rolled matcher had hidden —
   * `if (traLevyAmt > 0) {` matches TWICE in `ledger.ts`, and a `split().join()` had been mutating
   * BOTH sites while the tally reported one. It went red for a WIDER reason than it claimed and
   * still printed 7/7. ⛔ So this audit does not only catch anchors that stopped matching; it
   * catches harnesses quietly testing more than they say.
   *
   * The five that closed the gap: `route-census`, `lipa-qr`, `webhook-money`, `payment-control`
   * (this session) and `levy-allocation` (the money-gate session, concurrently).
   */
  /**
   * ⛔ 2026-09-21 · ops-lane · 67 vs 65, AND THE TWO EXCESSES ARE NAMED RATHER THAN ABSORBED.
   * The ceiling below is UNCHANGED and must stay so; this note exists because the previous red was
   * a bare number and the next session would otherwise re-derive it from scratch or, worse, bump it.
   *
   * ⭐ FIRST, THE FINDING THAT REFRAMES IT: **`origin/main` IS ITSELF RED HERE.** Re-derived by
   * replaying this §4 against main's blobs out of the object store (169 `red:*`, 88 declaration
   * files, the same 9 in-process): main's real count is **66 against its own ceiling of 65**, so
   * 4.1 and 4.2 both FAIL on `main` today. `red:mobile-visual-plan` is one of those 66 and is
   * declared nowhere — `git ls-tree origin/main scripts/anchors/` has no file for it.
   *
   * SO THE 67 DECOMPOSES EXACTLY, and this lane's share of it is ONE:
   *   66  inherited from `origin/main`, already over that ceiling before ops-lane branched
   *   +1  `red:house-bot-ops` — THIS lane's own, added at `ca893232`
   * (the three `red:*` this lane adds are `house-bot-c5`, `house-bot-chatbot` — both declared —
   * and `house-bot-ops`, which is not.)
   *
   * ⛔ WHY NEITHER WAS DECLARED, rather than declared to make the number meet:
   *
   * · `red:house-bot-ops` HAS NO DISK ANCHORS TO DECLARE. Its `--prove-red` path plants string
   *   constants in memory and exits before any store is chosen; it injects no `from` string into
   *   any file. It is counted only because `isInProcess` reads the whole source of the script the
   *   command names — one file serving two entry points — and `48c1c959` added an `rmSync` there
   *   for `test:house-bot-ops`'s temporary git index. ⭐ THAT IS THIS RATCHET WORKING AS WRITTEN
   *   ("a flag-mode harness that starts writing files falls straight back into the count"), so the
   *   fix is neither a wider `isInProcess` nor an invented anchors file: it is to give the red
   *   entry point a source of its own. See that file's header for the full derivation.
   *
   * · `red:mobile-visual-plan` IS NOT DECLARABLE IN THIS FORMAT AND IS NOT THIS PROGRAMME'S CODE.
   *   It does not match fixed strings: it locates its target at runtime — the FIRST `| U<n>` row of
   *   a living markdown board, "so plants work whatever the plan looks like today" — and its plants
   *   are functions over that row and over `git rev-parse HEAD`. There is no `from` to audit.
   *   ⛔ A `kind: "path"` presence declaration for the two docs WOULD pass §3 while auditing none of
   *   what can actually rot — a check that cannot fail, which this file's own header calls the
   *   disease. ⚠️ And this is NOT the `red-route-census` excuse §4 records as two-thirds false:
   *   that harness had literal anchors in a markdown table and `resolveAnchor` did not care about
   *   the extension. This one has no literals at all. The distinction is derived, not assumed.
   *
   * 🎯 SO THE RED STANDS, WITH AN OWNER ON EACH HALF. Declaring either would have bought equality by
   * blinding a checker, and closing `main`'s inherited half from an integration branch would hide a
   * defect that is live on `main` right now.
   */
  const UNDECLARED_CEILING = 65;
  const declaredNames = new Set(declFiles.map((f) => f.replace(/\.anchors\.mjs$/, "")));
  /**
   * ⭐ IN-PROCESS RED PROOFS ARE OUTSIDE THIS POPULATION (2026-09-14), AND THE CEILING DID NOT MOVE.
   *
   * §4 counts harnesses whose DISK anchors nobody audits — a harness that rewrites a file by matching a
   * string, where the string can rot. Eight harnesses added 2026-09-11/12 are a different kind: a test
   * run with a `--prove-red*` flag that plants its defect IN MEMORY (a frozen set, a copied string, a
   * page's CSS in the browser) and counts its own expected failures. They write nothing, so there is no
   * disk anchor to declare, and counting them pushed this number 74 against a ceiling of 65 — a red that
   * could only have been "fixed" by the one edit this file forbids.
   * ⛔ THE CLASS IS STRICT, SO IT CANNOT BECOME A LOOPHOLE: the command must carry `--prove-red`, AND the
   * script it runs must contain no file-writing call anywhere (comments included — conservative). A
   * flag-mode harness that starts writing files falls straight back into the count. §4.3 plants both.
   * The ninth excess closed by DECLARING: `red:chat-safety`'s mutations moved to `anchors/chat-safety.anchors.mjs`.
   */
  const WRITES = /\b(?:writeFileSync|writeFile|appendFileSync|rmSync|unlinkSync|renameSync|copyFileSync|cpSync)\s*\(/;
  const isInProcess = (cmd: string, scriptSource: string | null) =>
    /--prove-red/.test(cmd) && scriptSource !== null && !WRITES.test(scriptSource);
  const sourceOf = (cmd: string) => {
    const rel = scriptOf(cmd);
    return rel && existsSync(`${ROOT}/${rel}`) ? readFileSync(`${ROOT}/${rel}`, "utf8") : null;
  };
  const inProcess = harnesses.filter((key) => isInProcess(pkg.scripts[key], sourceOf(pkg.scripts[key])));
  // A harness "declares" when a declaration file exists whose name appears in its command.
  const undeclared = harnesses.filter((key) => {
    const cmd = pkg.scripts[key];
    return !inProcess.includes(key) && ![...declaredNames].some((n) => cmd.includes(n));
  });
  ok("4.3 · control · a --prove-red run whose script writes files is NOT in-process, and neither is an unflagged one",
     isInProcess("tsx scripts/x.test.mts --prove-red", "const planted = new Set([41]);")
     && !isInProcess("tsx scripts/x.test.mts --prove-red", "writeFileSync(target, mutated);")
     && !isInProcess("node scripts/x-red.mjs", "const planted = 1;")
     && !isInProcess("tsx scripts/x.test.mts --prove-red", null));
  console.log(`     in-process red proofs, outside the anchor audit by construction (${inProcess.length}): ${inProcess.join(", ")}`);
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
