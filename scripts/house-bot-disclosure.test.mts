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

/** The house vocabulary in three locales — words, matched in any case. */
export const HOUSE_WORDS = /liquidity|ukwasi|流动性|house[ -]?bots?|boti (?:za|ya) nyumba|平台机器人/gi;
/** The feature's identifiers — matched EXACTLY (case-sensitive), so the platform's `HOUSE_FEE` txn type is not one. */
export const HOUSE_IDENTIFIERS = /\bhouse_[a-z]+|HOUSE_(?!FEE\b)[A-Z_]+|houseStake|houseOnly|houseBotId|HouseBot\w*/g;
const houseHits = (js: string): string[] => [...js.matchAll(HOUSE_WORDS), ...js.matchAll(HOUSE_IDENTIFIERS)].map((m) => m[0]);

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

/** Strip types and comments the way the bundler does, then list the VALUE imports that remain. */
function strip(file: string, code: string): string {
  const loader = file.endsWith(".tsx") || file.endsWith(".jsx") ? "tsx" : "ts";
  return transformSync(code, { loader, format: "esm", target: "es2022" }).code;
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
  const objections = strip("x.ts", readFileSync(join(SRC, "lib", "server", "objections-service.ts"), "utf8"));
  // Only the table a player reads: the server keeps its internal `HOUSE_STAKE_ONLY` reason (ruling 146).
  const table = /const msg = \{[\s\S]*?\n\s*\};/.exec(objections)?.[0] ?? "";
  ok("3.3 · the filing path's refusal table has no house row or sentence, and its generic line stands",
    table.length > 200 && houseHits(table).length === 0 && /You cannot object to this market\./.test(objections), `${table.length} chars · ${houseHits(table).join(", ")}`);
}

console.log(`\n${fail === 0 ? "ALL PASS" : "FAILURES"} — house-bot-disclosure: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
