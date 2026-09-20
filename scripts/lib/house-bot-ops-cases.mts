/**
 * THE HOUSE-BOT OPS CASE LIST — the lane that owns the four Commit-7 ops scripts (A9, S3, F2).
 *
 *   npm run test:house-bot-ops      (both stores, through db-scratch)
 *   npm run red:house-bot-ops       (the planted controls only, in process, writing nothing)
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
 * ⚠️ THE SCANNER MUST NOT MEASURE ITSELF. This file necessarily contains the very strings it hunts
 * (a planted `UPDATE … SET "houseBotId"`, a planted `switchOnHouseBots` import). They all live in ONE
 * marked region, that region is stripped from this file's body before any scan, and `ops.pop.self`
 * asserts the strip removed characters and that a planted sample is present in the raw file and absent
 * from the stripped one. Without it this suite would report itself as the second marker writer on the
 * day it was born — a scanner measuring itself, `0.250.c0`'s recorded failure.
 *
 * ⛔ NOTHING IN THIS FILE TOUCHES THE DISK. `red:house-bot-ops` is the in-process red class
 * (`red-anchors.test.mts` §4): the command carries `--prove-red` and the script contains no
 * file-writing call, so it declares no disk anchors and leaves the anchors ratchet alone. A red
 * harness that rewrites the repo while a second lane is editing it is the standing incident.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./decomment.mts";
import { REPO_ROOT, scriptFiles } from "./tracked-files.mts";

type Any = any;
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
const PROVE_RED = process.argv.includes("--prove-red");
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = ""): void => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} [${PROVE_RED ? "red" : STORE}] ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string): void => console.log(`\n[${PROVE_RED ? "red" : STORE}] ${t}`);
const j = (v: unknown): string => JSON.stringify(v) ?? String(v);
const read = (rel: string): string => readFileSync(join(REPO_ROOT, rel), "utf8");
async function guard(label: string, fn: () => Promise<void> | void): Promise<void> {
  try { await fn(); } catch (e) { ok(`${label} · threw`, false, String((e as Error)?.stack ?? e).split("\n").slice(0, 3).join(" | ")); }
}

const SELF = "scripts/lib/house-bot-ops-cases.mts";
/** Built by concatenation so the marker text itself occurs exactly where the marker is. */
const P_START = "@ops-planted" + ":start", P_END = "@ops-planted" + ":end";

/** A file's source as the scanners read it: comments stripped, and this file's planted region removed. */
const bodyCache = new Map<string, string>();
function bodyOf(rel: string): string {
  const hit = bodyCache.get(rel);
  if (hit !== undefined) return hit;
  // ⛔ THE STRIP HAPPENS BEFORE THE COMMENT PASS, not after: the region markers live in comments, and
  // decommenting first deletes them, which silently turns the strip into a no-op that reports 0 characters
  // removed. That is exactly how this control failed on its first run — and why it is an assertion.
  const raw = read(rel);
  const a = raw.indexOf(P_START), b = raw.indexOf(P_END);
  const out = decomment(rel === SELF && a >= 0 && b > a ? `${raw.slice(0, a)}${raw.slice(b)}` : raw);
  bodyCache.set(rel, out);
  return out;
}

/**
 * The OPS population: every script a package.json `ops:` key runs, plus every `scripts/ops-*` file
 * whether or not a key names it — so an ops script cannot escape by having no key yet. ⛔ DERIVED, never
 * a typed list: a folder somebody remembered to look in is not a population.
 */
export function opsPopulation(pkgScripts: Record<string, string>, files: readonly string[]): { files: string[]; keys: string[]; unresolved: string[] } {
  const keys = Object.keys(pkgScripts).filter((k) => k.startsWith("ops:")).sort();
  const out = new Set<string>();
  const unresolved: string[] = [];
  for (const k of keys) {
    const m = /(?:tsx|node|ts-node)\s+(\S+\.(?:mts|mjs|cjs|ts|js))/.exec(pkgScripts[k]);
    if (!m || !m[1].startsWith("scripts/")) continue;
    if (existsSync(join(REPO_ROOT, m[1]))) out.add(m[1]); else unresolved.push(`${k} -> ${m[1]}`);
  }
  for (const f of files) if (/^scripts\/ops-[^/]*\.(m?ts|[cm]?js)$/.test(f)) out.add(f);
  return { files: [...out].sort(), keys, unresolved };
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
// The checkers. Pure: a file body in, the offending sites out. Every one of them is run twice —
// over the real tree, and over a planted body that must be reported.
// ═══════════════════════════════════════════════════════════════════════════════════════════

export type MarkerUpdate = { line: number; target: string; set: string };

/**
 * Every `UPDATE <table> … SET <assignments>` in `code` whose SET CLAUSE names `houseBotId`.
 *
 * ⛔ THE SET CLAUSE, NOT THE STATEMENT. `world.backdate` writes
 * `UPDATE "Position" SET "placedAt" = … WHERE "houseBotId" IS NOT NULL` — a marker in the WHERE is a
 * FILTER and harms nothing; a marker in the SET is a write. A detector that matched the statement
 * would report four innocent fixtures and get switched off, which is worse than not having it.
 * The clause ends at the first WHERE, RETURNING, FROM, `;` or template backtick, so
 * `UPDATE "Transaction" t SET "houseBotId" = p."houseBotId" FROM "Position" p …` — the shape the
 * remark script will carry — is read on its SET half and reported.
 */
export function markerUpdateSites(code: string): MarkerUpdate[] {
  const out: MarkerUpdate[] = [];
  for (const m of code.matchAll(/\bUPDATE\b/gi)) {
    const at = m.index ?? 0;
    const head = code.slice(at, at + 600);
    const set = /\bSET\b/i.exec(head);
    if (!set || set.index > 120) continue; // `UPDATE "T" alias SET` — anything longer is prose, not a statement
    const rest = head.slice(set.index + 3);
    const stop = /\bWHERE\b|\bRETURNING\b|\bFROM\b|;|`/i.exec(rest);
    const clause = stop ? rest.slice(0, stop.index) : rest;
    if (!/houseBotId/.test(clause)) continue;
    out.push({
      line: code.slice(0, at).split("\n").length,
      target: head.slice(0, set.index).replace(/\s+/g, " ").trim().slice(0, 60),
      set: clause.replace(/\s+/g, " ").trim().slice(0, 90),
    });
  }
  return out;
}

/**
 * Every `.update(…)` / `.updateMany(…)` call whose arguments name `houseBotId` — the SECOND shape, and
 * it is measured rather than assumed. Both store twins DISCARD `houseBotId` from an update patch
 * (`test:dal-parity` §8), so a call like this writes nothing; it is tracked because "writes nothing"
 * is a property of the DAL that a future edit could remove, and because an unmeasured second shape is
 * how the first one escapes.
 */
export function ormMarkerUpdates(code: string): number[] {
  const out: number[] = [];
  for (const m of code.matchAll(/\.\s*(?:update|updateMany)\s*\(/g)) {
    const at = m.index ?? 0;
    if (!/houseBotId/.test(argumentsOf(code, at + m[0].length - 1))) continue;
    out.push(code.slice(0, at).split("\n").length);
  }
  return out;
}

/**
 * The text inside the balanced parentheses opening at `open`.
 *
 * ⛔ NOT A PROXIMITY WINDOW, AND THE FIRST DRAFT PROVED WHY. It read 400 characters after the call and
 * reported two innocent files: `dsar-export-secrets.test.mts`, where `houseBotId` belongs to a LATER
 * statement, and this very file. A window measures nearness; the claim is about the ARGUMENTS. A guard
 * that cries wolf gets switched off, which is worse than not having it.
 */
function argumentsOf(code: string, open: number): string {
  let depth = 0;
  for (let i = open; i < code.length && i < open + 4000; i++) {
    const c = code[i];
    if (c === "(") depth++;
    else if (c === ")") { depth--; if (depth === 0) return code.slice(open + 1, i); }
  }
  return code.slice(open + 1, Math.min(code.length, open + 4000));
}

/** Every `UPDATE … SET` clause that sets an `enabled` column true. */
export function enabledTrueUpdates(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/\bUPDATE\b/gi)) {
    const at = m.index ?? 0;
    const head = code.slice(at, at + 600);
    const set = /\bSET\b/i.exec(head);
    if (!set || set.index > 120) continue;
    const rest = head.slice(set.index + 3);
    const stop = /\bWHERE\b|\bRETURNING\b|\bFROM\b|;|`/i.exec(rest);
    const clause = stop ? rest.slice(0, stop.index) : rest;
    if (/"?\benabled\b"?\s*=\s*(?:true|TRUE|'t')/.test(clause)) out.push(clause.replace(/\s+/g, " ").trim().slice(0, 80));
  }
  return out;
}

/** Tokens that mean "this file knows about the master switch's row". */
const HOUSE_CONTROL_TOKENS = /HouseBotControl|houseBotControlStore|HOUSE_CONTROL_ID/;
/** Tokens that mean "this file is about house bots at all". */
export const HOUSE_TOKENS = /houseBots?|HouseBot|house-bot/;

/**
 * Everything in `code` that could turn the master switch ON. Four shapes, because there are four ways
 * to write it: the service, the DAL member, raw SQL, and an ORM patch on the control row.
 * ⛔ This is a LAW, not a lint: the owner alone turns house bets on.
 */
export function switchOnSites(code: string): string[] {
  const out: string[] = [];
  if (/\bswitchOnHouseBots\b/.test(code)) out.push("switchOnHouseBots()");
  if (/\.\s*switchOn\s*\(/.test(code)) out.push(".switchOn(");
  for (const s of enabledTrueUpdates(code)) out.push(`SET ${s}`);
  if (HOUSE_CONTROL_TOKENS.test(code) && /\benabled\s*:\s*true\b/.test(code)) out.push("enabled: true on the house control row");
  return out;
}

/**
 * ON-shaped command-line flags. ⚠️ SCOPED TO HOUSE OPS SCRIPTS ON PURPOSE, and the scope is the claim:
 * `scripts/ops-updown-profile.mts` takes a legitimate `--enabled`, and a detector that reported it
 * would be reporting the wrong population. The house subset is EMPTY today and its size is printed;
 * the detector is proved by its planted controls until the first house ops script lands in it.
 */
export function onFlagSites(code: string): string[] {
  return [...new Set([...code.matchAll(/--(?:on|enable|enabled|switch-on|turn-on)\b/g)].map((m) => m[0]))];
}

/**
 * The old-build control's exemption, ASSERTED rather than assumed: its planted marker sits between a
 * `BEGIN` and a `ROLLBACK`, with no `COMMIT` in between. ⛔ An exemption without this is a hole with a
 * comment on it — the file would be free to start committing the marker and the allowlist would keep
 * saying it was fine.
 */
export function rollbackGuarded(code: string, site: MarkerUpdate): { begin: boolean; rollback: boolean; commitBetween: boolean } {
  const lines = code.split("\n");
  const before = lines.slice(0, site.line - 1).join("\n");
  const after = lines.slice(site.line).join("\n");
  const rollbackAt = /\bROLLBACK\b/.exec(after);
  const commitAt = /\bCOMMIT\b/.exec(after);
  return {
    begin: /\bBEGIN\b/.test(before.slice(-600)),
    rollback: rollbackAt !== null,
    commitBetween: commitAt !== null && (rollbackAt === null || commitAt.index < rollbackAt.index),
  };
}

export type PopulationAudit = { scanned: number; offenders: string[]; detail: Array<{ file: string; sites: unknown[] }>; refused: string | null };

/**
 * Run one checker over one population. ⛔ A POPULATION BELOW ITS FLOOR IS A REFUSAL, NOT A CLEAN RUN:
 * the audit returns a reason instead of an empty offender list, so "nothing was found" can never be
 * produced by "nothing was searched".
 */
export function auditPopulation(files: readonly string[], body: (rel: string) => string, find: (code: string) => unknown[], floor: number): PopulationAudit {
  const detail: Array<{ file: string; sites: unknown[] }> = [];
  for (const rel of files) {
    const sites = find(body(rel));
    if (sites.length) detail.push({ file: rel, sites });
  }
  return {
    scanned: files.length,
    offenders: detail.map((d) => d.file),
    detail,
    refused: files.length < floor ? `population of ${files.length} is below the floor of ${floor} — a checker over nothing reports nothing` : null,
  };
}

const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

// ═══════════════════════════════════════════════════════════════════════════════════════════
// The allowlists. ⛔ NAMES, NEVER COUNTS — a ratchet on a number can be satisfied by deleting an
// unrelated line. Compared as a SET in BOTH directions, so a new offender and a stale exemption
// are each reported.
// ═══════════════════════════════════════════════════════════════════════════════════════════

/** The only files under `scripts/` allowed to carry a raw `houseBotId` UPDATE, and why. */
export const MARKER_UPDATE_EXEMPT: ReadonlyArray<{ file: string; why: string }> = [
  {
    file: "scripts/house-bot-migrations-old-build.mts",
    why: "c.4c's CONTROL plants one marker so the 'every old-build row left the markers NULL' count is known not to be blind. It is wrapped in BEGIN … ROLLBACK and asserted to be, by ops.pop.2.",
  },
  // ⭐ THE SECOND ENTRY ARRIVES WITH THE REMARK SCRIPT (plan step 5, scripts/ops-house-bots-remark.mts):
  // the single sanctioned NULL-filling exception. It is not listed yet because it does not exist yet,
  // and an allowlist entry written before its file is an exemption for a file nobody has read.
];

/** The only files under `scripts/` allowed to name `houseBotId` in an ORM update call, and why. */
export const ORM_MARKER_EXEMPT: ReadonlyArray<{ file: string; why: string }> = [
  {
    file: "scripts/lib/house-bot-dal-cases.mts",
    why: "c21 calls db.txn.update with houseBotId precisely to prove BOTH twins DROP it. Removing this call would remove the proof, not the risk.",
  },
];

/* @ops-planted:start
 * ⛔ THE PLANTED CONTROLS. Each body is a shape the REAL code could contain — the remark script's own
 * statement, a direct-pg OFF script that turned the switch back on, the old-build control with its
 * ROLLBACK deleted — never a straw man. They live in one region because this file is itself inside the
 * population it scans, and `bodyOf` removes exactly this region before any scan (ops.pop.self). */
const PLANTED = {
  /** The remark script's own UPDATE, which MUST be reported until its file joins the allowlist. */
  rawTxnMarker: 'await c.query(`UPDATE "Transaction" t SET "houseBotId" = p."houseBotId" FROM "Position" p WHERE t."positionId" = p."id" AND t."houseBotId" IS NULL`);',
  /** The corruption the whole gate exists to prevent: the marker written onto the POSITION. */
  rawPositionMarker: 'await c.query(`UPDATE "Position" SET "houseBotId" = $1 WHERE "id" = $2`);',
  /** A marker in the WHERE only — a filter, not a write. MUST NOT be reported. */
  benignFilter: 'await c.query(`UPDATE "Position" SET "placedAt" = now() WHERE "houseBotId" IS NOT NULL`);',
  /** The ORM shape. */
  ormMarker: 'await db.txn.update(id, { houseBotId: bot.id, description: "repair" });',
  /** An ORM update with no marker. MUST NOT be reported. */
  benignOrm: 'await db.txn.update(id, { description: "repair" });',
  /** An ops script that reached for the service that turns house bets on. */
  switchOnImport: 'import { switchOnHouseBots } from "../src/lib/server/house-bot/switch-on";\nawait switchOnHouseBots({ actorId, reason: null });',
  /** The same law evaded through the DAL member. */
  switchOnDal: 'await houseBotControlStore.switchOn({ byId: officerId, reason: null });',
  /** The same law evaded in raw SQL. */
  switchOnSql: 'await c.query(`UPDATE "HouseBotControl" SET "enabled" = true WHERE "id" = \'global\'`);',
  /** The same law evaded through an ORM patch on the control row. */
  switchOnOrm: 'await prisma.houseBotControl.update({ where: { id: HOUSE_CONTROL_ID }, data: { enabled: true } });',
  /** An ops script that offered an ON switch on the command line. */
  onFlag: 'const ON = process.argv.includes("--on"); // houseBots\nif (ON) console.log("house bots on");',
  /** A house ops script with only the sanctioned direction. MUST NOT be reported. */
  offOnly: 'const APPLY = process.argv.includes("--apply"); // houseBots\nawait c.query(`UPDATE "HouseBotControl" SET "enabled" = false WHERE "id" = \'global\' AND "enabled" = true`);',
  /** A NON-house ops script with a legitimate --enabled flag. MUST NOT be reported by the flag rule. */
  benignFlag: 'const only = process.argv.includes("--enabled");',
};
/* @ops-planted:end */

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §R · red mode — every planted control, in process, writing nothing.
// ═══════════════════════════════════════════════════════════════════════════════════════════

type RedCase = { label: string; caught: boolean; saw: string };

/**
 * Each planted mutation and the assertion it must redden. Returned so the SUITE runs them too — a red
 * proof that only runs under its own flag is a proof nobody re-runs.
 */
let redMemo: RedCase[] | null = null;
export function redCases(): RedCase[] {
  if (redMemo) return redMemo;
  const cases: RedCase[] = [];
  const add = (label: string, caught: boolean, saw: unknown) => cases.push({ label, caught, saw: j(saw) });

  const empty = auditPopulation([], bodyOf, markerUpdateSites, 400);
  add("ops.pop.0 · an EMPTY population is REFUSED, not reported clean", empty.refused !== null && empty.offenders.length === 0, empty.refused);
  const short = auditPopulation(["scripts/db-scratch.mts"], bodyOf, markerUpdateSites, 400);
  add("ops.pop.0 · a population of ONE is refused by the same floor", short.refused !== null, short.refused);

  add("ops.pop.1 · a planted raw marker write on the LEDGER table is reported — the remark script’s own statement", markerUpdateSites(PLANTED.rawTxnMarker).length === 1, markerUpdateSites(PLANTED.rawTxnMarker));
  add("ops.pop.1 · a planted raw marker write on the POSITION table is reported — the corruption this gate exists to prevent", markerUpdateSites(PLANTED.rawPositionMarker).length === 1, markerUpdateSites(PLANTED.rawPositionMarker));
  add("ops.pop.1 · CONTROL · a marker in the WHERE only is NOT reported", markerUpdateSites(PLANTED.benignFilter).length === 0, markerUpdateSites(PLANTED.benignFilter));
  add("ops.pop.1b · a planted ORM update carrying houseBotId is reported", ormMarkerUpdates(PLANTED.ormMarker).length === 1, ormMarkerUpdates(PLANTED.ormMarker));
  add("ops.pop.1b · CONTROL · an ORM update with no marker is NOT reported", ormMarkerUpdates(PLANTED.benignOrm).length === 0, ormMarkerUpdates(PLANTED.benignOrm));

  {
    const real = bodyOf(MARKER_UPDATE_EXEMPT[0].file);
    const site = markerUpdateSites(real)[0];
    const stripped = real.split("\n").filter((l) => !/\bROLLBACK\b/.test(l)).join("\n");
    const mutated = markerUpdateSites(stripped)[0];
    add("ops.pop.2 · the exempt file with its ROLLBACK deleted is reported",
      site !== undefined && rollbackGuarded(real, site).rollback === true
      && mutated !== undefined && rollbackGuarded(stripped, mutated).rollback === false,
      { real: site ? rollbackGuarded(real, site) : null, mutated: mutated ? rollbackGuarded(stripped, mutated) : null });
    const committed = real.replace(/ROLLBACK/, "COMMIT");
    const cSite = markerUpdateSites(committed)[0];
    add("ops.pop.2 · …and with its ROLLBACK turned into a COMMIT it is reported",
      cSite !== undefined && rollbackGuarded(committed, cSite).commitBetween === true, cSite ? rollbackGuarded(committed, cSite) : null);
  }

  add("ops.pop.3 · a planted import of switchOnHouseBots is reported", switchOnSites(PLANTED.switchOnImport).length >= 1, switchOnSites(PLANTED.switchOnImport));
  add("ops.pop.3 · a planted DAL switchOn call is reported", switchOnSites(PLANTED.switchOnDal).length >= 1, switchOnSites(PLANTED.switchOnDal));
  add("ops.pop.3 · a planted raw `\"enabled\" = true` is reported", switchOnSites(PLANTED.switchOnSql).length >= 1, switchOnSites(PLANTED.switchOnSql));
  add("ops.pop.3 · a planted ORM `enabled: true` on the control row is reported", switchOnSites(PLANTED.switchOnOrm).length >= 1, switchOnSites(PLANTED.switchOnOrm));
  add("ops.pop.3 · CONTROL · the sanctioned OFF direction is NOT reported", switchOnSites(PLANTED.offOnly).length === 0, switchOnSites(PLANTED.offOnly));
  add("ops.pop.3f · a planted `--on` flag on a house ops script is reported", onFlagSites(PLANTED.onFlag).length >= 1 && HOUSE_TOKENS.test(PLANTED.onFlag), onFlagSites(PLANTED.onFlag));
  add("ops.pop.3f · CONTROL · a non-house ops script's `--enabled` is outside the scope", !HOUSE_TOKENS.test(PLANTED.benignFlag), onFlagSites(PLANTED.benignFlag));

  {
    // ⭐ THE POSITIVE CONTROL THIS LANE LEARNED THE HARD WAY: prove the walker really OPENED files.
    const pop = scriptFiles();
    const known = "scripts/db-scratch.mts";
    add("ops.pop.walk · the walker's population contains a known file and the read path really opens it",
      pop.includes(known) && bodyOf(known).includes("const PORT = 5433;"), { population: pop.length, known });
    add("ops.pop.self · the planted region is stripped from THIS file before any scan",
      read(SELF).includes(PLANTED.rawPositionMarker) && !bodyOf(SELF).includes(PLANTED.rawPositionMarker)
      && bodyOf(SELF).length < decomment(read(SELF)).length,
      { strippedChars: decomment(read(SELF)).length - bodyOf(SELF).length });
  }
  redMemo = cases;
  return cases;
}

if (PROVE_RED) {
  section("red:house-bot-ops · every planted control, in process, nothing written");
  const cases = redCases();
  for (const c of cases) console.log(`${c.caught ? "SEEN RED" : "NOT CAUGHT"}  ${c.label} — ${c.saw}`);
  const missed = cases.filter((c) => !c.caught);
  console.log(`\n@@RED ${j({ planted: cases.length, caught: cases.length - missed.length, missed: missed.map((m) => m.label) })}`);
  process.exit(missed.length === 0 ? 0 : 1);
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

    const known = ["scripts/db-scratch.mts", "scripts/house-bot-migrations-old-build.mts"] as const;
    ok("ops.pop.0p · POSITIVE CONTROL · the walker really OPENED files: two known scripts are in the population and a known string in each is found through the SAME read path the checkers use",
      known.every((f) => pop.includes(f)) && bodyOf(known[0]).includes("const PORT = 5433;") && bodyOf(known[1]).includes("hb_control"),
      j(known.map((f) => ({ f, inPopulation: pop.includes(f) }))));

    ok("ops.pop.self · CONTROL · this file's planted region is stripped before it is scanned, so the gate never reports ITSELF as the marker writer",
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
