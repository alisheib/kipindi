// R5-D: the reviewer's sandbox (scratchpad/review/sw-sandbox.mjs), run on a given sw.js with real Request/Response.
import { readFileSync } from "node:fs";
import vm from "node:vm";
const src = readFileSync(process.argv[2], "utf8");
const ORIGIN = "https://50pick.tz";
function makeCaches() {
  const stores = new Map();
  const keyOf = (r) => (typeof r === "string" ? new URL(r, ORIGIN).href : r.url);
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return {
      async add(req) { const res = await net(req); if (!res.ok) throw new TypeError("not ok " + res.status); m.set(keyOf(req), { req, res }); },
      async put(req, res) { m.set(keyOf(req), { req, res }); },
      async match(req) { const e = m.get(keyOf(req)); return e ? e.res.clone() : undefined; },
    };
  };
  return { stores, open, async keys() { return [...stores.keys()]; }, async delete(n) { return stores.delete(n); },
    async match(req) { for (const m of stores.values()) { const e = m.get(keyOf(req)); if (e) return e.res.clone(); } return undefined; } };
}
let online = true;
const seen = [];
async function net(req) {
  const url = typeof req === "string" ? new URL(req, ORIGIN).href : req.url;
  seen.push({ url, credentials: req.credentials, mode: req.mode });
  if (!online) throw new TypeError("Failed to fetch");
  const u = new URL(url);
  if (u.pathname === "/offline") return new Response("<!doctype html><title>offline doc</title>", { status: 200, headers: { "content-type": "text/html; charset=utf-8", date: new Date().toUTCString() } });
  if (u.searchParams.has("_rsc")) return new Response('0:["$","header",null,{"children":"Salio TZS 188,888 · Asha M."}]', { status: 200, headers: { "content-type": "text/x-component" } });
  if (u.pathname.startsWith("/markets/")) return new Response("<!doctype html><header>Salio TZS 188,888 · Asha M.</header><main>404</main>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  return new Response("asset", { status: 200, headers: { "content-type": "image/svg+xml" } });
}
const listeners = {};
const caches = makeCaches();
const self = { location: new URL(ORIGIN + "/sw.js"), addEventListener: (t, f) => { listeners[t] = f; }, skipWaiting() {},
  clients: { claim() {}, matchAll: async () => [], openWindow: async () => {} }, registration: { showNotification: async (t, o) => ({ t, o }) } };
class SWRequest extends Request { constructor(u, i) { super(typeof u === "string" ? new URL(u, ORIGIN).href : u, i); } }
const ctx = vm.createContext({ self, caches, fetch: net, Request: SWRequest, Response, URL, Promise, console, Object, JSON });
vm.runInContext(src, ctx);
const CACHE = vm.runInContext("CACHE_NAME", ctx);
const run = async (type, extra) => {
  const waits = []; let responded;
  const ev = { ...extra, waitUntil: (p) => waits.push(p), respondWith: (p) => { responded = p; } };
  listeners[type](ev);
  let a; try { a = responded ? await responded : undefined; } catch (e) { a = { clone: () => ({ text: async () => "(a network error: " + e.message + ")" }) }; }
  for (let n = -1; n !== waits.length;) { n = waits.length; await Promise.allSettled(waits); }
  return a;
};
await run("install", {}); await run("activate", {});
const text = async (r) => (r ? (await r.clone().text()).slice(0, 60) : "(no answer)");
const keys = () => [...(caches.stores.get(CACHE)?.keys() ?? [])].map((k) => new URL(k).pathname + new URL(k).search);
console.log(`worker ${process.argv[2].split(/[\/]/).pop()} · cache ${CACHE}`);
const nav = { method: "GET", url: ORIGIN + "/markets/abc.png", mode: "navigate", credentials: "include", destination: "document" };
console.log("1 navigate /markets/abc.png (signed in):", await text(await run("fetch", { request: nav })));
const move = new SWRequest(ORIGIN + "/markets/abc.png?_rsc=1x2y3", { mode: "cors", credentials: "include" });
console.log("2 the router's data for a move there:", await text(await run("fetch", { request: move })));
console.log("  cache keys after:", JSON.stringify(keys()));
const next = new SWRequest(ORIGIN + "/markets/abc.png?_rsc=1x2y3", { mode: "cors" });
online = false;
console.log("3 next visitor's move there, offline:", await text(await run("fetch", { request: next })));
console.log("4 next visitor opens it, offline:", await text(await run("fetch", { request: { method: "GET", url: ORIGIN + "/markets/abc.png", mode: "navigate", destination: "document" } })));
console.log("  precache credentials:", JSON.stringify(seen.filter((s) => s.url.endsWith("/offline")).map((s) => s.credentials)));
