// r2-proof.mjs — S5-R2-SLIP's targeted browser proof (scratch, never committed), run with cwd = the slip tree against a FRESH
// in-memory `next dev` (BASE; FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false):
//   A · "View ticket" from a cut's stamp: the ticket's loading drawing holds the free cancel's band (the stamp's note,
//       round 2 commit 2), and the page's band lands where the drawing drew it.
//   B · the free cancel's confirm closes into its result under ONE dim (round 2 commit 3): in every frame from the press to
//       the result at rest a scrim stands at full strength, the result's dim is held from its first frame, and the two
//       panels never stand at once.
// The recorder (CDP screencast frames + a per-rAF sampler + contact sheets) is the motion critic's, as the slip lane's round-1
// slip-motion.mjs copied it. Prints PASS/FAIL lines and a summary; frames and sheets in $F/slip/frames.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const TREE = process.cwd();
const require = createRequire(TREE + "/package.json");
const { chromium } = require("playwright");
const { premise, demoSession, DEMO_PHONE, LOCALE_COOKIE } = await import(pathToFileURL(TREE + "/scripts/live/journey-pass.mjs").href);

const BASE = process.env.BASE || "http://localhost:3560";
if (!/^http:\/\/localhost:\d+$/.test(BASE)) { console.error("refusing: BASE must be http://localhost:PORT"); process.exit(2); }
const F = "C:/Users/asheib/AppData/Local/Temp/claude/C--Users-asheib/64715c03-3769-4117-831c-ea7bd3a8e838/scratchpad/slip";
const OUT = `${F}/frames`;
mkdirSync(OUT, { recursive: true });
const T0 = Date.now();
const log = (...a) => console.log(`[${((Date.now() - T0) / 1000).toFixed(1)}s]`, ...a);
let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => { if (cond) { pass++; console.log(`PASS ${name}`); } else { fail++; console.log(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); } };
const SUMMARY = [];
const WORDS = {
  sw: { viewTicket: "Tazama tiketi", confirmCancel: "Ghairi tiketi", result: "Tiketi imeghairiwa" },
  en: { viewTicket: "View ticket", confirmCancel: "Cancel ticket", result: "Ticket cancelled" },
};

const INIT = () => {
  const now = () => performance.timeOrigin + performance.now();
  const desc = (el) => {
    if (!el || !el.tagName) return String(el && el.nodeName);
    const cn = typeof el.className === "string" ? el.className : (el.className && el.className.baseVal) || "";
    return `${el.tagName.toLowerCase()}${cn ? `.${cn.trim().split(/\s+/).slice(0, 4).join(".")}` : ""}`;
  };
  const rect = (r) => (r ? [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)] : null);
  window.__ml = [];
  const push = (o) => { try { if (window.__ml.length < 6000) window.__ml.push(o); } catch { /* full */ } };
  for (const type of ["animationstart", "animationend", "animationcancel"]) {
    document.addEventListener(type, (e) => push({ type, t: now(), name: e.animationName, el: desc(e.target), rect: rect(e.target?.getBoundingClientRect?.()) }), true);
  }
  try {
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) push({ type: "layout-shift", t: performance.timeOrigin + e.startTime, value: +e.value.toFixed(4), input: e.hadRecentInput,
        src: (e.sources || []).map((s) => ({ el: desc(s.node), from: rect(s.previousRect), to: rect(s.currentRect) })) });
    }).observe({ type: "layout-shift", buffered: false });
  } catch { /* unsupported */ }
  for (const m of ["pushState", "replaceState"]) {
    const orig = history[m];
    history[m] = function (...args) { push({ type: m, t: now(), url: String(args[2] ?? "") }); return orig.apply(this, args); };
  }
  const hide = () => { const s = document.createElement("style"); s.textContent = "nextjs-portal{display:none!important}"; document.documentElement.appendChild(s); };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hide); else hide();
};

/** Per rAF: every dialog's scrim (role, computed opacity, its class: fading in, leaving, or held) and panel (opacity, box). */
const sampleDialogs = (page, ms) => page.evaluate(async (ms) => {
  const out = [];
  const t0 = performance.now();
  const op = (el) => Math.round(Number(getComputedStyle(el).opacity) * 1000) / 1000;
  return await new Promise((resolve) => {
    const tick = () => {
      const t = performance.now();
      const scrims = [...document.querySelectorAll('[role=dialog] > button[tabindex="-1"], [role=alertdialog] > button[tabindex="-1"]')].map((el) => ({
        role: el.parentElement?.getAttribute("role"), op: op(el), k: el.className.includes("m-out") ? "out" : el.className.includes("m-scrim") ? "in" : "held" }));
      const panels = [...document.querySelectorAll('[data-rung="modal"]')].map((el) => {
        const r = el.getBoundingClientRect();
        return { role: el.parentElement?.getAttribute("role"), op: op(el), y: Math.round(r.y), h: Math.round(r.height) };
      });
      out.push({ t: Math.round(performance.timeOrigin + t), scrims, panels });
      if (t - t0 < ms) requestAnimationFrame(tick); else resolve(out);
    };
    requestAnimationFrame(tick);
  });
}, ms).catch((e) => [{ error: String(e).slice(0, 200) }]);

/** Per rAF across a client navigation: the drawing's free-cancel band, the page's band, the stamp, the slip, the address
 *  and the scroll — until the page's band has stood for 30 frames, or `ms` at most. */
const sampleBands = (page, ms) => page.evaluate(async (ms) => {
  const out = [];
  const t0 = performance.now();
  const box = (sel) => { const el = document.querySelector(sel); if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; };
  let held = 0;
  return await new Promise((resolve) => {
    const tick = () => {
      const t = performance.now();
      const band = box('[data-testid="millionea-ticket-cancel"]');
      out.push({ t: Math.round(performance.timeOrigin + t), path: location.pathname, y: Math.round(scrollY), stamp: !!document.querySelector(".orm-crest"),
        slip: !!document.querySelector('[data-testid="millionea-slip"]'), ghost: box('[data-ghost-band="free-cancel"]'), band });
      held = band ? held + 1 : 0;
      if (t - t0 < ms && held < 30) requestAnimationFrame(tick); else resolve(out);
    };
    requestAnimationFrame(tick);
  });
}, ms).catch((e) => [{ error: String(e).slice(0, 200) }]);

/** record(page, label, action, { win, step, count, sampler, sampleMs, coarse }) — the critic's screencast recorder. */
async function record(page, label, action, opts = {}) {
  const { win = 1200, step = 40, count = 16, sampler = null, sampleMs = null, coarse = null } = opts;
  const vp = page.viewportSize();
  const entry = { label, ok: false };
  let cdp;
  try {
    cdp = await page.context().newCDPSession(page);
    const frames = [];
    cdp.on("Page.screencastFrame", (f) => {
      const arr = Date.now();
      const meta = f.metadata && f.metadata.timestamp ? f.metadata.timestamp * 1000 : arr;
      frames.push({ ts: Math.abs(meta - arr) < 4000 ? meta : arr, data: f.data });
      cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    });
    await page.evaluate(() => { if (window.__ml) window.__ml.length = 0; }).catch(() => {});
    await cdp.send("Page.startScreencast", { format: "png", maxWidth: vp.width, maxHeight: vp.height, everyNthFrame: 1 });
    await page.waitForTimeout(260);
    const samplerP = sampler ? sampler(page, sampleMs ?? win + 400) : null;
    const t0 = Date.now();
    let err = null;
    try { await action(); } catch (e) { err = String(e && e.message ? e.message : e).slice(0, 500); }
    // The frames run as long as the sampler does (an adaptive sampler ends when what it waits for has landed).
    await Promise.all([page.waitForTimeout(win), samplerP ?? Promise.resolve(null)]);
    await cdp.send("Page.stopScreencast").catch(() => {});
    await page.waitForTimeout(120);
    const samples = samplerP ? await samplerP : null;
    const mlog = await page.evaluate(() => (window.__ml || []).slice()).catch(() => []);
    await cdp.detach().catch(() => {});
    const distinct = [];
    for (const f of frames) if (!distinct.length || distinct[distinct.length - 1].data !== f.data) distinct.push(f);
    const A = t0;
    const onScreenAt = (T) => { let best = null; for (const f of distinct) { if (f.ts <= T) best = f; else break; } return best ?? distinct[0]; };
    const saved = [];
    for (let k = 0; k < count; k++) {
      const T = A - step + k * step;
      const f = onScreenAt(T);
      if (!f) continue;
      const name = `${label}-f${String(k).padStart(2, "0")}.png`;
      writeFileSync(`${OUT}/${name}`, Buffer.from(f.data, "base64"));
      saved.push({ name, at: Math.round(T - A) });
    }
    const savedCoarse = [];
    if (coarse) {
      for (let k = 0; k < coarse.count; k++) {
        const T = A - coarse.step + k * coarse.step;
        const f = onScreenAt(T);
        if (!f) continue;
        const name = `${label}-c-f${String(k).padStart(2, "0")}.png`;
        writeFileSync(`${OUT}/${name}`, Buffer.from(f.data, "base64"));
        savedCoarse.push({ name, at: Math.round(T - A) });
      }
    }
    Object.assign(entry, {
      ok: err === null, err, viewport: vp, frames: frames.length, distinct: distinct.length, saved, savedCoarse,
      log: mlog.filter((m) => m.t >= t0 - 300).map((m) => ({ ...m, t: Math.round(m.t - A) })),
      samples: samples ? samples.map((s) => (s.t ? { ...s, t: s.t - A } : s)) : null,
    });
  } catch (e) {
    entry.err = `recorder: ${String(e && e.message ? e.message : e).slice(0, 400)}`;
    try { await cdp?.detach(); } catch { /* gone */ }
  }
  writeFileSync(`${OUT}/${label}.json`, JSON.stringify(entry, null, 1));
  SUMMARY.push({ label, ok: entry.ok, err: entry.err, distinct: entry.distinct, saved: entry.saved?.length ?? 0 });
  log(`rec ${label}: ${entry.ok ? "ok" : "ERR " + entry.err} · ${entry.distinct ?? 0} distinct frames`);
  return entry;
}
async function still(page, name) {
  try { await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false }); log(`still ${name}`); } catch (e) { log(`still ${name} ERR ${e}`); }
}

// ═══════════════════════════════════════ the world ═══════════════════════════════════════════════════════════════════
const pre = await premise(BASE);
if (pre.refuse || pre.health?.millionea?.state !== "ACTIVE") { console.error("PREMISE ABSENT", pre.refuse ?? "Millionea is not ACTIVE"); process.exit(2); }
const browser = await chromium.launch();
async function settle(page, ms = 600) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const oneShot = document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity);
    await Promise.race([Promise.all(oneShot.map((a) => a.finished.catch(() => {}))), new Promise((r) => setTimeout(r, 3000))]);
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
  }).catch(() => {});
  await page.waitForTimeout(ms);
}
async function ctxFor(cookies, { width = 360, height = 780, locale = "sw", touch = width < 1024, reduced = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: touch, hasTouch: touch,
    reducedMotion: reduced ? "reduce" : "no-preference", colorScheme: "dark" });
  await ctx.addInitScript(INIT);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch { /* blocked */ } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
  return ctx;
}
const press = async (loc, touch) => { if (touch) await loc.tap({ timeout: 30_000 }); else await loc.click({ timeout: 30_000 }); };
const hydratedSel = (page, sel) => page.waitForFunction((s) => {
  const el = document.querySelector(s);
  return !!el && Object.keys(el).some((k) => k.startsWith("__reactProps$"));
}, sel, { timeout: 180_000 });
let WEEK = "";
const YES15 = Array.from({ length: 15 }, () => "YES");
async function openFullSlip(page) {
  await page.goto(`${BASE}/millionea/slip`, { waitUntil: "load", timeout: 240_000 });
  await hydratedSel(page, '[data-testid="millionea-slip"] [role="radio"]');
  await page.evaluate(([k, v]) => {
    sessionStorage.setItem(k, v);
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith("kp_session_started_at:")) sessionStorage.setItem(key.replace("kp_session_started_at:", "kp_reality_check_last:"), String(Date.now() + 120 * 86_400_000));
    }
  }, [`kp-millionea-slip:${WEEK}`, JSON.stringify({ v: 2, active: 0, slips: [YES15] })]);
  await page.reload({ waitUntil: "load" });
  await hydratedSel(page, '[data-testid="millionea-slip-pay"][data-armed]');
  await settle(page, 500);
}
const pay = (p) => p.locator('[data-testid="millionea-slip-pay"]:visible').first();
const commitBtn = (p) => p.getByTestId("millionea-confirm-commit");
const stampDlg = (p) => p.locator("[role=dialog]").filter({ has: p.locator(".orm-crest") });
const devPost = async (ctx, data) => (await ctx.request.post(`${BASE}/api/dev-test/seed-maswali-slip`, { data, timeout: 120_000 })).json().catch(() => ({}));

const owner = await browser.newContext();
await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
const seed = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
log("seed-maswali", seed.status());
WEEK = (await devPost(owner, {})).weekId ?? "";
const session = await demoSession(browser, BASE, { query: "?deposit=0", balance: 60_000 });
await devPost(owner, { cancelFor: DEMO_PHONE });
log("week", WEEK);
ok("premise · the selling week is read", !!WEEK, WEEK);
// In dev the first visit compiles a route. The ticket's route is warmed ONCE, here, by the player's GET of a ticket that
// does not exist (the same route compiled; no real ticket read, nothing marked seen) — so each press measures the
// navigation, and no compile runs while a stamp is up (its dwell would close it before "View ticket" is pressed).
{
  const warmCtx = await ctxFor([session], {});
  const warm = await warmCtx.request.get(`${BASE}/millionea/tickets/MLN-2026-W00-000000`, { timeout: 240_000 }).catch(() => null);
  log(`premise · the ticket's route warmed (${warm ? warm.status() : "no answer"})`);
  await warmCtx.close();
}

/** A then B on one page: buy one ticket, "View ticket" on a slow line, then the free cancel's confirm → result. */
async function viewThenCancel(tag, { width = 360, height = 780, locale = "sw", reduced = false } = {}) {
  const touch = width < 1024;
  const W = WORDS[locale];
  const ctx = await ctxFor([session], { width, height, locale, reduced });
  const page = await ctx.newPage();
  page.setDefaultTimeout(60_000);
  try {
    await openFullSlip(page);
    ok(`${tag} · premise · the page is in ${locale}`, (await page.locator("html").getAttribute("lang")) === locale);
    await press(pay(page), touch);
    await commitBtn(page).waitFor({ timeout: 60_000 });
    await settle(page, 400);
    await press(commitBtn(page), touch);
    await stampDlg(page).waitFor({ timeout: 120_000 });
    await settle(page, 700);
    const serial = (await stampDlg(page).locator("h2").first().innerText()).trim();
    await still(page, `a-stamp-${tag}`);
    ok(`${tag} · premise · one ticket cut, its serial the stamp's title`, /^ML[ND]-/.test(serial), serial);

    // ── A · "View ticket" on a slow line: the drawing holds the free cancel's band; the page's band lands where it drew it.
    // (The ticket's route was warmed once at the start: a first compile while the stamp is up outlasts its dwell.)
    const net = await ctx.newCDPSession(page);
    await net.send("Network.enable");
    if (!reduced) await net.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 64 * 1024, uploadThroughput: -1 });
    // Round 2 (the lead's ruling): "View ticket" is the kit's Link. It must look exactly as the button did — every computed
    // style that draws the control, read against a twin <button> of the same classes beside it — go to the ticket, and hold
    // the stamp's opening focus (so Enter takes it there, as the en-1280 run presses it).
    const view = stampDlg(page).getByRole("link", { name: W.viewTicket, exact: true });
    const look = await view.evaluate((a) => {
      const keys = ["display", "height", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft", "borderTopWidth", "borderTopStyle",
        "borderTopColor", "borderTopLeftRadius", "backgroundColor", "backgroundImage", "color", "fontFamily", "fontSize", "fontWeight", "letterSpacing",
        "lineHeight", "textDecorationLine", "textAlign", "justifyContent", "alignItems", "boxShadow", "cursor", "opacity"];
      const twin = document.createElement("button");
      twin.type = "button"; twin.className = a.className; twin.textContent = a.textContent;
      a.parentElement.insertBefore(twin, a.nextSibling);
      const cs = (el) => { const s = getComputedStyle(el); return Object.fromEntries(keys.map((k) => [k, s[k]])); };
      const A = cs(a), B = cs(twin);
      twin.remove();
      const r = a.getBoundingClientRect();
      return { tag: a.tagName, href: a.getAttribute("href"), focused: document.activeElement === a,
        diff: keys.filter((k) => A[k] !== B[k]).map((k) => `${k}: ${A[k]} | button ${B[k]}`), box: [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 10) / 10) };
    });
    log(`A ${tag}: the stamp's primary ${JSON.stringify(look)}`);
    ok(`${tag} · A · "View ticket" is the kit's Link to the ticket, drawn exactly as the button (${look.diff.length} computed differences), holding the stamp's opening focus`,
      look.tag === "A" && look.href === `/millionea/tickets/${encodeURIComponent(serial)}` && look.diff.length === 0 && look.focused, JSON.stringify(look));
    const A = await record(page, `a-view-ticket-${tag}`, () => (tag === "en-1280" ? page.keyboard.press("Enter") : press(view, touch)), {
      win: 3000, step: 100, count: 40, sampler: sampleBands, sampleMs: 30_000, coarse: { step: 400, count: 30 },
    });
    await net.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {});
    await net.detach().catch(() => {});
    await page.waitForURL(`**/millionea/tickets/${encodeURIComponent(serial)}`, { timeout: 120_000 }).catch(() => {});
    await page.getByTestId("millionea-ticket-cancel").waitFor({ timeout: 120_000 });
    await hydratedSel(page, '[data-testid="millionea-ticket-cancel"] button');
    await settle(page, 700);
    await still(page, `a-landed-${tag}`);
    const s = (A.samples ?? []).filter((x) => !x.error);
    const withGhost = s.filter((x) => x.ghost), withBand = s.filter((x) => x.band);
    const lastGhost = withGhost.at(-1)?.ghost ?? null, firstBand = withBand[0]?.band ?? null;
    const at = (x) => (x ? `+${x.t}ms` : "never");
    const bare = s.filter((x) => !x.stamp && !x.ghost && !x.band && x.slip);
    log(`A ${tag}: ${s.length} samples · the stamp gone ${at(s.find((x) => !x.stamp))} · the drawing's band ${at(withGhost[0])}–${at(withGhost.at(-1))} (${withGhost.length} frames) · the page's band ${at(withBand[0])} · the bare slip ${bare.length} frames (${at(bare[0])}–${at(bare.at(-1))}) · paths ${[...new Set(s.map((x) => x.path))].join(" → ")}`);
    ok(`${tag} · A · "View ticket" opens the ticket (${serial})`, decodeURIComponent(new URL(page.url()).pathname) === `/millionea/tickets/${serial}`, page.url());
    if (!reduced) {
      ok(`${tag} · A · the ticket's loading drawing held the free cancel's band (the stamp's note) — ${withGhost.length} sampled frames`, withGhost.length > 0);
      const d = lastGhost && firstBand ? lastGhost.map((v, i) => Math.round(Math.abs(v - firstBand[i]) * 10) / 10) : null;
      log(`A ${tag}: the drawing's band [x,y,w,h] ${JSON.stringify(lastGhost)} → the page's ${JSON.stringify(firstBand)} (Δ ${JSON.stringify(d)})`);
      ok(`${tag} · A · the page's band lands where the drawing drew it (Δx, Δy, Δw ≤ 2px: ${JSON.stringify(d)})`, !!d && d[0] <= 2 && d[1] <= 2 && d[2] <= 2, JSON.stringify({ lastGhost, firstBand }));
      ok(`${tag} · A · (TICKETS' drawing) the band is as tall as the page's, so the clauses under it land where drawn (Δh ${d?.[3]}px ≤ 2)`, !!d && d[3] <= 2, JSON.stringify({ lastGhost, firstBand }));
    }

    // ── B · the free cancel's confirm → its result under ONE dim.
    const door = page.getByTestId("millionea-ticket-cancel").locator("button").first();
    await door.scrollIntoViewIfNeeded();
    await settle(page, 300);
    await press(door, touch);
    const confirm = page.locator("[role=alertdialog]").filter({ has: page.getByRole("button", { name: W.confirmCancel, exact: true }) });
    await confirm.waitFor({ timeout: 60_000 });
    await settle(page, 600);
    await still(page, `b-confirm-${tag}`);
    const B = await record(page, `b-cancel-handoff-${tag}`, () => press(confirm.getByRole("button", { name: W.confirmCancel, exact: true }), touch), {
      win: 2200, step: 40, count: 30, sampler: sampleDialogs, sampleMs: 2600, coarse: { step: 160, count: 16 },
    });
    const result = page.locator("[role=dialog]").filter({ hasText: W.result });
    await result.waitFor({ timeout: 60_000 });
    await settle(page, 700);
    await still(page, `b-result-${tag}`);
    const d = (B.samples ?? []).filter((x) => !x.error);
    const firstResult = d.findIndex((x) => x.scrims.some((sc) => sc.role === "dialog"));
    const lifted = d.filter((x) => !x.scrims.some((sc) => sc.op >= 0.99));
    const lastConfirm = (() => { for (let i = d.length - 1; i >= 0; i--) if (d[i].scrims.some((sc) => sc.role === "alertdialog") || d[i].panels.some((p) => p.role === "alertdialog")) return i; return -1; })();
    const both = d.map((x) => {
      const c = Math.max(0, ...x.panels.filter((p) => p.role === "alertdialog").map((p) => p.op));
      const r = Math.max(0, ...x.panels.filter((p) => p.role === "dialog").map((p) => p.op));
      return Math.min(c, r);
    });
    const overlap = Math.max(0, ...both);
    log(`B ${tag}: ${d.length} samples · the result's dim from sample ${firstResult} (${JSON.stringify(d[firstResult]?.scrims)}) · the confirm last seen at sample ${lastConfirm} · frames with no full dim ${lifted.length} · panels' overlap ${overlap}`);
    ok(`${tag} · B · ONE dim: in every sampled frame from the press to the result at rest a scrim stands at full strength (${d.length} frames, ${lifted.length} without)`,
      d.length > 10 && lifted.length === 0, JSON.stringify(lifted.slice(0, 3)));
    ok(`${tag} · B · the result holds the dim from its first frame (no fade in)`,
      firstResult >= 0 && d[firstResult].scrims.filter((sc) => sc.role === "dialog").every((sc) => sc.k === "held" && sc.op >= 0.99), JSON.stringify(d[firstResult]?.scrims));
    ok(`${tag} · B · the two panels never stand at once (the most both were seen together: ${overlap})`, overlap <= 0.15);
    ok(`${tag} · B · the result is up, its title said`, await result.count() === 1);
    await press(result.locator(".orm-actions button").first(), touch);
    await page.waitForTimeout(900);
    await settle(page, 300);
    await still(page, `b-after-${tag}`);
  } catch (e) {
    ok(`${tag} · the drive ran to its end`, false, String(e).split("\n")[0].slice(0, 300));
  }
  await devPost(owner, { cancelFor: DEMO_PHONE });
  await ctx.close();
}
await viewThenCancel("sw-360");
await viewThenCancel("en-1280", { width: 1280, height: 900, locale: "en" });
await viewThenCancel("rm-sw-360", { reduced: true });

// ═══════════════════════════════════════ contact sheets ═══════════════════════════════════════════════════════════
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  for (const s of SUMMARY) {
    try {
      const jj = JSON.parse(readFileSync(`${OUT}/${s.label}.json`, "utf8"));
      for (const [set, suffix] of [[jj.saved, "SHEET"], [jj.savedCoarse, "c-SHEET"]]) {
        if (!set || !set.length) continue;
        const vp = jj.viewport;
        const scale = vp.width >= 1000 ? 0.3 : 0.5;
        const w = Math.round(vp.width * scale), h = Math.round(vp.height * scale);
        const perRow = Math.max(1, Math.floor(1584 / (w + 8)));
        const imgs = set.map((f) => `<div style="width:${w}px"><div style="height:14px;overflow:hidden">${f.name.replace(s.label + "-", "")} ${f.at >= 0 ? "+" : ""}${f.at}ms</div><img src="data:image/png;base64,${readFileSync(`${OUT}/${f.name}`).toString("base64")}" width="${w}" height="${h}" style="display:block;outline:1px solid #666"></div>`).join("");
        await p.setContent(`<html><body style="margin:0;background:#1b1b1b;color:#eee;font:11px monospace"><div style="padding:6px 8px">${s.label} ${suffix} — step ${(set[1]?.at ?? 0) - (set[0]?.at ?? 0)}ms (times from the press)</div><div style="display:flex;flex-wrap:wrap;gap:8px;padding:0 8px 8px;width:${perRow * (w + 8)}px">${imgs}</div></body></html>`);
        await p.screenshot({ path: `${OUT}/${s.label}-${suffix}.png`, fullPage: true });
      }
    } catch (e) { log(`sheet ${s.label} ERR ${String(e).slice(0, 160)}`); }
  }
  await ctx.close();
}
writeFileSync(`${OUT}/SUMMARY.json`, JSON.stringify(SUMMARY, null, 1));
await owner.close();
await browser.close();
console.log(`\nr2-proof: ${pass} passed, ${fail} failed · ${OUT}`);
process.exit(fail === 0 ? 0 : 1);
