/**
 * qa:landing-doors — THE CLASSIC LANDING'S DOOR ROW ON A REAL SERVER (Ali, 2026-10-22: the landing's ruling R19,
 * `docs/design-system/v4-2026-09-26-landing-ten/INHERIT-MANIFEST.md` §2, and DESIGN_AUTHORITY §M8a item 21 for its Millionea
 * door). `test:landing-doors` holds the source side; this reads the page as a browser lays it out.
 *
 *   A FRESH in-memory `next dev`, then:   BASE=http://localhost:3570 node scripts/landing-doors-shots.mjs
 *   · FEATURE_MILLIONEA=WITHDRAWN (production today): the DARK row — Live alone — for a visitor and the demo player at every
 *     width × sw/en/zh, with no Millionea trace in it;
 *   · FEATURE_MILLIONEA=ACTIVE (with MASWALI_SCHEDULER=false, LIFECYCLE_TICKER=false): before any week (dark); a week on sale
 *     with its sales paused (dark), then resumed (DRAWN: Live, then Millionea's line); a player on their own break (dark);
 *     the week closed (dark) — and Live's box in the dark and the drawn rows of one page, which must be the same box.
 * Measured on every page read: each door is ONE line (its words' line boxes), its box at least 40px tall (the box padded,
 * never the type), the row's start edge on the CTA's (a visitor) or the block's (a player) with Live's glyph ink on it, the
 * Millionea name's painted ink (the tab's gradient, its fill transparent), no motion, no horizontal overflow, and the hero's
 * own landmarks where they stood.
 * Tiles (MLN_OUT, default .50pick-shots/landing-doors): the act — the CTAs or the block, the row, the sign-off — at
 * 320·360·412·768·1024·1280·1920 × sw/en/zh for a visitor and a player, dark (and drawn on an ACTIVE server); the row close
 * up at 360 and 1280 at rest, hovered and focused, door by door; reduced motion; and one contact sheet per width and reader
 * (`sheet-…`: the three languages, dark beside drawn) so the tiles are read side by side. Measurements: `measure.json`.
 * ⛔ LOCAL ONLY: an in-memory dev server; it writes nothing but the dev endpoints' fixtures.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { demoSession, localBase, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3570";
const OUT = resolve(process.env.MLN_OUT || ".50pick-shots/landing-doors");
const WIDTHS = (process.env.MLN_WIDTHS ?? "320,360,412,768,1024,1280,1920").split(",").map(Number);
const LOCALES = (process.env.MLN_LOCALES ?? "sw,en,zh").split(",");
const HEIGHT = 900;
const ROW = '[data-testid="landing-doors"]', LIVE = '[data-testid="landing-live"]', LINE = '[data-testid="millionea-landing-line"]';
const WORDS = { en: "Be this week's winner?", sw: "Kuwa mshindi wa wiki hii?", zh: "成为本周赢家？" };
const LIVE_WORD = { en: "Live", sw: "Mubashara", zh: "直播" };
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`  ok   ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };
const j = (v) => JSON.stringify(v);

if (!localBase(BASE)) die(`local dev only, addressed as http://localhost:PORT — got ${j(BASE)}`);
const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
if (!health) die(`no server answered at ${BASE}/api/health`);
if (health.database?.configured !== false) die("the server reports a configured database — this drive runs only against an in-memory dev server");
if (health.simpleJourney?.state === "ACTIVE") die("the journey is ACTIVE: every reader is drawn the journey's home, not the classic landing");
const MODE = health.millionea?.state;
if (MODE !== "WITHDRAWN" && MODE !== "ACTIVE") die(`/api/health says millionea = ${j(health.millionea)}: run it at WITHDRAWN (production's state) or ACTIVE`);
mkdirSync(OUT, { recursive: true });
console.log(`landing-doors · ${BASE} · Millionea ${MODE} · widths ${WIDTHS.join(",")} · ${LOCALES.join(",")} · tiles in ${OUT}`);
// The book production has: a featured market beside the act from 1024 (above it below), the board under the hero. Without
// it the hero is the empty book's (`--solo`) — MLN_SEED_MARKETS=0 reads that state instead.
if (process.env.MLN_SEED_MARKETS !== "0") {
  const seeded = await fetch(`${BASE}/api/dev-test/seed-real-markets`, { method: "POST" }).then((r) => r.json()).catch(() => null);
  ok("PREMISE · the board's real markets seeded (a featured card beside the act)", seeded?.ok === true, j(seeded)?.slice(0, 160));
}

const browser = await chromium.launch();
const errs = [];
const measures = [];
async function contextWith(cookies, locale, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: HEIGHT }, ...opts });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
  return ctx;
}
async function open(page, path = "/") {
  const res = await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 180_000 });
  await page.waitForLoadState("networkidle", { timeout: 3_000 }).catch(() => {});
  await page.evaluate(async () => { await document.fonts.ready; await new Promise((d) => requestAnimationFrame(() => requestAnimationFrame(() => d(true)))); }).catch(() => {});
  // The hero's entrance (kp-rise) settles before anything is measured or drawn.
  await page.waitForTimeout(900);
  return res;
}
const act = async (data) => {
  const r = await fetch(`${BASE}/api/dev-test/maswali-hub-act`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(data) });
  const body = await r.json().catch(() => null);
  return { ok: r.ok && body?.ok === true, body, status: r.status };
};

/** The row as laid out: each door's box, its words' line count, its words and link; Live's glyph ink edge; the anchor above. */
const rowOn = (page) => page.evaluate(({ ROW }) => {
  const row = document.querySelector(ROW);
  if (!row) return null;
  const box = (e) => { const r = e.getBoundingClientRect(); return { x: +r.x.toFixed(2), y: +(r.y + scrollY).toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) }; };
  /** Line boxes of an element's words: the distinct tops of its text runs' rects (a second line sits a line-height lower). */
  const lines = (el) => {
    const tops = [];
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(n);
      for (const rc of rg.getClientRects()) if (rc.width > 0 && rc.height > 0) tops.push(rc.top);
    }
    tops.sort((a, b) => a - b);
    let count = 0, last = -1e9;
    for (const t of tops) { if (t - last > 6) count++; last = t; }
    return count;
  };
  const doors = [...row.children].map((a) => {
    const ink = a.querySelector(".kp-millionea-ink"), cs = ink ? getComputedStyle(ink) : null;
    return {
      id: a.getAttribute("data-testid"), tag: a.tagName, href: a.getAttribute("href"), text: a.textContent, lines: lines(a), ...box(a),
      font: getComputedStyle(a).fontSize, color: getComputedStyle(a).color, anims: a.getAnimations({ subtree: true }).length,
      ink: cs ? { bg: cs.backgroundImage, fill: cs.webkitTextFillColor, filter: cs.filter } : null,
    };
  });
  const live = row.querySelector('[data-testid="landing-live"] svg');
  let liveInk = null;
  if (live) { const r = live.getBoundingClientRect(); liveInk = +(r.left - (parseFloat(getComputedStyle(live).marginInlineStart) || 0)).toFixed(2); }
  const anchorEl = document.querySelector(".kp-hero__ctas > a") ?? document.querySelector('[data-testid="landing-mine"]');
  const anchor = anchorEl ? box(anchorEl) : null;
  const signoff = document.querySelector(".kp-hero__signoff");
  return { row: box(row), doors, liveInk, anchor, signoff: signoff ? box(signoff) : null, traces: row.innerHTML.includes("millionea") };
}, { ROW });
/** The hero's own landmarks, to see that the row's states moved none of them. */
const heroBoxes = (page) => page.evaluate(() => {
  const at = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)]; };
  return { h1: at(".kp-hero h1"), ctas: at(".kp-hero__ctas"), card: at(".kp-hero__card"), mine: at('[data-testid="landing-mine"]'), live: at('[data-testid="landing-live"]') };
});
const overflowOf = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);

/** The act's tile: from 24px above the CTAs (or the block) to 24px under the sign-off (or the row); at 1024 and up, the
 *  hero's left column with 32px either side, so the row is read in its own column at full size. */
async function shootAct(page, name) {
  const r = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)?.getBoundingClientRect() ?? null;
    const top = q(".kp-hero__ctas") ?? q('[data-testid="landing-mine"]'), row = q('[data-testid="landing-doors"]'), so = q(".kp-hero__signoff"), act = q(".kp-hero__act");
    if (!top || !row || !act) return null;
    const y0 = top.top + scrollY - 24, y1 = Math.max(row.bottom, so?.bottom ?? 0) + scrollY + 24;
    const wide = innerWidth >= 1024;
    const x0 = wide ? Math.max(0, act.left - 32) : 0, x1 = wide ? Math.min(innerWidth, act.right + 32) : innerWidth;
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  });
  if (!r) return null;
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 120)), r.y);
  await page.waitForTimeout(150);
  const sy = await page.evaluate(() => scrollY);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, clip: { x: r.x, y: r.y - sy, width: r.width, height: r.height } });
  return file;
}
/** The row close up: the row with 40px around it, full width below 1024, its column from 1024. */
async function shootRow(page, name) {
  const r = await page.evaluate(() => {
    const row = document.querySelector('[data-testid="landing-doors"]')?.getBoundingClientRect(), act = document.querySelector(".kp-hero__act")?.getBoundingClientRect();
    if (!row || !act) return null;
    const wide = innerWidth >= 1024;
    return { x: wide ? Math.max(0, act.left - 32) : 0, y: row.top + scrollY - 40, width: wide ? Math.min(innerWidth, act.right + 32) - Math.max(0, act.left - 32) : innerWidth, height: row.height + 80 };
  });
  if (!r) return;
  await page.evaluate((y) => window.scrollTo(0, Math.max(0, y - 200)), r.y);
  await page.waitForTimeout(150);
  const sy = await page.evaluate(() => scrollY);
  await page.screenshot({ path: `${OUT}/${name}.png`, clip: { x: r.x, y: r.y - sy, width: r.width, height: r.height } });
}

/** Read one page's row and hold it to the rules; returns the row. `drawn`: the Millionea door is expected. */
async function readRow(page, tag, locale, drawn, who) {
  const R = await rowOn(page);
  const ids = R?.doors.map((d) => d.id) ?? [];
  ok(`${tag}: the row is ${drawn ? "Live, then Millionea's line" : "Live alone"}`, !!R && j(ids) === j(drawn ? ["landing-live", "millionea-landing-line"] : ["landing-live"]), j(ids));
  if (!R) return null;
  const [live, line] = R.doors;
  ok(`${tag}: Live is one link to /live reading "${LIVE_WORD[locale]}" in the link ink, one line, its box ≥ 40px tall, no motion`,
    live?.tag === "A" && live.href === "/live" && live.text === LIVE_WORD[locale] && live.lines === 1 && live.h >= 40 && live.anims === 0, j(live));
  ok(`${tag}: the row's start edge is the ${who === "visitor" ? "CTA's" : "block's"}, and Live's glyph ink stands on it (±0.5px)`,
    !!R.anchor && Math.abs(R.row.x - R.anchor.x) <= 0.5 && R.liveInk !== null && Math.abs(R.liveInk - R.anchor.x) <= 0.5, `row ${R.row.x} · anchor ${R.anchor?.x} · ink ${R.liveInk}`);
  if (drawn) {
    ok(`${tag}: Millionea's door is one link to /millionea reading "${WORDS[locale]}" + the name, ONE line, its box ≥ 40px tall, no motion`,
      line?.tag === "A" && line.href === "/millionea" && line.text === `${WORDS[locale]}${locale === "zh" ? "" : " "}Millionea` && line.lines === 1 && line.h >= 40 && line.anims === 0, j(line));
    ok(`${tag}: the name wears the tab's ink as painted (a gradient clipped to the text, its fill transparent, the halo)`,
      !!line?.ink && /linear-gradient/.test(line.ink.bg) && /rgba\(0, 0, 0, 0\)|transparent/.test(line.ink.fill ?? "") && /drop-shadow/.test(line.ink.filter ?? ""), j(line?.ink));
    // Where both fit one line they share it; otherwise the row breaks only between them, the line under Live at its start.
    const shared = Math.abs(line.y - live.y) <= 0.5, under = line.y >= live.y + live.h - 0.5 && Math.abs(line.x - R.row.x) <= 0.5;
    ok(`${tag}: the two doors ${shared ? "share one line" : "break between them (the line under Live, on the row's start)"}`, shared || under, `live ${j([live.x, live.y])} line ${j([line.x, line.y])}`);
  } else ok(`${tag}: no Millionea trace in the row`, !R.traces, "");
  ok(`${tag}: no horizontal overflow`, (await overflowOf(page)) <= 1);
  measures.push({ tag, mode: MODE, drawn, who, locale, width: page.viewportSize().width, row: R.row, doors: R.doors.map(({ id, x, y, w, h, lines }) => ({ id, x, y, w, h, lines })), liveInk: R.liveInk, anchor: R.anchor, signoff: R.signoff });
  return R;
}
/** Tab from the top until the selector holds focus (at most 80 stops). */
async function tabTo(page, sel) {
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0); });
  for (let i = 0; i < 80; i++) {
    await page.keyboard.press("Tab");
    if (await page.evaluate((s) => document.activeElement?.matches?.(s) ?? false, sel)) return true;
  }
  return false;
}
const ringOf = (page, sel) => page.evaluate((s) => { const cs = getComputedStyle(document.querySelector(s)); return { outline: `${cs.outlineStyle} ${cs.outlineWidth}`, shadow: cs.boxShadow }; }, sel);
const ringShown = (ring) => !!ring && (ring.outline.split(" ")[0] !== "none" || (!!ring.shadow && ring.shadow !== "none"));

/** Hover and focus, door by door, at 360 and 1280 — and Enter follows each. */
async function closeUps(ctx, locale, drawn, who) {
  const page = await ctx.newPage();
  for (const width of [360, 1280]) {
    await page.setViewportSize({ width, height: HEIGHT });
    await open(page);
    const base = `${MODE.toLowerCase()}-${drawn ? "drawn" : "dark"}-${who}-${locale}-${width}`;
    await shootRow(page, `${base}-row`);
    const doors = drawn ? [["live", LIVE, /\/live(?:\?|$)/], ["line", LINE, /\/millionea(?:\?|$)/]] : [["live", LIVE, /\/live(?:\?|$)/]];
    for (const [k, sel, url] of doors) {
      await page.locator(sel).hover();
      await page.waitForTimeout(250);
      const hov = await rowOn(page);
      await shootRow(page, `${base}-row-hover-${k}`);
      if (k === "line") {
        const rest = (await (async () => { await page.mouse.move(0, 0); await page.waitForTimeout(250); return rowOn(page); })())?.doors[1]?.ink?.bg;
        ok(`${base}: hovering Millionea's door lifts the name one tint (the tab's own hover)`, !!rest && hov?.doors[1]?.ink?.bg !== rest && /linear-gradient/.test(hov?.doors[1]?.ink?.bg ?? ""), `${rest} → ${hov?.doors[1]?.ink?.bg}`);
      }
      await page.mouse.move(0, 0);
      const focused = await tabTo(page, sel);
      const ring = focused ? await ringOf(page, sel) : null;
      await shootRow(page, `${base}-row-focus-${k}`);
      ok(`${base}: Tab reaches the ${k === "live" ? "Live" : "Millionea"} door and it shows the focus ring`, focused && ringShown(ring), j(ring));
      if (focused) {
        await Promise.all([page.waitForURL(url, { timeout: 90_000 }).catch(() => {}), page.keyboard.press("Enter")]);
        ok(`${base}: Enter on the ${k === "live" ? "Live" : "Millionea"} door opens ${url.source.includes("live") ? "/live" : "/millionea"}`, url.test(new URL(page.url()).pathname), page.url());
        await open(page);
      }
    }
  }
  await page.close();
}

/** One sheet per width and reader: the three languages, dark beside drawn (one column from 768), each tile at full size. */
async function sheet(name, cells, cols) {
  const present = cells.filter((c) => c.file && existsSync(c.file));
  if (!present.length) return;
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#111;font:12px/1.3 system-ui;color:#ddd}
    .g{display:grid;grid-template-columns:repeat(${cols},max-content);gap:10px;padding:10px}.c{display:flex;flex-direction:column;gap:4px}
    img{display:block;outline:1px solid #444}</style><div class="g">${present.map((c) => `<div class="c"><div>${c.label}</div><img src="${pathToFileURL(c.file).href}"></div>`).join("")}</div>`;
  const f = `${OUT}/${name}.html`;
  writeFileSync(f, html);
  await page.goto(pathToFileURL(f).href);
  await page.waitForLoadState("load");
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  await page.close();
}

const tiles = {}; // `${who}-${locale}-${width}-${state}` → file
try {
  const player = await demoSession(browser, BASE);
  /** Every width × language for both readers in the current state: read the row, keep the boxes, draw the act. */
  const sweep = async (state, drawn, extra = () => {}) => {
    const out = {};
    for (const locale of LOCALES) for (const who of ["visitor", "player"]) {
      const ctx = await contextWith(who === "player" ? [player] : [], locale); const page = await ctx.newPage();
      page.on("pageerror", (e) => errs.push(`/ ${state} ${who} ${locale}: ${e}`));
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: HEIGHT });
        const res = await open(page);
        const tag = `${MODE.toLowerCase()} ${state} ${who} ${locale}@${width}`;
        ok(`${tag}: / answers 200 in ${locale}`, res?.status() === 200 && (await page.locator("html").getAttribute("lang")) === locale);
        await readRow(page, tag, locale, drawn, who);
        out[`${who}-${locale}-${width}`] = await heroBoxes(page);
        tiles[`${who}-${locale}-${width}-${state}`] = await shootAct(page, `${MODE.toLowerCase()}-${state}-${who}-${locale}-${width}`);
        await extra(page, tag);
      }
      await ctx.close();
    }
    return out;
  };

  if (MODE === "WITHDRAWN") {
    // ── production's state: the row is Live alone, for every reader ─────────────────────────────────────────────────────
    await sweep("dark", false);
    for (const locale of LOCALES) { const ctx = await contextWith([], locale); await closeUps(ctx, locale, false, "visitor"); await ctx.close(); }
  } else {
    // ── 1 · before any week: dark ───────────────────────────────────────────────────────────────────────────────────────
    {
      const ctx = await contextWith([], "en"); const page = await ctx.newPage();
      await open(page);
      await readRow(page, "active before any week visitor en@360", "en", false, "visitor");
      await ctx.close();
    }
    // ── 2 · a public week on sale, its sales paused: dark ───────────────────────────────────────────────────────────────
    const seed = await fetch(`${BASE}/api/dev-test/seed-maswali`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.json()).catch(() => null);
    ok("PREMISE · seed-maswali opened a public week on sale", seed?.ok === true && !!seed?.weeks?.selling, j(seed)?.slice(0, 200));
    const paused = await act({ act: "pause", on: true });
    ok("PREMISE · sales paused (the officer's own pause)", paused.ok, j(paused.body)?.slice(0, 160));
    const dark = await sweep("dark", false);
    // ── 3 · resumed: drawn — and nothing above the row moved, Live included ─────────────────────────────────────────────
    const resumed = await act({ act: "pause", on: false });
    ok("PREMISE · sales resumed", resumed.ok, j(resumed.body)?.slice(0, 160));
    const drawn = await sweep("drawn", true);
    for (const k of Object.keys(drawn)) {
      const a = dark[k], b = drawn[k];
      ok(`${k}: dark → drawn, the hero's h1, CTAs, card and the player's block stand where they stood — and Live's box is the same box`,
        ["h1", "ctas", "card", "mine", "live"].every((p) => j(a?.[p] ?? null) === j(b?.[p] ?? null)), `${j(a)} → ${j(b)}`);
    }
    for (const locale of LOCALES) { const ctx = await contextWith([], locale); await closeUps(ctx, locale, true, "visitor"); await ctx.close(); }
    // ── 4 · reduced motion: the row drawn at rest ───────────────────────────────────────────────────────────────────────
    for (const locale of LOCALES) {
      const ctx = await contextWith([], locale, { reducedMotion: "reduce" }); const page = await ctx.newPage();
      for (const width of [360, 1280]) {
        await page.setViewportSize({ width, height: HEIGHT });
        await open(page);
        const R = await readRow(page, `active reduced-motion visitor ${locale}@${width}`, locale, true, "visitor");
        await shootRow(page, `active-reduced-visitor-${locale}-${width}-row`);
        ok(`reduced motion ${locale}@${width}: no animation on either door`, !!R && R.doors.every((d) => d.anims === 0));
      }
      await ctx.close();
    }
    // ── 5 · a player on their own cooling-off: Live alone, the break's notice in the block ──────────────────────────────
    for (const locale of LOCALES) {
      const ctx = await contextWith([], locale); const page = await ctx.newPage();
      const r = await ctx.request.post(`${BASE}/api/dev-test/maswali-hub-act`, { data: { act: "breakPlayer", tickets: 1 }, timeout: 120_000 });
      const body = await r.json().catch(() => null);
      ok(`PREMISE · ${locale}: a player on their own cooling-off (breakPlayer)`, r.ok() && body?.ok === true && body?.onBreak === true, j(body)?.slice(0, 160));
      for (const width of [320, 360, 1280]) {
        await page.setViewportSize({ width, height: HEIGHT });
        await open(page);
        await readRow(page, `active break player ${locale}@${width}`, locale, false, "player");
        ok(`active break player ${locale}@${width}: the break's own notice in the block`, (await page.locator('[data-testid="landing-mine-break"]').count()) === 1);
        await shootAct(page, `active-break-player-${locale}-${width}`);
      }
      await ctx.close();
    }
    // ── 6 · the week closed: dark ───────────────────────────────────────────────────────────────────────────────────────
    const closed = await act({ act: "closeOpen" });
    ok("PREMISE · the week on sale closed (closeOpen)", closed.ok, j(closed.body)?.slice(0, 160));
    for (const locale of LOCALES) {
      const ctx = await contextWith([], locale); const page = await ctx.newPage();
      await page.setViewportSize({ width: 360, height: HEIGHT });
      await open(page);
      await readRow(page, `active closed visitor ${locale}@360`, locale, false, "visitor");
      await ctx.close();
    }
  }
  // ── the sheets: per width and reader, the three languages, dark beside drawn ───────────────────────────────────────────
  const states = MODE === "ACTIVE" ? ["dark", "drawn"] : ["dark"];
  for (const width of WIDTHS) for (const who of ["visitor", "player"]) {
    const cells = LOCALES.flatMap((l) => states.map((s) => ({ label: `${who} · ${l} · ${width} · ${s}`, file: tiles[`${who}-${l}-${width}-${s}`] })));
    await sheet(`sheet-${MODE.toLowerCase()}-${who}-${width}`, cells, width >= 768 ? 1 : states.length);
  }
} finally {
  writeFileSync(`${OUT}/measure-${MODE.toLowerCase()}.json`, JSON.stringify(measures, null, 1));
  await browser.close();
}
ok("no page error on any page", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\nlanding-doors (${MODE}): ${pass} passed, ${fail} failed · tiles and measure-${MODE.toLowerCase()}.json in ${OUT}/`);
process.exit(fail === 0 ? 0 : 1);
