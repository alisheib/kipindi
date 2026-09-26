/**
 * THE HOUSE-BOT OPS DETECTORS — the pure half of `test:house-bot-ops`, and the whole of its red proof.
 *
 *   imported by scripts/lib/house-bot-ops-cases.mts   npm run test:house-bot-ops   (the case list, both stores)
 *   imported by scripts/red-house-bot-ops.mts          npm run red:house-bot-ops    (the planted controls, in process)
 *
 * ⛔ WHY THIS MODULE EXISTS (2026-09-26, RESUME-HERE §0c step 7). Everything below the imports was written in
 * the case list and moved here VERBATIM. The only edits are `export` on the names the case list reads back, and
 * `SELF`, which names the file that holds the planted region — now this one. The case list cannot be imported:
 * it loads a world and ends in `process.exit`, and its §9 removes a temporary git index from the disk.
 * `test:red-anchors` §4 reads the WHOLE source of the script a `red:*` command names, comments included, and
 * counts a `--prove-red` harness as in-process only while that source holds no file-writing call. So the red
 * proof needs a source of its own, and this module is everything that source runs. `test:house-bot-ops`
 * `ops.red.1d` holds this module, and every module it loads, to §4's own predicate — more than §4 reads.
 *
 * ⛔ NOTHING HERE MAY WRITE, SPAWN OR OPEN A STORE. Declarations only: no top-level side effect, no database, no
 * child process, no lock file, no log. A planted shape that names a write call is built by concatenation, the
 * way the region markers are, and no sentence here follows a write call's name with an opening parenthesis —
 * not even after a space, because §4's predicate matches across whitespace and inside comments.
 *
 * ⚠️ THE SCANNER MUST NOT MEASURE ITSELF. This file necessarily contains the very strings it hunts
 * (a planted `UPDATE … SET "houseBotId"`, a planted `switchOnHouseBots` import). They all live in ONE
 * marked region, that region is stripped from this file's body before any scan, and `ops.pop.self`
 * asserts the strip removed characters and that a planted sample is present in the raw file and absent
 * from the stripped one. Without it this suite would report itself as the second marker writer on the
 * day it was born — a scanner measuring itself, `0.250.c0`'s recorded failure.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { decomment } from "./decomment.mts";
import { REPO_ROOT, scriptFiles } from "./tracked-files.mts";
// ⛔ PURE MODULES ONLY — this module is imported by the red entry, which runs with no database and no store.
// `feed-copy.ts` imports `./constants` and nothing else; the operator sentences are READ from it here for the
// same reason the scripts import them: a suite that re-typed the sentence it checks would pass forever.
import { SWITCH_OFF_COPY } from "../../src/lib/house-bot/feed-copy.ts";

export const j = (v: unknown): string => JSON.stringify(v) ?? String(v);
export const read = (rel: string): string => readFileSync(join(REPO_ROOT, rel), "utf8");

export const SELF = "scripts/lib/house-bot-ops-detectors.mts";
/** Built by concatenation so the marker text itself occurs exactly where the marker is. */
const P_START = "@ops-planted" + ":start", P_END = "@ops-planted" + ":end";

/** A file's source as the scanners read it: comments stripped, and this file's planted region removed. */
const bodyCache = new Map<string, string>();
export function bodyOf(rel: string): string {
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
  return updateSetClauses(code)
    .filter((u) => /houseBotId/.test(u.set))
    .map((u) => ({ line: u.line, target: u.target, set: u.set.slice(0, 90) }));
}

/**
 * ⛔ ONE PARSER FOR "WHAT DOES THIS UPDATE ASSIGN", NOT THREE. Every `UPDATE <target> … SET <clause>`,
 * with the clause ending at the first WHERE, RETURNING, FROM, `;` or template backtick.
 *
 * ⚠️ THE CLAUSE BOUNDARY IS THE WHOLE POINT, and a detector that skipped it produced a REAL false
 * positive on the day this was written: a `"positionId" = ` check that read 240 characters past SET
 * reported the remark script's own `WHERE t."positionId" = p."id"` — the join key — as a SET of
 * positionId. Three copies of this loop had already been written; a fourth would have been the second
 * walker this lane's own corrections call the defect.
 */
export function updateSetClauses(code: string): Array<{ line: number; target: string; set: string }> {
  const out: Array<{ line: number; target: string; set: string }> = [];
  for (const m of code.matchAll(/\bUPDATE\b/gi)) {
    const at = m.index ?? 0;
    const head = code.slice(at, at + 600);
    const set = /\bSET\b/i.exec(head);
    if (!set || set.index > 120) continue; // `UPDATE "T" alias SET` — anything longer is prose, not a statement
    const rest = head.slice(set.index + 3);
    const stop = /\bWHERE\b|\bRETURNING\b|\bFROM\b|;|`/i.exec(rest);
    const clause = stop ? rest.slice(0, stop.index) : rest;
    out.push({
      line: code.slice(0, at).split("\n").length,
      target: head.slice(0, set.index).replace(/\s+/g, " ").trim().slice(0, 60),
      set: clause.replace(/\s+/g, " ").trim(),
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

/** Every `UPDATE … SET` clause that sets an `enabled` column true — over the one parser above. */
export function enabledTrueUpdates(code: string): string[] {
  return updateSetClauses(code)
    .filter((u) => /"?\benabled\b"?\s*=\s*(?:true|TRUE|'t')/.test(u.set))
    .map((u) => u.set.slice(0, 80));
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
 * An index NAME typed into a source file. ⛔ The five index names live in the markers migration and
 * nowhere else. A preflight that typed them would keep checking yesterday's list after the migration
 * gained a sixth, and would report GO on a database one index short — which is not a hypothetical: the
 * plan itself carried "the 4 indexes" for weeks, because somebody counted the four that name
 * `"houseBotId"` and missed the sweep keyset built under the same ACCESS EXCLUSIVE lock.
 */
export function typedIndexNames(code: string): string[] {
  return [...new Set([...code.matchAll(/["'`]([A-Za-z][A-Za-z0-9]*_[A-Za-z0-9_]*_idx)["'`]/g)].map((m) => m[1]))];
}

/** …and the other half of that claim: the names are READ off the migration file at run time. */
export function derivesIndexNames(code: string): boolean {
  return /readFileSync\s*\(/.test(code) && /migration\.sql/.test(code) && /matchAll\s*\(/.test(code);
}

/**
 * How a file asks whether an index is USABLE. ⛔ A failed `CREATE INDEX CONCURRENTLY` leaves an INVALID
 * index under the SAME name, so `pg_indexes.indexname` answers "present" for the one failure that
 * matters and the migration's `IF NOT EXISTS` then keeps it forever.
 */
export function indexValidityRead(code: string): { indisvalid: boolean; byNameOnly: boolean } {
  const indisvalid = /\bindisvalid\b/.test(code);
  return { indisvalid, byNameOnly: (/\bpg_indexes\b/.test(code) || /\bindexname\b/.test(code)) && !indisvalid };
}

/**
 * Names from an IMPORTED authority that a file re-typed as string literals instead. ⛔
 * `schema-ready.ts` is what the engine's own gate and `/api/health` read; a preflight with its own copy
 * can report GO on a database those two would reject, and `house-bot-migrations.test.mts` already keeps
 * a second copy — a third is the one that drifts.
 */
export function typedTableLiterals(code: string, names: readonly string[]): string[] {
  return [...new Set([...code.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].filter((m) => names.includes(m[2])).map((m) => m[2]))];
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

/**
 * The remark script's ONE statement, read against the string this suite pins. ⛔ The pin is the whole
 * admission: the file is allowed a raw marker write only because every clause of that write is fixed
 * here, so a widening — the NULL predicate deleted, the value taken from a parameter, the target
 * swapped to "Position" — stops matching and reddens on its own assertion rather than on a count.
 */
export function remarkPin(code: string, pinned: string): {
  exact: boolean; updates: MarkerUpdate[]; positionTarget: boolean; setsPositionId: boolean; interpolatedTable: boolean;
} {
  const updates = markerUpdateSites(code);
  return {
    exact: code.includes(pinned),
    updates,
    positionTarget: updates.some((u) => /"Position"/.test(u.target)),
    // ⛔ THE SET CLAUSE, NOT "SOMEWHERE AFTER THE WORD SET". The first draft read 240 characters past
    // SET and reported the pinned statement's own `WHERE t."positionId" = p."id"` — the JOIN KEY — as a
    // write. A guard that cries wolf on the one file it was written for gets switched off.
    setsPositionId: updateSetClauses(code).some((u) => /"positionId"\s*=/.test(u.set)),
    interpolatedTable: /\bUPDATE\s+\$\{/.test(code) || /\bUPDATE\s+"?\s*\$\{/.test(code),
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

export const sameSet = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/**
 * Does a script that WRITES to whatever database it is handed refuse one that is not loopback?
 *
 * ⛔ READ AS THREE PARTS, BECAUSE TWO OF THEM PASS ON THEIR OWN AND MEAN NOTHING. Naming the
 * production hosts catches a URL that says `rlwy.net` and nothing else — a staging copy, a
 * colleague's laptop, a tunnel — so the HOST test is the one that actually bounds the blast radius.
 * And a test that warns instead of exiting reads, in a diff, exactly like a test that refuses:
 * `ops.pop.3`'s sibling failure, one level down. All three, or it is not a refusal.
 *
 * ⛔ The seed and the drive are the only two scripts in this lane that write a world rather than read
 * one; the ops scripts are pointed at production BY DESIGN and are covered by `ops.off.7` instead.
 */
export function loopbackRefusal(code: string): { hostTest: boolean; namesProduction: boolean; exits: boolean } {
  return {
    hostTest: code.includes(String.raw`127\.0\.0\.1`) || code.includes(`"127.0.0.1"`),
    namesProduction: /rlwy\\?\.net/.test(code),
    exits: /(?:loopback only|Loopback only)/.test(code) && /process\.exit\(2\)/.test(code),
  };
}

/**
 * Which git subcommands a script actually RUNS, split by whether they can change anything.
 *
 * ⭐ IT IS THE ARGUMENT POSITION, NEVER THE WORD. The first attempt at this pin searched the body for
 * `fetch` and went red on the release gate's own screen sentence — `Run \`git fetch origin\` yourself`
 * — which is the script TELLING the operator to do the thing it refuses to do. A detector that cannot
 * tell a subcommand from a sentence about a subcommand gets switched off within a week.
 */
export function gitVerbs(code: string): { readOnly: string[]; writing: string[] } {
  const READ_ONLY = new Set(["rev-parse", "ls-tree", "show", "cat-file", "log", "diff", "ls-files", "status", "config"]);
  const WRITING = new Set(["fetch", "pull", "push", "ls-remote", "remote", "clone", "checkout", "switch", "reset", "commit", "add", "rm", "mv", "merge", "rebase", "stash", "update-index", "write-tree", "commit-tree", "hash-object", "gc", "prune"]);
  const seen = [...code.matchAll(/\[\s*"([a-z][a-z-]*)"/g)].map((m) => m[1]);
  return {
    readOnly: [...new Set(seen.filter((v) => READ_ONLY.has(v)))].sort(),
    writing: [...new Set(seen.filter((v) => WRITING.has(v)))].sort(),
  };
}

/** A credential TYPED into a file that another file owns — right the day it is written, wrong the day that file changes. */
export function typedAdminCredential(code: string): string[] {
  return [...code.matchAll(/const\s+ADMIN_(?:PHONE|PASSWORD)\s*=\s*"([^"]+)"/g)].map((m) => m[1]);
}

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
  {
    file: "scripts/ops-house-bots-remark.mts",
    why: "S3's single sanctioned exception: the NULL-filling repair of drift leg (a), which the data layer physically CANNOT do "
      + "(both twins discard houseBotId from a txn.update patch, so a remark through the DAL would run, report success and change "
      + "nothing). It is admitted on two conditions, both asserted rather than trusted: ops.remark.10 pins its ONE statement "
      + "byte-for-byte — \"Transaction\" the only target, the value taken from the JOIN, p.houseBotId IS NOT NULL and t.houseBotId "
      + "IS NULL — and everything appended to that pinned core is joined with AND, so a later edit can only NARROW it.",
  },
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
export const PLANTED = {
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
  /**
   * ⛔ THE REMARK SCRIPT'S ONE STATEMENT, PINNED BYTE FOR BYTE. It lives HERE, inside the stripped region,
   * for a reason worth stating: a pin is a copy of the very shape this file hunts, and left in live code it
   * would make the gate report ITSELF as the second marker writer. The mutations below are derived from it
   * by `.replace`, so a change to the pin cannot leave a mutation testing yesterday's statement.
   */
  remarkPinned: 'UPDATE "Transaction" t SET "houseBotId" = p."houseBotId" FROM "Position" p WHERE t."positionId" = p."id" AND p."houseBotId" IS NOT NULL AND t."houseBotId" IS NULL',
  /** The corruption this whole step exists to prevent: the marker written onto the POSITION, from a parameter. */
  remarkOntoPosition: 'UPDATE "Position" p SET "houseBotId" = $1::text WHERE p."id" = $2::text',
  /** A table name built at run time — the shape no pin can hold, so the pin must refuse it outright. */
  remarkInterpolated: "await c.query(`UPDATE ${table} SET \"houseBotId\" = p.\"houseBotId\"`);",
  /** A row POSITIONED by an update: permanently unmarkable afterwards, and invisible to the marker pin. */
  remarkSetsPositionId: 'UPDATE "Transaction" SET "positionId" = $1::text WHERE "id" = $2::text',
  /** ⛔ THE PLAN'S OWN MISTAKE, AS CODE: the four indexes that name "houseBotId", the sweep keyset forgotten. */
  preflightFourNames: 'const IDX = ["Position_houseBotId_open_idx", "Position_houseBotId_placedAt_marked_idx", "Position_marketId_marked_idx", "Transaction_createdAt_marked_idx"];',
  /** The same list, read off the migration at run time. MUST NOT be reported. */
  preflightDerivedNames: 'const sql = readFileSync(join(MIGRATIONS, markersDir, "migration.sql"), "utf8");\nconst names = [...sql.matchAll(/CREATE INDEX IF NOT EXISTS "([^"]+)"/gi)].map((m) => m[1]);',
  /** `ops-preflight-notification-idx.mts`'s shape: present-by-NAME, which cannot see an INVALID index. */
  preflightByName: 'const idx = await c.query(`SELECT indexname FROM pg_indexes WHERE tablename = $1`, ["Position"]);',
  /** The same question asked of the catalogue that knows the answer. MUST NOT be reported. */
  preflightIndisvalid: 'const idx = await c.query(`SELECT c.relname AS name, i.indisvalid AS valid FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname = ANY($1::text[])`, [names]);',
  /** The eight table names re-typed — the third copy, and the one that drifts. */
  preflightTypedTables: 'const HOUSE = ["HouseBot", "HouseBotControl", "HouseBotRuntime", "HouseBotAlertOnce", "HouseBotEvent", "HouseBotIntent", "HouseBotTarget", "HouseBotPress"];',
  /** The same eight reached through the module the engine's own gate reads. MUST NOT be reported. */
  preflightImportedTables: 'import { HOUSE_SCHEMA_TABLES } from "../src/lib/server/house-bot/schema-ready.ts";\nconst missing = HOUSE_SCHEMA_TABLES.filter((t) => !present.includes(t));',
  /**
   * ⛔ THE SEED WITH ITS HOST TEST GONE. It still names production, so a reviewer skimming for
   * "rlwy" would find it — and it would then designate REAL players as house bots on any database
   * whose URL does not happen to say rlwy.net, a staging copy included.
   */
  seedNoHostTest: 'const url = process.env.DATABASE_URL ?? "";\nif (/rlwy\\.net|railway\\.app/i.test(url)) { console.error("REFUSED — production."); process.exit(2); }\nawait designateHouseBot(input);',
  /**
   * ⛔ THE SHAPE THAT IS WORSE THAN NO GUARD: it asks the right question and carries on anyway.
   * A refusal that only warns reads, in a diff, exactly like a refusal that refuses.
   */
  seedTestsButRuns: 'if (!/@(localhost|127\\.0\\.0\\.1)[:/]/i.test(url)) console.warn("loopback only, probably");\nawait designateHouseBot(input);',
  /** The refusal as the seed really writes it — host, production and an exit. MUST NOT be reported. */
  seedRefuses: 'if (/rlwy\\.net|railway\\.app|50pick\\.tz/i.test(url)) { console.error("REFUSED — production."); process.exit(2); }\nif (!/@(localhost|127\\.0\\.0\\.1)[:/]/i.test(url)) { console.error("REFUSED — loopback only."); process.exit(2); }',
  /** ⛔ THE CREDENTIAL RE-TYPED instead of read out of the seed that owns it — right the day it is written. */
  seedTypedPassword: 'const ADMIN_PHONE = "+255700000000";\nconst ADMIN_PASSWORD = "QaAdmin2026!";',
  /** The same credential read out of the admin seed's own output. MUST NOT be reported. */
  seedDerivedPassword: 'const cred = /· (\\+\\d+) \\/ (\\S+)/.exec(admin.stdout ?? "");\nconst ADMIN_PHONE = cred[1];\nconst ADMIN_PASSWORD = cred[2];',
  /** ⛔ A RELEASE GATE THAT REFRESHES THE REF IT MEASURES — the helpful edit a reviewer would make. */
  parityFetches: 'execFileSync("git", ["fetch", "origin", "main"], { cwd: ROOT });\nconst theirs = git(["ls-tree", "-r", "--name-only", REF]);',
  /** The same gate reading only what this checkout already has. MUST NOT be reported. */
  parityReadsOnly: 'const refSha = git(["rev-parse", "--verify", `${REF}^{commit}`]);\nconst files = git(["ls-tree", "-r", "--name-only", ref, "--", "prisma/migrations"]);\nconst bytes = execFileSync("git", ["show", `${ref}:${path}`]);',
  /** ⭐ THE FALSE POSITIVE THIS DETECTOR REALLY PRODUCED: the gate's own sentence TELLING the operator to fetch. MUST NOT be reported. */
  paritySaysFetch: 'console.error("Run `git fetch origin` yourself and re-run. This script never fetches.");',
};
/* @ops-planted:end */

// ═══════════════════════════════════════════════════════════════════════════════════════════
// §R · red mode — every planted control, in process, writing nothing.
// ═══════════════════════════════════════════════════════════════════════════════════════════

export type RedCase = { label: string; caught: boolean; saw: string };

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
    // ⛔ THE THREE MUTATIONS OF THE ONE DANGEROUS STATEMENT. Each is DERIVED from the pin, so none can
    // end up testing yesterday's statement, and each is a shape a real edit could produce.
    const pin = PLANTED.remarkPinned;
    const widened = pin.replace(` AND t."houseBotId" IS NULL`, "");
    const parameterised = pin.replace(`SET "houseBotId" = p."houseBotId"`, `SET "houseBotId" = $1::text`);
    const ontoPosition = PLANTED.remarkOntoPosition;
    add("ops.remark.10 · CONTROL · the pinned statement matches itself and reads as an UPDATE of \"Transaction\"",
      remarkPin(pin, pin).exact && remarkPin(pin, pin).updates.length === 1 && !remarkPin(pin, pin).positionTarget, j(remarkPin(pin, pin).updates));
    add("ops.remark.10 · THE WIDENING MUTATION · `AND t.\"houseBotId\" IS NULL` deleted — it would RE-MARK rows that already carry a marker — no longer matches the pin",
      remarkPin(widened, pin).exact === false && !/IS NULL/.test(widened.split("AND p.")[1] ?? ""), j({ exact: remarkPin(widened, pin).exact }));
    add("ops.remark.10 · THE WRONG-OBJECT MUTATION · the value taken from a bound parameter instead of the JOIN — a marker copied from another position — no longer matches the pin",
      remarkPin(parameterised, pin).exact === false && /\$1/.test(parameterised), j({ exact: remarkPin(parameterised, pin).exact }));
    add("ops.remark.10 · THE CORRUPTION THIS STEP EXISTS TO PREVENT · the marker written onto the POSITION no longer matches the pin, and the marker checker reports a \"Position\" target",
      remarkPin(ontoPosition, pin).exact === false && remarkPin(ontoPosition, pin).positionTarget === true, j(remarkPin(ontoPosition, pin).updates));
    add("ops.remark.10 · CONTROL · a body that SETs \"positionId\" is reported — a row an update could POSITION becomes permanently unmarkable, invisible in the holder's feed and absent from the house book",
      remarkPin(PLANTED.remarkSetsPositionId, pin).setsPositionId === true, "SET positionId reported");
    add("ops.remark.10 · CONTROL · an INTERPOLATED table name is reported — the shape no byte-for-byte pin could ever hold",
      remarkPin(PLANTED.remarkInterpolated, pin).interpolatedTable === true, "interpolated table reported");
    add("ops.remark.10 · ⭐ CONTROL, AND IT IS A FALSE POSITIVE THIS DETECTOR REALLY PRODUCED · the pinned statement's own `WHERE t.\"positionId\" = p.\"id\"` is a JOIN KEY, not a write, and is NOT reported as a SET of positionId",
      remarkPin(pin, pin).setsPositionId === false && /WHERE t\."positionId" = p\."id"/.test(pin), "the join key is not a write");
  }

  {
    // ⛔ THE A23 PREFLIGHT'S THREE MUTATIONS. Each is a shape a real reviewer could produce — two of
    // them are shapes that ALREADY EXIST in this repo (the plan's four-index count; the by-name index
    // check in `ops-preflight-notification-idx.mts`), which is why they are the ones planted.
    const HOUSE_TABLE_NAMES = ["HouseBot", "HouseBotControl", "HouseBotRuntime", "HouseBotAlertOnce", "HouseBotEvent", "HouseBotIntent", "HouseBotTarget", "HouseBotPress"];
    add("pre.6 · a preflight that TYPES four index names is reported — the plan's own miscount, as code",
      typedIndexNames(PLANTED.preflightFourNames).length === 4 && !derivesIndexNames(PLANTED.preflightFourNames), typedIndexNames(PLANTED.preflightFourNames));
    add("pre.6 · CONTROL · the same five read OFF the migration file types none, and reads as derived",
      typedIndexNames(PLANTED.preflightDerivedNames).length === 0 && derivesIndexNames(PLANTED.preflightDerivedNames) === true, "derived, nothing typed");
    add("pre.5 · a preflight that asks pg_indexes for a NAME is reported — it cannot see an INVALID index, which is the one failure that matters",
      indexValidityRead(PLANTED.preflightByName).byNameOnly === true, j(indexValidityRead(PLANTED.preflightByName)));
    add("pre.5 · CONTROL · the same question asked through pg_index.indisvalid is NOT reported",
      indexValidityRead(PLANTED.preflightIndisvalid).indisvalid === true && indexValidityRead(PLANTED.preflightIndisvalid).byNameOnly === false, j(indexValidityRead(PLANTED.preflightIndisvalid)));
    add("pre.7 · a preflight that re-types the eight house tables is reported — the third copy of a list that already has two",
      typedTableLiterals(PLANTED.preflightTypedTables, HOUSE_TABLE_NAMES).length === 8, typedTableLiterals(PLANTED.preflightTypedTables, HOUSE_TABLE_NAMES));
    add("pre.7 · CONTROL · the same eight reached through schema-ready.ts's export type none of them",
      typedTableLiterals(PLANTED.preflightImportedTables, HOUSE_TABLE_NAMES).length === 0 && /HOUSE_SCHEMA_TABLES/.test(PLANTED.preflightImportedTables), "imported");
  }

  {
    // ⛔ THE SEED'S TWO REFUSALS. It is the only script in this lane that DESIGNATES accounts, and a
    // designation on a real database is a money-and-consent act on a real person's account.
    add("seed.6 · a seed whose HOST test is gone — still naming production, so a skim for `rlwy` finds it — is reported",
      loopbackRefusal(PLANTED.seedNoHostTest).hostTest === false && loopbackRefusal(PLANTED.seedNoHostTest).namesProduction === true,
      j(loopbackRefusal(PLANTED.seedNoHostTest)));
    add("seed.6 · ⭐ a seed that ASKS the right question and carries on anyway is reported — the shape that reads, in a diff, exactly like a refusal",
      loopbackRefusal(PLANTED.seedTestsButRuns).exits === false, j(loopbackRefusal(PLANTED.seedTestsButRuns)));
    add("seed.6 · CONTROL · the refusal as the seed really writes it — host, production and an exit — is NOT reported",
      Object.values(loopbackRefusal(PLANTED.seedRefuses)).every(Boolean), j(loopbackRefusal(PLANTED.seedRefuses)));
    add("seed.4 · a credential TYPED into the seed instead of read from the admin seed that owns it is reported",
      typedAdminCredential(PLANTED.seedTypedPassword).length === 2, typedAdminCredential(PLANTED.seedTypedPassword));
    add("seed.4 · CONTROL · the same credential read out of that seed's own output types nothing",
      typedAdminCredential(PLANTED.seedDerivedPassword).length === 0 && /admin\.stdout/.test(PLANTED.seedDerivedPassword), "derived");

    // ⛔ THE RELEASE GATE'S ONE LAW: it reads, it never refreshes.
    add("rel.src.1 · a release gate that FETCHES the ref it measures is reported — it would change its own answer in the act of reading it",
      gitVerbs(PLANTED.parityFetches).writing.includes("fetch"), j(gitVerbs(PLANTED.parityFetches)));
    add("rel.src.1 · CONTROL · the same gate reading only what the checkout already has is NOT reported, and its read-only verbs are named",
      gitVerbs(PLANTED.parityReadsOnly).writing.length === 0 && gitVerbs(PLANTED.parityReadsOnly).readOnly.length >= 3, j(gitVerbs(PLANTED.parityReadsOnly)));
    add("rel.src.1 · ⭐ CONTROL, AND IT IS A FALSE POSITIVE THIS DETECTOR REALLY PRODUCED · the gate's own screen sentence TELLING the operator to fetch is a sentence, not a subcommand, and is NOT reported",
      gitVerbs(PLANTED.paritySaysFetch).writing.length === 0 && /git fetch origin/.test(PLANTED.paritySaysFetch), "a sentence about fetch is not a fetch");
  }

  {
    // ⭐ THE POSITIVE CONTROL THIS LANE LEARNED THE HARD WAY: prove the walker really OPENED files.
    const pop = scriptFiles();
    // ⚠️ 2026-09-26 (house-bots step 7): the known string was "const PORT = 5433;" until db-scratch.mts made the port
    // overridable (KP_SCRATCH_PORT); this control then failed on main for a reason nobody read. It names the real line now.
    const known = "scripts/db-scratch.mts";
    add("ops.pop.walk · the walker's population contains a known file and the read path really opens it",
      pop.includes(known) && bodyOf(known).includes("const PORT = Number(process.env.KP_SCRATCH_PORT ?? 5433);"), { population: pop.length, known });
    add("ops.pop.self · the planted region is stripped from THIS file before any scan",
      read(SELF).includes(PLANTED.rawPositionMarker) && !bodyOf(SELF).includes(PLANTED.rawPositionMarker)
      && bodyOf(SELF).length < decomment(read(SELF)).length,
      { strippedChars: decomment(read(SELF)).length - bodyOf(SELF).length });
  }
  redMemo = cases;
  return cases;
}
