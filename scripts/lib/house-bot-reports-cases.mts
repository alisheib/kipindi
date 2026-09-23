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
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";
import { decomment } from "./decomment.mts";
import { srcFiles, scriptFiles } from "./tracked-files.mts";
/** ⭐ The print measure 0.198.3 and `test:house-bot-disclosure` §5.2 now SHARE — see that module's header for why. */
import { printedTexts } from "./player-surface-text.mts";
import { ROLL_CALL_SITES, ROLL_CALL_OWED, expectDriftReport, expectDriftControl, type DeclaredMutation } from "./house-bot-expect-drift.mts";
/* ⛔ The `reports-mem` declarations live in the console anchors file (ruling 434's is the first), and this suite
 * audits its own key there — 505's whole rule is that a suite key with no roll-call is audited by nobody. */
import { MUTATIONS as CONSOLE_ANCHORS } from "../anchors/house-bot-console.anchors.mjs";
/* ⛔ 0.232.2b OPENS THE MONEY ANCHORS instead of asserting against seven strings typed here (C5-7's review). */
import { MUTATIONS as MONEY_ANCHORS } from "../anchors/house-bot-money.anchors.mjs";
import { createHash } from "node:crypto";
import { extendHouseWords, houseHits, houseHitsByFamily, HOUSE_WORD_SOURCE, HOUSE_WORD_SAMPLES, HOUSE_IDENTIFIER_SAMPLES, HOUSE_ID_SAMPLES, HOUSE_BENIGN_SAMPLES } from "./house-bot-vocabulary.mjs";

type Any = any;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const STORE = process.env.HB_MONEY_STORE ?? "unknown";
let pass = 0, fail = 0;
/** Every label this run emitted, so the `reports-mem` roll-call can measure the suite instead of asserting `true`. */
const emitted: string[] = [];
const ok = (l: string, c: boolean, x = "") => {
  c ? pass++ : fail++;
  emitted.push(l);
  console.log(`${c ? "PASS" : "FAIL"} [${STORE}] ${l}${x ? ` — ${x}` : ""}`);
};
const section = (t: string) => console.log(`\n[${STORE}] ${t}`);
const j = (v: unknown) => JSON.stringify(v) ?? String(v);
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
async function guard(label: string, fn: () => Promise<void> | void): Promise<void> {
  try { await fn(); } catch (e) { ok(`${label} · threw`, false, String((e as Error)?.stack ?? e).split("\n").slice(0, 3).join(" | ")); }
}

/* ⛔ `srcFiles()` AND `scriptFiles()` MOVED TO `scripts/lib/tracked-files.mts` (C7, the ops lane) AND ARE
 * IMPORTED AT THE HEAD OF THIS FILE. They were written here and they still read exactly the same trees; what
 * changed is that a SECOND guard now needs the same populations, and this module cannot be imported — it runs
 * every case in it and ends in `process.exit`. The alternative was a second walker, which is the defect this
 * file already records at 0.232.3: a control that built its own walker left the pin "passing forever over an
 * empty population WITH ITS CONTROL STILL GREEN". One walker per population, one file, both callers. */

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
    /* ⭐ RE-POINTED AT C7 step 4b TO THE SAME DEFECT. The second plant used to swap the page's own
     * `.catch(… => null)` for one returning a view — but ruling 354(a) DELETED that catch: it turned a FAILED
     * viewer lookup into the `null` that means "not in the audience", so an outage rendered this page as healthy
     * with the card simply absent. The plant that exercises the same rule now is a FALLBACK on the read itself,
     * which is exactly what `engineCardWiring` refuses (`rhs` may carry no `??`, no `||` and no object). */
    const readExpr = "await houseEngineHealthFor(sessionForHouse?.userId)";
    const planted = [
      page.replace(guardLine, "<HouseEngineCard view={houseEngine ?? DEFAULT_ENGINE_VIEW} />"),
      page.replace(readExpr, `(${readExpr}) ?? DEFAULT_ENGINE_VIEW`),
      page.replace(guardLine, `${guardLine}\n${guardLine}`),
    ];
    /* ⭐ 354(a) · THE PAGE NO LONGER SWALLOWS THE READER'S FAILURE, AND THAT IS AN ASSERTION NOW.
     * `db.user.findById` used to sit OUTSIDE the reader's `try`, so a pool timeout propagated; this page caught it
     * and turned it into the `null` that means "not in the audience", and `{houseEngine && …}` then rendered
     * nothing. The result was a page that looked healthy while nobody could tell — Ali's own "'Not applicable' is
     * the most dangerous silent verdict" in its exact form. The reader fails closed on its own now and answers
     * `{ readable: false }` for a failure it CAN see, so a catch here could only hide one it cannot. */
    ok("0.172.2 · ⭐ 354(a) · the page does NOT catch the engine reader — a swallowed failure renders as 'not in the audience', which is a page that looks healthy while nobody could tell",
      !/houseEngineHealthFor\([^)]*\)\s*\.catch/.test(page) && page.includes(readExpr),
      j({ read: /const houseEngine = [^;]*/.exec(page)?.[0]?.slice(0, 120) }));
    ok("0.172.c2 · CONTROL · the same scan FINDS a catch when one is planted back on that call, so the absence above is a measurement",
      /houseEngineHealthFor\([^)]*\)\s*\.catch/.test(page.replace(readExpr, `${readExpr}.catch(() => null)`)), "");
    const reported = planted.map((p) => engineCardWiring(p).length > 0);
    ok("0.172.c1 · CONTROL · an unguarded card with a default view, a read that falls back to a view, and a second card are each reported — and all three plants really changed the page they were made from",
      page.includes(guardLine) && page.includes(readExpr) && reported.every(Boolean)
        && planted.every((p) => p !== page), j(reported));
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

/**
 * The absence consumers of ruling 175. ⭐ SEVEN SINCE C5-8: `test:house-bot-surfaces` joined it on the day it was
 * written — the surface lexicon whose population is the ADMIN SURFACES and the modules they import, the complement
 * no other house-word guard was reading (675 of 1,087 `src/` files at the time, 192 of them admin surfaces). It
 * consumes the shared words AND the shape family `HOUSE_CAMEL_SOURCE`, which exists because S4-M56 showed
 * `houseBetCount` matching no alternative of `HOUSE_IDENTIFIER_SOURCE` — see `KYC_STRUCK_197` below, the hand-typed
 * needle list that had to exist beside the vocabulary precisely because of it.
 * ⭐ SIX SINCE C7 STEP 7: the SERVED probe joined the closed list (C7-SPEC
 * ruling 397(a)). It imports `houseHits` and declares no pattern of its own, and until step 7 it sat OUTSIDE the
 * single-source pin — an absence instrument that nothing held to the one vocabulary, which is the shape this pin
 * exists to refuse. ⛔ `scripts/lib/house-bot-console-cases.mts` is deliberately NOT here, and the reason is
 * measured rather than assumed: it is a SOURCE-LAW suite over house modules, so it must name house identifiers as
 * CODE (`/houseBotControlStore\.get\(\)/`, `/houseDayBooks\(/` and some forty more) to prove the console's one
 * door reads what it says it reads — and `ownVocabulary` reports every one of those as a re-declared vocabulary
 * pattern. Joining it would need a per-file allowlist of dozens of entries, and `0.175.allow` exists precisely so
 * such a list can only SHRINK. What 397(e) actually asks of that suite is asserted inside it, as `1.397`: it
 * imports the shared module and declares no house WORD LIST of its own.
 */
export const VOCABULARY_CONSUMERS = [
  "scripts/house-bot-surfaces.test.mts",
  "scripts/house-bot-disclosure.test.mts",
  "scripts/verify-house-bot-bundle.mjs",
  "scripts/house-bot-holder-view-shots.mts",
  "scripts/dsar-export-secrets.test.mts",
  "scripts/lib/house-bot-reports-cases.mts",
  "scripts/house-bot-console-probe.mts",
] as const;
/** The deliberately broader lists that import the shared words and extend them, with the EXACT number of extension sites. */
export const BROADER_LISTS: ReadonlyArray<readonly [file: string, extensions: number]> = [
  ["scripts/lib/house-bot-money-cases.mts", 2],
  ["scripts/house-bot-seam.test.mts", 2],
];

/* ═══ §0 · ruling 235 / 149 · F6's helper has a caller, and its docstring no longer promises a surface ═══ */

/**
 * ⛔ A RULE WITH NO CALLER HAS NEVER RUN. `channelAllowed` was written for 04 F6 and, until this checkpoint,
 * nothing in `src/` called it — so the sentence "a notice whose positions are all house-marked never becomes a
 * letter" was a statement about a function, not about the platform. 9.235 measures the BEHAVIOUR on both stores;
 * this pin measures that the behaviour still has a way to happen, from the syntax tree, and that the caller count
 * is a POPULATION rather than a hope.
 *
 * ⛔ AND THE DOCSTRING (ruling 149). It used to finish "— the holder's hourly summary is the one account of those
 * stakes, and it is a bell", describing a compensating surface owner ruling D19 does not allow and this programme
 * never built. A docstring that promises a surface is how the next session learns the wrong law, so the sentence
 * is gone and a control plants it back to prove the pin can see it return.
 */
if (STORE === "memory") {
  section("§0 · rulings 235 and 149 · F6's helper has exactly one production caller, and its docstring promises no surface");
  await guard("0.235", () => {
    const REG = "src/lib/server/comms-registry.ts";
    const DIGEST = "src/lib/server/updown-digest.ts";
    /**
     * Every `channelAllowed(` CALL under src/, from the tree, excluding the module that defines it.
     *
     * ⛔ **AN ALIASED IMPORT BINDS A DIFFERENT NAME** (C5-7's review, low). The matcher took
     * `n.expression.text === "channelAllowed"` only, so `import { channelAllowed as allowed }` followed by
     * `allowed("WIN", { houseOnly: true })` was not a caller: the population read 1 and the claim that exactly one
     * surface makes F6's decision was false while a second one made it. The import clause of each file is read
     * first and the LOCAL name it binds is what the walker looks for — which is also what a reader of that file
     * sees. 0.235.c2b plants the aliased form and requires it counted.
     */
    const localNamesFor = (sf: ts.SourceFile): Set<string> => {
      const names = new Set<string>(["channelAllowed"]);
      walkTree(sf, (n) => {
        if (!ts.isImportSpecifier(n)) return;
        if ((n.propertyName ?? n.name).text === "channelAllowed") names.add(n.name.text);
      });
      return names;
    };
    const callersOf = (extra?: { file: string; code: string }) => {
      const out: string[] = [];
      const files = srcFiles().map((rel) => ({ rel, code: decomment(read(rel)) }));
      if (extra) {
        const i = files.findIndex((f) => f.rel === extra.file);
        if (i >= 0) files[i] = { rel: extra.file, code: extra.code }; else files.push({ rel: extra.file, code: extra.code });
      }
      for (const { rel, code } of files) {
        if (rel === REG || !code.includes("channelAllowed")) continue;
        const sf = parse(rel, code);
        const names = localNamesFor(sf);
        walkTree(sf, (n) => {
          if (!ts.isCallExpression(n)) return;
          const fn = ts.isIdentifier(n.expression) ? n.expression.text
            : ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : "";
          if (!names.has(fn)) return;
          out.push(`${rel}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
        });
      }
      return out;
    };
    const callers = callersOf();
    ok("0.235.1 · ⛔ RULING 235 · 04 F6's helper has EXACTLY ONE production caller and it is the Up & Down digest — before this checkpoint it had none, so the rule it encodes had never once run",
      callers.length === 1 && callers[0].startsWith(`${DIGEST}:`), `${callers.length} caller(s): ${j(callers)}`);

    const digestCode = decomment(read(DIGEST));
    /* ⚠️ A PLAIN SUBSTRING, NOT A REGEX, and deliberately: ruling 175 forbids this file declaring a pattern that
       names a house identifier, and `houseOnly` is one. The subject here is a fixed line of source, so an exact
       string is both the stricter test and the one the vocabulary pin allows. */
    const GATE_LINE = `!channelAllowed("ROUND_RESULT", { houseOnly: line.totals.ownRounds === 0 }).email`;
    const gated = digestCode.includes(GATE_LINE) && digestCode.includes(`${GATE_LINE}) continue;`);
    ok("0.235.2 · …and the call reads `ownRounds === 0` off the SAME single aggregate the digest's figures come from — not a second count, which would be a second place for the two stores to disagree",
      gated && digestCode.includes("line.totals.ownRounds"), `gated=${gated}`);

    const regRaw = read(REG);
    const STRUCK = "the holder's hourly summary is the one account of those stakes";
    ok("0.235.3 · ⛔ RULING 149 · the helper's docstring no longer promises an hourly holder summary — a surface D19 does not allow and this programme never built",
      !regRaw.includes(STRUCK), regRaw.includes(STRUCK) ? "the struck sentence is back" : "absent");
    ok("0.235.c1 · CONTROL · the pin SEES that sentence when it is planted back into the real file, so 0.235.3's verdict is a measurement and not a spelling that no longer matches anything",
      regRaw.replace("never goes to a phone and never becomes a letter.", `never becomes a letter — ${STRUCK}.`).includes(STRUCK), "planted");

    const planted = callersOf({ file: "src/app/planted/route.ts", code: `import { channelAllowed } from "@/lib/server/comms-registry";\nexport function GET() { return channelAllowed("WIN", { houseOnly: true }); }\n` });
    ok("0.235.c2 · CONTROL · a SECOND caller planted in a file of its own is found — so 0.235.1's count is a population read from the tree and would report the day another surface starts making F6's decision for itself",
      planted.length === 2 && planted.some((c) => c.startsWith("src/app/planted/route.ts:")), j(planted));
    const aliased = callersOf({ file: "src/app/planted/aliased.ts", code: `import { channelAllowed as allowed } from "@/lib/server/comms-registry";\nexport function GET() { return allowed("WIN", { houseOnly: true }); }\n` });
    ok("0.235.c2b · CONTROL · a second caller reached through an ALIASED import is found too — the matcher reads each file's import clause for the local name `channelAllowed` is bound to, so a rename at the import cannot hide a surface that makes F6's decision",
      aliased.length === 2 && aliased.some((c) => c.startsWith("src/app/planted/aliased.ts:")), j(aliased));
    const blinded = callersOf({ file: DIGEST, code: digestCode.replace("channelAllowed(", "channelNotAllowed(") });
    ok("0.235.c3 · CONTROL · …and with the digest's own call renamed away the count falls to ZERO, which is the state this ruling found the platform in",
      blinded.length === 0, j(blinded));
  });
}

/* ═══ §0 · ruling 232 · every positioned transaction write copies the marker FROM THE RIGHT OBJECT ═══ */

/**
 * ⛔ RULING 232 · THE STATIC PIN ON MARKER INTEGRITY. The house marker on a `Transaction` row is what the caps, the
 * exports and the bet idempotency all read, and it is copied BY HAND at every site that writes a positioned
 * transaction. A site that forgets it writes a house stake's money row as a player's; a site that copies it from the
 * WRONG object writes a row against another position's bot — and both are silent, because the column is nullable and
 * every suite that reads a marker reads the one its own fixture just wrote.
 *
 * WHAT IS MEASURED, and the population is printed by the assertion itself so a shrinking one is visible without
 * reading this file:
 *   · every `.txn.create(` call in tracked `src/**` — WIDER than R3's `src/lib/server`, at no cost, so a route that
 *     writes a money row cannot escape by living somewhere else;
 *   · each call's first argument taken from the SYNTAX TREE (never balanced braces over text and never a substring:
 *     `positionId` and `houseBotId` are read as PROPERTIES of that literal, so a mention in a neighbouring
 *     expression is not one), over source read through `scripts/lib/decomment.mts`;
 *   · plus `.transaction.create(`, `.transaction.createMany(` and a raw `INSERT INTO "Transaction"` anywhere in
 *     tracked `src/**` outside `prisma-dal.ts` — a writer that bypasses the DAL bypasses everything the DAL does
 *     for a marker.
 *
 * THE RULES:
 *   · a literal with `positionId: null` is EXEMPT (it is not a positioned write);
 *   · every other literal carries the marker as `...(<x>.houseBotId ? { houseBotId: <x>.houseBotId } : {})` or
 *     `houseBotId: <x>.houseBotId ?? null`, and `<x>` must be the SAME identifier whose `.id` is the literal's
 *     `positionId` — `positionId: p.id` ⇒ `p.houseBotId`. A marker copied from another position in scope is the
 *     defect this rule exists for, and a presence-only check cannot see it;
 *   · at the stake write only, `...(ctx.kind === "house" ? { houseBotId: ctx.botId } : {})` is accepted, and ONLY
 *     where the literal's `positionId` is the id of a position object marked from the SAME `ctx` in an enclosing
 *     function — which is CHECKED here, in that function's own tree, never assumed from the file or the line.
 *
 * ⛔ EVERY SHAPE IS MATCHED STRUCTURALLY, NOT BY A REGEX OVER SOURCE TEXT, and that is deliberate twice over: a
 * reformatting (a line break inside the ternary, a different spacing) must not blind the pin, and ruling 175 forbids
 * this file declaring house-word patterns of its own. A `?:` whose false branch is `{}` and whose true branch is
 * `{ houseBotId: … }` is read as a tree, so the pin sees the MEANING.
 *
 * ⚠️ THE SEVEN SPREADS ARE QUOTED BY THE MONEY ANCHORS (`house-bot-money.anchors.mjs` SEAM:txnMarker,
 * SEAM:markerOrphan): those lines are never reformatted, and 0.232.2 reports a site that moves.
 */
if (STORE === "memory") {
  section("§0 · ruling 232 · every positioned transaction write copies the marker from the right object");
  await guard("0.232", () => {
    type Marker = { kind: "spread" | "prop" | "ctx"; source: string };
    type Pid = { kind: "null" | "objId" | "ident" | "other"; text: string };
    type Site = { file: string; line: number; endLine: number; pid: Pid | null; marker: Marker | null; literal: boolean };
    const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
    const nameOf = (p: ts.ObjectLiteralElementLike): string | null =>
      p.name && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : null;
    /** `{ … } as StoredTxn`, `({ … })`, `{ … } satisfies X` — the literal is still the literal. */
    const unwrap = (e: ts.Expression): ts.Expression => {
      let x = e;
      while (ts.isAsExpression(x) || ts.isParenthesizedExpression(x) || ts.isSatisfiesExpression(x) || ts.isTypeAssertionExpression(x)) x = x.expression;
      return x;
    };

    /**
     * A WRITE-CREATE call on the `txn` store, however the store is reached (`db.txn.create`, `w.dal.txn.create`).
     *
     * ⛔ IT IS NOT ONLY `create` (C5-7's review, low). The rule's claim is that a money writer cannot escape by
     * living somewhere else, but the shape of the escape is the MEMBER NAME, not the directory: `.txn.createMany(`
     * or `.txn.upsert(` produced NO site at all, so such a write was in neither `positioned` (0.232.1's rule) nor
     * `bypass` (0.232.3's scan), and every assertion here stayed green over a money writer filing house stakes as
     * players'. The DAL has no such member today (`prisma-dal.ts` declares create/findBy…/update/listBy…), which
     * is why this is a forward-looking hole and not a live defect — and why the member list is read here rather
     * than assumed: a member added tomorrow lands inside the rule instead of outside it. `update` is deliberately
     * NOT here: it cannot position a row any more (see 0.232.4), and adding it would put 28 call sites with no
     * object literal into a population pinned at 18.
     */
    const TXN_WRITE_MEMBERS = ["create", "createMany", "upsert"] as const;
    const isTxnCreate = (n: ts.Node): n is ts.CallExpression =>
      ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
      && (TXN_WRITE_MEMBERS as readonly string[]).includes(n.expression.name.text)
      && ts.isPropertyAccessExpression(n.expression.expression) && n.expression.expression.name.text === "txn";

    /** `<ident>.<prop>` as a pair, or null. */
    const access = (e: ts.Expression, prop: string): string | null =>
      ts.isPropertyAccessExpression(e) && e.name.text === prop && ts.isIdentifier(e.expression) ? e.expression.text : null;

    /** The marker this literal carries, in one of the three accepted SHAPES, with the identifier it reads. */
    const markerOf = (lit: ts.ObjectLiteralExpression): Marker | null => {
      for (const p of lit.properties) {
        if (ts.isSpreadAssignment(p)) {
          const e = unwrap(p.expression);
          if (!ts.isConditionalExpression(e)) continue;
          const f = unwrap(e.whenFalse), t = unwrap(e.whenTrue);
          if (!ts.isObjectLiteralExpression(f) || f.properties.length !== 0) continue;
          if (!ts.isObjectLiteralExpression(t) || t.properties.length !== 1) continue;
          const only = t.properties[0];
          if (!ts.isPropertyAssignment(only) || nameOf(only) !== "houseBotId") continue;
          const val = unwrap(only.initializer);
          const cond = unwrap(e.condition);
          // ...(<x>.houseBotId ? { houseBotId: <x>.houseBotId } : {})
          const condSrc = access(cond, "houseBotId"), valSrc = access(val, "houseBotId");
          if (condSrc && valSrc && condSrc === valSrc) return { kind: "spread", source: condSrc };
          // ...(<ctx>.kind === "house" ? { houseBotId: <ctx>.botId } : {})  — the stake form
          if (ts.isBinaryExpression(cond) && cond.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken) {
            const kindSrc = access(unwrap(cond.left), "kind");
            const right = unwrap(cond.right);
            const botSrc = access(val, "botId");
            if (kindSrc && botSrc && kindSrc === botSrc && ts.isStringLiteral(right) && right.text === "house") {
              return { kind: "ctx", source: kindSrc };
            }
          }
          continue;
        }
        if (ts.isPropertyAssignment(p) && nameOf(p) === "houseBotId") {
          const v = unwrap(p.initializer);
          // houseBotId: <x>.houseBotId ?? null
          if (ts.isBinaryExpression(v) && v.operatorToken.kind === ts.SyntaxKind.QuestionQuestionToken
            && unwrap(v.right).kind === ts.SyntaxKind.NullKeyword) {
            const src = access(unwrap(v.left), "houseBotId");
            if (src) return { kind: "prop", source: src };
          }
          return { kind: "prop", source: `⟨${oneLine(p.initializer.getText())}⟩` };
        }
      }
      return null;
    };

    const pidOf = (lit: ts.ObjectLiteralExpression): Pid | null => {
      const p = lit.properties.find((x) => ts.isPropertyAssignment(x) && nameOf(x) === "positionId") as ts.PropertyAssignment | undefined;
      if (!p) return null;
      const v = unwrap(p.initializer);
      const text = oneLine(p.initializer.getText());
      if (v.kind === ts.SyntaxKind.NullKeyword) return { kind: "null", text };
      const obj = access(v, "id");
      if (obj) return { kind: "objId", text: obj };
      if (ts.isIdentifier(v)) return { kind: "ident", text: v.text };
      return { kind: "other", text };
    };

    /**
     * ⛔ THE STAKE WRITE'S EXEMPTION IS EARNED PER SITE. `ctx.botId` is the right marker only beside the position
     * THAT ctx marked, so every enclosing function is walked outwards — the write sits inside a `withLock` callback
     * while the position literal is built in the function around it — looking for an object literal whose `id` is
     * this write's `positionId` and which carries the same `ctx` spread. No such position, no exemption.
     */
    const stakeFormIsEarned = (call: ts.Node, pid: string, ctxName: string): boolean => {
      const marks = (fn: ts.Node): boolean => {
        let found = false;
        const go = (n: ts.Node) => {
          if (ts.isObjectLiteralExpression(n)) {
            const id = n.properties.find((p) => ts.isPropertyAssignment(p) && nameOf(p) === "id") as ts.PropertyAssignment | undefined;
            const mk = markerOf(n);
            if (id && ts.isIdentifier(unwrap(id.initializer)) && oneLine(id.initializer.getText()) === pid && mk?.kind === "ctx" && mk.source === ctxName) found = true;
          }
          ts.forEachChild(n, go);
        };
        go(fn);
        return found;
      };
      for (let n: ts.Node | undefined = call.parent; n; n = n.parent) {
        if (ts.isFunctionDeclaration(n) || ts.isFunctionExpression(n) || ts.isArrowFunction(n) || ts.isMethodDeclaration(n)) {
          if (marks(n)) return true;
        }
      }
      return false;
    };

    /** Every `.txn.create(` site in one file, with what its literal carries, and the call node for the ctx check. */
    const txnSites = (file: string, code: string): Array<Site & { call: ts.CallExpression | null }> => {
      const sf = parse(file, code);
      const out: Array<Site & { call: ts.CallExpression | null }> = [];
      walkTree(sf, (n) => {
        if (!isTxnCreate(n)) return;
        const line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
        const arg = n.arguments[0] ? unwrap(n.arguments[0]) : undefined;
        const endLine = sf.getLineAndCharacterOfPosition(n.getEnd()).line + 1;
        if (!arg || !ts.isObjectLiteralExpression(arg)) { out.push({ file, line, endLine, pid: null, marker: null, literal: false, call: n }); return; }
        out.push({ file, line, endLine, pid: pidOf(arg), marker: markerOf(arg), literal: true, call: n });
      });
      return out;
    };

    /** The verdict on one site: `null` when it is clean, otherwise the sentence that says what is wrong. */
    const verdict = (s: Site & { call: ts.CallExpression | null }): string | null => {
      if (!s.literal) return "the first argument is not an object literal — this pin cannot read it";
      if (!s.pid) return "no positionId property at all: a money row is positioned or it is not, and a missing key is neither";
      if (s.pid.kind === "null") return null;
      if (!s.marker) return `positionId ${s.pid.text}${s.pid.kind === "objId" ? ".id" : ""} with NO marker — a house stake's money row would be written as a player's`;
      if (s.marker.kind === "ctx") {
        if (s.pid.kind !== "ident" || !s.call) return `the stake form is used with positionId ${s.pid.text}, which is not the plain identifier a marked position's id is bound to`;
        return stakeFormIsEarned(s.call, s.pid.text, s.marker.source) ? null
          : `the stake form (${s.marker.source}.kind === house) is used where no position with id ${s.pid.text} is marked from the same ${s.marker.source} in any enclosing function`;
      }
      if (s.pid.kind !== "objId") return `positionId ${s.pid.text} is neither null nor <x>.id, so the marker's source cannot be checked against it`;
      return s.marker.source === s.pid.text ? null
        : `positionId ${s.pid.text}.id but the marker reads ${s.marker.source} — the marker is copied from the WRONG object`;
    };

    /**
     * ⛔ **THE BYPASS SCAN IS ONE FUNCTION, AND THE CONTROLS CALL IT** (C5-7's review, medium). 0.232.3 was the one
     * assertion of the four whose control did not run the shipped code: `0.232.c5` built its own `walkTree` with
     * its own inline predicate, so changing `if (rel === DAL) continue` to `!==`, or deleting the `bypass.push`,
     * left 0.232.3 passing forever over an empty population WITH ITS CONTROL STILL GREEN. It is extracted here so
     * every control plants into a real file and reads the answer of the code that ships.
     *
     * ⛔ AND THE RAW-SQL HALF MATCHES THE SPELLINGS THIS CODEBASE ACTUALLY PRODUCES. It was
     * `/INSERT\s+INTO\s+"Transaction"/i` — which cannot match a schema-qualified `INSERT INTO public."Transaction"`,
     * and cannot match `INSERT INTO "${table}"`, the builder shape `house-bot-dal.ts:1026` already uses. Two of
     * 0.232.3's three stated subjects had no control at all and the regex had never been shown to fire once. An
     * INTERPOLATED table name is not something a static scan can read, so it is REPORTED unless the file is on a
     * named, justified list that may only shrink — "not applicable" is not an answer this checkpoint accepts.
     */
    const DAL = "src/lib/server/prisma-dal.ts";
    const HOUSE_DAL = "src/lib/server/house-bot-dal.ts";
    const MS_REL = "src/lib/server/market-service.ts";
    const RAW_TXN_INSERT = /INSERT\s+INTO\s+(?:[A-Za-z_][\w$]*\s*\.\s*)?"Transaction"/i;
    const RAW_DYNAMIC_INSERT = /INSERT\s+INTO\s+"\$\{/;
    /** ⛔ The ONE file allowed to build an INSERT with an interpolated table, and 0.232.3b holds it to the reason. */
    const DYNAMIC_INSERT_ALLOWED: readonly string[] = [HOUSE_DAL];
    const bypassIn = (rel: string, code: string): string[] => {
      const out: string[] = [];
      if (rel === DAL) return out;
      const sf = parse(rel, code);
      walkTree(sf, (n) => {
        if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression)) return;
        const fn = n.expression.name.text;
        if (!(TXN_WRITE_MEMBERS as readonly string[]).includes(fn)) return;
        if (!ts.isPropertyAccessExpression(n.expression.expression) || n.expression.expression.name.text !== "transaction") return;
        out.push(`${rel}:${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1} .transaction.${fn}(`);
      });
      if (RAW_TXN_INSERT.test(code)) out.push(`${rel} raw INSERT INTO Transaction`);
      if (RAW_DYNAMIC_INSERT.test(code) && !DYNAMIC_INSERT_ALLOWED.includes(rel)) {
        out.push(`${rel} raw INSERT INTO an INTERPOLATED table — this pin cannot read which one`);
      }
      return out;
    };

    const all: Array<Site & { call: ts.CallExpression | null }> = [];
    const bypass: string[] = [];
    const files = srcFiles().map((rel) => ({ rel, code: decomment(read(rel)) }));
    for (const { rel, code } of files) {
      all.push(...txnSites(rel, code));
      bypass.push(...bypassIn(rel, code));
    }
    const exempt = all.filter((s) => s.pid?.kind === "null");
    const positioned = all.filter((s) => s.pid?.kind !== "null");
    ok("0.232.0 · the population is real: every .txn.create( in tracked src/ is read from the tree — wider than src/lib/server, so a route that writes a money row cannot escape by living somewhere else",
      all.length >= 18 && files.length > 500 && positioned.length === 7 && exempt.length === 11,
      `${all.length} txn.create sites in ${new Set(all.map((s) => s.file)).size} files, over ${files.length} src files · ${positioned.length} positioned · ${exempt.length} exempt (positionId: null)`);

    const offenders = positioned.map((s) => ({ at: `${s.file}:${s.line}`, why: verdict(s) })).filter((o) => o.why !== null);
    ok("0.232.1 · ⛔ RULING 232 · every positioned transaction write copies the marker FROM THE OBJECT WHOSE id IS ITS positionId — presence is not enough, because a marker copied from another position in scope is silent",
      offenders.length === 0, j(offenders));
    const marked = positioned.filter((s) => s.marker !== null).map((s) => `${s.file.split("/").pop()}:${s.line}`);
    /**
     * ⭐ THE SEVEN MOVED BY EXACTLY +41 (2026-09-21), and the numbers were re-pinned only after the MOVE was
     * proved to be a move. `market-service.ts` gained 41 lines above the first site when the bonus-accrual
     * money fix landed (`f41e632c`), so every site below it shifted by the same amount:
     *   1524→1565 · 2792→2833 · 3167→3208 · 3577→3618 · 3709→3750 · 3850→3891 · 4433→4474
     * ⛔ A UNIFORM DELTA IS EVIDENCE, NOT PROOF, and this pin exists precisely because a site can also be
     * DELETED or REWRITTEN while the count stays seven. So it was checked at the source: the file still holds
     * exactly seven marker spreads (1586, 2843, 3219, 3628, 3760, 3903, 4484 — each inside the `db.txn.create`
     * call whose opening line is the site), each site line is still a txn write, and the text-anchored controls
     * below still plant on their own site and still go red. The numbers changed; nothing else did.
     *
     * ⭐ THEN THE SEVENTH ALONE MOVED +10 (2026-09-22), and only the seventh — which is why the re-pin is one
     * number and not seven. `bb231238` (the settlement report read from inside its own transaction) is +11/−1 on
     * this file in a SINGLE hunk, `@@ -4028,7 +4028,17 @@`: below the sixth site (3891) and above the seventh
     * (4433→4474→4484), so every other number must stay still, and a delta that had reached them would have been
     * a different defect, not this one.
     * ⛔ RE-DERIVED FROM THE TREE, NOT INFERRED FROM THE DELTA. The seven `db.txn.create(` opening lines now read
     * 1565, 2833, 3208, 3618, 3750, 3891, 4484, and the seven markers inside them are the stake form at 1586 plus
     * six spreads at 2843, 3219, 3628, 3760, 3903, 4494. The moved site is still the EMERGENCY VOID's `BET_REFUND`
     * write, still carrying `...(p.houseBotId ? { houseBotId: p.houseBotId } : {})` beside `positionId: p.id` — so
     * it is the same site at a new line, which is the only reading under which a re-pin is honest.
     */
    ok("0.232.2 · …and the seven marked sites are exactly the seven line numbers this pin was written against — a site that MOVES is reported here (the pin is line-pinned on purpose; the money anchors match by text and cannot rot from a line move)",
      j(marked) === j(["market-service.ts:1565", "market-service.ts:2833", "market-service.ts:3208", "market-service.ts:3618", "market-service.ts:3750", "market-service.ts:3891", "market-service.ts:4484"]), j(marked));

    /**
     * ⛔ **THE ANCHORS FILE IS OPENED, BECAUSE THE LABEL SAID IT WAS AND IT WAS NOT** (C5-7's review, low). 0.232.2
     * read "the seven the money anchors quote" and then compared against seven literal strings typed in this file:
     * it never touched an anchors file, and the money anchors declare a mutation for only TWO of the seven marker
     * sites (`SEAM:txnMarker` → 1565, `SEAM:markerOrphan` → 2833). Five real marker sites — the cash-out, the
     * one-sided refund, the void refund, the winner payout and the emergency void — have no declared mutation in
     * any file under `scripts/`, so `test:red-anchors` never demonstrates that deleting their marker reddens
     * anything. That is not fixed by a better sentence: it is MEASURED here and printed, so the number cannot
     * quietly shrink, and the uncovered sites are named in `plans/house-bots/DEFERRED-TESTS.md`.
     */
    const anchorLines = new Set<number>();
    const msRaw = read(MS_REL).replace(/\r\n/g, "\n");
    for (const a of MONEY_ANCHORS as Array<{ file: string; from: string; to: string }>) {
      if (a.file !== MS_REL) continue;
      if (!a.from.includes("houseBotId")) continue;
      const at = msRaw.indexOf(a.from.replace(/\r\n/g, "\n"));
      if (at < 0) continue;
      const startLine = msRaw.slice(0, at).split("\n").length;
      const endLine = startLine + a.from.split("\n").length - 1;
      for (let L = startLine; L <= endLine; L++) anchorLines.add(L);
    }
    const covered = positioned.filter((s) => s.marker !== null && [...anchorLines].some((L) => L >= s.line && L <= s.endLine));
    const uncovered = positioned.filter((s) => s.marker !== null && !covered.includes(s)).map((s) => `${s.file.split("/").pop()}:${s.line}`);
    /* ⭐ RAISED 2 → 7 BY C5-8 (2026-09-20), §1j row 84, and this is the only direction this assertion may move.
       Until today the five sites this printed as "uncovered (deferred by name)" — the cash-out (`:3208`), the
       one-sided refund (`:3618`), the void refund (`:3750`), the winner payout (`:3891`) and the emergency void
       (`:4484`, `:4474` before `bb231238` moved it) — had NO declared mutation in any file under `scripts/`, so `test:red-anchors` never demonstrated
       that deleting their marker reddens anything. All five are now declared in
       `scripts/anchors/house-bot-money.anchors.mjs` and run by `red:house-bot-money` under `reports-mem`.
       ⛔ The deferral list is GONE rather than shortened, and the equality is EXACT on both numbers: a site that
       loses its declaration takes this red, which is the whole point of counting instead of asserting a sentence.
       ⛔ This is a TIGHTENING. Never re-loosen it to absorb a red — a declaration that stops resolving is a
       finding for `test:red-anchors` §3 to report, not a number for this line to accommodate. */
    ok("0.232.2b · the money anchors are READ, and EVERY marker site they declare a mutation for is printed: a marker site with no declared mutation is never demonstrated red by test:red-anchors, and this assertion is the only thing that says which and how many",
      anchorLines.size > 0 && covered.length === marked.length && uncovered.length === 0,
      `${covered.length} of ${marked.length} marker sites carry a declared money-anchor mutation · uncovered (deferred by name): ${j(uncovered)}`);

    ok("0.232.3 · ⛔ nothing in tracked src/ writes a Transaction row around the DAL — no .transaction.create(, .createMany( or .upsert(, no raw INSERT INTO \"Transaction\" (schema-qualified or not), and no INSERT into an INTERPOLATED table outside the one declared builder",
      bypass.length === 0, `${files.length} src files scanned · ${j(bypass)}`);
    ok("0.232.3b · …and the ONE file allowed to build an INSERT with an interpolated table still cannot aim it at Transaction: `insertSql` takes a `HouseTable`, not a string, so the type system decides which tables that builder can reach",
      DYNAMIC_INSERT_ALLOWED.length === 1 && read(HOUSE_DAL).includes("function insertSql(table: HouseTable,"),
      `allowed: ${j(DYNAMIC_INSERT_ALLOWED)}`);

    /* ── THE CONTROLS. Each plants a REAL defect in a REAL file's source and requires it to be reported ──────── */
    const MS = "src/lib/server/market-service.ts";
    const ms = files.find((f) => f.rel === MS)!.code;
    const scan = (code: string) => txnSites(MS, code).filter((s) => s.pid?.kind !== "null")
      .map((s) => ({ at: `${MS}:${s.line}`, why: verdict(s) })).filter((o) => o.why !== null);
    const SPREAD_2833 = `      ...(p.houseBotId ? { houseBotId: p.houseBotId } : {}),`;
    ok("0.232.c0 · CONTROL · the real file is clean before anything is planted, so every control below measures its plant and not the file",
      scan(ms).length === 0 && ms.includes(SPREAD_2833), j(scan(ms)));

    const dropped = scan(ms.replace(SPREAD_2833, ""));
    ok("0.232.c1 · CONTROL · a positioned write whose marker is DELETED is reported, and exactly one site goes red — the plant really changed the file",
      dropped.length === 1 && dropped[0].at === `${MS}:2833` && /NO marker/.test(dropped[0].why ?? ""), j(dropped));
    /* ⭐ THE ACCEPT SIDE, AND IT IS ABOUT A SITE THAT DOES NOT EXIST YET. Putting the deleted spread back would only
       rebuild `ms` and prove nothing, so the control appends a BRAND NEW positioned writer to the same real file: the
       pin must pass it because its marker is right, and refuse the identical writer with the marker removed. Without
       this pair, 0.232.1 could be a pin that has simply memorised seven lines and would pass the eighth writer
       somebody adds tomorrow. */
    const NEW_WRITER = (marker: string) => `
async function __c2NewPositionedWriter(q: { id: string; houseBotId: string | null }) {
  await db.txn.create({ id: "txn_c2", walletId: "w", userId: "u", type: "BET_REFUND", status: "CONFIRMED", positionId: q.id,${marker} });
}
`;
    const addedClean = txnSites(MS, ms + NEW_WRITER(" ...(q.houseBotId ? { houseBotId: q.houseBotId } : {}),"));
    const addedDirty = scan(ms + NEW_WRITER(""));
    ok("0.232.c2 · CONTROL · a BRAND NEW positioned writer appended to the same real file passes when its marker reads its own position and is reported when it carries none — so 0.232.1 is a rule, not a memorised list of seven lines",
      addedClean.length === all.filter((x) => x.file === MS).length + 1 && scan(ms + NEW_WRITER(" ...(q.houseBotId ? { houseBotId: q.houseBotId } : {}),")).length === 0
      && addedDirty.length === 1 && /NO marker/.test(addedDirty[0].why ?? ""),
      j({ sitesAfterAppend: addedClean.length, dirty: addedDirty }));

    /* ⛔ THE ONE A PRESENCE CHECK CANNOT SEE: the marker is THERE, well-formed, and read from another position. */
    const wrongSource = scan(ms.replace(SPREAD_2833, `      ...(position.houseBotId ? { houseBotId: position.houseBotId } : {}),`));
    ok("0.232.c3 · CONTROL · a marker copied from the WRONG object — present, well-formed, reading another position in scope — is reported, which is the defect a presence-only scan passes",
      wrongSource.length === 1 && wrongSource[0].at === `${MS}:2833` && /WRONG object/.test(wrongSource[0].why ?? ""), j(wrongSource));
    const wrongProp = scan(ms.replace(SPREAD_2833, `      houseBotId: position.houseBotId ?? null,`));
    const rightProp = scan(ms.replace(SPREAD_2833, `      houseBotId: p.houseBotId ?? null,`));
    ok("0.232.c3b · CONTROL · the same defect in the OTHER accepted spelling (houseBotId: <x>.houseBotId ?? null) is reported, and the RIGHT identifier in that spelling is accepted — both directions, so the pin is not just refusing the spelling",
      wrongProp.length === 1 && wrongProp[0].at === `${MS}:2833` && /WRONG object/.test(wrongProp[0].why ?? "") && rightProp.length === 0, j({ wrongProp, rightProp }));
    const reformatted = scan(ms.replace(SPREAD_2833, `      ...(p.houseBotId\n        ? { houseBotId: p.houseBotId }\n        : {}),`));
    ok("0.232.c3c · CONTROL · the accept side of the shape: the SAME marker reformatted over three lines is still read — a pin that a line break blinds is one reformat away from passing an unmarked write",
      reformatted.length === 0, j(reformatted));

    /* ⛔ THE STAKE FORM, MOVED OFF ITS POSITION. */
    const movedStakeForm = scan(ms.replace(SPREAD_2833, `      ...(ctx.kind === "house" ? { houseBotId: ctx.botId } : {}),`));
    ok("0.232.c4 · CONTROL · the stake form used where no position with that positionId is marked from the same ctx is reported — the exemption is earned per site, never granted by file or by line number",
      movedStakeForm.length === 1 && movedStakeForm[0].at === `${MS}:2833` && /stake form/.test(movedStakeForm[0].why ?? ""), j(movedStakeForm));
    /* ⚠️ THE PLANT CARRIES NO NEWLINE, and that is not a detail: tracked source is CRLF in this checkout, so a
       `\n` anchor matches nothing and the plant silently plants NOTHING — a control that then reports the file is
       clean, which is exactly the silent pass this checkpoint exists to refuse (it happened here, once, and this
       comment is the record). `id: positionId,` occurs exactly once (`positionId: positionId,` carries a capital I),
       and the assertion below requires the plant to have CHANGED the source before it reads its verdict. */
    const c4bPlant = ms.replace("id: positionId,", "id: positionIdOfAnotherBet,");
    const stakeUnmarked = scan(c4bPlant);
    ok("0.232.c4b · CONTROL · …and the REAL stake write goes red the moment the position it is paired with stops being the one it names — so 0.232.1's green on that site is a measurement of the pairing, not a permanent pass",
      c4bPlant !== ms && stakeUnmarked.length === 1 && stakeUnmarked[0].at === `${MS}:1565` && /stake form/.test(stakeUnmarked[0].why ?? ""), j(stakeUnmarked));

    /* ⛔ THE BYPASS CONTROLS, AND THEY CALL `bypassIn` — THE CODE THAT SHIPS. The old 0.232.c5 re-implemented the
       walk inline, so the loop that actually produces `bypass` was UNPLANTED: one character (`rel === DAL` →
       `rel !== DAL`) would have left 0.232.3 passing forever over an empty population with its control still green.
       Every one of 0.232.3's stated subjects is planted here, into a real file, and read back through `bypassIn`. */
    const ANCHOR_CREATE = `          await db.txn.create({`;
    const plantBypass = (line: string) => bypassIn(MS, ms.replace(ANCHOR_CREATE, `          ${line}\n${ANCHOR_CREATE}`));
    const c5create = plantBypass(`await prisma.transaction.create({ data: {} });`);
    const c5many = plantBypass(`await prisma.transaction.createMany({ data: [] });`);
    const c5upsert = plantBypass(`await prisma.transaction.upsert({ where: { id: "x" }, create: {}, update: {} });`);
    ok("0.232.c5 · CONTROL · a planted prisma.transaction.create / .createMany / .upsert outside the DAL is each reported BY THE SHIPPED SCAN — the control calls `bypassIn`, so deleting its push or inverting its DAL exclusion goes red here instead of passing silently",
      ms.includes(ANCHOR_CREATE) && [c5create, c5many, c5upsert].every((r) => r.length === 1),
      j({ create: c5create, createMany: c5many, upsert: c5upsert }));

    /* ⛔ THE RAW-SQL LIMB, WHICH HAD NEVER BEEN SHOWN TO FIRE — in all three spellings this codebase can produce. */
    const c5sqlPlain = bypassIn(MS, `${ms}\nasync function __c5raw(tx: unknown) { await sql(tx, \`INSERT INTO "Transaction" ("id") VALUES ($1)\`); }\n`);
    const c5sqlSchema = bypassIn(MS, `${ms}\nasync function __c5raw(tx: unknown) { await sql(tx, \`INSERT INTO public."Transaction" ("id") VALUES ($1)\`); }\n`);
    const c5sqlDyn = bypassIn(MS, `${ms}\nasync function __c5raw(tx: unknown, table: string) { await sql(tx, \`INSERT INTO "\${table}" ("id") VALUES ($1)\`); }\n`);
    ok("0.232.c5b · CONTROL · the RAW-SQL limb reports all three spellings: INSERT INTO \"Transaction\", the schema-qualified public.\"Transaction\", and the INTERPOLATED table the tree's own builder already uses — the shape the old regex could not match, in the file that would carry it",
      c5sqlPlain.length === 1 && c5sqlSchema.length === 1 && c5sqlDyn.length === 1,
      j({ plain: c5sqlPlain, schema: c5sqlSchema, dynamic: c5sqlDyn }));

    /* ⛔ THE ACCEPT SIDE: the DAL's own real writer is NOT reported, and the exclusion is DEMONSTRATED rather than
       described — the same planted line, in the excluded file, must come back empty. */
    const dalCode = decomment(read(DAL));
    const c5dalReal = bypassIn(DAL, dalCode);
    const c5dalPlanted = bypassIn(DAL, `${dalCode}\nasync function __c5dal() { await prisma.transaction.create({ data: {} }); }\n`);
    const c5houseDal = bypassIn(HOUSE_DAL, decomment(read(HOUSE_DAL)));
    ok("0.232.c5c · CONTROL · the accept side, demonstrated not described: prisma-dal.ts's own real .transaction.create( is NOT reported, a freshly planted one in that SAME file is not either (the exclusion is by file, and it is real), and house-bot-dal.ts's declared interpolated builder is not reported while every other file's would be",
      read(DAL).includes(".transaction.create(") && c5dalReal.length === 0 && c5dalPlanted.length === 0 && c5houseDal.length === 0,
      j({ dalReal: c5dalReal.length, dalPlanted: c5dalPlanted.length, houseDal: c5houseDal }));

    /**
     * ⛔ **0.232.4 · `positionId` IS CREATE-ONLY IN BOTH STORE TWINS** (C5-7's review, low). Both twins already drop
     * `houseBotId` from an update patch so a ledger row can never be re-marked or un-marked — and neither dropped
     * `positionId`, while this whole pin reads `.txn.create(` sites only. So `db.txn.update(id, { positionId })`
     * turned an unpositioned, unmarked row into a positioned one that can NEVER be marked (the marker is create-only
     * and the row already exists): it stays in the holder's own `excludeHouseBets` wallet feed and drops out of the
     * house book's `returned`, with nothing anywhere to report it. Measured when this landed: 28 `db.txn.update(`
     * call sites in `src/`, none naming either key. Both twins now drop both keys, and both spellings are pinned.
     */
    const storeTwin = decomment(read("src/lib/server/store.ts"));
    const prismaTwin = decomment(read(DAL));
    const MEMORY_DROP = `const { houseBotId: _marker, positionId: _positioned, ...rest } = patch;`;
    const PRISMA_DROP = `if (k === "createdAt" || k === "updatedAt" || k === "houseBotId" || k === "positionId") continue;`;
    ok("0.232.4 · ⛔ both txn store twins drop houseBotId AND positionId from an update patch — a ledger row cannot be re-marked, un-marked, or POSITIONED after the fact, which is the one way a positioned row could exist that ruling 232's create-site scan can never see",
      storeTwin.includes(MEMORY_DROP) && prismaTwin.includes(PRISMA_DROP),
      j({ memory: storeTwin.includes(MEMORY_DROP), prisma: prismaTwin.includes(PRISMA_DROP) }));
    ok("0.232.4.control · CONTROL · the pin REPORTS each twin the moment its own spelling stops dropping the key — so the two greens above are measurements of those two lines and not of strings that match nothing",
      !storeTwin.replace(MEMORY_DROP, `const { houseBotId: _marker, ...rest } = patch;`).includes(MEMORY_DROP)
      && !prismaTwin.replace(PRISMA_DROP, `if (k === "createdAt" || k === "updatedAt" || k === "houseBotId") continue;`).includes(PRISMA_DROP),
      "both plants change their file");

    /**
     * ⛔ **0.232.5 · THE ONE REAL DAL BYPASS IN THIS REPOSITORY LIVES IN `scripts/`** (C5-7's review, medium).
     * 0.232.3's scope (`src/**`) was stated honestly and then never measured against the place the escape actually
     * happened: `scripts/delete-seed-markets.mjs` refunds every OPEN position on a seeded market with a bare
     * `prisma.transaction.create` — no DAL, and (until this checkpoint) no marker copied from the position and a
     * column name renamed away on 2026-07-02. Every positioned `prisma.transaction.create` in tracked `scripts/`
     * is read from the tree and held to ruling 232's own rule: the marker comes from the object whose `id` is the
     * write's `positionId`. `positionId: null` is exempt here as it is in `src/`.
     */
    const scriptPop = scriptFiles();
    const scriptOffenders: Array<{ at: string; why: string | null }> = [];
    let scriptPositioned = 0;
    for (const rel of scriptPop) {
      const code = decomment(read(rel));
      if (!code.includes("transaction.create")) continue;
      const sf = parse(rel, code);
      walkTree(sf, (n) => {
        if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression) || n.expression.name.text !== "create") return;
        if (!ts.isPropertyAccessExpression(n.expression.expression) || n.expression.expression.name.text !== "transaction") return;
        const outer = n.arguments[0] ? unwrap(n.arguments[0]) : undefined;
        if (!outer || !ts.isObjectLiteralExpression(outer)) return;
        const dataProp = outer.properties.find((x) => ts.isPropertyAssignment(x) && nameOf(x) === "data") as ts.PropertyAssignment | undefined;
        const lit = dataProp ? unwrap(dataProp.initializer) : outer;
        if (!ts.isObjectLiteralExpression(lit)) return;
        const line = sf.getLineAndCharacterOfPosition(n.getStart()).line + 1;
        const site: Site & { call: ts.CallExpression | null } = { file: rel, line, endLine: sf.getLineAndCharacterOfPosition(n.getEnd()).line + 1, pid: pidOf(lit), marker: markerOf(lit), literal: true, call: n };
        if (site.pid?.kind === "null" || site.pid == null) return;
        scriptPositioned++;
        const why = verdict(site);
        if (why !== null) scriptOffenders.push({ at: `${rel}:${line}`, why });
      });
    }
    ok("0.232.5 · ⛔ every positioned prisma.transaction.create in tracked scripts/ copies the marker from the object whose id is its positionId — the one DAL bypass this repository actually contains lives here, outside src/, and its scope was stated and never measured until now",
      scriptPositioned >= 1 && scriptOffenders.length === 0,
      `${scriptPop.length} script files · ${scriptPositioned} positioned write(s) · ${j(scriptOffenders)}`);
    const seedRel = "scripts/delete-seed-markets.mjs";
    const seedCode = decomment(read(seedRel));
    /* ⚠️ NO NEWLINE IN THE ANCHOR, and that is not a detail: `scripts/delete-seed-markets.mjs` is CRLF, so a plant
       written with `\n` matches NOTHING and plants NOTHING — the silent pass this checkpoint exists to refuse (it
       happened here once, and the assertion below now requires the plant to have CHANGED the source). */
    const SEED_MARKER = `...(pos.houseBotId ? { houseBotId: pos.houseBotId } : {}),`;
    const seedPlant = seedCode.replace(SEED_MARKER, "");
    const seedSites = (code: string) => {
      const sf = parse(seedRel, code);
      const out: Array<string | null> = [];
      walkTree(sf, (n) => {
        if (!ts.isCallExpression(n) || !ts.isPropertyAccessExpression(n.expression) || n.expression.name.text !== "create") return;
        if (!ts.isPropertyAccessExpression(n.expression.expression) || n.expression.expression.name.text !== "transaction") return;
        const outer = unwrap(n.arguments[0]!);
        if (!ts.isObjectLiteralExpression(outer)) return;
        const dataProp = outer.properties.find((x) => ts.isPropertyAssignment(x) && nameOf(x) === "data") as ts.PropertyAssignment | undefined;
        const lit = unwrap(dataProp!.initializer);
        if (!ts.isObjectLiteralExpression(lit)) return;
        out.push(verdict({ file: seedRel, line: 0, endLine: 0, pid: pidOf(lit), marker: markerOf(lit), literal: true, call: n }));
      });
      return out;
    };
    ok("0.232.5.control · CONTROL · the real seed-cleanup refund is clean, and the SAME writer with its marker deleted is REPORTED as an unmarked positioned write — so 0.232.5's zero is a measurement of that file and not of an empty population",
      seedCode.includes(`positionId: pos.id,`) && seedCode.includes(SEED_MARKER) && seedSites(seedCode).every((w) => w === null)
      && seedPlant !== seedCode && seedSites(seedPlant).some((w) => /NO marker/.test(w ?? "")),
      j({ clean: seedSites(seedCode), planted: seedSites(seedPlant) }));
  });
}

/* ═══ §0 · L52 · the rate-limit ACTION NAMES, which /admin/system paints verbatim ═════════════════════ */

/**
 * ⛔ L52 · A RATE-LIMIT ACTION NAME IS A RENDERED STRING, AND ONE OF THEM NAMED THE FEATURE.
 * `rateLimitSnapshot()` (`rate-limit.ts`) splits each live bucket on `:` and returns the ACTION half;
 * `/admin/system` paints that half verbatim in its "Rate limiter · live buckets" table (`page.tsx:159`, `:637`),
 * which any staff account holding the ops VIEW grant can open — a wider audience than this feature has. The desk's
 * account check spelled the feature out in its action name until this ruling, and C7 step 6 gave it a real caller
 * through the designate wizard, so the word became reachable on an admin table outside the feature's audience: an
 * owner ruling D19 defect, live on this branch, not a latent one.
 *
 * ⚠️ WHY NOTHING CAUGHT IT, AND THE LESSON IS ABOUT SCOPE. Ruling 453's console lexicon scans
 * `src/app/admin/desk/**`. This string lives in `src/lib/server/` and is painted by a page in another admin section,
 * so the guard that owns the words never looked at the file that carried one. A GUARD'S SCOPE IS PART OF ITS CLAIM:
 * "the console names nothing" was true and still left a house word on an admin table. The pin below is therefore
 * scoped to the RULE TABLE itself, wherever in the tree it sits, and to every call site that names a rule.
 *
 * ⚠️ THIS SCAN MUST SEE STRING LITERALS, and that is the point, not an oversight: its subject IS a literal — the
 * property names of the `RATE_RULES` initialiser, and the second argument of every `rateCheck` / `rateCheckAsync`
 * call — each taken from the SYNTAX TREE, never by substring over text. Every file is read through `decomment`
 * first, so prose about a key can neither supply one nor hide one.
 *
 * ⛔ AND THE TABLE FAILS OPEN, which is why the call sites are read and not only the table. `RATE_RULES` is typed
 * `Record<string, RateRule>`, so `keyof typeof RATE_RULES` is `string`: `tsc` cannot see a caller naming a rule
 * nobody declares, and `rateCheck` returns `{ allowed: true }` on an unknown action. A rename that missed a caller
 * would switch a live limiter OFF in silence and every suite would stay green.
 */
if (STORE === "memory") {
  section("§0 · L52 · no rate-limit action name carries the vocabulary, and every call site names a declared rule");
  await guard("0.L52", () => {
    const RL = "src/lib/server/rate-limit.ts";

    /** The property names of the `RATE_RULES` object literal, read from the syntax tree of decommented source. */
    const rateRuleKeys = (code: string): string[] => {
      const out: string[] = [];
      walkTree(parse(RL, code), (n) => {
        if (!ts.isVariableDeclaration(n) || n.name.getText() !== "RATE_RULES" || !n.initializer) return;
        if (!ts.isObjectLiteralExpression(n.initializer)) return;
        for (const p of n.initializer.properties) {
          if (!ts.isPropertyAssignment(p)) continue;
          const k = literalText(p.name) ?? (ts.isIdentifier(p.name) ? p.name.text : null);
          if (k != null) out.push(k);
        }
      });
      return out;
    };
    /**
     * Every `rateCheck` / `rateCheckAsync` call in one file, with the action argument as a LITERAL or `null` — and
     * the KEY argument's own source text.
     *
     * ⛔ **THE KEY IS PAINTED TOO, AND THIS PIN READ ONLY THE ACTION** (C5-7's review, medium). The docblock above
     * argues "A GUARD'S SCOPE IS PART OF ITS CLAIM" and then scoped itself one COLUMN short:
     * `/admin/system` paints `b.action` at `page.tsx:640` **and `b.key.slice(0, 30)` at `:641`**, from the same
     * snapshot, to the same ops VIEW audience. Nothing here ever read the FIRST argument of any call, so the
     * rendered key half was unmeasured by this sweep and by anything else — `rateCheckAsync(botId, "desk.picker")`
     * would have painted an `hb_…` id verbatim on an admin table with every assertion in this section green.
     * Measured when this landed: 27 live call sites, none keying on a house identifier, so this was a coverage
     * hole rather than a live defect — which is exactly when a guard is cheap to add and worth having.
     *
     * ⚠️ WHAT THE KEY SWEEP CAN AND CANNOT DECIDE, said plainly. It reads the argument's SOURCE TEXT, so it sees a
     * literal, a template's static parts, and the identifier names a key is built from. A bare `botId` is NOT a
     * vocabulary hit — the shared list deliberately excludes bare `bot` (`house-bot-vocabulary.mjs`), because
     * `/admin/house` and the word "bot" live on `main` — so this catches `houseBotId`, `house_…`, `HouseBot…`, a
     * bounded house id and every house WORD, and does not catch a house value reached through a neutral name. The
     * value half is unreachable from a static read and is NOT MEASURED, by name, in DEFERRED-TESTS.
     */
    const callSites = (file: string, code: string): Array<{ file: string; action: string | null; key: string; text: string }> => {
      const out: Array<{ file: string; action: string | null; key: string; text: string }> = [];
      walkTree(parse(file, code), (n) => {
        if (!ts.isCallExpression(n)) return;
        const fn = ts.isIdentifier(n.expression) ? n.expression.text
          : ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : "";
        if (fn !== "rateCheck" && fn !== "rateCheckAsync") return;
        out.push({
          file, action: literalText(n.arguments[1]),
          key: n.arguments[0] ? n.arguments[0].getText().replace(/\s+/g, " ") : "",
          text: n.getText().slice(0, 90).replace(/\s+/g, " "),
        });
      });
      return out;
    };

    const rlCode = decomment(read(RL));
    const keys = rateRuleKeys(rlCode);
    ok("0.L52.0 · the population is real: the rule table is read from the syntax tree, and it holds the desk's two rules among every other live bucket name",
      keys.length >= 20 && keys.includes("desk.verify") && keys.includes("desk.picker"),
      `${keys.length} rules · ${keys.join(" ")}`);

    const dirty = keys.filter((k) => houseHits(k).length > 0);
    ok("0.L52.1 · ⛔ D19 · L52 · NO rate-limit action name carries the shared vocabulary — every one of them is painted verbatim on /admin/system to the whole ops VIEW audience",
      dirty.length === 0, `${keys.length} rules read · offenders: ${j(dirty.map((k) => [k, houseHits(k)]))}`);

    /* The controls. Each sample is planted ON ITS OWN, so a family the scan is blind to cannot hide behind a family
     * it can see, and each plant must be READ BACK from the tree before its report counts — a control that only
     * proves the regex works, and not that the extractor reached the key, is the shape that fooled this platform. */
    const plant = (k: string) => rlCode.replace(`"desk.verify"`, `"${k}": { capacity: 1, refillPerMin: 1 },\n  "desk.verify"`);
    const samples = [
      ...HOUSE_WORD_SAMPLES.map((w) => `${w}.verify`),
      ...HOUSE_IDENTIFIER_SAMPLES.map((i) => `${i}.check`),
      ...HOUSE_ID_SAMPLES.map((i) => `bucket.${i}`),
    ];
    const missed = samples.filter((s) => {
      const planted = rateRuleKeys(plant(s));
      return !planted.includes(s) || planted.filter((x) => houseHits(x).length > 0).join("|") !== s;
    });
    ok("0.L52.c1 · CONTROL · every sample of all three families — words, identifiers and bounded ids — planted one at a time as a rule key, is READ BACK from the tree and REPORTED as the only offender",
      missed.length === 0 && samples.length >= 30, `${samples.length} planted one by one · missed: ${j(missed)}`);

    const benign = HOUSE_BENIGN_SAMPLES.map((b) => `${b}.charge`);
    const cried = benign.filter((s) => {
      const planted = rateRuleKeys(plant(s));
      return !planted.includes(s) || planted.filter((x) => houseHits(x).length > 0).length > 0;
    });
    ok("0.L52.c2 · CONTROL · the accept side — HOUSE_FEE, /admin/house, a short id and an over-long one planted as rule keys are each read back and NOT reported (a pin that cries wolf is switched off by the next session)",
      cried.length === 0, `${benign.length} benign plants · falsely reported: ${j(cried)}`);

    /* ── the call sites, because the table fails open ──────────────────────────────────────────────── */
    const sites: Array<{ file: string; action: string | null; text: string }> = [];
    for (const rel of srcFiles()) {
      const code = decomment(read(rel));
      if (!code.includes("rateCheck")) continue;
      // The module's own internals forward their `action` PARAMETER to `rateCheck` (the Redis fallbacks); every
      // caller of the module is read below instead, exactly as 0.170 reads a writer primitive's call sites.
      if (rel === RL) continue;
      sites.push(...callSites(rel, code));
    }
    const files = new Set(sites.map((s) => s.file));
    ok("0.L52.2 · the population is real: every rateCheck / rateCheckAsync call site in src/ is read from the tree, the desk's own among them",
      sites.length >= 20 && files.has("src/lib/server/house-bot/designation.ts") && files.has("src/lib/server/house-console-read.ts"),
      `${sites.length} call sites in ${files.size} files (rate-limit.ts's own forwarding calls excluded by name)`);
    const unknown = sites.filter((s) => s.action == null || !keys.includes(s.action));
    ok("0.L52.3 · ⛔ every call site names a rule the table DECLARES — RATE_RULES is Record<string, RateRule>, so tsc cannot see a stale key and rateCheck returns allowed:true on one: a rename that missed a caller switches a live limiter off in silence",
      unknown.length === 0, j(unknown));

    /* ── the KEY column, because /admin/system paints that too ─────────────────────────────────────── */
    const keyDirty = sites.filter((s) => houseHits(s.key).length > 0);
    ok("0.L52.3b · ⛔ D19 · L52 · NO rateCheck KEY argument names the shared vocabulary either — /admin/system paints `b.key.slice(0, 30)` in the column beside the action, from the same snapshot, to the same ops VIEW audience, so a bucket keyed on a house identifier would be painted verbatim to staff this feature has no audience with",
      keyDirty.length === 0,
      `${sites.length} keys read from the tree · offenders: ${j(keyDirty.map((s) => [s.file, s.key, houseHits(s.key)]))}`);
    const keyPlant = (expr: string) => callSites("src/app/planted/keys.ts", `export async function f() { return rateCheckAsync(${expr}, "desk.picker"); }\n`);
    const keySamples = [
      ...HOUSE_IDENTIFIER_SAMPLES.map((i) => i),
      ...HOUSE_ID_SAMPLES.map((i) => `\`${i}\``),
      ...HOUSE_WORD_SAMPLES.map((w) => `\`${w}:\${userId}\``),
    ];
    const keyMissed = keySamples.filter((expr) => {
      const planted = keyPlant(expr);
      return planted.length !== 1 || houseHits(planted[0].key).length === 0;
    });
    const keyBenign = ["viewerUserId", "`${officerId}:${userId}`", "ip", "phone", "session.userId"];
    const keyCried = keyBenign.filter((expr) => {
      const planted = keyPlant(expr);
      return planted.length !== 1 || houseHits(planted[0].key).length > 0;
    });
    ok("0.L52.c5 · CONTROL · every sample of all three families planted as a KEY — a bare identifier, a bounded id in a template, and a word joined to a real id — is read back from the tree and REPORTED, and the five keys the tree actually uses today (the viewer, the `${officer}:${holder}` pair, an IP, a phone, a session id) are each read back and NOT reported",
      keyMissed.length === 0 && keyCried.length === 0 && keySamples.length >= 30,
      `${keySamples.length} house plants · missed ${j(keyMissed)} · ${keyBenign.length} benign plants · falsely reported ${j(keyCried)}`);

    /**
     * ⛔ **THE AUTHORITY DOC IS IN THE POPULATION, BECAUSE THE RENAME LEFT IT BEHIND** (C5-7's review, medium).
     * This section's own population is `srcFiles()`, which walks `src/` — so when L52 renamed the desk's rule key,
     * `docs/HOUSE-BOTS.md` went on naming the OLD one in two places and no guard on this branch could report it.
     * That doc is the feature's LAW, not history like the `plans/` files: a later session reads it, adds a caller
     * against the key it names, and 0.L52.3 reports the stale key only AFTER the fact. The mention shape is the
     * one this repository uses everywhere — `` `<key>` bucket `` — and every rule-shaped key written that way in
     * that doc must be one `RATE_RULES` declares.
     *
     * ⚠️ SCOPE, NAMED: this doc only. Other docs name rate buckets of other features with their own histories and
     * their own tables; widening the sweep to all of `docs/` would make this pin about them. A guard's scope is
     * part of its claim — which is the lesson this whole section was written for.
     */
    const AUTHORITY_DOC = "docs/HOUSE-BOTS.md";
    const docBuckets = (text: string): string[] =>
      [...text.matchAll(/`([a-zA-Z][a-zA-Z0-9_]*(?:\.[a-zA-Z][a-zA-Z0-9_]*)+)`\s+(?:rate\s+)?bucket/g)].map((mm) => mm[1]);
    const docText = read(AUTHORITY_DOC);
    const docNamed = docBuckets(docText);
    const docStale = docNamed.filter((k) => !keys.includes(k));
    ok("0.L52.4 · ⛔ every rate-limit bucket the feature's AUTHORITY doc names is one RATE_RULES declares — a rename that leaves the law naming a bucket that no longer exists teaches the next session the wrong key, and this section's src/-only population could never see it",
      docNamed.length > 0 && docStale.length === 0,
      `${AUTHORITY_DOC}: ${docNamed.length} bucket mention(s) ${j(docNamed)} · stale: ${j(docStale)}`);
    const docPlant = docBuckets(`${docText}\n\nthe \`desk.verify.gone\` bucket {capacity 3}\n`);
    ok("0.L52.c6 · CONTROL · the doc sweep READS the mention shape and REPORTS a key the table does not declare — so 0.L52.4's zero is a measurement of that document and not of a pattern that matches nothing in it",
      docPlant.length === docNamed.length + 1 && docPlant.filter((k) => !keys.includes(k)).join("|") === "desk.verify.gone",
      `${docNamed.length} → ${docPlant.length} mentions`);

    /* ⭐ THE DEFECT ITSELF, and it is the only control that proves this pin would have caught L52 rather than
     * something L52-shaped. The key this ruling removed is REBUILT from the shared sample by dropping its separator
     * (never re-typed here, so the word enters this file from the one module that owns it), planted, and required
     * to be reported. HOUSE_WORD_SAMPLES[3] is `house bot`; the separator-less spelling is what the table carried. */
    const historical = `${HOUSE_WORD_SAMPLES[3].replace(/ /g, "")}.verify`;
    const hist = rateRuleKeys(plant(historical));
    ok("0.L52.c4 · CONTROL · THE NEEDLE IS THE REAL DEFECT: the exact rule key this ruling removed, rebuilt from the shared sample by dropping its separator, is read back from the tree and reported — so 0.L52.1 is a sweep that would have gone red on the live branch, not one that has only ever seen clean code",
      hist.includes(historical) && hist.filter((x) => houseHits(x).length > 0).join("|") === historical,
      `planted ${historical} · reported ${j(hist.filter((x) => houseHits(x).length > 0))}`);

    const DESIG = "src/lib/server/house-bot/designation.ts";
    const desig = decomment(read(DESIG));
    const clean = callSites(DESIG, desig);
    const stale = callSites(DESIG, desig.replace(`"desk.verify"`, `"desk.verify.gone"`));
    const dynamic = callSites(DESIG, desig.replace(`, "desk.verify")`, `, RULE)`));
    ok("0.L52.c3 · CONTROL · at the real call site a stale key and a non-literal action are each reported, and the untouched file is clean — so 0.L52.3's zero is a measurement of this file and not of an empty list",
      clean.length === 1 && clean[0].action === "desk.verify"
      && stale.length === 1 && !keys.includes(stale[0].action ?? "")
      && dynamic.length === 1 && dynamic[0].action === null,
      j({ clean: clean.map((c) => c.action), stale: stale.map((c) => c.action), dynamic: dynamic.map((c) => c.action) }));
  });
}

if (STORE === "memory") {
  /**
   * ⛔ **§0 · RULING 250 · THE REL-0 COVERAGE ROLL-CALL, BUILT — BECAUSE C5-7 OWNED IT AND ANSWERED FOR FOUR IDS.**
   *
   * Ruling 250 (`C5-SPEC.md:2557-2596`) says a struck or reshaped scenario id counts as covered ONLY through an
   * assertion that names it, and its Proof line is "the REL-0 coverage gate reads each id against an assertion
   * label". C5-7 named FOUR — HB-LC-39/CRA-27, HB-ACC-12/CRA-04, CRA-10 and HB-ACC-13 — and `PROGRESS.md`'s
   * Scenario coverage gate still read "Ids covered by tests ⬜ not measured yet". Measured here on 2026-09-20:
   * of the ids ruling 250 itself lists, SEVEN are named somewhere under `src/` or `scripts/`, SEVEN are struck
   * whole by owner ruling D20 and closed in the register, and the rest are NOT.
   *
   * ⛔ THE POINT IS NOT THE NUMBER, IT IS THAT THE NUMBER CANNOT BE SILENT AGAIN. Rule 4 of this checkpoint's law:
   * "not applicable" is the most dangerous silent verdict. So an id is covered, or struck by D20 in the register,
   * or NAMED with a reason in `plans/house-bots/DEFERRED-TESTS.md` — and this assertion is what makes the third
   * option a written one instead of an omission. A gate not in the pipeline is not a gate; this one runs every day.
   */
  section("§0 · ruling 250 · the REL-0 scenario coverage roll-call for the ids this ruling names");
  await guard("0.250", () => {
    /* @roll-call-lists:start — ⛔ THE SEARCH MUST NOT FIND THIS FILE'S OWN LIST. The population includes this file
       (it carries four of the ids in real assertion labels), so without stripping the declaration region the gate
       reported all 49 ids "covered" on its first run — a scanner measuring itself, which is exactly the shape this
       checkpoint exists to refuse. `bodyOf` removes everything between these two markers when it reads SELF, and
       `0.250.c0` proves the strip really happens and really matters. */
    /** Ruling 250's own lists, transcribed from `C5-SPEC.md:2557-2596`. Data, so a list that shrinks is visible. */
    const NAMED_FORMS = ["HB-ACC-12", "CRA-04", "HB-ACC-13", "HB-ACC-14", "HB-ACC-32", "HB-ACC-40", "HB-LC-11",
      "HB-LC-39", "CRA-27", "CRA-10", "CRA-17", "FS-25", "FS-30"];
    const UNCHANGED = ["CRA-01", "CRA-02", "CRA-03", "CRA-07", "CRA-11", "CRA-12", "CRA-14", "CRA-16", "CRA-18",
      "CRA-21", "CRA-22", "CRA-28", "CRA-30", "CRA-31", "CRA-32", "CRA-33", "CRA-34", "CRA-35", "CRA-36",
      "HB-LC-17", "HB-LC-20", "HB-LC-26", "HB-LC-27", "HB-LC-34", "FS-05", "FS-22", "FS-26",
      "TGT-28", "TGT-36", "TGT-38", "TGT-39", "CRA-08", "CRA-19", "CRA-20", "FS-29", "HB-LC-24"];
    /** The seven D20 struck WHOLE, each closed by its own "Coverage gate: struck by D20" line in the register. */
    const STRUCK_WHOLE = ["CRA-02", "CRA-11", "CRA-18", "CRA-33", "CRA-36", "HB-LC-17", "TGT-39"];
    /* @roll-call-lists:end */
    const ALL = [...new Set([...NAMED_FORMS, ...UNCHANGED])];

    const REGISTER = "plans/house-bots/01-scenario-register.md";
    const DEFERRED = "plans/house-bots/DEFERRED-TESTS.md";
    const SELF = "scripts/lib/house-bot-reports-cases.mts";
    const LIST_START = "@roll-call-lists" + ":start", LIST_END = "@roll-call-lists" + ":end";
    const bodyOf = (rel: string): string => {
      const code = read(rel);
      if (rel !== SELF) return code;
      const a = code.indexOf(LIST_START), b = code.indexOf(LIST_END);
      return a >= 0 && b > a ? `${code.slice(0, a)}${code.slice(b)}` : code;
    };
    const population = [...srcFiles(), ...scriptFiles()];
    const found = new Set<string>();
    for (const rel of population) {
      const code = bodyOf(rel);
      for (const id of ALL) if (!found.has(id) && code.includes(id)) found.add(id);
    }
    const registerText = read(REGISTER);
    const deferredText = read(DEFERRED);
    const struckLines = (registerText.match(/Coverage gate: struck by D20/g) ?? []).length;
    const covers = (id: string) => found.has(id) || STRUCK_WHOLE.includes(id) || deferredText.includes(id);
    const undeclared = ALL.filter((id) => !covers(id));
    const deferredOnly = ALL.filter((id) => !found.has(id) && !STRUCK_WHOLE.includes(id));

    ok("0.250.0 · the population is real and it is printed: every id ruling 250 names, read against every tracked file under src/ and scripts/, with the register's D20 closures counted separately from the tree's hits",
      ALL.length >= 45 && population.length > 1500 && struckLines === STRUCK_WHOLE.length && registerText.length > 0,
      `${ALL.length} ids · ${population.length} files searched · ${found.size} named in the tree · ${struckLines} "struck by D20" closures in the register (expected ${STRUCK_WHOLE.length})`);
    ok("0.250.1 · ⛔ RULING 250 · every id it names is COVERED by an assertion label or comment in the tree, STRUCK whole by D20 and closed in the register, or listed BY NAME with a reason in DEFERRED-TESTS.md — an id that is none of the three is reported here, so 'not measured yet' can never again be the whole record",
      undeclared.length === 0,
      `covered in tree: ${j([...found].sort())} · struck by D20: ${STRUCK_WHOLE.length} · deferred by name: ${deferredOnly.length} · UNDECLARED: ${j(undeclared)}`);

    /* ⛔ THE CONTROLS. The gate's whole risk is that it reports clean because it searched nothing — or itself. */
    const selfSample = deferredOnly[0] ?? null;
    ok("0.250.c0 · CONTROL · the roll-call does not read its OWN declaration: the list region is stripped from this file before the search, and an id this file carries ONLY inside that list is still counted as NOT found — without the strip the gate reported all 49 ids covered on its first run, a scanner measuring itself",
      selfSample !== null && read(SELF).includes(selfSample) && !bodyOf(SELF).includes(selfSample) && bodyOf(SELF).length < read(SELF).length,
      `sample ${selfSample} · ${read(SELF).length - bodyOf(SELF).length} characters of declaration stripped`);
    const ghost = "CRA-99";
    const coversGhost = found.has(ghost) || STRUCK_WHOLE.includes(ghost) || deferredText.includes(ghost);
    const realDeferred = deferredOnly[0] ?? null;
    ok("0.250.c1 · CONTROL · an id that is in NO file, in no D20 closure and in no deferred row is REPORTED — and a real deferred id is NOT, so the third door is a door and not a hole",
      !coversGhost && realDeferred !== null && deferredText.includes(realDeferred) && !found.has(realDeferred),
      `ghost ${ghost} covered=${coversGhost} · sample deferred id ${realDeferred}`);
    const seen = ALL.filter((id) => found.has(id));
    ok("0.250.c2 · CONTROL · the tree search really finds ids: the four C5-7 named into assertion labels are among the hits, and an id typed nowhere is not — so `found` is a measurement of the tree and not an empty set",
      ["HB-LC-39", "CRA-27", "HB-ACC-12", "CRA-04", "CRA-10", "HB-ACC-13"].every((id) => seen.includes(id)) && !found.has(ghost),
      `${seen.length} of ${ALL.length} ids found in the tree`);
  });

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
    /* ⛔ THE PLANTED-CONTROL POPULATION MEASURED ITS OWN SHRINKING INPUT, AND NOTHING SAID SO (C5-8, 2026-09-21).
     * `HOUSE_WORD_SAMPLES` is the list every absence consumer plants: `2.v` in `test:house-bot-disclosure` asserts
     * `missed.length === 0` and merely PRINTS `${samples.length}`; `verify-house-bot-bundle.mjs:98` has the identical
     * shape and prints its own count at `:122`; `0.175.subset.module` directly above filters a list that may be
     * shorter than it was yesterday. Delete three samples and EVERY one of them passes — vacuously, over a smaller
     * population — because no assertion anywhere pinned the list against the vocabulary it is supposed to cover.
     * ⭐ So the population is DERIVED rather than pinned to a number: every top-level alternative of
     * `HOUSE_WORD_SOURCE` must be covered by at least one sample, and every sample must be matched by an
     * alternative. A deleted sample is reported by the alternative it orphaned; a word added to the vocabulary with
     * no sample is reported the day it lands; and neither direction can be satisfied by editing a count. */
    const topAlternatives = (src: string): string[] => {
      const out: string[] = [];
      let depth = 0, cur = "";
      for (let i = 0; i < src.length; i++) {
        const c = src[i];
        if (c === "\\") { cur += c + (src[i + 1] ?? ""); i++; continue; }
        if (c === "(") depth++;
        else if (c === ")") depth--;
        else if (c === "|" && depth === 0) { out.push(cur); cur = ""; continue; }
        cur += c;
      }
      out.push(cur);
      return out.filter((a) => a.length > 0);
    };
    const coverage = (samples: readonly string[]) => {
      const alts = topAlternatives(HOUSE_WORD_SOURCE);
      return {
        alts: alts.length,
        uncovered: alts.filter((a) => !samples.some((s) => new RegExp(a, "i").test(s))),
        orphans: samples.filter((s) => !alts.some((a) => new RegExp(a, "i").test(s))),
      };
    };
    const cov = coverage(HOUSE_WORD_SAMPLES);
    ok("0.175.samples · ⛔ the planted-control population is DERIVED from the vocabulary, never maintained beside it: every top-level alternative of HOUSE_WORD_SOURCE is covered by at least one HOUSE_WORD_SAMPLES entry, and every sample is matched by an alternative — a deleted sample makes every consumer's planted control pass over a smaller list, and no assertion measured that until this one",
      cov.uncovered.length === 0 && cov.orphans.length === 0 && cov.alts >= 12 && HOUSE_WORD_SAMPLES.length >= cov.alts,
      j({ alternatives: cov.alts, samples: HOUSE_WORD_SAMPLES.length, uncovered: cov.uncovered, orphans: cov.orphans }));
    /* ⛔ AND THE CONTROL, over the same measure: the three samples C5's register deletes, and a sample that covers
     * nothing. A coverage check that has never been shown to REPORT a gap is a coverage check that measures nothing. */
    const without3 = HOUSE_WORD_SAMPLES.filter((s) => !["chosen by staff", "chosen by you", "including house"].includes(s));
    const plantedOrphan = coverage([...HOUSE_WORD_SAMPLES, "a perfectly ordinary sentence"]);
    ok("0.175.samples.c1 · CONTROL · the SAME measure over a copy of the list with C5-s5's three deletions reports the two alternatives they orphaned, a sample matching no alternative is reported, and the real list is reported clean",
      coverage(without3).uncovered.length === 2 && plantedOrphan.orphans.length === 1 && coverage(HOUSE_WORD_SAMPLES).uncovered.length === 0,
      j({ deleted3: coverage(without3).uncovered, plantedOrphan: plantedOrphan.orphans }));
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
      /* ⛔ 7 → 9 on 2026-09-20, and GROWING THIS NUMBER IS A DEBT BEING RECORDED, NEVER A PERMISSION. `dal-mem`
       * and `dal-pg` arrived with this lane's own claim anchors and 0.505 reported them audited by nobody the same
       * day — the guard working. They are owed in `test:house-bot-migrations` §d (its labels are `d · <outcome
       * key>`, a superstring of their `expect` values), not written here because that suite creates fixed-name
       * hb_mig_* databases on a cluster shared with two other lanes. `rules` went the OTHER way in the same
       * commit — it gained a real roll-call (house-bot-rules 7.505) and is in SITES, not here. */
      problems.length === 0 && anchorFiles.length >= 6 && audited + owed >= 354 && Object.keys(ROLL_CALL_OWED).length === 9,
      j({ anchorFiles, keys: Object.fromEntries([...keys].sort()), audited, owed, total: audited + owed, owedKeys: Object.keys(ROLL_CALL_OWED).sort(), problems }));
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
/**
 * ⭐ MOVED TO `scripts/lib/player-surface-text.mts` BY COMMIT 6 (2026-09-20), body unchanged, and imported back here so
 * there is exactly ONE print measure on the platform. `0.198.3` runs it over exactly TWO files (`PLAYER_SURFACE_FILES`)
 * while `0.198.1`'s IMPORT measure runs over the whole 400-plus player population — so a house sentence written as JSX
 * text into the rulebooks, the FAQ, the home page or the leaderboard was held by nothing static.
 * `test:house-bot-disclosure` §5.2 closes that gap over the full population. It could not import it from HERE: this
 * module RUNS its cases on import (the two-store child loads it), so a pure suite has to take the measure from a pure
 * module. A second COPY of the measure was the other option, and ruling 175's header records what copies of an absence
 * measure do: the three that each wrote their own word pattern drifted until two guards disagreed about one file.
 */
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
export const AUDIT_NON_READERS = [
  "AuditCategory", "AuditEntry", "UNVERIFIABLE_BASELINE_ACTION", "UnverifiableBaseline", "audit", "auditBootId",
  "auditFlush", "auditPending", "auditRingSize", "auditTicketsIssued", "censusUnverifiable", "classifyChainLinks",
  "readUnverifiableBaseline", "reconstructChainOrder", "verifyChain", "verifyChainFull",
] as const;
/*
 * ⭐ SIX NAMES ADDED 2026-09-21 BY THE ops LANE, AND THEY ARE THE MERGE'S OWN DEFECT — `auditBootId`,
 * `auditTicketsIssued`, `UNVERIFIABLE_BASELINE_ACTION`, `UnverifiableBaseline`, `readUnverifiableBaseline`,
 * `censusUnverifiable`. The audit-attestation lane's commit `c52c5c44` arrived inside rel-lane's tip `5c38f3d3`
 * in freeze merge 3/3; NEITHER BRANCH WAS RED ALONE, because the branch that wrote the exports carries no house
 * guard and the branch that carries the guard had never seen the exports. That is what this list is for, and it
 * is the second time in one night it has caught a lane that had never heard of D19 (`auditPending`, above).
 *
 * ⛔ EACH WAS JUDGED ON ITS OWN BODY, NOT ON THE SET, and the question asked of each was the ONE this list asks:
 * does it return an audit ROW? Not "is it convenient to classify".
 *   · `auditBootId()` → `string`. `globalThis.__50PICK_AUDIT_BOOT ??= "b<time36><hex>"`. No `db.auditLog` call,
 *     no ring read. This process's identity, so a gap detector can say WHICH boot lost an append.
 *   · `auditTicketsIssued()` → `number`, straight off `globalThis.__50PICK_AUDIT_TICKET`. No row.
 *   · `UNVERIFIABLE_BASELINE_ACTION` → the constant string `"audit.unverifiable_baseline"`. A platform COMPLIANCE
 *     action name, in the same class as every other action name this module writes. It returns nothing at all.
 *   · `UnverifiableBaseline` → a TYPE, erased at compile time, in exactly the class `AuditEntry` and
 *     `AuditCategory` were already classified in.
 *   · `readUnverifiableBaseline()` → the only one that gave pause, and it is classified on its BODY: it does read
 *     `db.auditLog`, but under `where: { action: UNVERIFIABLE_BASELINE_ACTION }` — ONE platform action, fixed in
 *     source — and it returns `UnverifiableBaseline | null`, six scalars assembled field by field. The row's
 *     `payload` is parsed and DROPPED; no `AuditEntry` leaves it. ⛔ And the decisive consistency argument: the
 *     SAME value already leaves this module through `verifyChainFull()`'s `baseline` field, and `verifyChainFull`
 *     has been a declared non-reader since this list existed. Classifying the reader as a ROW reader while its
 *     own caller stayed a non-reader would have been incoherent, not strict.
 *   · `censusUnverifiable()` → reads rows to fold their hashes and returns four scalars
 *     (`frontierSeq`, `count`, `digest`, `scanned`). Same class as `verifyChainFull()`, which is what it shares
 *     `walkHashes` with so the two can never disagree.
 * ⭐ AND THE CORROBORATION, WHICH IS EVIDENCE AND NOT THE REASON: NOT ONE of the six has a call site anywhere under
 * `src/` (measured over the tree, 2026-09-21). Every caller is a script — `scripts/audit-attest.test.mts`,
 * `scripts/audit-baseline.mts`, `scripts/rehearsals/audit-hole*.mts`. No console file and no player file reaches
 * any of them, so the gate question does not even arise today. It would arise tomorrow, which is why the two that
 * touch `db.auditLog` are now PINNED rather than merely described — `auditNonReaderRowClaimProblems` below, and
 * `0.260.2`. ⛔ A classification held by prose is the exemption this programme keeps finding; this one is measured.
 */
/*
 * ⭐ `auditPending` ADDED 2026-09-21 BY THE ops ← rel-lane MERGE, AND IT IS THE GUARD WORKING, NOT A NUISANCE.
 * The shutdown-drain lane (`origin/rel-lane` `09398014`) added one export to the audit module — a counter of the
 * appends queued and not yet stamped, which `audit-drain.ts` reads to report how many rows a dying process saved
 * and how many it abandoned. 0.260.1 turned RED on the merged tree at once, in the exact words this docblock
 * promises: "exports auditPending, which is neither an audit row reader nor a declared non-reader". That is the
 * whole point of holding the module to two exhaustive lists — a lane that has never heard of D19 cannot widen the
 * audit module's surface without a house guard saying so.
 * ⛔ IT IS CLASSIFIED HERE, NOT EXEMPTED: `auditPending()` returns `number` — `globalThis.__50PICK_AUDIT_PENDING ?? 0`
 * — and touches no row, no `db.auditLog` call and no ring entry. Read from the merged source, not from its name.
 * A row reader added under a plausible name would still have to go in the OTHER list and would still be held to the
 * gate; nothing about this entry makes the next export easier to wave through.
 */
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
  /* ⛔ RULING 434, AND THE OLD REASONING WAS MEASURED FALSE. It read "the refused-funds decisions only, read by
     their actions" — true of the ACTION, false of the PAYLOAD. `/admin/kyc/refused` rendered an officer's refused-
     funds JUSTIFICATION verbatim, in a `<td>`, status 200, to a signed-in PLAYER, the holder and a trigger player
     in all three modes (9 responses captured). A reader classified by the ACTIONS it reads says nothing about what
     its rows CARRY, and 0.434 below is the guard that closes the class rather than the one page. */
  "src/lib/server/refused-funds.ts": "the refused-funds decisions only, read by their actions (REFUSED_FUNDS_ACTION) — but its ROWS carry an officer's free-text justification, so every page that renders them decides its audience on the STORED role first (434, guard 0.434)",
  "src/lib/server/report-pack.ts": "a report pack's own pack.* rows",
  "src/lib/server/reports/catalogue.ts": "report files behind the platform's report gate: the ISO 27001 chain export and the RG engagement report's rg.* rows",
  "src/lib/server/user-service.ts": "a player's own export and feed: house actions excluded in the read and house keys stripped (rulings 154, 170)",
};
/**
 * ⛔ WHAT EACH CLASSIFIED READER'S ROWS DO — the half the table above never carried, and the half ruling 434 turned on.
 *
 * Every entry above says WHY a module outside the console may call an audit row reader. None of them said what its rows
 * then CARRY, and that is the distinction 434 was taken on: `refused-funds.ts` was excused because "its ACTIONS are
 * never house actions" — true of the action, FALSE of the payload, which is an officer's free-text justification
 * rendered in a `<td>` at status 200 to any signed-in account (9 responses captured, ruling 259's class).
 *
 *   · `handedOn` — the rows, or a value resolved from them, reach a PAGE's payload intact. Every admin page that
 *     imports from one of these decides its audience on the STORED role before it reads (guard 0.434).
 *   · `folded`   — the rows are reduced to counts, keys or one notice inside the module; no row leaves it.
 *   · `stripped` — the read itself excludes house actions and strips house keys (rulings 154, 170).
 *   · `gated`    — the rows leave only through the platform's own report gate, which decides its own audience.
 *
 * ⛔ EVERY KEY OF `AUDIT_READERS_OUTSIDE_CONSOLE` MUST APPEAR HERE, and 0.434 asserts it: a module added to that table
 * without a payload classification would otherwise be outside this guard on the day it lands, which is the class.
 */
export const AUDIT_ROW_PAYLOAD: Readonly<Record<string, "handedOn" | "folded" | "stripped" | "gated">> = {
  "src/app/api/dev-test/stress-regulator-grade/route.ts": "folded",
  "src/lib/server/house-bot/eligibility.ts": "folded",
  "src/lib/server/house-bot/oversight.ts": "folded",
  "src/lib/server/kyc-risk.ts": "handedOn",
  "src/lib/server/notification-service.ts": "folded",
  "src/lib/server/refused-funds.ts": "handedOn",
  "src/lib/server/report-pack.ts": "gated",
  "src/lib/server/reports/catalogue.ts": "gated",
  "src/lib/server/user-service.ts": "stripped",
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
/* ⭐ C7 step 3b · replan ruling 537 · `houseLimitsSaveForConsole` is the section's first WRITER, and it joins this
 * table for the same reason every reader does: ruling 523 measured that a server action is a POST to whatever URL the
 * browser is on, carrying a `Next-Action` id, so NO path rule can see it — the arity pin, the signed-in-viewer pin
 * and the own-route pin are the only things standing between it and ruling 259's measured defect class.
 * ⚠️ AND `houseDetailForConsole` IS PINNED AT **4**, NOT 3, FROM C7 STEP 4c — RE-ANCHORED, NEVER RELAXED. The
 * account page's Targets grid gained a numbered pager, so the gate now takes the requested page as its fourth
 * argument. The pin's job is unchanged and undiminished: a call with the wrong number of arguments is still red,
 * and the viewer pin and the own-route pin below still read arguments 0 and 1. A door that grows an argument gets
 * its pin MOVED TO THE NEW SHAPE; it never gets the pin dropped. */
export const CONSOLE_GATES: Readonly<Record<string, number>> = { houseStakeForConsole: 3, houseBotLabelsForConsole: 3, houseConsoleAudience: 2, houseAuditForConsole: 3, houseRosterForConsole: 2, houseUsageForConsole: 3, houseLimitsSaveForConsole: 3, houseRulesSaveForConsole: 3, houseDetailForConsole: 4, houseFeedForConsole: 3, houseHistoryForConsole: 3, houseCancelIntentForConsole: 3, houseSwitchForConsole: 3, houseAccountActForConsole: 3, houseAccountsForConsole: 3, houseCheckForConsole: 3, houseDesignateForConsole: 3, houseWhyIdleForConsole: 3 };
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

/**
 * ⛔ THE TWO CLASSIFIED NON-READERS THAT ACTUALLY TOUCH `db.auditLog`, HELD TO THE CLAIM THEIR CLASSIFICATION MAKES.
 *
 * `AUDIT_NON_READERS` says of every name on it: it returns no row. For eight of the sixteen that is true by
 * inspection and can never stop being true (a `string`, a `number`, a type, a constant). For
 * `readUnverifiableBaseline` and `censusUnverifiable` it is true because of what their BODIES do — a `where`
 * clause pinned to one platform action, and a return shape assembled field by field — and a body can be edited.
 * ⛔ THAT IS EXACTLY THE SHAPE OF EVERY EXEMPTION THIS PROGRAMME HAS HAD TO UNDO: a claim written in prose beside a
 * list, with nothing measuring it. Widening the `where` to `{}` would turn the reader into a general row reader
 * with the classification still reading "non-reader" and every guard still green.
 * ⚠️ `verifyChainFull` is NOT in this population and that is deliberate rather than an oversight: it is the older
 * name, it returns a VERDICT whose `baseline` field is this very reader's output, and pinning its whole body from a
 * house suite would be this suite claiming an area it does not own. What is pinned here is the claim the SIX new
 * classifications rest on, and nothing wider.
 */
export const AUDIT_ROW_TOUCHING_NON_READERS = ["readUnverifiableBaseline", "censusUnverifiable"] as const;
export function auditNonReaderRowClaimProblems(file: string, code: string): string[] {
  const problems: string[] = [];
  const ws = (s: string) => s.replace(/\s+/g, " ");
  const reader = ws(functionDeclarationText(file, code, "readUnverifiableBaseline"));
  const census = ws(functionDeclarationText(file, code, "censusUnverifiable"));
  if (reader.length < 200) problems.push(`${file}: readUnverifiableBaseline was not found (or is a stub) — the classification is unproved`);
  else {
    if (!/where: \{ action: UNVERIFIABLE_BASELINE_ACTION \}/.test(reader))
      problems.push(`${file}: readUnverifiableBaseline reads db.auditLog without pinning where.action to UNVERIFIABLE_BASELINE_ACTION — it can return any row, and AUDIT_NON_READERS says it returns none`);
    if (!/\): Promise<UnverifiableBaseline \| null> \{/.test(reader))
      problems.push(`${file}: readUnverifiableBaseline no longer returns Promise<UnverifiableBaseline | null> — the classification's "returns no row" is unproved`);
  }
  if (census.length < 100) problems.push(`${file}: censusUnverifiable was not found (or is a stub) — the classification is unproved`);
  else if (!/\): Promise<\{ frontierSeq: number; count: number; digest: string; scanned: number; \}> \{/.test(census))
    problems.push(`${file}: censusUnverifiable no longer returns four scalars — the classification's "returns no row" is unproved`);
  for (const name of AUDIT_ROW_TOUCHING_NON_READERS) {
    const body = ws(functionDeclarationText(file, code, name));
    if (body.length > 0 && /\bAuditEntry\b/.test(body)) problems.push(`${file}: ${name} names AuditEntry — a declared non-reader must hand no row out`);
  }
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
export const CONSOLE_GATE_NON_READERS = ["ConsoleAuditRead", "ConsoleDeskShell", "ConsoleDetailAnswer",
  "ConsoleDetailView", "ConsoleEmpty", "ConsoleKpiTile",
  "ConsoleLimitRow", "ConsoleLimitsSaveInput", "ConsoleLimitsSaveResult", "ConsoleLimitsView", "ConsoleRosterRow",
  /* ⭐ 2026-09-21 · the account rules save's three TYPES. `ConsoleRulesSaveInput`/`Result` are the writer's own
     shapes, beside the limits pair two entries up; `ConsoleRulesForm` is the row-and-copy model the account
     page hands its form. None awaits, reaches `db.`, names a store member or decides an audience — the gated
     door itself is `houseRulesSaveForConsole`, which has its `CONSOLE_GATES` arity entry. */
  "ConsoleRulesForm", "ConsoleRulesSaveInput", "ConsoleRulesSaveResult",
  /* ⭐ 2026-09-23 · the rules COPY TABLE, exported so the admin PDF guide is generated from the console's own
     sentences rather than a hand-copied second set of them. It is a `Record<string, string>` of prose: it
     awaits nothing, reaches no `db.`, names no store member and decides no audience. A guide that disagrees
     with the screen is worse than no guide, and 29 sentences copied by hand disagree within one edit. */
  "CONSOLE_RULE_HELP",
  /* ⭐ 2026-09-21 · the account's START-READINESS shape — what is still to fill before it can run, the owner's
     report from the live demo. It is a pure view model built from `ConsoleRulesForm`'s own caps and switches:
     it awaits nothing, reaches no `db.`, names no store member and decides no audience. The gated door that
     carries it is `houseDetailForConsole`, which has its own `CONSOLE_GATES` arity entry. */
  "ConsoleStartReadiness",
  /* ⭐ 2026-09-23 · the "why is this account not staking?" panel's shape. It is a painted view model — a
     headline, the refusals in the console's own sentences, and what the walk looked at. It awaits nothing,
     reaches no `db.`, names no store member and decides no audience. The gated door that carries it is
     `houseWhyIdleForConsole`, which has its own `CONSOLE_GATES` arity entry. */
  "ConsoleWhyIdleView",
  "ConsoleRosterView", "ConsoleRuleRow", "ConsoleTargetRow", "ConsoleUsageCell",
  "ConsoleUsageHalf", "ConsoleUsageQuery", "ConsoleUsageRow", "HOUSE_CONSOLE_PREFIX", "OPERATOR_DATA_EXEMPT",
  "ACCOUNT_TARGETED_DAILY_TZS_FIELD", "TARGETED_DAILY_TZS_FIELD", "clampOperatorText", "consoleLimitLabel",
  /* ⭐ C7 step 4 · ruling 432(f)'s neutral way-out override. Both are PURE COPY: `consoleWayOutKey` maps a live cause
     to the key its sentence is overridden by, and `consoleWayOutCopy` picks the console's sentence or the shared one
     and fills its `{label}`. Neither awaits, reaches `db.`, names a store member or decides an audience — which is
     what 0.512b checks rather than takes on trust. */
  "consoleWayOutCopy", "consoleWayOutKey",
  /* ⭐ C7 step 4 · the account page's two pure helpers: one target-end caption in the console's own words, and
     the relative "Last bet" phrase with its absolute EAT title. Neither reads anything. */
  "consoleTargetEndCaption", "relativeEat",
  /* ⭐ C7 step 4b · the master-switch ceremony's own CONSTANTS and its posted/returned shapes. The typed word
     (owner-delegated ruling 454) and the reason's bounds (415) live on the SERVER and are handed to the dialog as
     props, because ruling 388 refuses a client file that carries the sentence or the word — and the word is
     checked again on the way back, since a ceremony verified only in a browser is one a crafted POST walks
     through. None of the four reads anything; `houseSwitchForConsole` is the reader, and it has its entry. */
  "CONSOLE_SWITCH_ON_WORD", "CONSOLE_REASON_MIN", "CONSOLE_REASON_MAX",
  "ConsoleSwitchDialog", "ConsoleSwitchInput", "ConsoleSwitchResult",
  /* ⭐ C7 step 4b · the engine-health Callout (ruling 435(e)): its painted shape, and the one pure function that
     turns a planner duty NAME into the console's own words. Neither reads anything — the FACTS arrive through the
     roster reader's own settled set, which is the whole point of 435(e). */
  "ConsoleEngineNotice", "consoleDutyPhrase",
  /* ⭐ C7 step 4b · the account action row (ruling 415): the word that arms a removal, what the row posts and
     what it gets back, and one act's finished copy. The gated WRITER is , above. */
  "CONSOLE_REMOVE_WORD", "ConsoleAccountActDialog", "ConsoleAccountActInput", "ConsoleAccountActKind", "ConsoleAccountActResult",
  /* ⭐ C7 step 6 · the designate wizard's own CONSTANT, its painted shapes and the one pure function that turns an
     eligibility CODE into the console's own sentence. `consoleCheckSentence` is a table lookup with a fallback: it
     awaits nothing, names no store and decides no audience, which is what 0.512b checks rather than takes on trust.
     The three gated doors — the lookup, the check and the write — each have their `CONSOLE_GATES` entry above. */
  "CONSOLE_PICKER_EMPTY", "ConsoleCheckRow", "ConsoleCheckView", "ConsoleDesignateInput", "ConsoleDesignateResult",
  "ConsoleFunded", "ConsolePickerAnswer", "ConsolePickerRow", "consoleCheckSentence",
  /* ⭐ C7 step 6's FIX PASS · four more CONSTANTS, each of them pure copy, and each named here because the review
     found the thing it exists for. `CONSOLE_PICKER_BUSY` is the sentence a rate-limited lookup answers, which is
     NOT the refusal's (387(c)'s parity is between a refused caller and a search that found nothing, and an owner
     already inside the audience is neither). `CONSOLE_WIZARD_COPY` is every sentence longer than a label that the
     wizard paints — ruling 388's Proof moved them off the `"use client"` file, where they were shipping verbatim
     in a public chunk. And the two label sentences are exported BY NAME because a case that pins only
     `field === "label"` cannot tell the console's early check from the service's late one: both answer that field,
     so only the SENTENCE distinguishes them. None of the four awaits, reaches a store or decides an audience. */
  "CONSOLE_PICKER_BUSY", "CONSOLE_WIZARD_COPY", "CONSOLE_DESIGNATE_LABEL_LENGTH", "CONSOLE_DESIGNATE_LABEL_TAKEN",
  /* ⭐ C7 step 5 (the account half) · the two panels' painted SHAPES, the query shape the door validates, and ONE
     constant: `CONSOLE_EVENT_WORD`, a TOTAL `Record<HouseBotEventKind, string>`. It is exported so the suite can
     compare its key set with `EVENT_KINDS` member for member rather than regexing the source for a fallback — the
     strongest form of "no raw enum reaches the screen", and the one a source scan cannot give. It is pure copy:
     it awaits nothing, names no store and decides no audience, which is what 0.512b checks rather than assumes.
     ⛔ The two panels' READER is `houseDetailForConsole`, which has its `CONSOLE_GATES` entry above — the arity
     pin MOVED with the door's shape at this step (a query object in place of a bare page number) and stayed at 4. */
  "CONSOLE_EVENT_WORD", "CONSOLE_FEED_AXES", "CONSOLE_REFUSAL_TITLE", "ConsoleQuery", "ConsoleEventRow", "ConsoleFeedAxis", "ConsoleFeedRow",
  "ConsoleFilterGroup", "ConsoleFilterOption",
  /* ⭐ C7 step 5 (the LANDING half) · the two desk-wide panels' painted SHAPES and the cancel control's finished
     copy. Every one of them is a TYPE: it awaits nothing, names no store and decides no audience, which is what
     0.512b checks rather than takes on trust. ⛔ Their READERS are `houseFeedForConsole` and
     `houseHistoryForConsole`, each with its own `CONSOLE_GATES` entry above at arity THREE — the viewer, the
     calling file's own route as a string literal, and the REQUEST's untouched query string. */
  "ConsoleCancelCopy", "ConsoleCancelInput", "ConsoleCancelResult", "ConsoleDeskEventRow", "ConsoleDeskFeedRow", "ConsoleFeedView", "ConsoleHistoryView",
  /* ⭐ 2026-09-22 · the account page's NOT-FOUND copy. `CONSOLE_ACCOUNT_MISSING` is a frozen object of three
     sentences the `[id]` page paints when the address names an account the desk does not have. It shipped with
     the console work and without a classification, which is exactly the hole 0.512 exists to take: it is pure
     copy — it awaits nothing, reaches no `db.`, names no store member and decides no audience (0.512b checks
     that rather than taking this sentence on trust). It CREATES NO ORACLE either: a viewer outside the audience
     is answered `null` by the gated reader whether or not the record exists, so only an admin ever sees it. */
  "CONSOLE_ACCOUNT_MISSING",
  /* ⭐ 2026-09-23 · the desk-wide history's own THREE subject words (D9 minor M6). They were three module-scope
     consts; `gone` read "Removed from the desk", which is `CONSOLE_EVENT_WORD.REMOVED` character for character, so
     the subject column of a removal row printed the event. The fix is a word that names a subject — and the check
     that keeps it fixed compares the whole of this map with the whole of the event map, which is why the object is
     exported rather than regexed out of the source. Pure copy: it awaits nothing, reaches no `db.`, names no store
     member and decides no audience (0.512b checks that rather than taking this sentence on trust). */
  "CONSOLE_ACCOUNT_WORD",
  "isHouseConsoleRoute", "unsetCaptionFor"] as const;

/**
 * ⛔ A DECLARATION IS NOT A PROOF — EVERY VALUE EXPORT CLASSED A NON-READER IS CHECKED AGAINST WHAT IT DOES.
 *
 * The list above is an EXEMPTION from 0.512's completeness rule, and nothing verified that a name on it earns its
 * place: it gained eight entries at C7 step 3, two of them exported FUNCTIONS (`consoleLimitLabel`,
 * `unsetCaptionFor`), and a "non-reader" that later grew a `houseBotStore.…` call or an audience decision would have
 * kept 0.512 green while shipping exactly the hole ruling 259 measured. An exemption list is how a completeness check
 * comes to exempt the thing it exists to police, which the list's own docblock says three lines above.
 *
 * What a non-reader may not contain, in its own declaration: `await` (every gated reader is async and every store
 * read on this path is awaited), `db.`, any `…Store.` member access, or `houseConsoleAudience` — the audience
 * decision itself. Type aliases and interfaces have no body and are skipped BY NAME COUNT, which the caller floors,
 * so "no value declarations found" cannot read as compliance.
 */
export function consoleNonReaderProblems(file: string, code: string): { checked: string[]; problems: string[] } {
  const FORBIDDEN: Array<[string, RegExp]> = [
    ["await", /\bawait\b/],
    ["db.", /\bdb\./],
    ["a store member", /\b\w*Store\./],
    ["houseConsoleAudience", /\bhouseConsoleAudience\b/],
  ];
  const names = new Set(CONSOLE_GATE_NON_READERS as readonly string[]);
  const checked: string[] = [];
  const problems: string[] = [];
  const inspect = (name: string, text: string) => {
    checked.push(name);
    for (const [what, re] of FORBIDDEN) {
      if (re.test(text)) problems.push(`${file}: ${name} is declared a NON-READER but its body names ${what} — an exemption is not a licence to read`);
    }
  };
  walkTree(parse(file, code), (n) => {
    const exported = (ts.canHaveModifiers(n) ? ts.getModifiers(n) ?? [] : []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
    if (!exported) return;
    if (ts.isFunctionDeclaration(n) && n.name && names.has(n.name.text)) inspect(n.name.text, n.getText());
    if (ts.isVariableStatement(n)) {
      for (const d of n.declarationList.declarations) {
        for (const nm of bindingNames(d.name)) if (names.has(nm)) inspect(nm, d.getText());
      }
    }
  });
  return { checked, problems };
}

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

/* ═══ §0 · C5-8 · THE BEHAVIOURS WHOSE GUARD LEFT WITH A STRUCK RULING, AND NOTHING SAID SO ═══════════════════
 *
 * ⛔ WHAT THESE PINS ARE, AND WHY THEY ARE NEW. C5-8 re-resolved the four mutation registers against this tree and
 * found 29 entries whose `from` resolves EXACTLY ONCE — the site is still there, byte for byte — while naming
 * assertions that exist nowhere in the suite they name. An assertion can disappear three ways and they are NOT the
 * same thing: (a) the BEHAVIOUR was struck by a ruling and its assertion went with it, so the entry retires; (b) the
 * assertion was renamed or absorbed, so the entry re-points; or ⛔ (c) THE BEHAVIOUR IS STILL SHIPPED AND THE
 * ASSERTION SIMPLY VANISHED. Eleven were (c) — an unguarded behaviour with a ready-made mutation still pointing at
 * it. Each pin below closes one of them, and each has a declaration in `scripts/anchors/house-bot-c5.anchors.mjs`
 * that `red:house-bot-c5` WRITES INTO THE REAL FILE and drives, because an assertion nobody has seen go red is a
 * claim, not a guard.
 *
 * ⛔ FIVE OF THE ELEVEN ARE ABSENCE RULES WHOSE WHOLE FORCE WAS IN AN ASSERTION THAT WENT OUT WITH A STRUCK RULING.
 * Ruling 197 — the KYC card's "of which house stakes" line and the `kycMoneyFacts.house*` fields behind it — was
 * STRUCK by owner ruling D20 (`C5-D20-REPLAN.md:33`) and un-built in C5-5b. The un-build deleted the CODE and the
 * cases that watched it in the same pass, so from 2026-09-17 until this section landed, nothing in the repository
 * measured that the KYC case STAYS house-blind. `0.197.1`–`0.197.3` are that measurement, and they are an absence
 * proof in exactly the shape `0.187.1` and `0.191.0` already use for the same owner ruling.
 *
 * ⚠️ AND TWO OF THEM ARE NOT HOUSE BEHAVIOUR AT ALL — which is the whole reason they were invisible. `0.m5.1` and
 * `0.m5.2` pin `main`'s own emergency-void confirmation: which officer classes it is addressed to, and the fixed row
 * set of the letter it sends. A house case happened to cover both, and when that case was struck they lost their
 * only guard. They are pinned HERE because this is the suite that already reads `market-service.ts` and `email.ts`
 * as source — not because they are house rules, and the next session should not read them as any.
 */
if (STORE === "memory") {
  section("§0 · C5-8 · rulings 197 and 170 under D20, and the two `main` behaviours a struck house case was silently guarding");

  /** The KYC case, whose read (`kyc-risk.ts`) and whose surfaces (`src/app/admin/kyc/`) ruling 197 built on. */
  const KYC_READ = "src/lib/server/kyc-risk.ts";
  const KYC_CASE_PAGE = "src/app/admin/kyc/[id]/page.tsx";
  const KYC_DIR = "src/app/admin/kyc/";
  /**
   * The two `kycMoneyFacts` fields ruling 197 built and owner ruling D20 struck. ⛔ NEEDLES, never code: neither
   * matches ANY alternative of `HOUSE_IDENTIFIER_SOURCE` (`houseBetCount` is not `HouseBot\w*`), which is exactly why
   * the vocabulary alone could not see the register's own mutations and why this list has to exist beside it.
   */
  const KYC_STRUCK_197 = ["houseBetCount", "houseStakedTzs"] as const;
  const struck197In = (code: string) => KYC_STRUCK_197.filter((n) => new RegExp(`\\b${n}\\b`).test(code));
  /** The six judgement props the client decision rail takes today — pinned BY VALUE, so a renamed prop is a decision. */
  const KYC_RAIL_PROPS = ["userId", "autoChecks", "makerCheckerRequired", "hasRecommendation", "isRecommender", "recommenderName"];
  /** Every attribute a `<tag …>` carries, in source order; a spread is reported as `...` (a money object's own door). */
  const jsxAttrNames = (file: string, code: string, tag: string): string[][] => {
    const out: string[][] = [];
    walkTree(parse(file, code), (n) => {
      if (!ts.isJsxOpeningLikeElement(n) || n.tagName.getText() !== tag) return;
      out.push(n.attributes.properties.map((p) => (ts.isJsxSpreadAttribute(p) ? "..." : p.name.getText())));
    });
    return out;
  };

  await guard("0.197", () => {
    const kycRead = decomment(read(KYC_READ));
    const readHits = houseHitsByFamily(kycRead).map((h) => `${h.family}:${h.word}`);
    ok("0.197.1 · ⛔ OWNER RULING D20 · ruling 197 is STRUCK, so the KYC READ is house-blind: src/lib/server/kyc-risk.ts, decommented, carries no vocabulary word, no house identifier and neither struck kycMoneyFacts.house* field — so neither the bet count an officer reads nor a single risk factor can be derived from a marked stake",
      readHits.length === 0 && struck197In(kycRead).length === 0 && kycRead.length > 8_000,
      j({ chars: kycRead.length, hits: readHits, struck: struck197In(kycRead) }));

    const kycModules = srcFiles().filter((rel) => rel.startsWith(KYC_DIR));
    const moduleProblems = kycModules
      .map((rel) => ({ rel, code: decomment(read(rel)) }))
      .map(({ rel, code }) => ({ rel, hits: houseHitsByFamily(code).map((h) => `${h.family}:${h.word}`), struck: struck197In(code) }))
      .filter((x) => x.hits.length > 0 || x.struck.length > 0);
    ok("0.197.2 · ⛔ OWNER RULING D20 · not one module under src/app/admin/kyc/ — every file walked from disk, client component, \"use server\" action and page alike — names a house figure: no vocabulary word, no house identifier, and neither of the two struck kycMoneyFacts.house* fields; the KYC surface is where ruling 197's line was painted and it is the one the un-build left unwatched",
      moduleProblems.length === 0 && kycModules.length >= 10,
      j({ population: kycModules.length, problems: moduleProblems }));

    const pageCode = decomment(read(KYC_CASE_PAGE));
    const railSites = jsxAttrNames(KYC_CASE_PAGE, pageCode, "KycDecisionRail");
    ok("0.197.3 · ⛔ OWNER RULING D20 · the KYC case page hands its CLIENT decision rail exactly the six judgement props it takes today and nothing a money object could ride in on — no spread, and no seventh attribute; moneyFacts stays on the server, where canSeeMoney decides figure by figure what is painted, and a whole object handed to a \"use client\" rail is serialised into the flight payload regardless",
      railSites.length === 1 && j(railSites[0]) === j(KYC_RAIL_PROPS),
      j({ sites: railSites }));

    /* ⛔ THE CONTROLS. Every one of the three above is an ABSENCE, and an absence pin that cannot be shown to REPORT
     * is indistinguishable from a pin reading an empty population. Each plant is the register's own mutation. */
    const plantedRead = {
      count: houseHitsByFamily(plant(kycRead, "      out.betCount += 1;", "      if (t.houseBotId == null) out.betCount += 1;")).length,
      factor: houseHitsByFamily(plant(kycRead, "  const factors: RiskFactor[] = [];", "  const factors: RiskFactor[] = [];\n  if (txns.some((t) => t.houseBotId != null)) factors.push({ label: \"Liquidity\", points: 5, detail: \"marked stakes\" });")).length,
      struck: struck197In(`${kycRead}\nexport const houseBetCount = (f: KycMoneyFacts) => f.betCount;`).length,
      benign: houseHitsByFamily(`${kycRead}\n// a household budget, the HOUSE_FEE type and /admin/house are none of this feature's business\nconst t = "HOUSE_FEE";`).length,
    };
    ok("0.197.c1 · CONTROL · over the REAL read: the register's own house-blind mutation (a houseBotId condition on the bet count) and its house-derived risk factor are each reported, a struck kycMoneyFacts.house* name planted as an export is reported, and the platform's HOUSE_FEE, /admin/house and the word \"household\" in a comment are not",
      plantedRead.count >= 1 && plantedRead.factor >= 1 && plantedRead.struck === 1 && plantedRead.benign === 0, j(plantedRead));

    const railCode = decomment(read("src/app/admin/kyc/[id]/kyc-decision-rail.tsx"));
    const actionsCode = decomment(read("src/app/admin/kyc/[id]/kyc-actions.ts"));
    const plantedModules = {
      client: struck197In(`export const railHouseBetCount = (f: { houseBetCount: number }) => f.houseBetCount;\n${railCode}`).length,
      server: struck197In(`${actionsCode}\nexport async function houseFigures(f: { houseBetCount: number }) { return f.houseBetCount; }`).length,
      word: houseHitsByFamily(`${railCode}\nconst caption = "of which house stakes";`).length,
      benign: struck197In(railCode).length + houseHitsByFamily(railCode).length,
    };
    ok("0.197.c2 · CONTROL · over the REAL modules: a client component reading a struck KYC house figure and a \"use server\" module exporting one are each reported, a house WORD planted as client copy is reported, and the untouched rail is not",
      plantedModules.client === 1 && plantedModules.server === 1 && plantedModules.word >= 1 && plantedModules.benign === 0, j(plantedModules));

    const plantedRail = {
      prop: jsxAttrNames(KYC_CASE_PAGE, plant(pageCode, "<KycDecisionRail", "<KycDecisionRail moneyFacts={moneyFacts}"), "KycDecisionRail"),
      spread: jsxAttrNames(KYC_CASE_PAGE, plant(pageCode, "<KycDecisionRail", "<KycDecisionRail {...kycMoneyFacts(txns)}"), "KycDecisionRail"),
    };
    ok("0.197.c3 · CONTROL · the rail pin reports the register's two shapes over the REAL page — the facts object handed as a named prop, and the facts SPREAD into the tag — and reports the six real props clean",
      j(plantedRail.prop[0]) !== j(KYC_RAIL_PROPS) && plantedRail.spread[0]?.includes("...") === true && j(railSites[0]) === j(KYC_RAIL_PROPS),
      j(plantedRail));
  });

  /* ━━ 0.170.5 · THE DSAR STRIP LIST, WHICH ONLY EVER HAD ONE GUARD AND IT WAS NOT AN ASSERTION ━━━━━━━━━━━━━━━
   * `exportedAuditPage` (user-service.ts) strips the house keys out of every audit payload a SUBJECT exports for
   * themselves. `test:dsar-secrets` drives the real door — and its fixture rows carry only `houseBotId` and
   * `intentId`, and `dsar-export-secrets.test.mts:202` asserts only those two are gone. So `houseStake` and
   * `houseStakes` could both leave the list with every assertion in that suite green: the fixture never puts them in
   * a payload, so `houseHits(json)` has nothing to find. ⛔ The list is the control, so the list is what is pinned.
   */
  await guard("0.170.5", () => {
    const HOUSE_AUDIT_STRIP_KEYS = ["houseBotId", "intentId", "houseStake", "houseStakes", "houseBots", "houseBotNotificationsRedacted"];
    const STRIP_LIST_NAME = "HOUSE_AUDIT_PAYLOAD_KEYS_STRIPPED";
    const userSvc = lf(decomment(read("src/lib/server/user-service.ts")));
    /* ⚠️ READ BY INDEX, NOT BY A REGEX LITERAL, AND THAT IS RULING 175 RATHER THAN TASTE. A pattern naming
     * `HOUSE_AUDIT_PAYLOAD_KEYS_STRIPPED` is a house-identifier pattern, and `0.175.house-bot-reports-cases.mts`
     * reported this file for declaring one the first time it was written that way — correctly. The alternative was
     * an entry in `VOCABULARY_PATTERN_ALLOWLIST`, which would have widened the one exemption `0.175.allow` exists
     * to keep shrinking, to buy nothing this slice cannot do. */
    const DECL = `const ${STRIP_LIST_NAME} = [`;
    const keysOf = (code: string): string[] => {
      const at = code.indexOf(DECL);
      const end = at < 0 ? -1 : code.indexOf("]", at);
      return end < 0 ? [] : code.slice(at + DECL.length, end).split(",").map((s) => s.trim()).filter((s) => s.startsWith("\"") && s.endsWith("\"")).map((s) => s.slice(1, -1));
    };
    const keys = keysOf(userSvc);
    const uses = userSvc.split(STRIP_LIST_NAME).length - 1;
    ok("0.170.5 · ⛔ RULING 170 · the DSAR export's house strip names EVERY house key an audit payload can carry — houseBotId, intentId, houseStake, houseStakes, houseBots, houseBotNotificationsRedacted — and that one list is what both the detector and the filter read, so a key quietly dropped from it walks straight into a subject's own export with test:dsar-secrets green (its fixture plants two of the six)",
      j(keys) === j(HOUSE_AUDIT_STRIP_KEYS) && uses === 3, j({ keys, uses }));
    const dropped = keysOf(userSvc.replace('"houseStake", "houseStakes", ', ""));
    ok("0.170.c12 · CONTROL · the SAME measure over a copy with the two stake keys dropped reports the change, and over the real module reports none — the pin reads the declaration rather than the word appearing somewhere in the file",
      j(dropped) !== j(HOUSE_AUDIT_STRIP_KEYS) && dropped.length === 4 && j(keysOf(userSvc)) === j(HOUSE_AUDIT_STRIP_KEYS), j({ dropped }));
  });

  /* ━━ 0.m5 · `main`'s OWN OFFICER FAN-OUTS — GUARDED ONLY BY A HOUSE CASE THAT WAS STRUCK ━━━━━━━━━━━━━━━━━━━
   * ⚠️ NOT A HOUSE RULE. C5's register had a mutation for each of these because ruling 195 gave the cancellation
   * confirmation a house clause; D20 struck the clause and the cases went with it, leaving `main`'s own behaviour —
   * WHO is told, and WHAT the letter states — with no assertion anywhere. Measured 2026-09-21: no file under
   * `scripts/` names the role triple, and `emergency-void.test.mts` contains no occurrence of COMPLIANCE at all; it
   * asserts only that the letter "includes the reason".
   * 🔴 AND THE FIRST VERSION OF 0.m5.1 SAID SOMETHING FALSE, WHICH IS WORTH KEEPING ON THE RECORD. It read "the
   * emergency-void confirmation … at BOTH of its sites". There are two `// audit M5` fan-outs in that file and they
   * are DIFFERENT notifications: `alertOfficersMarketDue` (`:2253`, a market closed by time and awaiting the
   * two-officer ceremony) and the emergency-void confirmation (`:4519`). The pin was right; its sentence named one
   * of them twice. Caught by reading the two sites from `git show HEAD:` rather than trusting the label that had
   * just been written — the assertion guards MORE than it claimed, and an authority that overstates its subject is
   * how the next session learns the wrong thing from a passing test.
   */
  await guard("0.m5", () => {
    const M5_ROLES = '["ADMIN", "COMPLIANCE", "MODERATOR"]';
    const ms = lf(decomment(read("src/lib/server/market-service.ts")));
    /**
     * ⭐ THE BINDING IS THE DISCRIMINATOR, AND THAT IS WHAT MAKES THIS A MEASURE RATHER THAN A HEADCOUNT. Both
     * fan-outs read `const officers = await db.user.listByRoles(…)`. Counting every `listByRoles` call in the file
     * would have made a NEW, unrelated role read somewhere else redden this pin — a guard that cries wolf is a guard
     * the next session switches off, so 0.m5.c1 below proves one is let through.
     */
    const fanOutsOf = (code: string) => [...code.matchAll(/const officers = await db\.user\.listByRoles\(\s*(\[[^\]]*\])\s*\)/g)].map((m) => m[1].replace(/\s+/g, " "));
    const sites = fanOutsOf(ms);
    ok("0.m5.1 · ⛔ BOTH officer fan-outs in market-service.ts are addressed to ADMIN, COMPLIANCE and MODERATOR — alertOfficersMarketDue (a market closed by time, awaiting the two-officer ceremony) and the emergency-void confirmation; drop a role from either and a whole officer class silently stops being told, which nothing in this repository measured once ruling 195's house clause was struck and emergency-void.test.mts names COMPLIANCE nowhere at all",
      sites.length === 2 && sites.every((s) => s === M5_ROLES), j({ sites }));
    const droppedRole = fanOutsOf(plant(ms, `    const officers = await db.user.listByRoles(${M5_ROLES});`, '    const officers = await db.user.listByRoles(["ADMIN", "MODERATOR"]);'));
    const unrelated = fanOutsOf(`${ms}\nasync function plantedSweep() { const auditors = await db.user.listByRoles(["ADMIN"]); return auditors; }`);
    ok("0.m5.c1 · CONTROL · COMPLIANCE dropped from ONE of the two fan-outs is reported — a pin reading only the first site would have passed this — the real module reports two identical triples, and ⭐ THE POSITIVE SIDE: a NEW db.user.listByRoles bound to another name is left alone, so this pin polices the fan-outs and not every role read in the file",
      droppedRole.length === 2 && droppedRole.filter((s) => s === M5_ROLES).length === 1
        && fanOutsOf(ms).every((s) => s === M5_ROLES) && unrelated.length === 2 && unrelated.every((s) => s === M5_ROLES),
      j({ droppedRole, unrelated }));

    const EMAIL_FILE = "src/lib/server/email.ts";
    const M5_ROW_LABELS = ["Market", "Reason", "Players refunded", "Total refunded"];
    const emailCode = lf(decomment(read(EMAIL_FILE)));
    const letterOf = (code: string) => functionDeclarationText(EMAIL_FILE, code, "marketCancelledAdminHtml");
    const rowsOf = (letter: string) => ({
      labels: [...letter.matchAll(/\{\s*label:\s*("(?:[^"\\]|\\.)*")\s*,/g)].map((m) => JSON.parse(m[1]) as string),
      rows: (letter.match(/\{\s*label:/g) ?? []).length,
    });
    const real = rowsOf(letterOf(emailCode));
    ok("0.m5.2 · ⛔ the officer's cancellation confirmation states the same four things whatever the house held: marketCancelledAdminHtml's rows are exactly Market, Reason, Players refunded, Total refunded, and every label is a PLAIN string literal — a conditional label or a fifth row is a fact about the book reaching an officer's letter through a door no notice pin watches (0.198.2's PLAYER_NOTIFIERS cover marketCancelledRefundHtml, not this one)",
      j(real.labels) === j(M5_ROW_LABELS) && real.rows === M5_ROW_LABELS.length, j(real));
    const PLAYERS_ROW = '      { label: "Players refunded", value: String(refundedCount) },';
    const conditional = rowsOf(letterOf(plant(emailCode, PLAYERS_ROW, '      { label: refundedTzs > 0 ? "Players refunded (incl. positions held)" : "Players refunded", value: String(refundedCount) },')));
    const fifth = rowsOf(letterOf(plant(emailCode, PLAYERS_ROW, `${PLAYERS_ROW}\n      { label: "Of which house stakes", value: formatTzs(refundedTzs) },`)));
    /** ⭐ THE POSITIVE SIDE: this pin freezes the ROWS, not the letter. One more line of prose must still be allowed. */
    const CTA = '    ${ctaButton("/admin/markets", "Open markets")}';
    const extraProse = rowsOf(letterOf(plant(emailCode, CTA, '    ${subtitle("The market is closed and nothing further is owed on it.")}\n' + CTA)));
    ok("0.m5.c2 · CONTROL · both damaging shapes are reported over the REAL letter — a label made conditional on a money figure (the row count holds at four while a label stops being a literal) and a fifth house row (the labels hold their spelling while the count moves), so neither half of the measure is decoration — and ⭐ THE POSITIVE SIDE: one more line of PROSE in the same letter is NOT reported, because this pin freezes the four rows and not the letter",
      j(conditional.labels) !== j(M5_ROW_LABELS) && conditional.rows === 4 && fifth.rows === 5 && fifth.labels.includes("Of which house stakes")
        && j(extraProse.labels) === j(M5_ROW_LABELS) && extraProse.rows === M5_ROW_LABELS.length,
      j({ conditional, fifth, extraProse }));
  });
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
    /**
     * ⛔ THE ONE LAWFUL STRING, AND THIS ASSERTION IS THE GUARD THAT COULD NOT SEE IT (C5-8, `§2J · THE JOIN`).
     * `0.198.3` reads the market page — it always did — and for weeks it reported ZERO house words on a file that
     * prints `"HOUSE_STAKE_ONLY"`, because the words family was written `house[ -]?stakes?` and an UNDERSCORE is not
     * in that class. `test:house-bot-surfaces` §4 found it only by reading all three families. Now that the shared
     * join covers every separator, THIS assertion sees it too — and the answer is not to go back to asserting bare
     * absence over a file that is not absent. The string is lawful under owner ruling D19c / ruling 146, it is
     * registered here by exact name, and `0.198.3b` holds the exemption to the ONE assertion that proves the claim
     * rather than re-proving it here: a second copy of a proof is how two guards come to disagree.
     * ⛔ SHRINK-ONLY and SUBSTRING-COVERED, for the reason §2J gives: one literal yields a hit per family that can
     * match it, so a register of exact strings is silently a claim about the PATTERN. `includes` keeps it case- and
     * separator-sensitive, so `house stake` on this page would still be reported.
     */
    const PLAYER_SURFACE_TEXT_REGISTER: Readonly<Record<string, readonly string[]>> = {
      "src/app/markets/[id]/page.tsx": ["HOUSE_STAKE_ONLY"],
    };
    const unregisteredWords = (rel: string, code: string): string[] =>
      words(printedTexts(rel, code)).filter((w) => !(PLAYER_SURFACE_TEXT_REGISTER[rel] ?? []).some((a) => a.includes(w)));
    const surfaceWords = PLAYER_SURFACE_FILES.map((rel) => ({
      rel, printed: printedTexts(rel, code5(rel)).length,
      words: words(printedTexts(rel, code5(rel))), unregistered: unregisteredWords(rel, code5(rel)),
    }));
    ok("0.198.3 · ⛔ neither player surface PRINTS a house word the register does not name: every string literal, template part and JSX text of the resolution panel and the public market page is read, and the only word either carries is ruling 146's server-side reason on the market page — the string this very assertion was blind to until the shared join covered the underscore",
      surfaceWords.every((s) => s.printed > 1_000 && s.unregistered.length === 0)
      && surfaceWords[1].words.length >= 1, j(surfaceWords));
    const staleSurfaceRegister = Object.entries(PLAYER_SURFACE_TEXT_REGISTER).flatMap(([rel, ws]) => {
      if (!PLAYER_SURFACE_FILES.includes(rel as Any)) return [`${rel}: no longer a named player surface`];
      const printed = printedTexts(rel, code5(rel));
      return ws.filter((w) => !printed.includes(w)).map((w) => `${rel}: "${w}" is registered but no longer printed`);
    });
    const SURFACES_SUITE = "scripts/house-bot-surfaces.test.mts";
    const surfacesSrc = read(SURFACES_SUITE);
    ok("0.198.3b · ⛔ THE EXEMPTION IS HELD TO THE ASSERTION THAT PROVES IT, NOT RE-PROVED HERE · the registered string is still printed by the page it was registered for (SHRINK-ONLY), and `test:house-bot-surfaces` carries the same file and the same string in its own public register and still declares `4.words.4`, which asserts that the string is an `===` OPERAND and that the branch it selects is LITERAL-ONLY. ⛔ This entry is lawful ONLY while that assertion exists; delete it there and this goes red here",
      staleSurfaceRegister.length === 0
      && surfacesSrc.includes("\"src/app/markets/[id]/page.tsx\": [\"HOUSE_STAKE_ONLY\"]")
      && surfacesSrc.includes("4.words.4") && surfacesSrc.includes("2.join.1"),
      j({ stale: staleSurfaceRegister, register: PLAYER_SURFACE_TEXT_REGISTER }));
    /**
     * ⛔ THE CONTROLS MEASURE WHAT THEIR PLANT ADDS, NOT WHAT THE TREE ALREADY HOLDS (C5-8). Until the join, the
     * market page read as zero words, so `identifier.length === 0` was accidentally true: the control was reporting
     * the FILE, not the plant. The moment the file's own lawful string became visible the control went red for a
     * string it had not planted — the same defect `test:house-bot-surfaces` found in two of its own controls. The
     * delta is what a control is entitled to claim.
     */
    const liveWords = { page: words(printedTexts(PLAYER_SURFACE_FILES[1], page)), panel: words(printedTexts(PLAYER_SURFACE_FILES[0], panel)) };
    const addedBy = (base: string[], planted: string[]) => planted.filter((w) => !base.includes(w));
    const wordPlants = {
      jsxText: addedBy(liveWords.page, words(printedTexts(PLAYER_SURFACE_FILES[1], `${page}\nexport function PlantedLine() { return <p>House stake: TZS 1,000</p>; }`))),
      attribute: addedBy(liveWords.panel, words(printedTexts(PLAYER_SURFACE_FILES[0], `${panel}\nexport const PlantedTitle = () => <span title="of which chosen by staff TZS 9,000" />;`))),
      identifier: addedBy(liveWords.page, words(printedTexts(PLAYER_SURFACE_FILES[1], `${page}\nexport const plantedRow = { houseBotId: null, houseStake: 0 };`))),
      underscore: addedBy(liveWords.panel, words(printedTexts(PLAYER_SURFACE_FILES[0], `${panel}\nexport const PlantedKey = () => <span title="HOUSE_STAKE_ONLY" />;`))),
    };
    ok("0.198.c3 · CONTROL · a house line planted as JSX text in the public market page and as an attribute string in the resolution panel are each ADDED to this file's live reading; house identifiers in code add nothing, because only printed text is read. ⭐ AND THE FOURTH PLANT IS THE ESCAPE ITSELF: the underscored `HOUSE_STAKE_ONLY` planted as an attribute on the OTHER player surface — the file that does not already carry it — is now reported, which it would NOT have been before the join, and that is this assertion's own blindness rebuilt",
      wordPlants.jsxText.length >= 1 && wordPlants.attribute.length >= 1 && wordPlants.identifier.length === 0 && wordPlants.underscore.length >= 1,
      j({ plants: wordPlants, live: liveWords }));

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
    /* ━━ 0.434 · A READER CLASSIFIED BY ITS ACTIONS SAYS NOTHING ABOUT WHAT ITS ROWS CARRY ━━━━━━━━━━━━━━━━━━
     *
     * ⛔ RULING 434 HAD NO CASE AND NO MUTATION. It was taken on a MEASURED leak — `/admin/kyc/refused` streaming an
     * officer's refused-funds justification, in a `<td>`, status 200, to a signed-in PLAYER — and the only instrument
     * that went red without the fix was `qa:house-bot-console-probe`, which is not in `test:all`. So the fix was one
     * page deep and nothing would have reported the next one.
     * ⛔ THE POPULATION IS THE IMPORT GRAPH, NOT A LIST. Every admin `page.tsx` whose imports reach a module
     * classified in `AUDIT_READERS_OUTSIDE_CONSOLE` must AWAIT `houseConsoleAudience` before it calls anything it
     * imported from that module. Ruling 259 is why: a layout's redirect changes what is PAINTED, not what is SENT.
     * ⚠️ THE THREE PAGES BELOW ARE REPORTED, NOT EXEMPTED, AND THEY ARE W25's (replan ruling 538). They are PLAYER and
     * STAFF PII, not house data; they are on `main` and therefore LIVE; and ruling 524 governs — the instrument first,
     * seen RED against the unfixed code, before any fix. Patching them blind here would close the one measurement that
     * could prove the whole class shut. The list is NAMED and DATED and it may only SHRINK: a fourth page joining it
     * goes red here on the day it lands. */
    const W25_OWED: Readonly<Record<string, string>> = {
      "src/app/admin/kyc/[id]/page.tsx": "2026-09-18 · W25 · `getApprovalRecommendation(id)` with no audience check resolves an officer's identity and passes `recommenderName` into a client component, so it is SERIALISED into the flight payload",
      "src/app/admin/kyc/page.tsx": "2026-09-18 · W25 · `readBlockedCashOuts()` read with no gate",
      "src/app/admin/approvals/page.tsx": "2026-09-18 · W25 · gates its RING read and then reads audit rows ungated eight lines later, and renders a KYC applicant's legal name in a `<td>`",
    };
    const handedOn = Object.entries(AUDIT_ROW_PAYLOAD).filter(([, k]) => k === "handedOn").map(([f]) => f.replace(/\.tsx?$/, ""));
    /** The page's own problems: it imports from a `handedOn` reader module and does not decide its audience first. */
    const gateFirstProblems = (rel: string, code: string): string[] => {
      /* ⛔ DIRECT IMPORTS, NOT THE TRANSITIVE GRAPH. What a page can RENDER is what it imported and called; the
         transitive reach pulls in every shared module and reports pages whose classified read is `stripped`. */
      const hits = [...new Set(importSpecifiers(rel, code).map((i) => resolveSpec(rel, i.spec)).filter((m) => handedOn.includes(m)))];
      if (hits.length === 0) return [];
      const imported = importSpecifiers(rel, code)
        .filter((i) => hits.includes(resolveSpec(rel, i.spec)))
        .flatMap((i) => i.names.filter((n) => n !== "*" && n !== "default" && n !== "(re-export)"));
      const firstCallAt = imported
        .map((n) => code.indexOf(`${n}(`))
        .filter((at) => at >= 0)
        .reduce((a, b) => Math.min(a, b), Number.MAX_SAFE_INTEGER);
      const gateAt = code.indexOf("houseConsoleAudience(");
      if (firstCallAt === Number.MAX_SAFE_INTEGER) return [];
      if (gateAt < 0) return [`${rel}: reaches ${hits.join(", ")} and never awaits houseConsoleAudience — ruling 259: a layout changes what is PAINTED, not what is SENT`];
      if (gateAt > firstCallAt) return [`${rel}: reaches ${hits.join(", ")} and reads before it decides its audience`];
      return [];
    };
    const adminPages = files5.filter((f) => /^src\/app\/admin\/.*\/page\.tsx$/.test(f.rel));
    const gateFirst = adminPages.flatMap((f) => gateFirstProblems(f.rel, f.code));
    const owed = Object.keys(W25_OWED).sort();
    const reported = [...new Set(gateFirst.map((x) => x.split(":")[0]))].sort();
    ok("0.434 · ⛔ D19/259 · every admin page that imports from an audit reader whose ROWS are handed on decides its audience on the STORED role BEFORE it reads — except the three W25 owes, which are REPORTED by name and date, never exempted",
      j(reported) === j(owed) && adminPages.length >= 30
        /* ⛔ AND EVERY CLASSIFIED READER CARRIES A PAYLOAD CLASSIFICATION: a module added to the outside table with
           no entry here would be outside this guard on the day it lands, which is the class 434 is about. */
        && j(Object.keys(AUDIT_ROW_PAYLOAD).sort()) === j(Object.keys(AUDIT_READERS_OUTSIDE_CONSOLE).sort())
        && handedOn.length >= 2,
      j({ adminPages: adminPages.length, handedOn, reported, owedToW25: W25_OWED, problems: gateFirst }));
    /* ⛔ AND THE GUARD CAN FIRE ON A PAGE THAT IS COMPLIANT TODAY: `/admin/kyc/refused` minus its one guard line is
     * the defect ruling 434 measured, put back. A control that has never been shown to reject anything is not one. */
    const REFUSED = "src/app/admin/kyc/refused/page.tsx";
    const refusedCode = code5(REFUSED);
    const GUARD_LINE = 'if (!(await houseConsoleAudience(session?.userId ?? null, "/admin/kyc/refused"))) return null;';
    const ungated = refusedCode.replace(GUARD_LINE, "");
    ok("0.434.c1 · CONTROL · `/admin/kyc/refused` passes today, and the SAME scan reports it the moment ruling 434's guard line is taken out",
      refusedCode.includes(GUARD_LINE) && gateFirstProblems(REFUSED, refusedCode).length === 0
        && ungated !== refusedCode
        && gateFirstProblems(REFUSED, ungated).some((x) => x.includes("never awaits houseConsoleAudience")),
      j({ withGuard: gateFirstProblems(REFUSED, refusedCode), withoutGuard: gateFirstProblems(REFUSED, ungated) }));
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
        /* ⭐ replan ruling 537 · the limits SAVE. A floor at the count this commit measures, never a loose `>= 0`:
         * an action that stopped calling the gated writer would otherwise read as compliance. */
        && r.consoleGateCalls.houseLimitsSaveForConsole >= 1
        && r.readerFiles.length >= 14 && MEASURED_LEAKS.every((f) => r.readerFiles.includes(f)) && j(r.outsideReaderFiles) === j(Object.keys(AUDIT_READERS_OUTSIDE_CONSOLE).sort()),
      j({ population: r.population, readerCalls: r.readerCalls, gateCalls: r.gateCalls, consoleGateCalls: r.consoleGateCalls, readerFiles: r.readerFiles, outsideReaderFiles: r.outsideReaderFiles, auditReaders, auditExports, problems: r.problems }));

    /* ⛔ 0.260.2 · THE CLASSIFICATION OF THE SIX NEW EXPORTS IS HELD TO ITS OWN CLAIM, not left as prose beside a
     * list. Two of the six read `db.auditLog` and are classified NON-READERS because of what their bodies do; this
     * is the measurement of that. See `auditNonReaderRowClaimProblems`. */
    const WHERE_PIN = "where: { action: UNVERIFIABLE_BASELINE_ACTION },";
    const READER_SIG = "export async function readUnverifiableBaseline(): Promise<UnverifiableBaseline | null> {";
    const nonReaderClaim = auditNonReaderRowClaimProblems(`${AUDIT_MODULE}.ts`, auditCode);
    ok("0.260.2 · ⛔ THE TWO CLASSIFIED NON-READERS THAT TOUCH db.auditLog ARE HELD TO THE CLAIM THEIR CLASSIFICATION MAKES — `readUnverifiableBaseline` reads under a `where` pinned to the ONE platform action and hands back six scalars, `censusUnverifiable` hands back four, and neither names AuditEntry; so \"it returns no row\" is a measurement and not a sentence in a comment beside the list",
      nonReaderClaim.length === 0
        && AUDIT_ROW_TOUCHING_NON_READERS.every((n) => (AUDIT_NON_READERS as readonly string[]).includes(n))
        && auditCode.includes(WHERE_PIN) && auditCode.includes(READER_SIG),
      j({ problems: nonReaderClaim, pinned: AUDIT_ROW_TOUCHING_NON_READERS }));
    const widened = auditCode.replace(WHERE_PIN, "where: {},");
    const rowShaped = auditCode.replace(READER_SIG, "export async function readUnverifiableBaseline(): Promise<AuditEntry | null> {");
    /* ⚠️ A REGEX, NOT A MULTI-LINE STRING LITERAL: `src/` is CRLF on this machine and a plant written with `\n`
     * would silently replace NOTHING, leaving a control that plants nothing and passes for the wrong reason. */
    const censusStub = auditCode.replace(/\): Promise<\{\s*frontierSeq: number; count: number; digest: string; scanned: number;\s*\}> \{/, "): Promise<AuditEntry[]> {");
    ok("0.260.c4 · CONTROL · the audit module passes this pin TODAY, and the SAME checker reports it the moment the reader's `where` is widened to every row, the moment its return type becomes an audit row, and the moment the census hands back rows — so 0.260.2's zero is a live measurement and the six classifications are not a blanket exemption",
      widened !== auditCode && rowShaped !== auditCode && censusStub !== auditCode
        && auditNonReaderRowClaimProblems(`${AUDIT_MODULE}.ts`, widened).some((p) => p.includes("without pinning where.action"))
        && auditNonReaderRowClaimProblems(`${AUDIT_MODULE}.ts`, rowShaped).some((p) => p.includes("no longer returns Promise<UnverifiableBaseline | null>"))
        && auditNonReaderRowClaimProblems(`${AUDIT_MODULE}.ts`, rowShaped).some((p) => p.includes("readUnverifiableBaseline names AuditEntry"))
        && auditNonReaderRowClaimProblems(`${AUDIT_MODULE}.ts`, censusStub).some((p) => p.includes("censusUnverifiable no longer returns four scalars")),
      j({ widened: auditNonReaderRowClaimProblems(`${AUDIT_MODULE}.ts`, widened), rowShaped: auditNonReaderRowClaimProblems(`${AUDIT_MODULE}.ts`, rowShaped), censusStub: auditNonReaderRowClaimProblems(`${AUDIT_MODULE}.ts`, censusStub) }));

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
      /* ⛔ 0.512b · A DECLARATION IS NOT A PROOF (replan review, 2026-09-18). `CONSOLE_GATE_NON_READERS` is the ONE
       * exemption 0.512 grants, it gained eight names at C7 step 3 — two of them exported FUNCTIONS — and NOTHING
       * verified that an exempted export performs no store read and takes no audience decision. One that later grew a
       * `houseBotStore.…` call would have kept 0.512 green while shipping the hole ruling 259 measured. */
      const nonReaders = consoleNonReaderProblems(CONSOLE_GATE_MODULE, gateModuleCode);
      ok("0.512b · ⛔ D19 · every VALUE export declared a non-reader really is one — no await, no `db.`, no store member and no audience decision in its own declaration",
        nonReaders.problems.length === 0 && nonReaders.checked.length >= 5,
        j({ checked: nonReaders.checked, problems: nonReaders.problems }));
      /* ⛔ AND THE CHECK CAN FIRE, on each of the four things it refuses, planted into a REAL declared non-reader. */
      const plantInto = (body: string) => plant(
        gateModuleCode,
        "export function consoleLimitLabel(field: FieldId): string {",
        `export function consoleLimitLabel(field: FieldId): string {
  ${body}`,
      );
      const firedNR = {
        awaited: consoleNonReaderProblems(CONSOLE_GATE_MODULE, plantInto("await Promise.resolve();")).problems,
        db: consoleNonReaderProblems(CONSOLE_GATE_MODULE, plantInto("void db.user;")).problems,
        store: consoleNonReaderProblems(CONSOLE_GATE_MODULE, plantInto("void houseBotStore.listNonRemoved;")).problems,
        audience: consoleNonReaderProblems(CONSOLE_GATE_MODULE, plantInto("void houseConsoleAudience;")).problems,
        untouched: nonReaders.problems,
      };
      ok("0.512b.c1 · CONTROL · an await, a `db.` reach, a store member and an audience decision planted into a REAL declared non-reader are each reported — and the real module is not",
        firedNR.awaited.some((x) => x.includes("names await"))
          && firedNR.db.some((x) => x.includes("names db."))
          && firedNR.store.some((x) => x.includes("names a store member"))
          && firedNR.audience.some((x) => x.includes("names houseConsoleAudience"))
          && firedNR.untouched.length === 0,
        j(firedNR));
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

/* ═══ §9 · ruling 235 · the Up & Down digest: F6's email rule, on both stores ═══════════════════════ */

/**
 * ⛔ RULING 235 · WHAT A HOLDER IS TOLD ABOUT A DAY THAT WAS ALL HOUSE ROUNDS. 04 F6: a notice whose
 * positions are ALL house-marked never becomes an email. The digest SPLIT is struck (D19c, C4 rulings
 * 143–144) — the bell keeps `origin/main`'s all-round figures and carries no label — so what is built
 * here is the email rule and nothing else, through `channelAllowed`, which had no production caller at
 * all until this checkpoint. A rule with no caller has never once run.
 *
 * ⛔ THE WITHIN-SUBJECT CONTROL IS THE WHOLE POINT, and it is why this section costs two days instead
 * of one. "No email arrived" is the easiest verdict in the world to fake: no address on the account, an
 * unarmed outbox, a digest that never ran, a fixture whose rows fell outside the window — every one of
 * those produces the same silence as the rule working. So the SAME holder, with the SAME address, the
 * SAME outbox and the SAME digest call, is measured across two days that differ in ONE fact: day 1 is
 * all house-marked, day 2 carries one round of the holder's own. Day 1 must be silent and day 2 must
 * email. A break anywhere in the fixture kills day 2 and is seen.
 *
 * The accepted residual, recorded so it reads as deliberate: a holder whose day was all house rounds
 * gets the bell and no letter. The difference is observable and carries no words (9.235.2 compares the
 * bell to an ordinary player's, field by field), and it repeats C4 rulings 143–144.
 */
section("§9 · ruling 235 · a house-only Up & Down day sends the bell and no email; a mixed day emails all-round figures");
await guard("9.235", async () => {
  process.env.EMAIL_OUTBOX_CAPTURE = "1";
  const { loadWorld, OFFICER }: Any = await import("./house-bot-world.mts");
  const w: Any = await loadWorld();
  const DIG: Any = await import("../../src/lib/server/updown-digest.ts");
  const EMAIL: Any = await import("../../src/lib/server/email.ts");
  const EAT: Any = await import("../../src/lib/eat-day.ts");
  const CR: Any = await import("../../src/lib/server/comms-registry.ts");

  /* The two days, and the instants a run of the sweep would see them from. `daysBack` is 1 — the only
   * value the ticker ever passes — so "today" is the day after the one being digested, midday EAT so
   * the CLOSE_GRACE_MS guard cannot skip the run. */
  const DAY1 = "2026-08-02", DAY2 = "2026-08-03";
  const start = (d: string) => EAT.eatDayStartMs(d);
  const noonAfter = (d: string) => EAT.eatDayStartMs(EAT.eatDayKey(start(d) + 30 * 3_600_000)) + 12 * 3_600_000;
  const at = (ms: number) => new Date(ms).toISOString();

  const MARKET_TITLE = `Up and Down round ${process.pid}`;
  const marketId = w.uid("mkt_ud");
  const nowIso = w.iso();
  await w.mdal.marketStore.set({
    id: marketId, titleEn: MARKET_TITLE, titleSw: MARKET_TITLE, titleZh: null,
    category: "macro", sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    proposedBy: OFFICER,
    resolutionCriterionSw: null, resolutionCriterionZh: null,
    resolutionAt: nowIso, selectionClosedAt: null, status: "RESOLVED",
    yesPool: 0, noPool: 0, predictorCount: 0, feeSnapshot: null,
    resolvedOutcome: "YES", resolutionStage1By: null, resolutionStage1At: null,
    resolutionStage2By: null, resolutionStage2At: null, resolutionEvidence: null,
    settledAt: nowIso, createdAt: nowIso, updatedAt: nowIso, productLine: "UPDOWN",
  });

  /** A settled Up & Down round, marked or not. The marker is create-only in both twins, so it is set here. */
  let pseq = 0;
  const round = async (o: { userId: string; status: "WIN" | "LOSS" | "VOID"; stake: number; payout: number; settledAt: string; houseBotId?: string | null }) => {
    await w.mdal.positionStore.set({
      id: w.uid("pos_dg"), userId: o.userId, marketId, side: "YES",
      stake: o.stake, bonusStakeTzs: 0, potentialPayout: o.stake * 2,
      status: o.status, finalPayout: o.payout,
      placedAt: at(Date.parse(o.settledAt) - 300_000), settledAt: o.settledAt, idempotencyKey: `dg_${process.pid}_${++pseq}`,
      houseBotId: o.houseBotId ?? null,
    });
  };

  const b = await w.bot();
  const HOLDER = b.userId;
  const PLAYER = await w.user({ balance: 100_000 });
  await w.setUserFields(HOLDER, { email: `holder.dg.${process.pid}@50pick.tz` });
  await w.setUserFields(PLAYER, { email: `player.dg.${process.pid}@50pick.tz` });

  /* DAY 1 · the holder's rounds are ALL house-marked; the player's are their own. The two accounts are
   * given IDENTICAL outcomes so 9.235.2 can compare the two bells field by field. */
  const d1 = start(DAY1) + 3_600_000;
  await round({ userId: HOLDER, status: "WIN", stake: 5_000, payout: 8_700, settledAt: at(d1), houseBotId: b.botId });
  await round({ userId: HOLDER, status: "LOSS", stake: 5_000, payout: 0, settledAt: at(d1 + 60_000), houseBotId: b.botId });
  await round({ userId: PLAYER, status: "WIN", stake: 5_000, payout: 8_700, settledAt: at(d1) });
  await round({ userId: PLAYER, status: "LOSS", stake: 5_000, payout: 0, settledAt: at(d1 + 60_000) });

  /* DAY 2 · the same holder, one house round and ONE OF THEIR OWN. Everything else is unchanged. */
  const d2 = start(DAY2) + 3_600_000;
  await round({ userId: HOLDER, status: "WIN", stake: 5_000, payout: 8_700, settledAt: at(d2), houseBotId: b.botId });
  await round({ userId: HOLDER, status: "LOSS", stake: 5_000, payout: 0, settledAt: at(d2 + 60_000) });

  const totals1 = await w.mdal.positionStore.dailyTotalsByUser({ fromIso: at(start(DAY1)), toIso: at(start(DAY1) + 864e5), productLine: "UPDOWN" });
  const h1 = totals1.find((t: Any) => t.userId === HOLDER);
  const p1 = totals1.find((t: Any) => t.userId === PLAYER);
  ok("9.235.0 · CONTROL · the discriminator is LIVE on this store: day 1 gives the holder 2 rounds and ZERO of their own, the player 2 and 2 — so the two accounts differ in exactly the fact the rule reads",
    h1?.rounds === 2 && h1?.ownRounds === 0 && p1?.rounds === 2 && p1?.ownRounds === 2, j({ holder: h1, player: p1 }));

  EMAIL.clearEmailOutbox();
  const run1 = await DIG.runUpDownDailyDigest({ nowMs: noonAfter(DAY1), daysBack: 1 });
  const mail1 = [...EMAIL.emailOutbox()];
  const bells1 = (await w.db.notification.findByUser(HOLDER, 50)) as Any[];
  const playerBells1 = (await w.db.notification.findByUser(PLAYER, 50)) as Any[];
  const href1 = DIG.digestHref(DAY1);
  const holderBell = bells1.find((n) => n.href === href1);
  const playerBell = playerBells1.find((n) => n.href === href1);

  ok("9.235.1 · ⛔ 04 F6 · a day that was ALL house rounds: the holder gets the BELL and NO email, while the player with the identical day gets both — same run, same outbox, same addresses",
    run1.dayKey === DAY1 && !!holderBell && !!playerBell
    && mail1.filter((m: Any) => m.to.startsWith("holder.dg.")).length === 0
    && mail1.filter((m: Any) => m.to.startsWith("player.dg.")).length === 1,
    j({ dayKey: run1.dayKey, sent: run1.sent, to: mail1.map((m: Any) => m.to) }));

  const bellFields = (n: Any) => ({ kind: n.kind, href: n.href, titleEn: n.titleEn, titleSw: n.titleSw, titleZh: n.titleZh, bodyEn: n.bodyEn, bodySw: n.bodySw, bodyZh: n.bodyZh });
  ok("9.235.2 · ⛔ D19c · …and the holder's bell is FIELD FOR FIELD the player's — same kind, same link, same three titles and three bodies, no label and no house word: the account is told about its day exactly as a player is",
    !!holderBell && !!playerBell && j(bellFields(holderBell)) === j(bellFields(playerBell)) && houseHits(j(bellFields(holderBell))).length === 0,
    j({ holder: bellFields(holderBell ?? {}), player: bellFields(playerBell ?? {}) }));

  ok("9.235.3 · CONTROL · the absence is not vacuous: the ONE email this run did send carries the player's all-round figures, and the fixture's own market exists on the board the totals were read from",
    mail1.length === 1 && /Up & Down/.test(mail1[0].subject) && mail1[0].tag === "updown-digest"
    && houseHits(`${mail1[0].subject} ${mail1[0].html}`).length === 0,
    j({ subject: mail1[0]?.subject, tag: mail1[0]?.tag, hits: houseHits(`${mail1[0]?.subject ?? ""} ${mail1[0]?.html ?? ""}`).slice(0, 4) }));

  /* ── DAY 2 · the same holder, one round of their own. THIS is what makes day 1 a measurement. ─────── */
  EMAIL.clearEmailOutbox();
  const run2 = await DIG.runUpDownDailyDigest({ nowMs: noonAfter(DAY2), daysBack: 1 });
  const mail2 = [...EMAIL.emailOutbox()];
  const bells2 = (await w.db.notification.findByUser(HOLDER, 50)) as Any[];
  const holderBell2 = bells2.find((n) => n.href === DIG.digestHref(DAY2));
  const totals2 = await w.mdal.positionStore.dailyTotalsByUser({ fromIso: at(start(DAY2)), toIso: at(start(DAY2) + 864e5), productLine: "UPDOWN" });
  const h2 = totals2.find((t: Any) => t.userId === HOLDER);
  ok("9.235.4 · ⛔ THE WITHIN-SUBJECT CONTROL · the SAME holder, SAME address, SAME outbox, SAME digest call, one day later with ONE round of their own: the email ARRIVES. Day 1's silence is therefore the rule and not a broken fixture",
    run2.dayKey === DAY2 && h2?.rounds === 2 && h2?.ownRounds === 1 && !!holderBell2
    && mail2.filter((m: Any) => m.to.startsWith("holder.dg.")).length === 1,
    j({ dayKey: run2.dayKey, totals: h2, to: mail2.map((m: Any) => m.to) }));

  ok("9.235.5 · …and that email carries the ALL-ROUND figures (both rounds, the house one included) with no house word and no split — the bell and the letter say the same thing a player's would",
    mail2.length === 1 && /2 rounds|Rounds/.test(mail2[0].html) && houseHits(`${mail2[0].subject} ${mail2[0].html}`).length === 0,
    j({ subject: mail2[0]?.subject, rounds: h2?.rounds, hits: houseHits(`${mail2[0]?.subject ?? ""} ${mail2[0]?.html ?? ""}`).slice(0, 4) }));

  const AUD: Any = await import("../../src/lib/server/audit.ts");
  await AUD.auditFlush?.();
  const digestRows = AUD.getAuditPage({ category: "SYSTEM", limit: 500 }).filter((e: Any) => e.action === "updown.digest_sent");
  ok("9.235.6 · ⛔ D19 · the run's ONE audit row carries no house count and names nothing — `sent` counts notices, which is what was sent",
    digestRows.length >= 1 && digestRows.every((e: Any) => houseHits(j(e)).length === 0 && !("houseOnly" in (e.payload ?? {})) && !("ownRounds" in (e.payload ?? {}))),
    j(digestRows.map((e: Any) => e.payload)));

  ok("9.235.7 · CONTROL · the helper itself answers both ways for ROUND_RESULT — houseOnly true closes the email and the phone, false leaves the channel policy alone — so 9.235.1 rests on a live decision, not on a constant",
    CR.channelAllowed("ROUND_RESULT", { houseOnly: true }).email === false
    && CR.channelAllowed("ROUND_RESULT", { houseOnly: true }).sms === false
    && CR.channelAllowed("ROUND_RESULT", { houseOnly: false }).email === true
    && CR.channelAllowed("ROUND_RESULT", {}).email === true,
    j({ houseOnly: CR.channelAllowed("ROUND_RESULT", { houseOnly: true }), plain: CR.channelAllowed("ROUND_RESULT", {}) }));
});

/* ═══ §11 · ruling 247 · THE SERVICE-LAYER ABSENCE SWEEP, for every viewer, on both stores ═══════════ */

/**
 * ⛔ RULING 247. Every reader a player's screen is built from is called AS EACH VIEWER — signed out,
 * another player, the holder, a trigger player — and its whole serialised output is searched for the
 * fixture's own house ids and for the shared vocabulary. This is the layer between the database (where
 * the marker legitimately lives) and the served page (248): a projection that leaks a raw row leaks it
 * here first, and a page-level check would only find it after a designer happened to render the field.
 *
 * ⛔ THE THREE THINGS THAT MAKE IT EVIDENCE RATHER THAN A CLEAN VERDICT (the C5-7 law):
 *   (i)   A PLANTED RAW READ IS FOUND. `positionStore.get(<the house position>)` is swept as if it were
 *         one of the readers, and the sweep MUST report it. A sweep that cannot see the marker on a row
 *         that carries it is measuring nothing, and this is the only control that says which.
 *   (ii)  A RAW NON-HOUSE POSITION ROW IS FOUND TOO, because the identifier pattern counts `houseBotId`
 *         WHATEVER ITS VALUE — so an unprojected raw row is a leak by design, even when no house stake
 *         exists. This is the control that would have caught a projection returning raw rows on a
 *         fixture that happened to have no house money in it.
 *   (iii) THE FIXTURE'S OWN MARKET TITLE AND THE HOLDER'S DISPLAY NAME ARE FOUND in getBoard-class
 *         output and in the leaderboard. Without this, every zero below is consistent with readers that
 *         returned nothing at all.
 *
 * ⛔ AND THE POPULATION IS PRINTED — how many readers ran, per viewer, and how many bus frames were
 * captured. A reader that starts throwing (and is swallowed) leaves the sweep smaller and quieter, and
 * that is the shape this checkpoint exists to refuse. A reader that could not be exercised at all is
 * NOT MEASURED, by name, in `plans/house-bots/DEFERRED-TESTS.md` — never silently dropped.
 */
section("§11 · ruling 247 · the service-layer absence sweep: every reader, every viewer, the fixture's own ids as needles");
await guard("11.247", async () => {
  const { loadWorld, OFFICER }: Any = await import("./house-bot-world.mts");
  const w: Any = await loadWorld();
  const SVC: Any = w.svc;
  const BUS: Any = await import("../../src/lib/server/event-bus.ts");
  const COMMENTS: Any = await import("../../src/lib/server/comments-store.ts");
  const TICKER: Any = await import("../../src/lib/server/ticker-feed.ts");
  const FAIRNESS: Any = await import("../../src/app/api/fairness/recent/route.ts");
  const HEALTH: Any = await import("../../src/app/api/health/route.ts");
  const HB: Any = await import("../../src/lib/server/house-bot-dal.ts");
  const HIST: Any = await import("../../src/lib/server/market-history.ts");
  const WATCH: Any = await import("../../src/lib/server/watchlist-service.ts");
  const LEADER: Any = await import("../../src/lib/server/leader.ts");
  const HBC: Any = await import("../../src/lib/house-bot/constants.ts");

  /**
   * ⛔ **THE SWEEP'S OWN SERIALISER, BECAUSE `JSON.stringify` CANNOT SEE INSIDE A `Map`.** C5-7's review, high.
   * `JSON.stringify(new Map([["a", ["b"]]]))` is the two characters `{}` — a `Map` has no enumerable own properties
   * and no `toJSON`. THREE of this sweep's readers answer with one (`traderSeedsByMarket`, `getCardCharts`,
   * `countCommentsByMarkets`), so each of them contributed ZERO BYTES to the needle search for every viewer, and the
   * checkpoint's own declared mutation `247-seeds-raw` / S7-M08 — which makes `traderSeedsByMarket` answer with raw
   * position rows, marker and `hb:` bet key and all — could not have reddened 11.247.2. An absence proof whose
   * instrument reads two characters is the exact shape rule 1 of this checkpoint's law refuses, and it is why
   * 11.247.c5 below plants that mutation's own answer shape and requires it REPORTED before any verdict is read.
   * `Set` and `bigint` are handled for the same reason: a container the serialiser does not know is a hole.
   */
  const sweepJson = (v: unknown): string =>
    JSON.stringify(v, (_k, val) => {
      if (val instanceof Map) return { "@Map": [...(val as Map<unknown, unknown>).entries()] };
      if (val instanceof Set) return { "@Set": [...(val as Set<unknown>).values()] };
      if (typeof val === "bigint") return String(val);
      return val;
    }) ?? String(v);

  /* ── the bus, captured from before the fixture moves anything ────────────────────────────────── */
  const KNOWN_BUS = ["market:odds", "wallet:balance", "notification:new", "market:resolve"] as const;
  const frames: Array<{ type: string; data: unknown }> = [];
  const stop = KNOWN_BUS.map((t) => BUS.subscribe(t, (data: unknown) => { frames.push({ type: t, data }); }));

  /* ── the fixture ─────────────────────────────────────────────────────────────────────────────── */
  await w.limits();
  await w.switchOn();
  const bot = await w.bot();
  const HOLDER = bot.userId;
  await w.setUserFields(HOLDER, { displayName: "Holder Of Record" });
  const PLAYER = await w.user({ balance: 500_000 });
  await w.setUserFields(PLAYER, { displayName: "Ordinary Player" });
  const TRIGGER = await w.user({ balance: 500_000 });
  await w.setUserFields(TRIGGER, { displayName: "Trigger Player" });

  const MARKET_TITLE = `Sweep poll ${process.pid}`;
  const m = await w.poll();
  await w.mdal.marketStore.set({ ...(await w.mdal.marketStore.get(m.id)), titleEn: MARKET_TITLE });

  // A player's own stake, a trigger player's stake, and the house's answer to it.
  /* ⚠️ BOTH PLAYER STAKES ARE BACKDATED, and the fixture does not work without it: the seam only
     counts a stake as LOCKED once it is older than `LOCK_MARGIN_MS` (skew + claim guard), so a house
     FILL against a pool placed a millisecond ago is refused `house_condition_gone`. A fixture of time,
     exactly as `qa:house-bot-console-probe` uses it — never a relaxed condition. */
  const pBet = await SVC.buyPosition(PLAYER, { marketId: m.id, side: "YES", stake: 20_000 });
  const trig = await SVC.buyPosition(TRIGGER, { marketId: m.id, side: "YES", stake: 20_000 });
  for (const r of [pBet, trig]) if ((r as Any)?.ok) await w.backdate((r as Any).data.positionId, 120_000);
  /* ⚠️ `buyPosition` answers `{ positionId }`, and a COUNTER intent's anchorKey IS that id (the
     HouseBotIntent_counter_anchor_check). Reading the wrong field here does not fail quietly — the
     check constraint refuses the row — which is the database doing this checkpoint's job for it. */
  const trigPositionId = (trig as Any)?.data?.positionId ?? null;
  const i1 = await w.intent(bot, m.id, { side: "NO", stakeTzs: 10_000 });
  const placed = await w.place(bot, i1);

  // The trigger player's COUNTER intent and their penalty box — the two house rows ABOUT a player.
  if (typeof trigPositionId !== "string") throw new Error("the trigger player's position id did not come back; the counter fixture would be a lie");
  const i2 = await w.intent(bot, m.id, { kind: "COUNTER", side: "NO", stakeTzs: 5_000, triggerPositionId: trigPositionId, triggerUserId: TRIGGER });
  const countered = await w.place(bot, i2);
  const boxed = await HB.houseBotEventStore.append({
    houseBotId: bot.botId, userId: TRIGGER, marketId: m.id, kind: "PENALTY_BOXED",
    fromStatus: null, toStatus: null, reason: null, actorId: null,
    payload: { day: "2026-08-02", cause: "CASHED_OUT_COUNTERED" },
  });

  // A holder comment, on the market their account holds a stake in.
  const comment = await COMMENTS.addComment(HOLDER, m.id, "A comment from the account of record.", "NONE");

  // An emergency void of a SECOND house-held market — its bus frames and notices exist while the sweep runs.
  const m2 = await w.poll();
  const vBet = await SVC.buyPosition(PLAYER, { marketId: m2.id, side: "NO", stake: 30_000 });
  if ((vBet as Any)?.ok) await w.backdate((vBet as Any).data.positionId, 120_000);
  await w.ageHouseMinute();
  const i3 = await w.intent(bot, m2.id, { side: "YES", stakeTzs: 4_000 });
  const placed2 = await w.place(bot, i3);
  const voided = await SVC.emergencyVoidMarket({ marketId: m2.id, officerId: OFFICER, reason: "sweep fixture void" });

  /* ⛔ A THIRD HOUSE-HELD MARKET, RESOLVED — BECAUSE ONE OF THE FOUR BUS TYPES HAD NO EMITTER ON ANY PATH THIS
     FIXTURE DROVE (C5-7's review, high). Ruling 247 requires "every frame of the four KNOWN_EVENTS types captured
     from the bus". Measured on the first run of the per-type breakdown below: market:odds 6, wallet:balance 8,
     notification:new 7, **market:resolve 0** — `market:resolve` is emitted at exactly two sites
     (`resolveDueMarket` and `resolveMarket`) and the fixture called neither, so adding `houseBotId` to that
     payload type would have left this sweep green and its printed total unchanged. A resolve is driven here, on a
     market the house holds a stake in, so the type is swept with house money in the room. */
  const m3 = await w.poll();
  const rBet = await SVC.buyPosition(PLAYER, { marketId: m3.id, side: "YES", stake: 15_000 });
  if ((rBet as Any)?.ok) await w.backdate((rBet as Any).data.positionId, 120_000);
  await w.ageHouseMinute();
  const i4 = await w.intent(bot, m3.id, { side: "NO", stakeTzs: 3_000 });
  const placed3 = await w.place(bot, i4);
  const resolved = await SVC.resolveMarket({ marketId: m3.id, outcome: "YES", officerId: OFFICER, evidence: "sweep fixture resolve" });

  /* ⛔ A TARGET ROW AND A PRESS ROW, BECAUSE RULING 247 NAMES FIVE NEEDLE CLASSES AND THE FIXTURE SUPPLIED THREE
     (C5-7's review, medium). Its Needles line reads "the fixture's own bot, intent, event, target and press ids" —
     and no `targetStore` or `pressStore` write appeared anywhere in this guard, so a target id or a press id
     reaching a reader's output was not detectable here AT ALL: `IDS` could not hold what the fixture never made.
     Both are bounded house ids (`hbt_`/`hbp_`), so they are needles in their own right and in the vocabulary's
     `ids` family. */
  const tgt = await HB.targetStore.insert({
    id: HB.newHouseId("target"), houseBotId: bot.botId, marketId: m.id, delayMinSec: 5, delayMaxSec: 10,
    timingFrom: "STAKE", reactTo: "FIRST", createdById: OFFICER,
    snapshot: { titleEn: MARKET_TITLE, category: "macro", cutoff: w.iso(3_600_000), rawYes: 0, rawNo: 0 },
  });
  const press = await HB.pressStore.insertChecking({
    id: HB.newHouseId("press"), actorId: OFFICER, submitId: crypto.randomUUID(), purpose: "ENTER_NOW",
    houseBotId: bot.botId, marketId: m.id, targetId: tgt.id, intentId: i1.id, reason: "sweep fixture press",
  });

  /* ⛔ AND THE BOT'S OWN LABEL IS A NEEDLE. `label` is the one ARBITRARY, OWNER-CHOSEN house string in the system —
     it matches no vocabulary pattern by construction, and it is the needle `test:erasure` uses. Read back from the
     row rather than re-typed, so a fixture that stopped labelling its bot cannot quietly stop testing for one. */
  const botRow = await HB.houseBotStore.get(bot.botId);

  /* ⛔ THE PLANNER LEASE IS TAKEN BEFORE `/api/health` IS SWEPT — ruling 247 requires exactly this, and it was not
     built (C5-7's review, high). `/api/health`'s ONLY house-bearing path is the `leadership` map, filtered to
     `PUBLIC_LEASE_TASKS` at `src/app/api/health/route.ts:34`. With no lease taken in this process that map CANNOT
     contain the planner key whatever the filter does, so four of the sweep's rows reported an absence produced by
     the fixture. `HOUSE_PLANNER_TASK` is `house-bot`, a shared-vocabulary word, so the unfiltered snapshot is a
     REAL needle in a REAL artefact — and 11.247.c6 below requires the sweep to find it there before 11.247.2's
     zero on `/api/health` is read as anything. The lease is NOT released: §11.171 reads the same route after this. */
  const leaseTaken = await LEADER.acquireLeadership(HBC.HOUSE_PLANNER_TASK);

  const housePositions = (await w.positionsOf(m.id)).filter((p: Any) => p.houseBotId != null);
  const playerPositions = (await w.positionsOf(m.id)).filter((p: Any) => p.houseBotId == null);
  for (const s of stop) s();

  ok("11.247.0 · the fixture is real: a house stake on a poll, a countered trigger player with a penalty box, a holder comment, an emergency void of a second house-held market, a RESOLVE of a third, and a target and a press row about the bot — with the bus captured throughout",
    placed?.ok === true && countered?.ok === true && placed2?.ok === true && placed3?.ok === true && resolved?.ok === true
    && housePositions.length >= 2 && playerPositions.length >= 2
    && !!boxed?.id && comment?.ok === true && voided?.ok === true && !!tgt?.id && (press as Any)?.ok !== false && frames.length > 0,
    j({ housePositions: housePositions.length, playerPositions: playerPositions.length, placed: placed?.ok, countered: countered?.ok, voidMarketStake: placed2?.ok, resolveMarketStake: placed3?.ok, resolved: resolved?.ok, boxed: !!boxed?.id, comment: comment?.ok, voided: voided?.ok, target: !!tgt?.id, press: (press as Any)?.ok ?? !!(press as Any)?.id, frames: frames.length, refusals: [placed, countered, placed2, placed3, resolved].filter((r: Any) => r?.ok !== true) }));

  /* ── the needles ─────────────────────────────────────────────────────────────────────────────── */
  /* ⛔ FIVE CLASSES, NOT THREE (ruling 247's Needles line, restored by C5-7's review): the bot, intent, event,
     TARGET and PRESS ids, the `hb:` bet keys — and the bot's own `label`/`labelKey`, which match no vocabulary
     pattern and are the only owner-chosen house strings the system holds. */
  const IDS = [
    bot.botId, bot.userId === HOLDER ? null : bot.userId, i1.id, i2.id, i3.id, i4.id, boxed.id, tgt.id,
    (press as Any)?.row?.id ?? (press as Any)?.id ?? null,
    `hb:${i1.id}`, `hb:${i2.id}`, `hb:${i4.id}`, botRow?.label ?? null, botRow?.labelKey ?? null,
  ].filter(Boolean) as string[];
  const needlesIn = (text: string) => [
    ...IDS.filter((n) => text.includes(n)).map((n) => `id:${n}`),
    ...houseHitsByFamily(text).map((h) => `${h.family}:${h.word}`),
  ];

  /**
   * ── the readers ───────────────────────────────────────────────────────────────────────────────
   *
   * ⛔ **THE PER-VIEWER DIMENSION IS APPLIED ONLY WHERE IT EXISTS** (C5-7's review, medium-low). The first version
   * ran nine readers for each of four viewers and printed "36 sweeps · 4 viewers × 9 readers". EIGHT of the nine
   * took no viewer argument and no session was established, so thirty-two of those thirty-six rows were byte-for-byte
   * repeats: the printed population was four times the number of independent measurements, and rule 3 of this
   * checkpoint's law is that the population must be visible WITHOUT re-reading the source. So the readers are split
   * by what they actually take. A viewer-blind reader runs ONCE and says so; a reader a signed-in player's own
   * screen is built from runs once per viewer, which is the dimension ruling 247 was aimed at.
   *
   * ⛔ AND THE READER SET GREW to the rest of what `/markets` and `/markets/[id]` are actually built from:
   * `listMarkets`, `getSimilarMarkets`, `getCardCharts`, `countCommentsByMarkets` and `listWatchedMarketIds`. Three
   * of those answer with a `Map` and were unreadable to the old serialiser; see `sweepJson`.
   *
   * ⛔ `listPositionsForUser` IS THE ONE READER DELIBERATELY OUTSIDE THE VERDICT, and the reason is the reason
   * `listPositionsForMarket` is: it answers with RAW, UNPROJECTED position rows, and its viewer-facing caller
   * (`src/app/markets/[id]/page.tsx:181`) is a SERVER component that reads fields one at a time and hands a client
   * component scalars. Sweeping it as a leak would report the raw row the page never serialises — the "leak" would
   * be the fixture's. It was in neither the population nor `DEFERRED-TESTS.md` before, which is rule 4's silent
   * drop; it is now proved REPORTED by 11.247.c1b (so the sweep is not blind to it) and its caller is pinned by
   * 11.247.c1d. What still cannot be swept HERE — the SERVED layer, and Up & Down's `getBoard`/`getRoundDetail`,
   * which need a fixture this suite does not have — is NOT MEASURED by name in
   * `plans/house-bots/DEFERRED-TESTS.md` §1j.
   */
  const anchor = await w.mdal.marketStore.get(m.id);
  const PUBLIC_READERS: Array<[string, () => Promise<unknown>]> = [
    ["getMarket", () => SVC.getMarket(m.id)],
    ["getMarket(voided)", () => SVC.getMarket(m2.id)],
    ["listMarkets", () => SVC.listMarkets()],
    ["getSimilarMarkets", () => SVC.getSimilarMarkets(anchor, 6)],
    ["getCardCharts", () => HIST.getCardCharts([m.id, m2.id])],
    ["countCommentsByMarkets", () => COMMENTS.countCommentsByMarkets([m.id, m2.id])],
    ["leaderboard", () => w.mdal.positionStore.leaderboard(50)],
    ["leaderboardPlayerCounts", () => w.mdal.positionStore.leaderboardPlayerCounts()],
    ["traderSeedsByMarket", () => SVC.traderSeedsByMarket([m.id, m2.id], 3)],
    ["getTickerFeed", () => TICKER.getTickerFeed("en", 50)],
    ["listComments(signed out)", () => COMMENTS.listComments(m.id, null, { limit: 100 })],
    ["/api/fairness/recent", () => FAIRNESS.GET().then((r: Any) => r.text())],
    ["/api/health", () => HEALTH.GET().then((r: Any) => r.text())],
  ];
  /** Readers that TAKE the viewer — the only ones for which "for each viewer" is a real dimension. */
  const viewerReaders = (viewer: string): Array<[string, () => Promise<unknown>]> => [
    ["listComments", () => COMMENTS.listComments(m.id, viewer, { limit: 100 })],
    ["listWatchedMarketIds", () => WATCH.listWatchedMarketIds(viewer)],
  ];
  const SIGNED_IN: Array<[string, string]> = [["another player", PLAYER], ["the holder", HOLDER], ["a trigger player", TRIGGER]];

  const swept: string[] = [];
  const leaks: string[] = [];
  const threw: string[] = [];
  const sweep = async (label: string, call: () => Promise<unknown>) => {
    let text: string;
    try { text = sweepJson(await call()); } catch (e) { threw.push(`${label}: ${String((e as Error)?.message ?? e).slice(0, 80)}`); return; }
    swept.push(label);
    const hits = needlesIn(text);
    if (hits.length > 0) leaks.push(`${label} → ${hits.slice(0, 4).join(", ")}`);
  };
  for (const [name, call] of PUBLIC_READERS) await sweep(`public/${name}`, call);
  for (const [label, viewer] of SIGNED_IN) for (const [name, call] of viewerReaders(viewer)) await sweep(`${label}/${name}`, call);
  // Every captured bus frame, which is what /api/events forwards to a signed-in client.
  for (const f of frames) {
    swept.push(`bus/${f.type}`);
    const hits = needlesIn(sweepJson(f));
    if (hits.length > 0) leaks.push(`bus/${f.type} → ${hits.slice(0, 4).join(", ")}`);
  }

  /* ⛔ THE BUS POPULATION IS PRINTED BY TYPE, NOT AS A TOTAL (C5-7's review, high). `frames.length >= 1` over an
     evidence string reading "21 bus frames" is the same verdict whether the fixture exercised four of the four
     KNOWN_EVENTS types or one — so a payload type that grew a house field on a path this fixture never drives
     would leave the sweep green and the count unchanged. The breakdown is asserted, per type, and a type with no
     frame is NAMED. */
  const byType = Object.fromEntries(KNOWN_BUS.map((t) => [t, frames.filter((f) => f.type === t).length]));
  const silentTypes = KNOWN_BUS.filter((t) => byType[t] === 0);
  const expectedReads = PUBLIC_READERS.length + SIGNED_IN.length * viewerReaders(PLAYER).length;
  ok("11.247.1 · the population is real, it is printed, and it is a count of INDEPENDENT measurements: each viewer-blind reader once, each viewer-facing reader once per signed-in viewer, and every captured bus frame BY TYPE — a reader that starts throwing leaves the sweep smaller and is NAMED here, never swallowed",
    swept.length >= expectedReads && threw.length === 0 && silentTypes.length === 0,
    `${swept.length - frames.length} reads (${PUBLIC_READERS.length} viewer-blind × 1 + ${SIGNED_IN.length} signed-in viewers × ${viewerReaders(PLAYER).length} viewer-facing) + ${frames.length} bus frames ${j(byType)} · silent types: ${j(silentTypes)} · threw: ${j(threw)}`);
  ok("11.247.2 · ⛔ D19 · ruling 247 · HB-LC-39 / CRA-27 · every viewer · NOT ONE of them carries the fixture's bot, intent, event, target or press id, the hb: bet key, the bot's own label, or a word, identifier or bounded id of the shared vocabulary — for a signed-out visitor, another player, the holder or the trigger player",
    leaks.length === 0, j(leaks.slice(0, 8)));

  /* ── the controls, and they are the assertion ────────────────────────────────────────────────── */
  const rawHouse = j(await w.mdal.positionStore.get(housePositions[0].id));
  const rawPlayer = j(await w.mdal.positionStore.get(playerPositions[0].id));
  ok("11.247.c1 · CONTROL (i) · a RAW read of the house position, swept exactly as a reader would be, IS reported — with the marker's value and the identifier both found. A sweep that cannot see this is measuring nothing",
    needlesIn(rawHouse).some((h) => h.startsWith("id:")) && needlesIn(rawHouse).some((h) => h.includes("houseBotId")),
    j(needlesIn(rawHouse).slice(0, 4)));
  /* ⭐ THE BEST CONTROL IS A REAL READER, NOT A SYNTHETIC ONE. `listPositionsForMarket` is a SERVICE
     function that returns position rows UNPROJECTED, marker and bet key and all. It is deliberately NOT
     in the viewer sweep above — ruling 247 names the readers a player's screen is built from, and this
     is not one of them: its four callers are `/admin/markets/[id]` and `/admin/resolver/[id]` (which
     render cells, server-side), `objections-service` (the caller's own positions, server-side) and
     `updown-board.myStakesByMarket` (the viewer's own positions, projected to six fields before anything
     sees them; pinned by 11.247.c1c). What it IS, is proof that this sweep can see a raw row when one
     is handed to it, on the same fixture, through the same needles as every reader above. */
  /* ⛔ AND IT IS TWO FUNCTIONS, NOT ONE (C5-7's review, medium-low). `listPositionsForUser` is the SAME shape with
     the SAME exemption — raw rows, a server-side caller that reads fields one at a time — and it was named in
     neither the sweep nor the deferred register, which is a silent drop rather than a decision. Both are required
     to be REPORTED here, so the pair of exemptions above is a measurement and not an assumption. */
  const rawService = j(await SVC.listPositionsForMarket(m.id));
  const rawUser = sweepJson(await SVC.listPositionsForUser(HOLDER, 100));
  ok("11.247.c1b · CONTROL (i, again, with REAL readers) · BOTH unprojected service reads — `listPositionsForMarket` and the holder's own `listPositionsForUser` — ARE reported, with the bot id, the intent ids and the hb: bet key. A synthetic plant proves the needles; these prove them against two functions the product actually has, and they are the two the verdict deliberately excludes",
    [`id:${bot.botId}`, `id:${i1.id}`, `id:hb:${i1.id}`].every((n) => needlesIn(rawService).includes(n))
    && [`id:${bot.botId}`, `id:${i1.id}`].every((n) => needlesIn(rawUser).includes(n)),
    j({ forMarket: needlesIn(rawService).slice(0, 4), forUser: needlesIn(rawUser).slice(0, 4) }));

  /* ⛔ AND `listPositionsForUser`'s VIEWER-FACING CALLER IS PINNED, exactly as `myStakesByMarket` is by c1c. The
     page is a SERVER component, so the raw row is safe only while it stays there: the row is safe if no JSX
     attribute on that page is handed the position binding WHOLE (`prop={p}` or `{...p}`), because a whole row
     crossing into a client component's props is a row in the RSC payload. The plant below hands `SellButton` the
     spread and requires the pin to report it, so the zero is a measurement of the page and not of a walk that
     reached nothing. */
  const posPage = "src/app/markets/[id]/page.tsx";
  const wholeRowProps = (code: string): string[] => {
    const sf = parse(posPage, code);
    const out: string[] = [];
    walkTree(sf, (n) => {
      if (ts.isJsxSpreadAttribute(n) && ts.isIdentifier(n.expression) && n.expression.text === "p") {
        out.push(`spread {...p} at ${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
      }
      if (ts.isJsxAttribute(n) && n.initializer && ts.isJsxExpression(n.initializer)
        && n.initializer.expression && ts.isIdentifier(n.initializer.expression) && n.initializer.expression.text === "p") {
        out.push(`${n.name.getText()}={p} at ${sf.getLineAndCharacterOfPosition(n.getStart()).line + 1}`);
      }
    });
    return out;
  };
  const posCode = decomment(read(posPage));
  const posPlant = posCode.replace("<SellButton", "<SellButton {...p}");
  ok("11.247.c1d · the viewer-facing caller of `listPositionsForUser` keeps the raw row on the SERVER: no JSX attribute on /markets/[id] is handed the position binding whole — no `prop={p}`, no `{...p}` — so the marker cannot ride an RSC payload out of a page that only ever reads fields",
    wholeRowProps(posCode).length === 0 && posCode.includes("listPositionsForUser"), j(wholeRowProps(posCode)));
  ok("11.247.c1d.control · CONTROL · the plant really CHANGED the page and the pin REPORTS the spread — so c1d's zero is a measurement of this page and not of a walk that matched nothing",
    posPlant !== posCode && wholeRowProps(posPlant).length === 1, `changed=${posPlant !== posCode} · ${j(wholeRowProps(posPlant))}`);

  /* ⛔ AND THE ONE CALLER THAT A VIEWER REACHES IS PINNED. `myStakesByMarket` is what a player's round
     detail is built from; it takes those raw rows and builds a SIX-FIELD item. If that literal ever
     grew the marker, the holder's own round panel would carry it — and no sweep of getRoundDetail would
     find it until an Up & Down fixture existed to run one. The pin does not wait for the fixture. */
  /* ⚠️ EOL-NORMALISED, and the first version of this pin was not — tracked source here is CRLF, so a
     multi-line needle written with `\n` matched NOTHING and the pin went red for the wrong reason while
     its own control passed vacuously (an unmatched needle makes `replace` a no-op, and "the plant
     changed the file" was never checked). Both are fixed: the text is normalised, and the control below
     REQUIRES the plant to have changed the source before it reads its verdict. */
  const boardSrc = decomment(read("src/lib/server/updown-board.ts")).replace(/\r\n/g, "\n");
  const ITEM = `    .map((p) => ({
      id: p.id,
      side: (p.side === "YES" ? "UP" : "DOWN") as "UP" | "DOWN",
      stake: p.stake,
      payout: p.finalPayout,
      status: p.status,
      placedAt: p.placedAt,
    }))`;
  ok("11.247.c1c · the one viewer-facing caller of that raw read PROJECTS: `myStakesByMarket` builds a fixed six-field item from each row, and the marker is not one of the six",
    boardSrc.includes(ITEM), boardSrc.includes(ITEM) ? "six fields, no marker" : boardSrc.includes("myStakesByMarket") ? "the projection literal has MOVED — re-read it" : "myStakesByMarket is gone");
  const c1cPlant = boardSrc.replace(ITEM, ITEM.replace("      id: p.id,", "      id: p.id,\n      houseBotId: p.houseBotId,"));
  ok("11.247.c1c.control · CONTROL · the plant really CHANGED the source, and the pin then REPORTS it — so c1c's verdict is a measurement of those six fields and not of a string that matches nothing",
    boardSrc.includes(ITEM) && c1cPlant !== boardSrc && !c1cPlant.includes(ITEM),
    `changed=${c1cPlant !== boardSrc}`);

  /* ⛔ ROW 77 · THE OG HANDLER'S OWN READ LIST, DERIVED RATHER THAN ASSUMED (C5-8 phase 3, 2026-09-20).
     Ruling 247 asks the builder to OPEN `/api/og/market/[id]` and add ITS data reads to this sweep.
     `DEFERRED-TESTS.md` §1j row 77 recorded, correctly, that nobody ever had: the handler was not opened
     and its read list was not derived, so `getMarket` being swept here was an assumption ABOUT the route
     rather than a measurement OF it. Opened now. It makes exactly TWO data reads — `getMarket(id)`
     (`route.tsx:47`), which this sweep already drives for all four viewers, and `resolveWinShareToken(…)`
     (`:56`), which was in NO sweep, NO register and NO anchors file.
     ⭐ AND IT IS EXACTLY THE SHAPE `c1c` EXISTS FOR: that reader reaches a RAW position row
     (`positionStore.get`), whose Postgres column set carries `houseBotId`. What holds the absence is its
     PROJECTION, so the projection is pinned — with a planted control, because a needle that matches
     nothing passes vacuously, which is the defect c1c's own header records being caught once already. */
  const ogSrc = decomment(read("src/app/api/og/market/[id]/route.tsx")).replace(/\r\n/g, "\n");
  const ogReads = [...ogSrc.matchAll(/await\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]).sort();
  ok("11.247.c1e · 247 · the OG image route's data reads are exactly the two this sweep accounts for — `getMarket`, driven for all four viewers above, and `resolveWinShareToken`, pinned below — so a third reader arriving in that handler is reported here by name instead of riding out unswept",
    ogReads.join(",") === "getMarket,resolveWinShareToken", j(ogReads));
  const shareSrc = decomment(read("src/lib/server/share-token.ts")).replace(/\r\n/g, "\n");
  const WIN_SHARE = `  return {
    marketId: pos.marketId,
    marketTitle: m.titleEn,
    side: pos.side,
    stake: pos.stake,
    payout: pos.finalPayout,
    net: pos.finalPayout - pos.stake,
  };`;
  ok("11.247.c1e · 247 · …and the second of the two PROJECTS: `resolveWinShareToken` reads the raw position row and answers a fixed six-field share — the marker is not one of the six, so nothing house can reach the OG image's text",
    shareSrc.includes(WIN_SHARE) && shareSrc.includes("positionStore.get("),
    shareSrc.includes(WIN_SHARE) ? "six fields, no marker" : shareSrc.includes("resolveWinShareToken") ? "the projection literal has MOVED — re-read it" : "resolveWinShareToken is gone");
  const c1ePlant = shareSrc.replace(WIN_SHARE, WIN_SHARE.replace("    marketId: pos.marketId,", "    marketId: pos.marketId,\n    houseBotId: pos.houseBotId,"));
  ok("11.247.c1e.control · CONTROL · the plant really CHANGED the source and the pin then REPORTS it — so c1e's verdict is a measurement of those six fields and not of a string that matches nothing",
    shareSrc.includes(WIN_SHARE) && c1ePlant !== shareSrc && !c1ePlant.includes(WIN_SHARE),
    `changed=${c1ePlant !== shareSrc}`);

  /* ⛔ CONTROL (ii) IS STORE-SPECIFIC, AND SAYING SO IS THE POINT. On Postgres every Position row has a
     `houseBotId` COLUMN, so an unprojected raw row is a leak by design whatever its value — a projection
     that returned raw rows would be caught on a fixture with no house money in it at all. In memory the
     marker is a SPREAD (`...(ctx.kind === "house" ? … : {})`), so an unmarked position has no such key
     and there is nothing to find. Both halves are asserted, each on the store where it is true; neither
     is reported as the other, and neither store is silently skipped. */
  const rawPlayerHits = needlesIn(rawPlayer);
  if (STORE === "postgres") {
    ok("11.247.c2 · CONTROL (ii) · POSTGRES · a raw NON-HOUSE position row is reported too — the identifier pattern counts `houseBotId` WHATEVER its value, so an unprojected raw row is a leak by design and a fixture with no house money could not make this sweep vacuous",
      rawPlayerHits.some((h) => h.includes("houseBotId")) && !rawPlayerHits.includes(`id:${bot.botId}`),
      j(rawPlayerHits.slice(0, 4)));
  } else {
    ok("11.247.c2 · CONTROL (ii) · MEMORY · an unmarked position row carries NO houseBotId key at all (the marker is a spread, not a column), so there is nothing here for the identifier pattern to find — the Postgres child is where (ii) is measured, and it is measured there, not skipped",
      !rawPlayer.includes("houseBotId") && !rawPlayerHits.includes(`id:${bot.botId}`),
      `${rawPlayerHits.length} hit(s): ${j(rawPlayerHits.slice(0, 4))}`);
  }
  const boardish = j(await SVC.getMarket(m.id));
  const board = j(await w.mdal.positionStore.leaderboard(50));
  ok("11.247.c3 · CONTROL (iii) · the absence is not vacuous: the fixture's own market title is found in getMarket's output and the holder's own account is on the leaderboard — the readers really answered about this fixture",
    boardish.includes(MARKET_TITLE) && board.includes(HOLDER),
    j({ titleInMarket: boardish.includes(MARKET_TITLE), holderOnLeaderboard: board.includes(HOLDER), leaderboardRows: (await w.mdal.positionStore.leaderboard(50)).length }));
  ok("11.247.c4 · D6 · HB-LC-39 · …and the holder is there as an ORDINARY PLAYER: the leaderboard row is the account's, with no marker and no house key on it",
    houseHits(board).length === 0 && !board.includes(bot.botId), j(houseHits(board).slice(0, 4)));

  /* ⛔ CONTROL (iv) · THE SERIALISER, AND IT IS THIS CHECKPOINT'S OWN DECLARED MUTATION RUN AS A CONTROL.
     `traderSeedsByMarket` answers with a `Map`, and the sweep used to serialise every answer with `JSON.stringify`,
     which renders a `Map` as the two characters `{}`. Three of the readers above answer with one. Both halves are
     asserted: the plain serialiser is BLIND to a known id inside the real reader's real answer, this one is not —
     and a `Map` carrying a RAW POSITION ROW, which is exactly what mutation `247-seeds-raw` / S7-M08 makes
     `traderSeedsByMarket` return, is REPORTED with the bot id and the `hb:` bet key on it. */
  const seedsMap = await SVC.traderSeedsByMarket([m.id, m2.id], 3);
  const seedsRaw = new Map([[m.id, [await w.mdal.positionStore.get(housePositions[0].id)]]]);
  const rawHits = needlesIn(sweepJson(seedsRaw));
  ok("11.247.c5 · CONTROL (iv) · THE SWEEP CAN SEE INSIDE A Map: JSON.stringify renders the real trader-seed answer as `{}` and finds nothing, this sweep's serialiser finds the seeded player's own id in it — and the SAME reader answering with raw position rows (the checkpoint's own declared mutation 247-seeds-raw) is REPORTED, bot id and hb: bet key and all",
    seedsMap instanceof Map && seedsMap.size > 0
    && j(seedsMap) === "{}" && !j(seedsMap).includes(PLAYER) && sweepJson(seedsMap).includes(PLAYER)
    && rawHits.includes(`id:${bot.botId}`) && rawHits.some((h) => h.startsWith("id:hb:")),
    `plain=${j(seedsMap)} · deep hit=${sweepJson(seedsMap).includes(PLAYER)} · raw-row hits ${j(rawHits.slice(0, 4))}`);

  /* ⛔ CONTROL (v) · THE LEASE IS REALLY HELD, AND THE UNFILTERED SNAPSHOT REALLY CARRIES THE HOUSE WORD.
     Ruling 247 names both halves in terms. Without the lease, `/api/health`'s `leadership` map cannot hold the
     planner key whatever `PUBLIC_LEASE_TASKS` does, and the four `/api/health` rows above report an absence the
     FIXTURE produced. With it, deleting that filter and returning `leadershipSnapshot()` whole goes red HERE. */
  const rawLeases = sweepJson(LEADER.leadershipSnapshot());
  ok("11.247.c6 · CONTROL (v) · the planner lease IS held while /api/health is swept, and the UNFILTERED leadershipSnapshot() names it — `house-bot` is a shared-vocabulary word, so the route's own filter is the only thing between that lease name and every visitor, and this sweep can see it when it is not applied",
    leaseTaken === true && Object.keys(LEADER.leadershipSnapshot()).includes(HBC.HOUSE_PLANNER_TASK)
    && needlesIn(rawLeases).length > 0 && houseHits(HBC.HOUSE_PLANNER_TASK).length > 0,
    `leaseTaken=${leaseTaken} · tasks ${j(Object.keys(LEADER.leadershipSnapshot()))} · hits ${j(needlesIn(rawLeases).slice(0, 3))}`);

  /* ⛔ CONTROL (vi) · THE TWO NEW NEEDLE CLASSES AND THE LABEL BITE. A needle that matches nothing is an absence
     assertion with no instrument, so each is planted into a reader-SHAPED answer and required to be reported —
     including `label`, which matches no vocabulary pattern and is found only because it is in `IDS`. */
  const pressId = (press as Any)?.row?.id ?? (press as Any)?.id ?? null;
  const plantedNeedles = needlesIn(sweepJson({ rows: [{ note: botRow.label, key: botRow.labelKey, t: tgt.id, p: pressId }] }));
  ok("11.247.c7 · CONTROL (vi) · the target id, the press id and the bot's OWN LABEL are each REPORTED when planted into a reader-shaped answer — the label matches no vocabulary pattern, so without it in IDS the one arbitrary owner-chosen house string in the system would be invisible to this sweep",
    typeof pressId === "string" && [`id:${tgt.id}`, `id:${pressId}`, `id:${botRow.label}`, `id:${botRow.labelKey}`].every((n) => plantedNeedles.includes(n)),
    `pressId=${pressId} · label=${botRow?.label} · reported ${j(plantedNeedles.slice(0, 6))}`);
});

/**
 * ⛔ **§11b · C5-7's REVIEW, MAJOR · THE ENGINE CARD'S AUDIENCE FAILS CLOSED, AND `{readable:false}` IS INSIDE IT.**
 *
 * `houseEngineHealthFor` had ONE `try` around both halves — the viewer lookup and the engine/schema read — and its
 * `catch` returned `{ readable: false }`, a TRUTHY view. `/admin/system` renders `{houseEngine && <HouseEngineCard/>}`
 * and that card's failure branch is headed "House bot engine" / "Injini ya boti za nyumba" — two shared-vocabulary
 * hits. So a failure of the VIEWER LOOKUP produced the feature's name, in two languages, for a viewer whose audience
 * had never been established: any staff account holding the `ops` VIEW grant, on a page deliberately built to keep
 * rendering through a database wobble (its other reads each carry their own `catch`), with a SECOND, unmemoised
 * `db.user.findById` to time out on an exhausted pool. Owner ruling D19 does not allow that viewer to know the
 * feature exists. C7-SPEC ruling 354(a) specifies `null` here — the answer `houseConsoleAudience` gives — and
 * 354(c)'s `{readable:false}` is for a failed HEALTH read INSIDE the audience.
 *
 * ⛔ AND L52's OWN LESSON IS WHY NO GUARD SAW IT: `test:house-bot-reports` 0.L52 is scoped to rule-table keys and
 * their call sites, and ruling 453's console lexicon scans `src/app/admin/desk/**`. This string is painted by a page
 * in ANOTHER admin section, from a module in `src/lib/server/`. A guard's scope is part of its claim.
 */
section("§11b · ruling 354(a) · the engine card's audience fails CLOSED on the viewer lookup — no card, no placeholder");
await guard("0.354a", async () => {
  const EH: Any = await import("../../src/lib/server/house-bot/engine-health.ts");
  const { db }: Any = await import("../../src/lib/server/store.ts");
  const mk = async (id: string, role: string) => {
    const now = new Date().toISOString();
    await db.user.create({
      id, phoneE164: `+2557${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`, email: null,
      passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
      role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
      acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false, twoFactorEnabled: false,
      avatarDataUrl: null, recruitedBy: null, createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
    } as never);
    return id;
  };
  const admin = await mk(`usr_354a_admin_${process.pid}`, "ADMIN");
  const staff = await mk(`usr_354a_staff_${process.pid}`, "SUPPORT");

  ok("0.354a.0 · the fixture is real: an ADMIN is IN the house-alert audience and gets a readable view, so the nulls below are refusals and not a function that answers null to everybody",
    ((await EH.houseEngineHealthFor(admin)) as Any)?.readable === true, j(await EH.houseEngineHealthFor(admin)));
  ok("0.354a.1 · ⛔ D19 · a signed-in NON-ADMIN staff account gets `null` — no card, no placeholder",
    (await EH.houseEngineHealthFor(staff)) === null, j(await EH.houseEngineHealthFor(staff)));

  /* ⛔ THE DEFECT ITSELF: the viewer lookup THROWS, so the audience is unknown. */
  const realFind = db.user.findById;
  let whenLookupFails: unknown;
  try {
    db.user.findById = async () => { throw new Error("pool timeout during the second, unmemoised read"); };
    whenLookupFails = await EH.houseEngineHealthFor(staff);
  } finally { db.user.findById = realFind; }
  ok("0.354a.2 · ⛔ D19 · ruling 354(a) · when the VIEWER LOOKUP itself fails the answer is `null`, not `{readable:false}` — a view object is truthy, the page renders the card on it, and the card's failure branch names this feature in two languages to a viewer whose audience was never established",
    whenLookupFails === null, j(whenLookupFails));
  ok("0.354a.3 · CONTROL · the stub really was live — the real lookup is back and an ADMIN reads again, so 0.354a.2 measured a failing lookup and not a function that had stopped being called",
    ((await EH.houseEngineHealthFor(admin)) as Any)?.readable === true, "restored");

  /* ⛔ AND THE CARD REALLY DOES NAME THE FEATURE. Read out of the page, never typed here (ruling 175): the words
     come from the file under test, so this control cannot drift from what the branch actually paints. */
  const sysPage = read("src/app/admin/system/page.tsx");
  const at = sysPage.indexOf("if (!view.readable)");
  const card = /<AdminCard title="([^"]+)" sw="([^"]+)"/.exec(at >= 0 ? sysPage.slice(at, at + 400) : "");
  ok("0.354a.c1 · CONTROL · the branch that `{readable:false}` renders REALLY names the feature: the card heading and its Swahili subtitle, read out of the page itself, are both shared-vocabulary hits — so answering `null` outside the audience is a D19 requirement and not a tidiness",
    at >= 0 && !!card && houseHits(card[1]).length > 0 && houseHits(card[2]).length > 0,
    j({ title: card?.[1], sw: card?.[2], hits: card ? [...houseHits(card[1]), ...houseHits(card[2])] : [] }));
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

/* ═══ §12 · CRA-12 and FS-05 · R4's whole surviving requirement is a SENTENCE, and nothing read it ═══════════ */

/**
 * ⛔ WHAT D20 LEFT STANDING, AND WHY THIS IS A DOCS GUARD AND NOT A CODE GUARD.
 *
 * `04-amendments.md` R4 strikes the `excludeHouse` option, `NON_HOUSE_POSITION_SQL`, the reward walker, the
 * source pin AND both of R4's own `Test:` lines, in place. What survives, verbatim, is "A COMPLIANCE and
 * HOUSE-BOTS.md rule: no prize, cashback, tournament or rank reward may be computed on marked positions."
 * That sentence is the ENTIRE live content of register rows CRA-12 and FS-05 — two rows, one requirement.
 *
 * ⛔ THIS ASSERTION PROVES THE RULE IS **RECORDED**. IT DOES NOT PROVE ANY CODE OBEYS IT, and it must never be
 * read that way: D20 struck the walker that would have made obedience checkable. A future reward feature has
 * to bring its own guard. Saying so in the label is the point — `0.L52.4` (the only other assertion that opens
 * `docs/HOUSE-BOTS.md`) states its own scope for exactly this reason: a guard's scope is part of its claim.
 *
 * ⛔ FS-05's own `Test:` line names test:house-bot-reward-exclusion — struck by D20 and absent from
 * package.json. ⚠️ THE MISSING BACKTICKS AROUND THAT NAME ARE DELIBERATE AND MUST STAY OFF. `test:guards-exist`
 * §1 treats a BACKTICKED `prefix:name` as a CITATION — "someone told a reader this guard exists" — and this
 * sentence says the exact opposite. Backticking it made the guard print `1 new phantom` and go 9/0 → 8/1,
 * measured 2026-09-20; its own docblock records that a bare colon-word is deliberately not a citation, and §4's
 * control asserts that distinction. ⛔ Never repair this by adding the name to `INHERITED_PHANTOMS`: that list
 * may only shrink, and an exemption for a name written today is not an inheritance. Its D6 half — the bot stays on the public board as an ordinary player — is ALREADY asserted at
 * §11 `11.247.c4`, with `11.247.c3` proving that sweep non-vacuous. So CRA-12 and FS-05 close together here.
 *
 * ⛔ AND THE TAIL OF HB-ACC-07 (amendment A1). A1 records "Signing out other devices on a password change is
 * not built" and ends "Test: `test:docs` greps the risk line." Measured 2026-09-20: `scripts/docs-links.mjs`
 * — the whole of `test:docs`, 130 lines — checks relative links, `scripts/<file>` paths and npm keys, and
 * greps no sentence anywhere. A1's recorded proof did not exist, so the risk line was pinned by NOTHING. It is
 * pinned here. ⚠️ HB-ACC-07 is still a RECONCILED row, not a tested one: the withdrawn sessions test is not
 * owed and must never be written. This pins the sentence A1 left standing, which is a smaller, true claim.
 *
 * ⛔ EVERY DOCUMENT IS CHECKED SEPARATELY. One assertion over both would pass while either was empty — the
 * lesson `test:dsar-secrets` §6 recorded in its own words. The two R4 sentences are NOT the same string
 * (HOUSE-BOTS.md carries D6's display clause, COMPLIANCE-DECISIONS.md does not), which is itself why a single
 * shared needle would have had to be loosened until it proved less than either document says.
 */
if (STORE === "memory") {
  section("§12 · CRA-12 / FS-05 · R4's surviving rule, and A1's risk line, are RECORDED in both authority documents");
  await guard("12", () => {
    /** Each row is one document's OWN wording. `id` is the rule; `file` is the document; `needle` is exact. */
    const RULES: Array<{ id: string; row: string; file: string; needle: string }> = [
      { id: "R4", row: "CRA-12/FS-05", file: "docs/HOUSE-BOTS.md",
        needle: "No prize, cashback, tournament or rank reward may be computed on house-marked positions" },
      { id: "R4", row: "CRA-12/FS-05", file: "docs/COMPLIANCE-DECISIONS.md",
        needle: "No prize, cashback, tournament or rank reward on house stakes (R4)" },
      { id: "risk-7", row: "HB-ACC-07 tail (A1)", file: "docs/HOUSE-BOTS.md",
        needle: "A password change or reset does not sign out the holder's other sessions (owner ruling 2026-09-13)" },
      { id: "risk-7", row: "HB-ACC-07 tail (A1)", file: "docs/COMPLIANCE-DECISIONS.md",
        needle: "A password change or reset does not sign out the holder's other sessions (owner ruling 2026-09-13)" },
    ];
    const DOCS = [...new Set(RULES.map((r) => r.file))];

    /** The reader, used identically for the live documents and for the planted copies. */
    const missingIn = (text: string, needle: string): boolean => !text.includes(needle);

    const texts = new Map(DOCS.map((f) => [f, read(f)]));
    console.log(`  §12 population: ${RULES.length} recorded rules across ${DOCS.length} documents — ` +
      DOCS.map((f) => `${f} ${texts.get(f)!.length} bytes`).join(" · "));

    ok("12.0 · POPULATION · both authority documents are non-empty and carry their own title, so a rule 'found' below is found in a real document and not in an empty string",
      DOCS.length === 2 && DOCS.every((f) => (texts.get(f) ?? "").length > 5_000),
      j(DOCS.map((f) => `${f}:${texts.get(f)!.length}`)));

    /* ⛔ ONE ASSERTION PER DOCUMENT PER RULE — four, not one. */
    for (const r of RULES) {
      ok(`12.${r.id}.${r.file.includes("HOUSE-BOTS") ? "hb" : "cd"} · ${r.row} · ⛔ RECORDED, NOT OBEYED: ${r.file} still carries ${r.id}'s rule in its own words — this proves the RULE IS WRITTEN DOWN and proves nothing whatever about any code path, because D20 struck the walker that would have made obedience checkable`,
        !missingIn(texts.get(r.file)!, r.needle), `${r.file} · needle ${j(r.needle.slice(0, 60))}`);
    }

    /* ── PLANTED · the sentence deleted from a COPY of each document must be REPORTED, per document ── */
    for (const r of RULES) {
      const key = `${r.id}.${r.file.includes("HOUSE-BOTS") ? "hb" : "cd"}`;
      const gutted = texts.get(r.file)!.split(r.needle).join("");
      ok(`12.PLANT.${key} · PLANTED · ${r.id} deleted from a copy of ${r.file} IS reported — checked per document, because one assertion over both would pass while either was empty`,
        gutted !== texts.get(r.file) && missingIn(gutted, r.needle),
        `bytes ${texts.get(r.file)!.length} → ${gutted.length}`);
    }

    /* ── POSITIVE · the untouched documents report nothing ── */
    ok("12.POS · POSITIVE CONTROL · the two documents as they stand on disk report NO missing rule, so the plants above are the plants and not the files",
      RULES.every((r) => !missingIn(texts.get(r.file)!, r.needle)),
      j(RULES.filter((r) => missingIn(texts.get(r.file)!, r.needle)).map((r) => `${r.file}:${r.id}`)));

    /* ── the reader itself must be able to say 'missing' ── */
    ok("12.CONTROL · the reader is capable of reporting a miss at all — a sentence that is in neither document is reported for both, so 12.R4/12.risk-7 are findings and not a predicate that always returns true",
      DOCS.every((f) => missingIn(texts.get(f)!, "no reward may be computed on a marked position, said exactly this way and nowhere")));
  });
}

/* ═══ §13 · CRA-19 · the FIU suspicious-activity report includes a designated holder, UNCHANGED (both stores) ═══ */

/**
 * ⛔ THE DEFECT THIS EXISTS TO CATCH: a later session "helpfully" excluding a designated house account from a
 * STATUTORY report. `buildFiuSar` (src/lib/server/reports/catalogue.ts:225) was named by NO file under
 * `scripts/` — `grep -rn buildFiuSar scripts/` returned 0 — and `test:report-formats` mentions "FIU" only to
 * forbid a false format claim on a button. Nothing would have reported it.
 *
 * CRA-19's standing requirement after D20: "The rows are included unchanged (statutory)", and the Context
 * column is struck (C5-SPEC ruling 228). Its F7 half — a holder money event gives the admin bell — ships as
 * `OWNER_MONEY` (money-hook.ts:43) and IS asserted at `test:house-bot-comms` 6.2, so only the SAR half is owed.
 *
 * THE TWIN SHAPE: a designated holder and an ordinary player make the SAME deposit, and the report must give
 * them the same row shape and the same trigger. A report that quietly dropped the holder fails on the holder
 * row; a report that returned everything fails on the POSITIVE control, which requires a deposit BELOW the
 * threshold to be ABSENT — without it, "the row is there" would pass over a builder with no filter at all.
 *
 * ⚠️ THE PERIOD IS DERIVED, NEVER TYPED. `currentPackPeriod()` is the PREVIOUS EAT month (a pack is filed for
 * a closed month), so a fixture dated "now" falls outside the report and the whole section would measure an
 * empty population and pass. The deposits are dated at the MIDPOINT of the period's own bounds.
 */
section("§13 · ruling 228 / CRA-19 · the FIU SAR carries a designated holder's large deposit unchanged, with no Context column and no house word");
await guard("13", async () => {
  const { loadWorld, OFFICER }: Any = await import("./house-bot-world.mts");
  const w: Any = await loadWorld();
  const { buildFiuSar }: Any = await import("../../src/lib/server/reports/catalogue.ts");
  const { AML_REVIEW_THRESHOLD_TZS }: Any = await import("../../src/lib/server/payments.ts");
  const RP: Any = await import("../../src/lib/server/report-pack.ts");

  /* ⚠️ The officer may already exist — §3 creates it, and on Postgres a second create is a unique violation
   * (this section threw exactly that on its first Postgres run). `buildFiuSar` uses `generatorId` only for the
   * reference and the meta block, so the row is created only when it is genuinely absent. */
  if (!(await w.db.user.findById(OFFICER))) await w.user({ id: OFFICER, role: "ADMIN" });
  const PERIOD: string = RP.currentPackPeriod();
  const B = RP.packPeriodBounds(PERIOD);
  const AT = new Date(B.start + Math.floor((B.end - B.start) / 2)).toISOString();

  const LARGE = AML_REVIEW_THRESHOLD_TZS + 200_000;   // 1.2M at the shipped 1M line
  const SMALL = AML_REVIEW_THRESHOLD_TZS - 1;         // one shilling under it

  const holder = await w.bot();                       // a DESIGNATED, ACTIVE house bot
  const twin = await w.user({ balance: 5_000_000 });  // the identical ordinary player

  const deposit = async (userId: string, amount: number, tag: string) => {
    const id = `txn_sar_${w.uid(tag)}`;
    await w.db.txn.create({
      id, walletId: `wal_${userId}`, userId, type: "DEPOSIT", status: "CONFIRMED",
      amount, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: null,
      msisdn: null, description: null, positionId: null, amlReason: null,
      createdAt: AT, updatedAt: AT, completedAt: AT, idempotencyKey: null, houseBotId: null,
    } as never);
    return id;
  };
  const holderTxn = await deposit(holder.userId, LARGE, "holder");
  const twinTxn = await deposit(twin, LARGE, "twin");
  const smallTxn = await deposit(holder.userId, SMALL, "small");

  const rep: Any = await buildFiuSar(OFFICER, PERIOD);
  const sec: Any = rep.sections[0];
  const rows: Any[] = sec.rows ?? [];
  const rowFor = (txnId: string) => rows.find((r) => r.txnId === txnId) ?? null;
  const hRow = rowFor(holderTxn);
  const tRow = rowFor(twinTxn);
  console.log(`  §13 population: ${rows.length} flagged rows in ${PERIOD} (threshold ${AML_REVIEW_THRESHOLD_TZS}), fixture deposits at ${AT}`);

  ok("13.0 · CRA-19 · POPULATION · the report for the derived pack period is non-empty and contains the fixture's own two deposits — an emptiness here would make every absence below meaningless",
    rows.length >= 2 && !!hRow && !!tRow, j({ rows: rows.length, period: PERIOD, holder: !!hRow, twin: !!tRow }));

  ok("13.1 · CRA-19 · ⛔ STATUTORY, UNCHANGED · the DESIGNATED HOLDER's 1.2M deposit is PRESENT in the FIU suspicious-activity report — the defect this guards is a later session excluding a house account from a statutory return",
    !!hRow && hRow.playerId === holder.userId && hRow.amount === LARGE, j(hRow));

  ok("13.2 · CRA-19 · TWIN · the holder's row and an identical ordinary player's row have the SAME shape and the SAME trigger — the same keys, the same triggerKind, the same status, the same amount — so the report treats a house account as any account",
    !!hRow && !!tRow && j(Object.keys(hRow).sort()) === j(Object.keys(tRow).sort())
      && hRow.triggerKind === tRow.triggerKind && hRow.reviewStatus === tRow.reviewStatus && hRow.amount === tRow.amount,
    j({ holder: hRow, twin: tRow }));

  ok("13.3 · CRA-19 · POSITIVE CONTROL · a deposit ONE SHILLING BELOW the threshold is ABSENT — without this, '13.1 the row is there' would pass over a builder that returned every transaction it saw",
    rowFor(smallTxn) === null && !rows.some((r) => r.amount === SMALL), j({ smallTxn, amounts: rows.map((r) => r.amount) }));

  /* D20 struck the Context column (ruling 228): every section's headers, not just the first. */
  const headers: string[] = (rep.sections ?? []).flatMap((s: Any) => (s.columns ?? []).map((c: Any) => String(c.header)));
  ok("13.4 · ruling 228 · NO Context column anywhere in the report — D20 struck it, and the headers are read from every section rather than only the first",
    headers.length >= 5 && !headers.some((h) => /context/i.test(h)), j(headers));

  ok("13.5 · ⛔ D19 · the whole rendered report — title, subtitle, summary, notes, columns and every row — names nothing about house bots, and carries neither the bot id nor the holder's own house key",
    houseHits(j(rep)).length === 0 && !j(rep).includes(holder.botId), j(houseHits(j(rep)).slice(0, 6)));

  ok("13.CONTROL · the house-word reader is live on this run — the fixture's own bot id IS found when it is actually present, so 13.5's zero is a measurement and not a silent reader",
    houseHits(j({ ...rep, planted: "house bot" })).length > 0);
});

/* ═══ §14 · CRA-32 · the finance figures that must INCLUDE house rows (both stores) ═══════════════════════════ */

/**
 * ⛔ AN INCLUSION CLAIM IS THE DANGEROUS KIND. D20 left these untouched and decided that /admin/finance counts
 * a house account in active players and in the Top-10 exactly like any player's, and gains no house tile
 * (C5-SPEC rulings 224–225). GGR, NGR and wallet liability INCLUDE house rows, and "Held for unverified"
 * includes an unapproved holder's winnings. The plausible future defect is not a leak — it is a filter added
 * for tidiness that quietly UNDERSTATES a regulator-facing liability. Measured 2026-09-20: no house-bot suite
 * imported `src/lib/server/analytics.ts` at all, and PROGRESS L34 records the reading as correct with nothing
 * asserting it.
 *
 * ⛔ EVERY FIGURE IS A BEFORE/AFTER DELTA EQUAL TO THE FIXTURE'S OWN AMOUNT, never a bare "greater than zero".
 * A "> 0" would pass over every other fixture this file has already built, which is the empty-population
 * failure wearing a number.
 *
 * ⛔ THE PLANT IS THE REAL DEFECT, RUN THROUGH THE REAL ARITHMETIC. `tallyWalletLiability` is the shipped
 * function; the plant calls THAT SAME FUNCTION over the same snapshot with the designated holders' wallets
 * filtered out — one filter, no second implementation — and requires the shortfall to be exactly the house
 * amount and the shipped figure NOT to equal it.
 *
 * ⚠️ SCOPE, NAMED: activePlayers, the Top-10, walletLiabilityByStatus and the unverified-liability basis. GGR
 * and NGR move only on settled bet money and are NOT asserted here; they stay with the money suites.
 */
section("§14 · rulings 224–225 / CRA-32 · active players, the Top-10, wallet liability and 'held for unverified' all INCLUDE a designated holder");
await guard("14", async () => {
  const { loadWorld }: Any = await import("./house-bot-world.mts");
  const w: Any = await loadWorld();
  const AN: Any = await import("../../src/lib/server/analytics.ts");
  const { tallyWalletLiability }: Any = await import("../../src/lib/wallet-liability.ts");

  const HOUSE_TZS = 3_100_000;   // distinctive, so a delta can only be this fixture's
  const TWIN_TZS = 3_100_000;
  const STAKE_TZS = 900_000_000; // large enough that the Top-10 place is not a coincidence

  const base = {
    active: await AN.activePlayers("today"),
    liability: (await AN.walletLiabilityByStatus()).activeTzs,
    unverified: await AN.unverifiedLiability(),
  };
  ok("14.0 · BASELINE · the three figures are readable before the fixture exists, and the unverified read is its OK arm — a failed read is its own arm and would make every delta below meaningless",
    typeof base.active === "number" && typeof base.liability === "number" && base.unverified.ok === true,
    j({ active: base.active, liability: base.liability, unverified: base.unverified }));

  /* A designated holder, funded — never KYC-approved, so its money is genuinely "held for unverified". */
  const holder = await w.bot({ balance: HOUSE_TZS });
  const afterHouse = {
    liability: (await AN.walletLiabilityByStatus()).activeTzs,
    unverified: await AN.unverifiedLiability(),
  };

  ok(`14.1 · CRA-32 · WALLET LIABILITY INCLUDES THE HOUSE WALLET — the figure rises by EXACTLY the holder's ${HOUSE_TZS} and not by "more than zero"`,
    afterHouse.liability - base.liability === HOUSE_TZS,
    j({ before: base.liability, after: afterHouse.liability, delta: afterHouse.liability - base.liability, expected: HOUSE_TZS }));

  ok(`14.2 · CRA-32 · "HELD FOR UNVERIFIED" INCLUDES AN UNAPPROVED HOLDER'S MONEY — the basis rises by exactly ${HOUSE_TZS}, and the account count by exactly one`,
    afterHouse.unverified.ok === true && afterHouse.unverified.tzs - base.unverified.tzs === HOUSE_TZS
      && afterHouse.unverified.accounts - base.unverified.accounts === 1,
    j({ before: { tzs: base.unverified.tzs, n: base.unverified.accounts }, after: { tzs: afterHouse.unverified.tzs, n: afterHouse.unverified.accounts } }));

  /* ── PLANTED · the tidy-up filter, through the SHIPPED arithmetic ── */
  const bots: Any[] = await w.dal.houseBotStore.listNonRemoved();
  const holderIds = new Set(bots.map((b: Any) => b.userId));
  const wallets: Any[] = await w.db.wallet.listAll();
  const shipped = tallyWalletLiability(wallets).activeTzs;
  const planted = tallyWalletLiability(wallets.filter((x: Any) => !holderIds.has(x.userId))).activeTzs;
  ok(`14.PLANT · PLANTED · a houseBotId-IS-NULL filter over the SAME snapshot and the SAME shipped tally is REPORTED as a shortfall: it loses at least this fixture's ${HOUSE_TZS}, and the shipped figure is NOT that number`,
    holderIds.size >= 1 && wallets.length > holderIds.size && shipped - planted >= HOUSE_TZS && shipped !== planted,
    j({ shipped, planted, shortfall: shipped - planted, holders: holderIds.size, wallets: wallets.length }));

  /* ── POSITIVE · an ordinary player moves the same figure by the same amount ── */
  const twin = await w.user({ balance: TWIN_TZS });
  const afterTwin = (await AN.walletLiabilityByStatus()).activeTzs;
  ok(`14.POS · POSITIVE CONTROL · an ORDINARY player funded with the same ${TWIN_TZS} moves the same figure by the same amount — house and non-house are one population, which is what "included unchanged" means`,
    afterTwin - afterHouse.liability === TWIN_TZS,
    j({ before: afterHouse.liability, after: afterTwin, delta: afterTwin - afterHouse.liability }));

  /* ── active players · a today-dated transaction, house and non-house alike ── */
  const now = new Date().toISOString();
  const txnNow = async (userId: string, type: string, amount: number, tag: string) => {
    await w.db.txn.create({
      id: `txn_fin_${w.uid(tag)}`, walletId: `wal_${userId}`, userId, type, status: "CONFIRMED",
      amount, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "INTERNAL", providerRef: null,
      msisdn: null, description: null, positionId: null, amlReason: null,
      createdAt: now, updatedAt: now, completedAt: now, idempotencyKey: null, houseBotId: null,
    } as never);
  };
  const quiet = await w.user({ balance: 1_000 });        // funded, but NO transaction today
  const activeAfterQuiet = await AN.activePlayers("today");
  await txnNow(holder.userId, "DEPOSIT", 50_000, "h");
  const activeAfterHolder = await AN.activePlayers("today");
  await txnNow(twin, "DEPOSIT", 50_000, "t");
  const activeAfterTwin = await AN.activePlayers("today");

  ok("14.3 · CRA-32 · ACTIVE PLAYERS COUNTS THE DESIGNATED HOLDER LIKE ANY PLAYER — a today transaction on the holder moves the count by exactly one",
    activeAfterHolder - activeAfterQuiet === 1, j({ before: activeAfterQuiet, after: activeAfterHolder }));
  ok("14.3b · POSITIVE CONTROL · an ordinary player's today transaction moves it by exactly one too, and a funded account with NO transaction today moves it by zero — so 14.3's +1 is the transaction and not 'any account added'",
    activeAfterTwin - activeAfterHolder === 1 && activeAfterQuiet === base.active,
    j({ baseline: base.active, afterQuietAccount: activeAfterQuiet, afterHolderTxn: activeAfterHolder, afterTwinTxn: activeAfterTwin, quiet }));

  /* ── the Top-10, like any player's ── */
  await txnNow(holder.userId, "BET_PLACED", STAKE_TZS, "hs");
  const top: Any[] = await AN.topNgrContributors(10);
  ok("14.4 · rulings 224–225 · THE TOP-10 CONTRIBUTORS LIST CARRIES THE DESIGNATED HOLDER like any player's — same row shape, its own stake, and no marker of any kind on the row",
    top.some((r: Any) => r.userId === holder.userId && r.lifetimeStakes >= STAKE_TZS)
      && houseHits(j(top)).length === 0 && !j(top).includes(holder.botId),
    j({ len: top.length, holderRow: top.find((r: Any) => r.userId === holder.userId), hits: houseHits(j(top)).slice(0, 4) }));
  ok("14.4b · POSITIVE CONTROL · the Top-10 is a real ranking and not 'everyone': a funded account that never staked is ABSENT from it",
    !top.some((r: Any) => r.userId === quiet), j(top.map((r: Any) => r.userId)));
});

/* ━━ THE `reports-mem` ROLL-CALL, AND IT MUST BE LAST — it reads the labels THIS run printed ━━━━━━━━━━━━━━
 * Ruling 505: a suite key declared in a house anchors file with no roll-call is audited by nobody, and an `expect`
 * that matches no label this suite can print is classed WRONG-ASSERTION by the drive — red for the wrong reason.
 * `reports-mem` arrived with ruling 434's mutation and 0.505 reported it the same day, which is the guard working.
 * ⚠️ MEMORY CHILD ONLY: §0's source pins run there, and the Postgres child prints none of their labels. */
if (STORE === "memory") {
  const selfCode = decomment(read("scripts/lib/house-bot-reports-cases.mts"));
  const LBL = "0.505b · every declared `reports-mem` mutation names an assertion THIS run actually printed — an `expect` that matches no label can only ever report WRONG-ASSERTION";
  const LBLC = "0.505b · CONTROL · the roll-call reads this run's own labels and this suite's own source, so a drifted `expect` IS reported and an invented one is never found";
  /* ⛔ EVERY ANCHORS FILE, WALKED FROM DISK — NOT A TYPED UNION (C5-8's register conversion, 2026-09-21).
     On 2026-09-20 this line became `[...CONSOLE_ANCHORS, ...MONEY_ANCHORS]` because the money file had started
     declaring `reports-mem` too. That fix was right and its SHAPE was wrong: a hand-maintained list of the files a
     roll-call reads is the same population defect ruling 505 exists to refuse, one level up — and 0.505 above cannot
     see it, because it asks only whether a KEY has a roll-call, never whether that roll-call READS the file the key
     was found in. It was measured the same day: converting Commit 5's mutation registers put 67 `reports-mem`
     declarations into `scripts/anchors/house-bot-c5.anchors.mjs`, 0.505 stayed green because `reports-mem` is a
     listed key, and every one of those 67 `expect`s would have been audited by nobody.
     ⭐ So the files are READ FROM DISK, with the same walk 0.505 uses. The population can only grow, a new house
     anchors file joins it the day it lands, and no edit here is ever needed again to keep it complete. */
  const anchorDirB = join(ROOT, "scripts/anchors");
  const declB: DeclaredMutation[] = [];
  for (const f of readdirSync(anchorDirB).filter((x) => x.startsWith("house") && x.endsWith(".anchors.mjs")).sort()) {
    const mod: Any = await import(pathToFileURL(join(anchorDirB, f)).href);
    declB.push(...((mod.MUTATIONS ?? []) as DeclaredMutation[]));
  }
  const input = {
    suiteKeys: ["reports-mem"],
    declarations: declB,
    emitted, source: selfCode, ownLabels: [LBL, LBLC],
  };
  const rc = expectDriftReport(input);
  ok(LBL, rc.declared >= 1 && rc.stale.length === 0, j(rc));
  const control = expectDriftControl(input, 40);
  ok(LBLC, control.pass, control.extra);
}

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
