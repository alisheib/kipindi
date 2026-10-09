/**
 * ROUND 5 OF THE VISUAL PASS, FOLLOW-UP HELPER H (2026-10-09) — the loading ghosts out of every refresh, the money books'
 * bar ghost, and the journey flag before the first paint; each fix held beside a control or a plant that proves it can fail.
 *
 *   npx tsx scripts/visual-pass-r5h.test.mts        (npm run test:visual-pass-r5h)
 *
 * The owner's rule (Ali, 2026-10-08/09): only perfect visual and logical results, and one convention per pattern.
 *   §1 G-2 · every loading file a player can reach sends a REFERENCE, not a drawing: the sweep of every loading.tsx in
 *          src/app (the player's, the console's, the opt-out page's); each player file RUN for both kinds of reader in
 *          three languages and serialized as Flight writes it (a "use client" export is a reference with its props); the
 *          drawings' words the client dictionary's, at the provider's language, which is the cookie the server reads; the
 *          server's answers (the journey, the bonus programme) handed in as props; no `next/dynamic` in a segment's ghost
 *   §2 G-2 · the journey's pictures (VODACOM-PLAN §0h point 21): picked on the server, drawn by the journey's route ghost
 *          pinned to the page, its code loaded by no server file; the classic drawings load nothing of the journey's
 *   §3 G-3 · the phases: React 19.2's own commit order, read from the framework; the journey flag and the not-found mark
 *          replayed in a stand-in document in that order, R5-D's passive phases as the controls; every file that writes a
 *          DOM mark classified
 *   §4 G-2b · the money books' bar ghost: /wallet's ghost in the page's band order with the page's door and section, the
 *          bar in the bar's own classes and words, its pills the kit pill's box, and its rows wrapping where the page's do
 *          (measured from the repo's own fonts)
 *   §5 G-2b's sweep · every other ghost read band by band against its page (S/r5h's three audits); the bands the classes
 *          say exactly are fixed and held here against the page's own text — the back link's 44px box everywhere a page
 *          opens on one, /results' wrappers, /markets' count line, /live's hero padding, the receipts row, /profile's
 *          gap, /agent's and /updown's own headers, /updown's phone trigger, durations and BoardViz, the round's `lg`
 *          columns and order, the question's header bands, Tiketi zangu's rail hook, the round history's band and bar;
 *          the rest (rebuilds, data- or locale-dependent heights) are listed in the report, not guessed here
 * Where an older suite owns a pin this work moved, the pin moved there, with its reason (`test:visual-pass-r5d` §2,
 * `test:visual-pass-r4j` §3 §5, `test:journey-tickets` §10, `test:journey-shell` §5 §12, r4c 1.6, r5b 2.4 9.3 9.4,
 * `test:withdrawn-features` §5f, `test:design-frozen`).
 * ⛔ It READS, builds and renders in memory; it writes nothing. The on-disk mutation proof is S/r5h/mutation-r5h.mjs.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { posix } from "node:path";
import { createRequire } from "node:module";
import NodeModule from "node:module";
import { decomment, decommentCss } from "./lib/decomment.mts";

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
const walk = (d: string, out: string[] = []): string[] => {
  for (const n of readdirSync(d)) { const p = posix.join(d, n); if (statSync(p).isDirectory()) walk(p, out); else out.push(p); }
  return out;
};

/* ── the world the server components run in: the request's language, address and journey answer, stubbed ─────────── */
type Locale = "sw" | "en" | "zh";
const LOCALES: Locale[] = ["sw", "en", "zh"];
const REQ = { locale: "sw" as Locale, path: "/", journey: true };
const nextHeaders = req("next/headers") as { cookies: unknown; headers: unknown };
nextHeaders.cookies = async () => ({ get: (k: string) => (k === "kp-locale" ? { value: REQ.locale } : undefined), getAll: () => [], has: () => false });
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
const { I18nProvider } = req("../src/lib/i18n.tsx") as { I18nProvider: (p: { initial: Locale; children: unknown }) => unknown };
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime") as { AppRouterContext: import("react").Context<unknown> };
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime") as { PathnameContext: import("react").Context<string | null> };
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };
/** An element rendered on React's server renderer inside the root layout's providers, at an address and a language. */
const inApp = (path: string, l: Locale, el: unknown) =>
  renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: path }, h(I18nProvider as never, { initial: l } as never, el as never))));

/* ── every loading file in src/app, and the modules the checks load ───────────────────────────────────────────────── */
const ALL_LOADING = walk("src/app").filter((f) => f.endsWith("/loading.tsx")).sort();
const ROOT_LOADING = "src/app/loading.tsx";
/** The two kinds of loading file left as they are, by name, each with its reason (G-2's sweep). */
const LEFT_OUT: Record<string, string> = {
  "src/app/s/[token]/loading.tsx": "the SMS opt-out page: outside the app — AppShell draws no chrome there, no link in the app leads to it, nothing polls or refreshes it — so its loading element rides the one document it is opened as, inline, once; a client chunk would add a script download to a one-visit page opened from an SMS on a slow phone, and its words come from a server module (`SENDER_IDENTITY`)",
};
const CONSOLE_REASON = "the officer console: staff only, behind its own layout and English-pinned provider (a drawing reading its words in the browser would change their language), never polled (it refreshes after an officer's action, not on a beat), and held by its own lane's suites";
const ADMIN = ALL_LOADING.filter((f) => f.startsWith("src/app/admin/"));
const PLAYER = ALL_LOADING.filter((f) => !f.startsWith("src/app/admin/") && !(f in LEFT_OUT) && f !== ROOT_LOADING);
const mods = new Map<string, unknown>(PLAYER.map((f) => [f, (req(`../${f}`) as { default: unknown }).default]));
const { LazyJourneyRouteGhost } = req("../src/components/journey/route-ghost-lazy.tsx") as { LazyJourneyRouteGhost: unknown };
const { JourneyRouteGhost } = req("../src/components/journey/route-ghost.tsx") as { JourneyRouteGhost: unknown };
const { PositionsGhost } = req("../src/app/positions/positions-ghost.tsx") as { PositionsGhost: unknown };
const { UpDownHistoryGhost } = req("../src/app/updown/history/history-ghost.tsx") as { UpDownHistoryGhost: unknown };
const { WalletGhost } = req("../src/app/wallet/wallet-ghost.tsx") as { WalletGhost: unknown };
const { heroRailNames } = req("../src/lib/server/payout-rails.ts") as { heroRailNames: (p: null) => string[] };
const RAILS = heroRailNames(null);

/** Every "use client" export loaded so far — what Flight writes as a reference (`$L<n>`) with its props. */
const clientRefs = new Map<unknown, string>();
for (const [file, mod] of Object.entries(req.cache as Record<string, { exports?: Record<string, unknown> }>)) {
  if (!/[\\/]src[\\/]/.test(file) || !existsSync(file)) continue;
  if (!hasDirective(decomment(readFileSync(file, "utf8").replace(/^﻿/, "")), "use client")) continue;
  for (const [name, v] of Object.entries(mod.exports ?? {})) {
    if (typeof v === "function" || (v !== null && typeof v === "object" && "$$typeof" in (v as object))) clientRefs.set(v, `${file.split(/[\\/]src[\\/]/)[1].replace(/\\/g, "/")}#${name}`);
  }
}
/** The element as Next writes it into a payload (R5-D's serializer): a client export a reference with its props, a server
 *  component replaced by what it returns, a host element ["$", tag, key, props]. */
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
/** What a client drawing returns, captured inside a React render (its `useT` needs one): the tree a SERVER component
 *  drawing it would have written — the shape these files had before R5-H. */
function drawnTree(el: unknown, l: Locale): unknown {
  const box: { tree?: unknown } = {};
  const { type, props } = el as { type: (p: unknown) => unknown; props: unknown };
  const Capture = () => { box.tree = type(props); return null; };
  inApp("/", l, h(Capture));
  return box.tree;
}
/** The tree with every SERVER component run (awaited) and the journey's lazy binding drawn as what it binds; client
 *  components kept for React — so react-dom/server draws what the server's HTML pass and the browser draw. */
async function runServer(node: unknown): Promise<unknown> {
  if (node === null || node === undefined || typeof node !== "object") return node;
  if (Array.isArray(node)) return Promise.all(node.map(runServer));
  const el = node as { $$typeof?: symbol; type?: unknown; key?: string | null; props?: Record<string, unknown> };
  if (el.$$typeof !== Symbol.for("react.transitional.element")) return node;
  const type = el.type === LazyJourneyRouteGhost ? JourneyRouteGhost : el.type;
  if (typeof type === "function" && !clientRefs.has(type)) return runServer(await (type as (p: unknown) => unknown)(el.props));
  const props: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(el.props ?? {})) props[k] = k === "children" || (v && typeof v === "object" && (v as { $$typeof?: symbol }).$$typeof) ? await runServer(v) : v;
  return h(type as never, { ...props, key: el.key } as never);
}
const routeOf = (f: string) => ("/" + f.slice("src/app/".length).replace(/\/?loading\.tsx$/, "")).replace("[id]", "rec_any").replace("[roundId]", "rnd_any").replace("[token]", "tok_any").replace(/\/$/, "") || "/";

/* ══ §1 · G-2 · A LOADING FILE SENDS A REFERENCE, NOT A DRAWING ═══════════════════════════════════════════════════════ */
section("1 · G-2 · every player loading file is a reference and the server's answers — never the drawn tree");
{
  ok(`1.1 · the sweep: ${ALL_LOADING.length} loading files in src/app — the root's (R5-D's binding), ${PLAYER.length} a player reaches (each held below), ${ADMIN.length} of the console's (left: ${CONSOLE_REASON}), and the opt-out page's (left: ${LEFT_OUT["src/app/s/[token]/loading.tsx"].slice(0, 60)}…)`,
    ALL_LOADING.includes(ROOT_LOADING) && PLAYER.length >= 37 && ADMIN.length >= 60 && ADMIN.every((f) => f.startsWith("src/app/admin/")) && Object.keys(LEFT_OUT).every((f) => ALL_LOADING.includes(f)),
    j({ all: ALL_LOADING.length, player: PLAYER.length, admin: ADMIN.length }));
}
{
  const HOST = /\["\$","[a-z]/;
  const sizes: Array<[string, number]> = [], drawn: string[] = [], refs = new Set<string>();
  for (const f of PLAYER) for (const l of LOCALES) for (const journey of [true, false]) {
    REQ.locale = l; REQ.path = routeOf(f); REQ.journey = journey;
    const named = new Set<string>();
    let json = "";
    try { json = j(await flight(h(mods.get(f) as never), named)); } catch (e) { drawn.push(`${f} ${l}: THREW ${String(e).slice(0, 80)}`); continue; }
    named.forEach((r) => refs.add(r));
    sizes.push([`${f} ${l}${journey ? " journey" : ""}`, Buffer.byteLength(json)]);
    if (HOST.test(json) || named.size === 0 || Buffer.byteLength(json) > 128) drawn.push(`${f} ${l} ${journey ? "journey" : "classic"}: ${Buffer.byteLength(json)} B ${json.slice(0, 80)}`);
  }
  const worst = sizes.reduce((a, b) => (b[1] > a[1] ? b : a), ["", 0] as [string, number]);
  ok(`1.2 · RUN for a journey and a classic reader in sw, en and zh, each of the ${PLAYER.length} player loading elements is client references and their props — no host element, at most ${worst[1]} B of Flight JSON (${worst[0]}), under 128 every time; ${refs.size} client modules named`,
    drawn.length === 0 && sizes.length === PLAYER.length * 6, drawn.slice(0, 4).join(" | "));
  // CONTROL — the same serializer on the shape these files had: the drawings as SERVER components wrote them.
  REQ.locale = "sw"; REQ.journey = false;
  const receipts = mods.get("src/app/wallet/receipts/loading.tsx");
  const before = j(await flight(drawnTree(h(receipts as never), "sw"), new Set()));
  const wallet = j(await flight(drawnTree(h(WalletGhost as never, { bonusLive: false } as never), "sw"), new Set()));
  ok(`1.2′ CONTROL · the same serializer on the server-drawn shape: /wallet/receipts' drawing ${Buffer.byteLength(before)} B and /wallet's ${Buffer.byteLength(wallet)} B, every node written out — in every refresh of /wallet/receipts both (R5-H measured 16,868 → 541 B per refresh with the root's two elements)`,
    Buffer.byteLength(before) > 5_000 && Buffer.byteLength(wallet) > 5_000 && HOST.test(before), `${Buffer.byteLength(before)} / ${Buffer.byteLength(wallet)}`);
}
/* The modules a file loads at runtime, resolved in src (value imports, side-effect imports, dynamic imports). */
const SRC_EXTS = [".ts", ".tsx", "/index.ts", "/index.tsx"];
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
/** Every module reached from `entry` (through src), and what among them a browser cannot load or must not. */
function clientGraph(entry: string, text: (p: string) => string = raw): { reached: string[]; bad: string[] } {
  const seen = new Set<string>(); const bad: string[] = [];
  const visit = (f: string) => {
    if (seen.has(f)) return; seen.add(f);
    for (const { spec, to } of loads(f, text)) {
      if (/^(?:next\/headers|next\/server|server-only|node:|@prisma\/)/.test(spec) || spec.startsWith("@/lib/server/") || spec === "@/lib/i18n-server" || spec === "@/lib/feature-state") bad.push(`${f} → ${spec}`);
      if (to) visit(to);
    }
  };
  visit(entry);
  return { reached: [...seen], bad };
}
const isClientFile = (p: string, text: (p: string) => string = raw) => hasDirective(decomment(text(p)), "use client");
/** For a player loading file: the drawings it renders (itself when it is client code; else the client modules it loads). */
const drawingsOf = (f: string, text: (p: string) => string = raw) => (isClientFile(f, text) ? [f]
  : loads(f, text).map((x) => x.to).filter((to): to is string => to !== null && isClientFile(to, text) && !to.endsWith("route-ghost-lazy.tsx")));
/** The server's own loading files may ask the server these, and nothing else. */
const SERVER_ASKS = ["@/lib/server/journey-preview", "@/lib/server/payout-rails", "@/lib/feature-state"];
function wordsCheck(text: (p: string) => string) {
  const wrong: string[] = [];
  for (const f of PLAYER) {
    const s = decomment(text(f));
    if (/\bgetServerT\(|\bcookies\(|\bheaders\(/.test(s) || /from\s+["'](?:@\/lib\/i18n-server|next\/headers)["']/.test(s)) wrong.push(`${f} reads the request itself`);
    if (!isClientFile(f, text)) for (const { spec, to } of loads(f, text)) if (to && !isClientFile(to, text) && !SERVER_ASKS.includes(spec)) wrong.push(`${f} → ${spec} (a server module: its tree would ride the payload)`);
    for (const d of drawingsOf(f, text)) for (const b of clientGraph(d, text).bad) wrong.push(b);
  }
  return wrong;
}
{
  const now = wordsCheck(raw);
  ok(`1.3 · the words are the browser's: no player loading file reads the request itself (getServerT, cookies, headers, i18n-server), a server loading file asks only ${SERVER_ASKS.join(", ")} and renders client drawings, and nothing a drawing loads is server code or the feature seam`,
    now.length === 0, now.slice(0, 4).join(" | "));
  const planted = wordsCheck((p) => (p === "src/app/positions/positions-ghost.tsx" ? raw(p).replace('import { useT } from "@/lib/i18n";', 'import { useT } from "@/lib/i18n";\nimport { getServerT } from "@/lib/i18n-server";') : raw(p)));
  ok("1.3′ PLANT · today's /positions picture reading the words on the server again (`getServerT` imported into the drawing) is reported", planted.some((w) => w.includes("@/lib/i18n-server")), planted.join(" | "));
  const plantedTree = wordsCheck((p) => (p === "src/app/updown/loading.tsx" ? raw(p).replace('import { UpDownGhost } from "./updown-ghost";', 'import { UpDownGhost } from "./updown-ghost";\nimport { PageContainer } from "@/components/layout/page-container";') : raw(p)));
  ok("1.3″ PLANT · a server loading file drawing a server component again (its tree back in every refresh) is reported", plantedTree.some((w) => w.includes("page-container")), plantedTree.join(" | "));
}
{
  // The bonus answer: asked on the server (feature-state reads the server's env), handed to the drawing as a boolean.
  const WalletLoading = mods.get("src/app/wallet/loading.tsx") as () => { type: unknown; props: { bonusLive: boolean } };
  const env = process.env.FEATURE_BONUS;
  const answers: Record<string, unknown> = {};
  for (const v of ["ACTIVE", "WITHDRAWN"]) { process.env.FEATURE_BONUS = v; const el = WalletLoading(); answers[v] = el.type === WalletGhost ? el.props.bonusLive : "not the drawing"; }
  if (env === undefined) delete process.env.FEATURE_BONUS; else process.env.FEATURE_BONUS = env;
  const two = inApp("/wallet", "sw", h(WalletGhost as never, { bonusLive: true } as never)), one = inApp("/wallet", "sw", h(WalletGhost as never, { bonusLive: false } as never));
  ok(`1.4 · /wallet's one server answer is handed in: RUN with the bonus programme forced on and off, the loading file renders the drawing with bonusLive ${j(answers)}; the drawing ghosts the second (royal) card only when told`,
    answers.ACTIVE === true && answers.WITHDRAWN === false && count(two, "mat-raised") === 1 && count(one, "mat-raised") === 0 && two.includes("lg:grid-cols-2") && !one.includes("lg:grid-cols-2"), j(answers));
  const clientImporters = walk("src").filter((p) => /\.tsx?$/.test(p) && isClientFile(p) && /from\s+["']@\/lib\/feature-state["']/.test(code(p)));
  ok("1.4′ · …and no client file in src imports the feature seam (its own rule: it reads the server's env)", clientImporters.length === 0, clientImporters.join(", "));
}
{
  // The first paint is the server's HTML, byte for byte: the provider's language IS the cookie the server read.
  const layout = code("src/app/layout.tsx"), theme = code("src/components/theme-provider.tsx"), serverT = code("src/lib/i18n-server.ts");
  const same = layout.includes('const lang = localeOrDefault(jar.get("kp-locale")?.value);') && layout.includes("<ThemeProvider initialLocale={lang}")
    && theme.includes("<I18nProvider initial={initialLocale ?? readInitialLocale()}>") && serverT.includes('const locale: Locale = localeOrDefault(jar.get("kp-locale")?.value);');
  ok("1.5 · the words a drawing reads in the browser are the server's: the root layout hands the provider the language it reads from the kp-locale cookie with `localeOrDefault`, the very expression `getServerT` used — so the transport moves no pixel (S/r5h/ghost-markup.cts, at the transport-only state: 222 of 234 renders byte-identical, the 12 others /wallet's and /wallet/receipts' G-2b bands alone; §4 and §5 then change the swept ghosts' bands on purpose)", same);
  // RUN: every player ghost in the three languages — the words follow the provider; a ghost without words does not change.
  // A ghost has words when one of its drawings reads the dictionary (`t.<section>.<key>`); the others draw none.
  const WORDLESS = new Set(PLAYER.filter((f) => !drawingsOf(f).some((d) => /\bt\.[a-z]\w*\.\w+/.test(code(d)))));
  const wrong: string[] = [];
  for (const f of PLAYER) for (const journey of [true, false]) {
    const html: string[] = [];
    for (const l of LOCALES) {
      REQ.locale = l; REQ.path = routeOf(f); REQ.journey = journey;
      try { html.push(inApp(routeOf(f), l, await runServer(h(mods.get(f) as never)))); } catch (e) { wrong.push(`${f} ${l}: THREW ${String(e).slice(0, 80)}`); }
    }
    const differ = new Set(html).size === 3;
    if (WORDLESS.has(f) ? new Set(html).size !== 1 : !differ) wrong.push(`${f} ${journey ? "journey" : "classic"}: ${new Set(html).size} distinct renders in 3 languages`);
  }
  ok(`1.6 · RUN on React's server renderer, every player ghost renders in sw, en and zh for both readers: the ${PLAYER.length - WORDLESS.size} with words draw them in the provider's language, the ${WORDLESS.size} without (${[...WORDLESS].map((f) => f.slice(8, -12)).join(", ")}) draw the same bytes in all three`,
    wrong.length === 0, wrong.slice(0, 4).join(" | "));
  const pinned: number[] = [];
  for (const f of PLAYER.filter((x) => !WORDLESS.has(x))) {
    const html = new Set<string>();
    for (const l of LOCALES) { REQ.locale = l; REQ.path = routeOf(f); REQ.journey = false; html.add(inApp(routeOf(f), "sw", await runServer(h(mods.get(f) as never)))); }
    pinned.push(html.size);
  }
  ok(`1.6′ CONTROL · the same ${pinned.length} ghosts with the provider held at one language, whatever the server's cookie says, draw one render each — so 1.6's difference is the provider's doing, not the server's`, pinned.length > 20 && pinned.every((n) => n === 1), j(pinned));
}
{
  // The transport: a plain client reference (Flight starts its chunk the moment a payload or a prefetch names it), never
  // next/dynamic, which waits for the render; only the journey's route ghost — a journey-only set — is a lazy chunk.
  const lazy = PLAYER.flatMap((f) => [f, ...drawingsOf(f)]).filter((p) => /\bdynamic\(|from\s+["']next\/dynamic["']|\bReact\.lazy\(|\blazy\(/.test(code(p)));
  ok("1.7 · no player loading file or segment drawing defers itself (no next/dynamic, no React lazy): the browser fetches a segment's drawing as soon as a payload or a link's prefetch names it", lazy.length === 0, lazy.join(", "));
}

/* ══ §2 · G-2 · THE JOURNEY'S PICTURES (§0h POINT 21) ════════════════════════════════════════════════════════════════ */
section("2 · G-2 · a journey reader is handed the journey's route ghost pinned to the page; a classic reader gets no journey code");
const PICKERS: Array<[string, string, unknown]> = [
  ["/positions", "src/app/positions/loading.tsx", PositionsGhost],
  ["/updown/history", "src/app/updown/history/loading.tsx", UpDownHistoryGhost],
];
{
  const wrong: string[] = [];
  for (const [page, f, classic] of PICKERS) for (const l of LOCALES) {
    REQ.locale = l; REQ.path = page;
    REQ.journey = true;
    const jEl = await (mods.get(f) as () => Promise<{ type: unknown; props: Record<string, unknown> }>)();
    if (jEl.type !== LazyJourneyRouteGhost || jEl.props.at !== page || j(jEl.props.rails) !== j(RAILS)) wrong.push(`${page} ${l} journey: ${j(jEl.props)}`);
    REQ.journey = false;
    const cEl = await (mods.get(f) as () => Promise<{ type: unknown; props: Record<string, unknown> }>)();
    if (cEl.type !== classic || j(cEl.props) !== "{}") wrong.push(`${page} ${l} classic: ${j(cEl.props)}`);
  }
  ok("2.1 · RUN: /positions' and /updown/history's loading files hand a journey reader the journey's route ghost pinned to their own page (`at`, with the rails), and everybody else today's drawing with no props — in every language",
    wrong.length === 0, wrong.join(" | "));
}
{
  const wrong: string[] = [];
  for (const [page] of PICKERS) for (const l of LOCALES) {
    const pinned = inApp(page, l, h(JourneyRouteGhost as never, { rails: RAILS, at: page } as never));
    const picked = inApp(page, l, h(JourneyRouteGhost as never, { rails: RAILS } as never));
    if (pinned !== picked) wrong.push(`${page} ${l}`);
  }
  ok("2.2 · the pinned picture is the one the root's ghost picks at that address — byte for byte, in every language (`test:visual-pass-r5d` 2.10 holds it against the loading file too)", wrong.length === 0, wrong.join(", "));
  const below = "/positions/performance";
  const pinnedBelow = inApp(below, "sw", h(JourneyRouteGhost as never, { rails: RAILS, at: "/positions" } as never));
  const pickedBelow = inApp(below, "sw", h(JourneyRouteGhost as never, { rails: RAILS } as never));
  ok(`2.2′ CONTROL · why it is pinned: /positions' boundary also stands over ${below} while a move there loads — pinned, Tiketi zangu's picture as before; picked by the address it would be the spinner`,
    pinnedBelow.includes(dict.sw.journey.tabTickets) && !pickedBelow.includes(dict.sw.journey.tabTickets) && pickedBelow.includes('role="status"'));
}
function journeyFree(text: (p: string) => string) {
  const wrong: string[] = [];
  for (const own of ["src/app/positions/positions-ghost.tsx", "src/app/updown/history/history-ghost.tsx"]) {
    for (const f of clientGraph(own, text).reached) if (f.startsWith("src/components/journey/")) wrong.push(`${own} reaches ${f}`);
  }
  const loaders = walk("src").filter((p) => /\.tsx?$/.test(p) && loads(p, text).some((x) => x.to === "src/components/journey/tickets/tickets-ghost.tsx"));
  if (j(loaders) !== j(["src/components/journey/route-ghost.tsx"])) wrong.push(`tickets-ghost loaded by ${loaders.join(", ")}`);
  return wrong;
}
{
  const now = journeyFree(raw);
  ok("2.3 · a classic reader is sent no script for the journey's picture: today's /positions and /updown/history drawings reach nothing under components/journey/, and Tiketi zangu's ghosts are loaded by the journey's route ghost alone (a server file's client imports join its segment's first load for every reader)",
    now.length === 0, now.join(" | "));
  const planted = journeyFree((p) => (p === "src/app/updown/history/history-ghost.tsx" ? `import { TicketsHeadGhost } from "@/components/journey/tickets/tickets-ghost";\n${raw(p)}` : raw(p)));
  ok("2.3′ PLANT · the history drawing importing the journey's head again (R5-D's shape) is reported", planted.length >= 2, planted.join(" | "));
}

/* ══ §3 · G-3 · THE PHASES ═══════════════════════════════════════════════════════════════════════════════════════════ */
section("3 · G-3 · the journey flag and the not-found mark, up and down before the paint of the commit that changes them");
{
  // React 19.2 — the copy Next renders the app with — read where the design relies on it, so an upgrade is noticed.
  const RD = squash(readFileSync("node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.production.js", "utf8"));
  const SCH = squash(readFileSync("node_modules/next/dist/compiled/scheduler/cjs/scheduler.production.js", "utf8"));
  const fn = (s: string, head: string) => { const a = s.indexOf(head); return a < 0 ? "" : s.slice(a, s.indexOf(" function ", a + head.length)); };
  const del = fn(RD, "function commitDeletionEffectsOnFiber(");
  const facts = {
    layoutCleanupFirst: del.includes("case 0: case 11: case 14: case 15: commitHookEffectListUnmount(2, deletedFiber, nearestMountedAncestor); offscreenSubtreeWasHidden || commitHookEffectListUnmount(4, deletedFiber, nearestMountedAncestor); recursivelyTraverseDeletionEffects("),
    hostRemovedAfter: (() => { const c = del.indexOf("case 6: prevHostParent = hostParent;"); const t = del.indexOf("recursivelyTraverseDeletionEffects(", c); const r = del.indexOf("hostParent.removeChild(deletedFiber.stateNode)", c); return c > 0 && t > c && r > t; })(),
    commitRequestsPaint: fn(RD, "function flushSpawnedWork() {").includes("requestPaint();"),
    schedulerYieldsForPaint: SCH.includes("function shouldYieldToHost() { return needsPaint ? !0") && SCH.includes("exports.unstable_requestPaint = function () { needsPaint = !0; };"),
    syncInMicrotask: RD.includes("function scheduleImmediateRootScheduleTask() { scheduleMicrotask(function () { 0 !== (executionContext & 6) ? scheduleCallback$3( ImmediatePriority, processRootScheduleInImmediateTask ) : processRootScheduleInMicrotask(); }); }"),
  };
  ok("3.1 · React 19.2, as Next ships it: a removed function component's layout cleanup runs BEFORE the host nodes after it are removed; a commit asks for a paint and the scheduler yields for it before the next task (a transition's passive effects run after the paint); an update scheduled from outside React is rendered in a microtask — before the browser paints",
    Object.values(facts).every(Boolean), j(facts));
}
const FLAG_FILE = "src/components/journey/journey-flag.tsx", FLAG_LIB = "src/lib/journey/journey-on.ts", SHELL = "src/components/layout/app-shell.tsx";
const NF_MARK = "src/components/ui/not-found-mark.tsx", NF_LIB = "src/lib/not-found-mark.ts";
const phasesOf = (t: (p: string) => string) => ({
  flagLayout: squash(decomment(t(FLAG_FILE))).includes("useLayoutEffect(() => raiseJourneyFlag(), []);") && !/\buseEffect\(/.test(decomment(t(FLAG_FILE))) && hasDirective(t(FLAG_FILE), "use client"),
  flagBare: squash(decomment(t(SHELL))).includes("{journeyShown && <LazyJourneyFlag />}") && !/<Suspense[^>]*>\s*<LazyJourneyFlag/.test(decomment(t(SHELL))),
  lowerAfterCommit: squash(decomment(t(FLAG_LIB))).includes("document.documentElement.removeAttribute(JOURNEY_FLAG_ATTR); window.dispatchEvent(new Event(JOURNEY_FLAG_EVENT)); queueMicrotask(announceJourneyFlagAfterCommit);"),
  markLayout: squash(decomment(t(NF_MARK))).includes("useLayoutEffect(() => { announceNotFound(); }, [path]); useLayoutEffect(() => announceNotFoundAfterCommit, []);") && !/\buseEffect\(/.test(decomment(t(NF_MARK))),
  markAfterCommit: squash(decomment(t(NF_LIB))).includes("export function announceNotFoundAfterCommit(): void { queueMicrotask(() => { if (typeof window !== \"undefined\") announceNotFound(); }); }"),
});
{
  const now = phasesOf(raw);
  ok("3.2 · the flag rises in a LAYOUT effect, from a mount standing bare beside the journey's header and tabs (so it lands in the commit that first paints them); its lowering is announced at once AND once the commit is done; the not-found mark comes in a layout effect and its going is announced once the commit is done",
    Object.values(now).every(Boolean), j(now));
  const passive = phasesOf((p) => (p === FLAG_FILE ? raw(p).replace("useLayoutEffect(() => raiseJourneyFlag(), []);", "useEffect(() => raiseJourneyFlag(), []);") : raw(p)));
  const boxed = phasesOf((p) => (p === SHELL ? raw(p).replace("{journeyShown && <LazyJourneyFlag />}", "{journeyShown && <Suspense fallback={null}><LazyJourneyFlag /></Suspense>}") : raw(p)));
  ok("3.2′ PLANT · the flag back in a passive effect, or back in a boundary of its own, is reported", !passive.flagLayout && !boxed.flagBare, j({ passive: passive.flagLayout, boxed: boxed.flagBare }));
}
{
  // REPLAY — a stand-in document, the commit run in React's order (3.1). The question at every step: what does a reader
  // that subscribed through the store read, and is it right before the browser could paint (before the next task)?
  const FLAG = req(`../${FLAG_LIB}`) as typeof import("../src/lib/journey/journey-on.ts");
  const { JOURNEY_SHELL_MARK } = req("../src/lib/journey/shell-mark.ts") as { JOURNEY_SHELL_MARK: string };
  const NF = req(`../${NF_LIB}`) as typeof import("../src/lib/not-found-mark.ts");
  const g = globalThis as unknown as { window?: unknown; document?: unknown };
  const before = { window: g.window, document: g.document };
  const attrs = new Set<string>(), marks = new Map<string, string>();
  const target = new EventTarget();
  g.window = { addEventListener: target.addEventListener.bind(target), removeEventListener: target.removeEventListener.bind(target), dispatchEvent: target.dispatchEvent.bind(target) };
  g.document = {
    documentElement: { hasAttribute: (n: string) => attrs.has(n), setAttribute: (n: string) => { attrs.add(n); }, removeAttribute: (n: string) => { attrs.delete(n); } },
    getElementById: (id: string) => (marks.has(id) ? { getAttribute: (a: string) => (a === NF.NOT_FOUND_PATH_ATTR ? marks.get(id)! : null) } : null),
  };
  const drain = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
  try {
    // A reader: the store's subscriber re-reads the snapshot each time it is told (useSyncExternalStore's handleStoreChange).
    const flagReads: boolean[] = [];
    const leave = FLAG.subscribeJourneyFlag(() => flagReads.push(FLAG.journeyFlagSnapshot()));
    let nextTask = false;
    setImmediate(() => { nextTask = true; });
    // ON — the commit that draws the journey's shell: the mark goes in (mutation), then the flag's layout effect runs.
    marks.set(JOURNEY_SHELL_MARK, "");
    const lower = FLAG.raiseJourneyFlag();
    const up = flagReads.at(-1);
    // OFF — the commit that removes it: the flag's layout cleanup runs FIRST (the mark still in), then the mark goes.
    lower();
    const interim = flagReads.at(-1);
    marks.delete(JOURNEY_SHELL_MARK);
    await drain();
    const down = flagReads.at(-1), downBeforeNextTask = !nextTask;
    ok(`3.3 · REPLAY, React's order: switching on, the reader reads "on" in the commit's own layout phase (${up}); switching off, the cleanup's own word still reads the mark (${interim}), and the word sent once the commit is done reads "off" (${down}) — before the next task, so before the paint`,
      up === true && interim === true && down === false && downBeforeNextTask, j({ flagReads, downBeforeNextTask }));
    leave();
    // CONTROL — R5-D's lowering, announced in the cleanup alone: after the same commit the reader is left on the old answer
    // (it was right only after a passive re-check, past the paint).
    const ctrlReads: boolean[] = [];
    const leave2 = FLAG.subscribeJourneyFlag(() => ctrlReads.push(FLAG.journeyFlagSnapshot()));
    marks.set(JOURNEY_SHELL_MARK, "");
    attrs.add(FLAG.JOURNEY_FLAG_ATTR); window.dispatchEvent(new Event(FLAG.JOURNEY_FLAG_EVENT));
    attrs.delete(FLAG.JOURNEY_FLAG_ATTR); window.dispatchEvent(new Event(FLAG.JOURNEY_FLAG_EVENT));
    marks.delete(JOURNEY_SHELL_MARK);
    await drain();
    leave2();
    ok("3.3′ CONTROL · the lowering announced in the cleanup alone (R5-D's phase, run in a layout cleanup) leaves the reader on \"on\" after the commit — the frame of the old answer the second word removes", ctrlReads.at(-1) === true, j(ctrlReads));
    // The not-found mark: drawn for /markets/mkt_gone; leaving it, its layout cleanup runs while the span is still in.
    const nfReads: Array<string | null> = [];
    const leave3 = NF.subscribeNotFound(() => nfReads.push(NF.notFoundSnapshot()));
    marks.set(NF.NOT_FOUND_MARK, "/markets/mkt_gone"); NF.announceNotFound();
    const arrived = nfReads.at(-1);
    NF.announceNotFoundAfterCommit();
    const during = nfReads.length;
    marks.delete(NF.NOT_FOUND_MARK);
    await drain();
    const gone = nfReads.at(-1);
    leave3();
    ok(`3.4 · REPLAY: the not-found mark's going is announced once the commit that takes the span out is done (nothing is said while it is still in: ${during === 1}), and the store then reads no mark (${j(gone)}) — before the next task`,
      arrived === "/markets/mkt_gone" && during === 1 && gone === null && !nextTask, j({ nfReads, nextTask }));
    const ctrl: Array<string | null> = [];
    const leave4 = NF.subscribeNotFound(() => ctrl.push(NF.notFoundSnapshot()));
    marks.set(NF.NOT_FOUND_MARK, "/markets/mkt_gone");
    NF.announceNotFound(); // what a layout cleanup announcing at once would say
    marks.delete(NF.NOT_FOUND_MARK);
    await drain();
    leave4();
    ok("3.4′ CONTROL · announced in the layout cleanup itself, the going reads the old path (the span is still in) — why it waits for the commit", ctrl.at(-1) === "/markets/mkt_gone", j(ctrl));
  } finally {
    await drain();
    g.window = before.window;
    g.document = before.document;
  }
}
{
  // ⭐ EVERY FILE THAT WRITES A DOM MARK, classified: the phase it writes in, and why that is right for what reads it. A new
  // writer is reported until it is classified here (the sibling sweep G-3 asked for; R5-D's READERS are the store side).
  const MARK_WRITERS: Record<string, string> = {
    "src/lib/journey/journey-on.ts": "the journey flag (data-journey): up in the layout phase of the commit that draws the journey shell, down at once and announced again once that commit is done — FIXED (R5-H, G-3)",
    "src/components/ui/strip-autoscroll.tsx": "the strip's edge fade (data-edges): marked in the layout phase against the strip's real width, so a move's first frame shows the right fade — FIXED (R5-H, G-3); the framing scroll stays passive, as Tabs' does (a scroll position, not a mark)",
    "src/lib/card-spacing.ts": "the reader's card spacing (data-density): written on the toggle (an event) and re-read in ThemeProvider's LAYOUT effect on each new server value — already before the paint",
    "src/components/theme-provider.tsx": "the reader's motion preference (data-motion, kp-reduce-motion): known only to the browser, written once at hydration — the server's HTML has painted by then, so no phase can put it in a first paint; animations read it from the next frame",
    "src/components/settings/feedback-settings.tsx": "the same motion preference, written by the reader's toggle (an event)",
    "src/components/layout/reveal.tsx": "the scripts-are-here class (js), added at hydration by design: with no scripts every band is shown",
    "src/components/markets/filter-sheet.tsx": "the open sheet (data-sheet-open): written when a tap opens it — a discrete update, whose passive effects React runs before the paint (`pendingEffectsLanes & 3`); and only the fallback for a browser without :has(), which draws the same frame by CSS",
    "src/components/layout/nav-more.tsx": "the open rail menu (data-rail-menu-open): written when a tap opens it (a discrete update, before the paint)",
    "src/lib/use-modal-lock.ts": "the page's scroll lock under a dialog (body overflow, with the scrollbar's width padded back in the same write): a lock, not a picture — the frame it lands in shows the same page",
    "src/components/ui/unsaved-changes.tsx": "the save bar's room at the page's end (body padding): written on the reader's edit (typing — discrete updates, before the paint)",
    "src/components/layout/scroll-cast.tsx": "the scroll state (data-scrolled, data-scrolling, data-fab-idle): written from scroll events, never by a first paint",
    "src/components/updown/use-quick-bet.ts": "a request in flight (body data-ud-busy): a gate the handover reads, not a picture",
    "src/components/updown/updown-handover.tsx": "reads the busy gate and the scroll lock; writes no mark",
    "src/components/markets/win-celebration.tsx": "reads the motion class; writes no mark",
    "src/components/markets/market-card.tsx": "a tapped button's press animation (press-pop), in its click handler",
    "src/components/layout/needle.tsx": "the Needle's own engine (its root's suppressed and wake classes), run from its own gate; R4-J's and R5-D's notes hold its first frame (the shell's mark in the server's HTML)",
    "src/components/ui/route-transition.tsx": "the route entrance (route-enter): restarted in the layout phase of a route change, before the new route's first paint, and never at mount — FIXED (R5-H's patch, proven in a browser 2026-10-09; 3.7, 3.8)",
  };
  const PATTERN = /document\.documentElement\.(?:setAttribute|removeAttribute|classList|dataset)|document\.body\.(?:style|dataset|classList|setAttribute)|\.setAttribute\("data-|\.classList\.(?:add|remove|toggle)\(|body\.dataset\.|body\.style\./;
  const writers = (text: (p: string) => string) => walk("src").filter((p) => /\.tsx?$/.test(p) && !p.startsWith("src/app/admin/") && PATTERN.test(decomment(text(p)))).sort();
  const now = writers(raw);
  ok(`3.5 · every file outside the console that writes a DOM mark is classified (${now.length}): the phase it writes in and why that is right for what reads it — the journey flag, the strip's edges and the route entrance fixed`,
    j(now) === j(Object.keys(MARK_WRITERS).sort()), j(now.filter((f) => !(f in MARK_WRITERS))) + " / " + j(Object.keys(MARK_WRITERS).filter((f) => !now.includes(f))));
  const planted = writers((p) => (p === "src/components/ui/toast.tsx" ? `${raw(p)}\nexport const markToast = () => document.documentElement.setAttribute("data-toast", "");` : raw(p)));
  ok("3.5′ PLANT · a new writer of a DOM mark (a toast stamping the html element) is reported until it is classified", planted.includes("src/components/ui/toast.tsx"));
  const strip = squash(code("src/components/ui/strip-autoscroll.tsx"));
  const stripOk = (s: string) => s.includes('useLayoutEffect(() => { for (const rail of Array.from(document.querySelectorAll<HTMLElement>("[data-strip-autoscroll]"))) markEdges(rail); });');
  ok("3.6 · the strip's edge fade is marked in the layout phase (and the framing effect still marks it again after it scrolls)", stripOk(strip) && count(strip, "markEdges(rail);") >= 4);
  ok("3.6′ PLANT · the layout pass removed (the first frame after a move faded at the end of a strip that fits) is reported", !stripOk(strip.replace("useLayoutEffect(() => { for", "useEffect(() => { for")));
  // ⭐ THE ROUTE ENTRANCE (R5-H's patch, proven in a browser 2026-10-09 — S\r5h\probe-route-blink.mjs: before, every
  // journey tab tap blinked and a cold load replayed the entrance at hydration and jumped to the top; after, none).
  const rt = squash(code("src/components/ui/route-transition.tsx"));
  const routeOk = (s: string) => s.includes("useLayoutEffect(() => { if (pathname !== key) {");
  const mountOk = (s: string) => /const mountedRef = useRef\(false\); useLayoutEffect\(\(\) => \{ if \(!mountedRef\.current\) \{ mountedRef\.current = true; return; \}/.test(s);
  ok("3.7 · a route change restarts the entrance in the LAYOUT phase, before the new route's first paint (no painted frame at full opacity, then transparent)", routeOk(rt));
  ok("3.7′ PLANT · the route change back in a passive effect (the blink on every journey tab tap) is reported", !routeOk(rt.replace("useLayoutEffect(() => { if (pathname !== key) {", "useEffect(() => { if (pathname !== key) {")));
  ok("3.8 · the entrance and the scroll to the top do NOT run at mount (hydration replays nothing and keeps the reader's place)", mountOk(rt));
  ok("3.8′ PLANT · the mount guard removed (the entrance replayed at hydration, the page thrown to the top) is reported", !mountOk(rt.replace("if (!mountedRef.current) { mountedRef.current = true; return; }", "")));
}

/* ══ §4 · G-2b · THE MONEY BOOKS' BAR GHOST ══════════════════════════════════════════════════════════════════════════ */
section("4 · G-2b · /wallet's ghost draws the page's bar, door and section; the bar is the money books' one ghost, word for word");
const WALLET_GHOST = "src/app/wallet/wallet-ghost.tsx", WALLET_PAGE = "src/app/wallet/wallet-client.tsx", BAR_GHOST = "src/app/wallet/money-bar-ghost.tsx";
/** The bands in order, each found once after the one before it (or "" for the first that is not). */
function inOrder(s: string, bands: string[]): string {
  let at = -1;
  for (const b of bands) { const i = s.indexOf(b, at + 1); if (i < 0 || count(s, b) !== 1) return b; at = i; }
  return "";
}
const PAGE_BANDS = ['<header className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">',
  '<div className={cn("grid grid-cols-1 gap-4 items-stretch", bonusCardVisible && "lg:grid-cols-2")}>', "<Tabs", '{emptyCause !== "no-rows" && activityBar}',
  '<div className="kp-wallet-door flex justify-end">', '<section className="space-y-3">'];
const GHOST_BANDS = ['<header className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">',
  '<div className={cn("grid grid-cols-1 gap-4 items-stretch", bonusLive && "lg:grid-cols-2")} aria-hidden>', '<nav className="flex items-end gap-1 border-b border-border" data-rail-ghost="" aria-hidden>',
  "<MoneyBarGhost t={t} lenses=", '<div className="kp-wallet-door flex justify-end" aria-hidden>', '<section className="space-y-3">'];
{
  // The page's activity view (the bands a player with rows is shown), up to the next section's view.
  const pageAll = code(WALLET_PAGE), page = pageAll.slice(0, pageAll.indexOf('{section === "methods" && (')), ghost = code(WALLET_GHOST);
  const pageMiss = inOrder(page, PAGE_BANDS), ghostMiss = inOrder(ghost, GHOST_BANDS);
  const barIsWalletBar = /activityBar=\{\s*<WalletBar\b/.test(squash(code("src/app/wallet/page.tsx")));
  ok("4.1 · /wallet's ghost stands in the page's band order — header, balance grid, the rail, the BAR, the receipts door, then the spark and the list as ONE section — each band once, as the page draws them (the bar the page passes in is WalletBar)",
    pageMiss === "" && ghostMiss === "" && barIsWalletBar, j({ pageMiss, ghostMiss, barIsWalletBar }));
  const noBar = inOrder(ghost.replace(/<MoneyBarGhost t=\{t\} lenses=[^\n]*\n/, ""), GHOST_BANDS);
  const plainDoor = inOrder(ghost.replace('<div className="kp-wallet-door flex justify-end" aria-hidden>', '<div className="flex justify-end" aria-hidden>'), GHOST_BANDS);
  const loose = inOrder(ghost.replace('<section className="space-y-3">', "<>"), GHOST_BANDS);
  ok("4.1′ PLANT · R5-B's finding back (no bar), the door off the bar's rhythm (no `.kp-wallet-door`), or the spark and list two blocks on the 32px rung again — each is reported",
    noBar !== "" && plainDoor !== "" && loose !== "", j({ noBar, plainDoor, loose }));
}
// The bar's rows, from the bar's own constants and the overridden spacing scale (tailwind.config.ts).
const SCALE: Record<string, number> = { "0.5": 2, "1": 4, "1.5": 8, "2": 12, "2.5": 10, "3": 16, "4": 20, "5": 24, "6": 32, "7": 40, "8": 48, "9": 64, "10": 80, "11": 96, "12": 128 };
const { QUERY_BAR_ROW1_WRAP_CLASS, QUERY_BAR_ROW2_CLASS } = req("../src/components/ui/query-bar.tsx") as Record<string, string>;
const step = (cls: string, re: RegExp) => SCALE[re.exec(cls)?.[1] ?? ""] ?? NaN;
{
  const r1pt = step(QUERY_BAR_ROW1_WRAP_CLASS, /(?:^|\s)pt-(\d(?:\.\d)?)\b/), r1gy = step(QUERY_BAR_ROW1_WRAP_CLASS, /(?:^|\s)gap-y-(\d(?:\.\d)?)\b/), r1mb = step(QUERY_BAR_ROW1_WRAP_CLASS, /(?:^|\s)-mb-(\d(?:\.\d)?)\b/);
  const r2pt = step(QUERY_BAR_ROW2_CLASS, /(?:^|\s)pt-(\d(?:\.\d)?)\b/), r2pb = step(QUERY_BAR_ROW2_CLASS, /(?:^|\s)pb-(\d(?:\.\d)?)\b/);
  const phone = r1pt + 44 + r1gy + 11.5 * 1.5 - r1mb + r2pt + 44 + r2pb;
  const css = decommentCss(raw("src/app/globals.css"));
  const door = /\n\.kp-discovery-bar \+ \.kp-wallet-door\.kp-wallet-door \{ margin-top: 15px; margin-bottom: -7px; \}/.test(css);
  ok(`4.2 · the band the ghost now draws, from the bar's own constants: ${phone}px on a phone (row 1 ${r1pt} + 44 + ${r1gy} + 17.25 − ${r1mb}, row 2 ${r2pt} + 44 + ${r2pb}) — the list landed that much plus a rung lower than the ghost promised; and the door lies in the bar's rhythm by the page's own rule (15px over it, −7 under it)`,
    phone === 141.25 && door, j({ phone, door }));
}
/** The pills the bar ghost draws, in order, from its rendered markup: [label, kind] (a pill or a group key). */
function ghostPills(html: string): string[] {
  const bar = html.slice(html.indexOf('class="kp-discovery-bar'));
  return [...bar.matchAll(/<span class="inline-flex min-h-\[44px\][^"]*">([^<]*)<span class="font-mono text-\[11px\] font-bold tabular-nums">00<\/span><\/span>/g)].map((m) => m[1]
    .replace(/&amp;/g, "&").replace(/&#x27;/g, "'"));
}
{
  // The words: each lens, state and window the page's bar prints, in its order, in every language.
  const { lensLabel } = req("../src/app/wallet/wallet-bar.tsx") as { lensLabel: (t: unknown, l: string) => string };
  const { visibleLedgerLenses, LEDGER_STATES, LEDGER_WHEN_IDS } = req("../src/lib/wallet/ledger.ts") as { visibleLedgerLenses: (r: unknown[]) => readonly string[]; LEDGER_STATES: readonly string[]; LEDGER_WHEN_IDS: readonly string[] };
  const { receiptLensLabel, RECEIPT_LENSES } = req("../src/lib/wallet/receipts.ts") as { receiptLensLabel: (t: unknown, l: string) => string; RECEIPT_LENSES: readonly string[] };
  // The bars' own state and window words, read from their switch statements (both bars print the same).
  const labels = (file: string, fn: string, ids: readonly string[], t: Record<string, Record<string, string>>) => {
    const s = code(file); const body = s.slice(s.indexOf(`function ${fn}(`)); const end = body.indexOf("\n}\n");
    const map = Object.fromEntries([...body.slice(0, end).matchAll(/case "([^"]+)": return t\.(\w+)\.(\w+);/g)].map((m) => [m[1], t[m[2]][m[3]]]));
    return ids.map((id) => map[id]);
  };
  const wrong: string[] = [];
  for (const l of LOCALES) {
    const t = dict[l];
    const walletWant = [...visibleLedgerLenses([]).map((x) => lensLabel(t, x)),
      ...labels("src/app/wallet/wallet-bar.tsx", "stateLabel", LEDGER_STATES, t), ...labels("src/app/wallet/wallet-bar.tsx", "whenLabel", LEDGER_WHEN_IDS, t)];
    const receiptsWant = [...RECEIPT_LENSES.map((x) => receiptLensLabel(t, x)),
      ...labels("src/app/wallet/receipts/receipts-bar.tsx", "stateLabel", LEDGER_STATES, t), ...labels("src/app/wallet/receipts/receipts-bar.tsx", "whenLabel", LEDGER_WHEN_IDS, t)];
    const wallet = ghostPills(inApp("/wallet", l, h(WalletGhost as never, { bonusLive: false } as never)));
    const receipts = ghostPills(inApp("/wallet/receipts", l, h(mods.get("src/app/wallet/receipts/loading.tsx") as never)));
    if (j(wallet) !== j(walletWant)) wrong.push(`${l} wallet ${j(wallet)} ≠ ${j(walletWant)}`);
    if (j(receipts) !== j(receiptsWant)) wrong.push(`${l} receipts ${j(receipts)} ≠ ${j(receiptsWant)}`);
    const html = inApp("/wallet", l, h(WalletGhost as never, { bonusLive: false } as never));
    if (!html.includes(t.wallet.stateKey) || !html.includes(t.common.when) || !html.includes(t.wallet.nResults.replace("{n}", "00"))) wrong.push(`${l} keys or count`);
  }
  ok("4.3 · the bar ghost's words are the page's bars' own — /wallet's eight lenses (`lensLabel` over a player's lenses), /wallet/receipts' three, then the five states and five windows in the bars' order (their `stateLabel`, `whenLabel`), the two group keys and the count's noun — in sw, en and zh, set and not shown",
    wrong.length === 0, wrong.slice(0, 2).join(" | "));
}
{
  // The box: the kit pill's geometry, from `filterPillClass` itself, and FilterPill's count.
  const { filterPillClass } = req("../src/components/ui/filter-pill.tsx") as { filterPillClass: (o: { rank?: string; on: boolean }) => string };
  const GEOMETRY = /^(?:inline-flex|shrink-0|items-center|justify-center|gap-[\d.]+|whitespace-nowrap|rounded-pill|border|min-h-\[[^\]]+\]|text-\[\d+px\]|font-semibold|px-[\d.]+)$/;
  const want = filterPillClass({ rank: "primary", on: false }).split(/\s+/).filter((c) => GEOMETRY.test(c));
  // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-L): the pill is `query-bar-ghost.tsx`'s `PillGhost` now — /results', /markets' and
  // /leaderboard's ghosts draw the same pill — so its box is read there, and the money books' ghost must import it.
  const ghost = code("src/components/ui/query-bar-ghost.tsx");
  const imported = /import \{ (?:CountGhost, )?PillGhost \} from "@\/components\/ui\/query-bar-ghost";/.test(code(BAR_GHOST)) && !/function PillGhost/.test(code(BAR_GHOST));
  const pill = (s: string) => /function PillGhost[\s\S]*?<span className="([^"]+)">/.exec(s)?.[1].split(/\s+/) ?? [];
  const has = (s: string) => want.length >= 11 && want.every((c) => pill(s).includes(c)) && pill(s).includes("text-transparent") && pill(s).includes("border-transparent");
  const countOk = (s: string) => s.includes('<span className="font-mono text-[11px] font-bold tabular-nums">00</span>') && code("src/components/ui/filter-pill.tsx").includes('"font-mono text-[11px] font-bold tabular-nums"');
  ok(`4.4 · each pill is the kit pill's box — every geometry class of \`filterPillClass\` (${want.join(" ")}), its 1px border transparent and its words transparent — with FilterPill's own count type: as wide as the page's pill`,
    has(ghost) && countOk(ghost) && imported, j({ want, got: pill(ghost), imported }));
  ok("4.4′ PLANT · a pill a step narrower (`px-2.5`) is reported", !has(ghost.replace("rounded-pill border border-transparent bg-bg-overlay px-3", "rounded-pill border border-transparent bg-bg-overlay px-2.5")));
  const html = inApp("/wallet", "sw", h(WalletGhost as never, { bonusLive: false } as never));
  const bar = html.slice(html.indexOf('class="kp-discovery-bar'), html.indexOf('class="kp-wallet-door'));
  ok("4.5 · the bar ghost promises a shape and nothing else: no link, no live region, no `data-result-count` (`qa:count-truth` reads that one), hidden from a screen reader", bar.length > 0 && !/<a\b|aria-live|data-result-count/.test(bar) && bar.includes('aria-hidden="true"'));
  // Row 2 wraps where the page's does only if its groups stand in the page's wrappers with the page's divider: the row's
  // 29px column gap is keyed on `.kp-qdiv` (`.kp-qbar-row:has(.kp-qdiv)`), and the bars write the same two wrappers.
  const rows = (s: string) => ({ wrappers: count(s, '<div class="hidden min-w-0 items-center gap-2 lg:flex"><span aria-hidden="true" class="kp-qdiv"></span><div class="hidden min-w-0 flex-wrap items-center gap-1 lg:flex">'), keys: count(s, "shrink-0 pr-0.5 font-mono text-micro font-bold uppercase eyebrow text-transparent"), phone: count(s, "h-[44px] w-[104px] rounded-pill bg-bg-overlay kp-shimmer-track lg:hidden") });
  const barSrc = squash(code("src/app/wallet/wallet-bar.tsx"));
  const pageWrappers = count(barSrc, '<div className="hidden min-w-0 items-center gap-2 lg:flex"> <QueryGroupDivider /> <nav aria-label=');
  ok(`4.7 · row 2 is the page's: one Filters button for a phone, and from lg the two groups each in the bar's own wrapper with its divider (the row's 29px gap is keyed on it) and its key — ${j(rows(bar))}, the page's bar writing ${pageWrappers} such wrappers`,
    j(rows(bar)) === j({ wrappers: 2, keys: 2, phone: 1 }) && pageWrappers === 2, j(rows(bar)));
  ok("4.7′ PLANT · the groups drawn without their divider (the row's gap back to 12px: a different wrap) is reported", rows(bar.split('<span aria-hidden="true" class="kp-qdiv"></span>').join("")).wrappers === 0);
}
{
  // Where the rows wrap: measured from the repo's own fonts. The page's row 2 at lg is two lines in Swahili and English
  // (and Chinese at 1024): a ghost with the page's words in the page's box wraps there too; R5-B's twelve fixed boxes
  // drew one line, so the list landed 56px (44 + the 12px row gap) lower than the receipts ghost promised.
  const fontkit = req("fontkit") as { openSync: (p: string) => { layout: (s: string) => { glyphs: Array<{ advanceWidth: number }> }; unitsPerEm: number } };
  const F = (n: string) => fontkit.openSync(`src/lib/server/reports/fonts/${n}`);
  const interM = F("Inter-Medium.ttf"), interB = F("Inter-Bold.ttf"), monoB = F("JetBrainsMono-Bold.ttf");
  const w = (font: ReturnType<typeof F>, s: string, px: number) => font.layout(s).glyphs.reduce((a, g) => a + g.advanceWidth, 0) / font.unitsPerEm * px;
  const text = (s: string, px: number) => [...s].reduce((a, ch) => a + (/[　-鿿]/.test(ch) ? px : (w(interM, ch, px) + w(interB, ch, px)) / 2), 0);
  const pillW = (s: string) => 2 + 32 + text(s, 13) + 8 + w(monoB, "00", 11);
  const keyW = (s: string) => [...s.toUpperCase()].reduce((a, ch) => a + (/[　-鿿]/.test(ch) ? 10 : w(monoB, ch, 10)), 0) + 1.4 * [...s].length + 2;
  const lines = (items: number[], room: number, gap: number) => { let n = 1, x = 0; for (const it of items) { if (x > 0 && x + gap + it > room) { n++; x = it; } else x = x === 0 ? it : x + gap + it; } return n; };
  const out: string[] = []; const wraps: boolean[] = [];
  for (const l of LOCALES) {
    const t = dict[l];
    const group = (k: string, chips: string[]) => keyW(k) + 4 + chips.map(pillW).reduce((a, b) => a + b + 4, -4);
    const g1 = group(t.wallet.stateKey, [t.market.oddsAny, t.wallet.stateFlight, t.wallet.txnStatusConfirmed, t.wallet.txnStatusFailed, t.wallet.txnStatusReversed]);
    const g2 = group(t.common.when, [t.common.rangeToday, t.common.rangeYesterday, t.common.range7d, t.common.range30d, t.common.rangeAll]);
    for (const col of [960, 1016]) {
      const page = lines([g1, g2], col, 29);
      const fixed = lines([[44, 64, 72, 84, 58, 60, 64, 52, 60, 56, 64, 48].reduce((a, b) => a + b + 4, -4)], col, 29);
      out.push(`${l}@${col}: page ${page}, fixed ${fixed}`);
      if (l !== "zh") wraps.push(page === 2 && fixed === 1);
    }
  }
  ok(`4.6 · measured from the repo's fonts, the page's state and window groups take two lines at 1024 and 1280 in Swahili and English (${out.join(" · ")}): the word-sized ghost wraps with them; R5-B's twelve fixed boxes drew one line there`,
    wraps.length === 4 && wraps.every(Boolean), out.join(" · "));
}

/* ══ §5 · G-2b's SWEEP · EVERY GHOST'S BANDS, WHERE THE CLASSES SAY THEM EXACTLY ══════════════════════════════════════ */
section("5 · G-2b's sweep · the bands the audit measured exactly from the classes, each held against its page");
{
  // ⭐ THE BACK LINK: every ghost whose page opens on `BackLink` draws `BackLinkGhost`, the link's own 44px box. A census:
  // each player loading file's drawings against the page beside it. Since R5-L a generic PageLoader route's own file draws
  // its page's opening bands, so it is held here too (a server file that only hands PageLoader numbers — /proposals/[id],
  // whose first band is its data — is passed over), and each agent route draws its own bands (the shared `AgentGhost`
  // and its `back={false}` are gone).
  const BL = squash(code("src/components/ui/back-link.tsx"));
  const box = BL.includes('className="min-h-[44px] inline-flex items-center gap-1.5 text-label font-mono uppercase tracking-[0.16em]')
    && inApp("/", "sw", h((req("../src/components/ui/back-link.tsx") as { BackLinkGhost: unknown }).BackLinkGhost as never)).startsWith('<div class="flex min-h-[44px] items-center" aria-hidden="true"><div class="h-3 w-[64px] rounded bg-bg-overlay kp-shimmer-track"></div></div>');
  const census = (text: (p: string) => string) => {
    const wrong: string[] = [];
    for (const f of PLAYER) {
      const page = posix.join(posix.dirname(f), "page.tsx");
      if (!existsSync(page)) continue;
      const draws = drawingsOf(f, text);
      if (draws.some((d) => d.endsWith("components/ui/page-loader.tsx"))) continue;
      const pageOpens = /<BackLink\b/.test(decomment(text(page))) && !/journey \? <TicketsHead/.test(decomment(text(page)));
      const historyClassic = f === "src/app/updown/history/loading.tsx";
      const ghostHas = draws.some((d) => /<BackLinkGhost \/>/.test(decomment(text(d))));
      const want = historyClassic ? true : pageOpens;
      if (ghostHas !== want) wrong.push(`${f}: page ${pageOpens ? "opens on" : "has no"} BackLink, ghost ${ghostHas ? "draws" : "does not draw"} one`);
    }
    return wrong;
  };
  const now = census(raw);
  ok("5.1 · the back link: every ghost whose page opens on a BackLink draws `BackLinkGhost` — the link's own 44px box (`min-h-[44px]`, its 16px label line centred) — and the invitation's, whose page has none, draws none (nine drew a 16–20px bar, the receipt's none)",
    box && now.length === 0, now.join(" | ") || j({ box }));
  const planted = census((p) => (p === "src/app/wallet/deposit/deposit-ghost.tsx" ? raw(p).replace("<BackLinkGhost />", '<div className="h-4 w-[64px] rounded bg-bg-overlay kp-shimmer-track" aria-hidden />') : raw(p)));
  ok("5.1′ PLANT · the deposit ghost back on its 20px bar is reported", planted.some((w) => w.includes("wallet/deposit")), planted.join(" | "));
}
/** The class string of the first element in `s` whose class list begins with `head`. */
const classOf = (s: string, head: string) => new RegExp(`className="(${head.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^"]*)"`).exec(s)?.[1] ?? "";
const sweep = (text: (p: string) => string) => {
  const t = (p: string) => squash(decomment(text(p)));
  const resultsPage = t("src/app/results/page.tsx"), resultsGhost = t("src/app/results/loading.tsx");
  const mkGhost = t("src/app/markets/loading.tsx"), liveGhost = t("src/app/live/loading.tsx"), hero = t("src/components/ui/page-hero.tsx");
  const barKit = t("src/components/ui/query-bar-ghost.tsx"), livePage = t("src/app/live/page.tsx");
  const rcGhost = t("src/app/wallet/receipts/loading.tsx"), rcRow = t("src/components/wallet/receipt-list-row.tsx");
  const pfPage = t("src/app/profile/page.tsx"), pfGhost = t("src/app/profile/loading.tsx");
  const agPage = t("src/app/agent/page.tsx"), agGhost = t("src/app/agent/loading.tsx");
  const udPage = t("src/app/updown/page.tsx"), udGhost = t("src/app/updown/updown-ghost.tsx"), udTabs = t("src/components/updown/updown-board-tabs.tsx");
  const rdPage = t("src/app/updown/[roundId]/page.tsx"), rdGhost = t("src/app/updown/[roundId]/loading.tsx");
  const midGhost = t("src/app/markets/[id]/loading.tsx"), midPage = t("src/app/markets/[id]/page.tsx");
  const tg = t("src/components/journey/tickets/tickets-ghost.tsx"), css = decommentCss(raw("src/app/globals.css"));
  const hPage = t("src/app/updown/history/page.tsx"), hGhost = t("src/app/updown/history/history-ghost.tsx");
  const header = (s: string) => /<PageHeader eyebrow=\{[^}]+\} title=\{[^}]+\} subtitle=\{[^}]+\}/.exec(s)?.[0] ?? "";
  const pageGrid = (s: string) => /className="grid grid-cols-1 items-start gap-4 (lg|xl):\[grid-template-columns:minmax\(0,1\.55fr\)_minmax\(300px,1fr\)\]"/.exec(s)?.[1] ?? "";
  return {
    // (the page holds an emptied JSX note between its two wrappers — `{}` once decommented)
    "5.2 results": /<div className="flex flex-col gap-5 lg:flex-row lg:gap-6"> (?:\{\} )*<div className="min-w-0 flex-1">/.test(resultsPage)
      && resultsGhost.includes('<div className="flex flex-col gap-5 lg:flex-row lg:gap-6"> <div className="min-w-0 flex-1">')
      // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-L): the carousel is the notable card's own box (no 458px reservation, which was
      // 118px too tall at 1280) and the Filters pill the trigger's own box (`lg:hidden` in its root) — `test:visual-pass-r5l` §5.
      && resultsGhost.includes("{notable && <NotableGhost />}") && resultsGhost.includes('<div className="mb-5" aria-hidden>')
      && resultsGhost.includes("<FiltersGhost label={t.market.filtersOpen} />") && barKit.includes('<div className="kp-fsheet lg:hidden">'),
    "5.3 markets": mkGhost.includes('<div className="flex h-[17.25px] shrink-0 items-center" data-result-count=""><div className="kp-shimmer-track h-3 w-[80px] rounded bg-bg-elevated" /></div>')
      // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-L): the Filters pill is the trigger's own box with its word (`FiltersGhost`, whose
      // root is `kp-fsheet lg:hidden`) — the 170px box pushed the phone grid past the bar's edge.
      && mkGhost.includes("<FiltersGhost label={t.market.filtersOpen} />") && barKit.includes('<div className="kp-fsheet lg:hidden">'),
    // ⚠️ MOVED IN ROUND 5'S FOLLOW-UP (R5-L): the hero ghost IS `PageHero`, with the page's props — its own padding by construction.
    "5.4 live": hero.includes('contentClassName = "relative z-10 p-5 lg:p-6"') && liveGhost.includes('<PageHero glow="aqua" watermark={200}>')
      && livePage.includes('<PageHero glow="aqua" watermark={200}>'),
    "5.5 receipts": rcRow.includes('<p className="amount shrink-0 whitespace-nowrap font-mono text-body font-semibold text-text">') && rcRow.includes('<div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">')
      && rcGhost.includes('<div className="flex h-[20px] items-center justify-between gap-3">') && rcGhost.includes('<div className="mt-1.5 flex h-[18px] items-center justify-between gap-3">')
      && rcGhost.includes('<div className="h-[18px] w-[88px] rounded-pill bg-bg-overlay/60 kp-shimmer-track" />'),
    "5.6 profile": classOf(pfPage, "grid grid-cols-1 gap-") !== "" && classOf(pfPage, "grid grid-cols-1 gap-") === classOf(pfGhost, "grid grid-cols-1 gap-"),
    "5.7 agent": header(agPage) !== "" && header(agPage) === header(agGhost) && !agGhost.includes("max-w-[46ch]"),
    "5.8 updown": header(udGhost) !== "" && udPage.includes(`${header(udGhost).replace(/ \/?$/, "")} actions=`)
      && udTabs.includes('<div className="mt-4 sm:hidden">') && udTabs.includes('className="mt-4 hidden flex-wrap gap-2 sm:flex"') && udTabs.includes('className="mt-2 hidden flex-wrap gap-1.5 sm:flex"')
      && udGhost.includes('<div className="mt-4 sm:hidden" aria-hidden> <div className="h-[var(--h-control-lg)] w-full rounded-control bg-bg-inset kp-shimmer-track" />')
      && udGhost.includes('<div className="mt-4 hidden gap-2 sm:flex" aria-hidden>') && udGhost.includes('<div className="mt-2 hidden gap-1.5 sm:flex" aria-hidden>')
      && udGhost.includes('className="h-[44px] w-[64px] rounded-md bg-bg-inset kp-shimmer-track"') && !udGhost.includes("h-7 w-[64px]")
      && udPage.includes("<BoardViz") && udGhost.includes('<div className="h-[50px] w-[136px] rounded-pill bg-bg-elevated kp-shimmer-track" />') && udGhost.includes('<div className="mt-2 h-[18px] w-[240px] max-w-full rounded-sm bg-bg-inset kp-shimmer-track" />'),
    "5.9 round": pageGrid(rdPage) === "lg" && pageGrid(rdGhost) === "lg"
      && rdPage.indexOf("<RoundActionPanel") > 0 && rdPage.indexOf("<RoundActionPanel") < rdPage.indexOf("<section aria-label={t.market.udPool}")
      && rdGhost.indexOf('<div className="h-56 rounded-xl') > 0 && rdGhost.indexOf('<div className="h-56 rounded-xl') < rdGhost.indexOf('<div className="h-40 rounded-xl'),
    "5.10 question": midPage.includes('<div aria-hidden className="gilt-hairline mb-3" />') && midGhost.includes('<div className="mb-3 flex h-[40px] items-center gap-2">')
      && midGhost.includes('<div className="mb-3 h-px w-full bg-border" />') && midGhost.includes("md:h-[45px]") && !midGhost.includes("h-5 w-48 rounded") && midGhost.includes('<header className="mt-3" aria-hidden>'),
    "5.11 tickets rail": tg.includes('<div className="flex items-end gap-1 border-b border-border" data-rail-ghost="" aria-hidden>') && /:is\(\[data-section-rail\], \[data-rail-ghost\]\)/.test(css),
    "5.12 history": hPage.includes("<div className={`${QUERY_SEARCH_BAND_CLASS} mt-5 pb-5`}>") && hGhost.includes("<div className={`${QUERY_SEARCH_BAND_CLASS} mt-5 pb-5`} aria-hidden>")
      && hGhost.indexOf("<div className={QUERY_BAR_CLASS} aria-hidden>") > hGhost.indexOf("QUERY_SEARCH_BAND_CLASS} mt-5 pb-5")
      && hGhost.indexOf('<div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3" aria-hidden>') > hGhost.indexOf("<div className={QUERY_BAR_CLASS} aria-hidden>")
      && hGhost.includes('className="h-[89.5px] rounded-xl border border-border bg-bg-elevated kp-shimmer-track"'),
  } as Record<string, boolean>;
};
{
  const now = sweep(raw);
  const LABELS: Record<string, string> = {
    "5.2 results": "/results: the carousel and the grid in the page's own block (only the carousel's 24px `mb-5` parts them — the ghost paid 48), and the Filters pill a phone's alone (`lg:hidden`, as `FilterSheet`)",
    "5.3 markets": "/markets: the count's line 17.25px (a 20px bar made the phone grid's count row 2.75px taller), and the Filters pill `lg:hidden`",
    "5.4 live": "/live: the hero ghost on PageHero's own padding, `p-5 lg:p-6` (16px short from 1024)",
    "5.5 receipts": "/wallet/receipts: each row on the row's own lines — the amount's 20px `text-body` line, 8px, the 18px date and `sm` chip line: 79px, not 83",
    "5.6 profile": "/profile: the settings grid on the page's own gap",
    "5.7 agent": "/agent: the page's own PageHeader, same eyebrow, title and subtitle (the two bars stood on the 32px rung, 28px low at 1280)",
    "5.8 updown": "/updown (and the journey's Juu/Chini tab): the page's own header with its tagline; a phone's one 48px field trigger, the pill rows from `sm`; 44px durations; the BoardViz band (50px toggle row, 12, 18px cubes)",
    "5.9 round": "/updown/[roundId]: two columns from `lg` as the page (`xl` stacked them from 1024 to 1279), the action panel before the pool",
    "5.10 question": "/markets/[id]: the header's own bands — the 40px row of chips and buttons, the 1px hairline (neutral), the question's 35/45px line — and no subtitle the page does not have",
    "5.11 tickets rail": "Tiketi zangu's rail ghost carries R5-B's `data-rail-ghost`, so the journey's rail rule draws it as the page's rail (12px into the gutter)",
    "5.12 history": "/updown/history: the page's search band (`mt-5 pb-5`) and its bar's two rows before the strip, the strip's tiles 89.5px",
  };
  for (const [k, label] of Object.entries(LABELS)) ok(`${k.split(" ")[0]} · ${label}`, now[k] === true, j(now[k]));
  // PLANTS — each fix undone in memory, one at a time, and its check alone reported.
  const PLANTS: Array<[string, string, string, string]> = [
    ["5.2 results", "src/app/results/loading.tsx", '<div className="min-w-0 flex-1">', "<div>"],
    ["5.3 markets", "src/app/markets/loading.tsx", "<FiltersGhost label={t.market.filtersOpen} />", '<div className="kp-fsheet kp-shimmer-track h-[44px] w-[170px] rounded-pill bg-bg-elevated" />'],
    ["5.4 live", "src/app/live/loading.tsx", '<PageHero glow="aqua" watermark={200}>', '<PageHero glow="aqua" watermark={200} contentClassName="relative z-10 p-5">'],
    ["5.5 receipts", "src/app/wallet/receipts/loading.tsx", '<div className="h-[18px] w-[88px] rounded-pill', '<div className="h-[22px] w-[88px] rounded-pill'],
    ["5.6 profile", "src/app/profile/loading.tsx", '<div className="grid grid-cols-1 gap-3 md:grid-cols-2">', '<div className="grid grid-cols-1 gap-2 md:grid-cols-2">'],
    ["5.7 agent", "src/app/agent/loading.tsx", " subtitle={t.agent.heroSub} />", " />"],
    ["5.8 updown", "src/app/updown/updown-ghost.tsx", '<div className="h-[50px] w-[136px] rounded-pill bg-bg-elevated kp-shimmer-track" />', ""],
    ["5.9 round", "src/app/updown/[roundId]/loading.tsx", "items-start gap-4 lg:[grid-template-columns", "items-start gap-4 xl:[grid-template-columns"],
    ["5.10 question", "src/app/markets/[id]/loading.tsx", '<div className="mb-3 h-px w-full bg-border" />', ""],
    ["5.11 tickets rail", "src/components/journey/tickets/tickets-ghost.tsx", ' data-rail-ghost=""', ""],
    ["5.12 history", "src/app/updown/history/history-ghost.tsx", "<div className={QUERY_BAR_CLASS} aria-hidden>", "<div aria-hidden>"],
  ];
  const missed = PLANTS.filter(([k, file, from, to]) => {
    const r = sweep((p) => (p === file ? raw(p).replace(from, to) : raw(p)));
    return raw(file).includes(from) === false || r[k] !== false || Object.entries(r).some(([kk, v]) => kk !== k && v !== now[kk]);
  }).map(([k]) => k);
  ok(`5.13 PLANT · each of the ${PLANTS.length} fixes undone in memory, one at a time, is reported by its own check and by no other`, missed.length === 0, missed.join(", "));
}

console.log(`\nvisual-pass-r5h: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
