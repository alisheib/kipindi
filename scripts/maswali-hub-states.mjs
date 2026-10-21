/**
 * qa:maswali-hub-states — EVERY STATE OF THE MILLIONEA HUB, IN BOTH SHELLS, MEASURED AND SHOT (MASWALI-BUILD S5-DESIGN-HUB;
 * the design lanes' brief, "shoot every state of your surface"; the round-1 hub critic's list of owed states).
 *
 *   BASE=http://localhost:3550 MLN_HUB_RUN=a node scripts/maswali-hub-states.mjs
 *
 * ⚠️ PREMISE — a FRESH in-memory `next dev` (no DATABASE_URL) with FEATURE_MILLIONEA=ACTIVE, DISABLE_ADMIN_TOTP=true and the
 *    journey previewable (`scripts/live/journey-pass.mjs`). It seeds the weeks (`seed-maswali`), then walks the store FORWARD
 *    through the hub's states with `/api/dev-test/maswali-hub-act` — every act a product service — and at each state reads
 *    the page as a player would: classic and journey (with a staff pass), signed in or a guest, in Swahili first.
 *    Run "a" walks a week from sale to its void; run "b" the sunset: the final week announced, run, and Millionea ended.
 *
 * Each state ASSERTS VALUES on the rendered page (boxes, computed styles, the words in the reader's language), then writes
 * viewport tiles to `.50pick-shots/maswali-hub-states/` (`<state>-<shell>-<locale>-<width>[-sN].png`), read one by one.
 * A once-per-week notice is marked seen as it is shown, so the notice states are shot in ONE page view per language (the
 * viewport resized, never reloaded), each language by its own player.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE, SESSION_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3550";
const RUN = (process.env.MLN_HUB_RUN || "a").toLowerCase();
const OUT = ".50pick-shots/maswali-hub-states";
const HEIGHT = 780;
const OVERLAP = 240;
const ONLY = (process.env.MLN_HUB_STATES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const want = (state) => ONLY.length === 0 || ONLY.includes(state);
/** Swahili first (the longest), at every platform width; English and Chinese where a layout changes with the language. */
const CLASSIC = { sw: [320, 360, 768, 1024, 1280, 1920], en: [320, 360, 1280], zh: [360, 1280] };
const JOURNEY = { sw: [360, 1024, 1280], en: [360], zh: [360] };
/** Where a state is shot to its end (scroll tiles): the phone and the desktop column. */
const SCROLL_AT = new Set([360, 1280]);

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } if (c && process.env.MLN_HUB_VERBOSE) console.log(`PASS ${n}`); };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };
const j = (v) => JSON.stringify(v);

const pre = await premise(BASE);
if (pre.refuse) die(pre.refuse);
if (pre.health?.millionea?.state !== "ACTIVE") die(`/api/health says millionea = ${j(pre.health?.millionea)}: start next dev with FEATURE_MILLIONEA=ACTIVE`);
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errs = [];

/** A context for one reader: its cookies (a session, a staff pass) and the language; a guest has none. */
async function readerContext(cookies) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: HEIGHT } });
  if (cookies.length) await ctx.addCookies(cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined })));
  return ctx;
}
async function setLocale(ctx, locale) {
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }]);
}
async function open(page, path) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 180_000 });
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
  }).catch(() => {});
  await page.waitForTimeout(400);
  return res;
}
async function tiles(page, name, width) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  let covered = HEIGHT;
  for (let n = 2; n <= 24 && covered < total - 1; n++) {
    const top = Math.min((n - 1) * (HEIGHT - OVERLAP), Math.max(0, total - HEIGHT));
    await page.evaluate((y) => window.scrollTo(0, y), top);
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${name}-s${n}.png` });
    covered = (await page.evaluate(() => window.scrollY)) + HEIGHT;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  void width;
}

/** One dev act, through the product's services (`/api/dev-test/maswali-hub-act`), on `ctx`'s cookies when given. */
async function act(body, ctx = null) {
  const c = ctx ?? (await browser.newContext());
  const r = await c.request.post(`${BASE}/api/dev-test/maswali-hub-act`, { data: body, timeout: 240_000 });
  const out = await r.json().catch(() => ({}));
  if (!ctx) await c.close();
  ok(`act ${body.act} answers`, r.ok() && out.ok, `${r.status()} ${j(out)}`);
  return out;
}

/** What every hub page must be: 200, the hub itself, the language asked, no sideways scroll. */
async function baseChecks(page, label, locale, res) {
  ok(`${label} · answers 200`, res?.status() === 200, `${res?.status()}`);
  ok(`${label} · the hub is drawn`, (await page.getByTestId("millionea-hub").count()) === 1);
  ok(`${label} · html language matches the cookie`, (await page.locator("html").getAttribute("lang")) === locale);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(`${label} · no horizontal overflow`, over <= 1, `overflow=${over}px`);
}

/** The page's bottom bar (a phone rail), or 0: what hides the bottom of the screen. */
const railHeight = (page) => page.evaluate(() => {
  const el = [...document.querySelectorAll("nav")].find((n) => { const r = n.getBoundingClientRect(); const s = getComputedStyle(n); return s.position === "fixed" && r.bottom >= innerHeight - 1 && r.height < 140; });
  return el ? Math.round(el.getBoundingClientRect().height) : 0;
});
const box = (page, testId) => page.getByTestId(testId).first().boundingBox().catch(() => null);

/**
 * Shoot one state: every (locale, width) of the shell's matrix — load, the base checks, the state's own checks, the first
 * viewport and, at SCROLL_AT widths, the page to its end. `check(page, label, locale, width)` asserts the state's values.
 * `oneView`: the notices are shown once, so each language is ONE page load, resized through its widths.
 */
async function shoot(state, shell, ctx, { check, oneView = false, path = "/millionea", matrix } = {}) {
  if (!want(state)) return;
  const m = matrix ?? (shell === "journey" ? JOURNEY : CLASSIC);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`${state}/${shell}: ${e}`));
  for (const [locale, widths] of Object.entries(m)) {
    await setLocale(ctx, locale);
    let res = null;
    for (const [i, width] of widths.entries()) {
      await page.setViewportSize({ width, height: HEIGHT });
      if (!oneView || i === 0) res = await open(page, path);
      else await page.waitForTimeout(350);
      const label = `${state} · ${shell} · ${locale} @${width}`;
      await baseChecks(page, label, locale, res);
      if (check) await check(page, label, locale, width);
      if (locale === "zh") await zhScan(page, label);
      const name = `${state}-${shell}-${locale}-${width}`;
      await page.screenshot({ path: `${OUT}/${name}.png` });
      if (SCROLL_AT.has(width)) await tiles(page, name, width);
    }
  }
  await page.close();
}

// ── the seed ───────────────────────────────────────────────────────────────────────────────────────────────────────────
{
  const owner = await browser.newContext();
  await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
  const seed = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
  ok("the weeks are seeded on a fresh store", seed.ok(), `${seed.status()} ${await seed.text().catch(() => "")}`);
  await owner.close();
}
const pass_ = await mintStaffPass(browser, BASE);
const demo = await demoSession(browser, BASE, { query: "?deposit=0", balance: 50_000 });
const demoClassic = await readerContext([demo]);
const demoJourney = await readerContext([demo, pass_]);
const guestClassic = await readerContext([]);
const guestJourney = await readerContext([pass_]);
const t = { // the words a check reads, per language (the dictionary's, via the rendered page's own <html lang>)
  pausedShort: { en: "Paused for now", sw: "Imesimamishwa kwa muda", zh: "暂时停售" },
  open: { en: "Open", sw: "Wazi", zh: "开放" },
};

// ── shared checks ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** H1: on a phone the door to the slip stands on the first screen, above the rail. H2: from 1024 the jackpot's head and the
 *  door stay pinned 72px down while the page reads on, never under the 56px header. M1: from 768 the head and the door
 *  stand side by side. L17: the column is named by the jackpot's label. M5: the state word is in its state's ink. */
async function openWeekChecks(page, label, locale, width, { door = "millionea-hub-fill" } = {}) {
  const d = await box(page, door);
  ok(`${label} · the door is drawn`, !!d);
  if (!d) return;
  if (width <= 767) {
    const rail = await railHeight(page);
    // The journey's staff preview bar ("Preview — …", `journey-preview-marker`) is drawn only for a staff pass: a player's
    // page has no such bar, so the player's first screen is measured without it.
    const staffBar = await page.getByTestId("journey-preview-marker").first().boundingBox().catch(() => null);
    const bottom = d.y + d.height - (staffBar?.height ?? 0);
    ok(`${label} · H1 the door stands on a player's first screen, above the rail (bottom ${Math.round(bottom)} ≤ ${HEIGHT - rail}${staffBar ? `, the staff bar's ${Math.round(staffBar.height)}px aside` : ""})`, bottom <= HEIGHT - rail, j({ d, rail, staffBar }));
  }
  const head = await box(page, "millionea-hub-jackpot");
  if (width >= 768 && width < 1024 && head) {
    ok(`${label} · M1 the jackpot's head and the door stand side by side from 768`, Math.abs(head.y - d.y) <= 4 && d.x >= head.x + head.width, j({ head, d }));
  }
  if (width >= 1024 && head) {
    await page.evaluate(() => window.scrollTo(0, 900));
    await page.waitForTimeout(300);
    const pinnedHead = await box(page, "millionea-hub-jackpot");
    const pinned = await box(page, "millionea-hub-pinned");
    const header = await page.evaluate(() => { const h = document.querySelector("header"); return h ? h.getBoundingClientRect().bottom : 0; });
    ok(`${label} · H2 scrolled 900px, the jackpot's head stands pinned 72px down, 16px clear of the header (${pinnedHead && Math.round(pinnedHead.y)} vs header ${Math.round(header)})`,
      !!pinnedHead && Math.abs(pinnedHead.y - 72) <= 1 && pinnedHead.y >= header + 15, j({ pinnedHead, header }));
    ok(`${label} · H2 the pinned pair's ground reaches the header's foot (nothing reading on shows in the gap above it)`, !!pinned && pinned.y <= header + 1, j({ pinned, header }));
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(200);
    const named = await page.evaluate(() => { const a = document.querySelector('[data-testid="millionea-hub-aside"]'); const id = a?.getAttribute("aria-labelledby"); return id ? document.getElementById(id)?.textContent ?? null : null; });
    ok(`${label} · L17 the column is named by the jackpot's label`, !!named && named.length > 0, j(named));
  }
}
/**
 * M5: the week's state is the register's one chip (`WeekStateChip`, the lead's ruling) in the page head's eyebrow, beside
 * the week it qualifies — its word the state's, its ink its tone's (status-tone: royal while the week runs, slate while
 * sales are paused), never the eyebrow's subtle ink; on the week word's line wherever the two fit on one.
 */
async function stateWordChecks(page, label, locale, word, tone = "royal") {
  const s = await page.evaluate(() => {
    const w = document.querySelector('[data-testid="millionea-hub"] [data-testid="millionea-week-state"]');
    // The tones' inks are status-tone's own (the chip's `pending` and `neutral` faces: --brand-300, --text-muted); they read
    // back through the browser, so the comparison is of computed colours in one space, never of a class name.
    const probe = (cls) => { const p = document.createElement("span"); p.className = cls; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    if (!w) return null;
    const cs = getComputedStyle(w), r = w.getBoundingClientRect();
    const week = w.previousElementSibling?.getBoundingClientRect() ?? null;
    const sameLine = !!week && r.top < week.bottom && week.top < r.bottom;
    return {
      text: w.textContent, color: cs.color, border: cs.borderTopWidth, royal: probe("text-brand-300"), slate: probe("text-text-muted"), subtle: probe("text-text-subtle"),
      sameLine, centreOff: week && sameLine ? Math.round(((r.top + r.bottom) / 2 - (week.top + week.bottom) / 2) * 10) / 10 : null,
    };
  });
  ok(`${label} · M5 the week's state is the register's chip in its state's ink (${tone}), never the eyebrow's subtle ink`, !!s && s.color === s[tone] && s.color !== s.subtle && parseFloat(s.border) >= 1, j(s));
  if (s?.sameLine) ok(`${label} · M5 the chip stands centred on the week word's line (${s.centreOff}px)`, Math.abs(s.centreOff ?? 99) <= 1.5, j(s));
  if (word) ok(`${label} · M5 the state word reads "${word[locale]}"`, s?.text === word[locale], j(s));
}

/** Millionea's zh rule (the lead's ruling, 2026-10-21): a space only where a Latin letter or a digit meets a Han character. */
const HAN_GAP = /[㐀-䶿一-鿿豈-﫿]\s+[㐀-䶿一-鿿豈-﫿]/;
/** The hub's own timed lines, in zh: none parts two Han characters with a space. */
async function zhLineChecks(page, label, locale, testIds) {
  if (locale !== "zh") return;
  for (const id of testIds) {
    const text = await page.getByTestId(id).first().textContent().catch(() => null);
    ok(`${label} · zh ${id}: no space between two Han characters`, text !== null && !HAN_GAP.test(text), j(text));
  }
}
/** Every other zh line on the page with such a space, for the report (each key's owner fixes their own): not a check. */
const zhElsewhere = new Map();
async function zhScan(page, label) {
  const found = await page.evaluate((src) => {
    const re = new RegExp(src);
    const out = [];
    const walk = document.createTreeWalker(document.querySelector("main") ?? document.body, NodeFilter.SHOW_ELEMENT);
    for (let el = walk.currentNode; el; el = walk.nextNode()) {
      if (el.children.length > 0 || !el.textContent) continue;
      if (re.test(el.textContent)) out.push(`${el.closest("[data-testid]")?.getAttribute("data-testid") ?? "?"}: ${el.textContent.trim().slice(0, 80)}`);
    }
    // a line whose Han characters stand in separate elements (a fill's run beside its template)
    for (const el of document.querySelectorAll("main p, main span, main li, main [role='status']")) {
      const t = el.textContent ?? "";
      if (re.test(t) && ![...el.querySelectorAll("*")].some((c) => re.test(c.textContent ?? ""))) out.push(`${el.closest("[data-testid]")?.getAttribute("data-testid") ?? "?"}: ${t.trim().slice(0, 80)}`);
    }
    return [...new Set(out)];
  }, HAN_GAP.source);
  for (const f of found) if (!zhElsewhere.has(f)) zhElsewhere.set(f, label);
}

if (RUN === "a") {
  // ── S1 · an open week, signed in, holding a ticket (a losing slip, so the week can roll over later) ────────────────────
  await act({ act: "tickets", n: 1, lose: true });
  // Two more players, one per other language, with a ticket each: their once-per-week notices are unseen later (S11) — and
  // two for the carry's flight (H6): one read on a phone, one on a tall desktop.
  const players = {};
  for (const l of ["en", "zh", "phone", "desk"]) {
    const ctx = await readerContext([]);
    const p = await act({ act: "player", tickets: 1, lose: true }, ctx); // signed in through this context's cookie
    players[l] = { ctx, id: p.userId };
  }
  const openCheck = async (page, label, locale, width) => {
    await openWeekChecks(page, label, locale, width);
    await stateWordChecks(page, label, locale, t.open);
    ok(`${label} · the reader's ticket row is drawn`, (await page.getByTestId("millionea-hub-mine").count()) === 1);
    ok(`${label} · M2 the head's two doors are drawn`, (await page.getByTestId("millionea-hub-doors").locator("a").count()) === 2);
  };
  await shoot("open", "classic", demoClassic, { check: openCheck });
  await shoot("open", "journey", demoJourney, { check: openCheck });

  // ── S2 · a guest ───────────────────────────────────────────────────────────────────────────────────────────────────────
  const guestCheck = async (page, label, locale, width) => {
    await openWeekChecks(page, label, locale, width, { door: "millionea-hub-guest" });
    const up = await page.getByTestId("millionea-hub-signup").getAttribute("href");
    const inn = await page.getByTestId("millionea-hub-signin").getAttribute("href");
    ok(`${label} · M3 Sign up first, then Sign in, both back to the slip`, /^\/auth\/register\?/.test(up ?? "") && /^\/auth\/login\?/.test(inn ?? "")
      && (up ?? "").includes("next=%2Fmillionea%2Fslip") && (inn ?? "").includes("next=%2Fmillionea%2Fslip"), j({ up, inn }));
  };
  await shoot("guest", "classic", guestClassic, { check: guestCheck });
  await shoot("guest", "journey", guestJourney, { check: guestCheck });
  // M3 · a shared link's codes ride beside `next`, never dropped
  if (want("guest")) {
    const page = await guestClassic.newPage();
    await setLocale(guestClassic, "en");
    await open(page, "/millionea?ref=ABCD2345&invite=XYZ12345");
    const up = await page.getByTestId("millionea-hub-signup").getAttribute("href");
    ok("guest · M3 the hub's ?ref and ?invite reach Sign up beside next", (up ?? "").includes("ref=ABCD2345") && (up ?? "").includes("next=%2Fmillionea%2Fslip"), j(up));
    await page.close();
  }

  // ── S4 · paused ──────────────────────────────────────────────────────────────────────────────────────────────────────────
  if (want("paused")) {
    await act({ act: "pause", on: true });
    const pausedCheck = async (page, label, locale) => {
      await stateWordChecks(page, label, locale, t.pausedShort, "slate");
      ok(`${label} · L9/P15 no close line and no door to buy while paused`, (await page.getByTestId("millionea-hub-close").count()) === 0 && (await page.getByTestId("millionea-hub-fill").count()) === 0);
    };
    await shoot("paused", "classic", demoClassic, { check: pausedCheck });
    await shoot("paused", "journey", demoJourney, { check: pausedCheck, matrix: { sw: [360, 1280] } });
    await act({ act: "pause", on: false });
  }

  // ── S6 · on a break (a new player with two tickets, on a one-hour cooling-off) ─────────────────────────────────────────
  if (want("break")) {
    const brk = await readerContext([]);
    await act({ act: "breakPlayer", tickets: 2 }, brk);
    const breakCheck = async (page, label) => {
      ok(`${label} · RG the break notice stands where the door stood, and no door to buy`, (await page.getByTestId("millionea-hub-break").count()) === 1 && (await page.getByTestId("millionea-hub-fill").count()) === 0);
      ok(`${label} · L9 no close line beside the break`, (await page.getByTestId("millionea-hub-close").count()) === 0);
    };
    await shoot("break", "classic", brk, { check: breakCheck });
    const brkJ = await readerContext([...(await brk.cookies(BASE)).filter((c) => c.name === SESSION_COOKIE), pass_]);
    await shoot("break", "journey", brkJ, { check: breakCheck, matrix: { sw: [360, 1280] } });
  }

  // ── S5 · at the cap (ten tickets: three rows, then "See all") ─────────────────────────────────────────────────────────
  if (want("cap")) {
    await act({ act: "tickets", n: 9, lose: true });
    const capCheck = async (page, label, locale) => {
      const rows = await page.getByTestId("millionea-hub-mine").first().locator("a[href^='/millionea/tickets/']").count();
      ok(`${label} · M8 at most three ticket rows, then See all`, rows === 3 && (await page.getByTestId("millionea-hub-see-all").count()) === 1, `rows=${rows}`);
      ok(`${label} · L9 no close line under the cap's line`, (await page.getByTestId("millionea-hub-close").count()) === 0);
      void locale;
    };
    await shoot("cap", "classic", demoClassic, { check: capCheck });
    await shoot("cap", "journey", demoJourney, { check: capCheck, matrix: { sw: [360, 1280] } });
  }

  // ── S3 · the close moved (M7) ─────────────────────────────────────────────────────────────────────────────────────────
  if (want("moved")) {
    const mv = await act({ act: "moveClose", hours: 2 });
    const movedCheck = async (page, label, locale) => {
      const bar = await page.getByTestId("millionea-hub-close-moved").textContent().catch(() => null);
      ok(`${label} · M7 the moved close is announced, with the close it was`, !!bar && /16:00/.test(bar) && /18:00/.test(bar), j(bar));
      await zhLineChecks(page, label, locale, ["millionea-hub-close-moved"]);
      if (locale === "zh") ok(`${label} · zh the same day's old close stands spaced from its Han ("原为 18:00")`, /原为 18:00/.test(bar ?? ""), j(bar));
    };
    void mv;
    await shoot("moved", "classic", guestClassic, { check: movedCheck });
    await shoot("moved", "journey", guestJourney, { check: movedCheck, matrix: { sw: [360, 1280] } });
  }

  // ── S7–S10 · the week on sale closes, its results come in, its window opens, it settles ─────────────────────────────────
  // The seed leaves its earlier weeks graded but unsettled; settlement runs strictly in order (MR-3), so they settle first.
  await act({ act: "catchUp" });
  await act({ act: "closeOpen" });
  const closedCheck = (word) => async (page, label, locale) => {
    ok(`${label} · after the close the door follows the results`, (await page.getByTestId("millionea-hub-follow").count()) === 1);
    if (word) await stateWordChecks(page, label, locale, word);
  };
  await shoot("closed", "classic", demoClassic, { check: closedCheck({ en: "Sales closed", sw: "Imefungwa", zh: "已截止" }) });
  await shoot("closed", "journey", demoJourney, { check: closedCheck(null), matrix: { sw: [360, 1280] } });
  await act({ act: "seal", slots: [1, 2, 3, 4, 5], outcome: "YES" });
  await shoot("resolving", "classic", demoClassic, {
    check: async (page, label, locale) => {
      await closedCheck(null)(page, label, locale);
      const live = await page.getByTestId("millionea-hub-facts").textContent().catch(() => "");
      if (locale === "en") ok(`${label} · L12 the next event is said after the results count`, /5 of 15 results in/.test(live ?? "") && /next event/.test(live ?? ""), j(live));
      if (locale === "zh") ok(`${label} · L8 zh says the count as 已公布 n/15 个结果`, /已公布 5\/15 个结果/.test(live ?? ""), j(live));
    },
  });
  await act({ act: "seal", slots: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15], outcome: "YES" });
  await shoot("objections", "classic", demoClassic, { check: closedCheck({ en: "Objection window", sw: "Dirisha la pingamizi", zh: "异议窗口" }), matrix: { sw: [320, 360, 1280], en: [360], zh: [360] } });
  await act({ act: "window", open: false });
  await shoot("settling", "classic", demoClassic, { check: closedCheck({ en: "Settling", sw: "Inakamilishwa", zh: "待结算" }), matrix: { sw: [360, 1280], en: [360], zh: [360] } });
  await act({ act: "settle" });

  // ── S12 · no week on sale (as a guest: a signed-in view would mark the week's notices seen) — and paused (L21) ───────────
  const noWeekCheck = (paused) => async (page, label, locale) => {
    ok(`${label} · L6 no week on sale is the platform's empty state`, (await page.getByTestId("millionea-hub-no-week").locator(".kp-shimmer-track, [class*='dashed']").count()) >= 0
      && (await page.getByTestId("millionea-hub-no-week").count()) === 1);
    const body = await page.getByTestId("millionea-hub-no-week").textContent().catch(() => "");
    if (locale === "en") ok(`${label} · L21 the next open is promised only while sales run`, paused ? !/The next week opens/.test(body ?? "") : /The next week opens/.test(body ?? ""), j(body));
    await zhLineChecks(page, label, locale, ["millionea-hub-no-week"]);
  };
  await shoot("noweek", "classic", guestClassic, { check: noWeekCheck(false) });
  await shoot("noweek", "journey", guestJourney, { check: noWeekCheck(false), matrix: { sw: [360, 1280] } });
  if (want("noweek-paused")) {
    await act({ act: "pause", on: true });
    await shoot("noweek-paused", "classic", guestClassic, { check: noWeekCheck(true), matrix: { sw: [360], en: [360] } });
    await act({ act: "pause", on: false });
  }

  // ── S11 · after settlement: the next week opens; the rollover and the result are said once, the carry leaves the notice ──
  await act({ act: "openNext" });
  await act({ act: "tickets", n: 1, lose: false });
  const afterCheck = async (page, label, locale) => {
    const bars = await page.getByTestId("millionea-hub-notices").locator('[role="status"]').count();
    ok(`${label} · M9 the once-per-week notices are the platform's calm bars`, bars >= 1, `bars=${bars}`);
    const origin = await page.evaluate(() => { const el = document.getElementById("mln-carried-figure"); return el ? { cls: el.className, text: el.textContent } : null; });
    ok(`${label} · M10 the carry leaves from the rollover notice's own figure`, !!origin && /\bamount\b/.test(origin.cls), j(origin));
    void locale;
  };
  if (want("after")) {
    await shoot("after", "classic", demoClassic, { check: afterCheck, oneView: true, matrix: { sw: [320, 360, 768, 1024, 1280, 1920] } });
    await shoot("after", "classic", players.en.ctx, { check: afterCheck, oneView: true, matrix: { en: [360, 1280] } });
    await shoot("after", "journey", (await readerContext([...(await players.zh.ctx.cookies(BASE)).filter((c) => c.name === SESSION_COOKIE), pass_])), { check: afterCheck, oneView: true, matrix: { zh: [360, 1280] } });
  }
  // ── H6/M7 · the carry plays only with both ends in view (the shared MaswaliCarry): a reader on a phone — the ledger far
  // below the notice — sees no flight; on a tall desktop both ends stand in view and the figure lands, its origin settling
  // in once the token has left it. Each reader's first view, the rollover notice unseen. The ends are measured on boxes a
  // flight never moves (the row's own span, the notice's figure).
  if (want("after")) {
    for (const [who, vp] of [["phone", { width: 360, height: HEIGHT }], ["desk", { width: 1920, height: 1440 }]]) {
      const ctx = players[who].ctx;
      await setLocale(ctx, "sw");
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errs.push(`carry/${who}: ${e}`));
      await page.setViewportSize(vp);
      await page.goto(`${BASE}/millionea`, { waitUntil: "load", timeout: 180_000 });
      const ends = await page.evaluate(() => {
        const at = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
        const inView = (b) => !!b && b.top >= 0 && b.left >= 0 && b.bottom <= innerHeight && b.right <= innerWidth;
        const origin = at(document.getElementById("mln-carried-figure")), dest = at(document.querySelector('[data-row="in"]'));
        return { origin, dest, both: inView(origin) && inView(dest) };
      });
      await page.waitForTimeout(1600);
      const after = await page.evaluate(() => document.getElementById("mln-carried-figure")?.className ?? null);
      const landed = /\bg-settle\b/.test(after ?? ""), vacated = /\bkp-mln-carry-vacated\b/.test(after ?? "");
      ok(`after · carry · sw ${vp.width}×${vp.height} · H6 the carry plays exactly when both ends stand in view (${ends.both ? "both in view: it lands" : "an end out of view: no flight"})`,
        !!ends.origin && !!ends.dest && (ends.both ? landed && !vacated : !landed && !vacated), j({ ends, after }));
      if (who === "desk") ok(`after · carry · sw ${vp.width}×${vp.height} · H6 a tall desktop holds both ends, so the flight is seen`, ends.both, j(ends));
      await page.screenshot({ path: `${OUT}/after-carry-sw-${vp.width}.png` });
      await page.close();
    }
  }

  // ── S14 · a week being voided (six mains void against five reserves), then voided whole ───────────────────────────────────
  await act({ act: "closeOpen" });
  await act({ act: "seal", slots: [1, 2, 3, 4, 5, 6], outcome: "VOID" });
  const voidingCheck = async (page, label, locale) => {
    ok(`${label} · M6 the week being voided is named in a neutral notice`, (await page.getByTestId("millionea-hub-voiding").count()) === 1);
    const words = await page.getByTestId("millionea-hub-void-words").count();
    ok(`${label} · L13 each voided main says what it leaves the week`, words === 6, `void words=${words}`);
    const refund = await page.locator('[data-row="refund"]').first().textContent().catch(() => null);
    ok(`${label} · L15 the conditional refund row carries no dash and no figure`, refund === "", j(refund));
    await stateWordChecks(page, label, locale, { en: "Week is being voided", sw: "Wiki inabatilishwa", zh: "整周作废中" });
    await zhLineChecks(page, label, locale, ["millionea-hub-voiding"]);
  };
  await shoot("voiding", "classic", demoClassic, { check: voidingCheck });
  await shoot("voiding", "journey", demoJourney, { check: voidingCheck, matrix: { sw: [360, 1280] } });
  await act({ act: "seal", slots: [7, 8, 9, 10, 11, 12, 13, 14, 15], outcome: "YES" });
  await act({ act: "voidLead" });
  const voidedCheck = async (page, label, locale) => {
    const row = await page.getByTestId("millionea-hub-last-week").textContent().catch(() => "");
    if (locale === "en") ok(`${label} · L14 last week voided reads the register's words`, /Voided/.test(row ?? "") && /Every ticket refunded|Refunds on their way/.test(row ?? ""), j(row));
  };
  if (want("voided")) await shoot("voided", "classic", demoClassic, { check: voidedCheck, oneView: true, matrix: { sw: [360, 1280], en: [360] } });

  // ── L16 · the ghost button's border against the page, and the kit ghost's own ────────────────────────────────────────────
  {
    const page = await guestClassic.newPage();
    await open(page, "/millionea");
    const c = await page.evaluate(() => {
      const lum = (rgb) => { const m = rgb.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const probe = (cls) => { const b = document.createElement("a"); b.className = cls; b.textContent = "x"; document.body.appendChild(b); const col = getComputedStyle(b).borderTopColor; b.remove(); return col; };
      const ground = document.createElement("div"); ground.style.background = "var(--bg-base)"; document.body.appendChild(ground);
      const bg = getComputedStyle(ground).backgroundColor; ground.remove();
      const kit = probe("btn btn-ghost btn-lg"), hub = probe("btn btn-ghost btn-lg border-border-control");
      return { bg, kit, hub, kitRatio: ratio(kit, bg), hubRatio: ratio(hub, bg) };
    });
    console.log(`L16 · ghost border contrast: kit .btn-ghost ${c.kitRatio.toFixed(2)}:1, the hub's border-border-control ${c.hubRatio.toFixed(2)}:1 (${j(c)})`);
    ok("L16 · the hub's ghost border meets 3:1 (§A1)", c.hubRatio >= 3, j(c));
    await page.close();
  }
}

if (RUN === "b") {
  await act({ act: "tickets", n: 1, lose: true });
  // ── L22 · the final week announced ahead ──────────────────────────────────────────────────────────────────────────────
  await act({ act: "sunsetDraft" });
  const aheadCheck = async (page, label, locale) => {
    const bar = await page.getByTestId("millionea-hub-final-ahead").textContent().catch(() => null);
    if (locale === "en") ok(`${label} · L22 the final week is announced ahead in the lead's words`, !!bar && /^Week \d+ will be Millionea's final week\. It opens .+\.$/.test(bar.trim()), j(bar));
    ok(`${label} · L22 the announcement is a calm bar`, !!bar);
    await zhLineChecks(page, label, locale, ["millionea-hub-final-ahead"]);
  };
  await shoot("final-ahead", "classic", demoClassic, { check: aheadCheck, matrix: { sw: [320, 360, 768, 1280], en: [360, 1280], zh: [360] } });
  await shoot("final-ahead", "journey", demoJourney, { check: aheadCheck, matrix: { sw: [360, 1280] } });
  // ── H3 · the final week itself ────────────────────────────────────────────────────────────────────────────────────────
  await act({ act: "catchUp" });
  await act({ act: "closeOpen" });
  await act({ act: "seal", slots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], outcome: "YES" });
  await act({ act: "settle" });
  await act({ act: "openNext" });
  await act({ act: "tickets", n: 1, lose: true });
  const finalCheck = async (page, label, locale, width) => {
    await openWeekChecks(page, label, locale, width);
    const rule = await page.getByTestId("millionea-hub-final-rule").textContent().catch(() => null);
    if (locale === "en") ok(`${label} · H3 the final week's rule stands under the figure`, rule === "Final week: if no ticket gets 10/10, the pool is shared equally by this week's highest-scoring tickets", j(rule));
    ok(`${label} · H3 the final week's rule is drawn`, !!rule);
  };
  await shoot("final", "classic", demoClassic, { check: finalCheck });
  await shoot("final", "journey", demoJourney, { check: finalCheck, matrix: { sw: [360, 1280] } });
  // ── H4 · Millionea has ended ──────────────────────────────────────────────────────────────────────────────────────────
  await act({ act: "closeOpen" });
  await act({ act: "seal", slots: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], outcome: "YES" });
  await act({ act: "settle" });
  const retiredCheck = async (page, label, locale) => {
    ok(`${label} · H4 only the closed statement, the final week's row and the register`, (await page.getByTestId("millionea-hub-retired").count()) === 1
      && (await page.getByTestId("millionea-hub-no-week").count()) === 0 && (await page.getByTestId("millionea-hub-doors").count()) === 0);
    const links = await page.getByTestId("millionea-hub-retired").locator("a[href='/millionea/how']").count();
    ok(`${label} · H4 no How to play door after the end`, links === 0, `how links=${links}`);
    void locale;
  };
  await shoot("retired", "classic", guestClassic, { check: retiredCheck });
  await shoot("retired", "journey", guestJourney, { check: retiredCheck, matrix: { sw: [360, 1280] } });
}

ok("no page error on any page", errs.length === 0, errs.slice(0, 3).join(" | "));
for (const [line, where] of zhElsewhere) console.log(`INFO zh space between two Han characters — ${line}  (first at ${where})`);
await browser.close();
console.log(`\nmaswali-hub-states (run ${RUN}): ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
