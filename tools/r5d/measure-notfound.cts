/* R5-D · G1's sibling: the not-found element each segment hands its LayoutRouter (create-component-tree.js
 * createBoundaryConventionElement → `notFound: notFoundComponent`), serialized as the review measured the ghosts.
 * Run from F:\kipindi-r5d:  npx tsx <this file> [sw|en|zh] */
const { createRequire } = require("node:module");
const fs = require("node:fs");
const zlib = require("node:zlib");
const ROOT = "F:/kipindi-r5d";
const req = createRequire(ROOT + "/package.json");
const LOCALE = (process.argv[2] || "sw") as "sw" | "en" | "zh";
const nh = req("next/headers");
nh.cookies = async () => ({ get: (k: string) => (k === "kp-locale" ? { value: LOCALE } : undefined) });
nh.headers = async () => new Headers({ "x-pathname": "/" });
// A server component may call useId (BrandTopo does): outside React's own renderer it needs an answer — the id's bytes
// are what Flight would carry (a short ":S0:"-like id).
req("react").useId = () => "_S_0_";
const pages: Record<string, () => Promise<unknown>> = {
  root: req(ROOT + "/src/app/not-found.tsx").default,
  market: req(ROOT + "/src/app/markets/[id]/not-found.tsx").default,
  proposal: req(ROOT + "/src/app/proposals/[id]/not-found.tsx").default,
};
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
    throw new Error("unknown element type " + String(node.type));
  }
  if (typeof node === "object") return Object.fromEntries(await Promise.all(Object.entries(node).map(async ([k, v]) => [k, await flight(v, named)])));
  return String(node);
}
const gz = (s: string) => zlib.gzipSync(Buffer.from(s), { level: 6 }).length;
(async () => {
  console.log(`locale ${LOCALE}`);
  for (const [name, NotFound] of Object.entries(pages)) {
    const named = new Set<string>();
    const json = JSON.stringify(await flight(await NotFound(), named));
    console.log(`${name.padEnd(9)} not-found element: ${Buffer.byteLength(json)} B Flight JSON (gzip ${gz(json)} B) · client refs: ${[...named].join(", ")}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
