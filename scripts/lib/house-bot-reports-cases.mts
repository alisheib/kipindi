/**
 * The case list behind `test:house-bot-reports` (C5-SPEC §4.1, ruling 176). Run by that suite in two child processes —
 * memory and Postgres — never on its own. Every line carries its store.
 *
 * ⛔ OWNER RULING D19: house bots are never public, and the holder sees nothing. A pin here that goes red is a D19 defect
 * or a money defect, never a pin to relax.
 *
 * §0 are static source pins, each with a PLANTED control that must be reported and a BENIGN control that must not; they
 * run in the memory child only (a source file reads the same on both stores). Source is read through
 * `scripts/lib/decomment.mts`, never a new stripper (`test:decomment`).
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

/** The text of each top-level argument of the call whose `(` is at `open` (brackets balanced; the pins read simple calls). */
function callArgs(src: string, open: number): string[] {
  const args: string[] = [];
  let depth = 0, start = open + 1;
  for (let i = open; i < src.length; i++) {
    const c = src[i];
    if (c === "(" || c === "{" || c === "[") depth++;
    else if (c === ")" || c === "}" || c === "]") {
      depth--;
      if (depth === 0) { args.push(src.slice(start, i).trim()); return args; }
    } else if (c === "," && depth === 1) { args.push(src.slice(start, i).trim()); start = i + 1; }
  }
  return args;
}

/** `[start, end)` of the brace-balanced body that follows `anchor`, or null. */
function bodyRange(src: string, anchor: string): [number, number] | null {
  const a = src.indexOf(anchor);
  if (a < 0) return null;
  const open = src.indexOf("{", a + anchor.length);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return [a, i + 1];
  }
  return null;
}

/* ═══ §0 · ruling 170 · no house audit names the HOLDER as its actor ════════════════════════════════ */

/** An actor expression that names the account holder rather than an officer, the engine or nobody. */
export const HOLDER_ACTOR = /^(?:holder\w*|botUserId|(?:[\w$]+\.)*(?:userId|holderUserId|holderId|botUserId))$/;
/**
 * ⛔ THE COMMIT 7 DEBT, BY NAME — IT MAY ONLY LEAVE THIS LIST. `withdrawHouseConsent` (designation.ts) writes
 * `house_bot.holder_withdrew_consent` with the holder as actor; D19c struck the holder-facing Stop it served, so Commit 7
 * reshapes it with the officer as actor (C5-SPEC ruling 170, L49). Until then it has no caller under `src/` (rule 2).
 */
export const HOLDER_ACTOR_DEBT = ["withdrawHouseConsent"] as const;

/** A file whose code can write a house audit row: it names the catalogue, the writer, the consent void or a house action. */
const writesHouseAudit = (code: string) => /\bHOUSE_AUDIT\b|\bhouseAudit\s*\(|\bvoidHouseConsent\s*\(|["'`]house_bot\./.test(code);

/** Every actor expression a house-audit-writing file supplies: `houseAudit(action, ACTOR, …)` and every `actorId: VALUE`. */
export function holderActorSites(code: string): Array<{ at: number; actor: string }> {
  const out: Array<{ at: number; actor: string }> = [];
  for (const m of code.matchAll(/\bhouseAudit\s*\(/g)) {
    const open = m.index! + m[0].length - 1;
    const args = callArgs(code, open);
    // The declaration `async function houseAudit(action: HouseAuditAction, actorId: string | null, …)` is a signature.
    if (args[1] && !/:/.test(args[1]) && HOLDER_ACTOR.test(args[1])) out.push({ at: m.index!, actor: args[1] });
  }
  for (const m of code.matchAll(/\bactorId\s*:\s*([^,}\n;)]+)/g)) {
    const actor = m[1].trim();
    if (HOLDER_ACTOR.test(actor)) out.push({ at: m.index!, actor });
  }
  return out;
}

/** The violations of both rules over a set of `{rel, code}` files: a holder actor outside the named debt, and any caller of a debt. */
export function holderActorViolations(files: Array<{ rel: string; code: string }>): { holder: string[]; callers: string[]; debtSeen: string[] } {
  const holder: string[] = [], callers: string[] = [], debtSeen: string[] = [];
  for (const { rel, code } of files) {
    if (writesHouseAudit(code)) {
      const debts = HOLDER_ACTOR_DEBT.map((name) => [name, bodyRange(code, `export function ${name}(`)] as const);
      for (const site of holderActorSites(code)) {
        const debt = debts.find(([, r]) => r && site.at >= r[0] && site.at < r[1]);
        if (debt) debtSeen.push(debt[0]); else holder.push(`${rel}: actor ${site.actor}`);
      }
    }
    for (const name of HOLDER_ACTOR_DEBT) {
      for (const m of code.matchAll(new RegExp(String.raw`\b${name}\s*\(`, "g"))) {
        const before = code.slice(Math.max(0, m.index! - 16), m.index!);
        if (/function\s+$/.test(before)) continue; // its own definition
        callers.push(`${rel}: calls ${name}`);
      }
    }
  }
  return { holder, callers, debtSeen: [...new Set(debtSeen)] };
}

if (STORE === "memory") {
  section("§0 · ruling 170 · no house audit names the holder as its actor (the Commit 7 debt listed by name)");
  await guard("0.170", () => {
    const files = srcFiles().map((rel) => ({ rel, code: decomment(read(rel)) }));
    const writers = files.filter((f) => writesHouseAudit(f.code));
    ok("0.170.0 · the population is real: every file that can write a house audit is read (designation, outcomes, press-audit among them)",
      files.length > 500 && ["designation.ts", "outcomes.ts", "press-audit.ts"].every((n) => writers.some((w) => w.rel.endsWith(`house-bot/${n}`))),
      `${files.length} src files · ${writers.length} writers`);
    const v = holderActorViolations(files);
    ok("0.170.1 · ⛔ D19c · no house audit write under src/ names the holder as its actor, outside the named Commit 7 debt", v.holder.length === 0, v.holder.join(" · "));
    ok("0.170.2 · ⛔ no file under src/ calls withdrawHouseConsent before Commit 7 reshapes it", v.callers.length === 0, v.callers.join(" · "));
    ok("0.170.3 · the debt is still real (it may only leave the list, and leaves it when Commit 7 fixes it)",
      j(v.debtSeen) === j([...HOLDER_ACTOR_DEBT]), j(v.debtSeen));

    const plantedHolder = holderActorViolations([{ rel: "src/planted.ts", code: `import { HOUSE_AUDIT } from "x";\nasync function f(bot) { await houseAudit("house_bot.paused", bot.userId, target, payload); }` }]);
    ok("0.170.c1 · CONTROL · a planted house audit with `bot.userId` as its actor is reported", plantedHolder.holder.length === 1, j(plantedHolder));
    const plantedVoid = holderActorViolations([{ rel: "src/planted.ts", code: `export function stop(holderUserId) { return voidHouseConsent({ userId: holderUserId, cause: "HOLDER_WITHDREW", actorId: holderUserId }); }` }]);
    ok("0.170.c2 · CONTROL · a planted consent void with the holder as actor, outside the debt, is reported", plantedVoid.holder.length === 1, j(plantedVoid));
    const plantedCaller = holderActorViolations([{ rel: "src/app/planted/actions.ts", code: `"use server";\nexport async function stopAction() { return withdrawHouseConsent(session.userId); }` }]);
    ok("0.170.c3 · CONTROL · a planted caller of withdrawHouseConsent is reported", plantedCaller.callers.length === 1, j(plantedCaller));
    const benign = holderActorViolations([{ rel: "src/benign.ts", code: `async function houseAudit(action: A, actorId: string | null, t: T, p: P) {}\nawait houseAudit("house_bot.started", officerId, target, { holderUserId: bot.userId });\nawait voidHouseConsent({ userId: bot.userId, cause: code, actorId: null });\nexport function withdrawHouseConsent(holderUserId: string) { return 1; }` }]);
    ok("0.170.c4 · CONTROL · an officer actor, a holder id in the PAYLOAD, a null actor, the signature and the debt's own definition are not reported",
      benign.holder.length === 0 && benign.callers.length === 0, j(benign));
  });
}

/* ═══ §0 · ruling 175 · one absence vocabulary ═══════════════════════════════════════════════════════════ */

/**
 * Every regular expression a file DECLARES whose pattern is fully known in source — a regex literal, or `RegExp(…)` /
 * `new RegExp(…)` with a plain string or substitution-free template — compiled with its flags. A pattern built from a
 * variable (`new RegExp(f.source, f.flags)`, a template with `${…}`) is not the file's own text and is not returned.
 */
export function declaredRegexes(file: string, code: string): Array<{ text: string; re: RegExp | null }> {
  const kind = /\.m?js$/.test(file) ? ts.ScriptKind.JS : file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, kind);
  const out: Array<{ text: string; re: RegExp | null }> = [];
  const compile = (source: string, flags: string) => { try { return new RegExp(source, flags.replace(/[^dgimsuvy]/g, "")); } catch { return null; } };
  const literalText = (n: ts.Node | undefined): string | null => {
    if (!n) return null;
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
    if (ts.isTaggedTemplateExpression(n) && n.tag.getText(sf) === "String.raw" && ts.isNoSubstitutionTemplateLiteral(n.template)) return n.template.rawText ?? n.template.text;
    return null;
  };
  const visit = (n: ts.Node) => {
    if (n.kind === ts.SyntaxKind.RegularExpressionLiteral) {
      const t = n.getText(sf);
      const cut = t.lastIndexOf("/");
      out.push({ text: t, re: compile(t.slice(1, cut), t.slice(cut + 1)) });
    } else if ((ts.isNewExpression(n) || ts.isCallExpression(n)) && n.expression.getText(sf) === "RegExp") {
      const src = literalText(n.arguments?.[0]);
      if (src != null) out.push({ text: `RegExp(${JSON.stringify(src)})`, re: compile(src, literalText(n.arguments?.[1]) ?? "") });
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

/**
 * Neutral text of every shape the samples have (latin words, snake, camel, upper snake, CJK). A pattern that matches
 * one of these is GENERIC (`/\\s+/`, `/[^a-z0-9]+/gi`, `/\\w+/`), not a house word list, whatever else it matches.
 */
const NEUTRAL_SAMPLES = ["hello world", "hello-worlds", "hello_world", "HelloWorld", "HELLO_WORLD", "你好世界", "hi_0123456789abcdef01234567"];
/** A declared regex is a VOCABULARY pattern when a match on a sample is itself a house hit and it finds no neutral text. */
const findsSample = (re: RegExp, samples: readonly string[]) => {
  const g = () => new RegExp(re.source, re.flags.includes("g") ? re.flags : `${re.flags}g`);
  if (NEUTRAL_SAMPLES.some((s) => [...s.matchAll(g())].some((m) => m[0].length > 0))) return false;
  return samples.some((s) => [...s.matchAll(g())].some((m) => m[0].length > 0 && houseHits(m[0]).length > 0));
};
const ALL_SAMPLES = [...HOUSE_WORD_SAMPLES, ...HOUSE_IDENTIFIER_SAMPLES, ...HOUSE_ID_SAMPLES];
const IMPORTS_VOCABULARY = /from\s*["'][./]*(?:lib\/)?house-bot-vocabulary\.mjs["']/;

/** The single-source rule for one absence consumer: it imports the module and declares no vocabulary pattern of its own. */
export function ownVocabulary(file: string, raw: string): { imports: boolean; own: string[] } {
  const code = decomment(raw);
  return { imports: IMPORTS_VOCABULARY.test(code), own: declaredRegexes(file, code).filter((d) => d.re && findsSample(d.re, ALL_SAMPLES)).map((d) => d.text) };
}
/** The subset rule for a deliberately broader list: it extends the shared words and declares no word list of its own. */
export function broaderLists(file: string, raw: string): { extendsShared: number; ownWordLists: string[] } {
  const code = decomment(raw);
  return {
    extendsShared: IMPORTS_VOCABULARY.test(code) ? (code.match(/\bextendHouseWords\s*\(/g) ?? []).length : 0,
    ownWordLists: declaredRegexes(file, code).filter((d) => d.re && findsSample(d.re, HOUSE_WORD_SAMPLES)).map((d) => d.text),
  };
}

/** The five absence consumers of ruling 175 that exist at this commit (the service-layer sweep lands in §11 of this file). */
export const VOCABULARY_CONSUMERS = [
  "scripts/house-bot-disclosure.test.mts",
  "scripts/verify-house-bot-bundle.mjs",
  "scripts/house-bot-holder-view-shots.mts",
  "scripts/lib/house-bot-reports-cases.mts",
] as const;
/** The deliberately broader lists that import the shared words and extend them, with the extensions each must make. */
export const BROADER_LISTS: ReadonlyArray<readonly [file: string, extensions: number]> = [
  ["scripts/lib/house-bot-money-cases.mts", 2],
  ["scripts/house-bot-seam.test.mts", 2],
];

if (STORE === "memory") {
  section("§0 · ruling 175 · one absence vocabulary: every consumer imports it, none declares its own, broader lists extend it");
  await guard("0.175", () => {
    for (const file of VOCABULARY_CONSUMERS) {
      const r = ownVocabulary(file, read(file));
      ok(`0.175.${file.split("/").pop()} · imports the vocabulary module and declares no word, identifier or id pattern of its own`, r.imports && r.own.length === 0, j(r));
    }
    for (const [file, n] of BROADER_LISTS) {
      const r = broaderLists(file, read(file));
      ok(`0.175.subset.${file.split("/").pop()} · its broader notice words extend the shared words (${n} sites) and it keeps no word list of its own`, r.extendsShared >= n && r.ownWordLists.length === 0, j(r));
    }
    const everyShared = HOUSE_WORD_SAMPLES.filter((s) => !extendHouseWords(["house", "50pick"]).test(s));
    ok("0.175.subset.module · an extended list still finds every shared word sample (the shared words are a subset by construction)", everyShared.length === 0, j(everyShared));

    // ⛔ CONTROLS
    const disclosure = read("scripts/house-bot-disclosure.test.mts");
    const plantedLiteral = ownVocabulary("scripts/house-bot-disclosure.test.mts", `${disclosure}\nconst MINE = /liquidity|ukwasi|house[ -]?bots?/gi;\n`);
    ok("0.175.c1 · CONTROL · a consumer that re-declares its own word regex (a literal) is reported", plantedLiteral.own.length === 1, j(plantedLiteral.own));
    const plantedCtor = ownVocabulary("scripts/verify-house-bot-bundle.mjs", `${read("scripts/verify-house-bot-bundle.mjs")}\nconst ids = new RegExp(String.raw\`\\bhb[iethp]?_[0-9a-f]{24}\\b\`, "g");\n`);
    ok("0.175.c2 · CONTROL · a consumer that builds its own id pattern with new RegExp(String.raw…) is reported", plantedCtor.own.length === 1, j(plantedCtor.own));
    const noImport = ownVocabulary("scripts/house-bot-holder-view-shots.mts", read("scripts/house-bot-holder-view-shots.mts").replace(/import \{ houseHits \} from "\.\/lib\/house-bot-vocabulary\.mjs";/, ""));
    ok("0.175.c3 · CONTROL · a consumer that stops importing the module is reported", noImport.imports === false, j(noImport));
    const benign = ownVocabulary("scripts/x.mjs", `import { houseHits } from "./lib/house-bot-vocabulary.mjs";\nconst a = /\\s+/g; const b = new RegExp(f.source, f.flags); const c = /\\.(js|css)$/; const d = /\\/admin\\/house\\b/; const e2 = /[^a-z0-9]+/gi;\n// const e = /liquidity/;\nconst s = "const W = /liquidity/gi;";\n`);
    ok("0.175.c4 · CONTROL · whitespace, slug and path regexes, a variable-built RegExp, /admin/house, a commented regex and a regex inside a STRING are not reported",
      benign.imports && benign.own.length === 0, j(benign));
    const money = read("scripts/lib/house-bot-money-cases.mts");
    const plantedMoney = broaderLists("scripts/lib/house-bot-money-cases.mts", money.replace('extendHouseWords(["house", "50pick"])', "/liquidity|ukwasi|house|50pick/i"));
    ok("0.175.c5 · CONTROL · a broader list rewritten as its own word regex is reported and loses an extension site", plantedMoney.ownWordLists.length === 1 && plantedMoney.extendsShared === 1, j(plantedMoney));
    const codeScan = broaderLists("scripts/x.mts", `import { extendHouseWords } from "./house-bot-vocabulary.mjs";\nconst id = /houseBotId/; extendHouseWords(["house"]);\n`);
    ok("0.175.c6 · CONTROL · a code-scanning identifier regex (/houseBotId/) in a broader-list file is not a word list", codeScan.ownWordLists.length === 0 && codeScan.extendsShared === 1, j(codeScan));
  });
}

/* ═══ both stores · the store this child really runs on ══════════════════════════════════════════════ */
section("store · the child runs on the store it names");
await guard("store", async () => {
  const P: Any = await import("../../src/lib/server/prisma.ts");
  ok(`store.1 · the ${STORE} child ${STORE === "postgres" ? "has" : "has no"} database`, P.hasDatabase() === (STORE === "postgres"), `hasDatabase=${P.hasDatabase()}`);
});

console.log(`\n@@SUMMARY ${JSON.stringify({ pass, fail, store: STORE })}`);
process.exit(fail === 0 ? 0 : 1);
