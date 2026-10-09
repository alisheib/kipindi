/**
 * ROUND 5 OF THE VISUAL PASS, HELPER D (2026-10-09) — the code review's findings on the offline path, the not-found mark,
 * the route ghosts and the record pages' metadata, each fix held beside a control or a plant that proves it can fail.
 *
 *   npx tsx scripts/visual-pass-r5d.test.mts        (npm run test:visual-pass-r5d)
 *
 * The owner's rule (Ali, 2026-10-08/09): only perfect visual and logical results, and one convention per pattern. Where
 * an older suite owns the area its checks live there; this suite holds the rest:
 *   §1 F1 · a record page's metadata never decides what the page is: a FAILED read answers the board's title in the
 *          reader's language, a read that found nothing the not-found page's metadata, and nothing throws — the three
 *          record pages' functions RUN (transpiled from their own source), the shipped bodies as the controls; and the
 *          census of every generateMetadata in src/app
 *   §2 G1 · the journey's route ghosts are a client chunk: the root loading element carries one reference and the rails
 *          (built by RUNNING the root loading file, serialized the way the review measured it: 27,349 bytes before);
 *          every ghost renders in every language on React's server renderer; and each is the very drawing its page's
 *          loading file renders — byte for byte
 *   §3 G2 · what a server render error in the shell's bare parts does, on the app's own copy of React's server renderer,
 *          and that the shell and the ghost say so
 *   §4 G1's sibling · the not-found element each payload carries (the root's in every one): the view's reference and its
 *          words, RUN in three languages (5,938 bytes before), the words in a data module beside the client view — and
 *          the server graph walked so no server module reads a value out of a client module
 *   §5 F4's pattern · every useSyncExternalStore reader classified (a store read by what stands outside the page), and
 *          the framework pinned: a page that is left leaves the document (no cacheComponents, no hidden <Activity>)
 *   F2 F3 → `test:offline-neutral` §11 §12 (the service worker, RUN in its sandbox) · F4 F5 → `test:visual-pass-r4j` §5
 *   (5.1 5.2 5.11–5.15: the mark's path, the layout announcement, the server's 404 template on React's own renderer)
 * ⛔ It READS, builds and renders in memory; it writes nothing. The on-disk mutation proof is S/r5d/mutation-r5d.mjs.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, posix } from "node:path";
import { createRequire } from "node:module";
import { Writable } from "node:stream";
import NodeModule from "node:module";
import { decomment } from "./lib/decomment.mts";

const req = createRequire(import.meta.url);
let pass = 0;
const fails: string[] = [];
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const section = (s: string) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 100 - s.length))}`);
const raw = (p: string) => readFileSync(p, "utf8").replace(/\r\n/g, "\n");
/** Source with its comments out (the shared scanner), so a rule quoted in a note is never mistaken for the rule. */
const code = (p: string) => decomment(raw(p));
const squash = (s: string) => s.replace(/\s+/g, " ");
const count = (s: string, needle: string) => s.split(needle).length - 1;
const j = (v: unknown) => JSON.stringify(v);
const hasDirective = (s: string, d: string) => new RegExp(`^\\s*["']${d}["'];?`).test(s);

/* ── the world the server components run in: the request's language, address and journey answer, stubbed ─────────── */
type Locale = "sw" | "en" | "zh";
const LOCALES: Locale[] = ["sw", "en", "zh"];
const REQ = { locale: "sw" as Locale, path: "/", journey: true };
const nextHeaders = req("next/headers") as { cookies: unknown; headers: unknown };
nextHeaders.cookies = async () => ({ get: (k: string) => (k === "kp-locale" ? { value: REQ.locale } : undefined) });
nextHeaders.headers = async () => new Headers({ "x-pathname": REQ.path });
{
  const at = req.resolve("../src/lib/server/journey-preview.ts");
  const stub = new NodeModule(at);
  stub.filename = at; stub.loaded = true;
  stub.exports = { resolveSimpleJourney: async () => ({ state: "LIVE", journey: REQ.journey, preview: false, pass: null }) };
  (req.cache as Record<string, unknown>)[at] = stub;
}
const React = req("react") as typeof import("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server") as typeof import("react-dom/server");
const { dict } = req("../src/lib/i18n-dict.ts") as { dict: Record<Locale, Record<string, Record<string, string>>> };

/* ══ §1 · F1 · A RECORD PAGE'S METADATA NEVER DECIDES THE PAGE ═══════════════════════════════════════════════════════ */
section("1 · F1 · a failed read is the board's title in the reader's language, a missing record the not-found's, nothing throws");

/** A function's whole text, from its head through the brace that closes its body (the parameter list's braces skipped). */
function fnText(src: string, head: string): string {
  const at = src.indexOf(head);
  if (at < 0) return "";
  let i = src.indexOf("(", at), depth = 0;
  for (; i < src.length; i++) { if (src[i] === "(") depth++; else if (src[i] === ")" && --depth === 0) break; }
  const open = src.indexOf("{", i);
  depth = 0;
  for (let k = open; k < src.length; k++) { if (src[k] === "{") depth++; else if (src[k] === "}" && --depth === 0) return src.slice(at, k + 1); }
  return "";
}
const esbuild = req("esbuild") as { transformSync: (c: string, o: { loader: string }) => { code: string } };
const NOT_FOUND = Symbol("notFound() thrown");
const NOT_FOUND_META = { title: "Hakuna ukurasa · 404", robots: { index: false, follow: false }, __sentinel: "notFoundMetadata()" };
type Calls = { notFound: number; notFoundMetadata: number };
/** A page's generateMetadata, transpiled from its own source and run with its readers stubbed. */
function runnable(fn: string, read: (id: string) => Promise<unknown>, calls: Calls, locale: Locale, config = "ACTIVE") {
  const js = esbuild.transformSync(fn.replace(/^export\s+/, ""), { loader: "ts" }).code;
  const reader = async (id: string) => read(id);
  const deps: Record<string, unknown> = {
    getServerT: async () => ({ t: dict[locale], locale }),
    getMarket: reader, getRoundDetail: reader, getProposalDetail: reader,
    getProposalsConfig: () => ({ state: config }),
    notFound: () => { calls.notFound++; throw NOT_FOUND; },
    notFoundMetadata: async () => { calls.notFoundMetadata++; return NOT_FOUND_META; },
    pickLocalized: (l: Locale, en: string, sw?: string | null, zh?: string | null) => (l === "sw" ? sw : l === "zh" ? zh : en) || en,
    sharePreviewPrice: () => ({ kind: "none" }), sharePreviewSettled: () => null, sharePreviewDescription: () => "desc",
    resolveWinShareToken: async () => null, formatTzs: (n: number) => `TZS ${n}`, ROOT_OPEN_GRAPH: { siteName: "50pick" },
  };
  return new Function(...Object.keys(deps), `${js}\nreturn generateMetadata;`)(...Object.values(deps)) as
    (a: { params: Promise<Record<string, string>>; searchParams?: Promise<Record<string, string>> }) => Promise<unknown>;
}
type Outcome = { result?: unknown; threw?: unknown; calls: Calls };
async function outcome(fn: string, read: (id: string) => Promise<unknown>, locale: Locale, config = "ACTIVE"): Promise<Outcome> {
  const calls: Calls = { notFound: 0, notFoundMetadata: 0 };
  try {
    const result = await runnable(fn, read, calls, locale, config)({ params: Promise.resolve({ id: "rec_1", roundId: "rec_1" }), searchParams: Promise.resolve({}) });
    return { result, calls };
  } catch (e) { return { threw: e === NOT_FOUND ? "notFound()" : String(e), calls }; }
}
const RECORD = { titleEn: "Will it rain?", titleSw: "Je, mvua itanyesha?", titleZh: "会下雨吗？", yesPool: 0, noPool: 0, predictorCount: 0, status: "LIVE", resolvedOutcome: null };
const fail = async () => { throw new Error("connection terminated unexpectedly (a database blip)"); };
const none = async () => null;
const found = async () => RECORD;
/** [page, its file, the board's title key — the one its board page is titled by, the board's file] */
const RECORD_PAGES: Array<[string, string, (l: Locale) => string, string, string]> = [
  ["/markets/[id]", "src/app/markets/[id]/page.tsx", (l) => dict[l].market.title, "src/app/markets/page.tsx", "return { title: t.market.title };"],
  ["/updown/[roundId]", "src/app/updown/[roundId]/page.tsx", (l) => dict[l].market.udTitle, "src/app/updown/page.tsx", "return { title: t.market.udTitle };"],
  ["/proposals/[id]", "src/app/proposals/[id]/page.tsx", (l) => dict[l].proposals.title, "src/app/proposals/page.tsx", "const title = t.proposals.title;"],
];
/** The rule, judged on one generateMetadata's text: what each read's outcome answers, in every language. */
async function judgeMeta(fn: string, board: (l: Locale) => string, recordTitle: (l: Locale) => string | null): Promise<string[]> {
  const wrong: string[] = [];
  if (!fn) return ["no generateMetadata"];
  for (const l of LOCALES) {
    const f = await outcome(fn, fail, l);
    if (f.threw !== undefined || j(f.result) !== j({ title: board(l) }) || f.calls.notFound + f.calls.notFoundMetadata > 0)
      wrong.push(`${l} · a failed read answered ${f.threw !== undefined ? `a throw (${f.threw})` : j(f.result)}, not the board's ${j(board(l))}`);
    const n = await outcome(fn, none, l);
    if (n.threw !== undefined || n.result !== NOT_FOUND_META || n.calls.notFound > 0)
      wrong.push(`${l} · a record not there answered ${n.threw !== undefined ? `a throw (${n.threw})` : j(n.result)}, not the not-found's metadata`);
    const want = recordTitle(l);
    const y = await outcome(fn, found, l);
    if (want !== null && (y.threw !== undefined || (y.result as { title?: string } | undefined)?.title !== want))
      wrong.push(`${l} · a record found was titled ${y.threw !== undefined ? `a throw (${y.threw})` : j((y.result as { title?: string })?.title)}`);
  }
  return wrong;
}
const titleIn = (l: Locale) => (l === "sw" ? RECORD.titleSw : l === "zh" ? RECORD.titleZh : RECORD.titleEn);
for (const [route, file, board, boardFile, boardLine] of RECORD_PAGES) {
  const fn = fnText(code(file), "export async function generateMetadata");
  // The round's metadata names a round by its English title (the round has no other); the others by the reader's.
  const wrong = await judgeMeta(fn, board, route === "/updown/[roundId]" ? () => RECORD.titleEn : titleIn);
  ok(`1.1 · ${route}: RUN in sw, en and zh — a failed read answers the board's title in that language (${LOCALES.map((l) => j(board(l))).join(" ")}), a record not there the not-found's metadata, a record found its title; notFound() never called`,
    wrong.length === 0, wrong.join(" | "));
  ok(`1.2 · ${route}: the neutral title is the board's own name — ${boardFile} is titled by the same key`, code(boardFile).includes(boardLine), boardLine);
}
{
  // The proposal board switched off: the page redirects there, so the metadata says the board's name too.
  const fn = fnText(code("src/app/proposals/[id]/page.tsx"), "export async function generateMetadata");
  const off = await outcome(fn, none, "zh", "DISABLED");
  ok("1.3 · /proposals/[id] with the board switched off (the page redirects to it): the board's title, in the reader's language",
    j(off.result) === j({ title: dict.zh.proposals.title }) && off.calls.notFound === 0, j(off));
}
{
  // CONTROLS — the shipped bodies the review found, run through the same judge.
  const SHIPPED_MARKET = `export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  let m: Awaited<ReturnType<typeof getMarket>> | null = null;
  try { m = await getMarket(id); } catch { /* graceful */ }
  if (!m) notFound();
  const { locale } = await getServerT();
  return { title: pickLocalized(locale, m.titleEn, m.titleSw, m.titleZh) };
}`;
  const shipped = await outcome(decomment(SHIPPED_MARKET), fail, "sw");
  ok("1.1′ CONTROL · the market's shipped body (round 4): a database blip in its read calls notFound() — the real market replaced by \"Hakuna ukurasa · 404\" — and the judge reports it",
    shipped.threw === "notFound()" && (await judgeMeta(decomment(SHIPPED_MARKET), RECORD_PAGES[0][2], titleIn)).length > 0, j(shipped));
  const SHIPPED_ROUND = `export async function generateMetadata({ params }: { params: Promise<{ roundId: string }> }): Promise<Metadata> {
  const { roundId } = await params;
  let d: Awaited<ReturnType<typeof getRoundDetail>> = null;
  try {
    d = await getRoundDetail(roundId);
  } catch { return { title: "Up & Down" }; }
  if (!d) return notFoundMetadata();
  return { title: d.titleEn };
}`;
  const round = await judgeMeta(SHIPPED_ROUND, RECORD_PAGES[1][2], () => RECORD.titleEn);
  ok("1.1″ CONTROL · the round's shipped body (round 4): the English \"Up & Down\" for a failed read in Swahili and Chinese — reported, in those two languages only",
    round.length === 2 && round.every((w) => /^(sw|zh) · a failed read/.test(w)), round.join(" | "));
}
{
  // The census: EVERY generateMetadata in src/app. None throws, redirects or calls notFound(); the ones that read a record
  // are exactly the three record pages, each read inside a try.
  const files: string[] = [];
  const walk = (d: string) => { for (const n of readdirSync(d)) { const p = posix.join(d, n); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(n)) files.push(p); } };
  walk("src/app");
  const census = (read: (p: string) => string) => {
    const fns = files.map((f) => [f, fnText(read(f), "export async function generateMetadata")] as const).filter(([, fn]) => fn !== "");
    const deciding = fns.filter(([, fn]) => /\bnotFound\(\)|\bredirect\(|\bthrow\b/.test(fn)).map(([f]) => f);
    const readers = fns.filter(([, fn]) => /\b(?:getMarket|getRoundDetail|getProposalDetail)\(/.test(fn)).map(([f]) => f).sort();
    const unguarded = fns.filter(([, fn]) => /\b(?:getMarket|getRoundDetail|getProposalDetail)\(/.test(fn) && !/try\s*\{[^}]*\b(?:getMarket|getRoundDetail|getProposalDetail)\(/.test(fn)).map(([f]) => f);
    return { count: fns.length, deciding, readers, unguarded };
  };
  const now = census(code);
  ok(`1.4 · the census: ${now.count} generateMetadata in src/app — none throws, redirects or calls notFound(); the record readers are exactly the three record pages, each read inside a try`,
    now.count >= 40 && now.deciding.length === 0 && j(now.readers) === j(RECORD_PAGES.map((r) => r[1]).sort()) && now.unguarded.length === 0, j(now));
  const planted = census((p) => (p === "src/app/markets/[id]/page.tsx" ? code(p).replace("if (!m) return notFoundMetadata();", "if (!m) notFound();") : code(p)));
  ok("1.4′ PLANT · the market's notFound() back in its metadata is found by the census", j(planted.deciding) === j(["src/app/markets/[id]/page.tsx"]), j(planted.deciding));

  // ⭐ EVERY OTHER READ TOO. A metadata read that REJECTS is thrown by `MetadataOutlet` beside the page, under the page's
  // boundaries — the error page replaces a page whose own reads succeeded. So outside a `try`, a generateMetadata awaits
  // only reads that never reject: each of these catches its own failure, or is the shell's own read for the same request
  // (whose throw has already failed the document).
  const NEVER_REJECT: Record<string, string> = {
    getServerT: "the reader's language, the shell's own read",
    notFoundMetadata: "getServerT and the not-found's words",
    currentSession: "the session, the shell's own read for this request",
    resolveSimpleJourney: "catches: any failure answers WITHDRAWN (lib/server/journey-preview.ts)",
    invitePaysPlayersNow: "catches: \"Never rejects; any failure answers false\" (lib/server/invite-rewards-switch.ts)",
    inviteViewerFor: "catches: a failed read answers NO_VIEWER (lib/server/affiliate-service.ts)",
  };
  /** The function's text with every `try { … }` body taken out (braces balanced). */
  const outsideTry = (fn: string) => {
    let out = "", i = 0;
    for (let at = fn.indexOf("try {", i); at >= 0; at = fn.indexOf("try {", i)) {
      out += fn.slice(i, at);
      let k = fn.indexOf("{", at), depth = 0;
      for (; k < fn.length; k++) { if (fn[k] === "{") depth++; else if (fn[k] === "}" && --depth === 0) break; }
      i = k + 1;
    }
    return out + fn.slice(i);
  };
  /** What a function awaits outside a try: each `await f(…)`, and each call inside an awaited `Promise.all([…])`. */
  const awaited = (fn: string) => {
    const s = outsideTry(fn);
    const names = [...s.matchAll(/await\s+([A-Za-z_$][\w$]*)\s*\(/g)].map((m) => m[1]).filter((n) => n !== "params" && n !== "searchParams");
    for (const m of s.matchAll(/await\s+Promise\.all\(\[([\s\S]*?)\]\)/g)) names.push(...[...m[1].matchAll(/(?<![.\w$])([a-z][\w$]*)\s*\(/g)].map((x) => x[1]));
    return [...new Set(names.filter((n) => n !== "Promise"))];
  };
  const reads = (read: (p: string) => string) => files.flatMap((f) => {
    const fn = fnText(read(f), "export async function generateMetadata");
    return fn ? awaited(fn).filter((n) => !(n in NEVER_REJECT)).map((n) => `${f}: ${n}`) : [];
  });
  const loose = reads(code);
  const used = [...new Set(files.flatMap((f) => { const fn = fnText(code(f), "export async function generateMetadata"); return fn ? awaited(fn) : []; }))].sort();
  const catches = ["src/lib/server/journey-preview.ts", "src/lib/server/invite-rewards-switch.ts", "src/lib/server/affiliate-service.ts"].every((p) => /\}\s*catch\s*\{/.test(code(p)));
  ok(`1.4″ · and outside a try, every generateMetadata awaits only reads that never reject (${used.join(", ")}) — the three that catch do catch`,
    loose.length === 0 && catches && used.includes("getMarket") === false, loose.join(" | ") || j(used));
  const plantedRead = reads((p) => (p === "src/app/updown/[roundId]/page.tsx" ? code(p).replace(/try \{\s*d = await getRoundDetail\(roundId\);\s*\} catch \{ return \{ title: t\.market\.udTitle \}; \}/, "d = await getRoundDetail(roundId);") : code(p)));
  ok("1.4‴ PLANT · the round's read taken out of its try (a failed read would throw beside the page) is found", j(plantedRead) === j(["src/app/updown/[roundId]/page.tsx: getRoundDetail"]), j(plantedRead));
}
{
  // The body's read is the one that decides, and its note says so (the old note called the metadata's catch "title garnish");
  // and the market's not-found no longer says the page's metadata calls notFound().
  const page = raw("src/app/markets/[id]/page.tsx"), nf = raw("src/app/markets/[id]/not-found.tsx");
  ok("1.5 · the body still reads the market with no catch and calls notFound() only for a missing row (B-1), its note no longer calls the metadata's catch \"title garnish\", and the market's not-found no longer says the page's metadata calls notFound()",
    /const m = await getMarket\(id\);\s*if \(!m\) notFound\(\);/.test(code("src/app/markets/[id]/page.tsx")) && !page.includes("title garnish") && page.includes("THIS read is the only one that decides the page")
      && !/generateMetadata` on the page calls `notFound\(\)`/.test(nf) && nf.includes("CORRECTED IN ROUND 5 (review F1)"));
}

/* ══ §2 · G1 · THE ROUTE GHOSTS ARE A CLIENT CHUNK ═══════════════════════════════════════════════════════════════════ */
section("2 · G1 · the root loading element is a reference and the rails; every ghost is drawn in the browser, and is its page's own");
const GHOST = "src/components/journey/route-ghost.tsx";
const GHOST_LAZY = "src/components/journey/route-ghost-lazy.tsx";
const SHELL_LAZY = "src/components/layout/shell-lazy.tsx";
const LOADING = "src/app/loading.tsx";
const SRC_EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx"];
/** Every module a file loads at runtime (value imports, side-effect imports, dynamic imports), resolved in src. */
function loads(file: string, text: (p: string) => string): Array<{ spec: string; to: string | null }> {
  const s = decomment(text(file));
  const specs = [
    ...[...s.matchAll(/^\s*import\s+(?!type\s)[\s\S]*?\s+from\s+["']([^"']+)["']/gm)].map((m) => m[1]),
    ...[...s.matchAll(/^\s*import\s+["']([^"']+)["']/gm)].map((m) => m[1]),
    ...[...s.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1]),
  ];
  return specs.map((spec) => {
    const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? posix.join(posix.dirname(file), spec) : null;
    const to = base === null ? null : SRC_EXTS.map((e) => base + e).find((p) => existsSync(p) && statSync(p).isFile()) ?? null;
    return { spec, to };
  });
}
/** What in the client graph from `entry` cannot load in a browser: next/headers, a server module, a Node built-in. */
function serverOnly(entry: string, text: (p: string) => string = raw): { reached: number; bad: string[] } {
  const seen = new Set<string>(); const bad: string[] = [];
  const visit = (f: string) => {
    if (seen.has(f)) return; seen.add(f);
    for (const { spec, to } of loads(f, text)) {
      if (/^(?:next\/headers|next\/server|server-only|node:|fs$|path$|crypto$|@prisma\/)/.test(spec) || spec.startsWith("@/lib/server/")) bad.push(`${f} → ${spec}`);
      if (to) visit(to);
    }
  };
  visit(entry);
  return { reached: seen.size, bad };
}
{
  const ghost = code(GHOST);
  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): the binding also takes `at`, the page a segment's own loading file pins it
  // to (`/positions`, `/updown/history` — `test:visual-pass-r5h` §2 holds the two).
  const shape = (s: string) => hasDirective(s, "use client") && s.includes("export function JourneyRouteGhost({ rails, at }: { rails: readonly string[]; at?: JourneyGhostPage }) {")
    && squash(s).includes("const { t, locale } = useT();") && s.includes('import { useT } from "@/lib/i18n";');
  ok("2.1 · route-ghost.tsx is client code: the ghosts take the rails alone and read the words from the client dictionary (`useT`)", shape(ghost));
  ok("2.1′ PLANT · the ghosts drawn by a server component again (the directive gone) is reported", !shape(ghost.replace(/^\s*"use client";/, "")));
  const graph = serverOnly(GHOST_LAZY);
  ok(`2.2 · nothing the ghosts load is server code: ${graph.reached} modules from the lazy binding, no next/headers, no @/lib/server/*, no Node built-in`, graph.reached > 10 && graph.bad.length === 0, graph.bad.join(" | "));
  const replanted = serverOnly(GHOST_LAZY, (p) => (p === GHOST ? `import { heroRailNames } from "@/lib/server/payout-rails";\n${raw(p)}` : raw(p)));
  ok("2.2′ PLANT · the rails read in the ghost again (`heroRailNames` from @/lib/server/payout-rails) is reported", replanted.bad.some((b) => b.includes("@/lib/server/payout-rails")), replanted.bad.join(" | "));
}
{
  const lazy = code(GHOST_LAZY), shell = code(SHELL_LAZY);
  const statics = [...lazy.matchAll(/^\s*import\s+([^;]*?)\s+from\s+"([^"]+)";/gm)].map((m) => `${m[1].trim()} from ${m[2]}`);
  const LINE = 'export const LazyJourneyRouteGhost = dynamic(() => import("@/components/journey/route-ghost").then((m) => m.JourneyRouteGhost).catch(nothingIfLost));';
  const options = ["ssr", "loading", "suspense"].filter((w) => lazy.includes(w));
  ok("2.3 · route-ghost-lazy.tsx is the shell's pattern: client code whose one static import is next/dynamic, one binding with no option object (the server render stays on, no boundary of its own), its loader ending in the lost-chunk guard",
    hasDirective(lazy, "use client") && j(statics) === j(["dynamic from next/dynamic"]) && count(lazy, LINE) === 1 && count(lazy, "export ") === 1 && options.length === 0,
    j({ statics, options, line: count(lazy, LINE) }));
  // The guard, character for character: the stand-in, the once-per-page flag and the guard itself.
  const guardOf = (s: string) => {
    const a = s.indexOf("function Nothing(): null {"), b = s.indexOf("return Nothing;\n}", a);
    return a < 0 || b < 0 ? "" : squash(s.slice(a, b + "return Nothing;\n}".length));
  };
  ok("2.4 · its lost-chunk guard is the shell's own, character for character (a ChunkLoadError leaves the ghost out and reports once; any other error is thrown on)",
    guardOf(lazy) !== "" && guardOf(lazy) === guardOf(shell) && guardOf(lazy).includes('error.name !== "ChunkLoadError") throw error;'), guardOf(lazy).slice(0, 120));
  ok("2.4′ PLANT · a guard that takes every error is reported", guardOf(lazy.replace('if (!(error instanceof Error) || error.name !== "ChunkLoadError") throw error;', "")) !== guardOf(shell));
}
{
  const loading = code(LOADING);
  const arm = (s: string) => squash(s).includes("(await resolveSimpleJourney()).journey) { return <LazyJourneyRouteGhost rails={heroRailNames(null)} />; }")
    && s.includes('import { LazyJourneyRouteGhost } from "@/components/journey/route-ghost-lazy";')
    && !s.includes("@/components/journey/route-ghost\"") && !/getServerT/.test(s);
  ok("2.5 · the root loading file hands the lazy binding the one server answer the browser cannot read (the rails that pay out), and no words and no ghost of its own", arm(loading));
  ok("2.5′ PLANT · the words handed in again (the dictionary written into every payload) is reported",
    !arm(loading.replace("<LazyJourneyRouteGhost rails={heroRailNames(null)} />", "<LazyJourneyRouteGhost rails={heroRailNames(null)} t={t} />")));
}

/** The root loading element as Next writes it into a payload — Flight's shape: a "use client" export is a reference
 *  (`$L<n>`) with its props; a server component is replaced by what it returns; a host element is ["$", tag, key, props]. */
const clientRefs = new Map<unknown, string>();
function collectClientRefs(): void {
  for (const [file, mod] of Object.entries(req.cache as Record<string, { exports?: Record<string, unknown> }>)) {
    if (!/[\\/]src[\\/]/.test(file) || !existsSync(file)) continue;
    if (!hasDirective(decomment(readFileSync(file, "utf8").replace(/^﻿/, "")), "use client")) continue;
    for (const [name, v] of Object.entries(mod.exports ?? {})) {
      if (typeof v === "function" || (v !== null && typeof v === "object" && "$$typeof" in (v as object))) clientRefs.set(v, `${file.split(/[\\/]src[\\/]/)[1].replace(/\\/g, "/")}#${name}`);
    }
  }
}
async function flight(node: unknown, named: Set<string>): Promise<unknown> {
  if (node === null || node === undefined) return node === undefined ? "$undefined" : null;
  if (typeof node === "string") return node.startsWith("$") ? `$${node}` : node;
  if (typeof node === "number" || typeof node === "boolean") return node;
  if (Array.isArray(node)) return Promise.all(node.map((n) => flight(n, named)));
  const el = node as { $$typeof?: symbol; type?: unknown; key?: string | null; props?: Record<string, unknown> };
  if (el.$$typeof === Symbol.for("react.transitional.element")) {
    const props = async () => Object.fromEntries(await Promise.all(Object.entries(el.props ?? {}).filter(([, v]) => v !== undefined)
      .map(async ([k, v]) => [k, typeof v === "function" ? "$F" : await flight(v, named)] as const)));
    if (typeof el.type === "string") return ["$", el.type, el.key ?? null, await props()];
    if (el.type === Symbol.for("react.fragment")) return flight(el.props?.children, named);
    const ref = clientRefs.get(el.type);
    if (ref) { named.add(ref); return ["$", `$L${named.size.toString(16)}`, el.key ?? null, await props()]; }
    if (typeof el.type === "function") return flight(await (el.type as (p: unknown) => unknown)(el.props), named);
    throw new Error(`unknown element type ${String(el.type)}`);
  }
  if (typeof node === "object") return Object.fromEntries(await Promise.all(Object.entries(node as Record<string, unknown>).map(async ([k, v]) => [k, await flight(v, named)] as const)));
  return String(node);
}
const RootLoading = (req("../src/app/loading.tsx") as { default: () => Promise<unknown> }).default;
const { heroRailNames } = req("../src/lib/server/payout-rails.ts") as { heroRailNames: (p: null) => string[] };
const RAILS = heroRailNames(null);
// Every module the checks below serialize or render, loaded BEFORE the client references are collected (a "use client"
// export not yet loaded would be taken for a server component and called).
const { RoutePick } = req("../src/components/ui/route-pick.tsx") as { RoutePick: unknown };
const { UpDownGhost } = req("../src/app/updown/updown-ghost.tsx") as { UpDownGhost: unknown };
const { UpDownHistoryGhost } = req("../src/app/updown/history/history-ghost.tsx") as { UpDownHistoryGhost: unknown };
const { DepositGhost } = req("../src/app/wallet/deposit/deposit-ghost.tsx") as { DepositGhost: unknown };
const { TicketsGhost, TicketsHeadGhost } = req("../src/components/journey/tickets/tickets-ghost.tsx") as { TicketsGhost: unknown; TicketsHeadGhost: unknown };
const { LazyJourneyRouteGhost } = req("../src/components/journey/route-ghost-lazy.tsx") as { LazyJourneyRouteGhost: unknown };
const MarketDetailLoading = (req("../src/app/markets/[id]/loading.tsx") as { default: unknown }).default;
const DepositReturnLoading = (req("../src/app/wallet/deposit/return/loading.tsx") as { default: unknown }).default;
const { JourneyRouteGhost } = req("../src/components/journey/route-ghost.tsx") as { JourneyRouteGhost: (p: { rails: readonly string[] }) => unknown };
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Locale; children: unknown }) => unknown };
collectClientRefs();
const GHOST_MARKUP = /kp-hero|kp-hub|kp-shimmer-track|kp-hghost|aria-busy/;
/**
 * What a client drawing returns, captured inside a React render (its `useT` needs one) at the reader's language: the tree
 * a SERVER component drawing it would have written into the payload (round 5's follow-up, R5-H · G-2 — the drawings read
 * their own words now, so a control can no longer call them as functions).
 */
function drawnTree(el: unknown, l: Locale): unknown {
  const box: { tree?: unknown } = {};
  const { type, props } = el as { type: (p: unknown) => unknown; props: unknown };
  const Capture = () => { box.tree = type(props); return null; };
  const { AppRouterContext: Router } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
  renderToStaticMarkup(h(Router.Provider, { value: { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} } }, h(I18nProvider as never, { initial: l } as never, h(Capture))));
  return box.tree;
}
{
  const sizes: string[] = [];
  let worst = 0, refsOk = true, markupFree = true, propsOk = true;
  for (const l of LOCALES) {
    REQ.locale = l; REQ.path = "/"; REQ.journey = true;
    const named = new Set<string>();
    const el = await RootLoading();
    const json = j(await flight(el, named));
    worst = Math.max(worst, Buffer.byteLength(json));
    sizes.push(`${l} ${Buffer.byteLength(json)} B`);
    refsOk &&= j([...named]) === j(["components/journey/route-ghost-lazy.tsx#LazyJourneyRouteGhost"]);
    markupFree &&= !GHOST_MARKUP.test(json);
    propsOk &&= j((el as { props: unknown }).props) === j({ rails: RAILS });
  }
  ok(`2.6 · RUN for a journey reader, the root loading element is ONE client reference and the rails — ${sizes.join(", ")} of Flight JSON (it was 27,349 / 27,318 / 27,310), under 200 in every language; no ghost markup in it`,
    worst > 0 && worst < 200 && refsOk && markupFree && propsOk, j({ sizes, refsOk, markupFree, propsOk }));
  // CONTROL — the same serializer on the element as it was drawn before: RoutePick holding every page's ghost, drawn by
  // the server (the drawings themselves, imported from their modules: here they are server components).
  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): the shared drawings are client code reading their own words, so the
  // server-drawn shape is rebuilt from each one's own tree (`drawnTree`) — handed `{ t }` as before, a client reference
  // would serialize the whole dictionary as a prop, a number that measures nothing.
  const t = dict.sw;
  const before = h(RoutePick as never, {
    routes: { "/updown": drawnTree(h(UpDownGhost as never), "sw"), "/positions": h(TicketsGhost as never, { t }),
      "/updown/history": drawnTree(h(UpDownHistoryGhost as never, { journeyHead: h(TicketsHeadGhost as never, { t }) }), "sw"),
      "/wallet/deposit": drawnTree(h(DepositGhost as never), "sw"), "/wallet/deposit/return": drawnTree(h(DepositReturnLoading as never), "sw") },
    patterns: [["^/markets/[^/]+$", drawnTree(h(MarketDetailLoading as never), "sw")]], other: null,
  } as never);
  const beforeJson = j(await flight(before, new Set()));
  ok(`2.6′ CONTROL · the same serializer on the server-drawn shape (six of the nine ghosts — the home's, the hub's and the spinner left out): ${Buffer.byteLength(beforeJson)} B, every node of every ghost written out — the cost 2.6 holds gone`,
    Buffer.byteLength(beforeJson) > 10_000 && Buffer.byteLength(beforeJson) < 40_000 && GHOST_MARKUP.test(beforeJson), String(Buffer.byteLength(beforeJson)));
  // The classic reader: the box, unchanged, and no ghost reference at all.
  REQ.journey = false;
  const classicNamed = new Set<string>();
  const classic = j(await flight(await RootLoading(), classicNamed));
  REQ.journey = true;
  ok("2.7 · a classic reader is drawn the classic box as before (the brand's SectionLoader in the 1280 column), and no ghost reference rides in its payload",
    classic.includes("mx-auto max-w-[1280px] px-3 lg:px-6 py-10") && [...classicNamed].every((r) => r.startsWith("components/brand.tsx#")) && !classic.includes("route-ghost"), classic.slice(0, 200));
}

/* Every ghost, in every language, on React's server renderer — inside the providers the root layout gives it. */
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
const inApp = (path: string, l: Locale, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l }, el as never))));
const ghostAt = (path: string, l: Locale) => inApp(path, l, h(JourneyRouteGhost as never, { rails: RAILS }));
{
  // [path, what that page's ghost shows, read in the reader's language]
  const PAGES: Array<[string, (l: Locale) => string]> = [
    ["/", () => 'class="kp-hero"'],
    ["/updown", (l) => dict[l].market.udStreaming],
    ["/positions", (l) => dict[l].journey.tabTickets],
    ["/account", (l) => `>${dict[l].journey.tabAccount}</h1>`],
    ["/updown/history", (l) => dict[l].journey.tabTickets],
    // ⚠️ MOVED IN ROUND 5 (R5-G, G-1): a journey reader's deposit screen names itself as its doors do, "Weka pesa"
    // (`journey.depositAction`, `money-names.ts`) — so its ghost's h1 does; it read "Amana" (`common.deposit`) in Swahili.
    ["/wallet/deposit", (l) => `>${dict[l].journey.depositAction}</h1>`],
    // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-K): the provider's return ghost draws the page's bands now — the hero, the
    // receipt's rows, the footnote — not the centred card; its footnote is the page's sentence, set and not shown.
    ["/wallet/deposit/return", (l) => dict[l].wallet.returnFootnote],
    ["/markets/mkt_any", () => "lg:grid-cols-[1fr_360px]"],
    ["/help", () => 'role="status"'],
  ];
  const wrong: string[] = [];
  for (const [path, mark] of PAGES) for (const l of LOCALES) {
    try { const html = ghostAt(path, l); if (!html.includes(mark(l))) wrong.push(`${path} ${l}: no ${mark(l)}`); }
    catch (e) { wrong.push(`${path} ${l}: THREW ${String(e).slice(0, 120)}`); }
  }
  ok(`2.8 · every ghost renders on React's server renderer, in sw, en and zh, inside the root layout's providers, and shows its own page in that language (${PAGES.length} paths × 3) — no throw (G2: it stands in the shell)`,
    wrong.length === 0, wrong.join(" | "));
  const homeWords = LOCALES.map((l) => ghostAt("/", l).includes(dict[l].home.heroLedeAct));
  ok("2.8′ CONTROL · the words follow the provider's language, not the server's: the home ghost's lede in each of the three", homeWords.every(Boolean), j(homeWords));
  const railsShown = RAILS.every((r) => ghostAt("/", "sw").includes(r));
  ok(`2.9 · the home ghost's trust rows name the rails it is handed (${RAILS.join(", ")})`, railsShown);
}
{
  // ONE DRAWING: each page's loading file (RUN, as Next runs it for that page) and the root ghost at that page's address
  // write the same bytes, in every language.
  const load = (p: string) => (req(p) as { default: () => unknown }).default;
  const CASES: Array<[string, string]> = [
    ["/updown", "../src/app/updown/loading.tsx"],
    ["/updown/history", "../src/app/updown/history/loading.tsx"],
    ["/wallet/deposit", "../src/app/wallet/deposit/loading.tsx"],
    ["/wallet/deposit/return", "../src/app/wallet/deposit/return/loading.tsx"],
    ["/markets/mkt_any", "../src/app/markets/[id]/loading.tsx"],
    ["/positions", "../src/app/positions/loading.tsx"],
  ];
  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-H, G-2): a journey reader's /positions and /updown/history loading files hand back
  // the journey's own binding pinned to their page (`at`), which a browser draws as `JourneyRouteGhost` once its chunk
  // is in — drawn here as what it binds (2.10″ holds that it is that binding, and that page).
  const asDrawn = (el: unknown) => {
    const e = el as { type?: unknown; props?: Record<string, unknown> };
    return e && e.type === LazyJourneyRouteGhost ? h(JourneyRouteGhost as never, e.props as never) : el;
  };
  const differ: string[] = [], pinned: string[] = [];
  for (const [path, file] of CASES) for (const l of LOCALES) {
    REQ.locale = l; REQ.path = path; REQ.journey = true;
    const el = await load(file)() as { type?: unknown; props?: { at?: string } };
    if (el.type === LazyJourneyRouteGhost) pinned.push(`${path}=${el.props?.at}`);
    const own = inApp(path, l, asDrawn(el));
    if (own !== ghostAt(path, l)) differ.push(`${path} ${l}`);
  }
  ok(`2.10 · one drawing: each page's own loading file, RUN for a journey reader, and the root ghost at its address write the same bytes (${CASES.length} pages × 3 languages)`,
    differ.length === 0, differ.join(", "));
  ok("2.10″ · …and where a journey reader's picture differs from a classic reader's (/positions, /updown/history) the loading file hands back the journey's own binding pinned to its own page — in every language",
    j([...new Set(pinned)].sort()) === j(["/positions=/positions", "/updown/history=/updown/history"]), j([...new Set(pinned)]));
  REQ.locale = "sw"; REQ.journey = false;
  const classicHistory = inApp("/updown/history", "sw", await load("../src/app/updown/history/loading.tsx")());
  REQ.journey = true;
  ok("2.10′ CONTROL · a classic reader's /updown/history ghost (today's two head lines) is NOT the journey's — so 2.10's equality is the drawing's, not a blank",
    classicHistory !== ghostAt("/updown/history", "sw") && !classicHistory.includes(dict.sw.journey.tabTickets));
}

/* ══ §3 · G2 · AN ERROR IN THE SHELL'S BARE PARTS ═══════════════════════════════════════════════════════════════════ */
section("3 · G2 · a server render error in a part with no boundary of its own fails the document — measured, and said where it lives");
{
  const R = req("next/dist/compiled/react") as typeof import("react");
  const { renderToPipeableStream: fizz } = req("next/dist/compiled/react-dom/server.node.js") as typeof import("react-dom/server");
  const Boom = (): never => { throw new Error("a part threw on the server"); };
  /** A page still being read when the shell is sent (a fresh pending read for each document). */
  const pendingPage = () => {
    let ready = false, go = () => undefined as void;
    const wait = new Promise<void>((r) => { go = () => { ready = true; r(); }; });
    return { Page: () => { if (!ready) throw wait; return R.createElement("main", null, "page"); }, go };
  };
  const run = (make: (Page: () => unknown) => unknown) => new Promise<string[]>((resolve) => {
    const { Page, go } = pendingPage();
    const events: string[] = [];
    const sink = new Writable({ write(_c, _e, cb) { cb(); } });
    const s = fizz(make(Page) as never, {
      onShellReady() { events.push("shell"); s.pipe(sink); },
      onShellError() { events.push("shell-error"); },
      onError() { events.push("error"); },
    });
    setTimeout(go, 20);
    setTimeout(() => resolve(events), 120);
  });
  const html = (...kids: unknown[]) => R.createElement("html", null, R.createElement("body", null, ...(kids as never[])));
  const bare = await run((Page) => html(R.createElement(Boom), R.createElement(R.Suspense, { fallback: R.createElement("div", null, "ghost") }, R.createElement(Page as never))));
  const boxed = await run((Page) => html(R.createElement(R.Suspense, { fallback: R.createElement("div", { className: "kp-jhdr" }) }, R.createElement(Boom)), R.createElement(R.Suspense, { fallback: null }, R.createElement(Page as never))));
  const inFallback = await run((Page) => html(R.createElement("header", null, "bar"), R.createElement(R.Suspense, { fallback: R.createElement(Boom) }, R.createElement(Page as never))));
  ok("3.1 · on the app's copy of React's server renderer: a throw in a part with NO boundary ends the shell (the document fails); in the root loading fallback — where the ghost stands — it ends the shell too",
    bare.includes("shell-error") && !bare.includes("shell") && inFallback.includes("shell-error") && !inFallback.includes("shell"), j({ bare, inFallback }));
  ok("3.1′ CONTROL · the same throw inside a boundary of its own is contained: the shell is sent, the part drawn in the browser", boxed.includes("shell") && !boxed.includes("shell-error"), j(boxed));
}
{
  const shell = raw("src/components/layout/app-shell.tsx"), ghost = raw(GHOST);
  ok("3.2 · it is said where it lives: AppShell's note at the journey's header and tabs, and the ghost's own note, name the uncontained error, why no boundary is added (E36), and that neither reads anything to throw on",
    shell.includes("A SERVER RENDER ERROR IN EITHER PART IS NO LONGER CONTAINED (round 5, review G2)") && shell.includes("would outline the part behind the shell again (E36)")
      && ghost.includes("AND A THROW HERE STILL FAILS THE DOCUMENT (review G2)"));
}

/* Every source file, and each one's text with its comments out — read once, for the two census sections below. */
const SRC_FILES: string[] = [];
{
  const walkSrc = (d: string) => { for (const n of readdirSync(d)) { const p = posix.join(d, n); if (statSync(p).isDirectory()) walkSrc(p); else if (/\.(tsx?|mts)$/.test(n)) SRC_FILES.push(p); } };
  walkSrc("src");
}
const srcText = new Map<string, string>();
const srcCode = (p: string) => { if (!srcText.has(p)) srcText.set(p, code(p)); return srcText.get(p)!; };

/* ══ §4 · G1'S SIBLING · THE NOT-FOUND ELEMENTS ═════════════════════════════════════════════════════════════════════ */
section("4 · G1's sibling · the not-found element every payload carries is the view's reference and its words, not the page");
const NF_ROUTES: Array<[string, string]> = [["root", "src/app/not-found.tsx"], ["market", "src/app/markets/[id]/not-found.tsx"], ["proposal", "src/app/proposals/[id]/not-found.tsx"]];
const NF_VIEW = "src/components/ui/not-found-view.tsx", NF_WORDS = "src/components/ui/not-found-words.ts";
/** The view's own nodes, as Flight writes them: its frame's classes, its wave, its glyphs' svg and paths, its nav. */
const NF_MARKUP = /kp-nf-topo|kp-shortpage|"svg"|"path"|"nav"/;
{
  // Each segment hands its not-found element to its router (create-component-tree.js `notFound`): the root's rides in every
  // payload rendered from the root — each document, each refresh — and the question's in every question page's.
  const pages = NF_ROUTES.map(([name, p]) => [name, (req(`../${p}`) as { default: () => Promise<unknown> }).default] as const);
  const { NotFoundView } = req(`../${NF_VIEW}`) as { NotFoundView: unknown };
  collectClientRefs();
  const sizes: string[] = [], wrong: string[] = [];
  for (const [name, NotFound] of pages) for (const l of LOCALES) {
    REQ.locale = l;
    const named = new Set<string>();
    let json = "";
    // A throw is a finding, not a crash: the view drawn on the server again calls its wave's useId with no renderer.
    try { json = j(await flight(await NotFound(), named)); }
    catch (e) { wrong.push(`${name} ${l}: THREW ${String(e).slice(0, 100)}`); continue; }
    const b = Buffer.byteLength(json);
    sizes.push(`${name} ${l} ${b}`);
    if (b >= 600 || NF_MARKUP.test(json) || j([...named]) !== j(["components/ui/not-found-view.tsx#NotFoundView"])) wrong.push(`${name} ${l}: ${b} B ${[...named].join(",")}`);
  }
  REQ.locale = "sw";
  ok(`4.1 · RUN in sw, en and zh, each not-found element is ONE reference, the view's, and the words it is handed — under 600 B (${sizes.join(", ")} B; drawn on the server it was 5,938 / 5,923 / 6,379)`,
    wrong.length === 0, wrong.join(" | "));
  // CONTROL — the same serializer with the view drawn on the server, as it was before round 5 (its client parts stay
  // references: the mark, the logo, next/link): every node of the page written out.
  const link = req("next/link") as { default?: unknown };
  const LinkComp = link.default ?? link;
  const viewRef = clientRefs.get(NotFoundView);
  const Rx = React as unknown as { useId: () => string };
  const realUseId = Rx.useId;
  clientRefs.delete(NotFoundView);
  clientRefs.set(LinkComp, "next/link#default");
  Rx.useId = () => "_S_0_"; // the wave's pattern id: what a server component's useId writes (outside a renderer it has none)
  let drawn = "";
  try { drawn = j(await flight(await pages[0][1](), new Set())); }
  finally { Rx.useId = realUseId; if (viewRef) clientRefs.set(NotFoundView, viewRef); clientRefs.delete(LinkComp); }
  ok(`4.1′ CONTROL · the same serializer on round 4's shape (the view drawn on the server): ${Buffer.byteLength(drawn)} B, the page's every node written out — the cost 4.1 holds gone`,
    Buffer.byteLength(drawn) > 5000 && NF_MARKUP.test(drawn), String(Buffer.byteLength(drawn)));
}
{
  const view = code(NF_VIEW), words = code(NF_WORDS);
  const shapes = hasDirective(view, "use client") && !hasDirective(words, "use client") && !hasDirective(words, "use server")
    && /export const NOT_FOUND_WORDS = \{/.test(words) && /export const notFoundTitle = /.test(words)
    && !/export const (?:NOT_FOUND_WORDS|notFoundTitle)\b/.test(view) && view.includes('import type { NotFoundWords } from "@/components/ui/not-found-words";');
  const routes = NF_ROUTES.every(([, p]) => {
    const c = code(p);
    return c.includes('import { NotFoundView } from "@/components/ui/not-found-view";') && /import \{ NOT_FOUND_WORDS(?:, notFoundTitle)? \} from "@\/components\/ui\/not-found-words";/.test(c);
  });
  ok("4.2 · the view is client code and its words and title are data beside it (not-found-words.ts, no directive): the three not-found files take the view by its component name and the words from the data module",
    shapes && routes);
}
{
  // ⛔ THE TRAP THE SPLIT AVOIDS, FOR EVERY FILE. On the server a "use client" module's exports are references: a component
  // can be rendered, but a constant read out of one or a function called from one throws at render — and a test run in
  // Node never sees it (no bundler, no directive). So walk the SERVER graph — every src/app module without "use client",
  // then every value import of a module without it — and hold each import of a client module to its components.
  const resolveSrc = (from: string, spec: string) => {
    const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? posix.join(posix.dirname(from), spec) : null;
    return base === null ? null : SRC_EXTS.concat([""]).map((e) => base + e).find((p) => existsSync(p) && statSync(p).isFile()) ?? null;
  };
  const component = (n: string) => /^[A-Z][a-z0-9]/.test(n);
  const serverGraph = (text: (p: string) => string) => {
    const isClientFile = (p: string) => hasDirective(text(p), "use client");
    const stack = SRC_FILES.filter((p) => p.startsWith("src/app/") && !isClientFile(p));
    const roots = stack.length, seen = new Set<string>(), bad: string[] = [], edges: string[] = [];
    while (stack.length) {
      const f = stack.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      const s = text(f);
      for (const m of s.matchAll(/^\s*(?:import|export)\s+(?!type\s)([\s\S]*?)\s+from\s+["']([^"']+)["']/gm)) {
        const to = resolveSrc(f, m[2]);
        if (!to) continue;
        const clause = m[1].trim(), names: string[] = [];
        const def = /^([A-Za-z_$][\w$]*)\s*(?:,|$)/.exec(clause);
        if (def) names.push(def[1]);
        const braces = /\{([^}]*)\}/.exec(clause);
        if (braces) for (const part of braces[1].split(",")) { const n = part.trim(); if (n && !/^type\s/.test(n)) names.push(n.split(/\s+as\s+/)[0].trim()); }
        if (/\*/.test(clause)) names.push(clause);
        if (isClientFile(to)) {
          edges.push(`${f} → ${to}: ${names.join(", ")}`);
          const wrongNames = names.filter((n) => !component(n));
          if (wrongNames.length) bad.push(`${f} → ${to}: ${wrongNames.join(", ")}`);
        } else stack.push(to);
      }
      for (const m of s.matchAll(/^\s*import\s+["']([^"']+)["']/gm)) { const to = resolveSrc(f, m[1]); if (to && !isClientFile(to)) stack.push(to); }
    }
    return { roots, walked: seen.size, bad, edges };
  };
  const now = serverGraph(srcCode);
  const sees = now.edges.includes("src/app/not-found.tsx → src/components/ui/not-found-view.tsx: NotFoundView");
  ok(`4.3 · no server module takes anything but a component from a client module — the server graph walked from ${now.roots} src/app entries through ${now.walked} modules, ${now.edges.length} imports of client modules`,
    now.bad.length === 0 && now.roots > 300 && now.walked > 600 && sees, now.bad.join(" | ") || `sees the root not-found's import: ${sees}`);
  const OLD_IMPORT = 'import { NOT_FOUND_WORDS, NotFoundView, notFoundTitle } from "@/components/ui/not-found-view";';
  const planted = serverGraph((p) => (p === "src/app/not-found.tsx"
    ? srcCode(p).replace('import { NotFoundView } from "@/components/ui/not-found-view";', OLD_IMPORT).replace('import { NOT_FOUND_WORDS, notFoundTitle } from "@/components/ui/not-found-words";', "")
    : srcCode(p)));
  ok("4.3′ PLANT · the root not-found reading its words and title out of the (client) view again — round 4's import — is reported",
    j(planted.bad) === j(["src/app/not-found.tsx → src/components/ui/not-found-view.tsx: NOT_FOUND_WORDS, notFoundTitle"]), j(planted.bad));
}

/* ══ §5 · F4'S PATTERN · A STORE READ BY WHAT STANDS OUTSIDE THE PAGE ═══════════════════════════════════════════════ */
section("5 · F4's pattern · every useSyncExternalStore reader is classified, and a page that is left leaves the document");
{
  // F4 was a page's DOM mark read through useSyncExternalStore by chrome OUTSIDE the page: while the router drew the next
  // page the old mark was still in the document, and its going was announced after the paint. Every reader of the same
  // shape is named here with why it is, or is not, that defect; a new one is reported until it is classified.
  const READERS: Record<string, string> = {
    "src/lib/not-found-mark.ts": "a page's mark read by the chrome — answered for the path being drawn, arrival announced in a layout effect (F4)",
    // ⚠️ Re-classified in round 5's follow-up (R5-H, G-3): the refresh that flips the server's answer is answered before its paint.
    "src/lib/journey/journey-on.ts": "the shell's mark and flag, layout-scoped: no soft navigation re-runs the root layout, and a refresh that swaps the shell raises the flag in the layout phase of the commit that draws the journey shell and announces its lowering once the commit that removes it is done — before either paint (R5-H, G-3; test:visual-pass-r5h §3)",
    "src/lib/invitation-slot.ts": "claims read beside the claimant's own in-render eligibility: a stale store can delay a card a frame, never show two",
    "src/components/ui/unsaved-changes.tsx": "a registry whose writers and painter all stand in one page, and leave it together",
    "src/components/layout/nav-more.tsx": "the reader's density (<html data-density>), not a page's state",
    "src/components/journey/account/card-size-row.tsx": "the reader's density, not a page's state",
    "src/lib/analytics-consent.ts": "the reader's consent, not a page's state",
    "src/lib/journey/one-poller.ts": "a media query, not a page's state",
    "src/lib/journey/use-unread-count.ts": "the unread feed, not a page's state",
    // Came in with main (S14's U47b-2, 4116d4be) after this suite was written; classified at the merge.
    "src/components/admin/admin-crumbs.tsx": "a record page's registered name for its last crumb, read by the admin header KEYED BY THE PATH BEING DRAWN (crumbNames.get(lastSegmentOf(pathname))): a page that is left cannot name the next one — F4's own principle, already",
  };
  const readers = (text: (p: string) => string) => SRC_FILES.filter((p) => /\buseSyncExternalStore\s*(?:<[^>]*>)?\s*\(/.test(text(p))).sort();
  const now = readers(srcCode);
  ok(`5.1 · every useSyncExternalStore reader in src (${now.length}) is classified: ${Object.entries(READERS).map(([f, why]) => `${f.split("/").pop()} — ${why}`).join("; ")}`,
    j(now) === j(Object.keys(READERS).sort()), j(now));
  const planted = readers((p) => (p === "src/lib/journey/header-state.ts" ? `${srcCode(p)}\nexport const useMarkShown = () => useSyncExternalStore(() => () => {}, () => document.getElementById("kp-x") !== null, () => false);` : srcCode(p)));
  ok("5.1′ PLANT · a new reader (a DOM mark in a module no one has classified) is reported", j(planted) !== j(Object.keys(READERS).sort()) && planted.includes("src/lib/journey/header-state.ts"));
}
{
  // Both F4's answer and F5's CSS assume that a page that is left LEAVES the document in the commit that draws the next
  // one. Next 16 keeps left pages mounted in a hidden <Activity> only with `cacheComponents` on: then the old not-found's
  // span would stay, `:root:has(#kp-not-found)` would rest the next page's tab, and `getElementById` could find the old span.
  const cfg = code("next.config.ts");
  const bf = raw("node_modules/next/dist/client/components/bfcache-state-manager.js"), lr = raw("node_modules/next/dist/client/components/layout-router.js");
  const leaves = (c: string) => !/\bcacheComponents\b/.test(c)
    && bf.includes("const MAX_BF_CACHE_ENTRIES = process.env.__NEXT_CACHE_COMPONENTS ? 3 : 1;")
    && lr.includes("if (process.env.__NEXT_CACHE_COMPONENTS) {") && lr.includes("(0, _jsxruntime.jsx)(_react.Activity, {");
  ok("5.2 · a page that is left leaves the document: next.config turns no cacheComponents on, and without it Next keeps ONE router entry and wraps no segment in a hidden <Activity> (bfcache-state-manager.js, layout-router.js) — read from the framework, so an upgrade that changes it is noticed",
    leaves(cfg));
  ok("5.2′ PLANT · cacheComponents turned on is reported", !leaves(cfg.replace("experimental: {", "cacheComponents: true,\n  experimental: {")));
}

console.log(`\nvisual-pass-r5d: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
