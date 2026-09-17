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

/* ═══ §0 · C5 step 4 · ruling 191 (TGT-38) and ruling 197 · no refusal reads a requester; the KYC house figures stay on the officer's server ═══ */

/**
 * The R9 / R2 requester tokens (ruling 191), as identifiers — never a pattern (the vocabulary pin, ruling 175). A service may
 * carry them only as a payload value or the read that produces it; a page may not name the two viewer ones at all; a client
 * control may name none.
 */
export const REQUESTER_TOKENS = ["houseStake", "houseStakes", "staffChosen", "requestedBy", "byRequester", "houseStakeForAudit", "houseStakeByMarket"] as const;
export const PAGE_FORBIDDEN_TOKENS = ["requestedBy", "byRequester"] as const;
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

/** Every identifier-shaped word of a decommented text (strings included: a page that spells a token in a string names it). */
const wordsOf = (code: string): Set<string> => new Set(code.split(/[^A-Za-z0-9_$]+/).filter(Boolean));

/**
 * TGT-38 over one service or action (ruling 191 (1)). A requester value is a token, or a variable bound from an expression
 * that reads one OUTSIDE a nested function (a `withLock` result whose callback reads the stake is not one — its callback
 * returns the decision, not the stake). Reported: a token or such a variable in an if / while / do / for / switch / ternary
 * condition or an `&&` / `||` operand, and in a `return` or on a line that answers `ok: false`.
 */
export function requesterRefusalProblems(file: string, code: string): string[] {
  const sf = parse(file, code);
  const tracked = new Set<string>(REQUESTER_TOKENS);
  const idsIn = (node: ts.Node, intoFunctions: boolean): string[] => {
    const out: string[] = [];
    const go = (m: ts.Node) => {
      if (!intoFunctions && m !== node && ts.isFunctionLike(m)) return;
      if (ts.isIdentifier(m)) out.push(m.text);
      else if (ts.isStringLiteral(m) || ts.isNoSubstitutionTemplateLiteral(m)) out.push(m.text);
      ts.forEachChild(m, go);
    };
    go(node);
    return out;
  };
  const bindNames = (name: ts.BindingName): string[] => (ts.isIdentifier(name) ? [name.text]
    : name.elements.flatMap((e) => (ts.isBindingElement(e) ? bindNames(e.name) : [])));
  for (let grew = true; grew;) {
    grew = false;
    walkTree(sf, (n) => {
      let names: string[] = [];
      let from: ts.Node | null = null;
      if (ts.isVariableDeclaration(n) && n.initializer) { names = bindNames(n.name); from = n.initializer; }
      else if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(n.left)) { names = [n.left.text]; from = n.right; }
      if (!from || !idsIn(from, false).some((t) => tracked.has(t))) return;
      for (const name of names) if (!tracked.has(name)) { tracked.add(name); grew = true; }
    });
  }
  const reads = (node: ts.Node | undefined) => !!node && idsIn(node, true).some((t) => tracked.has(t));
  const problems: string[] = [];
  const say = (what: string, node: ts.Node) => problems.push(`${file}:${sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1}: ${what} ${node.getText(sf).replace(/\s+/g, " ").slice(0, 90)}`);
  walkTree(sf, (n) => {
    if ((ts.isIfStatement(n) || ts.isWhileStatement(n) || ts.isDoStatement(n)) && reads(n.expression)) say("a condition reads a requester value:", n.expression);
    else if (ts.isForStatement(n) && reads(n.condition)) say("a loop condition reads a requester value:", n.condition!);
    else if (ts.isSwitchStatement(n) && reads(n.expression)) say("a switch reads a requester value:", n.expression);
    else if (ts.isConditionalExpression(n) && reads(n.condition)) say("a ternary reads a requester value:", n.condition);
    else if (ts.isBinaryExpression(n) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken].includes(n.operatorToken.kind) && (reads(n.left) || reads(n.right))) say("an && / || operand reads a requester value:", n);
    else if (ts.isReturnStatement(n) && n.expression && /\bok\s*:\s*false\b/.test(n.expression.getText(sf)) && reads(n.expression)) say("a refusal returns a requester value:", n);
  });
  code.split("\n").forEach((line, k) => {
    if (/\bok\s*:\s*false\b/.test(line) && [...wordsOf(line)].some((t) => tracked.has(t))) problems.push(`${file}:${k + 1}: a line that answers ok: false names a requester value`);
  });
  return [...new Set(problems)];
}

/** Ruling 191 (2) and (3): the words a page or a client control names. */
export function requesterNamingProblems(file: string, code: string, forbidden: readonly string[]): string[] {
  const words = wordsOf(code);
  return forbidden.filter((t) => words.has(t)).map((t) => `${file} names ${t}`);
}

/** Ruling 197 · the two KYC house figures, as identifiers. */
export const KYC_HOUSE_FIELDS = ["houseBetCount", "houseStakedTzs"] as const;
export const KYC_RISK_MODULE = "src/lib/server/kyc-risk.ts";
export const KYC_CASE_PAGE = "src/app/admin/kyc/[id]/page.tsx";
const isClientModule = (code: string) => /^\s*["']use client["']/.test(code);

/**
 * Ruling 197's field-reader pin over `{rel, code}` files (decommented): `houseBetCount` / `houseStakedTzs` are named only in
 * `kyc-risk.ts` and in SERVER modules under `src/app/admin/`, and the KYC case page never hands `moneyFacts` whole (an
 * attribute or a spread) to a component imported from a `"use client"` module.
 */
export function kycHouseFieldProblems(files: Array<{ rel: string; code: string }>): string[] {
  const problems: string[] = [];
  const byRel = new Map(files.map((f) => [f.rel, f.code]));
  for (const { rel, code } of files) {
    const words = wordsOf(code);
    if (!KYC_HOUSE_FIELDS.some((f) => words.has(f))) continue;
    if (rel === KYC_RISK_MODULE) continue;
    if (!rel.startsWith("src/app/admin/")) problems.push(`${rel} reads a KYC house figure outside the officer's console`);
    else if (isClientModule(code)) problems.push(`${rel} is a client module and reads a KYC house figure`);
  }
  const page = byRel.get(KYC_CASE_PAGE);
  if (page != null) {
    const sf = parse(KYC_CASE_PAGE, page);
    const imported = new Map<string, string>();
    walkTree(sf, (n) => {
      if (!ts.isImportDeclaration(n) || !ts.isStringLiteral(n.moduleSpecifier)) return;
      const clause = n.importClause;
      const names = [...(clause?.name ? [clause.name.text] : []),
        ...(clause?.namedBindings && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements.map((e) => e.name.text) : [])];
      for (const name of names) imported.set(name, resolveSpec(KYC_CASE_PAGE, n.moduleSpecifier.text));
    });
    const clientTarget = (tag: string) => {
      const target = imported.get(tag.split(".")[0]);
      if (!target) return false;
      const code = byRel.get(`${target}.tsx`) ?? byRel.get(`${target}.ts`) ?? byRel.get(`${target}/index.tsx`) ?? null;
      return code != null && isClientModule(code);
    };
    walkTree(sf, (n) => {
      const element = ts.isJsxAttribute(n) || ts.isJsxSpreadAttribute(n) ? n.parent?.parent : null;
      if (!element || !(ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element))) return;
      const whole = ts.isJsxSpreadAttribute(n) ? n.expression
        : n.initializer && ts.isJsxExpression(n.initializer) ? n.initializer.expression : undefined;
      if (whole && ts.isIdentifier(whole) && whole.text === "moneyFacts" && clientTarget(element.tagName.getText(sf))) {
        problems.push(`${KYC_CASE_PAGE} passes moneyFacts whole to the client component ${element.tagName.getText(sf)}`);
      }
    });
  }
  return problems;
}

if (STORE === "memory") {
  section("§0 · C5 step 4 · ruling 191 (TGT-38: no refusal, page condition or client control reads a requester) and ruling 197 (the KYC house figures' readers)");
  await guard("0.step4", async () => {
    const files = srcFiles().map((rel) => ({ rel, code: decomment(read(rel)) }));
    const codeOf = (rel: string) => files.find((f) => f.rel === rel)?.code ?? null;
    const missing = [...TGT38_SERVICES, ...TGT38_PAGES, ...TGT38_CONTROLS].filter((rel) => codeOf(rel) == null);
    const writers = ["src/lib/server/market-service.ts", "src/lib/server/objections-service.ts", "src/app/admin/resolver-queue/bulk-resolve-action.ts"]
      .map((rel) => (codeOf(rel) ?? "").split("houseStakeForAudit(").length - 1);
    ok("0.191.0 · the population is real: all 21 files are read, and the pin sees R9's readers in the writers (market-service 2, objections-service 2, the bulk action 1)",
      missing.length === 0 && j(writers) === j([2, 2, 1]), j({ missing, writers }));
    const services = TGT38_SERVICES.flatMap((rel) => requesterRefusalProblems(rel, codeOf(rel) ?? ""));
    ok("0.191.1 · ⛔ TGT-38 · no service or action reads houseStake, staffChosen, requestedBy or their readers in a condition or a refusal", services.length === 0, services.join(" · "));
    const pages = TGT38_PAGES.flatMap((rel) => requesterNamingProblems(rel, codeOf(rel) ?? "", PAGE_FORBIDDEN_TOKENS));
    ok("0.191.2 · ⛔ no decision page names requestedBy or byRequester (the viewer comparison lives only in exposure-copy.ts)", pages.length === 0, pages.join(" · "));
    const controls = TGT38_CONTROLS.flatMap((rel) => requesterNamingProblems(rel, codeOf(rel) ?? "", REQUESTER_TOKENS));
    ok("0.191.3 · ⛔ the four client controls and the ceremony name none of the requester tokens", controls.length === 0, controls.join(" · "));

    const objections = (codeOf("src/lib/server/objections-service.ts") ?? "").split("\r\n").join("\n");
    const plantedService = objections.replace("  await db.objection.update(objectionId, {\n    status: \"REJECTED\",",
      "  const snap = await houseStakeForAudit(o.marketId);\n  const chose = snap?.staffChosen.requestedBy.includes(officerId);\n  if (chose) return { ok: false, error: \"You chose a stake on this market.\", code: \"CONFLICT\" };\n  await db.objection.update(objectionId, {\n    status: \"REJECTED\",");
    const plantedDirect = "export async function seal(me: string) {\n  const view = await houseStakeByMarket([id]);\n  return view.get(id)!.staffChosen.requestedBy.includes(me) ? { ok: false, code: \"CONFLICT\" } : { ok: true };\n}";
    const queuePage = codeOf("src/app/admin/resolver-queue/page.tsx") ?? "";
    const plantedPage = `${queuePage}\nexport function Gate({ view, session, canResolve }: Any) {\n  const chosenByMe = view.staffChosen.requestedBy.includes(session.userId);\n  return canResolve && !chosenByMe ? null : null;\n}`;
    const plantedControl = `${codeOf("src/app/admin/markets/emergency-void-control.tsx") ?? ""}\nexport function Line({ houseStake }: { houseStake: number }) { return houseStake; }`;
    ok("0.191.c1 · CONTROL · a planted refusal branch in rejectObjection reading requestedBy is reported, and so is a refusing ternary on the reader",
      plantedService !== objections && requesterRefusalProblems("src/lib/server/objections-service.ts", plantedService).length >= 2
        && requesterRefusalProblems("src/planted.ts", plantedDirect).length >= 1, j(requesterRefusalProblems("src/lib/server/objections-service.ts", plantedService)));
    ok("0.191.c2 · CONTROL · a planted `canResolve && !chosenByMe` in the queue page (chosenByMe read from requestedBy) is reported, and a client control naming houseStake is",
      requesterNamingProblems("src/app/admin/resolver-queue/page.tsx", plantedPage, PAGE_FORBIDDEN_TOKENS).length === 1
        && requesterNamingProblems("src/app/admin/markets/emergency-void-control.tsx", plantedControl, REQUESTER_TOKENS).length === 1);
    const benign = "export async function voidIt(m: Any) {\n  const result = await withLock(key, async () => {\n    const houseStake = await houseStakeForAudit(m.id, \"market.emergency_void\");\n    audit({ action: \"x\", payload: { reason, houseStake } });\n    return { ok: true as const };\n  });\n  if (!result.ok) return { ok: false, error: \"no\" };\n  return result;\n}";
    ok("0.191.c3 · CONTROL · a payload value read inside a lock whose result a refusal then checks is NOT reported, nor are the words in a comment",
      requesterRefusalProblems("src/planted.ts", benign).length === 0
        && requesterRefusalProblems("src/planted.ts", decomment(`${benign}\n// if (houseStake.staffChosen.requestedBy.includes(me)) return { ok: false };`)).length === 0,
      j(requesterRefusalProblems("src/planted.ts", benign)));

    const kyc = kycHouseFieldProblems(files);
    const risk = codeOf(KYC_RISK_MODULE) ?? "";
    const pageCode = codeOf(KYC_CASE_PAGE) ?? "";
    ok("0.197.0 · the population is real: kyc-risk.ts declares and counts both house figures, and the KYC case page is read",
      KYC_HOUSE_FIELDS.every((f) => risk.split(f).length - 1 >= 3) && pageCode.includes("kycMoneyFacts(txns)"), j(KYC_HOUSE_FIELDS.map((f) => risk.split(f).length - 1)));
    ok("0.197.1 · ⛔ houseBetCount / houseStakedTzs are read only in kyc-risk.ts and server modules under src/app/admin/, and the case page never passes moneyFacts whole to a client component",
      kyc.length === 0, kyc.join(" · "));
    const plantedPlayer = [...files, { rel: "src/app/wallet/house-line.tsx", code: "export function L({ facts }: Any) { return facts.houseBetCount; }" }];
    const plantedClient = [...files, { rel: "src/app/admin/kyc/[id]/house-chip.tsx", code: "\"use client\";\nexport function C({ f }: Any) { return f.houseStakedTzs; }" }];
    const railLine = "<KycDecisionRail";
    const plantedPass = files.map((f) => (f.rel === KYC_CASE_PAGE ? { rel: f.rel, code: f.code.replace(railLine, `${railLine} moneyFacts={moneyFacts}`) } : f));
    const benignRead = files.map((f) => (f.rel === KYC_CASE_PAGE ? { rel: f.rel, code: `${f.code}\nexport function HouseLine({ moneyFacts }: Any) { return <span>{moneyFacts.houseBetCount}</span>; }` } : f));
    ok("0.197.c1 · CONTROL · a planted player-side reader, a planted client reader under admin, and moneyFacts passed whole to KycDecisionRail are each reported; the server page reading the field is not",
      kycHouseFieldProblems(plantedPlayer).length === 1 && kycHouseFieldProblems(plantedClient).length === 1
        && pageCode.includes(railLine) && kycHouseFieldProblems(plantedPass).length === 1 && kycHouseFieldProblems(benignRead).length === 0,
      j({ player: kycHouseFieldProblems(plantedPlayer), client: kycHouseFieldProblems(plantedClient), pass: kycHouseFieldProblems(plantedPass), benign: kycHouseFieldProblems(benignRead) }));
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

    // C5 step 3 verification · every stake above is YES, so a side the store or the fold spells wrong could not show. The
    // Up & Down FILL h1 is the fixture's one marked NO stake (a WIN once its round settles, below it is already settled).
    const udRows = await call(book.stakeRows?.bind(book), [udMarket]);
    const udView = await call(EXP.houseStakeByMarket, [udMarket]);
    ok("1.179.16 · a marked NO stake (the Up & Down FILL, settled WIN): the store's row says NO and settled, and the view puts 2,000 in no and in settledTzs",
      j(Array.isArray(udRows) ? udRows.map((r: Any) => [r.side, r.open, r.staffChosen, r.kind, r.stakeTzs]) : udRows) === j([["NO", false, false, "FILL", 2_000]])
        && j(udView instanceof Map ? udView.get(udMarket) : udView) === j({ yes: 0, no: 2_000, openTzs: 0, settledTzs: 2_000, staffChosen: { yes: 0, no: 0, requestedBy: [], byRequester: {} } }),
      j({ udRows, udView: udView instanceof Map ? udView.get(udMarket) : udView }));
    // The fold itself, over rows no fixture can place (a staff-chosen NO stake, a target whose creator is unknown): pure.
    const row = (o: Any) => ({ marketId: "mkt_fold", side: "YES", open: true, staffChosen: false, kind: "FILL", requestedById: null, targetId: null, targetCreatedById: null, stakeTzs: 0, ...o });
    const folded = typeof EXP.foldHouseStakes === "function" ? EXP.foldHouseStakes(["mkt_fold", "mkt_empty"], [
      row({ side: "NO", open: false, staffChosen: true, kind: "COUNTER", targetId: "hbt_b", targetCreatedById: "usr_b", stakeTzs: 4_000 }),
      row({ side: "NO", staffChosen: true, kind: "MANUAL", requestedById: "usr_a", stakeTzs: 1_000 }),
      row({ staffChosen: true, kind: "MANUAL", requestedById: "usr_a", stakeTzs: 500 }),
      row({ stakeTzs: 300 }),
      row({ staffChosen: true, kind: "COUNTER", targetId: "hbt_gone", targetCreatedById: null, stakeTzs: 200 }),
      row({ marketId: "mkt_not_asked", staffChosen: true, kind: "MANUAL", requestedById: "usr_c", stakeTzs: 9_000 }),
    ]) : null;
    ok("1.179.17 · foldHouseStakes (pure): sides, open and settled, staff-chosen per side, requesters sorted with their summed amounts; a target with no known creator counts with no requester; an id not asked for is dropped; an asked id with no row is the zero view",
      folded instanceof Map && folded.size === 2 && !folded.has("mkt_not_asked")
        && j(folded.get("mkt_fold")) === j({ yes: 1_000, no: 5_000, openTzs: 2_000, settledTzs: 4_000, staffChosen: { yes: 700, no: 5_000, requestedBy: ["usr_a", "usr_b"], byRequester: { usr_a: 1_500, usr_b: 4_000 } } })
        && j(folded.get("mkt_empty")) === j({ yes: 0, no: 0, openTzs: 0, settledTzs: 0, staffChosen: { yes: 0, no: 0, requestedBy: [], byRequester: {} } }),
      j(folded instanceof Map ? Object.fromEntries(folded) : folded));
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

    // C5 step 3 verification · the book's other two ranges and its per-product open exposure, which no case read.
    const nowNow = Date.now();
    const markedOf = async (botId: string) => ((await w.mdal.positionStore.values()) as Any[]).filter((p) => p.houseBotId === botId);
    const s1Marked = await markedOf(S1.botId), tMarked = await markedOf(T.botId);
    const todayKey = CLOCK.eatDayKey(nowNow);
    const s1Life = await call(BOOK.houseBotBook, { houseBotId: S1.botId, range: "lifetime", nowMs: nowNow });
    const s1Today = await call(BOOK.houseBotBook, { houseBotId: S1.botId, range: "today", nowMs: nowNow });
    const tToday = await call(BOOK.houseBotBook, { houseBotId: T.botId, range: "today", nowMs: nowNow });
    const tTodayWant = tMarked.filter((p) => CLOCK.eatDayKey(Date.parse(p.placedAt)) === todayKey).length;
    ok("1.180.7 · houseBotBook's ranges: S1's lifetime holds all 5 of its marked stakes (placed in 2025-03), its EAT today none; bot T's today holds the stakes placed today",
      s1Marked.length === 5 && s1Life?.bets === 5 && s1Today?.bets === 0 && tTodayWant >= 6 && tToday?.bets === tTodayWant,
      j({ s1Life: s1Life?.bets, s1Today: s1Today?.bets, tToday: tToday?.bets, tTodayWant }));
    const s1OpenWant = s1Marked.filter((p) => p.status === "OPEN").reduce((s, p) => s + Number(p.stake), 0);
    const s1Mkt = await call(BOOK.houseBotBook, { houseBotId: S1.botId, range: { monthKey: MK }, productLine: "MARKET", nowMs: nowNow });
    const s1Ud = await call(BOOK.houseBotBook, { houseBotId: S1.botId, range: { monthKey: MK }, productLine: "UPDOWN", nowMs: nowNow });
    ok("1.180.8 · open exposure per product: S1's MARKET open stake is every OPEN marked stake it holds (the FILL and the planted no-intent 7,000), its UPDOWN 0, and with no product the same as MARKET",
      s1OpenWant === 8_000 && s1Mkt?.openExposureTzs === s1OpenWant && s1Ud?.openExposureTzs === 0 && s1Life?.openExposureTzs === s1OpenWant,
      j({ want: s1OpenWant, market: s1Mkt?.openExposureTzs, updown: s1Ud?.openExposureTzs, all: s1Life?.openExposureTzs }));
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

  // C5 step 3 verification · the branches and bounds no fixture above decides.
  const s1Ud = await feeOf(S1.botId, P, "UPDOWN");
  ok("2.8 · the CASHOUT fee is reported under its own product only: S1's UPDOWN fee is 0 while its MARKET fee carries the 100",
    s1Ud?.feeWithheldTzs === 0 && s1Market?.feeWithheldTzs === m1Fee + 100, j({ updown: s1Ud?.feeWithheldTzs, market: s1Market?.feeWithheldTzs }));
  const l1Payout = payoutOf(l1h.positionId);
  const edgeIn = await call(book.feeInputs?.bind(book), { fromIso: l1Payout?.createdAt, toIso: new Date(Date.parse(l1Payout?.createdAt) + 1).toISOString(), houseBotId: F1.botId });
  const edgeOut = await call(book.feeInputs?.bind(book), { fromIso: new Date(Date.parse(l1Payout?.createdAt) - 60_000).toISOString(), toIso: l1Payout?.createdAt, houseBotId: F1.botId });
  const hasL1 = (x: Any) => Array.isArray(x?.wins) && x.wins.some((win: Any) => win.positionId === l1h.positionId);
  ok("2.9 · feeInputs' window is [from, to) on the payout's own instant: a window starting at it holds the L1 WIN, one ending at it does not",
    !!l1Payout && hasL1(edgeIn) && Array.isArray(edgeOut?.wins) && !hasL1(edgeOut), j({ at: l1Payout?.createdAt, inWins: edgeIn?.wins?.length, outWins: edgeOut?.wins?.length }));
  if (typeof BOOK.derivedFeeShares === "function") {
    const snap = (await marketOf(m1.market.id)).feeSnapshot;
    const mk = (marketId: string, settledAt: string | null, winnerId: string) => ({
      marketId, productLine: "MARKET", yesPool: 10_000, noPool: 10_000, feeSnapshot: snap, settledAt,
      positions: [{ id: winnerId, side: "YES", status: "WIN", stake: 10_000 }, { id: `${winnerId}_l`, side: "NO", status: "LOSS", stake: 10_000 }],
    });
    const win = (positionId: string, marketId: string) => ({ positionId, houseBotId: "hb_pure", marketId, side: "YES", payoutTxnId: `txn_${positionId}` });
    const pure = BOOK.derivedFeeShares({
      wins: [win("pos_unsettled", "mkt_unsettled"), win("pos_settled", "mkt_settled"), win("pos_lost_market", "mkt_missing")],
      markets: [mk("mkt_unsettled", null, "pos_unsettled"), mk("mkt_settled", "2026-09-01T00:00:00.000Z", "pos_settled")],
      cashOuts: [],
    });
    ok("2.10 · derivedFeeShares (pure): a WIN on a market with no settlement time is null, a WIN whose market was not read is null, the same market settled is its whole single-winner fee",
      pure.get("pos_unsettled") === null && pure.get("pos_lost_market") === null && typeof pure.get("pos_settled") === "number" && pure.get("pos_settled") > 0,
      j(Object.fromEntries(pure)));
  } else ok("2.10 · derivedFeeShares is exported", false);

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
    // The bounds, on each of the three instants: a window starting AT it lists the target, one ending AT it does not.
    const endedRow: Any = await S.targetStore.get(oldEnded.id), removedRow: Any = await S.targetStore.get(oldRemoved.id);
    const bounds: Array<[string, string, string]> = [[fresh.id, "createdAt", fresh.createdAt], [oldEnded.id, "endedAt", endedRow?.endedAt], [oldRemoved.id, "removedAt", removedRow?.removedAt]];
    const edges: Any[] = [];
    for (const [id, col, at] of bounds) {
      const starts = await S.targetStore.listInWindow({ fromIso: at, toIso: later(at, 1), houseBotId: EB.botId, limit: 500 });
      const ends = await S.targetStore.listInWindow({ fromIso: later(at, -1_000), toIso: at, houseBotId: EB.botId, limit: 500 });
      edges.push({ col, at, starts: starts.rows.some((r: Any) => r.id === id), ends: ends.rows.some((r: Any) => r.id === id) });
    }
    ok("1.177.8b · …each of createdAt, endedAt and removedAt is in [from, to): a window starting at the instant lists the target, a window ending at it does not",
      edges.every((e) => typeof e.at === "string" && e.starts === true && e.ends === false), j(edges));
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
    // The two bounds on their own instants: removed AT the window's start overlaps it; designated at the window's end
    // minus nothing is inside a window that ends one millisecond later.
    const atRemoval = await S.houseBotStore.listOverlapping({ fromIso: rx.removedAt, toIso: later(nowIso(), 3_600_000) });
    const liveDesignated = (await S.houseBotStore.get(LIVE.botId)).designatedAt;
    const justAfter = await S.houseBotStore.listOverlapping({ fromIso: "2000-01-01T00:00:00.000Z", toIso: later(liveDesignated, 1) });
    ok("1.177.9b · …a bot removed AT the window's start is listed (removedAt >= from), and a bot designated one millisecond before the window's end is listed (designatedAt < to)",
      atRemoval.some((b: Any) => b.id === RX.botId) && justAfter.some((b: Any) => b.id === LIVE.botId), j({ removedAt: rx?.removedAt, n: [atRemoval.length, justAfter.length] }));
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
    // The bounds on real instants: [the first marked row's time, the last marked row's time) — the rows AT the start are
    // in, the rows AT the end are out (counted from the fixture's own rows, never from the reader).
    const instants = [...new Set(inW.map((t) => Date.parse(t.createdAt)))].sort((a, b) => a - b);
    const lo = instants[0], hi = instants[instants.length - 1];
    const bounded = await S.houseBookStore.ledgerRows({ fromIso: new Date(lo).toISOString(), toIso: new Date(hi).toISOString() });
    const boundedWant = inW.filter((t) => Date.parse(t.createdAt) >= lo && Date.parse(t.createdAt) < hi).length;
    ok("1.177.10b · ledgerRows' window is [from, to) on marked rows' own instants: the rows at the start are counted, the rows at the end are not",
      instants.length >= 3 && boundedWant > 0 && bounded.reduce((s: number, r: Any) => s + r.count, 0) === boundedWant
        && inW.some((t) => Date.parse(t.createdAt) === lo) && inW.some((t) => Date.parse(t.createdAt) === hi),
      j({ got: bounded.reduce((s: number, r: Any) => s + r.count, 0), want: boundedWant, instants: instants.length }));

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
    // Its bounds on the holder's own row instants, the same way: at the start in, at the end out.
    const holderAt = [...new Set(mine.map((t) => Date.parse(t.createdAt)))].sort((a, b) => a - b);
    const hLo = holderAt[0], hHi = holderAt[holderAt.length - 1];
    const hBounded = await S.houseBookStore.txnPageForUser({ userId: holder, marked: "any", fromIso: new Date(hLo).toISOString(), toIso: new Date(hHi).toISOString(), limit: 500 });
    const hWant = mine.filter((t) => Date.parse(t.createdAt) >= hLo && Date.parse(t.createdAt) < hHi).length;
    ok("1.177.13b · …txnPageForUser's window is [from, to) on the holder's own instants: rows at the start are in, rows at the end are out, and the total agrees",
      holderAt.length >= 3 && hWant > 0 && hBounded.total === hWant && hBounded.rows.length === hWant, j({ got: hBounded.total, want: hWant, instants: holderAt.length }));
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

/* ═══ §3 · C5 step 4 · rulings 170, 178, 187–190 · R9: the house stake every money decision records (both stores) ═══════ */
// ⭐ WHAT IS REAL AND WHAT STANDS IN. Every stake below is claimed and placed through the real seam, every decision is the
// product's own service call (resolveMarket, emergencyVoidMarket, rejectObjection, upholdObjection, holdSettlementAsOfficer,
// adminReopenMarket, resolveDueMarket, voidRoundByOperator) and every audit row is read back from the chain. The one place a
// stand-in is unavoidable is the bulk action: it is a "use server" action whose session gate (`softRequireStaff`) and
// `revalidatePath` need a Next.js request, which a case child has none of. Those two imports — and, for the abort case only, a
// verdict that throws for ONE named market (a switch on globalThis, off otherwise) — are stood in FOR THAT ONE FILE through
// Node's module hooks. Every store, lock, seal, audit and house read beneath the action is the product's.
// ⭐ THE READ SPY. `houseBookStore.stakeRows` is wrapped for this section only: each call records the market ids, the `tx` it
// was handed (never one, ruling 179) and the statuses of those markets' positions AS THE CALLER'S OWN TRANSACTION SEES THEM —
// so an emergency void's read is proven to happen before its refunds on Postgres too, where a pool read cannot tell.
const R34: Any = { ready: false };
section("§3 · rulings 187–190 · R9: six payload sites in one shape, the Batch map, null on a failed read, oversight's requester, and the officer's own export (170)");
await guard("3.R9", async () => {
  const { loadWorld, OFFICER }: Any = await import("./house-bot-world.mts");
  const w: Any = await loadWorld();
  const msg = (e: unknown) => String((e as Error)?.message ?? e);
  const EXP: Any = await import("../../src/lib/server/house-bot/exposure.ts");
  const OV: Any = await import("../../src/lib/server/house-bot/oversight.ts");
  const OBJ: Any = await import("../../src/lib/server/objections-service.ts");
  const AUD: Any = await import("../../src/lib/server/audit.ts");
  const POL: Any = await import("../../src/lib/server/resolution-policy.ts");
  const LOCKS: Any = await import("../../src/lib/server/locks.ts");
  const { exportUserData }: Any = await import("../../src/lib/server/user-service.ts");
  if (!(await w.db.user.findById(OFFICER))) await w.user({ id: OFFICER, role: "ADMIN" });
  await w.limits();
  await w.switchOn();
  process.env.EMAIL_OUTBOX_CAPTURE = "1";
  const sectionStart = Date.now();
  const tag = `${process.pid}_${sectionStart % 1_000_000}`;
  const G = globalThis as Any;

  // ── people, bots, stakes ──
  const staff = async (role: string, name: string) => {
    const id = await w.user({ role });
    await w.setUserFields(id, { email: `r9-${name}-${tag}@example.test` });
    return id;
  };
  const A = await staff("ADMIN", "a"), B = await staff("ADMIN", "b"), C = await staff("ADMIN", "c"), MOD = await staff("MODERATOR", "m");
  const show = (r: Any) => (r?.ok ? "ok" : `${r?.code ?? "?"}/${r?.error ?? r?.reason ?? "no-reason"}`);
  const bet = async (marketId: string, side: "YES" | "NO", stake: number, age = 10_000) => {
    const player = await w.user({ balance: 2_000_000 });
    const r = await w.svc.buyPosition(player, { marketId, side, stake, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`fixture player bet refused: ${show(r)}`);
    if (age > 0) await w.backdate(r.data.positionId, age);
    return { player, positionId: r.data.positionId as string };
  };
  // One bot per market (a second bot on a market is refused, OTHER_BOT); the bots take turns across markets, so no bot
  // reaches its staff-chosen daily cap.
  const bots = [await w.bot(), await w.bot(), await w.bot(), await w.bot()];
  const botOf = new Map<string, Any>();
  let turn = 0;
  const botFor = (marketId: string) => {
    if (!botOf.has(marketId)) botOf.set(marketId, bots[turn++ % bots.length]);
    return botOf.get(marketId);
  };
  const house = async (marketId: string, o: Any, b: Any = botFor(marketId)) => {
    await w.ageHouseMinute();
    const intent = await w.intent(b, marketId, o);
    const r = await w.place(b, intent);
    if (!r.ok) throw new Error(`fixture house stake refused (${o.kind}): ${show(r)}`);
    // Oversight's fold counts a stake finished STRICTLY before a decision's audit instant (ruling 178), and the audit is
    // stamped on this process's clock: wait until that clock has passed the stake's own finish, never a guessed delay.
    const finishedAt = (await w.dal.houseBotIntentStore.get(intent.id))?.finishedAt;
    const at = finishedAt ? Date.parse(finishedAt) : Date.now();
    while (Date.now() <= at) await new Promise((resolve) => setImmediate(resolve));
    return { intent, positionId: r.data.positionId as string, bot: b };
  };
  const manualA = async (marketId: string) => {
    await bet(marketId, "YES", 20_000);
    return house(marketId, { kind: "MANUAL", entryCondition: "THIN", requestedById: A, anchorKey: w.constants.manualAnchorKey(A, crypto.randomUUID()), side: "NO", stakeTzs: 9_000 });
  };
  const reactionB = async (marketId: string) => {
    const trigger = await bet(marketId, "NO", 10_000);
    const b = botFor(marketId);
    const t = await w.dal.targetStore.insert({
      id: w.dal.newHouseId("target"), houseBotId: b.botId, marketId, delayMinSec: 10, delayMaxSec: 10, timingFrom: "STAKE", reactTo: "EVERY",
      createdById: B, snapshot: { titleEn: "House seam poll", category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 },
    });
    const placed = await house(marketId, { kind: "COUNTER", triggerPositionId: trigger.positionId, triggerUserId: trigger.player, targetId: t.id, decision: { reactTo: "EVERY" }, side: "YES", stakeTzs: 6_000 }, b);
    return { ...placed, trigger };
  };
  const poll = async () => w.poll({ graceMin: 0 });
  const shape = (yes: number, no: number, scYes: number, scNo: number, by: string[]) => ({ yes, no, staffChosen: { yes: scYes, no: scNo, requestedBy: [...by].sort() } });
  const ZERO = shape(0, 0, 0, 0, []);
  const S_A = shape(0, 9_000, 0, 9_000, [A]);
  const S_B = shape(6_000, 0, 6_000, 0, [B]);
  // ⚠️ "Both on one market" is A's Enter now and B's reaction on the SAME side: the seam refuses a second bot on a market
  // (OTHER_BOT) and one bot on both sides of it (OPPOSITE_SIDE), so A's NO beside B's YES cannot be placed (C5 step 4).
  const S_AB = shape(15_000, 0, 15_000, 0, [A, B]);

  // ── the read spy ──
  const book = w.dal.houseBookStore;
  const realStakeRows = book.stakeRows;
  const reads: Array<{ ids: string[]; tx: unknown; statuses: string[] }> = [];
  book.stakeRows = async function spiedStakeRows(ids: string[], tx?: unknown) {
    let statuses: string[] = [];
    try {
      if (w.onPostgres) {
        const client: Any = LOCKS.currentLockTx() ?? w.prisma();
        statuses = ((await client.$queryRawUnsafe(`SELECT "status"::text AS "s" FROM "Position" WHERE "marketId" = ANY($1::text[]) ORDER BY "id"`, ids)) as Any[]).map((r) => r.s);
      } else {
        for (const id of ids) for (const p of await w.mdal.positionStore.listForMarket(id)) statuses.push(p.status);
      }
    } catch (e) { statuses = [`status read failed: ${msg(e)}`]; }
    reads.push({ ids: [...ids], tx, statuses });
    return realStakeRows.call(this, ids, tx);
  };
  const readsDuring = async (fn: () => Promise<Any>) => { const from = reads.length; const out = await fn(); return { out, reads: reads.slice(from) }; };

  // ── the bulk action, with its request-scope imports stood in (see the header) ──
  const nodeModule: Any = await import("node:module");
  const { pathToFileURL, fileURLToPath: fromFileUrl }: Any = await import("node:url");
  const requireHere = nodeModule.createRequire(join(ROOT, "package.json"));
  const BULK_KEY = { officer: Symbol.for("50pick.cases.bulkOfficer"), abortOn: Symbol.for("50pick.cases.bulkAbortOn") };
  const standIn = (name: string, exportsObject: unknown): string => {
    const filename = fromFileUrl(pathToFileURL(join(ROOT, "scripts", "lib", "case-stand-ins", name)).href);
    const mod = new nodeModule.default(filename);
    Object.assign(mod, { filename, loaded: true, exports: exportsObject });
    requireHere.cache[filename] = mod;
    return pathToFileURL(filename).href;
  };
  const realVerdict: Any = requireHere(join(ROOT, "src", "lib", "server", "bulk-resolve-eligibility.ts"));
  const REDIRECT: Record<string, string> = {
    "next/cache": standIn("next-cache.cjs", { revalidatePath() { /* no request, nothing to revalidate */ } }),
    "@/lib/server/rbac-guard": standIn("rbac-guard.cjs", {
      async softRequireStaff() { const id = G[BULK_KEY.officer]; return id ? { ok: true, userId: id, sessionId: "case" } : { ok: false, error: "no case officer" }; },
    }),
    "@/lib/server/bulk-resolve-eligibility": standIn("bulk-resolve-eligibility.cjs", {
      ...realVerdict,
      bulkVerdictFor(args: Any) {
        if (G[BULK_KEY.abortOn] != null && args.market.id === G[BULK_KEY.abortOn]) throw new Error("case abort: the batch stops at this market");
        return realVerdict.bulkVerdictFor(args);
      },
    }),
  };
  const ACTION_FILE = "/src/app/admin/resolver-queue/bulk-resolve-action.ts";
  const hooks = nodeModule.registerHooks({
    resolve(specifier: string, context: Any, nextResolve: Any) {
      if (String(context?.parentURL ?? "").endsWith(ACTION_FILE) && REDIRECT[specifier]) return { url: REDIRECT[specifier], shortCircuit: true };
      return nextResolve(specifier, context);
    },
  });
  const BULK: Any = await import("../../src/app/admin/resolver-queue/bulk-resolve-action.ts");
  const bulk = async (by: string, ids: string[], overrides: Record<string, string> = {}) => {
    const fd = new FormData();
    for (const id of ids) fd.append("marketIds", id);
    for (const [id, reason] of Object.entries(overrides)) fd.append(`override:${id}`, reason);
    G[BULK_KEY.officer] = by;
    try { return await BULK.bulkResolveMarketsAction(fd); } finally { G[BULK_KEY.officer] = null; }
  };
  const closeWithRead = (marketId: string, confidence: number) => w.mdal.marketStore.stamp(marketId, {
    status: "CLOSED", sentinelOutcome: "YES", sentinelConfidence: confidence, sentinelEvidence: "The official bulletin confirms the YES outcome today.",
    sentinelSourceUrl: "https://bot.go.tz/bulletin", sentinelDetermined: true, sentinelClosedAt: new Date().toISOString(),
  });
  const OVERRIDE = "Checked the bulletin by hand; the outcome is confirmed.";

  // ── readers ──
  const ringRows = async (targetType: string, targetId: string, action: string): Promise<Any[]> => {
    await AUD.auditFlush();
    return (AUD.getAuditForTarget(targetType, targetId, 500) as Any[]).filter((e) => e.action === action);
  };
  const durableRows = async (targetType: string, targetId: string, action: string): Promise<Any[]> =>
    ((await AUD.getAuditForTargetDurable(targetType, targetId, { limit: 500 })).entries as Any[]).filter((e) => e.action === action);
  const sortKeys = (v: unknown): unknown => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object"
    ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, sortKeys((v as Record<string, unknown>)[k])])) : v);
  const canon = (v: unknown) => JSON.stringify(sortKeys(v));
  const sinceIso = () => new Date(Date.now() - 30 * 86_400_000).toISOString();
  const foldAt = async (marketId: string, createdAtIso: string): Promise<string[] | null> => {
    const stakes = ((await w.dal.houseBotIntentStore.staffChosenPlacedSince({ sinceIso: sinceIso(), limit: 500 })) as Any[]).filter((s) => s.marketId === marketId);
    const creatorOf = new Map<string, string | null>();
    for (const s of stakes) if (s.targetId != null && !creatorOf.has(s.targetId)) creatorOf.set(s.targetId, (await w.dal.targetStore.get(s.targetId))?.createdById ?? null);
    return typeof OV.requestedByBefore === "function" ? OV.requestedByBefore(stakes, createdAtIso, creatorOf) : null;
  };
  const TODAY_KEYS: Record<string, string[]> = {
    "market.adjudicated": ["outcome", "resolutionAuth", "soloResolved", "yesPool", "noPool", "grossPool", "stage1By", "stage2By", "sourceUrl", "evidence", "objectionsClosedAt", "objectionWindowHours", "settlement"],
    "market.emergency_void": ["reason", "refundedCount", "refundedTzs", "grossPoolBefore", "title"],
    "objection.rejected": ["objectionId", "objectorId", "reason", "note", "effect"],
    "objection.upheld": ["objectionId", "objectorId", "reason", "remedy", "previousOutcome", "newOutcome", "note", "objectionsClosedAt", "note2"],
    "market.resolve.bulk_override": ["batchId", "reason", "blockedBy", "allBlockReasons", "outcome", "stage", "confidence", "threshold", "citedSourceUrl", "approvedSourceUrl", "sentinelEvidence", "yesPool", "noPool", "grossPool", "note"],
  };
  const R9_MARKET_ACTIONS = Object.keys(TODAY_KEYS);
  const BATCH_KEYS = ["batchId", "requireTwoOfficer", "attempted", "selection", "overrides", "resolved", "staged", "alreadyApplied", "skipped", "failed", "note"];
  const ABORT_KEYS = ["batchId", "aborted", "error", "attempted", "selection", "resolved", "staged", "alreadyApplied", "skipped", "note"];
  const UNCHANGED_ACTIONS = ["market.resolve.stage1", "market.reopened", "market.autoresolved", "objection.closed_by_void", "objection.officer_hold", "updown.round.void_operator"];
  /** One Market row's R9 facts: the ring row keeps today's keys in order with `houseStake` LAST and exactly the shape at both levels; the durable row carries the same value. */
  const r9Row = async (marketId: string, action: string, pick: (e: Any) => boolean, want: Any) => {
    const ring = (await ringRows("Market", marketId, action)).filter(pick);
    const durable = (await durableRows("Market", marketId, action)).filter(pick);
    const row = ring[0];
    const keys = Object.keys(row?.payload ?? {});
    const inner = row?.payload?.houseStake;
    const exact = ring.length === 1 && durable.length === 1 && j(keys) === j([...TODAY_KEYS[action], "houseStake"]) && j(inner) === j(want)
      && (want === null ? inner === null : j(Object.keys(inner ?? {})) === j(["yes", "no", "staffChosen"]) && j(Object.keys(inner?.staffChosen ?? {})) === j(["yes", "no", "requestedBy"]))
      && "houseStake" in (durable[0]?.payload ?? {}) && canon(durable[0].payload.houseStake) === canon(want)
      && canon(Object.keys(durable[0].payload).sort()) === canon([...TODAY_KEYS[action], "houseStake"].sort());
    return { row, durable: durable[0], exact, detail: j({ ring: ring.length, durable: durable.length, keys, inner, durableStake: durable[0]?.payload?.houseStake }) };
  };
  try {
    // ════ adjudicate (resolveMarket) ════
    const mAB = await poll();
    const pY = await bet(mAB.id, "NO", 20_000);
    await house(mAB.id, { kind: "MANUAL", entryCondition: "THIN", requestedById: A, anchorKey: w.constants.manualAnchorKey(A, crypto.randomUUID()), side: "YES", stakeTzs: 9_000 });
    const rAB = await reactionB(mAB.id);
    const adjAB = await readsDuring(() => w.svc.resolveMarket({ marketId: mAB.id, outcome: "YES", officerId: A }));
    const aAB = await r9Row(mAB.id, "market.adjudicated", () => true, S_AB);
    ok("3.187.1 · ⭐ market.adjudicated on a market with A's YES 9,000 and a reaction on B's target YES 6,000: today's keys in order, houseStake LAST, exactly {yes, no, staffChosen: {yes, no, requestedBy}} = [A, B] sorted",
      adjAB.out?.ok === true && aAB.exact, aAB.detail);
    ok("3.178.1 · requestedBy equals oversight's own fold at the row's instant — the CHOOSER (A) decided it",
      !!aAB.row && j(aAB.row.payload.houseStake?.staffChosen?.requestedBy) === j(await foldAt(mAB.id, aAB.row?.createdAt)) && aAB.row?.actorId === A && [A, B].includes(aAB.row?.actorId), j(aAB.row?.payload?.houseStake));
    ok("3.188.1 · the adjudication read once, for its own market, on no transaction (the pool client)",
      adjAB.reads.length === 1 && j(adjAB.reads[0].ids) === j([mAB.id]) && adjAB.reads[0].tx === undefined, j(adjAB.reads));

    const mA = await poll();
    const pA1 = await bet(mA.id, "YES", 5_000);
    await manualA(mA.id);
    const adjA = await w.svc.resolveMarket({ marketId: mA.id, outcome: "NO", officerId: C });
    const aA = await r9Row(mA.id, "market.adjudicated", () => true, S_A);
    ok("3.187.2 · A's NO 9,000 alone → requestedBy [A]; decided by C, who chose nothing", adjA?.ok === true && aA.exact, aA.detail);
    ok("3.178.2 · …and requestedBy equals oversight's fold for a NON-chooser too (C is not in it)",
      !!aA.row && j(aA.row.payload.houseStake?.staffChosen?.requestedBy) === j(await foldAt(mA.id, aA.row?.createdAt)) && aA.row?.actorId === C && !(aA.row?.payload?.houseStake?.staffChosen?.requestedBy ?? [C]).includes(C), j(aA.row?.payload));

    const m0 = await poll();
    await bet(m0.id, "YES", 5_000);
    await bet(m0.id, "NO", 3_000);
    const adj0 = await w.svc.resolveMarket({ marketId: m0.id, outcome: "YES", officerId: A });
    const a0 = await r9Row(m0.id, "market.adjudicated", () => true, ZERO);
    ok("3.187.3 · a market with no marked position records the ZERO shape — a read that found nothing, the key present", adj0?.ok === true && a0.exact, a0.detail);

    // refusals and stage-1 make no read
    const again = await readsDuring(() => w.svc.resolveMarket({ marketId: mAB.id, outcome: "YES", officerId: B }));
    ok("3.188.2 · a REFUSED adjudication (already resolved) makes no read", again.out?.ok === false && again.reads.length === 0, j({ out: again.out, reads: again.reads }));
    const st = await poll();
    await manualA(st.id);
    const stT = await poll();
    await bet(stT.id, "YES", 20_000);
    await bet(stT.id, "NO", 9_000);
    await POL.setRequireTwoOfficerResolution(true, A);
    let stage1: Any, sameOfficer: Any, stage1T: Any, countersigned: Any;
    try {
      stage1 = await readsDuring(() => w.svc.resolveMarket({ marketId: st.id, outcome: "YES", officerId: A }));
      sameOfficer = await readsDuring(() => w.svc.resolveMarket({ marketId: st.id, outcome: "YES", officerId: A }));
      stage1T = await w.svc.resolveMarket({ marketId: stT.id, outcome: "YES", officerId: A });
      countersigned = await readsDuring(() => w.svc.resolveMarket({ marketId: st.id, outcome: "YES", officerId: B }));
    } finally {
      await POL.setRequireTwoOfficerResolution(false, A);
    }
    ok("3.188.3 · a two-admin STAGE-1 attestation makes no read, and the same officer's refused second call makes none either",
      stage1.out?.ok === true && stage1.out.data?.stage === "stage1" && stage1.reads.length === 0 && sameOfficer.out?.ok === false && sameOfficer.reads.length === 0,
      j({ stage1: stage1.out, s1reads: stage1.reads.length, same: sameOfficer.out, sameReads: sameOfficer.reads.length }));
    const aSt = await r9Row(st.id, "market.adjudicated", () => true, S_A);
    ok("3.188.4 · …the countersignature (B) reads once and records the shape", countersigned.out?.ok === true && countersigned.reads.length === 1 && aSt.exact, aSt.detail);

    // ════ emergency void ════
    const mB = await poll();
    const rB = await reactionB(mB.id);
    const refusedRole = await readsDuring(() => w.svc.emergencyVoidMarket({ marketId: mB.id, officerId: MOD, reason: "Moderators may not void" }));
    const refusedShort = await readsDuring(() => w.svc.emergencyVoidMarket({ marketId: mB.id, officerId: C, reason: "no" }));
    const REASON_B = `Source withdrawn ${tag} B`;
    const voidB = await readsDuring(() => w.svc.emergencyVoidMarket({ marketId: mB.id, officerId: C, reason: REASON_B }));
    const vB = await r9Row(mB.id, "market.emergency_void", () => true, S_B);
    ok("3.187.4 · B's target reaction YES 6,000 → requestedBy [B] on market.emergency_void, today's keys in order and houseStake LAST", voidB.out?.ok === true && vB.exact, vB.detail);
    ok("3.178.3 · …equal to oversight's fold, decided by a NON-chooser (C)",
      !!vB.row && vB.row?.actorId === C && j(vB.row.payload.houseStake?.staffChosen?.requestedBy) === j(await foldAt(mB.id, vB.row?.createdAt)), j(vB.row?.payload));
    ok("3.188.5 · ⭐ the void read its stake BEFORE the refunds: once, on no transaction, while its own transaction still saw every position OPEN; a refused void (a moderator, a two-letter reason) read nothing",
      voidB.reads.length === 1 && voidB.reads[0].tx === undefined && voidB.reads[0].statuses.length === 2 && voidB.reads[0].statuses.every((s) => s === "OPEN")
        && refusedRole.out?.ok === false && refusedRole.reads.length === 0 && refusedShort.out?.ok === false && refusedShort.reads.length === 0,
      j({ reads: voidB.reads, refusedRole: refusedRole.out, refusedShort: refusedShort.out }));

    const mB2 = await poll();
    await bet(mB2.id, "NO", 20_000);
    const fill = await house(mB2.id, { kind: "FILL", side: "YES", stakeTzs: 2_000 });
    const rB2 = await reactionB(mB2.id);
    const pB2 = await bet(mB2.id, "YES", 5_000);
    const m0v = await poll();
    const pT = await bet(m0v.id, "YES", 5_000);
    await bet(m0v.id, "NO", 3_000);
    await w.setUserFields(pB2.player, { email: `r9-ph-${tag}@example.test` });
    await w.setUserFields(pT.player, { email: `r9-pt-${tag}@example.test` });
    const EM: Any = await import("../../src/lib/server/email.ts");
    EM.clearEmailOutbox();
    const REASON_TWIN = `Publisher retracted the source ${tag}`;
    const voidB2 = await w.svc.emergencyVoidMarket({ marketId: mB2.id, officerId: B, reason: REASON_TWIN });
    const vB2 = await r9Row(mB2.id, "market.emergency_void", () => true, shape(8_000, 0, 6_000, 0, [B]));
    ok("3.187.5 · the same reaction beside an automatic FILL YES 2,000: yes 8,000, staff-chosen YES 6,000 only (the FILL has no requester), [B]", voidB2?.ok === true && vB2.exact, vB2.detail);
    ok("3.178.4 · …decided by the CHOOSER (B), equal to oversight's fold",
      !!vB2.row && vB2.row?.actorId === B && j(vB2.row.payload.houseStake?.staffChosen?.requestedBy) === j(await foldAt(mB2.id, vB2.row?.createdAt)), j(vB2.row?.payload));
    const void0 = await w.svc.emergencyVoidMarket({ marketId: m0v.id, officerId: A, reason: REASON_TWIN });
    const v0 = await r9Row(m0v.id, "market.emergency_void", () => true, ZERO);
    ok("3.187.6 · a void with no house stake records the zero shape", void0?.ok === true && v0.exact, v0.detail);
    await w.svc.settleMarket(m0.id, { force: true });
    const refusedSettled = await readsDuring(() => w.svc.emergencyVoidMarket({ marketId: m0.id, officerId: A, reason: "Settled already, refuse" }));
    ok("3.188.6 · a void refused because the market already settled reads nothing", refusedSettled.out?.ok === false && refusedSettled.reads.length === 0, j(refusedSettled.out));

    // ════ objections: rejected and upheld ════
    const detail = "The official source says otherwise, please look again.";
    const o1 = await OBJ.fileObjection(rAB.trigger.player, { marketId: mAB.id, reason: "WRONG_OUTCOME", detail });
    const o2 = await OBJ.fileObjection(pY.player, { marketId: mAB.id, reason: "SOURCE_CONTRADICTS", detail });
    const o3 = await OBJ.fileObjection(pA1.player, { marketId: mA.id, reason: "WRONG_OUTCOME", detail });
    const pA2 = (await w.svc.listPositionsForMarket(mA.id)).find((p: Any) => p.houseBotId == null && p.userId !== pA1.player && p.side === "YES");
    const o4 = await OBJ.fileObjection(pA2?.userId, { marketId: mA.id, reason: "WRONG_OUTCOME", detail });
    if (![o1, o2, o3, o4].every((o) => o?.ok)) throw new Error(`fixture objections: ${[o1, o2, o3, o4].map(show).join(" · ")}`);
    const rej1 = await readsDuring(() => OBJ.rejectObjection(o1.data.objectionId, C, "The recorded verdict stands on the source."));
    const x1 = await r9Row(mAB.id, "objection.rejected", (e) => e.payload?.objectionId === o1.data.objectionId, S_AB);
    ok("3.187.7 · objection.rejected: today's keys in order, houseStake LAST, [A, B]", rej1.out?.ok === true && rej1.reads.length === 1 && x1.exact, x1.detail);
    ok("3.178.5 · …equal to oversight's fold, rejected by a NON-chooser (C)",
      !!x1.row && x1.row?.actorId === C && j(x1.row.payload.houseStake?.staffChosen?.requestedBy) === j(await foldAt(mAB.id, x1.row?.createdAt)));
    const up2 = await readsDuring(() => OBJ.upholdObjection(o2.data.objectionId, B, { remedy: "REVERSE", note: "The source contradicts the verdict." }));
    const u2 = await r9Row(mAB.id, "objection.upheld", (e) => e.payload?.objectionId === o2.data.objectionId, S_AB);
    ok("3.187.8 · objection.upheld: today's keys in order, houseStake LAST, [A, B]", up2.out?.ok === true && up2.reads.length === 1 && u2.exact, u2.detail);
    ok("3.178.6 · …equal to oversight's fold, upheld by the CHOOSER (B)",
      !!u2.row && u2.row?.actorId === B && j(u2.row.payload.houseStake?.staffChosen?.requestedBy) === j(await foldAt(mAB.id, u2.row?.createdAt)));
    const rej3 = await OBJ.rejectObjection(o3.data.objectionId, A, "The recorded verdict stands on the source.");
    const x3 = await r9Row(mA.id, "objection.rejected", (e) => e.payload?.objectionId === o3.data.objectionId, S_A);
    ok("3.178.7 · a rejection by the CHOOSER (A): [A], equal to oversight's fold",
      rej3?.ok === true && x3.exact && x3.row?.actorId === A && j(x3.row?.payload?.houseStake?.staffChosen?.requestedBy) === j(await foldAt(mA.id, x3.row?.createdAt)), x3.detail);
    const up4 = await OBJ.upholdObjection(o4.data.objectionId, C, { remedy: "VOID", note: "Nobody can tell; refund everyone." });
    const u4 = await r9Row(mA.id, "objection.upheld", (e) => e.payload?.objectionId === o4.data.objectionId, S_A);
    ok("3.178.8 · an uphold by a NON-chooser (C): [A], equal to oversight's fold",
      up4?.ok === true && u4.exact && u4.row?.actorId === C && j(u4.row?.payload?.houseStake?.staffChosen?.requestedBy) === j(await foldAt(mA.id, u4.row?.createdAt)), u4.detail);
    const rejAgain = await readsDuring(() => OBJ.rejectObjection(o1.data.objectionId, B, "A second answer to the same case."));
    const upAgain = await readsDuring(() => OBJ.upholdObjection(o2.data.objectionId, C, { remedy: "VOID", note: "A second answer to the same case." }));
    const hold = await OBJ.holdSettlementAsOfficer(C, { marketId: mAB.id, reason: "WRONG_OUTCOME", detail: "Holding while the source is read again." });
    const selfReview = hold?.ok ? await readsDuring(() => OBJ.rejectObjection(hold.data.objectionId, C, "Releasing my own hold myself.")) : { out: hold, reads: [] };
    ok("3.188.7 · refused rulings read nothing: a second rejection, a second uphold, and an officer ruling on their own hold",
      rejAgain.out?.ok === false && rejAgain.reads.length === 0 && upAgain.out?.ok === false && upAgain.reads.length === 0 && selfReview.out?.ok === false && selfReview.reads.length === 0,
      j({ rejAgain: rejAgain.out, upAgain: upAgain.out, selfReview: selfReview.out }));

    // ════ bulk: the override rows and the Batch map ════
    const b1 = await poll(); await manualA(b1.id); await closeWithRead(b1.id, 99);
    const b0 = await poll(); await bet(b0.id, "YES", 5_000); await bet(b0.id, "NO", 3_000); await closeWithRead(b0.id, 99);
    const bo = await poll(); await reactionB(bo.id); await closeWithRead(bo.id, 5);
    const sk = await poll(); await manualA(sk.id); await closeWithRead(sk.id, 5);
    const batch1 = await readsDuring(() => bulk(A, [b1.id, b0.id, bo.id, sk.id], { [bo.id]: OVERRIDE }));
    const out1 = batch1.out;
    const batchRow1 = (await ringRows("Batch", out1?.batchId ?? "none", "market.resolve.bulk"))[0];
    const batchDurable1 = (await durableRows("Batch", out1?.batchId ?? "none", "market.resolve.bulk"))[0];
    const want1 = { [b1.id]: S_A, [b0.id]: ZERO, [bo.id]: S_B };
    ok("3.189.1 · ⭐ the Batch row (A's batch: two eligible, one overridden, one skipped) carries today's keys and then houseStakes: exactly resolved ∪ staged, keyed by market — the skipped row absent",
      out1?.ok === true && j(out1.resolved.map((r: Any) => r.marketId).sort()) === j([b1.id, b0.id, bo.id].sort()) && out1.skipped.some((s: Any) => s.marketId === sk.id)
        && j(Object.keys(batchRow1?.payload ?? {})) === j([...BATCH_KEYS, "houseStakes"]) && canon(batchRow1.payload.houseStakes) === canon(want1)
        && canon(batchDurable1?.payload?.houseStakes) === canon(want1) && !("houseStake" in batchRow1.payload),
      j({ out: out1 && { resolved: out1.resolved, skipped: out1.skipped, failed: out1.failed }, payload: batchRow1?.payload }));
    const ov1 = await r9Row(bo.id, "market.resolve.bulk_override", () => true, S_B);
    ok("3.189.2 · the override row (targetType Market) carries houseStake with the plain shape, LAST, never houseStakes; its value equals the Batch map's value for that market",
      ov1.exact && !("houseStakes" in (ov1.row?.payload ?? {})) && j(ov1.row?.payload?.houseStake) === j(batchRow1?.payload?.houseStakes?.[bo.id]), ov1.detail);
    ok("3.178.9 · …its requestedBy equals oversight's fold, overridden by a NON-chooser (A, for B's stake)",
      !!ov1.row && ov1.row?.actorId === A && j(ov1.row?.payload?.houseStake?.staffChosen?.requestedBy) === j(await foldAt(bo.id, ov1.row?.createdAt)));
    const perMarket = (id: string) => batch1.reads.filter((r) => r.ids.includes(id)).length;
    ok("3.188.8 · the bulk action reads once per sealed market inside `if (r.ok)` (beside resolveMarket's own read), and never for the skipped row",
      perMarket(b1.id) === 2 && perMarket(b0.id) === 2 && perMarket(bo.id) === 2 && perMarket(sk.id) === 0 && batch1.reads.every((r) => r.tx === undefined), j(batch1.reads.map((r) => r.ids)));
    const bo2 = await poll(); await reactionB(bo2.id); await closeWithRead(bo2.id, 5);
    const out2 = await bulk(B, [bo2.id], { [bo2.id]: OVERRIDE });
    const ov2 = await r9Row(bo2.id, "market.resolve.bulk_override", () => true, S_B);
    ok("3.178.10 · an override by the CHOOSER (B): [B], equal to oversight's fold",
      out2?.ok === true && ov2.exact && ov2.row?.actorId === B && j(ov2.row?.payload?.houseStake?.staffChosen?.requestedBy) === j(await foldAt(bo2.id, ov2.row?.createdAt)), ov2.detail);

    const s1 = await poll(); await manualA(s1.id); await closeWithRead(s1.id, 99);
    await POL.setRequireTwoOfficerResolution(true, A);
    let batch3: Any;
    try { batch3 = await readsDuring(() => bulk(A, [s1.id])); } finally { await POL.setRequireTwoOfficerResolution(false, A); }
    const batchRow3 = (await ringRows("Batch", batch3.out?.batchId ?? "none", "market.resolve.bulk"))[0];
    ok("3.189.3 · a STAGED batch (two-admin on): the map covers the staged market, and only the action read (resolveMarket's stage-1 made none)",
      batch3.out?.ok === true && j(batch3.out.staged.map((r: Any) => r.marketId)) === j([s1.id]) && canon(batchRow3?.payload?.houseStakes) === canon({ [s1.id]: S_A })
        && batch3.reads.filter((r) => r.ids.includes(s1.id)).length === 1, j({ out: batch3.out?.staged, payload: batchRow3?.payload, reads: batch3.reads.length }));

    const x1m = await poll(); await manualA(x1m.id); await closeWithRead(x1m.id, 99);
    const x2m = await poll(); await manualA(x2m.id); await closeWithRead(x2m.id, 99);
    G[BULK_KEY.abortOn] = x2m.id;
    let out4: Any;
    try { out4 = await bulk(A, [x1m.id, x2m.id]); } finally { G[BULK_KEY.abortOn] = null; }
    const batchRows4 = await ringRows("Batch", out4?.batchId ?? "none", "market.resolve.bulk");
    const batchDurable4 = await durableRows("Batch", out4?.batchId ?? "none", "market.resolve.bulk");
    ok("3.189.4 · ⭐ an ABORTED batch: one Batch row only, marked aborted, today's abort keys and then houseStakes covering exactly what was sealed before the abort",
      out4?.ok === true && j(out4.resolved.map((r: Any) => r.marketId)) === j([x1m.id]) && out4.failed.some((f: Any) => f.marketId === "(batch)")
        && batchRows4.length === 1 && batchDurable4.length === 1 && batchRows4[0].payload.aborted === true
        && j(Object.keys(batchRows4[0].payload)) === j([...ABORT_KEYS, "houseStakes"]) && canon(batchRows4[0].payload.houseStakes) === canon({ [x1m.id]: S_A })
        && canon(batchDurable4[0].payload.houseStakes) === canon({ [x1m.id]: S_A }),
      j({ out: out4 && { resolved: out4.resolved, failed: out4.failed }, rows: batchRows4.map((r) => r.payload) }));

    // ════ ruling 190 · a failed read records null and the decision proceeds ════
    const logged: string[] = [];
    const realError = console.error;
    const nA = await poll(); const pN1 = await bet(nA.id, "YES", 5_000); await manualA(nA.id);
    const pN2 = (await w.svc.listPositionsForMarket(nA.id)).find((p: Any) => p.houseBotId == null && p.userId !== pN1.player && p.side === "YES");
    const nV = await poll(); await reactionB(nV.id);
    const n1 = await poll(); await manualA(n1.id); await closeWithRead(n1.id, 5);
    let nulls: Any = {};
    const flagSet = typeof EXP.failExposureReadForCases === "function";
    if (flagSet) EXP.failExposureReadForCases(true);
    console.error = (...args: unknown[]) => { logged.push(args.map(String).join(" ")); };
    try {
      nulls.adj = await w.svc.resolveMarket({ marketId: nA.id, outcome: "YES", officerId: C });
      const oa = await OBJ.fileObjection(pN1.player, { marketId: nA.id, reason: "WRONG_OUTCOME", detail });
      const ob = await OBJ.fileObjection(pN2?.userId, { marketId: nA.id, reason: "WRONG_OUTCOME", detail });
      nulls.rej = oa?.ok ? await OBJ.rejectObjection(oa.data.objectionId, B, "The recorded verdict stands on the source.") : oa;
      nulls.up = ob?.ok ? await OBJ.upholdObjection(ob.data.objectionId, B, { remedy: "VOID", note: "Refund everyone on this one." }) : ob;
      nulls.oa = oa; nulls.ob = ob;
      nulls.void = await w.svc.emergencyVoidMarket({ marketId: nV.id, officerId: A, reason: `Flagged read void ${tag}` });
      nulls.bulk = await bulk(C, [n1.id], { [n1.id]: OVERRIDE });
    } finally {
      console.error = realError;
      if (flagSet) EXP.failExposureReadForCases(false);
    }
    const nAdj = await r9Row(nA.id, "market.adjudicated", () => true, null);
    const nRej = await r9Row(nA.id, "objection.rejected", (e) => e.payload?.objectionId === nulls.oa?.data?.objectionId, null);
    const nUp = await r9Row(nA.id, "objection.upheld", (e) => e.payload?.objectionId === nulls.ob?.data?.objectionId, null);
    const nVoid = await r9Row(nV.id, "market.emergency_void", () => true, null);
    const nOv = await r9Row(n1.id, "market.resolve.bulk_override", () => true, null);
    const nBatch = (await ringRows("Batch", nulls.bulk?.batchId ?? "none", "market.resolve.bulk"))[0];
    ok("3.190.1 · ⭐ with the read failing, each of the five writers and the bulk action still decides (ok) and records houseStake: null with the key present — never a zero shape; the Batch map's value is null",
      flagSet && nulls.adj?.ok === true && nulls.rej?.ok === true && nulls.up?.ok === true && nulls.void?.ok === true && nulls.bulk?.ok === true
        && nAdj.exact && nRej.exact && nUp.exact && nVoid.exact && nOv.exact
        && !!nBatch && "houseStakes" in nBatch.payload && nBatch.payload.houseStakes[n1.id] === null && n1.id in nBatch.payload.houseStakes,
      j({ nulls: Object.fromEntries(Object.entries(nulls).map(([k, v]: Any) => [k, show(v)])), adj: nAdj.detail, rej: nRej.detail, up: nUp.detail, void: nVoid.detail, ov: nOv.detail, batch: nBatch?.payload?.houseStakes }));
    ok("3.190.2 · …each failed read logs the market and the action it was for (and nothing else identifying)",
      [[nA.id, "market.adjudicated"], [nA.id, "objection.rejected"], [nA.id, "objection.upheld"], [nV.id, "market.emergency_void"], [n1.id, "market.resolve.bulk"]]
        .every(([id, action]) => logged.some((l) => l.includes(id) && l.includes(action))), j(logged.filter((l) => l.includes("[house-stake]"))));
    ok("3.190.c1 · CONTROL · the same writers with the flag off gave the exact shapes above (3.187.1–8, 3.189.1–4), and the flag is off again: a read now succeeds",
      aAB.exact && vB.exact && x1.exact && u2.exact && ov1.exact && j(await EXP.houseStakeForAudit?.(mAB.id)) !== "null", j(await EXP.houseStakeForAudit?.(mAB.id)));

    // ════ the six sites R9 leaves byte-identical, each against a no-house twin ════
    const MASK = new Set(["objectionId", "marketId", "objectionsClosedAt"]);
    const masked = (p: Any) => j(Object.fromEntries(Object.entries(p ?? {}).map(([k, v]) => [k, MASK.has(k) ? "(masked)" : v])));
    const twinRows: Array<{ action: string; house: Any; twin: Any }> = [];
    const pushTwin = async (action: string, targetType: string, houseId: string, twinId: string) => {
      twinRows.push({ action, house: (await ringRows(targetType, houseId, action))[0], twin: (await ringRows(targetType, twinId, action))[0] });
    };
    await pushTwin("market.resolve.stage1", "Market", st.id, stT.id);
    const ro = await poll(); await manualA(ro.id); await w.mdal.marketStore.stamp(ro.id, { status: "CLOSED" });
    const roT = await poll(); await bet(roT.id, "YES", 20_000); await bet(roT.id, "NO", 9_000); await w.mdal.marketStore.stamp(roT.id, { status: "CLOSED" });
    const reopened = [await w.svc.adminReopenMarket(ro.id, C), await w.svc.adminReopenMarket(roT.id, C)];
    await pushTwin("market.reopened", "Market", ro.id, roT.id);
    const au = await poll(); await manualA(au.id);
    const auT = await poll(); await bet(auT.id, "YES", 20_000); await bet(auT.id, "NO", 9_000);
    const assessment = (marketId: string) => ({ marketId, title: "House seam poll", determined: true, outcome: "YES", confidence: 99,
      evidence: "The official bulletin confirms the YES outcome today.", reasoning: "Read from the approved source.", sourceUrl: "https://bot.go.tz/bulletin", action: "assessed" });
    for (const m of [au, auT]) await w.mdal.marketStore.stamp(m.id, { resolutionMode: "auto" });
    const autos = [await w.svc.resolveDueMarket(au.id, { assessment: assessment(au.id) }), await w.svc.resolveDueMarket(auT.id, { assessment: assessment(auT.id) })];
    await pushTwin("market.autoresolved", "Market", au.id, auT.id);
    const hv = await poll(); await manualA(hv.id);
    const hvT = await poll(); await bet(hvT.id, "YES", 20_000); await bet(hvT.id, "NO", 9_000);
    const holdVoid: Any[] = [];
    for (const m of [hv, hvT]) {
      holdVoid.push(await w.svc.resolveMarket({ marketId: m.id, outcome: "YES", officerId: A }));
      holdVoid.push(await OBJ.holdSettlementAsOfficer(C, { marketId: m.id, reason: "WRONG_OUTCOME", detail: "Holding while the source is read again." }));
      holdVoid.push(await w.svc.emergencyVoidMarket({ marketId: m.id, officerId: B, reason: `Hold then void ${tag}` }));
    }
    await pushTwin("objection.officer_hold", "Market", hv.id, hvT.id);
    await pushTwin("objection.closed_by_void", "Market", hv.id, hvT.id);
    const round = async (label: string, withHouse: boolean) => {
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
      const marketId = (await udd.roundStore.get(opened.data.id)).marketId as string;
      // Both rounds' stakes lock on placement (no exit window), as §1's round does, so the house FILL's condition holds.
      const snapshot = { ...((await w.svc.getMarket(marketId)).feeSnapshot as Record<string, unknown>), freeExitGraceMinutes: 0, paidExitWindowMinutes: 0 };
      if (w.onPostgres) await w.prisma().$executeRawUnsafe(`UPDATE "PredictionMarket" SET "feeSnapshot" = $1::jsonb WHERE "id" = $2`, JSON.stringify(snapshot), marketId);
      else (await w.mdal.marketStore.get(marketId)).feeSnapshot = structuredClone(snapshot);
      await bet(marketId, "YES", 50_000, 60_000);
      if (withHouse) await house(marketId, { kind: "FILL", productLine: "UPDOWN", side: "NO", stakeTzs: 2_000 });
      else await bet(marketId, "NO", 2_000, 0);
      return { roundId: opened.data.id as string, marketId, voided: await uds.voidRoundByOperator(opened.data.id, C, `Operator void ${tag}`) };
    };
    const rdH = await round("r9h", true), rdT = await round("r9t", false);
    await pushTwin("updown.round.void_operator", "UpDownRound", rdH.roundId, rdT.roundId);
    const r9Words = (p: unknown) => [...REQUESTER_TOKENS].filter((t) => j(p).includes(t));
    const twinBad = twinRows.filter((t) => !t.house || !t.twin || j(Object.keys(t.house.payload ?? {})) !== j(Object.keys(t.twin.payload ?? {})) || masked(t.house.payload) !== masked(t.twin.payload) || r9Words(t.house.payload).length > 0);
    ok("3.187.9 · ⭐ the six sites R9 leaves alone — stage-1, reopened, autoresolved, officer hold, closed by void, the operator's round void — are byte-identical to a no-house twin (keys in order, values with ids and times masked) and carry no R9 key",
      reopened.every((r) => r?.ok) && autos.every((r) => r?.status === "resolved-auto") && holdVoid.every((r) => r?.ok) && rdH.voided?.ok && rdT.voided?.ok && stage1T?.ok
        && twinRows.length === 6 && twinBad.length === 0,
      j({ reopened: reopened.map(show), autos, holdVoid: holdVoid.map(show), rd: [show(rdH.voided), show(rdT.voided)], bad: twinBad.map((t) => ({ action: t.action, house: t.house?.payload, twin: t.twin?.payload })) }));

    // ════ where each key may live ════
    await AUD.auditFlush();
    const sectionRows = (AUD.getAuditPage({ limit: 10_000 }) as Any[]).filter((e) => Date.parse(e.createdAt) >= sectionStart - 1);
    const has = (e: Any, k: string) => !!e.payload && typeof e.payload === "object" && k in e.payload;
    const withStake = sectionRows.filter((e) => has(e, "houseStake"));
    const stakesRows = sectionRows.filter((e) => has(e, "houseStakes"));
    ok("3.187.10 · ⭐ exactly six payload sites changed: houseStake appears only on Market rows of the five R9 actions and on EVERY such row; houseStakes only on market.resolve.bulk Batch rows and on every one; no row of the six unchanged actions carries either",
      withStake.length > 0 && withStake.every((e) => e.targetType === "Market" && R9_MARKET_ACTIONS.includes(e.action)) && new Set(withStake.map((e) => e.action)).size === 5
        && sectionRows.filter((e) => R9_MARKET_ACTIONS.includes(e.action)).every((e) => has(e, "houseStake"))
        && stakesRows.length >= 5 && stakesRows.every((e) => e.targetType === "Batch" && e.action === "market.resolve.bulk")
        && sectionRows.filter((e) => e.action === "market.resolve.bulk").every((e) => has(e, "houseStakes"))
        && UNCHANGED_ACTIONS.every((a) => sectionRows.filter((e) => e.action === a).length >= 2)
        && sectionRows.filter((e) => UNCHANGED_ACTIONS.includes(e.action)).every((e) => !has(e, "houseStake") && !has(e, "houseStakes")),
      j({ stakeActions: [...new Set(withStake.map((e) => `${e.targetType}:${e.action}`))], stakesActions: [...new Set(stakesRows.map((e) => `${e.targetType}:${e.action}`))], unchanged: UNCHANGED_ACTIONS.map((a) => sectionRows.filter((e) => e.action === a).length) }));

    // ════ ruling 170 · the officer's own export ════
    const exp = await exportUserData(A);
    const expRows = exp.auditEntries.entries as Any[];
    const ringA = sectionRows.filter((e) => e.actorId === A);
    const DECISIONS = ["market.adjudicated", "market.emergency_void", "objection.rejected", "market.resolve.bulk", "market.resolve.bulk_override"];
    ok("3.170.1 · CONTROL · the /admin/audit rows for A's decisions keep houseStake and houseStakes whole",
      DECISIONS.every((a) => ringA.some((e) => e.action === a)) && ringA.some((e) => has(e, "houseStake")) && ringA.some((e) => has(e, "houseStakes")), j(ringA.map((e) => e.action)));
    ok("3.170.2 · ⛔ D19 · A's own export keeps those decisions and has no houseStake or houseStakes key — and no vocabulary word — at any depth",
      DECISIONS.every((a) => expRows.some((e) => e.action === a)) && !expRows.some((e) => has(e, "houseStake") || has(e, "houseStakes")) && houseHits(j(exp)).length === 0,
      j({ hits: houseHits(j(exp)).slice(0, 6), actions: [...new Set(expRows.map((e) => e.action))] }));

    Object.assign(R34, { ready: true, w, A, B, C, MOD, tag, mB, mB2, m0v, nV, pB2, pT, rB, rB2, fill, REASON_B, REASON_TWIN, vB, vB2, v0, nVoid, sectionStart });
  } finally {
    book.stakeRows = realStakeRows;
    G[BULK_KEY.abortOn] = null;
    G[BULK_KEY.officer] = null;
    hooks.deregister?.();
  }
});

/* ═══ §4 · C5 step 4 · rulings 195, 197 · the void notice's house share and the KYC figures, server side (both stores) ═══ */
// The emergency voids of §3 (mB: one house position; mB2: a house reaction and a FILL beside a player; m0v: no house stake;
// nV: voided while the read failed) are read here from the bells and the captured mail. "Today's" words are written out
// below from the templates as they stood at 34468728, and the two letters' bytes are pinned by hash (app URL masked), so a
// no-house void is compared with the past — not with the code under test.
section("§4 · rulings 195, 197 · the void notice's house share equals the audit's stake; a no-house void's bell and email and every player's are today's bytes; the KYC house figures");
await guard("4.S4", async () => {
  if (!R34.ready) { ok("4.0 · §3's R9 fixture was built", false, "§3.R9 threw before its fixture was ready"); return; }
  const { w, A, B, C, MOD, tag, mB, mB2, m0v, nV, pB2, pT, rB, rB2, fill, REASON_B, REASON_TWIN, vB, vB2, v0, nVoid } = R34;
  const { createHash } = await import("node:crypto");
  const N: Any = await import("../../src/lib/server/notification-service.ts");
  const E: Any = await import("../../src/lib/server/email.ts");
  const APP: Any = await import("../../src/lib/app-url.ts");
  const U: Any = await import("../../src/lib/utils.ts");
  const load = async (rel: string): Promise<Any> => { try { return await import(rel); } catch { return {}; } };
  const XC = await load("../../src/lib/house-bot/exposure-copy.ts");
  const money = U.formatTzs;
  const TITLE = "House seam poll";
  const bells = async (userId: string, pred: (n: Any) => boolean) => {
    for (let k = 0; k < 2_000; k++) {
      const found = ((await N.listForUser(userId, 200)) as Any[]).filter(pred);
      if (found.length > 0) return found;
      await new Promise((r) => setTimeout(r, 5));
    }
    return [] as Any[];
  };
  const mails = async (to: string, pred: (m: Any) => boolean) => {
    for (let k = 0; k < 2_000; k++) {
      const found = (E.emailOutbox() as Any[]).filter((m) => m.to === to && pred(m));
      if (found.length > 0) return found;
      await new Promise((r) => setTimeout(r, 5));
    }
    return [] as Any[];
  };
  const bellOf = (n: Any) => j({ kind: n?.kind, titleEn: n?.titleEn, titleSw: n?.titleSw, titleZh: n?.titleZh, bodyEn: n?.bodyEn, bodySw: n?.bodySw, bodyZh: n?.bodyZh, href: n?.href });
  /** The admin bell exactly as `notifyAdminMarketCancelled` wrote it at 34468728. */
  const todayAdminBell = (o: { reason: string; refundedCount: number; refundedTzs: number }) => j({
    kind: "SECURITY",
    titleEn: `Market cancelled · ${o.refundedCount} refunded`,
    titleSw: `Soko limefutwa · ${o.refundedCount} wamerejeshewa`,
    titleZh: `市场已取消 · ${o.refundedCount} 人已退款`,
    bodyEn: `"${TITLE}" was emergency-voided — ${money(o.refundedTzs)} refunded to ${o.refundedCount} ${o.refundedCount === 1 ? "player" : "players"}. Reason: ${o.reason.slice(0, 100)}`,
    bodySw: `Soko limefutwa kwa dharura. ${money(o.refundedTzs)} imerejeshwa.`,
    bodyZh: `"${TITLE}" 已紧急作废 — 已向 ${o.refundedCount} 位玩家退款 ${money(o.refundedTzs)}。原因：${o.reason.slice(0, 100)}`,
    href: "/admin/markets",
  });
  /** The same bell with ruling 195's clause, as this step writes it. */
  const houseAdminBell = (o: { reason: string; refundedCount: number; refundedTzs: number; houseTzs: number; houseCount: number }) => j({
    kind: "SECURITY",
    titleEn: `Market cancelled · ${o.refundedCount} refunded`,
    titleSw: `Soko limefutwa · ${o.refundedCount} wamerejeshewa`,
    titleZh: `市场已取消 · ${o.refundedCount} 人已退款`,
    bodyEn: `"${TITLE}" was emergency-voided — ${money(o.refundedTzs)} refunded to ${o.refundedCount} ${o.refundedCount === 1 ? "player" : "players"}, of which house stakes ${money(o.houseTzs)} on ${o.houseCount} ${o.houseCount === 1 ? "position" : "positions"}. Reason: ${o.reason.slice(0, 100)}`,
    bodySw: `Soko limefutwa kwa dharura. ${money(o.refundedTzs)} imerejeshwa, ikiwemo dau la nyumba ${money(o.houseTzs)} kwenye nafasi ${o.houseCount}.`,
    bodyZh: `"${TITLE}" 已紧急作废 — 已向 ${o.refundedCount} 位玩家退款 ${money(o.refundedTzs)}，其中平台投注 ${money(o.houseTzs)}（${o.houseCount} 笔）。原因：${o.reason.slice(0, 100)}`,
    href: "/admin/markets",
  });
  /** The player's bell exactly as `notifyMarketCancelled` wrote it at 34468728. */
  const todayPlayerBell = (o: { reason: string; stake: number; positionId: string }) => j({
    kind: "DEPOSIT",
    titleEn: `Market cancelled · ${money(o.stake)} refunded`,
    titleSw: `Soko limefutwa · ${money(o.stake)} imerejeshwa`,
    titleZh: `市场已取消 · 已退款 ${money(o.stake)}`,
    bodyEn: `"${TITLE}" was cancelled: ${o.reason.slice(0, 120)}. Your full stake has been returned to your wallet. · ${o.positionId}`,
    bodySw: `"Soko la jaribio" limefutwa: ${o.reason.slice(0, 120)}. Dau lako lote limerejeshwa kwenye pochi yako. · ${o.positionId}`,
    bodyZh: `"${TITLE}" 已取消：${o.reason.slice(0, 120)}。您的本金已全额退回钱包。 · ${o.positionId}`,
    href: "/wallet",
  });
  const hashOf = (html: string) => createHash("sha256").update(String(html).split(APP.appUrl()).join("{APP}")).digest("hex");
  /** sha256 of the two letters at 34468728 for a fixed input, the app URL masked (measured before this step's code). */
  const TODAY_ADMIN_LETTER = "85de53540c8663e83f8dc7f4ba15ec7dedf88723b673bc3a526ce5d3bef5edd2";
  const TODAY_REFUND_LETTER = "7ffbec83881b693f022123c8b001ab3551ffe65d25dadfba2ae4d4e212a6bae5";
  const FIXED = { title: "R9 fixture poll", reason: "Source retracted by the publisher", refundedCount: 3, refundedTzs: 38_000 };
  const emailOf = async (id: string) => (await w.db.user.findById(id))?.email as string;

  // ── ruling 195 · the house share in the admin bell equals the audit's stake ──
  const officers = [A, B, C, MOD];
  const wantB2 = { reason: REASON_TWIN, refundedCount: 5, refundedTzs: 43_000, houseTzs: 8_000, houseCount: 2 };
  const stakeB2 = vB2.row?.payload?.houseStake;
  const b2Bells = await Promise.all(officers.map((o) => bells(o, (n) => n.bodyEn?.includes(`${money(43_000)} refunded`) && n.bodyEn?.includes(REASON_TWIN))));
  ok("4.195.1 · ⭐ the emergency-void admin bell's house share equals payload.houseStake.yes + no (TZS 8,000 on 2 positions), in en, sw and zh, for every ADMIN, COMPLIANCE and MODERATOR officer",
    stakeB2?.yes + stakeB2?.no === wantB2.houseTzs && b2Bells.every((list) => list.length === 1 && bellOf(list[0]) === houseAdminBell(wantB2)),
    j({ stake: stakeB2, got: b2Bells.map((list) => list.map(bellOf)), want: houseAdminBell(wantB2) }));
  const bBells = await Promise.all(officers.map((o) => bells(o, (n) => n.bodyEn?.includes(REASON_B))));
  const wantB = { reason: REASON_B, refundedCount: 2, refundedTzs: 16_000, houseTzs: 6_000, houseCount: 1 };
  ok("4.195.2 · …one house position: TZS 6,000 on 1 position (singular), equal to its audit's yes + no",
    vB.row?.payload?.houseStake?.yes + vB.row?.payload?.houseStake?.no === 6_000 && bBells.every((list) => list.length === 1 && bellOf(list[0]) === houseAdminBell(wantB)),
    j({ got: bBells.map((list) => list.map(bellOf)), want: houseAdminBell(wantB) }));
  const nVBells = await bells(A, (n) => n.bodyEn?.includes(`Flagged read void ${tag}`));
  ok("4.195.3 · the share is counted in the refund loop, not taken from the read: a void whose read failed (houseStake null) still tells officers TZS 6,000 on 1 position",
    nVoid.row?.payload?.houseStake === null && nVBells.length === 1 && bellOf(nVBells[0]) === houseAdminBell({ reason: `Flagged read void ${tag}`, refundedCount: 2, refundedTzs: 16_000, houseTzs: 6_000, houseCount: 1 }),
    j(nVBells.map(bellOf)));

  // ── a no-house void: today's bell and letter ──
  const zeroBells = await Promise.all(officers.map((o) => bells(o, (n) => n.bodyEn?.includes(`${money(8_000)} refunded`) && n.bodyEn?.includes(REASON_TWIN))));
  ok("4.195.4 · ⭐ a NON-house void's admin bell is byte-identical to today's (all eight fields, for every officer; its audit's zero shape is 3.187.6)",
    !!v0.row && zeroBells.every((list) => list.length === 1 && bellOf(list[0]) === todayAdminBell({ reason: REASON_TWIN, refundedCount: 2, refundedTzs: 8_000 })),
    j({ got: zeroBells.map((list) => list.map(bellOf)), want: todayAdminBell({ reason: REASON_TWIN, refundedCount: 2, refundedTzs: 8_000 }) }));
  const aEmail = await emailOf(A);
  const zeroLetters = await mails(aEmail, (m) => m.tag === "market-cancelled-admin" && m.html.includes(REASON_TWIN) && m.html.includes(money(8_000)) && !m.html.includes(money(43_000)));
  const houseLetters = await mails(aEmail, (m) => m.tag === "market-cancelled-admin" && m.html.includes(REASON_TWIN) && m.html.includes(money(43_000)));
  ok("4.195.5 · ⭐ the NON-house void's admin letter is exactly the no-house render, and that render's bytes are today's (a fixed input's hash, pinned at 34468728)",
    zeroLetters.length === 1 && zeroLetters[0].html === E.marketCancelledAdminHtml({ title: TITLE, reason: REASON_TWIN, refundedCount: 2, refundedTzs: 8_000 })
      && hashOf(E.marketCancelledAdminHtml(FIXED)) === TODAY_ADMIN_LETTER && hashOf(E.marketCancelledAdminHtml({ ...FIXED, houseRefundedTzs: 0, houseRefundedCount: 0 })) === TODAY_ADMIN_LETTER,
    j({ letters: zeroLetters.length, fixed: hashOf(E.marketCancelledAdminHtml(FIXED)) }));
  const rowLabel = "Of which house stakes";
  ok("4.195.6 · the house-held void's admin letter adds exactly one detail row — its figure TZS 8,000 on 2 positions — and is otherwise the no-house render",
    houseLetters.length === 1 && houseLetters[0].html.includes(rowLabel) && houseLetters[0].html.includes(`${money(8_000)} on 2 positions`)
      && houseLetters[0].html === E.marketCancelledAdminHtml({ title: TITLE, reason: REASON_TWIN, refundedCount: 5, refundedTzs: 43_000, houseRefundedTzs: 8_000, houseRefundedCount: 2 })
      && !E.marketCancelledAdminHtml({ title: TITLE, reason: REASON_TWIN, refundedCount: 5, refundedTzs: 43_000 }).includes(rowLabel),
    j({ letters: houseLetters.length }));

  // ── the players' bells and letters, with and without house positions ──
  const refPh = pB2.positionId, refPt = pT.positionId;
  const phBells = await bells(pB2.player, (n) => n.kind === "DEPOSIT" && n.bodyEn?.includes(REASON_TWIN));
  const ptBells = await bells(pT.player, (n) => n.kind === "DEPOSIT" && n.bodyEn?.includes(REASON_TWIN));
  const maskRef = (s: string, ref: string) => s.split(ref).join("{ref}");
  ok("4.195.7 · ⭐ a player's cancellation bell on a house-held market is byte-identical to the same stake's bell on a no-house market, and both are today's words",
    phBells.length === 1 && ptBells.length === 1 && maskRef(bellOf(phBells[0]), refPh) === maskRef(bellOf(ptBells[0]), refPt)
      && bellOf(phBells[0]) === todayPlayerBell({ reason: REASON_TWIN, stake: 5_000, positionId: refPh }) && bellOf(ptBells[0]) === todayPlayerBell({ reason: REASON_TWIN, stake: 5_000, positionId: refPt }),
    j({ house: phBells.map(bellOf), twin: ptBells.map(bellOf) }));
  const holderBells = await bells(rB2.bot.userId, (n) => n.kind === "DEPOSIT" && n.bodyEn?.includes(REASON_TWIN) && (n.bodyEn?.includes(rB2.positionId) || n.bodyEn?.includes(fill.positionId)));
  ok("4.195.8 · …and the HOLDER's bells for the two house stakes (the reaction and the FILL) are any player's bells for those stakes: today's words, no house word",
    holderBells.length === 2 && rB2.bot.botId === fill.bot.botId
      && holderBells.some((n) => bellOf(n) === todayPlayerBell({ reason: REASON_TWIN, stake: 6_000, positionId: rB2.positionId }))
      && holderBells.some((n) => bellOf(n) === todayPlayerBell({ reason: REASON_TWIN, stake: 2_000, positionId: fill.positionId }))
      && holderBells.every((n) => houseHits(bellOf(n)).length === 0),
    j(holderBells.map(bellOf)));
  const phLetters = await mails(await emailOf(pB2.player), (m) => m.tag === "market-cancelled-refund");
  const ptLetters = await mails(await emailOf(pT.player), (m) => m.tag === "market-cancelled-refund");
  ok("4.195.9 · ⭐ the player's refund letter is byte-identical with and without house positions (reference masked), each exactly the template's render, whose bytes are today's",
    phLetters.length === 1 && ptLetters.length === 1 && maskRef(phLetters[0].html, refPh) === maskRef(ptLetters[0].html, refPt)
      && phLetters[0].html === E.marketCancelledRefundHtml({ title: TITLE, reason: REASON_TWIN, amount: 5_000, reference: refPh })
      && hashOf(E.marketCancelledRefundHtml({ title: FIXED.title, reason: FIXED.reason, amount: 5_000, reference: "pos_ref" })) === TODAY_REFUND_LETTER,
    j({ ph: phLetters.length, pt: ptLetters.length }));
  void rB; void fill; void mB; void mB2; void m0v; void nV;

  // ── the clause itself (pure) ──
  const clause = typeof XC.voidNoticeHouseClause === "function" ? XC.voidNoticeHouseClause : null;
  const row = typeof XC.voidEmailHouseRow === "function" ? XC.voidEmailHouseRow : null;
  ok("4.195.10 · the clause (exposure-copy.ts, money injected): one position is singular in English; no share, a zero share or a missing argument gives null; the email row matches",
    !!clause && !!row && j(clause({ houseRefundedTzs: 8_000, houseRefundedCount: 2 }, money)) === j({ en: `, of which house stakes ${money(8_000)} on 2 positions`, sw: `, ikiwemo dau la nyumba ${money(8_000)} kwenye nafasi 2`, zh: `，其中平台投注 ${money(8_000)}（2 笔）` })
      && clause({ houseRefundedTzs: 1_000, houseRefundedCount: 1 }, money)?.en === `, of which house stakes ${money(1_000)} on 1 position`
      && clause({ houseRefundedTzs: 0, houseRefundedCount: 0 }, money) === null && clause(undefined, money) === null && clause({}, money) === null
      && j(row({ houseRefundedTzs: 8_000, houseRefundedCount: 2 }, money)) === j({ label: rowLabel, value: `${money(8_000)} on 2 positions` }) && row({ houseRefundedTzs: 0, houseRefundedCount: 0 }, money) === null,
    j({ clause: clause ? clause({ houseRefundedTzs: 8_000, houseRefundedCount: 2 }, money) : "not built" }));

  // ── ruling 197 · kycMoneyFacts: the house figures ──
  const KR: Any = await import("../../src/lib/server/kyc-risk.ts");
  const kycPoll = async () => w.poll({ graceMin: 0 });
  const kycBet = async (userId: string, marketId: string, side: "YES" | "NO", stake: number) => {
    const r = await w.svc.buyPosition(userId, { marketId, side, stake, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`fixture kyc bet refused: ${r.code}/${r.error}`);
    await w.backdate(r.data.positionId, 10_000);
    return r.data.positionId as string;
  };
  const holder = await w.bot();
  const k1 = await kycPoll(), k2 = await kycPoll(), k3 = await kycPoll();
  await kycBet(holder.userId, k1.id, "YES", 2_000);
  const counter2 = await w.user({ balance: 2_000_000 }), counter3 = await w.user({ balance: 2_000_000 });
  await kycBet(counter2, k2.id, "NO", 10_000);
  await kycBet(counter3, k3.id, "NO", 10_000);
  for (const [m, stake, kind] of [[k2, 3_000, "FILL"], [k3, 1_000, "MANUAL"]] as const) {
    await w.ageHouseMinute();
    const o: Any = kind === "MANUAL"
      ? { kind, entryCondition: "THIN", requestedById: A, anchorKey: w.constants.manualAnchorKey(A, crypto.randomUUID()), side: "YES", stakeTzs: stake }
      : { kind, side: "YES", stakeTzs: stake };
    const placed = await w.place(holder, await w.intent(holder, m.id, o));
    if (!placed.ok) throw new Error(`fixture kyc house stake refused: ${placed.code}`);
  }
  const twin = await w.user({ balance: 5_000_000, passwordHash: "hash_holder_v1" });
  await kycBet(twin, k1.id, "YES", 2_000);
  await kycBet(twin, k2.id, "YES", 3_000);
  await kycBet(twin, k3.id, "YES", 1_000);
  const hRead = await KR.kycCaseRead(holder.userId);
  const tRead = await KR.kycCaseRead(twin);
  const hFacts = KR.kycMoneyFacts(hRead.txns), tFacts = KR.kycMoneyFacts(tRead.txns);
  ok("4.197.1 · ⭐ a holder's KYC facts: betCount and stakedTzs stay the totals over every stake (3 · TZS 6,000); houseBetCount 2 and houseStakedTzs TZS 4,000 count the marked CONFIRMED stakes, from the rows the case read already returns",
    hRead.txns.filter((t: Any) => t.houseBotId != null && t.type === "BET_PLACED").length === 2
      && hFacts.betCount === 3 && hFacts.stakedTzs === 6_000 && hFacts.houseBetCount === 2 && hFacts.houseStakedTzs === 4_000, j(hFacts));
  ok("4.197.2 · a non-holder with the same three stakes: houseBetCount 0 and houseStakedTzs 0, the totals equal the holder's",
    tFacts.betCount === 3 && tFacts.stakedTzs === 6_000 && tFacts.houseBetCount === 0 && tFacts.houseStakedTzs === 0, j(tFacts));
  const hRisk = await KR.kycRiskScore(holder.userId), tRisk = await KR.kycRiskScore(twin);
  ok("4.197.3 · ⛔ the risk score is byte-identical for the holder and the no-house twin (the house figures are evidence, never a factor)",
    typeof hRisk?.score === "number" && j(hRisk) === j(tRisk) && j(hRead.risk) === j(tRead.risk), j({ hRisk, tRisk }));
  const txn = (o: Any) => ({ id: `t${Math.random()}`, userId: "u", walletId: "w", type: "BET_PLACED", status: "CONFIRMED", amount: -1_000, houseBotId: null, createdAt: "2026-09-01T00:00:00.000Z", ...o });
  const pure = KR.kycMoneyFacts([
    txn({ amount: -3_000, houseBotId: "hb_x" }), txn({ amount: 500, houseBotId: "hb_x" }), txn({ status: "PENDING", amount: -9_000, houseBotId: "hb_x" }),
    txn({ type: "BET_REFUND", amount: 7_000, houseBotId: "hb_x" }), txn({ amount: -1_000 }), txn({ type: "DEPOSIT", amount: 50_000 }),
  ]);
  ok("4.197.4 · the pure count: CONFIRMED BET_PLACED only, magnitudes (a negative stake counts 3,000), a PENDING or a refund row never; an unmarked stake in the totals only",
    pure.betCount === 3 && pure.stakedTzs === 4_500 && pure.houseBetCount === 2 && pure.houseStakedTzs === 3_500 && pure.depositedTzs === 50_000, j(pure));
  void C; void B;
});

/* ═══ both stores · the store this child really runs on ══════════════════════════════════════════════ */
section("store · the child runs on the store it names");
await guard("store", async () => {
  const P: Any = await import("../../src/lib/server/prisma.ts");
  ok(`store.1 · the ${STORE} child ${STORE === "postgres" ? "has" : "has no"} database`, P.hasDatabase() === (STORE === "postgres"), `hasDatabase=${P.hasDatabase()}`);
});

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
