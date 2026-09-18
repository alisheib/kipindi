/**
 * `npm run test:house-bot-disclosure` — the NON-disclosure suite (owner ruling D19, 2026-09-16; C4 ruling 152).
 *
 * ⛔ HOUSE BOTS ARE NEVER PUBLIC. No player — the holder included — is told about them, and the public site must not
 * SHIP them either: a dictionary, a failure registry or a switch case that a client component imports lands in the
 * JavaScript every visitor downloads, whether or not any screen renders it.
 *
 * What this proves, fast and without a build:
 *   §1 every module reachable from a `"use client"` file through VALUE imports, after the same type and comment
 *      stripping the bundler does (esbuild), carries no house-bot vocabulary. The population is the import graph,
 *      derived here, never a hand-picked list — a hand list goes blind to the next chain (C4 ruling 151 was a chain
 *      nobody listed: an admin client importing a constant from a server module that reaches Prisma).
 *   §2 the walker can fail: planted virtual chains are found through relative and `@/` imports and re-exports, while
 *      a type-only import and a `"use server"` module (a server action reference, never bundled) are not followed.
 *   §3 the player copy the un-build replaced: the objection panel's neutral key exists in all three languages, and
 *      the outcome emitters' player-facing sentences carry no house word.
 *
 * ⚠️ The authority is the real bundle: `npm run verify:house-bot-bundle` after `npx next build` (320 hits on
 * `54dbb0dd`, 0 after the un-build). This suite is its fast proxy for `test:all`; each can catch what the other
 * cannot (this one needs no build; that one sees what the bundler actually kept).
 *
 * Commit 6 extends this suite with the rulebooks, Terms and privacy pinned byte-identical to `origin/main`.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path, { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { transformSync } from "esbuild";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const section = (t: string) => console.log(`\n${t}`);

/**
 * ⛔ THE VOCABULARY IS NOT DECLARED HERE (C5-SPEC ruling 175). Words, identifiers and bounded ids come from the one module
 * every absence proof imports; `test:house-bot-reports` §0 refuses a consumer that declares its own pattern.
 */
import { houseHits, HOUSE_WORD_SAMPLES, HOUSE_IDENTIFIER_SAMPLES, HOUSE_ID_SAMPLES, HOUSE_BENIGN_SAMPLES } from "./lib/house-bot-vocabulary.mjs";

type Reader = { exists(p: string): boolean; read(p: string): string };
const disk: Reader = { exists: (p) => existsSync(p) && statSync(p).isFile(), read: (p) => readFileSync(p, "utf8") };

const CODE = /\.(tsx?|jsx?|mts|mjs)$/;
const EXTS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts"];
function resolveImport(from: string, spec: string, r: Reader, srcRoot: string): string | null {
  // A virtual POSIX tree (the §2 controls) must not gain a drive letter from Windows path rules.
  const P = srcRoot.startsWith("/") ? path.posix : path;
  let base: string;
  if (spec.startsWith("@/")) base = P.join(srcRoot, spec.slice(2));
  else if (spec.startsWith(".")) base = P.resolve(P.dirname(from), spec);
  else return null; // a package: not our copy
  if (CODE.test(base) && r.exists(base)) return base;
  if (/\.[a-z]+$/i.test(base) && !CODE.test(base)) return null; // a stylesheet or an asset: no copy to read
  for (const ext of EXTS) if (r.exists(base + ext)) return base + ext;
  for (const ext of EXTS) if (r.exists(P.join(base, `index${ext}`))) return P.join(base, `index${ext}`);
  return null;
}

/**
 * Strip types and comments the way the bundler does, then list the VALUE imports that remain.
 *
 * 🔴 `charset: "utf8"` IS LOAD-BEARING (found by ruling 175's planted per-family control, C5 step 2). esbuild's default
 * charset is ASCII: it rewrites every non-ASCII character as a `\u` escape, so a planted `流动性` or `平台机器人` in a
 * client file came out as escapes and the walker never saw a Chinese word. The strip now keeps the text as written.
 */
function strip(file: string, code: string): string {
  const loader = file.endsWith(".tsx") || file.endsWith(".jsx") ? "tsx" : "ts";
  return transformSync(code, { loader, format: "esm", target: "es2022", charset: "utf8" }).code;
}
function valueImports(js: string): string[] {
  const specs = new Set<string>();
  for (const m of js.matchAll(/\bimport\s+(?:[^"';]*?\s+from\s+)?["']([^"']+)["']/g)) specs.add(m[1]);
  for (const m of js.matchAll(/\bexport\s+(?:\*|\{[^}]*\})\s+from\s+["']([^"']+)["']/g)) specs.add(m[1]);
  for (const m of js.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)) specs.add(m[1]);
  return [...specs];
}
const isDirective = (code: string, d: "use client" | "use server") => new RegExp(`^\\s*(?:\\/\\/[^\\n]*\\n|\\/\\*[\\s\\S]*?\\*\\/\\s*)*["']${d}["']`).test(code);

export function walkClientGraph(entries: string[], r: Reader, srcRoot: string): { reached: Map<string, string>; parent: Map<string, string>; hits: Array<{ file: string; word: string; via: string }> } {
  const reached = new Map<string, string>(); // file → the entry that reached it
  const parent = new Map<string, string>(); // file → the module that first imported it (for a readable chain)
  const hits: Array<{ file: string; word: string; via: string }> = [];
  const queue = entries.map((e) => [e, e] as const);
  while (queue.length) {
    const [file, via] = queue.shift()!;
    if (reached.has(file)) continue;
    const raw = r.read(file);
    // A "use server" module imported by a client is a server action REFERENCE — its body is never bundled.
    if (file !== via && isDirective(raw, "use server")) continue;
    reached.set(file, via);
    let js: string;
    try { js = strip(file, raw); } catch (e) { hits.push({ file, word: `UNPARSEABLE: ${(e as Error).message.split("\n")[0]}`, via }); continue; }
    for (const word of houseHits(js)) hits.push({ file, word, via });
    for (const spec of valueImports(js)) {
      const next = resolveImport(file, spec, r, srcRoot);
      if (next && !reached.has(next)) { if (!parent.has(next)) parent.set(next, file); queue.push([next, via]); }
    }
  }
  return { reached, parent, hits };
}

// ── §1 · the real graph ──────────────────────────────────────────────────────────────────────────────
section("§1 · every module a client component reaches carries no house-bot vocabulary");
const all: string[] = [];
const walkDir = (d: string) => {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const p = join(d, e.name);
    if (e.isDirectory()) walkDir(p); else if (/\.(tsx?|jsx?|mts|mjs)$/.test(e.name)) all.push(p);
  }
};
walkDir(SRC);
const clientEntries = all.filter((f) => isDirective(readFileSync(f, "utf8"), "use client"));
const { reached, parent, hits } = walkClientGraph(clientEntries, disk, SRC);
const chain = (f: string): string => { const out = [relative(ROOT, f)]; let p = parent.get(f); while (p && out.length < 12) { out.push(relative(ROOT, p)); p = parent.get(p); } return out.reverse().join(" → "); };
ok("1.0 · the population is real: ≥ 200 client entries and ≥ 300 reachable modules, including the dictionary and the failure registry",
  clientEntries.length >= 200 && reached.size >= 300 && reached.has(join(SRC, "lib", "i18n-dict.ts")) && reached.has(join(SRC, "lib", "failure-reasons.ts")),
  `${clientEntries.length} entries · ${reached.size} modules`);
ok("1.1 · ⛔ D19 · no house-bot word in any client-reachable module (types and comments stripped as the bundler does)",
  hits.length === 0, hits.slice(0, 12).map((h) => `"${h.word}" in ${chain(h.file)}`).join(" · "));
const houseModules = [...reached.keys()].filter((f) => /[\\/]house-bot[\\/]|house-bot-dal/.test(f));
ok("1.2 · ⛔ no module under house-bot/ (or the house DAL) is reachable from a client component", houseModules.length === 0, houseModules.map((f) => relative(ROOT, f)).join(", "));
// ⚠️ MEASURED, NOT ASSUMED (eighth session): `prisma.ts` IS reachable in source through `utils.ts → server/platform-config`,
// and the real build still ships no Prisma — the bundler drops that chain. The chain that DID ship Prisma (320-hit build,
// ruling 151) was a client file DIRECTLY value-importing a `lib/server/` module. So the pin is that exact shape, for every
// client file and every server module, never a list of known offenders; the build scan stays the authority for the rest.
const PRISMA = join(SRC, "lib", "server", "prisma.ts");
const direct: string[] = [];
for (const entry of clientEntries) {
  for (const spec of valueImports(strip(entry, readFileSync(entry, "utf8")))) {
    const target = resolveImport(entry, spec, disk, SRC);
    if (!target || !target.startsWith(join(SRC, "lib", "server"))) continue;
    if (isDirective(readFileSync(target, "utf8"), "use server")) continue;
    const sub = walkClientGraph([target], disk, SRC);
    if (sub.reached.has(PRISMA)) direct.push(`${relative(ROOT, entry)} → ${relative(ROOT, target)}`);
  }
}
ok("1.3 · ruling 151 · no client component directly value-imports a `lib/server/` module that reaches `prisma.ts` (Prisma's browser runtime names every model)",
  direct.length === 0, direct.join(", "));
ok("1.3c · CONTROL · the measure can fail: the pre-151 import (`agent-config` from a client) would be reported",
  walkClientGraph([join(SRC, "lib", "server", "agent-config.ts")], disk, SRC).reached.has(PRISMA));

// ── §2 · the walker can fail ─────────────────────────────────────────────────────────────────────────
section("§2 · CONTROLS — planted chains are found; type-only imports and server actions are not followed");
{
  const V = "/v/src";
  const files: Record<string, string> = {
    [`${V}/app/a.tsx`]: `"use client";\nimport { x } from "./b";\nimport type { T } from "@/lib/typed";\nimport { act } from "./actions";\nexport const A = () => x;`,
    [`${V}/app/b.ts`]: `export { y as x } from "@/lib/deep";`,
    [`${V}/lib/deep.ts`]: `// a comment about liquidity is not shipped\nexport const y = "This is a 50pick liquidity stake.";`,
    [`${V}/lib/typed.ts`]: `export type T = { houseBotId: string };\nexport const HOUSE_BOT_SECRET = "house bots";`,
    [`${V}/app/actions.ts`]: `"use server";\nexport async function act() { return "house_bot_inactive"; }`,
    [`${V}/app/c.tsx`]: `"use client";\nexport const C = () => (import("@/lib/lazy"));`,
    [`${V}/lib/lazy.ts`]: `export const L = { case: "HOUSE_BOT" };`,
    [`${V}/app/clean.tsx`]: `"use client";\n/* house bot docs */\nexport type U = { houseStake?: boolean };\nexport const fee = "HOUSE_FEE";`,
  };
  const vr: Reader = { exists: (p) => p.replace(/\\/g, "/") in files, read: (p) => files[p.replace(/\\/g, "/")] };
  const norm = (p: string) => p.replace(/\\/g, "/");
  const run = (entries: string[]) => walkClientGraph(entries, { exists: (p) => vr.exists(norm(p)), read: (p) => vr.read(norm(p)) }, V);
  void ({} as { [K in keyof typeof files]: string });
  const r1 = run([`${V}/app/a.tsx`]);
  const words1 = r1.hits.map((h) => `${norm(h.file).replace(V, "")}:${h.word}`);
  ok("2.c1 · a planted string two hops away (a re-export through an `@/` import) is found", words1.includes("/lib/deep.ts:liquidity"), words1.join(", "));
  ok("2.c2 · …its comment is not (comments are stripped, as the bundler strips them)", words1.filter((w) => w === "/lib/deep.ts:liquidity").length === 1, words1.join(", "));
  ok("2.c3 · a TYPE-only import is not followed (types are erased)", !r1.reached.has(`${V}/lib/typed.ts`) && ![...r1.reached.keys()].some((k) => norm(k).endsWith("/lib/typed.ts")), [...r1.reached.keys()].map(norm).join(", "));
  ok("2.c4 · a \"use server\" module is not followed (a server action is a reference, never bundled)", !words1.some((w) => w.startsWith("/app/actions.ts")), words1.join(", "));
  const r2 = run([`${V}/app/c.tsx`]);
  ok("2.c5 · a dynamic import() is followed, and an UPPER_SNAKE house identifier is found", r2.hits.some((h) => h.word === "HOUSE_BOT"), r2.hits.map((h) => h.word).join(", "));
  // Ruling 175 · a planted client-file control per vocabulary family (words, identifiers, bounded ids), each found through
  // the walker itself, and the benign look-alikes (the platform's HOUSE_FEE, /admin/house, a raw hb_ nonce) found by none.
  const familyFiles: Record<string, string> = {};
  const families: Array<[string, readonly string[]]> = [["words", HOUSE_WORD_SAMPLES], ["identifiers", HOUSE_IDENTIFIER_SAMPLES], ["ids", HOUSE_ID_SAMPLES]];
  for (const [family, samples] of families) {
    samples.forEach((sample, i) => {
      familyFiles[`${V}/app/planted-${family}-${i}.tsx`] = `"use client";\nexport const planted = ${JSON.stringify(sample)};`;
    });
  }
  HOUSE_BENIGN_SAMPLES.forEach((sample, i) => { familyFiles[`${V}/app/benign-${i}.tsx`] = `"use client";\nexport const benign = ${JSON.stringify(sample)};`; });
  const fr: Reader = { exists: (p) => norm(p) in familyFiles, read: (p) => familyFiles[norm(p)] };
  const runFamily = (entry: string) => walkClientGraph([entry], fr, V).hits;
  for (const [family, samples] of families) {
    const missed = samples.filter((_, i) => runFamily(`${V}/app/planted-${family}-${i}.tsx`).length === 0);
    ok(`2.v · ruling 175 · CONTROL · every planted ${family} sample in a client file is found (${samples.length} planted)`, missed.length === 0, missed.join(", "));
  }
  const benignHits = HOUSE_BENIGN_SAMPLES.flatMap((_, i) => runFamily(`${V}/app/benign-${i}.tsx`).map((h) => h.word));
  ok("2.v.b · ruling 175 · CONTROL · the benign look-alikes (HOUSE_FEE, /admin/house, raw hb_ prefixes, a 28-hex tail) are not hits", benignHits.length === 0, benignHits.join(", "));
  const r3 = run([`${V}/app/clean.tsx`]);
  ok("2.c6 · CONTROL · type-only house fields, a comment and the platform's HOUSE_FEE are not hits", r3.hits.length === 0, r3.hits.map((h) => h.word).join(", "));
}

// ── §3 · the replaced player copy ────────────────────────────────────────────────────────────────────
section("§3 · the player copy the un-build replaced says something true and names nothing");
{
  const { dict } = await import("../src/lib/i18n-dict.ts") as { dict: Record<string, { market: Record<string, string> }> };
  const lines = (["en", "sw", "zh"] as const).map((l) => dict[l]?.market?.objNotEligible);
  ok("3.1 · ruling 146 · objNotEligible exists in all three languages and names nothing",
    lines.every((s) => typeof s === "string" && s.length > 10) && lines.every((s) => houseHits(s!).length === 0 && !/50pick/i.test(s!)), JSON.stringify(lines));
  const panel = readFileSync(join(SRC, "components", "markets", "resolution-panel.tsx"), "utf8");
  ok("3.2 · the resolution panel renders the neutral state with the neutral key", /state === "NOT_ELIGIBLE"[\s\S]{0,200}t\.market\.objNotEligible/.test(panel));
  ok("3.2b · ruling 158 · the payout-held box drops its objection invitation in exactly the NOT_ELIGIBLE state",
    /objection\?\.state !== "NOT_ELIGIBLE" && <p[^>]*>\{t\.market\.resHeldWhy\}/.test(panel) && (panel.match(/t\.market\.resHeldWhy/g) ?? []).length === 1);
  const objections = strip("x.ts", readFileSync(join(SRC, "lib", "server", "objections-service.ts"), "utf8"));
  // Only the table a player reads: the server keeps its internal `HOUSE_STAKE_ONLY` reason (ruling 146).
  const table = /const msg = \{[\s\S]*?\n\s*\};/.exec(objections)?.[0] ?? "";
  ok("3.3 · the filing path's refusal table has no house row or sentence, and its generic line stands",
    table.length > 200 && houseHits(table).length === 0 && /You cannot object to this market\./.test(objections), `${table.length} chars · ${houseHits(table).join(", ")}`);
}

// ── §4 · the client-bundle law (C5-SPEC ruling 174), as far as Commit 5 step 2 can pin it ─────────────────────────
section("§4 · ruling 174 · no house word, prop name, action name, search field or tone in any client module");
{
  const rel = (p: string) => relative(ROOT, p).replace(/\\/g, "/");
  const reachedRel = new Set([...reached.keys()].map(rel));
  // The surfaces the law names, measured reachable — so 1.1 reads them, rather than assuming it does.
  const MUST_BE_READ = ["src/lib/status-tone.ts", "src/lib/search/fields.ts", "src/components/ui/search-box.tsx", "src/app/admin/system/system-client.tsx"];
  const unread = MUST_BE_READ.filter((p) => !reachedRel.has(p));
  ok("4.0 · the law's named client surfaces are inside §1's population (status-tone, the search grammar, the search box, the system client)", unread.length === 0, unread.join(", "));
  const { TXN_SEARCH } = await import("../src/lib/search/fields.ts") as { TXN_SEARCH: { fields: Record<string, { columns: string[] }>; default: string[] } };
  type TxnGrammar = { fields: Record<string, { columns: string[] }>; default?: string[] };
  /** 4.1's ONE measure, used by 4.1 and its control alike: every field name, column and default that says house. */
  const houseKeysOf = (s: TxnGrammar) => [...Object.keys(s.fields), ...Object.values(s.fields).flatMap((x) => x.columns), ...(s.default ?? [])].filter((k) => /house/i.test(k));
  const txnHouse = houseKeysOf(TXN_SEARCH);
  ok("4.1 · R1's house filter is never a TXN_SEARCH field, column or default (the client search box imports it)", Object.keys(TXN_SEARCH.fields).length >= 5 && txnHouse.length === 0, txnHouse.join(", "));
  const reportsReached = [...reachedRel].filter((p) => p.startsWith("src/lib/server/reports/"));
  ok("4.2 · no report builder module (src/lib/server/reports/) is reachable from a client component", reportsReached.length === 0, reportsReached.join(", "));

  // ⛔ CONTROLS — the three shapes the law exists for, planted in a virtual client tree, each found; their neutral twins not.
  const V = "/v/src";
  const files: Record<string, string> = {
    [`${V}/app/card.tsx`]: `"use client";\nexport function Card({ houseStake }: { houseStake: number }) { return <b>{houseStake}</b>; }`,
    [`${V}/app/neutral-card.tsx`]: `"use client";\nexport function Card({ exposureSlot }: { exposureSlot: string }) { return <b>{exposureSlot}</b>; }`,
    [`${V}/app/button.tsx`]: `"use client";\nimport { exportHouseBotCsvAction } from "./actions";\nexport const B = () => <button onClick={() => exportHouseBotCsvAction()} />;`,
    [`${V}/app/neutral-button.tsx`]: `"use client";\nimport { exportInternalRecordAction } from "./actions";\nexport const B = () => <button onClick={() => exportInternalRecordAction()} />;`,
    [`${V}/app/actions.ts`]: `"use server";\nexport async function exportHouseBotCsvAction() {}\nexport async function exportInternalRecordAction() {}`,
    [`${V}/app/tone-user.tsx`]: `"use client";\nimport { STATUS_TONE } from "@/lib/status-tone";\nexport const t = STATUS_TONE;`,
    [`${V}/lib/status-tone.ts`]: `export const STATUS_TONE = { OPEN: "info", HOUSE_BOT_ACTIVE: "success" } as const;`,
  };
  const norm = (p: string) => p.replace(/\\/g, "/");
  const vr: Reader = { exists: (p) => norm(p) in files, read: (p) => files[norm(p)] };
  const hitsOf = (entry: string) => walkClientGraph([`${V}/app/${entry}`], vr, V).hits.map((h) => h.word);
  ok("4.c1 · CONTROL · a client prop NAMED houseStake is found (destructured prop names survive the strip)", hitsOf("card.tsx").includes("houseStake"), hitsOf("card.tsx").join(", "));
  ok("4.c2 · CONTROL · a client import of a server action whose NAME carries HouseBot is found on the client side", hitsOf("button.tsx").some((w) => w.includes("HouseBot")), hitsOf("button.tsx").join(", "));
  ok("4.c3 · CONTROL · a HOUSE_BOT tone key in a planted status-tone copy is found through its client importer", hitsOf("tone-user.tsx").some((w) => w.startsWith("HOUSE_BOT")), hitsOf("tone-user.tsx").join(", "));
  ok("4.c4 · CONTROL · the neutral twins (exposureSlot, exportInternalRecordAction) are not hits", hitsOf("neutral-card.tsx").length === 0 && hitsOf("neutral-button.tsx").length === 0,
    [...hitsOf("neutral-card.tsx"), ...hitsOf("neutral-button.tsx")].join(", "));
  // C5 step 5 (rulings 174, 192) · the R2 slots. A client control takes a server-rendered line through a neutral prop; the
  // three shapes that would ship the line's words or its module instead are each found, and the neutral slot names are not.
  const slotFiles: Record<string, string> = {
    [`${V}/app/bar-hardcoded.tsx`]: `"use client";\nexport const Bar = ({ n }: { n: number }) => <p>{\`House stakes on \${n} of these markets\`}</p>;`,
    [`${V}/app/bar-neutral.tsx`]: `"use client";\nexport function Bar({ rows, exposureCountTemplate }: { rows: Array<{ exposureState?: string }>; exposureCountTemplate?: string }) { return <p>{rows.filter((r) => r.exposureState === "held").length}{exposureCountTemplate}</p>; }`,
    [`${V}/app/void-sw.tsx`]: `"use client";\nexport const V = () => <p>{"ikiwemo dau la nyumba"}</p>;`,
  };
  const sr: Reader = { exists: (p) => norm(p) in slotFiles, read: (p) => slotFiles[norm(p)] };
  const slotHits = (entry: string) => walkClientGraph([`${V}/app/${entry}`], sr, V).hits.map((h) => h.word);
  ok("4.c6 · CONTROL · a client bar that spells the bulk count sentence itself, and a client dialog that spells the Swahili house share, are found; a bar holding only the neutral exposureState / exposureCountTemplate names is not",
    slotHits("bar-hardcoded.tsx").includes("House stakes") && slotHits("void-sw.tsx").includes("dau la nyumba") && slotHits("bar-neutral.tsx").length === 0,
    JSON.stringify({ hardcoded: slotHits("bar-hardcoded.tsx"), sw: slotHits("void-sw.tsx"), neutral: slotHits("bar-neutral.tsx") }));
  // ⛔ OWNER RULING D20 (2026-09-17) · the real R2 renderer (`components/admin/exposure-line.tsx`) and its words
  // (`lib/house-bot/exposure-copy.ts`) were un-built in C5-5b, so the control that imported them from a planted client file
  // could not stay as it was. It is RE-ANCHORED to the same defect over a module that is still on disk, because every other
  // control here runs on a virtual tree: without it, a break in the real resolver (a tsconfig alias, a new extension, a
  // barrel file) would let §1.1 and §1.2 pass vacuously and no control would notice (C5-5b review, d19-hunt-04).
  const plantedEntry = join(SRC, "app", "planted-client-entry.tsx");
  const realCopy = join(SRC, "lib", "house-bot", "pause-reasons.ts");
  const planted: Record<string, string> = {
    [norm(plantedEntry)]: `"use client";\nimport { REMOVE_CAUSE_COPY } from "@/lib/house-bot/pause-reasons";\nexport const P = () => <b>{REMOVE_CAUSE_COPY.SUNSET}</b>;`,
  };
  const overlay: Reader = { exists: (p) => norm(p) in planted || disk.exists(p), read: (p) => planted[norm(p)] ?? disk.read(p) };
  const viaReal = walkClientGraph([plantedEntry], overlay, SRC);
  ok("4.c7 · CONTROL · over the REAL tree: a planted client file importing a real house copy module through the @/ alias reaches src/lib/house-bot/pause-reasons.ts on disk and its house words are reported — the resolver and the strip are proven on the tree §1 measures, not only on a virtual one",
    viaReal.reached.has(realCopy) && viaReal.hits.some((h) => h.file === realCopy) && !reached.has(plantedEntry),
    JSON.stringify({ reached: viaReal.reached.size, words: viaReal.hits.filter((h) => h.file === realCopy).map((h) => h.word).slice(0, 4) }));
  const plantedTxn: TxnGrammar = { fields: { ...TXN_SEARCH.fields, house: { columns: ["houseBotId"] } }, default: [...TXN_SEARCH.default, "houseBotId"] };
  const plantedHouse = houseKeysOf(plantedTxn);
  ok("4.c5 · CONTROL · a planted `house` field, its column and a house default in a TXN_SEARCH copy are each reported by 4.1's own measure", plantedHouse.length === 3, plantedHouse.join(", "));
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-disclosure: ${pass} passed, ${fail} failed`);
/**
 * ⛔ RULING 519 · THE FLOOR, AND WHY THIS SUITE HAD NONE. Ruling 515 raised every `minPass` the two-store runner
 * carries, and its own sentence says EVERY house suite's floor is checked against its last printed count. This suite is
 * not a two-store suite, so it had no floor to raise — and no floor at all is strictly worse than a stale one:
 * with `process.exit(fail === 0 ? 0 : 1)` and nothing else, a run in which EVERY case silently stopped
 * executing printed "ALL PASS — 0 passed, 0 failed" and exited 0.
 * The floor below is the count `npm run test:house-bot-disclosure` PRINTED at `670a0bc1` on 2026-09-18, in the run this commit records. It
 * only ever RISES, and only to a number a run printed — never to an arithmetic guess.
 */
const MIN_ASSERTIONS = 29;
if (pass < MIN_ASSERTIONS) {
  console.error(`\n!! FLOOR — test:house-bot-disclosure ran ${pass} assertion(s), fewer than the ${MIN_ASSERTIONS} a green run printed. Cases that stop running are not cases that pass.`);
  process.exit(4);
}
process.exit(fail === 0 ? 0 : 1);
