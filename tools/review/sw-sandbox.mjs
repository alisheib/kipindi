// Throwaway: run public/sw.js in a vm sandbox with a recording Cache Storage and a fake network.
import { readFileSync } from "node:fs";
import vm from "node:vm";

const src = readFileSync("F:/kipindi-vis/public/sw.js", "utf8");
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
  return {
    stores, open,
    async keys() { return [...stores.keys()]; },
    async delete(n) { return stores.delete(n); },
    async match(req) { for (const m of stores.values()) { const e = m.get(keyOf(req)); if (e) return e.res.clone(); } return undefined; },
  };
}

let online = true;
const seen = [];
async function net(req) {
  const url = typeof req === "string" ? new URL(req, ORIGIN).href : req.url;
  seen.push({ url, credentials: req.credentials, mode: req.mode });
  if (!online) throw new TypeError("Failed to fetch");
  const path = new URL(url).pathname;
  if (path === "/offline") return new Response("<!doctype html><title>offline doc</title>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  // A dynamic page route whose param ends in .png: the page renders notFound() inside loading.tsx, so 200 + the shell
  // rendered for whoever sent the cookie.
  if (path.startsWith("/markets/")) return new Response(`<!doctype html><header>Salio TZS 188,888 · Asha M.</header><main>404</main>`, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  return new Response("asset", { status: 200, headers: { "content-type": "image/svg+xml" } });
}

const listeners = {};
const caches = makeCaches();
const self = {
  location: new URL(ORIGIN + "/sw.js"),
  addEventListener: (t, f) => { listeners[t] = f; },
  skipWaiting() {},
  clients: { claim() {}, matchAll: async () => [], openWindow: async () => {} },
  registration: { showNotification: async (t, o) => ({ t, o }) },
};
class SWRequest extends Request { constructor(u, i) { super(typeof u === "string" ? new URL(u, ORIGIN).href : u, i); } }
const ctx = vm.createContext({ self, caches, fetch: net, Request: SWRequest, Response, URL, Promise, console, Object, JSON });
vm.runInContext(src, ctx);

const run = async (type, extra) => {
  const waits = []; let responded;
  const ev = { ...extra, waitUntil: (p) => waits.push(p), respondWith: (p) => { responded = p; } };
  listeners[type](ev);
  await Promise.allSettled(waits);
  return responded;
};

await run("install", {});
await run("activate", {});

// 1. A navigation to an address ending in .png, signed in (credentials include): which branch answers it?
const nav = { method: "GET", url: ORIGIN + "/markets/abc.png", mode: "navigate", credentials: "include", destination: "document" };
let r = await run("fetch", { request: nav });
console.log("navigate /markets/abc.png respondWith set:", !!r, "body:", r && (await (await r).text()).slice(0, 80));
await new Promise((res) => setTimeout(res, 10));
const v5 = caches.stores.get("50pick-v5");
console.log("cache keys after:", [...v5.keys()]);

// 2. Later, another person on the same phone, online: the SWR rule answers from the cache first.
const r2 = await run("fetch", { request: { ...nav } });
console.log("second visit answered with:", (await (await r2).text()).slice(0, 80));

// 3. Offline navigation to a normal page: offline document from v5.
online = false;
const r3 = await run("fetch", { request: { method: "GET", url: ORIGIN + "/positions", mode: "navigate" } });
console.log("offline /positions:", (await (await r3).text()).slice(0, 60));
console.log("precache credentials:", seen.filter((s) => s.url.endsWith("/offline")).map((s) => s.credentials));
