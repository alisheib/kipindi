/**
 * `npm run test:house-bot-surfaces` — THE SURFACE LEXICON (owner ruling D19; the L52 defect class).
 *
 * ⛔ WHY THIS SUITE EXISTS, AND IT IS A SCOPE FINDING RATHER THAN A NEW RULE.
 * Every house-vocabulary guard this branch carries is scoped to ONE place, and the places do not meet:
 *
 *   · `test:house-bot-disclosure` §1 walks the CLIENT IMPORT GRAPH (derived — 266 entries, 388 modules here);
 *   · `test:house-bot-reports` 0.198.3 reads TWO player files, 0.198.2 five notifier declarations;
 *   · `test:house-bot-reports` 0.197.1/0.197.2 read `src/lib/server/kyc-risk.ts` and `src/app/admin/kyc/**`;
 *   · `test:house-bot-console` 4.453 reads `src/app/admin/desk/**` plus the one gate module;
 *   · `verify:house-bot-bundle` reads the BUILT artefact, and three QA probes read SERVED pages.
 *
 * MEASURED on this branch (C5-8, 2026-09-21): those static populations cover 412 of the 1,087 files under `src/`.
 * The other 675 are scanned by NO house-word guard at all, and 181 of them are admin surfaces. That is not a
 * hypothetical: it is exactly the hole the C5-s4 register found twice —
 *
 *   · S4-M55 paints the word "Liquidity" on an officer's KYC card: `0.198.3`'s word scan is PLAYER surfaces only
 *     and ruling 453's lexicon is the console subtree only, so `/admin/kyc` is NEITHER;
 *   · S4-M56 puts `houseBetCount` on an admin client module, and that name matches NO alternative of
 *     `HOUSE_IDENTIFIER_SOURCE` — the vocabulary could not have seen it whatever the population was.
 *
 * ⛔ AND L52 IS THE SAME DEFECT, ALREADY PAID FOR ONCE: a house word sat live on `/admin/system`'s rate-limit table
 * for weeks because the lexicon guard scanned `src/app/admin/desk/**` while the string lived in `src/lib/server/`,
 * painted by a page in another section. **A GUARD'S SCOPE IS PART OF ITS CLAIM.**
 *
 * ⭐ WHAT THIS SUITE DOES DIFFERENTLY: its population is DERIVED, never listed.
 *   §0  walks `src/` from disk, derives the feature's own homes from the tree and the console section from
 *       `CONSOLE_ROUTE` read out of the source, PRINTS every population and PRINTS THE COMPLEMENT — including a
 *       re-derivation of the client graph, so the "somebody else covers it" assumption is measured, not assumed.
 *   §1  no ADMIN SURFACE outside the console paints a house WORD. An admin page added next month is in the
 *       population the day it lands, with nothing to remember.
 *   §2  the SHAPE family (`house` + a capital), because S4-M56 proves a right population with a wrong pattern is
 *       equally blind. Its accept side is DERIVED from the console door module's own exports.
 *   §3  the ONE-HOP PAINTERS — the modules an admin surface imports directly. This is where L52's string lived,
 *       and `rate-limit.ts` is asserted to be inside this population.
 *
 * ⛔ COMMENTS AND CODE. §1 and §3 read only what a file can PRINT — string literals, template parts and JSX text,
 * from the syntax tree — so comments are excluded BY CONSTRUCTION rather than by a stripper, and a module specifier
 * is excluded too (an import of a house module is ruling 198's pin, not a painted word). §2 reads `decomment()`ed
 * text with STRINGS KEPT, because a serialised payload key is written as a string and is the same disclosure as a
 * property name; measured on this branch, keeping strings adds no name that the code scan does not already find.
 *
 * ⛔ THE VOCABULARY IS NOT DECLARED HERE (C5-SPEC ruling 175): words, identifiers and the shape family come from the
 * one module every absence proof imports, and this file is inside `VOCABULARY_CONSUMERS` so `0.175` holds it there.
 */
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";
import ts from "typescript";
import { decomment } from "./lib/decomment.mts";
import {
  houseHitsByFamily, houseHits, houseCamelHits,
  HOUSE_WORD_SAMPLES, HOUSE_CAMEL_SAMPLES, HOUSE_CAMEL_BENIGN_SAMPLES, HOUSE_BENIGN_SAMPLES,
} from "./lib/house-bot-vocabulary.mjs";

type Any = any;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0, fail = 0;
const j = (v: unknown) => JSON.stringify(v) ?? String(v);
const ok = (label: string, cond: boolean, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (t: string) => console.log(`\n${t}`);
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
/** A one-shot substitution that REFUSES to plant silently: a control whose anchor has moved must fail, not pass. */
const plant = (code: string, from: string, to: string): string => {
  if (!code.includes(from)) throw new Error(`plant anchor not found: ${from.slice(0, 60)}`);
  return code.replace(from, to);
};

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §0 · THE POPULATIONS, DERIVED FROM DISK, AND THE COMPLEMENT
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§0 · every population derived from disk, and the complement no guard was reading");

const CODE_EXT = /\.(tsx?|[cm]?js)$/;
function walkFiles(rel: string, out: string[] = []): string[] {
  const abs = join(ROOT, rel);
  if (!existsSync(abs)) return out;
  for (const e of readdirSync(abs, { withFileTypes: true })) {
    const r = `${rel}/${e.name}`;
    if (e.isDirectory()) walkFiles(r, out);
    else if (CODE_EXT.test(e.name)) out.push(r);
  }
  return out;
}
const srcAll = walkFiles("src");

/**
 * THE FEATURE'S OWN HOMES, derived from the TREE rather than typed: any file under a directory named `house-bot`,
 * and any file whose own name begins with the feature's two module prefixes. A module added under
 * `src/lib/server/house-bot/` next month is a home the day it lands.
 * ⛔ Written as STRING tests, never regexes: a regex source spelling the feature's name is itself a re-declared
 * vocabulary pattern, which `0.175` refuses and is right to (`scripts/lib/house-bot-reports-cases.mts`).
 */
const FEATURE_DIR = "house-bot";
const FEATURE_FILE_PREFIXES = ["house-bot", "house-console"];
const isHome = (rel: string): boolean => {
  const segs = rel.split("/");
  if (segs.slice(0, -1).includes(FEATURE_DIR)) return true;
  const base = segs[segs.length - 1];
  return FEATURE_FILE_PREFIXES.some((p) => base.startsWith(`${p}-`) || base.startsWith(`${p}.`));
};

/** The console section, derived from the route the source itself declares — a moved section is followed. */
const CONSOLE_ROUTE = /export const CONSOLE_ROUTE = "([^"]+)"/.exec(read("src/lib/house-bot/console-routes.ts"))?.[1] ?? null;
const consoleDir = CONSOLE_ROUTE ? `src/app${CONSOLE_ROUTE}/` : null;
const inConsole = (rel: string) => !!consoleDir && rel.startsWith(consoleDir);

const homes = srcAll.filter(isHome);
const consoleFiles = srcAll.filter(inConsole);
/** THE POPULATION THIS SUITE OWNS: every admin surface that is neither the feature's own code nor the console. */
const surfaces = srcAll.filter((r) => (r.startsWith("src/app/admin/") || r.startsWith("src/components/admin/")) && !isHome(r) && !inConsole(r));

const WITNESS_SURFACES = [
  "src/app/admin/system/page.tsx", "src/app/admin/kyc/[id]/page.tsx",
  "src/app/admin/house/page.tsx", "src/app/admin/finance/page.tsx",
];
ok("0.pop.1 · the src walk is real: every .ts/.tsx/.js/.cjs/.mjs file under src/, read from disk, ≥ 1,000 of them, with the console's own page and the platform's owner book both in it",
  srcAll.length >= 1_000 && srcAll.includes("src/app/admin/desk/page.tsx") && srcAll.includes("src/app/admin/house/page.tsx"),
  `src files ${srcAll.length}`);
ok("0.pop.2 · the feature's HOMES are derived from the tree (a `house-bot` directory segment, a `house-bot`/`house-console` file prefix), ≥ 40 of them, holding the DAL, the constants and the one console door",
  homes.length >= 40 && ["src/lib/server/house-bot-dal.ts", "src/lib/house-bot/constants.ts", "src/lib/server/house-console-read.ts", "src/lib/server/house-bot/engine.ts"].every((f) => homes.includes(f)),
  `homes ${homes.length}`);
ok("0.pop.3 · the console section is derived from CONSOLE_ROUTE read out of console-routes.ts — not typed here — and it is ruling 453's own population",
  CONSOLE_ROUTE === "/admin/desk" && consoleFiles.length >= 10 && consoleFiles.includes("src/app/admin/desk/page.tsx"),
  `CONSOLE_ROUTE=${CONSOLE_ROUTE} · console files ${consoleFiles.length}`);
ok("0.pop.4 · the ADMIN SURFACE population is derived the same way and holds every admin page and admin component outside the console: ≥ 200 files, the four witnesses among them, and not one console file",
  surfaces.length >= 200 && WITNESS_SURFACES.every((f) => surfaces.includes(f)) && surfaces.every((f) => !inConsole(f)),
  `surfaces ${surfaces.length}`);

/* ── the client graph, re-derived, so "another guard covers it" is MEASURED ──────────────────────────────────── */
const GRAPH_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"];
const isDirective = (code: string, d: "use client" | "use server") =>
  new RegExp(`^\\s*(?:\\/\\/[^\\n]*\\n|\\/\\*[\\s\\S]*?\\*\\/\\s*)*["']${d}["']`).test(code);
const fileExists = (abs: string) => existsSync(abs) && statSync(abs).isFile();
function resolveFrom(fromRel: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(join(ROOT, dirname(fromRel)), spec);
  else return null;
  const rel = (abs: string) => abs.replace(/\\/g, "/").slice(ROOT.replace(/\\/g, "/").length + 1);
  if (CODE_EXT.test(base) && fileExists(base)) return rel(base);
  for (const e of GRAPH_EXTS) if (fileExists(base + e)) return rel(base + e);
  for (const e of GRAPH_EXTS) if (fileExists(join(base, `index${e}`))) return rel(join(base, `index${e}`));
  return null;
}
function clientGraph(): { entries: string[]; reached: Set<string> } {
  const entries = srcAll.filter((f) => isDirective(read(f), "use client"));
  const reached = new Set<string>();
  const queue: Array<[string, string]> = entries.map((e) => [e, e]);
  while (queue.length) {
    const [file, via] = queue.shift()!;
    if (reached.has(file)) continue;
    const raw = read(file);
    if (file !== via && isDirective(raw, "use server")) continue;
    reached.add(file);
    let js: string;
    try {
      js = transformSync(raw, { loader: file.endsWith(".tsx") || file.endsWith(".jsx") ? "tsx" : "ts", format: "esm", target: "es2022", charset: "utf8" }).code;
    } catch { continue; }
    const specs = new Set<string>();
    for (const m of js.matchAll(/\bimport\s+(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g)) specs.add(m[1]);
    for (const m of js.matchAll(/\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g)) specs.add(m[1]);
    for (const m of js.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) specs.add(m[1]);
    for (const s of specs) { const next = resolveFrom(file, s); if (next && !reached.has(next)) queue.push([next, via]); }
  }
  return { entries, reached };
}
const graph = clientGraph();
ok("0.pop.5 · the client graph re-derived here agrees with the floor `test:house-bot-disclosure` 1.0 pins on its own walk — ≥ 200 client entries, ≥ 300 modules reached, the dictionary and the failure registry among them — so the complement below is computed against a walker that works",
  graph.entries.length >= 200 && graph.reached.size >= 300 && graph.reached.has("src/lib/i18n-dict.ts") && graph.reached.has("src/lib/failure-reasons.ts"),
  `entries ${graph.entries.length} · reached ${graph.reached.size}`);

/**
 * The STATIC house-word populations that existed before this suite, each written the way its own guard derives it.
 * (The bundle scan and the three served probes are excluded on purpose: they read build output and HTTP responses,
 * not files, so no file of `src/` is inside them.)
 */
const PRIOR: Array<[string, (rel: string) => boolean]> = [
  ["test:house-bot-disclosure §1 · the client graph", (r) => graph.reached.has(r)],
  ["test:house-bot-console 4.453 · the console section + the gate", (r) => inConsole(r) || r === "src/lib/server/house-console-read.ts"],
  ["test:house-bot-reports 0.197.2 · src/app/admin/kyc/**", (r) => r.startsWith("src/app/admin/kyc/")],
  ["test:house-bot-reports 0.197.1 · the KYC read", (r) => r === "src/lib/server/kyc-risk.ts"],
  ["test:house-bot-reports 0.198.3 · the two player surfaces", (r) => r === "src/components/markets/resolution-panel.tsx" || r === "src/app/markets/[id]/page.tsx"],
  ["test:house-bot-reports 0.198.2 · the five notifier declarations", (r) => r === "src/lib/server/notification-service.ts" || r === "src/lib/server/email.ts" || r === "src/lib/server/market-service.ts"],
];
const coveredBefore = (rel: string) => PRIOR.filter(([, f]) => f(rel)).map(([name]) => name);
const complement = srcAll.filter((r) => coveredBefore(r).length === 0);
const bucketOf = (f: string) =>
  f.startsWith("src/app/admin/") ? "admin surface" : f.startsWith("src/app/api/") ? "route handler"
  : f.startsWith("src/app/") ? "player route" : f.startsWith("src/components/") ? "component"
  : f.startsWith("src/lib/server/") ? "server module" : f.startsWith("src/lib/") ? "lib module" : "other";
const buckets = new Map<string, number>();
for (const f of complement) buckets.set(bucketOf(f), (buckets.get(bucketOf(f)) ?? 0) + 1);
console.log(`  POPULATIONS · src ${srcAll.length} · homes ${homes.length} · console ${consoleFiles.length} · admin surfaces ${surfaces.length} · client graph ${graph.reached.size}`);
for (const [, f] of PRIOR) void f;
for (const [name, f] of PRIOR) console.log(`  PRIOR · ${String(srcAll.filter(f).length).padStart(4)}  ${name}`);
console.log(`  COMPLEMENT · ${complement.length} of ${srcAll.length} src files were read by NO house-word guard`);
for (const [b, n] of [...buckets.entries()].sort((a, b2) => b2[1] - a[1])) console.log(`    ${String(n).padStart(4)}  ${b}`);

/**
 * ⛔ THE TWO WITNESSES ARE SERVER COMPONENTS, AND THAT IS THE WHOLE POINT. The client-graph walk is the one prior
 * population that is genuinely derived, and it reaches a file only through a `"use client"` entry — so an admin
 * page rendered on the server is outside it by construction, however much house vocabulary it paints.
 * `/admin/retention/purge-chain-card.tsx` is deliberately NOT a witness: it is `"use client"`, the graph does reach
 * it, and using it here would have made this assertion pass for the wrong reason.
 */
const UNSCANNED_WITNESSES = ["src/app/admin/system/page.tsx", "src/app/admin/finance/page.tsx"];
const adminInComplement = complement.filter((f) => surfaces.includes(f));
ok("0.pop.6 · ⛔ THE COMPLEMENT IS REAL AND IT IS LARGE: ≥ 400 files under src/ are inside NO house-word population, ≥ 150 of them admin surfaces, and the page L52's own lesson names — /admin/system, which paints this feature's name in two languages — is one of them, beside the finance page that names two house identifiers",
  complement.length >= 400 && adminInComplement.length >= 150
    && UNSCANNED_WITNESSES.every((f) => complement.includes(f) && surfaces.includes(f) && !graph.reached.has(f)),
  j({ complement: complement.length, adminSurfacesUnscanned: adminInComplement.length, witnesses: UNSCANNED_WITNESSES.map((f) => ({ f, coveredBefore: coveredBefore(f) })) }));
ok("0.pop.c1 · CONTROL · the complement measure is a measure and not an empty predicate: the console page, a KYC module, the KYC read and a player surface are each reported as COVERED by the guard that owns them, and the dictionary is reported covered by the client graph",
  coveredBefore("src/app/admin/desk/page.tsx").length >= 1 && coveredBefore("src/app/admin/kyc/[id]/page.tsx").length >= 1
    && coveredBefore("src/lib/server/kyc-risk.ts").length === 1 && coveredBefore("src/app/markets/[id]/page.tsx").length >= 1
    && coveredBefore("src/lib/i18n-dict.ts").includes(PRIOR[0][0]),
  j({ desk: coveredBefore("src/app/admin/desk/page.tsx"), kyc: coveredBefore("src/app/admin/kyc/[id]/page.tsx") }));

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §1 · NO ADMIN SURFACE OUTSIDE THE CONSOLE PAINTS A HOUSE WORD
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§1 · ⛔ D19 · no admin surface outside the console paints a house word");

/** Every string a file can put on a screen: string literals, template parts and JSX text, from the syntax tree. */
function printedTexts(rel: string, code: string): string[] {
  const kind = rel.endsWith(".tsx") || rel.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, kind);
  const out: string[] = [];
  const isSpecifier = (n: ts.Node): boolean => {
    const p = n.parent;
    if (!p) return false;
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isImportTypeNode(p) || ts.isModuleDeclaration(p) || ts.isExternalModuleReference(p)) return true;
    return ts.isCallExpression(p) && p.expression.kind === ts.SyntaxKind.ImportKeyword;
  };
  const walk = (n: ts.Node) => {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !isSpecifier(n)) out.push(n.text);
    if (ts.isTemplateExpression(n)) out.push(n.head.text, ...n.templateSpans.map((s) => s.literal.text));
    if (n.kind === ts.SyntaxKind.JsxText) { const t = (n as ts.JsxText).text.replace(/\s+/g, " ").trim(); if (t) out.push(t); }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}
const wordsPrinted = (rel: string, code: string): string[] =>
  [...new Set(printedTexts(rel, code).flatMap((t) => houseHitsByFamily(t).filter((h) => h.family === "words").map((h) => h.word)))];

/**
 * ⛔ THE ONE ADMIN SURFACE THAT MAY PAINT THE FEATURE'S NAME, BY EXACT WORD, WITH THE GATE THAT MAKES IT LAWFUL.
 * SHRINK-ONLY: `1.words.2` fails on an entry its file no longer prints, so an exemption can never outlive the copy
 * it was written for, and a word added to the page goes red rather than joining the list.
 *
 * `/admin/system` renders `{houseEngine && <HouseEngineCard …/>}`, and `houseEngineHealthFor` answers `null` to
 * anyone outside the house-alert audience — owner ruling 354(a), pinned by `test:house-bot-reports` 0.354a, which
 * exists because that `catch` once returned a TRUTHY `{readable:false}` and painted this card's heading and Swahili
 * subtitle to any staff account holding the ops VIEW grant. ⛔ This entry is lawful ONLY while that pin is green.
 */
const SURFACE_WORD_REGISTER: Readonly<Record<string, readonly string[]>> = {
  "src/app/admin/system/page.tsx": ["HOUSE_BOT", "house-bot", "House bot", "boti za nyumba"],
};
const surfaceWordProblems = (files: Array<{ rel: string; code: string }>): string[] =>
  files.flatMap(({ rel, code }) => {
    const allowed = SURFACE_WORD_REGISTER[rel] ?? [];
    return wordsPrinted(rel, code).filter((w) => !allowed.includes(w)).map((w) => `${rel}: ${w}`);
  });

const surfaceFiles = surfaces.map((rel) => ({ rel, code: read(rel) }));
const liveProblems = surfaceWordProblems(surfaceFiles);
ok("1.words.1 · ⛔ D19 · not one admin surface outside the console PAINTS a house word — every string literal, template part and JSX text of every page, layout, action and component under src/app/admin/ and src/components/admin/ is read from disk, with only the audience-gated engine card registered",
  liveProblems.length === 0, j({ population: surfaces.length, problems: liveProblems }));

const staleRegister = Object.entries(SURFACE_WORD_REGISTER).flatMap(([rel, words]) => {
  if (!surfaces.includes(rel)) return [`${rel}: no longer an admin surface`];
  const printed = wordsPrinted(rel, read(rel));
  return words.filter((w) => !printed.includes(w)).map((w) => `${rel}: "${w}" is registered but no longer printed`);
});
ok("1.words.2 · the register may only SHRINK: every registered word is still printed by the file it was registered for, so an exemption cannot outlive the copy it was written for and cannot be pre-widened for a word not yet shipped",
  staleRegister.length === 0, j({ register: SURFACE_WORD_REGISTER, stale: staleRegister }));

/**
 * ⛔ AND THE ONE EXEMPTION IS HELD TO ITS OWN GATE (1.words.3). A per-file, per-word register cannot see a word
 * MOVE: `/admin/system` may print "House bot engine" inside `HouseEngineCard`, and the register would stay green if
 * the very same words were lifted out of that component and painted unconditionally on the page. The claim in the
 * register's comment — "lawful because the card renders only inside the audience" — is therefore asserted here,
 * where it can fail, rather than left as prose. That is the shape this programme keeps finding: an authority claim
 * with no assertion behind it.
 */
const SYSTEM_PAGE = "src/app/admin/system/page.tsx";
const GATED_SCOPES = ["HouseEngineCard", "ENGINE_REFUSAL_WORDS"];
function declRanges(rel: string, code: string, names: string[]): Array<[number, number]> {
  const sf = ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: Array<[number, number]> = [];
  const walk = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name && names.includes(n.name.text)) out.push([n.getStart(sf), n.getEnd()]);
    if (ts.isVariableDeclaration(n) && ts.isIdentifier(n.name) && names.includes(n.name.text)) out.push([n.getStart(sf), n.getEnd()]);
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}
function wordsOutsideScopes(rel: string, code: string, names: string[]): string[] {
  const ranges = declRanges(rel, code, names);
  const sf = ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: string[] = [];
  const inScope = (p: number) => ranges.some(([a, b]) => p >= a && p < b);
  /* ⛔ A MODULE SPECIFIER IS NOT A PAINTED WORD, and leaving it in made this pin red on `/admin/system`'s own
     `import … from "@/lib/server/house-bot/engine-health"` — the feature's directory NAME, two lines above the
     code that reads it. `printedTexts` excludes specifiers by construction; so does this. */
  const walk = (n: ts.Node) => {
    const isText = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n) || n.kind === ts.SyntaxKind.JsxText;
    const p = n.parent;
    const isSpec = !!p && (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isImportTypeNode(p) || ts.isModuleDeclaration(p) || ts.isExternalModuleReference(p) || (ts.isCallExpression(p) && p.expression.kind === ts.SyntaxKind.ImportKeyword));
    if (isText && !isSpec && !inScope(n.getStart(sf))) {
      const text = n.kind === ts.SyntaxKind.JsxText ? (n as ts.JsxText).text : (n as ts.StringLiteral).text;
      for (const h of houseHitsByFamily(text)) if (h.family === "words") out.push(h.word);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return [...new Set(out)];
}
const systemPage = read(SYSTEM_PAGE);
const gatedSites = [...systemPage.matchAll(/<HouseEngineCard\b/g)].length;
ok("1.words.3 · ⛔ THE EXEMPTION IS HELD TO ITS GATE · every house word /admin/system prints lives inside `HouseEngineCard` or the refusal map that only that card reads; the card has exactly ONE render site and it is behind `houseEngine &&`, whose value is `houseEngineHealthFor`'s answer — `null` for every account outside the house-alert audience (ruling 354(a), behaviour pinned by test:house-bot-reports 0.354a)",
  declRanges(SYSTEM_PAGE, systemPage, GATED_SCOPES).length === 2 && gatedSites === 1
    && /\{houseEngine && <HouseEngineCard /.test(systemPage)
    && /const houseEngine = [^;]*houseEngineHealthFor\(/.test(systemPage)
    && wordsOutsideScopes(SYSTEM_PAGE, systemPage, GATED_SCOPES).length === 0,
  j({ scopes: declRanges(SYSTEM_PAGE, systemPage, GATED_SCOPES).length, renderSites: gatedSites, outside: wordsOutsideScopes(SYSTEM_PAGE, systemPage, GATED_SCOPES) }));

const movedOut = wordsOutsideScopes(SYSTEM_PAGE, plant(systemPage, "export const metadata =", "export const PlantedHeading = () => <h2>House bot engine</h2>;\nexport const metadata ="), GATED_SCOPES);
const ungated = /\{houseEngine && <HouseEngineCard /.test(plant(systemPage, "{houseEngine && <HouseEngineCard ", "{<HouseEngineCard "));
ok("1.words.c0 · CONTROL · the gate pin reports BOTH shapes the register cannot see: the card's own heading lifted OUT of the component onto the page body is reported as a word outside the gated scope, and dropping the `houseEngine &&` guard from the one render site is reported as an ungated card",
  movedOut.length >= 1 && movedOut.some((w) => w.toLowerCase().includes("house bot")) && ungated === false,
  j({ movedOut, guardStillFound: ungated }));

/* ── the controls · every plant goes into a REAL file's text, read from disk ─────────────────────────────────── */
/**
 * ⛔ A CONTROL MEASURES ITS PLANT, NOT THE TREE. Each control below runs the SAME predicate over the SAME real
 * population with one plant in it, and reads only what the plant ADDED. Driven on disk with a new offending admin
 * page present, the earlier shape — `planted.length === 1` over the whole population — turned five controls red for
 * a defect they had not planted, which reads as five broken controls beside one real finding.
 */
const added = (planted: string[]) => planted.filter((p) => !liveProblems.includes(p));
const KYC_CARD = "src/app/admin/kyc/[id]/page.tsx";
const HOUSE_BOOK = "src/app/admin/house/page.tsx";
const kycCard = read(KYC_CARD);
const withFile = (rel: string, code: string) => surfaceFiles.map((f) => (f.rel === rel ? { rel, code } : f));

const m55 = added(surfaceWordProblems(withFile(KYC_CARD, plant(kycCard, "export default async function", "export const PlantedFactor = () => <span title=\"Liquidity\">x</span>;\nexport default async function"))));
ok("1.words.c1 · CONTROL · S4-M55 ITSELF · the word \"Liquidity\" planted as an officer-facing string on the REAL KYC case page is REPORTED — the mutation whose own register entry reads \"0.198.3's word scan is PLAYER surfaces only and ruling 453's lexicon is the console subtree only, /admin/kyc is NEITHER\"",
  m55.length === 1 && m55[0].includes(KYC_CARD) && m55[0].toLowerCase().includes("liquidity"), j(m55));

const jsxPlant = added(surfaceWordProblems(withFile(HOUSE_BOOK, plant(read(HOUSE_BOOK), "export default async function", "export const PlantedCell = () => <td>House stake</td>;\nexport default async function"))));
ok("1.words.c2 · CONTROL · a house word written as JSX TEXT — element content, not an attribute — is reported. Ruling 453's own lexicon once missed 17 JSX prose strings on a single page because `ts.isStringLiteral` does not match a JsxText node",
  jsxPlant.length === 1 && jsxPlant[0].includes("House stake"), j(jsxPlant));

const localePlant = added(surfaceWordProblems(withFile(HOUSE_BOOK, plant(read(HOUSE_BOOK), "export default async function", "export const PlantedSw = () => <p>boti za nyumba</p>;\nexport const PlantedZh = () => <p>平台机器人</p>;\nexport default async function"))));
ok("1.words.c3 · CONTROL · the Swahili and Chinese words are found as written — a scan that reads a non-ASCII word as an escape sees neither, which is how esbuild's default charset once hid a planted 流动性 from the disclosure walker",
  localePlant.length === 2 && localePlant.some((p) => p.includes("boti za nyumba")) && localePlant.some((p) => p.includes("平台机器人")), j(localePlant));

const commentPlant = added(surfaceWordProblems(withFile(HOUSE_BOOK, plant(read(HOUSE_BOOK), "export default async function", "// a house bot with liquidity would be a house stake chosen by staff\nexport default async function"))));
const importPlant = added(surfaceWordProblems(withFile(HOUSE_BOOK, plant(read(HOUSE_BOOK), "export default async function", "export type { HouseBotStatus } from \"@/lib/house-bot/constants\";\nexport default async function"))));
ok("1.words.c4 · CONTROL · four house words in a COMMENT on a real admin page are NOT reported, and neither is a module specifier naming the feature's own directory — this section's claim is about what a page PAINTS, and prose about code has made three guards on this branch red for nothing",
  commentPlant.length === 0 && importPlant.length === 0, j({ comment: commentPlant, specifier: importPlant }));

const ownerBook = { rel: HOUSE_BOOK, code: read(HOUSE_BOOK) };
const benignPlant = surfaceWordProblems([{ rel: HOUSE_BOOK, code: plant(ownerBook.code, "export default async function", `export const Benign = () => <p>${HOUSE_BENIGN_SAMPLES.join(" · ")}</p>;\nexport default async function`) }]);
ok("1.words.c5 · CONTROL · THE ACCEPT SIDE · the platform's OWN owner book at /admin/house is clean as it stands, and stays clean with every benign look-alike planted into it — HOUSE_FEE, the /admin/house path, \"House edge\" and \"including household costs\". A guard that reddens the owner's own book is a guard the next session switches off",
  wordsPrinted(HOUSE_BOOK, ownerBook.code).length === 0 && benignPlant.length === 0, j({ live: wordsPrinted(HOUSE_BOOK, ownerBook.code), benign: benignPlant }));

const sampleSweep = HOUSE_WORD_SAMPLES.map((s) => ({ s, found: surfaceWordProblems([{ rel: HOUSE_BOOK, code: plant(ownerBook.code, "export default async function", `export const P = () => <p>${s}</p>;\nexport default async function`) }]).length }));
ok("1.words.c6 · CONTROL · the population of this control is DERIVED from the vocabulary, not maintained beside it: EVERY shared word sample, planted one at a time into a real admin page, is reported — so a sample deleted from the module cannot make this sweep pass over a shorter list",
  sampleSweep.length >= 19 && sampleSweep.every((x) => x.found >= 1), j(sampleSweep.filter((x) => x.found === 0)));

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §2 · THE SHAPE FAMILY · `house` + A CAPITAL, ON AN ADMIN SURFACE
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§2 · ⛔ D19 · the SHAPE family: no admin surface names a house identifier outside the console's one door");

/**
 * ⭐ THE ACCEPT SIDE IS DERIVED FROM THE DOOR'S OWN EXPORTS (ruling 259: the console's one read door). Fourteen
 * admin pages legitimately call `houseAuditForConsole` — that is ruling 260's requirement, not a leak — and a
 * fifteenth door function added next month is allowed the day it is exported, with nothing to remember here.
 */
const DOOR = "src/lib/server/house-console-read.ts";
function exportedNames(rel: string, code: string): string[] {
  const sf = ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out = new Set<string>();
  const walk = (n: ts.Node) => {
    const mods = ts.canHaveModifiers(n) ? ts.getModifiers(n) ?? [] : [];
    if (mods.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      if ((ts.isFunctionDeclaration(n) || ts.isTypeAliasDeclaration(n) || ts.isInterfaceDeclaration(n)) && n.name) out.add(n.name.text);
      if (ts.isVariableStatement(n)) for (const d of n.declarationList.declarations) if (ts.isIdentifier(d.name)) out.add(d.name.text);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return [...out];
}
const doorExports = exportedNames(DOOR, read(DOOR));

/**
 * ⛔ THE PLATFORM'S OWN HOUSE VOCABULARY, WHICH IS NOT THIS FEATURE'S. `/admin/house` is `main`'s owner book, the
 * ledger keeps a house account and the purge chain a house pool — all of them older than house bots and none of
 * them a disclosure. Registered by exact name, per file; SHRINK-ONLY, like the word register above.
 * ⛔ `houseEngine`/`houseEngineHealthFor` ARE this feature, and they are lawful on /admin/system for the one
 * reason the word register gives: ruling 354(a)'s audience gate, pinned by `test:house-bot-reports` 0.354a.
 */
const SURFACE_IDENTIFIER_REGISTER: Readonly<Record<string, readonly string[]>> = {
  "src/app/admin/finance/page.tsx": ["houseAccountBalances", "houseBalances"],
  "src/app/admin/house/page.tsx": ["houseFee", "housePosition"],
  "src/app/admin/retention/purge-chain-card.tsx": ["housePoolEntries"],
  "src/app/admin/system/page.tsx": ["houseEngine", "houseEngineHealthFor"],
};
const identifierProblems = (files: Array<{ rel: string; code: string }>, door: readonly string[]): string[] =>
  files.flatMap(({ rel, code }) => {
    const allowed = SURFACE_IDENTIFIER_REGISTER[rel] ?? [];
    return [...new Set(houseCamelHits(decomment(code)))]
      .filter((n) => !door.includes(n) && !allowed.includes(n))
      .map((n) => `${rel}: ${n}`);
  });

ok("2.ids.2 · the accept side is DERIVED, not listed: the console's one door module exports ≥ 60 names, ≥ 12 of them house-shaped, including the audience question and the audit gate every admin page must call",
  doorExports.length >= 60 && doorExports.filter((n) => n.startsWith("house")).length >= 12
    && ["houseConsoleAudience", "houseAuditForConsole"].every((n) => doorExports.includes(n)),
  j({ exports: doorExports.length, houseShaped: doorExports.filter((n) => n.startsWith("house")).length }));

const liveIds = identifierProblems(surfaceFiles, doorExports);
ok("2.ids.1 · ⛔ D19 · not one admin surface outside the console names a `house<Capital>` identifier that is neither an export of the console's one door nor a registered name of the platform's own owner book — the SHAPE is what is matched, so a name nobody thought to list is still seen",
  liveIds.length === 0, j({ population: surfaces.length, problems: liveIds }));

/** The §2 twin of `added`: what a plant ADDS to the live identifier report, so a control measures its plant. */
const added2 = (planted: string[]) => planted.filter((x) => !liveIds.includes(x));
const staleIds = Object.entries(SURFACE_IDENTIFIER_REGISTER).flatMap(([rel, names]) => {
  if (!surfaces.includes(rel)) return [`${rel}: no longer an admin surface`];
  const present = new Set(houseCamelHits(decomment(read(rel))));
  return names.filter((n) => !present.has(n)).map((n) => `${rel}: ${n} is registered but no longer used`);
});
ok("2.ids.3 · the identifier register may only SHRINK: every registered name is still used by the file it was registered for",
  staleIds.length === 0, j({ register: SURFACE_IDENTIFIER_REGISTER, stale: staleIds }));

const RAIL = "src/app/admin/kyc/[id]/kyc-decision-rail.tsx";
const railCode = read(RAIL);
const m56Code = plant(railCode, "export function KycDecisionRail(", "export const railHouseBetCount = (f: { houseBetCount: number }) => f.houseBetCount;\nexport function KycDecisionRail(");
const m56 = added2(identifierProblems(withFile(RAIL, m56Code), doorExports));
ok("2.ids.c1 · CONTROL · S4-M56 ITSELF, AND THE POINT OF THE WHOLE SECTION · `houseBetCount` planted on the REAL client decision rail is REPORTED by the shape family — while `houseHits`, the instrument every other absence guard reaches its verdict through, finds NOTHING in the same text. A right population with a wrong pattern is exactly as blind as a wrong population",
  m56.some((p) => p.includes("houseBetCount")) && houseHits(m56Code).length === houseHits(railCode).length && houseHits("houseBetCount").length === 0,
  j({ reported: m56, houseHitsOnThePlant: houseHits("houseBetCount") }));

const ACTIONS = "src/app/admin/kyc/[id]/kyc-actions.ts";
const m76 = added2(identifierProblems(withFile(ACTIONS, `${read(ACTIONS)}\nexport async function houseFigures(f: { houseStakedTzs: number }) { return f.houseStakedTzs; }`), doorExports));
ok("2.ids.c2 · CONTROL · S4-M76's shape · a \"use server\" admin action exporting the other struck KYC figure (`houseStakedTzs`) is reported too — a server action is a surface, because its module is walked from disk like any other",
  m76.some((p) => p.includes("houseStakedTzs")), j(m76));

const blindDoor = identifierProblems(surfaceFiles, []);
ok("2.ids.c3 · CONTROL · THE SWEEP IS LIVE AND THE ALLOWANCE IS DOING WORK · with the derived door list emptied, the same sweep over the same real files reports ≥ 14 legitimate call sites of the console's gate. A protection guard on this branch once swept in so much that all thirteen of its assertions passed HARDER while its feature was broken; this is the measurement that 2.ids.1's zero is a clean population and not a dead predicate",
  blindDoor.length >= 14 && blindDoor.some((p) => p.includes("houseAuditForConsole")), `${blindDoor.length} reported with the door emptied`);

const idComment = added2(identifierProblems(withFile(HOUSE_BOOK, plant(read(HOUSE_BOOK), "export default async function", "// houseBetCount and houseStakedTzs were struck by owner ruling D20\nexport default async function")), doorExports));
const idString = added2(identifierProblems(withFile(HOUSE_BOOK, plant(read(HOUSE_BOOK), "export default async function", "export const plantedKey = { \"houseBetCount\": 0 };\nexport default async function")), doorExports));
ok("2.ids.c4 · CONTROL · the two struck names written in a COMMENT are NOT reported, and the same name written as a STRING KEY is — a serialised payload key is spelt as a string and is the same disclosure as a property name, which is why this section decomments but deliberately does not blank literals",
  idComment.length === 0 && idString.some((p) => p.includes("houseBetCount")), j({ comment: idComment, string: idString }));

const benignIds = identifierProblems([{ rel: HOUSE_BOOK, code: plant(read(HOUSE_BOOK), "export default async function", `const benign = ${j(HOUSE_CAMEL_BENIGN_SAMPLES)};\nvoid benign;\nexport default async function`) }], doorExports);
const camelSweep = HOUSE_CAMEL_SAMPLES.map((s) => ({ s, found: identifierProblems([{ rel: HOUSE_BOOK, code: plant(read(HOUSE_BOOK), "export default async function", `const planted = { ${s}: 0 };\nvoid planted;\nexport default async function`) }], doorExports).length }));
ok("2.ids.c5 · CONTROL · BOTH SIDES OF THE SHAPE · every shape sample planted one at a time into a real admin page is reported, and every benign look-alike planted together is not — `household`, `HouseBot` (a capital H), `house_bot` (a separator), `warehouseBin` (no word boundary) and the bare word `house`",
  camelSweep.every((x) => x.found >= 1) && camelSweep.length >= 7 && benignIds.length === 0,
  j({ missed: camelSweep.filter((x) => x.found === 0), benign: benignIds }));

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §3 · THE ONE-HOP PAINTERS · WHERE L52's STRING ACTUALLY LIVED
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§3 · ⛔ L52 · the modules an admin surface imports directly, and the words they can paint through it");

function importSpecifiers(rel: string, code: string): string[] {
  const kind = rel.endsWith(".tsx") || rel.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, kind);
  const out: string[] = [];
  const walk = (n: ts.Node) => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) out.push(n.moduleSpecifier.text);
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteral(n.arguments[0])) out.push((n.arguments[0] as ts.StringLiteral).text);
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}
const painters = [...new Set(surfaceFiles.flatMap(({ rel, code }) =>
  importSpecifiers(rel, code).map((s) => resolveFrom(rel, s)).filter((r): r is string => !!r)))]
  .filter((r) => !surfaces.includes(r) && !isHome(r) && !inConsole(r)).sort();

/**
 * ⛔ THE ONE-HOP PAINTERS THAT PRINT A HOUSE WORD, BY EXACT WORD. SHRINK-ONLY, like the two registers above.
 * Every one of these is server-side copy or a stored key for the HOUSE audience — the admin alert letters, the
 * admin bell notices in three locales, the actor constant, the audit payload keys the DSAR export strips, and the
 * house bet path's own busy sentence. What this register buys is the L52 shape: a word added to one of these
 * files, or a NEW module that prints one and is imported by an admin page, goes red the day it lands.
 */
const PAINTER_WORD_REGISTER: Readonly<Record<string, readonly string[]>> = {
  "src/lib/server/email.ts": ["House bots", "house bot"],
  "src/lib/server/market-dal.ts": ["houseBot"],
  "src/lib/server/market-service.ts": ["House stake", "houseBot"],
  "src/lib/server/notification-service.ts": [
    "HOUSE_BOT", "house bot", "boti ya nyumba", "平台机器人", "house-bot", "House bot", "Staff-chosen",
    "house stake", "House bots", "staff-chosen", "Boti za nyumba", "house bots", "boti za nyumba",
  ],
  "src/lib/server/store.ts": ["HOUSE_BOT"],
  "src/lib/server/user-service.ts": ["houseBot", "houseStake", "houseStakes", "houseBots"],
};
const painterProblems = (files: Array<{ rel: string; code: string }>): string[] =>
  files.flatMap(({ rel, code }) => {
    const allowed = PAINTER_WORD_REGISTER[rel] ?? [];
    return wordsPrinted(rel, code).filter((w) => !allowed.includes(w)).map((w) => `${rel}: ${w}`);
  });

const RATE_LIMIT = "src/lib/server/rate-limit.ts";
ok("3.hop.1 · the painter population is DERIVED from the surfaces' own imports — ≥ 100 modules, resolved through the @/ alias and relative paths — and `src/lib/server/rate-limit.ts` is inside it: the module L52's house word actually lived in, painted verbatim on /admin/system by a page in another section",
  painters.length >= 100 && painters.includes(RATE_LIMIT) && painters.every((r) => !isHome(r) && !inConsole(r)),
  `painters ${painters.length}`);

const painterFiles = painters.map((rel) => ({ rel, code: read(rel) }));
const livePainters = painterProblems(painterFiles);
ok("3.hop.2 · ⛔ L52 · not one module an admin surface imports prints a house word outside the register — so a NEW server module that paints the feature's name into an admin page goes red the day it is imported, which is the half L52 had nobody watching",
  livePainters.length === 0, j({ population: painters.length, problems: livePainters }));

/** The §3 twin of `added`: what a plant ADDS to the live painter report. */
const added3 = (planted: string[]) => planted.filter((x) => !livePainters.includes(x));
const stalePainters = Object.entries(PAINTER_WORD_REGISTER).flatMap(([rel, words]) => {
  if (!painters.includes(rel)) return [`${rel}: no longer a one-hop painter`];
  const printed = wordsPrinted(rel, read(rel));
  return words.filter((w) => !printed.includes(w)).map((w) => `${rel}: "${w}" is registered but no longer printed`);
});
ok("3.hop.3 · the painter register may only SHRINK: every registered word is still printed by the module it was registered for",
  stalePainters.length === 0, j({ files: Object.keys(PAINTER_WORD_REGISTER).length, stale: stalePainters }));

const withPainter = (rel: string, code: string) => painterFiles.map((f) => (f.rel === rel ? { rel, code } : f));
const NOTIFIER = "src/lib/server/notification-service.ts";
const newWord = added3(painterProblems(withPainter(NOTIFIER, `${read(NOTIFIER)}\nexport const plantedCopy = { titleEn: "Ukwasi report", titleZh: "流动性" };`)));
ok("3.hop.c1 · CONTROL · a house word the register does not hold, added to the most house-heavy painter there is, is reported — the register pins WORDS and not files, so a file already on it cannot absorb a new one",
  newWord.length === 2 && newWord.every((p) => p.includes(NOTIFIER)), j(newWord));

const l52 = added3(painterProblems(withPainter(RATE_LIMIT, plant(read(RATE_LIMIT), "export const RATE_RULES", "export const PLANTED_LABEL = \"house bots per minute\";\nexport const RATE_RULES"))));
ok("3.hop.c2 · CONTROL · L52 REBUILT · a house word planted as a rate-limit label in the REAL rate-limit module — the file, and the shape, of the defect that shipped live for weeks — is reported. This sweep would have gone red on the branch that carried it",
  l52.length === 1 && l52[0].includes(RATE_LIMIT), j(l52));

ok("3.hop.c3 · CONTROL · the feature's own homes are NOT in this population and were never meant to be — `src/lib/house-bot/alert-copy.ts` names the feature in three languages by design, and ruling 453 and the client-graph walk own it. A population that swallowed them would have to allowlist the whole feature, which is how a guard becomes a list",
  !painters.includes("src/lib/house-bot/alert-copy.ts") && !surfaces.includes("src/lib/house-bot/alert-copy.ts")
    && wordsPrinted("src/lib/house-bot/alert-copy.ts", read("src/lib/house-bot/alert-copy.ts")).length >= 3,
  j({ inPainters: painters.includes("src/lib/house-bot/alert-copy.ts"), words: wordsPrinted("src/lib/house-bot/alert-copy.ts", read("src/lib/house-bot/alert-copy.ts")).length }));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-surfaces: ${pass} passed, ${fail} failed`);
/**
 * ⛔ THE FLOOR. A suite whose cases silently stop executing prints "ALL PASS — 0 passed, 0 failed" and exits 0,
 * which is worse than a red. This is the count the first green run PRINTED; it only ever RISES, and only to a
 * number a run has printed.
 */
const MIN_ASSERTIONS = 31;
if (pass < MIN_ASSERTIONS) {
  console.error(`\n!! FLOOR — test:house-bot-surfaces ran ${pass} assertion(s), fewer than the ${MIN_ASSERTIONS} a green run printed.`);
  process.exit(4);
}
process.exit(fail === 0 ? 0 : 1);
