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
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { decomment } from "./decomment.mts";
import { extendHouseWords, houseHits, HOUSE_WORD_SAMPLES, HOUSE_IDENTIFIER_SAMPLES, HOUSE_ID_SAMPLES } from "./house-bot-vocabulary.mjs";

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
 * `origin/main` measurement, with the first client slot (192). A consumer that declares one is re-declaring vocabulary
 * ahead of that gate, so the pin probes with them too.
 */
export const PROPOSED_WORD_SAMPLES = ["house stake", "house stakes", "dau la nyumba", "平台投注", "staff-chosen", "staff chosen", "staff edge", "enter now", "scorecard", "STAFF_EDGE"] as const;

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
    ok("0.175.c7 · CONTROL · a consumer that declares a PROPOSED word (dau la nyumba, house stake) before the measurement gate is reported", c7.own.length === 1, j(c7.own));
    const c8a = plant("scripts/house-bot-holder-view-shots.mts", "const W = /liquidity|\\w+/;");
    const c8b = plant("scripts/house-bot-holder-view-shots.mts", "const W = /liquidity|\\w+_\\w+/;");
    ok("0.175.c8 · CONTROL · a word list padded with a generic alternative (liquidity|\\w+, liquidity|\\w+_\\w+) is still reported", c8a.own.length === 1 && c8b.own.length === 1, j({ a: c8a.own, b: c8b.own }));
    const c9 = broaderLists("scripts/lib/house-bot-money-cases.mts", money.replace(extendSite, "/houseStake|LIQUIDITY_LINE|house|nyumba|50pick/i"));
    ok("0.175.c9 · CONTROL · a broader list that DROPPED the shared words but kept house and nyumba is reported as its own word list", c9.ownWordLists.length === 1, j(c9));
    const moved = VOCABULARY_PATTERN_ALLOWLIST["scripts/house-bot-disclosure.test.mts"][0];
    const c10 = plant("scripts/verify-house-bot-bundle.mjs", `const P = ${moved};`);
    ok("0.175.c10 · CONTROL · an allowlisted pattern planted in ANOTHER consumer is reported (the allowlist is per file)", !!disclosure && c10.own.length === 1, j(c10.own));
  });
}

/* ═══ §0 · C5 step 3 · rulings 179, 180, 183, 186 · the readers' import law, the scorecard's bodies, the fee's one home ═══ */

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

export const HOUSE_SERVER_DIR = "src/lib/server/house-bot/";
export const EXPOSURE_MODULE = "src/lib/server/house-bot/exposure";
/** Modules the book, oversight and the staff-edge duty may never import (I2, ruling 180). */
const NEVER_FROM_BOOK = (resolved: string) => resolved.startsWith("src/lib/server/reports/") || resolved === EXPOSURE_MODULE || resolved === "src/lib/server/house-bot/dsar";
/** What `exposure.ts` may value-import, by module: the book store, the id limit, and the one requester rule. */
export const EXPOSURE_VALUE_IMPORTS: Readonly<Record<string, readonly string[]>> = {
  "src/lib/server/house-bot-dal": ["houseBookStore", "HOUSE_STAKE_MAX_IDS"],
  "src/lib/house-bot/stake-snapshot": ["foldRequestedBy", "requesterOf"],
};

/** The I2 import law over `{rel, code}` files (decommented). */
export function exposureImportProblems(files: Array<{ rel: string; code: string }>): string[] {
  const problems: string[] = [];
  for (const { rel, code } of files) {
    const imports = importSpecifiers(rel, code);
    if (rel.startsWith(HOUSE_SERVER_DIR) && `${rel.replace(/\.ts$/, "")}` !== EXPOSURE_MODULE) {
      for (const i of imports) if (resolveSpec(rel, i.spec) === EXPOSURE_MODULE) problems.push(`${rel} imports exposure.ts (${i.spec})`);
    }
    if (["book.ts", "oversight.ts", "staff-edge.ts"].some((f) => rel === `${HOUSE_SERVER_DIR}${f}`)) {
      for (const i of imports) if (NEVER_FROM_BOOK(resolveSpec(rel, i.spec))) problems.push(`${rel} imports ${i.spec} (a report builder, exposure or dsar)`);
    }
    if (`${rel.replace(/\.ts$/, "")}` === EXPOSURE_MODULE) {
      for (const i of imports) {
        if (i.typeOnly) continue;
        const allowed = EXPOSURE_VALUE_IMPORTS[resolveSpec(rel, i.spec)];
        const bad = allowed ? i.names.filter((n) => !allowed.includes(n)) : i.names;
        if (bad.length) problems.push(`exposure.ts value-imports ${bad.join(", ")} from ${i.spec}`);
      }
      for (const m of code.matchAll(/\b(\w+Store)\b/g)) if (m[1] !== "houseBookStore") problems.push(`exposure.ts reads ${m[1]}`);
    }
  }
  return problems;
}

/** The named function (declaration, const arrow or function, or method) a node sits in — the outermost NAMED one it reaches first. */
function namedFunctionOf(n: ts.Node): string | null {
  for (let p: ts.Node | undefined = n.parent; p; p = p.parent) {
    if ((ts.isFunctionDeclaration(p) || ts.isMethodDeclaration(p)) && p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name))) return p.name.text;
    if ((ts.isArrowFunction(p) || ts.isFunctionExpression(p)) && p.parent && ts.isVariableDeclaration(p.parent) && ts.isIdentifier(p.parent.name)) return p.parent.name.text;
  }
  return null;
}
/** Every call in a file: its callee text and the named function it sits in. */
export function callsIn(file: string, code: string): Array<{ callee: string; fn: string | null }> {
  const out: Array<{ callee: string; fn: string | null }> = [];
  walkTree(parse(file, code), (n) => {
    if (ts.isCallExpression(n)) out.push({ callee: n.expression.getText().replace(/\s+/g, ""), fn: namedFunctionOf(n) });
  });
  return out;
}
const calls = (callee: string, name: string) => callee === name || callee.endsWith(`.${name}`);

/** The scorecard's functions, by name (strings, never a pattern: the vocabulary pin, ruling 175). */
export const SCORECARD_FUNCTIONS = ["houseStaffScorecard", "staffEdgePass", "staffEdgeVerdict"] as const;
/** Readers the scorecard's consumers may never read around it (ruling 180). */
export const SCORECARD_FORBIDDEN_READS = ["staffChosenPlacedSince", "placedInWindow", "staffChosenPlaced", "staffChosenPlacedToday", "listFeed"] as const;
/**
 * The scorecard body pin over `{rel, code}` files (decommented): `houseStaffScorecard` folds only `houseBookStore.entryRows`;
 * `staffEdgePass` calls `houseStaffScorecard` and `staffEdgeVerdict`; and every function that calls `houseStaffScorecard`
 * (R1 section (f)'s builder among them, whatever its name) reads no `houseBookStore` member and none of the forbidden readers.
 */
export function scorecardBodyProblems(files: Array<{ rel: string; code: string }>): { problems: string[]; bodies: Record<string, number> } {
  const problems: string[] = [];
  const bodies: Record<string, number> = { houseStaffScorecard: 0, staffEdgePass: 0, scorecardReaders: 0 };
  const forbidden = (callee: string) => /\bhouseBookStore\.\w+$/.test(callee) || SCORECARD_FORBIDDEN_READS.some((r) => calls(callee, r));
  for (const { rel, code } of files) {
    if (!SCORECARD_FUNCTIONS.some((name) => code.includes(name))) continue;
    const all = callsIn(rel, code);
    const byFn = new Map<string, string[]>();
    for (const c of all) if (c.fn) byFn.set(c.fn, [...(byFn.get(c.fn) ?? []), c.callee]);
    walkTree(parse(rel, code), (n) => {
      const name = (ts.isFunctionDeclaration(n) || ts.isMethodDeclaration(n)) && n.name && ts.isIdentifier(n.name) ? n.name.text
        : ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && n.initializer && (ts.isArrowFunction(n.initializer) || ts.isFunctionExpression(n.initializer)) ? n.name.text : null;
      if (name === "houseStaffScorecard") bodies.houseStaffScorecard++;
      if (name === "staffEdgePass") bodies.staffEdgePass++;
    });
    for (const [fn, callees] of byFn) {
      if (fn === "houseStaffScorecard") {
        if (!callees.some((c) => /\bhouseBookStore\.entryRows$/.test(c))) problems.push(`${rel}: houseStaffScorecard does not fold houseBookStore.entryRows`);
        for (const c of callees) if (forbidden(c) && !/\bhouseBookStore\.entryRows$/.test(c)) problems.push(`${rel}: houseStaffScorecard calls ${c}`);
        continue;
      }
      const readsCard = callees.some((c) => calls(c, "houseStaffScorecard"));
      if (fn === "staffEdgePass") {
        if (!readsCard) problems.push(`${rel}: staffEdgePass does not call houseStaffScorecard`);
        if (!callees.some((c) => calls(c, "staffEdgeVerdict"))) problems.push(`${rel}: staffEdgePass does not call staffEdgeVerdict`);
      }
      if (readsCard || fn === "staffEdgePass") {
        bodies.scorecardReaders++;
        for (const c of callees) if (forbidden(c)) problems.push(`${rel}: ${fn} reads ${c} beside the scorecard`);
      }
    }
  }
  return { problems, bodies };
}

/**
 * PLAN I10 for the scorecard (ruling 180): no REFUSAL branch reads the scorecard or the verdict. A refusal branch is a
 * condition (if, ternary, while, switch, `&&`/`||`) whose governed code returns `ok: false` or refuses; a `return` of an
 * object with `ok: false` that names them is one too. Names tracked: the two functions and every variable bound from a call.
 */
export function scorecardRefusalProblems(file: string, code: string): string[] {
  const producers = ["houseStaffScorecard", "staffEdgeVerdict"];
  if (!producers.some((name) => code.includes(name))) return [];
  const sf = parse(file, code);
  const tracked = new Set(producers);
  const callsProducer = (node: ts.Node) => {
    let found = false;
    walkTree(sf, (m) => { if (!found && ts.isCallExpression(m) && m.pos >= node.pos && m.end <= node.end && producers.some((p) => calls(m.expression.getText(sf), p))) found = true; });
    return found;
  };
  walkTree(sf, (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && callsProducer(n.initializer)) {
      if (ts.isIdentifier(n.name)) tracked.add(n.name.text);
      else walkTree(sf, (m) => { if (m.parent && (ts.isBindingElement(m.parent) && m.parent.name === m) && ts.isIdentifier(m) && m.pos >= n.name.pos && m.end <= n.name.end) tracked.add(m.text); });
    }
  });
  const names = new RegExp(`\\b(${[...tracked].join("|")})\\b`);
  const refuses = (t: string) => /\bok\s*:\s*false\b|\brefus/i.test(t);
  const problems: string[] = [];
  walkTree(sf, (n) => {
    let condition: ts.Node | null = null;
    let governed: string[] = [];
    if (ts.isIfStatement(n)) { condition = n.expression; governed = [n.thenStatement.getText(sf), n.elseStatement?.getText(sf) ?? ""]; }
    else if (ts.isConditionalExpression(n)) { condition = n.condition; governed = [n.whenTrue.getText(sf), n.whenFalse.getText(sf)]; }
    else if (ts.isWhileStatement(n)) { condition = n.expression; governed = [n.statement.getText(sf)]; }
    else if (ts.isSwitchStatement(n)) { condition = n.expression; governed = [n.caseBlock.getText(sf)]; }
    else if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(n.operatorToken.kind)) { condition = n.left; governed = [n.right.getText(sf)]; }
    if (condition && names.test(condition.getText(sf)) && governed.some(refuses)) problems.push(`${file}: a refusal branch reads ${condition.getText(sf).slice(0, 80)}`);
    if (ts.isReturnStatement(n) && n.expression && refuses(n.expression.getText(sf)) && names.test(n.expression.getText(sf)) && !ts.isConditionalExpression(n.expression)) {
      problems.push(`${file}: a refusal returns ${n.expression.getText(sf).slice(0, 80)}`);
    }
  });
  return problems;
}

/** Files and book functions that must never touch a fee input (ruling 183). */
export const FEE_FREE_FILES = ["seam.ts", "cap-precheck.ts", "enter-now.ts", "eligibility.ts", "planner.ts", "oversight.ts"].map((f) => `${HOUSE_SERVER_DIR}${f}`);
export const FEE_FREE_BOOK_FUNCTIONS = ["houseDayBook", "houseDayBooks", "houseOpenExposure", "foldDayBook"] as const;
const FEE_CALLS = ["allocateFeeShares", "poolFee", "feeInputs", "derivedFeeShares", "winnersForAllocation"];

/** The fee's one home over `{rel, code}` files (decommented). */
export function feeHomeProblems(files: Array<{ rel: string; code: string }>): string[] {
  const problems: string[] = [];
  let settleCalls = 0, bookCalls = 0;
  for (const { rel, code } of files) {
    if (rel === "src/lib/payout.ts" || rel === "src/lib/server/market-config.ts") {
      if (code.split(/\W+/).includes("houseBotId")) problems.push(`FS-29: ${rel} names houseBotId`);
    }
    if (!FEE_CALLS.some((f) => code.includes(f))) continue;
    for (const c of callsIn(rel, code)) {
      const isBook = rel === `${HOUSE_SERVER_DIR}book.ts`;
      if (calls(c.callee, "allocateFeeShares")) {
        if (rel === "src/lib/server/market-service.ts" && c.fn === "settleMarket") settleCalls++;
        else if (isBook && c.fn === "derivedFeeShares") bookCalls++;
        else if (rel !== "src/lib/payout.ts") problems.push(`${rel}: ${c.fn ?? "(top level)"} calls allocateFeeShares`);
      }
      if (calls(c.callee, "feeInputs") && !(isBook && c.fn === "houseBotBook")) problems.push(`${rel}: ${c.fn ?? "(top level)"} reads feeInputs`);
      if (c.callee === "derivedFeeShares" && !(isBook && c.fn === "houseBotBook")) problems.push(`${rel}: ${c.fn ?? "(top level)"} calls derivedFeeShares`);
      if ((FEE_FREE_FILES.includes(rel) || (isBook && (FEE_FREE_BOOK_FUNCTIONS as readonly string[]).includes(c.fn ?? ""))) && FEE_CALLS.some((f) => calls(c.callee, f))) {
        problems.push(`${rel}: ${c.fn ?? "(top level)"} calls ${c.callee} (fee-free)`);
      }
    }
  }
  if (settleCalls === 0) problems.push("settleMarket no longer calls allocateFeeShares");
  if (bookCalls === 0) problems.push("book.ts no longer derives the fee through allocateFeeShares");
  return problems;
}

export const ATTEST_MODULE = "src/lib/server/reports/attest.ts";
/** `attest.ts` is a leaf: it value-imports nothing from the reports folder (types excepted) — no builder, no catalogue. */
export function attestImportProblems(code: string): string[] {
  return importSpecifiers(ATTEST_MODULE, code)
    .filter((i) => !i.typeOnly && resolveSpec(ATTEST_MODULE, i.spec).startsWith("src/lib/server/reports/"))
    .map((i) => `attest.ts imports ${i.spec}`);
}

if (STORE === "memory") {
  section("§0 · C5 step 3 · rulings 179–186 · exposure's import law, the scorecard's bodies, the fee's home, the shared homes");
  await guard("0.step3", async () => {
    const files = srcFiles().map((rel) => ({ rel, code: decomment(read(rel)) }));
    const houseModules = files.filter((f) => f.rel.startsWith(HOUSE_SERVER_DIR));

    // ── I2 · exposure.ts ──
    const i2 = exposureImportProblems(files);
    ok("0.179.0 · the population is real: every module under server/house-bot/ is read (exposure.ts, book.ts and oversight.ts among them)",
      houseModules.length >= 35 && ["exposure.ts", "book.ts", "oversight.ts"].every((n) => houseModules.some((f) => f.rel.endsWith(`/${n}`))), `${houseModules.length} modules`);
    ok("0.179.1 · ⛔ I2 · no module under server/house-bot/ imports exposure.ts; book.ts and oversight.ts import no report builder, exposure or dsar; exposure.ts reads only houseBookStore",
      i2.length === 0, i2.join(" · "));
    const withFile = (rel: string, code: string) => files.map((f) => (f.rel === rel ? { rel, code } : f));
    const oversight = files.find((f) => f.rel.endsWith("house-bot/oversight.ts"))!.code;
    const c1 = exposureImportProblems(withFile(`${HOUSE_SERVER_DIR}oversight.ts`, `import { houseStakeByMarket } from "./exposure";\n${oversight}`));
    const c2 = exposureImportProblems(withFile(`${HOUSE_SERVER_DIR}planner.ts`, `export async function p() { const E = await import("@/lib/server/house-bot/exposure"); return E; }`));
    const c3 = exposureImportProblems(withFile(`${HOUSE_SERVER_DIR}book.ts`, `import { buildHouseLiquidity } from "../reports/house-liquidity";\nexport const x = buildHouseLiquidity;`));
    const c4 = exposureImportProblems(withFile(EXPOSURE_MODULE + ".ts", `import { houseBookStore, houseBotIntentStore } from "../house-bot-dal";\nexport const f = () => houseBotIntentStore.listFeed;`));
    ok("0.179.c1 · CONTROL · a planted static import in oversight.ts, a dynamic one in planner.ts, a builder import in book.ts and a second store in exposure.ts are each reported",
      c1.length === 2 && c2.length === 1 && c3.length === 1 && c4.length >= 2, j({ c1, c2, c3, c4 }));
    const benign = exposureImportProblems(withFile(`${HOUSE_SERVER_DIR}oversight.ts`, `${oversight}\nconst note = "see exposure.ts";`));
    ok("0.179.c2 · CONTROL · a string naming exposure.ts is not an import", benign.length === 0, j(benign));

    // ── ruling 180 · the scorecard's bodies and PLAN I10 ──
    const sc = scorecardBodyProblems(files);
    ok("0.180.0 · the population is real: houseStaffScorecard's body is found exactly once (staffEdgePass and R1's section (f) join when they are built)",
      sc.bodies.houseStaffScorecard === 1, j(sc.bodies));
    ok("0.180.1 · ⛔ houseStaffScorecard folds only houseBookStore.entryRows; every scorecard reader reads nothing beside it", sc.problems.length === 0, sc.problems.join(" · "));
    const book = files.find((f) => f.rel === `${HOUSE_SERVER_DIR}book.ts`)!;
    const plantedBody = book.code.replace("const rows = await houseBookStore.entryRows({ ...window, houseBotId: null });",
      "const rows = await houseBookStore.entryRows({ ...window, houseBotId: null });\n  await houseBotIntentStore.placedInWindow(window);");
    const commented = `${book.code}\n// houseStaffScorecard never calls placedInWindow`;
    const passBody = `export async function staffEdgePass() { const card = await houseStaffScorecard({ monthKey: "2026-09" }); const rows = await houseBookStore.dayRows(w); return staffEdgeVerdict(card.officers[0], card.baseline, t) && rows; }`;
    const builder = `export async function sectionF() { const card = await houseStaffScorecard({ monthKey: m }); const feed = await houseBotIntentStore.listFeed(f); return [card, feed]; }`;
    const passNoVerdict = `export async function staffEdgePass() { return houseStaffScorecard({ monthKey: "2026-09" }); }`;
    ok("0.180.c1 · CONTROL · a scorecard body that also reads placedInWindow is reported; the same words in a comment are not",
      plantedBody !== book.code && scorecardBodyProblems([{ rel: book.rel, code: plantedBody }]).problems.length === 1
        && scorecardBodyProblems([{ rel: book.rel, code: decomment(commented) }]).problems.length === 0, j(scorecardBodyProblems([{ rel: book.rel, code: plantedBody }])));
    ok("0.180.c2 · CONTROL · staffEdgePass reading dayRows beside the scorecard, a builder reading listFeed beside it, and a pass with no verdict are each reported",
      scorecardBodyProblems([{ rel: "src/lib/server/house-bot/staff-edge.ts", code: passBody }]).problems.length === 1
        && scorecardBodyProblems([{ rel: "src/lib/server/reports/house-liquidity.ts", code: builder }]).problems.length === 1
        && scorecardBodyProblems([{ rel: "src/lib/server/house-bot/staff-edge.ts", code: passNoVerdict }]).problems.length === 1);
    const refusals = files.flatMap((f) => scorecardRefusalProblems(f.rel, f.code));
    ok("0.180.2 · ⛔ PLAN I10 · no refusal branch anywhere reads the scorecard or the verdict", refusals.length === 0, refusals.join(" · "));
    const r1 = scorecardRefusalProblems("src/planted.ts", `export async function enterNow(me: string) { const card = await houseStaffScorecard({ monthKey: m }); if (card.officers.some((o) => o.officerId === me)) return { ok: false, code: "SELF" }; return { ok: true }; }`);
    const r2 = scorecardRefusalProblems("src/planted.ts", `export function gate(o, b, t) { return staffEdgeVerdict(o, b, t).fires ? { ok: false, code: "EDGE" } : { ok: true }; }`);
    const r3 = scorecardRefusalProblems("src/planted.ts", `export async function pass(alerts) { const v = staffEdgeVerdict(o, b, t); if (v.fires) await alerts.once(key, msg); return { ok: true }; }`);
    ok("0.180.c3 · CONTROL · a refusal on the scorecard and a refusing ternary on the verdict are reported; an alert on the verdict is not",
      r1.length === 1 && r2.length >= 1 && r3.length === 0, j({ r1, r2, r3 }));

    // ── ruling 183 · FS-29 and the fee's one home ──
    const fee = feeHomeProblems(files);
    ok("0.183.1 · ⛔ FS-29: payout.ts and market-config.ts never name houseBotId; settleMarket and book.ts both split the fee with allocateFeeShares; only houseBotBook reads feeInputs and reports the fee; the gates, the seam, cap-precheck, Enter now, eligibility, the planner and oversight never touch it",
      fee.length === 0, fee.join(" · "));
    const settle = files.find((f) => f.rel === "src/lib/server/market-service.ts")!;
    const noSettle = settle.code.split("allocateFeeShares(").join("otherSplit(");
    const plantedDay = book.code.replace("export async function houseDayBook(dayKey: string, houseBotId: string | null, tx?: HouseTx): Promise<HouseDayBook> {",
      "export async function houseDayBook(dayKey: string, houseBotId: string | null, tx?: HouseTx): Promise<HouseDayBook> {\n  derivedFeeShares(await houseBookStore.feeInputs(dayWindowIso(dayKey)));");
    ok("0.183.c1 · CONTROL · a settlement that stops calling allocateFeeShares, a gate book that derives the fee, a planner reading feeInputs and a houseBotId in payout.ts are each reported",
      noSettle !== settle.code && feeHomeProblems(withFile(settle.rel, noSettle)).some((p) => p.startsWith("settleMarket"))
        && plantedDay !== book.code && feeHomeProblems(withFile(book.rel, plantedDay)).length >= 2
        && feeHomeProblems(withFile(`${HOUSE_SERVER_DIR}planner.ts`, `export async function p() { return houseBookStore.feeInputs(w); }`)).length >= 1
        && feeHomeProblems(withFile("src/lib/payout.ts", `${files.find((f) => f.rel === "src/lib/payout.ts")!.code}\nexport const x = (p: { houseBotId: string }) => p;`)).some((p) => p.startsWith("FS-29")));

    // ── ruling 186 · the shared homes ──
    const attest = files.find((f) => f.rel === ATTEST_MODULE);
    ok("0.186.1 · attest.ts exists, holds the three moved helpers, and is a leaf: no builder, no catalogue",
      !!attest && ["regulatorSignatures", "makeReference", "maskUserId"].every((n) => new RegExp(`export (async )?function ${n}\\(`).test(attest.code)) && attestImportProblems(attest.code).length === 0,
      j(attest ? attestImportProblems(attest.code) : "missing"));
    const catalogue = files.find((f) => f.rel === "src/lib/server/reports/catalogue.ts")!;
    ok("0.186.2 · catalogue.ts no longer defines them (one home) and imports them from attest",
      !/function (regulatorSignatures|makeReference)\(|const maskUserId\s*=/.test(catalogue.code) && /from "\.\/attest"/.test(catalogue.code));
    ok("0.186.c1 · CONTROL · a planted catalogue import in attest.ts is reported", attestImportProblems(`import { buildGbtMonthly } from "./catalogue";\nimport type { Report } from "./types";\nexport const x = buildGbtMonthly;`).length === 1);
    const tone = decomment(read("src/lib/status-tone.ts"));
    const toneHouse = (code: string) => code.toUpperCase().split("_").join("").includes("HOUSEBOT") || houseHits(code).length > 0;
    ok("0.186.3 · ⛔ status-tone.ts (value-imported by client components) holds no house-bot tone or word", tone.length > 1_000 && !toneHouse(tone));
    ok("0.186.c2 · CONTROL · a planted HOUSE_BOT_ACTIVE tone is reported", toneHouse(`${tone}\nexport const X = { HOUSE_BOT_ACTIVE: { admin: "green" } };`));
    const route = files.find((f) => f.rel === "src/app/api/admin/transactions/export/route.ts")!;
    const ownEscaper = (code: string) => /function cell\(/.test(code) || /\/\^\[=\+/.test(code);
    ok("0.186.4 · the transactions CSV route defines no escaper of its own and takes the shared cell module",
      !ownEscaper(route.code) && /from "@\/lib\/server\/csv-cell"/.test(route.code), route.code.slice(0, 0));
    ok("0.186.c3 · CONTROL · the route's old inline escaper is reported",
      ownEscaper(`function cell(v: string | number | null | undefined): string {\n  const s = v == null ? "" : String(v);\n  const safe = /^[=+\\-@\\t\\r]/.test(s) ? \`'\${s}\` : s;\n  return s;\n}`));
    const { csvCell }: Any = await import("../../src/lib/server/csv-cell.ts");
    const CELLS: Array<[unknown, string]> = [
      ["=1+1", `"'=1+1"`], ["+cmd", `"'+cmd"`], ["-2", `"'-2"`], ["@SUM(A1)", `"'@SUM(A1)"`], ["\tx", `"'\tx"`], ["\rx", `"'\rx"`],
      ['a"b', `"a""b"`], [null, `""`], [undefined, `""`], [5000, `"5000"`], ["x=1", `"x=1"`],
    ];
    const wrong = CELLS.filter(([v, want]) => csvCell(v) !== want);
    ok("0.186.5 · the shared cell: a leading = + - @ tab or CR becomes text; quotes double; null is empty; a number is quoted", wrong.length === 0, j(wrong.map(([v]) => [v, csvCell(v)])));
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

/* ═══ §1–§2 · the book's readers and the fee withheld (C5-SPEC rulings 177–183), both stores ═══════════════════ */
// ⭐ THE FIXTURE IS BUILT THROUGH THE REAL SEAM. Every house stake below is an intent claimed and placed by
// `placeHouseBet` (house-bot-world.mts), every result a real `resolveMarket` + `settleMarket` or emergency void. Three
// declared exceptions, each a DRIFT ARTEFACT the book must still count correctly, never a way to reach a number:
//   · placedAt moved to a fixed instant (a fixture of TIME, as `backdate`), AFTER every settlement;
//   · one marked position flipped to CASHED_OUT with a marked CASHOUT row (house cash-out is refused, so only drift makes one);
//   · one marked position written straight into the store with no intent (UNKNOWN: "written outside the bet path").
// Market fee snapshots are rewritten on three polls before their bets (a legacy capped-commission snapshot, tiny loser
// rates, and none at all): what production's older polls carry, which the fee derivation must read, never assume.
const R12: Any = { ready: false };
section("§1 · rulings 177–182 · stakeRows and houseStakeByMarket, entryRows' split and officers, the EAT month, settled statuses, the baseline");
await guard("1", async () => {
  const { loadWorld, OFFICER }: Any = await import("./house-bot-world.mts");
  const w: Any = await loadWorld();
  const msg = (e: unknown) => String((e as Error)?.message ?? e);
  const call = async (fn: Any, ...args: Any[]): Promise<Any> => {
    try { return typeof fn === "function" ? await fn(...args) : { threw: "not built" }; } catch (e) { return { threw: msg(e) }; }
  };
  const load = async (rel: string): Promise<Any> => { try { return await import(rel); } catch { return {}; } };
  const BOOK = await load("../../src/lib/server/house-bot/book.ts");
  const EXP = await load("../../src/lib/server/house-bot/exposure.ts");
  const SS = await load("../../src/lib/house-bot/stake-snapshot.ts");
  const CLOCK = await load("../../src/lib/house-bot/clock.ts");
  const PAY: Any = await import("../../src/lib/payout.ts");
  const book = w.dal.houseBookStore;
  if (!(await w.db.user.findById(OFFICER))) await w.user({ id: OFFICER, role: "ADMIN" });
  const A = await w.user({ role: "ADMIN" }), B = await w.user({ role: "ADMIN" }), C = await w.user({ role: "ADMIN" });
  await w.limits();
  await w.switchOn();

  // ── fixture helpers ──
  const show = (r: Any) => (r?.ok ? "ok" : `${r?.code ?? "?"}/${r?.reason ?? r?.error ?? "no-reason"}`);
  const placeAt = async (positionId: string, iso: string) => {
    if (w.onPostgres) await w.prisma().$executeRawUnsafe(`UPDATE "Position" SET "placedAt" = $1::timestamp WHERE "id" = $2`, iso, positionId);
    else (await w.mdal.positionStore.get(positionId)).placedAt = iso;
  };
  const setSnapshot = async (marketId: string, snapshot: unknown) => {
    if (w.onPostgres) await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "feeSnapshot" = $1::jsonb WHERE "id" = $2`, snapshot == null ? null : JSON.stringify(snapshot), marketId);
    else (await w.mdal.marketStore.get(marketId)).feeSnapshot = snapshot == null ? null : structuredClone(snapshot);
  };
  const snapshotOf = async (marketId: string) => (await w.svc.getMarket(marketId)).feeSnapshot as Record<string, unknown>;
  const playerBet = async (marketId: string, side: "YES" | "NO", stake: number, age = 10_000) => {
    const player = await w.user({ balance: 2_000_000 });
    const r = await w.svc.buyPosition(player, { marketId, side, stake, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`fixture player bet refused: ${show(r)}`);
    if (age > 0) await w.backdate(r.data.positionId, age);
    return { player, positionId: r.data.positionId as string };
  };
  const lockedPoll = async (side: "YES" | "NO", stake: number) => {
    const market = await w.poll({ graceMin: 0 });
    return { market, ...(await playerBet(market.id, side, stake)) };
  };
  const house = async (b: Any, marketId: string, o: Any) => {
    await w.ageHouseMinute();
    const intent = await w.intent(b, marketId, o);
    const r = await w.place(b, intent);
    if (!r.ok) throw new Error(`fixture house stake refused (${o.kind}): ${show(r)}`);
    return { intent, positionId: r.data.positionId as string };
  };
  const manual = (officer: string, side: string, stakeTzs: number) =>
    ({ kind: "MANUAL", entryCondition: "THIN", requestedById: officer, anchorKey: w.constants.manualAnchorKey(officer, crypto.randomUUID()), side, stakeTzs });
  const settle = async (marketId: string, outcome: string) => {
    const r = await w.svc.resolveMarket({ marketId, outcome, officerId: OFFICER });
    const s = await w.svc.settleMarket(marketId, { force: true });
    if (!r.ok || !s.ok) throw new Error(`fixture settlement failed on ${marketId}: ${show(r)} · ${show(s)}`);
  };
  const target = async (b: Any, marketId: string, by: string) => w.dal.targetStore.insert({
    id: w.dal.newHouseId("target"), houseBotId: b.botId, marketId, delayMinSec: 10, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "EVERY",
    createdById: by, snapshot: { titleEn: "House seam poll", category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 },
  });
  const RETURN_TYPES = ["BET_PAYOUT", "BET_REFUND", "CASHOUT"];
  const returnedOf = async (positionId: string) => ((await w.db.txn.listAll()) as Any[])
    .filter((t) => t.positionId === positionId && t.houseBotId != null && t.status === "CONFIRMED" && RETURN_TYPES.includes(t.type))
    .reduce((s, t) => s + Number(t.amount), 0);
  const round = async (label: string) => {
    const cfg: Any = await import("../../src/lib/server/updown-config.ts");
    const uds: Any = await import("../../src/lib/server/updown-service.ts");
    const udd: Any = await import("../../src/lib/server/updown-dal.ts");
    const { seedDefaultSources, addSource }: Any = await import("../../src/lib/server/source-registry.ts");
    await seedDefaultSources();
    await addSource({ domain: "api.twelvedata.com", label: "Twelve Data", category: "crypto", rationale: "test fixture (mirrors production)", addedBy: "system" }).catch(() => null);
    const a = await cfg.createAsset({ key: `R${label}${process.pid}`, symbol: "BTC/USD", nameEn: "Bitcoin", nameSw: "Bitcoin", iconKey: "crypto",
      priceSourceUrl: "https://api.twelvedata.com/quote", category: "crypto", decimals: 2, minMoveTicks: 2 }, OFFICER);
    if (!a.ok) throw new Error(`fixture round asset: ${a.error}`);
    await cfg.setAssetEnabled(a.data.id, true, OFFICER);
    const c = await cfg.createChain({ assetId: a.data.id, durationMinutes: 5 }, OFFICER);
    if (!c.ok) throw new Error(`fixture round chain: ${c.error}`);
    await cfg.setChainState(c.data.id, "RUNNING", OFFICER);
    const chain = await udd.chainStore.get(c.data.id);
    const boundary = new Date(cfg.cleanGridAnchor(Date.now() + 60_000)).toISOString();
    const o = await udd.observationStore.ensure(a.data.id, boundary);
    await udd.observationStore.confirm(o.id, { price: 60_000, sourceUrl: "https://api.twelvedata.com/quote", sourceQuotedAt: boundary,
      evidence: "BTC quoted 60000", confidence: 96, model: "test-stub", rawHash: `hr_${label}_${process.pid}` });
    const opened = await uds.openRound(chain, boundary, o.id, 60_000);
    if (!opened.ok) throw new Error(`fixture round: ${opened.error}`);
    return (await udd.roundStore.get(opened.data.id)).marketId as string;
  };

  // ════ the cohort month MK = 2025-03 (all bots together; nothing else in this file places a stake in it) ════
  const MK = "2025-03";
  const MID = "2025-03-15T09:00:00.000Z";
  const S1 = await w.bot(), S2 = await w.bot(), S3 = await w.bot();
  const F: Array<{ id: string; bot: string; productLine: string; entry: string; officer: string | null; stake: number; intent: Any; targetCreatedById: string | null; at: string }> = [];
  const add = (row: Any) => { F.push(row); return row; };

  // (a) A's Enter now on M1, and (b) a reaction on a target B added and C updated — both YES, both WIN.
  const m1 = await lockedPoll("NO", 20_000);
  const a1 = await house(S1, m1.market.id, manual(A, "YES", 9_000));
  add({ id: a1.positionId, bot: S1.botId, productLine: "MARKET", entry: "MANUAL", officer: A, stake: 9_000, intent: a1.intent, targetCreatedById: null, at: MID });
  const t1 = await target(S1, m1.market.id, B);
  const t1u = await w.dal.targetStore.casUpdate(t1.id, t1.version, { delayMaxSec: 20 }, C);
  const b1 = await house(S1, m1.market.id, { kind: "COUNTER", triggerPositionId: m1.positionId, triggerUserId: m1.player, targetId: t1.id, decision: { reactTo: "EVERY" }, side: "YES", stakeTzs: 6_000 });
  add({ id: b1.positionId, bot: S1.botId, productLine: "MARKET", entry: "TARGETED", officer: B, stake: 6_000, intent: b1.intent, targetCreatedById: B, at: MID });
  // (c) FILL → LOSS; (d) an untargeted COUNTER → VOID (refunded); (e) B's Enter now → LOSS; (f) an OPENER → LOSS.
  const m2 = await lockedPoll("NO", 10_000);
  const c1 = await house(S2, m2.market.id, { kind: "FILL", side: "YES", stakeTzs: 5_000 });
  add({ id: c1.positionId, bot: S2.botId, productLine: "MARKET", entry: "AUTOMATIC", officer: null, stake: 5_000, intent: c1.intent, targetCreatedById: null, at: MID });
  const m3 = await lockedPoll("NO", 10_000);
  const d1 = await house(S2, m3.market.id, { kind: "COUNTER", triggerPositionId: m3.positionId, triggerUserId: m3.player, side: "YES", stakeTzs: 4_000 });
  add({ id: d1.positionId, bot: S2.botId, productLine: "MARKET", entry: "AUTOMATIC", officer: null, stake: 4_000, intent: d1.intent, targetCreatedById: null, at: MID });
  const m4 = await lockedPoll("NO", 5_000);
  const e1 = await house(S3, m4.market.id, manual(B, "YES", 3_000));
  add({ id: e1.positionId, bot: S3.botId, productLine: "MARKET", entry: "MANUAL", officer: B, stake: 3_000, intent: e1.intent, targetCreatedById: null, at: MID });
  const m5 = await w.poll({ graceMin: 0 });
  const f1 = await house(S3, m5.id, { kind: "OPENER", side: "YES", stakeTzs: 2_000 });
  await playerBet(m5.id, "NO", 10_000, 0);
  add({ id: f1.positionId, bot: S3.botId, productLine: "MARKET", entry: "AUTOMATIC", officer: null, stake: 2_000, intent: f1.intent, targetCreatedById: null, at: MID });
  // (g) a FILL left OPEN; (k) a FILL that drift turned CASHED_OUT, with its marked CASHOUT row (amount 900, fee 100).
  const m6 = await lockedPoll("NO", 5_000);
  const g1 = await house(S1, m6.market.id, { kind: "FILL", side: "YES", stakeTzs: 1_000 });
  add({ id: g1.positionId, bot: S1.botId, productLine: "MARKET", entry: "AUTOMATIC", officer: null, stake: 1_000, intent: g1.intent, targetCreatedById: null, at: MID });
  const m13 = await lockedPoll("NO", 5_000);
  const k1 = await house(S1, m13.market.id, { kind: "FILL", side: "YES", stakeTzs: 1_000 });
  add({ id: k1.positionId, bot: S1.botId, productLine: "MARKET", entry: "AUTOMATIC", officer: null, stake: 1_000, intent: k1.intent, targetCreatedById: null, at: MID });
  // (h) an Up & Down FILL (AUTOMATIC, product UPDOWN → never in the baseline) on a round whose fee snapshot is a LEGACY
  // capped-commission one (no feeModel): §2's HB-LC-24 round. A big UP pool makes the ceiling bind.
  const udMarket = await round("s12");
  const legacy = { ...(await snapshotOf(udMarket)) };
  for (const k of ["feeModel", "platformFeeRate", "operatorFeeRate", "stampedAt"]) delete legacy[k];
  Object.assign(legacy, { commissionRate: 0.10, feeCeilingRate: 1 / 3, freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 });
  await setSnapshot(udMarket, legacy);
  await playerBet(udMarket, "YES", 50_000, 60_000);
  const h1 = await house(S2, udMarket, { kind: "FILL", productLine: "UPDOWN", side: "NO", stakeTzs: 2_000 });
  const udOther = await playerBet(udMarket, "NO", 1_000, 0);
  add({ id: h1.positionId, bot: S2.botId, productLine: "UPDOWN", entry: "AUTOMATIC", officer: null, stake: 2_000, intent: h1.intent, targetCreatedById: null, at: MID });
  // (i) C's Enter now stakes on BOTH month boundaries of MK: 23:59:59.999 and 00:00:00.000 EAT at each end.
  const EDGES = [
    { at: "2025-02-28T20:59:59.999Z", month: "2025-02" }, { at: "2025-02-28T21:00:00.000Z", month: MK },
    { at: "2025-03-31T20:59:59.999Z", month: MK }, { at: "2025-03-31T21:00:00.000Z", month: "2025-04" },
  ];
  const edgeRows: Any[] = [];
  for (const e of EDGES) {
    const m = await lockedPoll("NO", 5_000);
    const p = await house(S3, m.market.id, manual(C, "YES", 1_000));
    edgeRows.push({ ...e, id: p.positionId, intent: p.intent });
    if (e.month === MK) add({ id: p.positionId, bot: S3.botId, productLine: "MARKET", entry: "MANUAL", officer: C, stake: 1_000, intent: p.intent, targetCreatedById: null, at: e.at });
  }
  // Ruling 182's own instants, on a bot of their own: 2026-09-30T20:59:59.999Z is September, 21:00:00.000Z is October.
  const SB = await w.bot();
  const sbRows: Any[] = [];
  for (const at of ["2026-09-30T20:59:59.999Z", "2026-09-30T21:00:00.000Z"]) {
    const m = await lockedPoll("NO", 5_000);
    sbRows.push({ at, ...(await house(SB, m.market.id, manual(A, "YES", 1_000))) });
  }

  // ════ stakeRows / houseStakeByMarket fixtures (placed now; no month) — bot T ════
  const T = await w.bot();
  const x1 = await lockedPoll("NO", 20_000);
  const x1a = await house(T, x1.market.id, manual(A, "YES", 9_000));
  const xt = await target(T, x1.market.id, B);
  const x1b = await house(T, x1.market.id, { kind: "COUNTER", triggerPositionId: x1.positionId, triggerUserId: x1.player, targetId: xt.id, decision: { reactTo: "EVERY" }, side: "YES", stakeTzs: 6_000 });
  const x2 = await lockedPoll("NO", 10_000);
  const x2a = await house(T, x2.market.id, { kind: "FILL", side: "YES", stakeTzs: 3_000 });
  const x3 = await lockedPoll("NO", 10_000);
  const x3a = await house(T, x3.market.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
  const x4 = await lockedPoll("NO", 10_000);
  const x4a = await house(T, x4.market.id, { kind: "FILL", side: "YES", stakeTzs: 1_500 });
  const x4b = await house(T, x4.market.id, manual(C, "YES", 1_000));
  void x4b;
  const x5 = await lockedPoll("NO", 5_000);

  // ════ §2's fee fixtures (settled now) ════
  // L1 · a loser-share poll with SIX equal YES winners (the house and five players, 1,000 each) against NO 10,000: the fee
  // splits into raw shares that all tie on the fraction, so largest remainder hands the leftover shillings out by id.
  const F1 = await w.bot(), F3 = await w.bot();
  const l1 = await lockedPoll("NO", 10_000);
  const l1h = await house(F1, l1.market.id, { kind: "FILL", side: "YES", stakeTzs: 1_000 });
  const l1Players: string[] = [];
  for (let n = 0; n < 5; n++) l1Players.push((await playerBet(l1.market.id, "YES", 1_000, 0)).positionId);
  // L2 · a loser-share poll whose own snapshot carries tiny loser rates: fee 2, and the house winner's share is 0 (no ledger line).
  const l2 = await w.poll({ graceMin: 0 });
  await setSnapshot(l2.id, { ...(await snapshotOf(l2.id)), platformFeeRate: 0.001, operatorFeeRate: 0.001 });
  const l2no = await playerBet(l2.id, "NO", 1_000);
  const l2h = await house(F1, l2.id, { kind: "FILL", side: "YES", stakeTzs: 1_000 });
  await playerBet(l2.id, "YES", 9_000, 0);
  // L3 · a market with NO own snapshot (removed after the bets): its house WIN makes F3's fee "not recorded".
  const l3 = await lockedPoll("NO", 5_000);
  const l3h = await house(F3, l3.market.id, { kind: "FILL", side: "YES", stakeTzs: 1_000 });
  await setSnapshot(l3.market.id, null);
  void l2no;

  // ════ results ════
  await settle(m1.market.id, "YES");
  await settle(m2.market.id, "NO");
  await settle(m3.market.id, "VOID");
  await settle(m4.market.id, "NO");
  await settle(m5.id, "NO");
  await settle(udMarket, "NO");
  await settle(l1.market.id, "YES");
  await settle(l2.id, "YES");
  await settle(l3.market.id, "YES");
  // (k) drift: the FILL becomes CASHED_OUT with a marked CASHOUT row.
  {
    const p = await w.mdal.positionStore.get(k1.positionId);
    const now = new Date().toISOString();
    await w.mdal.positionStore.set({ ...p, status: "CASHED_OUT", finalPayout: 900, settledAt: now });
    const wallet = await w.db.wallet.findByUserId(S1.userId);
    await w.db.txn.create({
      id: `txn_hb_drift_${process.pid}`, walletId: wallet.id, userId: S1.userId, type: "CASHOUT", status: "CONFIRMED", amount: 900, fee: 100, taxWithheld: 0,
      balanceAfter: null, currency: "TZS", provider: "INTERNAL", providerRef: null, msisdn: null, description: "drift artefact", positionId: k1.positionId,
      houseBotId: S1.botId, amlReason: null, createdAt: now, updatedAt: now, completedAt: now,
    });
  }
  // stakeRows: X2 is read OPEN first, then settled; X3 voided; X4's first stake turned CASHED_OUT; X1 gains a marked
  // position with no intent (2,500 YES).
  const beforeX2 = await call(EXP.houseStakeByMarket, [x2.market.id]);
  await settle(x2.market.id, "YES");
  const voided = await w.svc.emergencyVoidMarket({ marketId: x3.market.id, officerId: OFFICER, reason: "reports fixture void" });
  if (!voided.ok) throw new Error(`fixture void: ${show(voided)}`);
  {
    const p = await w.mdal.positionStore.get(x4a.positionId);
    await w.mdal.positionStore.set({ ...p, status: "CASHED_OUT", finalPayout: 1_400, settledAt: new Date().toISOString() });
  }
  const orphanX1 = `pos_hb_nointent_x1_${process.pid}`;
  await w.mdal.positionStore.set({ id: orphanX1, userId: T.userId, marketId: x1.market.id, side: "YES", stake: 2_500, bonusStakeTzs: 0, potentialPayout: 5_000,
    status: "OPEN", finalPayout: null, placedAt: new Date().toISOString(), settledAt: null, idempotencyKey: null, houseBotId: T.botId });

  // ════ the instants (after every settlement, so no settlement copy writes an old placedAt back) ════
  for (const r of F) await placeAt(r.id, r.at);
  for (const e of edgeRows) await placeAt(e.id, e.at);
  for (const s of sbRows) await placeAt(s.positionId, s.at);

  // ════ expected values, from the fixture and the ledger rows — never from the readers under test ════
  const posNow = async (id: string) => (await w.mdal.positionStore.get(id)) as Any;
  const facts: Any[] = [];
  for (const r of F) {
    const p = await posNow(r.id);
    facts.push({ ...r, status: p.status, returned: await returnedOf(r.id) });
  }
  const zeroEntry = () => ({ bets: 0, staked: 0, openStake: 0, settledStake: 0, returned: 0, won: 0, wonStake: 0, wonReturned: 0, lost: 0, lostStake: 0, lostReturned: 0,
    refunded: 0, refundedStake: 0, refundedReturned: 0, cashedOut: 0, cashedOutStake: 0, cashedOutReturned: 0 });
  const foldFacts = (rows: Any[]) => rows.reduce((acc, f) => {
    acc.bets += 1; acc.staked += f.stake; acc.returned += f.returned;
    if (f.status === "OPEN") acc.openStake += f.stake; else acc.settledStake += f.stake;
    const bucket = f.status === "WIN" ? "won" : f.status === "LOSS" ? "lost" : f.status === "VOID" ? "refunded" : f.status === "CASHED_OUT" ? "cashedOut" : null;
    if (bucket) { acc[bucket] += 1; acc[`${bucket}Stake`] += f.stake; acc[`${bucket}Returned`] += f.returned; }
    return acc;
  }, zeroEntry());
  const monthIso = (key: string) => {
    const [y, m] = key.split("-").map(Number);
    return { fromIso: new Date(Date.UTC(y, m - 1, 1) - 3 * 3_600_000).toISOString(), toIso: new Date(Date.UTC(y, m, 1) - 3 * 3_600_000).toISOString() };
  };
  const MKW = monthIso(MK);
  const nowMs = Date.now();

  /* ── §1.179 stakeRows and houseStakeByMarket ── */
  {
    const rows = await call(book.stakeRows?.bind(book), [x1.market.id, x2.market.id, x3.market.id, x4.market.id, x5.market.id]);
    const list: Any[] = Array.isArray(rows) ? rows : [];
    const x1rows = list.filter((r) => r.marketId === x1.market.id);
    const noIntent = x1rows.find((r) => r.kind == null);
    ok("1.179.1 · stakeRows returns the raw grouped columns: X1's no-intent position is its own row, staffChosen strictly false, no kind, no requester",
      !!noIntent && noIntent.staffChosen === false && noIntent.requestedById == null && noIntent.targetId == null && noIntent.targetCreatedById == null && noIntent.stakeTzs === 2_500 && noIntent.open === true, j(rows));
    const manualRow = x1rows.find((r) => r.kind === "MANUAL");
    const targeted = x1rows.find((r) => r.targetId === xt.id);
    ok("1.179.2 · …the MANUAL row carries A as requestedById, the targeted row B as the target's createdById, both staff-chosen, stakes 9,000 and 6,000",
      manualRow?.requestedById === A && manualRow?.staffChosen === true && manualRow?.stakeTzs === 9_000
        && targeted?.targetCreatedById === B && targeted?.kind === "COUNTER" && targeted?.staffChosen === true && targeted?.stakeTzs === 6_000, j(x1rows));
    ok("1.179.3 · CASHED_OUT is excluded: X4 has only its OPEN 1,000 row", j(list.filter((r) => r.marketId === x4.market.id).map((r) => [r.open, r.stakeTzs])) === j([[true, 1_000]]), j(list.filter((r) => r.marketId === x4.market.id)));
    ok("1.179.4 · a market with no marked position contributes no row", !list.some((r) => r.marketId === x5.market.id) && list.length > 0);

    const views = await call(EXP.houseStakeByMarket, [x1.market.id, x2.market.id, x3.market.id, x4.market.id, x5.market.id]);
    const v = (id: string) => (views instanceof Map ? views.get(id) : null);
    const sorted = [A, B].sort();
    ok("1.179.5 · X1 (open): yes 17,500 = open; staff-chosen yes 15,000 by [A, B] sorted; byRequester {A: 9,000, B: 6,000}; the no-intent 2,500 in yes only",
      j(v(x1.market.id)) === j({ yes: 17_500, no: 0, openTzs: 17_500, settledTzs: 0, staffChosen: { yes: 15_000, no: 0, requestedBy: sorted, byRequester: Object.fromEntries(sorted.map((id) => [id, id === A ? 9_000 : 6_000])) } }),
      j(v(x1.market.id)));
    ok("1.179.6 · X2 before its settlement: yes 3,000 all open", j(beforeX2 instanceof Map ? beforeX2.get(x2.market.id) : beforeX2) === j({ yes: 3_000, no: 0, openTzs: 3_000, settledTzs: 0, staffChosen: { yes: 0, no: 0, requestedBy: [], byRequester: {} } }), j(beforeX2));
    ok("1.179.7 · …after it: yes 3,000 all settled (WIN), open 0", j(v(x2.market.id)) === j({ yes: 3_000, no: 0, openTzs: 0, settledTzs: 3_000, staffChosen: { yes: 0, no: 0, requestedBy: [], byRequester: {} } }), j(v(x2.market.id)));
    ok("1.179.8 · X3 after an emergency void: yes 2,000 settled (VOID)", j(v(x3.market.id)) === j({ yes: 2_000, no: 0, openTzs: 0, settledTzs: 2_000, staffChosen: { yes: 0, no: 0, requestedBy: [], byRequester: {} } }), j(v(x3.market.id)));
    ok("1.179.9 · X4: the CASHED_OUT 1,500 FILL is in no figure; C's OPEN 1,000 Enter now is, in yes and in staff-chosen",
      j(v(x4.market.id)) === j({ yes: 1_000, no: 0, openTzs: 1_000, settledTzs: 0, staffChosen: { yes: 1_000, no: 0, requestedBy: [C], byRequester: { [C]: 1_000 } } }), j(v(x4.market.id)));
    ok("1.179.10 · X5 (no house stake): the zero view, present in the map", j(v(x5.market.id)) === j({ yes: 0, no: 0, openTzs: 0, settledTzs: 0, staffChosen: { yes: 0, no: 0, requestedBy: [], byRequester: {} } }), j(v(x5.market.id)));
    const everyView = views instanceof Map ? [...views.values()] : [];
    ok("1.179.11 · yes + no = openTzs + settledTzs on every market read", everyView.length === 5 && everyView.every((x: Any) => x.yes + x.no === x.openTzs + x.settledTzs), j(everyView));
    const audit = await call(EXP.houseStakeForAudit, x1.market.id);
    ok("1.179.12 · houseStakeForAudit: exactly {yes, no, staffChosen: {yes, no, requestedBy}} — no openTzs, no settledTzs, no byRequester",
      j(audit) === j({ yes: 17_500, no: 0, staffChosen: { yes: 15_000, no: 0, requestedBy: sorted } }) && j(Object.keys(audit ?? {})) === j(["yes", "no", "staffChosen"]), j(audit));
    const zero = await call(EXP.houseStakeForAudit, x5.market.id);
    ok("1.179.13 · …a market with no house stake gives the zero shape (a read that found nothing)", j(zero) === j({ yes: 0, no: 0, staffChosen: { yes: 0, no: 0, requestedBy: [] } }), j(zero));
    await call(EXP.failExposureReadForCases, true);
    let failed: Any;
    try {
      failed = { audit: await call(EXP.houseStakeForAudit, x1.market.id), byMarket: await call(EXP.houseStakeByMarket, [x1.market.id]) };
    } finally {
      await call(EXP.failExposureReadForCases, false);
    }
    ok("1.179.14 · ruling 190 · a failed read: houseStakeForAudit returns null (never throws, never a zero shape); houseStakeByMarket throws",
      typeof EXP.failExposureReadForCases === "function" && failed.audit === null && typeof failed.byMarket?.threw === "string", j(failed));
    const again = await call(EXP.houseStakeForAudit, x1.market.id);
    ok("1.179.14c · CONTROL · with the flag off the same read gives the shape again", j(again) === j(audit) && again?.yes === 17_500, j(again));
    const tooMany = await call(EXP.houseStakeByMarket, Array.from({ length: 101 }, (_, n) => `mkt_none_${n}`));
    const hundred = await call(EXP.houseStakeByMarket, Array.from({ length: 100 }, (_, n) => `mkt_none_${n}`));
    ok("1.179.15 · at most 100 market ids per call: 101 throws naming the limit, 100 reads (all zero)",
      typeof tooMany?.threw === "string" && /100/.test(tooMany.threw) && hundred instanceof Map && hundred.size === 100, j({ tooMany, hundred: hundred instanceof Map ? hundred.size : hundred }));
  }

  /* ── §1.180/181 entryRows: the split, the identity, officers, settled statuses ── */
  {
    const rows = await call(book.entryRows?.bind(book), { ...MKW, houseBotId: null });
    const list: Any[] = Array.isArray(rows) ? rows : [];
    const day = await book.dayRows({ ...MKW, houseBotId: null });
    const sum = (xs: Any[], k: string) => xs.reduce((s, r) => s + Number(r[k] ?? 0), 0);
    const KEYS = ["bets", "staked", "openStake", "settledStake", "returned"];
    const identity = (xs: Any[]) => KEYS.every((k) => sum(xs, k) === sum(day, k));
    ok("1.181.1 · fixture · the book (dayRows) sees exactly the MK cohort: 11 stakes",
      sum(day, "bets") === F.length && F.length === 11 && sum(day, "staked") === F.reduce((s, r) => s + r.stake, 0), j({ day, F: F.length }));
    ok("1.181.2 · ⭐ N1's identity: AUTOMATIC + TARGETED + MANUAL + UNKNOWN = dayRows for bets, staked, open, settled and returned", list.length > 0 && identity(list), j({ entry: KEYS.map((k) => sum(list, k)), day: KEYS.map((k) => sum(day, k)) }));
    ok("1.181.3 · UNKNOWN is exactly 0 on a fixture built through the seam", sum(list.filter((r) => r.entry === "UNKNOWN"), "bets") === 0 && list.every((r) => ["AUTOMATIC", "TARGETED", "MANUAL", "UNKNOWN"].includes(r.entry)), j(list.map((r) => r.entry)));
    // Expected rows, folded from the fixture per (bot, productLine, entry, officer).
    const groups = new Map<string, Any[]>();
    for (const f of facts) {
      const key = j([f.bot, f.productLine, f.entry, f.officer]);
      groups.set(key, [...(groups.get(key) ?? []), f]);
    }
    const expected = [...groups.entries()].map(([key, fs]) => { const [bot, productLine, entry, officer] = JSON.parse(key); return { houseBotId: bot, productLine, entry, officerId: officer, ...foldFacts(fs) }; });
    const canon = (xs: Any[]) => xs.map((r) => j(Object.fromEntries(["houseBotId", "productLine", "entry", "officerId", ...Object.keys(zeroEntry())].map((k) => [k, r[k] ?? null])))).sort();
    ok("1.181.4 · every entryRows row equals the fixture's fold: counts, stakes and returned per won / lost / refunded / cashed out",
      j(canon(list)) === j(canon(expected)), j({ got: canon(list), want: canon(expected) }));
    const requesterRows = facts.filter((f) => f.entry === "MANUAL" || f.entry === "TARGETED");
    const byRule = requesterRows.map((f) => [f.id, typeof SS.requesterOf === "function" ? SS.requesterOf(f.intent, f.targetCreatedById) : "not built"]);
    {
      // Oversight's own fold (ruling 178): the same rule, over PLACED stakes finished strictly before the decision.
      const OV: Any = await import("../../src/lib/server/house-bot/oversight.ts");
      const at = "2026-09-10T10:00:00.000Z";
      const stake = (o: Any) => ({ kind: "FILL", requestedById: null, targetId: null, finishedAt: "2026-09-10T09:00:00.000Z", ...o });
      const stakes = [
        stake({ kind: "MANUAL", requestedById: B }), stake({ kind: "MANUAL", requestedById: B }),
        stake({ kind: "COUNTER", targetId: "hbt_one" }), stake({ kind: "MANUAL", requestedById: C, finishedAt: at }),
        stake({ kind: "COUNTER", targetId: "hbt_two", finishedAt: "2026-09-10T10:00:00.001Z" }), stake({}),
      ];
      const creators = new Map<string, string | null>([["hbt_one", A], ["hbt_two", C]]);
      const got = typeof OV.requestedByBefore === "function" ? OV.requestedByBefore(stakes, at, creators) : null;
      ok("1.178.2 · oversight's requestedByBefore folds through the one rule: B twice → once, the target's creator A, distinct and sorted",
        j(got) === j([A, B].sort()), j(got));
      ok("1.178.3 · …a stake finished AT the decision's instant or after it is not before it (finishedAt < createdAt, strictly), and an automated stake has no requester",
        Array.isArray(got) && !got.includes(C) && got.length === 2, j(got));
    }
    ok("1.178.1 · ⭐ officer attribution equals requesterOf: A's Enter now → A; the reaction on B's target that C updated → B (never C)",
      byRule.every(([id, who]) => who === facts.find((f) => f.id === id)?.officer) && list.some((r) => r.entry === "TARGETED" && r.officerId === B) && !list.some((r) => r.officerId === C && r.entry === "TARGETED")
        && t1u?.ok === true && t1u.row?.updatedById === C && t1u.row?.createdById === B, j({ byRule, t1u: t1u?.row ? { createdById: t1u.row.createdById, updatedById: t1u.row.updatedById } : t1u }));
    const cashed = list.find((r) => r.entry === "AUTOMATIC" && r.houseBotId === S1.botId && r.productLine === "MARKET");
    ok("1.181.5 · settled statuses: the CASHED_OUT stake is in settledStake and cashedOut, never in won/lost/refunded; VOID counts as refunded",
      cashed?.cashedOut === 1 && cashed?.cashedOutStake === 1_000 && cashed?.cashedOutReturned === 900 && cashed?.settledStake === 1_000
        && list.some((r) => r.houseBotId === S2.botId && r.productLine === "MARKET" && r.refunded === 1 && r.refundedStake === 4_000 && r.refundedReturned === 4_000), j(list));

    // ⛔ CONTROL · a marked position with no intent lands in UNKNOWN and the identity still ties.
    const m14 = await w.poll({ graceMin: 0 });
    const unknownId = `pos_hb_unknown_${process.pid}`;
    await w.mdal.positionStore.set({ id: unknownId, userId: S1.userId, marketId: m14.id, side: "YES", stake: 7_000, bonusStakeTzs: 0, potentialPayout: 14_000,
      status: "OPEN", finalPayout: null, placedAt: MID, settledAt: null, idempotencyKey: null, houseBotId: S1.botId });
    const after = await call(book.entryRows?.bind(book), { ...MKW, houseBotId: null });
    const afterList: Any[] = Array.isArray(after) ? after : [];
    const dayAfter = await book.dayRows({ ...MKW, houseBotId: null });
    const unknown = afterList.filter((r) => r.entry === "UNKNOWN");
    ok("1.181.c1 · CONTROL · a planted no-intent marked position → UNKNOWN 1 bet · 7,000 open on its own row, no officer, and the identity still ties",
      unknown.length === 1 && unknown[0].bets === 1 && unknown[0].openStake === 7_000 && unknown[0].officerId == null && unknown[0].productLine === "MARKET"
        && KEYS.every((k) => sum(afterList, k) === sum(dayAfter, k)), j({ unknown, dayAfter }));
    R12.unknownId = unknownId;
  }

  /* ── §1.182 the EAT month ── */
  {
    const w25 = typeof CLOCK.eatMonthWindow === "function" ? CLOCK.eatMonthWindow(MK) : null;
    ok("1.182.0 · eatMonthWindow(2025-03) = [2025-02-28T21:00Z, 2025-03-31T21:00Z)", w25?.fromMs === Date.parse(MKW.fromIso) && w25?.toMs === Date.parse(MKW.toIso), j(w25));
    for (const e of edgeRows) {
      const inMonth = async (key: string) => {
        const rows = await call(book.entryRows?.bind(book), { ...monthIso(key), houseBotId: S3.botId });
        return Array.isArray(rows) && rows.some((r: Any) => r.entry === "MANUAL" && r.officerId === C && r.bets >= 1)
          ? (rows as Any[]).filter((r) => r.entry === "MANUAL" && r.officerId === C).reduce((s, r) => s + r.bets, 0) : 0;
      };
      ok(`1.182.${e.at} · a staff-chosen stake placed at ${e.at} counts in ${e.month} and not in the month beside it`,
        (await inMonth(e.month)) >= 1 && (e.month === MK ? true : (await inMonth(MK)) === 2), j({ month: e.month, n: await inMonth(e.month), mk: await inMonth(MK) }));
    }
    const sep = await call(BOOK.houseBotBook, { houseBotId: SB.botId, range: { monthKey: "2026-09" }, nowMs }, { byEntry: true });
    const oct = await call(BOOK.houseBotBook, { houseBotId: SB.botId, range: { monthKey: "2026-10" }, nowMs }, { byEntry: true });
    ok("1.182.1 · ruling 182 · 2026-09-30T20:59:59.999Z counts in 2026-09 and 2026-09-30T21:00:00.000Z in 2026-10 (one MANUAL stake each)",
      sep?.byEntry?.MANUAL?.bets === 1 && oct?.byEntry?.MANUAL?.bets === 1 && sep?.bets === 1 && oct?.bets === 1, j({ sep, oct }));
    const bad = await call(BOOK.houseBotBook, { houseBotId: null, range: { monthKey: "2026-13" }, nowMs });
    ok("1.182.2 · a malformed month key throws in the book (never an empty book)", typeof bad?.threw === "string", j(bad));
  }

  /* ── §1.180/181 houseBotBook byEntry, houseStaffScorecard, the baseline ── */
  {
    const full = await call(BOOK.houseBotBook, { houseBotId: null, range: { monthKey: MK }, nowMs }, { byEntry: true });
    const withUnknown = [...facts, { entry: "UNKNOWN", stake: 7_000, status: "OPEN", returned: 0, productLine: "MARKET" }];
    const bookOf = (fs: Any[]) => {
      const e = foldFacts(fs);
      const settled = e.won + e.lost + e.refunded;
      return {
        bets: e.bets, stakedTzs: e.staked, openStakeTzs: e.openStake, settledStakeTzs: e.settledStake, returnedTzs: e.returned,
        won: e.won, lost: e.lost, refunded: e.refunded, cashedOut: e.cashedOut, settled,
        winRatePct: e.won + e.lost > 0 ? (e.won * 100) / (e.won + e.lost) : null,
        netTzs: e.wonReturned + e.lostReturned + e.refundedReturned - (e.wonStake + e.lostStake + e.refundedStake),
      };
    };
    const ENTRIES = ["AUTOMATIC", "TARGETED", "MANUAL", "UNKNOWN"];
    const wantByEntry = Object.fromEntries(ENTRIES.map((k) => [k, bookOf(withUnknown.filter((f) => f.entry === k))]));
    ok("1.180.1 · houseBotBook({monthKey}, {byEntry}) splits the month into exactly the four entries, each equal to the fixture's fold",
      j(Object.keys(full?.byEntry ?? {}).sort()) === j([...ENTRIES].sort()) && ENTRIES.every((k) => j(full.byEntry[k]) === j(wantByEntry[k])), j({ got: full?.byEntry, want: wantByEntry }));
    ok("1.180.2 · …and its totals are the sum of the entries (bets, staked, returned; net = returned − settled stake)",
      full?.bets === withUnknown.length && full?.stakedTzs === withUnknown.reduce((s, f) => s + f.stake, 0)
        && full?.returnedTzs === withUnknown.reduce((s, f) => s + f.returned, 0)
        && full?.netTzs === full?.returnedTzs - ENTRIES.reduce((s, k) => s + (wantByEntry[k].settledStakeTzs as number), 0), j(full));
    const plain = await call(BOOK.houseBotBook, { houseBotId: null, range: { monthKey: MK }, nowMs });
    ok("1.180.3 · without {byEntry} the book carries no byEntry key", plain && !plain.threw && !("byEntry" in plain), j(plain));
    const market = await call(BOOK.houseBotBook, { houseBotId: null, range: { monthKey: MK }, productLine: "MARKET", nowMs }, { byEntry: true });
    const card = await call(BOOK.houseStaffScorecard, { monthKey: MK });
    const baselineWant = bookOf(facts.filter((f) => f.entry === "AUTOMATIC" && f.productLine === "MARKET"));
    ok("1.181.6 · ⭐ the baseline IS houseBotBook({houseBotId: null, monthKey, productLine: MARKET}, {byEntry}).byEntry.AUTOMATIC — the Up & Down FILL excluded",
      !!card?.baseline && j(card.baseline) === j(market?.byEntry?.AUTOMATIC) && j(card.baseline) === j(baselineWant) && baselineWant.bets === 5, j({ card: card?.baseline, market: market?.byEntry?.AUTOMATIC, want: baselineWant }));
    ok("1.181.7 · …with won + lost ≥ 1 (the win-rate condition can decide): 0 won, 2 lost → 0%; net over won + lost + refunded only (the CASHED_OUT 900 not in it)",
      card?.baseline?.won === 0 && card?.baseline?.lost === 2 && card?.baseline?.winRatePct === 0 && card?.baseline?.netTzs === 4_000 - 11_000 && card?.baseline?.cashedOut === 1, j(card?.baseline));
    const officerWant = [A, B, C].sort().map((id) => ({ officerId: id, ...bookOf(facts.filter((f) => (f.entry === "MANUAL" || f.entry === "TARGETED") && f.officer === id)) }));
    ok("1.180.4 · houseStaffScorecard: one row per officer (A, B, C, sorted), MANUAL + TARGETED together, UNKNOWN in none",
      j(card?.officers) === j(officerWant), j({ got: card?.officers, want: officerWant }));
    const rowOf = (id: string) => (card?.officers ?? []).find((r: Any) => r.officerId === id);
    ok("1.180.5 · …A: 1 won of 1 (100%); B: the targeted WIN and the Enter now LOSS (50%); C: 2 placed, none settled, no win rate",
      rowOf(A)?.won === 1 && rowOf(A)?.winRatePct === 100 && rowOf(B)?.won === 1 && rowOf(B)?.lost === 1 && rowOf(B)?.winRatePct === 50
        && rowOf(C)?.bets === 2 && rowOf(C)?.settled === 0 && rowOf(C)?.winRatePct === null, j(card?.officers));
    ok("1.180.6 · the scorecard names its month and window", card?.monthKey === MK && card?.fromIso === MKW.fromIso && card?.toIso === MKW.toIso, j({ monthKey: card?.monthKey, fromIso: card?.fromIso, toIso: card?.toIso }));
  }

  Object.assign(R12, { ready: true, w, BOOK, PAY, call, facts, S1, S2, F1, F3, T, m1, m3, udMarket, l1, l1h, l1Players, l2, l2h, l3, l3h, udOther, h1, a1, b1, k1, nowMs, monthIso });
});

section("§2 · ruling 183 · the fee withheld: derived from the frozen snapshot per bot and product, cross-checked against the ledger (Postgres)");
await guard("2", async () => {
  if (!R12.ready) { ok("2.0 · §1's fixture was built", false, "§1 threw before its fixture was ready"); return; }
  const { w, BOOK, PAY, call, S1, S2, F1, F3, m1, udMarket, l1, l1h, l1Players, l2h, l3h, udOther, h1, a1, b1, nowMs, monthIso } = R12;
  const book = w.dal.houseBookStore;
  const CLOCK: Any = await import("../../src/lib/house-bot/clock.ts");
  const txns = (await w.db.txn.listAll()) as Any[];
  const payoutOf = (positionId: string) => txns.find((t) => t.positionId === positionId && t.type === "BET_PAYOUT" && t.houseBotId != null);
  const payMs = Date.parse(payoutOf(l1h.positionId)?.createdAt ?? new Date().toISOString());
  const P = CLOCK.eatMonthKey(payMs);
  const prev = CLOCK.eatPreviousMonthKey(payMs);
  // "A WIN placed in August and settled in September": the L1 house stake moves to the month before its payout.
  const prevWin = monthIso(prev);
  if (w.onPostgres) await w.prisma().$executeRawUnsafe(`UPDATE "Position" SET "placedAt" = $1::timestamp WHERE "id" = $2`, new Date(Date.parse(prevWin.fromIso) + 86_400_000).toISOString(), l1h.positionId);
  else (await w.mdal.positionStore.get(l1h.positionId)).placedAt = new Date(Date.parse(prevWin.fromIso) + 86_400_000).toISOString();

  const feeOf = (houseBotId: string, monthKey: string, productLine?: string) => call(BOOK.houseBotBook, { houseBotId, range: { monthKey }, ...(productLine ? { productLine } : {}), nowMs });
  const marketOf = async (id: string) => w.svc.getMarket(id);
  // Expected shares from the fixture's arithmetic: equal stakes tie on the fraction, so the leftover shillings go to the
  // lowest ids (allocateFeeShares' documented tie-break); every other split is exact or decided by the larger fraction.
  const l1m = await marketOf(l1.market.id);
  const l1Fee = Math.floor(PAY.poolFee(l1m.yesPool, l1m.noPool, w.svc.ratesFor(l1m), "YES").fee);
  const l1Ids = [l1h.positionId, ...l1Players].sort((x: string, y: string) => (x < y ? -1 : x > y ? 1 : 0));
  const l1Base = Math.floor(l1Fee / 6), l1Extra = l1Fee - 6 * l1Base;
  const l1House = l1Base + (l1Ids.indexOf(l1h.positionId) < l1Extra ? 1 : 0);
  const m1m = await marketOf(m1.market.id);
  const m1Fee = Math.floor(PAY.poolFee(m1m.yesPool, m1m.noPool, w.svc.ratesFor(m1m), "YES").fee);
  const udm = await marketOf(udMarket);
  const udFee = Math.floor(PAY.poolFee(udm.yesPool, udm.noPool, w.svc.ratesFor(udm), "NO").fee);
  ok("2.0 · fixture · L1's six winners tie on the fraction (fee not divisible by 6), UD is capped-commission with the ceiling binding, M1 splits exactly",
    l1Fee > 0 && l1Fee % 6 !== 0 && w.svc.ratesFor(udm).feeModel === "capped-commission" && PAY.poolFee(udm.yesPool, udm.noPool, w.svc.ratesFor(udm), "NO").capped === true
      && (m1Fee * 9_000) % 15_000 === 0, j({ l1Fee, udFee, m1Fee, udModel: w.svc.ratesFor(udm).feeModel }));
  const udHouse = Math.floor((udFee * 2_000) / 3_000) + (((udFee * 2_000) % 3_000) * 1 > ((udFee * 1_000) % 3_000) ? 1 : 0);

  const f1P = await feeOf(F1.botId, P);
  ok("2.1 · F1 (payout month): the L1 tie share plus L2's zero share, derived per bot", f1P?.feeWithheldTzs === l1House + 0, j({ got: f1P?.feeWithheldTzs, want: l1House }));
  const f1Prev = await feeOf(F1.botId, prev);
  ok("2.2 · a WIN placed the month before and settled this month counts in the payout month's fee, not its placement month's (LEDGER basis)",
    f1Prev?.feeWithheldTzs === 0 && f1P?.feeWithheldTzs === l1House && (await call(BOOK.houseBotBook, { houseBotId: F1.botId, range: { monthKey: prev }, nowMs }, { byEntry: true }))?.bets >= 1,
    j({ prev: f1Prev?.feeWithheldTzs, payoutMonth: f1P?.feeWithheldTzs }));
  const s2Ud = await feeOf(S2.botId, P, "UPDOWN");
  const s2Market = await feeOf(S2.botId, P, "MARKET");
  ok("2.3 · per product: S2's Up & Down (legacy capped-commission round) share on its own; its polls (a LOSS and a VOID) withheld nothing",
    s2Ud?.feeWithheldTzs === udHouse && s2Market?.feeWithheldTzs === 0, j({ ud: s2Ud?.feeWithheldTzs, udHouse, market: s2Market?.feeWithheldTzs }));
  const s1Market = await feeOf(S1.botId, P, "MARKET");
  ok("2.4 · S1: both M1 winners' shares (an exact 9,000 : 6,000 split) plus the fee on its marked CONFIRMED CASHOUT row (100)",
    s1Market?.feeWithheldTzs === m1Fee + 100, j({ got: s1Market?.feeWithheldTzs, want: m1Fee + 100 }));
  const f3 = await feeOf(F3.botId, P);
  const f3Ud = await feeOf(F3.botId, P, "UPDOWN");
  ok("2.5 · F3: its WIN sits on a market with no own snapshot → null, never 0 (\"not recorded per stake\"); a product it never won in is 0",
    f3 != null && !f3.threw && f3.feeWithheldTzs === null && f3Ud?.feeWithheldTzs === 0, j({ f3: f3?.feeWithheldTzs, f3Ud: f3Ud?.feeWithheldTzs }));

  // The inputs themselves: never a userId; positions only for markets that hold a marked WIN in the window.
  const P_W = monthIso(P);
  const inputs = await call(book.feeInputs?.bind(book), { ...P_W, houseBotId: null });
  const winMarkets = new Set((inputs?.wins ?? []).map((x: Any) => x.marketId));
  ok("2.6 · feeInputs carries no userId anywhere, and reads positions only for markets holding a marked WIN in the window",
    Array.isArray(inputs?.wins) && !/"userId"/.test(j(inputs)) && (inputs.markets ?? []).every((m: Any) => winMarkets.has(m.marketId)) && winMarkets.has(l1.market.id) && winMarkets.has(udMarket),
    j({ wins: inputs?.wins?.length, markets: (inputs?.markets ?? []).map((m: Any) => m.marketId) }));
  const shares = typeof BOOK.derivedFeeShares === "function" && inputs && !inputs.threw ? BOOK.derivedFeeShares(inputs) : null;
  ok("2.7 · derived per position: L2's house winner 0 (a zero-share winner), F3's null, UD's and M1's shares as their splits say",
    shares instanceof Map && shares.get(l2h.positionId) === 0 && shares.get(l3h.positionId) === null && shares.get(h1.positionId) === udHouse
      && shares.get(a1.positionId) === (m1Fee * 9_000) / 15_000 && shares.get(b1.positionId) === (m1Fee * 6_000) / 15_000,
    j(shares instanceof Map ? Object.fromEntries(shares) : shares));

  if (w.onPostgres) {
    // ⭐ THE CROSS-CHECK, ZERO TOLERANCE: every marked WIN whose marked BET_PAYOUT landed in the window, against the
    // SETTLEMENT_COMMISSION lines of ITS settle_<payout txn id> group (a missing line reads as 0). LEFT JOIN, so a winner
    // with no line is checked too, and the population must equal feeInputs' wins exactly.
    const rows: Any[] = await w.prisma().$queryRawUnsafe(
      `SELECT p."id" AS "positionId", t."id" AS "payoutTxnId", coalesce(sum(le."amount"), 0)::text AS "ledger"`
      + ` FROM "Transaction" t JOIN "Position" p ON p."id" = t."positionId"`
      + ` LEFT JOIN "LedgerEntry" le ON le."groupId" = 'settle_' || t."id" AND le."entryType"::text = 'SETTLEMENT_COMMISSION'`
      + ` WHERE t."houseBotId" IS NOT NULL AND t."type"::text = 'BET_PAYOUT' AND t."status"::text = 'CONFIRMED' AND p."status"::text = 'WIN'`
      + ` AND t."createdAt" >= $1::timestamp AND t."createdAt" < $2::timestamp GROUP BY p."id", t."id" ORDER BY p."id"`, P_W.fromIso, P_W.toIso);
    const checked = rows.filter((r) => shares instanceof Map && shares.get(r.positionId) !== null);
    const mismatches = checked.filter((r) => shares.get(r.positionId) !== Number(r.ledger));
    ok("2.P1 · ⭐ Postgres · every marked WIN position's derived share equals its settle_<payout> SETTLEMENT_COMMISSION sum exactly (zero tolerance)",
      shares instanceof Map && checked.length >= 6 && mismatches.length === 0, j({ checked: checked.length, mismatches }));
    ok("2.P2 · …the population is the same set feeInputs derives (no winner dropped, the zero-share one included)",
      shares instanceof Map && j(rows.map((r) => r.positionId).sort()) === j([...shares.keys()].sort()) && rows.some((r) => r.positionId === l2h.positionId && Number(r.ledger) === 0),
      j({ sql: rows.map((r) => r.positionId), derived: shares instanceof Map ? [...shares.keys()] : null }));
    ok("2.P3 · …the L1 tie, the capped legacy Up & Down share and M1's split are each in the checked set with a non-zero line",
      [l1h.positionId, h1.positionId, a1.positionId, b1.positionId].every((id) => checked.some((r) => r.positionId === id && Number(r.ledger) > 0)), j(checked));
    const udLine = rows.find((r) => r.positionId === udOther.positionId);
    ok("2.P4 · CONTROL · the check can see a difference: the unmarked Up & Down winner is not in the house population, and a planted off-by-one share would mismatch",
      udLine == null && checked.some((r) => Number(r.ledger) + 1 !== shares.get(r.positionId)), j({ udLine }));
  }
});

section("§1.177 · ruling 177 · every other new store member on both stores — one fixture, literal answers (with 185's window and the platform members of 210, 224, 233, 235)");
await guard("1.177", async () => {
  if (!R12.ready) { ok("1.177.0 · §1's fixture was built", false, "§1 threw before its fixture was ready"); return; }
  const { w, S1, S2, F1, m1, m3, udMarket, udOther, monthIso } = R12;
  const S = w.dal;
  const AUD: Any = await import("../../src/lib/server/audit.ts");
  const CLOCK: Any = await import("../../src/lib/house-bot/clock.ts");
  const clockPast = async (iso: string) => { const at = Date.parse(iso); while (Date.now() <= at) await new Promise((r) => setImmediate(r)); };
  const later = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString();
  const nowIso = () => new Date().toISOString();

  // ── events: listByUserKinds, listByKindsInWindow, countByBot ──
  {
    const EB = await w.bot();
    const U = await w.user({});
    const boxes: Any[] = [];
    for (let n = 0; n < 3; n++) {
      const e = await S.houseBotEventStore.append({ houseBotId: null, userId: U, marketId: null, kind: "PENALTY_BOXED", fromStatus: null, toStatus: null, reason: null, actorId: null, payload: { day: `2026-09-0${n + 1}`, cause: "BOTH_SIDES" } });
      boxes.push(e);
      await clockPast(e.createdAt);
    }
    const ended = await S.houseBotEventStore.append({ houseBotId: EB.botId, userId: null, marketId: null, kind: "TARGET_ENDED", fromStatus: null, toStatus: null, reason: null, actorId: null, payload: { targetId: "hbt_case", endCause: "CONSENT_VOID" } });
    const p1 = await S.houseBotEventStore.listByUserKinds(U, ["PENALTY_BOXED"], { limit: 2 });
    const p2 = await S.houseBotEventStore.listByUserKinds(U, ["PENALTY_BOXED"], { limit: 2, cursor: p1.nextCursor });
    const ids = [...p1.rows, ...p2.rows].map((r: Any) => r.id);
    ok("1.177.1 · listByUserKinds pages one account's events newest first with the real total: 2 + 1 of 3, no row twice",
      p1.total === 3 && p1.rows.length === 2 && p1.nextCursor != null && p2.rows.length === 1 && p2.nextCursor === null && p2.total === 3
        && j([...ids].sort()) === j(boxes.map((b) => b.id).sort()) && Date.parse(p1.rows[0].createdAt) >= Date.parse(p1.rows[1].createdAt), j({ p1, p2 }));
    const win = await S.houseBotEventStore.listByKindsInWindow({ kinds: ["PENALTY_BOXED", "TARGET_ENDED"], fromIso: boxes[0].createdAt, toIso: ended.createdAt, limit: 500 });
    ok("1.177.2 · listByKindsInWindow over [first box, the ended target): the three boxes, not the ended target (the end is exclusive), total 3",
      win.total === 3 && j(win.rows.map((r: Any) => r.id).sort()) === j(boxes.map((b) => b.id).sort()), j(win));
    const one = await S.houseBotEventStore.listByKindsInWindow({ kinds: ["TARGET_ENDED"], fromIso: boxes[0].createdAt, toIso: later(ended.createdAt, 1), houseBotId: EB.botId, limit: 1 });
    ok("1.177.3 · …by bot: the TARGET_ENDED whose userId column is null is listed, total 1", one.total === 1 && one.rows[0]?.id === ended.id && one.rows[0]?.userId == null, j(one));
    const all = await S.houseBotEventStore.countByBot(EB.botId, {});
    const kinds = await S.houseBotEventStore.countByBot(EB.botId, { kinds: ["TARGET_ENDED"] });
    const paged = await S.houseBotEventStore.listByBot(EB.botId, { limit: 500 });
    ok("1.177.4 · countByBot counts what listByBot pages: DESIGNATED + TARGET_ENDED = 2, TARGET_ENDED alone = 1", all === 2 && kinds === 1 && paged.rows.length === 2, j({ all, kinds, paged: paged.rows.length }));
    R12.EB = EB;
  }

  // ── intents: countFeed, counteredPositionsCount ──
  {
    const feed = await S.houseBotIntentStore.listFeed({ houseBotId: S1.botId, limit: 500 });
    const n = await S.houseBotIntentStore.countFeed({ houseBotId: S1.botId });
    const manual = await S.houseBotIntentStore.countFeed({ houseBotId: S1.botId, kinds: ["MANUAL"] });
    ok("1.177.5 · countFeed counts what listFeed pages for the same filter: S1's four intents, one MANUAL", n === 4 && feed.rows.length === 4 && manual === 1, j({ n, rows: feed.rows.length, manual }));
    const skipPoll = await w.poll({ graceMin: 0 });
    const skipTrigger = await w.svc.buyPosition(m3.player, { marketId: skipPoll.id, side: "NO", stake: 1_000, idempotencyKey: crypto.randomUUID() });
    if (skipTrigger.ok) {
      await S.houseBotIntentStore.insert({
        id: S.newHouseId("intent"), houseBotId: S1.botId, botUserId: S1.userId, kind: "COUNTER", marketId: skipPoll.id, productLine: "MARKET",
        anchorKey: skipTrigger.data.positionId, triggerPositionId: skipTrigger.data.positionId, triggerUserId: m3.player, targetId: null, requestedById: null, entryCondition: null,
        side: "YES", stakeTzs: 1_000, dueAt: w.iso(-1_000), deadlineAt: w.iso(60_000), staleAt: w.iso(60_000), status: "SKIPPED", reasonCode: "NOT_REACTING", why: null,
        decision: {}, attempts: 0, transientAttempts: 0, nextAttemptAt: null, claimedBy: null, claimedUntil: null, positionId: null, finishedAt: w.iso(), alertedAt: null,
      });
    }
    const untargeted = await S.houseBotIntentStore.counteredPositionsCount(m3.player);
    const targeted = await S.houseBotIntentStore.counteredPositionsCount(m1.player);
    const none = await S.houseBotIntentStore.counteredPositionsCount(udOther.player);
    ok("1.177.6 · counteredPositionsCount: a PLACED counter counts (1), a SKIPPED one on the same account's second stake does not, a targeted counter counts (1), an uncountered account is 0",
      skipTrigger.ok === true && untargeted === 1 && targeted === 1 && none === 0, j({ untargeted, targeted, none, skip: skipTrigger.ok }));
  }

  // ── presses: listRegister's purposes and countRegister ──
  {
    const EB = R12.EB;
    const from = new Date(Date.now() - 1_000).toISOString();
    const pressOf = (purpose: string) => S.pressStore.insertChecking({ id: S.newHouseId("press"), actorId: R12.facts[0].officer, submitId: crypto.randomUUID(), purpose, houseBotId: EB.botId, marketId: null, targetId: null, intentId: null, reason: "store member case" });
    for (const p of ["ENTER_NOW", "ENTER_NOW", "TARGET_ADD", "STAFF_CANCEL"]) await pressOf(p);
    const to = new Date(Date.now() + 60_000).toISOString();
    const two = await S.pressStore.listRegister({ fromIso: from, toIso: to, houseBotId: EB.botId, purposes: ["ENTER_NOW", "TARGET_ADD"], limit: 500 });
    const cTwo = await S.pressStore.countRegister({ fromIso: from, toIso: to, houseBotId: EB.botId, purposes: ["ENTER_NOW", "TARGET_ADD"] });
    const cAll = await S.pressStore.countRegister({ fromIso: from, toIso: to, houseBotId: EB.botId });
    const enterNow = await S.pressStore.countRegister({ fromIso: from, toIso: to, houseBotId: EB.botId, purposes: ["ENTER_NOW"] });
    ok("1.177.7 · listRegister's purposes filter and countRegister agree: ENTER_NOW + TARGET_ADD = 3 rows and 3; all purposes 4; ENTER_NOW alone 2",
      two.rows.length === 3 && two.rows.every((r: Any) => r.purpose !== "STAFF_CANCEL") && cTwo === 3 && cAll === 4 && enterNow === 2, j({ rows: two.rows.map((r: Any) => r.purpose), cTwo, cAll, enterNow }));
  }

  // ── targets: listInWindow (created, ended or removed in the window) ──
  {
    const EB = R12.EB;
    const tgt = async () => S.targetStore.insert({ id: S.newHouseId("target"), houseBotId: EB.botId, marketId: (await w.poll({ graceMin: 0 })).id, delayMinSec: 10, delayMaxSec: 10,
      timingFrom: "STAKE", reactTo: "EVERY", createdById: R12.facts[0].officer, snapshot: { titleEn: "House seam poll", category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 } });
    const age = async (id: string) => {
      if (w.onPostgres) await w.prisma().$executeRawUnsafe(`UPDATE "HouseBotTarget" SET "createdAt" = "createdAt" - interval '40 days', "effectiveFrom" = "effectiveFrom" - interval '40 days' WHERE "id" = $1`, id);
      else { const t = (globalThis as Any).__50PICK_HB_TARGETS.get(id); t.createdAt = later(t.createdAt, -40 * 86_400_000); t.effectiveFrom = later(t.effectiveFrom, -40 * 86_400_000); }
    };
    const from = new Date(Date.now() - 1_000).toISOString();
    const fresh = await tgt();
    const oldEnded = await tgt();
    const oldRemoved = await tgt();
    const oldActive = await tgt();
    for (const t of [oldEnded, oldRemoved, oldActive]) await age(t.id);
    await S.targetStore.endActive(oldEnded.id, "CONSENT_VOID");
    await S.targetStore.remove(oldRemoved.id, R12.facts[0].officer);
    const to = new Date(Date.now() + 60_000).toISOString();
    const page = await S.targetStore.listInWindow({ fromIso: from, toIso: to, houseBotId: EB.botId, limit: 2 });
    const rest = await S.targetStore.listInWindow({ fromIso: from, toIso: to, houseBotId: EB.botId, limit: 2, cursor: page.nextCursor });
    const listed = [...page.rows, ...rest.rows].map((r: Any) => r.id).sort();
    ok("1.177.8 · listInWindow: a target created in the window, and two created 40 days earlier that ENDED or were REMOVED in it; never one still ACTIVE from before; paged with total 3",
      page.total === 3 && j(listed) === j([fresh.id, oldEnded.id, oldRemoved.id].sort()) && !listed.includes(oldActive.id), j({ page, rest }));
  }

  // ── bots: listOverlapping ──
  {
    const RX = await w.bot();
    const rx: Any = await S.houseBotStore.setStatus(RX.botId, { from: ["ACTIVE"], to: "REMOVED", pauseReason: null, pausedFromStatus: null, removal: { byId: R12.facts[0].officer, reason: "store member case", cause: "MANUAL" } });
    const LIVE = R12.EB;
    const inWindow = await S.houseBotStore.listOverlapping({ fromIso: rx.designatedAt, toIso: later(nowIso(), 3_600_000) });
    const afterRemoval = await S.houseBotStore.listOverlapping({ fromIso: later(rx.removedAt, 1), toIso: later(nowIso(), 3_600_000) });
    const beforeLive = await S.houseBotStore.listOverlapping({ fromIso: "2000-01-01T00:00:00.000Z", toIso: (await S.houseBotStore.get(LIVE.botId)).designatedAt });
    ok("1.177.9 · listOverlapping: a REMOVED bot is listed for a window its life overlaps and not for one starting after its removal; a bot designated at the window's end is not in it",
      !!rx && inWindow.some((b: Any) => b.id === RX.botId) && !afterRemoval.some((b: Any) => b.id === RX.botId) && afterRemoval.some((b: Any) => b.id === LIVE.botId)
        && !beforeLive.some((b: Any) => b.id === LIVE.botId) && beforeLive.some((b: Any) => b.id === S1.botId), j({ rx: rx?.removedAt, n: [inWindow.length, afterRemoval.length, beforeLive.length] }));
  }

  // ── the book: ledgerRows, positionsForUser, txnPageForUser ──
  {
    const txns = (await w.db.txn.listAll()) as Any[];
    const P = CLOCK.eatMonthKey(Date.parse(txns.find((t) => t.positionId === R12.a1.positionId && t.type === "BET_PAYOUT").createdAt));
    const W = monthIso(P);
    const inW = txns.filter((t) => t.houseBotId != null && t.status === "CONFIRMED" && Date.parse(t.createdAt) >= Date.parse(W.fromIso) && Date.parse(t.createdAt) < Date.parse(W.toIso));
    const want = new Map<string, { count: number; amount: number; fee: number }>();
    for (const t of inW) { const k = `${t.houseBotId}|${t.type}`; const e = want.get(k) ?? { count: 0, amount: 0, fee: 0 }; e.count++; e.amount += Number(t.amount); e.fee += Number(t.fee ?? 0); want.set(k, e); }
    const rows = await S.houseBookStore.ledgerRows(W);
    const got = new Map<string, { count: number; amount: number; fee: number }>();
    for (const r of rows) { const k = `${r.houseBotId}|${r.type}`; const e = got.get(k) ?? { count: 0, amount: 0, fee: 0 }; e.count += r.count; e.amount += r.amountTzs; e.fee += r.feeTzs; got.set(k, e); }
    const canon = (m: Map<string, Any>) => j([...m.entries()].sort(([a], [b]) => (a < b ? -1 : 1)));
    const udPayout = rows.find((r: Any) => r.houseBotId === S2.botId && r.type === "BET_PAYOUT");
    ok("1.177.10 · ledgerRows: per bot and type, the counts, amounts and fees of the marked CONFIRMED rows created in the window, nothing unmarked; the Up & Down payout under product UPDOWN and its market",
      rows.length > 0 && canon(got) === canon(want) && udPayout?.productLine === "UPDOWN" && udPayout?.marketId === udMarket, j({ got: canon(got), want: canon(want), udPayout }));

    const holder = S1.userId;
    const marked = ((await w.mdal.positionStore.values()) as Any[]).filter((p) => p.userId === holder && p.houseBotId != null);
    const pages: Any[] = [];
    let cursor: Any = null;
    let total = -1;
    for (let k = 0; k < 10; k++) {
      const page = await S.houseBookStore.positionsForUser({ userId: holder, cursor, limit: 2 });
      pages.push(...page.rows);
      total = page.total;
      cursor = page.nextCursor;
      if (!cursor) break;
    }
    const nonIncreasing = pages.every((p, i) => i === 0 || Date.parse(pages[i - 1].placedAt) >= Date.parse(p.placedAt));
    ok("1.177.11 · positionsForUser pages the holder's marked positions to the end with the real total, newest placement first, no row twice",
      total === marked.length && marked.length === 5 && j(pages.map((p) => p.id).sort()) === j(marked.map((p) => p.id).sort()) && nonIncreasing && pages.every((p) => p.houseBotId === S1.botId),
      j({ total, marked: marked.length, got: pages.length }));

    const mine = txns.filter((t) => t.userId === holder);
    const collect = async (marked: "only" | "any") => {
      const out: Any[] = [];
      let c: Any = null;
      let t = -1;
      for (let k = 0; k < 20; k++) {
        const page = await S.houseBookStore.txnPageForUser({ userId: holder, marked, cursor: c, limit: 3 });
        out.push(...page.rows);
        t = page.total;
        c = page.nextCursor;
        if (!c) break;
      }
      return { out, t };
    };
    const only = await collect("only");
    const any = await collect("any");
    ok("1.177.12 · txnPageForUser pages the holder's transactions to the end: marked only (7) and every row, each with the real total, no row twice",
      only.t === mine.filter((t) => t.houseBotId != null).length && only.t === 7 && new Set(only.out.map((t) => t.id)).size === only.t
        && only.out.every((t) => t.houseBotId === S1.botId) && any.t === mine.length && new Set(any.out.map((t) => t.id)).size === any.t,
      j({ only: only.t, any: any.t, mine: mine.length }));
    const playerOnly = await S.houseBookStore.txnPageForUser({ userId: m1.player, marked: "only", limit: 500 });
    const playerAny = await S.houseBookStore.txnPageForUser({ userId: m1.player, marked: "any", limit: 500 });
    ok("1.177.12b · …and for a player: marked only is empty (total 0) while every row is the player's own stake (total 1)",
      playerOnly.total === 0 && playerOnly.rows.length === 0 && playerAny.total === 1 && playerAny.rows[0]?.houseBotId == null, j({ only: playerOnly.total, any: playerAny.total }));
    const windowed = await S.houseBookStore.txnPageForUser({ userId: holder, marked: "only", fromIso: W.fromIso, toIso: W.toIso, limit: 500 });
    ok("1.177.13 · …and a window keeps only the rows created inside it", windowed.total === inW.filter((t) => t.userId === holder).length, j({ got: windowed.total }));
  }

  // ── platform members ──
  {
    const txns = (await w.db.txn.listAll()) as Any[];
    const only = await w.db.txn.search({ house: "only", take: 500 });
    const exclude = await w.db.txn.search({ house: "exclude", take: 500 });
    ok("1.177.14 · ruling 210 · txn.search {house: only} totals exactly the marked rows and {house: exclude} exactly the unmarked ones, every returned row matching",
      only.total === txns.filter((t) => t.houseBotId != null).length && exclude.total === txns.filter((t) => t.houseBotId == null).length
        && only.rows.every((t: Any) => t.houseBotId != null) && exclude.rows.every((t: Any) => t.houseBotId == null) && only.total > 0,
      j({ only: only.total, exclude: exclude.total, all: txns.length }));
    const top = await w.db.txn.topContributors(500);
    const loser = top.find((r: Any) => r.userId === m1.player);
    ok("1.177.15 · ruling 224 · topContributors ranks players only: a holder whose every stake is marked is absent; a player's own stake is counted",
      !top.some((r: Any) => r.userId === S1.userId || r.userId === F1.userId) && loser?.stakes === 20_000, j({ loser, n: top.length }));
    const board = await w.mdal.positionStore.leaderboard(500, { sort: "staked", dir: "desc" });
    const boardEx = await w.mdal.positionStore.leaderboard(500, { sort: "staked", dir: "desc", excludeHouse: true });
    const holderRow = board.find((r: Any) => r.userId === S1.userId);
    ok("1.177.16 · ruling 233 · leaderboard(): the holder's marked settled positions rank like a player's (3 resolved, 16,000); {excludeHouse: true} drops only marked rows",
      holderRow?.resolved === 3 && holderRow?.staked === 16_000 && !boardEx.some((r: Any) => r.userId === S1.userId) && boardEx.some((r: Any) => r.userId === m1.player), j({ holderRow, n: [board.length, boardEx.length] }));
    const settled = await w.svc.getMarket(udMarket);
    const day = await w.mdal.positionStore.dailyTotalsByUser({ fromIso: later(settled.settledAt, -3_600_000), toIso: later(settled.settledAt, 3_600_000), productLine: "UPDOWN" });
    const holderDay = day.find((r: Any) => r.userId === S2.userId);
    const playerDay = day.find((r: Any) => r.userId === udOther.player);
    ok("1.177.17 · ruling 235 · dailyTotalsByUser.ownRounds: the holder's all-house round day is 1 round and 0 own; a player's is 1 and 1",
      holderDay?.rounds === 1 && holderDay?.ownRounds === 0 && playerDay?.rounds === 1 && playerDay?.ownRounds === 1, j({ holderDay, playerDay }));
  }

  // ── ruling 185 · the durable audit read over a window ──
  {
    const action = `case.window.${process.pid}`;
    const rows: Any[] = [];
    for (let n = 0; n < 4; n++) {
      const e = await AUD.audit({ category: "ADMIN", action, actorId: R12.facts[0].officer, targetType: "Case", targetId: `w${n}`, payload: {} });
      rows.push(e);
      await clockPast(e.createdAt);
    }
    await AUD.auditFlush();
    const [r0, r1, r2, r3] = rows;
    const inner = await AUD.getAuditByActionsDurable([action], { fromIso: r1.createdAt, toIso: r3.createdAt, limit: 500 });
    const truncated = await AUD.getAuditByActionsDurable([action], { fromIso: r1.createdAt, toIso: r3.createdAt, limit: 1 });
    const open = await AUD.getAuditByActionsDurable([action], { limit: 500 });
    const fromOnly = await AUD.getAuditByActionsDurable([action], { fromIso: r2.createdAt, limit: 500 });
    const toOnly = await AUD.getAuditByActionsDurable([action], { toIso: r1.createdAt, limit: 500 });
    ok("1.185.1 · [r1, r3) holds r1 and r2 — the start inclusive, the end exclusive — newest first, total 2",
      j(inner.entries.map((e: Any) => e.targetId)) === j(["w2", "w1"]) && inner.total === 2 && inner.truncated === false, j(inner));
    ok("1.185.2 · …the total counts inside the window before the limit: limit 1 gives the newest, total 2, truncated", truncated.entries.length === 1 && truncated.entries[0].targetId === "w2" && truncated.total === 2 && truncated.truncated === true, j(truncated));
    ok("1.185.3 · with no window the read is unchanged: all four; one bound alone applies alone",
      open.total === 4 && j(fromOnly.entries.map((e: Any) => e.targetId)) === j(["w3", "w2"]) && j(toOnly.entries.map((e: Any) => e.targetId)) === j(["w0"]), j({ open: open.total, fromOnly: fromOnly.total, toOnly: toOnly.total }));
    void r0;
  }
});

/* ═══ both stores · the store this child really runs on ══════════════════════════════════════════════ */
section("store · the child runs on the store it names");
await guard("store", async () => {
  const P: Any = await import("../../src/lib/server/prisma.ts");
  ok(`store.1 · the ${STORE} child ${STORE === "postgres" ? "has" : "has no"} database`, P.hasDatabase() === (STORE === "postgres"), `hasDatabase=${P.hasDatabase()}`);
});

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
