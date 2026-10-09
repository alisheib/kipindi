/* R5-D · G1's siblings, measured: EVERY convention element a segment hands its LayoutRouter — each loading.tsx (wrapped in
 * LoadingBoundaryProvider, create-component-tree.js 461-478 / 820-830) and each not-found.tsx (`notFound`, 310-336, 443) —
 * rides in every payload that renders that segment: the document, and every router.refresh() (which renders from the
 * root). Serialized the way the review measured the ghosts (scratchpad/review/measure-ghosts.cts): a "use client" export
 * is a $L reference with its props, a server component is replaced by what it returns, a host element ["$",tag,key,props].
 * Run from the worktree:  npx tsx <this file> <worktree> [sw|en|zh] [journey|classic] */
const { createRequire } = require("node:module");
const NodeModule = require("node:module");
const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");
const ROOT = (process.argv[2] || "F:/kipindi-r5d").replace(/\\/g, "/");
const LOCALE = (process.argv[3] || "sw") as "sw" | "en" | "zh";
const JOURNEY = (process.argv[4] || "journey") === "journey";
const req = createRequire(ROOT + "/package.json");
const nh = req("next/headers");
let PATHNAME = "/";
nh.cookies = async () => ({ get: (k: string) => (k === "kp-locale" ? { value: LOCALE } : undefined), getAll: () => [], has: () => false });
nh.headers = async () => new Headers({ "x-pathname": PATHNAME });
const jp = req.resolve(ROOT + "/src/lib/server/journey-preview.ts");
const stub = new NodeModule(jp); stub.filename = jp; stub.loaded = true;
stub.exports = { resolveSimpleJourney: async () => ({ state: "LIVE", journey: JOURNEY, preview: false, pass: null }) };
req.cache[jp] = stub;
// A server component may call useId (BrandTopo): outside React's renderer it needs an answer of Flight's size.
req("react").useId = () => "_S_0_";

const files: string[] = [];
const walk = (d: string) => { for (const n of fs.readdirSync(d)) { const p = path.posix.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else if (n === "loading.tsx" || n === "not-found.tsx") files.push(p); } };
walk(ROOT + "/src/app");
const mods = new Map<string, unknown>();
for (const f of files) { try { mods.set(f, req(f).default); } catch (e) { mods.set(f, e); } }

const clientRefs = new Map<unknown, string>();
for (const [file, mod] of Object.entries(req.cache) as [string, any][]) {
  if (!/\.(?:[cm]?js|tsx?)$/.test(file)) continue;
  let src = ""; try { src = fs.readFileSync(file, "utf8"); } catch { continue; }
  const head = src.replace(/^\uFEFF/, "").replace(/^(\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");
  if (!/^["']use client["']/.test(head)) continue;
  const short = file.includes("node_modules") ? file.split(/node_modules[\\/]/).pop() : file.split(/[\\/]src[\\/]/)[1];
  for (const [name, v] of Object.entries(mod.exports ?? {})) if (typeof v === "function" || (v !== null && typeof v === "object" && "$$typeof" in (v as object))) clientRefs.set(v, `${short}#${name}`);
}
async function flight(node: any, named: Set<string>): Promise<any> {
  if (node === null || node === undefined) return node === undefined ? "$undefined" : null;
  if (typeof node === "string") return node.startsWith("$") ? "$" + node : node;
  if (typeof node === "number" || typeof node === "boolean") return node;
  if (Array.isArray(node)) return Promise.all(node.map((n) => flight(n, named)));
  if (node.$$typeof === Symbol.for("react.transitional.element")) {
    const props = async () => Object.fromEntries(await Promise.all(Object.entries(node.props ?? {}).filter(([, v]) => v !== undefined).map(async ([k, v]) => [k, typeof v === "function" ? "$F" : await flight(v, named)])));
    if (typeof node.type === "string") return ["$", node.type, node.key ?? null, await props()];
    if (node.type === Symbol.for("react.fragment")) return flight(node.props.children, named);
    const ref = clientRefs.get(node.type);
    if (ref) { named.add(ref); return ["$", "$L" + named.size.toString(16), node.key ?? null, await props()]; }
    if (typeof node.type === "function") return flight(await node.type(node.props), named);
    if (node.type && node.type.$$typeof === Symbol.for("react.forward_ref")) return flight(await node.type.render(node.props, null), named);
    if (node.type && node.type.$$typeof === Symbol.for("react.memo")) return flight({ ...node, type: node.type.type }, named);
    throw new Error("unknown element type " + String(node.type));
  }
  if (typeof node === "object") return Object.fromEntries(await Promise.all(Object.entries(node).map(async ([k, v]) => [k, await flight(v, named)])));
  return String(node);
}
const gz = (s: string) => zlib.gzipSync(Buffer.from(s), { level: 6 }).length;
(async () => {
  const rows: Array<[string, number, number, string]> = [];
  for (const f of files) {
    const rel = f.slice(ROOT.length + 1);
    const C = mods.get(f);
    if (typeof C !== "function") { rows.push([rel, -1, -1, `LOAD FAILED ${String(C).slice(0, 80)}`]); continue; }
    PATHNAME = "/" + rel.replace(/^src\/app\/?/, "").replace(/\/?(loading|not-found)\.tsx$/, "");
    try {
      const named = new Set<string>();
      const json = JSON.stringify(await flight(await (C as any)({}), named));
      rows.push([rel, Buffer.byteLength(json), gz(json), [...named].map((r) => r.replace(/\\/g, "/")).join(" ")]);
    } catch (e) { rows.push([rel, -1, -1, `RENDER FAILED ${String(e).slice(0, 100)}`]); }
  }
  console.log(`locale ${LOCALE} · ${JOURNEY ? "journey" : "classic"} reader · ${ROOT}`);
  for (const [f, b, g, refs] of rows) console.log(`${String(b).padStart(7)} B  gz ${String(g).padStart(5)}  ${f}${refs ? `   [${refs.slice(0, 140)}]` : ""}`);
  console.log(`JSON ${JSON.stringify(Object.fromEntries(rows.map(([f, b, g]) => [f, [b, g]])))}`);
})().catch((e) => { console.error(e); process.exit(1); });
