// The Up & Down chart's 12 s deadline, replayed on a virtual clock (review 6, reviewer B).
// The effect body below is terminal-chart.tsx 135–199 at 9677a3f5 (saved beside this file as
// terminal-chart-effect.L135-199.txt and checked line by line at start-up), with React's setters replaced by recorders.
// Scenario: the history route stalls (a cold origin / a stalled connection behind Cloudflare, which answers 524 after
// its 100 s origin timeout). What does the pane say, and when is the request actually retried?
import { readFileSync } from "node:fs";

const SRC = readFileSync(new URL("./terminal-chart-effect.L135-199.txt", import.meta.url), "utf8");
for (const line of [
  "const deadline = setTimeout(() => {",
  "if (alive && seq === seqRef.current) setStatus((s) => (s === \"loading\" ? \"error\" : s));",
  "}, HISTORY_DEADLINE_MS);",
  "clearTimeout(deadline);",
  "load();",
  "const wait = Math.min(Math.max(pollMs, cadence != null ? cadence / 2 : 0), 120_000);",
  "timer = setTimeout(async () => { await load(); if (alive) paceNext(); }, wait);",
  "paceNext();",
]) if (!SRC.includes(line)) throw new Error(`the effect changed — not found: ${line}`);

// ── a virtual clock ──────────────────────────────────────────────────────────
let now = 0; let nextId = 1; const timers = new Map();
const setTimeout_ = (fn, ms) => { const id = nextId++; timers.set(id, { at: now + ms, fn }); return id; };
const clearTimeout_ = (id) => { timers.delete(id); };
async function runUntil(end) {
  for (;;) {
    await new Promise((r) => setImmediate(r)); // let promise chains settle
    let best = null;
    for (const [id, t] of timers) if (t.at <= end && (!best || t.at < best[1].at)) best = [id, t];
    if (!best) { now = end; return; }
    timers.delete(best[0]); now = best[1].at; best[1].fn();
  }
}

// ── the stalled route: every request is answered 100 s after it was sent, with Cloudflare's 524 ─────────────────────
const log = [];
const STALL_MS = Number(process.argv[2] ?? 100_000);
const fetch_ = (url, init) => { const sent = now; log.push(`t=${(now / 1000).toFixed(1)}s  fetch #${log.filter((l) => l.includes("fetch")).length + 1} sent`);
  return new Promise((resolve, reject) => {
    setTimeout_(() => resolve({ ok: false, status: 524, text: async () => "" }), STALL_MS);
    init?.signal?.addEventListener?.("abort", () => reject(new Error("aborted")));
  });
};

// ── the component's state and refs ──────────────────────────────────────────────────────────────────────────────────
let status = "loading";
const setStatus = (v) => { const n = typeof v === "function" ? v(status) : v; if (n !== status) log.push(`t=${(now / 1000).toFixed(1)}s  status ${status} → ${n}${n === "error" ? "   (the pane: \"Chati haipatikani — inajaribu tena\")" : ""}`); status = n; };
const setFeed = () => {};
const seqRef = { current: 0 }, lastRawRef = { current: "" }, cadenceRef = { current: null }, decimalsRef = { current: 2 }, rangeRef = { current: "1H" };
const document = { visibilityState: "visible", addEventListener() {}, removeEventListener() {} };
const HISTORY_DEADLINE_MS = 12_000, pollMs = 30_000, assetKey = "BTC", range = "1H", style = "line";

// ── terminal-chart.tsx 135–199, the effect's body (React's `useEffect(() => { … })` wrapper removed) ────────────────
function effect() {
  let alive = true;
  const ac = { signal: { addEventListener() {} }, abort() {} };
  lastRawRef.current = "";
  setFeed(null);
  setStatus("loading");
  const setTimeout = setTimeout_, clearTimeout = clearTimeout_, fetch = fetch_;
  const load = async () => {
    if (document.visibilityState === "hidden") return;
    const seq = ++seqRef.current;
    const deadline = setTimeout(() => {
      if (alive && seq === seqRef.current) setStatus((s) => (s === "loading" ? "error" : s));
    }, HISTORY_DEADLINE_MS);
    try {
      const r = await fetch(`/api/updown/history?asset=${encodeURIComponent(assetKey)}&range=${range}&style=${style}`, { cache: "no-cache", signal: ac.signal });
      if (!alive || seq !== seqRef.current) return;
      if (!r.ok) { setStatus((s) => (s === "ok" ? "ok" : "error")); return; }
      const raw = await r.text();
      if (!alive || seq !== seqRef.current) return;
      if (raw === lastRawRef.current) return;
      lastRawRef.current = raw;
      const data = JSON.parse(raw);
      const has = data.series.mode === "line" ? data.series.points.some((p) => p.price != null) : data.series.candles.length > 0;
      cadenceRef.current = data.medianDeltaMs;
      decimalsRef.current = data.decimals;
      if (has) { setFeed(data); setStatus("ok"); } else { setFeed(null); setStatus("empty"); }
    } catch {
      if (!alive || seq !== seqRef.current) return;
      setStatus((s) => (s === "ok" ? "ok" : "error"));
    } finally {
      clearTimeout(deadline);
    }
  };
  rangeRef.current = range;
  load();
  let timer = null;
  const paceNext = () => {
    const cadence = cadenceRef.current;
    const wait = Math.min(Math.max(pollMs, cadence != null ? cadence / 2 : 0), 120_000);
    timer = setTimeout(async () => { await load(); if (alive) paceNext(); }, wait);
  };
  paceNext();
  return () => { alive = false; ac.abort(); if (timer) clearTimeout(timer); };
}

effect();
await runUntil(300_000);
console.log(`route stalls ${STALL_MS / 1000}s per request; poll ${pollMs / 1000}s; deadline ${HISTORY_DEADLINE_MS / 1000}s; 5 virtual minutes:`);
for (const l of log) console.log("  " + l);
