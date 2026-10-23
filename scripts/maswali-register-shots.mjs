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
/**
 * ⚠️ PREMISE — THE FULL MOTION TIER (MASWALI-BUILD S5-R3-FIX, the lead's ruling of 2026-10-23, as HUB's drive does). The
 * platform throttles its motion on a device that reports four cores or fewer (`theme-provider.tsx` sets the low-end tier),
 * and GitHub's runners report four, so a ghost or a motion read there would measure the machine's tier, not the page's.
 * Each reader's browser reports eight cores, as a desktop or a phone above the line does; the machine's own are printed.
 */
const FULL_TIER_CORES = 8;
{
  const probe = await browser.newPage();
  const raw = await probe.evaluate(() => ({ cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory ?? null }));
  await probe.close();
  console.log(`INFO premise · this machine's browser reports ${raw.cores} cores and ${raw.memory} GB; each reader's reports ${FULL_TIER_CORES} cores (the full motion tier)`);
}
async function contextWith(cookies, locale, extra = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: HEIGHT }, ...extra });
  await ctx.addInitScript((cores) => { Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { get: () => cores, configurable: true }); }, FULL_TIER_CORES);
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
 *  tile and its cover census never catch it mid-fade: two reads 60ms apart agree (at most 1.2s). The bubble mounts after
 *  the page hydrates and asks its census on its first frame: it is waited for (at most 3s) and given two frames first — read
 *  before its census had run, it stood at full ink over a figure it yields to every time (week-rolled-sw-360, 2026-10-22;
 *  20 fresh opens of that page, nothing planted: yielded in all 20 by 2.5s). */
async function still(page) {
  await page.waitForSelector(".cm-fab", { state: "attached", timeout: 3_000 }).catch(() => {});
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true)))));
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

/** Every finite animation on the page at its end (an infinite one — a shimmer, a pulse — never ends: left out), or `cap` ms. */
async function motionDone(page, cap = 3_000) {
  await page.evaluate((cap) => Promise.race([
    Promise.all(document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity).map((a) => a.finished.catch(() => {}))),
    new Promise((r) => setTimeout(r, cap)),
  ]), cap);
}

/**
 * THE LEDGER'S RHYTHM, ITS FIGURES' EDGE AND ITS CARRY'S TARGET, as the page draws them (the lead's rulings of 2026-10-22,
 * from HUB's sw/en/zh readers of the hub's pool card): every row the list's one gap apart and its own drawing at its top —
 * no step under a total (round 1's stood 46px against the rows' 26px pitch), and no carry link row centring its line in a
 * 44px box (~30px of air over the card's first row against ~20px under its last); every figure, each line of a wrapped one,
 * at its row's right edge (a wrapped "angalau / TZS 51,000" sat ~56px short of it); and every carry link row still a
 * `--tap-min` target, out of flow (`.kp-mln-hit`) — hit-tested 19.5px above and below the row's middle, which the link must
 * answer (a bounding box cannot show it): the row scrolled to the viewport's middle for that, after every row is measured,
 * and the page put back where it was. `plant` first puts defects in the page, and takes them out before it returns:
 * "rhythm" — a 16px step under the first total, one figure 24px short of the edge, a carry row drawn as its old 44px
 * centring box; "tap" — a carry row without its target. The same judge must report each.
 */
async function ledgerJudge(page, plant = null) {
  return page.evaluate((plant) => {
    const out = { lists: 0, rows: 0, links: 0, steps: [], short: [], taps: [] };
    const kit = (r) => r.firstElementChild; // the kit's ReceiptRow, first in its row (a note follows it)
    const undo = [];
    const links = [];
    const y0 = scrollY;
    for (const list of document.querySelectorAll('[data-testid="millionea-ledger"]')) {
      out.lists++;
      const rows = [...list.children];
      const link = rows.find((r) => r.tagName === "A");
      if (plant === "rhythm") {
        const total = rows.findIndex((r) => kit(r)?.classList.contains("border-t"));
        const after = total < 0 ? null : rows.slice(total + 1).find((r) => r.tagName !== "A");
        if (after) { kit(after).style.marginTop = "16px"; undo.push(() => { kit(after).style.marginTop = ""; }); }
        const v = rows.map((r) => kit(r)?.lastElementChild).find((x) => x && x.textContent.trim() !== "");
        if (v) { v.style.marginRight = "24px"; undo.push(() => { v.style.marginRight = ""; }); }
        // The old drawing: a box 24px taller than its line, the line centred in it (12px over it, as a one-line row stood in 44px).
        if (link) { link.style.minHeight = `${link.getBoundingClientRect().height + 24}px`; link.style.justifyContent = "center"; undo.push(() => { link.style.minHeight = ""; link.style.justifyContent = ""; }); }
      }
      if (plant === "tap" && link) { link.classList.remove("kp-mln-hit"); undo.push(() => { link.classList.add("kp-mln-hit"); }); }
      const gap = parseFloat(getComputedStyle(list).rowGap) || 0;
      let prev = null;
      for (const r of rows) {
        out.rows++;
        const key = r.getAttribute("data-ledger-row");
        const box = r.getBoundingClientRect(), k = kit(r)?.getBoundingClientRect();
        if (prev !== null && Math.abs(box.top - prev - gap) > 0.5) out.steps.push([key, "row gap", Math.round((box.top - prev) * 10) / 10]);
        if (k && Math.abs(k.top - box.top) > 0.5) out.steps.push([key, "step inside the row", Math.round((k.top - box.top) * 10) / 10]);
        prev = box.bottom;
        if (r.tagName === "A") links.push(r);
        const v = kit(r)?.lastElementChild;
        if (!v || !k || v.textContent.trim() === "") continue;
        // Each LINE's right edge (the rightmost box on it), against the row's.
        const range = document.createRange();
        range.selectNodeContents(v);
        const lines = [];
        for (const x of range.getClientRects()) {
          if (x.width <= 0.5) continue;
          const mid = x.top + x.height / 2, line = lines.find((l) => Math.abs(l.mid - mid) <= 6);
          if (line) line.right = Math.max(line.right, x.right); else lines.push({ mid, right: x.right });
        }
        for (const l of lines) if (Math.abs(l.right - k.right) > 1) out.short.push([key, `${lines.length} line(s)`, Math.round((k.right - l.right) * 10) / 10]);
      }
    }
    // Every carry link row's target, hit-tested where the reader's thumb lands.
    for (const r of links) {
      out.links++;
      r.scrollIntoView({ block: "center" });
      const b = r.getBoundingClientRect(), x = b.left + b.width / 2, mid = b.top + b.height / 2;
      const miss = [-19.5, 19.5].filter((dy) => document.elementFromPoint(x, mid + dy)?.closest("a") !== r);
      if (miss.length) out.taps.push([r.getAttribute("data-ledger-row"), Math.round(b.height * 10) / 10, miss]);
    }
    for (const u of undo) u();
    window.scrollTo(0, y0);
    return out;
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
        // A ledger is drawn on a final week's page and in How's worked weeks: there a resting control must clear its figures
        // (the tile first, at the top) — and the ledger keeps one rhythm, every figure at its row's edge, every carry row a
        // tap-floor target (the lead's rulings of 2026-10-22); the same judge, each defect planted in the page, reports it.
        const ledgered = name === "how" || (!!kind && !RUNNING.has(kind));
        await shoot(page, `${label === "main" ? "" : `${label}-`}${name}`, locale, width, ledgered);
        if (ledgered) {
          // Every finite animation at its end first (How's worked week plays its rows in): a row mid-flight is not the rhythm.
          await motionDone(page);
          const lj = await ledgerJudge(page);
          console.log(`LEDGER ${tag} · ${lj.lists} list(s), ${lj.rows} rows, ${lj.links} carry link(s) · steps ${JSON.stringify(lj.steps)} · short ${JSON.stringify(lj.short)} · taps ${JSON.stringify(lj.taps)}`);
          ok(`${tag} · the ledger keeps one rhythm: every row the list's one gap apart and its drawing at its top — no step under a total, no carry row centred in a box (${lj.rows} rows)`, lj.lists > 0 && lj.steps.length === 0, JSON.stringify(lj.steps));
          ok(`${tag} · every figure of the ledger ends at its row's right edge, each line of a wrapped one too`, lj.lists > 0 && lj.short.length === 0, JSON.stringify(lj.short));
          ok(`${tag} · every carry row of the ledger answers a tap 19.5px above and below its middle (${lj.links} link(s))`, lj.taps.length === 0, JSON.stringify(lj.taps));
          const red = await ledgerJudge(page, "rhythm");
          ok(`${tag} · CONTROL · a 16px step under the first total, a figure 24px short${lj.links ? " and a carry row centred in its old 44px box" : ""}, planted in the page, are each reported`,
            red.steps.some(([, what, px]) => what === "step inside the row" && Math.abs(px - 16) <= 0.5) && red.short.some(([, , px]) => Math.abs(px - 24) <= 1)
              && (lj.links === 0 || red.steps.some(([, what, px]) => what === "step inside the row" && Math.abs(px - 12) <= 0.5)), JSON.stringify(red));
          if (lj.links) {
            const tap = await ledgerJudge(page, "tap");
            ok(`${tag} · CONTROL · a carry row without its out-of-flow target, planted in the page, is reported`, tap.taps.length > 0, JSON.stringify(tap.taps));
          }
        }
      }
    }
    await ctx.close();
  }
}
await pass1("main", PAGES);

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

// ── How to play's loading drawing, caught on the way in (S5-R2-REGISTER 15 and 18) ──────────────────────────────────────
// A route's loading file paints only on a CLIENT move (`ghost-landing.mjs`' rule), so the drive leaves the register for How
// through the app router (what a Link calls) on a throttled network, reads How's own drawing (`[data-ghost="steps"]`) while
// it holds the screen, then the landed page — band by band, each where the page puts it and as tall, within 1px: the steps,
// the timeline, the examples' top, the swap card, its seal line and its button (the kit's control height; the CONTROL reads
// the same bar at the numeric utility's 80px and requires the judge to report it). The drawing's lines are the page's as
// measured per language (`how-ghost.tsx`), so the drive reads all three, at a width of each of its tiers: below 360, from
// 360, from 768 (and the board width). A pass where no drawing was caught proved nothing and fails as such.
/** How's bands, off its drawing or off the landed page: document y and height. */
const HOW_BANDS = (drawing) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), h: Math.round(r.height * 10) / 10 }; };
  if (drawing) {
    const g = document.querySelector('[aria-busy="true"]:has([data-ghost="steps"])');
    const q = (n) => g?.querySelector(`[data-ghost="${n}"]`) ?? null;
    return { steps: box(q("steps")), timeline: box(q("timeline")), examples: box(q("examples")), swap: box(q("examples")?.querySelector(".max-w-receipt") ?? null),
      seal: box(q("seal")), button: box(q("button")?.firstElementChild ?? null) };
  }
  const swap = document.querySelector('article[aria-labelledby="mln-how-ex-swap"]');
  return { steps: box(document.querySelector('[data-testid="millionea-how"] > ol')), timeline: box(document.querySelector('section[aria-labelledby="mln-how-timeline"]')),
    examples: box(document.querySelector('section[aria-labelledby="mln-how-examples"]')), swap: box(swap), seal: box(swap?.querySelector(":scope > div > div:first-child") ?? null),
    button: box(document.querySelector('[data-testid="millionea-how-example-play"]')) };
};
/** One client hop on the throttled network: the destination's OWN drawing caught on the way in (`drawingSel` — until a
 *  parent's loading file picks by address, a parent's drawing may come first: `qa:millionea-ghost-hops` judges WHICH drawing
 *  is up, this reads the destination's own), its bands read (`bands(true)`), then the landed page's (`bands(false)`), and
 *  `control` run on the drawing in place. Tiles of both. */
/** The lines each paragraph a drawing models takes on the landed page (S5-R3-FIX F6): a drawing's tables are corrected from
 *  these, read in the engine that drew the page — printed as a `LINES` line beside each `GHOST` line. */
const PAGE_LINES = (what) => {
  const L = (el) => {
    if (!el) return "-";
    const rects = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentElement && n.parentElement.closest(".sr-only") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      if (!n.textContent.trim()) continue;
      const r = document.createRange();
      r.selectNodeContents(n);
      for (const x of r.getClientRects()) if (x.width > 0.5 && x.height > 0) rects.push(x);
    }
    const mids = [];
    for (const x of rects.sort((a, b) => a.top - b.top)) { const m = x.top + x.height / 2; if (!mids.some((y) => Math.abs(y - m) < 5)) mids.push(m); }
    return String(mids.length);
  };
  const q = (s) => document.querySelector(s);
  if (what === "how") return `steps ${[...document.querySelectorAll('[data-testid="millionea-how"] > ol > li')].map((li) => L(li.lastElementChild)).join(",")} · caption ${L(q('article[aria-labelledby="mln-how-ex-swap"] p'))}`;
  if (what === "index") return `intro ${L(q('[data-testid="millionea-register-intro"]'))}`;
  const facts = q('[data-testid="millionea-week-head-facts"]');
  const commit = q('[data-testid="millionea-commitments"] > div');
  const cols = commit ? [...commit.querySelectorAll(":scope > div")] : [];
  const rows = [...document.querySelectorAll('[data-testid="millionea-ledger"] > [data-ledger-row]')].map((row) => `${row.getAttribute("data-ledger-row")} ${L(row.firstElementChild?.firstElementChild ?? null)}`);
  return `facts ${L(facts)} · times ${L(facts ? facts.nextElementSibling : null)} · ledger ${rows.join(",")} · fingerprints ${cols.map((c) => L(c.children[1] ?? null)).join(",")} · commitment times ${cols.map((c) => L(c.children[2] ?? null)).join(",")} · explainer ${L(commit ? commit.querySelector(":scope > p") : null)}`;
};
async function hopBands({ tag, locale, width, from, to, drawingSel, readySel, bands, control = null, linesOf = null }) {
  const ctx = await contextWith([await demoSession(browser, BASE)], locale);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errs.push(`${tag}: ${e}`));
  await page.setViewportSize({ width, height: HEIGHT });
  await open(page, from);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 400, downloadThroughput: 12 * 1024, uploadThroughput: 64 * 1024 });
  await page.evaluate((path) => { window.next?.router?.push(path); }, to);
  const drawn = await page.waitForSelector(drawingSel, { timeout: 60_000 }).then(() => true).catch(() => false);
  // The route's entrance at its end first (`.route-enter`: m-settle-in, 10px → 0 over --t-move, restarted by the hop): read
  // mid-rise, every band of a drawing stood 1–10px low (week-ghost-en-320 7px, -768 10px, -zh-1280 5px; 2026-10-22).
  if (drawn) await motionDone(page, 1_500);
  const ghost = drawn ? await page.evaluate(bands, true) : null;
  const planted = drawn && control ? await page.evaluate(control) : null;
  if (drawn) await page.screenshot({ path: `${OUT}/${tag}-drawing.png` }).catch(() => {});
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.waitForSelector(readySel, { timeout: 60_000 }).catch(() => {});
  await settle(page);
  const real = await page.evaluate(bands, false);
  if (linesOf) console.log(`LINES ${tag} · ${await page.evaluate(PAGE_LINES, linesOf)}`);
  await page.screenshot({ path: `${OUT}/${tag}-page.png` }).catch(() => {});
  await ctx.close();
  return { drawn, ghost, real, planted };
}
/** Every band where the page puts it and as tall, within 1px — `topOnly` bands by their top alone, `heightOnly` bands by their
 *  height alone (a band under a section whose rows the drawing cannot know: where it starts moves with them, how tall it
 *  is does not), `info` bands printed and not judged — and the whole comparison printed. */
function judgeBands(tag, label, ghost, real, { topOnly = [], heightOnly = [], info = [] } = {}) {
  const off = Object.keys(real).map((k) => [k, real[k] && ghost[k] ? { dy: real[k].y - ghost[k].y, dh: Math.round((real[k].h - ghost[k].h) * 10) / 10 } : null]);
  console.log(`GHOST ${tag} · page − drawing, px: ${off.map(([k, o]) => (o ? `${k} y${o.dy} h${o.dh}` : `${k} —`)).join(" · ")}`);
  const bad = off.filter(([k, o]) => !info.includes(k) && (!o || (!heightOnly.includes(k) && Math.abs(o.dy) > 1) || (!topOnly.includes(k) && Math.abs(o.dh) > 1)));
  ok(`${tag} · ${label}`, bad.length === 0, JSON.stringify({ bad, ghost, real }));
}
/** The widths a drawing's tiers turn at (below 360, from 360, from 768) and the board's. */
const GHOST_WIDTHS = WIDTHS.filter((w) => [320, 360, 768, 1280].includes(w));
if (SCENARIO !== "states" && wantPage("how-ghost")) {
  for (const locale of LOCALES) {
    for (const width of GHOST_WIDTHS.length ? GHOST_WIDTHS : WIDTHS) {
      const tag = `how-ghost-${locale}-${width}`;
      const r = await hopBands({ tag, locale, width, from: "/millionea/register", to: "/millionea/how", drawingSel: '[aria-busy="true"] [data-ghost="steps"]',
        readySel: '[data-testid="millionea-how-example-play"]', bands: HOW_BANDS, linesOf: "how",
        // CONTROL: the drawing's button bar at the numeric utility's height (`h-10` = 80px on the overridden scale), read in place.
        control: () => {
          const bar = document.querySelector('[aria-busy="true"] [data-ghost="button"] > *');
          if (!(bar instanceof HTMLElement)) return null;
          bar.style.height = "80px";
          const h = bar.getBoundingClientRect().height;
          bar.style.height = "";
          return h;
        } });
      ok(`${tag} · How's own loading drawing is shown on the way in`, r.drawn && !!r.ghost);
      if (r.ghost && r.real) {
        // The examples' section: its drawing holds the swap's card alone (the worked weeks below are past the first screens).
        judgeBands(tag, "every band of How lands where its drawing stood and as tall (within 1px): steps, timeline, examples' top, swap card, seal line, button", r.ghost, r.real, { topOnly: ["examples"] });
        ok(`${tag} · CONTROL · the button bar at the numeric utility's 80px is reported by the same judge`, r.planted !== null && r.real.button !== null && Math.abs(r.planted - r.real.button.h) > 1, `${r.planted} vs ${r.real.button?.h}`);
      }
    }
  }
}

// ── The register's two loading drawings, caught on the way in (S5-R2-REGISTER 21) ───────────────────────────────────────
// The index's from How, and a week's from the index (the register segment's loading picks it, S5-R2-REGISTER 18), band by
// band as How's: where the page puts each band and as tall, within 1px. The states seed opens the index as a week on sale
// opens it — its first running row the week on sale — and the week drawn is a rolled one, the common weekly case. What a
// drawing cannot know — the week's data — is printed, not judged: how many rows "In progress" holds (the seed's five), so where the
// final weeks start; how many rows a week's ledger holds, so how tall its card is and where the commitments start.
const INDEX_BANDS = (drawing) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), h: Math.round(r.height * 10) / 10 }; };
  if (drawing) {
    const g = document.querySelector('[aria-busy="true"][data-ghost-page="register"]');
    const q = (n) => g?.querySelector(`[data-ghost="${n}"]`) ?? null;
    return { head: box(q("head")), running: box(q("running")), row: box(q("running")?.querySelector(":scope > div > :first-child") ?? null), final: box(q("final")) };
  }
  const running = document.querySelector('[data-testid="millionea-register-running"]');
  return { head: box(document.querySelector('[data-testid="millionea-register"] > :first-child')), running: box(running),
    row: box(running?.querySelector("li") ?? null), final: box(document.querySelector('[data-testid="millionea-register-final"]')) };
};
const WEEK_BANDS = (drawing) => {
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { y: Math.round(r.top + scrollY), h: Math.round(r.height * 10) / 10 }; };
  if (drawing) {
    const g = document.querySelector('[aria-busy="true"][data-ghost-page="week"]');
    const q = (n) => g?.querySelector(`[data-ghost="${n}"]`) ?? null;
    const commit = q("commitments")?.lastElementChild ?? null;
    return { back: box(g?.firstElementChild ?? null), head: box(q("head")), ledger: box(q("ledger")), card: box(q("ledger")?.lastElementChild ?? null), commitments: box(q("commitments")),
      commitCard: box(commit), explainer: box(commit?.lastElementChild ?? null) };
  }
  const p = document.querySelector('[data-testid="millionea-register-week"]');
  const ledger = document.querySelector('section[aria-labelledby="mln-reg-ledger"]');
  const commitments = document.querySelector('[data-testid="millionea-commitments"]');
  const commit = commitments?.querySelector(":scope > div") ?? null;
  return { back: box(p?.firstElementChild ?? null), head: box(p?.children[1] ?? null), ledger: box(ledger), card: box(ledger?.lastElementChild ?? null),
    commitments: box(commitments), commitCard: box(commit), explainer: box(commit?.querySelector(":scope > p") ?? null) };
};
if (SCENARIO === "states" && wantPage("register-ghosts")) {
  for (const locale of LOCALES) {
    for (const width of GHOST_WIDTHS.length ? GHOST_WIDTHS : WIDTHS) {
      const itag = `index-ghost-${locale}-${width}`;
      const i = await hopBands({ tag: itag, locale, width, from: "/millionea/how", to: "/millionea/register", drawingSel: '[aria-busy="true"][data-ghost-page="register"]',
        readySel: '[data-testid="millionea-register"]', bands: INDEX_BANDS, linesOf: "index" });
      ok(`${itag} · the index's own loading drawing is shown on the way in`, i.drawn && !!i.ghost);
      if (i.ghost && i.real) judgeBands(itag, "the index lands where its drawing stood (within 1px): the head with its intro, the running section's top, its first row", i.ghost, i.real, { topOnly: ["running"], info: ["final"] });
      if (!weeks.rolled) continue;
      const wtag = `week-ghost-${locale}-${width}`;
      const w = await hopBands({ tag: wtag, locale, width, from: "/millionea/register", to: `/millionea/register/${encodeURIComponent(weeks.rolled)}`,
        drawingSel: '[aria-busy="true"][data-ghost-page="week"]', readySel: '[data-testid="millionea-register-week"]', bands: WEEK_BANDS, linesOf: "week" });
      ok(`${wtag} · the week's own loading drawing is shown on the way in`, w.drawn && !!w.ghost);
      // The drawing is a rolled week's (the common weekly case), and the hop opens one: its ledger card row for row in the
      // reader's language (a wrapped label drawn as its lines) and the commitments under it, every band where the page puts
      // it and as tall. (A week of another kind holds other rows: its card's height, and what follows, are its own.)
      if (w.ghost && w.real) judgeBands(wtag, "a rolled week lands where its drawing stood (within 1px): the back link, the head, the ledger (its heading and its card, row for row) and the commitments (their card and its closing sentence)", w.ghost, w.real);
    }
  }
}

// The sales paused: the selling week's chip ("Paused for now") on its row and its page. LAST, after every other read: the
// pause changes the store — the week on sale loses its close's fact — so a section read after it would read a paused
// week (the register-ghosts hop did: the index's first row 73px, not the week on sale's 96).
const PAUSED = [["index", "/millionea/register", null], ["week-selling", `/millionea/register/${encodeURIComponent(weeks.selling ?? "")}`, "selling"]].filter(([name]) => wantPage(name));
if (SCENARIO === "states" && weeks.selling && PAUSED.length > 0) {
  const ctx = await browser.newContext();
  const r = await ctx.request.post(`${BASE}/api/dev-test/seed-maswali-register`, { data: { pause: true } });
  ok("the sales are paused", r.ok(), `${r.status()}`);
  await ctx.close();
  await pass1("paused", PAUSED);
}

ok("no page error on any page", errs.length === 0, errs.slice(0, 3).join(" | "));
await browser.close();
console.log(`\nmaswali-register-shots (${SCENARIO}): ${pass} passed, ${fail} failed · tiles in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
