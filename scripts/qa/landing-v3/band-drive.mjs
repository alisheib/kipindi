// Landing v3 · WP12 (R5, "the Match") — the Up & Down band's LOCAL DRIVE, every state (spec updown-band-v2
// §15.2–§15.6, §15.8). Run by `verify-band.sh` against a fresh in-memory `next dev`, under the heavy lock.
//
// One BTC chain of 15-minute rounds (the band's picker then has exactly one candidate, so the state is the
// drive's, not the picker's), moved through the states in the order time allows:
//   S8  before any seed — no round;
//   S4  a new round with its open confirmed (mock feed) and no read after it — kick-off;
//   S3  + a read between the ±$0.40 targets, 2 min in — the void band drawn (planted via /api/dev-test/updown-observe)
//   S2  + a read below the down target, 4 min in
//   S1  + a read above the up target, 6 min in — three stems on the track: a tie tick, a down stem, the bead;
//   S5  the S1 page with Playwright's clock run past the read's stale instant (betting still open);
//   S7  the same page run past betting's close, then past the deciding instant;
// S6 ("Awaiting price") is not driven — see the note where it would be.
// Each state is captured as VIEWPORT TILES with the band scrolled under the header (never full-page), its
// figures measured and judged by `band-metrics.mjs`, and — where a lead exists — the agreement drive run.
// Also: the served-HTML spacing check (§15.5), hydration warnings, the click-through pair, the focus move
// at close, Back/Forward re-anchoring, the R5(a) 60-second refresh, and the metrics gate's RED control.
//
//   BASE=http://localhost:3057 OUT=.qa-shots/landing-v3/band node scripts/qa/landing-v3/band-drive.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { MEASURE_BAND, judgeBand, figuresLine, showBand, stateOf, RED_STYLE } from "./band-metrics.mjs";
import { agreeOnce } from "./band-agree.mjs";

const BASE = process.env.BASE || "http://localhost:3057";
const OUT = process.env.OUT || ".qa-shots/landing-v3/band";
const FR = join(OUT, "frames");
mkdirSync(FR, { recursive: true });
const H = { 320: 640, 360: 780, 768: 1024, 1024: 900, 1280: 860 };
const ALL9 = ["360-sw", "360-en", "360-zh", "768-sw", "768-en", "768-zh", "1280-sw", "1280-en", "1280-zh"];
const CELLS = {
  S8: ["360-sw", "1280-en", "320-sw"],
  S4: ["360-sw", "1280-en", "360-zh", "320-sw", "768-en"],
  S3: ["360-sw", "1280-en", "360-zh", "320-sw", "768-en"],
  S2: ["360-sw", "1280-en", "320-sw", "768-en"],
  S1: [...ALL9, "320-sw", "1024-en"],
};
const report = { states: {}, checks: [], breaches: [], agree: [] };
const log = (m) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${m}`);
const check = (name, ok, detail = "") => { report.checks.push({ name, ok, detail }); log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`); };

async function post(path, body) {
  const r = await fetch(BASE + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const j = await r.json().catch(() => ({}));
  return { status: r.status, ...j };
}

const browser = await chromium.launch({ headless: true });

async function newPage({ w, loc, clock = false, blockHistory = false }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: H[w] || 900 }, deviceScaleFactor: 1 });
  if (loc !== "sw") await ctx.addCookies([{ name: "kp-locale", value: loc, domain: new URL(BASE).hostname, path: "/" }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const consoleMsgs = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleMsgs.push(`${m.type()}: ${m.text().slice(0, 300)}`); });
  if (blockHistory) await page.route("**/api/updown/history**", (r) => r.abort());
  if (clock) await page.clock.install({ time: Date.now() });
  return { ctx, page, consoleMsgs };
}

async function openHome(page) {
  await page.goto(BASE + "/", { waitUntil: "load", timeout: 180000 });
  await page.waitForTimeout(2500);
  const decline = page.getByTestId("consent-decline");
  if (await decline.count()) await decline.first().click({ timeout: 5000 }).catch(() => {});
  await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay]{display:none!important}" }).catch(() => {});
  const h1 = await page.locator("h1").first().textContent({ timeout: 15000 }).catch(() => null);
  if (!h1) throw new Error("no h1 — not the landing page");
  // fire every reveal down to the band, then park the band under the header
  const dh = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < dh; y += 600) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(60); }
  await showBand(page);
}

/** Viewport tiles from the band's top: one, or two when the band runs past the screen. */
async function tiles(page, id) {
  const files = [];
  const f0 = join(FR, `${id}.png`);
  await page.screenshot({ path: f0 }); files.push(f0);
  const more = await page.evaluate(() => {
    const b = document.querySelector('[data-band="updown"]')?.getBoundingClientRect();
    return b && b.bottom > innerHeight - 4 ? b.bottom - innerHeight + 24 : 0;
  });
  if (more > 0) {
    await page.evaluate((v) => scrollBy(0, v), more); await page.waitForTimeout(400);
    const f1 = join(FR, `${id}-b.png`);
    await page.screenshot({ path: f1 }); files.push(f1);
    await page.evaluate((v) => scrollBy(0, -v), more); await page.waitForTimeout(200);
  }
  return files;
}

async function shootState(state, cells, refs = {}) {
  report.states[state] ??= {};
  for (const cell of cells) {
    const [w, loc] = cell.split("-"); const W = Number(w);
    const { ctx, page, consoleMsgs } = await newPage({ w: W, loc });
    try {
      await openHome(page);
      const f = await page.evaluate(MEASURE_BAND);
      const breaches = judgeBand(f, { w: W, loc, state }, refs[cell]);
      const files = await tiles(page, `${state}-${cell}`);
      report.states[state][cell] = { figures: f, breaches, files, console: consoleMsgs.filter((m) => /hydrat|did not match|mismatch/i.test(m)) };
      log(`${state} ${cell} ${figuresLine(f)}`);
      for (const b of breaches) { log(`  BREACH ${b}`); report.breaches.push(`${state} ${cell}: ${b}`); }
      const hyd = report.states[state][cell].console;
      if (hyd.length) { report.breaches.push(`${state} ${cell}: hydration — ${hyd[0]}`); log(`  HYDRATION ${hyd[0]}`); }
    } catch (e) {
      report.breaches.push(`${state} ${cell}: ${String(e.message).split("\n")[0]}`);
      log(`FAIL ${state} ${cell}: ${String(e.message).split("\n")[0]}`);
    }
    await ctx.close();
  }
}

async function agreeAll(state) {
  for (const loc of ["sw", "en", "zh"]) {
    const a = await agreeOnce(browser, BASE, loc).catch((e) => ({ loc, verdict: "ERROR", note: String(e.message).split("\n")[0] }));
    report.agree.push({ state, ...a });
    log(`agree ${state} ${loc}: ${a.verdict} — ${a.note}`);
    if (a.verdict === "DISAGREE" || a.verdict === "ERROR") report.breaches.push(`agree ${state} ${loc}: ${a.verdict} ${a.note}`);
  }
}

async function plant(lead) {
  const dry = await post("/api/dev-test/updown-observe", { asset: "BTC", dryRun: true });
  const r = dry.round;
  if (!r || r.openPrice == null) throw new Error(`no open round to plant on: ${JSON.stringify(dry).slice(0, 200)}`);
  const up = r.upTarget - r.openPrice, down = r.openPrice - r.downTarget;
  const delta = lead === "up" ? Math.max(18.52, up + 0.01)
    : lead === "down" ? -Math.max(12.4, down + 0.01)
      : Math.round((up / 2) * 100) / 100 || 0;
  const res = await post("/api/dev-test/updown-observe", { asset: "BTC", delta });
  log(`plant ${lead}: open ${r.openPrice} targets ${r.downTarget}/${r.upTarget} → ${JSON.stringify(res.read)} (${res.status})`);
  if (!res.ok) throw new Error(`plant ${lead} failed: ${res.error}`);
  return { round: r, read: res.read };
}

try {
  // ── warm-up: compile / and the round page before anything is timed ─────────────────────────────
  log("warm-up");
  await fetch(BASE + "/").catch(() => {});

  // ── S8 · no round ───────────────────────────────────────────────────────────────────────────────
  await shootState("S8", CELLS.S8);

  // ── S6 is NOT driven: the engine never opens a round without its open price (E-83, `advanceChain`
  // refuses), so "Awaiting price" appears only when the store read FAILS (`reads: null`). Measured
  // 2026-09-27: a refused open creates no round at all and the band stays S8. S6 is pinned by
  // `test:updown-match` §8 (`reads: null` → awaiting) instead of by a fault hook in a money store.

  // ── S4 · kick-off: a new round, its open confirmed, no read after it ────────────────────────────
  // ±$0.40 targets (40 ticks), production gold's band: the level read then draws its void band on the track.
  const s4seed = await post("/api/dev-test/updown-seed", { assets: ["BTC"], durations: [15], feedProvider: "mock", minMoveTicks: 40 });
  log(`seed mock: ${s4seed.status}`);
  const adv2 = await post("/api/dev-test/updown-advance");
  log(`advance: ${adv2.status} rounds=${JSON.stringify(adv2.rounds?.[0]?.rounds?.slice(0, 2) ?? null)}`);
  // warm the round page too (its first compile would otherwise land inside a timed step)
  const r0 = (await post("/api/dev-test/updown-observe", { asset: "BTC", dryRun: true })).round;
  log(`the drive's round: ${JSON.stringify(r0)}`);
  if (r0) await fetch(`${BASE}/updown/${r0.roundId}`).catch(() => {});
  await shootState("S4", CELLS.S4);

  // ── S3, S2, S1 · one read each, newest last, TWO MINUTES APART (the confirmed grid's own spacing), so
  // the track shows stems where a real round would have them, not stacked at the open.
  const T0 = r0 ? Date.parse(r0.opensAt) : Date.now();
  const until = async (ms) => { const d = ms - Date.now(); if (d > 0) { log(`wait ${Math.round(d / 1000)}s`); await new Promise((r) => setTimeout(r, d)); } };
  await until(T0 + 2 * 60_000);
  await plant("level");
  await shootState("S3", CELLS.S3);
  {
    const { ctx, page } = await newPage({ w: 360, loc: "sw" });
    await openHome(page);
    const v = await page.evaluate(() => { const r = document.querySelector(".kp-udtrack__void"); const p = document.querySelector(".kp-udtrack__plot"); if (!r || !p) return null; return Math.round((r.getBoundingClientRect().height / p.getBoundingClientRect().height) * 1000) / 10; });
    check("the level round draws its void band (≥ 2.8% of the plot)", v != null && v >= 2.8, `${v}%`);
    await ctx.close();
  }
  await agreeAll("S3");
  await until(T0 + 4 * 60_000);
  await plant("down");
  await shootState("S2", CELLS.S2);
  await agreeAll("S2");
  await until(T0 + 6 * 60_000);
  const s1 = await plant("up");
  await shootState("S1", CELLS.S1);
  await agreeAll("S1");

  // ── §15.5 served HTML: no eaten spaces in the band's sentences ─────────────────────────────────
  for (const loc of ["sw", "en"]) {
    const html = await (await fetch(BASE + "/", { headers: loc === "sw" ? {} : { cookie: `kp-locale=${loc}` } })).text();
    const from = html.indexOf('data-band="updown"');
    const seg = html.slice(from, from + 40000).replace(/<!--[\s\S]*?-->/g, "");
    const txt = seg.replace(/<[^>]+>/g, "\u0001");       // a tag boundary, so glued text shows as two runs
    const glued = [/kwa\u0001+\$/, /·\u0001*[A-Z]/, /inaamua\.\u0001*Tofauti/, /\d\d:\d\d\u0001*·/, /upande\u0001*Bado/, /by\u0001+\$/, /decides\.\u0001*Less/]
      .filter((re) => re.test(txt.replace(/\u0001+ /g, " ").replace(/ \u0001+/g, " ")));
    check(`served HTML spacing (${loc})`, glued.length === 0, glued.map(String).join(" "));
  }

  // ── the click-through pair: the band, then the round page, at 360 sw ────────────────────────────
  {
    const { ctx, page } = await newPage({ w: 360, loc: "sw" });
    await openHome(page);
    await tiles(page, "PAIR-1-band-360-sw");
    await page.locator('[data-band="updown"] .kp-udbug__pick--up').click();
    await page.waitForURL(/\/updown\//, { timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast]{display:none!important}" }).catch(() => {});
    // Round 4: the panel lands at the BOTTOM of the view (above the phone rail), so the round's countdown and
    // confirmed price stay visible above it — measured before any scroll.
    const landed = await page.evaluate(() => {
      const s = document.getElementById("stake"); const h = document.querySelector("header");
      const rail = [...document.querySelectorAll("nav")].map((n) => n.getBoundingClientRect()).filter((r) => r.bottom >= innerHeight - 1 && r.top > innerHeight / 2)[0];
      const chip = s?.querySelector("[data-kit-chip]")?.getBoundingClientRect();
      const price = document.querySelector("section[data-tone]")?.getBoundingClientRect();
      // The round's countdown pod (its caption and digits carry .m-tick) — it must be in the landed view too (round 5).
      const pod = document.querySelector("main .m-tick")?.parentElement?.getBoundingClientRect();
      const r = s?.getBoundingClientRect();
      return r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), header: Math.round(h?.getBoundingClientRect().bottom ?? 0),
        railTop: Math.round(rail?.top ?? innerHeight), chipInView: !!chip && chip.top >= 0 && chip.bottom <= innerHeight,
        chip: (s.querySelector("[data-kit-chip]")?.textContent || "").trim(), priceVisible: !!price && price.bottom > (h?.getBoundingClientRect().bottom ?? 0) + 24,
        clockVisible: !!pod && pod.top >= (h?.getBoundingClientRect().bottom ?? 0) - 1 && pod.bottom <= innerHeight,
        focused: document.activeElement === s } : null;
    });
    check("a pick LANDS on the stake panel: all of it between header and rail, the side Chip in view, the countdown and the confirmed price above it (measured before any scroll)",
      !!landed && landed.top >= landed.header - 1 && landed.bottom <= landed.railTop + 1 && landed.chipInView && landed.priceVisible && landed.clockVisible,
      JSON.stringify(landed));
    await page.screenshot({ path: join(FR, "PAIR-2-round-360-sw-b.png") });      // where #stake lands the player
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(400);
    await page.screenshot({ path: join(FR, "PAIR-2-round-360-sw.png") });        // the page's top
    check("click-through lands on the round with side=UP", /\/updown\/[^?]+\?side=UP/.test(page.url()), page.url());
    await ctx.close();
  }

  // ── Back/Forward: the digits re-anchor (never reset to the server's instant) ────────────────────
  {
    const { ctx, page } = await newPage({ w: 360, loc: "sw" });
    await openHome(page);
    const secs = async () => {
      const t = (await page.locator('[data-band="updown"] .kp-udclock__digits').textContent().catch(() => "")) || "";
      const m = t.match(/(\d+):(\d\d)/); return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    };
    const a = await secs(); const t0 = Date.now();
    await page.locator('[data-band="updown"] .kp-udbug__pick--up').click();
    await page.waitForURL(/\/updown\//, { timeout: 60000 });
    await page.waitForTimeout(6000);
    await page.goBack({ waitUntil: "commit" });
    await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 60000 });
    await page.locator('[data-band="updown"] .kp-udclock__digits').waitFor({ timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const b = await secs(); const gone = Math.round((Date.now() - t0) / 1000);
    await page.mouse.move(1, 1);          // a headless pointer hovers: park it off the band before the frame
    await showBand(page);
    await tiles(page, "BACK-360-sw");
    check("Back re-anchors the clock", a != null && b != null && Math.abs((a - b) - gone) <= 3, `before ${a}s, after ${b}s, ${gone}s elapsed`);
    await ctx.close();
  }

  // ── S5 and S7 · Playwright's clock past the stale instant, then past betting's close ───────────
  const refs = Object.fromEntries(Object.entries(report.states.S1 ?? {}).map(([k, v]) => [k, v.figures]));
  for (const cell of ["360-sw", "1280-en", "320-sw", "768-en"]) {
    const [w, loc] = cell.split("-"); const W = Number(w);
    const { ctx, page } = await newPage({ w: W, loc, clock: true, blockHistory: true });
    try {
      await openHome(page);
      let f = await page.evaluate(MEASURE_BAND);
      // S5: step until aged, never past close
      for (let i = 0; i < 40 && !f.aged && !f.closed; i++) { await page.clock.fastForward(30_000); await page.waitForTimeout(250); f = await page.evaluate(MEASURE_BAND); }
      await showBand(page);
      f = await page.evaluate(MEASURE_BAND);
      const b5 = judgeBand(f, { w: W, loc, state: "S5" });
      report.states.S5 ??= {}; report.states.S5[cell] = { figures: f, breaches: b5, files: await tiles(page, `S5-${cell}`) };
      log(`S5 ${cell} ${figuresLine(f)}`); for (const b of b5) { log(`  BREACH ${b}`); report.breaches.push(`S5 ${cell}: ${b}`); }
      // S7: focus the Up pick, step until closed
      if (cell === "360-sw") await page.locator('[data-band="updown"] .kp-udbug__pick--up').focus();
      for (let i = 0; i < 60 && !f.closed; i++) { await page.clock.fastForward(30_000); await page.waitForTimeout(250); f = await page.evaluate(MEASURE_BAND); }
      await page.waitForTimeout(400);
      if (cell === "360-sw") {
        const focus = await page.evaluate(() => document.activeElement?.className?.toString() ?? "");
        check("focus moves from the Up pick to the Watch link at close", /kp-udclock__watch/.test(focus), focus);
      }
      await showBand(page);
      f = await page.evaluate(MEASURE_BAND);
      const b7 = judgeBand(f, { w: W, loc, state: "S7" }, refs[cell]);
      report.states.S7 ??= {}; report.states.S7[cell] = { figures: f, breaches: b7, files: await tiles(page, `S7-${cell}`) };
      log(`S7 ${cell} ${figuresLine(f)}`); for (const b of b7) { log(`  BREACH ${b}`); report.breaches.push(`S7 ${cell}: ${b}`); }
      // past the deciding instant: past tense, the playhead parked on the flag
      await page.clock.fastForward(4 * 60_000); await page.waitForTimeout(400);
      await showBand(page);
      const park = await page.evaluate(() => {
        const now = document.querySelector(".kp-udtrack__now")?.getBoundingClientRect();
        const flag = document.querySelector(".kp-udtrack__mark--end")?.getBoundingClientRect();
        return now && flag ? Math.round((now.left + now.width / 2) - (flag.left + flag.width / 2)) : null;
      });
      if (cell === "360-sw") check("playhead parks on the flag after the deciding instant", park != null && Math.abs(park) <= 8, `offset ${park}px`);
      const fx = await page.evaluate(MEASURE_BAND);
      const s7 = report.states.S7?.[cell]?.figures;
      if (s7) check(`the deciding instant moves nothing (${cell}): plate top and band height as at close`,
        fx.plateFromTop === s7.plateFromTop && Math.abs(fx.wrap.h - s7.wrap.h) <= 0.6,
        `plate ${s7.plateFromTop}→${fx.plateFromTop}px, band ${s7.wrap.h}→${fx.wrap.h}px, verdict "${fx.verdictText}"`);
      await tiles(page, `S7x-${cell}`);
    } catch (e) {
      report.breaches.push(`S5/S7 ${cell}: ${String(e.message).split("\n")[0]}`);
      log(`FAIL S5/S7 ${cell}: ${String(e.message).split("\n")[0]}`);
    }
    await ctx.close();
  }

  // ── the metrics gate's RED control ──────────────────────────────────────────────────────────────
  {
    const { ctx, page } = await newPage({ w: 360, loc: "sw" });
    await openHome(page);
    await page.addStyleTag({ content: RED_STYLE }); await page.waitForTimeout(300);
    const f = await page.evaluate(MEASURE_BAND);
    const b = judgeBand(f, { w: 360, loc: "sw", state: "S1" });
    const caption = b.some((m) => m.startsWith("clock row wraps")), long = b.some((m) => /^band \d/.test(m));
    check("band-metrics RED control (wrapped caption + long band both reported)", caption && long, b.join(" | "));
    await ctx.close();
  }

  // ── R5(a) · the 60-second refresh brings a newer confirmed read in without a reload ────────────
  {
    const { ctx, page } = await newPage({ w: 360, loc: "sw", clock: true });
    await openHome(page);
    const before = await page.evaluate(MEASURE_BAND);
    await plant("down");
    await new Promise((r) => setTimeout(r, 11_000));       // past the feed's 10-second shared cache
    await page.clock.fastForward(61_000); await page.waitForTimeout(3000);
    const after = await page.evaluate(MEASURE_BAND);
    check("R5(a) refresh: a newer confirmed read replaces the verdict in place", before.lead === "up" && after.lead === "down", `${before.lead} → ${after.lead} · "${after.detailText}"`);
    await showBand(page);
    await tiles(page, "R5a-refreshed-360-sw");
    await ctx.close();
  }
  report.s1Read = s1.read;
  {
    const offs = {};
    for (const st of ["S1", "S2", "S3", "S4", "S5", "S7"]) for (const [cell, v] of Object.entries(report.states[st] ?? {})) {
      const f = v.figures; if (!f?.plate || !f.taps?.length) continue;
      (offs[cell] ??= []).push([st, Math.round(f.taps[0].top - f.plate.top)]);
    }
    for (const [cell, list] of Object.entries(offs)) {
      if (list.length < 2) continue;
      const vals = list.map(([, o]) => o), spread = Math.max(...vals) - Math.min(...vals);
      check(`the picks hold one position across states (${cell})`, spread <= 2, list.map(([s, o]) => `${s} ${o}px`).join(" · "));
    }
  }


} catch (e) {
  report.breaches.push(`drive aborted: ${String(e.stack || e.message).split("\n").slice(0, 3).join(" / ")}`);
  log(`ABORT ${String(e.stack || e.message).split("\n").slice(0, 3).join(" / ")}`);
}
await browser.close();
writeFileSync(join(OUT, "band-report.json"), JSON.stringify(report, null, 2));
const failed = report.checks.filter((c) => !c.ok).length;
log(`SUMMARY: ${report.breaches.length} breach(es), ${failed} failed check(s) of ${report.checks.length}`);
for (const b of report.breaches) log(`  - ${b}`);
process.exit(report.breaches.length || failed ? 1 : 0);
