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
 *   §4  THE PUBLIC POPULATION — every player route, route handler and shared component, derived the same way, with
 *       the pattern WIDENED to all three families and the shape (see below), plus every literal RESPONSE BODY a
 *       public handler returns. Its two exemptions are each held to their own claim rather than left as prose.
 *   §5  the SHAPE family in public code, and THE CROSSING: no house-shaped name inside any JSX attribute anywhere in
 *       the public population — no register, no exemption, because a prop is how a server component hands a value
 *       to a browser. The dev-only exemptions are held to the production door they rest on.
 *   §6  the PUBLIC one-hop painters — L52's shape on the side of the tree a player reads, sharing §3's ONE register.
 *
 * ⭐ WHAT §4 FOUND ON ITS FIRST RUN, AND IT IS A PATTERN FINDING RATHER THAN A POPULATION ONE. §1 reads the `words`
 * family; §4 reads all three families AND the shape, because any house-shaped string a PLAYER surface can print is a
 * disclosure whatever family it belongs to. That widening turned up `"HOUSE_STAKE_ONLY"` on
 * `src/app/markets/[id]/page.tsx` — one of `test:house-bot-reports` 0.198.3's own two files. The word alternative
 * `house[ -]?stakes?` cannot match an UNDERSCORE, so the single guard that reads that file could not see it. It is
 * lawful (ruling 146 maps it to a neutral state), and `4.words.4` now asserts that mapping instead of trusting it.
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
import { isDirective as isDirectiveLinear } from "./lib/is-directive.mts";
import {
  houseHitsByFamily, houseHits, houseCamelHits,
  HOUSE_WORD_SAMPLES, HOUSE_CAMEL_SAMPLES, HOUSE_CAMEL_BENIGN_SAMPLES, HOUSE_BENIGN_SAMPLES,
  HOUSE_IDENTIFIER_SAMPLES, HOUSE_ID_SAMPLES,
  HOUSE_WORD_SOURCE, HOUSE_JOIN, HOUSE_JOIN_CHARS, joinVariants, houseHalves,
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
/**
 * A one-shot substitution that REFUSES to plant silently: a control whose anchor has moved must fail, not pass.
 * ⛔ IT REPORTS THE MISSING ANCHOR AS A FAILED ASSERTION RATHER THAN THROWING, and that is a correction made while
 * driving §4: breaking ruling 146's mapping on disk moved 4.c7's anchor, `plant` threw, and the UNCAUGHT error killed
 * the run three sections early — so the one real red printed with a stack trace under it and §5 and §6 never ran at
 * all. A guard that dies on the mutation it exists to catch reports less than one that goes red.
 */
const plant = (code: string, from: string, to: string): string => {
  if (!code.includes(from)) {
    ok(`plant.anchor · ⛔ A CONTROL'S ANCHOR HAS MOVED and nothing was planted — the control below it is measuring an unmutated file: ${from.slice(0, 70)}`, false);
    return code;
  }
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
/**
 * THE POPULATION THIS SUITE OWNS: every admin surface that is neither the feature's own code nor the console.
 * ⛔ `src/app/api/admin/**` IS ONE OF THEM, and it was added the day §6's own complement print found it (C5-8): the
 * officers' route handlers sit under `src/app/api/`, so §1's old prefix test missed them and §4's public population
 * excludes them for being admin — a file inside NEITHER guard, between two populations that both believed the other
 * had it. That is the L52 defect class for the third time on this branch, and this time the guard found it itself,
 * because `6.gap.1` computes and prints what is STILL unscanned instead of stopping at what is.
 */
const surfaces = srcAll.filter((r) =>
  (r.startsWith("src/app/admin/") || r.startsWith("src/components/admin/") || r.startsWith("src/app/api/admin/")) && !isHome(r) && !inConsole(r));

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
ok("0.pop.4 · the ADMIN SURFACE population is derived the same way and holds every admin page, admin component AND officer route handler outside the console: ≥ 200 files, the four witnesses among them, the officers' own `src/app/api/admin/**` handlers among them too, and not one console file",
  surfaces.length >= 200 && WITNESS_SURFACES.every((f) => surfaces.includes(f)) && surfaces.every((f) => !inConsole(f))
    && surfaces.filter((f) => f.startsWith("src/app/api/admin/")).length >= 5,
  `surfaces ${surfaces.length}`);

/**
 * ⭐ 0.re · THE DETECTOR IS LINEAR, AND THIS SUITE IS WHERE IT STOPPED BEING SO (2026-09-23).
 *
 * 🔴 MEASURED, TWICE, IN TWO SUITES. The disclosure suite lost fourteen minutes to the regex form of
 * `isDirective` on 2026-09-22 and was fixed. THIS suite carried a byte-identical copy, and on 2026-09-23 it
 * stalled at exactly this point — after `0.pop.4`, before a single graph case — the moment the rules editor's
 * comment headers landed on the console files. It was killed three times before the cause was recognised, and
 * every one of those kills reported NOTHING: not a pass, not a fail, just silence with an operator waiting.
 * ⛔ SO THE GUARD SITS IN THE SUITE THAT WAS HANGING, not only in the one that was fixed first. Putting the
 * regex back makes this case red BY TIMEOUT rather than by verdict — which is still red, and is how the
 * mutation is proved.
 * ⚠️ The four verdicts matter as much as the clock: a directive AFTER code is not a directive, one INSIDE a
 * comment is not a directive, and a single-quoted one at the top of a file IS.
 */
{
  const header = "/* a */\n".repeat(400) + "// b\n".repeat(50);
  const t0 = Date.now();
  const first = isDirectiveLinear(`${header}"use client";\nexport const x = 1;`, "use client");
  const afterCode = isDirectiveLinear(`${header}export const x = 1;\n"use client";`, "use client");
  const inComment = isDirectiveLinear('/* "use client" */\nexport const x = 1;', "use client");
  const single = isDirectiveLinear("\n\n'use server'\nexport async function f() {}", "use server");
  const ms = Date.now() - t0;
  ok("0.re · the directive detector is LINEAR: 450 leading comments decide in under 100 ms, and a directive after code or inside a comment is not one",
    first && !afterCode && !inComment && single && ms < 100,
    `first=${first} afterCode=${afterCode} inComment=${inComment} single=${single} ${ms}ms`);
}

/* ── the client graph, re-derived, so "another guard covers it" is MEASURED ──────────────────────────────────── */
const GRAPH_EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"];
/**
 * 🔴 THE SAME ReDoS THAT KILLED THE DISCLOSURE SUITE ON 2026-09-22 LIVED HERE TOO, AND IT BIT ON 2026-09-23.
 *
 * This line used to build `^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*["']<directive>["']` and test it against
 * every file of the client graph. On a file that does NOT carry the directive, the whitespace between two
 * comment blocks can be split among the repetitions in exponentially many ways and the engine tries all of
 * them before answering false. The disclosure suite lost fourteen minutes to it on three checkouts; THIS suite
 * stalled immediately after `0.pop.4` the moment the rules editor's comment headers landed on the console
 * files — measured, killed, and then found to be the identical defect one directory over.
 * ⛔ THE FIX HAD BEEN WRITTEN DOWN ONCE AND APPLIED ONCE, which is the whole argument for one home: it now
 * lives in `scripts/lib/is-directive.mts`, both suites import it, and neither can drift from the other.
 */
const isDirective = (code: string, d: "use client" | "use server") => isDirectiveLinear(code, d);
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
 * ⛔ A REGISTER ENTRY COVERS THE SUBSTRINGS OF ITSELF, AND THIS IS A CORRECTION THE JOIN FORCED (§2J, C5-8).
 * Every register in this suite is a list of EXACT strings, and that was silently a claim about the PATTERN as well
 * as about the code: one literal yielded exactly one hit. The join broke that — `"HOUSE_STAKE_ONLY"` is now matched
 * by the words family as `HOUSE_STAKE` and by the identifier family as `HOUSE_STAKE_ONLY`, two hits from ONE
 * unchanged literal — and four assertions went red over a string nobody had touched.
 * ⛔ THE FIX IS NOT TO ADD THE SECOND SPELLING TO FOUR LISTS. That is the exact move this section exists to refuse:
 * it would have to be made again the next time the pattern widens, in however many registers exist by then. A
 * registered string authorises the CHARACTERS it registered, so a hit that is a substring of one is the same
 * disclosure, not a new one — and it is `includes`, so it stays CASE- AND SEPARATOR-SENSITIVE: `house stake` is not
 * a substring of `HOUSE_STAKE_ONLY` and is still reported at a file that registers it.
 * ⚠️ IT CANNOT SWALLOW A NEW STRING: a different literal that merely contains a registered substring still yields
 * its own longer hit, which is not a substring of anything registered and is reported. `1.reg.c1` asserts both.
 */
const coveredByRegister = (hit: string, allowed: readonly string[]): boolean => allowed.some((a) => a.includes(hit));
/** A register's report for one file: the hits no registered string covers. */
const uncovered = (rel: string, hits: string[], register: Readonly<Record<string, readonly string[]>>): string[] =>
  hits.filter((w) => !coveredByRegister(w, register[rel] ?? [])).map((w) => `${rel}: ${w}`);

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
    return uncovered(rel, wordsPrinted(rel, code), SURFACE_WORD_REGISTER);
  });

const surfaceFiles = surfaces.map((rel) => ({ rel, code: read(rel) }));
const liveProblems = surfaceWordProblems(surfaceFiles);
ok("1.words.1 · ⛔ D19 · not one admin surface outside the console PAINTS a house word — every string literal, template part and JSX text of every page, layout, action, component and officer route handler under src/app/admin/, src/components/admin/ and src/app/api/admin/ is read from disk, with only the audience-gated engine card registered",
  liveProblems.length === 0, j({ population: surfaces.length, problems: liveProblems }));

const staleRegister = Object.entries(SURFACE_WORD_REGISTER).flatMap(([rel, words]) => {
  if (!surfaces.includes(rel)) return [`${rel}: no longer an admin surface`];
  const printed = wordsPrinted(rel, read(rel));
  return words.filter((w) => !printed.some((h) => w.includes(h))).map((w) => `${rel}: "${w}" is registered but no longer printed`);
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
 * §2J · THE JOIN · THE FAMILY THE `HOUSE_STAKE_ONLY` ESCAPE BELONGS TO
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ⛔ WHY THIS SECTION EXISTS, AND IT IS A DEFECT CLASS RATHER THAN A MISSING SPELLING. §4 found
 * `"HOUSE_STAKE_ONLY"` on the market page because it reads all three families; the guard that was ALREADY reading
 * that file (`test:house-bot-reports` 0.198.3) could not, because its alternative was written `house[ -]?stakes?`
 * and an underscore is not in that class. Adding an underscore there would fix ONE spelling and teach nothing —
 * and the module's own header shows why: the two copies of this list that were centralised in the first place
 * disagreed about exactly this (`house[_ -]?bots?` against `house[ -]?bots?`). Centralising the LIST did not
 * centralise THE SEPARATOR, so the drift moved inside the one file: MEASURED at the head of this commit, SEVEN of
 * the twelve alternatives spelled a separator of their own, and re-spelling each sample under every join left
 * FOURTEEN of the fourteen compound samples unmatched by at least one join.
 *
 * ⭐ SO THE FAMILY IS DERIVED. `HOUSE_JOIN_CHARS` is every way this codebase welds two halves of a compound —
 * prose space, kebab, snake, dotted key, namespaced key, route slash — plus the join that writes NO character
 * (camelCase and bare concatenation), which is the `?` on `HOUSE_JOIN` under a case-insensitive match. The two
 * assertions below know not one spelling between them:
 *   · `2.join.1` re-spells every sample under every join and demands the WORDS FAMILY ALONE still match. A word
 *     added next month is swept under every join the day it lands, with nothing to remember.
 *   · `2.join.3` refuses any alternative that spells a separator ITSELF instead of using the shared join, so the
 *     defect cannot be reintroduced by hand even by someone who has never read this section.
 * ⚠️ `2.join.1` READS THE WORDS FAMILY ALONE on purpose. Folding the families together hides the bug: the
 * identifier family's `HOUSE_(?!FEE\b)[A-Z_]+` does match `HOUSE_STAKE_ONLY`, which is why §4 saw it — so an
 * assertion written against `houseHits` would have been green throughout and proved nothing about the word list
 * that the one guard reading that file actually used.
 */
section("§2J · ⛔ THE JOIN · a compound the lexicon knows in one spelling must be known in every join spelling");

/** The WORDS family alone — never `houseHits`, which folds in the identifier family that masked this defect. */
const wordsOnly = () => new RegExp(HOUSE_WORD_SOURCE, "i");
/** Top-level alternatives of a regex source, with character classes and groups kept whole. */
function alternativesOf(source: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = "";
  for (let i = 0; i < source.length; i++) {
    const c = source[i];
    if (c === "\\") { cur += c + source[++i]; continue; }
    if (c === "[") { const close = source.indexOf("]", i); cur += source.slice(i, close + 1); i = close; continue; }
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "|" && depth === 0) { out.push(cur); cur = ""; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}
/**
 * The alternatives that spell a separator THEMSELVES. The shared join is removed first, then regex syntax
 * (`(?:`, `)`, `\b`, the quantifiers) — what is left is the alternative's own literal text, and a join character
 * or a character class surviving in it is a hand-typed separator.
 */
const handTypedSeparators = (source: string): string[] =>
  alternativesOf(source).filter((a) => {
    const bare = a.split(HOUSE_JOIN).join("").replace(/\(\?[:=!]|\)|\\b|\\B|[?*+|]/g, "");
    return HOUSE_JOIN_CHARS.some((ch) => bare.includes(ch)) || bare.includes("[");
  });

/** Every sample re-spelled under every join, and whether the words family still finds it. */
const joinClosure = (source: string) => {
  const re = () => new RegExp(source, "i");
  const missed: string[] = [];
  let compounds = 0, variants = 0;
  for (const s of HOUSE_WORD_SAMPLES) {
    const vs = joinVariants(s);
    if (vs.length === 0) continue;
    compounds++; variants += vs.length;
    const bad = vs.filter((v) => !re().test(v));
    if (bad.length) missed.push(`${s} → ${bad.join(" , ")}`);
  }
  return { missed, compounds, variants };
};

const closure = joinClosure(HOUSE_WORD_SOURCE);
ok("2.join.1 · ⛔ THE CLOSURE · every compound word sample, re-spelled under EVERY join in the family — space, kebab, snake, dotted, namespaced, slashed, camelCased and bare-concatenated — is still found by the WORDS FAMILY ALONE. This is the assertion `\"HOUSE_STAKE_ONLY\"` escaped: a lexicon that knows a compound in one spelling and not another is blind by exactly one character, and it does not matter which character",
  closure.missed.length === 0 && closure.compounds >= 14 && closure.variants >= 100,
  j({ compounds: closure.compounds, variants: closure.variants, missed: closure.missed }));

const benignJoined = HOUSE_BENIGN_SAMPLES.flatMap((b) => [b, ...joinVariants(b)]).filter((v) => wordsOnly().test(v));
ok("2.join.2 · CONTROL · THE ACCEPT SIDE OF THE WIDENING · every benign look-alike, AND every join re-spelling of each one, is still NOT a word hit — `HOUSE_FEE`, `/admin/house`, \"House edge\", a raw `hb_` nonce and \"including household costs\" (whose `\\b` is the only thing keeping `including house` off `household`). A join family widened without this half is a guard that cries wolf and gets switched off",
  benignJoined.length === 0, j({ planted: HOUSE_BENIGN_SAMPLES.flatMap((b) => [b, ...joinVariants(b)]).length, matched: benignJoined }));

const handTyped = handTypedSeparators(HOUSE_WORD_SOURCE);
ok("2.join.3 · ⛔ THE RULE THAT MAKES IT STICK · not one alternative of `HOUSE_WORD_SOURCE` spells a separator of its own — every compound writes its join as the shared `HOUSE_JOIN`. This is what a spelling list cannot do: whatever word is added next month, and whatever separator its author forgets, the forgetting is what goes red",
  handTyped.length === 0, j({ alternatives: alternativesOf(HOUSE_WORD_SOURCE).length, handTyped }));

/**
 * ⛔ THE MUTATION, AND IT IS THE DEFECT ITSELF REBUILT. `house[ -]?stakes?` is the alternative as it stood at the
 * head of this commit — the one `"HOUSE_STAKE_ONLY"` walked through. Planting it back must redden BOTH assertions:
 * the closure, because `house_stake` stops matching; and the hand-typed rule, because the class is spelled inline.
 */
const NARROWED = HOUSE_WORD_SOURCE.replace(`house${HOUSE_JOIN}stakes?`, String.raw`house[ -]?stakes?`);
const narrowedClosure = joinClosure(NARROWED);
ok("2.join.c1 · CONTROL · THE ORIGINAL DEFECT, REPLANTED · restoring the exact alternative `house[ -]?stakes?` reddens the closure — `house_stake` and `HOUSE_STAKE` are reported unmatched — AND is reported as a hand-typed separator, while the market page's real string is a `HOUSE_STAKE` word hit under the shipped source and was NOT one under the narrowed one. Both halves of the finding, asserted rather than described",
  NARROWED !== HOUSE_WORD_SOURCE
    && narrowedClosure.missed.some((m) => m.startsWith("house stake") && m.includes("house_stake"))
    && handTypedSeparators(NARROWED).some((a) => a.includes("[ -]"))
    && wordsOnly().test("HOUSE_STAKE_ONLY") && !new RegExp(NARROWED, "i").test("HOUSE_STAKE_ONLY"),
  j({ missed: narrowedClosure.missed, handTyped: handTypedSeparators(NARROWED) }));

const joinCharProbe = HOUSE_JOIN_CHARS.map((ch) => {
  const dropped = `[${HOUSE_JOIN_CHARS.filter((c) => c !== ch && c !== "-").join("")}${HOUSE_JOIN_CHARS.includes("-") && ch !== "-" ? "-" : ""}]?`;
  return { ch, missed: joinClosure(HOUSE_WORD_SOURCE.split(HOUSE_JOIN).join(dropped)).missed.length };
});
ok("2.join.c2 · CONTROL · EVERY JOIN IS LOAD-BEARING · dropping each join character from the class one at a time reddens the closure every time, so the family is a measure and not a decoration: no character is in it because it looked plausible",
  joinCharProbe.every((p) => p.missed > 0) && joinCharProbe.length >= 6,
  j(joinCharProbe));

const halvesProbe = [
  { s: "HouseBot", want: 2 }, { s: "house_bot", want: 2 }, { s: "boti za nyumba", want: 3 },
  { s: "liquidity", want: 1 }, { s: "流动性", want: 1 }, { s: "平台机器人", want: 1 },
];
ok("2.join.c3 · CONTROL · THE SPLIT IS LIVE, INCLUDING ON THE LOCALES A TANZANIAN PLAYER READS · a camel name, a snake name and a three-word Swahili phrase each split into their halves, while a single-word sample and both Chinese samples split into ONE and so generate no variants — a splitter that shredded 平台机器人 would silently empty this whole section",
  halvesProbe.every((p) => houseHalves(p.s).length === p.want)
    && joinVariants("liquidity").length === 0 && joinVariants("平台机器人").length === 0 && joinVariants("boti za nyumba").length >= 7,
  j(halvesProbe.map((p) => ({ s: p.s, halves: houseHalves(p.s) }))));

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
  /**
   * ⛔ FOUND BY THE JOIN, NOT BY A READER (§2J, C5-8), AND IT IS THE SOURCE OF THE MARKET PAGE'S STRING. The word
   * family could not see `"HOUSE_STAKE_ONLY"` before the join, so the module that MINTS ruling 146's reason sat in
   * BOTH painter populations — admin and public — printing a house word neither §3 nor §6 could read. It is lawful
   * for the reason ruling 146 gives, and `3.hop.4` turns that reason into an assertion rather than leaving it here
   * as prose: the reason has exactly ONE call site in `src/`, and it is the one `4.words.4` already holds to a
   * literal-only branch.
   */
  "src/lib/server/objections-service.ts": ["HOUSE_STAKE_ONLY"],
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
    return uncovered(rel, wordsPrinted(rel, code), PAINTER_WORD_REGISTER);
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
  return words.filter((w) => !printed.some((h) => w.includes(h))).map((w) => `${rel}: "${w}" is registered but no longer printed`);
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

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §4 · THE PUBLIC POPULATION · PLAYER ROUTES, ROUTE HANDLERS AND THE COMPONENTS THEY SHARE
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ⛔ WHY THIS SECTION EXISTS, AND IT IS THE SAME FINDING AS §1 ON THE OTHER HALF OF THE TREE. When §1–§3 closed the
 * admin scope hole they PRINTED what they did not close, and the complement §0 still prints holds 137 player routes
 * and 62 route handlers that NO house-word guard reads. `test:house-bot-reports` 0.198.1 already walks the whole
 * player population — but for IMPORTS of the R2 modules, not for vocabulary; 0.198.3 is the only word scan on this
 * side of the tree and its population is TWO FILES.
 *
 * ⭐ AND THE PATTERN IS WIDENED HERE, WHICH IS WHAT THE FIRST RUN FOUND. §1 reads the `words` family, because an
 * admin surface painting `HOUSE_BOT` in a string is reading its own enum. A PLAYER surface is different: any
 * house-shaped string it can print is a disclosure whatever family it belongs to. So this section scans printed text
 * with ALL THREE vocabulary families AND the `house<Capital>` shape — and that is how it found
 * `"HOUSE_STAKE_ONLY"` on `src/app/markets/[id]/page.tsx`, which is one of 0.198.3's own two files: the word
 * alternative `house[ -]?stakes?` cannot match an UNDERSCORE, so the one guard reading that file could not see it.
 * A right population with a wrong pattern is exactly as blind as a wrong population (S4-M56's lesson, again).
 *
 * ⛔ COMMENTS AND CODE. Like §1 this reads only what a file can PRINT, from the syntax tree, so comments and module
 * specifiers are excluded by construction. §5's identifier sweep decomments and keeps strings, for §2's reason.
 */
section("§4 · ⛔ D19 · the PUBLIC population — player routes, route handlers and the components they share");

/** §1 owns admin, ruling 453 owns the console, and the feature's own homes are neither. What is left is public. */
const isAdminFile = (rel: string) =>
  rel.startsWith("src/app/admin/") || rel.startsWith("src/components/admin/") || rel.startsWith("src/app/api/admin/");
const publics = srcAll.filter((r) => (r.startsWith("src/app/") || r.startsWith("src/components/")) && !isAdminFile(r) && !inConsole(r) && !isHome(r));
const handlers = publics.filter((r) => /\/route\.tsx?$/.test(r));
const playerRoutes = publics.filter((r) => r.startsWith("src/app/") && !handlers.includes(r));
const publicComponents = publics.filter((r) => r.startsWith("src/components/"));
const publicsInComplement = publics.filter((r) => coveredBefore(r).length === 0);
console.log(`  PUBLIC POPULATION · ${publics.length} files · ${playerRoutes.length} player routes · ${handlers.length} route handlers · ${publicComponents.length} shared components`);
console.log(`  of which inside NO prior house-word population: ${publicsInComplement.length}`);

const srcFile = (rel: string, code: string) =>
  ts.createSourceFile(rel, code, ts.ScriptTarget.Latest, true, rel.endsWith(".tsx") || rel.endsWith(".jsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
const isSpecifierNode = (n: ts.Node): boolean => {
  const p = n.parent;
  if (!p) return false;
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isImportTypeNode(p) || ts.isModuleDeclaration(p) || ts.isExternalModuleReference(p)) return true;
  return ts.isCallExpression(p) && p.expression.kind === ts.SyntaxKind.ImportKeyword;
};
/** Every printable text with the position it sits at, so a claim about WHERE a word lives can be asserted. */
function printedNodes(rel: string, code: string): Array<{ text: string; start: number }> {
  const sf = srcFile(rel, code);
  const out: Array<{ text: string; start: number }> = [];
  const walk = (n: ts.Node) => {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !isSpecifierNode(n)) out.push({ text: n.text, start: n.getStart(sf) });
    if (ts.isTemplateExpression(n)) {
      out.push({ text: n.head.text, start: n.head.getStart(sf) });
      for (const s of n.templateSpans) out.push({ text: s.literal.text, start: s.literal.getStart(sf) });
    }
    if (n.kind === ts.SyntaxKind.JsxText) {
      const t = (n as ts.JsxText).text.replace(/\s+/g, " ").trim();
      if (t) out.push({ text: t, start: n.getStart(sf) });
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}
/** ⛔ THE WHOLE VOCABULARY, NOT ONE FAMILY: words, identifiers, bounded ids AND the `house<Capital>` shape. */
const houseShaped = (text: string): string[] => [...new Set([...houseHitsByFamily(text).map((h) => h.word), ...houseCamelHits(text)])];
const textHits = (rel: string, code: string): string[] => [...new Set(printedNodes(rel, code).flatMap((n) => houseShaped(n.text)))];

/**
 * ⛔ THE TWO PUBLIC FILES THAT MAY CARRY A HOUSE-SHAPED STRING, BY EXACT STRING, EACH HELD TO ITS OWN CLAIM BELOW.
 * SHRINK-ONLY like every register in this suite. Neither entry is "it is fine": each is a sentence that `4.words.3`
 * and `4.words.4` turn into an assertion, because an authority claim with no assertion behind it is the shape this
 * programme keeps finding.
 *   · `/api/health` — C5-SPEC ruling 171: this endpoint is PUBLIC and its BODY names none of it. The feature's name
 *     reaches the SERVER LOG on the not-ready branch and nothing else. `4.words.3` asserts exactly that.
 *   · `/markets/[id]` — owner ruling D19c, ruling 146: `objectionEligibility` answers the server's own reason
 *     `HOUSE_STAKE_ONLY`, and the page maps it to the neutral `NOT_ELIGIBLE` before the panel ever sees it. The
 *     reason stays on the server; `4.words.4` asserts that the branch it selects is literal and neutral.
 */
const PUBLIC_TEXT_REGISTER: Readonly<Record<string, readonly string[]>> = {
  "src/app/api/health/route.ts": ["house-bot"],
  "src/app/markets/[id]/page.tsx": ["HOUSE_STAKE_ONLY"],
};
const publicTextProblems = (files: Array<{ rel: string; code: string }>): string[] =>
  files.flatMap(({ rel, code }) => {
    return uncovered(rel, textHits(rel, code), PUBLIC_TEXT_REGISTER);
  });

const HEALTH = "src/app/api/health/route.ts";
const MARKET_PAGE = "src/app/markets/[id]/page.tsx";
const POSITIONS = "src/app/positions/page.tsx";
const PANEL = "src/components/markets/resolution-panel.tsx";
ok("4.pop.1 · the PUBLIC population is derived from disk the same way §1's is — everything under src/app/ and src/components/ that is not an admin folder, not the console section and not one of the feature's own homes — ≥ 400 files, with 0.198.3's WHOLE population (both named player surfaces) inside it, beside /positions and the public health endpoint, and not one admin or console file",
  publics.length >= 400 && handlers.length >= 40 && playerRoutes.length >= 100
    && [MARKET_PAGE, PANEL, POSITIONS, HEALTH].every((f) => publics.includes(f))
    && publics.every((f) => !isAdminFile(f) && !inConsole(f) && !isHome(f))
    && publics.every((f) => !surfaces.includes(f)),
  `public ${publics.length} · player routes ${playerRoutes.length} · handlers ${handlers.length} · components ${publicComponents.length}`);

ok("4.pop.2 · ⛔ AND IT IS THE COMPLEMENT §0 PRINTS: ≥ 200 of those files were inside NO house-word population before this section — the public health endpoint and /positions among them, both SERVER modules the client-graph walk cannot reach by construction — while the two files 0.198.3 does read are reported as covered, so this is a measure and not an empty predicate",
  publicsInComplement.length >= 200 && [HEALTH, POSITIONS].every((f) => publicsInComplement.includes(f))
    && coveredBefore(MARKET_PAGE).length >= 1 && coveredBefore(PANEL).length >= 1,
  j({ publics: publics.length, unscanned: publicsInComplement.length, health: coveredBefore(HEALTH), marketPage: coveredBefore(MARKET_PAGE) }));

const publicFiles = publics.map((rel) => ({ rel, code: read(rel) }));
const livePublic = publicTextProblems(publicFiles);
ok("4.words.1 · ⛔ D19 · not one PUBLIC file prints a house-shaped string — every string literal, template part and JSX text of every player route, route handler and shared component, read from disk, against all three vocabulary families AND the `house<Capital>` shape — outside the two registered strings, each held to its own claim below",
  livePublic.length === 0, j({ population: publics.length, problems: livePublic }));

const stalePublic = Object.entries(PUBLIC_TEXT_REGISTER).flatMap(([rel, words]) => {
  if (!publics.includes(rel)) return [`${rel}: no longer in the public population`];
  const printed = textHits(rel, read(rel));
  return words.filter((w) => !printed.some((h) => w.includes(h))).map((w) => `${rel}: "${w}" is registered but no longer printed`);
});
ok("4.words.2 · the public register may only SHRINK: every registered string is still printed by the file it was registered for, so neither exemption can outlive the code it was written for",
  stalePublic.length === 0, j({ register: PUBLIC_TEXT_REGISTER, stale: stalePublic }));

/* ── 4.words.3 · the health exemption held to ruling 171: the LOG, never the BODY ────────────────────────────── */
const calleeOf = (n: ts.CallExpression | ts.NewExpression): string => {
  const e = n.expression;
  if (ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression)) return `${e.expression.text}.${e.name.text}`;
  if (ts.isIdentifier(e)) return e.text;
  return "";
};
/** The source ranges of every ARGUMENT of a call whose callee matches — the only way to say "inside a log call". */
function argRanges(rel: string, code: string, want: (callee: string) => boolean): Array<[number, number]> {
  const sf = srcFile(rel, code);
  const out: Array<[number, number]> = [];
  const walk = (n: ts.Node) => {
    if ((ts.isCallExpression(n) || ts.isNewExpression(n)) && want(calleeOf(n))) {
      for (const a of (ts.isCallExpression(n) ? n.arguments : n.arguments ?? [])) out.push([a.getStart(sf), a.getEnd()]);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}
const IS_LOG = (c: string) => c.startsWith("console.");
const IS_RESPONSE = (c: string) => ["NextResponse.json", "Response.json", "NextResponse.redirect", "NextResponse.rewrite", "Response", "NextResponse"].includes(c);
const inRanges = (p: number, rs: Array<[number, number]>) => rs.some(([a, b]) => p >= a && p < b);
/** Where each house-shaped printed string of a file sits: inside a log call, inside a response, or neither. */
function placedHits(rel: string, code: string): { log: string[]; response: string[]; loose: string[] } {
  const logs = argRanges(rel, code, IS_LOG), resp = argRanges(rel, code, IS_RESPONSE);
  const out = { log: [] as string[], response: [] as string[], loose: [] as string[] };
  for (const n of printedNodes(rel, code)) {
    for (const h of houseShaped(n.text)) {
      if (inRanges(n.start, resp)) out.response.push(h);
      else if (inRanges(n.start, logs)) out.log.push(h);
      else out.loose.push(h);
    }
  }
  return out;
}
const healthCode = read(HEALTH);
const healthPlaced = placedHits(HEALTH, healthCode);
ok("4.words.3 · ⛔ THE HEALTH EXEMPTION IS HELD TO ITS CLAIM (C5-SPEC ruling 171) · every house-shaped string /api/health prints sits inside a `console.*` argument — the operator's log — and NONE sits inside any response this public endpoint returns: not `NextResponse.json`, not a `new NextResponse` header bag, not a redirect",
  healthPlaced.log.length >= 1 && healthPlaced.response.length === 0 && healthPlaced.loose.length === 0
    && argRanges(HEALTH, healthCode, IS_RESPONSE).length >= 4,
  j({ ...healthPlaced, responseArgs: argRanges(HEALTH, healthCode, IS_RESPONSE).length }));

/* ── 4.words.4 · the market-page exemption held to ruling 146: a comparison, and a NEUTRAL branch ────────────── */
function subtreeHouseTexts(sf: ts.SourceFile, node: ts.Node): string[] {
  const out: string[] = [];
  const walk = (n: ts.Node) => {
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(...houseShaped(n.text));
    if (ts.isTemplateExpression(n)) { out.push(...houseShaped(n.head.text)); for (const s of n.templateSpans) out.push(...houseShaped(s.literal.text)); }
    if (n.kind === ts.SyntaxKind.JsxText) out.push(...houseShaped((n as ts.JsxText).text));
    ts.forEachChild(n, walk);
  };
  walk(node);
  return [...new Set(out)];
}
/**
 * ⛔ WHY "LITERAL-ONLY" AND NOT JUST "NO HOUSE WORD". `{ state: elig.why }` carries no house-shaped TEXT at all, and
 * it is the exact mutation ruling 146 exists to forbid: the server's own reason handed to a client component as a
 * prop. A register, and a word scan, are both blind to it. So the branch the house reason selects must be built from
 * LITERALS — no property access, no call, no identifier standing in for a value.
 */
function dynamicParts(sf: ts.SourceFile, node: ts.Node): string[] {
  const out: string[] = [];
  const walk = (n: ts.Node) => {
    const isPropName = !!n.parent && ts.isPropertyAssignment(n.parent) && n.parent.name === n;
    if (ts.isPropertyAccessExpression(n) || ts.isElementAccessExpression(n) || ts.isCallExpression(n)
      || ts.isShorthandPropertyAssignment(n) || ts.isSpreadAssignment(n) || (ts.isIdentifier(n) && !isPropName)) {
      out.push(n.getText(sf).slice(0, 60));
      return;
    }
    ts.forEachChild(n, walk);
  };
  walk(node);
  return [...new Set(out)];
}
function neutralityProblems(rel: string, code: string): string[] {
  const sf = srcFile(rel, code);
  const out: string[] = [];
  const walk = (n: ts.Node) => {
    if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && !isSpecifierNode(n) && houseShaped(n.text).length) {
      const p = n.parent;
      const isEquality = ts.isBinaryExpression(p)
        && (p.operatorToken.kind === ts.SyntaxKind.EqualsEqualsEqualsToken || p.operatorToken.kind === ts.SyntaxKind.ExclamationEqualsEqualsToken);
      if (!isEquality) { out.push(`${rel}: "${n.text}" is printable, not a comparison operand`); }
      else {
        const c = p.parent;
        if (!ts.isConditionalExpression(c) || c.condition !== p) out.push(`${rel}: "${n.text}" compares, but selects no branch this pin can read`);
        else {
          const words = subtreeHouseTexts(sf, c.whenTrue);
          const dyn = dynamicParts(sf, c.whenTrue);
          if (words.length) out.push(`${rel}: the branch "${n.text}" selects yields house-shaped text ${j(words)}`);
          if (dyn.length) out.push(`${rel}: the branch "${n.text}" selects is not literal-only — ${j(dyn)}`);
        }
      }
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return out;
}
const marketCode = read(MARKET_PAGE);
/**
 * ⛔ AND IT COUNTS THE SOURCE LITERALS, NOT THE HITS (C5-8, §2J). This used to assert `textHits(...).length === 1`,
 * which was a claim about the PATTERN as much as about the page: the join made one unchanged literal yield TWO hits
 * (`HOUSE_STAKE` from the words family, `HOUSE_STAKE_ONLY` from the identifiers) and the assertion went red over a
 * string nobody had touched. Counting the PRINTED NODES that carry a house shape says what was always meant — the
 * market page has ONE house-shaped string and this is it — and it is strictly stronger, because it cannot be
 * satisfied by a second literal that happens to match the same number of times.
 */
const marketHouseNodes = printedNodes(MARKET_PAGE, marketCode).filter((n) => houseShaped(n.text).length > 0);
ok("4.words.4 · ⛔ THE MARKET-PAGE EXEMPTION IS HELD TO ITS CLAIM (owner ruling D19c, ruling 146) · the public market page prints EXACTLY ONE house-shaped string — one printed node in the whole file, and it is the reason `HOUSE_STAKE_ONLY` itself — that string is the operand of an `===`, and the branch that comparison selects is built from LITERALS and names nothing. So `objectionEligibility`'s server-side reason is mapped to a neutral state and never handed to the panel, whether as a word or as a value",
  neutralityProblems(MARKET_PAGE, marketCode).length === 0
    && marketHouseNodes.length === 1 && marketHouseNodes[0].text === "HOUSE_STAKE_ONLY"
    && textHits(MARKET_PAGE, marketCode).every((w) => "HOUSE_STAKE_ONLY".includes(w)),
  j({ problems: neutralityProblems(MARKET_PAGE, marketCode), nodes: marketHouseNodes.map((n) => n.text), hits: textHits(MARKET_PAGE, marketCode) }));

/* ── 4.body.1 · what a PUBLIC route handler actually returns ─────────────────────────────────────────────────── */
/**
 * ⛔ THE RESPONSE BODIES, WHICH ARE THE HALF A WORD SCAN CANNOT REACH. A handler's danger is not the prose in its
 * file — it is the JSON it hands a visitor. This reads every argument of every `NextResponse.json` / `Response.json`
 * / `new Response` / `new NextResponse` in the population and takes the house shapes out of its STRINGS, its
 * PROPERTY NAMES and its IDENTIFIERS, because a body leaks by key as readily as by value.
 * ⚠️ AND ITS LIMIT, STATED: a body assembled into a variable and passed by name is read as that NAME, not as its
 * contents. This sees the literal shape of a response, which is how 169 of the 169 response sites here are written;
 * what it cannot see is a payload built elsewhere, and `test:house-bot-disclosure`'s served probes own that half.
 */
function responseHits(rel: string, code: string): string[] {
  const sf = srcFile(rel, code);
  const out: string[] = [];
  const collect = (node: ts.Node) => {
    const walk = (n: ts.Node) => {
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) out.push(...houseShaped(n.text));
      if (ts.isTemplateExpression(n)) { out.push(...houseShaped(n.head.text)); for (const s of n.templateSpans) out.push(...houseShaped(s.literal.text)); }
      if (ts.isPropertyAssignment(n) && ts.isIdentifier(n.name)) out.push(...houseShaped(n.name.text));
      if (ts.isShorthandPropertyAssignment(n)) out.push(...houseShaped(n.name.text));
      if (ts.isPropertyAccessExpression(n)) out.push(...houseShaped(n.name.text));
      if (ts.isIdentifier(n)) out.push(...houseShaped(n.text));
      ts.forEachChild(n, walk);
    };
    walk(node);
  };
  const walk = (n: ts.Node) => {
    if ((ts.isCallExpression(n) || ts.isNewExpression(n)) && IS_RESPONSE(calleeOf(n))) {
      for (const a of (ts.isCallExpression(n) ? n.arguments : n.arguments ?? [])) collect(a);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return [...new Set(out)];
}
/**
 * ⛔ THE ONE REGISTERED BODY, AND IT IS THE PLATFORM'S OWN HOUSE ACCOUNT, NOT THIS FEATURE. `/api/dev-test/stress-money`
 * reports money conservation and names the house account's balance either side of the run (`const houseBefore = 0`).
 * It is dev-only and `5.ids.4` asserts the production door it sits behind.
 */
const PUBLIC_BODY_REGISTER: Readonly<Record<string, readonly string[]>> = {
  "src/app/api/dev-test/stress-money/route.ts": ["houseBefore", "houseAfter"],
};
const bodyProblems = (files: Array<{ rel: string; code: string }>): string[] =>
  files.flatMap(({ rel, code }) => {
    const allowed = PUBLIC_BODY_REGISTER[rel] ?? [];
    return responseHits(rel, code).filter((h) => !allowed.includes(h)).map((h) => `${rel}: ${h}`);
  });
const handlerFiles = handlers.map((rel) => ({ rel, code: read(rel) }));
const responseSites = handlerFiles.reduce((s, f) => s + argRanges(f.rel, f.code, IS_RESPONSE).length, 0);
const liveBodies = bodyProblems(handlerFiles);
ok("4.body.1 · ⛔ D19 · not one PUBLIC route handler returns a house shape: every argument of every NextResponse.json / Response.json / new Response / new NextResponse in the population is read — strings, template parts, property names and identifiers alike — and none carries a house word, a house identifier, a bounded house id or a `house<Capital>` name outside the one dev-only registered pair",
  liveBodies.length === 0 && responseSites >= 100 && handlerFiles.length >= 40,
  j({ handlers: handlerFiles.length, responseArguments: responseSites, problems: liveBodies }));

const staleBody = Object.entries(PUBLIC_BODY_REGISTER).flatMap(([rel, names]) => {
  if (!handlers.includes(rel)) return [`${rel}: no longer a public route handler`];
  const present = responseHits(rel, read(rel));
  return names.filter((n) => !present.includes(n)).map((n) => `${rel}: ${n} is registered but no longer returned`);
});
ok("4.body.2 · the body register may only SHRINK: every registered name is still returned by the handler it was registered for",
  staleBody.length === 0, j({ register: PUBLIC_BODY_REGISTER, stale: staleBody }));

/* ── the controls · every plant goes into a REAL public file's text, read from disk ──────────────────────────── */
const addedP = (planted: string[]) => planted.filter((p) => !livePublic.includes(p));
const withPublic = (rel: string, code: string) => publicFiles.map((f) => (f.rel === rel ? { rel, code } : f));
const HELP = "src/app/help/page.tsx";
const helpCode = read(HELP);
const HELP_ANCHOR = "export default async function HelpPage() {";

const jsxOnPlayer = addedP(publicTextProblems(withPublic(HELP, plant(helpCode, HELP_ANCHOR, `export const PlantedLine = () => <p>House stake: TZS 1,000</p>;\n${HELP_ANCHOR}`))));
ok("4.c1 · CONTROL · a house line planted as JSX TEXT on a REAL player page is reported — element content, not an attribute, which is the node `ts.isStringLiteral` does not match and which ruling 453's own lexicon once missed seventeen of",
  jsxOnPlayer.length === 1 && jsxOnPlayer[0].includes("House stake"), j(jsxOnPlayer));

const localeOnPlayer = addedP(publicTextProblems(withPublic(HELP, plant(helpCode, HELP_ANCHOR, `export const PlantedSw = () => <p>boti za nyumba</p>;\nexport const PlantedZh = () => <p>平台机器人</p>;\n${HELP_ANCHOR}`))));
ok("4.c2 · CONTROL · the Swahili and Chinese words planted on a REAL player page are found as written — the locale a Tanzanian player actually reads is the one a scan that mangles non-ASCII would miss",
  localeOnPlayer.length === 2 && localeOnPlayer.some((p) => p.includes("boti za nyumba")) && localeOnPlayer.some((p) => p.includes("平台机器人")), j(localeOnPlayer));

const commentOnPlayer = addedP(publicTextProblems(withPublic(HELP, plant(helpCode, HELP_ANCHOR, `// a house bot with liquidity places a house stake chosen by staff\n${HELP_ANCHOR}`))));
const specOnPlayer = addedP(publicTextProblems(withPublic(HELP, plant(helpCode, HELP_ANCHOR, `export type { HouseBotStatus } from "@/lib/house-bot/constants";\n${HELP_ANCHOR}`))));
ok("4.c3 · CONTROL · five house words in a COMMENT on a real player page are NOT reported, and neither is a module specifier naming the feature's own directory — this section's claim is about what a page PAINTS, and one guard on this branch was red for weeks because a script name sat inside backticks in a docblock",
  commentOnPlayer.length === 0 && specOnPlayer.length === 0, j({ comment: commentOnPlayer, specifier: specOnPlayer }));

const benignOnPlayer = publicTextProblems([{ rel: HELP, code: plant(helpCode, HELP_ANCHOR, `export const Benign = () => <p>${HOUSE_BENIGN_SAMPLES.join(" · ")}</p>;\n${HELP_ANCHOR}`) }]);
ok("4.c4 · CONTROL · THE ACCEPT SIDE · a real player page is clean as it stands and STAYS clean with every benign look-alike planted into it — HOUSE_FEE, the /admin/house path, \"House edge\", a raw hb_ nonce, an over-long id and \"including household costs\". A guard that reddens the platform's own vocabulary is a guard the next session switches off",
  textHits(HELP, helpCode).length === 0 && benignOnPlayer.length === 0, j({ live: textHits(HELP, helpCode), benign: benignOnPlayer }));

const publicSamples = [...HOUSE_WORD_SAMPLES, ...HOUSE_IDENTIFIER_SAMPLES, ...HOUSE_ID_SAMPLES, ...HOUSE_CAMEL_SAMPLES];
const publicSweep = publicSamples.map((s) => ({ s, found: publicTextProblems([{ rel: HELP, code: plant(helpCode, HELP_ANCHOR, `export const PLANTED = ${j(s)};\n${HELP_ANCHOR}`) }]).length }));
ok("4.c5 · CONTROL · the refuse side is DERIVED from the vocabulary, not maintained beside it: EVERY shared sample of all three families AND of the shape family — planted one at a time as a real string on a real player page — is reported, so a sample deleted from the module cannot make this sweep pass over a shorter list",
  publicSweep.length >= 39 && publicSweep.every((x) => x.found >= 1), j(publicSweep.filter((x) => x.found === 0)));

const healthBodyPlant = placedHits(HEALTH, plant(healthCode, "        ok: ready,", "        ok: ready,\n        houseBotSchema: \"house bot schema ready\",")).response;
ok("4.c6 · CONTROL · THE HEALTH CLAIM, BOTH WAYS · a house word planted into the REAL public body of /api/health is reported as sitting INSIDE a response, ADDING to whatever that file's live reading is — while the word the live file already prints, in its `console.error`, is reported as a log. The register alone cannot tell those two apart, which is the whole reason 4.words.3 exists",
  healthBodyPlant.length > healthPlaced.response.length && healthPlaced.log.length >= 1,
  j({ planted: healthBodyPlant, live: healthPlaced }));

const RULING_146 = "elig.why === \"HOUSE_STAKE_ONLY\" ? { state: \"NOT_ELIGIBLE\" }";
const leakWord = neutralityProblems(MARKET_PAGE, plant(marketCode, RULING_146, "elig.why === \"HOUSE_STAKE_ONLY\" ? { state: \"HOUSE_STAKE_ONLY\" }"));
const leakValue = neutralityProblems(MARKET_PAGE, plant(marketCode, RULING_146, "elig.why === \"HOUSE_STAKE_ONLY\" ? { state: elig.why }"));
ok("4.c7 · CONTROL · RULING 146 REBUILT, IN BOTH SHAPES · on the REAL market page, forwarding the server's reason as a STRING is reported, and forwarding it as a VALUE — `{ state: elig.why }`, which carries no house-shaped text at all and which a word scan and a register are both blind to — is reported too",
  leakWord.some((p) => p.includes("house-shaped text")) && leakValue.some((p) => p.includes("not literal-only")) && houseShaped("{ state: elig.why }").length === 0,
  j({ leakWord, leakValue }));

const bodyPlant = bodyProblems(withPublic(HEALTH, plant(healthCode, "        ok: ready,", "        ok: ready,\n        houseBotId: null,")).filter((f) => handlers.includes(f.rel)));
ok("4.c8 · CONTROL · the body sweep is LIVE over real handlers · a `houseBotId` key planted into the REAL health response is reported, and the sweep it is reported by visited ≥ 100 response arguments across ≥ 40 handlers of the live tree — a sweep over zero passes",
  bodyPlant.some((p) => p.includes("houseBotId") && p.includes(HEALTH)) && responseSites >= 100,
  j({ planted: bodyPlant.filter((p) => p.includes(HEALTH)), responseArguments: responseSites }));

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §5 · THE SHAPE FAMILY IN PUBLIC CODE, AND THE CROSSING INTO THE BROWSER
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§5 · ⛔ D19 · the SHAPE family in public code, and the one crossing that puts it in a browser");

/**
 * ⛔ THE EIGHT PUBLIC FILES THAT NAME A `house<Capital>` IDENTIFIER, BY EXACT NAME, EACH WITH THE CLAIM THAT MAKES IT
 * LAWFUL AND THE ASSERTION THAT HOLDS IT. SHRINK-ONLY.
 *   · `/markets/[id]` and `/positions` read `houseBotId` off a position and hand it to `cashOutValue` — C4 ruling 145,
 *     the price a holder is quoted. Both are SERVER components; `5.ids.5` asserts the client graph never reaches them
 *     and `5.ids.3` asserts the name never crosses into a prop.
 *   · `/api/health` names the schema probe it awaits — `4.words.3` asserts the answer never reaches the body.
 *   · the five `dev-test` routes are dev-only; `5.ids.4` asserts the production door each sits behind.
 */
const PUBLIC_IDENTIFIER_REGISTER: Readonly<Record<string, readonly string[]>> = {
  "src/app/api/dev-test/affiliate-e2e/route.ts": ["houseBotId"],
  "src/app/api/dev-test/affiliate-security/route.ts": ["houseBotId"],
  "src/app/api/dev-test/affiliate-seed-recruits/route.ts": ["houseBotId"],
  "src/app/api/dev-test/affiliate-stress/route.ts": ["houseBotId"],
  "src/app/api/dev-test/stress-money/route.ts": ["houseBefore", "houseAfter"],
  "src/app/api/health/route.ts": ["houseBotSchemaReady", "houseSchema"],
  "src/app/markets/[id]/page.tsx": ["houseBotId"],
  "src/app/positions/page.tsx": ["houseBotId"],
};
const publicIdProblems = (files: Array<{ rel: string; code: string }>): string[] =>
  files.flatMap(({ rel, code }) => {
    const allowed = PUBLIC_IDENTIFIER_REGISTER[rel] ?? [];
    return [...new Set(houseCamelHits(decomment(code)))].filter((n) => !allowed.includes(n)).map((n) => `${rel}: ${n}`);
  });
const livePublicIds = publicIdProblems(publicFiles);
ok("5.ids.1 · ⛔ D19 · not one PUBLIC file names a `house<Capital>` identifier outside the eight registered files — the SHAPE is what is matched, so a name nobody thought to list is still seen, and `houseBetCount` on a player route would be caught by the pattern that could not see it on an admin one",
  livePublicIds.length === 0, j({ population: publics.length, problems: livePublicIds }));

const stalePublicIds = Object.entries(PUBLIC_IDENTIFIER_REGISTER).flatMap(([rel, names]) => {
  if (!publics.includes(rel)) return [`${rel}: no longer in the public population`];
  const present = new Set(houseCamelHits(decomment(read(rel))));
  return names.filter((n) => !present.has(n)).map((n) => `${rel}: ${n} is registered but no longer used`);
});
ok("5.ids.2 · the public identifier register may only SHRINK: every registered name is still used by the file it was registered for",
  stalePublicIds.length === 0, j({ files: Object.keys(PUBLIC_IDENTIFIER_REGISTER).length, stale: stalePublicIds }));

/**
 * ⛔ THE CROSSING, AND IT TAKES NO REGISTER AT ALL. A server component leaks by handing a value to a client one: the
 * prop is the wire. Every JSX attribute in the public population is read — the attribute NAME and everything inside
 * its expression — and not one house shape may appear there. `<Sell houseBotId={p.houseBotId} />` is the whole
 * mutation, and neither the word scan nor the register above can see it.
 */
function jsxAttributeHits(rel: string, code: string): string[] {
  const sf = srcFile(rel, code);
  const out: string[] = [];
  const walk = (n: ts.Node) => {
    if (ts.isJsxAttributes(n)) {
      const inner = (x: ts.Node) => {
        if (ts.isIdentifier(x)) out.push(...houseCamelHits(x.text));
        if (ts.isStringLiteral(x) || ts.isNoSubstitutionTemplateLiteral(x)) out.push(...houseCamelHits(x.text));
        if (ts.isPropertyAccessExpression(x)) out.push(...houseCamelHits(x.name.text));
        ts.forEachChild(x, inner);
      };
      inner(n);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return [...new Set(out)];
}
const tsxPublics = publicFiles.filter((f) => f.rel.endsWith(".tsx"));
const attrSites = tsxPublics.reduce((s, f) => {
  let n = 0;
  const sf = srcFile(f.rel, f.code);
  const walk = (x: ts.Node) => { if (ts.isJsxAttributes(x)) n++; ts.forEachChild(x, walk); };
  walk(sf);
  return s + n;
}, 0);
const attrProblems = tsxPublics.flatMap((f) => jsxAttributeHits(f.rel, f.code).map((h) => `${f.rel}: ${h}`));
ok("5.ids.3 · ⛔ THE CROSSING · not one house-shaped name appears inside a JSX ATTRIBUTE anywhere in the public population — not as a prop name, not inside a prop's expression. NO REGISTER AND NO EXEMPTION: a prop is how a server component hands a value to a browser, and `/markets/[id]` and `/positions` both read `houseBotId` a few lines above JSX they render",
  attrProblems.length === 0 && attrSites >= 5_000 && tsxPublics.length >= 200,
  j({ tsxFiles: tsxPublics.length, attributeSites: attrSites, problems: attrProblems }));

/** The production door each dev-only route sits behind, asserted as the FIRST statement of every handler it exports. */
const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"];
function doorProblems(rel: string, code: string): string[] {
  const sf = srcFile(rel, code);
  const out: string[] = [];
  let found = 0;
  const walk = (n: ts.Node) => {
    if (ts.isFunctionDeclaration(n) && n.name && HTTP_METHODS.includes(n.name.text)
      && (ts.getModifiers(n) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) {
      found++;
      const first = n.body?.statements[0];
      const text = first ? first.getText(sf).replace(/\s+/g, " ") : "";
      const doored = !!first && ts.isIfStatement(first)
        && /process\.env\.NODE_ENV === "production"/.test(first.expression.getText(sf).replace(/\s+/g, " "))
        && /return /.test(text);
      if (!doored) out.push(`${rel}: ${n.name.text} does not refuse in production as its first statement — ${text.slice(0, 90)}`);
    }
    ts.forEachChild(n, walk);
  };
  walk(sf);
  if (found === 0) out.push(`${rel}: exports no HTTP handler this pin can read`);
  return out;
}
const devEntries = Object.keys(PUBLIC_IDENTIFIER_REGISTER).filter((r) => r.startsWith("src/app/api/dev-test/"));
const doorFindings = devEntries.flatMap((rel) => doorProblems(rel, read(rel)));
ok("5.ids.4 · ⛔ THE DEV-TEST EXEMPTIONS ARE HELD TO THEIR DOOR · every HTTP handler each registered dev-test route exports refuses in production as its FIRST statement — `if (process.env.NODE_ENV === \"production\") return …` — so the house-shaped code below it is unreachable on the live platform, which is the entire claim those five register entries rest on",
  devEntries.length === 5 && doorFindings.length === 0, j({ routes: devEntries.length, problems: doorFindings }));

ok("5.ids.5 · the two player pages that read `houseBotId` are SERVER modules: neither declares \"use client\", and §0's own client-graph walk — the walk `test:house-bot-disclosure` §1 reaches its verdict through — does not reach either of them, while it DOES reach the resolution panel beside them, so this is a measurement and not a dead reach test",
  !isDirective(read(MARKET_PAGE), "use client") && !isDirective(read(POSITIONS), "use client")
    && !graph.reached.has(MARKET_PAGE) && !graph.reached.has(POSITIONS) && graph.reached.has(PANEL),
  j({ marketPage: graph.reached.has(MARKET_PAGE), positions: graph.reached.has(POSITIONS), panel: graph.reached.has(PANEL) }));

/* ── the controls ────────────────────────────────────────────────────────────────────────────────────────────── */
const positionsCode = read(POSITIONS);
const POSITIONS_ANCHOR = "export default async function PositionsPage(";
const propPlantCode = plant(positionsCode, POSITIONS_ANCHOR, `export const PlantedRow = (p: { houseBotId: string | null }) => <Sell houseBotId={p.houseBotId} />;\n${POSITIONS_ANCHOR}`);
const propPlant = jsxAttributeHits(POSITIONS, propPlantCode);
/**
 * ⛔ AND THE SECOND PLANT IS THE ONE THAT MATTERS, because the first would have been caught anyway: `houseBotId` is
 * one of the four camelCase names `HOUSE_IDENTIFIER_SOURCE` lists by hand, so `houseHits` sees it. `houseBetCount` is
 * one of the sixty-nine it cannot — the name the C5-s4 register plants (S4-M56) — and it crosses into a browser
 * through a prop exactly as easily. A control that only planted the name the old pattern already matched would have
 * proved nothing about this section.
 */
const blindPlantCode = plant(positionsCode, POSITIONS_ANCHOR, `export const PlantedCount = (p: { houseBetCount: number }) => <Sell houseBetCount={p.houseBetCount} />;\n${POSITIONS_ANCHOR}`);
const blindPlant = jsxAttributeHits(POSITIONS, blindPlantCode);
ok("5.c1 · CONTROL · THE CROSSING ITSELF, AND THE POINT OF THE SECTION · on the REAL /positions page — which already reads a house name four lines from its own JSX — `houseBotId` planted as a JSX PROP is reported, and so is `houseBetCount`, which `houseHits` (the instrument every other absence guard reaches its verdict through) cannot see at all: the planted text carries exactly as many houseHits as the live file",
  propPlant.includes("houseBotId") && blindPlant.includes("houseBetCount")
    && houseHits(blindPlantCode).length === houseHits(positionsCode).length && houseHits("houseBetCount").length === 0,
  j({ reported: propPlant, blindReported: blindPlant, houseHitsDelta: houseHits(blindPlantCode).length - houseHits(positionsCode).length }));

const addedI = (planted: string[]) => planted.filter((p) => !livePublicIds.includes(p));
const idCommentPublic = addedI(publicIdProblems(withPublic(HELP, plant(helpCode, HELP_ANCHOR, `// houseBetCount and houseStakedTzs were struck by owner ruling D20\n${HELP_ANCHOR}`))));
const idStringPublic = addedI(publicIdProblems(withPublic(HELP, plant(helpCode, HELP_ANCHOR, `export const plantedKey = { "houseBetCount": 0 };\n${HELP_ANCHOR}`))));
ok("5.c2 · CONTROL · the two struck names written in a COMMENT on a real player page are NOT reported, and the same name written as a STRING KEY is — a serialised payload key is spelt as a string and is the same disclosure as a property name",
  idCommentPublic.length === 0 && idStringPublic.some((p) => p.includes("houseBetCount")), j({ comment: idCommentPublic, string: idStringPublic }));

const benignPublicIds = publicIdProblems([{ rel: HELP, code: plant(helpCode, HELP_ANCHOR, `const benign = ${j(HOUSE_CAMEL_BENIGN_SAMPLES)};\nvoid benign;\n${HELP_ANCHOR}`) }]);
const publicCamelSweep = HOUSE_CAMEL_SAMPLES.map((s) => ({ s, found: publicIdProblems([{ rel: HELP, code: plant(helpCode, HELP_ANCHOR, `const planted = { ${s}: 0 };\nvoid planted;\n${HELP_ANCHOR}`) }]).length }));
ok("5.c3 · CONTROL · BOTH SIDES OF THE SHAPE, ON A REAL PLAYER PAGE · every shape sample planted one at a time is reported, and every benign look-alike planted together is not — `household`, `HouseBot` (a capital H), `house_bot` (a separator), `warehouseBin` (no word boundary) and the bare word `house`",
  publicCamelSweep.every((x) => x.found >= 1) && publicCamelSweep.length >= 7 && benignPublicIds.length === 0,
  j({ missed: publicCamelSweep.filter((x) => x.found === 0), benign: benignPublicIds }));

const blindPublicIds = publicFiles.flatMap(({ rel, code }) => [...new Set(houseCamelHits(decomment(code)))].map((n) => `${rel}: ${n}`));
/**
 * ⛔ IT MEASURES THE REGISTER, NOT THE TREE. An earlier shape asserted the blinded sweep reported EXACTLY eight files,
 * and driving a new offending player page onto disk turned this control red for a defect it had not planted — which
 * reads as a broken control beside a real finding. What it must prove is that every registered entry is a name the
 * sweep really finds, so `5.ids.1`'s zero is the register's work and not a dead predicate.
 */
ok("5.c4 · CONTROL · THE SWEEP IS LIVE AND THE REGISTER IS DOING WORK · with the register ignored, the same sweep over the same real files reports EVERY ONE of the eight registered public files by name, ten names between them. On this branch a protection guard once swept in so much that all thirteen of its assertions passed HARDER while its feature was broken",
  Object.keys(PUBLIC_IDENTIFIER_REGISTER).every((f) => blindPublicIds.some((p) => p.startsWith(`${f}: `)))
    && blindPublicIds.length >= 10
    && [HEALTH, MARKET_PAGE, POSITIONS].every((f) => blindPublicIds.some((p) => p.startsWith(`${f}: `))),
  `${blindPublicIds.length} names across ${new Set(blindPublicIds.map((p) => p.split(": ")[0])).size} files with the register ignored`);

const DEV_DOOR = "if (process.env.NODE_ENV === \"production\") {";
const DEV_ROUTE = "src/app/api/dev-test/affiliate-e2e/route.ts";
const undoored = doorProblems(DEV_ROUTE, plant(read(DEV_ROUTE), DEV_DOOR, "if (false) {"));
const adminAttrs = surfaceFiles.filter((f) => f.rel.endsWith(".tsx")).flatMap((f) => jsxAttributeHits(f.rel, f.code).map((h) => `${f.rel}: ${h}`));
ok("5.c5 · CONTROL · BOTH PINS MEASURED AGAINST REAL CODE · removing the production door from the REAL dev-test route is reported by 5.ids.4, and the SAME attribute sweep that reports nothing across 8,000 public attribute sites reports the admin surfaces' own three house props — so 5.ids.3's zero is a measurement, not a scan that never fires",
  undoored.length === 1 && undoored[0].includes("POST") && adminAttrs.length >= 3,
  j({ undoored, adminAttrs }));

/* ════════════════════════════════════════════════════════════════════════════════════════════════════════════
 * §6 · THE PUBLIC ONE-HOP PAINTERS · L52's SHAPE ON THE SIDE OF THE TREE A PLAYER READS
 * ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
section("§6 · ⛔ L52 · the modules a PUBLIC route imports directly, and the words they can paint through it");

const publicPainters = [...new Set(publicFiles.flatMap(({ rel, code }) =>
  importSpecifiers(rel, code).map((s) => resolveFrom(rel, s)).filter((r): r is string => !!r)))]
  .filter((r) => !publics.includes(r) && !isHome(r) && !inConsole(r) && !isAdminFile(r)).sort();

/**
 * ⛔ ONE REGISTER, NOT TWO. Six of these modules are already §3's, and a second copy of a list is how two guards come
 * to disagree about the same file — the drift this feature's own vocabulary module was written to end. So the public
 * register IS §3's, plus the one module only a public route reaches: `lifecycle.ts`, whose word `6.hop.4` holds to
 * the server log. `6.hop.3` asserts the delta is exactly that one file.
 * ⚠️ WHAT THIS SECTION DELIBERATELY DOES NOT CLAIM: the identifier half. These are server modules and their house
 * NAMES are their trade (`market-service.ts` alone carries fourteen); the claim that matters for a player is the
 * CROSSING, and §5.ids.3 owns it with no register at all. A painter register for identifiers would be a hand list
 * of a hundred names, which is the weaker answer, and this says so rather than building it.
 */
const PUBLIC_PAINTER_ONLY = "src/lib/server/lifecycle.ts";
const PUBLIC_PAINTER_REGISTER: Readonly<Record<string, readonly string[]>> = {
  ...PAINTER_WORD_REGISTER,
  [PUBLIC_PAINTER_ONLY]: ["house-bot"],
};
const publicPainterProblems = (files: Array<{ rel: string; code: string }>): string[] =>
  files.flatMap(({ rel, code }) => {
    return uncovered(rel, wordsPrinted(rel, code), PUBLIC_PAINTER_REGISTER);
  });
const publicPainterFiles = publicPainters.map((rel) => ({ rel, code: read(rel) }));
const livePublicPainters = publicPainterProblems(publicPainterFiles);

ok("6.hop.1 · the public painter population is DERIVED from the public population's own imports — ≥ 150 modules, resolved through the @/ alias, relative paths and `import()` — and it holds the lifecycle ticker and the market service, neither of which is a feature home, a console file or an admin surface",
  publicPainters.length >= 150 && publicPainters.includes(PUBLIC_PAINTER_ONLY) && publicPainters.includes("src/lib/server/market-service.ts")
    && publicPainters.every((r) => !isHome(r) && !inConsole(r) && !isAdminFile(r) && !publics.includes(r)),
  `public painters ${publicPainters.length}`);

ok("6.hop.2 · ⛔ L52 ON THE PLAYER'S SIDE · not one module a public route or component imports prints a house word outside the register — so a NEW server module that paints the feature's name and is pulled into a player page goes red the day it is imported, which is the half L52 had nobody watching and the half that faces a player rather than an officer",
  livePublicPainters.length === 0, j({ population: publicPainters.length, problems: livePublicPainters }));

const stalePublicPainters = Object.entries(PUBLIC_PAINTER_REGISTER).flatMap(([rel, words]) => {
  if (!publicPainters.includes(rel) && !painters.includes(rel)) return [`${rel}: no longer a painter on either side`];
  const printed = wordsPrinted(rel, read(rel));
  return words.filter((w) => !printed.some((h) => w.includes(h))).map((w) => `${rel}: "${w}" is registered but no longer printed`);
});
const registerDelta = Object.keys(PUBLIC_PAINTER_REGISTER).filter((r) => !(r in PAINTER_WORD_REGISTER));
ok("6.hop.3 · the painter register is ONE list and it may only SHRINK: every registered word is still printed by its module, and the public register is §3's plus exactly one module — the lifecycle ticker, which no admin surface imports directly",
  stalePublicPainters.length === 0 && registerDelta.length === 1 && registerDelta[0] === PUBLIC_PAINTER_ONLY && !painters.includes(PUBLIC_PAINTER_ONLY),
  j({ stale: stalePublicPainters, delta: registerDelta }));

const lifecycleCode = read(PUBLIC_PAINTER_ONLY);
const lifecyclePlaced = placedHits(PUBLIC_PAINTER_ONLY, lifecycleCode);
ok("6.hop.4 · ⛔ THE ONE PUBLIC-ONLY PAINTER IS HELD TO ITS CLAIM · every house-shaped string the lifecycle ticker prints sits inside a `console.*` argument — the sweep it logs when it runs — and none of it sits in a value a caller could render. The `import()` of the feature's own holder hook is a specifier, not a painted word, and is excluded by construction",
  lifecyclePlaced.log.length >= 1 && lifecyclePlaced.loose.length === 0 && lifecyclePlaced.response.length === 0,
  j(lifecyclePlaced));

/**
 * ⛔ 6.hop.5 · THE ONE PAINTER THE JOIN ADDED, HELD TO RULING 146 AT ITS SOURCE RATHER THAN AT ITS SINK.
 * `4.words.4` proves the MARKET PAGE maps the server's reason to a neutral literal. That is a claim about ONE
 * READER, and it is a proof that the reason never reaches a player only if that reader is the ONLY one — a second
 * call site added next month would sit outside every assertion this suite makes, in a module that the word family
 * could not even read until §2J. So the callers are counted from the syntax tree rather than assumed.
 */
const OBJECTIONS = "src/lib/server/objections-service.ts";
const eligibilityCallers = srcAll.filter((rel) => {
  if (rel === OBJECTIONS) return false;
  const sf = srcFile(rel, decomment(read(rel)));
  let calls = false;
  const walk = (n: ts.Node) => {
    if (ts.isCallExpression(n) && n.expression.getText(sf) === "objectionEligibility") calls = true;
    ts.forEachChild(n, walk);
  };
  walk(sf);
  return calls;
});
ok("6.hop.5 · ⛔ RULING 146 HELD AT ITS SOURCE, NOT ONLY AT ITS SINK · the module that MINTS `HOUSE_STAKE_ONLY` is a one-hop painter on BOTH sides of the tree — §2J's join is what made it readable at all — and its reason has exactly ONE caller in all of `src/`: the market page, whose mapping `4.words.4` holds to a literal-only branch. A second reader would be a second place the server's own reason could escape, and this is the assertion that would see it",
  eligibilityCallers.length === 1 && eligibilityCallers[0] === MARKET_PAGE
    && painters.includes(OBJECTIONS) && publicPainters.includes(OBJECTIONS)
    && wordsPrinted(OBJECTIONS, read(OBJECTIONS)).length >= 1,
  j({ callers: eligibilityCallers, words: wordsPrinted(OBJECTIONS, read(OBJECTIONS)) }));

const registerC1 = uncovered("x.ts", ["HOUSE_STAKE", "house stake", "HOUSE_STAKE_LEAKED"], { "x.ts": ["HOUSE_STAKE_ONLY"] });
ok("1.reg.c1 · CONTROL · BOTH SIDES OF THE SUBSTRING ALLOWANCE · a register holding `HOUSE_STAKE_ONLY` covers the `HOUSE_STAKE` the join now also matches from that same literal, and covers NOTHING else: the differently-cased, differently-joined `house stake` is still reported, and so is a longer NEW string that merely contains the registered one. An allowance that could swallow a string nobody registered would be a widening, and this is the measurement that it cannot",
  registerC1.length === 2 && registerC1.some((p) => p.endsWith("house stake")) && registerC1.some((p) => p.endsWith("HOUSE_STAKE_LEAKED")),
  j(registerC1));

const addedH = (planted: string[]) => planted.filter((p) => !livePublicPainters.includes(p));
const withPublicPainter = (rel: string, code: string) => publicPainterFiles.map((f) => (f.rel === rel ? { rel, code } : f));
const l52Public = addedH(publicPainterProblems(withPublicPainter("src/lib/server/market-config.ts",
  plant(read("src/lib/server/market-config.ts"), "export ", "export const PLANTED_LABEL = \"house stake per market\";\nexport "))));
ok("6.c1 · CONTROL · L52 REBUILT ON THE PUBLIC SIDE · a house word planted as a label in a REAL config module that player routes import — the shape of the defect that sat live on /admin/system for weeks, moved to the side of the tree a player reads — is reported",
  l52Public.length === 1 && l52Public[0].includes("market-config.ts") && l52Public[0].includes("house stake"), j(l52Public));

const blindPublicPainters = publicPainterFiles.flatMap(({ rel, code }) => wordsPrinted(rel, code).map((w) => `${rel}: ${w}`));
ok("6.c2 · CONTROL · THE SWEEP IS LIVE AND THE REGISTER IS DOING WORK · with the register ignored, the same sweep over the same real modules reports ≥ 20 house words across ≥ 7 of them, the notifier and the lifecycle ticker among them — so 6.hop.2's zero is a clean population and not a dead predicate",
  blindPublicPainters.length >= 20 && new Set(blindPublicPainters.map((p) => p.split(": ")[0])).size >= 7
    && blindPublicPainters.some((p) => p.startsWith(`${PUBLIC_PAINTER_ONLY}: `)),
  `${blindPublicPainters.length} words across ${new Set(blindPublicPainters.map((p) => p.split(": ")[0])).size} modules with the register ignored`);

ok("6.c3 · CONTROL · the feature's own homes are NOT in this population and were never meant to be — `src/lib/house-bot/alert-copy.ts` names the feature in three languages by design and the disclosure walk owns it — and neither is the console's one read door, which ruling 453 owns",
  !publicPainters.includes("src/lib/house-bot/alert-copy.ts") && !publicPainters.includes("src/lib/server/house-console-read.ts")
    && !publics.includes("src/lib/house-bot/alert-copy.ts"),
  j({ alertCopy: publicPainters.includes("src/lib/house-bot/alert-copy.ts"), door: publicPainters.includes("src/lib/server/house-console-read.ts") }));

/* ── §6 close · WHAT IS STILL INSIDE NO POPULATION, PRINTED RATHER THAN LEFT TO BE DISCOVERED ────────────────── */
/**
 * ⛔ A COMPLEMENT NOBODY COMPUTED IS HOW A HOLE SURVIVES THREE SEPARATE GUARDS EACH BELIEVING ANOTHER COVERS IT — the
 * finding this whole suite exists for. So it computes its OWN complement too, and prints it: after §1–§6 there is
 * still a set of files inside no house-word population at all, and this says exactly what it is.
 */
const NOW: Array<[string, (rel: string) => boolean]> = [
  ...PRIOR,
  ["test:house-bot-surfaces §1/§2 · admin surfaces", (r) => surfaces.includes(r)],
  ["test:house-bot-surfaces §3 · admin one-hop painters", (r) => painters.includes(r)],
  ["test:house-bot-surfaces §4/§5 · the public population", (r) => publics.includes(r)],
  ["test:house-bot-surfaces §6 · public one-hop painters", (r) => publicPainters.includes(r)],
  ["the feature's own homes · ruling 453 and the disclosure walk", (r) => isHome(r) || inConsole(r)],
];
const stillUnscanned = srcAll.filter((r) => !NOW.some(([, f]) => f(r)));
const stillBuckets = new Map<string, number>();
for (const f of stillUnscanned) stillBuckets.set(bucketOf(f), (stillBuckets.get(bucketOf(f)) ?? 0) + 1);
for (const [name, f] of NOW) console.log(`  NOW · ${String(srcAll.filter(f).length).padStart(4)}  ${name}`);
console.log(`  REMAINING COMPLEMENT · ${stillUnscanned.length} of ${srcAll.length} src files are STILL inside no house-word population`);
for (const [b, n] of [...stillBuckets.entries()].sort((a, b2) => b2[1] - a[1])) console.log(`    ${String(n).padStart(4)}  ${b}`);
for (const f of stillUnscanned) console.log(`      ${f}`);
/**
 * ⛔ AND THE CLAIM IS ABOUT THE TREE, NOT ABOUT THE SET'S OWN DEFINITION. An earlier shape of this assertion also
 * checked that nothing in `stillUnscanned` was a surface or a painter — which is true BY CONSTRUCTION, since the set
 * is what matches none of those predicates. Two dead conjuncts reading like a claim is how a suite comes to pass
 * harder than it measures. What can actually fail is the statement about the TREE: every file under `src/app/` and
 * `src/components/` is inside a population. It was FALSE until the run that added this line — `src/app/api/admin/**`
 * was in neither §1's population nor §4's.
 */
const appTree = srcAll.filter((r) => r.startsWith("src/app/") || r.startsWith("src/components/"));
const unscannedSet = new Set(stillUnscanned);
ok("6.gap.1 · ⛔ WHAT IS STILL OPEN, MEASURED AND PRINTED RATHER THAN LEFT TO BE FOUND · the complement §0 printed has shrunk by ≥ 400 files, and NOT ONE of the ≥ 700 files under src/app/ or src/components/ is left in it: every admin page, player route, officer and public route handler, layout, action and component is now inside a house-word population. What remains is internal modules that neither a surface nor a public file imports DIRECTLY — §3 and §6 are ONE HOP by construction, so a two-hop painter is inside no population on either side, and that is the next lane rather than a claim made here",
  complement.length - stillUnscanned.length >= 400
    && appTree.length >= 700 && appTree.every((r) => !unscannedSet.has(r))
    && stillUnscanned.length >= 1,
  j({ before: complement.length, after: stillUnscanned.length, appTree: appTree.length, buckets: Object.fromEntries(stillBuckets) }));

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-surfaces: ${pass} passed, ${fail} failed`);
/**
 * ⛔ THE FLOOR. A suite whose cases silently stop executing prints "ALL PASS — 0 passed, 0 failed" and exits 0,
 * which is worse than a red. This is the count the first green run PRINTED; it only ever RISES, and only to a
 * number a run has printed.
 */
const MIN_ASSERTIONS = 73;
if (pass < MIN_ASSERTIONS) {
  console.error(`\n!! FLOOR — test:house-bot-surfaces ran ${pass} assertion(s), fewer than the ${MIN_ASSERTIONS} a green run printed.`);
  process.exit(4);
}
process.exit(fail === 0 ? 0 : 1);
