// S7 WP0 · THE BAR BUDGET PROBE (S7-PLAN WP0 step 3, as amended by A5 and A16). A scratchpad tool: §0j records its
// METHOD, never its path. Run from a worktree on a FRESH local in-memory server (kp-with-server.sh sets KP_BASE, no
// DATABASE_URL, DISABLE_ADMIN_TOTP=true). It changes only that throwaway server's memory (a seeded admin publishes an
// announcement; the demo account is signed in and displaced). Measures, at 360 and 390 × sw/en/zh:
//   · the journey header's height (signed in, and a guest), the preview marker's;
//   · each bar as the product draws it: the announcement (set through /admin/system by a seeded ADMIN, as an operator
//     would), the away summary (the ledger seeded exactly as `recordAway` writes it, then a reload), the session-ended
//     notice (the session displaced by a second /auth/demo, then a refresh flight on /live, which polls — A5 item 4);
//   · the rail's top at 640, 740 and 844 tall;
//   · the home headline (S7 `headlineAsk` + <br> + `headlineSides`) in each A16 candidate rung, lines and height;
// then computes card 1's picks bottom per cell from A5 item 1's parts and prints the slack to the rail. Records, never
// gates: WP0 raises a §0h point if a GATED cell is over (A5 (b)).
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { writeFileSync } from "node:fs";

const ROOT = process.cwd();
const req = createRequire(ROOT + "/package.json");
const { chromium } = req("playwright");
const { premise, mintStaffPass, demoSession, LOCALE_COOKIE } = await import(pathToFileURL(ROOT + "/scripts/live/journey-pass.mjs").href);
const BASE = process.env.KP_BASE;
const OUT = process.argv[2] ?? null;
const WIDTHS = [360, 390], LOCALES = ["sw", "en", "zh"], HEIGHTS = [640, 740, 844];
const HEADER = 'header[data-testid="journey-top-bar"]', TABS = 'nav[data-testid="journey-tabs"]';
const MARKER = '[data-testid="journey-preview-marker"]', AWAY = '[data-testid="away-summary-bar"]';
const ENDED = '[data-testid="session-ended-notice"]';
const ANNOUNCE = "New markets are live for the AFCON qualifiers — good luck!"; // the admin form's own example message
const HEADLINE = { sw: ["Jibu swali.", "NDIO au HAPANA."], en: ["Answer the question.", "YES or NO."], zh: ["回答问题。", "是还是否。"] };
const RUNGS = [
  { name: "--type-display-2 (44)", size: 44, lh: 44 * 1.12 },
  { name: "text-display-3 (36/40)", size: 36, lh: 40 },
  { name: "--type-h1 (32)", size: 32, lh: 32 * 1.12 },
  { name: "canvas (30/1.12)", size: 30, lh: 30 * 1.12 },
];
// The mixed set, the longest calm-bar sentence (presence-bar-drive.mjs's own scenario)
const AWAY_ROWS = (now) => [
  ["m1", "WIN", 8000, 1000], ["m2", "WIN", 4000, 1000], ["m3", "WIN", 6000, 1000], ["m4", "LOSS", 0, 2000],
  ["m5", "LOSS", 0, 1500], ["m6", "LOSS", 0, 1000], ["m7", "LOSS", 0, 3000], ["m8", "LOSS", 0, 2500],
].map(([id, kind, amount, stake], i) => ({ id, kind, amount, stake, settledAtMs: now - 7_200_000 + i * 10_000, label: `Market ${i + 1}` }));

const t0 = Date.now();
setTimeout(() => { console.log("WATCHDOG: 20 minutes — stopping"); process.exit(3); }, 20 * 60_000).unref();
const p0 = await premise(BASE);
if (p0.refuse) { console.log(`REFUSED: ${p0.refuse}`); process.exit(2); }
const browser = await chromium.launch({ headless: true });
const host = new URL(BASE).hostname;
const asCookie = (c) => ({ name: c.name, value: c.value, domain: host, path: c.path || "/" });
const r1 = (n) => (n == null ? null : Math.round(n * 10) / 10);
const R = { base: BASE, browser: browser.version(), cells: {}, rungs: {}, problems: [] };
const cell = (w, l) => (R.cells[`${w}-${l}`] ??= { width: w, locale: l });

async function context({ width, height = 844, locale, session = null, withPass = true }) {
  const ctx = await browser.newContext({ viewport: { width, height } });
  const cookies = [{ name: LOCALE_COOKIE, value: locale, domain: host, path: "/" }];
  if (withPass) cookies.push(asCookie(PASS));
  if (session) cookies.push(asCookie(session));
  await ctx.addCookies(cookies);
  await ctx.addInitScript(() => { try { window.localStorage.setItem("50pick-primer-seen", "1"); } catch { /* storage refused */ } });
  return ctx;
}
async function box(page, sel, opts = {}) {
  const l = opts.hasText ? page.locator(sel, { hasText: opts.hasText }).first() : page.locator(sel).first();
  try { await l.waitFor({ state: "visible", timeout: opts.timeout ?? 20_000 }); } catch { return null; }
  const b = await l.boundingBox();
  return b ? { y: r1(b.y), h: r1(b.height) } : null;
}
async function open(page, path) {
  await page.goto(BASE + path, { waitUntil: "domcontentloaded", timeout: 120_000 });
  await page.locator(HEADER).first().waitFor({ state: "visible", timeout: 60_000 });
  await page.waitForTimeout(400);
}

console.log(`bar probe — ${BASE} · Chromium ${R.browser}`);
const PASS = await mintStaffPass(browser, BASE);
const SESSION = await demoSession(browser, BASE);

// A · header, marker and the rail's top — signed in; then the guest's header
for (const w of WIDTHS) for (const l of LOCALES) {
  const c = cell(w, l);
  const ctx = await context({ width: w, locale: l, session: SESSION });
  const page = await ctx.newPage();
  try {
    await open(page, "/");
    c.header = (await box(page, HEADER))?.h ?? null;
    c.marker = (await box(page, MARKER))?.h ?? null;
    c.railTop = {};
    for (const h of HEIGHTS) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(250);
      c.railTop[h] = (await box(page, TABS))?.y ?? null;
    }
    // the headline in each candidate rung, in this cell's width, with PageContainer's 12px gutters
    c.h1 = await page.evaluate(({ lines, rungs, w }) => {
      const out = {};
      for (const r of rungs) {
        const wrap = document.createElement("div");
        wrap.style.cssText = `position:absolute;left:0;top:0;width:${w - 24}px;visibility:hidden`;
        const h = document.createElement("h1");
        h.style.cssText = `margin:0;font-family:var(--font-display);font-weight:700;letter-spacing:-0.01em;font-size:${r.size}px;line-height:${r.lh}px`;
        h.append(lines[0], document.createElement("br"), lines[1]);
        wrap.append(h); document.body.append(wrap);
        const height = h.getBoundingClientRect().height;
        out[r.name] = { height: Math.round(height * 10) / 10, lines: Math.round(height / r.lh) };
        wrap.remove();
      }
      return out;
    }, { lines: HEADLINE[l], rungs: RUNGS, w });
  } catch (e) { R.problems.push(`A ${w}-${l}: ${String(e.message).slice(0, 160)}`); }
  await ctx.close();
  const g = await context({ width: w, locale: l });
  const gp = await g.newPage();
  try { await open(gp, "/"); c.guestHeader = (await box(gp, HEADER))?.h ?? null; } catch (e) { R.problems.push(`A guest ${w}-${l}: ${String(e.message).slice(0, 160)}`); }
  await g.close();
  console.log(`  ${w} ${l} · header ${c.header} (guest ${c.guestHeader}) · marker ${c.marker} · rail top ${JSON.stringify(c.railTop)}`);
}

// B · the away summary: the ledger seeded as `recordAway` writes it, then a reload
for (const w of WIDTHS) for (const l of LOCALES) {
  const c = cell(w, l);
  const ctx = await context({ width: w, locale: l, session: SESSION });
  const page = await ctx.newPage();
  try {
    await open(page, "/");
    const uid = await page.evaluate(() => document.documentElement.innerHTML.match(/\\?"userId\\?":\\?"([A-Za-z0-9_-]{8,})/)?.[1] ?? null);
    if (!uid) throw new Error("the viewer's id was not found in the page");
    await page.evaluate(([key, rows]) => window.sessionStorage.setItem(key, JSON.stringify(rows)), [`50pick:away-ledger:${uid}`, AWAY_ROWS(Date.now())]);
    await page.reload({ waitUntil: "domcontentloaded" });
    c.away = (await box(page, AWAY))?.h ?? null;
  } catch (e) { R.problems.push(`B ${w}-${l}: ${String(e.message).slice(0, 160)}`); }
  await ctx.close();
  console.log(`  ${w} ${l} · away summary ${c.away}`);
}

// C · the announcement, published through /admin/system by a seeded ADMIN
{
  const actx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const seeded = await actx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { role: "ADMIN", phone: "+255700000093", name: "Bar Probe Admin" } });
    if (!seeded.ok()) throw new Error(`seed-admin answered ${seeded.status()}`);
    const page = await actx.newPage();
    await page.goto(`${BASE}/admin/system`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    const box1 = page.getByPlaceholder(/New markets are live/);
    await box1.waitFor({ timeout: 120_000 });
    await box1.fill(ANNOUNCE);
    const sw = page.getByRole("switch", { name: "Publish banner" }).or(page.getByLabel("Publish banner"));
    if ((await sw.first().getAttribute("aria-checked")) !== "true") await sw.first().click();
    await page.getByRole("button", { name: "Publish banner" }).click();
    await page.waitForTimeout(2500);
    R.announcement = ANNOUNCE;
  } catch (e) { R.problems.push(`C publish: ${String(e.message).slice(0, 200)}`); }
  await actx.close();
  for (const w of WIDTHS) for (const l of LOCALES) {
    const c = cell(w, l);
    const ctx = await context({ width: w, locale: l, session: SESSION });
    const page = await ctx.newPage();
    try { await open(page, "/"); c.announcement = (await box(page, 'div[role="status"]', { hasText: ANNOUNCE }))?.h ?? null; }
    catch (e) { R.problems.push(`C ${w}-${l}: ${String(e.message).slice(0, 160)}`); }
    await ctx.close();
    console.log(`  ${w} ${l} · announcement ${c.announcement}`);
  }
}

// D · the session-ended notice: signed in on /live, displaced by a second /auth/demo, then a refresh flight
for (const w of WIDTHS) for (const l of LOCALES) {
  const c = cell(w, l);
  const mine = await demoSession(browser, BASE);
  const ctx = await context({ width: w, locale: l, session: mine });
  const page = await ctx.newPage();
  try {
    await open(page, "/live");
    await demoSession(browser, BASE); // ends `mine`: one session per account
    await page.evaluate(() => window.dispatchEvent(new Event("50pick:refresh")));
    c.ended = (await box(page, ENDED, { timeout: 45_000 }))?.h ?? null;
    c.endedTabsStay = await page.locator(TABS).first().isVisible().catch(() => false);
  } catch (e) { R.problems.push(`D ${w}-${l}: ${String(e.message).slice(0, 160)}`); }
  await ctx.close();
  console.log(`  ${w} ${l} · session ended ${c.ended} (tabs still up: ${c.endedTabsStay})`);
}
await browser.close();

// E · card 1's picks bottom (A5 item 1): the canvas's stack with PageContainer's 32px top and the measured parts
const STACK = { top: 32, howTo: 72, gapA: 16, gapB: 16, chips: 44, gapC: 16, cardPad: 16, meta: 18, gapD: 12, gapE: 12 };
const rungFor = (l) => RUNGS.find((r) => [360, 390].every((w) => R.cells[`${w}-${l}`]?.h1?.[r.name]?.lines === 2)) ?? null;
console.log("\ncard 1 — picks bottom vs the rail's top (slack, px), header + bars + stack:");
for (const w of WIDTHS) for (const l of LOCALES) {
  const c = cell(w, l);
  const rung = rungFor(l);
  const h1 = rung ? c.h1?.[rung.name]?.height : null;
  const states = {
    "no bar": 0,
    "marker (recorded only)": c.marker ?? 0,
    "all bars, signed in (announcement + away)": (c.announcement ?? 0) + (c.away ?? 0),
    "all bars, guest (announcement + session ended)": (c.announcement ?? 0) + (c.ended ?? 0),
  };
  c.budget = {};
  for (const [state, bars] of Object.entries(states)) for (const [title, tLabel] of [[24, "title 1 line"], [48, "title 2 lines"]]) for (const picks of [64, 74]) {
    const bottom = (c.header ?? 56) + bars + STACK.top + STACK.howTo + STACK.gapA + (h1 ?? 0) + STACK.gapB + STACK.chips + STACK.gapC + STACK.cardPad + STACK.meta + STACK.gapD + title + STACK.gapE + picks;
    for (const h of HEIGHTS) {
      const rail = c.railTop?.[h];
      (c.budget[`${state} · ${tLabel} · picks ${picks} · ${h}`] = rail == null || h1 == null ? null : r1(rail - bottom));
    }
  }
  console.log(`  ${w} ${l} · rung ${rung?.name ?? "NONE holds two lines at 360 and 390"} (h1 ${h1}) · no bar, 1-line title, picks 64: ${HEIGHTS.map((h) => `${h}→${c.budget[`no bar · title 1 line · picks 64 · ${h}`]}`).join("  ")}`);
}
R.seconds = Math.round((Date.now() - t0) / 1000);
if (OUT) writeFileSync(OUT, JSON.stringify(R, null, 1));
console.log(`\nproblems: ${R.problems.length ? R.problems.join(" | ") : "none"} · ${R.seconds}s${OUT ? ` · ${OUT}` : ""}`);
process.exit(R.problems.length ? 1 : 0);
