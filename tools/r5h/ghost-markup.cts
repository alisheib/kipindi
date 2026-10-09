/* R5-H · G-2 · THE DRAWN MARKUP OF EVERY PLAYER LOADING FILE, before and after — rendered with react-dom/server inside the
 * root layout's providers (the router, the pathname, the i18n provider at the reader's language), for sw/en/zh and for a
 * journey and a classic reader. A server component (no "use client") is RUN (awaited) the way the server runs it; a client
 * component is left to React, as the browser (and the server's HTML pass) renders it. The journey's lazy binding is drawn
 * as what it binds (`JourneyRouteGhost`), which is what renders once its chunk is in.
 * Run from the worktree:  npx tsx <this file> <worktree> <out.json> */
const { createRequire } = require("node:module");
const NodeModule = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = (process.argv[2] || "F:/kipindi-r5h").replace(/\\/g, "/");
const OUT = process.argv[3];
const req = createRequire(ROOT + "/package.json");
type Locale = "sw" | "en" | "zh";
const REQ = { locale: "sw" as Locale, path: "/", journey: true };
const nh = req("next/headers");
nh.cookies = async () => ({ get: (k: string) => (k === "kp-locale" ? { value: REQ.locale } : undefined), getAll: () => [], has: () => false });
nh.headers = async () => new Headers({ "x-pathname": REQ.path });
const jp = req.resolve(ROOT + "/src/lib/server/journey-preview.ts");
const stub = new NodeModule(jp); stub.filename = jp; stub.loaded = true;
stub.exports = { resolveSimpleJourney: async () => ({ state: "LIVE", journey: REQ.journey, preview: false, pass: null }) };
req.cache[jp] = stub;
const React = req("react");
const h = React.createElement;
const { renderToStaticMarkup } = req("react-dom/server");
const { AppRouterContext } = req("next/dist/shared/lib/app-router-context.shared-runtime");
const { PathnameContext } = req("next/dist/shared/lib/hooks-client-context.shared-runtime");
const { I18nProvider } = req(ROOT + "/src/lib/i18n.tsx");
const ROUTER = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {}, hmrRefresh() {} };

const files: string[] = [];
const walk = (d: string) => { for (const n of fs.readdirSync(d)) { const p = path.posix.join(d, n); if (fs.statSync(p).isDirectory()) { if (!p.endsWith("/src/app/admin")) walk(p); } else if (n === "loading.tsx") files.push(p); } };
walk(ROOT + "/src/app");
files.sort();
const mods = new Map<string, any>();
for (const f of files) mods.set(f, req(f).default);
let lazyGhost: unknown = null, realGhost: unknown = null;
try { lazyGhost = req(ROOT + "/src/components/journey/route-ghost-lazy.tsx").LazyJourneyRouteGhost; realGhost = req(ROOT + "/src/components/journey/route-ghost.tsx").JourneyRouteGhost; } catch { /* older tree */ }

const isClientFile = (file: string) => {
  let src = ""; try { src = fs.readFileSync(file, "utf8"); } catch { return false; }
  const head = src.replace(/^\uFEFF/, "").replace(/^(\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");
  return /^["']use client["']/.test(head);
};
const clientFns = new Set<unknown>();
const collect = () => {
  for (const [file, mod] of Object.entries(req.cache) as [string, any][]) {
    if (!/[\\/]src[\\/]/.test(file) || !isClientFile(file)) continue;
    for (const v of Object.values(mod.exports ?? {})) if (typeof v === "function" || (v && typeof v === "object" && "$$typeof" in (v as object))) clientFns.add(v);
  }
};
collect();
/** The tree with every server component RUN (awaited); client components and host elements kept. */
async function flatten(node: any): Promise<any> {
  if (node === null || node === undefined || typeof node !== "object") return node;
  if (Array.isArray(node)) return Promise.all(node.map(flatten));
  if (node.$$typeof !== Symbol.for("react.transitional.element")) return node;
  let { type, props } = node;
  if (type === lazyGhost && realGhost) type = realGhost;
  if (typeof type === "function" && !clientFns.has(type)) return flatten(await type(props));
  const kids: Record<string, any> = {};
  for (const [k, v] of Object.entries(props ?? {})) kids[k] = (k === "children" || (v && typeof v === "object" && (v as any).$$typeof)) ? await flatten(v) : v;
  return h(type, { ...kids, key: node.key });
}
const routeOf = (f: string) => "/" + f.slice(ROOT.length + "/src/app/".length).replace(/\/?loading\.tsx$/, "")
  .replace("[id]", "rec_any").replace("[roundId]", "rnd_any").replace("[token]", "tok_any");
(async () => {
  const out: Record<string, string> = {};
  for (const f of files) {
    const rel = f.slice(ROOT.length + 1);
    const route = routeOf(f).replace(/\/$/, "") || "/";
    for (const l of ["sw", "en", "zh"] as Locale[]) for (const journey of [true, false]) {
      REQ.locale = l; REQ.path = route; REQ.journey = journey;
      const C = mods.get(f);
      let html = "";
      try {
        const el = await flatten(h(C, {}));
        html = renderToStaticMarkup(h(AppRouterContext.Provider, { value: ROUTER }, h(PathnameContext.Provider, { value: route }, h(I18nProvider, { initial: l }, el))));
      } catch (e) { html = `THREW ${String(e).slice(0, 200)}`; }
      out[`${rel}|${l}|${journey ? "journey" : "classic"}`] = html;
    }
  }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  const threw = Object.entries(out).filter(([, v]) => v.startsWith("THREW"));
  console.log(`${files.length} loading files × 3 languages × 2 shells = ${Object.keys(out).length} renders; ${threw.length} threw`);
  for (const [k, v] of threw.slice(0, 10)) console.log("  ", k, v);
})().catch((e) => { console.error(e); process.exit(1); });
