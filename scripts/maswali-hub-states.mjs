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
 *    Run "a" walks a week from sale to its void; run "b" the sunset: the final week announced, run, and Millionea ended;
 *    run "c" the staff preview: the Owner moves the switch to STAFF_PREVIEW through the console's typed ceremony and
 *    reads the hub as staff (D12's one bar above the page).
 *
 * ROUND 2 (2026-10-22, the lanes' common brief): every classic state at 320 · 360 · 768 · 1024 · 1280 · 1920 in sw, en and
 * zh, each page to its end; and on every view the rulings since round 1 are measured, not assumed — §T5 (every numeral of
 * the hub's own lines in the numerals' face; another lane's printed for its owner), the one ledger's note line, D15 (on a
 * phone, before each tile, the chat bubble at rest yields to .50 over what lies under it), zh's spacing (a census of every
 * line); L4/L20 (a ticket just bought: its row named and lifting, its free cancel said), L5 (each door to the register
 * answers 200).
 *
 * Each state ASSERTS VALUES on the rendered page (boxes, computed styles, the words in the reader's language), then writes
 * viewport tiles to `.50pick-shots/maswali-hub-states/` (`<state>-<shell>-<locale>-<width>[-sN].png`), read one by one.
 * A once-per-week notice is marked seen as it is shown, so the notice states are shot in ONE page view per language (the
 * viewport resized, never reloaded), each language by its own player.
 */
import { chromium, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE, SESSION_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3550";
const RUN = (process.env.MLN_HUB_RUN || "a").toLowerCase();
const OUT = ".50pick-shots/maswali-hub-states";
const HEIGHT = 780;
const OVERLAP = 240;
const ONLY = (process.env.MLN_HUB_STATES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const want = (state) => ONLY.length === 0 || ONLY.includes(state);
/** Round 2 (the lanes' common brief): every platform width in every language, Swahili first (the longest). */
const WIDTHS = [320, 360, 768, 1024, 1280, 1920];
const CLASSIC = { sw: WIDTHS, en: WIDTHS, zh: WIDTHS };
const JOURNEY = { sw: [360, 1024, 1280], en: [360], zh: [360] };
/** Where a state is shot to its end (scroll tiles): at every width (round 2: "every page to its end"). */
const SCROLL_AT = new Set(WIDTHS);
/** Where the chat bubble's yield is read before each tile (PLATFORM D15): the phones. */
const YIELD_AT = 360;

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } if (c && process.env.MLN_HUB_VERBOSE) console.log(`PASS ${n}`); };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };
const j = (v) => JSON.stringify(v);

const pre = await premise(BASE);
if (pre.refuse) die(pre.refuse);
// Every run starts on sale (the seed sells: its ticket arm reads the real rollout); run c then moves the Owner's switch to
// STAFF_PREVIEW through its typed ceremony and reads the hub as a staff officer (D12's preview bar).
if (pre.health?.millionea?.state !== "ACTIVE") die(`/api/health says millionea = ${j(pre.health?.millionea)}: start next dev with FEATURE_MILLIONEA=ACTIVE`);
mkdirSync(OUT, { recursive: true });

/**
 * THE ENGINE AND THE DEVICE PIXEL RATIO (S5-R2-HUB 12; the lead's ruling for every text-geometry table, 2026-10-23: the
 * drawing's per-language widths and line counts are MEASURED at a phone's device pixel ratio — 2.625 and 3 — in Chromium
 * and WebKit, with the CJK face, never at ratio 1). `MLN_HUB_ENGINE` = chromium (the default) | webkit; `MLN_HUB_DPR` the
 * ratio every reader's context renders at (1 when unset, as before).
 */
const ENGINE = (process.env.MLN_HUB_ENGINE || "chromium").toLowerCase();
const DPR = Number(process.env.MLN_HUB_DPR || 1);
if (!["chromium", "webkit"].includes(ENGINE) || !(DPR > 0)) die(`MLN_HUB_ENGINE=${ENGINE} MLN_HUB_DPR=${process.env.MLN_HUB_DPR}: chromium or webkit, a ratio above 0`);
const browser = await (ENGINE === "webkit" ? webkit : chromium).launch();
console.log(`INFO engine · ${ENGINE} ${browser.version()} at device pixel ratio ${DPR}`);
const errs = [];

/**
 * ⚠️ PREMISE — A DESKTOP'S MOTION TIER (S5-R2-HUB 6, on GitHub's 4-CPU runners). The platform throttles its motion on a
 * low-end device (`theme-provider.tsx`: four cores or fewer, or 4 GB or less, sets `data-motion="reduced"`, which stops every
 * loading shimmer by design — globals.css §6). A runner reports its own four cores, so every page here would read the
 * low-end tier and the drawing's shimmer checks would measure a machine, not the hub. The drive reads the full tier, as a
 * desktop or a phone above the line does: each reader's browser reports eight cores. What the machine itself reports is
 * printed; the reduced-motion end state is still read through the OS setting (the "ghost" state's reduced view).
 */
const DESKTOP_CORES = 8;
{
  const probe = await browser.newPage();
  const raw = await probe.evaluate(() => ({ cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory ?? null }));
  await probe.close();
  console.log(`INFO premise · this machine's browser reports ${raw.cores} cores and ${raw.memory} GB; each reader's reports ${DESKTOP_CORES} cores (the full motion tier)`);
}
async function desktopTier(ctx) {
  await ctx.addInitScript((cores) => { Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { get: () => cores, configurable: true }); }, DESKTOP_CORES);
  return ctx;
}

/** A context for one reader: its cookies (a session, a staff pass) and the language; a guest has none. */
async function readerContext(cookies) {
  const ctx = await desktopTier(await browser.newContext({ viewport: { width: 360, height: HEIGHT }, deviceScaleFactor: DPR }));
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
async function tiles(page, name, width, label = name) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  let covered = HEIGHT;
  for (let n = 2; n <= 24 && covered < total - 1; n++) {
    const top = Math.min((n - 1) * (HEIGHT - OVERLAP), Math.max(0, total - HEIGHT));
    await page.evaluate((y) => window.scrollTo(0, y), top);
    // On a phone each tile is the page at rest, as a reader stops on it: the chat bubble back and its yield read (D15).
    if (width <= YIELD_AT) await yieldCheck(page, `${label} · s${n}`);
    else await page.waitForTimeout(250);
    await page.screenshot({ path: `${OUT}/${name}-s${n}.png` });
    covered = (await page.evaluate(() => window.scrollY)) + HEIGHT;
  }
  await page.evaluate(() => window.scrollTo(0, 0));
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
      await t5Checks(page, label);
      await noteChecks(page, label);
      await ruleChecks(page, label);
      await doorRowChecks(page, label);
      await widowChecks(page, label);
      if (width === 768) await holeChecks(page, label);
      if (width <= YIELD_AT) await yieldCheck(page, `${label} · s1`);
      const name = `${state}-${shell}-${locale}-${width}`;
      await page.screenshot({ path: `${OUT}/${name}.png` });
      if (SCROLL_AT.has(width)) await tiles(page, name, width, label);
    }
  }
  await page.close();
}

// ── the seed ───────────────────────────────────────────────────────────────────────────────────────────────────────────
// The Owner, signed in in this context (`seed-admin`): who seeds, and in run c who moves the switch and reads the preview.
const owner = await desktopTier(await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: DPR }));
{
  await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
  const seed = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
  ok("the weeks are seeded on a fresh store", seed.ok(), `${seed.status()} ${await seed.text().catch(() => "")}`);
}
const pass_ = await mintStaffPass(browser, BASE);
const demo = await demoSession(browser, BASE, { query: "?deposit=0", balance: 50_000 });
const demoClassic = await readerContext([demo]);
const demoJourney = await readerContext([demo, pass_]);
const guestClassic = await readerContext([]);
const guestJourney = await readerContext([pass_]);
const t = { // the words a check reads, per language (the dictionary's, via the rendered page's own <html lang>)
  // The dictionary's `pausedShort` since DOORS' ebb6caa5f (one wording with the card): "Sales paused for now".
  pausedShort: { en: "Sales paused for now", sw: "Mauzo yamesimamishwa kwa muda", zh: "暂时停售" },
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
    // The calm bars over the page — a once-per-week notice, a moved close, the final week announced — stand above the hub
    // on the visits that carry them (§F9, the platform's away bar): the door is measured on the visit without them, and
    // how far the bars push it is printed (they are the page's own first lines, never a door's competitor).
    const bars = await page.evaluate(() => ["millionea-preview-mark", "millionea-hub-notices", "millionea-hub-close-moved", "millionea-hub-final-ahead"]
      .map((id) => document.querySelector(`[data-testid="${id}"]`)?.getBoundingClientRect().height ?? 0).reduce((a, b) => a + b, 0));
    const bottom = d.y + d.height - (staffBar?.height ?? 0) - bars;
    ok(`${label} · H1 the door stands on a player's first screen, above the rail (bottom ${Math.round(bottom)} ≤ ${HEIGHT - rail}${staffBar ? `, the staff bar's ${Math.round(staffBar.height)}px aside` : ""}${bars ? `, the page's calm bars' ${Math.round(bars)}px aside: ${Math.round(bottom + bars)} with them` : ""})`,
      bottom <= HEIGHT - rail, j({ d, rail, staffBar, bars }));
  }
  const head = await box(page, "millionea-hub-jackpot");
  if (width >= 768 && width < 1024 && head) {
    // Side by side: the door in the column beside the head, standing within the head's height (centred on it, the round-1
    // fix for the right column's gap at 768 — `md:self-center`), never below it.
    const centred = Math.abs((d.y + d.height / 2) - (head.y + head.height / 2));
    ok(`${label} · M1 the jackpot's head and the door stand side by side from 768 (the door ${Math.round(centred)}px off the head's centre, inside its height)`,
      d.x >= head.x + head.width && d.y >= head.y - 1 && d.y + d.height <= head.y + head.height + 1, j({ head, d }));
  }
  if (width >= 1024 && head) {
    // S5-R2-HUB · the pinned pair's foot (the tile read: mid-scroll the ledger slid out from under the pair cut flat, a box
    // with no top): its ground fades over its foot — as deep as the column's own gap — and at rest the block under it stands
    // that gap below (it stood 36px against the column's 20).
    const foot = await page.evaluate(() => {
      const p = document.querySelector('[data-testid="millionea-hub-pinned"]');
      const aside = p?.parentElement, next = p?.nextElementSibling, last = p?.lastElementChild;
      if (!p || !aside || !next || !last) return null;
      const cs = getComputedStyle(p);
      return { image: cs.backgroundImage.slice(0, 160), pad: parseFloat(cs.paddingBottom), colGap: parseFloat(getComputedStyle(aside).rowGap),
        gap: Math.round(next.getBoundingClientRect().top - last.getBoundingClientRect().bottom) };
    });
    ok(`${label} · the pinned pair's ground fades over its foot, and at rest the next block stands the column's own gap under the pair (${foot?.gap}px of ${foot?.colGap}px)`,
      !!foot && foot.image.includes(`calc(100% - ${foot.pad}px)`) && foot.pad === foot.colGap && Math.abs(foot.gap - foot.colGap) <= 1, j(foot));
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
/** A sentence's last line holds at least two words — two characters in Chinese: the paused notice, the voiding notice and
 *  each voided main's words, whose every line does (S5-R2-HUB; the tile read: sw 320 "salama.", en 1280/1920 "voided" and
 *  sw 1024 "itarejeshwa." alone on a last line, "Void" / "Batili" alone on a first). Lines are found from the glyphs' own
 *  boxes. */
async function widowChecks(page, label) {
  const found = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('[data-testid="millionea-hub-paused"], [data-testid="millionea-hub-voiding"], [data-testid="millionea-hub-void-words"]')) {
      const glyphs = [];
      const range = document.createRange();
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (n.parentElement?.closest(".sr-only")) continue;
        const text = n.textContent ?? "";
        for (let i = 0; i < text.length; i++) {
          range.setStart(n, i); range.setEnd(n, i + 1);
          const r = range.getClientRects()[0];
          if (r && r.width > 0) glyphs.push({ ch: text[i], mid: (r.top + r.bottom) / 2, left: r.left });
        }
      }
      const lines = [];
      for (const g of glyphs) { const l = lines.find((x) => Math.abs(x.mid - g.mid) < 6); if (l) l.chars.push(g); else lines.push({ mid: g.mid, chars: [g] }); }
      if (lines.length < 2) continue;
      lines.sort((a, b) => a.mid - b.mid);
      const texts = lines.map((l) => l.chars.sort((a, b) => a.left - b.left).map((c) => c.ch).join("").trim());
      const size = (s) => (/[㐀-鿿]/.test(s) ? [...s.replace(/[\s。．.，,、：:！!？?]/g, "")].length : s.split(/\s+/).filter(Boolean).length);
      const where = el.getAttribute("data-testid");
      const every = where === "millionea-hub-void-words";
      const worst = (every ? texts : [texts[texts.length - 1]]).reduce((a, b) => (size(b) < size(a) ? b : a));
      out.push({ where, every, last: worst, words: size(worst), lines: texts });
    }
    return out;
  });
  for (const f of found) ok(`${label} · ${f.where}: ${f.every ? "no line" : "its last line"} is a lone word ("${f.last}")`, f.words >= 2, j(f));
}

/** M1 · NO CELL OF THE TWO-UP COLUMN STANDS EMPTY at 768 (S5-R2-HUB; the tile read: paused, a 350×170px hole beside the
 *  head; a guest's graded week hung a row lower, under an empty one): with no door the head runs both columns, and with no
 *  block of the reader's the graded week stands level with the ledger. */
async function holeChecks(page, label) {
  const g = await page.evaluate(() => {
    const box = (s) => { const el = document.querySelector(s); if (!el || el.getClientRects().length === 0) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), width: Math.round(r.width) }; };
    const aside = document.querySelector('[data-testid="millionea-hub-aside"]');
    return { aside: box('[data-testid="millionea-hub-aside"]'), head: box('[data-testid="millionea-hub-jackpot"]'), buy: box('[data-testid="millionea-hub-buy"]'),
      ledger: box('[data-testid="millionea-hub-ledger"]'), mine: box('[data-testid="millionea-hub-mine"]'), grading: box('[data-testid="millionea-hub-grading"]'),
      facts: box('[data-testid="millionea-hub-facts"]'), gap: aside ? Math.round(parseFloat(getComputedStyle(aside).rowGap)) : null };
  });
  if (!g.aside || !g.head || !g.ledger) return; // a week with no pool: one column, no cells
  if (!g.buy) ok(`${label} · M1 with no door beside it the head runs both columns`, Math.abs(g.head.width - g.aside.width) <= 1, j(g));
  if (g.grading && !g.mine) ok(`${label} · M1 with no block of the reader's the graded week stands level with the ledger`, Math.abs(g.grading.top - g.ledger.top) <= 1, j(g));
  // S5-R2-HUB 12 (§M8a item 27) · no empty band under the head: the ledger stands the column's one row gap under it, however
  // tall the door beside it (a closed week's facts in the door's block left 80px empty at sw and en 768) — and a closed
  // week's facts, their own cell, start level with the ledger.
  ok(`${label} · M1 the ledger stands one row gap under the jackpot's head (${g.ledger.top - g.head.bottom}px, the column's ${g.gap}px)`,
    g.gap !== null && Math.abs(g.ledger.top - g.head.bottom - g.gap) <= 1, j(g));
  if (g.facts) ok(`${label} · M1 a closed week's facts start level with the ledger (${g.facts.top - g.ledger.top}px)`, Math.abs(g.facts.top - g.ledger.top) <= 1, j(g));
}

/** A door row (the graded week's facts, last week's row) ends in its chevron: its words stop at least the row's gap (8px)
 *  before it. A kept run wider than the row's text box ran past it (the tile read: sw 320, "Matokeo 15 kati ya 15
 *  yametolewa" 2–5px from the chevron). Measured on the glyphs' own boxes. */
async function doorRowChecks(page, label) {
  const rows = await page.evaluate(() => ['[data-testid="millionea-hub-grading-door"]', '[data-testid="millionea-hub-last-week"] a'].flatMap((sel) => {
    const row = document.querySelector(sel);
    const chevrons = row ? row.querySelectorAll("svg") : [];
    const chevron = chevrons.length ? chevrons[chevrons.length - 1] : null;
    if (!row || !chevron) return [];
    const range = document.createRange();
    let right = -Infinity;
    const walk = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (n.parentElement?.closest(".sr-only") || !(n.textContent ?? "").trim()) continue;
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) if (r.width > 0) right = Math.max(right, r.right);
    }
    return [{ sel, clear: Math.round(chevron.getBoundingClientRect().left - right) }];
  }));
  for (const r of rows) ok(`${label} · a door row's words stop before its chevron (${r.sel.includes("grading") ? "the graded week" : "last week"}: ${r.clear}px clear)`, r.clear >= 8, j(r));
}

/**
 * The jackpot's rule (S5-R2-HUB): each fact that wraps inside itself is balanced — no line of it under half the width of
 * its longest (`HUB_POOL_HEAD.facts`, text-wrap: balance). At 320 Swahili's first fact broke greedily and stranded its
 * kept run alone ("Inagawanywa sawa kwa kila tiketi" / "ya 10/10": a quarter of the line above). Lines are found from the
 * glyphs' own boxes (each character's rect, grouped by its line's centre).
 */
async function ruleChecks(page, label) {
  const facts = await page.evaluate(() => {
    const rule = document.querySelector('[data-testid="millionea-hub-jackpot"] [data-head="rule"]');
    if (!rule) return null;
    const out = [];
    for (const fact of rule.querySelectorAll(".kp-mln-fact")) {
      const glyphs = [];
      const walk = document.createTreeWalker(fact, NodeFilter.SHOW_TEXT);
      const range = document.createRange();
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (n.parentElement?.closest(".sr-only")) continue;
        const text = n.textContent ?? "";
        for (let i = 0; i < text.length; i++) {
          if (/\s/.test(text[i])) continue;
          range.setStart(n, i); range.setEnd(n, i + 1);
          const r = range.getClientRects()[0];
          if (r && r.width > 0) glyphs.push({ ch: text[i], left: r.left, right: r.right, mid: (r.top + r.bottom) / 2 });
        }
      }
      const lines = [];
      for (const g of glyphs.sort((a, b) => a.mid - b.mid)) {
        const line = lines.find((l) => Math.abs(l.mid - g.mid) < 6);
        if (line) { line.left = Math.min(line.left, g.left); line.right = Math.max(line.right, g.right); }
        else lines.push({ mid: g.mid, left: g.left, right: g.right });
      }
      if (lines.length < 2) continue;
      const widths = lines.map((l) => Math.round(l.right - l.left));
      out.push({ widths, ratio: Math.min(...widths) / Math.max(...widths) });
    }
    return out;
  });
  if (!facts || facts.length === 0) return;
  ok(`${label} · the jackpot's rule: each fact that wraps inside itself is balanced, no line under half its longest (${facts.map((f) => j(f.widths)).join(" ")})`,
    facts.every((f) => f.ratio >= 0.5), j(facts));
}

/**
 * M5: the week's state is the register's one chip (`WeekStateChip`, the lead's ruling) in the page head's eyebrow, beside
 * the week it qualifies — its word the state's, its ink its tone's (status-tone: royal while the week runs, slate while
 * sales are paused), never the eyebrow's subtle ink; on the week word's line wherever the two fit on one.
 */
async function stateWordChecks(page, label, locale, word, tone = "royal") {
  const s = await page.evaluate(() => {
    const w = document.querySelector('[data-testid="millionea-hub"] [data-testid="millionea-week-state"]');
    // The tones' inks are status-tone's own (the chip's `pending` and `neutral` faces: --brand-300, --text-muted), probed the
    // way the chip sets them (its inline `color: var(--…)`), so both read back in ONE serialisation: a utility class can
    // serialise the same ink in another space (oklab against the token's lab) and never compare equal.
    const probe = (token) => { const p = document.createElement("span"); p.style.color = `var(${token})`; document.body.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    if (!w) return null;
    const cs = getComputedStyle(w), r = w.getBoundingClientRect();
    const week = w.previousElementSibling?.getBoundingClientRect() ?? null;
    const sameLine = !!week && r.top < week.bottom && week.top < r.bottom;
    return {
      text: w.textContent, color: cs.color, border: cs.borderTopWidth, royal: probe("--brand-300"), slate: probe("--text-muted"), subtle: probe("--text-subtle"),
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

/**
 * §T5 (the lead's round-2 ruling): every numeral in a Millionea fact line is a `.mono` numeral — a money figure an
 * `.amount` whole, a time's clock a `.mono` numeral beside its weekday in the body face (L7). The census reads every visible
 * text node holding a digit in the hub and its calm bars and asks its face (the numerals' family, `--font-mono`, which
 * `.mono` and `.amount` both set). Not a fact line, so never counted: a heading in the display face (the ruling's own
 * exception) and a question's own words (the officer's text, the question as written). What another lane draws inside
 * the hub is printed for its owner, never asserted here.
 */
const T5_THEIRS = [
  ['a[href^="/millionea/tickets/"]', "TICKETS (the held row)"],
  ['[data-testid="millionea-hub-ledger"]', "REGISTER (the one ledger's rows)"],
  ['[data-testid="millionea-hub-break"]', "PLATFORM (the break notice)"],
  ['[data-testid="millionea-week-state"]', "REGISTER (the week chip)"],
  // ⚠️ The no-week empty state's body left this list with S5-R2-HUB 6 (the merge's wiring): the hub draws it as Millionea's
  // own empty state (`MaswaliEmptyState`, the kit's opt-in numeral part), so its numerals are the hub's own line's.
];
const t5Elsewhere = new Map();
async function t5Checks(page, label) {
  const found = await page.evaluate((theirs) => {
    // The FACE a numeral is drawn in is the first family of its computed list: `.mono` (var(--font-mono)) and Tailwind's
    // `font-mono` (var(--font-mono) and the same face's fallbacks after it) both draw JetBrains Mono, but their lists are
    // spelled differently — compared whole, every `font-mono` eyebrow and row number read as "bare" (run a, 2026-10-22).
    const face = (el) => (getComputedStyle(el).fontFamily.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
    const probe = document.createElement("span");
    probe.className = "mono";
    document.body.appendChild(probe);
    const mono = face(probe);
    probe.remove();
    const roots = ["millionea-hub", "millionea-hub-notices", "millionea-hub-close-moved", "millionea-hub-final-ahead", "millionea-preview-mark"]
      .map((id) => document.querySelector(`[data-testid="${id}"]`)).filter(Boolean);
    const out = [];
    for (const root of roots) {
      const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!/\d/.test(n.textContent ?? "")) continue;
        const el = n.parentElement;
        if (!el || el.closest(".sr-only") || !el.checkVisibility({ visibilityProperty: true })) continue;
        if (face(el) === mono) continue;
        if (el.closest("h1, h2, h3") || el.closest("li[data-slot] .text-pretty")) continue;
        const owner = theirs.find(([sel]) => el.closest(sel))?.[1] ?? null;
        out.push({ owner, where: el.closest("[data-testid]")?.getAttribute("data-testid") ?? "?", text: (n.textContent ?? "").trim().slice(0, 60), line: (el.textContent ?? "").trim().slice(0, 90) });
      }
    }
    return out;
  }, T5_THEIRS);
  const mine = found.filter((f) => !f.owner);
  ok(`${label} · §T5 every numeral of the hub's own lines is set in the numerals' face (${mine.length} bare)`, mine.length === 0, j(mine.slice(0, 4)));
  for (const f of found.filter((x) => x.owner)) {
    const k = `${f.owner} · ${f.where}: "${f.text}" in "${f.line}"`;
    if (!t5Elsewhere.has(k)) t5Elsewhere.set(k, label);
  }
}

/** The one ledger (REGISTER's `MaswaliLedger`, the lead's ruling): a row's note on its own full-width line, under its
 *  label and its figure. Read wherever the hub draws its ledger; the rows that carry a note are printed. */
const notesSeen = new Map();
async function noteChecks(page, label) {
  const rows = await page.evaluate(() => [...document.querySelectorAll('[data-testid="millionea-hub-ledger"] [data-ledger-row]')].map((r) => {
    const b = (el) => { const x = el.getBoundingClientRect(); return { left: Math.round(x.left), right: Math.round(x.right), top: Math.round(x.top), bottom: Math.round(x.bottom) }; };
    const head = r.firstElementChild ? b(r.firstElementChild) : null;
    const note = r.children.length > 1 ? b(r.lastElementChild) : null;
    return { key: r.getAttribute("data-ledger-row"), head, note, words: r.children.length > 1 ? (r.lastElementChild.textContent ?? "").trim().slice(0, 70) : null };
  }));
  const noted = rows.filter((r) => r.note && r.head);
  for (const r of noted) if (!notesSeen.has(r.key)) notesSeen.set(r.key, `${label}: "${r.words}"`);
  if (noted.length === 0) return;
  ok(`${label} · the one ledger: each row's note stands on its own line, the row's whole width, under its label and its figure (${noted.map((r) => r.key).join(", ")})`,
    noted.every((r) => Math.abs(r.note.left - r.head.left) <= 1 && Math.abs(r.note.right - r.head.right) <= 1 && r.note.top >= r.head.bottom - 1), j(noted));
}

/**
 * PLATFORM D15 (the lead's ruling): at rest over a line of text or a figure, the chat bubble yields to
 * `--state-yield-opacity` (.50) — still live, never moved. On a phone, before each tile, the bubble is woken (a scroll: D3
 * and D75's own wake) and the page let rest; then this drive's own census — not the product's — asks what lies under the
 * bubble's resting ink (its box, its ring at its widest), and the bubble must stand at .50 over it, whole over nothing.
 */
const yieldSeen = [];
async function yieldCheck(page, label) {
  await page.evaluate(() => window.dispatchEvent(new Event("scroll")));
  await page.waitForTimeout(700);
  const y = await page.evaluate(() => {
    const fab = document.querySelector(".cm-fab");
    if (!fab) return null;
    const root = document.documentElement;
    const away = root.hasAttribute("data-scrolling") || root.hasAttribute("data-fab-idle") || fab.classList.contains("cm-fab--open");
    const b = (fab.querySelector(".cm-bubble") ?? fab).getBoundingClientRect();
    const tf = getComputedStyle(fab).transform;
    const m = tf && tf !== "none" ? new DOMMatrixReadOnly(tf) : null;
    const dx = m ? m.e : 0, dy = m ? m.f : 0;
    const past = (side) => (side / 2 + 3) * 1.08 - side / 2;
    const ink = { left: b.left - dx - past(b.width), right: b.right - dx + past(b.width), top: b.top - dy - past(b.height), bottom: b.bottom - dy + past(b.height) };
    const meets = (r) => r.left < ink.right && r.right > ink.left && r.top < ink.bottom && r.bottom > ink.top;
    const under = [];
    const skip = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME", "SELECT", "TEXTAREA", "INPUT"]);
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      const el = n.parentElement;
      if (!el || !(n.textContent ?? "").trim() || fab.contains(el) || el.closest("#needle-root") || skip.has(el.tagName)) continue;
      range.selectNodeContents(n);
      if (![...range.getClientRects()].some((r) => r.width > 1 && r.height > 1 && meets(r))) continue;
      if (!el.checkVisibility({ visibilityProperty: true, opacityProperty: true })) continue;
      under.push({ text: (n.textContent ?? "").trim().slice(0, 40), figure: !!el.closest(".amount, .mono"), where: el.closest("[data-testid]")?.getAttribute("data-testid") ?? "?" });
    }
    return { away, marked: fab.hasAttribute("data-over-content"), opacity: Number(getComputedStyle(fab).opacity), ink: { top: Math.round(ink.top), left: Math.round(ink.left) }, under };
  });
  if (!y) return;
  if (y.away) { console.log(`INFO D15 ${label} · the bubble is away (moving or idle): nothing to yield`); return; }
  if (y.under.length > 0) {
    ok(`${label} · D15 the chat bubble yields to .50 over what lies under it`, y.marked && Math.abs(y.opacity - 0.5) < 0.02, j(y));
    const figures = y.under.filter((u) => u.figure).map((u) => `${u.where}: ${u.text}`);
    yieldSeen.push(`${label} — ${figures.length ? `figures ${figures.join(" | ")}` : `text "${y.under[0].text}"`} (opacity ${y.opacity})`);
  } else {
    ok(`${label} · D15 over nothing the chat bubble stands whole`, !y.marked && y.opacity === 1, j(y));
  }
}

if (RUN === "a") {
  // ── S1 · an open week, signed in, holding a ticket (a losing slip, so the week can roll over later) ────────────────────
  await act({ act: "tickets", n: 1, lose: true });
  // Two more players, one per other language, with a ticket each: their once-per-week notices are unseen later (S11) — and
  // three for the carry's flight (H6): one read on a phone, one on a tall desktop, and one whose flight a render meets
  // mid-air (S5-R2-HUB 6). `at`: when each was signed in — a returning player's session was last seen ≥ 5 minutes before.
  const players = {};
  for (const l of ["en", "zh", "phone", "desk", "flight"]) {
    const ctx = await readerContext([]);
    const p = await act({ act: "player", tickets: 1, lose: true }, ctx); // signed in through this context's cookie
    players[l] = { ctx, id: p.userId, at: Date.now() };
  }
  // L7 (round 2) · the drawing's three readers (the lead's three states): holding no ticket, one, and five (three rows and
  // "See all"), bought now so each row is past its free cancel (five minutes) when the drawing is measured.
  const holders = {};
  for (const [k, n] of [["none", 0], ["one", 1], ["many", 5]]) {
    const ctx = await readerContext([]);
    await act({ act: "player", tickets: n, lose: true }, ctx);
    holders[k] = ctx;
  }
  // L5 (round 2) · the doors to the register — the grading week's facts and the ledger's carry, the one still waiting on its
  // week too — each open a page that answers: REGISTER's H2 draws a public week from the moment it opens. Asked once per
  // address (a page answers the same at every width).
  const answered = new Map();
  const doorsAnswer = async (page, label) => {
    const hrefs = await page.evaluate(() => [
      ["grading", document.querySelector('[data-testid="millionea-hub-grading-door"]')?.getAttribute("href") ?? null],
      ["carry", document.querySelector('[data-testid="millionea-hub-ledger"] a[data-ledger-row="in"]')?.getAttribute("href") ?? null],
    ]);
    for (const [what, href] of hrefs) {
      if (!href) continue;
      if (!answered.has(href)) answered.set(href, (await page.request.get(`${BASE}${href}`, { timeout: 120_000 })).status());
      ok(`${label} · L5 the ${what === "grading" ? "grading week's door" : "ledger's carry"} opens its register page (${href} answers ${answered.get(href)})`,
        /^\/millionea\/register\/MLN-/.test(href) && answered.get(href) === 200, `${href} ${answered.get(href)}`);
    }
    return hrefs;
  };
  const openCheck = async (page, label, locale, width) => {
    await openWeekChecks(page, label, locale, width);
    await stateWordChecks(page, label, locale, t.open);
    ok(`${label} · the reader's ticket row is drawn`, (await page.getByTestId("millionea-hub-mine").count()) === 1);
    ok(`${label} · M2 the head's two doors are drawn`, (await page.getByTestId("millionea-hub-doors").locator("a").count()) === 2);
    const hrefs = await doorsAnswer(page, label);
    ok(`${label} · L5 the week being graded beside this one has its register door`, !!hrefs[0][1], j(hrefs));
  };
  await shoot("open", "classic", demoClassic, { check: openCheck });
  await shoot("open", "journey", demoJourney, { check: openCheck });

  // ── L4 + L20 (round 2) · a ticket just bought: its row named for what it opens, lifting as the kit's raised card, and its
  // free cancel said while the window is open (TICKETS' row; the window is five minutes, so each view is a fresh page).
  if (want("cancel")) {
    const buyer = await readerContext([]);
    await act({ act: "player", tickets: 1, lose: true }, buyer);
    for (const [locale, width] of [["sw", 320], ["sw", 360], ["en", 360], ["zh", 360], ["sw", 1280]]) {
      const label = `cancel · classic · ${locale} @${width}`;
      await setLocale(buyer, locale);
      const page = await buyer.newPage();
      page.on("pageerror", (e) => errs.push(`${label}: ${e}`));
      await page.setViewportSize({ width, height: HEIGHT });
      const res = await open(page, "/millionea");
      await baseChecks(page, label, locale, res);
      await t5Checks(page, label);
      if (locale === "zh") await zhScan(page, label);
      const row = await page.evaluate(() => {
        const a = document.querySelector('[data-testid="millionea-hub-mine"] a[href^="/millionea/tickets/"]');
        if (!a) return null;
        const serial = a.querySelector(".font-mono")?.textContent ?? "";
        return { label: a.getAttribute("aria-label"), serial, href: a.getAttribute("href"), cls: a.className, timer: a.querySelector('[role="timer"]')?.textContent ?? null, line: a.querySelector("time")?.parentElement?.textContent ?? null };
      });
      ok(`${label} · L4 the held row is named for what it opens ("${row?.label}") and lifts as the kit's raised card`,
        !!row?.label && !!row.serial && row.label.endsWith(` · ${row.serial}`) && row.label.length > row.serial.length + 3 && /\bmat-raised-i\b/.test(row.cls), j(row));
      ok(`${label} · L20 inside its free-cancel window the row says so, with its count ("${row?.line}")`, !!row?.timer && /^\d+:\d{2}$/.test(row.timer), j(row));
      await page.evaluate(() => document.querySelector('[data-testid="millionea-hub-mine"]')?.scrollIntoView({ block: "center" }));
      if (width <= YIELD_AT) await yieldCheck(page, label);
      else await page.waitForTimeout(250);
      await page.screenshot({ path: `${OUT}/cancel-classic-${locale}-${width}.png` });
      await page.close();
    }
  }

  // ── L7 · THE LOADING DRAWING IS THE HUB'S INVARIANT FRAME (round 2: the lead's ruling on R1-hub's loading row) ──────────
  // A move to the hub from How to play, its answer slowed (the network throttled, so the route's drawing paints while the
  // page streams): each band's box in the drawing, then in the page — the head's title, the strip, the jackpot's head, the
  // door's block, the pool's ledger, the reader's own block, the questions and their first three rows (`ghostSwap`). Both
  // compose one frame (`hub-frame.ts`), so above and beside the reader's own block nothing may move; that block — last in
  // the buy column, its height the reader's — starts where it was drawn and is replaced in place.
  const BANDS = (ghost) => {
    const box = (el) => { if (!el || el.getClientRects().length === 0) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top + window.scrollY), height: Math.round(r.height) }; };
    // S5-R2-HUB · the head's two pills (their place and width) and the first ten question rows' tops (a row 1px taller carried
    // 1px a row down the list: 15px by the fifteenth, the tile read at 1280).
    const span = (el) => { const r = el.getBoundingClientRect(); return { left: Math.round(r.left), width: Math.round(r.width) }; };
    const tops = (els) => els.slice(0, 10).map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY));
    // S5-R2-HUB · G2 · the eyebrow's week word and its state chip (the chip's whole box), and the questions' heading — on the
    // page its words' own extent (a Range: the heading is a block across the column), in the drawing its bar.
    const chipBox = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top + window.scrollY), width: Math.round(r.width), height: Math.round(r.height) }; };
    const eyebrowOf = (word, chip) => (word && chip ? { word: span(word), chip: chipBox(chip) } : null);
    const wordsOf = (el) => { if (!el) return null; const r = document.createRange(); r.selectNodeContents(el); const b = r.getBoundingClientRect(); return { left: Math.round(b.left), width: Math.round(b.width) }; };
    if (ghost) {
      const g = document.querySelector('[aria-busy="true"]');
      if (!g) return null;
      const q = (n) => g.querySelector(`[data-ghost="${n}"]`);
      const rowEls = [...(q("questions")?.lastElementChild?.children ?? [])];
      // The eyebrow's row: the head's eyebrow line (the element before the title), its first item the word, its last the chip.
      const row = g.querySelector("h1")?.previousElementSibling?.lastElementChild ?? null;
      const headingBar = q("questions")?.firstElementChild?.firstElementChild ?? null;
      return { title: box(g.querySelector("h1")), strip: box(q("strip")), jackpot: box(q("jackpot")), door: box(q("door")), ledger: box(q("ledger")), mine: box(q("mine")), questions: box(q("questions")),
        rows: rowEls.slice(0, 3).map(box), rowTops: tops(rowEls), doors: [...(q("doors")?.children ?? [])].map(span),
        eyebrow: eyebrowOf(row?.firstElementChild ?? null, row && row.children.length > 1 ? row.lastElementChild : null), heading: headingBar ? span(headingBar) : null,
        // Each ledger row's height (the drawing's rows in the list's order, as the page's `[data-ledger-row]`s).
        ledgerRows: [...(q("ledger")?.firstElementChild?.children ?? [])].map((el) => Math.round(el.getBoundingClientRect().height)) };
    }
    const h = document.querySelector('[data-testid="millionea-hub"]');
    const q = (n) => document.querySelector(`[data-testid="${n}"]`);
    const rowEls = [...document.querySelectorAll('[data-testid="millionea-hub-questions"] li[data-slot]')];
    // The head's chip is the page's first (the graded week's own chip stands in the buy column, after the head).
    const chip = h?.querySelector('[data-testid="millionea-week-state"]') ?? null;
    return { title: box(h?.querySelector("h1")), strip: box(q("millionea-week-strip")), jackpot: box(q("millionea-hub-jackpot")), door: box(q("millionea-hub-buy")),
      ledger: box(q("millionea-hub-ledger")), mine: box(q("millionea-hub-mine")), questions: box(q("millionea-hub-questions")),
      rows: rowEls.slice(0, 3).map(box), rowTops: tops(rowEls), doors: [...document.querySelectorAll('[data-testid="millionea-hub-doors"] a')].map(span),
      eyebrow: eyebrowOf(chip?.previousElementSibling ?? null, chip), heading: wordsOf(document.getElementById("mln-questions-h")),
      ledgerRows: [...document.querySelectorAll('[data-testid="millionea-hub-ledger"] [data-ledger-row]')].map((el) => Math.round(el.getBoundingClientRect().height)) };
  };
  /** How many lines the page's wrapping bands take, and the width of each kept run of the strip's ranges — printed (INFO).
   *  ⚠️ HUB-2B: the drawing keeps no table of them any more; it sets these lines as the page's own words, unseen
   *  (`GhostWords`, `hub-page-words.ts`), so they land by construction. The numbers stay a record of the page. */
  const LINES = () => {
    const lines = (el) => { if (!el) return null; const cs = getComputedStyle(el); const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2; return Math.round(el.getBoundingClientRect().height / lh); };
    const head = document.querySelector('[data-testid="millionea-hub-jackpot"]');
    return {
      subtitle: lines(document.querySelector('[data-testid="millionea-hub"] p.italic')),
      rule: lines(head?.querySelector('[data-head="rule"]') ?? null), carry: lines(head?.querySelector('[data-head="carry"]') ?? null),
      floor: lines(document.querySelector('[data-testid="millionea-hub-ledger"] [data-ledger-row="floor"] span.min-w-0')),
      ranges: [...document.querySelectorAll('[data-testid="millionea-week-strip"] li')].map((li) => [...li.querySelectorAll("[data-range] > .whitespace-nowrap")].map((el) => Math.round(el.getBoundingClientRect().width * 10) / 10)),
      // The eyebrow's week word and its state chip (their widths, the chip's height and its label's own width), and what a week
      // of one digit (1–9) does: the word set with one numeral, its width beside the two-digit word the drawing's template is
      // (HUB-2B: the drawing sets "Wiki 00"; a one-digit week lands its chip that much further left, on the same line).
      eyebrow: (() => {
        const chip = document.querySelector('[data-testid="millionea-hub"] [data-testid="millionea-week-state"]');
        const word = chip?.previousElementSibling ?? null;
        const w = (el) => (el ? Math.round(el.getBoundingClientRect().width * 100) / 100 : null);
        const range = document.createRange();
        const text = chip ? [...chip.childNodes].find((n) => n.nodeType === 3 || n.nodeType === 1) : null;
        if (text) range.selectNodeContents(text);
        const cs = word ? getComputedStyle(word) : null;
        let oneDigit = null;
        if (word && /dd/.test(word.textContent ?? "")) {
          const probe = word.cloneNode(true);
          probe.textContent = (word.textContent ?? "").replace(/dd/, "9");
          probe.style.position = "absolute"; probe.style.visibility = "hidden";
          word.parentElement?.append(probe);
          const one = probe.getBoundingClientRect().width, two = word.getBoundingClientRect().width;
          probe.remove();
          oneDigit = { word: probe.textContent, narrower: Math.round((two - one) * 100) / 100 };
        }
        return { word: w(word), chip: w(chip), chipH: chip ? Math.round(chip.getBoundingClientRect().height * 100) / 100 : null, label: text ? Math.round(range.getBoundingClientRect().width * 100) / 100 : null,
          type: cs ? [cs.fontSize, cs.letterSpacing, cs.fontWeight, cs.fontFamily.split(",")[0]] : null, oneDigit };
      })(),
      // The carried-in row (the ledger's door to its week): its height, its label's width (words and chevron) and its
      // value's — where it wraps is the drawing's to follow.
      carryRow: (() => {
        const row = document.querySelector('[data-testid="millionea-hub-ledger"] [data-ledger-row="in"]');
        if (!row) return null;
        const w = (el) => (el ? Math.round(el.getBoundingClientRect().width * 10) / 10 : null);
        return { h: Math.round(row.getBoundingClientRect().height), label: w(row.querySelector(".text-text-link")), value: w(row.querySelector('[data-row="in"]')) };
      })(),
      // The questions' heading: its words' own width (printed; the drawing sets its words, HUB-2B).
      heading: (() => {
        const el = document.getElementById("mln-questions-h");
        if (!el) return null;
        const r = document.createRange();
        r.selectNodeContents(el);
        return { text: el.textContent, width: Math.round(r.getBoundingClientRect().width * 100) / 100 };
      })(),
    };
  };
  /** The drawing's motion: each of its blocks wears the platform's skeleton sweep (`.kp-shimmer-track::after`). */
  const SWEEPS = () => {
    const g = document.querySelector('[aria-busy="true"]');
    if (!g) return null;
    const blocks = [...g.querySelectorAll(".kp-shimmer-track")].filter((el) => el.getClientRects().length > 0);
    const name = (el) => (el ? getComputedStyle(el, "::after").animationName : null);
    return { count: blocks.length, names: [...new Set(blocks.map(name))], bands: ["jackpot", "ledger"].map((n) => name(g.querySelector(`[data-ghost="${n}"]`))) };
  };
  const deltas = (g, r) => Object.fromEntries(["title", "strip", "jackpot", "door", "ledger", "mine", "questions"].flatMap((k) => [
    [k, g[k] && r[k] ? r[k].top - g[k].top : null], [`${k}H`, g[k] && r[k] ? r[k].height - g[k].height : null],
  ]).concat([
    ["rowsH", r.rows.map((x, i) => (x && g.rows[i] ? x.height - g.rows[i].height : null))],
    // The tenth row's top: what each row's height carries down the list.
    ["row10", r.rowTops[9] !== undefined && g.rowTops[9] !== undefined ? r.rowTops[9] - g.rowTops[9] : null],
    ["doors", r.doors.map((x, i) => (g.doors[i] ? { left: x.left - g.doors[i].left, width: x.width - g.doors[i].width } : null))],
    // G2 · the eyebrow (the week's word, the chip's box) and the questions' heading (its left and its width).
    ["eyebrow", g.eyebrow && r.eyebrow ? { word: r.eyebrow.word.width - g.eyebrow.word.width, chipLeft: r.eyebrow.chip.left - g.eyebrow.chip.left,
      chipTop: r.eyebrow.chip.top - g.eyebrow.chip.top, chipWidth: r.eyebrow.chip.width - g.eyebrow.chip.width, chipHeight: r.eyebrow.chip.height - g.eyebrow.chip.height } : null],
    ["heading", g.heading && r.heading ? { left: r.heading.left - g.heading.left, width: r.heading.width - g.heading.width } : null],
    // Each ledger row's height, page − drawing (printed: where a ledger difference comes from).
    ["ledgerRowsH", r.ledgerRows.map((x, i) => (g.ledgerRows[i] !== undefined ? x - g.ledgerRows[i] : null))],
  ]));
  async function ghostSwap(ctx, locale, width, name, { reduced = false } = {}) {
    await setLocale(ctx, locale);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errs.push(`${name}: ${e}`));
    await page.setViewportSize({ width, height: HEIGHT });
    if (reduced) await page.emulateMedia({ reducedMotion: "reduce" });
    await open(page, "/millionea/how");
    // The page's answer is held back while the drawing is measured: Chromium's network slowed (its devtools protocol), and
    // in WebKit — which has none — the move's own request for the hub held at the route (S5-R2-HUB 12) until released.
    let cdp = null, release = () => {};
    if (ENGINE === "chromium") {
      cdp = await ctx.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 12 * 1024, uploadThroughput: 64 * 1024 });
    } else {
      const held = new Promise((done) => { release = done; });
      // Only the move's own request: a prefetch of the hub held here leaves the move waiting on it, and no drawing shows.
      await page.route((url) => url.pathname === "/millionea", async (route) => {
        if (!route.request().headers()["next-router-prefetch"]) await held;
        await route.continue().catch(() => {});
      });
    }
    // The app router's own move (`window.next.router`, what a Link calls): a phone's classic rail has no Millionea tab.
    await page.evaluate(() => { window.next?.router?.push("/millionea"); });
    const drawn = await page.waitForSelector('[aria-busy="true"] [data-ghost="strip"]', { timeout: 20_000 }).then(() => true).catch(() => false);
    // Measured at rest: the route's one entrance (`.route-enter`, 10px up over --t-move) ended — every finite animation
    // done; the shimmer's loops go on. Measured mid-entrance, WebKit's drawing stood 10px low (S5-R2-HUB 12).
    if (drawn) await page.waitForFunction(() => document.getAnimations().every((a) => a.playState !== "running" || !Number.isFinite(a.effect?.getComputedTiming?.().endTime ?? Infinity)), null, { timeout: 3_000 }).catch(() => {});
    const ghost = drawn ? await page.evaluate(BANDS, true) : null;
    const sweep = drawn ? await page.evaluate(SWEEPS) : null;
    if (drawn) await page.screenshot({ path: `${OUT}/${name}.png` });
    if (cdp) await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    else { release(); await page.unrouteAll({ behavior: "ignoreErrors" }).catch(() => {}); }
    await page.waitForSelector('[data-testid="millionea-hub"]', { timeout: 60_000 }).catch(() => {});
    await page.waitForTimeout(800);
    const real = await page.evaluate(BANDS, false);
    const lines = await page.evaluate(LINES);
    const viewer = await page.evaluate(() => document.getElementById("main-content")?.getAttribute("data-viewer") ?? null);
    await page.screenshot({ path: `${OUT}/${name.replace(/^ghost-/, "ghost-landed-")}.png` });
    await page.close();
    return { drawn, ghost, real, lines, sweep, viewer };
  }
  // While last week's carry is still pending (the seed's week at this point), the jackpot's head says so in one more line
  // ("plus Week 47's carry-over once it is final", §M8a item 9) — a week's state the wordless drawing does not know: it
  // draws the common week, its carry landed. Printed, with the bands above the head held exact.
  if (want("ghost")) {
    for (const width of [360, 1280]) {
      const label = `ghost · carry pending · one ticket · classic · sw @${width}`;
      const m = await ghostSwap(holders.one, "sw", width, `ghost-pending-classic-sw-${width}`);
      ok(`${label} · L7 the route's loading drawing is shown on the way in`, m.drawn && !!m.ghost && !!m.real);
      if (m.ghost && m.real) {
        const off = deltas(m.ghost, m.real);
        console.log(`INFO L7 ${label} · page − drawing, px: ${j(off)} · the page's lines ${j(m.lines)}`);
        ok(`${label} · the bands above the jackpot's head land where drawn (±1px: title ${off.title}, strip ${off.strip}, jackpot ${off.jackpot})`,
          ["title", "strip", "jackpot"].every((k) => Math.abs(off[k] ?? 99) <= 1), j(off));
      }
    }
  }

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
  // Losing slips, as every ticket of this week: the week must roll over for S11's notices and the carry (a 10/10 here
  // left Week 49 won, and S11 had no rollover to show).
  if (want("break")) {
    const brk = await readerContext([]);
    await act({ act: "breakPlayer", tickets: 2, lose: true }, brk);
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

  // ── M8 (R1-motion) · the last hour: the countdown pill (the SLIP lane's) stands in the close line, its place reserved
  // there — beside the close it counts down to, under the door, never above it, and the line never grows a second one.
  // ⚠️ The seed's weeks are dated ahead of the real clock (a close can never move before its own open), so no real last
  // hour exists on this store: the pill is drawn by its own recipe (SLIP's compact `MaswaliClosingPill`: the hourglass,
  // "59" and the language's minute unit — its widest count) into the close line, and the line is measured with it and
  // without it. The line makes its room by its own rule (`.kp-mln-close:has(.closing-pill)`: the close is today, so its
  // weekday steps aside while the pill counts down to it).
  if (want("closing")) {
    // A reader the fill door is for (the demo player is at the cap by now): a new player holding one ticket.
    const closer = await readerContext([]);
    await act({ act: "player", tickets: 1, lose: true }, closer);
    const closerJ = await readerContext([...(await closer.cookies(BASE)).filter((c) => c.name === SESSION_COOKIE), pass_]);
    const UNIT = { en: "Min", sw: "Dak", zh: "分" };
    const closingCheck = async (page, label, locale) => {
      const g = await page.evaluate((unit) => {
        const at = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), right: Math.round(b.right) }; };
        const row = document.querySelector('[data-testid="millionea-hub-close"]');
        if (!row) return null;
        const before = at(row), door = at(document.querySelector('[data-testid="millionea-hub-fill"]'));
        // What stands under the buy block: the block after the pinned pair (below 1024 the pair's wrapper is `contents`, so the
        // buy block, its last child, has no sibling of its own — the ledger reads on after the wrapper).
        const next = document.querySelector("[data-testid='millionea-hub-pinned']")?.nextElementSibling ?? null;
        const nextBefore = at(next);
        const pill = document.createElement("span");
        pill.className = "closing-pill inline-flex items-center whitespace-nowrap rounded-full border text-body-sm tabular-nums h-5 gap-1 px-1.5";
        pill.innerHTML = `<svg width="12" height="12" aria-hidden="true" class="shrink-0"></svg>59 ${unit}`;
        row.appendChild(pill);
        const after = { row: at(row), text: at(row.querySelector("p")), pill: at(pill), next: at(next) };
        pill.remove();
        return { before, door, nextBefore, ...after };
      }, UNIT[locale]);
      const oneLine = !!g?.pill && !!g.text && Math.abs((g.pill.top + g.pill.bottom) / 2 - (g.text.top + g.text.bottom) / 2) <= 3;
      ok(`${label} · M8 the pill stands in the close line, beside the close — the line does not grow (${g?.before ? g.before.bottom - g.before.top : "?"} → ${g?.row ? g.row.bottom - g.row.top : "?"}px)`,
        oneLine && !!g.before && !!g.row && g.row.bottom - g.row.top === g.before.bottom - g.before.top, j(g));
      ok(`${label} · M8 nothing under the close line moves when the pill arrives, and the pill stands under the door`,
        !!g?.pill && !!g.door && g.pill.top >= g.door.bottom && (g.nextBefore === null || g.next === null || g.next.top === g.nextBefore.top), j(g));
    };
    await shoot("closing", "classic", closer, { check: closingCheck });
    await shoot("closing", "journey", closerJ, { check: closingCheck, matrix: { sw: [360, 1280] } });
  }

  // ── S7–S10 · the week on sale closes, its results come in, its window opens, it settles ─────────────────────────────────
  // The seed leaves its earlier weeks graded but unsettled; settlement runs strictly in order (MR-3), so they settle first.
  await act({ act: "catchUp" });

  // ── L7 · THE SWAP, IN THE WEEK'S COMMON SHAPE (its earlier weeks settled: the carry landed, no week being graded) ─────────
  // The lead's three states — a reader holding no ticket, one, many — at 360 and 1280, and the one-ticket reader at every
  // width in every language (the drawing's per-language line table). Above and beside the reader's own block every band
  // lands exactly where it was drawn (top and height ±1px), from 1024 the questions' column too; the reader's block starts
  // where it was drawn. A guest is drawn a guest's door where the shell marks one (`main[data-viewer="guest"]`, the
  // journey's); the classic shell marks no guest, so there a guest's door is printed beside the player's it was drawn as.
  if (want("ghost")) {
    const oneJ = await readerContext([...(await holders.one.cookies(BASE)).filter((c) => c.name === SESSION_COOKIE), pass_]);
    const views = [
      ...["sw", "en", "zh"].flatMap((locale) => WIDTHS.map((width) => ["one", holders.one, "classic", locale, width])),
      ...[360, 1280].flatMap((width) => [["none", holders.none, "classic", "sw", width], ["many", holders.many, "classic", "sw", width], ["guest", guestClassic, "classic", "sw", width]]),
      ["one", oneJ, "journey", "sw", 360], ["guest", guestJourney, "journey", "sw", 360], ["one", holders.one, "classic", "sw", 360, true],
    ];
    for (const [reader, ctx, shell, locale, width, reduced = false] of views) {
      const label = `ghost · ${reader} · ${shell} · ${locale} @${width}${reduced ? " · reduced motion" : ""}`;
      const m = await ghostSwap(ctx, locale, width, `ghost-${reader}-${shell}-${locale}-${width}${reduced ? "-rm" : ""}`, { reduced });
      ok(`${label} · L7 the route's loading drawing is shown on the way in`, m.drawn && !!m.ghost && !!m.real);
      if (!m.ghost || !m.real) continue;
      const off = deltas(m.ghost, m.real);
      console.log(`INFO L7 ${label} · page − drawing, px: ${j(off)} · the page's lines ${j(m.lines)} · viewer ${m.viewer}`);
      const guestUnmarked = reader === "guest" && m.viewer !== "guest";
      const frame = guestUnmarked ? ["title", "titleH", "strip", "stripH", "jackpot", "jackpotH"] : ["title", "titleH", "strip", "stripH", "jackpot", "jackpotH", "door", "doorH", "ledger", "ledgerH"];
      ok(`${label} · L7 the frame lands where it was drawn (±1px: ${frame.map((k) => `${k} ${off[k]}`).join(", ")})`, frame.every((k) => off[k] !== null && Math.abs(off[k]) <= 1), j({ off, ghost: m.ghost, real: m.real }));
      // S5-R2-HUB · the head's two pills, each as wide as its label (`DOOR_LABELS`): the second jumped 31px at sw 360.
      ok(`${label} · L7 the head's two doors stand where they were drawn (±1px: ${j(off.doors)})`,
        off.doors.length === 2 && off.doors.every((d) => !!d && Math.abs(d.left) <= 1 && Math.abs(d.width) <= 1), j({ ghost: m.ghost.doors, real: m.real.doors }));
      // S5-R2-HUB · G2 (the tile readers: on landing the state's chip jumped ~23px left in zh, 4–6px in en/sw; the questions'
      // heading was one English bar in every language, ~60px past "Maswali ya wiki", ~130px past "本周题目").
      ok(`${label} · G2 the eyebrow lands where it was drawn — the week's word as wide as its bar, the chip's box where its bar stood (±1px: ${j(off.eyebrow)})`,
        !!off.eyebrow && Object.values(off.eyebrow).every((x) => Math.abs(x) <= 1), j({ ghost: m.ghost.eyebrow, real: m.real.eyebrow }));
      ok(`${label} · G2 the questions' heading lands where it was drawn — its words as wide as their bar (±1px: ${j(off.heading)})`,
        !!off.heading && Math.abs(off.heading.left) <= 1 && Math.abs(off.heading.width) <= 1, j({ ghost: m.ghost.heading, real: m.real.heading }));
      if (reader === "guest") {
        if (guestUnmarked) console.log(`INFO L7 ${label} · the classic shell marks no guest: the guest's door stands ${off.doorH}px taller than the player's door it was drawn as, and the ledger lands ${off.ledger}px lower`);
        else ok(`${label} · L7 a marked guest is drawn no block of tickets, as the page draws none`, m.ghost.mine === null && m.real.mine === null, j({ ghost: m.ghost.mine, real: m.real.mine }));
      } else {
        ok(`${label} · L7 the reader's own block starts where it was drawn, last in the buy column (${off.mine}px)`, off.mine !== null && Math.abs(off.mine) <= 1, j({ ghost: m.ghost.mine, real: m.real.mine, ledger: m.real.ledger }));
      }
      if (width >= 1024) {
        ok(`${label} · L7 the questions' column stands where it was drawn, its rows as tall (top ${off.questions}, rows ${j(off.rowsH)})`,
          off.questions !== null && Math.abs(off.questions) <= 1 && off.rowsH.length === 3 && off.rowsH.every((x) => x !== null && Math.abs(x) <= 1), j({ ghost: m.ghost.rows, real: m.real.rows }));
        // A pixel a row is fifteen by the list's end: the tenth row stands where it was drawn.
        ok(`${label} · L7 the tenth question row stands where it was drawn (${off.row10}px)`, off.row10 !== null && Math.abs(off.row10) <= 1, j({ ghost: m.ghost.rowTops, real: m.real.rowTops }));
      }
      // MOTION: every block of the drawing sweeps with the platform's skeleton shimmer; under reduced motion none moves (the
      // still bar is the end state).
      const still = reduced ? "none" : "kp-shimmer";
      ok(`${label} · L7 every block of the drawing ${reduced ? "stands still" : "sweeps with the platform's shimmer"} (${m.sweep?.count} blocks: ${j(m.sweep?.names)})`,
        !!m.sweep && m.sweep.count >= 10 && j(m.sweep.names) === j([still]) && m.sweep.bands.every((n) => n === still), j(m.sweep));
    }
  }

  await act({ act: "closeOpen" });
  const closedCheck = (word) => async (page, label, locale) => {
    ok(`${label} · after the close the door follows the results`, (await page.getByTestId("millionea-hub-follow").count()) === 1);
    if (word) await stateWordChecks(page, label, locale, word);
    // S5-R2-HUB · a closed week's held rows stand under their own label (the tile read: under the ledger, unlabelled, they
    // read as more of the ledger), the tickets page's own title.
    const mine = await page.evaluate(() => { const m = document.querySelector('[data-testid="millionea-hub-mine"]'); return m ? (m.firstElementChild?.tagName === "P" ? m.firstElementChild.textContent : "") : null; });
    if (mine !== null) ok(`${label} · the reader's held rows stand under their label ("${mine}")`, mine === { en: "Your tickets", sw: "Tiketi zako", zh: "您的彩票" }[locale], j(mine));
  };
  await shoot("closed", "classic", demoClassic, { check: closedCheck({ en: "Sales closed", sw: "Imefungwa", zh: "已截止" }) });
  await shoot("closed", "journey", demoJourney, { check: closedCheck(null), matrix: { sw: [360, 1280] } });
  await act({ act: "seal", slots: [1, 2, 3, 4, 5], outcome: "YES" });
  await shoot("resolving", "classic", demoClassic, {
    check: async (page, label, locale) => {
      await closedCheck(null)(page, label, locale);
      const live = await page.getByTestId("millionea-hub-facts").textContent().catch(() => "");
      // Each fact of the line opens in its own capital since TICKETS' 96e5e9a94 ("… · Next event Saturday 14:00").
      if (locale === "en") ok(`${label} · L12 the next event is said after the results count`, /5 of 15 results in · .*\bnext event\b/i.test(live ?? ""), j(live));
      if (locale === "zh") ok(`${label} · L8 zh says the count as 已公布 n/15 个结果`, /已公布 5\/15 个结果/.test(live ?? ""), j(live));
    },
  });
  // ── M11 / R1-motion L2 · a result that arrives while the reader looks presses once; the first paint presses nothing ─────
  // The reader's page stays open while two results are sealed; the page's own refresh (the poller's event) brings them in.
  const early = want("press") ? [6, 7] : [];
  if (want("press")) {
    await setLocale(demoClassic, "en");
    const page = await demoClassic.newPage();
    page.on("pageerror", (e) => errs.push(`press: ${e}`));
    await page.setViewportSize({ width: 1280, height: 1400 });
    await open(page, "/millionea");
    const atLoad = await page.locator("[data-pressed]").count();
    ok("press · classic · en @1280 · M11 opening the hub presses nothing (five results already in)", atLoad === 0, `pressed at load: ${atLoad}`);
    await act({ act: "seal", slots: early, outcome: "YES" });
    await page.evaluate(() => window.dispatchEvent(new Event("50pick:refresh")));
    await page.waitForSelector('[data-slot="7"] [data-pressed]', { timeout: 20_000 }).catch(() => {});
    const pressed = await page.evaluate(() => [...document.querySelectorAll("[data-pressed]")].map((el) => Number(el.closest("[data-slot]")?.getAttribute("data-slot"))));
    const steps = await page.evaluate(() => [...document.querySelectorAll("[data-pressed] .maswali-attest")].map((el) => getComputedStyle(el).getPropertyValue("--i").trim()));
    ok("press · classic · en @1280 · M11 the two results that arrived press, in slot order, and only they", j(pressed) === j(early) && j(steps) === j(["0", "1"]), j({ pressed, steps }));
    await page.screenshot({ path: `${OUT}/press-classic-en-1280.png` });
    await page.close();
  }
  await act({ act: "seal", slots: [6, 7, 8, 9, 10, 11, 12, 13, 14, 15].filter((s) => !early.includes(s)), outcome: "YES" });
  await shoot("objections", "classic", demoClassic, { check: closedCheck({ en: "Objection window", sw: "Dirisha la pingamizi", zh: "异议窗口" }) });
  await act({ act: "window", open: false });
  await shoot("settling", "classic", demoClassic, { check: closedCheck({ en: "Settling", sw: "Inakamilishwa", zh: "待结算" }) });
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
    await shoot("noweek-paused", "classic", guestClassic, { check: noWeekCheck(true) });
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
    await shoot("after", "classic", demoClassic, { check: afterCheck, oneView: true, matrix: { sw: WIDTHS } });
    await shoot("after", "classic", players.en.ctx, { check: afterCheck, oneView: true, matrix: { en: WIDTHS } });
    await shoot("after", "journey", (await readerContext([...(await players.zh.ctx.cookies(BASE)).filter((c) => c.name === SESSION_COOKIE), pass_])), { check: afterCheck, oneView: true, matrix: { zh: WIDTHS } });
  }
  // ── H6/M7 · the carry plays only with both ends in view (the shared MaswaliCarry): a reader on a phone — the ledger far
  // below the notice — sees no flight; on a tall desktop both ends stand in view and the figure lands, its origin settling
  // in once the token has left it. Each reader's first view, the rollover notice unseen. The ends are measured on boxes a
  // flight never moves (the row's own span, the notice's figure).
  if (want("after")) {
    // ⭐ S5-R2-HUB 6–9 · WHY THE CARRY NEVER PLAYED (heavy-c5's red at sw 1920×1440, and every run on GitHub's runner: both
    // ends in view, and after load the origin read "amount" — no flight, no settle). MEASURED (S5-R2-HUB 8's record of the
    // carry's own measurement): the destination box was [1371, 679, 80, 0] — 0px tall. The frame sets the ledger's figures
    // to line-height 0 (hub-frame.ts NUMERALS, S5-R2-HUB 3: a numeral never grows its line), and MaswaliCarry's inline flex
    // wrapper around that one figure collapsed with it; the carry's one measurement refuses an empty box. Fixed by S5-R2-HUB 9
    // (the wrapper an inline block: the row's own line box). The race S5-R2-HUB 6 guards is real but was not this red: a
    // render while the token flies (a server action that re-signs a returning player's session re-renders the route — here
    // the header's notifications read, before the page was React's — and so do the poller and a pool frame) dropped the
    // carry once the rollover was seen. Each reader here is a RETURNING player (session last seen ≥ 5 minutes before), and
    // each view prints its timeline (INFO H6): the hydration, what the carry measured, the flight's start and end, the
    // origin's classes, every server action by its arguments with its x-action-revalidated, and every route render.
    const STALE_MS = 5 * 60_000 + 15_000;
    const returning = async (who) => {
      const left = players[who].at + STALE_MS - Date.now();
      if (left > 0) { console.log(`INFO H6 · waiting ${Math.round(left / 1000)}s: ${who}'s session last seen ≥ 5 min ago, a returning player's`); await new Promise((r) => setTimeout(r, left)); }
    };
    /** In the page, from its first script: the carry's marks, the hydration of the carried-in row (and the two ends then),
     *  and each time the page asks for the origin — the carry measures it then: what it saw (both ends' boxes, the
     *  viewport, the motion clamps) and whether its wrapper stood in the carried-in row. */
    const CARRY_LOG = () => {
      const log = [];
      window.__mlnCarryLog = log;
      const push = (e) => log.push({ t: Date.now(), ...e });
      const byId = Document.prototype.getElementById;
      Document.prototype.getElementById = function (id) {
        const el = byId.call(this, id);
        if (id === "mln-carried-figure" && !window.__mlnDriveAsks) {
          // MaswaliCarry's wrapper around the carried figure: an inline block since S5-R2-HUB 9 (its own inline flex box
          // before it, which the frame's numeral rule left 0px tall).
          const wrap = document.querySelector('[data-row="in"] > span.inline-block, [data-row="in"] > span.inline-flex');
          const r = (x) => { if (!x) return null; const b = x.getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)]; };
          push({ asked: true, origin: r(el), dest: r(wrap ?? document.querySelector('[data-row="in"]')), wrapper: !!wrap, vw: innerWidth, vh: innerHeight,
            motion: document.documentElement.getAttribute("data-motion"), reduce: matchMedia("(prefers-reduced-motion: reduce)").matches,
            off: document.documentElement.classList.contains("kp-reduce-motion") });
        }
        return el;
      };
      new MutationObserver((ms) => {
        for (const m of ms) {
          const el = m.target;
          if (el.id === "mln-carried-figure") push({ origin: el.className });
          else if ((m.oldValue ?? "").includes("maswali-carry") !== el.classList.contains("maswali-carry")) push({ flight: el.classList.contains("maswali-carry") ? "start" : "end" });
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ["class"], attributeOldValue: true });
      const probe = setInterval(() => {
        const row = document.querySelector('[data-row="in"]');
        if (!row || !Object.keys(row).some((k) => k.startsWith("__reactFiber"))) return;
        clearInterval(probe);
        const b = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return [Math.round(r.top), Math.round(r.bottom)]; };
        push({ hydrated: true, origin: b(document.querySelector("#mln-carried-figure")), dest: b(row), vh: innerHeight });
      }, 20);
    };
    /** The page's server actions and route renders, as the network saw them. */
    /** A route render of the hub itself (an RSC fetch of /millionea that is not a prefetch). */
    const isRender = (r) => {
      const q = r.request().headers();
      return r.request().method() === "GET" && q.rsc === "1" && !q["next-router-prefetch"] && new URL(r.url()).pathname === "/millionea";
    };
    // Each server action by its arguments (the seen mark carries its week, "ROLLOVER" or "RESULT" and the render's instant;
    // the header's notifications read carries none), when it was sent and when it answered.
    const netLog = (page, out) => {
      page.on("request", (q) => { if (q.headers()["next-action"]) out.push({ t: Date.now(), sent: (q.postData() ?? "").slice(0, 70) }); });
      page.on("response", (r) => {
        const q = r.request().headers();
        if (q["next-action"]) out.push({ t: Date.now(), action: r.status(), args: (r.request().postData() ?? "").slice(0, 70), revalidated: r.headers()["x-action-revalidated"] ?? null });
        else if (isRender(r)) out.push({ t: Date.now(), render: r.status() });
      });
    };
    const timeline = async (page, net, t0) => [...(await page.evaluate(() => window.__mlnCarryLog ?? [])), ...net]
      .sort((a, b) => a.t - b.t).map((e) => ({ ...e, t: e.t - t0 }));
    for (const [who, vp] of [["phone", { width: 360, height: HEIGHT }], ["desk", { width: 1920, height: 1440 }]]) {
      await returning(who);
      const ctx = players[who].ctx;
      await setLocale(ctx, "sw");
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errs.push(`carry/${who}: ${e}`));
      await page.setViewportSize(vp);
      await page.addInitScript(CARRY_LOG);
      const net = [];
      netLog(page, net);
      const t0 = Date.now();
      await page.goto(`${BASE}/millionea`, { waitUntil: "load", timeout: 180_000 });
      const ends = await page.evaluate(() => {
        const at = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
        const inView = (b) => !!b && b.top >= 0 && b.left >= 0 && b.bottom <= innerHeight && b.right <= innerWidth;
        const origin = at(document.querySelector("#mln-carried-figure")), dest = at(document.querySelector('[data-row="in"]'));
        return { origin, dest, both: inView(origin) && inView(dest) };
      });
      // Read once the page is React's and the 340ms flight has had its time — never at a guessed instant after load.
      const hydrated = await page.waitForFunction(() => (window.__mlnCarryLog ?? []).some((e) => e.hydrated), null, { timeout: 30_000 }).then(() => true).catch(() => false);
      await page.waitForTimeout(1200);
      const after = await page.evaluate(() => document.querySelector("#mln-carried-figure")?.className ?? null);
      const landed = /\bg-settle\b/.test(after ?? ""), vacated = /\bkp-mln-carry-vacated\b/.test(after ?? "");
      const log = await timeline(page, net, t0);
      console.log(`INFO H6 after · carry · sw ${vp.width}×${vp.height} · timeline (ms from the navigation): ${j(log)}`);
      // S5-R2-HUB 9 · what the carry measured (its own one measurement, recorded as it asked for its origin): a destination
      // box of the row's line, never the empty box the frame's numeral rule had made of its wrapper (0px tall: no flight).
      const asked = log.find((e) => e.asked);
      ok(`after · carry · sw ${vp.width}×${vp.height} · H6 the carry measured its destination as a box of its line (${asked?.dest ? `${asked.dest[2]}×${asked.dest[3]}px` : "never asked"})`,
        !!asked?.dest && asked.dest[2] > 0 && asked.dest[3] > 0 && asked.wrapper === true, j(asked));
      ok(`after · carry · sw ${vp.width}×${vp.height} · H6 the carry plays exactly when both ends stand in view (${ends.both ? "both in view: it lands" : "an end out of view: no flight"})`,
        hydrated && !!ends.origin && !!ends.dest && (ends.both ? landed && !vacated : !landed && !vacated), j({ hydrated, ends, after }));
      if (who === "desk") ok(`after · carry · sw ${vp.width}×${vp.height} · H6 a tall desktop holds both ends, so the flight is seen`, ends.both, j(ends));
      await page.screenshot({ path: `${OUT}/after-carry-sw-${vp.width}.png` });
      await page.close();
    }
    // ⭐ A RENDER MID-FLIGHT NEVER CUTS THE CARRY (S5-R2-HUB 6): the race made certain. The flight is stretched to six seconds
    // by this drive's own stylesheet (the product's motion untouched); the rollover's seen mark answers; then the route
    // re-renders while the token is in the air — `router.refresh()`, the same server render the re-signed cookie asks for —
    // and the render no longer carries the rollover. The token must still land, and the origin settle.
    {
      const label = "after · carry · sw 1920×1440 · H6 a render while the token flies";
      await returning("flight");
      const ctx = players.flight.ctx;
      await setLocale(ctx, "sw");
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errs.push(`carry/flight: ${e}`));
      await page.setViewportSize({ width: 1920, height: 1440 });
      // An adopted sheet: in place before the page's first script, whether or not its <html> exists yet.
      await page.addInitScript(() => {
        const sheet = new CSSStyleSheet();
        sheet.replaceSync(".maswali-carry { animation-duration: 6000ms !important; }");
        document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      });
      await page.addInitScript(CARRY_LOG);
      const net = [];
      netLog(page, net);
      const seen = page.waitForResponse((r) => r.request().method() === "POST" && !!r.request().headers()["next-action"], { timeout: 30_000 }).catch(() => null);
      const t0 = Date.now();
      await page.goto(`${BASE}/millionea`, { waitUntil: "load", timeout: 180_000 });
      const flying = await page.waitForFunction(() => /kp-mln-carry-vacated/.test(document.querySelector("#mln-carried-figure")?.className ?? ""), null, { timeout: 30_000 }).then(() => true).catch(() => false);
      const mark = await seen;
      const rendered = page.waitForResponse(isRender, { timeout: 30_000 }).catch(() => null);
      await page.evaluate(() => window.next?.router?.refresh());
      const render = await rendered;
      await page.waitForTimeout(600);
      const inAir = await page.evaluate(() => document.querySelector("#mln-carried-figure")?.className ?? null);
      await page.waitForFunction(() => /\bg-settle\b/.test(document.querySelector("#mln-carried-figure")?.className ?? ""), null, { timeout: 15_000 }).catch(() => {});
      const end = await page.evaluate(() => document.querySelector("#mln-carried-figure")?.className ?? null);
      const log = await timeline(page, net, t0);
      console.log(`INFO H6 ${label} · timeline (ms from the navigation): ${j(log)}`);
      ok(`${label} · the token was in the air when the seen mark answered and the route re-rendered (${mark ? `mark ${mark.status()}` : "no mark"}, ${render ? `render ${render.status()}` : "no render"})`,
        flying && !!mark && !!render && /kp-mln-carry-vacated/.test(inAir ?? ""), j({ flying, inAir, log }));
      // The flight's own end after the render (dev's StrictMode runs a mount's effect twice, so ends are not counted): the
      // origin's settle — the landing's mark — comes after the render landed.
      const renderAt = log.find((e) => e.render)?.t ?? null;
      const settleAt = log.find((e) => typeof e.origin === "string" && /\bg-settle\b/.test(e.origin))?.t ?? null;
      ok(`${label} · the render did not cut it: the token landed after the render, and the origin settled (render +${renderAt}ms, settle +${settleAt}ms: "${end}")`,
        /\bg-settle\b/.test(end ?? "") && !/kp-mln-carry-vacated/.test(end ?? "") && renderAt !== null && settleAt !== null && settleAt > renderAt, j({ end, log }));
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
    // The lead's 7b · the head's absent figure is the platform's empty slot: the em-dash in the faint ink, hidden from the
    // screen reader (the market card's `.mcardp-pct--empty`), on the figure's own line.
    const slot = await page.evaluate(() => {
      const fig = document.querySelector('[data-testid="millionea-hub-figure"]');
      const dash = fig?.firstElementChild;
      if (!fig || !dash) return null;
      // The faint ink as the stylesheet computes it (its token through the theme's colour, never a string of our own).
      const probe = document.createElement("span");
      probe.className = "text-text-faint";
      document.body.appendChild(probe);
      const faint = getComputedStyle(probe).color;
      probe.remove();
      return { text: dash.textContent, hidden: dash.getAttribute("aria-hidden"), color: getComputedStyle(dash).color, faint };
    });
    ok(`${label} · 7b the head's absent figure is the platform's empty slot (the faint em-dash, hidden from the screen reader)`,
      !!slot && slot.text === "—" && slot.hidden === "true" && slot.color === slot.faint, j(slot));
    // §M8a item 24 (S5-R2-HUB 6, the merge's wiring) · each voided main's words are struck through the ONE strike
    // (`MaswaliStrike`): the words whole in one struck span inside the row's own unstruck box, and where they end on a
    // full-width mark — Chinese "？" or "。" — that mark alone cut back to its ink (`.kp-mln-strike-end`, `--q` for "？"):
    // a plain strike ran half an em past "？". Latin text is drawn as it came.
    const struck = await page.evaluate(() => [...document.querySelectorAll('[data-testid="millionea-hub-questions"] li[data-slot]')].flatMap((li) => {
      const s = li.querySelector(".line-through");
      if (!s) return [];
      const box = s.parentElement, text = (s.textContent ?? "").trim(), last = s.lastElementChild;
      const mark = /[。，、；：！？]$/.test(text);
      return [{
        slot: li.getAttribute("data-slot"), whole: text === (box?.textContent ?? "").trim() && text.length > 0,
        boxStruck: box ? getComputedStyle(box).textDecorationLine.includes("line-through") : true,
        strike: getComputedStyle(s).textDecorationLine, end: last ? last.className : null, endText: last?.textContent ?? null, mark, q: text.endsWith("？"),
      }];
    }));
    const strikeRight = (x) => x.whole && !x.boxStruck && x.strike.includes("line-through")
      && (x.mark ? x.end === (x.q ? "kp-mln-strike-end kp-mln-strike-end--q" : "kp-mln-strike-end") && x.endText?.length === 1 : x.end === null);
    ok(`${label} · item 24 each voided main is struck through the one strike: its words whole in one struck span, a closing full-width mark alone cut to its ink (${struck.length} struck: ${j(struck.map((x) => x.end))})`,
      struck.length === 6 && struck.every(strikeRight), j(struck));
    await stateWordChecks(page, label, locale, { en: "Week is being voided", sw: "Wiki inabatilishwa", zh: "整周作废中" });
    await zhLineChecks(page, label, locale, ["millionea-hub-voiding"]);
  };
  await shoot("voiding", "classic", demoClassic, { check: voidingCheck });
  await shoot("voiding", "journey", demoJourney, { check: voidingCheck, matrix: { sw: [360, 1280] } });
  await act({ act: "seal", slots: [7, 8, 9, 10, 11, 12, 13, 14, 15], outcome: "YES" });
  await act({ act: "voidLead" });
  // The next week opens on Monday, as after any week: the hub's own week on sale, last week voided under it (L14) — with no
  // week on the hub, "last week" is the calendar's, and this store's weeks are dated ahead of the real clock.
  await act({ act: "draftNext" });
  await act({ act: "openNext" });
  const voidedCheck = async (page, label, locale) => {
    const row = await page.getByTestId("millionea-hub-last-week").textContent().catch(() => "");
    if (locale === "en") ok(`${label} · L14 last week voided reads the register's words`, /Voided/.test(row ?? "") && /Every ticket refunded|Refunds on their way/.test(row ?? ""), j(row));
  };
  if (want("voided")) await shoot("voided", "classic", demoClassic, { check: voidedCheck, oneView: true });

  // ── L16 · the ghost button's border against the page, and the kit ghost's own ────────────────────────────────────────────
  {
    const page = await guestClassic.newPage();
    await open(page, "/millionea");
    const c = await page.evaluate(() => {
      // Each colour as the screen shows it: painted by the browser into one sRGB pixel — the border over the page's ground,
      // so a lab()/oklch() serialisation or a translucent border reads as the eye sees it (a regex over lab() did not).
      const cv = document.createElement("canvas"); cv.width = cv.height = 1;
      const cx = cv.getContext("2d", { willReadFrequently: true });
      const px = (color, under) => { cx.clearRect(0, 0, 1, 1); if (under) { cx.fillStyle = under; cx.fillRect(0, 0, 1, 1); } cx.fillStyle = color; cx.fillRect(0, 0, 1, 1); return [...cx.getImageData(0, 0, 1, 1).data].slice(0, 3); };
      const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
      const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
      const probe = (cls) => { const b = document.createElement("a"); b.className = cls; b.textContent = "x"; document.body.appendChild(b); const col = getComputedStyle(b).borderTopColor; b.remove(); return col; };
      const ground = document.createElement("div"); ground.style.background = "var(--bg-base)"; document.body.appendChild(ground);
      const bg = getComputedStyle(ground).backgroundColor; ground.remove();
      const kit = probe("btn btn-ghost btn-lg"), hub = probe("btn btn-ghost btn-lg border-border-control");
      const ground_ = px(bg), kitPx = px(kit, bg), hubPx = px(hub, bg);
      return { bg, kit, hub, groundPx: ground_, kitPx, hubPx, kitRatio: ratio(kitPx, ground_), hubRatio: ratio(hubPx, ground_) };
    });
    // ⚠️ MEASURED 2026-10-21 at 80d2d35da: 1.79:1 for both — the kit's .btn-ghost rule wins over the hub's
    // `border-border-control`, so the override drew nothing of its own and the hub dropped it. A ghost border under 3:1 is
    // the kit's, on every page (§A1; the critic's own caution: a kit change is platform-wide) — a figure for the lead, so
    // it is printed, not asserted here; what this drive holds is that the hub draws the kit's ghost as it is.
    console.log(`INFO L16 · ghost border contrast: kit .btn-ghost ${c.kitRatio.toFixed(2)}:1, with the hub's old override ${c.hubRatio.toFixed(2)}:1 (${j(c)})`);
    ok("L16 · the hub's old override drew nothing of its own (the kit's rule wins: one border, the kit's)", c.kit === c.hub, j(c));
    const follow = await page.evaluate(() => [...document.querySelectorAll(".btn-ghost")].filter((el) => el.closest('[data-testid="millionea-hub"]') && /border-border-control/.test(el.className)).length);
    ok("L16 · the hub draws no ghost button with a border override of its own", follow === 0, `${follow}`);
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
  await shoot("final-ahead", "classic", demoClassic, { check: aheadCheck });
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
    // The head's ONE rule in the final week (efaccba2d): the critic's key with the fee as its rule's own fact.
    if (locale === "en") ok(`${label} · H3 the final week's rule stands under the figure`, rule === "Final week: if no ticket gets 10/10, the pool is shared equally by this week's highest-scoring tickets · 13% fee at payout", j(rule));
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

if (RUN === "c") {
  // ── D12 · THE HUB AT STAFF_PREVIEW, AS A STAFF OFFICER READS IT: the platform's ONE preview bar above the page (AppShell's
  // `MillioneaPreviewBar`), nothing of the hub's own in its column (its `MillioneaPreviewMark` call is gone), and nothing
  // to buy (P15: a public week sells to no one at a preview). The switch is moved as an Owner moves it — the console's
  // typed ceremony — under the ACTIVE ceiling the seed needed; the effective state is the lower of the two.
  const ownerPage = await owner.newPage();
  ownerPage.setDefaultTimeout(60_000);
  await open(ownerPage, "/admin/maswali/pools");
  await ownerPage.getByRole("combobox", { name: "Rollout" }).click();
  await ownerPage.getByRole("option", { name: "Staff preview", exact: true }).click();
  await ownerPage.getByLabel("Why", { exact: true }).fill("Hub states drive: the staff preview, shot");
  await ownerPage.getByRole("button", { name: "Move the switch", exact: true }).click();
  const confirm = ownerPage.getByRole("alertdialog").or(ownerPage.getByRole("dialog")).filter({ hasText: "Set Millionea to STAFF_PREVIEW?" });
  await confirm.getByPlaceholder("STAFF_PREVIEW", { exact: true }).fill("STAFF_PREVIEW");
  await confirm.getByRole("button", { name: "Move it", exact: true }).click();
  await confirm.waitFor({ state: "hidden", timeout: 120_000 });
  await ownerPage.close();
  const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
  ok("preview · the Owner's typed ceremony moves the switch to STAFF_PREVIEW", health?.millionea?.state === "STAFF_PREVIEW", j(health?.millionea));
  // The switch is read through a ≤ 10 s snapshot (millionea-switch.ts): every reader sees the move within that.
  await new Promise((done) => setTimeout(done, 11_000));
  const previewCheck = async (page, label) => {
    const g = await page.evaluate(() => {
      const at = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right) }; };
      const bars = [...document.querySelectorAll('[data-testid="millionea-preview-mark"]')];
      const hub = document.querySelector('[data-testid="millionea-hub"]');
      return {
        n: bars.length, bar: at(bars[0]), text: bars[0]?.textContent?.trim() ?? null, inHub: bars.some((b) => !!hub?.contains(b)),
        hub: at(hub), title: at(hub?.querySelector("h1")), header: at(document.querySelector("header")),
        journeyBar: at(document.querySelector('[data-testid="journey-preview-marker"]')),
      };
    });
    ok(`${label} · D12 the staff preview is marked ONCE, by the platform's bar, above the hub and never in its column ("${g.text}")`,
      g.n === 1 && !g.inHub && !!g.bar && !!g.title && g.bar.bottom <= g.title.top, j(g));
    ok(`${label} · D12 the bar stands under the header`, !!g.bar && !!g.header && g.bar.top >= g.header.bottom - 1, j(g));
    ok(`${label} · P15 nothing sells at a preview: no door to buy, no close line, no countdown`,
      (await page.getByTestId("millionea-hub-fill").count()) === 0 && (await page.getByTestId("millionea-hub-close").count()) === 0 && (await page.locator(".closing-pill").count()) === 0);
    if (g.journeyBar) console.log(`INFO D12 ${label} · beside the journey's own preview bar: ${j({ journey: g.journeyBar, millionea: g.bar })}`);
  };
  await shoot("preview", "classic", owner, { check: previewCheck });
  const ownerJ = await readerContext([...(await owner.cookies(BASE)).filter((c) => c.name === SESSION_COOKIE), pass_]);
  await shoot("preview", "journey", ownerJ, { check: previewCheck, matrix: { sw: [360, 1280] } });
  // The bar stands on every Millionea page and /results, and on no other page (D12's own reach), read at a phone.
  if (want("preview")) {
    const page = await owner.newPage();
    await setLocale(owner, "sw");
    await page.setViewportSize({ width: 360, height: HEIGHT });
    for (const [path, shown] of [["/millionea/how", true], ["/millionea/register", true], ["/results", true], ["/markets", false], ["/wallet", false]]) {
      await open(page, path);
      const n = await page.getByTestId("millionea-preview-mark").count();
      ok(`preview · sw @360 · D12 the bar ${shown ? "stands" : "is absent"} on ${path}`, n === (shown ? 1 : 0), `${n}`);
    }
    await page.close();
  }
}

ok("no page error on any page", errs.length === 0, errs.slice(0, 3).join(" | "));
for (const [line, where] of zhElsewhere) console.log(`INFO zh space between two Han characters — ${line}  (first at ${where})`);
for (const [line, where] of t5Elsewhere) console.log(`INFO §T5 a numeral in the body face, another lane's — ${line}  (first at ${where})`);
for (const [key, where] of notesSeen) console.log(`INFO the one ledger · a note on row "${key}" — first at ${where}`);
for (const line of yieldSeen) console.log(`INFO D15 the bubble yielded — ${line}`);
await browser.close();
console.log(`\nmaswali-hub-states (run ${RUN}): ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
