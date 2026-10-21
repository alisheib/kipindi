/**
 * qa:chat-yield — AT REST OVER A FIGURE THE CHAT BUBBLE YIELDS; CLEAR, IT IS WHOLE (MASWALI-BUILD S5-FIX-PLATFORM D15,
 * 2026-10-21; the register critic's M5, ruled by the lead the same day; `test:chat-yield` holds the source).
 *
 *   FEATURE_MILLIONEA=ACTIVE MASWALI_SCHEDULER=false LIFECYCLE_TICKER=false on a fresh in-memory DEV server, then:
 *   BASE=http://localhost:3501 node scripts/qa-chat-yield.mjs [--prove-red | --measure] [outDir]
 *
 * THE GUARD (no flag), at 320 and 360: on a Millionea week page with a ledger (the register lane's `sunset` week when
 * `/api/dev-test/seed-maswali-register` exists, else the first week of the register that draws figures after
 * `/api/dev-test/seed-maswali`; WEEK_PATH chooses one) and on /wallet (a transaction's right-aligned amount: the bubble
 * stands down on /, /markets, /watchlist, /results and /updown, U43's keepout, so those pages are never under it), the drive
 * scrolls a right-aligned figure under the bubble's RESTING rect (its box, grown by its ring) and lets the page rest
 * (D3's 250ms, a frame, the fade): the bubble's computed opacity is `--state-yield-opacity`. Scrolled to where no line of
 * text and no `.amount` lies under that rect (found by this drive's own census, not the product's), it is 1. Over the
 * figure a pointer's hover brings it back whole, a focus within it too, and a tap still opens the panel.
 * `--prove-red`: the census switched off (an init script strips `data-over-content` as soon as it is written) — the
 * bubble stands at 1 over the figure, and every "yields" check must fail; the run passes when all of them did.
 * `--measure`: for the lead's table, each case's figure under the bubble, shot without the bubble (the figure's own
 * pixels) and with it whole (the bubble's own pixels); every opacity from .30 to .90 composited from the two in
 * gamma-encoded sRGB (DESIGN_AUTHORITY §A1), checked against a real shot at .45, .55 and .60; the figure's contrast is
 * the median over its glyph pixels inside the bubble of (text through the bubble) against (its background through the
 * bubble), against WCAG's minimum for its size (4.5, or 3.0 from 24px, or 18.67px bold) — and, the lead's rule (2026-10-21),
 * its 10th-percentile glyph pixel too, so the figure reads under the bubble's icon as well. CASES=week,how,wallet.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { PNG } from "pngjs";
import { demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3000";
const RED = process.argv.includes("--prove-red");
const MEASURE = process.argv.includes("--measure");
const OUT = resolve(process.argv.slice(2).find((a) => !a.startsWith("--")) ?? join(process.cwd(), ".qa-artifacts", "chat-yield"));
const WIDTHS = (process.env.WIDTHS || "320,360").split(",").map(Number);
const CASES = (process.env.CASES || "week,how,wallet").split(",");
mkdirSync(OUT, { recursive: true });
let pass = 0;
const fails = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label} ${extra}`); }
  else { fails.push(`${label} ${extra}`); console.log(`  ✗ ${label} ${extra}`); }
};

const browser = await chromium.launch();
/** A signed-in demo player, so every page draws for a reader (the register's ledger, the wallet's door). */
const session = await demoSession(browser, BASE);
/** A context for the demo player in English at width `w`. */
async function reader(w, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 780 }, ...extra });
  await ctx.addCookies([{ ...session, url: BASE, domain: undefined, path: undefined }, { name: LOCALE_COOKIE, value: "en", url: BASE }]);
  return ctx;
}

/** The week page to drive: WEEK_PATH, the register lane's sunset week, or the first register week drawing figures. */
async function weekPath(page) {
  if (process.env.WEEK_PATH) return process.env.WEEK_PATH;
  const reg = await page.request.post(`${BASE}/api/dev-test/seed-maswali-register`, { data: { scenario: "sunset" }, timeout: 600_000 }).catch(() => null);
  if (reg?.ok()) {
    const body = await reg.json().catch(() => ({}));
    const code = body.weeks?.sunset ?? Object.values(body.weeks ?? {})[0];
    if (code) return `/millionea/register/${encodeURIComponent(code)}`;
  }
  await page.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 600_000 }).catch(() => null);
  await page.goto(`${BASE}/millionea/register`, { waitUntil: "load", timeout: 180_000 });
  const hrefs = await page.$$eval('main a[href^="/millionea/register/"]', (as) => [...new Set(as.map((a) => a.getAttribute("href")))]);
  for (const h of hrefs) {
    await page.goto(`${BASE}${h}`, { waitUntil: "load", timeout: 180_000 });
    if (await page.locator("main .amount").count()) return h;
  }
  return null;
}

const settle = async (page) => {
  await page.waitForLoadState("load", { timeout: 60_000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.waitForTimeout(500);
};
/** Rest after a reader's move: a key press rouses the bubble (D75 fades it after 3s untouched; scroll-cast wakes it on
 *  any key), then D3's 250ms, the census's frame and the fade's --t-quick, well inside D75's 3s. */
const rest = async (page) => { await page.keyboard.press("Shift"); await page.waitForTimeout(800); };

/** In the page: the bubble's resting rect (its .cm-bubble box less the fade's translate, grown by its ring as
 *  needle-rest.ts `bubbleInk` grows it: (side/2 + 3)·1.08 − side/2 past each edge) and its box. */
const BUBBLE = () => {
  const fab = document.querySelector(".cm-fab");
  const b = fab?.querySelector(".cm-bubble") ?? fab;
  if (!fab || !b) return null;
  const r = b.getBoundingClientRect();
  const t = getComputedStyle(fab).transform;
  const m = t && t !== "none" ? new DOMMatrixReadOnly(t) : null;
  const dx = m ? m.e : 0, dy = m ? m.f : 0;
  const box = { left: r.left - dx, right: r.right - dx, top: r.top - dy, bottom: r.bottom - dy };
  const px = (r.width / 2 + 3) * 1.08 - r.width / 2, py = (r.height / 2 + 3) * 1.08 - r.height / 2;
  return { box, rest: { left: box.left - px, right: box.right + px, top: box.top - py, bottom: box.bottom + py } };
};
/** This drive's own census: is any visible text line or `.amount` box under the resting rect? */
const CENSUS = () => {
  const fab = document.querySelector(".cm-fab");
  const b = fab?.querySelector(".cm-bubble") ?? fab;
  if (!fab || !b) return null;
  const r = b.getBoundingClientRect();
  const t = getComputedStyle(fab).transform;
  const m = t && t !== "none" ? new DOMMatrixReadOnly(t) : null;
  const dy = m ? m.f : 0, dx = m ? m.e : 0;
  const px = (r.width / 2 + 3) * 1.08 - r.width / 2, py = (r.height / 2 + 3) * 1.08 - r.height / 2;
  const R = { left: r.left - dx - px, right: r.right - dx + px, top: r.top - dy - py, bottom: r.bottom - dy + py };
  const meets = (a) => a.left < R.right && a.right > R.left && a.top < R.bottom && a.bottom > R.top;
  const vis = (el) => el.checkVisibility ? el.checkVisibility({ opacityProperty: true, visibilityProperty: true }) : true;
  for (const a of document.querySelectorAll(".amount")) {
    if (fab.contains(a)) continue;
    const q = a.getBoundingClientRect();
    if (q.width > 1 && q.height > 1 && meets(q) && vis(a)) return true;
  }
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    const p = n.parentElement;
    if (!p || !(n.textContent || "").trim() || fab.contains(p) || p.closest("#needle-root, script, style, noscript, template, select, textarea")) continue;
    range.selectNodeContents(n);
    for (const line of range.getClientRects()) {
      if (line.width > 1 && line.height > 1 && meets(line) && vis(p)) return true;
    }
  }
  return false;
};
const opacityNow = (page) => page.evaluate(() => {
  const fab = document.querySelector(".cm-fab");
  return fab ? { o: Number(getComputedStyle(fab).opacity), mark: fab.hasAttribute("data-over-content"), token: getComputedStyle(document.documentElement).getPropertyValue("--state-yield-opacity").trim() } : null;
});

/** The figures a case puts under the bubble, as [label, selector-index] pairs found on the page. */
async function figures(page, kind) {
  return page.evaluate((kind) => {
    let els = [];
    if (kind === "wallet") els = [...document.querySelectorAll("main .text-right > p.font-mono.tabular-nums")].slice(0, 3);
    else if (kind === "how") els = [...document.querySelectorAll("main .amount")].filter((e) => /1,0[05]0,000/.test(e.textContent || ""));
    else {
      const ledger = document.querySelector('[data-testid="millionea-ledger"]') ?? document.querySelector("main");
      els = [...ledger.querySelectorAll(".amount")];
    }
    return els.filter((e) => e.getBoundingClientRect().width > 1).map((e, i) => {
      e.setAttribute("data-yield-fig", `${kind}-${i}`);
      return { id: `${kind}-${i}`, text: (e.textContent || "").trim() };
    });
  }, kind);
}
/** Scroll the figure's middle onto the bubble's resting middle; returns the overlap of bubble box and figure box. */
async function underBubble(page, id) {
  return page.evaluate(async (id) => {
    const el = document.querySelector(`[data-yield-fig="${id}"]`);
    const fab = document.querySelector(".cm-fab");
    const b = fab?.querySelector(".cm-bubble") ?? fab;
    if (!el || !b) return { why: !el ? "figure gone" : "no chat bubble on the page" };
    const tf = getComputedStyle(fab).transform;
    const dy = tf && tf !== "none" ? new DOMMatrixReadOnly(tf).f : 0;
    const br = b.getBoundingClientRect();
    const bubbleMid = (br.top - dy + br.bottom - dy) / 2;
    const f = el.getBoundingClientRect();
    window.scrollBy(0, (f.top + f.bottom) / 2 - bubbleMid);
    await new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(d)));
    const g = el.getBoundingClientRect();
    const box = { left: br.left, right: br.right, top: br.top - dy, bottom: br.bottom - dy };
    const o = { left: Math.max(g.left, box.left), right: Math.min(g.right, box.right), top: Math.max(g.top, box.top), bottom: Math.min(g.bottom, box.bottom) };
    const cs = getComputedStyle(el);
    return { box, fig: { left: g.left, right: g.right, top: g.top, bottom: g.bottom }, overlap: o.right > o.left && o.bottom > o.top ? o : null,
      color: cs.color, size: parseFloat(cs.fontSize), weight: Number(cs.fontWeight) || 400 };
  }, id);
}
/** Scroll to the first offset where this drive's census finds nothing under the resting rect (8px steps). */
async function clearSpot(page) {
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (let y = 0; y <= max; y += 8) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    if ((await page.evaluate(CENSUS)) === false) return y;
  }
  return null;
}

async function guard(kind, path, w) {
  const ctx = await reader(w);
  if (RED) await ctx.addInitScript(() => {
    new MutationObserver((ms) => { for (const m of ms) if (m.target.hasAttribute?.("data-over-content")) m.target.removeAttribute("data-over-content"); })
      .observe(document, { subtree: true, attributes: true, attributeFilter: ["data-over-content"] });
  });
  const page = await ctx.newPage();
  const r = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await settle(page);
  await page.waitForSelector(".cm-fab .cm-bubble", { state: "attached", timeout: 30_000 }).catch(() => {});
  const tag = `${kind} ${w}`;
  const figs = await figures(page, kind);
  ok(`PREMISE ${tag} · ${path} answers 200 with a figure to put under the bubble`, r?.status() === 200 && figs.length > 0, `(status ${r?.status()}, ${figs.length} figures)`);
  if (!figs.length) { await ctx.close(); return; }
  // The first figure that CAN lie under the bubble: one near the page's top never reaches it (no scroll moves it down).
  let fig = figs[0], at = null;
  for (const f of figs) {
    at = await underBubble(page, f.id);
    fig = f;
    if (at?.overlap) break;
  }
  await rest(page);
  const census = await page.evaluate(CENSUS);
  const over = await opacityNow(page);
  ok(`PREMISE ${tag} · "${fig.text}" lies under the bubble's resting rect (this drive's census)`, !!at?.overlap && census === true, JSON.stringify(at?.overlap));
  ok(`${tag} · over "${fig.text}" at rest the bubble yields to --state-yield-opacity (${over?.token})`, !!over && Math.abs(over.o - Number(over.token)) < 0.011 && over.mark, JSON.stringify(over));
  if (!at?.overlap) { await ctx.close(); return; }
  await page.screenshot({ path: join(OUT, `${RED ? "red-" : ""}${kind}-${w}-over.png`), clip: { x: 0, y: Math.max(0, at.box.top - 120), width: w, height: 240 } });
  // A pointer's hover brings it back whole, and leaving yields again.
  await rest(page);
  await page.mouse.move((at.box.left + at.box.right) / 2, (at.box.top + at.box.bottom) / 2);
  await page.waitForTimeout(400);
  const hovered = await opacityNow(page);
  await page.mouse.move(8, 200);
  await page.waitForTimeout(400);
  const left = await opacityNow(page);
  ok(`${tag} · a pointer's hover brings it back whole, and leaving it yields again`, hovered?.o === 1 && Math.abs(left.o - Number(left.token)) < 0.011, `(hover ${hovered?.o}, after ${left?.o})`);
  // A focus within it brings it back whole; a tap still opens the panel.
  await rest(page);
  await page.evaluate(() => document.querySelector(".cm-fab button, .cm-fab [role=button], .cm-fab a")?.focus());
  await page.waitForTimeout(300);
  const focused = await opacityNow(page);
  await page.evaluate(() => document.activeElement?.blur());
  ok(`${tag} · a focus within it brings it back whole`, focused?.o === 1, `(focused ${focused?.o})`);
  await rest(page);
  const tapped = await page.locator(".cm-fab .cm-bubble").click({ timeout: 10_000 }).then(() => true, () => false);
  await page.waitForTimeout(500);
  const opened = await page.evaluate(() => document.querySelector(".cm-fab")?.classList.contains("cm-fab--open"));
  ok(`${tag} · a tap on the yielding bubble opens the panel (pointer-events kept)`, tapped && opened === true, tapped ? "" : "(the tap never landed)");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  // Clear: nothing under the resting rect, by this drive's own census.
  const y = await clearSpot(page);
  await rest(page);
  const clear = await opacityNow(page);
  ok(`${tag} · where nothing lies under it (scrollY ${y}) the bubble is whole`, y !== null && clear?.o === 1 && !clear.mark, JSON.stringify(clear));
  await ctx.close();
}

// ── --measure: the lead's table ─────────────────────────────────────────────────────────────────────────────────────
const lum = ([r, g, b]) => { const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const rgbOf = (s) => { const m = /rgba?\(([^)]+)\)/.exec(s); const v = m ? m[1].split(/[ ,/]+/).filter(Boolean).map(Number) : [255, 255, 255]; return v; };
const shot = async (page, clip) => PNG.sync.read(await page.screenshot({ clip }));
const px = (png, x, y) => { const i = (png.width * y + x) << 2; return [png.data[i], png.data[i + 1], png.data[i + 2]]; };
const ALPHAS = Array.from({ length: 61 }, (_, i) => Math.round((0.30 + i * 0.01) * 100) / 100);
const table = [];
async function measure(kind, path, w) {
  const ctx = await reader(w, { deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await settle(page);
  await page.waitForSelector(".cm-fab .cm-bubble", { state: "attached", timeout: 30_000 }).catch(() => {});
  await page.addStyleTag({ content: ".cm-fab{transition:none!important;transform:none!important} .cm-bubble::after{animation:none!important;opacity:0!important}" });
  for (const fig of await figures(page, kind)) {
    const at0 = await underBubble(page, fig.id);
    if (!at0?.overlap) {
      const why = at0?.why ?? `not under it at any scroll (figure x ${Math.round(at0?.fig?.left)}–${Math.round(at0?.fig?.right)} y ${Math.round(at0?.fig?.top)}; bubble x ${Math.round(at0?.box?.left)}–${Math.round(at0?.box?.right)} y ${Math.round(at0?.box?.top)})`;
      table.push({ kind, w, text: fig.text, note: why });
      console.log(`  ${kind} ${w} "${fig.text}" · ${why}`);
      continue;
    }
    const o = at0.overlap;
    const clip = { x: Math.floor(o.left), y: Math.floor(o.top), width: Math.max(1, Math.ceil(o.right) - Math.floor(o.left)), height: Math.max(1, Math.ceil(o.bottom) - Math.floor(o.top)) };
    const force = async (css) => { await page.evaluate((css) => { let s = document.getElementById("yield-force"); if (!s) { s = document.createElement("style"); s.id = "yield-force"; document.head.append(s); } s.textContent = css; }, css); await page.waitForTimeout(120); };
    await force(".cm-fab{visibility:hidden!important}");
    const H = await shot(page, clip);
    await force(".cm-fab{opacity:1!important;visibility:visible!important}");
    const B = await shot(page, clip);
    const real = {};
    for (const a of [0.45, 0.5, 0.55, 0.6]) { await force(`.cm-fab{opacity:${a}!important;visibility:visible!important}`); real[a] = await shot(page, clip); }
    await force("");
    // The circle of the bubble, in clip pixels; the figure's background = the commonest colour of H inside it.
    const cx = (at0.box.left + at0.box.right) / 2 - clip.x, cy = (at0.box.top + at0.box.bottom) / 2 - clip.y, rad = (at0.box.right - at0.box.left) / 2 - 1.5;
    const inside = [];
    for (let y = 0; y < H.height; y++) for (let x = 0; x < H.width; x++) if ((x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2 <= rad * rad) inside.push([x, y]);
    const buckets = new Map();
    for (const [x, y] of inside) { const c = px(H, x, y); const k = c.map((v) => v >> 3).join(","); const e = buckets.get(k) ?? { n: 0, s: [0, 0, 0] }; e.n++; e.s = e.s.map((v, j) => v + c[j]); buckets.set(k, e); }
    const top = [...buckets.values()].sort((a, b) => b.n - a.n)[0];
    const bg = top ? top.s.map((v) => v / top.n) : [0, 0, 0];
    const text = rgbOf(at0.color).slice(0, 3);
    const d = text.map((v, j) => v - bg[j]); const dd = d.reduce((s, v) => s + v * v, 0) || 1;
    const glyph = inside.filter(([x, y]) => { const c = px(H, x, y); return c.reduce((s, v, j) => s + (v - bg[j]) * d[j], 0) / dd >= 0.5; });
    const min = at0.size >= 24 || (at0.size >= 18.66 && at0.weight >= 700) ? 3.0 : 4.5;
    const contrastAt = (a) => {
      const vals = glyph.map(([x, y]) => { const b = px(B, x, y); return ratio(b.map((v, j) => a * v + (1 - a) * text[j]), b.map((v, j) => a * v + (1 - a) * bg[j])); }).sort((p, q) => p - q);
      return vals.length ? { med: vals[Math.floor(vals.length / 2)], p10: vals[Math.floor(vals.length / 10)] } : null;
    };
    const drift = Object.fromEntries(Object.entries(real).map(([a, F]) => {
      let s = 0; for (const [x, y] of inside) { const h = px(H, x, y), b = px(B, x, y), f = px(F, x, y); s += f.reduce((t, v, j) => t + Math.abs(v - (Number(a) * b[j] + (1 - Number(a)) * h[j])), 0) / 3; }
      return [a, Math.round((s / Math.max(1, inside.length)) * 10) / 10];
    }));
    const sweep = ALPHAS.map((a) => ({ a, ...contrastAt(a) }));
    // ⛔ THE LEAD'S RULE (2026-10-21): EVERY figure reads, the icon zone included — its 10th-percentile glyph pixel, not
    // only its median, meets the minimum. The median's own highest is reported beside it.
    const best = [...sweep].reverse().find((x) => x.p10 >= min)?.a ?? null;
    const bestMedian = [...sweep].reverse().find((x) => x.med >= min)?.a ?? null;
    const row = { kind, w, text: fig.text, size: at0.size, weight: at0.weight, min, glyphPx: glyph.length,
      at45: contrastAt(0.45), at50: contrastAt(0.5), at55: contrastAt(0.55), at60: contrastAt(0.6),
      highestPassing: best, highestByMedian: bestMedian, modelVsChromium: drift };
    table.push(row);
    const cell = (c) => `${c?.med.toFixed(2)} p10 ${c?.p10.toFixed(2)}`;
    console.log(`  ${kind} ${w} "${fig.text}" ${at0.size}px/${at0.weight} min ${min} · .45 ${cell(row.at45)} · .50 ${cell(row.at50)} · .55 ${cell(row.at55)} · .60 ${cell(row.at60)} · highest by p10 ${best} · by median ${bestMedian} · model vs Chromium |Δ| ${JSON.stringify(drift)}`);
  }
  await ctx.close();
}

try {
  const scout = await browser.newPage();
  if (CASES.includes("wallet")) {
    // The demo player's wallet lists transactions only once it has moved money: markets, then a portfolio placed
    // through the real service (dev endpoints; the portfolio is the signed-in player's).
    const seeder = await reader(360);
    await seeder.request.post(`${BASE}/api/dev-test/seed-markets`, { timeout: 600_000 }).catch(() => null);
    const folio = await seeder.request.post(`${BASE}/api/dev-test/seed-player-portfolio`, { data: {}, timeout: 600_000 }).catch(() => null);
    console.log(`wallet fixture: seed-player-portfolio ${folio ? folio.status() : "unreachable"}`);
    await seeder.close();
  }
  const paths = { week: CASES.includes("week") ? await weekPath(scout) : null, how: "/millionea/how", wallet: "/wallet" };
  await scout.close();
  console.log(`pages: ${JSON.stringify(paths)}${RED ? "  (--prove-red: the census switched off)" : ""}${MEASURE ? "  (--measure)" : ""}`);
  for (const kind of CASES) {
    if (!paths[kind]) { ok(`PREMISE ${kind} · a page to drive`, false, "(none found)"); continue; }
    for (const w of WIDTHS) {
      if (MEASURE) await measure(kind, paths[kind], w);
      else if (kind !== "how") await guard(kind, paths[kind], w);
    }
  }
} finally {
  await browser.close();
}
if (MEASURE) {
  writeFileSync(join(OUT, "yield-table.json"), JSON.stringify(table, null, 1));
  const measured = table.filter((r) => r.highestPassing !== undefined);
  const floor = measured.length ? Math.min(...measured.map((r) => r.highestPassing ?? 0)) : null;
  console.log(`\nqa:chat-yield --measure: ${measured.length} figures measured; the highest opacity at which every one's 10th-percentile glyph pixel meets its minimum: ${floor} (by the median alone: ${measured.length ? Math.min(...measured.map((r) => r.highestByMedian ?? 0)) : null}) (table in ${OUT})`);
  process.exitCode = measured.length ? 0 : 1;
} else if (RED) {
  const yields = fails.filter((f) => /yields to --state-yield-opacity|leaving it yields again/.test(f)).length;
  const premises = fails.filter((f) => f.startsWith("PREMISE")).length;
  console.log(`\nqa:chat-yield --prove-red: ${yields} "yields" check(s) failed with the census off, ${premises} premise failure(s) (shots in ${OUT})`);
  process.exitCode = yields > 0 && premises === 0 ? 0 : 1;
} else {
  console.log(`\nqa:chat-yield: ${pass} passed, ${fails.length} failed (shots in ${OUT})`);
  process.exitCode = fails.length ? 1 : 0;
}
