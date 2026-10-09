// R5-D · F3 in the reviewer's sandbox shape (real Request/Response): the kept /offline is two days old; three
// navigations in one worker wake; then a wake with a fresh copy; then a failed refresh.
import { readFileSync } from "node:fs";
import vm from "node:vm";
const src = readFileSync(process.argv[2], "utf8");
const ORIGIN = "https://50pick.tz";
async function scenario(label, keptAgeMs, offlineStatus) {
  const stores = new Map(); const seen = [];
  const keyOf = (r) => (typeof r === "string" ? new URL(r, ORIGIN).href : r.url);
  async function net(req) {
    const url = typeof req === "string" ? new URL(req, ORIGIN).href : req.url;
    seen.push({ path: new URL(url).pathname, credentials: req.credentials, cache: req.cache, mode: req.mode });
    const u = new URL(url);
    if (u.pathname === "/offline") return new Response(`<offline doc v2>`, { status: offlineStatus, headers: { "content-type": "text/html; charset=utf-8", date: new Date().toUTCString() } });
    return new Response("<page>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
  }
  const open = async (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name);
    return { async add(req) { const res = await net(req); if (!res.ok) throw new TypeError("not ok " + res.status); m.set(keyOf(req), res); },
      async put(req, res) { m.set(keyOf(req), res); }, async match(req) { const e = m.get(keyOf(req)); return e ? e.clone() : undefined; } };
  };
  const caches = { open, async keys() { return [...stores.keys()]; }, async delete(n) { return stores.delete(n); } };
  const listeners = {};
  const self = { location: new URL(ORIGIN + "/sw.js"), addEventListener: (t, f) => { listeners[t] = f; }, skipWaiting() {}, clients: { claim() {} } };
  class SWRequest extends Request { constructor(u, i) { super(typeof u === "string" ? new URL(u, ORIGIN).href : u, i); } }
  const ctx = vm.createContext({ self, caches, fetch: net, Request: SWRequest, Response, URL, Promise, console, Object, JSON, Date, Math });
  vm.runInContext(src, ctx);
  const CACHE = vm.runInContext("CACHE_NAME", ctx);
  // the phone already holds a copy of the given age
  (await open(CACHE)).put(ORIGIN + "/offline", new Response("<offline doc v1>", { headers: { "content-type": "text/html", date: new Date(Date.now() - keptAgeMs).toUTCString() } }));
  const run = async (type, extra) => {
    const waits = []; let responded;
    listeners[type]({ ...extra, waitUntil: (p) => waits.push(p), respondWith: (p) => { responded = p; } });
    const a = responded ? await responded : undefined;
    for (let n = -1; n !== waits.length;) { n = waits.length; await Promise.allSettled(waits); }
    return a;
  };
  for (const p of ["/positions", "/updown", "/wallet"]) await run("fetch", { request: { method: "GET", url: ORIGIN + p, mode: "navigate", credentials: "include", destination: "document" } });
  const kept = await (await (await open(CACHE)).match(ORIGIN + "/offline")).text();
  const refreshes = seen.filter((s) => s.path === "/offline");
  console.log(`${label}: /offline requests ${refreshes.length} ${JSON.stringify(refreshes.map(({ credentials, cache }) => ({ credentials, cache })))} · kept now "${kept}"`);
}
await scenario("kept copy 2 days old, server ok ", 2 * 86400e3, 200);
await scenario("kept copy 1 hour old            ", 3600e3, 200);
await scenario("kept copy 2 days old, server 503", 2 * 86400e3, 503);
