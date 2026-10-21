/**
 * qa:maswali-register-shots — THE WEEK REGISTER AND HOW TO PLAY IN EVERY STATE (MASWALI-BUILD S5-DESIGN-REGISTER,
 * 2026-10-21 — Ali's 10/10 pass): the index and every week page a reader can open, at 320 / 360 / 768 / 1024 / 1280 /
 * 1920 in English, Swahili and Chinese, every page shot down to its end, for the tile read.
 *
 *   BASE=http://localhost:3580 MASWALI_REGISTER_SCENARIO=states node scripts/maswali-register-shots.mjs
 *
 * ⚠️ PREMISE — a FRESH in-memory `next dev` with FEATURE_MILLIONEA=ACTIVE, MASWALI_SCHEDULER=false and
 *    LIFECYCLE_TICKER=false (or the tick voids the certain weeks itself), DISABLE_ADMIN_TOTP=true. One scenario per server:
 *    · `states` (default) — `/api/dev-test/seed-maswali-register` { scenario: "states" }: nine public weeks — topped up and
 *      won, nobody won, voided whole, won with a remainder, settling, in its objection window, results coming in, being
 *      voided, on sale — then the sales paused (the selling week's chip and its row) and the index and that week shot again.
 *      ⚠️ Its declared fixture lowers the floor to TZS 20,000, so How to play is NOT shot here (its worked weeks would
 *      illustrate that floor).
 *    · `sunset` — one settled week, then the FINAL week settled on its highest score (MR-30); and How to play, at the
 *      real floor.
 *    · `empty` — launch day: no week at all; the index's empty state, and How to play from the coming week's rules.
 *
 * Each page at each width and language: answered 200, no horizontal overflow, the right page (never the 404), its own
 * test id, no page error, and viewport tiles in `.50pick-shots/maswali-register-shots/<scenario>/` (never a full-page
 * capture). Measured, not eyeballed: a running week's page states no money (H2); on every week page, whether the resting
 * chat bubble or the Needle covers a figure of the ledger in any tile (the motion and register critics' M5) — reported
 * per tile, and a cover is a failure. How to play's example is played and frames are captured at fixed offsets, with the
 * OS's reduced motion and without (`<scenario>/motion/`).
 * A focused re-shoot: MASWALI_SHOTS_PAGES (page names), MASWALI_SHOTS_LOCALES, MASWALI_SHOTS_WIDTHS, MASWALI_SHOTS_SCROLL=0.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3580";
const SCENARIO = process.env.MASWALI_REGISTER_SCENARIO || "states";
if (!["states", "sunset", "empty"].includes(SCENARIO)) { console.error(`unknown scenario ${SCENARIO}`); process.exit(2); }
const OUT = `.50pick-shots/maswali-register-shots/${SCENARIO}`;
const only = (name, all) => {
  const raw = (process.env[name] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return raw.length ? all.filter((x) => raw.includes(String(x))) : all;
};
const WIDTHS = only("MASWALI_SHOTS_WIDTHS", [320, 360, 768, 1024, 1280, 1920]);
const LOCALES = only("MASWALI_SHOTS_LOCALES", ["en", "sw", "zh"]);
const PAGE_FILTER = (process.env.MASWALI_SHOTS_PAGES ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const wantPage = (name) => PAGE_FILTER.length === 0 || PAGE_FILTER.includes(name);
const SCROLL = process.env.MASWALI_SHOTS_SCROLL !== "0";
if (PAGE_FILTER.length || WIDTHS.length < 6 || LOCALES.length < 3 || !SCROLL) {
  console.log(`FOCUSED RUN — pages ${PAGE_FILTER.join(",") || "all"} · locales ${LOCALES.join(",")} · widths ${WIDTHS.join(",")} (not the acceptance run)`);
}
const HEIGHT = 780;
const OVERLAP = 240;
const MAX_STEPS = 40;

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) pass++; else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };

const pre = await premise(BASE);
if (pre.refuse) die(pre.refuse);
const ml = pre.health?.millionea;
if (!ml || ml.state !== "ACTIVE") die(`/api/health says millionea = ${JSON.stringify(ml)}: start next dev with FEATURE_MILLIONEA=ACTIVE`);
mkdirSync(`${OUT}/motion`, { recursive: true });

const browser = await chromium.launch();
const errs = [];
async function contextWith(cookies, locale, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: HEIGHT }, ...extra });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
  return ctx;
}
async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 2_000 }).catch(() => {});
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
  }).catch(() => {});
  await page.waitForTimeout(400);
}
async function open(page, path) {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 180_000 });
  await settle(page);
  return res;
}

/** The figures of a ledger that the resting chat bubble (ChatRoot's `.cm-fab`, with its opacity: it fades while the
 *  page moves and after 3s untouched) or the parked Needle covers in this viewport, if any. */
async function covered(page) {
  return page.evaluate(() => {
    const boxes = [];
    for (const [name, sel] of [["chat", ".cm-fab"], ["needle", "#needle-root #needle"]]) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none") boxes.push({ name, r, opacity: Number(style.opacity) });
    }
    const out = [];
    for (const a of document.querySelectorAll('[data-testid="millionea-ledger"] .amount')) {
      const f = a.getBoundingClientRect();
      if (f.bottom <= 0 || f.top >= innerHeight) continue;
      for (const { name, r, opacity } of boxes) {
        if (f.left < r.right && f.right > r.left && f.top < r.bottom && f.bottom > r.top) out.push(`${name} (opacity ${opacity}) over "${a.textContent}"`);
      }
    }
    return out;
  });
}

/** The page's lead tile, then one tile per scroll step down to its end (240px of overlap), each checked for a cover. */
async function shoot(page, name, locale, width, measure) {
  const tag = `${name}-${locale}-${width}`;
  await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false });
  const covers = [];
  if (measure) covers.push(...(await covered(page)).map((c) => `s1 ${c}`));
  if (SCROLL) {
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    let bottom = HEIGHT;
    for (let n = 2; n <= MAX_STEPS && bottom < total - 1; n++) {
      const top = Math.min((n - 1) * (HEIGHT - OVERLAP), Math.max(0, total - HEIGHT));
      await page.evaluate((y) => window.scrollTo(0, y), top);
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true)))));
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${OUT}/${tag}-s${n}.png`, fullPage: false });
      if (measure) covers.push(...(await covered(page)).map((c) => `s${n} ${c}`));
      bottom = (await page.evaluate(() => window.scrollY)) + HEIGHT;
    }
    ok(`${tag} · the whole page is covered by viewport tiles`, bottom >= total - 1, `${bottom} of ${total}`);
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  if (measure) ok(`${tag} · no resting control covers a figure of the ledger`, covers.length === 0, covers.join(" | "));
}

// ── the weeks ─────────────────────────────────────────────────────────────────────────────────────────────────────────
let weeks = {};
if (SCENARIO !== "empty") {
  const ctx = await browser.newContext();
  const seed = await ctx.request.post(`${BASE}/api/dev-test/seed-maswali-register`, { data: { scenario: SCENARIO }, timeout: 600_000 });
  const body = await seed.json().catch(() => ({}));
  ok(`the ${SCENARIO} weeks are seeded`, seed.ok() && body.ok === true, `${seed.status()} ${JSON.stringify(body).slice(0, 300)}`);
  weeks = body.weeks ?? {};
  await ctx.close();
  console.log(`weeks: ${JSON.stringify(weeks)}`);
}
const RUNNING = new Set(["settling", "objections", "resolving", "voiding", "selling"]);
const weekPages = Object.entries(weeks).map(([k, code]) => [`week-${k}`, `/millionea/register/${encodeURIComponent(code)}`, k]);
const PAGES = [
  ["index", "/millionea/register", null],
  ...weekPages,
  ...(SCENARIO === "states" ? [] : [["how", "/millionea/how", null]]),
].filter(([name]) => wantPage(name));

async function pass1(label, pages) {
  for (const locale of LOCALES) {
    const session = await demoSession(browser, BASE);
    const ctx = await contextWith([session], locale);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errs.push(`${label} ${locale}: ${e}`));
    for (const [name, path, kind] of pages) {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        const res = await open(page, path);
        const tag = `${label === "main" ? "" : `${label}-`}${name}-${locale}-${width}`;
        ok(`${tag} · answers 200`, res?.status() === 200, `${res?.status()}`);
        ok(`${tag} · not the not-found page`, (await page.getByText(/^404 · /).count()) === 0);
        const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        ok(`${tag} · no horizontal overflow`, over <= 1, `overflow=${over}px`);
        ok(`${tag} · html language matches the cookie`, (await page.locator("html").getAttribute("lang")) === locale);
        const id = name === "index" ? "millionea-register" : name === "how" ? "millionea-how" : "millionea-register-week";
        ok(`${tag} · draws its own page (${id})`, (await page.getByTestId(id).count()) === 1);
        if (kind && RUNNING.has(kind)) {
          // H2 · a running week's page states no money: its ledger's place holds words, never a figure.
          const money = await page.locator('[data-testid="millionea-register-week"] .amount').count();
          ok(`${tag} · a running week's page states no money`, money === 0, `${money} figures`);
        }
        // A ledger is drawn on a final week's page and in How's worked weeks: there, a resting control must clear its figures.
        await shoot(page, `${label === "main" ? "" : `${label}-`}${name}`, locale, width, name === "how" || (!!kind && !RUNNING.has(kind)));
      }
    }
    await ctx.close();
  }
}
await pass1("main", PAGES);

// The sales paused: the selling week's chip ("Paused for now") on its row and its page.
if (SCENARIO === "states" && weeks.selling) {
  const ctx = await browser.newContext();
  const r = await ctx.request.post(`${BASE}/api/dev-test/seed-maswali-register`, { data: { pause: true } });
  ok("the sales are paused", r.ok(), `${r.status()}`);
  await ctx.close();
  await pass1("paused", [["index", "/millionea/register", null], ["week-selling", `/millionea/register/${encodeURIComponent(weeks.selling)}`, "selling"]].filter(([name]) => wantPage(name)));
}

// ── How to play's example, played (the motion critic's M5; the register critic's M7) ──────────────────────────────────
if (SCENARIO !== "states" && wantPage("how")) {
  for (const [mode, extra] of [["motion", {}], ["reduced", { reducedMotion: "reduce" }]]) {
    for (const [locale, width] of [["sw", 360], ["en", 1280]]) {
      const ctx = await contextWith([await demoSession(browser, BASE)], locale, extra);
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errs.push(`how ${mode} ${locale}: ${e}`));
      await page.setViewportSize({ width, height: HEIGHT });
      await open(page, "/millionea/how");
      const button = page.getByTestId("millionea-how-example-play");
      await button.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -120));
      await settle(page);
      const card = page.locator('article[aria-labelledby="mln-how-ex-swap"]');
      const tag = `how-${mode}-${locale}-${width}`;
      const before = await button.boundingBox();
      await card.screenshot({ path: `${OUT}/motion/${tag}-f00-before.png` });
      const t0 = Date.now();
      await button.click();
      const offsets = [30, 90, 160, 240, 360, 520, 760, 1100, 1600];
      for (const [i, at] of offsets.entries()) {
        const wait = t0 + at - Date.now();
        if (wait > 0) await page.waitForTimeout(wait);
        await card.screenshot({ path: `${OUT}/motion/${tag}-f${String(i + 1).padStart(2, "0")}-${at}ms.png` });
      }
      await page.waitForTimeout(600);
      const after = await button.boundingBox();
      const status = await card.getByRole("status").textContent();
      await card.screenshot({ path: `${OUT}/motion/${tag}-f99-end.png` });
      ok(`${tag} · the button keeps its box across the swap`, !!before && !!after && Math.abs(before.width - after.width) < 1 && Math.abs(before.height - after.height) < 1, JSON.stringify({ before, after }));
      ok(`${tag} · the example says it ended once the token landed`, (status ?? "").trim().length > 0, JSON.stringify(status));
      await ctx.close();
    }
  }
}

ok("no page error on any page", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close();
console.log(`\nmaswali-register-shots (${SCENARIO}): ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
