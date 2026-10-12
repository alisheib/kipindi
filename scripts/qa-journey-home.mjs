/**
 * qa:journey-home — THE JOURNEY HOME AND S7'S CARDS AS A PREVIEW READER SEES THEM, IN VIEWPORT TILES READ ONE BY ONE
 * (the Vodacom plan S7: `docs/design-system/v5-2026-09-29-simplified-journey/S7-PLAN.md` WP11 step 3 as amendments A12,
 * A15, A16 item 5, A17 item 3, A19 items 2-3, A20 item 5, A21 item 6 and A23 item 3 amend it).
 *
 *   KP_BASE=http://localhost:3041 npm run qa:journey-home -- [outDir]
 *
 *   outDir   where the PNG tiles go — OUTSIDE the repository (refused inside it: an untracked tile in a worktree is a file
 *            another session's commit can sweep up). By default a new folder under the OS temp directory, named last.
 *   KP_ONLY  a comma list of sections (positive controls home sheet routes live tafuta ghost tap redirect), run in that
 *            order; an unknown name is refused.
 *
 * ── WHAT A MACHINE ASSERTS, ONE PASS / FAIL / BLOCKED / NOT MEASURED LINE EACH ──────────────────────────────────────
 *   positive  (A23 item 3) with a pass, the documents of /, /live and /results carry S7's ids where they belong —
 *             journey-home and journey-howto-card on /, journey-card on all three (`live/journey-home-ids.mjs`, the
 *             list qa:live's absence checks read) — and, with no pass, none of them; journey-home-ghost is looked for
 *             on / and its finding PRINTED (the list holds it only if it is found);
 *   controls  a reader with no pass gets today's /, /markets (the board, HTTP 200), /live, /results and /watchlist,
 *             with no journey trace in the page or the bytes;
 *   home      the home's states as cards (priced, closes today, an empty pool, one side, over the cap, a hidden figure,
 *             a full title clamped), the chips scrolled, an empty category, a search line and a search that matched
 *             nothing, the end of page 1 with "Onyesha zaidi" — tiles in sw, en and zh at 360; and A16 item 5: at
 *             1280 the headline on ONE line left of the How-to card, its served text holding the sentence gap; at 1024
 *             the wrapped composition tiled and recorded; at 768 and 1280 the picks' tops equal within ±1px across
 *             every multi-column row; plus 320, 1100 and 1180 tiles for the headline;
 *   sheet     the How-to sheet in sw, en and zh at 320×640, 360×640, 390×844 and 1280×900: its exits (the kit ✕, the
 *             CTA and Weka mipaka) on screen without scrolling; at 320 its title on one line beside the ✕ (A15 item 2);
 *   routes    the other routes' cards: /results' settled YES, NO and void, /watchlist's every phase, the similar rail
 *             (h3 cards) — tiles at 360 and 1280;
 *   live      journey /live (A21 item 6): a selection-closed row in sw, en and zh at 360 and 1280, an Up & Down row,
 *             the end of page 1 with "Onyesha zaidi", and the count control — pressing it until it is gone reaches
 *             exactly the hero's data-result-count;
 *   tafuta    Akaunti's Tafuta closed and open at 360 in sw, en and zh, and one submit landing on /?q=… with the line;
 *   ghost     (A17 item 3) a throttled hop from journey /live to / through the visible journey link: the home's ghost
 *             caught by a rAF probe, and the How-to card, the headline, the chips and card 1 landing within ±2px of
 *             their ghost parts; a classic control showing no home ghost; and its red control (a stylesheet plant
 *             moving the ghost's card 40px must FAIL; hiding the ghost must report no ghost frame);
 *   tap       (A19 item 3) a throttled tap on card 1's stretched link, and on an NDIO pick: every loading frame until
 *             the question page lands is recorded, any frame of the home's ghost FAILS, no loading frame is NOT
 *             MEASURED;
 *   redirect  (A19 item 2) a pass holder's DOCUMENT /markets?topic=sports&utm_source=x answers 307 to the table's
 *             /?cat=sports&utm_source=x; a soft hop through a classic /markets link lands on its target, the loading
 *             frames recorded in order; a reader with no pass gets HTTP 200 and the board.
 * WHAT IS LEFT TO THE READER: how each tile LOOKS. A green run is not a read: open every tile, in the order of its number.
 *
 * ⛔ LOCAL ONLY (`premise`, `live/journey-pass.mjs`): `http://localhost:PORT` exactly, an in-memory server started after
 * `rm -rf .next` with DISABLE_ADMIN_TOTP=true and no DATABASE_URL, whose rollout a pass can see. It moves money through
 * the real service on that server alone (the demo player's portfolio; synthetic bettors), flips the platform's display
 * switch for the "hidden figure" question and back, and writes nothing but PNG tiles into <outDir>. Never point it at a
 * server another drive is using.
 * EXIT 0 every line passed · 1 a FAIL · 2 REFUSED · 3 no FAIL, but something BLOCKED or NOT MEASURED (not proven).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { request as httpRequest } from "node:http";
import { fileURLToPath } from "node:url";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { JOURNEY_HOME_TESTIDS, journeyHomeIdsIn } from "./live/journey-home-ids.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3041";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SECTIONS = ["positive", "controls", "home", "sheet", "routes", "live", "tafuta", "ghost", "tap", "redirect"];
const ONLY = (process.env.KP_ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const badOnly = ONLY.filter((s) => !SECTIONS.includes(s));
if (badOnly.length) { console.error(`REFUSED — unknown section(s) ${badOnly.join(", ")}: one of ${SECTIONS.join(" ")}`); process.exit(2); }
const run = (s) => ONLY.length === 0 || ONLY.includes(s);
const OUT = resolve(process.argv[2] ?? join(tmpdir(), `qa-journey-home-${Date.now()}`));
{
  const rel = relative(ROOT, OUT);
  if (!rel.startsWith("..") && !isAbsolute(rel)) { console.error(`REFUSED — the tiles' folder ${OUT} is inside the repository`); process.exit(2); }
}
mkdirSync(OUT, { recursive: true });
setTimeout(() => { console.log("\nWATCHDOG: 60 minutes — stopped"); process.exit(3); }, 60 * 60_000).unref();

const LOCALES = ["sw", "en", "zh"];
const SEL = {
  home: '[data-testid="journey-home"]', ghost: '[data-testid="journey-home-ghost"]', howto: '[data-testid="journey-howto-card"]',
  sheet: '[data-testid="journey-howto-sheet"]', card: '[data-testid="journey-card"]', rail: '[data-testid="journey-tabs"]',
  header: 'header[data-testid="journey-top-bar"]', title: "h1.kp-jhome__title", chips: "nav.kp-jhome__chips",
  picks: ".kp-jcard__picks", more: "a.btn.btn-ghost.btn-lg.w-full", query: ".kp-jhome__query",
};

let pass = 0, fail = 0, blocked = 0, notMeasured = 0, tileNo = 0;
const ok = (label, cond, extra = "") => { if (cond) { pass++; console.log(`  PASS ${label}`); } else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };
const blockedLine = (label, why) => { blocked++; console.log(`  BLOCKED ${label} — ${why}`); };
const nmLine = (label, why) => { notMeasured++; console.log(`  NOT MEASURED ${label} — ${why}`); };
const slug = (s) => s.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
async function tile(page, name) {
  tileNo++;
  const file = join(OUT, `${String(tileNo).padStart(3, "0")}-${slug(name)}.png`);
  await page.screenshot({ path: file, fullPage: false }).catch(() => {});
  console.log(`    tile ${String(tileNo).padStart(3, "0")} ${name}`);
}

const pre = await premise(BASE);
if (pre.refuse) { console.error(`REFUSED — ${pre.refuse}`); process.exit(2); }
if (pre.health?.security?.adminTotp !== "DISABLED") { console.error("REFUSED — start the server with DISABLE_ADMIN_TOTP=true (the preview door and the console need it)"); process.exit(2); }
const browser = await chromium.launch();
const host = new URL(BASE).hostname;
const asCookie = (c) => ({ name: c.name, value: c.value, domain: host, path: c.path || "/" });
console.log(`qa:journey-home — ${BASE} · Chromium ${browser.version()} · tiles in ${OUT}`);

// ── §0 · the pass and the board, through the product's own doors ─────────────────────────────────────────────────────
console.log("\n§0 · the pass, the catalogue, the demo player's portfolio and stars, Up & Down, and the card states");
const PASS = await mintStaffPass(browser, BASE);
const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const post = async (ctx, route, data = {}) => {
  const r = await ctx.request.post(`${BASE}/api/dev-test/${route}`, { data, timeout: 240_000 });
  return { status: r.status(), body: await r.json().catch(() => null) };
};
if ((await post(admin, "seed-admin", { role: "ADMIN", phone: "+255700000094", name: "Home Admin" })).status !== 200) {
  console.error("REFUSED — seed-admin failed (a stale .next 404s the dev routes: rm -rf .next)"); process.exit(2);
}
const catalogue = (await post(admin, "seed-markets")).body;
const ids = (catalogue?.ids ?? []).filter((m) => m.titleEn && !m.titleEn.startsWith("Demo · "));
if (ids.length < 18) { console.error(`REFUSED — the catalogue holds ${ids.length} live questions; the states need 18`); process.exit(2); }
let SESSION = await demoSession(browser, BASE);
const player = await browser.newContext();
await player.addCookies([asCookie(SESSION)]);
const portfolio = (await post(player, "seed-player-portfolio", { markets: 12 })).body;
const stars = (await post(player, "seed-watchlist")).body;
const updown = await post(admin, "updown-seed", { feedProvider: "mock-bars" });
console.log(`  catalogue ${ids.length} live · portfolio ${JSON.stringify(portfolio?.byStatus ?? portfolio)} · stars ${JSON.stringify(stars?.byLens ?? stars)} · up & down ${updown.status}`);
// The card states, each on a question the portfolio did not touch (it takes the first twelve the board lists).
const free = ids.filter((m) => !(portfolio?.marketIds ?? []).includes(m.id));
const STATE = { priced: free[0]?.id, oneSide: free[1]?.id, overCap: free[2]?.id, today: free[3]?.id, empty: free[4]?.id };
const bet = async (marketId, n, yesRatio) => post(admin, "stress-bulk-bet", { marketId, n, yesRatio, stake: 1000, userPrefix: `jh${marketId.slice(-4)}` });
const betLog = [await bet(STATE.priced, 12, 0.6), await bet(STATE.oneSide, 3, 1), await bet(STATE.overCap, 200, 0.995)];
const ff = await post(admin, "fast-forward-market", { marketId: STATE.today, seconds: 5 * 3600, selectionSeconds: 4 * 3600 });
console.log(`  states ${JSON.stringify(STATE)} · bets ${betLog.map((b) => b.status).join("/")} · today ${ff.status}`);
// The longest full question: its card clamps it to two lines.
const LONGEST = ids.slice().sort((a, b) => b.titleEn.length - a.titleEn.length)[0];
// A hidden figure: the display switch off while six questions are created, then on again (their rates freeze it off).
let HIDDEN = null;
{
  const page = await admin.newPage();
  // ⛔ The toggle is drawn by the server before it is hydrated, and a click then does nothing: it is pressed until its
  // aria-checked reads the wanted state, and a reload must read that state back, or the hidden figure is not made.
  const LABEL = "Show the possible-winnings estimate to players before betting";
  const state = async () => {
    await page.goto(`${BASE}/admin/config`, { waitUntil: "load", timeout: 240_000 });
    const t = page.getByLabel(LABEL);
    await t.waitFor({ timeout: 120_000 });
    return (await t.getAttribute("aria-checked")) === "true";
  };
  const flip = async (want) => {
    if ((await state()) === want) return;
    const t = page.getByLabel(LABEL);
    for (let i = 0; i < 40 && (await t.getAttribute("aria-checked")) !== String(want); i++) { await t.click(); await page.waitForTimeout(250); }
    await page.getByRole("button", { name: "Save · Hifadhi" }).first().click();
    await page.waitForTimeout(2500);
    if ((await state()) !== want) throw new Error(`the display switch did not save as ${want ? "on" : "off"}`);
  };
  try {
    const was = await state();
    await flip(false);
    const made = await post(admin, "seed-real-markets");
    await flip(was);
    const html = await (await fetch(`${BASE}/markets?q=${encodeURIComponent("Simba SC")}`)).text();
    // ⛔ The catalogue holds a Simba SC question of its own ("…the next Kariakoo Derby?"), made with the switch on: the
    // hidden figure is the first match that is NOT a catalogue question, i.e. one seed-real-markets just made.
    const known = new Set((catalogue?.ids ?? []).map((m) => m.id));
    HIDDEN = [...html.matchAll(/href="\/markets\/(mkt_[0-9a-f]+)"/g)].map((x) => x[1]).find((id) => !known.has(id)) ?? null;
    console.log(`  hidden figure: the display switch off while seed-real-markets made ${made.body?.created ?? "?"} questions · ${HIDDEN ?? "none found"}`);
  } catch (e) { console.log(`  hidden figure: not made — ${String(e?.message ?? e).split("\n")[0].slice(0, 140)}`); }
  await page.close();
}

async function ctxFor({ w, h, locale = "sw", pass = true, session = null }) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  const cookies = [{ name: LOCALE_COOKIE, value: locale, domain: host, path: "/" }];
  if (pass) cookies.push(asCookie(PASS));
  if (session) cookies.push(asCookie(session));
  await ctx.addCookies(cookies);
  await ctx.addInitScript(() => { try { window.localStorage.setItem("50pick-primer-seen", "1"); } catch { /* storage refused */ } });
  return ctx;
}
async function open(page, path, { wait = SEL.home } = {}) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 240_000 });
  if (wait) await page.locator(wait).first().waitFor({ timeout: 120_000 }).catch(() => {});
  await page.locator(SEL.rail).first().waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready).catch(() => {});
  await page.waitForTimeout(400);
  return res;
}

// ── positive · S7's ids where they belong, and nowhere without a pass (A23 item 3) ───────────────────────────────────
let ghostListed = null;
if (run("positive")) {
  console.log("\npositive · S7's ids in a pass holder's documents, none without the pass");
  const WANT = { "/": ["journey-home", "journey-howto-card", "journey-card"], "/live": ["journey-card"], "/results": ["journey-card"] };
  for (const [path, want] of Object.entries(WANT)) {
    const withPass = await (await fetch(`${BASE}${path}`, { headers: { cookie: `${PASS.name}=${PASS.value}; ${LOCALE_COOKIE}=sw` } })).text();
    const without = await (await fetch(`${BASE}${path}`, { headers: { cookie: `${LOCALE_COOKIE}=sw` } })).text();
    const found = journeyHomeIdsIn(withPass), leaked = journeyHomeIdsIn(without);
    ok(`positive · ${path} with a pass carries ${want.join(", ")}`, want.every((x) => found.includes(x)), `found ${found.join(", ") || "none"}`);
    ok(`positive · ${path} without a pass carries none of ${JOURNEY_HOME_TESTIDS.join(", ")}`, leaked.length === 0, `found ${leaked.join(", ")}`);
    if (path === "/") {
      ghostListed = /data-testid(?:=|\\?":)\\?"journey-home-ghost\\?"/.test(withPass);
      console.log(`    · journey-home-ghost in a pass holder's served / : ${ghostListed ? "FOUND (it belongs in the list)" : "not found (the list leaves it out, A23 item 1)"}`);
    }
  }
  const every = JOURNEY_HOME_TESTIDS.every((id) => Object.values(WANT).flat().includes(id));
  ok("positive · every id in the shared list is one this section proves present (an absence asked of an id never seen proves nothing)", every);
}

// ── controls · a reader with no pass gets today's pages ─────────────────────────────────────────────────────────────
const TRACE = /(?:data-testid|testId)(?:=|\\?":)\\?"(?:journey-|tickets-guest-)[\w-]*|\bdata-journey(?![\w-])|\bid(?:=|\\?":)\\?"kp-journey-shell(?![\w-])/g;
if (run("controls")) {
  console.log("\ncontrols · no pass: today's pages, no journey trace");
  const ctx = await ctxFor({ w: 390, h: 844, pass: false, session: SESSION });
  const page = await ctx.newPage();
  for (const path of ["/", "/markets", "/live", "/results", "/watchlist"]) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 240_000 });
    const raw = res ? await res.text().catch(() => "") : "";
    const dom = await page.evaluate(() => [...document.querySelectorAll('[data-testid^="journey-"],[data-journey],#kp-journey-shell')].map((e) => e.getAttribute("data-testid") ?? e.id ?? "data-journey")).catch(() => ["?"]);
    const bytes = [...new Set((raw.match(TRACE) ?? []))];
    ok(`controls · ${path} (signed in, no pass): HTTP ${res?.status()}, landed on ${new URL(page.url()).pathname}, no journey trace`, res?.status() === 200 && new URL(page.url()).pathname === path && dom.length === 0 && bytes.length === 0,
      `page ${dom.join(", ") || "none"} · bytes ${bytes.join(", ") || "none"}`);
    if (path === "/markets") ok("controls · /markets is the classic board for a reader with no pass", raw.includes('data-board="grid"'));
  }
  await ctx.close();
}

// ── home · the states, the chips, the search, the end of page 1, and A16 at every width ─────────────────────────────
if (run("home")) {
  console.log("\nhome · the home's states and widths (sw · en · zh)");
  for (const locale of LOCALES) {
    const ctx = await ctxFor({ w: 360, h: 780, locale, session: SESSION });
    const page = await ctx.newPage();
    await open(page, "/");
    await tile(page, `home ${locale} 360 top`);
    for (const [name, id] of [["priced", STATE.priced], ["one side", STATE.oneSide], ["over the cap", STATE.overCap], ["closes today", STATE.today], ["an empty pool", STATE.empty], ["a hidden figure", HIDDEN], ["a full title clamped", LONGEST.id]]) {
      if (!id) { blockedLine(`home ${locale} · ${name}`, "its question was not made (see §0)"); continue; }
      let card = page.locator(`${SEL.card}[data-row-id="${id}"]`);
      for (let i = 0; i < 4 && !(await card.count()); i++) {
        const more = page.locator(SEL.more).first();
        if (!(await more.count())) break;
        await more.click(); await page.waitForTimeout(1500);
        card = page.locator(`${SEL.card}[data-row-id="${id}"]`);
      }
      if (!(await card.count())) { blockedLine(`home ${locale} · ${name}`, `card ${id} is not on the home (it takes no bets, or lies past page five)`); continue; }
      await card.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await tile(page, `home ${locale} 360 card ${name}`);
      if (name === "a full title clamped") {
        // The fallback (a full question) is clamped to two lines; a question that fits in two shows no clamp to read.
        const t = await card.first().evaluate((el) => { const h = el.querySelector("h2, h3"); if (!h) return null; const lh = parseFloat(getComputedStyle(h).lineHeight); return { lines: Math.round(h.getBoundingClientRect().height / lh), cut: h.scrollHeight > h.clientHeight + 1 }; });
        if (t && !t.cut) blockedLine(`home ${locale} · a full title clamped`, `this language's longest question fits in ${t.lines} line(s) at 360: nothing is clamped to read`);
        else ok(`home ${locale} · the full title is clamped to two lines`, !!t && t.lines === 2 && t.cut, JSON.stringify(t));
      }
    }
    // the end of page 1 and its "Onyesha zaidi"
    await open(page, "/");
    const more = page.locator(SEL.more).first();
    if (await more.count()) {
      await more.scrollIntoViewIfNeeded(); await page.waitForTimeout(200);
      await tile(page, `home ${locale} 360 end of page 1 with Onyesha zaidi`);
      ok(`home ${locale} · page 1 draws twelve cards and "Onyesha zaidi"`, (await page.locator(SEL.card).count()) === 12);
    } else blockedLine(`home ${locale} · the end of page 1`, "fewer than thirteen questions take bets: no Onyesha zaidi");
    // the chips scrolled to their end
    await page.evaluate((sel) => { const n = document.querySelector(sel); if (n) n.scrollLeft = n.scrollWidth; window.scrollTo(0, 0); }, SEL.chips);
    await page.waitForTimeout(300);
    await tile(page, `home ${locale} 360 chips scrolled`);
    // an empty category, a search line, a search that matched nothing
    const chipsHeld = await page.evaluate(() => [...document.querySelectorAll("nav.kp-jhome__chips a[data-chip]")].map((a) => a.getAttribute("data-chip")));
    const emptyCat = ["sports", "weather", "macro", "crypto", "culture", "tech", "politics", "other"].find((c) => !chipsHeld.includes(`cat:${c}`));
    if (emptyCat) { await open(page, `/?cat=${emptyCat}`, { wait: SEL.home }); await tile(page, `home ${locale} 360 empty category ${emptyCat}`); }
    else blockedLine(`home ${locale} · an empty category`, "every category holds a question");
    await open(page, `/?q=${encodeURIComponent("Simba")}`); await tile(page, `home ${locale} 360 search line`);
    ok(`home ${locale} · a search is said in its own line`, (await page.locator(SEL.query).count()) === 1);
    await open(page, `/?q=zzzqqq`); await tile(page, `home ${locale} 360 search matched nothing`);
    await ctx.close();
  }
  // A16 item 5: the head at 1280 (one line beside the How-to card), the wrapped 1024, picks level at 768 and 1280
  for (const locale of LOCALES) for (const w of [320, 768, 1024, 1100, 1180, 1280]) {
    const ctx = await ctxFor({ w, h: 900, locale, session: SESSION });
    const page = await ctx.newPage();
    const res = await open(page, "/");
    await tile(page, `home ${locale} ${w} head`);
    if (w === 1280) {
      const head = await page.evaluate(([t, h]) => {
        const title = document.querySelector(t), card = document.querySelector(h);
        if (!title || !card) return null;
        const tb = title.getBoundingClientRect(), cb = card.getBoundingClientRect(), lh = parseFloat(getComputedStyle(title).lineHeight);
        return { oneLine: Math.abs(tb.height - lh) <= 1, left: tb.right <= cb.left + 1, h: tb.height, lh };
      }, [SEL.title, SEL.howto]);
      const served = res ? await res.text().catch(() => "") : "";
      ok(`home ${locale} 1280 · the headline is ONE line, left of the How-to card (A16 item 5)`, !!head?.oneLine && !!head?.left, JSON.stringify(head));
      ok(`home ${locale} 1280 · the served headline holds the sentence gap (a space after "." in sw and en, none after 。)`,
        locale === "zh" ? /。<\/span><br/.test(served) || /。<\/span><!-- -->/.test(served) || served.includes("。</span>") : /\.<\/span> <br|\.<\/span><!-- --> <!-- --><br|\.<\/span> /.test(served));
    }
    if (w === 768 || w === 1280) {
      const rows = await page.evaluate((sel) => {
        const tops = [...document.querySelectorAll(sel)].map((p) => p.getBoundingClientRect()).map((b) => ({ x: Math.round(b.left), y: b.top }));
        const byRow = [];
        for (const t of tops) { const row = byRow.find((r) => Math.abs(r.anchor - t.y) < 120); if (row) row.ys.push(t.y); else byRow.push({ anchor: t.y, ys: [t.y] }); }
        return byRow.filter((r) => r.ys.length > 1).map((r) => Math.max(...r.ys) - Math.min(...r.ys));
      }, `${SEL.home} ${SEL.picks}`);
      ok(`home ${locale} ${w} · in every multi-column row the picks' tops are level within ±1px (A16 item 5)`, rows.length > 0 && rows.every((d) => d <= 1), JSON.stringify(rows));
    }
    await ctx.close();
  }
}

// ── sheet · the How-to sheet: exits on screen, the title at 320 ─────────────────────────────────────────────────────
if (run("sheet")) {
  console.log("\nsheet · the How-to sheet at 320×640, 360×640, 390×844 and 1280×900");
  for (const locale of LOCALES) for (const [w, h] of [[320, 640], [360, 640], [390, 844], [1280, 900]]) {
    const ctx = await ctxFor({ w, h, locale, session: SESSION });
    const page = await ctx.newPage();
    await open(page, "/");
    await page.locator(SEL.howto).first().click();
    const sheet = page.locator(SEL.sheet).first();
    if (!(await sheet.waitFor({ timeout: 30_000 }).then(() => true).catch(() => false))) { ok(`sheet ${locale} ${w}×${h} · the sheet opens`, false); await ctx.close(); continue; }
    await page.waitForTimeout(500);
    await tile(page, `sheet ${locale} ${w}x${h}`);
    const exits = await sheet.evaluate((root, vh) => {
      const inView = (el) => { if (!el) return false; const b = el.getBoundingClientRect(); return b.top >= 0 && b.bottom <= vh && b.height > 0; };
      const buttons = [...root.querySelectorAll("button, a")];
      const close = root.querySelector('button[aria-label]');
      const links = buttons.filter((b) => b.tagName === "A");
      const cta = buttons.find((b) => b.tagName === "BUTTON" && b !== close && (b.className ?? "").includes("btn"));
      return { close: inView(close), cta: inView(cta), limits: links.some(inView) };
    }, h);
    ok(`sheet ${locale} ${w}×${h} · its exits — the ✕, the CTA and Weka mipaka — are on screen without scrolling`, exits.close && exits.cta && exits.limits, JSON.stringify(exits));
    if (w === 320) {
      const t = await sheet.evaluate((root) => { const h2 = root.querySelector("h2"); if (!h2) return null; const lh = parseFloat(getComputedStyle(h2).lineHeight); return Math.round(h2.getBoundingClientRect().height / lh); });
      ok(`sheet ${locale} 320 · the title holds one line beside the ✕ (A15 item 2)`, t === 1, `${t} lines`);
    }
    await ctx.close();
  }
}

// ── routes · the other routes' cards ────────────────────────────────────────────────────────────────────────────────
if (run("routes")) {
  console.log("\nroutes · /results, /watchlist and the similar rail");
  for (const [path, what] of [["/results", "settled YES, NO and void"], ["/watchlist", "every phase"]]) for (const w of [360, 1280]) for (const locale of LOCALES) {
    const ctx = await ctxFor({ w, h: w === 360 ? 780 : 900, locale, session: SESSION });
    const page = await ctx.newPage();
    await open(page, path, { wait: SEL.card });
    const n = await page.locator(SEL.card).count();
    ok(`routes ${path} ${locale} ${w} · journey cards drawn (${what})`, n > 0, `${n} cards`);
    await page.locator(SEL.card).first().scrollIntoViewIfNeeded().catch(() => {});
    await tile(page, `${path} ${locale} ${w}`);
    if (path === "/results" && w === 360 && locale === "sw") {
      // One tile per outcome the page draws (YES, NO, void), found by the outcome chip's own words.
      const chips = page.locator(`${SEL.card} .kp-jcard__outcome`);
      const seen = [];
      for (let i = 0; i < (await chips.count()); i++) {
        const word = ((await chips.nth(i).textContent()) ?? "").trim();
        if (!word || seen.includes(word)) continue;
        seen.push(word);
        await chips.nth(i).scrollIntoViewIfNeeded();
        await tile(page, `/results sw 360 settled ${word}`);
      }
      ok(`routes /results sw 360 · settled cards drawn with their outcome, each tiled (${seen.join(", ") || "none"})`, seen.length >= 2, `${seen.length} outcome(s)`);
    }
    await ctx.close();
  }
  const ctx = await ctxFor({ w: 390, h: 844, locale: "sw", session: SESSION });
  const page = await ctx.newPage();
  await open(page, `/markets/${STATE.priced}`, { wait: null });
  const rail = page.locator(`.market-grid ${SEL.card}, .kp-jgrid ${SEL.card}`);
  ok("routes · the similar rail draws journey cards as h3 for a pass holder", (await rail.count()) > 0 && (await page.locator(`.kp-jgrid ${SEL.card} h3`).count()) > 0);
  await rail.first().scrollIntoViewIfNeeded().catch(() => {});
  await tile(page, "similar rail sw 390");
  await ctx.close();
}

// ── live · journey /live: the closed row, Up & Down, the end of page 1, the count control ────────────────────────────
if (run("live")) {
  console.log("\nlive · journey /live (A21 item 6)");
  for (const locale of LOCALES) for (const w of [360, 1280]) {
    const ctx = await ctxFor({ w, h: w === 360 ? 780 : 900, locale, session: SESSION });
    const page = await ctx.newPage();
    await open(page, "/live", { wait: SEL.card });
    const closed = page.locator(`${SEL.card}:has(.kp-jcard__closed)`);
    if (await closed.count()) { await closed.first().scrollIntoViewIfNeeded(); await tile(page, `/live ${locale} ${w} selection closed`); ok(`live ${locale} ${w} · a selection-closed row is drawn as the card's closed face`, true); }
    else blockedLine(`live ${locale} ${w} · a selection-closed row`, "none on the board (seed-watchlist's progress row was not made)");
    if (locale === "sw" && w === 360) {
      const ud = page.locator(`${SEL.card} a[href^="/updown/"]`);
      if (await ud.count()) { await ud.first().scrollIntoViewIfNeeded(); await tile(page, "/live sw 360 Up & Down"); ok("live · an Up & Down row opens its round", true); }
      else blockedLine("live · an Up & Down row", "no running round on this server");
      const count = await page.locator("[data-result-count]").first().getAttribute("data-result-count").then(Number).catch(() => NaN);
      for (let i = 0; i < 40; i++) {
        const more = page.locator(SEL.more).first();
        if (!(await more.count())) break;
        if (i === 0) { await more.scrollIntoViewIfNeeded(); await tile(page, "/live sw 360 end of page 1 with Onyesha zaidi"); }
        await more.click(); await page.waitForTimeout(1500);
      }
      const drawn = await page.locator(SEL.card).count();
      ok(`live · pressing "Onyesha zaidi" until it is gone draws exactly the hero's data-result-count (${count})`, Number.isFinite(count) && drawn === count, `${drawn} cards`);
    }
    await ctx.close();
  }
}

// ── tafuta · Akaunti's search row ───────────────────────────────────────────────────────────────────────────────────
if (run("tafuta")) {
  console.log("\ntafuta · Akaunti's Tafuta (A20 item 5)");
  for (const locale of LOCALES) {
    const ctx = await ctxFor({ w: 360, h: 780, locale, session: SESSION });
    const page = await ctx.newPage();
    await open(page, "/account", { wait: '[data-testid="journey-account-hub"]' });
    const row = page.locator("details:has(form[action='/']) > summary").first();
    if (!(await row.count())) { ok(`tafuta ${locale} · the row is on the hub`, false); await ctx.close(); continue; }
    await row.scrollIntoViewIfNeeded(); await tile(page, `tafuta ${locale} 360 closed`);
    await row.click(); await page.waitForTimeout(300); await tile(page, `tafuta ${locale} 360 open`);
    if (locale === "sw") {
      await page.locator("details[open] form[action='/'] input[name='q']").fill("Simba");
      await Promise.all([page.waitForURL(/\/\?q=Simba/, { timeout: 60_000 }).catch(() => {}), page.locator("details[open] form[action='/'] button[type='submit']").click()]);
      await page.locator(SEL.query).first().waitFor({ timeout: 60_000 }).catch(() => {});
      ok("tafuta · a search lands on /?q=… and the home says it in its line", /\/\?q=Simba/.test(page.url()) && (await page.locator(SEL.query).count()) === 1, page.url());
      await tile(page, "tafuta sw 360 landed");
    }
    await ctx.close();
  }
}

// ── ghost · the home's ghost against the landed page (A17 item 3) ───────────────────────────────────────────────────
const GHOST_PROBE = (sel) => {
  window.__ghost = null; window.__ghostFrames = 0;
  const parts = ["howto", "headline", "chips", "card"];
  const tick = () => {
    const g = document.querySelector(sel.ghost);
    if (g && location.pathname === "/") {
      const b = g.getBoundingClientRect();
      if (b.height > 0) {
        window.__ghostFrames++;
        window.__ghost = Object.fromEntries(parts.map((p) => { const e = g.querySelector(`[data-ghost-part="${p}"]`); const r = e?.getBoundingClientRect(); return [p, r ? { x: r.left, y: r.top + scrollY } : null]; }));
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
async function ghostHop({ w, h, locale, red = null, pass = true }) {
  const ctx = await ctxFor({ w, h, locale, pass, session: SESSION });
  const page = await ctx.newPage();
  if (red) {
    await page.route(/\/_next\/static\/.*\.css(\?.*)?$/, async (route) => {
      const res = await route.fetch();
      const css = (await res.text()) + `\n${red}\n`;
      await route.fulfill({ response: res, body: css, headers: { ...res.headers(), "content-length": String(Buffer.byteLength(css)) } });
    });
  }
  await open(page, "/live", { wait: null });
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.evaluate(GHOST_PROBE, SEL);
  const link = w >= 1024 ? page.locator(`${SEL.header} a[href="/"]:not(.kp-jhdr__home)`).first() : page.locator(`${SEL.rail} a[href="/"]`).first();
  if (!(await link.count())) { await ctx.close(); return { error: "no visible journey link to /" }; }
  await link.click();
  await page.locator(SEL.home).first().waitFor({ timeout: 180_000 }).catch(() => {});
  await page.locator(SEL.rail).first().waitFor({ state: "visible", timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(800);
  const ghost = await page.evaluate(() => ({ g: window.__ghost, frames: window.__ghostFrames }));
  const landed = await page.evaluate((sel) => {
    const at = (q) => { const e = document.querySelector(q); const r = e?.getBoundingClientRect(); return r ? { x: r.left, y: r.top + scrollY } : null; };
    return { howto: at(sel.howto), headline: at(sel.title), chips: at(sel.chips), card: at(`${sel.home} ${sel.card}`) };
  }, SEL);
  await ctx.close();
  return { ghost, landed };
}
if (run("ghost")) {
  console.log("\nghost · a throttled hop from journey /live to / (A17 item 3)");
  for (const [w, h, locale] of [[360, 780, "sw"], [390, 844, "en"], [1280, 900, "zh"]]) {
    let r = null;
    for (let i = 0; i < 3 && !(r?.ghost?.g); i++) r = await ghostHop({ w, h, locale });
    if (r?.error) { ok(`ghost ${w} ${locale} · the hop`, false, r.error); continue; }
    if (!r?.ghost?.g) { nmLine(`ghost ${w} ${locale}`, "three throttled hops caught no ghost frame (the home's read resolved before the first flush) — Ali's call, A17 item 3"); continue; }
    const off = ["howto", "headline", "chips", "card"].map((p) => [p, r.ghost.g[p] && r.landed[p] ? Math.max(Math.abs(r.ghost.g[p].x - r.landed[p].x), Math.abs(r.ghost.g[p].y - r.landed[p].y)) : null]);
    ok(`ghost ${w} ${locale} · every part lands within ±2px of its ghost (${r.ghost.frames} ghost frames)`, off.every(([, d]) => d !== null && d <= 2), JSON.stringify(off));
  }
  const control = await ghostHop({ w: 390, h: 844, locale: "sw", pass: false });
  ok("ghost · the classic control (the same hop, no pass) shows no home ghost", !control?.ghost?.g, JSON.stringify(control?.ghost ?? control));
  const moved = await ghostHop({ w: 390, h: 844, locale: "en", red: '[data-ghost-part="card"] { margin-top: 40px !important; }' });
  if (moved?.ghost?.g) {
    const d = moved.ghost.g.card && moved.landed.card ? Math.abs(moved.ghost.g.card.y - moved.landed.card.y) : null;
    ok("ghost · RED: a ghost card moved 40px is reported off (the drive can fail)", d !== null && d > 2, `${d}px`);
  } else nmLine("ghost · RED: the moved card", "no ghost frame was caught on the planted hop");
  const hidden = await ghostHop({ w: 390, h: 844, locale: "en", red: `${SEL.ghost} { display: none !important; }` });
  ok("ghost · RED: a hidden ghost reports no ghost frame", !hidden?.ghost?.g, JSON.stringify(hidden?.ghost ?? hidden));
}

// ── tap · from the home to a question page: which loading picture (A19 item 3) ──────────────────────────────────────
if (run("tap")) {
  console.log("\ntap · a throttled tap from the home to a question page (A19 item 3)");
  for (const how of ["the card's stretched link", "an NDIO pick"]) {
    const ctx = await ctxFor({ w: 390, h: 844, locale: "sw", session: SESSION });
    const page = await ctx.newPage();
    await open(page, "/");
    const cdp = await ctx.newCDPSession(page);
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8 });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
    await page.evaluate((sel) => {
      window.__frames = [];
      const tick = () => {
        const seen = [];
        if (document.querySelector(sel.ghost)) seen.push("journey-home-ghost");
        if (document.querySelector('[aria-busy="true"], .kp-shimmer-track') && !document.querySelector(sel.ghost)) seen.push(location.pathname.startsWith("/markets/") ? "a question page ghost" : "a markets ghost");
        if (seen.length) window.__frames.push(seen.join("+"));
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, SEL);
    const card = page.locator(SEL.card).first();
    const target = how === "an NDIO pick" ? card.locator(".kp-jcard__pick.btn-yes").first() : card.locator(".kp-jcard__open").first();
    await target.click();
    await page.waitForURL(/\/markets\/mkt_/, { timeout: 180_000 }).catch(() => {});
    await page.waitForTimeout(1500);
    const frames = await page.evaluate(() => window.__frames ?? []);
    const kinds = [...new Set(frames)];
    if (!frames.length) nmLine(`tap · ${how}`, "no loading frame was captured");
    else ok(`tap · ${how}: no frame of the home's ghost on the way to the question (seen: ${kinds.join(", ")})`, !kinds.some((k) => k.includes("journey-home-ghost")));
    await ctx.close();
  }
}

// ── redirect · /markets for a pass holder (A19 item 2) ──────────────────────────────────────────────────────────────
if (run("redirect")) {
  console.log("\nredirect · /markets for a pass holder, and for a reader with no pass");
  // A DOCUMENT load, as a browser asks for one (Sec-Fetch-Mode: navigate), over node:http — qa:served-skeleton's door.
  const navGet = (path, cookie) => new Promise((done) => {
    const u = new URL(`${BASE}${path}`);
    const req = httpRequest({ host: u.hostname, port: u.port, path: u.pathname + u.search, method: "GET",
      headers: { accept: "text/html", "sec-fetch-mode": "navigate", "sec-fetch-dest": "document", ...(cookie ? { cookie } : {}) } }, (res) => {
      let body = ""; res.setEncoding("utf8"); res.on("data", (c) => { body += c; }); res.on("end", () => done({ status: res.statusCode, location: res.headers.location ?? "", body }));
    });
    req.on("error", (e) => done({ status: 0, location: "", body: String(e) }));
    req.end();
  });
  const doc = await navGet("/markets?topic=sports&utm_source=x", `${PASS.name}=${PASS.value}`);
  ok("redirect · a pass holder's document /markets?topic=sports&utm_source=x answers 307 to /?cat=sports&utm_source=x", doc.status === 307 && doc.location.endsWith("/?cat=sports&utm_source=x"), `${doc.status} → ${doc.location}`);
  const classic = await navGet("/markets", "");
  ok("redirect · a reader with no pass gets HTTP 200 and the board", classic.status === 200 && classic.body.includes('data-board="grid"'), `${classic.status}`);
  const ctx = await ctxFor({ w: 390, h: 844, locale: "sw", session: SESSION });
  const page = await ctx.newPage();
  await open(page, "/results", { wait: SEL.card });
  // ⛔ A SOFT hop, never a document load: a link drawn into the page by a script is a plain anchor, which the browser
  // loads as a document (the 307 above, again). The hop is a classic next/link to /markets when the page draws one, else
  // the dev server's own router (`window.nd.router`, Next's debugging handle in development) pushed to the same address
  // — both a flight request, which only the page's own redirect answers.
  const linkCount = await page.locator('a[href^="/markets?"], a[href="/markets"]').count();
  const how = linkCount ? "a classic /markets link on the page" : "the app router pushed to /markets?topic=sports (no classic link on the page)";
  await page.evaluate((sel) => { window.__seq = []; window.__docLoads = performance.getEntriesByType("navigation").length; const tick = () => { const k = document.querySelector(sel.ghost) ? "home ghost" : document.querySelector('[aria-busy="true"], .kp-shimmer-track') ? "a ghost" : null; if (k && window.__seq[window.__seq.length - 1] !== k) window.__seq.push(k); requestAnimationFrame(tick); }; requestAnimationFrame(tick); }, SEL);
  let pushed = true;
  if (linkCount) await page.locator('a[href^="/markets?"], a[href="/markets"]').first().click();
  else pushed = await page.evaluate(() => { const r = window.nd?.router; if (!r?.push) return false; r.push("/markets?topic=sports"); return true; });
  if (!pushed) nmLine("redirect · a soft hop to /markets", "no classic /markets link on /results and no development router handle to push one");
  else {
    await page.waitForURL((u) => new URL(u).pathname === "/", { timeout: 120_000 }).catch(() => {});
    await page.locator(SEL.home).first().waitFor({ timeout: 120_000 }).catch(() => {});
    // Still the same document (a soft hop keeps the page's own script state): the probe's sequence survived.
    const soft = await page.evaluate(() => Array.isArray(window.__seq));
    const seq = await page.evaluate(() => window.__seq ?? []);
    const at = new URL(page.url());
    ok(`redirect · a soft hop (${how}) lands on the home (${at.pathname}${at.search}); loading frames in order: ${seq.join(" → ") || "none"}`,
      soft && at.pathname === "/" && at.searchParams.get("cat") === "sports" && (await page.locator(SEL.home).count()) === 1,
      soft ? "" : "the page was reloaded as a document — not a soft hop");
  }
  await ctx.close();
}

await browser.close();
console.log(`\nqa:journey-home — ${pass} passed · ${fail} failed · ${blocked} blocked · ${notMeasured} not measured · ${tileNo} tiles in ${OUT}`);
console.log(`journey-home-ghost in a pass holder's served /: ${ghostListed === null ? "not read (positive not run)" : ghostListed ? "found" : "not found"}`);
process.exit(fail ? 1 : blocked || notMeasured ? 3 : 0);
