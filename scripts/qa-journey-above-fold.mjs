/**
 * qa:journey-above-fold — THE JOURNEY HOME'S FIRST SCREEN ON A PHONE: the How-to card and card 1's picks above the tab
 * bar, the headline on two lines, with no bar up and with every bar up (the Vodacom plan S7:
 * `docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md` WP11 step 1 as amendment A5 amends it; VODACOM-PLAN
 * §0h points 67 and 75). The rules, the cells table and the plants are `live/journey-above-fold.mjs`'s.
 *
 *   KP_BASE=http://localhost:3041 npm run qa:journey-above-fold                 the red control, then the matrix
 *   KP_BASE=http://localhost:3041 npm run qa:journey-above-fold -- --prove-red  the red control alone
 *
 * ⭐ THE RED CONTROL RUNS FIRST, AND BY DEFAULT: each plant's cell is measured clean (it must PASS, or the plant proves
 * nothing), then the plant is added to the page — a style or a page script, never a repository file — and the cell must
 * turn exactly the way the plant is named for (its rule red, or INVALID). Only then is the matrix read.
 * ⭐ WHAT THE MATRIX READS: 360×640, 360×740 and 390×844 × sw, en and zh × a guest and the demo player × no bar and all
 * bars × two books (card 1 with its full title; card 1 with a short title at the full budget) — 72 cells, each a fresh
 * page of `/` for a reader holding a staff preview pass, the preview marker asserted present, its height printed, then
 * hidden by a page-only style (A5 (a)). The verdicts are the module's: R1–R4 gated as its table says, R3 RECORDED in the
 * all-bars cells at 360×640 and 360×740, INVALID never a pass.
 * ⭐ HOW EACH BAR IS RAISED, FOR REAL (A5 item 4): the announcement published through /admin/system by a seeded ADMIN, as
 * an operator would; the away summary from its ledger as `recordAway` writes it (sessionStorage), then a reload; the
 * session-ended notice for a guest — the cell's player signed in, displaced by a second sign-in, then a REFRESH flight on
 * the home (`50pick:refresh`, the poller's own event: a soft hop or a document load cannot raise it), waited for while
 * the tabs stay up.
 * ⭐ THE BOOKS: the catalogue is seeded (`/api/dev-test/seed-markets`), two of its questions are chosen, and card 1 is made
 * each in turn by moving its betting close to the front (`/api/dev-test/fast-forward-market`, its `selectionSeconds`) —
 * the home orders by when betting closes. The second gets short titles at the full budget (`SHORT_TITLE_MAX`: 100 · 100
 * · 50 code points) through the market page's own form as a seeded ADMIN ("Save card wording"). A cell whose card 1 is
 * not its book's question is INVALID.
 *
 * ⛔ LOCAL ONLY (`premise`, `live/journey-pass.mjs`): `http://localhost:PORT` exactly, an in-memory server started after
 * `rm -rf .next` with DISABLE_ADMIN_TOTP=true and no DATABASE_URL, whose rollout a pass can see. It writes only that
 * server's memory: a SUPPORT officer and its pass, an ADMIN, the catalogue, two questions' close instants and short
 * titles, the announcement, and the demo account's sessions. Never point it at a server another drive is using.
 * EXIT 0 every gated cell PASS and every plant caught · 1 a FAIL, an INVALID or a plant not caught · 2 refused · 3 the
 * watchdog stopped it.
 */
import { chromium } from "playwright";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import {
  AF_VIEWPORTS, AF_LOCALES, AF_READERS, AF_BOOKS, SEL, HIDE_MARKER_CSS, PROBE, judge, RED_PLANTS, R1_PLANT, plantCaught,
  CELLS_TABLE, expectedBars,
} from "./live/journey-above-fold.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3041";
const ARGS = process.argv.slice(2);
const ONLY_RED = ARGS.includes("--prove-red");
const unknown = ARGS.filter((a) => a !== "--prove-red");
if (unknown.length) {
  console.error(`⛔ unknown argument ${unknown.join(" ")} — qa:journey-above-fold takes --prove-red or nothing`);
  process.exit(2);
}
const WATCHDOG_MIN = 50;
setTimeout(() => { console.log(`\nWATCHDOG: ${WATCHDOG_MIN} minutes — stopped`); process.exit(3); }, WATCHDOG_MIN * 60_000).unref();

/** The announcement's words: the admin form's own example message. */
const ANNOUNCE = "New markets are live for the AFCON qualifiers — good luck!";
/** Short titles at the full budget (`SHORT_TITLE_MAX`: en 100, sw 100, zh 50 code points), words only (no figure the
 *  full question would not hold), GSM-7 in en and sw. */
const SHORT = {
  en: "Will the national team reach the final round of the regional cup before the long rainy season begins",
  sw: "Je timu ya taifa itafika hatua ya mwisho ya kombe la kanda kabla ya kuanza kwa msimu wa mvua ndefu",
  zh: "国家队能否在漫长的雨季开始之前进入地区杯赛的最后一轮比赛并且最终赢得冠军奖杯呢这是一个关于足球的问题",
};
/** The away ledger as `recordAway` writes it (the bar probe's mixed set: the longest calm-bar sentence). */
const AWAY_ROWS = (now) => [
  ["m1", "WIN", 8000, 1000], ["m2", "WIN", 4000, 1000], ["m3", "WIN", 6000, 1000], ["m4", "LOSS", 0, 2000],
  ["m5", "LOSS", 0, 1500], ["m6", "LOSS", 0, 1000], ["m7", "LOSS", 0, 3000], ["m8", "LOSS", 0, 2500],
].map(([id, kind, amount, stake], i) => ({ id, kind, amount, stake, settledAtMs: now - 7_200_000 + i * 10_000, label: `Market ${i + 1}` }));

const cp = (s) => [...s].length;
for (const [l, max] of [["en", 100], ["sw", 100], ["zh", 50]]) {
  if (cp(SHORT[l]) !== max) { console.error(`⛔ the ${l} short title is ${cp(SHORT[l])} code points, not the budget's ${max}`); process.exit(2); }
}

const pre = await premise(BASE);
if (pre.refuse) { console.error(`REFUSED — ${pre.refuse}`); process.exit(2); }
if (pre.health?.security?.adminTotp !== "DISABLED") {
  console.error(`REFUSED — the console keeps the two-step check (security.adminTotp = ${JSON.stringify(pre.health?.security?.adminTotp)}): start the server with DISABLE_ADMIN_TOTP=true`);
  process.exit(2);
}
const browser = await chromium.launch();
const host = new URL(BASE).hostname;
const asCookie = (c) => ({ name: c.name, value: c.value, domain: host, path: c.path || "/" });
console.log(`qa:journey-above-fold — ${BASE} · Chromium ${browser.version()}${ONLY_RED ? " · the red control alone" : ""}`);

const results = [];
const plantResults = [];
let failures = 0;
const say = (line) => console.log(line);

// ── fixtures: the pass, the catalogue, two questions, short titles on the second ─────────────────────────────────
const PASS = await mintStaffPass(browser, BASE);
const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
{
  const seeded = await admin.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { role: "ADMIN", phone: "+255700000093", name: "Fold Admin" } });
  if (!seeded.ok()) { console.error(`REFUSED — seed-admin answered ${seeded.status()} (a stale .next 404s the dev routes: rm -rf .next)`); process.exit(2); }
}
const catalogue = await admin.request.post(`${BASE}/api/dev-test/seed-markets`, { timeout: 240_000 }).then((r) => r.json()).catch(() => null);
const live = (catalogue?.ids ?? []).filter((m) => m.titleEn && !m.titleEn.startsWith("Demo · "));
if (live.length < 4) { console.error(`REFUSED — the catalogue holds ${live.length} live questions; card 1's books need at least 4`); process.exit(2); }
// The FULL book: the longest full question (its card clamps it to two lines); the SHORT book: another question.
const byLength = live.slice().sort((a, b) => b.titleEn.length - a.titleEn.length);
const FULL_ID = byLength[0].id;
const SHORT_ID = byLength[1].id;
say(`  books: full → ${FULL_ID} (${JSON.stringify(byLength[0].titleEn)}), short → ${SHORT_ID}`);
{
  const page = await admin.newPage();
  await page.goto(`${BASE}/admin/markets/${SHORT_ID}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  for (const [label, l] of [["English short title", "en"], ["Swahili short title", "sw"], ["Chinese short title · 中文", "zh"]]) {
    const f = page.getByLabel(label, { exact: true });
    await f.waitFor({ timeout: 120_000 });
    await f.fill(SHORT[l]);
  }
  await page.getByRole("button", { name: "Save card wording" }).first().click();
  await page.waitForTimeout(3000);
  await page.close();
}
/** Card 1 is `id`: its betting closes first (the home orders by when betting closes), the other book's later. */
async function makeCardOne(id, other) {
  for (const [m, sel] of [[id, 40 * 60], [other, 55 * 60]]) {
    const r = await admin.request.post(`${BASE}/api/dev-test/fast-forward-market`, { data: { marketId: m, seconds: sel + 3600, selectionSeconds: sel } });
    if (!r.ok()) throw new Error(`fast-forward-market ${m} answered ${r.status()}`);
  }
}

// ── one cell: a fresh page of `/`, the marker hidden, the bars raised, the probe and the verdict ─────────────────────
async function context(vp, locale, cookies) {
  const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, domain: host, path: "/" }, asCookie(PASS), ...cookies.map(asCookie)]);
  // The old first-visit primer never opens for a journey reader; the seen flag only keeps a classic fallback quiet.
  await ctx.addInitScript(() => { try { window.localStorage.setItem("50pick-primer-seen", "1"); } catch { /* storage refused */ } });
  return ctx;
}
async function settleProbe(page) {
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  let m = await page.evaluate(PROBE, { sel: SEL, announce: ANNOUNCE }).catch(() => null);
  for (let i = 0; i < 6; i++) {
    await page.waitForTimeout(300);
    const next = await page.evaluate(PROBE, { sel: SEL, announce: ANNOUNCE }).catch(() => null);
    const same = JSON.stringify(next) === JSON.stringify(m);
    m = next;
    if (same) break;
  }
  return m;
}
/** Opens `/`, waits for the rail (it hydrates one chunk late: a cell with no rail is INVALID), hides the marker. */
async function openHome(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.locator(SEL.home).first().waitFor({ timeout: 120_000 }).catch(() => {});
  await page.locator(SEL.rail).first().waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
  const marker = await page.locator(SEL.marker).first().boundingBox().catch(() => null);
  await page.addStyleTag({ content: HIDE_MARKER_CSS });
  return marker ? Math.round(marker.height * 10) / 10 : null;
}
async function cardOneIs(page) {
  return page.evaluate((sel) => document.querySelector(sel)?.getAttribute("data-row-id") ?? null, SEL.card).catch(() => null);
}
/** Raises the cell's bars on an open page; returns a note when one could not be raised (the verdict reads visibility). */
async function raiseBars(page, cell, mine) {
  if (cell.bars !== "all") return "";
  if (cell.reader === "player") {
    const uid = await page.evaluate(() => document.documentElement.innerHTML.match(/\\?"userId\\?":\\?"([A-Za-z0-9_-]{8,})/)?.[1] ?? null);
    if (!uid) return "the viewer's id was not found in the page: no away ledger";
    await page.evaluate(([key, rows]) => window.sessionStorage.setItem(key, JSON.stringify(rows)), [`50pick:away-ledger:${uid}`, AWAY_ROWS(Date.now())]);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(SEL.rail).first().waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
    await page.addStyleTag({ content: HIDE_MARKER_CSS });
    await page.locator(SEL.away).first().waitFor({ state: "visible", timeout: 30_000 }).catch(() => {});
    return "";
  }
  // a guest's bar: the cell's player (`mine`) displaced by a second sign-in, then a refresh flight on the home
  void mine;
  await demoSession(browser, BASE);
  await page.evaluate(() => window.dispatchEvent(new Event("50pick:refresh")));
  await page.locator(SEL.ended).first().waitFor({ state: "visible", timeout: 45_000 }).catch(() => {});
  return (await page.locator(SEL.rail).first().isVisible().catch(() => false)) ? "" : "the tabs went down with the session";
}
async function runCell(cell, { plant = null } = {}) {
  const id = `${cell.viewport.w}×${cell.viewport.h} ${cell.locale} ${cell.reader} bars:${cell.bars} book:${cell.book}`;
  const mine = cell.reader === "player" || cell.bars === "all" ? await demoSession(browser, BASE) : null;
  const ctx = await context(cell.viewport, cell.locale, mine ? [mine] : []);
  const page = await ctx.newPage();
  let marker = null, note = "", m = null, cardOne = null;
  try {
    marker = await openHome(page);
    note = await raiseBars(page, cell, mine);
    cardOne = await cardOneIs(page);
    m = await settleProbe(page);
  } catch (e) { note = String(e?.message ?? e).split("\n")[0].slice(0, 160); }
  let j = judge(cell, m);
  const wantId = cell.book === "full" ? FULL_ID : SHORT_ID;
  if (cardOne !== wantId) j = { ...j, verdict: "INVALID", invalid: [...j.invalid, `card 1 is ${cardOne}, not the ${cell.book} book's ${wantId}`] };
  let planted = null;
  if (plant) {
    if (plant.script) await page.evaluate(R1_PLANT, SEL).catch(() => {});
    else await page.addStyleTag({ content: plant.css });
    const pm = await settleProbe(page);
    planted = judge(cell, pm);
  }
  await ctx.close();
  return { id, cell, marker, note, j, planted };
}
const fmt = (r) => `${r.j.verdict.padEnd(8)} ${r.id} · rail ${r.j.figures.railTop} · How-to slack ${r.j.figures.slackHowto} · picks slack ${r.j.figures.slackPicks} (${r.j.figures.picksKind}) · h1 ${r.j.figures.titleLines} lines · marker ${r.marker}`
  + (r.j.invalid.length ? ` · INVALID: ${r.j.invalid.join("; ")}` : "") + (r.j.problems.length ? ` · ${r.j.problems.join("; ")}` : "") + (r.note ? ` · note: ${r.note}` : "");

async function publishAnnouncement() {
  const page = await admin.newPage();
  await page.goto(`${BASE}/admin/system`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  const box = page.getByPlaceholder(/New markets are live/);
  await box.waitFor({ timeout: 120_000 });
  await box.fill(ANNOUNCE);
  const sw = page.getByRole("switch", { name: "Publish banner" });
  if ((await sw.first().getAttribute("aria-checked").catch(() => null)) !== "true") await sw.first().click();
  await page.getByRole("button", { name: "Publish banner" }).first().click();
  await page.waitForTimeout(2500);
  await page.close();
}

// ── the red control (always first) ─────────────────────────────────────────────────────────────────────────────────
say("\n§R · the red control: each plant's cell clean, then planted (page-only)");
await makeCardOne(FULL_ID, SHORT_ID);
let announced = false;
for (const plant of RED_PLANTS) {
  if (plant.cell.bars === "all" && !announced) { await publishAnnouncement(); announced = true; }
  const cell = { viewport: AF_VIEWPORTS[plant.cell.vp], locale: plant.cell.locale, reader: plant.cell.reader, bars: plant.cell.bars, book: plant.cell.book };
  const r = await runCell(cell, { plant });
  const clean = r.j.verdict === "PASS";
  const caught = clean && r.planted && plantCaught(plant, r.planted);
  plantResults.push({ plant: plant.name, clean, caught });
  if (!caught) failures++;
  say(`  ${caught ? "CAUGHT " : "MISSED "} ${plant.name} — clean ${r.j.verdict}${r.j.verdict !== "PASS" ? ` (${[...r.j.invalid, ...r.j.problems].join("; ")})` : ""} · planted ${r.planted?.verdict ?? "—"}: ${[...(r.planted?.invalid ?? []), ...(r.planted?.problems ?? [])].join("; ") || "nothing reported"}`);
}
if (announced) {
  // The red control raised the announcement for its all-bars plant: the matrix's no-bar cells need it down again.
  const page = await admin.newPage();
  await page.goto(`${BASE}/admin/system`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  const sw = page.getByRole("switch", { name: "Publish banner" });
  await sw.first().waitFor({ timeout: 120_000 });
  if ((await sw.first().getAttribute("aria-checked").catch(() => null)) === "true") await sw.first().click();
  await page.getByRole("button", { name: /^(Save|Publish banner)$/ }).first().click();
  await page.waitForTimeout(2500);
  await page.close();
  announced = false;
}

// ── the matrix ─────────────────────────────────────────────────────────────────────────────────────────────────────
if (!ONLY_RED) {
  for (const bars of ["none", "all"]) {
    if (bars === "all") { await publishAnnouncement(); announced = true; }
    for (const book of AF_BOOKS) {
      await (book === "full" ? makeCardOne(FULL_ID, SHORT_ID) : makeCardOne(SHORT_ID, FULL_ID));
      say(`\n§M · bars ${bars} · card 1's book: ${book}`);
      // Players first: a guest's all-bars cell ends the demo account's session on purpose.
      for (const reader of bars === "all" ? ["player", "guest"] : AF_READERS) for (const viewport of AF_VIEWPORTS) for (const locale of AF_LOCALES) {
        const r = await runCell({ viewport, locale, reader, bars, book });
        results.push(r);
        const gatedFail = r.j.verdict !== "PASS";
        if (gatedFail) failures++;
        say(`  ${fmt(r)}`);
      }
    }
  }
}
await browser.close();

// ── the record ─────────────────────────────────────────────────────────────────────────────────────────────────────
say("\n§T · the cells table (A5 (b)) — card 1's picks GATED or RECORDED; R1, R2 and R4 gated everywhere");
for (const row of CELLS_TABLE) say(`  ${row.viewport.padEnd(8)} bars ${row.bars.padEnd(5)} → card 1's picks ${row.picks}`);
if (results.length) {
  const least = (kind) => {
    const xs = results.filter((r) => r.j.figures.picksKind === kind && r.j.figures.slackPicks !== null);
    if (!xs.length) return "none";
    const worst = xs.reduce((a, b) => (a.j.figures.slackPicks <= b.j.figures.slackPicks ? a : b));
    return `${worst.j.figures.slackPicks}px (${worst.id})`;
  };
  const howto = results.filter((r) => r.j.figures.slackHowto !== null).reduce((a, b) => (a.j.figures.slackHowto <= b.j.figures.slackHowto ? a : b), results[0]);
  say(`\n  least slack, card 1's picks, GATED: ${least("GATED")}`);
  say(`  least slack, card 1's picks, RECORDED: ${least("RECORDED")} (recorded, never gated)`);
  say(`  least slack, the How-to card: ${howto?.j.figures.slackHowto}px (${howto?.id})`);
  const counts = results.reduce((acc, r) => ((acc[r.j.verdict] = (acc[r.j.verdict] ?? 0) + 1), acc), {});
  say(`  cells: ${results.length} · ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
}
say(`  plants: ${plantResults.filter((p) => p.caught).length}/${plantResults.length} caught`);
say(failures ? `\n❌ ${failures} failure(s)` : "\n✅ every gated cell PASS and every plant caught");
void expectedBars;
process.exit(failures ? 1 : 0);
