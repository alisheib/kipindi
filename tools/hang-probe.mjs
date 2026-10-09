// hang-probe — which journey page stops answering, and WHERE its script is stuck.
// Same premise as `qa:landmark-seal --journey` (a staff preview pass, the demo player, kp-locale), but every page.evaluate
// is raced against a timer; a page that does not answer is paused through CDP and its call stack printed with source.
//   LIVE_BASE=http://localhost:3074 ROUTES=results,markets node hang-probe.mjs
import { pathToFileURL } from "node:url";
const R = "F:/kipindi-a8i2-ctl/scripts/live/";
const { browser, BASE } = await import(pathToFileURL(R + "harness.mjs").href);
const kit = await import(pathToFileURL(R + "journey-pass.mjs").href);
const { JHF_WIDTHS } = await import(pathToFileURL(R + "journey-header-fit.mjs").href);
const ROUTES = (process.env.ROUTES || "results").split(",").map((s) => "/" + s.trim().replace(/^\/+/, ""));
const LOCALES = (process.env.LOCALES || "en,sw,zh").split(",");
const race = (p, ms) => Promise.race([p.then((v) => ({ ok: true, v }), (e) => ({ ok: false, e })), new Promise((r) => setTimeout(() => r({ ok: false, timeout: true }), ms))]);

const { b } = await browser();
const pass = await kit.mintStaffPass(b, BASE);
const c0 = await b.newContext();
await c0.request.get(`${BASE}/auth/demo`);
const state = await c0.storageState();
await c0.close();
state.cookies = state.cookies.filter((x) => x.name !== "kp-locale");
console.log(`hang-probe on ${BASE} · routes ${ROUTES.join(" ")} · widths ${JHF_WIDTHS.join(" ")} · locales ${LOCALES.join(" ")}`);
let hung = 0;
for (const locale of LOCALES) {
  const ctx = await b.newContext({ storageState: state, viewport: { width: 1280, height: 900 } });
  await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }, pass]);
  for (const r of ROUTES) for (const w of JHF_WIDTHS) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: w, height: 900 });
    const t0 = Date.now();
    await p.goto(BASE + r, { waitUntil: "domcontentloaded", timeout: 40000 }).catch((e) => console.log(`  ${locale} ${r} ${w} GOTO ${String(e).split("\n")[0].slice(0, 90)}`));
    await p.waitForLoadState("load", { timeout: 8000 }).catch(() => {});
    await p.waitForTimeout(700);
    const res = await race(p.evaluate(() => document.querySelectorAll("main").length), 15000);
    if (res.ok) { console.log(`  ${locale} ${r} ${w} ok (${Date.now() - t0} ms)`); await p.close().catch(() => {}); continue; }
    hung++;
    console.log(`  ${locale} ${r} ${w} HUNG ${res.timeout ? "(no answer in 15 s)" : String(res.e).slice(0, 80)} — pausing its script`);
    const cdp = await ctx.newCDPSession(p);
    const scripts = new Map();
    cdp.on("Debugger.scriptParsed", (e) => scripts.set(e.scriptId, e.url));
    const paused = new Promise((ok) => cdp.once("Debugger.paused", ok));
    await race(cdp.send("Debugger.enable"), 10000);
    await race(cdp.send("Debugger.pause"), 10000);
    const ev = await race(paused, 15000);
    if (!ev.ok) { console.log("    could not pause the page"); continue; }
    for (const f of ev.v.callFrames.slice(0, 18)) {
      const url = f.url || scripts.get(f.location.scriptId) || "?";
      let snip = "";
      const src = await race(cdp.send("Debugger.getScriptSource", { scriptId: f.location.scriptId }), 5000);
      if (src.ok) {
        const line = src.v.scriptSource.split("\n")[f.location.lineNumber] ?? "";
        const c = f.location.columnNumber ?? 0;
        snip = line.slice(Math.max(0, c - 120), c + 120).replace(/\s+/g, " ");
      }
      console.log(`    at ${f.functionName || "(anonymous)"} — ${url.split("/").slice(-3).join("/")}:${f.location.lineNumber + 1}:${(f.location.columnNumber ?? 0) + 1}`);
      if (snip) console.log(`       ${snip}`);
    }
    await race(cdp.send("Debugger.resume"), 3000);
    // a second sample, to tell a loop from a single slow call
    const paused2 = new Promise((ok) => cdp.once("Debugger.paused", ok));
    await new Promise((r) => setTimeout(r, 1500));
    await race(cdp.send("Debugger.pause"), 10000);
    const ev2 = await race(paused2, 10000);
    if (ev2.ok) console.log(`    second sample: ${ev2.v.callFrames.slice(0, 6).map((f) => f.functionName || "(anonymous)").join(" ← ")}`);
    p.close().catch(() => {});
    if (process.env.FIRST_ONLY) break;
  }
  await ctx.close().catch(() => {});
  if (process.env.FIRST_ONLY && hung) break;
}
console.log(`hang-probe: ${hung} hung page(s)`);
await b.close().catch(() => {});
process.exit(0);
