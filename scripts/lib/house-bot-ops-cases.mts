/**
 * THE HOUSE-BOT OPS CASE LIST — the lane that owns the four Commit-7 ops scripts (A9, S3, F2).
 *
 *   npm run test:house-bot-ops      (both stores, through db-scratch)
 *   npm run red:house-bot-ops       (scripts/red-house-bot-ops.mts — the planted controls only, in process, writing nothing)
 *
 * ⛔ THIS SUITE IS ARMED BEFORE THE SCRIPTS IT GUARDS EXIST, and that is the whole point of its
 * ordering. §0's marker gate is written while the correct answer is still "exactly ONE file outside
 * `src/` carries a `houseBotId` UPDATE, and it is a control that rolls back". A gate written after the
 * script it guards is a gate written to fit it: it can only ever describe what was built, and the
 * question it exists to answer — did this commit widen the one sanctioned exception? — is unanswerable
 * once the exception is already in the tree.
 *
 * ⛔ OWNER RULING D19: nothing about house bots reaches a player or the holder. An ops script prints to
 * a TERMINAL, so it MAY name the feature; anything it writes into a shared artefact may not.
 * ⛔ OWNER RULING D20: house bots are ordinary players in every report.
 * ⛔ THE MASTER SWITCH IS THE OWNER'S ALONE. No ops script may turn house bets ON — no `--on`, no
 * inverse flag, no `enabled = true` anywhere. One MAY turn them off: refusing to stop is never the safe
 * default. §0's `ops.pop.3` is that law made mechanical, over a population derived from package.json
 * rather than from a folder somebody remembered to look in.
 *
 * ⛔ A GUARD'S SCOPE IS PART OF ITS CLAIM. A house word sat live on an admin page for weeks because the
 * lexicon guard scanned `src/app/admin/desk/**` while the string lived in `src/lib/server/`. So every
 * assertion here states the population it measured, PRINTS its size, and refuses outright on a
 * population below its floor — a checker over zero files reports zero offenders and takes its control
 * green with it (`house-bot-reports-cases.mts` 0.232.3 passed "forever over an empty population WITH
 * ITS CONTROL STILL GREEN" for exactly that reason).
 *
 * ⛔ THE WALKER IS IMPORTED, NEVER REDEFINED — `scripts/lib/tracked-files.mts`, the same one ruling
 * 232's bypass scan reads. A second walker is how two guards come to disagree about what "every file"
 * means while both print a number.
 *
 * ⭐ EVERY ASSERTION HAS A PLANTED CONTROL THAT PLANTS A SHAPE THE REAL CODE COULD CONTAIN, and the
 * positive controls matter more than the negative ones. This lane has already proved it: thirteen
 * "this table is refused" assertions all PASSED HARDER while the feature under them was broken, and
 * only a positive control — "this table must still be deletable" — caught it. So §0 asserts both
 * directions: the offender set must equal its allowlist EXACTLY, so a new offender AND a stale
 * exemption are each reported, and each detector is run against a benign body that must NOT be.
 *
 * ⚠️ THE SCANNER MUST NOT MEASURE ITSELF — and since 2026-09-26 the strings it hunts are not in this file at
 * all. The detectors, the planted controls and `redCases()` live in `scripts/lib/house-bot-ops-detectors.mts`,
 * whose header carries this rule and its history; `bodyOf` strips THAT module's marked region before any scan,
 * and `ops.pop.self` asserts the strip there.
 *
 * ⛔ THE RED PATH HAS A SOURCE OF ITS OWN (2026-09-26, RESUME-HERE §0c step 7), AND THIS FILE MUST NEVER AGAIN
 * BE THE SOURCE A `red:` KEY NAMES. Until then `red:house-bot-ops` ran THIS file with `--prove-red` — one file,
 * two entry points — and §9's clean-up of its temporary git index is a file-writing call. `test:red-anchors` §4
 * reads the WHOLE source of the script a `red:*` command names, comments included, so from `48c1c959`
 * (2026-09-20) that one disk write counted the in-memory red proof as a harness whose anchors nobody audits: the
 * ratchet working as written, on an entry point that was shared. `npm run red:house-bot-ops` now runs
 * `scripts/red-house-bot-ops.mts`, which writes nothing, and `ops.red.1` pins that with §4's own rule, READ out of
 * `red-anchors.test.mts` and never re-typed here. This file keeps its §9 disk write and refuses `--prove-red`
 * with exit 2.
 *
 * ⛔ NOTHING WAS DECLARED, AND `isInProcess` WAS NOT WIDENED. This harness has NO disk anchors — it injects no
 * `from` string into any file — so a `scripts/anchors/house-bot-ops.anchors.mjs` would invent mutations or
 * declare bare path presence (a check that cannot fail, which §4's own header calls the disease), and it would
 * land in ruling 505's hole: a `house*.anchors.mjs` suite key needs a roll-call in `ROLL_CALL_SITES` or an entry
 * in `ROLL_CALL_OWED`, whose length pin may only SHRINK.
 *
 * A red harness that rewrites the repo while a second lane is editing it is the standing incident.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { join, posix } from "node:path";
import { tmpdir } from "node:os";
import { decomment } from "./decomment.mts";
import { REPO_ROOT, scriptFiles } from "./tracked-files.mts";
// ⛔ PURE MODULES ONLY AT THE TOP OF THIS FILE — the `--prove-red` refusal and §0's source pins run before any store is chosen.
// `feed-copy.ts` imports `./constants` and nothing else; the operator sentences are READ from it here for the
// same reason the scripts import them: a suite that re-typed the sentence it checks would pass forever.
import { SWITCH_OFF_COPY } from "../../src/lib/house-bot/feed-copy.ts";
import { LIVE_INTENT_STATUSES } from "../../src/lib/house-bot/constants.ts";
// ⭐ THE DETECTORS, THE PLANTED REGION AND `redCases()` MOVED, VERBATIM, TO A MODULE OF THEIR OWN (2026-09-26):
// the red entry needs a source with no file-writing call, and this file cannot be imported. See this header.
import {
  j, read, SELF, bodyOf, PLANTED, sameSet, redCases, MARKER_UPDATE_EXEMPT, ORM_MARKER_EXEMPT, HOUSE_TOKENS,
  opsPopulation, auditPopulation, markerUpdateSites, ormMarkerUpdates, rollbackGuarded, switchOnSites, onFlagSites,
  copyLiteralLeaks, advisoryLockSites, hardcodedHostSites, sslByHost, typedIndexNames, derivesIndexNames,
  indexValidityRead, typedTableLiterals, auditWriteSites, withoutStringLiterals, remarkPin, loopbackRefusal, gitVerbs,
  typedAdminCredential,
} from "./house-bot-ops-detectors.mts";

type Any = any;
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = ""): void => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} [${STORE}] ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string): void => console.log(`\n[${STORE}] ${t}`);
async function guard(label: string, fn: () => Promise<void> | void): Promise<void> {
  // ⚠️ TWELVE STACK LINES, NOT THREE. A Prisma raw-query failure puts its CHECK-constraint name and the
  // failing row past line three, so a three-line blob said only "Invalid $queryRawUnsafe() invocation" and
  // cost a whole debug cycle to turn back into a fact. A failure message is only printed when something failed.
  try { await fn(); } catch (e) { ok(`${label} · threw`, false, String((e as Error)?.stack ?? e).split("\n").slice(0, 12).join(" | ")); }
}

// ⛔ THE RED PATH IS NOT THIS FILE (2026-09-26). `npm run red:house-bot-ops` runs `scripts/red-house-bot-ops.mts`;
// this file is the test path and its §9 writes to the disk, so it must never again be the source a `red:` key names.
// The old command, run from a stale doc or from memory, is REFUSED here — never allowed to run the test body on a
// store called "unknown". `ops.red.1r` drives this refusal.
if (process.argv.includes("--prove-red")) {
  console.error("red mode lives in scripts/red-house-bot-ops.mts (npm run red:house-bot-ops) — this file is the test path, and its §9 writes to disk.");
  process.exit(2);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §0 · the scripts/ marker gate and the master-switch law. SOURCE pins: the memory child only,
// because a source file reads the same on both stores.
// ═══════════════════════════════════════════════════════════════════════════════════════════

if (STORE === "memory") {
  section("§0 · the scripts/ population, the one marker exemption, and the owner's switch");

  await guard("0", () => {
    const pop = scriptFiles();
    const mts = pop.filter((f) => f.endsWith(".mts")).length;
    ok("ops.pop.0 · the population is REAL and PRINTED: every tracked file under scripts/, counted here rather than quoted from a comment",
      pop.length > 400 && mts >= 40, `${pop.length} files · ${mts} .mts · ${pop.filter((f) => f.endsWith(".mjs")).length} .mjs · ${pop.filter((f) => f.endsWith(".cjs")).length} .cjs`);

    const empty = auditPopulation([], bodyOf, markerUpdateSites, 400);
    ok("ops.pop.0c · CONTROL · the same checker handed an EMPTY population REFUSES instead of reporting clean — the emptiness trap that let a pin pass forever with its control green",
      empty.refused !== null && empty.offenders.length === 0, j(empty.refused));

    // ⚠️ 2026-09-26 (house-bots step 7): the known string was "const PORT = 5433;" until db-scratch.mts made the port
    // overridable (KP_SCRATCH_PORT); this control then failed on main for a reason nobody read. It names the real line now.
    const known = ["scripts/db-scratch.mts", "scripts/house-bot-migrations-old-build.mts"] as const;
    ok("ops.pop.0p · POSITIVE CONTROL · the walker really OPENED files: two known scripts are in the population and a known string in each is found through the SAME read path the checkers use",
      known.every((f) => pop.includes(f)) && bodyOf(known[0]).includes("const PORT = Number(process.env.KP_SCRATCH_PORT ?? 5433);") && bodyOf(known[1]).includes("hb_control"),
      j(known.map((f) => ({ f, inPopulation: pop.includes(f) }))));

    ok("ops.pop.self · CONTROL · the detectors module's planted region is stripped before it is scanned, so the gate never reports ITSELF as the marker writer",
      read(SELF).includes(PLANTED.rawPositionMarker) && !bodyOf(SELF).includes(PLANTED.rawPositionMarker),
      `${decomment(read(SELF)).length - bodyOf(SELF).length} characters of planted controls stripped`);
  });

  await guard("1", () => {
    const pop = scriptFiles();
    const raw = auditPopulation(pop, bodyOf, markerUpdateSites, 400);
    const allowed = MARKER_UPDATE_EXEMPT.map((e) => e.file);
    ok("ops.pop.1 · ⛔ EXACTLY the named files under scripts/ carry a raw marker write (an UPDATE whose assignment clause names the marker column) — compared as a set in BOTH directions, so a NEW writer and a STALE exemption are each reported",
      raw.refused === null && sameSet(raw.offenders, allowed),
      `${raw.scanned} files scanned · offenders ${j(raw.offenders)} · allowed ${j(allowed)} · ${j(raw.detail)}`);
    ok("ops.pop.1e · every exemption's file is still on disk, and carries the statement its entry describes",
      MARKER_UPDATE_EXEMPT.every((e) => existsSync(join(REPO_ROOT, e.file)) && markerUpdateSites(bodyOf(e.file)).length >= 1),
      j(MARKER_UPDATE_EXEMPT.map((e) => e.file)));

    const orm = auditPopulation(pop, bodyOf, ormMarkerUpdates, 400);
    const ormAllowed = ORM_MARKER_EXEMPT.map((e) => e.file);
    ok("ops.pop.1b · …and EXACTLY the named files name `houseBotId` in an ORM update call — the second shape, measured rather than assumed, because an unmeasured shape is how the first one escapes",
      orm.refused === null && sameSet(orm.offenders, ormAllowed),
      `offenders ${j(orm.offenders)} · allowed ${j(ormAllowed)}`);

    const red = redCases().filter((c) => c.label.startsWith("ops.pop.1"));
    ok("ops.pop.1c · CONTROL · the checkers REPORT the shapes the real scripts will contain — the remark statement, the marker written onto the POSITION, the ORM patch — and do NOT report a marker used as a WHERE filter",
      red.length >= 5 && red.every((c) => c.caught), j(red.map((c) => ({ l: c.label.slice(0, 48), caught: c.caught }))));
  });

  await guard("2", () => {
    const e = MARKER_UPDATE_EXEMPT[0];
    const code = bodyOf(e.file);
    const sites = markerUpdateSites(code);
    const g = sites[0] ? rollbackGuarded(code, sites[0]) : null;
    ok("ops.pop.2 · ⛔ the exemption is ASSERTED, not assumed: the old build's planted marker sits between BEGIN and ROLLBACK with no COMMIT between — an exemption without this is a hole with a comment on it",
      sites.length === 1 && g !== null && g.begin && g.rollback && !g.commitBetween, `${e.file}:${sites[0]?.line} · ${j(g)}`);
    const red = redCases().filter((c) => c.label.startsWith("ops.pop.2"));
    ok("ops.pop.2c · CONTROL · the same file with its ROLLBACK deleted, and with it turned into a COMMIT, are each reported",
      red.length === 2 && red.every((c) => c.caught), j(red.map((c) => c.caught)));
  });

  await guard("3", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const pop = scriptFiles();
    const { files: ops, keys, unresolved } = opsPopulation(pkg.scripts, pop);
    ok("ops.pop.3p · the OPS population is REAL and PRINTED: derived from package.json's `ops:` keys plus every scripts/ops-* file, so an ops script cannot hide by not being where somebody looked",
      ops.length >= 60 && keys.length >= 50 && unresolved.length === 0,
      `${keys.length} ops: keys · ${ops.length} files · unresolved ${j(unresolved)}`);
    ok("ops.pop.3pp · POSITIVE CONTROL · a known ops script is in that population, by BOTH routes — one named only by a key, one found only by its filename",
      ops.includes("scripts/live/ops/pool-integrity.cjs") && ops.includes("scripts/ops-preflight-ai-cycles.mts"), j(ops.slice(0, 3)));

    const on = auditPopulation(ops, bodyOf, switchOnSites, 60);
    ok("ops.pop.3 · ⛔ THE OWNER'S LAW, MECHANICAL: no ops script can turn house bets ON — not through switchOnHouseBots, not through the DAL member, not through a raw `\"enabled\" = true`, not through an ORM patch on the control row",
      on.refused === null && on.offenders.length === 0, `${on.scanned} ops files scanned · ${j(on.detail)}`);

    const house = ops.filter((f) => HOUSE_TOKENS.test(bodyOf(f)) || /house-bot/.test(f));
    const flags = auditPopulation(house, bodyOf, onFlagSites, 0);
    ok("ops.pop.3f · no HOUSE ops script offers an ON-shaped flag — and the subset is printed, because it is EMPTY until the first house ops script lands and an empty population proves nothing on its own",
      flags.offenders.length === 0, `${house.length} house ops file(s) of ${ops.length}: ${j(house)}`);

    const red = redCases().filter((c) => c.label.startsWith("ops.pop.3"));
    ok("ops.pop.3c · CONTROL · all four ON shapes ARE reported on a planted body, the sanctioned OFF direction is NOT, a house script's `--on` IS, and a non-house script's legitimate `--enabled` is outside the scope",
      red.length >= 6 && red.every((c) => c.caught), j(red.map((c) => ({ l: c.label.slice(10, 46), caught: c.caught }))));
  });

  await guard("red", () => {
    // ⭐ THE RED KEY IS IN §4's IN-PROCESS CLASS BY §4's OWN RULE, READ OUT OF `scripts/red-anchors.test.mts` and
    // never re-typed here — so a change to that rule is measured here the day it lands, and a reshaped spelling
    // there fails `ops.red.0` with a sentence rather than a throw. Each spelling must be found EXACTLY once.
    const RED_KEY = "red:house-bot-ops", RED_ENTRY = "scripts/red-house-bot-ops.mts", CASES = "scripts/lib/house-bot-ops-cases.mts";
    const rule = read("scripts/red-anchors.test.mts");
    const once = (re: RegExp): string | null => { const all = [...rule.matchAll(re)]; return all.length === 1 ? all[0][1] : null; };
    const writesSrc = once(/^[ \t]*const WRITES = \/(.+)\/;[ \t]*\r?$/gm);
    const scriptOfSrc = once(/^[ \t]*const scriptOf = [^\n]*?=> \/(.+)\/\.exec\(cmd\)/gm);
    const flagSrc = once(/^[ \t]*\/(.+)\/\.test\(cmd\) && scriptSource !== null && !WRITES\.test\(scriptSource\);[ \t]*\r?$/gm);
    const unread = [
      writesSrc === null ? "the write predicate (const WRITES)" : "",
      scriptOfSrc === null ? "the script-path parser (const scriptOf)" : "",
      flagSrc === null ? "isInProcess's flag test" : "",
    ].filter(Boolean);
    ok("ops.red.0 · §4's classification rule is READ out of scripts/red-anchors.test.mts — its write predicate, its script-path parser and its flag test, each found exactly once — so every case below measures the rule §4 really applies",
      unread.length === 0,
      unread.length ? `NOT FOUND exactly once: ${unread.join(", ")} — §4 was reshaped; re-point this extraction at its new spelling, never re-type the rule here`
        : `WRITES /${writesSrc}/ · scriptOf /${scriptOfSrc}/ · flag /${flagSrc}/`);
    if (writesSrc === null || scriptOfSrc === null || flagSrc === null) return;
    const WRITES = new RegExp(writesSrc), SCRIPT_OF = new RegExp(scriptOfSrc), FLAG = new RegExp(flagSrc);

    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const cmd = pkg.scripts[RED_KEY] ?? "";
    ok("ops.red.1a · the red key carries §4's flag — a red command without it is counted among the harnesses nobody audits, whatever its source says",
      FLAG.test(cmd), `${RED_KEY}: ${cmd || "(no such key)"}`);
    const ran = SCRIPT_OF.exec(cmd)?.[1] ?? null;
    ok("ops.red.1b · …and it runs a red entry of its OWN, never this case list — whose §9 disk write means it can never be in-process",
      ran === RED_ENTRY && existsSync(join(REPO_ROOT, RED_ENTRY)), `runs ${ran ?? "(no script parsed)"}`);
    const onDisk = (rel: string): string | null => { try { return read(rel); } catch { return null; } };
    const entry = onDisk(RED_ENTRY) ?? "";
    ok("ops.red.1c · ⛔ that entry's RAW source, comments included, holds no file-writing call by §4's own predicate — so §4 counts the key in-process; a write added to it, or a write call's name followed by a parenthesis in its prose, puts the key straight back into the count",
      entry.length > 0 && !WRITES.test(entry), `${RED_ENTRY} · ${entry.length} characters read`);

    /**
     * The static VALUE-import closure of a file: every module that loading it loads. Relative and `@/` specifiers are
     * followed to a fixpoint and resolved the way the runtime resolves them (the extension optional); `import type`
     * is skipped because it is erased before anything runs; a package or a `node:` builtin is not a file of this
     * repository and is not followed — except that a child-process import is REPORTED. A specifier that resolves to
     * nothing is reported too: a closure that silently lost a file would be a clean reading of the wrong population.
     */
    const closureOf = (start: string, source: (rel: string) => string | null): { files: string[]; unresolved: string[]; childProcess: string[] } => {
      const STATIC = /^[ \t]*(?:import|export)(?![ \t]+type[ \t])[ \t]+[^;"'`]*?\bfrom[ \t]*["']([^"']+)["']/gm;
      const BARE = /^[ \t]*import[ \t]*["']([^"']+)["']/gm;
      const DYNAMIC = /(?<![\w$.])import[ \t]*\([ \t]*["']([^"']+)["'][ \t]*\)/g;
      const TRY = ["", ".ts", ".mts", ".tsx", ".js", ".mjs", ".cjs", "/index.ts", "/index.mts", "/index.js", "/index.mjs"];
      const files: string[] = [], unresolved: string[] = [], childProcess: string[] = [];
      const queue = [start], seen = new Set<string>([start]);
      while (queue.length) {
        const rel = queue.shift() as string;
        const raw = source(rel);
        if (raw === null) { unresolved.push(rel); continue; }
        files.push(rel);
        const code = decomment(raw);
        for (const m of [...code.matchAll(STATIC), ...code.matchAll(BARE), ...code.matchAll(DYNAMIC)]) {
          const spec = m[1];
          if (/^(?:node:)?child_process$/.test(spec)) { childProcess.push(rel); continue; }
          const base = /^\.\.?\//.test(spec) ? posix.join(posix.dirname(rel), spec) : spec.startsWith("@/") ? `src/${spec.slice(2)}` : null;
          if (base === null) continue;
          const hit = TRY.map((x) => posix.normalize(`${base}${x}`)).find((c) => source(c) !== null);
          if (hit === undefined) unresolved.push(`${rel} → ${spec}`);
          else if (!seen.has(hit)) { seen.add(hit); queue.push(hit); }
        }
      }
      return { files, unresolved, childProcess };
    };
    const closure = closureOf(RED_ENTRY, onDisk);
    const writers = closure.files.filter((f) => WRITES.test(onDisk(f) ?? ""));
    ok("ops.red.1d · ⛔ …and neither does ANY module it loads: the entry's static value-import closure — followed to a fixpoint, `import type` skipped, every specifier resolved — is write-free by the same predicate and imports no child process. §4 opens one file; this reads everything that file runs",
      closure.files.length >= 4 && closure.files.includes("scripts/lib/house-bot-ops-detectors.mts")
      && closure.unresolved.length === 0 && closure.childProcess.length === 0 && writers.length === 0,
      `${closure.files.length} file(s) ${j(closure.files)} · writers ${j(writers)} · child process ${j(closure.childProcess)} · unresolved ${j(closure.unresolved)}`);
    const plantTree = new Map<string, string>([
      ["scripts/e.mts", 'import { a } from "./lib/m.mts";\nimport type { T } from "./lib/t.mts";\nexport { b } from "./lib/n";\n'],
      ["scripts/lib/m.mts", "export const a = 1;\n"],
      ["scripts/lib/n.ts", 'import { spawnSync } from "node:child_process";\nexport const b = 2;\n'],
      ["scripts/lib/t.mts", "export type T = number;\n"],
    ]);
    const pc = closureOf("scripts/e.mts", (rel) => plantTree.get(rel) ?? null);
    ok("ops.red.1d.c · CONTROL · on a planted tree the walk FOLLOWS a value import and a re-export, resolves an extensionless specifier, SKIPS an `import type`, and REPORTS a child-process import — so 1d's clean closure is a measured walk, not an empty one",
      sameSet(pc.files, ["scripts/e.mts", "scripts/lib/m.mts", "scripts/lib/n.ts"]) && sameSet(pc.childProcess, ["scripts/lib/n.ts"]) && pc.unresolved.length === 0,
      j(pc));

    const caseList = read(CASES);
    const conviction = WRITES.exec(caseList);
    ok("ops.red.1p · POSITIVE CONTROL · the SAME predicate CONVICTS this case list — its §9 disk write — so 1c and 1d are a measured difference, not a predicate that matches nothing it is shown",
      conviction !== null, conviction ? `${CASES}:${caseList.slice(0, conviction.index).split("\n").length} · ${conviction[0]}` : "nothing convicted");
    // ⛔ Built by concatenation, like the region markers: typed whole, a plant would itself convict this file, and
    // 1p would stop measuring §9.
    const plantedCall = "try { " + "rm" + "Sync(IDX, { force: true }); } catch { }";
    const plantedProse = " * the temporary index is removed by rm" + "Sync (see §9)";
    const bareMention = "the rm" + "Sync that serves the test path is NAMED here and never called";
    ok("ops.red.1k · CONTROL · the predicate catches a planted write call AND a write call's name followed by a parenthesis in PROSE — §4 reads comments and matches across whitespace — while a bare mention is not caught",
      WRITES.test(plantedCall) && WRITES.test(plantedProse) && !WRITES.test(bareMention),
      j({ call: WRITES.test(plantedCall), prose: WRITES.test(plantedProse), bareMention: WRITES.test(bareMention) }));

    // ⭐ DRIVEN, NOT READ: a refusal is an exit code, so each is proved by running the file the way a person would.
    // ⛔ NEVER ON THIS CHILD'S STORE. Were the refusal ever deleted, a child on "memory" would reach this very guard
    // and spawn itself again, and again. On a store §0 never runs for, with no database, a missing refusal fails
    // here once — a finite run that prints a summary — instead of recursing.
    const oldCommand = runOps(CASES, ["--prove-red"], { HB_MONEY_STORE: "refusal-probe", DATABASE_URL: "" });
    ok("ops.red.1r · the OLD command — this case list with --prove-red, from a stale doc or from memory — is REFUSED with exit 2 and names the new entry, instead of running the test body on a store called \"unknown\"",
      oldCommand.code === 2 && oldCommand.out.includes(RED_ENTRY) && !/@@SUMMARY/.test(oldCommand.out),
      `exit ${oldCommand.code} · ${oldCommand.out.trim().slice(0, 160)}`);
    const redRun = runOps(RED_ENTRY, ["--prove-red"]);
    const tally = [...redRun.out.matchAll(/(\d+)\/(\d+) caught/g)].at(-1);
    const inProcess = redCases().length;
    ok("ops.red.1e · POSITIVE CONTROL · the red entry RUN with its flag exits 0, and its tally is every planted control this suite runs in process — so the file 1c and 1d hold write-free is the file that really proves red",
      redRun.code === 0 && tally !== undefined && Number(tally[1]) === inProcess && Number(tally[2]) === inProcess,
      `exit ${redRun.code} · tally ${tally ? `${tally[1]}/${tally[2]}` : "(none printed)"} · ${inProcess} in process`);
    const bareRun = runOps(RED_ENTRY, []);
    ok("ops.red.1f · …and RUN without the flag it refuses with exit 2, printing no tally — the flag is what §4 classifies the key by, so a command that dropped it must not look clean",
      bareRun.code === 2 && !/caught/.test(bareRun.out), `exit ${bareRun.code} · ${bareRun.out.trim().slice(0, 120)}`);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §1 · THE TWO DAL MEMBERS THE OPS SCRIPTS NEED, on BOTH twins. Landed early and small, because
// this file is the hottest one in the repository this week and a small hunk merges.
//
// §1a runs FIRST and leaves the switch ON with marked stakes standing; §1b then walks the control
// row to its terminal state, which nothing can undo. That order is not cosmetic — a sunset desk
// cannot place the bets §1a needs.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const { loadWorld, OFFICER }: Any = await import("./house-bot-world.mts");
const w: Any = await loadWorld();
ok(`ops.dal.0 · fixture · the world loaded on ${STORE}`, w.onPostgres === (STORE === "postgres"), `onPostgres=${w.onPostgres}`);
await w.user({ id: OFFICER, role: "ADMIN" });
await w.limits();
await w.switchOn();

/** A poll carrying a locked player NO stake, so a house YES stake has something to fill against. */
async function pollWithLockedNo(noStake = 20_000): Promise<Any> {
  const market = await w.poll({ graceMin: 0 });
  const player = await w.user({ balance: 1_000_000 });
  const r = await w.svc.buyPosition(player, { marketId: market.id, side: "NO", stake: noStake, idempotencyKey: crypto.randomUUID() });
  if (!r.ok) throw new Error(`fixture bet refused: ${j(r)}`);
  await w.backdate(r.data.positionId, 10_000);
  return { market, player, noPositionId: r.data.positionId };
}
/**
 * One house YES stake through the real seam.
 *
 * ⚠️ THE SECOND STAKE ON A MARKET MUST BE A MANUAL, and that is the product's rule rather than a
 * convenience: `hbi_fill_opener_anchor_uq` is UNIQUE on (kind, anchorKey) for FILL and OPENER unless the
 * row is CANCELLED, and a FILL's anchor IS the market — one automatic fill per market, for ever. A MANUAL
 * anchors on the officer plus a fresh submit id, which is how a desk adds to a position it already holds.
 * Live intents are cancelled first because nothing here runs the engine's fire pass that finishes them.
 */
const stake = async (b: Any, marketId: string, stakeTzs: number, kind: "FILL" | "MANUAL" = "FILL"): Promise<Any> => {
  await w.dal.houseBotIntentStore.cancelLive({ houseBotId: b.botId }, "CASE_DONE");
  const extra = kind === "MANUAL" ? { entryCondition: "THIN" } : {};
  const r = await w.place(b, await w.intent(b, marketId, { kind, side: "YES", stakeTzs, ...extra }));
  if (!r.ok) throw new Error(`house ${kind} stake refused on ${marketId}: ${j(r)}`);
  return r;
};

section("§1a · openExposureByMarket — open house money per MARKET, one statement, both twins");
await guard("dal.5", async () => {
  const m1 = await pollWithLockedNo();
  const m2 = await pollWithLockedNo();
  const settled = await pollWithLockedNo();
  const botA = await w.bot();
  const botB = await w.bot();

  // ⛔ A MEASURED DEVIATION FROM THE PLAN'S FIXTURE, AND THE MEASUREMENT IS THE POINT. It asked for one
  // market staked by TWO different bots, so `bots` could be asserted as 2. THAT STATE IS UNREACHABLE
  // THROUGH THE PRODUCT: I3 is one bot per market, and `seam.ts` refuses any second bot with
  // conflict OTHER_BOT while the first holds an OPEN marked position (asserted below, ops.dal.5c0).
  // Planting it by hand would have manufactured a row the platform cannot write — the fixture rule this
  // world states in its own header — so the DISTINCT count is proved the reachable way instead: TWO
  // positions from ONE bot on m1. `count(*)` would read 2 there; `count(DISTINCT "houseBotId")` reads 1,
  // and that is the whole difference between the two implementations.
  await stake(botA, m1.market.id, 5_000);
  await stake(botA, m1.market.id, 3_000, "MANUAL");
  await stake(botA, m2.market.id, 7_000);
  // ⛔ PLANTED CONTROL · a marked position that is no longer OPEN. It is settled through the real
  // service, never by poking a status, so the row is one the product could produce.
  const gone = await stake(botB, settled.market.id, 9_000);
  await w.svc.resolveMarket({ marketId: settled.market.id, outcome: "YES", officerId: OFFICER });
  await w.svc.settleMarket(settled.market.id, { force: true });
  const settledPos = await w.mdal.positionStore.get(gone.data.positionId);

  const rows = await w.dal.houseBookStore.openExposureByMarket();
  const byId = new Map<string, Any>(rows.map((r: Any) => [r.marketId, r]));
  const r1 = byId.get(m1.market.id), r2 = byId.get(m2.market.id);

  ok("ops.dal.5 · per-market totals over two markets, identically on both twins — and m1 carries TWO positions from ONE bot, so `bots` reading 1 is `count(DISTINCT)` and not `count(*)`",
    r1?.openStakeTzs === 8_000 && r1?.bots === 1 && r2?.openStakeTzs === 7_000 && r2?.bots === 1 && rows.length === 2,
    j({ m1: r1, m2: r2, rows: rows.length }));

  // ⚠️ A MANUAL, for the same anchor reason as above: a second FILL on m1 would collide on the unique
  // index before the seam ever ran its conflict check, and the refusal under test would never happen.
  await w.dal.houseBotIntentStore.cancelLive({ houseBotId: botB.botId }, "CASE_DONE");
  const intruder = await w.place(botB, await w.intent(botB, m1.market.id, { kind: "MANUAL", entryCondition: "THIN", side: "YES", stakeTzs: 1_000 }));
  ok("ops.dal.5c0 · CONTROL · a SECOND bot on m1 is refused with conflict OTHER_BOT — so `bots` above is 1 because I3 holds, not because the fixture only had one bot, and a 2 on this column would be DRIFT for an ops reader to report",
    intruder.ok === false && intruder.reason === "house_market_conflict" && intruder.detail?.conflict === "OTHER_BOT"
    && botA.botId !== botB.botId, j({ ok: intruder.ok, reason: intruder.reason, conflict: intruder.detail?.conflict }));
  ok("ops.dal.5c1 · CONTROL · the fixture's SETTLED marked position is absent — the status='OPEN' predicate is doing work, and the position really did leave OPEN",
    settledPos.status !== "OPEN" && settledPos.houseBotId === botB.botId && !byId.has(settled.market.id),
    `settled position ${settledPos.status}, marked ${settledPos.houseBotId} · market present in result: ${byId.has(settled.market.id)}`);
  ok("ops.dal.5c2 · CONTROL · the UNMARKED player stakes on the SAME markets change no total — 40,000 TZS of player money sits on m1 and m2 and none of it is counted",
    r1?.openStakeTzs === 8_000 && r2?.openStakeTzs === 7_000
    && (await w.mdal.positionStore.get(m1.noPositionId)).status === "OPEN"
    && (await w.mdal.positionStore.get(m1.noPositionId)).houseBotId == null,
    j({ m1Total: r1?.openStakeTzs, m2Total: r2?.openStakeTzs }));

  const perBot = await w.dal.houseBookStore.openExposure(null);
  ok("ops.dal.5c3 · CONTROL · the per-MARKET answer DIFFERS from the per-BOT answer on this very fixture — ONE bot's 15,000 across two markets is one row there and two rows here, for the same total — otherwise the new member could be the old one relabelled",
    perBot.length === 1 && perBot[0].openStakeTzs === 15_000 && rows.length === 2
    && perBot.reduce((s: number, r: Any) => s + r.openStakeTzs, 0) === rows.reduce((s: number, r: Any) => s + r.openStakeTzs, 0),
    `per bot ${j(perBot)} · per market ${j(rows.map((r: Any) => ({ stake: r.openStakeTzs, bots: r.bots })))}`);
});

section("§1b · markSunset — the terminal off, and it is the one state the ON path refuses");
await guard("dal.1", async () => {
  // The desk is ON from the fixture. Take it to OFF(MANUAL) — the state a console OFF leaves behind.
  await w.switchOff();
  const before = await w.dal.houseBotControlStore.get();
  ok("ops.dal.1f · fixture · the desk is OFF with cause MANUAL, which is where an officer's console OFF leaves it",
    before.enabled === false && before.offCause === "MANUAL", j({ enabled: before.enabled, offCause: before.offCause }));

  const row = await w.dal.houseBotControlStore.markSunset({ byId: OFFICER, reason: "programme withdrawn" });
  const after = await w.dal.houseBotControlStore.get();
  ok("ops.dal.1 · ⛔ BLOCKER 1's CASE, AND IT IS FIRST · markSunset on an ALREADY-OFF desk writes offCause='SUNSET' and returns the row — switchOff() would have matched NOTHING here and written no marker at all",
    row !== null && row.offCause === "SUNSET" && after.offCause === "SUNSET" && after.enabled === false
    && after.switchedById === OFFICER && after.switchedReason === "programme withdrawn",
    j({ returned: row === null ? null : { enabled: row.enabled, offCause: row.offCause }, stored: { enabled: after.enabled, offCause: after.offCause, by: after.switchedById } }));

  const sw: Any = await import("../../src/lib/server/house-bot/switch-on.ts");
  const refused = await sw.switchOnHouseBots({ actorId: OFFICER, reason: null });
  ok("ops.dal.4 · the terminal marker is proved by the REFUSAL it produces, not by the column: switchOnHouseBots answers { ok:false, code:'WITHDRAWN' }",
    refused.ok === false && refused.code === "WITHDRAWN", j(refused));

  const again = await w.dal.houseBotControlStore.markSunset({ byId: OFFICER, reason: "second run" });
  const unchanged = await w.dal.houseBotControlStore.get();
  ok("ops.dal.3 · a second markSunset returns null and writes NOTHING — the conditional predicate, mirrored in both twins, and the reason a sunset script can be re-run",
    again === null && unchanged.switchedAt === after.switchedAt && unchanged.switchedReason === "programme withdrawn",
    j({ returned: again, switchedAtMoved: unchanged.switchedAt !== after.switchedAt, reason: unchanged.switchedReason }));

  // ⛔ PLANTED CONTROL · the null above must be a REFUSAL, not an inert call. The same member, on a desk
  // put back ON, must move the row — so `null` is known to mean "the predicate matched nothing".
  const on = await w.dal.houseBotControlStore.switchOn({ byId: OFFICER, reason: "control" });
  const live = await w.dal.houseBotControlStore.get();
  const fromOn = await w.dal.houseBotControlStore.markSunset({ byId: OFFICER, reason: "from ON" });
  const end = await w.dal.houseBotControlStore.get();
  ok("ops.dal.2 · markSunset from an ON desk writes enabled=false AND offCause='SUNSET' in ONE statement",
    on !== null && live.enabled === true && live.offCause === null
    && fromOn !== null && end.enabled === false && end.offCause === "SUNSET" && end.switchedReason === "from ON",
    j({ wasOn: live.enabled, offCauseCleared: live.offCause, now: { enabled: end.enabled, offCause: end.offCause } }));
  ok("ops.dal.3c · CONTROL · …so ops.dal.3's null was a refusal and not an inert member: the SAME call moved the row the moment the predicate matched",
    again === null && fromOn !== null && end.switchedReason === "from ON", j({ refused: again, applied: fromOn !== null }));
});

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §2 · ops:house-bots-off (A9) — the terminal fallback for a console that cannot be used AT ALL.
//
// ⛔ THE DRIVEN HALF RUNS THE REAL SCRIPT AS A CHILD PROCESS against the scratch database. A source
// scan alone would prove the statements are WRITTEN; only running it proves they are ACCEPTED — by
// `HouseBotControl_offCause_check` and `HouseBotEvent_kind_check`, which a suite cannot see.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const OFF_SCRIPT = "scripts/ops-house-bots-off.mts";
const SWITCH_OFF_SENTENCES = Object.values(SWITCH_OFF_COPY);

/** Run an ops script exactly as an officer would, and return what the terminal saw. */
function runOps(file: string, args: string[], env: Record<string, string> = {}): { code: number; out: string } {
  const r = spawnSync("npx", ["tsx", file, ...args], {
    cwd: REPO_ROOT, encoding: "utf8", shell: process.platform === "win32",
    env: { ...process.env, ...env }, timeout: 180_000, maxBuffer: 32 * 1024 * 1024,
  });
  return { code: r.status ?? 1, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
}

if (STORE === "memory") {
  section("§2s · ops:house-bots-off — the SOURCE pins, over the file the ops population now contains");
  await guard("off.src", () => {
    const body = bodyOf(OFF_SCRIPT);
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const { files: ops } = opsPopulation(pkg.scripts, scriptFiles());
    const house = ops.filter((f) => HOUSE_TOKENS.test(bodyOf(f)) || /house-bot/.test(f));

    ok("ops.off.0s · ⭐ POSITIVE CONTROL, AND IT CLOSES THE EMPTINESS TRAP · the OFF script is IN the derived ops population AND in its house subset — so ops.pop.3 and ops.pop.3f are now measuring a real file rather than resting on their planted controls alone",
      ops.includes(OFF_SCRIPT) && house.includes(OFF_SCRIPT) && pkg.scripts["ops:house-bots-off"] === `tsx ${OFF_SCRIPT}`,
      `${house.length} house ops file(s) of ${ops.length}: ${j(house)}`);

    ok("ops.off.5 · ⛔ THE OWNER'S LAW · the OFF script offers no way ON — no switchOnHouseBots, no DAL switchOn, no raw `\"enabled\" = true`, no ORM patch on the control row, and no ON-shaped flag",
      switchOnSites(body).length === 0 && onFlagSites(body).length === 0, j({ on: switchOnSites(body), flags: onFlagSites(body) }));

    ok("ops.off.6 · every operator sentence is IMPORTED from feed-copy.ts — no literal in the code (comments stripped) carries a SWITCH_OFF_COPY sentence, and the table really is reached",
      copyLiteralLeaks(body, SWITCH_OFF_SENTENCES).length === 0 && /SWITCH_OFF_COPY\./.test(body) && /feed-copy/.test(body),
      j({ leaks: copyLiteralLeaks(body, SWITCH_OFF_SENTENCES), sentences: SWITCH_OFF_SENTENCES.length }));

    const ssl = sslByHost(body);
    ok("ops.off.7 · the connection decides SSL BY HOST — the ai-cycles shape, rehearsable against a local cluster — and no provider hostname is typed into the file",
      ssl.byHost && !ssl.forced && hardcodedHostSites(body).length === 0, j({ ...ssl, hosts: hardcodedHostSites(body) }));

    ok("ops.off.8 · ⛔ NO advisory lock anywhere in the file: A9 exists because taking one lets a hung bet hold the switch open for the whole transaction timeout",
      advisoryLockSites(body).length === 0, j(advisoryLockSites(body)));

    ok("ops.d-ops-2 · ⛔ NO compliance row is written from this script, by decision: audit() HMAC-chains under a database-wide lock, so a hand-written AuditLog INSERT would break the chain — the SWITCH_OFF event row IS the record",
      auditWriteSites(body).length === 0, j(auditWriteSites(body)));

    const red = redCases().filter((c) => c.label.startsWith("ops.off.6") || c.label.startsWith("ops.off.7") || c.label.startsWith("ops.off.8") || c.label.startsWith("ops.d-ops-2"));
    ok("ops.off.src.c · CONTROL · each of those four detectors REPORTS the shape a real edit could introduce — a re-typed sentence, a hardcoded proxy rewrite, an advisory lock, a hand-written AuditLog INSERT — and does NOT report the sanctioned form of the same code",
      red.length >= 8 && red.every((c) => c.caught), j(red.map((c) => ({ l: c.label.slice(0, 40), caught: c.caught }))));
  });
}

if (STORE === "postgres") {
  section("§2 · ops:house-bots-off — DRIVEN against the scratch database, as an officer would run it");
  await guard("off", async () => {
    const pgLib: Any = (await import("pg")).default;
    const cx = new pgLib.Client({ connectionString: process.env.DATABASE_URL });
    await cx.connect();
    const one = async (text: string): Promise<Any> => (await cx.query(text)).rows[0];
    const census = async () => ({
      control: await one(`SELECT "enabled", "offCause", "switchedAt"::text AS "switchedAt", "switchedReason" FROM "HouseBotControl" WHERE "id" = 'global'`),
      switchOffEvents: Number((await one(`SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE "kind" = 'SWITCH_OFF'`)).n),
      allEvents: Number((await one(`SELECT count(*)::int AS "n" FROM "HouseBotEvent"`)).n),
      live: Number((await one(`SELECT count(*)::int AS "n" FROM "HouseBotIntent" WHERE "status" = ANY(ARRAY['PENDING','CLAIMED']::text[])`)).n),
      audits: Number((await one(`SELECT count(*)::int AS "n" FROM "AuditLog"`)).n),
    });

    try {
      // ── the fixture: a desk that is ON, one live intent standing, and one SWITCH_OFF event already there ──
      await w.dal.houseBotControlStore.switchOn({ byId: OFFICER, reason: "ops §2 fixture" });
      const bot = await w.bot();
      const m = await pollWithLockedNo();
      // ⛔ PLANTED CONTROL · a LIVE intent, claimed and never placed. D-OPS-1 says this script leaves it
      // standing; without one planted, "it did not cancel anything" would be true of an empty table.
      const liveIntent = await w.intent(bot, m.market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
      // ⛔ PLANTED CONTROL · a SWITCH_OFF event that already exists, so "exactly one" below is a DELTA.
      await w.dal.houseBotEventStore.append({
        houseBotId: null, userId: null, marketId: null, kind: "SWITCH_OFF", fromStatus: "ON", toStatus: "OFF",
        reason: "planted before the script ran", actorId: OFFICER, payload: { cause: "MANUAL" },
      });

      const before = await census();
      ok("ops.off.0f · fixture · the desk is ON, one live intent stands, and a SWITCH_OFF event is already on file — so every count below is a measured DIFFERENCE",
        before.control.enabled === true && before.live >= 1 && before.switchOffEvents >= 1,
        j({ enabled: before.control.enabled, live: before.live, switchOffEvents: before.switchOffEvents }));

      // ── 1 · the dry run ──
      const dry = runOps(OFF_SCRIPT, []);
      const afterDry = await census();
      ok("ops.off.1 · ⛔ THE DRY RUN WRITES NOTHING — control row, events and intents are identical before and after, against a desk that WAS on and could have moved",
        dry.code === 0 && JSON.stringify(afterDry) === JSON.stringify(before) && before.control.enabled === true,
        `exit ${dry.code} · ${j({ before: before.control, after: afterDry.control, events: [before.allEvents, afterDry.allEvents] })}`);
      ok("ops.off.1p · …and it PRINTS the two statements it would run and says nothing was written",
        /UPDATE "HouseBotControl" SET "enabled" = false/.test(dry.out) && /INSERT INTO "HouseBotEvent"/.test(dry.out) && /NOTHING WRITTEN/.test(dry.out),
        dry.out.split("\n").filter((l) => /NOTHING WRITTEN/.test(l)).join(" | ") || dry.out.slice(-200));

      // ── 2 · --apply on an ON desk ──
      // ⚠️ ONE-WORD REASONS ON PURPOSE. `spawnSync` with `shell: true` on Windows CONCATENATES arguments
      // instead of escaping them (Node's own DEP0190), so a multi-word reason arrives as its first word and
      // the assertion below would have been asserting a truncation. The script's 300-character cap is pinned
      // by the DDL's own CHECK, not here.
      const REASON_1 = "A9-console-unusable";
      const applied = runOps(OFF_SCRIPT, ["--apply", "--reason", REASON_1], { OPS_OFFICER_ID: OFFICER });
      const afterApply = await census();
      ok("ops.off.2 · --apply on an ON desk switches it off with cause MANUAL and appends EXACTLY ONE new SWITCH_OFF event — measured as a delta over the planted one",
        applied.code === 0 && afterApply.control.enabled === false && afterApply.control.offCause === "MANUAL"
        && afterApply.switchOffEvents === before.switchOffEvents + 1 && afterApply.allEvents === before.allEvents + 1
        && afterApply.control.switchedReason === REASON_1 && afterApply.control.switchedAt !== before.control.switchedAt,
        `exit ${applied.code} · ${j({ control: afterApply.control, switchOffEvents: [before.switchOffEvents, afterApply.switchOffEvents] })}`);

      ok("ops.off.9 · the cause and the kind are ACCEPTED BY THE REAL SCHEMA — HouseBotControl_offCause_check and HouseBotEvent_kind_check let this write land, which no source scan could tell you",
        afterApply.control.offCause === "MANUAL" && afterApply.allEvents === before.allEvents + 1, j(afterApply.control));

      // ⛔ PLANTED CONTROL · …and the same CHECK REFUSES a cause outside the closed list, inside BEGIN … ROLLBACK,
      // so ops.off.9 is a measured difference and not a constraint nobody ever armed.
      let refused = "";
      await cx.query("BEGIN");
      try {
        await cx.query(`UPDATE "HouseBotControl" SET "offCause" = 'NOT_A_CAUSE' WHERE "id" = 'global'`);
      } catch (e) { refused = String((e as Error).message).slice(0, 120); }
      await cx.query("ROLLBACK");
      const stillManual = (await census()).control.offCause;
      ok("ops.off.9c · CONTROL · the same column REFUSES a cause outside OFF_CAUSES (rolled back, nothing kept) — so the accepted write above proves the constraint, not its absence",
        /offCause_check/.test(refused) && stillManual === "MANUAL", `${j(refused)} · offCause still ${stillManual}`);

      // ── D-OPS-1 · it did not cancel, and it said so ──
      const intentNow = await w.dal.houseBotIntentStore.get(liveIntent.id);
      ok("ops.d-ops-1 · ⛔ THE DECISION, DRIVEN · the OFF wrote its two rows and left every live intent STANDING — the planted intent is still CLAIMED, the live count did not move, and no lock was taken",
        afterApply.live === before.live && intentNow !== null && ["PENDING", "CLAIMED"].includes(intentNow.status),
        j({ liveBefore: before.live, liveAfter: afterApply.live, plantedIntent: intentNow?.status ?? null }));
      ok("ops.d-ops-1p · …and it is NOT SILENT ABOUT IT: the terminal carries the count it did not cancel and the exact statement that cancels them",
        /DOES NOT CANCEL THEM/.test(applied.out) && /UPDATE "HouseBotIntent" SET "status" = 'CANCELLED'/.test(applied.out)
        && new RegExp(`${before.live} live intent\\(s\\) left standing`).test(applied.out),
        applied.out.split("\n").filter((l) => /live intent/.test(l)).slice(0, 3).join(" | "));

      // ── D-OPS-2 · no compliance row, and the screen says why ──
      ok("ops.d-ops-2d · ⛔ THE DECISION, DRIVEN · not one AuditLog row was written by a direct-pg script — the chain is untouched — and the terminal names the SWITCH_OFF event as the record instead",
        afterApply.audits === before.audits && /NO compliance audit row is written/.test(applied.out),
        j({ auditsBefore: before.audits, auditsAfter: afterApply.audits }));

      // ── 3 and 4 · the second run ──
      const again = runOps(OFF_SCRIPT, ["--apply", "--reason", "A9-second-officer-second-time"], { OPS_OFFICER_ID: OFFICER });
      const afterAgain = await census();
      ok("ops.off.3 · a second --apply on an already-OFF desk writes 0 rows, prints ALREADY_OFF verbatim and exits 0 — not 1: being already off is not a failure",
        again.code === 0 && again.out.includes(SWITCH_OFF_COPY.ALREADY_OFF), `exit ${again.code} · ${again.out.split("\n").filter((l) => l.includes("already off")).join(" | ")}`);
      ok("ops.off.4 · …and it appends NO second event and does not move the switch instant — the conditional predicate is what makes the script re-runnable",
        afterAgain.switchOffEvents === afterApply.switchOffEvents && afterAgain.allEvents === afterApply.allEvents
        && afterAgain.control.switchedAt === afterApply.control.switchedAt && afterAgain.control.switchedReason === afterApply.control.switchedReason,
        j({ events: [afterApply.switchOffEvents, afterAgain.switchOffEvents], switchedAt: afterAgain.control.switchedAt }));

      // ── the two refusals ──
      const noUrl = runOps(OFF_SCRIPT, ["--apply"], { DATABASE_URL: "" });
      ok("ops.off.env · an empty DATABASE_URL exits 2 and writes nothing — it never guesses an environment",
        noUrl.code === 2 && /DATABASE_URL is empty/.test(noUrl.out), `exit ${noUrl.code}`);

      // ⛔ PLANTED CONTROL · a database that cannot be reached at all. The one outcome that leaves house bets
      // running must SAY they are running, and must not exit 0.
      const dead = runOps(OFF_SCRIPT, ["--apply"], { DATABASE_URL: "postgresql://postgres:scratch@127.0.0.1:1/postgres" });
      const afterDead = await census();
      ok("ops.off.wf · CONTROL · against a closed port the script prints WRITE_FAILED verbatim, says house bets are STILL RUNNING, names Maintenance mode, and exits NON-ZERO — never an optimistic off",
        dead.code !== 0 && dead.out.includes(SWITCH_OFF_COPY.WRITE_FAILED) && /STILL RUNNING/.test(dead.out)
        && /Maintenance mode/.test(dead.out) && JSON.stringify(afterDead) === JSON.stringify(afterAgain),
        `exit ${dead.code} · ${dead.out.split("\n").filter((l) => /STILL RUNNING/.test(l)).join(" | ")}`);
    } finally {
      await cx.end().catch(() => {});
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §3 · ops:house-bots-status (S3) — the five release figures, and the three drift legs the
// re-release law turns on.
//
// ⛔ THE FIGURES ARE ASSERTED AGAINST NUMBERS THIS SUITE MEASURED ITSELF, never against a literal
// "0". By the time this section runs the world holds bots, marked positions and marked ledger rows,
// and that is BETTER than a clean database: a reader that printed 0 on a populated database would
// pass an "expect 0" assertion and fail the only question worth asking — does it count?
// ═══════════════════════════════════════════════════════════════════════════════════════════

const STATUS_SCRIPT = "scripts/ops-house-bots-status.mts";
/** ⛔ PINNED BYTE FOR BYTE, and the duplication IS the pin: if the script ever prints a NUMBER here
 * instead, this string stops matching. A `wagering: 0` would be a true measurement of a population
 * that does not exist — BonusGrant carries no positionId on this schema. */
const WAGERING_SENTENCE = "wagering: NOT MEASURABLE — wagering is a counter on BonusGrant, which carries no positionId on this schema";

const figure = (out: string, re: RegExp): string | null => { const m = re.exec(out); return m ? m[1] : null; };

if (STORE === "memory") {
  section("§3s · ops:house-bots-status — the SOURCE pins, and the unit run with no database at all");
  await guard("status.src", () => {
    const body = bodyOf(STATUS_SCRIPT);
    ok("ops.status.src · ⛔ the engine figures come from DURABLE rows: the file calls neither houseBotEngineHealth (this process's own state — an ops process would call a healthy engine dead) nor houseEngineHealthFor (which gates on a viewer an ops script does not have), and imports no loadWorld (whose first statement disables the market scheduler)",
      !/houseBotEngineHealth/.test(body) && !/houseEngineHealthFor/.test(body) && !/loadWorld/.test(body),
      j({ health: /houseBotEngineHealth/.test(body), healthFor: /houseEngineHealthFor/.test(body), world: /loadWorld/.test(body) }));
    ok("ops.status.srcp · POSITIVE CONTROL · …and it DOES read the durable rows and fold them — listInstances() and houseEngineBeats() — so the three absences above are a choice of source, not a file that reads nothing",
      /listInstances\s*\(/.test(body) && /houseEngineBeats\s*\(/.test(body) && /houseEngineVerdict\s*\(/.test(body), "listInstances + houseEngineBeats + houseEngineVerdict all called");
    ok("ops.status.src2 · the thresholds are IMPORTED, not typed: no 90000 / 90_000 / 30000 literal anywhere in the file",
      !/\b90[_]?000\b/.test(body) && !/\b30[_]?000\b/.test(body) && /BOOT_GRACE_MS/.test(body) && /ENGINE_STALE_MS/.test(body),
      j({ literals: body.match(/\b\d{2}[_]?000\b/g) ?? [] }));
    ok("ops.status.src3 · it writes NOTHING: no INSERT, no UPDATE, no DELETE anywhere in the file — the one command safe to run mid-incident",
      markerUpdateSites(body).length === 0 && !/\b(?:INSERT\s+INTO|DELETE\s+FROM)\b/i.test(body) && !/\bUPDATE\s+"/i.test(body)
      && switchOnSites(body).length === 0, j({ marker: markerUpdateSites(body), on: switchOnSites(body) }));
  });

  await guard("status.mem", () => {
    // ⛔ ENG-21's "unit on memory store": the same file, no database at all, running to completion.
    const run = runOps(STATUS_SCRIPT, [], { DATABASE_URL: "", USE_PRISMA_DAL: "false" });
    ok("ops.status.mem · the SAME file runs to completion on the memory store with no DATABASE_URL, exits 0, and SAYS which store answered — so a memory green can never be read as a Postgres green",
      run.code === 0 && /store\s+memory/.test(run.out) && /master switch/.test(run.out) && /planner beat/.test(run.out),
      `exit ${run.code} · ${run.out.split("\n").find((l) => /store /.test(l))?.trim() ?? ""}`);
    ok("ops.status.mem2 · …and on that store it REFUSES --drift rather than reporting a clean zero: every leg is a join between two tables, and 'nothing measured' must never read as 'nothing found'",
      (() => { const d = runOps(STATUS_SCRIPT, ["--drift"], { DATABASE_URL: "", USE_PRISMA_DAL: "false" }); return d.code === 2 && /REFUSED on the memory store/.test(d.out) && !/drift total/.test(d.out); })(),
      "exit 2, no drift total printed");
  });
}

if (STORE === "postgres") {
  section("§3 · ops:house-bots-status — DRIVEN against the scratch database, figures and drift legs");
  await guard("status", async () => {
    const C: Any = await import("../../src/lib/house-bot/constants.ts");
    const pgLib: Any = (await import("pg")).default;
    const cx = new pgLib.Client({ connectionString: process.env.DATABASE_URL });
    await cx.connect();
    const count = async (text: string): Promise<number> => Number((await cx.query(text)).rows[0].n);

    try {
      // ⛔ PLANTED CONTROL · an engine boot row and a planner beat, written through the PRODUCT'S OWN
      // writers (`boot()` is what engine.ts calls on a successful boot, `beat()` what the planner calls).
      // Without them figures 4 and 5 would print "never" and their assertions would pass on absence.
      await w.dal.houseBotRuntimeStore.boot(C.RUNTIME_KEY.engine("ops_case"), { engineEnabled: true });
      await w.dal.houseBotRuntimeStore.beat(C.RUNTIME_KEY.plannerBeat);

      const measured = {
        bots: await w.dal.houseBotStore.countLive(),
        markedPositions: await count(`SELECT count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL`),
        markedTxns: await count(`SELECT count(*)::int AS "n" FROM "Transaction" WHERE "houseBotId" IS NOT NULL`),
        enabled: (await w.dal.houseBotControlStore.get()).enabled,
      };
      const run1 = runOps(STATUS_SCRIPT, []);
      ok("ops.status.1 · the five release figures, each equal to a number this suite measured INDEPENDENTLY and each printed with the population it counts — the switch, the roster, the marked rows, the engine's boot instant and the planner beat age",
        run1.code === 0
        && figure(run1.out, /^1\s+master switch\s+(\S+)/m) === (measured.enabled ? "ON" : "OFF")
        && Number(figure(run1.out, /^2\s+bots\s+(\d+)/m)) === measured.bots
        && Number(figure(run1.out, /^3\s+marked rows\s+Position (\d+)/m)) === measured.markedPositions
        && Number(figure(run1.out, /^3\s+marked rows\s+Position \d+ · Transaction (\d+)/m)) === measured.markedTxns
        && /^4\s+engine\s+an engine booted here at \d{4}-/m.test(run1.out)
        && /^5\s+planner beat\s+\d+ s ago/m.test(run1.out),
        `exit ${run1.code} · measured ${j(measured)} · printed ${j({ switch: figure(run1.out, /^1\s+master switch\s+(\S+)/m), bots: figure(run1.out, /^2\s+bots\s+(\d+)/m), pos: figure(run1.out, /Position (\d+)/), txn: figure(run1.out, /Transaction (\d+)/) })}`);

      ok("ops.status.1p · POSITIVE CONTROL · those figures are NOT ZERO on this database — a reader that printed 0 everywhere would have satisfied a 'clean world' assertion while counting nothing",
        measured.bots > 0 && measured.markedPositions > 0 && measured.markedTxns > 0, j(measured));

      ok("ops.status.4 · the switch is OFF and the beat age is STILL printed — houseEngineVerdict returns null for any state but ON, which is the shipped state, so a script that leaned on the verdict would print nothing at all about liveness",
        measured.enabled === false && /^5\s+planner beat\s+\d+ s ago/m.test(run1.out) && /no verdict/.test(run1.out),
        run1.out.split("\n").filter((l) => /verdict|planner beat/.test(l)).map((l) => l.trim()).join(" | "));

      // ── ops.status.3 · the roster figure is countLive, not an ACTIVE-only count ──
      const paused = await w.bot();
      await w.dal.houseBotStore.setStatus(paused.botId, { from: ["ACTIVE"], to: "PAUSED", pauseReason: "MANUAL", pausedFromStatus: "ACTIVE" });
      const run2 = runOps(STATUS_SCRIPT, []);
      ok("ops.status.3 · a PAUSED bot RAISES the roster figure by one and the label says non-REMOVED — the population is every designation that has not been removed, which is a different number from the engine's ACTIVE-only count on the same line",
        Number(figure(run2.out, /^2\s+bots\s+(\d+)/m)) === measured.bots + 1 && /population: non-REMOVED/.test(run2.out)
        && (await w.dal.houseBotStore.get(paused.botId)).status === "PAUSED",
        `${measured.bots} → ${figure(run2.out, /^2\s+bots\s+(\d+)/m)}`);

      // ── ops.status.2 · the marked-row figure is UNBOUNDED in time ──
      await cx.query(`UPDATE "Position" SET "placedAt" = "placedAt" - interval '48 hours' WHERE "houseBotId" IS NOT NULL`);
      const run3 = runOps(STATUS_SCRIPT, []);
      ok("ops.status.2 · ⛔ every marked position pushed 48 HOURS into the past is STILL counted — the figure is all-time, not the seam's 24-hour rolling window, which would have printed 0 on a database holding older marked rows",
        Number(figure(run3.out, /^3\s+marked rows\s+Position (\d+)/m)) === measured.markedPositions && /ALL TIME/.test(run3.out),
        `${measured.markedPositions} marked positions, all now 48 h old, still counted`);

      // ── the drift legs ──
      const driftRun = (args: string[]) => runOps(STATUS_SCRIPT, ["--drift", ...args]);
      const base = driftRun(["--since", "30"]);
      const baseTotal = Number(figure(base.out, /drift total\s+(\d+)/) ?? "-1");
      ok("ops.drift.0 · the baseline is MEASURED and printed before anything is planted — every later leg is a delta over this number, never over an assumed zero",
        baseTotal >= 0 && /bound\s+30 day\(s\)/.test(base.out), `drift total ${baseTotal} · exit ${base.code}`);

      const marked = (await cx.query(`SELECT "id", "marketId", "houseBotId" FROM "Position" WHERE "houseBotId" IS NOT NULL ORDER BY "placedAt" DESC LIMIT 1`)).rows[0];
      const unmarked = (await cx.query(`SELECT "id", "marketId" FROM "Position" WHERE "houseBotId" IS NULL ORDER BY "placedAt" DESC LIMIT 1`)).rows[0];
      const holder = (await cx.query(`SELECT "userId" FROM "Position" WHERE "id" = $1`, [marked.id])).rows[0].userId;
      const player = (await cx.query(`SELECT "userId" FROM "Position" WHERE "id" = $1`, [unmarked.id])).rows[0].userId;
      const txn = (id: string, positionId: string, userId: string, type: string, houseBotId: string | null): Any => ({
        id, walletId: `wal_${userId}`, userId, type, status: "CONFIRMED", amount: 1_234, fee: 0, taxWithheld: 0, balanceAfter: null,
        currency: "TZS", provider: "INTERNAL", providerRef: null, msisdn: null, description: null, positionId, amlReason: null,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: null, idempotencyKey: null, houseBotId,
      });
      // ⛔ EVERY PLANT GOES THROUGH `db.txn.create` — the product's own writer, the one old pre-merge code
      // used. A row written by hand in SQL would prove the query matches SQL I wrote, not a row the
      // platform can produce. The UNMARKED ones are exactly what a rollback window leaves behind.
      await w.db.txn.create(txn("txn_drift_a", marked.id, holder, "BET_PAYOUT", null));      // leg (a)
      await w.db.txn.create(txn("txn_drift_b", marked.id, holder, "CASHOUT", marked.houseBotId)); // leg (b) only
      await w.db.txn.create(txn("txn_drift_c", marked.id, holder, "AGENT_COMMISSION", marked.houseBotId)); // leg (c) only
      // ⛔ PLANTED CONTROLS · the same three shapes on an UNMARKED position. None may be reported.
      await w.db.txn.create(txn("txn_ctl_a", unmarked.id, player, "BET_PAYOUT", null));
      await w.db.txn.create(txn("txn_ctl_b", unmarked.id, player, "CASHOUT", null));
      await w.db.txn.create(txn("txn_ctl_c", unmarked.id, player, "AGENT_COMMISSION", null));
      await w.db.referralReward.create({
        id: "rrw_drift_c2", referrerUserId: player, recruitUserId: holder, type: "COMMISSION", label: "Commission",
        amountTzs: 500, grossAmountTzs: 500, taxWithheldTzs: 0, status: "PAID", recipientUserId: player, note: null,
        programme: "AGENT", rateApplied: 5, marketId: marked.marketId,
        sourceRef: `referral:commission:${marked.marketId}:${marked.id}`, reversedAt: null, reversedReason: null,
        createdAt: new Date().toISOString(),
      });

      const after = driftRun(["--since", "30"]);
      const legA = Number(figure(after.out, /\(a\) unmarked ledger rows on MARKED positions … (\d+)/) ?? "-1");
      const legB = Number(figure(after.out, /\(b\) CASHOUT rows on MARKED positions … (\d+)/) ?? "-1");
      const legC = Number(figure(after.out, /\(c\) AGENT_COMMISSION on MARKED positions … (\d+) ledger row/) ?? "-1");
      const legC2 = Number(figure(after.out, /(\d+) referral reward row/) ?? "-1");

      ok("ops.drift.a · leg (a) reports EXACTLY the planted unmarked ledger row of a marked position, by id — and the CONTROL rows on an unmarked position are not among them, which is what proves the join is on MARKED positions rather than on any position at all",
        legA === 1 && /txn_drift_a/.test(after.out) && !/txn_ctl_a/.test(after.out), `leg (a) = ${legA}`);
      ok("ops.drift.b · leg (b) reports the CASHOUT on the marked position and NOT the identical CASHOUT on an unmarked one",
        legB === 1 && /txn_drift_b/.test(after.out) && !/txn_ctl_b/.test(after.out), `leg (b) = ${legB}`);
      ok("ops.drift.c · leg (c) reports BOTH halves it can measure — the AGENT_COMMISSION ledger row and the ReferralReward whose deterministic sourceRef rebuilds to this marked position — and neither control on the unmarked position",
        legC === 1 && legC2 === 1 && /txn_drift_c/.test(after.out) && /rrw_drift_c2/.test(after.out) && !/txn_ctl_c/.test(after.out),
        `ledger ${legC} · rewards ${legC2}`);
      ok("ops.drift.cw · ⛔ AND THE HALF IT CANNOT MEASURE SAYS SO, BYTE FOR BYTE — wagering is a counter on BonusGrant, which carries no positionId on this schema, so a `wagering: 0` here would be a true measurement of a population that does not exist",
        after.out.includes(WAGERING_SENTENCE) && !/wagering:\s*\d/.test(after.out), "the pinned sentence is present and no number follows `wagering:`");
      ok("ops.drift.exit · a drift run that FINDS something exits non-zero, and the baseline run that found nothing exited 0 — the re-release law is a gate, not a report",
        after.code === 1 && base.code === (baseTotal === 0 ? 0 : 1) && Number(figure(after.out, /drift total\s+(\d+)/)) === baseTotal + 4,
        `base ${baseTotal} exit ${base.code} · after exit ${after.code} total ${figure(after.out, /drift total\s+(\d+)/)}`);

      // ── the bound, and the refusal ──
      // ⛔ PLANTED CONTROL · the drifted row is on a position placed 48 h ago (every marked position was
      // pushed back above). A ONE-DAY window must NOT see it; a thirty-day window must. Without this pair
      // the `--since` bound could be decoration.
      const narrow = driftRun(["--since", "1"]);
      ok("ops.drift.bound · CONTROL · the same database read through a ONE-DAY window reports none of those rows, and the thirty-day window reports all four — so the bound is doing work, and the window it used is printed either way",
        Number(figure(narrow.out, /\(a\) unmarked ledger rows on MARKED positions … (\d+)/)) === 0
        && /bound\s+1 day\(s\)/.test(narrow.out) && /bound\s+30 day\(s\)/.test(after.out) && legA === 1,
        `1-day leg (a) = ${figure(narrow.out, /\(a\) unmarked ledger rows on MARKED positions … (\d+)/)} · 30-day leg (a) = ${legA}`);
      ok("ops.drift.plan · leg (a) prints the EXPLAIN plan of the statement it actually ran — a bounded query that silently fell back to a sequential scan is a different command from the one the header argues for, and only the plan can tell you which ran",
        /plan:/.test(after.out) && /(Scan|Loop|Join)/.test(after.out.split("plan:")[1] ?? ""),
        (after.out.split("plan:")[1] ?? "").split("\n").slice(1, 3).map((l) => l.trim()).join(" | "));
      const unbounded = driftRun(["--since", "0"]);
      ok("ops.drift.refuse · an UNBOUNDED run is REFUSED (exit 2) with the reason — Transaction has no index on positionId and its only marker index is the wrong polarity — and it prints no drift total, so a refusal can never be read as a clean result",
        unbounded.code === 2 && /REFUSED/.test(unbounded.out) && !/drift total/.test(unbounded.out), `exit ${unbounded.code}`);
    } finally {
      await cx.end().catch(() => {});
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §4 · ops:house-bots-remark (S3) — ⛔ THE ONLY OPS SCRIPT THAT WRITES TO A MONEY TABLE.
//
// Everything here exists to answer one question: can this script do harm? It must not be able to
// write a non-NULL marker, touch a row whose marker is already set, widen to another table or
// column, or write anything at all without --apply — and it must report exactly what it would do
// before it does it. ⛔ DRIVEN AGAINST POSTGRES, not source-scanned: a statement that is correct in
// the file and wrong against the schema is the failure a scan cannot see.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const REMARK_SCRIPT = "scripts/ops-house-bots-remark.mts";

if (STORE === "memory") {
  section("§4s · ops:house-bots-remark — the pinned statement, and the shapes it must refuse");
  await guard("remark.src", () => {
    const body = bodyOf(REMARK_SCRIPT);
    const pin = remarkPin(body, PLANTED.remarkPinned);
    ok("ops.remark.10 · ⛔ THE ONE STATEMENT, BYTE FOR BYTE: \"Transaction\" the only UPDATE target, the value taken from the JOINED Position, `p.\"houseBotId\" IS NOT NULL` so a marker is never overwritten with NULL, and `t.\"houseBotId\" IS NULL` so it can only ever NULL-FILL",
      pin.exact && pin.updates.length === 1 && !pin.positionTarget && !pin.setsPositionId && !pin.interpolatedTable,
      j({ exact: pin.exact, updates: pin.updates, positionTarget: pin.positionTarget, setsPositionId: pin.setsPositionId, interpolated: pin.interpolatedTable }));
    ok("ops.remark.10b · …and nothing appended to it can WIDEN it: the only thing added to the pinned core is an AND-conjunction, and the file contains no disjunction at all — a widening would have to be written as an OR or by editing the pinned string, and both are reported",
      /const tail = ` AND /.test(body) && !/\bOR\b/.test(body), `tail is a conjunction · OR present: ${/\bOR\b/.test(body)}`);
    ok("ops.remark.10c · the file names \"Position\" only in a FROM and never as an UPDATE target, and contains no `SET \"positionId\"` anywhere",
      !/UPDATE\s+"Position"/.test(body) && !/"Position"\s+\w*\s*SET\b/.test(body) && !pin.setsPositionId, "no Position write");
    ok("ops.remark.5s · ⛔ THE RIGHT-OBJECT RULE IN SOURCE · no command-line value can reach the SET clause: `--bot` appears only in a WHERE conjunction, and the only assignment in the file is `p.\"houseBotId\"`",
      /"houseBotId" = p\."houseBotId"/.test(body) && !/SET "houseBotId" = \$/.test(body) && /AND p\."houseBotId" = \$1::text/.test(body),
      "the value is the join's; --bot filters only");
    ok("ops.remark.g5s · the master-switch read is a READ: the file contains no write to \"enabled\" in either direction, and no way to turn house bets on",
      switchOnSites(body).length === 0 && onFlagSites(body).length === 0 && !/"enabled"\s*=\s*(?:true|false)/.test(body),
      j({ on: switchOnSites(body), flags: onFlagSites(body) }));

    const red = redCases().filter((c) => c.label.startsWith("ops.remark.10"));
    ok("ops.remark.10r · CONTROL · every mutation of that statement a real edit could make is caught by the pin — the NULL predicate deleted (re-marking), the value taken from a parameter (the wrong object), the target swapped to \"Position\" (the corruption), a SET of positionId, and an interpolated table name",
      red.length >= 6 && red.every((c) => c.caught), j(red.map((c) => ({ l: c.label.slice(15, 60), caught: c.caught }))));

    ok("ops.remark.8 · ⛔ the scripts/ marker gate now admits EXACTLY TWO files and names both — the old-build control that rolls back, and this NULL-filling repair — so a third marker writer, or a stale exemption, is reported on its own assertion",
      MARKER_UPDATE_EXEMPT.length === 2 && MARKER_UPDATE_EXEMPT.some((e) => e.file === REMARK_SCRIPT)
      && MARKER_UPDATE_EXEMPT.every((e) => e.why.length > 80), j(MARKER_UPDATE_EXEMPT.map((e) => e.file)));
  });
}

if (STORE === "postgres") {
  section("§4 · ops:house-bots-remark — DRIVEN: it cannot re-mark, cannot widen, and writes nothing without --apply");
  await guard("remark", async () => {
    const pgLib: Any = (await import("pg")).default;
    const cx = new pgLib.Client({ connectionString: process.env.DATABASE_URL });
    await cx.connect();
    const rows = async (text: string, a: unknown[] = []): Promise<Any[]> => (await cx.query(text, a)).rows;
    const one = async (text: string): Promise<Any> => (await rows(text))[0];
    /** The whole ledger's marker and position columns — the only way to prove nothing ELSE moved. */
    const ledger = async (): Promise<string> => JSON.stringify(await rows(`SELECT "id", "positionId", "houseBotId" FROM "Transaction" ORDER BY "id"`));
    const nullOnMarked = async (): Promise<number> => Number((await one(
      `SELECT count(*)::int AS "n" FROM "Transaction" t JOIN "Position" p ON t."positionId" = p."id" WHERE p."houseBotId" IS NOT NULL AND t."houseBotId" IS NULL`)).n);

    try {
      // ── the fixture: two marked positions held by DIFFERENT bots, each with a NULL-marker ledger row ──
      const two = await rows(`SELECT DISTINCT ON ("houseBotId") "id", "userId", "houseBotId" FROM "Position" WHERE "houseBotId" IS NOT NULL ORDER BY "houseBotId", "placedAt" LIMIT 2`);
      const txn = (id: string, positionId: string, userId: string, houseBotId: string | null): Any => ({
        id, walletId: `wal_${userId}`, userId, type: "BET_REFUND", status: "CONFIRMED", amount: 777, fee: 0, taxWithheld: 0,
        balanceAfter: null, currency: "TZS", provider: "INTERNAL", providerRef: null, msisdn: null, description: null,
        positionId, amlReason: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        completedAt: null, idempotencyKey: null, houseBotId,
      });
      // ⛔ TWO BOTS, TWO ROWS. Without this pair "each row got A bot id" would pass on a fixture where
      // there is only one bot id to get — which is how a marker copied from the wrong position stays silent.
      await w.db.txn.create(txn("txn_remark_1", two[0].id, two[0].userId, null));
      await w.db.txn.create(txn("txn_remark_2", two[1].id, two[1].userId, null));
      // ⛔ PLANTED CONTROL · a marked position whose ledger row is ALREADY marked. It must not be touched:
      // that is `t."houseBotId" IS NULL` doing the work, and it is what makes a second run a no-op.
      await w.db.txn.create(txn("txn_remark_kept", two[0].id, two[0].userId, "hb_not_the_join_value"));

      const before = await ledger();
      const target = await nullOnMarked();
      ok("ops.remark.0f · fixture · two marked positions held by DIFFERENT bots each carry a NULL-marker ledger row, a third row on one of them is ALREADY marked, and the whole ledger's marker and position columns are photographed",
        two.length === 2 && two[0].houseBotId !== two[1].houseBotId && target >= 2, j({ bots: two.map((r: Any) => r.houseBotId), nullOnMarked: target }));

      // ── 1 · the dry run writes nothing, and says exactly what it would do ──
      const dry = runOps(REMARK_SCRIPT, ["--since", "30"]);
      ok("ops.remark.1 · ⛔ THE DRY RUN WRITES 0 ROWS — every marker and every positionId in the ledger is byte-identical afterwards — and it REPORTS EXACTLY WHAT IT WOULD DO first: the count, each row's id, and the value it would copy from that row's own position",
        dry.code === 0 && (await ledger()) === before && new RegExp(`${target} ledger row\\(s\\) would be NULL-filled`).test(dry.out)
        && /txn_remark_1/.test(dry.out) && /NOTHING WRITTEN/.test(dry.out) && /→\s+hb_/.test(dry.out),
        `exit ${dry.code} · ${dry.out.split("\n").filter((l) => /would be NULL-filled/.test(l)).join(" | ")}`);

      // ── ops.remark.9 · refused while the switch is ON ──
      await w.dal.houseBotControlStore.switchOn({ byId: OFFICER, reason: "ops §4 control" });
      const whileOn = runOps(REMARK_SCRIPT, ["--apply", "--since", "30"]);
      ok("ops.remark.9 · ⛔ --apply is REFUSED while the master switch is ON, with a sentence naming the switch, and writes 0 rows — this repairs a ledger the live seam is still writing to",
        whileOn.code === 2 && /master switch is ON/.test(whileOn.out) && (await ledger()) === before,
        `exit ${whileOn.code} · ${whileOn.out.split("\n").filter((l) => /REFUSED/.test(l)).join(" | ")}`);
      await w.switchOff();

      // ── the ceiling ──
      const capped = runOps(REMARK_SCRIPT, ["--apply", "--since", "30", "--max", "1"]);
      ok("ops.remark.max · a run whose population exceeds --max is REFUSED before any transaction opens, and writes 0 rows — the ceiling is a stated number, not a hope",
        capped.code === 2 && /exceeds the --max ceiling/.test(capped.out) && (await ledger()) === before, `exit ${capped.code}`);

      // ── 2 · --apply ──
      const applied = runOps(REMARK_SCRIPT, ["--apply", "--since", "30"]);
      const after = await rows(`SELECT t."id", t."houseBotId", t."positionId", p."houseBotId" AS "positionMarker" FROM "Transaction" t LEFT JOIN "Position" p ON p."id" = t."positionId" WHERE t."id" IN ('txn_remark_1','txn_remark_2','txn_remark_kept','txn_ctl_a') ORDER BY t."id"`);
      const byId = new Map<string, Any>(after.map((r: Any) => [r.id, r]));
      ok("ops.remark.2 · --apply fills EXACTLY the planted NULL markers of marked positions, and the RETURNING count equals the count taken inside the same transaction — the script says both numbers",
        applied.code === 0 && new RegExp(`${target} ledger row\\(s\\) NULL-filled`).test(applied.out)
        && byId.get("txn_remark_1").houseBotId === two[0].houseBotId && byId.get("txn_remark_2").houseBotId === two[1].houseBotId,
        `exit ${applied.code} · ${applied.out.split("\n").filter((l) => /NULL-filled/.test(l)).join(" | ")}`);

      ok("ops.remark.5 · ⛔ THE RIGHT-OBJECT RULE, DRIVEN · with two marked positions held by DIFFERENT bots, each ledger row received ITS OWN position's bot id and never the other's — the value came from the JOIN, which no flag can reach",
        byId.get("txn_remark_1").houseBotId === byId.get("txn_remark_1").positionMarker
        && byId.get("txn_remark_2").houseBotId === byId.get("txn_remark_2").positionMarker
        && byId.get("txn_remark_1").houseBotId !== byId.get("txn_remark_2").houseBotId,
        j(after.map((r: Any) => ({ id: r.id, wrote: r.houseBotId, position: r.positionMarker }))));

      ok("ops.remark.3c · ⛔ CONTROL · the row whose marker was ALREADY set was NOT touched — it still carries the value it had, not the join's — which is `t.\"houseBotId\" IS NULL` doing the work rather than being written down",
        byId.get("txn_remark_kept").houseBotId === "hb_not_the_join_value"
        && byId.get("txn_remark_kept").positionMarker !== "hb_not_the_join_value", j(byId.get("txn_remark_kept")));

      ok("ops.remark.4 · CONTROL · a ledger row of an UNMARKED position still carries NULL — `p.\"houseBotId\" IS NOT NULL` means an unmarked position can never write NULL over anything, and never drags its own rows in",
        byId.get("txn_ctl_a").houseBotId === null && byId.get("txn_ctl_a").positionMarker === null, j(byId.get("txn_ctl_a")));

      const idsBefore = JSON.parse(before) as Array<{ id: string; positionId: string | null }>;
      const idsAfter = (await rows(`SELECT "id", "positionId" FROM "Transaction" ORDER BY "id"`)) as Array<{ id: string; positionId: string | null }>;
      ok("ops.remark.6 · ⛔ NOT ONE positionId CHANGED — the whole column is compared row by row before and after, because a row an update could POSITION becomes permanently unmarkable and would vanish from the house book's returned money",
        JSON.stringify(idsBefore.map((r) => [r.id, r.positionId])) === JSON.stringify(idsAfter.map((r) => [r.id, r.positionId])),
        `${idsAfter.length} ledger rows compared`);

      // ── 3 · a second run ──
      const ledgerAfterApply = await ledger();
      const again = runOps(REMARK_SCRIPT, ["--apply", "--since", "30"]);
      ok("ops.remark.3 · a second --apply changes 0 rows and exits 0 — the NULL predicate is what makes this script re-runnable, and it says 'nothing to do' rather than pretending to work",
        again.code === 0 && /Nothing to do/.test(again.out) && (await ledger()) === ledgerAfterApply, `exit ${again.code}`);

      // ── 4 · and the two scripts are asserted TOGETHER, which is 04's own test ──
      const drift = runOps(STATUS_SCRIPT, ["--drift", "--since", "30"]);
      ok("ops.remark.7 · ⛔ drift leg (a) reports 0 IMMEDIATELY AFTERWARDS — the repair and the reader are asserted together, which is 04's own test, so neither can be right only about itself",
        Number(figure(drift.out, /\(a\) unmarked ledger rows on MARKED positions … (\d+)/)) === 0 && (await nullOnMarked()) === 0,
        `leg (a) = ${figure(drift.out, /\(a\) unmarked ledger rows on MARKED positions … (\d+)/)} · independent count ${await nullOnMarked()}`);

      ok("ops.remark.env · an empty DATABASE_URL exits 2, and an unbounded --since 0 exits 2 with the index reason — a repair that cannot name its population does not run",
        runOps(REMARK_SCRIPT, ["--apply"], { DATABASE_URL: "" }).code === 2
        && runOps(REMARK_SCRIPT, ["--apply", "--since", "0"]).code === 2, "both refusals exit 2");
    } finally {
      await cx.end().catch(() => {});
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §6 · ops:preflight-house-bot-migrations (A23 / ENG-08) — the read-only GO/NO-GO REL-0 names.
//
// ⛔ IT IS PHYSICALLY BEFORE §5 THOUGH IT IS NUMBERED AFTER IT, and that is not tidiness: §5 removes
// every account and walks the control row to a state nothing can undo, so nothing may follow it. The
// numbering follows the build order (this is Commit 8's first step); the PLACEMENT follows the only
// constraint the fixtures allow.
//
// ⭐ THE GO PATH IS ASSERTED FIRST AMONG THE VERDICTS. Every NO-GO case below would pass on a script
// that can only ever say no, and a preflight that always refuses is not a safe preflight — it is one
// an officer learns to ignore. So `pre.2` proves GO is reachable on a real migrated database, and each
// NO-GO is then a measured DIFFERENCE from that same database, one fault at a time, with the fault
// REVERSED afterwards where it can be (the invalid index is made valid again and the GO returns).
//
// ⛔ THIS SECTION CREATES AND DROPS ONE DATABASE OF ITS OWN, named after this process. It needs a
// database BEFORE `migrate deploy` — which the suite's own database, migrated before the child starts,
// can never be — and it must never touch another lane's.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const PRE_SCRIPT = "scripts/ops-preflight-house-bot-migrations.mts";
const HOUSE_TABLE_NAMES = ["HouseBot", "HouseBotControl", "HouseBotRuntime", "HouseBotAlertOnce", "HouseBotEvent", "HouseBotIntent", "HouseBotTarget", "HouseBotPress"] as const;

if (STORE === "memory") {
  section("§6s · ops:preflight-house-bot-migrations — the SOURCE pins: nothing typed that can be derived");
  await guard("pre.src", () => {
    const body = bodyOf(PRE_SCRIPT);
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const pop = opsPopulation(pkg.scripts, scriptFiles());

    ok("pre.pop · POSITIVE CONTROL · the preflight is INSIDE the derived ops population and has a package key — every SOURCE pin below is over a file the §0 gate also scans, not a file nobody looks at",
      pop.files.includes(PRE_SCRIPT) && pkg.scripts["ops:preflight-house-bot-migrations"] === `tsx ${PRE_SCRIPT}`,
      j({ inPopulation: pop.files.includes(PRE_SCRIPT), key: pkg.scripts["ops:preflight-house-bot-migrations"] ?? null }));

    ok("pre.6 · SOURCE · the five index names are READ from the markers migration, never typed — the plan carried 'the 4 indexes' for weeks, and a preflight that typed them would report GO on a database one index short",
      typedIndexNames(body).length === 0 && derivesIndexNames(body) === true, j({ typed: typedIndexNames(body), derived: derivesIndexNames(body) }));

    ok("pre.5 · SOURCE · index health is read through pg_index.indisvalid, never pg_indexes.indexname — a failed CONCURRENTLY build leaves an INVALID index under the SAME name and IF NOT EXISTS keeps it",
      indexValidityRead(body).indisvalid === true && indexValidityRead(body).byNameOnly === false, j(indexValidityRead(body)));

    ok("pre.7 · SOURCE · the eight tables and seven marker columns are IMPORTED from schema-ready.ts — the module the engine's own gate and /api/health read — and no house table name is typed anywhere in the file",
      typedTableLiterals(body, HOUSE_TABLE_NAMES).length === 0 && /HOUSE_SCHEMA_TABLES/.test(body) && /HOUSE_SCHEMA_COLUMNS/.test(body),
      j({ typed: typedTableLiterals(body, HOUSE_TABLE_NAMES) }));

    ok("pre.tz · SOURCE · the timezone list is IMPORTED from the module that ENFORCES it (UTC_ZONES), and the line is a VERDICT: the failing branch pushes a problem, it does not print and move on",
      /UTC_ZONES/.test(body) && /zoneOk/.test(body) && /!zoneOk/.test(body) && /problems\.push/.test(body),
      j({ utcZones: /UTC_ZONES/.test(body), verdict: /!zoneOk/.test(body) }));

    ok("pre.8 · SOURCE · the connection is ai-cycles' isLocal split, so it can be rehearsed on a scratch cluster — no hardcoded proxy host, and ssl is decided BY HOST rather than forced",
      hardcodedHostSites(body).length === 0 && sslByHost(body).byHost === true,
      j({ hosts: hardcodedHostSites(body), ssl: sslByHost(body) }));

    ok("pre.ro · SOURCE · it writes NOTHING and starts nothing: no INSERT/UPDATE/DELETE, no advisory lock, no audit row, no startHouseBotEngine — the one command that is safe to run at any moment, mid-incident included",
      markerUpdateSites(body).length === 0 && !/\b(?:INSERT\s+INTO|DELETE\s+FROM)\b/i.test(body) && !/\bUPDATE\s+"/i.test(body)
      && advisoryLockSites(body).length === 0 && auditWriteSites(body).length === 0 && !/startHouseBotEngine\s*\(/.test(body)
      && switchOnSites(body).length === 0,
      j({ marker: markerUpdateSites(body), lock: advisoryLockSites(body), audit: auditWriteSites(body), engine: /startHouseBotEngine\s*\(/.test(body) }));

    ok("pre.ro.p · POSITIVE CONTROL · …and it DOES read: the file really issues queries and really opens the migration on disk, so the five absences above are a file that measures, not a file that does nothing",
      /c\.query\s*\(/.test(body) && /readFileSync\s*\(/.test(body) && /to_regclass/.test(body), "queries + a file read + catalogue probes");
  });
}

if (STORE === "postgres") {
  section("§6 · ops:preflight-house-bot-migrations — DRIVEN: both verdicts, one fault at a time");
  await guard("pre", async () => {
    const pgLib: Any = (await import("pg")).default;
    const RAW = process.env.DATABASE_URL ?? "";
    const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
    // ⛔ ITS OWN DATABASE, NAMED AFTER THIS PROCESS. A parallel lane is using this cluster: nothing here
    // drops a database it did not create, and nothing resets the cluster.
    const DB = `hb_ops_pre_${process.pid}`;
    const url = `${BASE}/${DB}?connect_timeout=30`;
    const withAdmin = async (fn: (a: Any) => Promise<void>): Promise<void> => {
      const a = new pgLib.Client({ connectionString: `${BASE}/postgres` });
      await a.connect();
      try { await fn(a); } finally { await a.end().catch(() => {}); }
    };
    const onDb = async (fn: (c: Any) => Promise<void>): Promise<void> => {
      const c2 = new pgLib.Client({ connectionString: url });
      await c2.connect();
      try { await fn(c2); } finally { await c2.end().catch(() => {}); }
    };
    const run = () => runOps(PRE_SCRIPT, [], { DATABASE_URL: url });

    await withAdmin(async (a) => {
      await a.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
      await a.query(`CREATE DATABASE "${DB}"`);
      // ⛔ SET EXPLICITLY, both here and in the Dar es Salaam case below. A scratch cluster takes its
      // zone from Windows, so "the default" would prove nothing about either verdict.
      await a.query(`ALTER DATABASE "${DB}" SET timezone TO 'UTC'`);
    });

    try {
      // ── pre.1 · before migrate deploy ──────────────────────────────────────────────────────
      const before = run();
      ok("pre.1 · on a database BEFORE migrate deploy it says NO-GO and NAMES what is missing — all 8 tables, all 7 marker columns, and the absent migration history — and exits 1",
        before.code === 1 && /NO-GO/.test(before.out) && /missing house tables:/.test(before.out) && /missing marker columns:/.test(before.out)
        && /never been migrated/.test(before.out) && /0\/8 present/.test(before.out),
        `exit ${before.code}`);

      const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], {
        cwd: REPO_ROOT, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8",
        shell: process.platform === "win32", timeout: 10 * 60_000,
      });
      ok("pre.migrate · prisma migrate deploy applies every migration to that database", mig.status === 0, (mig.stderr ?? "").split("\n").slice(-2).join(" "));

      // ── pre.2 · ⭐ THE GO PATH IS REACHABLE ────────────────────────────────────────────────
      const after = run();
      ok("pre.2 · ⭐ AFTER migrate deploy on the SAME database it says GO and exits 0 — without this every NO-GO below would pass on a script that can only ever say no",
        after.code === 0 && /✅ GO/.test(after.out) && /8\/8 present/.test(after.out) && /7\/7 present/.test(after.out),
        `exit ${after.code}`);

      // The five names, taken from the script's OWN derivation rather than typed here a second time.
      const named = /indexes named by that file … (\d+): ([^\n]+)/.exec(after.out);
      const idxNames = named ? named[2].split(",").map((s) => s.trim()).filter(Boolean) : [];
      ok("pre.6r · the derivation really produced FIVE names at run time, read off the markers migration — pre.6 pins that they are not typed; this pins that the reading works",
        Number(named?.[1] ?? 0) === 5 && idxNames.length === 5, j(idxNames));
      if (idxNames.length !== 5) return;
      const victim = idxNames[0];

      // ── control · an EXTRA index changes nothing ───────────────────────────────────────────
      await onDb(async (c2) => { await c2.query(`CREATE INDEX IF NOT EXISTS "ops_lane_extra_idx" ON "Position" ("id")`); });
      const extra = run();
      ok("pre.extra · CONTROL · an index on \"Position\" that is NOT one of the five does not change the verdict — the check is scoped to the migration's own five, not to 'any index'",
        extra.code === 0 && /✅ GO/.test(extra.out) && !/ops_lane_extra_idx/.test(extra.out), `exit ${extra.code}`);

      // ── pre.5 · present, but INVALID ───────────────────────────────────────────────────────
      await onDb(async (c2) => { await c2.query(`UPDATE pg_index SET indisvalid = false WHERE indexrelid = '"${victim}"'::regclass`); });
      const invalid = run();
      ok(`pre.5 · an index that EXISTS but is INVALID is a NO-GO that names it — the case a by-name check cannot see, and the one a failed CONCURRENTLY build really leaves behind (${victim})`,
        invalid.code === 1 && /NO-GO/.test(invalid.out) && new RegExp(`INVALID.*${victim}|${victim}.*INVALID`, "s").test(invalid.out)
        && /DROP INDEX CONCURRENTLY/.test(invalid.out), `exit ${invalid.code}`);
      await onDb(async (c2) => { await c2.query(`UPDATE pg_index SET indisvalid = true WHERE indexrelid = '"${victim}"'::regclass`); });
      const revalid = run();
      ok("pre.5b · CONTROL · making that same index valid again brings the GO back — so pre.5's NO-GO is attributable to indisvalid and to nothing else that happened on the way",
        revalid.code === 0 && /✅ GO/.test(revalid.out), `exit ${revalid.code}`);

      // ── pre.3 · the timezone VERDICT ───────────────────────────────────────────────────────
      await withAdmin(async (a) => { await a.query(`ALTER DATABASE "${DB}" SET timezone TO 'Africa/Dar_es_Salaam'`); });
      const eat = run();
      ok("pre.3 · on a database whose timezone is Africa/Dar_es_Salaam it is a NO-GO — both migrations would apply CLEANLY and the engine would then refuse to start on every replica, in silence. A line that only PRINTED the zone would have said GO here",
        eat.code === 1 && /NOT UTC/.test(eat.out) && /Africa\/Dar_es_Salaam/.test(eat.out) && /engine would then refuse to start/.test(eat.out), `exit ${eat.code}`);
      await withAdmin(async (a) => { await a.query(`ALTER DATABASE "${DB}" SET timezone TO 'UTC'`); });

      // ── pre.4 · one of the five dropped ────────────────────────────────────────────────────
      await onDb(async (c2) => { await c2.query(`DROP INDEX "${victim}"`); });
      const dropped = run();
      ok(`pre.4 · with one of the five indexes DROPPED it is a NO-GO naming that index (${victim}) — and the timezone is UTC again, so this verdict is the index and nothing else`,
        dropped.code === 1 && new RegExp(victim).test(dropped.out) && /indexes are absent/.test(dropped.out) && !/NOT UTC/.test(dropped.out), `exit ${dropped.code}`);

      // ── pre.9 · the counts are LIVE, measured against this suite's own database ────────────
      // ⛔ THE COUNTER IS PROVED BY A DIFFERENCE, not by a zero. The empty preflight database printed
      // 0 rows; the suite's own database has been staked in by §1-§4, and the SAME code path must
      // print that number — taken here independently, in the same breath.
      let posN = -1, txnN = -1, worldZone = "";
      const world = new pgLib.Client({ connectionString: RAW });
      await world.connect();
      try {
        posN = Number((await world.query(`SELECT count(*)::bigint AS n FROM "Position"`)).rows[0].n);
        txnN = Number((await world.query(`SELECT count(*)::bigint AS n FROM "Transaction"`)).rows[0].n);
        worldZone = (await world.query(`SELECT current_setting('TimeZone') AS "zone"`)).rows[0].zone as string;
      } finally { await world.end().catch(() => {}); }
      const onWorld = runOps(PRE_SCRIPT, [], { DATABASE_URL: RAW });
      const printedPos = /"Position"[^\n]*?(\d+) rows/.exec(onWorld.out);
      const printedTxn = /"Transaction"[^\n]*?(\d+) rows/.exec(onWorld.out);
      ok(`pre.9 · the Position and Transaction counts it prints EQUAL a count this suite took independently, on a database that has been staked in (${posN} positions, ${txnN} ledger rows) — and they are not zero, so the counter is proved by a difference from the empty database above`,
        posN > 0 && txnN > 0 && Number(printedPos?.[1] ?? -1) === posN && Number(printedTxn?.[1] ?? -1) === txnN,
        j({ printed: [printedPos?.[1], printedTxn?.[1]], measured: [posN, txnN] }));
      ok(`pre.9z · POSITIVE CONTROL · on that same UNTOUCHED database the timezone verdict agrees with the zone it really has (${worldZone}) — the verdict is not a constant, and pre.3's NO-GO was not luck`,
        (["UTC", "Etc/UTC"].includes(worldZone)) ? !/NOT UTC/.test(onWorld.out) : /NOT UTC/.test(onWorld.out),
        j({ zone: worldZone, saidNotUtc: /NOT UTC/.test(onWorld.out) }));
    } finally {
      await withAdmin(async (a) => { await a.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §8 · db:seed-house-bots-local — Phase D's world, for a human to open.
//
// ⛔ THE STATUSES ARE READ BACK FROM THE DATABASE, never taken from what the seed believes it wrote.
// The whole point of the seed is a world a human opens in a browser, and the browser reads rows.
//
// ⭐ AND THE AUTO_PAUSED ACCOUNT IS PROVED TO HAVE GOT THERE THE WAY THE PRODUCT GETS THERE: its
// recorded consent fingerprint no longer matches its holder's password. A status poked into a column
// would satisfy "one account is AUTO_PAUSED" and teach a human something false on the first screen.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const SEED_SCRIPT = "scripts/seed-house-bots-local.mts";

if (STORE === "memory") {
  section("§8s · db:seed-house-bots-local — the refusals, before any database is opened");
  await guard("seed.src", () => {
    const body = bodyOf(SEED_SCRIPT);
    ok("seed.6 · SOURCE · it refuses any DATABASE_URL that is not loopback, names production explicitly AND EXITS — designating a REAL player as a house bot is a money-and-consent act on a live account",
      Object.values(loopbackRefusal(body)).every(Boolean), j(loopbackRefusal(body)));
    ok("seed.4s · SOURCE · the admin credential it hands the human is READ OUT of `scripts/seed-admin-local.mts`'s own output, never re-typed here — a typed copy is right the day it is written and hands out a dead password the day that file changes either half",
      typedAdminCredential(body).length === 0 && /admin\.stdout/.test(body), j(typedAdminCredential(body)));
    ok("seed.7 · SOURCE · ⛔ the seed cannot turn the master switch on — no switchOn, no `\"enabled\" = true`, no ON-shaped flag. The world it writes is a desk with a roster and no house money in it",
      switchOnSites(body).length === 0 && onFlagSites(body).length === 0, j(switchOnSites(body)));
    ok("seed.8 · SOURCE · POSITIVE CONTROL · …and it DOES reach the real services: designateHouseBot, startHouseBot and the holder hook — so the absences above are a choice, not a file that writes nothing",
      /designateHouseBot\s*\(/.test(body) && /startHouseBot\s*\(/.test(body) && /onHolderAccountChanged\s*\(/.test(body), "all three services called");
  });

  await guard("seed.refuse", () => {
    const bad = runOps(SEED_SCRIPT, [], { DATABASE_URL: "postgresql://postgres:x@10.0.0.5:5432/anything" });
    ok("seed.6r · a non-loopback DATABASE_URL is REFUSED with exit 2 before anything is imported that would open a connection",
      bad.code === 2 && /loopback only/i.test(bad.out), `exit ${bad.code}`);
  });
}

if (STORE === "postgres") {
  section("§8 · db:seed-house-bots-local — RUN against a database of its own, then read back");
  await guard("seed", async () => {
    const pgLib: Any = (await import("pg")).default;
    const RAW = process.env.DATABASE_URL ?? "";
    const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
    const DB = `hb_ops_seed_${process.pid}`;
    const url = `${BASE}/${DB}?connect_timeout=30`;
    const withAdmin = async (fn: (a: Any) => Promise<void>): Promise<void> => {
      const a = new pgLib.Client({ connectionString: `${BASE}/postgres` });
      await a.connect();
      try { await fn(a); } finally { await a.end().catch(() => {}); }
    };
    await withAdmin(async (a) => {
      await a.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
      await a.query(`CREATE DATABASE "${DB}"`);
    });
    try {
      // ⛔ BEFORE THE MIGRATION, the seed must refuse rather than write half a world: it asks the
      // engine's OWN schema gate, so it can never disagree with what the desk will do on the same rows.
      const early = runOps(SEED_SCRIPT, [], { DATABASE_URL: url });
      ok("seed.0 · on an un-migrated database the seed REFUSES and names the command that fixes it — it asks the engine's own schema gate rather than a query of its own",
        early.code === 2 && /schema is not ready/.test(early.out) && /migrate deploy/.test(early.out), `exit ${early.code}`);

      const mig = spawnSync("npx", ["prisma", "migrate", "deploy"], {
        cwd: REPO_ROOT, env: { ...process.env, DATABASE_URL: url }, encoding: "utf8",
        shell: process.platform === "win32", timeout: 10 * 60_000,
      });
      ok("seed.migrate · prisma migrate deploy applies every migration to the seed's own database", mig.status === 0, (mig.stderr ?? "").split("\n").slice(-2).join(" "));
      if (mig.status !== 0) return;

      const run = runOps(SEED_SCRIPT, [], { DATABASE_URL: url });
      ok("seed.run · the seed completes and prints the world a human then opens", run.code === 0 && /house bots · local world/.test(run.out), `exit ${run.code}`);

      const c2 = new pgLib.Client({ connectionString: url });
      await c2.connect();
      try {
        const bots = (await c2.query(`SELECT "id", "status", "pauseReason", "removedCause", "userId", "passwordFingerprint" FROM "HouseBot" ORDER BY "designatedAt"`)).rows as Any[];
        const want: Array<[string, string | null]> = [["PAUSED", "NEW"], ["ACTIVE", null], ["AUTO_PAUSED", "PASSWORD_CHANGED"], ["REMOVED", null]];
        ok("seed.1 · READ BACK from the database: one account in each of PAUSED(NEW), ACTIVE, AUTO_PAUSED(PASSWORD_CHANGED) and REMOVED — never taken from the script's own return values",
          bots.length === 4 && want.every(([st, reason]) => bots.some((b) => b.status === st && (reason === null || b.pauseReason === reason))),
          j(bots.map((b) => `${b.status}${b.pauseReason ? `(${b.pauseReason})` : ""}`)));

        const paused = bots.find((b) => b.status === "AUTO_PAUSED");
        const holder = paused ? (await c2.query(`SELECT "passwordHash" FROM "User" WHERE "id" = $1`, [paused.userId])).rows[0] : null;
        const { passwordFingerprint }: Any = await import("../../src/lib/server/password-reset.ts");
        ok("seed.2 · ⭐ …and the AUTO_PAUSED account got there the way the PRODUCT gets there: its recorded consent fingerprint no longer matches its holder's password. A status written into the column would pass 'one account is AUTO_PAUSED' and teach a human something false on the first screen",
          !!paused && !!holder && passwordFingerprint(holder.passwordHash) !== paused.passwordFingerprint,
          j({ status: paused?.status, reason: paused?.pauseReason, matches: !!holder && passwordFingerprint(holder.passwordHash) === paused?.passwordFingerprint }));

        const removed = bots.find((b) => b.status === "REMOVED");
        ok("seed.3 · the REMOVED account carries a removal cause", !!removed && !!removed.removedCause, j({ cause: removed?.removedCause }));

        // ⛔ THE CREDENTIAL THE SEED PRINTS IS TRIED AGAINST THE ROW IT WROTE. Everything else here is
        // about the desk; this is about the door. A world nobody can sign in to is a world nobody opens,
        // and the failure would present as "the admin password is wrong", which nobody would look for here.
        const printed = /admin\s+(\+\d+)\s*\/\s*(\S+)/.exec(run.out);
        const { verifyPassword }: Any = await import("../../src/lib/server/crypto.ts");
        const adminRow = printed ? (await c2.query(`SELECT "id", "role", "status", "passwordHash", "passwordSalt" FROM "User" WHERE "phoneE164" = $1`, [printed[1]])).rows[0] as Any : null;
        const opens = adminRow ? await verifyPassword(printed![2], adminRow.passwordSalt, adminRow.passwordHash) : false;
        ok("seed.4 · the admin credential the seed PRINTS actually opens the account it wrote — parsed out of the run's own output and verified against the stored hash, so a re-typed or stale password cannot be handed to a human",
          !!adminRow && adminRow.role === "ADMIN" && adminRow.status === "ACTIVE" && opens === true,
          j({ phone: printed?.[1], role: adminRow?.role, status: adminRow?.status, opens }));
        const wrongOpens = adminRow ? await verifyPassword(`${printed![2]}x`, adminRow.passwordSalt, adminRow.passwordHash) : true;
        ok("seed.4c · CONTROL · one character more and the SAME verifier says no — so seed.4's yes is a measurement and not a function that returns true",
          wrongOpens === false, j({ wrongOpens }));

        const ctl = (await c2.query(`SELECT "enabled", "offCause" FROM "HouseBotControl"`)).rows[0] as Any;
        const marked = Number((await c2.query(`SELECT count(*)::int AS n FROM "Position" WHERE "houseBotId" IS NOT NULL`)).rows[0].n);
        const players = Number((await c2.query(`SELECT count(*)::int AS n FROM "Position" WHERE "houseBotId" IS NULL`)).rows[0].n);
        ok("seed.5 · the master switch is OFF and there are 0 MARKED rows — the seeded world is one nobody has staked house money in, which is what makes the first stake watchable",
          ctl?.enabled === false && marked === 0, j({ enabled: ctl?.enabled, offCause: ctl?.offCause, marked }));
        ok("seed.5p · ⭐ POSITIVE CONTROL · …on a board that is NOT empty: a real player holds a real stake, so '0 marked rows' is a measured difference and not an empty database",
          players > 0, j({ playerPositions: players }));

        const again = runOps(SEED_SCRIPT, [], { DATABASE_URL: url });
        const after = Number((await c2.query(`SELECT count(*)::int AS n FROM "HouseBot"`)).rows[0].n);
        ok("seed.again · a second run against the already-seeded database REFUSES and SAYS SO, and writes no second world — a silent second roster is the failure this refusal exists to prevent",
          again.code === 2 && /already holds/.test(again.out) && after === 4, j({ exit: again.code, bots: after }));
      } finally {
        await c2.end().catch(() => {});
      }
    } finally {
      await withAdmin(async (a) => { await a.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`); });
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §9 · ops:release-migration-parity — REL-0(c) rewritten, and DRIVEN over real git trees.
//
// ⛔ THE CASES NEVER NAME `origin/main`, and that is deliberate rather than convenient: this suite is
// discovered by `test:all`, and a remote-tracking ref is a property of the MACHINE, not of the tree —
// on a checkout that has not fetched, an assertion about it would be red for a reason that has nothing
// to do with the code. Every case here compares HEAD against a ref this process MAKES.
//
// ⭐ AND THE MUTATIONS ARE REAL GIT TREES, not string bodies. A synthetic commit is built with
// `commit-tree` over a temporary index (`GIT_INDEX_FILE`), so the working tree, the real index and
// every other lane's files are untouched — the standing rule after a red harness once left a live
// payout gate disabled by editing the repo it was measuring. What lands on disk is a handful of loose
// objects nothing references.
// ═══════════════════════════════════════════════════════════════════════════════════════════

if (STORE === "memory") {
  section("§9 · ops:release-migration-parity — the obsolete release condition, rewritten and driven");
  const PARITY_SCRIPT = "scripts/ops-release-migration-parity.mts";
  const IDX = join(tmpdir(), `hb-ops-parity-${process.pid}.idx`);
  const git = (args: string[], env: Record<string, string> = {}, input?: Buffer | string): string =>
    execFileSync("git", args, { cwd: REPO_ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, env: { ...process.env, ...env }, input }).trim();
  /** A commit that exists only as git objects: HEAD's tree with one path edited, added or removed. */
  const synth = (msg: string, edit: (idx: (args: string[], input?: Buffer | string) => string) => void): string => {
    const env = { GIT_INDEX_FILE: IDX };
    git(["read-tree", "HEAD"], env);
    edit((args, input) => git(args, env, input));
    return git(["commit-tree", git(["write-tree"], env), "-p", git(["rev-parse", "HEAD"]), "-m", msg]);
  };
  const MIGS = "prisma/migrations";

  await guard("rel.src", () => {
    const body = bodyOf(PARITY_SCRIPT);
    ok("rel.src.1 · SOURCE · ⛔ every git subcommand it RUNS is read-only — no fetch, no ls-remote, nothing that writes. A gate that refreshed the ref it measures would change its own answer in the act of reading it, and would need the network in the room where the checklist is read aloud",
      gitVerbs(body).writing.length === 0, j(gitVerbs(body)));
    ok("rel.src.2 · SOURCE · POSITIVE CONTROL · …and it really does run some: `ls-tree` and `show`, hashing BYTES rather than a decoded string — so the absence above is a choice and not a file that reads nothing",
      gitVerbs(body).readOnly.includes("ls-tree") && gitVerbs(body).readOnly.includes("show") && /createHash\("sha256"\)/.test(body), j(gitVerbs(body).readOnly));
    ok("rel.src.3 · SOURCE · it is NOT a `test:` key and cannot be discovered by `test:all` — release-time facts belong to release-time commands",
      !Object.keys((JSON.parse(read("package.json")) as Any).scripts).some((k) => k.startsWith("test:") && (JSON.parse(read("package.json")) as Any).scripts[k].includes("ops-release-migration-parity")),
      "no test: key runs it");
  });

  await guard("rel", () => {
    try {
      // ⭐ THE POSITIVE CONTROL FIRST, AND IT IS THE ONE THAT MATTERS: a gate that could only ever say
      // NO-GO would satisfy every case below without measuring anything.
      const go = runOps(PARITY_SCRIPT, ["--ref", "HEAD"]);
      ok("rel.1 · ⭐ POSITIVE CONTROL · HEAD against itself is GO and exits 0 — every NO-GO below is therefore a measured DIFFERENCE and not a script that can only refuse",
        go.code === 0 && /✅ GO/.test(go.out), `exit ${go.code}`);
      ok("rel.1b · …and it PRINTS the population it compared: the folder count on each ref, and the identical/EOL/content split, so a comparison over nothing cannot read as a clean pass",
        /migration folders: (\d+) on/.test(go.out) && /identical: \d+ · line endings only: \d+ · content: \d+/.test(go.out),
        (go.out.match(/identical: .*/) ?? [""])[0]);

      const houseDirs = (git(["ls-tree", "--name-only", "HEAD", `${MIGS}/`]).split("\n"))
        .map((l) => l.trim().replace(`${MIGS}/`, "")).filter((f) => /_house_bot_(?:tables|markers)$/.test(f)).sort();
      ok("rel.0 · the two house migration folders are read OUT of the tree, never typed into this suite",
        houseDirs.length === 2, j(houseDirs));
      const target = `${MIGS}/${houseDirs[1] ?? houseDirs[0]}/migration.sql`;
      const original = execFileSync("git", ["show", `HEAD:${target}`], { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 });

      // 1 · ONE EDITED BYTE in an already-applied migration.
      const edited = synth("planted: a tidied comment in an applied migration", (idx) => {
        const sha = idx(["hash-object", "-w", "--stdin"], Buffer.concat([original, Buffer.from("\n-- tidied\n")]));
        idx(["update-index", "--add", "--cacheinfo", `100644,${sha},${target}`]);
      });
      const r1 = runOps(PARITY_SCRIPT, ["--ref", edited]);
      ok("rel.2 · a single edited byte in an ALREADY APPLIED migration is reported as a CONTENT difference and exits 1 — `migrate deploy` fails its checksum, `next start` is never reached, and the container does not boot",
        r1.code === 1 && /CONTENT differs/.test(r1.out) && r1.out.includes(houseDirs[1] ?? houseDirs[0]), `exit ${r1.code} · ${(r1.out.match(/content: \d+/) ?? [""])[0]}`);

      // 2 · THE SAME BYTES, CRLF. A stopper too, but a different diagnosis and a different fix.
      const crlf = synth("planted: the same statements, CRLF", (idx) => {
        const sha = idx(["hash-object", "-w", "--stdin"], Buffer.from(original.toString("latin1").replace(/\r\n/g, "\n").replace(/\n/g, "\r\n"), "latin1"));
        idx(["update-index", "--add", "--cacheinfo", `100644,${sha},${target}`]);
      });
      const r2 = runOps(PARITY_SCRIPT, ["--ref", crlf]);
      ok("rel.3 · ⭐ the same statements with CRLF endings are reported as a stopper AND diagnosed as LINE ENDINGS ONLY — still a failed deploy, but the fix is an EOL round-trip and not an edit to revert, and a gate that printed only 'differs' would send the operator to rewrite a file that is already right",
        r2.code === 1 && /LINE ENDINGS ONLY/.test(r2.out) && !/CONTENT differs/.test(r2.out), `exit ${r2.code} · ${(r2.out.match(/line endings only: \d+/) ?? [""])[0]}`);

      // 3 · THE ORIGINAL CONDITION'S OWN FAILURE MODE, still reported: the house DDL not yet merged.
      const missing = synth("planted: the ref does not carry the house markers migration", (idx) => {
        idx(["update-index", "--force-remove", target]);
      });
      const r3 = runOps(PARITY_SCRIPT, ["--ref", missing]);
      ok("rel.4 · ⛔ REL-0(c)'s ORIGINAL READING, PRESERVED RATHER THAN DELETED: against a ref that does NOT carry the house DDL, the gate says so by name and exits 1 — the condition still bites in the world it was written for, it simply is not this one",
        r3.code === 1 && /is on HEAD but not on/.test(r3.out) && /REL-2 must be re-instated/.test(r3.out), `exit ${r3.code}`);
      ok("rel.4b · …and it reports the same folder as an unreviewed FORWARD migration — DDL that applies the moment the new container starts, which is exactly what Ali's 'go' has to name",
        /on HEAD and not on .* … 1/.test(r3.out) && /apply the moment the new container starts/.test(r3.out), (r3.out.match(/on HEAD and not on .* … \d+/) ?? [""])[0]);

      // 4 · THE BRANCH IS BEHIND.
      const ahead = synth("planted: the ref carries a migration this tree does not", (idx) => {
        const sha = idx(["hash-object", "-w", "--stdin"], Buffer.from('-- planted\nALTER TABLE "Position" ADD COLUMN "plantedCol" TEXT;\n'));
        idx(["update-index", "--add", "--cacheinfo", `100644,${sha},${MIGS}/29991231120000_planted_later/migration.sql`]);
      });
      const r4 = runOps(PARITY_SCRIPT, ["--ref", ahead]);
      ok("rel.5 · a migration on the ref that this tree does not carry is reported as BEHIND and exits 1 — deploying it would hand production a migration history missing a row its own database already records",
        r4.code === 1 && /branch is BEHIND/.test(r4.out) && /29991231120000_planted_later/.test(r4.out), `exit ${r4.code}`);

      // 5 · SCOPE. A difference OUTSIDE prisma/migrations must not move the verdict.
      const elsewhere = synth("planted: a changed file that is not a migration", (idx) => {
        const sha = idx(["hash-object", "-w", "--stdin"], Buffer.from("# planted, and none of this gate's business\n"));
        idx(["update-index", "--add", "--cacheinfo", `100644,${sha},docs/PLANTED-NOT-A-MIGRATION.md`]);
      });
      const r5 = runOps(PARITY_SCRIPT, ["--ref", elsewhere]);
      ok("rel.6 · ⭐ CONTROL · a ref that differs from HEAD OUTSIDE `prisma/migrations` is still GO — the gate is scoped to the files that decide whether the container boots, not to 'the refs differ', which would be red on every release by construction",
        r5.code === 0 && /✅ GO/.test(r5.out), `exit ${r5.code}`);

      // 6 · A REF THIS CHECKOUT CANNOT RESOLVE IS NOT MEASURED — never GO, and never a silent pass.
      const nm = runOps(PARITY_SCRIPT, ["--ref", "origin/a-ref-that-does-not-exist"]);
      // ⭐ THE VERDICT LINE, NOT THE WORD. The first form of this assertion searched the whole output for
      // "GO" and went red on the script's own sentence — "NOT MEASURED is never GO" — which is the file
      // stating the very rule being asserted. A false positive this detector really produced.
      ok("rel.7 · an unresolvable ref exits 3 NOT MEASURED, names the ref it could not resolve, and tells the operator to fetch — ⛔ it does not fetch for them, and it reaches NEITHER verdict line",
        nm.code === 3 && /NOT MEASURED/.test(nm.out) && /a-ref-that-does-not-exist/.test(nm.out)
        && !/✅ GO/.test(nm.out) && !/🔴 NO-GO/.test(nm.out), `exit ${nm.code}`);
    } finally {
      // The temporary index is the only thing this section puts on disk outside git's own object store.
      try { rmSync(IDX, { force: true }); } catch { /* it may never have been written */ }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §7 · ops:house-bots-status — COMMIT 8's OWN DUTIES: the four figures beyond R5's five, and the
// +10 minute recheck.
//
// ⛔ EVERY FIGURE IS ASSERTED AGAINST A NUMBER THIS SUITE MEASURED ITSELF, on a database that has
// been staked in. "0" is not evidence here: a reader that counted nothing would satisfy every
// expect-zero assertion ever written about it.
//
// ⭐ AND EVERY REFUSAL HAS ITS POSITIVE CONTROL BESIDE IT. The wallet is deleted AND PUT BACK, so
// "settlement-blocked: 1" and "settlement-blocked: 0" are both measured on the same account — a leg
// that reported the condition but could never clear it would pass the first half alone.
// ═══════════════════════════════════════════════════════════════════════════════════════════

if (STORE === "memory") {
  section("§7s · ops:house-bots-status — the Commit-8 SOURCE pins: the live-intent statuses are IMPORTED");
  await guard("status.c8.src", () => {
    const body = bodyOf(STATUS_SCRIPT);
    const dalBody = read("src/lib/server/house-bot-dal.ts");
    ok("ops.status.10 · SOURCE · the live-intent statuses are IMPORTED (LIVE_INTENT_STATUSES) and the SQL is BUILT from them — no typed `IN ('PENDING', 'CLAIMED')` anywhere in the file",
      /LIVE_INTENT_STATUSES/.test(body) && /LIVE_IN/.test(body) && !/IN\s*\(\s*'PENDING'/.test(body),
      j({ imported: /LIVE_INTENT_STATUSES/.test(body), typed: /IN\s*\(\s*'PENDING'/.test(body) }));
    // ⛔ THE CROSS-CHECK IS THE POINT. Importing a constant proves nothing if the SEAM's own predicate
    // was built from a different list: the DAL's LIVE_SQL is a hand-written string, so it is read here
    // and asserted to name EXACTLY the statuses the constant carries. Two live-intent populations that
    // disagree is how a rollback figure reads 0 while intents are still firing.
    const liveSql = /const LIVE_SQL = `([^`]+)`/.exec(dalBody)?.[1] ?? "";
    const named = [...liveSql.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    ok("ops.status.10x · POSITIVE CONTROL · the DAL's own LIVE_SQL predicate names EXACTLY the statuses that constant carries — so the script's count and the seam's own live reads cannot drift apart",
      liveSql.length > 0 && named.length === LIVE_INTENT_STATUSES.length && named.every((s) => (LIVE_INTENT_STATUSES as readonly string[]).includes(s)),
      j({ liveSql, named, constant: LIVE_INTENT_STATUSES }));
    // ⭐ SCANNED WITH THE STRING LITERALS BLANKED, AND THAT IS NOT A CONVENIENCE — the first draft of
    // this detector hunted the bare word `AUTO_PAUSED` and reddened on figure 2's own printed
    // population label ("PAUSED and AUTO_PAUSED included, REMOVED excluded"). A guard that reddens a
    // file for NAMING the rule it obeys is the same false positive `auditWriteSites` already records,
    // and it gets switched off. A pause is a CALL; a label is text.
    const code = withoutStringLiterals(body);
    ok("ops.status.13s · SOURCE · the settlement-blocked leg is a READ: it never stops a bot and never writes a pause — the planner's 7e pass does that, and an ops read run mid-incident must not move the desk under the officer looking at it",
      !/stopBot\s*\(/.test(code) && !/setStatus\s*\(/.test(code) && !/AUTO_PAUSED/.test(code) && /findByUserId\s*\(/.test(code),
      j({ stop: /stopBot\s*\(/.test(code), setStatus: /setStatus\s*\(/.test(code), pauseConst: /AUTO_PAUSED/.test(code), reads: /findByUserId\s*\(/.test(code) }));
    ok("ops.status.13sc · ⭐ CONTROL, AND IT IS A FALSE POSITIVE THIS DETECTOR REALLY PRODUCED · the word AUTO_PAUSED in figure 2's printed POPULATION LABEL is text, not a pause — it is present in the file and absent from the code",
      /AUTO_PAUSED/.test(body) && !/AUTO_PAUSED/.test(code), "present in the file, blanked in the code");
    ok("ops.status.dr · SOURCE · drift is NAMED at every invocation: there is an else-branch that prints NOT MEASURED and the command that measures it, so a clean five-figure line can never be read as a clean drift verdict",
      /NOT MEASURED in this run/.test(body) && /--drift/.test(body), "the un-measured branch exists");
  });
}

if (STORE === "postgres") {
  section("§7 · ops:house-bots-status — the Commit-8 figures, DRIVEN on a database that has been staked in");
  await guard("status.c8", async () => {
    const pgLib: Any = (await import("pg")).default;
    const cx = new pgLib.Client({ connectionString: process.env.DATABASE_URL });
    await cx.connect();
    const n = async (sql: string, v: unknown[] = []): Promise<number> => Number((await cx.query(sql, v)).rows[0].n);
    const figure6 = (out: string) => Number(/open house pos\s+(\d+)/.exec(out)?.[1] ?? -1);
    const figure7 = (out: string) => Number(/live intents\s+(\d+)/.exec(out)?.[1] ?? -1);
    const figure8 = (out: string) => /open exposure\s+TZS ([\d,]+) across (\d+) market/.exec(out);
    const figure9 = (out: string) => Number(/settle-blocked\s+(\d+)/.exec(out)?.[1] ?? -1);
    try {
      // ── the fixture: open house money on a market of its own, through the real seam ──────────
      await w.dal.houseBotControlStore.switchOn({ byId: OFFICER, reason: "ops §7 fixture" });
      const m = await pollWithLockedNo();
      const bot = await w.bot();
      const staked = await stake(bot, m.market.id, 4_000);
      const openNow = await n(`SELECT count(*)::int AS n FROM "Position" WHERE "houseBotId" IS NOT NULL AND "status"::text = 'OPEN'`);
      const liveNow = await n(`SELECT count(*)::int AS n FROM "HouseBotIntent" WHERE "status" IN ('PENDING', 'CLAIMED')`);
      const byMarket: Any[] = await w.dal.houseBookStore.openExposureByMarket();
      const byBot: Any[] = await w.dal.houseBookStore.openExposure(null);
      const marketTotal = byMarket.reduce((s: number, r: Any) => s + r.openStakeTzs, 0);
      const botTotal = byBot.reduce((s: number, r: Any) => s + r.openStakeTzs, 0);

      const one = runOps(STATUS_SCRIPT, []);
      ok("ops.status.15 · ONE invocation carries all NINE figures — R5's five and the rollback runbook's four. An officer mid-rollback who must run two commands to answer 'is it safe yet' will run one of them",
        one.code === 0 && [/1  master switch/, /2  bots/, /3  marked rows/, /4  engine/, /5  planner beat/, /6  open house pos/, /7  live intents/, /8  open exposure/, /9  settle-blocked/].every((re) => re.test(one.out)),
        `exit ${one.code}`);

      ok(`ops.status.11 · open house positions is the count this suite measured itself (${openNow}), across EVERY bot — not a per-bot figure and not a zero`,
        openNow > 0 && figure6(one.out) === openNow, j({ printed: figure6(one.out), measured: openNow }));

      ok(`ops.status.12 · exposure is printed PER MARKET with a TZS total and a market count, and the per-market rows sum to the ALL-BOT total from openExposure(null) — two groupings of the same money, both measured (${byMarket.length} markets, ${byBot.length} accounts)`,
        byMarket.length >= 2 && marketTotal === botTotal && marketTotal > 0
        && Number(figure8(one.out)?.[1].replace(/,/g, "")) === marketTotal && Number(figure8(one.out)?.[2]) === byMarket.length
        && /the two groupings agree/.test(one.out),
        j({ printed: figure8(one.out)?.slice(1), marketTotal, botTotal }));
      ok("ops.status.12c · CONTROL · the per-market rows are keyed by MARKET ids and not by bot ids — otherwise the new reader could be the per-bot one relabelled",
        byMarket.every((r: Any) => !byBot.some((b: Any) => b.houseBotId === r.marketId)) && byMarket.some((r: Any) => r.marketId === m.market.id),
        j({ markets: byMarket.map((r: Any) => r.marketId).slice(0, 4), bots: byBot.map((b: Any) => b.houseBotId).slice(0, 4) }));

      // ⛔ UNBOUNDED IN TIME. `houseSeam.globalUsage` is bounded to the last day; a figure shaped like it
      // would read 0 on a database holding older house money, which is precisely the release figure.
      await w.backdate(staked.data.positionId, 48 * 3_600_000);
      const aged = runOps(STATUS_SCRIPT, []);
      ok("ops.status.11b · …and it is UNBOUNDED: the same position backdated 48 hours is still counted, so the figure cannot be a 24-hour window wearing the release figure's name",
        figure6(aged.out) === openNow, j({ before: openNow, after: figure6(aged.out) }));

      // ── live intents: CLAIMED counted, CANCELLED not ────────────────────────────────────────
      const m2 = await pollWithLockedNo();
      await w.intent(bot, m2.market.id, { kind: "FILL", side: "YES", stakeTzs: 1_000 });
      await w.dal.houseBotIntentStore.cancelLive({ houseBotId: bot.botId }, "CASE_DONE");
      const cancelled = await n(`SELECT count(*)::int AS n FROM "HouseBotIntent" WHERE "status" = 'CANCELLED'`);
      await w.intent(bot, m2.market.id, { kind: "FILL", side: "YES", stakeTzs: 1_000 });
      await w.intent(bot, m2.market.id, { kind: "MANUAL", entryCondition: "THIN", requestedById: OFFICER, side: "YES", stakeTzs: 1_000 });
      const liveAfter = await n(`SELECT count(*)::int AS n FROM "HouseBotIntent" WHERE "status" IN ('PENDING', 'CLAIMED')`);
      const withIntents = runOps(STATUS_SCRIPT, []);
      ok(`ops.status.10r · live intents counts the two live statuses and nothing else: two more CLAIMED rows move it by exactly 2 (${liveNow} → ${liveAfter}) while ${cancelled} CANCELLED row(s) move it by 0 — the typo'd status list this assertion exists to catch would fail on one half or the other`,
        liveAfter === liveNow + 2 && cancelled > 0 && figure7(withIntents.out) === liveAfter,
        j({ before: liveNow, after: liveAfter, printed: figure7(withIntents.out), cancelled }));

      // ── settlement-blocked: the condition, and the control that it CLEARS ────────────────────
      ok("ops.status.13a · CONTROL · with every holder wallet present the settlement-blocked figure is 0 — the condition is unreachable until it is planted, so this is what makes the next assertion a difference",
        figure9(withIntents.out) === 0, j({ printed: figure9(withIntents.out) }));
      const walletRow = (await cx.query(`SELECT "id" FROM "Wallet" WHERE "userId" = $1`, [bot.userId])).rows[0];
      await cx.query(`DELETE FROM "Wallet" WHERE "userId" = $1`, [bot.userId]);
      const blocked = runOps(STATUS_SCRIPT, []);
      ok(`ops.status.13 · a bot holding OPEN house money whose holder WALLET is gone is REPORTED and NAMED (${bot.botId}), with the money it cannot settle — HB-LC-10's condition, which no reader had before`,
        figure9(blocked.out) === 1 && blocked.out.includes(bot.botId) && /CANNOT be settled/.test(blocked.out)
        && /changed nothing/.test(blocked.out), j({ printed: figure9(blocked.out) }));
      const stillActive = await w.dal.houseBotStore.get(bot.botId);
      ok("ops.status.13b · ⭐ POSITIVE CONTROL · …and the account was NOT touched: still the status it had, no pause written. The planner's 7e pass stops such a bot; a status read must not move the desk under the officer reading it",
        stillActive?.status === "ACTIVE" && stillActive?.pauseReason === null, j({ status: stillActive?.status, pauseReason: stillActive?.pauseReason }));
      await w.db.wallet.create({ id: String(walletRow?.id ?? `wal_restore_${bot.userId}`), userId: bot.userId, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: w.iso(), updatedAt: w.iso() });
      const restored = runOps(STATUS_SCRIPT, []);
      ok("ops.status.13c · ⭐ AND IT CLEARS · the wallet put back, the figure returns to 0 on the SAME account — a leg that could report the condition but never clear it would have passed the assertion above on its own",
        figure9(restored.out) === 0, j({ printed: figure9(restored.out) }));

      // ⛔ THE RULE IS ABOUT COUNTS, AND IT IS STATED THAT WAY RATHER THAN BROADENED UNTIL IT PASSES.
      // Six of the nine figures print a NUMBER (bots, marked rows, open positions, live intents,
      // exposure, settlement-blocked) and every one of them must name the population it counted or say
      // NOT MEASURABLE. The other three are not counts — a switch state, an engine boot instant and a
      // beat age — and each is asserted to carry its OWN qualifier instead, because "OFF" with no
      // off-cause and a beat age with no staleness threshold are the same defect in a different shape.
      const figures = restored.out.split("\n").filter((l) => /^\d  /.test(l));
      const counted = figures.filter((l) => /^[23679]  /.test(l));
      const stated = figures.filter((l) => /^[145]  /.test(l));
      ok("ops.status.14 · every figure that prints a NUMBER names the population it counted, in words — a number without its population is how 'not applicable' gets read as 'fine' — and the three that are not counts carry their own qualifier instead",
        figures.length === 9 && counted.length === 5 && counted.every((l) => /population:|NOT MEASURABLE/.test(l))
        && /open exposure/.test(figures[7]) && /population: OPEN marked positions grouped by MARKET/.test(figures[7])
        && stated.length === 3 && /off cause/.test(stated[0]) && /instance row/.test(stated[1]) && /stale past/.test(stated[2]),
        j({ figures: figures.length, counted: counted.length, unlabelled: counted.filter((l) => !/population:|NOT MEASURABLE/.test(l)) }));

      // ── the +10 minute recheck ──────────────────────────────────────────────────────────────
      const quiet = runOps(STATUS_SCRIPT, ["--watch", "0.05"]);
      ok("ops.status.w1 · --watch re-reads the four figures the rollback runbook watches and says what MOVED — with nothing writing, it reports 'nothing moved', which is a different statement from 'still 0'",
        quiet.code === 0 && /recheck/.test(quiet.out) && /nothing moved/.test(quiet.out) && /unchanged/.test(quiet.out), `exit ${quiet.code}`);

      // ⛔ THE DELTA DETECTOR IS PROVED BY MAKING SOMETHING MOVE. A recheck that always printed
      // "nothing moved" would pass the assertion above forever, which is the whole failure this
      // programme keeps paying for. The house stake below lands BETWEEN the two reads.
      const watching = new Promise<{ code: number; out: string }>((res) => {
        const ch = spawn("npx", ["tsx", STATUS_SCRIPT, "--watch", "0.4"], {
          cwd: REPO_ROOT, env: { ...process.env }, shell: process.platform === "win32",
        });
        let out = "";
        ch.stdout?.on("data", (d: Buffer) => { out += String(d); });
        ch.stderr?.on("data", (d: Buffer) => { out += String(d); });
        ch.on("exit", (code: number | null) => res({ code: code ?? 1, out }));
      });
      await new Promise((r) => setTimeout(r, 12_000));
      const m3 = await pollWithLockedNo();
      const bot3 = await w.bot();
      await stake(bot3, m3.market.id, 2_000);
      const moved = await watching;
      ok("ops.status.w2 · ⭐ AND IT REPORTS MOVEMENT · a house stake placed BETWEEN the two reads is reported as a delta and named — 'open house pos … +1' with the MOVED sentence — so 'nothing moved' above is a measurement and not a constant",
        /MOVED/.test(moved.out) && /open house pos\s+\d+ → \d+\s+· \+\d/.test(moved.out),
        (moved.out.split("\n").filter((l) => /→/.test(l)).join(" | ") || `exit ${moved.code}`).slice(0, 300));
    } finally {
      await cx.end().catch(() => {});
      await w.switchOff();
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §5 · THE SUNSET (F2) — the wind-down that installs the terminal state.
//
// ⛔ IT RUNS LAST, AND NOTHING CAN FOLLOW IT: it removes every account and walks the control row to
// a state nothing can undo. Every earlier section needs a desk that still works.
//
// ⭐ THE TWO CHILDREN SPLIT THE TWO AUDIT OUTCOMES, and each says which half it measured. The memory
// child forces the compliance row NOT TO LAND — `chainSecret()` refusing to sign, which is production
// without a distinct AUDIT_CHAIN_SECRET, so that is exactly what is arranged — and proves the desk still
// moved and the result says `recorded: false`. (Until replan ruling 543 that refusal made `audit()`
// REJECT and the service caught it; since 2026-09-26 `audit()` RESOLVES it unrecorded and the service
// reads the flag. The arrangement and the answer are the same.) The Postgres child runs it whole and
// counts ONE audit row, ONE global event and ONE alert. Neither child could prove both.
// ═══════════════════════════════════════════════════════════════════════════════════════════

const SUNSET_SCRIPT = "scripts/ops-house-bots-sunset.mts";

if (STORE === "memory") {
  section("§5s · ops:house-bots-sunset — the SOURCE pins and the refusals");
  await guard("sunset.src", () => {
    const script = bodyOf(SUNSET_SCRIPT);
    const service = bodyOf("src/lib/server/house-bot/sunset.ts");
    ok("ops.sunset.12 · ⛔ neither the script nor the service can turn anything ON — no switchOnHouseBots, no DAL switchOn, no raw `\"enabled\" = true`, no ORM patch, and no ON-shaped flag",
      switchOnSites(script).length === 0 && onFlagSites(script).length === 0 && switchOnSites(service).length === 0,
      j({ script: switchOnSites(script), service: switchOnSites(service) }));
    ok("ops.sunset.12b · ⛔ it does NOT reuse removeHouseBot — which hardcodes cause MANUAL, ends targets as BOT_REMOVED, writes no per-target event and announces once PER ACCOUNT where FS-06 asks for ONE",
      !/removeHouseBot/.test(script) && !/removeHouseBot/.test(service), "no removeHouseBot import in either file");
    ok("ops.sunset.12c · ⛔ it uses markSunset, never switchOff — on today's already-OFF desk switchOff's `enabled = true` predicate matches NOTHING, so a sunset through it would strip the roster and leave no terminal marker at all",
      /markSunset\s*\(/.test(service) && !/\.switchOff\s*\(/.test(service), "markSunset present, switchOff absent");
    ok("ops.sunset.12d · ⛔ it touches NO press row and deletes NOTHING — a sunset keeps every marker, intent, event, press and target (A20)",
      !/pressStore/.test(service) && !/\bdelete(?:Many)?\s*\(/.test(service) && !/DELETE\s+FROM/i.test(service), "no press writer, no delete");
    ok("ops.sunset.12e · ⛔ it never voids, refunds or cashes out — open house positions settle normally, and a pari-mutuel pool cannot void one position",
      !/\bvoid(?:Market|Position)|refund|cashOut|cash_out/i.test(service.replace(/voidHouseConsent/g, "")), "no money unwind in the service");
  });

  section("§5 · the sunset SERVICE on the memory twin — and the compliance row FORCED to fail");
  await guard("sunset.mem", async () => {
    const SUN: Any = await import("../../src/lib/server/house-bot/sunset.ts");
    const sw: Any = await import("../../src/lib/server/house-bot/switch-on.ts");

    // §1b walked this row to SUNSET to prove the DAL member; the SCRIPT's own case is the shipped state —
    // OFF with no terminal cause — so the row is put back there first, through the DAL, deliberately.
    await w.dal.houseBotControlStore.switchOn({ byId: OFFICER, reason: "§5 fixture" });
    await w.switchOff();
    const fixture = await w.dal.houseBotControlStore.get();
    ok("ops.sunset.0m · fixture · the desk is OFF(MANUAL) with live accounts standing — the state a console OFF leaves behind, and the one a sunset actually meets",
      fixture.enabled === false && fixture.offCause === "MANUAL" && (await w.dal.houseBotStore.listNonRemoved()).length > 0,
      j({ offCause: fixture.offCause, liveBots: (await w.dal.houseBotStore.listNonRemoved()).length }));

    const short = await SUN.sunsetHouseBots({ actorId: OFFICER, reason: "no" });
    const long = await SUN.sunsetHouseBots({ actorId: OFFICER, reason: "x".repeat(301) });
    const control = await w.dal.houseBotControlStore.get();
    ok("ops.sunset.8 · ⛔ a reason shorter than 5 or longer than 300 characters is REFUSED and writes NOTHING — the officer's note is the record this act leaves behind, and both DDL CHECKs cap it at 300",
      short.ok === false && short.code === "REASON" && long.ok === false && long.code === "REASON" && control.offCause !== "SUNSET",
      j({ short: short.code, long: long.code, offCause: control.offCause }));

    // ⛔ THE ONE WAY A COMPLIANCE ROW FAILS TO LAND ON THE MEMORY TWIN is chainSecret() refusing to sign —
    // the memory store has no persist path to lose. So production without a distinct AUDIT_CHAIN_SECRET is
    // the real shape of this failure, and it is what is arranged here, for exactly one call. Since replan
    // ruling 543 `audit()` RESOLVES that entry unrecorded (UNSIGNED — nothing written) instead of rejecting,
    // and the service reads the flag: `recorded: false` and no audit id, exactly as before.
    const prevEnv = (process.env as Record<string, string | undefined>).NODE_ENV;
    const prevSecret = process.env.AUDIT_CHAIN_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.AUDIT_CHAIN_SECRET;
    const done = await SUN.sunsetHouseBots({ actorId: OFFICER, reason: "board decision · memory twin" });
    (process.env as Record<string, string | undefined>).NODE_ENV = prevEnv;
    if (prevSecret !== undefined) process.env.AUDIT_CHAIN_SECRET = prevSecret;

    const after = await w.dal.houseBotControlStore.get();
    const live = await w.dal.houseBotStore.listNonRemoved();
    ok("ops.sunset.a1 · ⛔ THE COMPLIANCE ROW FAILED AND THE DESK STILL MOVED, and the result says BOTH: `recorded: false` beside a control row at SUNSET and an empty roster — a sunset reported as failed because its audit row failed would be a lie in the other direction",
      done.ok === true && done.changed === true && done.recorded === false && done.auditId === null
      && after.offCause === "SUNSET" && after.enabled === false && live.length === 0,
      j({ recorded: done.recorded, counts: done.counts, offCause: after.offCause, liveBots: live.length }));

    const refused = await sw.switchOnHouseBots({ actorId: OFFICER, reason: null });
    ok("ops.sunset.2 · the terminal marker is proved by the REFUSAL it produces: switchOnHouseBots answers { ok:false, code:'WITHDRAWN' }",
      refused.ok === false && refused.code === "WITHDRAWN", j(refused));

    const again = await SUN.sunsetHouseBots({ actorId: OFFICER, reason: "a second run, an hour later" });
    ok("ops.sunset.7 · a second run changes NOTHING in every group and says so — `changed: false`, no event, no compliance row, no alert — which is what makes this script safe to re-run after a half-finished one",
      again.ok === true && again.changed === false && again.eventId === null && again.auditId === null
      && again.counts.botsRemoved === 0 && again.counts.intentsCancelled === 0, j({ changed: again.changed, counts: again.counts }));
  });
}

if (STORE === "postgres") {
  section("§5 · ops:house-bots-sunset — DRIVEN through the real script, and counted row by row");
  await guard("sunset", async () => {
    const pgLib: Any = (await import("pg")).default;
    const cx = new pgLib.Client({ connectionString: process.env.DATABASE_URL });
    await cx.connect();
    const rows = async (text: string, a: unknown[] = []): Promise<Any[]> => (await cx.query(text, a)).rows;
    const n = async (text: string): Promise<number> => Number((await rows(text))[0].n);
    const sw: Any = await import("../../src/lib/server/house-bot/switch-on.ts");

    try {
      // ── the fixture, all of it planted through the product's own writers ──
      const bot = await w.bot();
      const market = await pollWithLockedNo();
      // ⛔ PLANTED CONTROL · an account ALREADY REMOVED before the sunset. It must not be removed twice,
      // must keep its own cause, and must receive no second REMOVED event.
      const already = await w.bot();
      await w.dal.houseBotStore.setStatus(already.botId, {
        from: ["ACTIVE"], to: "REMOVED", pauseReason: null, pausedFromStatus: null,
        removal: { byId: OFFICER, reason: "removed before the sunset", cause: "MANUAL" },
      });
      // A live target and a live intent for the sunset to act on.
      const target = await w.dal.targetStore.insert({
        id: `hbt_ops_${process.pid}`, houseBotId: bot.botId, marketId: market.market.id,
        delayMinSec: 10, delayMaxSec: 20, timingFrom: "STAKE", reactTo: "FIRST", createdById: OFFICER,
        snapshot: { titleEn: "Target poll", category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 },
      });
      // ⛔ PLANTED CONTROL · a target ALREADY ENDED. It must not be re-ended and must receive no event.
      const endedMarket = await pollWithLockedNo();
      const vetoed = await w.dal.targetStore.insert({
        id: `hbt_ops_v_${process.pid}`, houseBotId: bot.botId, marketId: endedMarket.market.id,
        delayMinSec: 10, delayMaxSec: 20, timingFrom: "STAKE", reactTo: "FIRST", createdById: OFFICER,
        snapshot: { titleEn: "Vetoed poll", category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 },
      });
      await w.dal.targetStore.endActive(vetoed.id, "VETOED");
      const liveIntent = await w.intent(bot, market.market.id, { kind: "FILL", side: "YES", stakeTzs: 1_500 });
      // ⛔ PLANTED CONTROL · a QUEUED press over that intent (TGT-31): the sunset must not touch it, and it
      // reaches DONE only through the planner's own sweep — which is run below, so "untouched" is not "unreachable".
      const press = await w.dal.houseAtomic(null, async (t: Any) => {
        const ins = await w.dal.pressStore.insertChecking({
          id: `hbp_ops_${process.pid}`, actorId: OFFICER, submitId: crypto.randomUUID(), purpose: "ENTER_NOW",
          houseBotId: bot.botId, marketId: market.market.id, targetId: null, intentId: liveIntent.id, reason: "ops §5 fixture",
        }, t);
        return w.dal.pressStore.queue(ins.row.id, liveIntent.id, t);
      });

      const before = {
        control: (await w.dal.houseBotControlStore.get()).offCause,
        liveBots: (await w.dal.houseBotStore.listNonRemoved()).length,
        sunsetEvents: await n(`SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE "kind" = 'SUNSET'`),
        removedEvents: await n(`SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE "kind" = 'REMOVED'`),
        targetEndedEvents: await n(`SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE "kind" = 'TARGET_ENDED'`),
        audits: await n(`SELECT count(*)::int AS "n" FROM "AuditLog" WHERE "action" = 'house_bot.sunset'`),
        notifications: await w.db.notification.countUnread(OFFICER),
        openMarked: await n(`SELECT count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL AND "status"::text = 'OPEN'`),
        markedRows: await n(`SELECT count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL`),
        press: (await w.dal.pressStore.get(press.id)).state,
      };
      ok("ops.sunset.0f · fixture · a live account with an ACTIVE target and a live intent, a QUEUED press over that intent, an account already REMOVED(MANUAL) and a target already ENDED(VETOED) — every one written through the product's own writers",
        before.liveBots >= 1 && before.press === "QUEUED" && before.control !== "SUNSET",
        j({ liveBots: before.liveBots, press: before.press, offCause: before.control }));

      // ── the dry run ──
      const dry = runOps(SUNSET_SCRIPT, []);
      const afterDry = await w.dal.houseBotControlStore.get();
      ok("ops.sunset.dry · the dry run writes NOTHING and prints the exact census the compliance row will carry — bots by status, live intents, active targets, and the open house money per market with its total",
        dry.code === 0 && afterDry.offCause === before.control && /NOTHING WRITTEN/.test(dry.out)
        && /open house money/.test(dry.out) && /live intents/.test(dry.out) && /active targets/.test(dry.out)
        && (await w.dal.houseBotStore.listNonRemoved()).length === before.liveBots,
        dry.out.split("\n").filter((l) => /open house money|live intents/.test(l)).map((l) => l.trim()).join(" | "));
      const noReason = runOps(SUNSET_SCRIPT, ["--apply"]);
      ok("ops.sunset.8p · --apply with no --reason is refused (exit 2) and writes nothing",
        noReason.code === 2 && (await w.dal.houseBotControlStore.get()).offCause === before.control, `exit ${noReason.code}`);

      // ── the real thing ──
      const REASON = "board-decision-2026-09-20";
      const applied = runOps(SUNSET_SCRIPT, ["--apply", "--reason", REASON], { OPS_OFFICER_ID: OFFICER });
      const after = {
        control: await w.dal.houseBotControlStore.get(),
        liveBots: (await w.dal.houseBotStore.listNonRemoved()).length,
        sunsetEvents: await n(`SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE "kind" = 'SUNSET'`),
        removedEvents: await n(`SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE "kind" = 'REMOVED'`),
        targetEndedEvents: await n(`SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE "kind" = 'TARGET_ENDED'`),
        audits: await n(`SELECT count(*)::int AS "n" FROM "AuditLog" WHERE "action" = 'house_bot.sunset'`),
        notifications: await w.db.notification.countUnread(OFFICER),
        openMarked: await n(`SELECT count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL AND "status"::text = 'OPEN'`),
        markedRows: await n(`SELECT count(*)::int AS "n" FROM "Position" WHERE "houseBotId" IS NOT NULL`),
      };
      const sunsetBot = await w.dal.houseBotStore.get(bot.botId);
      const alreadyBot = await w.dal.houseBotStore.get(already.botId);
      const endedTarget = await w.dal.targetStore.get(target.id);
      const vetoedTarget = await w.dal.targetStore.get(vetoed.id);
      const intentAfter = await w.dal.houseBotIntentStore.get(liveIntent.id);

      ok("ops.sunset.1 · ⛔ BLOCKER 1's CASE · --apply on an ALREADY-OFF desk writes offCause='SUNSET' — switchOff() would have matched nothing here and left the roster stripped with no terminal marker",
        applied.code === 0 && after.control.offCause === "SUNSET" && after.control.enabled === false && before.control !== "SUNSET",
        `exit ${applied.code} · ${before.control} → ${after.control.offCause}`);
      ok("ops.sunset.3 · every non-REMOVED account is REMOVED with cause SUNSET and its live intents cancelled",
        after.liveBots === 0 && sunsetBot.status === "REMOVED" && sunsetBot.removedCause === "SUNSET"
        && intentAfter.status === "CANCELLED", j({ liveBots: after.liveBots, cause: sunsetBot.removedCause, intent: intentAfter.status }));
      ok("ops.sunset.4 · every ACTIVE target is ENDED with endCause SUNSET, and each one gets EXACTLY ONE TARGET_ENDED event — endAllForBot writes NO event in either twin, so a caller that trusted it would end every target in silence",
        endedTarget.status === "ENDED" && endedTarget.endCause === "SUNSET"
        && after.targetEndedEvents === before.targetEndedEvents + 1,
        j({ target: endedTarget.endCause, events: [before.targetEndedEvents, after.targetEndedEvents] }));
      ok("ops.sunset.4c · CONTROL · the target already ENDED(VETOED) was NOT re-ended and got NO event — which is what proves the +1 above is the ACTIVE one and not 'every target that exists'",
        vetoedTarget.endCause === "VETOED" && after.targetEndedEvents === before.targetEndedEvents + 1, j({ vetoed: vetoedTarget.endCause }));
      // ⛔ THE DELTA IS THE POPULATION, NOT A ONE: by this point the world holds several live accounts, so
      // "exactly one REMOVED event" would have been an assumption about the fixture rather than about the act.
      const alreadyEvents = await n(`SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE "kind" = 'REMOVED' AND "houseBotId" = '${already.botId}'`);
      ok("ops.sunset.3c · CONTROL · EXACTLY ONE REMOVED event per account that was still live — and the account already REMOVED(MANUAL) keeps its own cause and receives NONE, which is what proves the delta counts the act and not the table",
        alreadyBot.removedCause === "MANUAL" && alreadyEvents === 0
        && after.removedEvents === before.removedEvents + before.liveBots && before.liveBots > 1,
        j({ already: alreadyBot.removedCause, eventsForAlready: alreadyEvents, removedEvents: [before.removedEvents, after.removedEvents], liveAtStart: before.liveBots }));
      ok("ops.sunset.5 · EXACTLY ONE global SUNSET event with no houseBotId, EXACTLY ONE house_bot.sunset compliance row, and EXACTLY ONE admin alert for the whole wind-down — never one bell per account",
        after.sunsetEvents === before.sunsetEvents + 1 && after.audits === before.audits + 1
        && after.notifications === before.notifications + 1
        && (await rows(`SELECT "houseBotId" FROM "HouseBotEvent" WHERE "kind" = 'SUNSET'`))[0].houseBotId === null,
        j({ sunsetEvents: after.sunsetEvents, audits: after.audits, alerts: [before.notifications, after.notifications] }));

      const auditRow = (await rows(`SELECT "payload"::text AS "payload" FROM "AuditLog" WHERE "action" = 'house_bot.sunset' ORDER BY "createdAt" DESC LIMIT 1`))[0];
      const payload = JSON.parse(auditRow.payload) as Record<string, unknown>;
      const C: Any = await import("../../src/lib/house-bot/constants.ts");
      ok("ops.sunset.10 · the compliance payload carries the census keys — bots, cancelled, openExposureByMarket — plus the eventId every other house audit row links by, and it PASSES isAllowedHouseAuditPayload",
        C.isAllowedHouseAuditPayload(payload)
        && ["bots", "cancelled", "openExposureByMarket", "eventId"].every((k) => k in payload)
        && Object.keys(payload).length === 4, j(Object.keys(payload)));
      ok("ops.sunset.9 · ⛔ THE OFFICER'S FREE TEXT IS ON THE EVENT ROW AND ON THE ACCOUNT, AND IN NO AUDIT PAYLOAD — the chain cannot be rewritten, so a holder's name typed into a reason box would outlive that holder's own erasure; erasure CAN reach both of the places it does live",
        !JSON.stringify(payload).includes(REASON) && !("reason" in payload)
        && (await rows(`SELECT "reason" FROM "HouseBotEvent" WHERE "kind" = 'SUNSET' ORDER BY "createdAt" DESC LIMIT 1`))[0].reason === REASON
        && sunsetBot.removedReason === REASON,
        j({ inPayload: JSON.stringify(payload).includes(REASON), onEvent: true, onAccount: sunsetBot.removedReason }));

      const pressAfter = await w.dal.pressStore.get(press.id);
      ok("ops.sunset.6 · ⛔ NO press row is touched: the QUEUED press over the cancelled intent is still QUEUED",
        pressAfter.state === "QUEUED", j({ state: pressAfter.state }));
      const swept = await w.dal.pressStore.doneTerminalQueued();
      const pressSwept = await w.dal.pressStore.get(press.id);
      ok("ops.sunset.6p · POSITIVE CONTROL · …and the planner's own sweep DOES move it to DONE — so 'untouched' is a measured difference and not a row nothing could reach (TGT-31)",
        swept.includes(press.id) && pressSwept.state === "DONE", j({ swept: swept.length, state: pressSwept.state }));

      ok("ops.sunset.11 · ⛔ NOTHING IS VOIDED, REFUNDED OR CASHED OUT: the open marked positions are unchanged in count and still OPEN, and the all-time marked-row count did not move — open house money settles normally, because a pari-mutuel pool cannot void one position",
        after.openMarked === before.openMarked && after.markedRows === before.markedRows && before.openMarked > 0,
        j({ openMarked: [before.openMarked, after.openMarked], markedRows: [before.markedRows, after.markedRows] }));

      const refusedOn = await sw.switchOnHouseBots({ actorId: OFFICER, reason: null });
      ok("ops.sunset.2 · after the sunset switchOnHouseBots answers { ok:false, code:'WITHDRAWN' } — the terminal marker proved by the refusal it produces rather than by the column it wrote",
        refusedOn.ok === false && refusedOn.code === "WITHDRAWN", j(refusedOn));

      const second = runOps(SUNSET_SCRIPT, ["--apply", "--reason", "second-run-an-hour-later"], { OPS_OFFICER_ID: OFFICER });
      const end = {
        sunsetEvents: await n(`SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE "kind" = 'SUNSET'`),
        removedEvents: await n(`SELECT count(*)::int AS "n" FROM "HouseBotEvent" WHERE "kind" = 'REMOVED'`),
        audits: await n(`SELECT count(*)::int AS "n" FROM "AuditLog" WHERE "action" = 'house_bot.sunset'`),
        notifications: await w.db.notification.countUnread(OFFICER),
      };
      ok("ops.sunset.7 · a second --apply changes 0 rows in all six groups — no second event, no second compliance row, no second alert — and exits 0, which is what makes a half-finished run safe to repeat",
        second.code === 0 && /Already retired/.test(second.out)
        && end.sunsetEvents === after.sunsetEvents && end.removedEvents === after.removedEvents
        && end.audits === after.audits && end.notifications === after.notifications,
        `exit ${second.code} · ${j(end)}`);
      ok("ops.sunset.next · …and the script tells the officer the SECOND act and the third: commit houseBots:\"WITHDRAWN\" and deploy, then watch the open marked positions reach 0 on their own",
        /feature-state/.test(applied.out) && /ops:house-bots-status/.test(applied.out) && /settle on their own/.test(applied.out),
        applied.out.split("\n").filter((l) => /WITHDRAWN|settle on their own/.test(l)).slice(0, 3).map((l) => l.trim()).join(" | "));
    } finally {
      await cx.end().catch(() => {});
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §store · the child runs on the store it names — so a memory-only green can never be read as a
// Postgres green.
// ═══════════════════════════════════════════════════════════════════════════════════════════
section("§store · the backend is named, and it is the one that answered");
await guard("store", async () => {
  const P: Any = await import("../../src/lib/server/prisma.ts");
  ok(`ops.suite.0 · the ${STORE} child ${STORE === "postgres" ? "has" : "has no"} database, and says so`,
    P.hasDatabase() === (STORE === "postgres"),
    `HB_MONEY_STORE=${STORE} · DATABASE_URL ${process.env.DATABASE_URL ? "set" : "empty"} · USE_PRISMA_DAL=${process.env.USE_PRISMA_DAL ?? "unset"} · hasDatabase=${P.hasDatabase()}`);
});

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
