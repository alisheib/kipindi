/* R5-D · G1 after: the reviewer's measure (scratchpad/review/measure-ghosts.cts), applied to what app/loading.tsx now
 * returns for a journey reader — RootLoading() itself, with next/headers and the journey resolver stubbed as the
 * reviewer stubbed them. Same Flight-shaped serializer: a "use client" export is a $L reference, its props serialized.
 * Run from F:\kipindi-r5d:  npx tsx <this file> [sw|en|zh] */
const { createRequire } = require("node:module");
const NodeModule = require("node:module");
const fs = require("node:fs");
const zlib = require("node:zlib");
const ROOT = "F:/kipindi-r5d";
const req = createRequire(ROOT + "/package.json");
const LOCALE = (process.argv[2] || "sw") as "sw" | "en" | "zh";
const nh = req("next/headers");
nh.cookies = async () => ({ get: (k: string) => (k === "kp-locale" ? { value: LOCALE } : undefined) });
nh.headers = async () => new Headers({ "x-pathname": "/" });
const jpPath = req.resolve(ROOT + "/src/lib/server/journey-preview.ts");
const stub = new NodeModule(jpPath); stub.filename = jpPath; stub.loaded = true;
stub.exports = { resolveSimpleJourney: async () => ({ state: "LIVE", journey: true, preview: false, pass: null }) };
req.cache[jpPath] = stub;
const RootLoading = req(ROOT + "/src/app/loading.tsx").default;

const clientRefs = new Map<unknown, string>();
const collect = () => {
  for (const [file, mod] of Object.entries(req.cache) as [string, any][]) {
    if (!/kipindi-r5d[\\/]src[\\/]/.test(file)) continue;
    let src = ""; try { src = fs.readFileSync(file, "utf8"); } catch { continue; }
    const head = src.replace(/^\uFEFF/, "").replace(/^(\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*/, "");
    if (!/^["']use client["']/.test(head)) continue;
    for (const [name, v] of Object.entries(mod.exports ?? {})) {
      if (typeof v === "function" || (v !== null && typeof v === "object" && "$$typeof" in (v as object))) clientRefs.set(v, `${file.split(/[\\/]src[\\/]/)[1]}#${name}`);
    }
  }
};
const FRAGMENT = Symbol.for("react.fragment");
const importRows = new Map<string, number>(); let nextId = 1;
async function resolveNode(node: any): Promise<any> {
  if (node === null || node === undefined) return node === undefined ? "$undefined" : null;
  if (typeof node === "string") return node.startsWith("$") ? "$" + node : node;
  if (typeof node === "number" || typeof node === "boolean") return node;
  if (Array.isArray(node)) return Promise.all(node.map(resolveNode));
  if (typeof node === "object" && node.$$typeof === Symbol.for("react.transitional.element")) {
    const { type, key, props } = node;
    if (typeof type === "string") return ["$", type, key ?? null, await resolveProps(props)];
    if (type === FRAGMENT) return key == null ? resolveNode(props.children) : ["$", "$Sreact.fragment", key, await resolveProps(props)];
    const ref = clientRefs.get(type);
    if (ref) { if (!importRows.has(ref)) importRows.set(ref, nextId++); return ["$", "$L" + importRows.get(ref)!.toString(16), key ?? null, await resolveProps(props)]; }
    if (typeof type === "function") return resolveNode(await type(props));
    throw new Error("unknown element type " + String(type));
  }
  if (typeof node === "object") return resolveProps(node);
  return String(node);
}
async function resolveProps(props: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(props ?? {})) { if (v === undefined) continue; if (typeof v === "function") { out[k] = "$F"; continue; } out[k] = await resolveNode(v); }
  return out;
}
const gz = (s: string) => zlib.gzipSync(Buffer.from(s), { level: 6 }).length;
const inlined = (row: string) => `<script>self.__next_f.push(${JSON.stringify([1, row])})</script>`;
(async () => {
  const el = await RootLoading();
  collect();
  const whole = JSON.stringify(await resolveNode(el));
  const row = `9:${whole}\n`;
  // One Turbopack-shaped import row for the lazy module, as Next writes it (module id, its chunks, the export name).
  const importRow = `1a:I["[project]/src/components/journey/route-ghost-lazy.tsx [app-client] (ecmascript)",["/_next/static/chunks/5f2c1e9a7b3d4c60.js","/_next/static/chunks/0b6d27a91c4e8f13.js"],"LazyJourneyRouteGhost"]\n`;
  console.log(`locale ${LOCALE}`);
  console.log(`the root loading element, Flight JSON: ${Buffer.byteLength(whole)} B (gzip ${gz(row)} B); inlined in the document: ${Buffer.byteLength(inlined(row))} B (gzip ${gz(inlined(row))} B)`);
  console.log(`  its client reference(s): ${[...importRows.keys()].join(", ")} — one import row ~${Buffer.byteLength(importRow)} B (inlined ${Buffer.byteLength(inlined(importRow))} B), the first time a payload names it`);
  console.log(`  the element: ${whole}`);
})().catch((e) => { console.error(e); process.exit(1); });
