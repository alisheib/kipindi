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
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./decomment.mts";
import { REPO_ROOT, scriptFiles } from "./tracked-files.mts";
// ⛔ PURE MODULES ONLY AT THE TOP OF THIS FILE — `--prove-red` runs it with no database and no store chosen.
// `feed-copy.ts` imports `./constants` and nothing else; the operator sentences are READ from it here for the
// same reason the scripts import them: a suite that re-typed the sentence it checks would pass forever.
import { SWITCH_OFF_COPY } from "../../src/lib/house-bot/feed-copy.ts";

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

/**
 * Every string literal in `code` that CARRIES one of `values` — an operator sentence re-typed instead of
 * imported. ⛔ NOT A STYLE COMPLAINT. `feed-copy.ts` is the one home for what an operator is told; a
 * re-typed copy goes stale in silence the day the original is edited, and an incident then has two
 * products' words in it. The comparison is `includes`, so a sentence wrapped in a longer literal is caught.
 */
export function copyLiteralLeaks(code: string, values: readonly string[]): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) {
    const text = m[2].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\'/g, "'");
    if (values.some((v) => text.includes(v))) out.push(text.slice(0, 90));
  }
  return out;
}

/**
 * Anything that would make a script WAIT for a lock. ⛔ A9's whole purpose is that the terminal OFF takes
 * NONE: H4 re-reads the control row inside each bet's own lock, so a committed OFF already binds every bet
 * not yet holding `house:control`, while taking the lock first would let one hung bet hold the switch open
 * for the transaction timeout — the stall the script exists to remove.
 */
export function advisoryLockSites(code: string): string[] {
  return [...new Set([...code.matchAll(/\bpg_advisory_(?:xact_)?lock\w*|\bdrainLock\b|\bwithLock\b|\bHOUSE_CONTROL_LOCK\b/g)].map((m) => m[0]))];
}

/**
 * A provider hostname typed into the source. ⛔ `ops-preflight-notification-idx.mts` pins one proxy host and
 * forces SSL, which makes it refuse a plain local Postgres — so it can never be rehearsed anywhere but
 * production, and it goes wrong in silence the day the proxy moves.
 */
export function hardcodedHostSites(code: string): string[] {
  return [...new Set([...code.matchAll(/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:rlwy\.net|railway\.app)(?::\d+)?/gi)].map((m) => m[0]))];
}

/** The connection's SSL decision: by HOST (rehearsable), or forced (production-only). */
export function sslByHost(code: string): { byHost: boolean; forced: boolean } {
  return {
    byHost: /ssl\s*:\s*isLocal\s*\?/.test(code) && /\bisLocal\b\s*=/.test(code),
    forced: /ssl\s*:\s*\{\s*rejectUnauthorized/.test(code),
  };
}

/**
 * Anything that would write a compliance row. ⛔ D-OPS-2: `audit()` HMAC-chains its entry under a
 * database-wide advisory lock after reading the true chain head, so a hand-written `AuditLog` INSERT from a
 * direct-pg script BREAKS the one artefact whose purpose is to prove nothing was rewritten.
 */
export function auditWriteSites(code: string): string[] {
  const out: string[] = [];
  // ⛔ TWO SHAPES, TWO SCOPES, AND THE SCOPE IS PART OF THE CLAIM. Raw SQL always LIVES in a string, so the
  // INSERT is hunted over the whole body. A CALL never does — and the first draft of this detector reported
  // the OFF script's own screen sentence, which says the word `audit()` to explain why it writes none. A
  // detector that reddens the file for EXPLAINING the rule gets switched off, which is worse than not having
  // it. So the call shape is hunted over the body with every string literal blanked out.
  for (const m of code.matchAll(/INSERT\s+INTO\s+"?AuditLog"?/gi)) out.push(m[0].replace(/\s+/g, " "));
  const code_ = withoutStringLiterals(code);
  for (const m of code_.matchAll(/\baudit\s*\(/g)) out.push(`${m[0]} at line ${code_.slice(0, m.index ?? 0).split("\n").length}`);
  return out;
}

/** The same source with every string literal's CONTENTS blanked, newlines kept so line numbers still hold. */
export function withoutStringLiterals(code: string): string {
  return code.replace(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g, (whole, q: string, body: string) => `${q}${body.replace(/[^\n]/g, " ")}${q}`);
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
  /** The OFF script with an operator sentence RE-TYPED instead of imported — the shape that goes stale in silence. */
  offCopyTyped: 'console.log("House bots are off. No bot will place a bet.");',
  /** The same sentence, imported. MUST NOT be reported. */
  offCopyImported: "console.log(SWITCH_OFF_COPY.DRAINED);",
  /** The OFF script reaching for the lock A9 exists to avoid. */
  advisoryLock: "await c.query(`SELECT pg_advisory_lock(hashtext('house:control'))`);",
  /** The same write with no lock at all. MUST NOT be reported. */
  noLock: "await c.query(OFF_UPDATE_SQL, [CAUSE, OFFICER, REASON, HOUSE_CONTROL_ID]);",
  /** `ops-preflight-notification-idx.mts`'s hardcoded proxy rewrite — unrehearsable anywhere but production. */
  proxyRewrite: 'const url = (process.env.DATABASE_URL || "").replace(/@postgres\\.railway\\.internal(:\\d+)?/, "@turntable.proxy.rlwy.net:40357");\nconst c = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });',
  /** `ops-preflight-ai-cycles.mts`'s split, with no host typed in. MUST NOT be reported. */
  hostFree: 'const isLocal = /127[.]0[.]0[.]1/.test(url);\nconst c = new Client({ connectionString: url, ssl: isLocal ? undefined : { rejectUnauthorized: false } });',
  /** The chain broken by hand — D-OPS-2's exact failure. */
  auditInsert: 'await c.query(`INSERT INTO "AuditLog" ("id", "category", "action") VALUES ($1, $2, $3)`, [id, cat, act]);',
  /** The same failure through the service — a call, not SQL. */
  auditCall: 'const entry = await audit({ category: HOUSE_AUDIT["house_bot.switch_off"], action: "house_bot.switch_off", actorId });',
  /** ⭐ THE REAL FALSE POSITIVE THIS DETECTOR ALREADY PRODUCED: the OFF script's own screen sentence, which
   * says the word audit() in order to EXPLAIN why it writes none. MUST NOT be reported. */
  auditSentence: 'console.log("NO compliance audit row is written (D-OPS-2): audit() HMAC-chains under a lock.");',
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

  const COPY = Object.values(SWITCH_OFF_COPY);
  add("ops.off.6 · a RE-TYPED operator sentence is reported — the copy that goes stale in silence", copyLiteralLeaks(PLANTED.offCopyTyped, COPY).length === 1, copyLiteralLeaks(PLANTED.offCopyTyped, COPY));
  add("ops.off.6 · CONTROL · the SAME sentence reached through the imported table is NOT reported", copyLiteralLeaks(PLANTED.offCopyImported, COPY).length === 0, copyLiteralLeaks(PLANTED.offCopyImported, COPY));
  add("ops.off.8 · a planted advisory lock is reported — the 30 s stall A9 exists to remove", advisoryLockSites(PLANTED.advisoryLock).length === 1, advisoryLockSites(PLANTED.advisoryLock));
  add("ops.off.8 · CONTROL · the same write with no lock is NOT reported", advisoryLockSites(PLANTED.noLock).length === 0, advisoryLockSites(PLANTED.noLock));
  add("ops.off.7 · the notification-idx hardcoded proxy rewrite is reported", hardcodedHostSites(PLANTED.proxyRewrite).length >= 1, hardcodedHostSites(PLANTED.proxyRewrite));
  add("ops.off.7 · CONTROL · the ai-cycles isLocal split with no host typed in is NOT reported, and reads as by-host rather than forced",
    hardcodedHostSites(PLANTED.hostFree).length === 0 && sslByHost(PLANTED.hostFree).byHost && !sslByHost(PLANTED.hostFree).forced, j(sslByHost(PLANTED.hostFree)));
  add("ops.off.7 · CONTROL · the notification-idx body's UNCONDITIONAL ssl reads as FORCED and not by-host — so 'decides by host' above is a measured difference, not a word",
    sslByHost(PLANTED.proxyRewrite).byHost === false && sslByHost(PLANTED.proxyRewrite).forced === true, j(sslByHost(PLANTED.proxyRewrite)));
  add("ops.d-ops-2 · a hand-written AuditLog INSERT is reported — the chain broken by hand", auditWriteSites(PLANTED.auditInsert).length >= 1, auditWriteSites(PLANTED.auditInsert));
  add("ops.d-ops-2 · …and so is the same thing through the service: a bare audit() CALL", auditWriteSites(PLANTED.auditCall).length === 1, auditWriteSites(PLANTED.auditCall));
  add("ops.d-ops-2 · CONTROL · a file that writes only its event row is NOT reported", auditWriteSites(PLANTED.noLock).length === 0, auditWriteSites(PLANTED.noLock));
  add("ops.d-ops-2 · ⭐ CONTROL, AND IT IS A FALSE POSITIVE THIS DETECTOR REALLY PRODUCED · a printed SENTENCE that names audit() to explain why none is written is NOT reported",
    auditWriteSites(PLANTED.auditSentence).length === 0, auditWriteSites(PLANTED.auditSentence));

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
