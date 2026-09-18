/**
 * The case list behind `test:house-bot-reports` (C5-SPEC §4.1, ruling 176). Run by that suite in two child processes —
 * memory and Postgres — never on its own. Every line carries its store.
 *
 * ⛔ OWNER RULING D19: house bots are never public, and the holder sees nothing. A pin here that goes red is a D19 defect
 * or a money defect, never a pin to relax.
 *
 * §0 are static source pins, each with a PLANTED control that must be reported and a BENIGN control that must not; they
 * run in the memory child only (a source file reads the same on both stores). Source is read through
 * `scripts/lib/decomment.mts`, never a new stripper (`test:decomment`). §1 (readers, the entry split, the scorecard, the
 * EAT month), §2 (the fee withheld; its ledger cross-check is Postgres), §1.177 (every other new store member), §3 and the
 * ruling-171 slice of §11 run on both. File order is not section order: §1–§2 run after §11 so §3's hook-sensitive filing
 * runs first, and they build ONE fixture through the real seam that §2 and §1.177 read.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { decomment } from "./decomment.mts";
import { ROLL_CALL_SITES, ROLL_CALL_OWED, type DeclaredMutation } from "./house-bot-expect-drift.mts";
import { createHash } from "node:crypto";
import { extendHouseWords, houseHits, houseHitsByFamily, HOUSE_WORD_SAMPLES, HOUSE_IDENTIFIER_SAMPLES, HOUSE_ID_SAMPLES } from "./house-bot-vocabulary.mjs";

type Any = any;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  console.log(`${c ? "PASS" : "FAIL"} [${STORE}] ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string) => console.log(`\n[${STORE}] ${t}`);
const j = (v: unknown) => JSON.stringify(v) ?? String(v);
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
async function guard(label: string, fn: () => Promise<void> | void): Promise<void> {
  try { await fn(); } catch (e) { ok(`${label} · threw`, false, String((e as Error)?.stack ?? e).split("\n").slice(0, 3).join(" | ")); }
}

/** Every `.ts`/`.tsx` file under `src/`, as a path relative to the repo root (forward slashes). */
function srcFiles(): string[] {
  const out: string[] = [];
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p); else if (/\.(tsx?)$/.test(e.name)) out.push(relative(ROOT, p).replace(/\\/g, "/"));
    }
  };
  walk(join(ROOT, "src"));
  return out;
}

/** A syntax tree of `code` (TS, TSX or plain JS by the file's extension). Parsed, never type-checked. */
function parse(file: string, code: string): ts.SourceFile {
  const kind = /\.m?js$/.test(file) ? ts.ScriptKind.JS : file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  return ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind);
}
function walkTree(sf: ts.SourceFile, visit: (n: ts.Node) => void): void {
  const go = (n: ts.Node) => { visit(n); ts.forEachChild(n, go); };
  go(sf);
}
const literalText = (n: ts.Node | undefined): string | null =>
  n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null;

/* ═══ §0 · ruling 170 · no house audit names the HOLDER as its actor ════════════════════════════════ */

/**
 * The actor expressions a house audit or house event write may carry — a CLOSED list, measured at this commit, that may only
 * shrink (0.170.4 fails on an entry no site uses any more). Each names someone other than the holder:
 *   officerId               the officer acting (`designation.ts`)
 *   input.actorId           `voidHouseConsent` forwarding ITS caller's actor; every caller is a writer file, read here too
 *   press.actorId           the officer who pressed (`press-audit.ts`)
 *   byId                    the officer who switched house bots off (`kill-switch.ts`)
 *   SYSTEM_HOUSE_BOT_ACTOR  the engine (`outcomes.ts` `engineAudit`)
 *   null                    nobody (the holder hook, the planner, `outcomes.ts`)
 * ⛔ Anything else is reported — `bot.userId`, `holderUserId`, a shorthand fed from the holder's id, a name nobody has read
 * yet — so a holder-acted row cannot hide behind a spelling a holder-shaped pattern did not know (C5 steps 1–2 review).
 */
export const ALLOWED_HOUSE_ACTORS = ["officerId", "input.actorId", "press.actorId", "byId", "SYSTEM_HOUSE_BOT_ACTOR", "null"] as const;
/** Writer primitives that forward their own `actorId` PARAMETER to `audit`; their CALL SITES' actors are read instead. */
export const HOUSE_WRITER_PRIMITIVES = ["houseAudit"] as const;
/** The actor a primitive's own body supplies (its parameter): allowed by construction, because every call site is read. */
const PRIMITIVE_PARAMETER = "(a writer primitive's actorId parameter)";
/**
 * ⛔ THE COMMIT 7 DEBT, BY NAME — IT MAY ONLY LEAVE THIS LIST. `withdrawHouseConsent` (designation.ts) writes
 * `house_bot.holder_withdrew_consent` with the holder as actor; D19c struck the holder-facing Stop it served, so Commit 7
 * reshapes it with the officer as actor (C5-SPEC ruling 170, L49). Until then nothing under `src/` names it (rule 2).
 */
export const HOLDER_ACTOR_DEBT = ["withdrawHouseConsent"] as const;

/**
 * A file whose code can WRITE a house audit or house event: it indexes the catalogue (`HOUSE_AUDIT[action]`), calls a writer
 * primitive or the consent void, or holds a house action as a string LITERAL anywhere — a wrapper's first argument
 * (`engineAudit("house_bot.poison", …)`, a future `xAudit(…)`) or a const an `action:` names. Read from the syntax tree, so
 * no pattern here spells the feature. A file that only READS the catalogue (`user-service.ts` excludes
 * `Object.keys(HOUSE_AUDIT)`) is not a writer, and its own audits name their own actors.
 */
export function writesHouseAudit(file: string, code: string): boolean {
  if (!["HOUSE_AUDIT", "houseAudit", "voidHouseConsent", "house_bot."].some((s) => code.includes(s))) return false;
  let writes = false;
  walkTree(parse(file, code), (n) => {
    if (writes) return;
    if (ts.isElementAccessExpression(n) && n.expression.getText() === "HOUSE_AUDIT") writes = true;
    else if (ts.isCallExpression(n) && ["houseAudit", "voidHouseConsent"].includes(n.expression.getText())) writes = true;
    else if ((literalText(n) ?? "").startsWith("house_bot.")) writes = true;
  });
  return writes;
}

const enclosingFunction = (n: ts.Node): ts.Node | null => {
  for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return p;
  return null;
};
const functionName = (f: ts.Node | null): string | null => {
  if (!f) return null;
  const named = (f as Any).name;
  if (named && ts.isIdentifier(named)) return named.text;
  const holder = f.parent;
  return holder && ts.isVariableDeclaration(holder) && ts.isIdentifier(holder.name) ? holder.name.text : null;
};

/** What a shorthand `actorId` resolves to: the userId it also feeds, a primitive's parameter, another function's parameter, or a const. */
function resolveShorthand(n: ts.ShorthandPropertyAssignment): string {
  const literal = n.parent;
  if (ts.isObjectLiteralExpression(literal) && literal.properties.some((p) => ts.isPropertyAssignment(p) && p.name.getText() === "userId" && p.initializer.getText() === "actorId")) {
    return "actorId (the same value as the row's userId)";
  }
  const fn = enclosingFunction(n);
  const param = fn && (fn as Any).parameters?.some((p: ts.ParameterDeclaration) => ts.isIdentifier(p.name) && p.name.text === "actorId");
  if (param) return (HOUSE_WRITER_PRIMITIVES as readonly string[]).includes(functionName(fn) ?? "") ? PRIMITIVE_PARAMETER : `actorId (a parameter of ${functionName(fn) ?? "an anonymous function"})`;
  let init: string | null = null;
  walkTree(n.getSourceFile(), (d) => {
    if (init == null && ts.isVariableDeclaration(d) && ts.isIdentifier(d.name) && d.name.text === "actorId" && d.initializer) init = d.initializer.getText();
  });
  return init ?? "actorId (unresolved)";
}

/** Every actor a house-audit-writing file supplies, with the function it sits in. */
export function houseActorSites(file: string, code: string): Array<{ actor: string; fn: string | null }> {
  const out: Array<{ actor: string; fn: string | null }> = [];
  walkTree(parse(file, code), (n) => {
    if (ts.isPropertyAssignment(n) && n.name.getText() === "actorId") {
      out.push({ actor: n.initializer.getText(), fn: functionName(enclosingFunction(n)) });
    } else if (ts.isShorthandPropertyAssignment(n) && n.name.text === "actorId") {
      out.push({ actor: resolveShorthand(n), fn: functionName(enclosingFunction(n)) });
    } else if (ts.isCallExpression(n)) {
      const callee = n.expression.getText();
      const houseLiteralFirst = (literalText(n.arguments[0]) ?? "").startsWith("house_bot.");
      const second = n.arguments[1];
      // `houseAudit(action, ACTOR, target, payload)`, or any wrapper whose first argument is a house action and whose
      // second is not an object (`engineAudit(action, { type, id }, payload)` names no actor: the engine is its actor).
      if (((HOUSE_WRITER_PRIMITIVES as readonly string[]).includes(callee) || houseLiteralFirst) && second && !ts.isObjectLiteralExpression(second)) {
        out.push({ actor: second.getText(), fn: functionName(enclosingFunction(n)) });
      }
    }
  });
  return out;
}

/** Every reference to a debt function outside its own declaration: a call, an import, an export, a callback. */
export function debtReferences(file: string, code: string): string[] {
  const out: string[] = [];
  for (const name of HOLDER_ACTOR_DEBT) {
    if (!code.includes(name)) continue;
    walkTree(parse(file, code), (n) => {
      if (!ts.isIdentifier(n) || n.text !== name) return;
      if (n.parent && ts.isFunctionDeclaration(n.parent) && n.parent.name === n) return; // its own definition
      out.push(`${file}: ${name} (${n.parent ? ts.SyntaxKind[n.parent.kind] : "?"})`);
    });
  }
  return out;
}

/** The violations of both rules over `{rel, code}` files, and the allowlisted actors seen (0.170.4). */
export function holderActorViolations(files: Array<{ rel: string; code: string }>): { holder: string[]; callers: string[]; debtSeen: string[]; allowedSeen: string[] } {
  const holder: string[] = [], callers: string[] = [], debtSeen = new Set<string>(), allowedSeen = new Set<string>();
  for (const { rel, code } of files) {
    if (writesHouseAudit(rel, code)) {
      for (const site of houseActorSites(rel, code)) {
        if (site.actor === PRIMITIVE_PARAMETER) continue;
        const allowed = (ALLOWED_HOUSE_ACTORS as readonly string[]).includes(site.actor);
        if (allowed) { allowedSeen.add(site.actor); continue; }
        // A NON-allowed actor inside a debt is the debt itself; once Commit 7 gives it an allowed actor it leaves (0.170.3).
        if (site.fn && (HOLDER_ACTOR_DEBT as readonly string[]).includes(site.fn)) debtSeen.add(site.fn);
        else holder.push(`${rel}: actor ${site.actor}${site.fn ? ` in ${site.fn}` : ""}`);
      }
    }
    callers.push(...debtReferences(rel, code));
  }
  return { holder, callers, debtSeen: [...debtSeen], allowedSeen: [...allowedSeen] };
}

if (STORE === "memory") {
  section("§0 · ruling 170 · no house audit names the holder as its actor (a closed actor list; the Commit 7 debt listed by name)");
  await guard("0.170", () => {
    const files = srcFiles().map((rel) => ({ rel, code: decomment(read(rel)) }));
    const writers = files.filter((f) => writesHouseAudit(f.rel, f.code));
    const MUST = ["designation.ts", "outcomes.ts", "press-audit.ts", "holder-hook.ts", "kill-switch.ts", "planner.ts"];
    ok("0.170.0 · the population is real: every file that can write a house audit or event is read (the engineAudit wrappers kill-switch and planner among them)",
      files.length > 500 && MUST.every((n) => writers.some((w) => w.rel.endsWith(`house-bot/${n}`))), `${files.length} src files · writers ${writers.map((w) => w.rel.split("/").pop()).join(", ")}`);
    const v = holderActorViolations(files);
    ok("0.170.1 · ⛔ D19c · every actor a house audit or event write supplies is on the closed list (officer, forwarded officer, engine, nobody), outside the named Commit 7 debt",
      v.holder.length === 0, v.holder.join(" · "));
    ok("0.170.2 · ⛔ nothing under src/ names withdrawHouseConsent outside its own definition (no call, import, export or callback) before Commit 7 reshapes it", v.callers.length === 0, v.callers.join(" · "));
    ok("0.170.3 · the debt is still real (it may only leave the list, and leaves it when Commit 7 fixes it)", j(v.debtSeen) === j([...HOLDER_ACTOR_DEBT]), j(v.debtSeen));
    const unused = ALLOWED_HOUSE_ACTORS.filter((a) => !v.allowedSeen.includes(a));
    ok("0.170.4 · the actor list is measured, not wished: every allowed actor is used by a site under src/ (an unused entry leaves the list)", unused.length === 0, j(unused));

    // ⛔ CONTROLS — each planted shape reported, each benign shape not.
    const count = (code: string, rel = "src/planted.ts") => holderActorViolations([{ rel, code }]);
    const c1 = count(`async function f(bot) { await houseAudit("house_bot.paused", bot.userId, target, payload); }`);
    ok("0.170.c1 · CONTROL · a planted house audit with `bot.userId` as its actor is reported", c1.holder.length === 1, j(c1));
    const c2 = count(`export function stop(holderUserId) { return voidHouseConsent({ userId: holderUserId, cause: "HOLDER_WITHDREW", actorId: holderUserId }); }`);
    ok("0.170.c2 · CONTROL · a planted consent void with the holder as actor, outside the debt, is reported", c2.holder.length === 1, j(c2));
    const c3 = count(`"use server";\nexport async function stopAction() { return withdrawHouseConsent(session.userId); }`, "src/app/planted/actions.ts");
    ok("0.170.c3 · CONTROL · a planted caller of withdrawHouseConsent is reported", c3.callers.length === 1, j(c3));
    const c4 = count(`async function houseAudit(action: A, actorId: string | null, t: T, p: P) {}\nawait houseAudit("house_bot.started", officerId, target, { holderUserId: bot.userId });\nawait voidHouseConsent({ userId: bot.userId, cause: code, actorId: null });\nexport function withdrawHouseConsent(holderUserId: string) { return 1; }`, "src/benign.ts");
    ok("0.170.c4 · CONTROL · an officer actor, a holder id in the PAYLOAD, a null actor, the signature and the debt's own definition are not reported",
      c4.holder.length === 0 && c4.callers.length === 0, j(c4));
    const reader = count(`import { HOUSE_AUDIT } from "x";\nconst EXCLUDED = Object.keys(HOUSE_AUDIT);\naudit({ category: "COMPLIANCE", action: "user.account.closed", actorId: userId });`, "src/reader.ts");
    const writer = count(`audit({ category: HOUSE_AUDIT[action], action, actorId: userId });`, "src/writer.ts");
    ok("0.170.c5 · CONTROL · a file that only READS the catalogue keeps its own player-acted audits; indexing it for a category makes a writer",
      reader.holder.length === 0 && writer.holder.length === 1, j({ reader, writer }));
    const c6 = count(`export function stop(actorId: string) { return voidHouseConsent({ userId: actorId, cause: "HOLDER_WITHDREW", actorId }); }`);
    ok("0.170.c6 · CONTROL · a SHORTHAND actorId that is the holder's own id (it feeds userId in the same row) is reported", c6.holder.length === 1, j(c6));
    const c7a = count(`async function f(bot) { await xAudit("house_bot.paused", bot.userId, target); }`);
    const c7b = count(`const ACTION = "house_bot.paused";\nexport function f(holderId) { return audit({ category: "COMPLIANCE", action: ACTION, actorId: holderId }); }`);
    ok("0.170.c7 · CONTROL · a new wrapper whose first argument is a house action, and an action named through a const, are writers and their holder actors are reported",
      c7a.holder.length === 1 && c7b.holder.length === 1, j({ c7a, c7b }));
    const c8 = count(`export { withdrawHouseConsent } from "./designation";\nexport const run = (ids: string[]) => ids.map(withdrawHouseConsent);`, "src/lib/server/planted-reexport.ts");
    ok("0.170.c8 · CONTROL · a re-export and a callback reference to withdrawHouseConsent are both reported", c8.callers.length === 2, j(c8));
    const c9 = count(`async function f() { await houseAudit("house_bot.paused", reviewerId, target, {}); }`);
    ok("0.170.c9 · CONTROL · an actor nobody has read yet (not holder-shaped, not on the list) is reported: the list is closed", c9.holder.length === 1, j(c9));
    const c10 = count(`async function houseAudit(action, actorId, target, payload) { await audit({ category: HOUSE_AUDIT[action], action, actorId, targetType: target.type }); }\nexport async function g() { await engineAudit("house_bot.poison", { type: "HouseBotControl", id: X }, { cause: "POISON" }); }`, "src/benign-primitive.ts");
    ok("0.170.c10 · CONTROL · a writer primitive forwarding its own actorId parameter, and engineAudit's target object, are not reported", c10.holder.length === 0, j(c10));
    const fixedDebt = count(`export function withdrawHouseConsent(holderUserId: string) { return voidHouseConsent({ userId: holderUserId, cause: "HOLDER_WITHDREW", actorId: null }); }`, "src/lib/server/house-bot/designation.ts");
    const liveDebt = count(`export function withdrawHouseConsent(holderUserId: string) { return voidHouseConsent({ userId: holderUserId, cause: "HOLDER_WITHDREW", actorId: holderUserId }); }`, "src/lib/server/house-bot/designation.ts");
    ok("0.170.c11 · CONTROL · the debt counts only while its actor is the holder: reshaped to an allowed actor it leaves (so 0.170.3 goes red and the list must shrink)",
      j(fixedDebt.debtSeen) === "[]" && j(liveDebt.debtSeen) === j([...HOLDER_ACTOR_DEBT]) && liveDebt.holder.length === 0, j({ fixedDebt, liveDebt }));
  });
}

/* ═══ §0 · ruling 169 · no data-rights door returns transaction rows unprojected ═════════════════════════ */

/** The two releasable doors' files (`exportUserData`, `buildDsarBundle`; C5-SPEC ruling 168). */
export const DSAR_DOOR_FILES = ["src/lib/server/user-service.ts", "src/lib/server/privacy.ts"] as const;

/** Index just past the `)` that closes the call whose `(` is at `open`. */
function callEnd(src: string, open: number): number {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "(") depth++;
    else if (src[i] === ")" && --depth === 0) return i + 1;
  }
  return src.length;
}

/**
 * Every `db.txn.findByUser(…)` read in a door file whose rows are not mapped through `dsarTxnView`: either directly
 * (`(await db.txn.findByUser(…)).map(dsarTxnView)`) or through a const whose every later use is `NAME.map(dsarTxnView)`.
 * A key-removing destructure is NOT a projection (it is the denylist ruling 169 replaced).
 */
export function unprojectedTxnReads(code: string): string[] {
  const out: string[] = [];
  for (const m of code.matchAll(/\bdb\.txn\.findByUser\s*\(/g)) {
    const end = callEnd(code, m.index! + m[0].length - 1);
    const call = code.slice(m.index!, end);
    if (/^\s*\)?\s*\.map\(\s*dsarTxnView\s*\)/.test(code.slice(end, end + 60))) continue;
    const bound = /(?:const|let)\s+(\w+)\s*=\s*(?:\(?\s*await\s+)?$/.exec(code.slice(Math.max(0, m.index! - 60), m.index!));
    if (bound) {
      const rest = code.slice(end);
      const uses = [...rest.matchAll(new RegExp(String.raw`\b${bound[1]}\b`, "g"))];
      const projectedUses = uses.filter((u) => /^\s*\.map\(\s*dsarTxnView\s*\)/.test(rest.slice(u.index! + bound[1].length, u.index! + bound[1].length + 40)));
      if (uses.length > 0 && projectedUses.length === uses.length) continue;
    }
    out.push(call);
  }
  return out;
}

if (STORE === "memory") {
  section("§0 · ruling 169 · no data-rights door returns db.txn.findByUser rows unprojected");
  await guard("0.169", () => {
    const reads = DSAR_DOOR_FILES.map((rel) => ({ rel, code: decomment(read(rel)) }));
    const count = reads.reduce((n, r) => n + (r.code.match(/\bdb\.txn\.findByUser\s*\(/g) ?? []).length, 0);
    ok("0.169.0 · the population is real: both door files are read and hold the doors' transaction reads (≥ 2)",
      reads.every((r) => r.code.length > 2_000) && count >= 2 && /export async function exportUserData\(/.test(reads[0].code) && /export async function buildDsarBundle\(/.test(reads[1].code), `${count} reads`);
    for (const r of reads) {
      const bad = unprojectedTxnReads(r.code);
      ok(`0.169.${r.rel.split("/").pop()} · ⛔ D19 · every db.txn.findByUser read goes through dsarTxnView`, bad.length === 0, bad.join(" · "));
    }
    const planted = [
      "const txns = await db.txn.findByUser(userId, 10_000);\nreturn { transactions: txns };",
      "return { transactions: await db.txn.findByUser(userId, 1000) };",
      "transactions: (await db.txn.findByUser(userId, 1000)).map(({ houseBotId: _m, ...row }) => row),",
      "const txns = await db.txn.findByUser(userId, 10_000);\nconst n = txns.length;\nreturn { transactions: txns.map(dsarTxnView), n };",
    ];
    const caught = planted.filter((p) => unprojectedTxnReads(p).length === 1);
    ok("0.169.c1 · CONTROL · a raw bound return, a raw inline return, the old key-removing destructure and a half-projected const are each reported",
      caught.length === planted.length, j(planted.filter((p) => !caught.includes(p))));
    const benign = [
      "const txns = await db.txn.findByUser(userId, 10_000);\nreturn { transactions: txns.map(dsarTxnView) };",
      "transactions: (await db.txn.findByUser(userId, 1000)).map(dsarTxnView),",
    ];
    ok("0.169.c2 · CONTROL · a bound read mapped at its only use, and an inline mapped read, are not reported", benign.every((b) => unprojectedTxnReads(b).length === 0), j(benign.map(unprojectedTxnReads)));
  });
}

/* ═══ §0 · ruling 172 · the engine card renders only what the admin-gated reader returned ═══════════════════ */

export const SYSTEM_PAGE = "src/app/admin/system/page.tsx";
/**
 * The page wiring 10.8c relies on: `houseEngineHealthFor` returns null for every viewer outside the house-alert audience,
 * and the page must render the card from THAT value and nothing else — exactly one card, guarded by the value, the value
 * read once from the reader with no fallback (a default view would render the card for a COMPLIANCE viewer while the
 * reader's own case stays green).
 */
export function engineCardWiring(code: string): string[] {
  const problems: string[] = [];
  const uses = [...code.matchAll(/<HouseEngineCard\b/g)].length;
  if (uses !== 1) problems.push(`${uses} card renders (exactly 1)`);
  if (!/\{\s*houseEngine\s*&&\s*<HouseEngineCard\s+view=\{\s*houseEngine\s*\}\s*\/>\s*\}/.test(code)) problems.push("the card is not rendered as {houseEngine && <HouseEngineCard view={houseEngine} />}");
  const assigns = [...code.matchAll(/\bhouseEngine\s*=(?!=)([^;]*);/g)];
  if (assigns.length !== 1) problems.push(`${assigns.length} assignments to houseEngine (exactly 1)`);
  for (const a of assigns) {
    const rhs = a[1].trim();
    if (!rhs.includes("houseEngineHealthFor(")) problems.push(`houseEngine is not read from houseEngineHealthFor: ${rhs}`);
    if (/\?\?|\|\||\{/.test(rhs)) problems.push(`houseEngine has a fallback value: ${rhs}`);
    if (/=>(?!\s*null\b)/.test(rhs)) problems.push(`a callback in houseEngine's read returns something other than null: ${rhs}`);
    if (!/:\s*null$/.test(rhs)) problems.push(`houseEngine's other branch is not null: ${rhs}`);
  }
  if (/\bhouseEngine\s*(?:\?\?|\|\|)/.test(code)) problems.push("houseEngine is defaulted where it is used");
  return problems;
}

if (STORE === "memory") {
  section("§0 · ruling 172 · /admin/system renders the engine card only from the admin reader's own value");
  await guard("0.172", () => {
    const page = decomment(read(SYSTEM_PAGE));
    ok("0.172.0 · the population is real: the page defines the card and calls the reader", /function HouseEngineCard\(/.test(page) && page.includes("houseEngineHealthFor("), `${page.length} chars`);
    const problems = engineCardWiring(page);
    ok("0.172.1 · ⛔ D19 · exactly one card, rendered only when the reader returned a view, from a value read once with no fallback", problems.length === 0, problems.join(" · "));
    const guardLine = "{houseEngine && <HouseEngineCard view={houseEngine} />}";
    const catchNull = ".catch((): HouseEngineHealthView | null => null)";
    const planted = [
      page.replace(guardLine, "<HouseEngineCard view={houseEngine ?? DEFAULT_ENGINE_VIEW} />"),
      page.replace(catchNull, ".catch((): HouseEngineHealthView | null => DEFAULT_ENGINE_VIEW)"),
      page.replace(guardLine, `${guardLine}\n${guardLine}`),
    ];
    const reported = planted.map((p) => engineCardWiring(p).length > 0);
    ok("0.172.c1 · CONTROL · an unguarded card with a default view, a reader whose failure falls back to a view, and a second card are each reported",
      page.includes(guardLine) && page.includes(catchNull) && reported.every(Boolean), j(reported));
  });
}

/* ═══ §0 · ruling 175 · one absence vocabulary ═══════════════════════════════════════════════════════════ */

/**
 * Every regular expression a file DECLARES whose pattern is fully known in source — a regex literal, or `RegExp(…)` /
 * `new RegExp(…)` with a plain string or substitution-free template — compiled with its flags, with its pattern source.
 * A pattern built from a variable (`new RegExp(f.source, f.flags)`, a template with `${…}`) is not the file's own text.
 */
export function declaredRegexes(file: string, code: string): Array<{ text: string; source: string; re: RegExp | null }> {
  const sf = parse(file, code);
  const out: Array<{ text: string; source: string; re: RegExp | null }> = [];
  const compile = (source: string, flags: string) => { try { return new RegExp(source, flags.replace(/[^dgimsuvy]/g, "")); } catch { return null; } };
  const sourceText = (n: ts.Node | undefined): string | null => {
    if (!n) return null;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (ts.isTaggedTemplateExpression(n) && n.tag.getText(sf) === "String.raw" && ts.isNoSubstitutionTemplateLiteral(n.template)) return n.template.rawText ?? n.template.text;
    return null;
  };
  walkTree(sf, (n) => {
    if (n.kind === ts.SyntaxKind.RegularExpressionLiteral) {
      const t = n.getText(sf);
      const cut = t.lastIndexOf("/");
      out.push({ text: t, source: t.slice(1, cut), re: compile(t.slice(1, cut), t.slice(cut + 1)) });
    } else if ((ts.isNewExpression(n) || ts.isCallExpression(n)) && n.expression.getText(sf) === "RegExp") {
      const src = sourceText(n.arguments?.[0]);
      if (src != null) out.push({ text: `RegExp(${JSON.stringify(src)})`, source: src, re: compile(src, sourceText(n.arguments?.[1]) ?? "") });
    }
  });
  return out;
}

/**
 * The words OTHER areas proposed (ruling 175, ADJ 13) that the module does not hold yet: they land only after the
 * `origin/main` measurement. A consumer that declares one is re-declaring vocabulary ahead of that gate, so the pin probes
 * with them too. The R2 words (house stake(s), dau la nyumba, 平台投注, staff-chosen) were measured and added with the first
 * client slot in C5 step 5 (ruling 192) and are shared samples now (0.175.r2); these four wait for the staff edge (step 7).
 */
export const PROPOSED_WORD_SAMPLES = ["staff edge", "enter now", "scorecard", "STAFF_EDGE"] as const;

/**
 * A text of the same SHAPE as `s` that says nothing: each letter becomes another letter of its own kind (a hex letter stays
 * a hex letter, a vowel a vowel, a consonant a consonant, case kept), each digit the next digit, each CJK character another,
 * separators unchanged. A pattern that matches `s` but not its twin is matching WHAT `s` says, not its shape: `\w+`,
 * `[a-z_]+` and `[0-9a-f]{24}` match both; `liquidity`, `dau la nyumba` and `hb_[0-9a-f]{24}` match only the sample.
 */
export function shapeTwin(s: string): string {
  const HEX = "bcdf", VOWELS = "iou", CONSONANTS = "ghjklmnpqrstvwxyz";
  const rotate = (set: string, c: string) => set[(set.indexOf(c) + 1) % set.length];
  return [...s].map((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    if (cp >= 0x3400 && cp <= 0x9fff) return String.fromCodePoint(cp === 0x4e00 ? 0x4e8c : 0x4e00);
    if (ch >= "0" && ch <= "9") return String((Number(ch) + 1) % 10);
    const lo = ch.toLowerCase();
    let t: string;
    if (lo === "a") t = "e";
    else if (lo === "e") t = "a";
    else if (lo.length === 1 && HEX.includes(lo)) t = rotate(HEX, lo);
    else if (lo.length === 1 && VOWELS.includes(lo)) t = rotate(VOWELS, lo);
    else if (lo.length === 1 && CONSONANTS.includes(lo)) t = rotate(CONSONANTS, lo);
    else return ch;
    return ch === lo ? t : t.toUpperCase();
  }).join("");
}

const globalOf = (re: RegExp) => new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
const nonEmptyMatches = (re: RegExp, s: string) => [...s.matchAll(globalOf(re))].map((m) => m[0]).filter((m) => m.length > 0);
/** A regex pattern's source with its syntax taken out, so the WORDS it spells can be read (`house[_ -]?bots?` → `housebots`). */
export function spelledWords(source: string): string {
  return source
    .replace(/\\[pPu]\{[^}]*\}/g, "")
    .replace(/\[(?:\\.|[^\]\\])*\]/g, "")
    .replace(/\\[bBdDsSwW]/g, "")
    .replace(/\\(.)/g, "$1")
    .replace(/\(\?(?:[:=!]|<[=!]|<\w+>)/g, "")
    .replace(/[()?*+^$]/g, "")
    .replace(/\{\d*,?\d*\}/g, "");
}
const namesHouse = (text: string) => houseHits(text).length > 0 || PROPOSED_WORD_SAMPLES.some((p) => text.toLowerCase().includes(p.toLowerCase()));
const CONSUMER_SAMPLES = [...HOUSE_WORD_SAMPLES, ...HOUSE_IDENTIFIER_SAMPLES, ...HOUSE_ID_SAMPLES, ...PROPOSED_WORD_SAMPLES];

/**
 * A declared pattern is VOCABULARY when either (a) it finds a sample — shared or proposed — whose match itself names the
 * feature, and does not find that sample's shape twin; or (b) its source SPELLS a shared or proposed word. (b) is what
 * catches a word list padded with a generic alternative (`liquidity|\w+`), which matches the twin too.
 */
export function isVocabularyPattern(d: { source: string; re: RegExp | null }): boolean {
  if (namesHouse(spelledWords(d.source))) return true;
  if (!d.re) return false;
  return CONSUMER_SAMPLES.some((s) => nonEmptyMatches(d.re!, s).some(namesHouse) && nonEmptyMatches(d.re!, shapeTwin(s)).length === 0);
}

/**
 * ⛔ THE CLOSED ALLOWLIST, per file, by EXACT text: code-scanning patterns whose source names a module path, not a word a
 * reader is shown. It may only shrink (0.175.allow fails on an entry its file no longer declares); an entry never moves to
 * another file (0.175.c10).
 */
export const VOCABULARY_PATTERN_ALLOWLIST: Readonly<Record<string, readonly string[]>> = {
  // The disclosure walker's own module-path test: `src/lib/house-bot/` and `house-bot-dal.ts` are the pure and DAL
  // modules §1.2 keeps out of client graphs, named by PATH.
  "scripts/house-bot-disclosure.test.mts": [String.raw`/[\\/]house-bot[\\/]|house-bot-dal/`],
};
/** Broader lists' code-scanning patterns that find a word sample's text by design (never a notice word list). */
export const BROADER_PATTERN_ALLOWLIST: Readonly<Record<string, readonly string[]>> = {
  // 4.2b · the seam test's check that every SEAM marker's window of market-service CODE touches house state (bare `house` or `ctx.kind`).
  "scripts/house-bot-seam.test.mts": [String.raw`/house|\bctx\.kind\b/i`],
};

const importsVocabulary = (file: string, code: string) => {
  let found = false;
  walkTree(parse(file, code), (n) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier) && n.moduleSpecifier.text.endsWith("house-bot-vocabulary.mjs")) found = true;
  });
  return found;
};

/** The single-source rule for one absence consumer: it imports the module and declares no vocabulary pattern of its own. */
export function ownVocabulary(file: string, raw: string): { imports: boolean; own: string[]; allowed: string[] } {
  const code = decomment(raw);
  const allow = VOCABULARY_PATTERN_ALLOWLIST[file] ?? [];
  const vocab = declaredRegexes(file, code).filter(isVocabularyPattern).map((d) => d.text);
  return { imports: importsVocabulary(file, code), own: vocab.filter((t) => !allow.includes(t)), allowed: vocab.filter((t) => allow.includes(t)) };
}
/**
 * The subset rule for a deliberately broader list: it extends the shared words at EXACTLY its measured sites, and declares
 * no pattern that finds a shared word sample by its words (a match on the sample, none on its shape twin) — so a list
 * that dropped the shared words but kept `house`/`nyumba` is reported as its own word list.
 */
export function broaderLists(file: string, raw: string): { extendsShared: number; ownWordLists: string[]; allowed: string[] } {
  const code = decomment(raw);
  const allow = BROADER_PATTERN_ALLOWLIST[file] ?? [];
  const words = declaredRegexes(file, code)
    .filter((d) => d.re && HOUSE_WORD_SAMPLES.some((s) => nonEmptyMatches(d.re!, s).length > 0 && nonEmptyMatches(d.re!, shapeTwin(s)).length === 0))
    .map((d) => d.text);
  return {
    extendsShared: importsVocabulary(file, code) ? (code.match(/\bextendHouseWords\s*\(/g) ?? []).length : 0,
    ownWordLists: words.filter((t) => !allow.includes(t)),
    allowed: words.filter((t) => allow.includes(t)),
  };
}

/** The five absence consumers of ruling 175 that exist at this commit (the service-layer sweep lands in §11 of this file). */
export const VOCABULARY_CONSUMERS = [
  "scripts/house-bot-disclosure.test.mts",
  "scripts/verify-house-bot-bundle.mjs",
  "scripts/house-bot-holder-view-shots.mts",
  "scripts/dsar-export-secrets.test.mts",
  "scripts/lib/house-bot-reports-cases.mts",
] as const;
/** The deliberately broader lists that import the shared words and extend them, with the EXACT number of extension sites. */
export const BROADER_LISTS: ReadonlyArray<readonly [file: string, extensions: number]> = [
  ["scripts/lib/house-bot-money-cases.mts", 2],
  ["scripts/house-bot-seam.test.mts", 2],
];

if (STORE === "memory") {
  section("§0 · ruling 175 · one absence vocabulary: every consumer imports it, none declares its own, broader lists extend it");
  await guard("0.175", () => {
    for (const file of VOCABULARY_CONSUMERS) {
      const r = ownVocabulary(file, read(file));
      ok(`0.175.${file.split("/").pop()} · imports the vocabulary module and declares no word, identifier or id pattern of its own (shared or proposed words)`, r.imports && r.own.length === 0, j(r));
    }
    for (const [file, n] of BROADER_LISTS) {
      const r = broaderLists(file, read(file));
      ok(`0.175.subset.${file.split("/").pop()} · its broader notice words extend the shared words at exactly ${n} sites and it keeps no word list of its own`, r.extendsShared === n && r.ownWordLists.length === 0, j(r));
    }
    const everyShared = HOUSE_WORD_SAMPLES.filter((s) => !extendHouseWords(["house", "50pick"]).test(s));
    ok("0.175.subset.module · an extended list still finds every shared word sample (the shared words are a subset by construction)", everyShared.length === 0, j(everyShared));
    const stale = [
      ...Object.entries(VOCABULARY_PATTERN_ALLOWLIST).flatMap(([file, texts]) => texts.filter((t) => !ownVocabulary(file, read(file)).allowed.includes(t)).map((t) => `${file}: ${t}`)),
      ...Object.entries(BROADER_PATTERN_ALLOWLIST).flatMap(([file, texts]) => texts.filter((t) => !broaderLists(file, read(file)).allowed.includes(t)).map((t) => `${file}: ${t}`)),
    ];
    ok("0.175.allow · every allowlisted pattern is still declared, and still a pattern the pin would report, in its own file (the lists may only shrink)", stale.length === 0, j(stale));
    const twinsSay = CONSUMER_SAMPLES.filter((s) => namesHouse(shapeTwin(s)) || shapeTwin(s) === s);
    ok("0.175.twin · CONTROL · every sample's shape twin differs from it and names nothing (otherwise (a) could never decide)", twinsSay.length === 0, j(twinsSay.map((s) => [s, shapeTwin(s)])));

    // ⛔ CONTROLS
    const disclosure = read("scripts/house-bot-disclosure.test.mts");
    const plant = (file: string, line: string) => ownVocabulary(file, `${read(file)}\n${line}\n`);
    const c1 = plant("scripts/house-bot-disclosure.test.mts", "const MINE = /liquidity|ukwasi|house[ -]?bots?/gi;");
    ok("0.175.c1 · CONTROL · a consumer that re-declares its own word regex (a literal) is reported", c1.own.length === 1, j(c1.own));
    const c2 = plant("scripts/verify-house-bot-bundle.mjs", "const ids = new RegExp(String.raw`\\bhb[iethp]?_[0-9a-f]{24}\\b`, \"g\");");
    ok("0.175.c2 · CONTROL · a consumer that builds its own id pattern with new RegExp(String.raw…) is reported", c2.own.length === 1, j(c2.own));
    const holderView = read("scripts/house-bot-holder-view-shots.mts");
    const importLine = 'import { houseHits } from "./lib/house-bot-vocabulary.mjs";';
    const noImport = ownVocabulary("scripts/house-bot-holder-view-shots.mts", holderView.replace(importLine, ""));
    ok("0.175.c3 · CONTROL · a consumer that stops importing the module is reported", holderView.includes(importLine) && noImport.imports === false, j(noImport));
    const benign = ownVocabulary("scripts/x.mjs", `import { houseHits } from "./lib/house-bot-vocabulary.mjs";\nconst a = /\\s+/g; const b = new RegExp(f.source, f.flags); const c = /\\.(js|css)$/; const d = /\\/admin\\/house\\b/; const e2 = /[^a-z0-9]+/gi; const f2 = /\\w+/; const g = /[0-9a-f]{24}/;\n// const e = /liquidity/;\nconst s = "const W = /liquidity/gi;";\n`);
    ok("0.175.c4 · CONTROL · whitespace, slug, word, hex and path regexes, a variable-built RegExp, /admin/house, a commented regex and a regex inside a STRING are not reported",
      benign.imports && benign.own.length === 0, j(benign));
    const money = read("scripts/lib/house-bot-money-cases.mts");
    const extendSite = 'extendHouseWords(["house", "50pick"])';
    const c5 = broaderLists("scripts/lib/house-bot-money-cases.mts", money.replace(extendSite, "/liquidity|ukwasi|house|50pick/i"));
    ok("0.175.c5 · CONTROL · a broader list rewritten as its own word regex is reported and loses an extension site", money.includes(extendSite) && c5.ownWordLists.length === 1 && c5.extendsShared === 1, j(c5));
    const codeScan = broaderLists("scripts/x.mts", `import { extendHouseWords } from "./house-bot-vocabulary.mjs";\nconst id = /houseBotId/; const act = /^house_bot\\./; extendHouseWords(["house"]);\n`);
    ok("0.175.c6 · CONTROL · code-scanning identifier regexes (/houseBotId/, /^house_bot\\./) in a broader-list file are not word lists", codeScan.ownWordLists.length === 0 && codeScan.extendsShared === 1, j(codeScan));
    const c7 = plant("scripts/dsar-export-secrets.test.mts", "const W = /dau la nyumba|house[ -]?stakes?/i;");
    const c7b = plant("scripts/dsar-export-secrets.test.mts", "const W = /staff edge|scorecard/i;");
    ok("0.175.c7b · CONTROL · a consumer that declares a word still PROPOSED (staff edge, scorecard) ahead of its measurement is reported", c7b.own.length === 1, j(c7b.own));
    ok("0.175.c7 · CONTROL · a consumer that declares an R2 word of its own (dau la nyumba, house stake — shared words since C5 step 5) is reported", c7.own.length === 1, j(c7.own));
    const c8a = plant("scripts/house-bot-holder-view-shots.mts", "const W = /liquidity|\\w+/;");
    const c8b = plant("scripts/house-bot-holder-view-shots.mts", "const W = /liquidity|\\w+_\\w+/;");
    ok("0.175.c8 · CONTROL · a word list padded with a generic alternative (liquidity|\\w+, liquidity|\\w+_\\w+) is still reported", c8a.own.length === 1 && c8b.own.length === 1, j({ a: c8a.own, b: c8b.own }));
    const c9 = broaderLists("scripts/lib/house-bot-money-cases.mts", money.replace(extendSite, "/houseStake|LIQUIDITY_LINE|house|nyumba|50pick/i"));
    ok("0.175.c9 · CONTROL · a broader list that DROPPED the shared words but kept house and nyumba is reported as its own word list", c9.ownWordLists.length === 1, j(c9));
    const moved = VOCABULARY_PATTERN_ALLOWLIST["scripts/house-bot-disclosure.test.mts"][0];
    const c10 = plant("scripts/verify-house-bot-bundle.mjs", `const P = ${moved};`);
    ok("0.175.c10 · CONTROL · an allowlisted pattern planted in ANOTHER consumer is reported (the allowlist is per file)", !!disclosure && c10.own.length === 1, j(c10.own));
  });

  /* ⛔ 0.505 · THE ROLL-CALL'S OWN POPULATION. Ruling 505 gave the expect-drift roll-call six call sites, which makes
   * the SET OF CALL SITES a hand-maintained population — the exact class 505, 512 and 513 all exist for. A seventh
   * house anchors file, or a seventh suite key inside one that already exists, would be audited by nobody and nothing
   * would say so. So the anchors FILES are walked from `scripts/anchors/` rather than typed, every suite key found in
   * them is required to be in `ROLL_CALL_SITES` (it has a roll-call) or `ROLL_CALL_OWED` (it does not, and the reason
   * is written down), a key in either table that appears in NO house anchors file is reported STALE, and the owed
   * list's LENGTH is pinned so it cannot quietly absorb a new key. */
  await guard("0.505", async () => {
    const anchorDir = join(ROOT, "scripts/anchors");
    const anchorFiles = readdirSync(anchorDir).filter((f) => f.startsWith("house") && f.endsWith(".anchors.mjs")).sort();
    const keys = new Map<string, number>();
    /** Which keys each anchors FILE declares — the population ruling 518's pin below reads. */
    const keysByFile = new Map<string, Set<string>>();
    for (const f of anchorFiles) {
      const mod: Any = await import(pathToFileURL(join(anchorDir, f)).href);
      const here = new Set<string>();
      for (const d of (mod.MUTATIONS ?? []) as DeclaredMutation[]) {
        const k = d.suite ?? "(none)";
        keys.set(k, (keys.get(k) ?? 0) + 1);
        here.add(k);
      }
      keysByFile.set(f, here);
    }
    const declared = [...keys.keys()].sort();
    const problems: string[] = [];
    for (const k of declared) {
      if (!Object.prototype.hasOwnProperty.call(ROLL_CALL_SITES, k) && !Object.prototype.hasOwnProperty.call(ROLL_CALL_OWED, k)) {
        problems.push(`suite key ${k} (${keys.get(k)} declaration(s)) is audited by no roll-call and is not recorded as owed`);
      }
    }
    for (const k of [...Object.keys(ROLL_CALL_SITES), ...Object.keys(ROLL_CALL_OWED)]) {
      if (!keys.has(k)) problems.push(`suite key ${k} is listed but appears in no house anchors file (the table is stale)`);
    }
    /**
     * ⛔ RULING 518 · A DECLARATION THAT LOSES ITS `suite` FIELD LEAVES EVERY ROLL-CALL, AND NOTHING SAID SO.
     * MEASURED 2026-09-18 on the real tree, before this pin existed: deleting the `suite` line from ONE
     * `house-bot-console.anchors.mjs` declaration left `test:house-bot-console` 1.318 GREEN at 154 (the declaration is no
     * longer "mine") AND left 0.505 GREEN at 117 (its key became "(none)", which `house-book` and `house-page`
     * legitimately own, since those two files are single-suite). So the declaration was audited by nobody, and
     * `red:house-bot-console` would have thrown `unknown suite undefined` inside C5-8's single batch run — the
     * WRONG-ASSERTION class one level up, in the guard written to end it. The rule is STRUCTURAL, so it needs no second
     * typed list and cannot drift: a suiteless declaration is readable only in a file whose declarations are ALL
     * suiteless.
     */
    const suitelessProblems = (byFile: ReadonlyMap<string, ReadonlySet<string>>): string[] => {
      const out: string[] = [];
      for (const [f, set] of [...byFile].sort((a, b) => a[0].localeCompare(b[0]))) {
        if (!set.has("(none)") || set.size === 1) continue;
        out.push(`${f} declares a mutation with NO suite field beside ${[...set].filter((k) => k !== "(none)").sort().join(", ")} — a suiteless declaration is readable only in a single-suite anchors file, so here no roll-call audits it and red:* cannot resolve its suite`);
      }
      return out;
    };
    problems.push(...suitelessProblems(keysByFile));
    const audited = declared.filter((k) => Object.prototype.hasOwnProperty.call(ROLL_CALL_SITES, k)).reduce((n, k) => n + (keys.get(k) ?? 0), 0);
    const owed = declared.filter((k) => !Object.prototype.hasOwnProperty.call(ROLL_CALL_SITES, k)).reduce((n, k) => n + (keys.get(k) ?? 0), 0);
    ok("0.505 · ⛔ RULING 505 · every suite key declared in ANY scripts/anchors/house*.anchors.mjs — the files walked from disk, never typed — either HAS an expect-drift roll-call or is recorded as owed with its reason, and neither table names a key no anchors file declares",
      problems.length === 0 && anchorFiles.length >= 6 && audited + owed >= 185 && Object.keys(ROLL_CALL_OWED).length === 7,
      j({ anchorFiles, keys: Object.fromEntries([...keys].sort()), audited, owed, problems }));
    /* ⛔ AND THE CONTROL, over the same detector: a key that no table names, and a table entry no file declares. */
    const detect = (ks: Map<string, number>, sites: Record<string, string>, owedList: Record<string, string>): string[] => {
      const out: string[] = [];
      for (const k of [...ks.keys()].sort()) if (!Object.prototype.hasOwnProperty.call(sites, k) && !Object.prototype.hasOwnProperty.call(owedList, k)) out.push(`unlisted:${k}`);
      for (const k of [...Object.keys(sites), ...Object.keys(owedList)]) if (!ks.has(k)) out.push(`stale:${k}`);
      return out;
    };
    const withNewKey = new Map(keys).set("limits-mem", 4);
    ok("0.505.c1 · CONTROL · a NEW suite key in an anchors file that no table names is reported, a table entry no file declares is reported stale, and the real pair is reported clean",
      detect(withNewKey, ROLL_CALL_SITES, ROLL_CALL_OWED).includes("unlisted:limits-mem")
        && detect(keys, { ...ROLL_CALL_SITES, "ghost-mem": "nowhere" }, ROLL_CALL_OWED).includes("stale:ghost-mem")
        && detect(keys, ROLL_CALL_SITES, ROLL_CALL_OWED).length === 0,
      j({ withNewKey: detect(withNewKey, ROLL_CALL_SITES, ROLL_CALL_OWED), real: detect(keys, ROLL_CALL_SITES, ROLL_CALL_OWED) }));
    /* ⛔ AND THE CONTROL FOR 518, over the same detector: one multi-suite file given a suiteless declaration. */
    const mixed = new Map<string, Set<string>>();
    for (const [f, set] of keysByFile) mixed.set(f, new Set(set));
    mixed.set("house-bot-console.anchors.mjs", new Set(["console-mem", "(none)"]));
    ok("0.505.c2 · CONTROL · ⛔ 518 · a declaration that LOST its suite field inside a MULTI-suite anchors file is reported, and the six real files are reported clean",
      suitelessProblems(mixed).some((p) => p.startsWith("house-bot-console.anchors.mjs")) && suitelessProblems(keysByFile).length === 0,
      j({ mixed: suitelessProblems(mixed), real: suitelessProblems(keysByFile) }));
  });
}

/* ═══ §0 · shared · what a file imports, resolved — read by the player-surface pin (198) and the console gate pin (260) ═══ */

/** Every module specifier a file names — static import, re-export, dynamic `import()` and `require` — from the syntax tree. */
export function importSpecifiers(file: string, code: string): Array<{ spec: string; names: string[]; typeOnly: boolean }> {
  const out: Array<{ spec: string; names: string[]; typeOnly: boolean }> = [];
  walkTree(parse(file, code), (n) => {
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const clause = n.importClause;
      const named = clause?.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements : [];
      const names = named.filter((e) => !e.isTypeOnly).map((e) => (e.propertyName ?? e.name).text);
      if (clause?.name) names.push("default");
      if (clause?.namedBindings && ts.isNamespaceImport(clause.namedBindings)) names.push("*");
      out.push({ spec: n.moduleSpecifier.text, names, typeOnly: !!clause?.isTypeOnly || (names.length === 0 && named.length > 0) });
    } else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      out.push({ spec: n.moduleSpecifier.text, names: ["(re-export)"], typeOnly: n.isTypeOnly });
    } else if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === "require"))) {
      const spec = literalText(n.arguments[0]);
      if (spec != null) out.push({ spec, names: ["(dynamic)"], typeOnly: false });
    }
  });
  return out;
}
/** A specifier resolved to a repo path with no extension: relative to the file, or through the `@/` alias. */
export function resolveSpec(fromRel: string, spec: string): string {
  const joined = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? `${fromRel.split("/").slice(0, -1).join("/")}/${spec}` : spec;
  const parts: string[] = [];
  for (const p of joined.split("/")) {
    if (p === "..") parts.pop();
    else if (p !== "." && p !== "") parts.push(p);
  }
  return parts.join("/").replace(/\.(tsx?|mts|mjs|js)$/, "");
}

/* ═══ §0 · C5 step 4 · ruling 191 (TGT-38) and ruling 197 · no refusal reads a requester; the KYC house figures stay on the officer's server ═══ */

/**
 * The R9 / R2 requester tokens (ruling 191), as identifiers — never a pattern (the vocabulary pin, ruling 175). A service may
 * carry them only as a payload value or the read that produces it; a page may not name the two viewer ones at all; a client
 * control may name none.
 */
export const REQUESTER_TOKENS = ["houseStake", "houseStakes", "staffChosen", "requestedBy", "byRequester", "houseStakeForAudit", "houseStakeByMarket"] as const;
export const PAGE_FORBIDDEN_TOKENS = ["requestedBy", "byRequester"] as const;
/** The two readers that produce a requester value. */
export const REQUESTER_READERS = ["houseStakeForAudit", "houseStakeByMarket"] as const;
/** (1) the services and actions that decide a market (ruling 191's list, measured at this commit). */
export const TGT38_SERVICES = [
  "src/lib/server/market-service.ts", "src/lib/server/objections-service.ts", "src/lib/server/updown-service.ts",
  "src/app/admin/resolver-queue/bulk-resolve-action.ts", "src/lib/server/bulk-resolve-eligibility.ts", "src/lib/server/resolution-policy.ts",
  "src/app/markets/actions.ts", "src/app/admin/objections/actions.ts", "src/app/admin/updown/actions.ts", "src/app/admin/ai-polls/actions.ts",
] as const;
/** (2) the pages an officer decides from. */
export const TGT38_PAGES = [
  "src/app/admin/resolver-queue/page.tsx", "src/app/admin/resolver/[id]/page.tsx", "src/app/admin/markets/page.tsx",
  "src/app/admin/markets/[id]/page.tsx", "src/app/admin/objections/page.tsx", "src/app/admin/updown/rounds/page.tsx",
] as const;
/** (3) the four client controls and the ceremony. */
export const TGT38_CONTROLS = [
  "src/app/admin/markets/emergency-void-control.tsx", "src/app/admin/objections/objection-decision.tsx", "src/app/admin/updown/rounds/void-round-control.tsx",
  "src/app/admin/resolver-queue/bulk-resolve-bar.tsx", "src/app/admin/resolver/[id]/resolution-ceremony.tsx",
] as const;
/**
 * The controls an officer decides WITH on those pages, and `ControlLocked`, the placeholder a page renders in a control's place:
 * a page condition that chooses between them is a lock (ruling 191 (2)).
 */
export const DECISION_CONTROLS = ["ResolveControls", "RecheckButton", "BulkResolveBar", "ResolutionCeremony", "EmergencyVoidControl", "ObjectionDecision", "VoidRoundControl", "ControlLocked"] as const;
/** Ruling 192's neutral slots: the only props through which a page may hand a decision control a rendered line or neutral house data. */
export const EXPOSURE_SLOT_PROPS = ["exposureSlot", "exposureState", "exposureCountTemplate"] as const;
/** What names the VIEWER's own stake on a page (ruling 193's comparison, the requester tokens) … */
export const PAGE_VIEWER_SEEDS = ["viewerClause", "requestedBy", "byRequester", "staffChosen"] as const;
/** … and what names the house stake itself (ruling 194's reads and parts). */
export const PAGE_HOUSE_SEEDS = ["houseStakeByMarket", "houseStakeForAudit", "houseStake", "houseStakes", "staffClause"] as const;

/** Every identifier-shaped word of a decommented text (strings included: a page that spells a token in a string names it). */
const wordsOf = (code: string): Set<string> => new Set(code.split(/[^A-Za-z0-9_$]+/).filter(Boolean));
const lf = (code: string) => code.split("\r\n").join("\n");
/** `code` with `from` replaced by `to`; throws unless `from` occurs exactly once (a plant that misses its anchor must not pass). */
const plant = (code: string, from: string, to: string): string => {
  const at = code.indexOf(from);
  if (at < 0 || code.indexOf(from, at + from.length) >= 0) throw new Error(`plant anchor must occur exactly once: ${from.slice(0, 60)}`);
  return code.slice(0, at) + to + code.slice(at + from.length);
};

/** An expression with parentheses, `as`, `!`, `satisfies` and `<T>` assertions taken off. */
const bare = (e: ts.Expression): ts.Expression => {
  let x = e;
  while (ts.isParenthesizedExpression(x) || ts.isAsExpression(x) || ts.isNonNullExpression(x) || ts.isSatisfiesExpression(x) || ts.isTypeAssertionExpression(x)) x = x.expression;
  return x;
};
/** The identifiers and string-literal texts under `node`; a nested function's body is skipped unless `intoFunctions`. */
function namesUnder(node: ts.Node, intoFunctions: boolean): string[] {
  const out: string[] = [];
  const go = (m: ts.Node) => {
    if (!intoFunctions && m !== node && ts.isFunctionLike(m)) return;
    if (ts.isIdentifier(m)) out.push(m.text);
    else if (ts.isStringLiteral(m) || ts.isNoSubstitutionTemplateLiteral(m)) out.push(m.text);
    ts.forEachChild(m, go);
  };
  go(node);
  return out;
}
const bindingNames = (name: ts.BindingName): string[] => (ts.isIdentifier(name) ? [name.text]
  : name.elements.flatMap((e) => (ts.isBindingElement(e) ? bindingNames(e.name) : [])));
const lineOf = (sf: ts.SourceFile, node: ts.Node) => sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
const snippet = (sf: ts.SourceFile, node: ts.Node) => node.getText(sf).replace(/\s+/g, " ").slice(0, 90);
/** A type position carries no runtime value: a type annotation, `typeof x` in a type, an interface or a type alias. */
const inTypePosition = (n: ts.Node): boolean => {
  for (let p = n.parent; p; p = p.parent) if (ts.isTypeNode(p) || ts.isInterfaceDeclaration(p) || ts.isTypeAliasDeclaration(p)) return true;
  return false;
};
const LOGICAL = [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken];

/**
 * The names that carry a value read from `seeds`, to a fixed point: a variable or an assignment whose right side reads one
 * outside a nested function (a `withLock` result whose callback reads the stake returns the decision, not the stake), and a
 * function, method or function-valued variable or property one of whose own `return`s (or whose expression body) reads one —
 * so a helper that answers "did this officer choose a stake?" carries the answer to its callers.
 */
function carriers(sf: ts.SourceFile, seeds: Iterable<string>): Set<string> {
  const tracked = new Set<string>(seeds);
  const reads = (node: ts.Node | undefined) => !!node && namesUnder(node, false).some((t) => tracked.has(t));
  const returnsRead = (fn: ts.Node): boolean => {
    const body = (fn as Any).body as ts.Node | undefined;
    if (!body) return false;
    if (!ts.isBlock(body)) return namesUnder(body, true).some((t) => tracked.has(t));
    let hit = false;
    const go = (m: ts.Node) => {
      if (hit || (m !== body && ts.isFunctionLike(m))) return;
      if (ts.isReturnStatement(m) && m.expression && namesUnder(m.expression, true).some((t) => tracked.has(t))) { hit = true; return; }
      ts.forEachChild(m, go);
    };
    go(body);
    return hit;
  };
  for (let grew = true; grew;) {
    grew = false;
    const add = (names: string[]) => { for (const name of names) if (!tracked.has(name)) { tracked.add(name); grew = true; } };
    walkTree(sf, (n) => {
      if (ts.isVariableDeclaration(n) && n.initializer) {
        const init = bare(n.initializer);
        if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) { if (returnsRead(init)) add(bindingNames(n.name)); }
        else if (reads(n.initializer)) add(bindingNames(n.name));
      } else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left) && reads(n.right)) add([n.left.text]);
      else if ((ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name && ts.isIdentifier(n.name) && returnsRead(n)) add([n.name.text]);
      else if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name)) {
        const init = bare(n.initializer);
        if ((ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && returnsRead(init)) add([n.name.text]);
      }
    });
  }
  return tracked;
}

/**
 * TGT-38 over one service or action (ruling 191 (1)), in two layers.
 *
 * (A) POSITIONS — the ruling's positive rule. Every occurrence of a requester token, of a reader's alias, or of a name bound
 * by `await <reader>(…)` must be one of: an import (static, or destructured from `await import(…)`); a type position; the name
 * of a variable whose initializer is exactly `await <reader>(…)`, or that call's callee; the name of a variable initialised to
 * an empty object `{}` (the bulk action's map); a top-level key of the `payload` object in `audit({…})`, or that key's value
 * when the value is exactly the name; or the map write `map[key] = name`. Anything else is reported: a condition, a helper's
 * `return`, an array predicate, an `ok: true` result, an argument to any other call.
 *
 * (B) KINDS — the same reads named by where they decide: a token or a carrier (above) in an if / while / do / for / switch /
 * ternary condition, an `&&` / `||` operand, an array predicate (`filter`, `find`, `some`, `every` …), and a `return` or a
 * line that answers `ok: false`.
 */
export function requesterScan(file: string, code: string): { problems: string[]; allowed: string[] } {
  const sf = parse(file, code);
  const readers = new Set<string>(REQUESTER_READERS);
  walkTree(sf, (n) => {
    if (ts.isBindingElement(n) && n.propertyName && ts.isIdentifier(n.propertyName) && readers.has(n.propertyName.text) && ts.isIdentifier(n.name)) readers.add(n.name.text);
    if (ts.isImportSpecifier(n) && n.propertyName && readers.has(n.propertyName.text)) readers.add(n.name.text);
  });
  const readCall = (e: ts.Expression | undefined): ts.CallExpression | null => {
    if (!e) return null;
    const x = bare(e);
    if (!ts.isAwaitExpression(x)) return null;
    const call = bare(x.expression);
    return ts.isCallExpression(call) && ts.isIdentifier(bare(call.expression)) && readers.has((bare(call.expression) as ts.Identifier).text) ? call : null;
  };
  const tracked = new Set<string>([...REQUESTER_TOKENS, ...readers]);
  walkTree(sf, (n) => { if (ts.isVariableDeclaration(n) && readCall(n.initializer)) for (const name of bindingNames(n.name)) tracked.add(name); });

  const inAuditPayload = (id: ts.Identifier): boolean => {
    const prop = id.parent;
    const own = (ts.isShorthandPropertyAssignment(prop) && prop.name === id)
      || (ts.isPropertyAssignment(prop) && (prop.name === id || bare(prop.initializer) === id));
    if (!own) return false;
    const payloadObject = prop.parent;
    const payload = payloadObject?.parent;
    if (!payloadObject || !ts.isObjectLiteralExpression(payloadObject) || !payload || !ts.isPropertyAssignment(payload)
      || !ts.isIdentifier(payload.name) || payload.name.text !== "payload" || bare(payload.initializer) !== payloadObject) return false;
    const entry = payload.parent;
    const call = entry?.parent;
    return !!entry && ts.isObjectLiteralExpression(entry) && !!call && ts.isCallExpression(call) && call.arguments[0] === entry
      && ts.isIdentifier(bare(call.expression)) && (bare(call.expression) as ts.Identifier).text === "audit";
  };
  const whyAllowed = (id: ts.Identifier): string | null => {
    if (inTypePosition(id)) return "a type";
    for (let p: ts.Node | undefined = id.parent; p && !ts.isSourceFile(p); p = p.parent) if (ts.isImportDeclaration(p)) return "an import";
    const parent = id.parent;
    if (ts.isBindingElement(parent) && (parent.name === id || parent.propertyName === id)) {
      let decl: ts.Node | undefined = parent.parent;
      while (decl && ts.isObjectBindingPattern(decl)) decl = decl.parent;
      if (decl && ts.isVariableDeclaration(decl) && decl.initializer) {
        let x = bare(decl.initializer);
        if (ts.isAwaitExpression(x)) x = bare(x.expression);
        if (ts.isCallExpression(x) && x.expression.kind === ts.SyntaxKind.ImportKeyword) return "an import";
      }
      return null;
    }
    if (ts.isVariableDeclaration(parent) && parent.name === id) {
      if (readCall(parent.initializer)) return "the read's binding";
      const init = parent.initializer ? bare(parent.initializer) : null;
      if (init && ts.isObjectLiteralExpression(init) && init.properties.length === 0) return "an empty map";
      return null;
    }
    if (ts.isCallExpression(parent) && parent.expression === id) {
      let up: ts.Node = parent;
      while (up.parent && (ts.isParenthesizedExpression(up.parent) || ts.isAwaitExpression(up.parent) || ts.isAsExpression(up.parent) || ts.isNonNullExpression(up.parent))) up = up.parent;
      if (up.parent && ts.isVariableDeclaration(up.parent) && readCall(up.parent.initializer) === parent) return "the read";
      return null;
    }
    if (inAuditPayload(id)) return "an audit payload";
    const assign = ts.isElementAccessExpression(parent) && parent.expression === id ? parent.parent
      : ts.isBinaryExpression(parent) && bare(parent.right) === id ? parent : null;
    if (assign && ts.isBinaryExpression(assign) && assign.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isExpressionStatement(assign.parent)
      && ts.isElementAccessExpression(assign.left) && ts.isIdentifier(assign.left.expression) && tracked.has(assign.left.expression.text)
      && ts.isIdentifier(bare(assign.right)) && tracked.has((bare(assign.right) as ts.Identifier).text)
      && !namesUnder(assign.left.argumentExpression, true).some((t) => tracked.has(t))) return "the map write";
    return null;
  };

  const problems: string[] = [];
  const allowed: string[] = [];
  walkTree(sf, (n) => {
    if (ts.isIdentifier(n) && tracked.has(n.text)) {
      const why = whyAllowed(n);
      if (why) allowed.push(`${file}:${lineOf(sf, n)}: ${n.text} (${why})`);
      else problems.push(`${file}:${lineOf(sf, n)}: a requester value outside a payload or its read: ${n.text} in ${snippet(sf, n.parent)}`);
    } else if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && (REQUESTER_TOKENS as readonly string[]).includes(n.text) && !inTypePosition(n)) {
      problems.push(`${file}:${lineOf(sf, n)}: a requester token spelled as a string: ${snippet(sf, n.parent)}`);
    }
  });

  const carried = carriers(sf, tracked);
  const reads = (node: ts.Node | undefined) => !!node && namesUnder(node, true).some((t) => carried.has(t));
  const say = (what: string, node: ts.Node) => problems.push(`${file}:${lineOf(sf, node)}: ${what} ${snippet(sf, node)}`);
  const ARRAY_PREDICATES = new Set(["filter", "find", "findIndex", "findLast", "findLastIndex", "some", "every"]);
  walkTree(sf, (n) => {
    if ((ts.isIfStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n)) && reads(n.expression)) say("a condition reads a requester value:", n.expression);
    else if (ts.isForStatement(n) && reads(n.condition)) say("a loop condition reads a requester value:", n.condition!);
    else if (ts.isSwitchStatement(n) && reads(n.expression)) say("a switch reads a requester value:", n.expression);
    else if (ts.isConditionalExpression(n) && reads(n.condition)) say("a ternary reads a requester value:", n.condition);
    else if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(n.operatorToken.kind) && (reads(n.left) || reads(n.right))) say("an && / || operand reads a requester value:", n);
    else if (ts.isReturnStatement(n) && n.expression && /\bok\s*:\s*false\b/.test(n.expression.getText(sf)) && reads(n.expression)) say("a refusal returns a requester value:", n);
    else if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && ARRAY_PREDICATES.has(n.expression.name.text)
      && n.arguments.some((a) => ts.isFunctionLike(a) && reads(a))) say("an array predicate reads a requester value:", n);
  });
  code.split("\n").forEach((line, k) => {
    if (/\bok\s*:\s*false\b/.test(line) && [...wordsOf(line)].some((t) => carried.has(t))) problems.push(`${file}:${k + 1}: a line that answers ok: false names a requester value`);
  });
  return { problems: [...new Set(problems)], allowed };
}
export const requesterRefusalProblems = (file: string, code: string): string[] => requesterScan(file, code).problems;

/** Ruling 191 (2) and (3): the words a page or a client control names. */
export function requesterNamingProblems(file: string, code: string, forbidden: readonly string[]): string[] {
  const words = wordsOf(code);
  return forbidden.filter((t) => words.has(t)).map((t) => `${file} names ${t}`);
}

/**
 * Ruling 191 (2) beyond naming: no page CONDITION reads the house stake or the viewer's share of it to decide a control. From
 * step 5 a page holds `viewerClause(view, session.userId)` — non-empty exactly when the viewer chose a stake — without ever
 * spelling `requestedBy`, so a word check alone cannot see a UI lock. Carriers (above) start from the viewer seeds and the
 * house seeds. Reported:
 *   · a ternary or an `&&` / `||` / `??` whose condition part reads a carrier while a DECISION control sits in it;
 *   · an `if` or `switch` reading one whose branches hold a control, or that returns early from a function rendering one;
 *   · a decision control's prop reading the viewer's share (any prop but ruling 192's slots), or the house stake (any prop but
 *     the slots and the bulk bar's `rows`, which carry ruling 192's neutral `exposureState`).
 * Display stays free: `view ? <HouseLine/> : <UnreadLine/>`, `mine ? <span>{mine}</span> : null`, a slot holding the line.
 */
export function pageConditionProblems(file: string, code: string): { problems: string[]; controls: string[] } {
  const sf = parse(file, code);
  const viewer = carriers(sf, PAGE_VIEWER_SEEDS);
  const any = carriers(sf, [...PAGE_VIEWER_SEEDS, ...PAGE_HOUSE_SEEDS]);
  const readsIn = (set: Set<string>, node: ts.Node | undefined) => !!node && namesUnder(node, true).some((t) => set.has(t));
  const controlTag = (n: ts.Node): string | null => {
    if (!ts.isJsxOpeningElement(n) && !ts.isJsxSelfClosingElement(n)) return null;
    const tag = n.tagName.getText(sf);
    return (DECISION_CONTROLS as readonly string[]).includes(tag) ? tag : null;
  };
  const holdsControl = (node: ts.Node | null | undefined): boolean => {
    if (!node) return false;
    let hit = false;
    const go = (m: ts.Node) => { if (hit) return; if (controlTag(m)) { hit = true; return; } ts.forEachChild(m, go); };
    go(node);
    return hit;
  };
  const ownReturn = (node: ts.Node): boolean => {
    let hit = false;
    const go = (m: ts.Node) => { if (hit || (m !== node && ts.isFunctionLike(m))) return; if (ts.isReturnStatement(m)) { hit = true; return; } ts.forEachChild(m, go); };
    go(node);
    return hit;
  };
  const enclosingBody = (n: ts.Node): ts.Node | null => {
    for (let p = n.parent; p; p = p.parent) if (ts.isFunctionLike(p)) return ((p as Any).body as ts.Node | undefined) ?? null;
    return null;
  };
  const controls = new Set<string>();
  const problems: string[] = [];
  const say = (what: string, node: ts.Node) => problems.push(`${file}:${lineOf(sf, node)}: ${what} ${snippet(sf, node)}`);
  walkTree(sf, (n) => {
    const tag = controlTag(n);
    if (tag) {
      controls.add(tag);
      for (const attr of (n as ts.JsxOpeningElement | ts.JsxSelfClosingElement).attributes.properties) {
        const name = ts.isJsxAttribute(attr) ? attr.name.getText(sf) : null;
        if (name && (EXPOSURE_SLOT_PROPS as readonly string[]).includes(name)) continue;
        const expr = ts.isJsxSpreadAttribute(attr) ? attr.expression : attr.initializer;
        if (readsIn(viewer, expr)) say(`a decision control's prop reads the viewer's stake: <${tag}>`, attr);
        else if (readsIn(any, expr) && !(tag === "BulkResolveBar" && name === "rows")) say(`a decision control's prop reads the house stake: <${tag}>`, attr);
      }
    }
    if (ts.isConditionalExpression(n) && readsIn(any, n.condition) && holdsControl(n)) say("a ternary on house-stake data decides a control:", n);
    else if (ts.isBinaryExpression(n) && LOGICAL.includes(n.operatorToken.kind) && readsIn(any, n.left) && holdsControl(n)) say("an && / || / ?? on house-stake data decides a control:", n);
    else if (ts.isIfStatement(n) && readsIn(any, n.expression)
      && (holdsControl(n.thenStatement) || holdsControl(n.elseStatement) || ((ownReturn(n.thenStatement) || (!!n.elseStatement && ownReturn(n.elseStatement))) && holdsControl(enclosingBody(n))))) {
      say("an if on house-stake data decides a control:", n.expression);
    } else if (ts.isSwitchStatement(n) && readsIn(any, n.expression) && (holdsControl(n.caseBlock) || holdsControl(enclosingBody(n)))) say("a switch on house-stake data decides a control:", n.expression);
  });
  return { problems: [...new Set(problems)], controls: [...controls].sort() };
}

/**
 * ⛔ OWNER RULING D20 (2026-09-17) · the R9 site list is EMPTY, and that is the un-build's own guard: no audit payload
 * anywhere under `src/` carries `houseStake` or `houseStakes` (rulings 187–190 struck, un-built in C5-5b). A decision
 * audit that starts carrying a house stake again — in any file, under any action — is reported as a new site.
 */
export const R9_AUDIT_SITES: readonly string[] = [];

/**
 * Every call to an audit writer in `{rel, code}` files (a callee whose name ends in "audit", any case: `audit`, `recordAudit`,
 * `houseAudit` …): each `houseStake` / `houseStakes` key in its arguments (outside nested functions) is a SITE when it is a
 * top-level key of the entry's `payload` object, and a PROBLEM anywhere else; a payload that is not an object literal, or a
 * payload spread, naming a requester token is a problem too.
 */
export function r9AuditSites(files: Array<{ rel: string; code: string }>): { sites: string[]; problems: string[]; literalAuditCalls: number } {
  const sites: string[] = [];
  const problems: string[] = [];
  let literalAuditCalls = 0;
  const KEYS = new Set(["houseStake", "houseStakes"]);
  const namesToken = (node: ts.Node) => namesUnder(node, false).some((t) => (REQUESTER_TOKENS as readonly string[]).includes(t));
  for (const { rel, code } of files) {
    if (!/audit\s*\(/i.test(code)) continue;
    const sf = parse(rel, code);
    walkTree(sf, (n) => {
      if (!ts.isCallExpression(n)) return;
      const callee = bare(n.expression);
      const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : "";
      if (!/audit$/i.test(name)) return;
      const first = n.arguments[0] ? bare(n.arguments[0]) : undefined;
      const entry = first && ts.isObjectLiteralExpression(first) ? first : null;
      const propOf = (o: ts.ObjectLiteralExpression, key: string) => o.properties.find((p): p is ts.PropertyAssignment =>
        ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === key);
      const actionProp = entry ? propOf(entry, "action") : undefined;
      const action = actionProp ? literalText(bare(actionProp.initializer)) ?? "(non-literal)" : "(none)";
      if (name === "audit" && actionProp && action !== "(non-literal)") literalAuditCalls++;
      const payloadProp = entry ? propOf(entry, "payload") : undefined;
      const payload = payloadProp ? bare(payloadProp.initializer) : undefined;
      const payloadObject = payload && ts.isObjectLiteralExpression(payload) ? payload : null;
      for (const arg of n.arguments) {
        const go = (m: ts.Node) => {
          if (m !== arg && ts.isFunctionLike(m)) return;
          if ((ts.isPropertyAssignment(m) || ts.isShorthandPropertyAssignment(m)) && (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name)) && KEYS.has(m.name.text)) {
            if (payloadObject && m.parent === payloadObject) sites.push(`${m.name.text} · ${action} · ${rel}`);
            else problems.push(`${rel}:${lineOf(sf, m)}: ${m.name.text} outside the top level of an audit payload (${action})`);
          }
          ts.forEachChild(m, go);
        };
        go(arg);
      }
      if (payload && !payloadObject && namesToken(payload)) problems.push(`${rel}:${lineOf(sf, payload)}: a payload that is not an object literal names a requester token (${action})`);
      if (payloadObject) for (const p of payloadObject.properties) if (ts.isSpreadAssignment(p) && namesToken(p.expression)) problems.push(`${rel}:${lineOf(sf, p)}: a payload spread names a requester token (${action})`);
    });
  }
  return { sites: sites.sort(), problems, literalAuditCalls };
}

/* ═══ §0 · ruling 198 · no player surface imports a house read module, names one, or prints a house word ═══ */

/** Ruling 198 · the two player files that must never import a house read module, and the modules. */
export const PLAYER_SURFACE_FILES = ["src/components/markets/resolution-panel.tsx", "src/app/markets/[id]/page.tsx"] as const;
/**
 * The house read modules no player surface may import. `exposure-copy` and `house-bot/exposure` were un-built by owner
 * ruling D20 (C5-5b): their paths stay here as NEEDLES — absence protection only widens (ruling 263), so a re-created
 * module imported by a player surface is reported the day it appears.
 */
export const R2_MODULES = ["src/lib/house-bot/exposure-copy", "src/lib/server/house-bot/exposure", "src/lib/house-bot/stake-snapshot"] as const;
/** Every house read module a file names — static import, re-export, `import()` or `require` — resolved through the `@/` alias and relative paths. */
export const r2ImportsOf = (rel: string, code: string): string[] =>
  importSpecifiers(rel, code).map((i) => resolveSpec(rel, i.spec)).filter((r) => (R2_MODULES as readonly string[]).includes(r));

/**
 * Ruling 198 · the player notices and the player letter whose BODIES stay what they are, as `[file, function]`. The pin
 * reads each function's own declaration, never the module's imports.
 */
export const PLAYER_NOTIFIERS = [
  ["src/lib/server/notification-service.ts", "notifyMarketCancelled"],
  ["src/lib/server/notification-service.ts", "notifyObjectionDecided"],
  ["src/lib/server/notification-service.ts", "notifyVerdictRecorded"],
  ["src/lib/server/email.ts", "marketCancelledRefundHtml"],
  ["src/lib/server/market-service.ts", "notifyVerdictRecordedForMarket"],
] as const;
/**
 * The sha256 of each declaration's decommented text (trailing spaces and blank lines dropped), measured at `4c82c99b`
 * before step 5's code. ⛔ A change here is a change to a player's notice: re-measure only with the change reviewed as one.
 */
export const PLAYER_NOTIFIER_HASHES: Readonly<Record<string, string>> = {
  notifyMarketCancelled: "0feaad927016a8180cb40edf492b2c5710567d8b9fb716a2e93e9212449e1392",
  notifyObjectionDecided: "72d9f9fe6b0a919bde881b47fc2f7863b54d55b1f9c38a2239fd23c2e219e6a2",
  notifyVerdictRecorded: "42c58491831e558eb3e63b2c2bb1a17ad7637cf41a0bcb1c9b342f28a1c0b222",
  marketCancelledRefundHtml: "9459244bfe07cd3e2166c2c9d56efb330290f00b133ac4a052e0d3159c8a1c9b",
  notifyVerdictRecordedForMarket: "e9589970eac191406dcd3963c0742e795e3374c11d3f1936c8808b3ad63596a8",
};
/** One function declaration's own text (the fnBody of seam 6.h1b, cut by the syntax tree at its closing brace), or "". */
export function functionDeclarationText(file: string, code: string, name: string): string {
  let text = "";
  walkTree(parse(file, code), (n) => { if (!text && ts.isFunctionDeclaration(n) && n.name?.text === name) text = n.getText(); });
  return text;
}
const normalisedBody = (text: string) => lf(text).split("\n").map((l) => l.replace(/\s+$/, "")).filter((l) => l.length > 0).join("\n");
/** The names a module exports (functions, constants, types), read from its own syntax tree — so a new export is covered with no
 *  list to update. Read of `stake-snapshot.ts` (0.198.2's needles) and of the audit module (0.260.1's classification). */
export function exportedNames(file: string, code: string): string[] {
  const out = new Set<string>();
  walkTree(parse(file, code), (n) => {
    const exported = (ts.canHaveModifiers(n) ? ts.getModifiers(n) ?? [] : []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) return;
    if ((ts.isFunctionDeclaration(n) || ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n)) && n.name) out.add(n.name.text);
    if (ts.isVariableStatement(n)) for (const d of n.declarationList.declarations) for (const name of bindingNames(d.name)) out.add(name);
  });
  return [...out].sort();
}
/** Every string a declaration or a file can print: string literals, the text parts of template literals and JSX text. */
function printedTexts(file: string, text: string): string {
  const out: string[] = [];
  walkTree(parse(file, text), (n) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || ts.isJsxText(n)) out.push(n.text);
  });
  return out.join(" ");
}
/**
 * One player notifier's problems: a missing declaration, a named R2 export, a house WORD in anything it can print (the
 * vocabulary's words family over its strings and template text — its code keeps the standing option of C4 ruling 145,
 * `houseOnly` and `houseBotId`, which the hash pins instead), and a body whose bytes moved.
 */
export function playerNotifierProblems(file: string, code: string, name: string, r2Exports: readonly string[], house: (s: string) => string[]): string[] {
  const text = functionDeclarationText(file, code, name);
  if (text.length < 200) return [`${file}: ${name} was not found (or is a stub)`];
  const problems: string[] = [];
  const named = r2Exports.filter((x) => wordsOf(text).has(x));
  if (named.length > 0) problems.push(`${file}: ${name} names R2 exports ${named.join(", ")}`);
  const words = house(printedTexts(file, text));
  if (words.length > 0) problems.push(`${file}: ${name} carries house wording ${words.join(", ")}`);
  const hash = createHash("sha256").update(normalisedBody(text)).digest("hex");
  if (hash !== PLAYER_NOTIFIER_HASHES[name]) problems.push(`${file}: ${name}'s body is not the body measured at 4c82c99b (${hash.slice(0, 12)})`);
  return problems;
}

/* ═══ §0 · ruling 259 · the console gate's own module ═══ */

/** The console gate (ruling 259): the audience question and the audit-row gate, each decided on the viewer's stored role. */
export const CONSOLE_READ_MODULE = "src/lib/server/house-console-read";
/** One source line, whitespace collapsed — how the console pins quote the code they read. */
const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * Ruling 198, read from disk: every module a player can reach through a route or a shared component — everything under
 * `src/app/` except `src/app/admin/`, and under `src/components/` except `src/components/admin/` (route handlers included)
 * — imports none of the R2 modules or the console readers, by any form. The officer's server homes (the decision services,
 * the notifier, the letters, the admin pages) live outside this population.
 */
export const HOUSE_READ_MODULES = [...R2_MODULES, CONSOLE_READ_MODULE] as const;
export const inPlayerPopulation = (rel: string) =>
  (rel.startsWith("src/app/") && !rel.startsWith("src/app/admin/")) || (rel.startsWith("src/components/") && !rel.startsWith("src/components/admin/"));
export function playerImportProblems(files: Array<{ rel: string; code: string }>): { population: number; problems: string[] } {
  const population = files.filter((f) => inPlayerPopulation(f.rel));
  const problems = population.flatMap(({ rel, code }) =>
    importSpecifiers(rel, code).map((i) => resolveSpec(rel, i.spec)).filter((r) => (HOUSE_READ_MODULES as readonly string[]).includes(r)).map((r) => `${rel} imports ${r}`));
  return { population: population.length, problems };
}

/* ═══ §0 · C5 step 5 close · ruling 260 · every audit row a console file reads, and every house read it names, goes through the gate ═══ */

/** The platform audit module and its row readers: every exported `getAudit*` (0.260.1 compares the list with the module's own exports). */
export const AUDIT_MODULE = "src/lib/server/audit";
export const AUDIT_ROW_READERS = ["getAuditById", "getAuditByActionsDurable", "getAuditForActor", "getAuditForActorDurable", "getAuditForTarget", "getAuditForTargetDurable", "getAuditForTargetsDurable", "getAuditPage", "getAuditPageDurable"] as const;
/**
 * Every other export of the audit module, each of which returns no row: the writer and its flush, the ring's size, the
 * chain's checks over rows handed in, and the two types. 0.260.1 holds the module's exports to exactly the two lists, so a
 * new export under ANY name has to be classified before a console file may read it.
 */
export const AUDIT_NON_READERS = ["AuditCategory", "AuditEntry", "audit", "auditFlush", "auditRingSize", "classifyChainLinks", "reconstructChainOrder", "verifyChain", "verifyChainFull"] as const;
/**
 * Every file OUTSIDE the console that calls an audit row reader, and why its rows never reach a console page raw (a service
 * handing a page unfiltered rows would pass the console pin, which reads console files only). 0.260.1 compares this list
 * with the files read from disk both ways, so a new reader outside the console is classified here or goes red.
 */
export const AUDIT_READERS_OUTSIDE_CONSOLE: Readonly<Record<string, string>> = {
  "src/app/api/dev-test/stress-regulator-grade/route.ts": "a dev-test route that answers 404 in production; it counts the ring's rows and checks their order",
  "src/lib/server/house-bot/eligibility.ts": "the designation's own officer lookup: an email read from the holder's rows, never a row handed on",
  "src/lib/server/house-bot/oversight.ts": "Commit 4's oversight alerts about what staff did with a bot: rows read by action and folded into two AlertOnce keys (ruling 264)",
  "src/lib/server/kyc-risk.ts": "the KYC withdrawal refusals and the aml approvals, read by action and folded into counts and a recommendation",
  "src/lib/server/notification-service.ts": "a KYC case's own history, read to word that case's KYC notice",
  "src/lib/server/refused-funds.ts": "the refused-funds decisions only, read by their actions (REFUSED_FUNDS_ACTION)",
  "src/lib/server/report-pack.ts": "a report pack's own pack.* rows",
  "src/lib/server/reports/catalogue.ts": "report files behind the platform's report gate: the ISO 27001 chain export and the RG engagement report's rg.* rows",
  "src/lib/server/user-service.ts": "a player's own export and feed: house actions excluded in the read and house keys stripped (rulings 154, 170)",
};
/**
 * The ONE console file that may name a house read module other than the gate: the system page's engine card, whose reader
 * is its own ADMIN-only gate (ruling 172, pin 0.172).
 * ⛔ The bulk resolve action's R9 snapshot was the second entry until owner ruling D20 un-built R9 (C5-5b). The exemption
 * went with the code it excused: an allowance nothing needs any more is removed, never left standing.
 */
export const CONSOLE_HOUSE_READ_ALLOWED: Readonly<Record<string, readonly string[]>> = {
  "src/app/admin/system/page.tsx": ["src/lib/server/house-bot/engine-health"],
};
/**
 * The officer hooks a console action may fire and forget (ruling 260): `void import(<hook>).then((m) => m.<hook>(…))`, with at
 * most a `.catch` that swallows — the hook's result is never read back. Any other house module, or a callback that does more
 * than call the hook, is a kept read.
 */
export const HOUSE_HOOK_MODULES = ["src/lib/server/house-bot/holder-hook", "src/lib/server/house-bot/money-hook"] as const;
/**
 * The console gate's exports (rulings 259, 260) and how many arguments each takes: the viewer, the route, and the read or
 * its ids. `houseStakeForConsole` and `houseBotLabelsForConsole` were un-built with the display (D20, C5-5b); their names
 * stay here as needles, so a console file that calls one again is measured by the same rules (0.260.1 holds their call
 * count at exactly 0).
 * ⭐ `houseRosterForConsole` — C7-SPEC ruling 340, added with C7 step 1. It is the first of the QUERY-shaped readers:
 * `(viewerUserId, route)`, the audience resolved inside it before any read, a PAINTED view model or `null` out. Every
 * new reader joins this table with its arity in the SAME change as its first call site, or the arity pin, the
 * signed-in-viewer pin and the own-route pin stop measuring it.
 * ⛔ AND THAT SENTENCE IS NOW A GUARD, NOT AN INSTRUCTION (ruling 512): case 0.512 compares this table with the gate
 * module's own exports in BOTH directions, so a new gated reader added without its entry is red the day it is written
 * and an entry naming no export is red the day the reader goes. Only `CONSOLE_GATE_STRUCK`'s two D20 needles may sit
 * here without an export, and only while the run measures them at 0 calls.
 */
export const CONSOLE_GATES: Readonly<Record<string, number>> = { houseStakeForConsole: 3, houseBotLabelsForConsole: 3, houseConsoleAudience: 2, houseAuditForConsole: 3, houseRosterForConsole: 2, houseUsageForConsole: 3 };
/** A console file: a page, layout, route, action or component the console serves — everything under the three admin folders. */
export const inConsolePopulation = (rel: string) =>
  rel.startsWith("src/app/admin/") || rel.startsWith("src/app/api/admin/") || rel.startsWith("src/components/admin/");
/** A house READ module: the house-bot server folder and the house store. (The pure copy folder `src/lib/house-bot/` is not a
 *  read; what keeps it out of the public JavaScript is `test:house-bot-disclosure` §1.2, ruling 174's client-bundle law.) */
const isHouseReadModule = (resolved: string) => resolved.startsWith("src/lib/server/house-bot/") || resolved === "src/lib/server/house-bot-dal";
/** The console route a file under `src/app/admin/` serves (its folder, dynamic segments kept); `null` anywhere else. */
export const consoleRouteOf = (rel: string): string | null =>
  rel.startsWith("src/app/admin/") ? `/${rel.slice("src/app/".length).split("/").slice(0, -1).join("/")}` : null;

/**
 * The audit row readers a file calls: imported from the audit module by name (an alias included) or through a namespace.
 * Returns each call node with the reader it names, and the problems of a file that reaches the module another way.
 */
function auditReaderCalls(rel: string, sf: ts.SourceFile): Array<{ call: ts.CallExpression; reader: string }> {
  const readerLocals = new Map<string, string>();
  const namespaces = new Set<string>();
  for (const st of sf.statements) {
    if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || resolveSpec(rel, st.moduleSpecifier.text) !== AUDIT_MODULE) continue;
    const clause = st.importClause;
    if (!clause || clause.isTypeOnly) continue;
    const bindings = clause.namedBindings;
    if (bindings && ts.isNamespaceImport(bindings)) namespaces.add(bindings.name.text);
    if (bindings && ts.isNamedImports(bindings)) {
      for (const e of bindings.elements) {
        const imported = (e.propertyName ?? e.name).text;
        if (!e.isTypeOnly && (AUDIT_ROW_READERS as readonly string[]).includes(imported)) readerLocals.set(e.name.text, imported);
      }
    }
  }
  const out: Array<{ call: ts.CallExpression; reader: string }> = [];
  walkTree(sf, (n) => {
    if (!ts.isCallExpression(n)) return;
    const callee = n.expression;
    const reader = ts.isIdentifier(callee) ? readerLocals.get(callee.text)
      : ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && namespaces.has(callee.expression.text) && (AUDIT_ROW_READERS as readonly string[]).includes(callee.name.text) ? callee.name.text : undefined;
    if (reader) out.push({ call: n, reader });
  });
  return out;
}

/**
 * Ruling 260, read from disk. In every console file: (1) each call of an audit row reader hands its result straight to
 * `houseAuditForConsole` as its third argument (through `await`, parentheses, `.catch(…)`, `??`, a spread or an array only),
 * and no file reaches the audit module or the gate by `import()`, `require`, a namespace or a re-export; (2) EVERY call of
 * EVERY gate export — the stake, the labels, the audience and the audit rows — names the signed-in viewer (`<session>?.userId
 * ?? null`, `<session>.userId`, or a const bound to one of them, the session read only from `currentSession()` in the same
 * file) and a console route that is the file's own route or a prefix of it with the same view domain and Owner-only standing
 * — the question its section gate asks — and a gate is named only as a call or in a type; (3) no console file value-imports
 * a house read module outside the two named homes, and an `import()` of one is kept unless it is a fire-and-forget officer
 * hook. Outside the console, (4) every file calling an audit row reader is classified in `AUDIT_READERS_OUTSIDE_CONSOLE`.
 * `roles` supplies `domainForPath` and `isOwnerOnlyPath` from `src/lib/server/roles.ts`.
 */
export function consoleHouseReadProblems(
  files: Array<{ rel: string; code: string }>,
  roles: { domainForPath: (p: string) => string; isOwnerOnlyPath: (p: string) => boolean },
): { population: number; readerCalls: number; gateCalls: number; consoleGateCalls: Record<string, number>; readerFiles: string[]; outsideReaderFiles: string[]; problems: string[] } {
  const problems: string[] = [];
  let population = 0, readerCalls = 0, gateCalls = 0;
  const consoleGateCalls: Record<string, number> = Object.fromEntries(Object.keys(CONSOLE_GATES).map((k) => [k, 0]));
  const readerFiles = new Set<string>();
  const outsideReaderFiles = new Set<string>();
  for (const { rel, code } of files) {
    if (!inConsolePopulation(rel) && !code.includes("getAudit")) continue;
    const sf = parse(rel, code);
    const say = (what: string, n?: ts.Node) => problems.push(`${rel}${n ? `:${lineOf(sf, n)}` : ""}: ${what}`);
    if (!inConsolePopulation(rel)) {
      if (rel.startsWith("src/") && rel !== `${AUDIT_MODULE}.ts` && code.includes("getAudit") && auditReaderCalls(rel, sf).length > 0) outsideReaderFiles.add(rel);
      continue;
    }
    population++;
    const gateLocals = new Map<string, string>();
    for (const st of sf.statements) {
      if (!ts.isImportDeclaration(st) || !ts.isStringLiteral(st.moduleSpecifier) || resolveSpec(rel, st.moduleSpecifier.text) !== CONSOLE_READ_MODULE) continue;
      const clause = st.importClause;
      if (!clause || clause.isTypeOnly) continue;
      const bindings = clause.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) say(`reaches ${CONSOLE_READ_MODULE} through the namespace ${bindings.name.text}, which the gate pin cannot follow`, st);
      if (bindings && ts.isNamedImports(bindings)) {
        for (const e of bindings.elements) {
          const imported = (e.propertyName ?? e.name).text;
          if (!e.isTypeOnly && Object.prototype.hasOwnProperty.call(CONSOLE_GATES, imported)) gateLocals.set(e.name.text, imported);
        }
      }
    }
    for (const i of importSpecifiers(rel, code)) {
      const resolved = resolveSpec(rel, i.spec);
      if (i.typeOnly || !(i.names.includes("(dynamic)") || i.names.includes("(re-export)"))) continue;
      if (resolved === AUDIT_MODULE || resolved === CONSOLE_READ_MODULE) say(`reaches ${resolved} by ${i.names.join(", ")}, which the gate pin cannot follow`);
    }
    // A house server module: a value import, a re-export or an import() whose result the file keeps is a read the console
    // could render or return. Only a fire-and-forget officer hook reads nothing back.
    const houseAllowed = (resolved: string) => (CONSOLE_HOUSE_READ_ALLOWED[rel] ?? []).includes(resolved);
    const assigns = (node: ts.Node) => {
      let found = false;
      const go = (m: ts.Node) => {
        if (ts.isBinaryExpression(m) && m.operatorToken.kind >= ts.SyntaxKind.FirstAssignment && m.operatorToken.kind <= ts.SyntaxKind.LastAssignment) found = true;
        if ((ts.isPrefixUnaryExpression(m) || ts.isPostfixUnaryExpression(m)) && [ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken].includes(m.operator)) found = true;
        ts.forEachChild(m, go);
      };
      go(node);
      return found;
    };
    const firedAndForgotten = (call: ts.CallExpression, resolved: string): boolean => {
      if (!(HOUSE_HOOK_MODULES as readonly string[]).includes(resolved)) return false;
      const thenAccess = call.parent;
      if (!(ts.isPropertyAccessExpression(thenAccess) && thenAccess.expression === call && thenAccess.name.text === "then" && ts.isCallExpression(thenAccess.parent) && thenAccess.parent.expression === thenAccess)) return false;
      const thenCall = thenAccess.parent;
      const cb = thenCall.arguments[0];
      if (thenCall.arguments.length !== 1 || !cb || !ts.isArrowFunction(cb) || cb.parameters.length !== 1 || !ts.isIdentifier(cb.parameters[0].name)) return false;
      const m = cb.parameters[0].name.text;
      const body = cb.body;
      if (!(ts.isCallExpression(body) && ts.isPropertyAccessExpression(body.expression) && ts.isIdentifier(body.expression.expression) && body.expression.expression.text === m) || assigns(body)) return false;
      let top: ts.Node = thenCall;
      const catchAccess = thenCall.parent;
      if (ts.isPropertyAccessExpression(catchAccess) && catchAccess.expression === thenCall && catchAccess.name.text === "catch" && ts.isCallExpression(catchAccess.parent) && catchAccess.parent.expression === catchAccess) {
        const handler = catchAccess.parent.arguments[0];
        if (catchAccess.parent.arguments.length !== 1 || !handler || !ts.isArrowFunction(handler) || !ts.isBlock(handler.body) || handler.body.statements.length !== 0) return false;
        top = catchAccess.parent;
      }
      return ts.isVoidExpression(top.parent);
    };
    walkTree(sf, (n) => {
      const houseSays = (resolved: string, how: string, node: ts.Node) =>
        say(`${how} the house read module ${resolved} — a console file reads house data only through ${CONSOLE_READ_MODULE}`, node);
      if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
        const resolved = resolveSpec(rel, n.moduleSpecifier.text);
        const clause = n.importClause;
        const named = clause?.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements : null;
        const typeOnly = !!clause?.isTypeOnly || (!!named && !clause?.name && named.length > 0 && named.every((e) => e.isTypeOnly));
        if (isHouseReadModule(resolved) && !typeOnly && !houseAllowed(resolved)) houseSays(resolved, "imports", n);
      } else if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
        const resolved = resolveSpec(rel, n.moduleSpecifier.text);
        if (isHouseReadModule(resolved) && !n.isTypeOnly && !houseAllowed(resolved)) houseSays(resolved, "re-exports", n);
      } else if (ts.isCallExpression(n) && (n.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(n.expression) && n.expression.text === "require"))) {
        const spec = literalText(n.arguments[0]);
        const resolved = spec == null ? null : resolveSpec(rel, spec);
        if (resolved && isHouseReadModule(resolved) && !houseAllowed(resolved) && !firedAndForgotten(n, resolved)) houseSays(resolved, "keeps the result of import()ing", n);
      }
    });
    // The bindings that hold the signed-in session: every write to one is `await currentSession()…` (or a `null` start).
    const fromSession = (e: ts.Expression | undefined) => !!e && /^await currentSession\(\)/.test(oneLine(e.getText(sf)));
    const writes = new Map<string, Array<ts.Expression | undefined>>();
    const noteWrite = (name: string, value: ts.Expression | undefined) => writes.set(name, [...(writes.get(name) ?? []), value]);
    walkTree(sf, (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name)) noteWrite(n.name.text, n.initializer);
      if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left)) noteWrite(n.left.text, n.right);
    });
    const sessions = new Set([...writes].filter(([, vs]) => vs.some(fromSession) && vs.every((v) => fromSession(v) || v?.kind === ts.SyntaxKind.NullKeyword)).map(([k]) => k));
    const USER_ID = /^([A-Za-z_$][\w$]*)(?:\?\.userId \?\? (?:null|"")|\.userId)$/;
    const sessionUserId = (text: string) => { const m = USER_ID.exec(text); return !!m && sessions.has(m[1]); };
    // A const bound once to the session's user id (the ceremony's `currentOfficerId`).
    const viewerConsts = new Set<string>();
    walkTree(sf, (n) => {
      if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && ts.isVariableDeclarationList(n.parent) && (n.parent.flags & ts.NodeFlags.Const) !== 0
        && n.initializer && sessionUserId(oneLine(n.initializer.getText(sf))) && (writes.get(n.name.text) ?? []).length === 1) viewerConsts.add(n.name.text);
    });
    const fileRoute = consoleRouteOf(rel);
    walkTree(sf, (n) => {
      if (ts.isIdentifier(n) && gateLocals.has(n.text)) {
        const p = n.parent;
        const named = ts.isImportSpecifier(p) || (ts.isCallExpression(p) && p.expression === n) || ts.isTypeQueryNode(p);
        if (!named) say(`names the console gate ${gateLocals.get(n.text)} outside a call, where the gate pin cannot follow it: ${snippet(sf, p)}`, n);
      }
      if (!ts.isCallExpression(n)) return;
      const callee = n.expression;
      if (ts.isIdentifier(callee) && gateLocals.has(callee.text)) {
        const gate = gateLocals.get(callee.text)!;
        consoleGateCalls[gate]++;
        if (gate === "houseAuditForConsole") gateCalls++;
        const [viewer, route] = n.arguments;
        const v = viewer ? oneLine(viewer.getText(sf)) : "";
        if (n.arguments.length !== CONSOLE_GATES[gate]) say(`${gate} takes ${n.arguments.length} arguments, not ${CONSOLE_GATES[gate]}`, n);
        if (!(sessionUserId(v) || viewerConsts.has(v))) say(`hands ${gate} a viewer that is not the signed-in session's id: ${v || "(none)"}`, n);
        if (!(route && ts.isStringLiteral(route))) { say(`asks ${gate} about a route that is not a literal: ${route ? oneLine(route.getText(sf)) : "(none)"}`, n); return; }
        const r = route.text;
        const ownRoute = !!fileRoute && r.startsWith("/admin") && (fileRoute === r || fileRoute.startsWith(`${r}/`))
          && roles.domainForPath(r) === roles.domainForPath(fileRoute) && roles.isOwnerOnlyPath(r) === roles.isOwnerOnlyPath(fileRoute);
        if (!ownRoute) say(`asks ${gate} about ${r}, not this file's own console route ${fileRoute ?? "(none: not under src/app/admin/)"} or a prefix with its view domain`, n);
      }
    });
    const auditGate = [...gateLocals].find(([, g]) => g === "houseAuditForConsole")?.[0] ?? null;
    for (const { call, reader } of auditReaderCalls(rel, sf)) {
      readerCalls++;
      readerFiles.add(rel);
      let at: ts.Node = call;
      for (;;) {
        const p = at.parent;
        if (ts.isParenthesizedExpression(p) || ts.isAwaitExpression(p) || ts.isSpreadElement(p) || ts.isArrayLiteralExpression(p)
          || (ts.isBinaryExpression(p) && p.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken && p.left === at)) { at = p; continue; }
        if (ts.isPropertyAccessExpression(p) && p.expression === at && p.name.text === "catch" && ts.isCallExpression(p.parent) && p.parent.expression === p) { at = p.parent; continue; }
        break;
      }
      const gate = at.parent;
      const gated = !!auditGate && ts.isCallExpression(gate) && ts.isIdentifier(gate.expression) && gate.expression.text === auditGate && gate.arguments[2] === at;
      if (!gated) say(`${reader}(…) is not handed straight to houseAuditForConsole: ${snippet(sf, call)}`, call);
    }
  }
  const declaredOutside = Object.keys(AUDIT_READERS_OUTSIDE_CONSOLE).sort();
  for (const rel of [...outsideReaderFiles].sort()) if (!declaredOutside.includes(rel)) problems.push(`${rel}: calls an audit row reader outside the console and is not classified in AUDIT_READERS_OUTSIDE_CONSOLE — a service that hands a console page rows skips the gate`);
  for (const rel of declaredOutside) if (!outsideReaderFiles.has(rel)) problems.push(`${rel}: is classified in AUDIT_READERS_OUTSIDE_CONSOLE but calls no audit row reader (the list is stale)`);
  return { population, readerCalls, gateCalls, consoleGateCalls, readerFiles: [...readerFiles].sort(), outsideReaderFiles: [...outsideReaderFiles].sort(), problems };
}

/** The audit module's exports that 0.260.1 cannot classify: a name on neither list, or an export form `exportedNames` cannot see. */
export function auditExportProblems(file: string, code: string): string[] {
  const problems: string[] = [];
  const known = [...AUDIT_ROW_READERS, ...AUDIT_NON_READERS] as readonly string[];
  const names = exportedNames(file, code);
  for (const name of names) if (!known.includes(name)) problems.push(`${file}: exports ${name}, which is neither an audit row reader nor a declared non-reader`);
  for (const name of known) if (!names.includes(name)) problems.push(`${file}: no longer exports ${name} (the classification is stale)`);
  walkTree(parse(file, code), (n) => {
    const exported = (ts.canHaveModifiers(n) ? ts.getModifiers(n) ?? [] : []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (ts.isExportDeclaration(n) || ts.isExportAssignment(n) || (exported && (ts.isClassDeclaration(n) || ts.isEnumDeclaration(n) || ts.isModuleDeclaration(n)))) {
      problems.push(`${file}: an export the classification cannot read: ${n.getText().replace(/\s+/g, " ").slice(0, 80)}`);
    }
  });
  return problems;
}

/* ─── ruling 512 · the gate table is held to the gate module's own exports, in BOTH directions ─────────────────── */

/** The module `CONSOLE_GATES` is a table OF. Its exports are what 0.512 compares the table against. */
export const CONSOLE_GATE_MODULE = "src/lib/server/house-console-read.ts";
/**
 * The two gate exports owner ruling D20 UN-BUILT with the display (C5-5b). Their names stay in `CONSOLE_GATES` as
 * NEEDLES — 0.260.1 pins each at EXACTLY 0 calls — so a console file that calls one again is measured by the same rules.
 * ⛔ THIS IS THE ONLY EXEMPTION 0.512 GRANTS, AND IT POLICES ITSELF THREE WAYS, because an exemption list is how a
 * completeness check comes to exempt the thing it exists to police: a needle is exempt only while the SAME RUN measures
 * its call count at 0; a needle that is EXPORTED again is red (it came back and nobody noticed); and the list's own
 * length is pinned by 0.512's case, so a third name cannot be quietly added here to launder a missing entry.
 */
export const CONSOLE_GATE_STRUCK = ["houseBotLabelsForConsole", "houseStakeForConsole"] as const;
/**
 * Every OTHER export of the gate module, none of which is a gated reader: the route prefix, the route test, and the
 * painted view types the readers return. 0.512 holds the module's exports to exactly these three lists, so a new gated
 * reader — the defect class ruling 259 measured, 72 of 606 non-staff responses carrying house audit rows before
 * gating — cannot ship without a `CONSOLE_GATES` entry, and therefore cannot ship without its arity, its
 * signed-in-viewer and its own-route pins.
 */
export const CONSOLE_GATE_NON_READERS = ["ConsoleAuditRead", "ConsoleDeskShell", "ConsoleEmpty", "ConsoleKpiTile",
  "ConsoleLimitRow", "ConsoleLimitsView", "ConsoleRosterRow", "ConsoleRosterView", "ConsoleUsageCell",
  "ConsoleUsageHalf", "ConsoleUsageQuery", "ConsoleUsageRow", "HOUSE_CONSOLE_PREFIX", "TARGETED_DAILY_TZS_FIELD",
  "consoleLimitLabel",
  "isHouseConsoleRoute", "unsetCaptionFor"] as const;

/**
 * Ruling 512. `CONSOLE_GATES` is five names typed by hand and nothing compared it with the module it describes, while
 * case 0.260.1 in this same file already holds the AUDIT module's exports to the last name. Both directions:
 *   · an EXPORT with no entry — a new gated reader added without one, which is how a hole ships silently;
 *   · an ENTRY with no export — a table naming a reader that is gone, which makes its arity and viewer pins vacuous.
 * `gateCalls` is 0.260.1's own measured call count per entry, so the struck-needle exemption is conditioned on a number
 * this run measured rather than on a promise made here.
 */
export function consoleGateExportProblems(
  file: string, code: string, gates: Readonly<Record<string, number>>, gateCalls: Readonly<Record<string, number>>,
): { exports: string[]; problems: string[] } {
  const problems: string[] = [];
  const names = exportedNames(file, code);
  const entries = Object.keys(gates);
  const struck = CONSOLE_GATE_STRUCK as readonly string[];
  const nonReaders = CONSOLE_GATE_NON_READERS as readonly string[];
  for (const name of names) {
    if (entries.includes(name) || nonReaders.includes(name)) continue;
    problems.push(`${file}: exports ${name}, which is neither a CONSOLE_GATES entry nor a declared non-reader — a gated reader ships with its entry or not at all`);
  }
  for (const name of entries) {
    if (names.includes(name)) continue;
    if (!struck.includes(name)) { problems.push(`${file}: CONSOLE_GATES names ${name}, which this module does not export (the table is stale, and ${name}'s arity and viewer pins measure nothing)`); continue; }
    const calls = gateCalls[name];
    if (calls !== 0) problems.push(`${file}: ${name} is a struck NEEDLE exempted from the export check, but this run measured ${calls} call(s) of it — the exemption holds only at 0`);
  }
  for (const name of struck) if (names.includes(name)) problems.push(`${file}: exports ${name} again — it was un-built under D20 and its CONSOLE_GATES entry is a needle, not a reader`);
  for (const name of nonReaders) if (!names.includes(name)) problems.push(`${file}: no longer exports ${name} (the non-reader classification is stale)`);
  walkTree(parse(file, code), (n) => {
    const exported = (ts.canHaveModifiers(n) ? ts.getModifiers(n) ?? [] : []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (ts.isExportDeclaration(n) || ts.isExportAssignment(n) || (exported && (ts.isClassDeclaration(n) || ts.isEnumDeclaration(n) || ts.isModuleDeclaration(n)))) {
      problems.push(`${file}: an export the classification cannot read: ${n.getText().replace(/\s+/g, " ").slice(0, 80)}`);
    }
  });
  return { exports: names, problems };
}

if (STORE === "memory") {
  section("§0 · rulings 191 and 270 (I10/TGT-38: no decision control, refusal branch or page condition reads a house read or a requester) and ruling 187 under D20 (no audit payload carries a house stake)");
  // One read of src/ for every §0 pin; each group below runs in its own guard, so a plant whose anchor moved fails its
  // own group without hiding the others.
  // ⛔ RULING 270: R9 was un-built (D20), so these pins now read as I10 — the officer-conflict lock that must NOT exist.
  // The token list and every planted control stay exactly as they were: they are what makes the absence provable.
  const files = srcFiles().map((rel) => ({ rel, code: decomment(read(rel)) }));
  const codeOf = (rel: string) => files.find((f) => f.rel === rel)?.code ?? null;
  const lfOf = (rel: string) => lf(codeOf(rel) ?? "");
  const objections = lfOf("src/lib/server/objections-service.ts");
  const queuePage = codeOf("src/app/admin/resolver-queue/page.tsx") ?? "";
  const bulkAction = lfOf("src/app/admin/resolver-queue/bulk-resolve-action.ts");
  const marketService = lfOf("src/lib/server/market-service.ts");
  const objectionsPage = codeOf("src/app/admin/objections/page.tsx") ?? "";
  const marketsPage = codeOf("src/app/admin/markets/page.tsx") ?? "";
  await guard("0.step4", async () => {
    const missing = [...TGT38_SERVICES, ...TGT38_PAGES, ...TGT38_CONTROLS].filter((rel) => codeOf(rel) == null);
    const readerCounts = [...TGT38_SERVICES, ...TGT38_PAGES, ...TGT38_CONTROLS]
      .map((rel) => ({ rel, n: REQUESTER_READERS.reduce((s, r) => s + ((codeOf(rel) ?? "").split(`${r}(`).length - 1), 0) }))
      .filter((x) => x.n > 0);
    const allowedCounts = TGT38_SERVICES.map((rel) => requesterScan(rel, codeOf(rel) ?? "").allowed.length);
    ok("0.191.0 · ⛔ D20's un-build, measured: all 21 decision files are read, and NOT ONE names a house-stake reader or carries a single allowed requester occurrence — so every problem the scan can report below is a new one",
      missing.length === 0 && readerCounts.length === 0 && allowedCounts.every((n) => n === 0),
      j({ missing, readerCounts, allowedCounts }));
    const services = TGT38_SERVICES.flatMap((rel) => requesterRefusalProblems(rel, codeOf(rel) ?? ""));
    ok("0.191.1 · ⛔ TGT-38 · in every service and action a requester token, a reader's binding or a carrier appears only as an import, the read, its binding, the bulk map, an audit payload value or the map write — never in a condition, a predicate, a helper's return, a result or another call",
      services.length === 0, services.join(" · "));
    const pages = TGT38_PAGES.flatMap((rel) => requesterNamingProblems(rel, codeOf(rel) ?? "", PAGE_FORBIDDEN_TOKENS));
    ok("0.191.2 · ⛔ no decision page names requestedBy or byRequester at all (I10: nothing on the page knows who chose a stake)", pages.length === 0, pages.join(" · "));
    const controls = TGT38_CONTROLS.flatMap((rel) => requesterNamingProblems(rel, codeOf(rel) ?? "", REQUESTER_TOKENS));
    ok("0.191.3 · ⛔ the four client controls and the ceremony name none of the requester tokens", controls.length === 0, controls.join(" · "));
    const pageScans = TGT38_PAGES.map((rel) => ({ rel, ...pageConditionProblems(rel, codeOf(rel) ?? "") }));
    const WANT_CONTROLS: Record<string, string[]> = {
      "src/app/admin/resolver-queue/page.tsx": ["BulkResolveBar", "ControlLocked", "RecheckButton", "ResolveControls"],
      "src/app/admin/resolver/[id]/page.tsx": ["ControlLocked", "ResolutionCeremony"],
      "src/app/admin/markets/page.tsx": ["ControlLocked", "EmergencyVoidControl"],
      "src/app/admin/markets/[id]/page.tsx": [],
      "src/app/admin/objections/page.tsx": ["ObjectionDecision"],
      "src/app/admin/updown/rounds/page.tsx": ["ControlLocked", "VoidRoundControl"],
    };
    ok("0.191.4 · ⛔ TGT-38 · no decision page's condition reads the house stake or the viewer's share of it to show, hide, lock or feed a decision control — and the pin sees each page's controls (a renamed control cannot blind it)",
      pageScans.every((s) => s.problems.length === 0) && pageScans.every((s) => j(s.controls) === j(WANT_CONTROLS[s.rel])),
      j(pageScans.map((s) => ({ rel: s.rel, controls: s.controls, problems: s.problems }))));

  });
  await guard("0.step4.services", async () => {
    const REJECT_UPDATE = "  await db.objection.update(objectionId, {\n    status: \"REJECTED\",";
    const plantedService = plant(objections, REJECT_UPDATE,
      `  const snap = await houseStakeForAudit(o.marketId);\n  const chose = snap?.staffChosen.requestedBy.includes(officerId);\n  if (chose) return { ok: false, error: "You chose a stake on this market.", code: "CONFLICT" };\n${REJECT_UPDATE}`);
    const plantedDirect = "export async function seal(me: string) {\n  const view = await houseStakeByMarket([id]);\n  return view.get(id)!.staffChosen.requestedBy.includes(me) ? { ok: false, code: \"CONFLICT\" } : { ok: true };\n}";
    const plantedPage = `${queuePage}\nexport function Gate({ view, session, canResolve }: Any) {\n  const chosenByMe = view.staffChosen.requestedBy.includes(session.userId);\n  return canResolve && !chosenByMe ? null : null;\n}`;
    const plantedControl = `${codeOf("src/app/admin/markets/emergency-void-control.tsx") ?? ""}\nexport function Line({ houseStake }: { houseStake: number }) { return houseStake; }`;
    ok("0.191.c1 · CONTROL · a planted refusal branch in rejectObjection reading requestedBy is reported, and so is a refusing ternary on the reader",
      requesterRefusalProblems("src/lib/server/objections-service.ts", plantedService).length >= 2
        && requesterRefusalProblems("src/planted.ts", plantedDirect).length >= 1, j(requesterRefusalProblems("src/lib/server/objections-service.ts", plantedService)));
    ok("0.191.c2 · CONTROL · a planted `canResolve && !chosenByMe` in the queue page (chosenByMe read from requestedBy) is reported, and a client control naming houseStake is",
      requesterNamingProblems("src/app/admin/resolver-queue/page.tsx", plantedPage, PAGE_FORBIDDEN_TOKENS).length === 1
        && requesterNamingProblems("src/app/admin/markets/emergency-void-control.tsx", plantedControl, REQUESTER_TOKENS).length === 1);
    const benign = "export async function voidIt(m: Any) {\n  const result = await withLock(key, async () => {\n    const houseStake = await houseStakeForAudit(m.id, \"market.emergency_void\");\n    audit({ action: \"x\", payload: { reason, houseStake } });\n    return { ok: true as const };\n  });\n  if (!result.ok) return { ok: false, error: \"no\" };\n  return result;\n}";
    ok("0.191.c3 · CONTROL · a payload value read inside a lock whose result a refusal then checks is NOT reported, nor are the words in a comment, nor the reader named in a TYPE",
      requesterRefusalProblems("src/planted.ts", benign).length === 0
        && requesterRefusalProblems("src/planted.ts", `${benign}\nexport const pending: Awaited<ReturnType<typeof houseStakeForAudit>> | null = null;`).length === 0
        && requesterRefusalProblems("src/planted.ts", decomment(`${benign}\n// if (houseStake.staffChosen.requestedBy.includes(me)) return { ok: false };`)).length === 0,
      j(requesterRefusalProblems("src/planted.ts", benign)));

    // The lock shapes a naming or a condition check alone never saw (C5 step 4 review): a helper, a method, an arrow, a predicate, a result, a call.
    const CONFLICT = "return { ok: false, error: \"You chose a stake on this market.\", code: \"CONFLICT\" };";
    const HELPER_BODY = "const v = await houseStakeForAudit(marketId);\n  return (v?.staffChosen.requestedBy ?? []).includes(officerId);";
    const helperDecl = `${plant(objections, REJECT_UPDATE, `  if (await choseStake(o.marketId, officerId)) {\n    ${CONFLICT}\n  }\n${REJECT_UPDATE}`)}\nasync function choseStake(marketId: string, officerId: string) {\n  ${HELPER_BODY}\n}\n`;
    const helperArrow = `${plant(objections, REJECT_UPDATE, `  if (await choseStake(o.marketId, officerId)) {\n    ${CONFLICT}\n  }\n${REJECT_UPDATE}`)}\nconst choseStake = async (marketId: string, officerId: string) => {\n  ${HELPER_BODY}\n};\n`;
    const helperMethod = `${plant(objections, REJECT_UPDATE, `  if (await conflicts.chose(o.marketId, officerId)) {\n    ${CONFLICT}\n  }\n${REJECT_UPDATE}`)}\nconst conflicts = {\n  async chose(marketId: string, officerId: string) {\n  ${HELPER_BODY}\n  },\n};\n`;
    const bulkFilter = plant(bulkAction, "    for (const id of unique) {",
      "    const snap = await houseStakeByMarket(unique);\n    const allowedIds = unique.filter((id) => !(snap.get(id)?.staffChosen.requestedBy ?? []).includes(g.userId));\n    for (const id of allowedIds) {");
    const bulkCall = plant(bulkAction, "    revalidatePath(\"/markets\");", "    sendToClient(houseStakes);\n    revalidatePath(\"/markets\");");
    const okTrue = plant(marketService, "    return { ok: true as const, data: { refundedCount, refundedTzs } };", "    return { ok: true as const, data: { refundedCount, refundedTzs, houseStake } };");
    const shapes = {
      helperDecl: requesterRefusalProblems("src/lib/server/objections-service.ts", helperDecl),
      helperArrow: requesterRefusalProblems("src/lib/server/objections-service.ts", helperArrow),
      helperMethod: requesterRefusalProblems("src/lib/server/objections-service.ts", helperMethod),
      bulkFilter: requesterRefusalProblems("src/app/admin/resolver-queue/bulk-resolve-action.ts", bulkFilter),
      bulkCall: requesterRefusalProblems("src/app/admin/resolver-queue/bulk-resolve-action.ts", bulkCall),
      okTrue: requesterRefusalProblems("src/lib/server/market-service.ts", okTrue),
      stringKey: requesterRefusalProblems("src/app/admin/resolver-queue/bulk-resolve-action.ts", plant(bulkAction, "    revalidatePath(\"/markets\");", "    const key = \"staffChosen\";\n    revalidatePath(\"/markets\");")),
    };
    ok("0.191.c4 · CONTROL · each lock shape a condition check alone missed is reported: a `function` helper answering \"did this officer choose?\", the same as an arrow and as an object method, a `filter` predicate dropping the chooser's markets, houseStakes handed to another call, and houseStake in emergencyVoidMarket's ok:true result",
      Object.values(shapes).every((p) => p.length >= 1) && shapes.helperDecl.some((p) => p.includes("a condition reads a requester value"))
        && shapes.helperMethod.some((p) => p.includes("a condition reads a requester value")) && shapes.bulkFilter.some((p) => p.includes("an array predicate reads a requester value"))
        && shapes.okTrue.some((p) => p.includes("outside a payload or its read: houseStake")) && shapes.bulkCall.some((p) => p.includes("outside a payload or its read: houseStakes"))
        && shapes.stringKey.some((p) => p.includes("a requester token spelled as a string")),
      j(Object.fromEntries(Object.entries(shapes).map(([k, v]) => [k, v.slice(0, 3)]))));
    const kinds = (problems: string[], kind: string) => problems.filter((p) => p.includes(kind)).length;
    const soloTernary = requesterRefusalProblems("src/planted.ts", "export async function f(me: string) {\n  const houseStake = await houseStakeForAudit(id);\n  const value = houseStake?.staffChosen.requestedBy.includes(me)\n    ? null\n    : houseStake;\n}");
    const soloAnd = requesterRefusalProblems("src/planted.ts", "export async function f(me: string, canSeal: boolean) {\n  const snap = await houseStakeForAudit(id);\n  const blocked = canSeal && (snap?.staffChosen.requestedBy ?? []).includes(me);\n}");
    ok("0.191.c5 · CONTROL · the ternary and the && / || detectors each answer on their own: a multi-line ternary with no ok:false is reported as exactly one ternary, and an && with no ok:false as exactly one && operand",
      kinds(soloTernary, "a ternary reads a requester value") === 1 && kinds(soloTernary, "an && / || operand") === 0 && kinds(soloTernary, "ok: false") === 0
        && kinds(soloAnd, "an && / || operand reads a requester value") === 1 && kinds(soloAnd, "a ternary") === 0 && kinds(soloAnd, "ok: false") === 0,
      j({ soloTernary, soloAnd }));

  });
  await guard("0.step4.pages", async () => {
    // Pages: the UI lock written the way step 5 will be able to write it — through viewerClause, never spelling requestedBy.
    const pageLocks = {
      ternary: pageConditionProblems("src/app/admin/resolver-queue/page.tsx", `${queuePage}\nexport function PlantedA({ view, session, canResolve }: Any) {\n  const mine = viewerClause(view, session.userId);\n  return canResolve && !mine ? <ResolveControls marketId="x" /> : null;\n}`).problems,
      prop: pageConditionProblems("src/app/admin/objections/page.tsx", `${objectionsPage}\nexport function PlantedB({ parts, canDecide }: Any) {\n  return <ObjectionDecision canDecide={canDecide && !parts.viewerClause} />;\n}`).problems,
      disabled: pageConditionProblems("src/app/admin/resolver-queue/page.tsx", `${queuePage}\nexport function PlantedC({ view, me }: Any) {\n  return <ResolveControls disabled={!!viewerClause(view, me)} />;\n}`).problems,
      earlyReturn: pageConditionProblems("src/app/admin/resolver-queue/page.tsx", `${queuePage}\nexport function PlantedD({ parts }: Any) {\n  const mine = parts.viewerClause;\n  if (mine) return null;\n  return <RecheckButton marketId="x" />;\n}`).problems,
      houseHidesVoid: pageConditionProblems("src/app/admin/markets/page.tsx", `${marketsPage}\nexport async function PlantedE({ m }: Any) {\n  const views = await houseStakeByMarket([m.id]);\n  return views.get(m.id)?.yes ? <ControlLocked /> : <EmergencyVoidControl marketId={m.id} title={m.titleEn} />;\n}`).problems,
      logical: pageConditionProblems("src/app/admin/resolver-queue/page.tsx", `${queuePage}\nexport function PlantedF({ view, me }: Any) {\n  const mine = viewerClause(view, me);\n  return <div>{!mine && <RecheckButton marketId="x" />}</div>;\n}`).problems,
      houseProp: pageConditionProblems("src/app/admin/markets/page.tsx", `${marketsPage}\nexport async function PlantedG({ m }: Any) {\n  const views = await houseStakeByMarket([m.id]);\n  return <EmergencyVoidControl marketId={m.id} title={m.titleEn} disabled={!!views.get(m.id)?.yes} />;\n}`).problems,
      switchOnClause: pageConditionProblems("src/app/admin/resolver-queue/page.tsx", `${queuePage}\nexport function PlantedH({ parts }: Any) {\n  switch (parts.viewerClause ? "mine" : "other") {\n    case "mine": return null;\n    default: return <ResolveControls marketId="x" />;\n  }\n}`).problems,
    };
    ok("0.191.c6 · CONTROL · a page lock that never names requestedBy is reported, each by its own rule: `canResolve && !viewerClause(…) ? <ResolveControls/>`, `canDecide={canDecide && !parts.viewerClause}`, `disabled={!!viewerClause(…)}`, an early return on the viewer's clause before a control, a void control hidden on a house-held market, `{!mine && <RecheckButton/>}`, a void control disabled on a house-held market, and a switch on the viewer's clause",
      Object.values(pageLocks).every((p) => p.length >= 1)
        && pageLocks.ternary.some((p) => p.includes("a ternary on house-stake data decides a control")) && pageLocks.prop.some((p) => p.includes("a decision control's prop reads the viewer's stake"))
        && pageLocks.earlyReturn.some((p) => p.includes("an if on house-stake data decides a control")) && pageLocks.logical.some((p) => p.includes("an && / || / ?? on house-stake data decides a control"))
        && pageLocks.houseProp.some((p) => p.includes("a decision control's prop reads the house stake")) && pageLocks.switchOnClause.some((p) => p.includes("a switch on house-stake data decides a control")),
      j(pageLocks));
    const pageBenign = {
      viewerLine: pageConditionProblems("src/app/admin/resolver-queue/page.tsx", `${queuePage}\nexport function BenignA({ view, me }: Any) {\n  const mine = viewerClause(view, me);\n  return mine ? <span>{mine}</span> : null;\n}`).problems,
      unreadLine: pageConditionProblems("src/app/admin/resolver-queue/page.tsx", `${queuePage}\nexport async function BenignB({ ids }: Any) {\n  let views = null;\n  try { views = await houseStakeByMarket(ids); } catch { views = null; }\n  return views ? <span>line</span> : <span>unread</span>;\n}`).problems,
      slot: pageConditionProblems("src/app/admin/markets/page.tsx", `${marketsPage}\nexport function BenignC({ m, view, me }: Any) {\n  const slot = viewerClause(view, me) ? <span>{viewerClause(view, me)}</span> : null;\n  return <EmergencyVoidControl marketId={m.id} title={m.titleEn} exposureSlot={slot} />;\n}`).problems,
      bulkRows: pageConditionProblems("src/app/admin/resolver-queue/page.tsx", `${queuePage}\nexport async function BenignD({ rows, ids }: Any) {\n  const views = await houseStakeByMarket(ids);\n  const bulkRows = views ? rows : rows;\n  return <BulkResolveBar rows={bulkRows} totalPending={1} requireTwoOfficer={false} canOverride={false} objectionWindowHours={1} />;\n}`).problems,
    };
    ok("0.191.c7 · CONTROL · display stays free: the viewer's line rendered on its own, the house line or its unread line, a control handed the line through its exposureSlot, and the bulk bar's rows carrying ruling 192's neutral house state are NOT reported",
      Object.values(pageBenign).every((p) => p.length === 0), j(pageBenign));

  });
  await guard("0.step4.audit", async () => {
    const audits = r9AuditSites(files);
    ok("0.187.1 · ⛔ OWNER RULING D20 · not one audit write in src/ carries houseStake or houseStakes — in its payload, outside it, or through a spread — and the reader is read over every audit call there is",
      j(audits.sites) === j([...R9_AUDIT_SITES].sort()) && audits.problems.length === 0 && audits.literalAuditCalls >= 400,
      j({ sites: audits.sites, problems: audits.problems, literalAuditCalls: audits.literalAuditCalls }));
    const withFile = (rel: string, code: string) => files.map((f) => (f.rel === rel ? { rel, code } : f));
    const auditPlants = {
      triggerPayload: r9AuditSites(withFile("src/lib/server/market-service.ts", plant(marketService, "      aiDetermined: !!a?.determined,", "      houseStake: (await houseStakeByMarket([marketId])).get(marketId),\n      aiDetermined: !!a?.determined,"))),
      clawbackNull: r9AuditSites(withFile("src/lib/server/market-service.ts", plant(marketService, "payload: cb });", "payload: { ...cb, houseStake: null } });"))),
      movedToOverride: r9AuditSites(withFile("src/app/admin/resolver-queue/bulk-resolve-action.ts", plant(bulkAction, "sentinelEvidence: m.sentinelEvidence ?? null,", "sentinelEvidence: m.sentinelEvidence ?? null, houseStakes,"))),
      newFile: r9AuditSites([...files, { rel: "src/app/admin/planted/audit.ts", code: "export function x(houseStake: unknown) { audit({ action: \"x.planted\", payload: { houseStake } }); }" }]),
      outsidePayload: r9AuditSites([...files, { rel: "src/app/admin/planted/audit.ts", code: "export function x(houseStake: unknown) { audit({ action: \"market.reopened\", houseStake, payload: {} }); }" }]),
      spread: r9AuditSites([...files, { rel: "src/app/admin/planted/audit.ts", code: "export function x(houseStake: unknown) { audit({ action: \"market.reopened\", payload: { ...{ houseStake } } }); }" }]),
      wholePayload: r9AuditSites([...files, { rel: "src/app/admin/planted/audit.ts", code: "export function x(houseStake: unknown) { audit({ action: \"x.planted\", payload: houseStake }); }" }]),
      comment: r9AuditSites([...files, { rel: "src/app/admin/planted/audit.ts", code: decomment("export function x() {\n  // audit({ action: \"x.planted\", payload: { houseStake } });\n}") }]),
    };
    const moved = (r: { sites: string[]; problems: string[] }) => j(r.sites) !== j([...R9_AUDIT_SITES].sort()) || r.problems.length > 0;
    ok("0.187.c1 · CONTROL · a house stake added to an audit the fixture never triggers (market.resolve_trigger.human, as a read or a null on the clawback), houseStakes moved onto the override row, a new file's audit carrying houseStake, the key outside the payload and inside a payload spread are each reported; the words in a comment are not",
      moved(auditPlants.triggerPayload) && auditPlants.triggerPayload.sites.includes("houseStake · market.resolve_trigger.human · src/lib/server/market-service.ts")
        && auditPlants.clawbackNull.sites.includes("houseStake · affiliate.clawback.completed · src/lib/server/market-service.ts")
        && auditPlants.movedToOverride.sites.includes("houseStakes · market.resolve.bulk_override · src/app/admin/resolver-queue/bulk-resolve-action.ts")
        && auditPlants.newFile.sites.includes("houseStake · x.planted · src/app/admin/planted/audit.ts")
        && auditPlants.outsidePayload.problems.length === 1 && auditPlants.spread.problems.length >= 1 && !moved(auditPlants.comment)
        && auditPlants.wholePayload.problems.some((p) => p.includes("a payload that is not an object literal names a requester token")),
      j(Object.fromEntries(Object.entries(auditPlants).map(([k, v]) => [k, { extraSites: v.sites.filter((s) => !(R9_AUDIT_SITES as readonly string[]).includes(s)), problems: v.problems }]))));
  });

  section("§0 · ruling 198 (no player surface imports a house read module or gains a house word) and ruling 260 (every audit row a console file reads goes through the gate)");
  const files5 = srcFiles().map((rel) => ({ rel, code: decomment(read(rel)) }));
  const code5 = (rel: string) => files5.find((f) => f.rel === rel)?.code ?? "";
  /**
   * The house reader names a player notice may never carry. `houseStakeByMarket`, `houseStakeForAudit`, `toAuditShape`,
   * `foldHouseStakes`, `houseRefundedTzs` and `houseRefundedCount` were un-built by owner ruling D20 (C5-5b) and stay here
   * as needles, beside the two `stake-snapshot.ts` exports that survive (ruling 178's requester rule, read by oversight).
   */
  const r2Exports = [...exportedNames("src/lib/house-bot/stake-snapshot.ts", code5("src/lib/house-bot/stake-snapshot.ts")),
    "houseStakeByMarket", "houseStakeForAudit", "toAuditShape", "foldHouseStakes", "houseRefundedTzs", "houseRefundedCount"];
  const words = (s: string) => houseHitsByFamily(s).filter((h) => h.family === "words").map((h) => h.word);
  await guard("0.step5.198", async () => {
    const players = playerImportProblems(files5);
    const imports = PLAYER_SURFACE_FILES.map((rel) => ({ rel, read: code5(rel).length, all: importSpecifiers(rel, code5(rel)).length, r2: r2ImportsOf(rel, code5(rel)) }));
    ok("0.198.1 · ⛔ no module a player can reach — every file under src/app/ and src/components/ outside their admin folders, route handlers included, read from disk — imports exposure-copy.ts, exposure.ts, stake-snapshot.ts or the console readers, statically, by re-export, by import() or by require; the population holds both named player surfaces, read with their imports",
      players.problems.length === 0 && players.population >= 400 && PLAYER_SURFACE_FILES.every((f) => inPlayerPopulation(f)) && imports.every((i) => i.read > 2_000 && i.all >= 5 && i.r2.length === 0),
      j({ population: players.population, problems: players.problems, imports }));
    const panel = code5(PLAYER_SURFACE_FILES[0]), page = code5(PLAYER_SURFACE_FILES[1]);
    const planted = {
      alias: r2ImportsOf(PLAYER_SURFACE_FILES[0], `import { exposureParts } from "@/lib/house-bot/exposure-copy";\n${panel}`),
      relative: r2ImportsOf(PLAYER_SURFACE_FILES[1], `import { houseStakeByMarket } from "../../../lib/server/house-bot/exposure";\n${page}`),
      dynamic: r2ImportsOf(PLAYER_SURFACE_FILES[1], `${page}\nexport async function x() { return (await import("@/lib/house-bot/stake-snapshot")).requesterOf; }`),
      reexport: r2ImportsOf(PLAYER_SURFACE_FILES[0], `${panel}\nexport { EXPOSURE_QUALIFIER } from "@/lib/house-bot/exposure-copy";`),
      benign: r2ImportsOf(PLAYER_SURFACE_FILES[0], `import { outcomeWord } from "@/lib/side-label";\nimport type { ExposureParts } from "@/lib/house-bot/exposure-copy-notes";\n${panel}`),
    };
    const withDisk = (rel: string, code: string) => [...files5.filter((f) => f.rel !== rel), { rel, code }];
    const fromDisk = {
      positions: playerImportProblems(withDisk("src/app/positions/page.tsx", `import { houseStakeByMarket } from "@/lib/server/house-bot/exposure";\n${code5("src/app/positions/page.tsx")}`)).problems,
      route: playerImportProblems(withDisk("src/app/api/planted/route.ts", "export async function GET() { const r = await import(\"../../../lib/server/house-console-read\"); return Response.json(await r.houseAuditForConsole(null, \"/admin\", [])); }")).problems,
      adminPage: playerImportProblems(withDisk("src/app/admin/planted/page.tsx", "import { houseStakeByMarket } from \"@/lib/server/house-bot/exposure\";\nexport default function P() { return null; }")).problems,
    };
    ok("0.198.c1 · CONTROL · a planted import of each R2 module into a player surface is reported — through the @/ alias, a relative path, import() and a re-export — and the side vocabulary or a look-alike path is not; from disk, the house reader prepended to /positions and the console reader import()ed by a planted API route are each reported, and an admin page importing it is not",
      planted.alias.length === 1 && planted.relative.length === 1 && planted.dynamic.length === 1 && planted.reexport.length === 1 && planted.benign.length === 0
        && fromDisk.positions.length === 1 && fromDisk.route.length === 1 && fromDisk.adminPage.length === 0,
      j({ planted, fromDisk }));
    const surfaceWords = PLAYER_SURFACE_FILES.map((rel) => ({ rel, printed: printedTexts(rel, code5(rel)).length, words: words(printedTexts(rel, code5(rel))) }));
    ok("0.198.3 · ⛔ neither player surface PRINTS a house word: every string literal, template part and JSX text of the resolution panel and the public market page is read, and none is a vocabulary word",
      surfaceWords.every((s) => s.printed > 1_000 && s.words.length === 0), j(surfaceWords));
    const wordPlants = {
      jsxText: words(printedTexts(PLAYER_SURFACE_FILES[1], `${page}\nexport function PlantedLine() { return <p>House stake: TZS 1,000</p>; }`)),
      attribute: words(printedTexts(PLAYER_SURFACE_FILES[0], `${panel}\nexport const PlantedTitle = () => <span title="of which chosen by staff TZS 9,000" />;`)),
      identifier: words(printedTexts(PLAYER_SURFACE_FILES[1], `${page}\nexport const plantedRow = { houseBotId: null, houseStake: 0 };`)),
    };
    ok("0.198.c3 · CONTROL · a house line planted as JSX text in the public market page and as an attribute string in the resolution panel are each found; house identifiers in code are not words",
      wordPlants.jsxText.length >= 1 && wordPlants.attribute.length >= 1 && wordPlants.identifier.length === 0, j(wordPlants));

    const notifierProblems = PLAYER_NOTIFIERS.flatMap(([rel, name]) => playerNotifierProblems(rel, lf(code5(rel)), name, r2Exports, words));
    /** The ADMIN twin beside the player's notice: ruling 195's house clause was un-built (D20), so it carries no house name either. */
    const adminTwin = functionDeclarationText("src/lib/server/notification-service.ts", lf(code5("src/lib/server/notification-service.ts")), "notifyAdminMarketCancelled");
    ok("0.198.2 · ⛔ the player's cancellation notice, the objector's decision notice, both verdict notices and the player's refund letter name no house reader, carry no house word and keep the bodies measured before step 5 — and, since owner ruling D20 un-built ruling 195's clause, neither does the ADMIN twin beside them",
      notifierProblems.length === 0 && adminTwin.length > 200 && r2Exports.every((x) => !wordsOf(adminTwin).has(x)) && words(printedTexts("src/lib/server/notification-service.ts", adminTwin)).length === 0,
      j({ notifierProblems, adminTwinNames: r2Exports.filter((x) => wordsOf(adminTwin).has(x)), adminTwinWords: words(printedTexts("src/lib/server/notification-service.ts", adminTwin)) }));
    const notif = lf(code5("src/lib/server/notification-service.ts")), email = lf(code5("src/lib/server/email.ts"));
    const CANCEL_TITLE = "    titleEn: `Market cancelled · ${formatTzs(opts.stake)} refunded`,";
    const REFUND_ROW = "      { label: \"Refunded to wallet\", value: formatTzs(amount), tone: \"good\" },";
    const ADMIN_TWIN_BODY = "    bodySw: `Soko limefutwa kwa dharura. ${formatTzs(opts.refundedTzs)} imerejeshwa.`,";
    const plants = {
      reader: playerNotifierProblems("src/lib/server/notification-service.ts", plant(notif, CANCEL_TITLE, `    titleEn: \`Market cancelled · \${formatTzs(opts.stake)} refunded\${(await houseStakeForAudit(opts.marketId))?.yes ?? ""}\`,`), "notifyMarketCancelled", r2Exports, words),
      row: playerNotifierProblems("src/lib/server/email.ts", plant(email, REFUND_ROW, `${REFUND_ROW}\n      { label: "Of which house stakes", value: formatTzs(amount) },`), "marketCancelledRefundHtml", r2Exports, words),
      reworded: playerNotifierProblems("src/lib/server/notification-service.ts", plant(notif, CANCEL_TITLE, "    titleEn: `Market cancelled · ${formatTzs(opts.stake)} returned`,"), "notifyMarketCancelled", r2Exports, words),
      stub: playerNotifierProblems("src/lib/server/notification-service.ts", "export function notifyMarketCancelled() {}", "notifyMarketCancelled", r2Exports, words),
      twinUntouched: playerNotifierProblems("src/lib/server/notification-service.ts", plant(notif, ADMIN_TWIN_BODY, "    bodySw: `Soko limefutwa kwa dharura. ${formatTzs(opts.refundedTzs)} imerejeshwa kwa wachezaji.`,"), "notifyMarketCancelled", r2Exports, words),
    };
    ok("0.198.c2 · CONTROL · an un-built house reader called from the player's cancellation notice (a needle name), a house row planted in the refund letter (a house word), a one-word rewording (the bytes) and a stubbed notifier are each reported; an edit to the ADMIN twin beside it is not",
      plants.reader.some((p) => p.includes("names R2 exports houseStakeForAudit")) && plants.row.some((p) => p.includes("carries house wording")) && plants.reworded.length === 1
        && plants.reworded[0].includes("not the body measured") && plants.stub.length === 1 && plants.twinUntouched.length === 0, j(plants));
  });
  await guard("0.step5.260", async () => {
    const ROLES: Any = await import("../../src/lib/server/roles.ts");
    const roles = { domainForPath: ROLES.domainForPath, isOwnerOnlyPath: ROLES.isOwnerOnlyPath };
    const r = consoleHouseReadProblems(files5, roles);
    const auditCode = code5(`${AUDIT_MODULE}.ts`);
    const auditReaders = exportedNames(`${AUDIT_MODULE}.ts`, auditCode).filter((n) => /^getAudit/.test(n));
    const auditExports = auditExportProblems(`${AUDIT_MODULE}.ts`, auditCode);
    const MEASURED_LEAKS = ["src/app/admin/audit/page.tsx", "src/app/admin/players/[id]/page.tsx"];
    ok("0.260.1 · ⛔ D19 · every audit row a console file reads — every file under src/app/admin/, src/app/api/admin/ and src/components/admin/, read from disk, and every row reader the audit module exports, its exports classified to the last name — goes straight to houseAuditForConsole; EVERY call of every gate export names the signed-in viewer and the file's own console route; the three struck display readers (D20) are called NOWHERE; no console file reaches the audit module or the gate by import(), a namespace or a re-export, and none imports a house read module — or keeps what one returns — outside the system page's engine card (only the fire-and-forget holder and money hooks read nothing back); and every file OUTSIDE the console that calls a row reader is classified",
      r.problems.length === 0 && auditExports.length === 0 && r.population >= 200 && j(auditReaders) === j([...AUDIT_ROW_READERS].sort()) && r.readerCalls >= 18 && r.gateCalls >= 17
        && r.consoleGateCalls.houseAuditForConsole >= 17
        /* ⭐ C7 STEP 1 CHANGED THE AUDIENCE CLAUSE, AND ONLY THAT CLAUSE (C7-SPEC ruling 340). It read
         * `houseConsoleAudience === 0`, which was true only while no console page decided its own audience; the desk's
         * page does, so it becomes a FLOOR at the count this commit MEASURES — never a loose `>= 0` and never deleted.
         * `houseRosterForConsole` gets its own floor for the same reason. ⛔ The `houseAuditForConsole >= 17` floor is
         * left exactly as it is: a floor is raised only by the session that measures a higher number, never lowered.
         * ⛔ The two struck display readers stay pinned at EXACTLY 0. */
        && r.consoleGateCalls.houseStakeForConsole === 0 && r.consoleGateCalls.houseBotLabelsForConsole === 0
        && r.consoleGateCalls.houseConsoleAudience >= 1 && r.consoleGateCalls.houseRosterForConsole >= 1
        /* ⭐ C7 step 3 · the limits panel's own gated reader, query-shaped and arity-pinned like the roster's. */
        && r.consoleGateCalls.houseUsageForConsole >= 1
        && r.readerFiles.length >= 14 && MEASURED_LEAKS.every((f) => r.readerFiles.includes(f)) && j(r.outsideReaderFiles) === j(Object.keys(AUDIT_READERS_OUTSIDE_CONSOLE).sort()),
      j({ population: r.population, readerCalls: r.readerCalls, gateCalls: r.gateCalls, consoleGateCalls: r.consoleGateCalls, readerFiles: r.readerFiles, outsideReaderFiles: r.outsideReaderFiles, auditReaders, auditExports, problems: r.problems }));

    /* ⛔ 0.512 · RULING 512 · THE GATE TABLE IS HELD TO THE GATE MODULE'S OWN EXPORTS, BOTH WAYS. `CONSOLE_GATES` is
     * five names typed by hand and nothing compared it with the module it describes — while 0.260.1 directly above
     * already holds the AUDIT module's exports to the last name, so the pattern existed in this very file and was
     * simply not applied to the gate. A new gated reader added without its entry is ruling 259's MEASURED defect class
     * (72 of 606 non-staff responses carried house audit rows before gating) and it would ship with no arity pin, no
     * signed-in-viewer pin and no own-route pin measuring it — silently, because a hand-typed table cannot notice. */
    const gateModuleCode = code5(CONSOLE_GATE_MODULE);
    const gateExports = consoleGateExportProblems(CONSOLE_GATE_MODULE, gateModuleCode, CONSOLE_GATES, r.consoleGateCalls);
    ok("0.512 · ⛔ D19 · CONSOLE_GATES and the gate module's own exports agree to the last name in BOTH directions — no exported reader without an entry, no entry without an export, and the two D20-struck needles are exempt only while THIS run measures them at exactly 0 calls",
      gateExports.problems.length === 0 && gateModuleCode.length > 5_000 && gateExports.exports.length >= 12
        && Object.keys(CONSOLE_GATES).length >= 6 && CONSOLE_GATE_STRUCK.length === 2,
      j({ exports: gateExports.exports, entries: Object.keys(CONSOLE_GATES), struck: CONSOLE_GATE_STRUCK, problems: gateExports.problems }));
    {
      /* ⛔ THE PLANTS ARE WHOLE DECLARATIONS APPENDED TO THE MODULE, not string edits, so each one is a thing the
       * compiler would accept — which is what makes them the shape a real change takes. */
      const NEW_READER = `
export async function houseLimitsForConsole(viewerUserId: string | null, route: string): Promise<string | null> { return route.length > 0 ? viewerUserId : null; }
`;
      const NEEDLE_BACK = `
export async function houseStakeForConsole(viewerUserId: string | null, route: string, ids: string[]): Promise<Map<string, number>> { return new Map(ids.map((i) => [i, viewerUserId === route ? 1 : 0])); }
`;
      const gp = (code: string, gates: Readonly<Record<string, number>>, calls: Readonly<Record<string, number>>) =>
        consoleGateExportProblems(CONSOLE_GATE_MODULE, code, gates, calls).problems;
      const fired = {
        exportNoEntry: gp(gateModuleCode + NEW_READER, CONSOLE_GATES, r.consoleGateCalls),
        entryNoExport: gp(gateModuleCode, { ...CONSOLE_GATES, houseRefusalForConsole: 2 }, { ...r.consoleGateCalls, houseRefusalForConsole: 0 }),
        needleExported: gp(gateModuleCode + NEEDLE_BACK, CONSOLE_GATES, r.consoleGateCalls),
        needleCalled: gp(gateModuleCode, CONSOLE_GATES, { ...r.consoleGateCalls, houseStakeForConsole: 1 }),
        nonReaderGone: gp(plant(gateModuleCode, "export type ConsoleKpiTile", "export type ConsoleKpiTileRenamed"), CONSOLE_GATES, r.consoleGateCalls),
        untouched: gp(gateModuleCode, CONSOLE_GATES, r.consoleGateCalls),
      };
      ok("0.512.c1 · CONTROL · a new exported gated reader with no entry, an entry naming no export, a struck needle exported again, a struck needle this run measured a call of, and a declared non-reader that stopped being exported are each reported; the real module against the real table is not",
        fired.exportNoEntry.some((p) => p.includes("exports houseLimitsForConsole, which is neither a CONSOLE_GATES entry"))
          && fired.entryNoExport.some((p) => p.includes("CONSOLE_GATES names houseRefusalForConsole, which this module does not export"))
          && fired.needleExported.some((p) => p.includes("exports houseStakeForConsole again"))
          && fired.needleCalled.some((p) => p.includes("this run measured 1 call(s) of it"))
          && fired.nonReaderGone.some((p) => p.includes("no longer exports ConsoleKpiTile"))
          && fired.untouched.length === 0,
        j(fired));
    }

    const PLAYER = "src/app/admin/players/[id]/page.tsx", AUDIT = "src/app/admin/audit/page.tsx", KYC = "src/app/admin/kyc/[id]/page.tsx";
    const PLAYER_READ = "[...(getAuditForActor(id, 200) ?? []), ...(getAuditForTarget(\"User\", id, 200) ?? [])]";
    const AUDIT_GATE = "houseAuditForConsole(session?.userId ?? null, \"/admin/audit\", getAuditPage({ limit: 100_000 }))";
    const withFile = (rel: string, code: string) => [...files5.filter((f) => f.rel !== rel), { rel, code }];
    const run = (rel: string, code: string) => consoleHouseReadProblems(withFile(rel, code), roles).problems.filter((p) => p.startsWith(rel));
    const player = code5(PLAYER), audit = code5(AUDIT), kyc = code5(KYC);
    const GATE_IMPORT = "import { houseStakeForConsole, houseBotLabelsForConsole, houseConsoleAudience } from \"@/lib/server/house-console-read\";\nimport { currentSession } from \"@/lib/server/auth-service\";\n";
    const gatePlants = {
      playerUngated: run(PLAYER, plant(player, `await houseAuditForConsole(viewer?.userId ?? null, "/admin/players", ${PLAYER_READ})`, PLAYER_READ)),
      filteredFirst: run(AUDIT, plant(audit, AUDIT_GATE, "houseAuditForConsole(session?.userId ?? null, \"/admin/audit\", getAuditPage({ limit: 100_000 }).filter((e) => e.category !== \"AUTH\"))")),
      literalViewer: run(AUDIT, plant(audit, AUDIT_GATE, "houseAuditForConsole(\"usr_admin\", \"/admin/audit\", getAuditPage({ limit: 100_000 }))")),
      fakeSession: run(AUDIT, plant(audit, AUDIT_GATE, AUDIT_GATE.replace("session?.userId", () => "staff?.userId")).replace("export default async function AdminAuditPage(", () => "const staff = { userId: \"usr_admin\" };\nexport default async function AdminAuditPage(")),
      otherDomainRoute: run(AUDIT, plant(audit, AUDIT_GATE, AUDIT_GATE.replace("\"/admin/audit\"", () => "\"/admin/players\""))),
      overviewPrefix: run(AUDIT, plant(audit, AUDIT_GATE, AUDIT_GATE.replace("\"/admin/audit\"", () => "\"/admin\""))),
      sameDomainOtherPage: run(AUDIT, plant(audit, AUDIT_GATE, AUDIT_GATE.replace("\"/admin/audit\"", () => "\"/admin/kyc\""))),
      kycCatchKept: run(KYC, kyc),
      // The other three gate exports, in console pages no hand list names (conformance-02 / test-strength-01).
      audienceLiteral: run("src/app/admin/planted/aud/page.tsx", `${GATE_IMPORT}export default async function P() { return (await houseConsoleAudience("usr_admin", "/admin/planted/aud")) ? 1 : 0; }`),
      stakeFakeSession: run("src/app/admin/planted/stake/page.tsx", `${GATE_IMPORT}export default async function P() { const s = { userId: "usr_admin" }; return (await houseStakeForConsole(s?.userId ?? null, "/admin/planted/stake", [])).size; }`),
      labelsOtherDomain: run("src/app/admin/kyc/planted/page.tsx", `${GATE_IMPORT}export default async function P() { const session = await currentSession(); return (await houseBotLabelsForConsole(session?.userId ?? null, "/admin/players", [])).size; }`),
      reassignedSession: run("src/app/admin/planted/reassigned/page.tsx", `${GATE_IMPORT}export default async function P() { let session = await currentSession(); session = { userId: "usr_admin" } as never; return (await houseStakeForConsole(session?.userId ?? null, "/admin/planted/reassigned", [])).size; }`),
      gateAsValue: run("src/app/admin/planted/value/page.tsx", `${GATE_IMPORT}export default async function P() { const read = houseStakeForConsole; return (await read("usr_admin", "/admin", [])).size; }`),
      officerConst: run("src/app/admin/planted/officer/page.tsx", `${GATE_IMPORT}export default async function P() { const session = await currentSession(); const officer = session?.userId ?? ""; return (await houseStakeForConsole(officer, "/admin/planted/officer", [])).size; }`),
    };
    ok("0.260.c1 · CONTROL · the player page's measured leak restored (both readers ungated), a reader filtered before the gate, a literal viewer, a viewer that is not the session read from currentSession(), another domain's route, the overview's broader \"/admin\" prefix and another page of the same domain are each reported; so are, in console pages no list names, the audience asked for a literal viewer, the stake read for a session that is not currentSession()'s, the labels read for another domain's route, a session reassigned after it was read and the gate handed on as a value; the KYC page's read through await, .catch and the gate, and a const bound once to the session's id, are not",
      gatePlants.playerUngated.filter((p) => p.includes("is not handed straight")).length === 2 && gatePlants.filteredFirst.some((p) => p.includes("getAuditPage(…) is not handed straight"))
        && gatePlants.literalViewer.some((p) => p.includes("hands houseAuditForConsole a viewer that is not the signed-in session's id")) && gatePlants.fakeSession.some((p) => p.includes("hands houseAuditForConsole a viewer that is not the signed-in session's id"))
        && gatePlants.otherDomainRoute.some((p) => p.includes("asks houseAuditForConsole about /admin/players,")) && gatePlants.overviewPrefix.some((p) => p.includes("asks houseAuditForConsole about /admin,"))
        && gatePlants.sameDomainOtherPage.some((p) => p.includes("asks houseAuditForConsole about /admin/kyc,")) && gatePlants.kycCatchKept.length === 0
        && j(gatePlants.audienceLiteral.map((p) => p.replace(/^[^:]+:\d+: /, ""))) === j(["hands houseConsoleAudience a viewer that is not the signed-in session's id: \"usr_admin\""])
        && j(gatePlants.stakeFakeSession.map((p) => p.replace(/^[^:]+:\d+: /, ""))) === j(["hands houseStakeForConsole a viewer that is not the signed-in session's id: s?.userId ?? null"])
        && j(gatePlants.labelsOtherDomain.map((p) => p.replace(/^[^:]+:\d+: /, ""))) === j(["asks houseBotLabelsForConsole about /admin/players, not this file's own console route /admin/kyc/planted or a prefix with its view domain"])
        && j(gatePlants.reassignedSession.map((p) => p.replace(/^[^:]+:\d+: /, ""))) === j(["hands houseStakeForConsole a viewer that is not the signed-in session's id: session?.userId ?? null"])
        && gatePlants.gateAsValue.some((p) => p.includes("names the console gate houseStakeForConsole outside a call")) && gatePlants.officerConst.length === 0,
      j(gatePlants));

    const planted = (rel: string, code: string) => run(rel, code);
    const importPlants = {
      alias: planted("src/app/admin/planted/page.tsx", "import { getAuditPage as rows } from \"@/lib/server/audit\";\nexport default async function P() { return rows({ limit: 5 }).length; }"),
      namespace: planted("src/app/admin/planted/feed.tsx", "import * as A from \"../../../lib/server/audit\";\nexport function F() { return A.getAuditForActor(\"usr_x\").length; }"),
      dynamicInRoute: planted("src/app/api/admin/planted/route.ts", "export async function GET() { const m = await import(\"@/lib/server/audit\"); return Response.json(m.verifyChain()); }"),
      component: planted("src/components/admin/planted-feed.tsx", "import { getAuditPage } from \"@/lib/server/audit\";\nimport { houseAuditForConsole } from \"@/lib/server/house-console-read\";\nimport { currentSession } from \"@/lib/server/auth-service\";\nexport async function Feed() { const session = await currentSession(); return (await houseAuditForConsole(session?.userId ?? null, \"/admin\", getAuditPage({ limit: 5 }))).length; }"),
      houseStore: planted("src/app/admin/planted/labels/page.tsx", "import { houseBotStore } from \"@/lib/server/house-bot-dal\";\nexport default async function P() { return (await houseBotStore.get(\"x\"))?.label ?? null; }"),
      houseDynamic: planted("src/app/admin/planted/actions.ts", "\"use server\";\nexport async function a() { const b = await import(\"../../../lib/server/house-bot/book\"); return typeof b; }"),
      hookKept: planted("src/app/admin/planted/hook-actions.ts", "\"use server\";\nexport async function a(id: string) { return import(\"@/lib/server/house-bot/holder-hook\").then((m) => m.onHolderAccountChanged(id, \"SUSPENDED\")); }"),
      hookDiscarded: planted("src/app/admin/planted/hook-void.ts", "\"use server\";\nexport async function a(id: string) { void import(\"@/lib/server/house-bot/holder-hook\").then((m) => m.onHolderAccountChanged(id, \"SUSPENDED\")).catch(() => {}); return { ok: true }; }"),
      benign: planted("src/app/admin/planted/benign/page.tsx", "import { verifyChain, type AuditEntry } from \"@/lib/server/audit\";\nimport type { HouseStakeView } from \"@/lib/server/house-bot/exposure\";\n// getAuditPage({ limit: 5 }) in a comment\nexport default function P() { const e: AuditEntry[] = []; const v: HouseStakeView[] = []; return verifyChain().valid && e.length === v.length; }"),
      // A fired-and-forgotten import of a module that is NOT an officer hook, whose callback keeps the read (conformance-04 / test-strength-05).
      voidExposureKept: planted("src/app/admin/planted/void-kept.ts", "\"use server\";\nlet kept: unknown = null;\nexport async function a(ids: string[]) { void import(\"@/lib/server/house-bot/exposure\").then((m) => { kept = m.houseStakeByMarket(ids); }); return { ok: true, kept }; }"),
      // A real hook whose callback writes an outer binding the action returns.
      hookWritesOuter: planted("src/app/admin/planted/hook-outer.ts", "\"use server\";\nlet last: unknown;\nexport async function a(id: string) { void import(\"@/lib/server/house-bot/holder-hook\").then((m) => m.onHolderAccountChanged(id, \"SUSPENDED\").then((v: unknown) => { last = v; })); return { ok: true, last }; }"),
      // Re-exports (test-strength-04): the audit module's reader, a house read module, the gate; and type-only re-exports, not reported.
      reexportAudit: planted("src/app/admin/planted/rows.ts", "export { getAuditPage } from \"@/lib/server/audit\";"),
      reexportHouse: planted("src/app/admin/planted/house-rows.ts", "export { houseStakeByMarket } from \"@/lib/server/house-bot/exposure\";"),
      reexportGate: planted("src/components/admin/planted-gate.ts", "export { houseStakeForConsole } from \"@/lib/server/house-console-read\";"),
      gateNamespace: planted("src/app/admin/planted/ns/page.tsx", "import * as G from \"@/lib/server/house-console-read\";\nexport default async function P() { return (await G.houseStakeForConsole(\"usr_admin\", \"/admin\", [])).size; }"),
      typeReexports: planted("src/app/admin/planted/types.ts", "export type { AuditEntry } from \"@/lib/server/audit\";\nexport type { HouseStakeView } from \"@/lib/server/house-bot/exposure\";"),
    };
    ok("0.260.c2 · CONTROL · an aliased reader, a namespace reader, the audit module import()ed by an admin route handler, a shared console component that gates with a route it does not serve, the house store in a console page, a house module import()ed by a console action, a holder hook whose result an action returns, a fired-and-forgotten import of a module that is no officer hook with its read kept, a hook whose callback writes an outer binding, a re-export of the audit reader, of a house read module and of the gate, and the gate through a namespace are each reported; verifyChain, type-only imports and type-only re-exports of the audit and house modules, a reader named in a comment and a fire-and-forget hook (void import(…).then((m) => m.hook(…)).catch(() => {})) are not",
      importPlants.alias.some((p) => p.includes("getAuditPage(…) is not handed straight")) && importPlants.namespace.some((p) => p.includes("getAuditForActor(…) is not handed straight"))
        && importPlants.dynamicInRoute.some((p) => p.includes("reaches src/lib/server/audit by (dynamic)")) && importPlants.component.some((p) => p.includes("not under src/app/admin/"))
        && importPlants.houseStore.some((p) => p.includes("imports the house read module src/lib/server/house-bot-dal")) && importPlants.houseDynamic.some((p) => p.includes("keeps the result of import()ing the house read module src/lib/server/house-bot/book"))
        && importPlants.hookKept.some((p) => p.includes("keeps the result of import()ing the house read module src/lib/server/house-bot/holder-hook"))
        && j(importPlants.voidExposureKept.map((p) => p.replace(/^[^:]+:\d+: /, ""))) === j(["keeps the result of import()ing the house read module src/lib/server/house-bot/exposure — a console file reads house data only through src/lib/server/house-console-read"])
        && j(importPlants.hookWritesOuter.map((p) => p.replace(/^[^:]+:\d+: /, ""))) === j(["keeps the result of import()ing the house read module src/lib/server/house-bot/holder-hook — a console file reads house data only through src/lib/server/house-console-read"])
        && j(importPlants.reexportAudit) === j(["src/app/admin/planted/rows.ts: reaches src/lib/server/audit by (re-export), which the gate pin cannot follow"])
        && j(importPlants.reexportHouse.map((p) => p.replace(/^[^:]+:\d+: /, ""))) === j(["re-exports the house read module src/lib/server/house-bot/exposure — a console file reads house data only through src/lib/server/house-console-read"])
        && j(importPlants.reexportGate) === j(["src/components/admin/planted-gate.ts: reaches src/lib/server/house-console-read by (re-export), which the gate pin cannot follow"])
        && importPlants.gateNamespace.some((p) => p.includes("through the namespace G"))
        && importPlants.benign.length === 0 && importPlants.hookDiscarded.length === 0 && importPlants.typeReexports.length === 0,
      j(importPlants));

    // Outside the console (d19-hunt-05 / test-strength-06): a new service returning a reader's rows, and an audit export on neither list.
    const outsideRun = (rel: string, code: string) => consoleHouseReadProblems(withFile(rel, code), roles).problems.filter((p) => p.startsWith(rel));
    const outsidePlants = {
      timeline: outsideRun("src/lib/server/planted-timeline.ts", "import { getAuditForActor } from \"./audit\";\nexport function timeline(id: string) { return getAuditForActor(id, 50); }"),
      aliasedTimeline: outsideRun("src/lib/account/planted-feed.ts", "import * as AU from \"@/lib/server/audit\";\nexport const feed = (id: string) => AU.getAuditForTarget(\"User\", id);"),
      nameOnly: outsideRun("src/lib/search/planted-words.ts", "export const WORDS = [\"getAuditPage\", \"getAuditForActor\"];"),
      staleEntry: consoleHouseReadProblems(files5.filter((f) => f.rel !== "src/lib/server/report-pack.ts"), roles).problems.filter((p) => p.startsWith("src/lib/server/report-pack.ts")),
      unclassifiedExport: auditExportProblems(`${AUDIT_MODULE}.ts`, `${auditCode}\nexport function listAuditRows() { return [] as AuditEntry[]; }`),
      reexportedFromAudit: auditExportProblems(`${AUDIT_MODULE}.ts`, `${auditCode}\nexport { getAuditPage as readRows };`),
    };
    ok("0.260.c3 · CONTROL · outside the console, a new service returning a reader's rows and a module reading through a namespace are each reported as unclassified, a file that only names a reader in a string is not, and a classified file that stops reading is reported stale; an audit module export under a new name, and one re-exported under another, are each reported",
      j(outsidePlants.timeline) === j(["src/lib/server/planted-timeline.ts: calls an audit row reader outside the console and is not classified in AUDIT_READERS_OUTSIDE_CONSOLE — a service that hands a console page rows skips the gate"])
        && outsidePlants.aliasedTimeline.length === 1 && outsidePlants.aliasedTimeline[0].includes("not classified") && outsidePlants.nameOnly.length === 0
        && j(outsidePlants.staleEntry) === j(["src/lib/server/report-pack.ts: is classified in AUDIT_READERS_OUTSIDE_CONSOLE but calls no audit row reader (the list is stale)"])
        && j(outsidePlants.unclassifiedExport) === j(["src/lib/server/audit.ts: exports listAuditRows, which is neither an audit row reader nor a declared non-reader"])
        && outsidePlants.reexportedFromAudit.length === 1 && outsidePlants.reexportedFromAudit[0].includes("an export the classification cannot read"),
      j(outsidePlants));
  });
}

/** ruling 214 · the shapes `ReportPackCard`'s read must and must not have. Written as regex
 *  LITERALS, never `new RegExp("…")`: a pattern built from a string has to survive two layers of
 *  escaping, and the copy that lost a backslash matches something else while still looking right. */
const RE_CARD_GUARD = /try\s*\{[\s\S]{0,240}await getReportPack\(/;
const RE_CARD_CATCH = /catch\s*[({]/;  // `catch (e)` AND the binding-less `catch {` — a pin that knew only one of them called the other shape UNGUARDED (found by 0.214.c2's own plant).
const RE_CARD_LOADERR = /<AdminLoadError\b/;
const RE_CARD_DEFAULT = /state:\s*"(draft|prepared|approved|submitted|acknowledged)"/;
const PLANT_CARD_UNGUARDED = [
  "export async function ReportPackCard() {",
  "  const pack = await getReportPack(period);",
  "  return <AdminCard>{pack.state}</AdminCard>;",
  "}",
].join("\n");
const PLANT_CARD_DEFAULTED = [
  "export async function ReportPackCard() {",
  "  let pack;",
  "  try { pack = await getReportPack(period); }",
  '  catch { pack = { state: "draft", historyIncomplete: true }; }',
  '  return <AdminCard><AdminLoadError what="the regulator pack" />{pack.state}</AdminCard>;',
  "}",
].join("\n");

/* ═══ §0 · ruling 215 · R8's source pins: no ring read in the report population; every `rg.*` write is listed ═══ */

/**
 * ⛔ THE POPULATION, BY NAME AND BY PREFIX (ruling 215, as D20 left it). `house-liquidity.ts` and
 * `attest.ts` belonged to struck rulings 201/202 and were DELETED by C5-5b, so they are not here — and
 * a pin whose population silently shrinks to files that no longer exist is a pin that cannot fail.
 * Both named files are therefore REQUIRED to be present, and the count is held to a floor.
 */
export const R8_RING_POPULATION_FILES = ["src/lib/server/report-pack.ts", "src/lib/server/reports/catalogue.ts"] as const;
export const R8_RING_POPULATION_PREFIX = "src/lib/server/house-bot/";
/** Measured at this commit by running the pin: 36 — the two named files + 34 modules under
 *  `src/lib/server/house-bot/`. The floor is one below, so a deleted module is not a false red while a
 *  population that collapsed to the two named files still is. */
export const R8_RING_POPULATION_FLOOR = 35;

export function r8RingPopulation(files: string[]): string[] {
  return files.filter((f) => (R8_RING_POPULATION_FILES as readonly string[]).includes(f) || f.startsWith(R8_RING_POPULATION_PREFIX));
}

/**
 * Whole-word `getAuditPage` in the population — the RING reader.
 *
 * ⚠️ WORD BOUNDARIES ARE THE WHOLE POINT. `getAuditPageDurable` is the TABLE reader and
 * `catalogue.ts` legitimately imports and calls it for the ISO 27001 export; a substring match would
 * report it and the only way to go green would be to weaken the pin.
 */
export function ringReadHits(files: Array<{ rel: string; code: string }>): string[] {
  const out: string[] = [];
  for (const { rel, code } of files) {
    for (const name of ["getAuditPage", "getAuditForTarget", "getAuditForActor", "getAuditById"]) {
      if (new RegExp(`\\b${name}\\b`).test(code)) out.push(`${rel}: ${name}`);
    }
  }
  return out;
}

/** The string literals a node can evaluate to: itself, or BOTH arms of a ternary (recursively). */
function literalArms(n: ts.Node | undefined): string[] {
  if (!n) return [];
  const own = literalText(n);
  if (own != null) return [own];
  if (ts.isConditionalExpression(n)) return [...literalArms(n.whenTrue), ...literalArms(n.whenFalse)];
  if (ts.isParenthesizedExpression(n)) return literalArms(n.expression);
  return [];
}

/**
 * Every action a file WRITES: the string value of the `action:` property of an `audit({...})` call,
 * both ternary arms included.
 *
 * ⛔ IT IS THE WRITE SITE, NOT THE WORD. A comparison (`e.action === "rg.reality_check.continued"`)
 * and a freeze `ref` literal (`ref: { via: "rg.self_exclusion.reopened" }`) name the same strings and
 * write nothing; a pin that matched the literal anywhere would report both, and the only way green
 * would be an exemption list that also hides a real writer.
 */
export function auditActionWrites(file: string, code: string): string[] {
  if (!code.includes("audit(")) return [];
  const out: string[] = [];
  walkTree(parse(file, code), (n) => {
    if (!ts.isCallExpression(n)) return;
    const callee = n.expression.getText();
    if (callee !== "audit" && !callee.endsWith(".audit")) return;
    const arg = n.arguments[0];
    if (!arg || !ts.isObjectLiteralExpression(arg)) return;
    for (const p of arg.properties) {
      if (ts.isPropertyAssignment(p) && p.name.getText() === "action") out.push(...literalArms(p.initializer));
    }
  });
  return out;
}

/** The `RG_AUDIT_ACTIONS` list as `catalogue.ts` declares it, read from the syntax tree. */
export function declaredRgActions(code: string): string[] {
  const out: string[] = [];
  walkTree(parse("src/lib/server/reports/catalogue.ts", code), (n) => {
    if (!ts.isVariableDeclaration(n) || !ts.isIdentifier(n.name) || n.name.text !== "RG_AUDIT_ACTIONS" || !n.initializer) return;
    walkTree(n.initializer as unknown as ts.SourceFile, (d) => { const t = literalText(d); if (t != null) out.push(t); });
  });
  return out;
}

/** Both directions: an `rg.*` write nobody listed, and a listed action nobody writes. */
export function rgListDrift(files: Array<{ rel: string; code: string }>, declared: string[]): { unlisted: string[]; writerless: string[]; written: string[] } {
  const written = new Set<string>();
  const unlisted: string[] = [];
  for (const { rel, code } of files) {
    for (const a of auditActionWrites(rel, code)) {
      if (!a.startsWith("rg.")) continue;
      written.add(a);
      if (!declared.includes(a)) unlisted.push(`${rel}: ${a}`);
    }
  }
  return { unlisted, writerless: declared.filter((a) => !written.has(a)), written: [...written].sort() };
}

if (STORE === "memory") {
  section("§0 · ruling 215 · R8's source pins: the report population reads no audit RING, and RG_AUDIT_ACTIONS is exactly the rg.* actions written");
  await guard("0.215", () => {
    const all = srcFiles();
    const population = r8RingPopulation(all);
    const named = (R8_RING_POPULATION_FILES as readonly string[]).filter((f) => population.includes(f));
    ok("0.215.0 · the population is real and both named files still exist (a population that shrinks to deleted files is a pin that cannot fail)",
      population.length >= R8_RING_POPULATION_FLOOR && named.length === R8_RING_POPULATION_FILES.length,
      `${population.length} files (floor ${R8_RING_POPULATION_FLOOR}) · named present ${j(named)}`);
    const files = population.map((rel) => ({ rel, code: decomment(read(rel)) }));
    ok("0.215.1 · ⛔ no file in the population reads the in-memory audit ring: R8's swap holds, and a report that claims completeness never comes from a per-container ring that empties on every deploy",
      ringReadHits(files).length === 0, j(ringReadHits(files)));
    // CONTROLS — the whole-word rule, seen both ways.
    const planted = ringReadHits([{ rel: "src/lib/server/reports/planted.ts", code: `const rows = getAuditPage({ category: "ADMIN", limit: 10000 });` }]);
    const benign = ringReadHits([{ rel: "src/lib/server/reports/benign.ts", code: `import { getAuditPageDurable } from "../audit";\nconst { entries } = await getAuditPageDurable({ limit: 25000 });` }]);
    ok("0.215.c1 · CONTROL · a planted file calling getAuditPage IS reported, and one calling only getAuditPageDurable is NOT (word boundaries, not substrings)",
      planted.length === 1 && benign.length === 0, j({ planted, benign }));
    const realDurable = read("src/lib/server/reports/catalogue.ts");
    ok("0.215.c2 · CONTROL · the real catalogue.ts still calls getAuditPageDurable — the benign shape above is the shape this file actually has, not an invented one",
      /\bgetAuditPageDurable\(/.test(decomment(realDurable)), "");

    // ── the RG list, in both directions ──
    const declared = declaredRgActions(realDurable);
    const srcAll = all.map((rel) => ({ rel, code: decomment(read(rel)) }));
    const drift = rgListDrift(srcAll, declared);
    ok("0.215.2 · the declared list was really read (six actions at this commit)", declared.length >= 6, j(declared));
    ok("0.215.3 · ⛔ every rg.* action WRITTEN under src/ is in RG_AUDIT_ACTIONS — an action the report's reader does not name is an activation the regulator's document never shows",
      drift.unlisted.length === 0, j(drift.unlisted));
    ok("0.215.4 · ⛔ …and every action in RG_AUDIT_ACTIONS has a writer: a list of actions that cannot occur is a list nobody can measure (rg.reality_check.continued is READ and never written — L30)",
      drift.writerless.length === 0, `declared ${j(declared)} · written ${j(drift.written)}`);
    ok("0.215.5 · the walker sees the real writers, both ternary arms included (rg.limit.changed and rg.limit.increase.deferred are the two arms of ONE audit call)",
      drift.written.includes("rg.limit.changed") && drift.written.includes("rg.limit.increase.deferred") && drift.written.includes("rg.self_exclusion.reopened"),
      j(drift.written));
    // CONTROLS — a write is reported; a read-only comparison and a freeze `ref` literal are not.
    const write = rgListDrift([{ rel: "src/lib/server/planted-write.ts", code: `audit({ category: "COMPLIANCE", action: "rg.reality_check.continued", actorId: userId, targetType: "User", targetId: userId });` }], declared);
    const compare = rgListDrift([{ rel: "src/app/admin/compliance/planted-page.tsx", code: `const continued = rgEvents.filter((e) => e.action === "rg.reality_check.continued").length;` }], declared);
    const freezeRef = rgListDrift([{ rel: "src/app/admin/players/[id]/planted-actions.ts", code: `await removeWalletFreeze(userId, "SELF_EXCLUSION", { actorId: officerId, note: reason, ref: { via: "rg.never_listed.here" } });` }], declared);
    ok("0.215.c3 · CONTROL · a planted WRITE of an unlisted rg.* action is reported; the compliance page's read-only comparison and the wallet-freeze `ref` literal are NOT",
      write.unlisted.length === 1 && compare.unlisted.length === 0 && freezeRef.unlisted.length === 0, j({ write: write.unlisted, compare: compare.unlisted, freezeRef: freezeRef.unlisted }));
    const ternary = rgListDrift([{ rel: "src/lib/server/planted-ternary.ts", code: `audit({ category: "COMPLIANCE", action: deferred ? "rg.limit.increase.deferred" : "rg.limit.never_listed", actorId: userId });` }], declared);
    ok("0.215.c4 · CONTROL · BOTH arms of a ternary action are read: a planted ternary whose SECOND arm is unlisted is reported once, and its listed arm is not",
      ternary.unlisted.length === 1 && ternary.unlisted[0].endsWith("rg.limit.never_listed"), j(ternary.unlisted));
    const listedWrite = rgListDrift([{ rel: "src/lib/server/planted-listed.ts", code: `audit({ category: "COMPLIANCE", action: "rg.cooling_off.activated", actorId: userId });` }], declared);
    ok("0.215.c5 · CONTROL · a write of a LISTED action is not reported (the pin reports drift, not rg.* itself)", listedWrite.unlisted.length === 0, j(listedWrite.unlisted));
  });

  section("§0 · ruling 214 · every pack transition reads its pack through the refusing reader, before any append");
  await guard("0.214", () => {
    const rel = "src/app/admin/reports/pack-actions.ts";
    const code = decomment(read(rel));
    const sf = parse(rel, code);
    const ACTIONS = ["prepareReportPack", "approveReportPack", "submitReportPack", "acknowledgeReportPack"];
    const found: string[] = [];
    const bad: string[] = [];
    walkTree(sf, (n) => {
      if (!ts.isFunctionDeclaration(n) || !n.name || !ACTIONS.includes(n.name.text) || !n.body) return;
      const name = n.name.text;
      found.push(name);
      let guardAt = -1, firstAppendAt = -1;
      walkTree(n.body as unknown as ts.SourceFile, (d) => {
        if (!ts.isCallExpression(d)) return;
        const callee = d.expression.getText();
        if (callee === "readPackForTransition" && guardAt < 0) guardAt = d.getStart();
        if ((callee === "audit" || callee.endsWith(".audit") || callee === "twoOfficerGate") && firstAppendAt < 0) firstAppendAt = d.getStart();
      });
      if (guardAt < 0) bad.push(`${name}: never calls readPackForTransition`);
      else if (firstAppendAt >= 0 && firstAppendAt < guardAt) bad.push(`${name}: appends before the guard`);
    });
    ok("0.214.0 · all four maker-checker actions were found in the file (a pin over three of them would pass while the fourth signed a pack on an unreadable history)",
      j(found.sort()) === j([...ACTIONS].sort()), j(found));
    ok("0.214.1 · ⛔ each of the four calls readPackForTransition BEFORE any audit append or two-officer gate — a refusal after the append puts the signature on the chain and tells the officer it was blocked",
      bad.length === 0, j(bad));
    ok("0.214.2 · ⛔ …and none of them reads the pack any other way: `getReportPack` appears nowhere in the actions file, so the refusing reader is the only door",
      !/\bgetReportPack\b/.test(code), "");
    // CONTROLS — each shape reported.
    const order = (body: string) => {
      const c = `export async function prepareReportPack(formData: FormData) {${body}}\nexport async function approveReportPack(f: FormData) { const r = await readPackForTransition(p); if (!r.ok) return r; audit({}); }\nexport async function submitReportPack(f: FormData) { const r = await readPackForTransition(p); if (!r.ok) return r; audit({}); }\nexport async function acknowledgeReportPack(f: FormData) { const r = await readPackForTransition(p); if (!r.ok) return r; audit({}); }`;
      const sfp = parse("src/app/admin/reports/planted-actions.ts", c);
      const out: string[] = [];
      walkTree(sfp, (n) => {
        if (!ts.isFunctionDeclaration(n) || !n.name || n.name.text !== "prepareReportPack" || !n.body) return;
        let g = -1, a = -1;
        walkTree(n.body as unknown as ts.SourceFile, (d) => {
          if (!ts.isCallExpression(d)) return;
          const callee = d.expression.getText();
          if (callee === "readPackForTransition" && g < 0) g = d.getStart();
          if ((callee === "audit" || callee === "twoOfficerGate") && a < 0) a = d.getStart();
        });
        if (g < 0) out.push("never calls readPackForTransition");
        else if (a >= 0 && a < g) out.push("appends before the guard");
      });
      return out;
    };
    // The CARD's own half: it renders above both tabs, so its read is caught and answered with the
    // platform's read-failed state — never caught into a default pack, which would paint DRAFT.
    const cardRel = "src/app/admin/reports/report-pack-card.tsx";
    const card = decomment(read(cardRel));
    /* Caught-and-answered, and answered HONESTLY: the read is guarded, the platform's read-failed
       state is what it renders, and nothing in the file writes a pack state literal. */
    const cardGuard = (code: string) => ({
      guarded: RE_CARD_GUARD.test(code) && RE_CARD_CATCH.test(code) && RE_CARD_LOADERR.test(code),
      defaulted: RE_CARD_DEFAULT.test(code),
    });
    const real = cardGuard(card);
    ok("0.214.3 · ⛔ ReportPackCard CATCHES its own read and renders the platform's read-failed state: the durable swap made this read able to fail, and a throw here takes the KPI strip, the daily P&L and the whole report library down with it",
      real.guarded, j(real));
    ok("0.214.4 · ⛔ …and it is NOT caught into a default pack: no pack-state literal is written in that file, so a failed read can never paint DRAFT on a filing that may already be signed",
      !real.defaulted, j(real));
    const unguarded = cardGuard(PLANT_CARD_UNGUARDED);
    const defaulted = cardGuard(PLANT_CARD_DEFAULTED);
    ok("0.214.c2 · CONTROL · a planted card that calls getReportPack with NO catch is reported as unguarded, and one that catches into a DEFAULT pack is reported as defaulted — the second is the shape that would paint DRAFT over a history nobody could read",
      unguarded.guarded === false && unguarded.defaulted === false && defaulted.guarded === true && defaulted.defaulted === true,
      j({ unguarded, defaulted }));
    const missing = order(` const pack = await getReportPack(period); audit({ action: "pack.prepared" }); `);
    const late = order(` audit({ action: "pack.prepared" }); const r = await readPackForTransition(period); if (!r.ok) return r; `);
    const good = order(` const r = await readPackForTransition(period); if (!r.ok) return r; audit({ action: "pack.prepared" }); `);
    ok("0.214.c1 · CONTROL · an action that never calls the guard is reported, one that appends BEFORE it is reported, and the real order is not",
      missing.length === 1 && late.length === 1 && good.length === 0, j({ missing, late, good }));
  });
}

/* ═══ §3 · ruling 170 · an OFFICER's own "Export my data" and feed name nothing about house bots (both stores) ═══════ */
// An officer is a player of their own account too, and the DSAR queue writes their actions with THEM as actor: the
// fulfilled erasure spreads the routine's counts (`houseBots`, `houseBotNotificationsRedacted`, always present, 0 for an
// ordinary account) and a refusal on a live holder records `reason: "house_bot_live"`. The durable rows keep every word
// (D19b: the audits are unchanged); the officer's own releasable file and feed carry none (C5 steps 1–2 review, F1).
section("§3 · ruling 170 · an officer's own export and feed: no house word at any depth, while the durable rows keep theirs");
await guard("3", async () => {
  const { loadWorld, OFFICER }: Any = await import("./house-bot-world.mts");
  const w: Any = await loadWorld();
  const { exportUserData, getOwnActivity }: Any = await import("../../src/lib/server/user-service.ts");
  const PRIV: Any = await import("../../src/lib/server/privacy.ts");
  const AUD: Any = await import("../../src/lib/server/audit.ts");
  const HH: Any = await import("../../src/lib/server/house-bot/holder-hook.ts");
  await w.user({ id: OFFICER, role: "ADMIN" });
  const officer = await w.user({ role: "ADMIN" });

  // (a) FIRST, while no other writer's hook call is in flight: an erasure refused on a CLOSED account that is still a live
  // house bot. The in-app holder hook is held for the filing (ruling 156: running, it would remove the bot first), and
  // released only once the filing's own call has reached it and been refused — a condition, never a guessed delay.
  const b = await w.bot();
  await w.setUserFields(b.userId, { status: "CLOSED", closedAt: new Date().toISOString() });
  HH.suspendInAppHolderHookForCases(true);
  const heldBefore = HH.suspendedInAppHolderHookCallsForCases();
  let refusedReq: Any;
  try {
    refusedReq = PRIV.fileDsarRequest({ userId: b.userId, type: "ERASURE" });
    for (let k = 0; k < 2_000 && HH.suspendedInAppHolderHookCallsForCases() === heldBefore; k++) await new Promise((r) => setTimeout(r, 5));
  } finally {
    HH.suspendInAppHolderHookForCases(false);
  }
  const refused = await PRIV.fulfillDsarRequest({ id: refusedReq.id, officerId: officer });

  // (b) An erasure the routine runs, on an ordinary CLOSED account.
  const gone = await w.user({});
  await w.setUserFields(gone, { status: "CLOSED", closedAt: new Date().toISOString() });
  const doneReq = PRIV.fileDsarRequest({ userId: gone, type: "ERASURE" });
  const done = await PRIV.fulfillDsarRequest({ id: doneReq.id, officerId: officer });

  // (c) The house report and export rows an ADMIN writes, with house words in their payloads.
  const HOUSE_ROWS = ["report.house-liquidity.generated", "report.house-market-statement.failed", "house_bot.exported"];
  for (const action of HOUSE_ROWS) await AUD.audit({ category: "ADMIN", action, actorId: officer, targetType: "Report", targetId: "house-liquidity", payload: { id: "house-liquidity" } });
  await AUD.auditFlush();

  const durable = (await AUD.getAuditForActorDurable(officer, { limit: 500 })).entries as Any[];
  const dFulfilled = durable.find((e) => e.action === "privacy.dsar.fulfilled");
  const dRefused = durable.find((e) => e.action === "privacy.dsar.erasure_blocked");
  ok("3.1 · CONTROL · the durable rows carry the house words: the fulfilled erasure's counts, the refusal's house_bot_live reason, the report and export rows",
    done.ok === true && refused.ok === false && !!dFulfilled && "houseBots" in (dFulfilled.payload ?? {}) && "houseBotNotificationsRedacted" in (dFulfilled.payload ?? {})
      && dRefused?.payload?.reason === "house_bot_live" && HOUSE_ROWS.every((a) => durable.some((e) => e.action === a)) && houseHits(j(durable)).length > 0,
    j({ done: done.ok, refused, fulfilledKeys: Object.keys(dFulfilled?.payload ?? {}), refusedPayload: dRefused?.payload, actions: durable.map((e) => e.action) }));

  const exp = await exportUserData(officer);
  const expRows = exp.auditEntries.entries as Any[];
  const eFulfilled = expRows.find((e) => e.action === "privacy.dsar.fulfilled");
  const eRefused = expRows.find((e) => e.action === "privacy.dsar.erasure_blocked");
  ok("3.2 · ⛔ D19 · the officer's own export keeps both DSAR rows (status and subject kept, the refusal's reason neutral) and names nothing at any depth",
    !!eFulfilled && eFulfilled.payload?.status === done.request?.status && eFulfilled.payload?.userId === gone && !("houseBots" in eFulfilled.payload)
      && !!eRefused && eRefused.payload?.reason === "not_erasable" && eRefused.payload?.userId === b.userId
      && HOUSE_ROWS.every((a) => !expRows.some((e) => e.action === a)) && houseHits(j(exp)).length === 0 && !j(exp).includes(b.botId),
    j({ hits: houseHits(j(exp)).slice(0, 6), fulfilled: eFulfilled?.payload, refused: eRefused?.payload }));
  const feed = await getOwnActivity(officer, 200);
  ok("3.3 · ⛔ D19 · …and the /profile/account feed's rows (payloads included) name nothing either",
    (feed.entries as Any[]).some((e) => e.action === "privacy.dsar.erasure_blocked") && houseHits(j(feed)).length === 0,
    j(houseHits(j(feed)).slice(0, 6)));
});

/* ═══ §11 (ruling 171 slice) · the public /api/health body's raw-text paths name nothing (both stores) ═══════════ */
// Ruling 171 fixes the requirement: no key or VALUE of the public body names anything house. Two values were raw text
// from elsewhere — the 500 branch's `String(err)` and the email rail's provider failure text (house admin mail rides the
// same `sendEmail`) — so neither is published; their detail stays in the server log and the internal reader.
section("§11 · ruling 171 · /api/health publishes no raw error text: the 500 branch and the email failure reason");
await guard("11.171", async () => {
  const H: Any = await import("../../src/app/api/health/route.ts");
  const EM: Any = await import("../../src/lib/server/email.ts");
  const G = globalThis as Any;
  const saved = G.__50PICK_EMAIL_HEALTH;
  const planted = "Tag 'house-bot-erasure-blocked' refused for house bot hb_0123456789abcdef01234567 (statusCode=422, errorCode=300)";
  const state = (reason: string) => ({ consecutiveFailures: 1, totalFailures: 1, totalSent: 0, lastFailureAt: new Date().toISOString(), lastFailureReason: reason, alertedAt: null });
  try {
    G.__50PICK_EMAIL_HEALTH = state(planted);
    const res = await H.GET();
    const body: Any = await res.json();
    ok("11.171.1 · CONTROL · the planted provider text names the feature, and the internal reader keeps it whole",
      houseHits(planted).length >= 2 && EM.emailHealth().lastFailureReason === planted, j(houseHits(planted)));
    ok("11.171.2 · ⛔ D19 · the public body's email block says DEGRADED and gives the failure's class and codes, never the provider's text",
      body.email?.status === "DEGRADED" && body.email?.lastFailureReason === "provider error (statusCode=422, errorCode=300)" && houseHits(j(body)).length === 0 && !j(body).includes("hb_0123"),
      j(body.email));
    const own = "email send timed out after 10000ms (statusCode=?, errorCode=?)";
    G.__50PICK_EMAIL_HEALTH = state(own);
    const timedOut: Any = await (await H.GET()).json();
    ok("11.171.3 · …while this platform's own failure sentence (the send timeout) is published whole", timedOut.email?.lastFailureReason === own, j(timedOut.email));
    G.__50PICK_EMAIL_HEALTH = new Proxy({}, { get() { throw new Error("house bot hb_0123456789abcdef01234567 liquidity read failed"); } });
    const r500 = await H.GET();
    const b500: Any = await r500.json();
    ok("11.171.4 · ⛔ D19 · a health read that throws answers 500 health-check-failed and publishes no error text",
      r500.status === 500 && b500.ok === false && b500.error === "health-check-failed" && houseHits(j(b500)).length === 0 && !j(b500).includes("hb_0123"), `${r500.status} · ${j(b500)}`);
  } finally {
    G.__50PICK_EMAIL_HEALTH = saved;
  }
});

/* ═══ §4 · rulings 259, 260 · the console gate D20 KEEPS: its audience, and NO audit row for anyone else ══════ */
// ⛔ WHY THIS SECTION IS HERE AGAIN. Owner ruling D20 struck the house DISPLAY, so checkpoint C5-5b un-built rulings
// 192–197 and the cases that read an exposure line. Removed with them were the only cases that ever CALLED the gate the
// replan explicitly KEEPS (§2, rulings 259–260): `houseConsoleAudience` and `houseAuditForConsole`. The source pin 0.260.1
// proves every console file hands its audit read to the gate — it cannot see what the gate RETURNS, and the served probe
// asks four viewers on a built server, never the staff audience. So the gate's behaviour is proven here, on BOTH stores.
//
// Measured on this branch's production build before the gate existed: /admin/players/<holder> streamed the holder's
// `house_bot.password_verified` row, and /admin/audit every house row with its payload, to a signed-in PLAYER — the holder
// and a trigger player too — behind the layout's redirect (ruling 259: a layout is not a gate; W25 is unfixed on main).
// A house-free filter is not enough: a PLATFORM row can carry a house VALUE (a deduped HOUSE_BOT notice's kind, a failed
// letter's tag, an error's stack), and a refused erasure's reason exists only for a live house bot, so even a rewritten
// reason names the account.
//
// The rows are PLANTED as the services write them (designation's password check and the designation, a house report's
// generated row, the owner's per-bot export, an erasure refused on a live holder as privacy.ts writes it, the
// provider-down alert as email.ts writes it, a server error as monitoring.ts writes it, an officer's own platform action,
// a platform action about a house bot, and the marked stake's own BET row in the shape market-service.ts writes it) plus
// ONE real deduped HOUSE_BOT notice through `notify()`. Two are there for a reason of their own: the `market.resolve.bulk`
// Batch row carries `houseStakes` because a row STORED before ruling 187 was un-built keeps its keys and must still never
// reach a non-staff viewer, and `player.suspended` carries no house word at all — the gate withholds every row of the
// page, not the house-looking ones.
section("§4 · rulings 259, 260 · the console audit gate: the audience on the STORED role, and no row for anyone outside it");
await guard("4", async () => {
  const { loadWorld, OFFICER }: Any = await import("./house-bot-world.mts");
  const w: Any = await loadWorld();
  const CR: Any = await import("../../src/lib/server/house-console-read.ts");
  const AU: Any = await import("../../src/lib/server/audit.ts");
  const RB: Any = await import("../../src/lib/server/rbac.ts");
  const RL: Any = await import("../../src/lib/server/roles.ts");
  const N: Any = await import("../../src/lib/server/notification-service.ts");
  const tag = w.uid("g259");
  // The officer row the designation fixture points at (a foreign key on Postgres); §3 may already have created it.
  if (!(await w.db.user.findById(OFFICER))) await w.user({ id: OFFICER, role: "ADMIN" });
  const A = await w.user({ role: "ADMIN" });
  const CO = await w.user({ role: "COMPLIANCE" });
  const MOD = await w.user({ role: "MODERATOR" });
  const SUPPORT = await w.user({ role: "SUPPORT" });
  const plainPlayer = await w.user({ balance: 10_000 });
  const triggerAB = await w.user({ balance: 10_000 });
  const b = await w.bot();
  const holderAB = b.userId, botAB = b.botId;

  const holderRows: Any[] = [
    await AU.audit({ category: "SECURITY", action: "house_bot.password_verified", actorId: A, targetType: "User", targetId: holderAB, payload: { holderUserId: holderAB, outcome: "VERIFIED" } }),
    await AU.audit({ category: "COMPLIANCE", action: "house_bot.designated", actorId: A, targetType: "HouseBot", targetId: botAB, payload: { botId: botAB, holderUserId: holderAB } }),
    await AU.audit({ category: "ADMIN", action: "report.house-liquidity.generated", actorId: A, targetType: null, targetId: null, payload: { format: "xlsx", filename: `house-liquidity-${tag}.xlsx` } }),
    await AU.audit({ category: "ADMIN", action: "house_bot.exported", actorId: A, targetType: "HouseBot", targetId: botAB, payload: { botId: botAB, code: "INTERNAL_RECORD" } }),
    // privacy.ts's shape: the request is the target, the account is in the payload, the reason names the feature.
    await AU.audit({ category: "COMPLIANCE", action: "privacy.dsar.erasure_blocked", actorId: A, targetType: "DsarRequest", targetId: `dsar_${tag}`, payload: { userId: holderAB, reason: "house_bot_live" } }),
    // A row with NO house word: the gate withholds the whole page, never a house-looking subset.
    await AU.audit({ category: "ADMIN", action: "player.suspended", actorId: A, targetType: "User", targetId: holderAB, payload: { reason: `fraud review ${tag}` } }),
    // A platform action ABOUT a house bot (no house-owned action name).
    await AU.audit({ category: "ADMIN", action: "alert.acknowledged", actorId: A, targetType: "HouseBot", targetId: botAB, payload: { note: `seen ${tag}` } }),
    // email.ts's shape: the tag of the letter whose failure crossed the threshold.
    await AU.audit({ category: "COMPLIANCE", action: "email.provider_down", actorId: null, targetType: "System", targetId: "email", payload: { consecutiveFailures: 5, reason: `timeout ${tag}`, tag: "house-bot-erasure-blocked", note: "5 consecutive transactional email failures" } }),
    // monitoring.ts's shape: a thrown error's message and stack, kept whole.
    await AU.audit({ category: "SYSTEM", action: "server.error", actorId: null, targetType: "Route", targetId: "/admin/markets/[id]", payload: { name: "Error", message: `house bot label read failed ${tag}`, stack: `Error: house bot ${botAB} label read failed`, method: "GET", digest: null, repeatsSuppressed: 0, monitorEnabled: false } }),
    // market-service.ts's BET row for a marked stake: the holder is the actor, the position the target, the bot in the payload.
    await AU.audit({ category: "BET", action: "market.position.opened", actorId: holderAB, targetType: "Position", targetId: `pos_${tag}`, payload: { marketId: `mkt_${tag}`, side: "NO", stake: 9_000, payoutIfWin: 18_000, kycStatus: "APPROVED", everApproved: true, houseBotId: botAB, intentId: `hbi_${tag}` } }),
    // ⛔ A ROW STORED BEFORE RULING 187 WAS UN-BUILT KEEPS ITS KEYS (D20, C5-5b): nothing writes `houseStakes` any more,
    // which is exactly why it is planted — the gate must still drop it for a viewer outside the route's audience.
    await AU.audit({ category: "COMPLIANCE", action: "market.resolve.bulk", actorId: A, targetType: "Batch", targetId: `batch_${tag}`, payload: { batchId: `batch_${tag}`, resolved: [`mkt_${tag}`], houseStakes: { [`mkt_${tag}`]: { yes: 0, no: 9_000, staffChosen: { yes: 0, no: 9_000, requestedBy: [A] } } } } }),
  ];
  // notification-service.ts, for real: the same HOUSE_BOT notice twice inside the dedupe window writes notification.deduped.
  const dupNotice = { userId: A, kind: "HOUSE_BOT", titleEn: `House bot paused ${tag}`, titleSw: `House bot paused ${tag}`, bodyEn: `Dar desk paused ${tag}`, bodySw: `Dar desk paused ${tag}`, href: "/admin" };
  const firstNotice = await N.notify(dupNotice);
  const secondNotice = await N.notify(dupNotice);
  await AU.auditFlush();

  // ── the audience: the page's own view grant on the STORED role (ruling 259) ──
  const audience = {
    coOnKyc: await CR.houseConsoleAudience(CO, "/admin/kyc"), coOnObjections: await CR.houseConsoleAudience(CO, "/admin/objections"),
    modOnObjections: await CR.houseConsoleAudience(MOD, "/admin/objections"), modOnRounds: await CR.houseConsoleAudience(MOD, "/admin/updown/rounds"),
    adminOwnerOnly: await CR.houseConsoleAudience(A, "/admin/staff"), modOwnerOnly: await CR.houseConsoleAudience(MOD, "/admin/staff"),
    holderOnKyc: await CR.houseConsoleAudience(holderAB, "/admin/kyc"), playerOnMarkets: await CR.houseConsoleAudience(plainPlayer, "/admin/markets"),
    noSession: await CR.houseConsoleAudience(null, "/admin/audit"), emptyId: await CR.houseConsoleAudience("", "/admin/audit"),
    unknownId: await CR.houseConsoleAudience(`usr_nobody_${tag}`, "/admin/audit"), adminOffConsole: await CR.houseConsoleAudience(A, "/markets"),
  };
  ok("4.259.2 · the audience is the page's own view grant on the STORED role: COMPLIANCE sees the KYC case and the objections, the MODERATOR the Up and Down rounds and not the objections, an Owner-only path is ADMIN's alone, and the holder, a player, no session, an empty or unknown id and an ADMIN asking about a non-console route are all outside",
    j(audience) === j({ coOnKyc: true, coOnObjections: true, modOnObjections: false, modOnRounds: true, adminOwnerOnly: true, modOwnerOnly: false, holderOnKyc: false, playerOnMarkets: false, noSession: false, emptyId: false, unknownId: false, adminOffConsole: false }), j(audience));

  // A viewer read that fails is no viewer: the gate is asked while the user read throws.
  const realFindById = w.db.user.findById;
  let userReads = 0;
  let adminWhileUserReadFails: Any = "not run";
  w.db.user.findById = (...args: Any[]) => { userReads++; throw new Error(`user read failed (cases) ${args.length}`); };
  try { adminWhileUserReadFails = await CR.houseConsoleAudience(A, "/admin/resolver-queue"); } finally { w.db.user.findById = realFindById; }
  const adminAfterRestore = await CR.houseConsoleAudience(A, "/admin/resolver-queue");
  ok("4.259.3 · ⛔ fail closed: while the viewer's own user read throws, even the ADMIN is outside the audience — CONTROL: the user read was really asked, and restored it answers true again",
    adminWhileUserReadFails === false && userReads >= 1 && adminAfterRestore === true,
    j({ adminWhileUserReadFails, userReads, adminAfterRestore }));

  // ── ruling 260 · the audit rows a console page renders: whole for the route's audience, NONE for anyone else ──
  const holderRead = () => [...AU.getAuditForActor(holderAB, 200), ...AU.getAuditForTarget("User", holderAB, 200)];
  const logRead = () => AU.getAuditPage({ limit: 100_000 });
  const inputHolder = holderRead(), inputLog = logRead();
  const stakeRow = inputHolder.find((e: Any) => e.action === "market.position.opened" && typeof e.payload?.houseBotId === "string");
  const r9Row = inputLog.find((e: Any) => e.payload && typeof e.payload === "object" && "houseStakes" in e.payload);
  const dedupRow = inputLog.find((e: Any) => e.action === "notification.deduped" && e.targetId === firstNotice?.id);
  const valueRowIds = [holderRows[3]?.id, holderRows[7]?.id, holderRows[8]?.id, dedupRow?.id].filter((x: Any): x is string => typeof x === "string");
  const hitsOf = (rows: Any) => houseHits(j(rows));
  const outsideRoute = async (viewer: Any, route: string, rows: Any) => CR.houseAuditForConsole(viewer, route, rows);
  const outsideViews: Record<string, Any> = {
    playerOnPlayers: await outsideRoute(plainPlayer, "/admin/players", holderRead()), holderOnPlayers: await outsideRoute(holderAB, "/admin/players", holderRead()),
    triggerOnPlayers: await outsideRoute(triggerAB, "/admin/players", holderRead()), noSessionOnAudit: await outsideRoute(null, "/admin/audit", logRead()),
    playerOnAudit: await outsideRoute(plainPlayer, "/admin/audit", logRead()), holderOnAudit: await outsideRoute(holderAB, "/admin/audit", logRead()),
    triggerOnAudit: await outsideRoute(triggerAB, "/admin/audit", logRead()), holderOnOverview: await outsideRoute(holderAB, "/admin", logRead()),
    unknownOnAudit: await outsideRoute(`usr_nobody_${tag}`, "/admin/audit", logRead()), supportOnAudit: await outsideRoute(SUPPORT, "/admin/audit", logRead()),
    moderatorOnPlayers: await outsideRoute(MOD, "/admin/players", holderRead()), adminOffConsole: await outsideRoute(A, "/markets", logRead()),
  };
  const outsideFacts = Object.fromEntries(Object.entries(outsideViews).map(([k, rows]) => [k, {
    isArray: Array.isArray(rows), rows: Array.isArray(rows) ? rows.length : -1, hits: hitsOf(rows).slice(0, 4),
    valueRows: Array.isArray(rows) ? rows.filter((e: Any) => valueRowIds.includes(e.id)).map((e: Any) => `${e.action} ${j(e.payload).slice(0, 60)}`) : [],
  }]));
  ok("4.260.1 · ⛔ D19 · a console page's audit read gives NO row to a viewer outside the route's audience — a player, the holder and a trigger player on the player page and on the audit log, no session, an unknown id and SUPPORT on the audit log, the holder on the overview, the MODERATOR on the player page and an ADMIN asking about a non-console route — so no house action, no row about a house bot, no house key and no platform row carrying a house VALUE (the deduped HOUSE_BOT notice, the provider-down alert's letter tag, a house error's stack, the owner's export) reaches them; CONTROL: the rows read carry the house words, the holder's marked-stake row and a stored Batch row's houseStakes key, and every value row, the dedupe written by the real notify()",
    hitsOf(inputHolder).length >= 3 && hitsOf(inputLog).length >= 10 && !!stakeRow && !!r9Row && !!firstNotice && secondNotice?.id === firstNotice?.id && !!dedupRow
      && valueRowIds.length === 4 && valueRowIds.every((id: string) => inputLog.some((e: Any) => e.id === id)) && inputLog.some((e: Any) => e.id === holderRows[5]?.id)
      && Object.values(outsideFacts).every((f: Any) => f.isArray && f.rows === 0 && f.hits.length === 0 && f.valueRows.length === 0),
    j({ inputHits: [hitsOf(inputHolder).length, hitsOf(inputLog).length], stakeRow: !!stakeRow, r9Row: !!r9Row, dedup: [firstNotice?.id, secondNotice?.id, !!dedupRow], valueRowIds, outsideFacts }));

  const whole = async (viewer: Any, route: string, rows: Any) => { const out = await CR.houseAuditForConsole(viewer, route, rows); return j(out) === j(rows) && hitsOf(out).length > 0; };
  const insideViews = {
    adminOnAudit: await whole(A, "/admin/audit", logRead()), adminOnPlayers: await whole(A, "/admin/players", holderRead()), adminOnStaff: await whole(A, "/admin/staff", holderRead()),
    complianceOnAudit: await whole(CO, "/admin/audit", logRead()), complianceOnPlayers: await whole(CO, "/admin/players", holderRead()),
    supportOnPlayers: await whole(SUPPORT, "/admin/players", holderRead()), supportOnOverview: await whole(SUPPORT, "/admin", logRead()), moderatorOnResolver: await whole(MOD, "/admin/resolver", logRead()),
  };
  const moderatorOnStaff = await CR.houseAuditForConsole(MOD, "/admin/staff", holderRead());
  ok("4.260.2 · the audience reads every row whole, as the section gate would let it: the ADMIN on the audit log, the player page and the Owner-only staff page; COMPLIANCE on the audit log and the player page; SUPPORT on the player page and the overview; the MODERATOR on the resolver — while the MODERATOR on the Owner-only staff page gets no row",
    Object.values(insideViews).every(Boolean) && Array.isArray(moderatorOnStaff) && moderatorOnStaff.length === 0 && holderRead().length > 0,
    j({ insideViews, moderatorOnStaff: Array.isArray(moderatorOnStaff) ? moderatorOnStaff.length : moderatorOnStaff }));

  const durable = { entries: holderRead(), total: 9_999, truncated: true };
  const pageOut = await CR.houseAuditForConsole(holderAB, "/admin/kyc", durable);
  const bareEntries = await CR.houseAuditForConsole(holderAB, "/admin/kyc", { entries: holderRead() });
  const promised = await CR.houseAuditForConsole(holderAB, "/admin/players", Promise.resolve(holderRead()));
  const nullRead = await CR.houseAuditForConsole(holderAB, "/admin/kyc", Promise.resolve(null));
  let rejected: Any = "resolved";
  try { await CR.houseAuditForConsole(A, "/admin/kyc", Promise.reject(new Error(`durable read failed ${tag}`))); } catch (e) { rejected = String((e as Error)?.message ?? e); }
  ok("4.260.3 · the gate keeps the read's shape and says nothing about what it withheld: an outsider's durable page is no entries, a total of 0 and not truncated (a kept total beside fewer entries would count the rows withheld), a page with no total or flag gains none, a promised read is awaited, the page's own null stays null, and a failed read still rejects into the page's own catch",
    j(pageOut) === j({ entries: [], total: 0, truncated: false }) && durable.entries.length > 0 && j(bareEntries) === j({ entries: [] })
      && Array.isArray(promised) && promised.length === 0 && nullRead === null && rejected === `durable read failed ${tag}`,
    j({ pageOut, bareEntries, promised, nullRead, rejected }));

  const realFind = w.db.user.findById;
  let auditUserReads = 0;
  let adminWhileFailing: Any = "not run";
  w.db.user.findById = (...args: Any[]) => { auditUserReads++; throw new Error(`user read failed (cases) ${args.length}`); };
  try { adminWhileFailing = await CR.houseAuditForConsole(A, "/admin/audit", logRead()); } finally { w.db.user.findById = realFind; }
  const restoredInput = logRead();
  const adminRestored = await CR.houseAuditForConsole(A, "/admin/audit", restoredInput);
  ok("4.260.4 · ⛔ fail closed: while the viewer's user read throws, even the ADMIN gets no row; CONTROL: the user read was really asked, and restored the ADMIN reads the rows whole again",
    Array.isArray(adminWhileFailing) && adminWhileFailing.length === 0 && auditUserReads >= 1 && restoredInput.length > 0 && hitsOf(adminRestored).length > 0 && j(adminRestored) === j(restoredInput),
    j({ whileFailing: Array.isArray(adminWhileFailing) ? adminWhileFailing.length : adminWhileFailing, auditUserReads, restoredHits: hitsOf(adminRestored).length }));

  // ── the KYC case's DURABLE read, for real (AuditLog on Postgres, the ring's durable twin in memory) ──
  const durableRead = () => AU.getAuditForTargetDurable("User", holderAB, { limit: 500 });
  const durableIn = await durableRead();
  const durableHolder = await CR.houseAuditForConsole(holderAB, "/admin/kyc", durableRead());
  const durablePlayer = await CR.houseAuditForConsole(plainPlayer, "/admin/kyc", durableRead().catch(() => null));
  const durableCo = await CR.houseAuditForConsole(CO, "/admin/kyc", durableRead());
  ok("4.260.5 · ⛔ the KYC case's real durable read (getAuditForTargetDurable, as the page calls it): the holder and a player on /admin/kyc get no entries, a total of 0 and nothing truncated; COMPLIANCE, in the audience, reads the page whole; CONTROL: the durable page holds the holder's house_bot.password_verified row and a house word",
    Array.isArray(durableIn?.entries) && durableIn.entries.some((e: Any) => e.id === holderRows[0]?.id) && hitsOf(durableIn).length > 0
      && typeof durableIn.total === "number" && durableIn.total >= durableIn.entries.length
      && j(durableHolder) === j({ entries: [], total: 0, truncated: false }) && j(durablePlayer) === j({ entries: [], total: 0, truncated: false })
      && j(durableCo) === j(await durableRead()),
    j({ input: { entries: durableIn?.entries?.length, total: durableIn?.total, hits: hitsOf(durableIn).slice(0, 3) }, durableHolder, durablePlayer, co: durableCo?.entries?.length }));

  // ── the audience's staff clause: a grant row a PLAYER could be given does not seat a player ──
  const auditDomain = RL.domainForPath("/admin/audit");
  let playerGrantView: Any = "not run", playerWithGrant: Any = "not run", playerRowsWithGrant: Any = "not run";
  await RB.setRoleGrant("PLAYER", auditDomain, true, false, A);
  try {
    playerGrantView = await RB.canView("PLAYER", auditDomain);
    playerWithGrant = await CR.houseConsoleAudience(plainPlayer, "/admin/audit");
    playerRowsWithGrant = await CR.houseAuditForConsole(plainPlayer, "/admin/audit", logRead());
  } finally { await RB.setRoleGrant("PLAYER", auditDomain, false, false, A); }
  const playerGrantAfter = await RB.canView("PLAYER", auditDomain);
  ok("4.260.6 · ⛔ only a STAFF role is ever in the audience: while a grant row lets the PLAYER role view the audit log's domain, a player is still outside and reads no row; CONTROL: the grant really answered true, and restored it answers false",
    playerGrantView === true && playerWithGrant === false && Array.isArray(playerRowsWithGrant) && playerRowsWithGrant.length === 0 && playerGrantAfter === false,
    j({ auditDomain, playerGrantView, playerWithGrant, playerRows: Array.isArray(playerRowsWithGrant) ? playerRowsWithGrant.length : playerRowsWithGrant, playerGrantAfter }));
});

/* ═══ §8 · rulings 214 and 216 · R8: the pack and the RG report read the audit TABLE ═══════════════════ */
//
// ⛔ THIS SECTION RUNS LAST ON PURPOSE. Its Postgres half EMPTIES `globalThis.__50PICK_AUDIT_RING` — the
// "every deploy" state — and a section after it would read an empty ring and think nothing had happened.
section("§8 · rulings 214, 216 · the report pack and the RG engagement read the durable audit table, not the ring");
await guard("8", async () => {
  const AUD: Any = await import("../../src/lib/server/audit.ts");
  const RP: Any = await import("../../src/lib/server/report-pack.ts");
  const CAT: Any = await import("../../src/lib/server/reports/catalogue.ts");

  const OFFICER_A = "usr_r8_officer_a";
  const OFFICER_B = "usr_r8_officer_b";
  const packRow = (period: string, action: string, actorId: string, payload: Any = { period }) => AUD.audit({
    category: "ADMIN", action, actorId, targetType: "ReportPack", targetId: RP.packIdFor(period), payload,
  });
  /** Every `pack.*` transition row on one pack, read the way the pack itself is read. */
  const historyRows = async (period: string): Promise<number> =>
    (await AUD.getAuditForTargetsDurable({
      targetType: "ReportPack", targetIds: [RP.packIdFor(period)], actions: [...RP.PACK_STATE_ACTIONS],
      sinceIso: "1970-01-01T00:00:00.000Z", limit: 1000,
    })).entries.length;

  /* ── 8.214.1 · the crowd-out ruling 214 (1) chose the by-TARGETS reader to survive ─────────────── */
  // Our pack is signed FIRST, then sixty newer `pack.prepared` rows land on OTHER months' packs. A reader
  // that applies its limit BEFORE the target filter sees only those sixty and calls our pack a DRAFT —
  // which invites a second Prepare and a second officer signature on a filing already signed.
  const CROWD = "2031-01";
  await packRow(CROWD, "pack.prepared", OFFICER_A, { period: CROWD, sha256: "a".repeat(64), sizeBytes: 12, filename: `GB-${CROWD}.pdf`, reference: "REF-CROWD" });
  await packRow(CROWD, "pack.approved", OFFICER_B);
  for (let i = 0; i < 60; i++) await packRow(`2030-${String((i % 12) + 1).padStart(2, "0")}`, "pack.prepared", OFFICER_A, { period: "other", n: i });
  await AUD.auditFlush();
  const crowded = await RP.getReportPack(CROWD);
  const byActions = await AUD.getAuditByActionsDurable([...RP.PACK_STATE_ACTIONS], { category: "ADMIN", limit: 50 });
  const ourRowsInWindow = byActions.entries.filter((e: Any) => e.targetId === RP.packIdFor(CROWD)).length;
  ok("8.214.1 · ⛔ sixty newer pack rows on OTHER months do NOT move this pack: target AND action are filtered in SQL over @@index([targetType, targetId]), so its own transitions can never be crowded out of the window",
    crowded.state === "approved" && crowded.preparedBy === OFFICER_A && crowded.approvedBy === OFFICER_B && crowded.historyIncomplete === false,
    j({ state: crowded.state, preparedBy: crowded.preparedBy, approvedBy: crowded.approvedBy, historyIncomplete: crowded.historyIncomplete }));
  ok("8.214.1b · ⛔ CONTROL · the crowd-out is REAL: the by-ACTIONS reader at the same limit returns none of this pack's rows, so ruling 214 (1)'s choice of reader is what 8.214.1 measures — not a difference that does not exist",
    byActions.entries.length === 50 && ourRowsInWindow === 0, j({ window: byActions.entries.length, ourRowsInWindow, truncated: byActions.truncated }));
  ok("8.214.1c · …and the artifact is still read off the prepare row (the swap changed the reader, not what a pack carries)",
    crowded.artifact?.sha256 === "a".repeat(64) && crowded.artifact?.reference === "REF-CROWD" && crowded.periodLabel === "January 2031",
    j(crowded.artifact));

  /* ── 8.214.2 · a TRUNCATED history refuses every transition, and refuses BEFORE it ───────────────── */
  const CUT = "2031-02";
  for (let i = 0; i < 51; i++) await packRow(CUT, "pack.prepared", OFFICER_A, { period: CUT, attempt: i });
  await AUD.auditFlush();
  const cut = await RP.getReportPack(CUT);
  ok("8.214.2 · ⛔ a pack whose own history hit the read limit reports historyIncomplete — it does NOT throw, because the card renders above both tabs of /admin/reports and a throw takes the whole page down",
    cut.historyIncomplete === true && cut.state === "prepared", j({ historyIncomplete: cut.historyIncomplete, state: cut.state }));
  const rowsBefore = await historyRows(CUT);
  const refusal = await RP.readPackForTransition(CUT);
  const rowsAfter = await historyRows(CUT);
  const afterState = await RP.getReportPack(CUT);
  ok("8.214.3 · ⛔ every pack transition refuses it: readPackForTransition — the ONLY door all four maker-checker actions read their pack through — returns ok:false with the danger line",
    refusal.ok === false && typeof refusal.error === "string" && refusal.error.startsWith(RP.PACK_HISTORY_INCOMPLETE_LINE),
    j(refusal));
  ok("8.214.4 · ⛔ …and the OTHER half: nothing was written. The pack's transition rows and its derived state are identical after the refusal — a refusal that arrives after the append puts the signature on the immutable chain and tells the officer they were blocked",
    rowsAfter === rowsBefore && afterState.state === cut.state && afterState.preparedAt === cut.preparedAt && afterState.historyIncomplete === true,
    j({ rowsBefore, rowsAfter, before: cut.state, after: afterState.state }));
  const clean = await RP.readPackForTransition(CROWD);
  ok("8.214.5 · CONTROL · the refusal is not unconditional: the untruncated pack of 8.214.1 passes the same door and hands back its pack",
    clean.ok === true && clean.pack?.state === "approved" && clean.pack?.historyIncomplete === false, j({ ok: clean.ok, state: clean.pack?.state }));

  /* ── 8.214.6 · the RG engagement's copy and its truncation sentence ──────────────────────────────── */
  const rgSection = (r: Any) => (r.sections ?? []).find((s: Any) => s.title === "Self-exclusion & cool-off events");
  const rgPlain = await CAT.buildRgEngagement("usr_r8_generator");
  ok("8.214.6 · the RG engagement names the audit LOG, not the ring — in the section description and in the note (the ring is per-container and empties on every deploy; the note claimed those activations were written to it and shown above)",
    rgSection(rgPlain)?.description === "Activations recorded in the compliance audit log (most recent first)."
    && (rgPlain.notes ?? []).some((n: string) => n === "Limit changes, self-exclusions, and cool-offs are written to the COMPLIANCE audit log and shown above."),
    j({ description: rgSection(rgPlain)?.description, notes: rgPlain.notes }));
  ok("8.214.7 · …and RG_AUDIT_ACTIONS is the closed list the reader is given (six written actions; the read-only rg.reality_check.continued is not one of them — L30)",
    Array.isArray(CAT.RG_AUDIT_ACTIONS) && CAT.RG_AUDIT_ACTIONS.length === 6 && !CAT.RG_AUDIT_ACTIONS.includes("rg.reality_check.continued"),
    j(CAT.RG_AUDIT_ACTIONS));

  /* ── 8.216 · POSTGRES ONLY · the ring emptied, which is the state every deploy produces ──────────── */
  if (STORE !== "postgres") {
    ok("8.216.store · the ring-emptied proofs are the Postgres half (here the durable readers fall back to the ring, audit.ts:633-637, so emptying it would measure the fallback and not the table)", true, "memory child");
    return;
  }

  const RING = "2031-03";
  await packRow(RING, "pack.prepared", OFFICER_A, { period: RING, sha256: "b".repeat(64), sizeBytes: 34, filename: `GB-${RING}.pdf`, reference: "REF-RING" });
  await packRow(RING, "pack.approved", OFFICER_B);
  for (let i = 0; i < 201; i++) {
    await AUD.audit({
      category: "COMPLIANCE", action: CAT.RG_AUDIT_ACTIONS[i % CAT.RG_AUDIT_ACTIONS.length],
      actorId: `usr_r8_rg_${i}`, targetType: "User", targetId: `usr_r8_rg_${i}`, payload: { n: i },
    });
  }
  await AUD.auditFlush();

  // ⛔ THE RING IS EMPTIED IN PLACE, not reassigned: `audit.ts` binds `ring` to this array once at import,
  // so a fresh array on globalThis would leave the module reading the old one and prove nothing.
  const ringBefore = AUD.auditRingSize();
  (globalThis as Any).__50PICK_AUDIT_RING.length = 0;
  ok("8.216.0 · the ring really was full and is now empty — this is the state a deploy produces, and hydrate never refills a process that has already hydrated",
    ringBefore > 200 && AUD.auditRingSize() === 0, `${ringBefore} → ${AUD.auditRingSize()}`);

  const fromTable = await RP.getReportPack(RING);
  ok("8.216.1 · ⛔ with the ring EMPTY the pack still reads approved, with the preparing officer and the artifact — the durable read is the source, and R8's swap is what makes the state survive a deploy",
    fromTable.state === "approved" && fromTable.preparedBy === OFFICER_A && fromTable.approvedBy === OFFICER_B
    && fromTable.historyIncomplete === false && fromTable.artifact?.sha256 === "b".repeat(64),
    j({ state: fromTable.state, preparedBy: fromTable.preparedBy, historyIncomplete: fromTable.historyIncomplete, sha: fromTable.artifact?.sha256 }));
  const ringRows = AUD.getAuditPage({ category: "ADMIN", limit: 10000 }).filter((e: Any) => e.targetId === RP.packIdFor(RING));
  ok("8.216.2 · ⛔ CONTROL · THE DISCRIMINATOR IS LIVE: in this same process the RING reader now returns NONE of those pack rows. Without this, 8.216.1 would pass whether or not the ring was emptied and whether or not the swap was ever made",
    ringRows.length === 0 && AUD.getAuditPage({ limit: 10000 }).filter((e: Any) => e.action.startsWith("pack.")).length === 0,
    `ring rows for this pack: ${ringRows.length} · pack rows anywhere in the ring: ${AUD.getAuditPage({ limit: 10000 }).filter((e: Any) => e.action.startsWith("pack.")).length}`);

  const rgTrunc = await CAT.buildRgEngagement("usr_r8_generator");
  const sec = rgSection(rgTrunc);
  ok("8.216.3 · ⛔ with the ring EMPTY the RG engagement still tabulates 200 activations off the table, and SAYS it is capped — a section that silently stops at its limit reads as a complete one, on the document a regulator asks for",
    sec?.rows?.length === 200 && /^Activations recorded in the compliance audit log \(most recent first\)\. Showing the most recent 200 of 20\d\.$/.test(sec?.description ?? ""),
    j({ rows: sec?.rows?.length, description: sec?.description }));
  ok("8.216.4 · ⛔ CONTROL · the RG discriminator is live too: the ring reader returns none of those 201 rg.* rows in this process",
    AUD.getAuditPage({ category: "COMPLIANCE", limit: 10000 }).filter((e: Any) => e.action.startsWith("rg.")).length === 0,
    `${AUD.getAuditPage({ category: "COMPLIANCE", limit: 10000 }).length} COMPLIANCE rows in the ring`);
  ok("8.216.5 · …and the rows it printed are real rg.* activations with masked players, newest first",
    (sec?.rows ?? []).every((r: Any) => typeof r.event === "string" && r.event.length > 0 && typeof r.player === "string" && !r.player.startsWith("usr_")),
    j((sec?.rows ?? []).slice(0, 2)));

  /* ── 8.214.8 · the read that FAILS, which the swap itself created ────────────────────────────── */
  // ⛔ `getAuditPage` was a synchronous array filter and could not fail. A TABLE read can — a lost
  // connection, a migration in flight — so the swap introduced a throw on the path of a page that
  // renders above both tabs and of four server actions. The table is RENAMED to produce a real
  // failure (the technique engine 10.10 already uses), never a stubbed reader, because a stub proves
  // the stub. It is renamed back in `finally`, and 8.214.9 is the control that it really came back.
  const P: Any = await import("../../src/lib/server/prisma.ts");
  let broke: Any = null;
  try {
    await P.prisma().$executeRawUnsafe('ALTER TABLE "AuditLog" RENAME TO "AuditLog_c56"');
    broke = await RP.readPackForTransition(CROWD).catch((e: Any) => ({ threw: String(e?.message ?? e) }));
  } finally {
    await P.prisma().$executeRawUnsafe('ALTER TABLE "AuditLog_c56" RENAME TO "AuditLog"').catch(() => {});
  }
  ok("8.214.8 · ⛔ a pack history that could not be read AT ALL is a REFUSAL, not an exception: the transition returns ok:false with the danger line, so an officer reads a sentence instead of a stack and no transition can depend on where a throw landed",
    broke?.threw === undefined && broke?.ok === false && String(broke?.error ?? "").startsWith(RP.PACK_HISTORY_INCOMPLETE_LINE),
    j(broke));
  const backAgain = await RP.readPackForTransition(CROWD);
  ok("8.214.9 · CONTROL · the table really was gone and really is back: the same pack that refused a moment ago now passes the same door with its state intact, so 8.214.8 measured a failed read and not a permanent refusal",
    backAgain.ok === true && backAgain.pack?.state === "approved", j({ ok: backAgain.ok, state: backAgain.pack?.state }));
});

/* ═══ both stores · the store this child really runs on ══════════════════════════════════════════════ */
section("store · the child runs on the store it names");
await guard("store", async () => {
  const P: Any = await import("../../src/lib/server/prisma.ts");
  ok(`store.1 · the ${STORE} child ${STORE === "postgres" ? "has" : "has no"} database`, P.hasDatabase() === (STORE === "postgres"), `hasDatabase=${P.hasDatabase()}`);
});

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
