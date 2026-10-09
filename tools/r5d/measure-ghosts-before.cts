/* Throwaway: estimate the RSC (Flight) bytes the journey root-loading element adds, and the HTML of each ghost.
 * Run from F:\kipindi-vis:  npx tsx <this file> [sw|en|zh]
 * Stubs: next/headers (cookies/headers), journey-preview (resolveSimpleJourney -> journey:true). No DB, no server. */
const { createRequire } = require("node:module");
const NodeModule = require("node:module");
const fs = require("node:fs");
const zlib = require("node:zlib");
const ROOT = "F:/kipindi-r5d";
const req = createRequire(ROOT + "/package.json");
const React = req("react");
const { renderToStaticMarkup } = req("react-dom/server");

const LOCALE = (process.argv[2] || "sw") as "sw" | "en" | "zh";

// ── stubs ─────────────────────────────────────────────────────────────────────────────────────
const nh = req("next/headers");
const jar = { get: (k: string) => (k === "kp-locale" ? { value: LOCALE } : undefined) };
nh.cookies = async () => jar;
nh.headers = async () => new Headers({ "x-pathname": "/" });
const jpPath = req.resolve(ROOT + "/src/lib/server/journey-preview.ts");
const stub = new NodeModule(jpPath);
stub.filename = jpPath;
stub.loaded = true;
stub.exports = { resolveSimpleJourney: async () => ({ state: "LIVE", journey: true, preview: false, pass: null }) };
req.cache[jpPath] = stub;

const { dict } = req(ROOT + "/src/lib/i18n-dict.ts");
const { JourneyRouteGhost } = req(ROOT + "/src/components/journey/route-ghost.tsx");
const brand = req(ROOT + "/src/components/brand.tsx");

// ── which loaded functions are client components ("use client" modules) ───────────────────────
const clientFns = new Map<Function, string>();
for (const [file, mod] of Object.entries(req.cache) as [string, any][]) {
  if (!/kipindi-r5d[\\/]src[\\/]/.test(file)) continue;
  let src = "";
  try { src = fs.readFileSync(file, "utf8"); } catch { continue; }
  const head = src.replace(/^\uFEFF/, "").replace(/^(\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");
  if (!/^["']use client["']/.test(head)) continue;
  for (const [name, v] of Object.entries(mod.exports ?? {})) if (typeof v === "function") clientFns.set(v as Function, `${file.split(/[\\/]src[\\/]/)[1]}#${name}`);
}

// ── a Flight-like serializer (production shape: ["$",type,key,props]) ─────────────────────────
const FRAGMENT = Symbol.for("react.fragment");
const importRows = new Map<string, number>();
let nextId = 1;
const usedClient = new Set<string>();
async function resolveNode(node: any): Promise<any> {
  // returns a JSON-able value in Flight's shape
  if (node === null || node === undefined) return node === undefined ? "$undefined" : null;
  if (typeof node === "string") return node.startsWith("$") ? "$" + node : node;
  if (typeof node === "number" || typeof node === "boolean") return node;
  if (Array.isArray(node)) return Promise.all(node.map(resolveNode));
  if (typeof node === "object" && node.$$typeof === Symbol.for("react.transitional.element")) {
    const { type, key, props } = node;
    if (typeof type === "string") return ["$", type, key ?? null, await resolveProps(props)];
    if (type === FRAGMENT) return key == null ? resolveNode(props.children) : ["$", "$Sreact.fragment", key, await resolveProps(props)];
    if (typeof type === "function") {
      const ref = clientFns.get(type);
      if (ref) {
        usedClient.add(ref);
        if (!importRows.has(ref)) importRows.set(ref, nextId++);
        return ["$", "$L" + importRows.get(ref)!.toString(16), key ?? null, await resolveProps(props)];
      }
      const out = await type(props);
      return resolveNode(out);
    }
    throw new Error("unknown element type " + String(type));
  }
  if (typeof node === "object") return resolveProps(node);
  return String(node);
}
async function resolveProps(props: Record<string, any>): Promise<Record<string, any>> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(props ?? {})) {
    if (v === undefined) continue;
    if (typeof v === "function") { out[k] = "$F"; continue; }
    out[k] = await resolveNode(v);
  }
  return out;
}
/** The element tree with server components replaced by their output (so Fizz can render it synchronously). */
async function flatten(node: any): Promise<any> {
  if (node === null || node === undefined || typeof node !== "object") return node;
  if (Array.isArray(node)) return Promise.all(node.map(flatten));
  if (node.$$typeof !== Symbol.for("react.transitional.element")) return node;
  const { type, props } = node;
  if (typeof type === "function" && !clientFns.has(type)) return flatten(await type(props));
  const kids = props?.children !== undefined ? await flatten(props.children) : undefined;
  return React.createElement(type, { ...props, key: node.key, children: kids });
}

const gz = (s: string) => zlib.gzipSync(Buffer.from(s), { level: 6 }).length;
/** As Next inlines a row into the document: <script>self.__next_f.push([1,"…"])</script> */
const inlined = (row: string) => `<script>self.__next_f.push(${JSON.stringify([1, row])})</script>`;
const IMPORT_ROW_BYTES = 200; // one `N:I["[project]/src/…",[chunks…],"Name"]` row, Turbopack-shaped (estimate)

(async () => {
  const el = JourneyRouteGhost({ t: dict[LOCALE], locale: LOCALE });
  const { routes, patterns, other } = el.props;
  console.log(`locale ${LOCALE}`);
  console.log("ghost".padEnd(26), "flight B".padStart(9), "html B".padStart(8));
  let total = 0;
  const parts: string[] = [];
  const entries: [string, any][] = [...Object.entries(routes), ...patterns.map(([s, n]: [string, any]) => [s, n]), ["other", other]];
  for (const [k, node] of entries) {
    const json = JSON.stringify(await resolveNode(node));
    const html = renderToStaticMarkup(await flatten(node));
    total += json.length;
    parts.push(json);
    console.log(k.padEnd(26), String(json.length).padStart(9), String(Buffer.byteLength(html)).padStart(8));
  }
  const whole = JSON.stringify(await resolveNode(el));
  const row = `9:${whole}\n`;
  const importBytes = importRows.size * IMPORT_ROW_BYTES;
  console.log("—");
  console.log(`whole RoutePick element, Flight JSON: ${Buffer.byteLength(whole)} B (gzip ${gz(row)} B); inlined in the document: ${Buffer.byteLength(inlined(row))} B (gzip ${gz(inlined(row))} B)`);
  console.log(`client references named: ${[...usedClient].join(", ")}  (+~${importBytes} B of import rows if not already on the page)`);
  // the classic box, for comparison
  const classic = React.createElement("div", { className: "mx-auto max-w-[1280px] px-3 lg:px-6 py-10" }, React.createElement(brand.SectionLoader, { height: 360 }));
  const cjson = JSON.stringify(await resolveNode(classic));
  console.log(`classic SectionLoader element, Flight JSON: ${cjson.length} B`);
})().catch((e) => { console.error(e); process.exit(1); });
