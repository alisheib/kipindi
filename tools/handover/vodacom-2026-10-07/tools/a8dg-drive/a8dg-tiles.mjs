// S6 A8d + A8g TILES — today's Sell row and its free strip as a player sees them, on BOTH hosts, measured and drawn.
// usage (via run-with-server.sh): node a8dg-tiles.mjs <outDir> <paid|current> <stake> <widths comma list> [zoom]
// The poll config is set first (a free window of A8DG_GRACE minutes, 15 by default; MODE's paid window), six questions are created under it and the
// demo player holds four open tickets at <stake> (+0/700/1,400/2,100). For sw/en/zh × each width:
//   phase 1 (inside the free window) and phase 2 (paid or shut): /positions?tab=open and the holder block of a held
//   question — each Sell button's text boxes against its padding box, its height, its line count; each free STRIP's parts
//   (the label, the countdown, the note) — no part may break inside itself; and a viewport tile of the first Sell row.
// Verdicts (A8d/A8g as built): the holder block's button is 56px below 640 (kp-sell-stack) and 44px from 640; /positions'
// is 44px everywhere, at most two lines (kp-sell-wrap puts a note under its figure only where one line cannot hold);
// nothing runs past a button's padding box; no strip part breaks. "zoom" widths (below the 320 floor, page zoom) are
// MEASURED, never judged. ⛔ Viewport tiles only; local in-memory dev server only (premise refuses anything else).
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
const repoRequire = createRequire("C:/kipindi-journey/package.json");
const { chromium } = repoRequire("playwright");
const { premise, demoSession, LOCALE_COOKIE } = await import("file:///C:/kipindi-journey/scripts/live/journey-pass.mjs");

const base = process.env.KP_BASE ?? "http://localhost:3041";
const OUT = process.argv[2] ?? "a8dg-tiles-out";
const MODE = process.argv[3] ?? "current";
const STAKE = Number(process.argv[4] ?? 1500);
const WIDTHS = (process.argv[5] ?? "320,360,390,1280").split(",").map(Number);
const ZOOM = process.argv[6] === "zoom";
mkdirSync(OUT, { recursive: true });
const p0 = await premise(base);
if (p0.refuse) { console.log(`REFUSED: ${p0.refuse}`); process.exit(2); }

// 15 minutes by default: the strip then counts "14:59" down, its widest countdown (A8g measured the strip wrapping to
// 382px while it reads ten minutes or more), and phase 1 has room for every cell.
const GRACE_MIN = Number(process.env.A8DG_GRACE ?? 15);
const PAID_MIN = MODE === "paid" ? 10 : 0;
const LOCALES = ["sw", "en", "zh"];
const report = [];
let failures = 0;
const say = (s) => { report.push(s); console.log(s); };
const sleep = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

const PROBE = () => {
  const lineCount = (rects) => {
    const rs = rects.slice().sort((a, b) => a.top - b.top);
    let lines = 0;
    let bottom = -Infinity;
    for (const r of rs) { if (r.top >= bottom - 1) { lines += 1; bottom = r.bottom; } else bottom = Math.max(bottom, r.bottom); }
    return lines;
  };
  const textRects = (el) => {
    const out = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const x of Array.from(r.getClientRects())) if (x.width > 0) out.push({ top: x.top, bottom: x.bottom, right: x.right, left: x.left });
    }
    return out;
  };
  const buttons = [];
  for (const b of Array.from(document.querySelectorAll("button.btn.btn-md"))) {
    if (b.closest('[aria-modal="true"], header, nav')) continue;
    const text = (b.textContent || "").replace(/\s+/g, " ").trim();
    if (!/TZS|Inapakia|Kuuza kumefungwa|Inauza|Selling closed|Loading|加载中|卖出已关闭/.test(text)) continue;
    const br = b.getBoundingClientRect();
    const cs = getComputedStyle(b);
    const padRight = br.right - parseFloat(cs.borderRightWidth);
    const padLeft = br.left + parseFloat(cs.borderLeftWidth);
    const rects = textRects(b);
    const maxRight = rects.reduce((m, r) => Math.max(m, r.right), 0);
    const minLeft = rects.reduce((m, r) => Math.min(m, r.left), Infinity);
    buttons.push({
      text: text.slice(0, 70),
      cls: b.className.includes("kp-sell-stack") ? "stack" : b.className.includes("kp-sell-wrap") ? "wrap" : "-",
      width: Math.round(br.width),
      height: Math.round(br.height),
      pastEdge: +Math.max(maxRight - padRight, padLeft - minLeft).toFixed(1),
      lines: lineCount(rects),
    });
  }
  // The free strip: the brand-tinted row just above a free Sell button whose text holds the countdown; each of its direct
  // parts must stay on one line. ⚠️ 2026-10-06: the tint is asked too — in a shut or paid state the element above the
  // button is the ticket's id-and-opened row, whose clock time ("13:55") the countdown pattern took for a strip.
  const strips = [];
  for (const b of Array.from(document.querySelectorAll("button.btn.btn-md"))) {
    const s = b.previousElementSibling;
    if (!s || !/\d+:\d\d/.test(s.textContent || "") || !/bg-brand-500\//.test(String(s.className || ""))) continue;
    const parts = Array.from(s.children).map((c) => ({ text: (c.textContent || "").trim().slice(0, 40), lines: lineCount(textRects(c)) }));
    const sr = s.getBoundingClientRect();
    strips.push({ height: Math.round(sr.height), lines: lineCount(textRects(s)), broken: parts.filter((p) => p.lines > 1).map((p) => p.text) });
  }
  // A date-time never breaks inside (2026-10-06): every rendered text node holding a year and a clock time, outside a
  // button, a dialog, the header, the nav and the footer, sits on one line. The ticket's "opened" line broke its date at
  // 320 sw ("Imefunguliwa 4 Oct 2026, / 13:55") — found when the strip probe above mistook that row for a strip.
  const dates = [];
  {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const tx = (n.textContent || "").trim();
      if (!/20\d\d/.test(tx) || !/\d{1,2}:\d\d/.test(tx)) continue;
      const el = n.parentElement;
      if (!el || el.closest('button, [aria-modal="true"], header, nav, footer, script, style')) continue;
      const rg = document.createRange();
      rg.selectNodeContents(n);
      const rects = Array.from(rg.getClientRects()).filter((x) => x.width > 0).map((x) => ({ top: x.top, bottom: x.bottom }));
      if (!rects.length) continue;
      dates.push({ text: tx.slice(0, 40), lines: lineCount(rects) });
    }
  }
  return { buttons, strips, dates, pageOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
};

async function cell(browser, cookies, { locale, width, path, host, phase }) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 1024 ? 780 : 900 } });
  await ctx.addCookies([...cookies, { name: LOCALE_COOKIE, value: locale, url: base }]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => { failures += 1; say(`FAIL script error ${host} ${locale} ${width}: ${String(e?.message ?? e).slice(0, 160)}`); });
  page.on("console", (m) => { if (/hydrat/i.test(m.text())) { failures += 1; say(`FAIL hydration warning ${host} ${locale} ${width}: ${m.text().slice(0, 160)}`); } });
  await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.evaluate(() => document.fonts.ready.then(() => true)).catch(() => {});
  await page.waitForTimeout(1800);
  const r = await page.evaluate(PROBE);
  const first = page.locator("button.btn.btn-md", { hasText: /TZS|Kuuza|Selling closed|卖出已关闭/ }).first();
  if (await first.count()) { await first.evaluate((el) => el.scrollIntoView({ block: "center" })); await page.waitForTimeout(300); }
  await page.screenshot({ path: `${OUT}/${MODE}-${STAKE}-${phase}-${host}--${locale}-${width}.png` });
  await ctx.close();
  return r;
}

const browser = await chromium.launch();
try {
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const seeded = await ctx.request.post(`${base}/api/dev-test/seed-admin`, { data: {} });
    if (!seeded.ok()) throw new Error(`seed-admin answered ${seeded.status()}`);
    const page = await ctx.newPage();
    await page.goto(`${base}/admin/config`, { waitUntil: "domcontentloaded", timeout: 240_000 });
    const grace = page.locator('input[name="freeExitGraceMinutes"]');
    await grace.waitFor({ timeout: 120_000 });
    await grace.fill(String(GRACE_MIN + 1));
    await grace.fill(String(GRACE_MIN));
    await page.locator('input[name="paidExitWindowMinutes"]').fill(String(PAID_MIN));
    const save = page.getByRole("button", { name: "Save · Hifadhi" }).first();
    if (await save.isEnabled()) { await save.click(); await page.getByText("Global config updated").first().waitFor({ timeout: 60_000 }).catch(() => {}); }
    await ctx.close();
  }
  const rm = await (await browser.newContext()).request.post(`${base}/api/dev-test/seed-real-markets`, { data: {} });
  const rmBody = await rm.json().catch(() => ({}));
  const session = await demoSession(browser, base, { query: "?deposit=0", balance: 250_000 });
  {
    const ctx = await browser.newContext();
    await ctx.addCookies([session]);
    for (const path of ["/positions?tab=open", `/markets/${rmBody.live?.[0]?.id}`]) await ctx.request.get(`${base}${path}`, { timeout: 240_000 }).catch(() => {});
    await ctx.close();
  }
  const seedCtx = await browser.newContext();
  await seedCtx.addCookies([session]);
  const T0 = Date.now();
  const sp = await seedCtx.request.post(`${base}/api/dev-test/seed-player-portfolio`, { data: { stake: STAKE } });
  const spBody = await sp.json().catch(() => ({}));
  await seedCtx.close();
  const held = spBody.marketIds?.[0];
  say(`seed: stake ${STAKE}; portfolio ${JSON.stringify(spBody.byStatus)}; holder block on ${held}`);
  if (!held || spBody.byStatus?.OPEN !== 4) { failures += 1; say("FAIL the portfolio does not hold four open tickets"); }

  const hosts = [["positions", "/positions?tab=open"], ["holder", `/markets/${held}`]];
  const judge = (phase, host, locale, width, r) => {
    const tag = `${phase} ${host} ${locale} ${width}`;
    const bad = [];
    for (const b of r.buttons) {
      const wantH = host === "holder" ? (width < 640 ? 56 : 44) : 44;
      if (b.pastEdge > 0.5) bad.push(`"${b.text}" ${b.pastEdge}px past its edge`);
      if (b.height !== wantH) bad.push(`"${b.text}" ${b.height}px tall (want ${wantH})`);
      if (host === "positions" && b.lines > 2) bad.push(`"${b.text}" ${b.lines} lines`);
      if (host === "holder" && b.lines > 3) bad.push(`"${b.text}" ${b.lines} lines`);
    }
    for (const s of r.strips) if (s.broken.length) bad.push(`strip part broken inside: ${JSON.stringify(s.broken)}`);
    for (const d of r.dates) if (d.lines > 1) bad.push(`date broken inside: ${JSON.stringify(d.text)} on ${d.lines} lines`);
    if (r.pageOverflow > 0) bad.push(`page ${r.pageOverflow}px wider than the viewport`);
    const sum = r.buttons.map((b) => `${b.cls}:${b.height}px/${b.lines}l/${b.pastEdge}`).join(" ");
    const strip = r.strips.map((s) => `${s.lines}l ${s.height}px`).join(" ");
    const line = `${tag}: ${r.buttons.length} button(s) [${sum}] strip [${strip}]`;
    if (ZOOM) { say(`MEASURE ${line}${bad.length ? ` — ${bad.join("; ")}` : ""}`); return; }
    if (!r.buttons.length && host === "positions") { failures += 1; say(`FAIL ${tag}: no Sell button`); return; }
    if (bad.length) { failures += 1; say(`FAIL ${line} — ${bad.join("; ")}`); } else say(`PASS ${line}`);
  };

  for (const [host, path] of hosts) for (const locale of LOCALES) for (const width of WIDTHS) judge("free", host, locale, width, await cell(browser, [session], { locale, width, path, host, phase: "free" }));
  say(`phase 1 took ${((Date.now() - T0) / 1000).toFixed(0)} s of the ${GRACE_MIN}-minute window`);
  if (!ZOOM) {
    await sleep(T0 + GRACE_MIN * 60_000 + 25_000 - Date.now());
    const ph = MODE === "paid" ? "paid" : "shut";
    for (const [host, path] of hosts) for (const locale of LOCALES) for (const width of WIDTHS) judge(ph, host, locale, width, await cell(browser, [session], { locale, width, path, host, phase: ph }));
  }
} catch (e) {
  failures += 1;
  say(`FAIL the drive stopped: ${String(e?.stack ?? e).slice(0, 600)}`);
} finally {
  await browser.close().catch(() => {});
}
writeFileSync(`${OUT}/a8dg-tiles-${MODE}-${STAKE}${ZOOM ? "-zoom" : ""}.txt`, report.join("\n") + "\n");
console.log(failures ? `a8dg tiles (${MODE}, ${STAKE}): ${failures} failure(s)` : `a8dg tiles (${MODE}, ${STAKE}): every row fits, no strip part breaks`);
process.exit(failures ? 1 : 0);
