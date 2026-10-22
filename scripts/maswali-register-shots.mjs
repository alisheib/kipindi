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
 * capture). Measured, not eyeballed: a running week's page states no money (H2); on every final week's page and How's
 * worked weeks, whether the resting chat bubble or the Needle sits over a figure of a ledger in any tile (the register
 * critic's M5) — every cover printed as a `MEASURE` line with the control's computed opacity and the rest it must reach: the
 * chat bubble its D15 yield (PLATFORM, merged: at rest over a line of text or a figure it fades to the platform's
 * `--state-yield-opacity`, read from the page — .50, at which a covered figure still meets its contrast minimum), the Needle
 * its census rest (≤ 0.3). A control above its rest is a failure. Every tile waits until the bubble's opacity has stopped
 * moving (its yield runs on `--t-quick`), so a tile never catches it mid-fade. On every page, each fact list's separator
 * is measured against the same words typed with " · " in the same place (a `SEP` line): inside a tracked mono eyebrow
 * ("Reserves · A1–A5") or the numerals' mono it must match within 1px, and a control undoes the eyebrow rule in the page
 * (the round-1 0.9em) for the same judge to catch (`SEP′`); a list in the body face is printed for the record. How to
 * play's example is played and frames are captured at fixed offsets, with the OS's reduced motion and without
 * (`<scenario>/motion/`); and its loading drawing is caught on the way in from the register (a throttled client move): the
 * swap card's button bar stands at the landed button's height (a `GHOST` line; page name `how-ghost`).
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
 *  page moves and after 3s untouched, and yields over text and figures — D15) or the parked Needle covers in this viewport,
 *  if any — each with the rest its control must reach: the chat bubble the platform's `--state-yield-opacity` (read from
 *  the page, never restated here), the Needle its census rest. */
async function covered(page) {
  return page.evaluate((needleRest) => {
    const yieldTo = Number.parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--state-yield-opacity"));
    const boxes = [];
    for (const [name, sel, rest] of [["chat", ".cm-fab", yieldTo], ["needle", "#needle-root #needle", needleRest]]) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      if (r.width > 0 && r.height > 0 && style.visibility !== "hidden" && style.display !== "none") boxes.push({ name, r, rest, opacity: Number(style.opacity) });
    }
    const out = [];
    for (const a of document.querySelectorAll('[data-testid="millionea-ledger"] .amount')) {
      const f = a.getBoundingClientRect();
      if (f.bottom <= 0 || f.top >= innerHeight) continue;
      for (const { name, r, rest, opacity } of boxes) {
        if (f.left < r.right && f.right > r.left && f.top < r.bottom && f.bottom > r.top) out.push({ name, rest, opacity, text: a.textContent });
      }
    }
    return out;
  }, NEEDLE_REST);
}
/** The parked Needle's census rest over a figure (the lead's ruling D15, 2026-10-21). The chat bubble's rest is D15's yield,
 *  read from the page in `covered`; a rest the page does not state (NaN) fails every cover. */
const NEEDLE_REST = 0.3;
/** A control's computed opacity may land a hair off its token in a computed style's rounding. */
const REST_SLACK = 0.005;

/** Waits until the chat bubble's opacity has stopped moving — its D15 yield and its D3/D75 clears run on `--t-quick` — so a
 *  tile and its cover census never catch it mid-fade: two reads 60ms apart agree (at most 1.2s). */
async function still(page) {
  let last = null;
  for (let i = 0; i < 20; i++) {
    const now = await page.evaluate(() => { const el = document.querySelector(".cm-fab"); return el ? getComputedStyle(el).opacity : "none"; });
    if (now === last) return;
    last = now;
    await page.waitForTimeout(60);
  }
}

/** The lead's round-2 item 3 — the routed `--mln-sep` question (round 1 read "AKIBA·A1–A5" with no room either side of its
 *  dot, at the fact list's 0.9em). Every fact list that draws its marks inline, its first two facts on one line, measured
 *  against the same two facts TYPED with " · " in a copy beside it (the list's own face, size, case and tracking inherited):
 *  the gap from the first fact's last glyph to the second's first glyph, in px. A list in a tracked mono eyebrow ("Reserves
 *  · A1–A5") or in the numerals' mono must space them as the typed " · " does (HUB's L1 rule, `--mln-sep: calc(3ch +
 *  0.42em)` / `3ch`); a list in the body face is printed for the record (the base 0.9em). With `plant`, the eyebrow rule
 *  is undone in the page first — the round-1 0.9em restored, Chinese too — the control the same judge must catch. */
async function separators(page, plant = false) {
  return page.evaluate((plant) => {
    let undo = null;
    if (plant) {
      undo = document.createElement("style");
      undo.textContent = ".eyebrow .kp-mln-facts, .kp-mln-facts.eyebrow { --mln-sep: 0.9em !important; }";
      document.head.appendChild(undo);
    }
    try {
      const textNodes = (el) => {
        const out = [];
        const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement?.closest(".sr-only") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
        for (let n = walk.nextNode(); n; n = walk.nextNode()) if (n.textContent.trim()) out.push(n);
        return out;
      };
      /** The first fact's last line box and the second's first, from their own text (a fact may wrap inside itself). */
      const rectAt = (node, last) => { const r = document.createRange(); r.selectNodeContents(node); const q = [...r.getClientRects()].filter((x) => x.width > 0); return last ? q[q.length - 1] : q[0]; };
      const out = [];
      for (const list of document.querySelectorAll(".kp-mln-facts")) {
        if (list.getClientRects().length === 0 || getComputedStyle(list).flexDirection === "column") continue;
        const facts = [...list.children].filter((c) => c.classList.contains("kp-mln-fact"));
        if (facts.length < 2) continue;
        const a = textNodes(facts[0]), b = textNodes(facts[1]);
        if (!a.length || !b.length) continue;
        const end = rectAt(a[a.length - 1], true), start = rectAt(b[0], false);
        // Two facts on two lines have no separator between them to measure.
        if (!end || !start || Math.abs(end.top - start.top) > end.height / 2) continue;
        // The facts' own words (a space between two runs is a text node of its own), as a reader and the typed copy read them.
        const words = (fact) => [...fact.childNodes].map((n) => (n instanceof Element && n.classList.contains("sr-only") ? "" : n.textContent)).join("").replace(/\s+/g, " ").trim();
        const one = words(facts[0]), two = words(facts[1]);
        const host = list.parentElement;
        const typed = document.createElement("span");
        typed.style.cssText = "position:absolute;visibility:hidden;white-space:nowrap;left:0;top:0";
        typed.textContent = `${one} · ${two}`;
        host.appendChild(typed);
        const t = typed.firstChild;
        const r1 = document.createRange(); r1.setStart(t, 0); r1.setEnd(t, one.length);
        const r2 = document.createRange(); r2.setStart(t, one.length + 3); r2.setEnd(t, one.length + 3 + two.length);
        const typedGap = r2.getBoundingClientRect().left - r1.getBoundingClientRect().right;
        typed.remove();
        const cs = getComputedStyle(facts[1]);
        const kind = list.matches(".eyebrow .kp-mln-facts, .kp-mln-facts.eyebrow") ? "eyebrow" : list.matches(".font-mono .kp-mln-facts, .kp-mln-facts.font-mono") ? "mono" : "body";
        out.push({ kind, words: `${one} · ${two}`, gap: Math.round((start.left - end.right) * 10) / 10, typed: Math.round(typedGap * 10) / 10,
          size: cs.fontSize, tracking: cs.letterSpacing, face: cs.fontFamily.split(",")[0].trim() });
      }
      return out;
    } finally {
      undo?.remove();
    }
  }, plant);
}

/** The page's lead tile, then one tile per scroll step down to its end (240px of overlap), each checked for a cover. */
async function shoot(page, name, locale, width, measure) {
  const tag = `${name}-${locale}-${width}`;
  await still(page);
  await page.screenshot({ path: `${OUT}/${tag}.png`, fullPage: false });
  const covers = [];
  if (measure) covers.push(...(await covered(page)).map((c) => ({ ...c, step: 1 })));
  if (SCROLL) {
    const total = await page.evaluate(() => document.documentElement.scrollHeight);
    let bottom = HEIGHT;
    for (let n = 2; n <= MAX_STEPS && bottom < total - 1; n++) {
      const top = Math.min((n - 1) * (HEIGHT - OVERLAP), Math.max(0, total - HEIGHT));
      await page.evaluate((y) => window.scrollTo(0, y), top);
      await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true)))));
      await page.waitForTimeout(250);
      await still(page);
      await page.screenshot({ path: `${OUT}/${tag}-s${n}.png`, fullPage: false });
      if (measure) covers.push(...(await covered(page)).map((c) => ({ ...c, step: n })));
      bottom = (await page.evaluate(() => window.scrollY)) + HEIGHT;
    }
    ok(`${tag} · the whole page is covered by viewport tiles`, bottom >= total - 1, `${bottom} of ${total}`);
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  if (measure) {
    const said = covers.map((c) => `s${c.step} ${c.name} (opacity ${Number(c.opacity).toFixed(2)}, rest ${Number(c.rest).toFixed(2)}) over "${c.text}"`);
    if (said.length) console.log(`MEASURE ${tag} · ${said.join(" | ")}`);
    ok(`${tag} · no resting control hides a figure of the ledger (the chat bubble over one has yielded to --state-yield-opacity, the Needle faded to ${NEEDLE_REST})`,
      covers.every((c) => Number.isFinite(c.rest) && c.opacity <= c.rest + REST_SLACK), said.join(" | "));
  }
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
        const seps = await separators(page);
        for (const s of seps) {
          console.log(`SEP ${tag} · ${s.kind} (${s.face} ${s.size}, tracking ${s.tracking}) · "${s.words}" · fact list ${s.gap}px · typed ${s.typed}px`);
          if (s.kind !== "body") ok(`${tag} · the ${s.kind} fact list spaces "${s.words}" as the typed " · " does (within 1px)`, Math.abs(s.gap - s.typed) <= 1, `${s.gap} vs ${s.typed}`);
        }
        const eyebrows = seps.filter((s) => s.kind === "eyebrow").length;
        if (eyebrows > 0) {
          const red = (await separators(page, true)).filter((s) => s.kind === "eyebrow");
          console.log(`SEP′ ${tag} · CONTROL (the eyebrow rule undone: 0.9em) · ${red.map((s) => `"${s.words}" ${s.gap}px vs typed ${s.typed}px`).join(" | ")}`);
          ok(`${tag} · CONTROL · with the eyebrow rule undone in the page (the round-1 0.9em), the same judge reports each of the ${eyebrows} eyebrow lists`,
            red.length === eyebrows && red.every((s) => Math.abs(s.gap - s.typed) > 1), JSON.stringify(red));
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

// ── How to play's loading drawing, caught on the way in (S5-R2-REGISTER 15, the release's ui-consistency red) ─────────
// A route's loading file paints only on a CLIENT move (`ghost-landing.mjs`' rule), so the drive leaves the register for How
// through the app router (what a Link calls) on a throttled network, reads the drawing while it holds the screen, then the
// landed page: the swap card's button bar (the drawing's last) must stand at the example button's height. A pass where
// no drawing was caught proved nothing and fails as such.
if (SCENARIO !== "states" && wantPage("how-ghost")) {
  // The drawing is wordless, so its bars do not change with the language: the phone and the desktop column cover it.
  const ghostWidths = WIDTHS.filter((w) => w === 360 || w === 1280);
  for (const locale of LOCALES) {
    for (const width of ghostWidths.length ? ghostWidths : WIDTHS) {
      const tag = `how-ghost-${locale}-${width}`;
      const ctx = await contextWith([await demoSession(browser, BASE)], locale);
      const page = await ctx.newPage();
      page.on("pageerror", (e) => errs.push(`${tag}: ${e}`));
      await page.setViewportSize({ width, height: HEIGHT });
      await open(page, "/millionea/register");
      const cdp = await ctx.newCDPSession(page);
      await cdp.send("Network.enable");
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 12 * 1024, uploadThroughput: 64 * 1024 });
      await page.evaluate(() => { window.next?.router?.push("/millionea/how"); });
      const drawing = '[aria-busy="true"] .max-w-receipt';
      const drawn = await page.waitForSelector(drawing, { timeout: 20_000 }).then(() => true).catch(() => false);
      const ghost = drawn ? await page.evaluate((sel) => {
        const card = document.querySelector(sel);
        const bar = card?.lastElementChild;
        if (!card || !(bar instanceof HTMLElement)) return null;
        const box = (el) => { const r = el.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10 }; };
        const read = { card: box(card), button: box(bar) };
        // CONTROL: the same bar at the numeric utility's height (`h-10` = 80px on the overridden scale), read in place.
        bar.style.height = "80px";
        const planted = box(bar).h;
        bar.style.height = "";
        return { ...read, planted };
      }, drawing) : null;
      if (drawn) await page.locator(drawing).screenshot({ path: `${OUT}/${tag}-drawing.png` }).catch(() => {});
      await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
      await page.waitForSelector('[data-testid="millionea-how-example-play"]', { timeout: 60_000 }).catch(() => {});
      await settle(page);
      const real = await page.evaluate(() => {
        const card = document.querySelector('article[aria-labelledby="mln-how-ex-swap"]');
        const button = document.querySelector('[data-testid="millionea-how-example-play"]');
        if (!card || !button) return null;
        const box = (el) => { const r = el.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), h: Math.round(r.height * 10) / 10, w: Math.round(r.width * 10) / 10 }; };
        return { card: box(card), button: box(button) };
      });
      await page.locator('article[aria-labelledby="mln-how-ex-swap"]').screenshot({ path: `${OUT}/${tag}-page.png` }).catch(() => {});
      ok(`${tag} · How's loading drawing is shown on the way in`, drawn && !!ghost);
      ok(`${tag} · How lands with its example's button`, !!real);
      if (ghost && real) {
        console.log(`GHOST ${tag} · button: drawing ${ghost.button.h}×${ghost.button.w}px, page ${real.button.h}×${real.button.w}px · swap card: drawing y${ghost.card.y} h${ghost.card.h}, page y${real.card.y} h${real.card.h}`);
        ok(`${tag} · the drawing's button stands at the page button's height (within 1px)`, Math.abs(ghost.button.h - real.button.h) <= 1, `${ghost.button.h} vs ${real.button.h}`);
        ok(`${tag} · CONTROL · the bar at the numeric utility's 80px is reported by the same judge`, Math.abs(ghost.planted - real.button.h) > 1, `${ghost.planted} vs ${real.button.h}`);
      }
      await ctx.close();
    }
  }
}

ok("no page error on any page", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close();
console.log(`\nmaswali-register-shots (${SCENARIO}): ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
