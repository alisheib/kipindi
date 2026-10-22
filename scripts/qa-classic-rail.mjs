/**
 * qa:classic-rail — THE CLASSIC PHONE RAIL, THE WHOLE BAR (Ali, 2026-10-22: "make sure it takes the perfect design and the
 * whole navbar is tested, visually and logically still appealing"; DESIGN_AUTHORITY §M8a item 11: while Millionea's door
 * is drawn its track takes Live's place — Markets · Up & Down · Deposit · Millionea · More — and Live leads More).
 * `test:millionea-shell` §6 holds the composition and the lit slot in source; this reads the bar Chromium draws.
 *
 *   A FRESH in-memory dev server (DISABLE_ADMIN_TOTP=true), twice:
 *     FEATURE_MILLIONEA=ACTIVE → RAIL=drawn: a guest, the demo player, the demo player's held wallet, then the player on a
 *       real break (taken through /profile/responsible-gambling: Millionea visible, its door not drawn);
 *     FEATURE_MILLIONEA unset (WITHDRAWN) → RAIL=dark: a guest, the demo player, the held wallet.
 *   BASE=http://localhost:3500 RAIL=drawn node scripts/qa-classic-rail.mjs [outDir]
 *
 * For each composition, at 320 · 360 · 412 · 768 (portrait) and 740×360 (landscape), in sw · en · zh, on /markets:
 *   - the five slots in order, Millionea's track exactly where its door is drawn and Live's otherwise;
 *   - every slot a tap target of 40 × 40 or more; every label whole (never cut by its ellipsis) and on one line (the
 *     Swahili "Juu na Chini" alone wraps, by the classic rail's own rule); no two labels closer than 8px (their pips' gap);
 *   - the coin's disc centred on the bar (±0.5px); the Up & Down dot on its pip's corner (2px down, 9px in);
 *   - Millionea's track drawn as its siblings (pip box and top, glyph box and centre, label font, size, weight, tracking,
 *     line height and top) — only its label's ink differs, and its resting glyph is gold;
 *   - More opened by a real tap: its rows in order (Live first while Millionea is drawn), every row ≥ 44px, the panel
 *     inside the viewport; shots of the rail and of the open panel (outDir).
 * Once per composition and language, at 360: every destination's lit slot and More's current row (/live: More, Live's
 * row current), the keyboard's focus ring on each slot, a touch tap on More leaving no hover behind, reduced motion's
 * clamped slot transitions, the Needle's disc clear of every slot, and the 1023 → 1024 handover (the rail gone at 1024;
 * the top bar's Millionea link there exactly when the door is drawn). WITHDRAWN: no Millionea trace in any page read
 * (qa:live's matcher). Safe-area insets: Playwright reports every inset as 0 (globals.css D54), so the rail's inset rules
 * are read from the stylesheet, not seen.
 * ⚠️ RAIL=drawn takes a real one-hour break on the dev store's demo account: run it on a fresh in-memory server.
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { premise, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { millioneaTracesIn } from "./live/millionea-dark.mjs";

const BASE = process.env.BASE || "http://localhost:3000";
const MODE = process.env.RAIL === "dark" ? "dark" : "drawn";
const OUT = resolve(process.argv[2] ?? join(process.cwd(), ".qa-artifacts", "classic-rail", MODE));
const LOCALES = (process.env.LOCALES || "sw,en,zh").split(",");
const PORTRAIT = (process.env.WIDTHS || "320,360,412,768").split(",").map(Number);
const LANDSCAPE = { width: 740, height: 360 };
mkdirSync(OUT, { recursive: true });
let pass = 0;
const fails = [];
const rows = [];
const ok = (label, cond, extra = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label} ${extra}`); }
  else { fails.push(`${label} ${extra}`); console.log(`  ✗ ${label} ${extra}`); }
};
const settle = async (page) => {
  await page.waitForLoadState("load", { timeout: 60_000 }).catch(() => {});
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  // A dev server's own indicator (Next's "N" badge) sits over the rail's first slot: hidden, so the tiles show the bar.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" }).catch(() => {});
  await page.waitForTimeout(400);
};

/** In the page: the classic rail as drawn — each slot's boxes, label metrics and state. */
const READ_RAIL = () => {
  const nav = document.querySelector("nav.kp-rail:not(.kp-rail--journey)");
  if (!nav) return null;
  const R = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: +r.left.toFixed(2), y: +r.top.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), r: +r.right.toFixed(2), b: +r.bottom.toFixed(2) };
  };
  const shown = getComputedStyle(nav).display !== "none" && nav.getBoundingClientRect().height > 0;
  const slots = [...nav.querySelectorAll(":scope > ul > li")].map((li) => {
    const el = li.querySelector("a.kp-rail__item, button.kp-rail__item");
    const pip = el?.querySelector(".kp-rail__pip") ?? el?.querySelector(".kp-coin");
    const glyph = el?.querySelector(".kp-rail__pip svg") ?? el?.querySelector(".kp-coin svg, .kp-coin__hub");
    const label = el?.querySelector(".kp-rail__label");
    // The label's TEXT boxes alone (an ink span's own box inside a flex label is not a line of text).
    const rects = [];
    if (label) {
      const walker = document.createTreeWalker(label, NodeFilter.SHOW_TEXT);
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const range = document.createRange();
        range.selectNodeContents(n);
        rects.push(...[...range.getClientRects()].filter((x) => x.width > 0));
      }
    }
    const lcs = label ? getComputedStyle(label) : null;
    const dot = el?.querySelector(".kp-rail__dot");
    const pr = R(pip), dr = R(dot);
    return {
      slot: el?.tagName === "BUTTON" ? "More" : el?.getAttribute("data-testid") === "deposit-rail" ? "coin" : el?.getAttribute("href"),
      text: label?.textContent?.trim() ?? "", on: !!el?.hasAttribute("data-on"), current: el?.getAttribute("aria-current") ?? null,
      box: R(el), pip: pr, glyph: R(glyph), label: R(label),
      lines: new Set(rects.map((x) => Math.round(x.top))).size,
      inkL: rects.length ? Math.min(...rects.map((x) => x.left)) : null, inkR: rects.length ? Math.max(...rects.map((x) => x.right)) : null,
      clipped: label ? label.scrollWidth > label.clientWidth + 0.5 : null,
      font: lcs ? [lcs.fontFamily.split(",")[0], lcs.fontSize, lcs.fontWeight, lcs.letterSpacing, lcs.lineHeight].join(" ") : null,
      ink: !!label?.querySelector(".kp-millionea-ink"), gold: !!el?.querySelector(".kp-millionea-glyph"),
      glyphColor: pip ? getComputedStyle(pip).color : null, labelColor: label ? getComputedStyle(label).color : null,
      dot: pr && dr ? { right: +(pr.r - dr.r).toFixed(2), top: +(dr.y - pr.y).toFixed(2) } : null,
    };
  });
  const disc = nav.querySelector(".kp-coin");
  const navR = nav.getBoundingClientRect();
  const dr = disc?.getBoundingClientRect();
  return { shown, nav: R(nav), slots, coinOff: dr ? +((dr.left + dr.right) / 2 - (navR.left + navR.right) / 2).toFixed(2) : null, vw: innerWidth };
};
/** In the page: More's open panel — its rows and its box. */
const READ_MORE = () => {
  const menu = document.querySelector('nav.kp-rail [role="menu"]');
  if (!menu) return null;
  const r = menu.getBoundingClientRect();
  const items = [...menu.querySelectorAll('a[role="menuitem"]')].map((a) => {
    const b = a.getBoundingClientRect();
    return { href: a.getAttribute("href"), text: a.textContent.trim(), h: +b.height.toFixed(2), current: a.getAttribute("aria-current") };
  });
  return { box: { x: r.left, y: r.top, r: r.right, b: r.bottom }, vw: innerWidth, vh: innerHeight, items, millionea: /millionea/i.test(menu.innerHTML) };
};

const pre = await premise(BASE);
if (pre.refuse) { console.error(`PREMISE ABSENT — ${pre.refuse}`); process.exit(2); }
const STATE = pre.health?.millionea?.state;
if ((MODE === "drawn") !== (STATE === "ACTIVE")) { console.error(`PREMISE ABSENT — RAIL=${MODE} wants Millionea ${MODE === "drawn" ? "ACTIVE" : "WITHDRAWN"}; /api/health says ${JSON.stringify(STATE)}`); process.exit(2); }
console.log(`qa:classic-rail · RAIL=${MODE} · Millionea ${STATE} at ${BASE}`);
const browser = await chromium.launch();
const tag = (s) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();

/** One composition: a reader's cookies and whether Millionea's door is drawn for them. */
async function composition(name, cookies, drawn, opts = {}) {
  console.log(`\n── ${name} (Millionea ${drawn ? "drawn" : "not drawn"})`);
  const fourth = drawn ? "/millionea" : "/live";
  const coinWant = opts.held || opts.onBreak ? "/wallet" : "/wallet/deposit";
  for (const l of LOCALES) {
    const sizes = [...PORTRAIT.map((w) => ({ width: w, height: 780 })), LANDSCAPE];
    for (const vp of sizes) {
      const ctx = await browser.newContext({ viewport: vp, hasTouch: true, isMobile: vp.width < 768 });
      await ctx.addCookies([{ name: LOCALE_COOKIE, value: l, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 180_000 });
      await settle(page);
      const lang = await page.evaluate(() => document.documentElement.lang);
      const m = await page.evaluate(READ_RAIL);
      const cell = `${name} · ${l} · ${vp.width}×${vp.height}`;
      if (!m?.shown) { ok(`${cell} · the rail is drawn`, false, JSON.stringify(m)); await ctx.close(); continue; }
      const slots = m.slots.map((s) => s.slot);
      const navBox = await page.locator("nav.kp-rail").first().boundingBox();
      await page.screenshot({ path: join(OUT, `${tag(name)}-${l}-${vp.width}x${vp.height}-rail.png`), clip: { x: 0, y: Math.max(0, navBox.y - 30), width: vp.width, height: navBox.height + 30 } });
      const problems = [];
      if (lang !== l) problems.push(`lang ${lang}`);
      if (JSON.stringify(slots) !== JSON.stringify(["/markets", "/updown", "coin", fourth, "More"])) problems.push(`slots ${JSON.stringify(slots)}`);
      const coin = m.slots[2];
      if (coin?.box && (await page.locator('[data-testid="deposit-rail"]').getAttribute("href")) !== coinWant) problems.push(`coin → ${await page.locator('[data-testid="deposit-rail"]').getAttribute("href")}`);
      for (const s of m.slots) {
        if (!(s.box.w >= 40 && s.box.h >= 40)) problems.push(`${s.slot} tap ${s.box.w}×${s.box.h}`);
        if (s.clipped) problems.push(`${s.slot} label cut ("${s.text}")`);
        const wraps = l === "sw" && s.slot === "/updown";
        if (!wraps && s.lines !== 1) problems.push(`${s.slot} label on ${s.lines} lines`);
      }
      const gaps = m.slots.slice(1).map((s, i) => +(s.inkL - m.slots[i].inkR).toFixed(2));
      const least = Math.min(...gaps);
      if (!(least >= 8 - 0.05)) problems.push(`labels ${least}px apart`);
      if (!(Math.abs(m.coinOff) <= 0.5)) problems.push(`coin off centre by ${m.coinOff}px`);
      const ud = m.slots[1];
      if (!ud.dot || Math.abs(ud.dot.top - 2) > 0.5 || Math.abs(ud.dot.right - 9) > 0.5) problems.push(`Up & Down's dot ${JSON.stringify(ud.dot)}`);
      if (drawn) {
        // Against More, the sibling unlit on /markets (Markets is lit there, its label at the lit weight).
        const mln = m.slots[3], sib = m.slots[4];
        const same = (a, b, k) => Math.abs(a[k] - b[k]) <= 0.5;
        if (!(mln.pip && sib.pip && same(mln.pip, sib.pip, "w") && same(mln.pip, sib.pip, "h") && same(mln.pip, sib.pip, "y"))) problems.push(`Millionea's pip ${JSON.stringify(mln.pip)} vs ${JSON.stringify(sib.pip)}`);
        if (!(mln.glyph && sib.glyph && same(mln.glyph, sib.glyph, "w") && same(mln.glyph, sib.glyph, "h") && same(mln.glyph, sib.glyph, "y")
          && Math.abs((mln.glyph.x - mln.pip.x) - (sib.glyph.x - sib.pip.x)) <= 0.5)) problems.push(`Millionea's glyph ${JSON.stringify(mln.glyph)} vs ${JSON.stringify(sib.glyph)}`);
        if (mln.font !== sib.font || !same(mln.label, sib.label, "y") || !same(mln.label, sib.label, "h")) problems.push(`Millionea's label ${mln.font} ${JSON.stringify(mln.label)} vs ${sib.font} ${JSON.stringify(sib.label)}`);
        if (!mln.ink || !mln.gold || mln.glyphColor === sib.glyphColor) problems.push(`Millionea's ink ${mln.ink}, gold ${mln.gold} (${mln.glyphColor} vs ${sib.glyphColor})`);
      }
      // More, opened by a tap.
      await page.locator("nav.kp-rail button.kp-rail__item").first().tap();
      await page.waitForTimeout(300);
      const more = await page.evaluate(READ_MORE);
      if (more) {
        const mb = await page.locator('nav.kp-rail [role="menu"]').first().boundingBox();
        if (mb) await page.screenshot({ path: join(OUT, `${tag(name)}-${l}-${vp.width}x${vp.height}-more.png`), clip: { x: Math.max(0, mb.x - 8), y: Math.max(0, mb.y - 8), width: Math.min(vp.width - Math.max(0, mb.x - 8), mb.width + 16), height: Math.min(vp.height - Math.max(0, mb.y - 8), mb.height + 16 + (navBox.height)) } });
        const hrefs = more.items.map((i) => i.href);
        if (drawn && hrefs[0] !== "/live") problems.push(`More's first row ${hrefs[0]}`);
        if (!drawn && hrefs.includes("/live")) problems.push("Live in More while its track is drawn");
        if (more.millionea) problems.push("More draws Millionea");
        if (more.items.some((i) => i.h < 44)) problems.push(`a More row under 44px ${JSON.stringify(more.items.map((i) => i.h))}`);
        if (more.box.x < -0.5 || more.box.r > more.vw + 0.5 || more.box.y < -0.5) problems.push(`More's panel outside the viewport ${JSON.stringify(more.box)}`);
        rows.push({ cell, more: more.items.map((i) => `${i.href}${i.current ? "*" : ""}`) });
      } else problems.push("More did not open");
      // Close it with a tap outside, as a reader does; on touch no hover may stay behind on More.
      await page.touchscreen.tap(Math.round(vp.width / 2), 20);
      await page.waitForTimeout(250);
      const after = await page.evaluate(() => {
        const b = document.querySelector("nav.kp-rail button.kp-rail__item");
        return { open: !!document.querySelector('nav.kp-rail [role="menu"]'), color: b ? getComputedStyle(b).color : null, lit: b?.hasAttribute("data-on") };
      });
      const restColor = m.slots[0].on ? m.slots[1].labelColor : m.slots[1].labelColor;
      if (after.open) problems.push("More did not close on a tap outside");
      if (!after.lit && after.color !== restColor) problems.push(`More keeps a hover after the tap (${after.color} vs ${restColor})`);
      rows.push({ cell, slots, gaps, coinOff: m.coinOff, dot: ud.dot, mln: drawn ? { pip: m.slots[3].pip, glyph: m.slots[3].glyph, font: m.slots[3].font, glyphColor: m.slots[3].glyphColor } : null, labels: m.slots.map((s) => `${s.text}${s.lines > 1 ? ` (${s.lines} lines)` : ""}`) });
      ok(`${cell} · ${slots.join(" · ")} — taps ≥ 40, labels whole (${m.slots.map((s) => s.text).join(" | ")}), least gap ${least}px, coin ${m.coinOff}px off centre, More ${more ? `[${more.items.map((i) => i.href).join(" ")}]` : "?"}`, problems.length === 0, problems.join("; "));
      if (MODE === "dark") {
        const html = await page.content();
        const traces = millioneaTracesIn(html);
        ok(`${cell} · WITHDRAWN: no Millionea trace on the page`, traces.length === 0, JSON.stringify(traces));
      }
      await ctx.close();
    }
    await perReader(name, cookies, drawn, l, opts);
  }
}

/** At 360 in one language: lit slots, focus rings, reduced motion, the Needle, the 1024 handover. */
async function perReader(name, cookies, drawn, l, opts) {
  const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: l, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
  const page = await ctx.newPage();
  const player = cookies.length > 0;
  const LIT = drawn
    ? { "/markets": ["/markets", null], "/updown": ["/updown", null], "/live": ["More", "/live"], "/results": ["More", "/results"], "/millionea": ["/millionea", null],
        "/millionea/how": ["/millionea", null], "/millionea/register": ["/millionea", null],
        ...(player ? { "/millionea/tickets": ["More", "/positions"], "/positions": ["More", "/positions"] } : {}) }
    : opts.onBreak
      ? { "/markets": ["/markets", null], "/live": ["/live", null], "/results": ["More", "/results"], "/millionea": ["/markets", null], "/millionea/tickets": ["More", "/positions"] }
      : { "/markets": ["/markets", null], "/updown": ["/updown", null], "/live": ["/live", null], "/results": ["More", "/results"] };
  for (const [path, [slot, row]] of Object.entries(LIT)) {
    const res = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await settle(page);
    const m = await page.evaluate(READ_RAIL);
    const lit = (m?.slots ?? []).filter((s) => s.on).map((s) => s.slot);
    let currentRow = null;
    if (slot === "More") {
      await page.locator("nav.kp-rail button.kp-rail__item").first().click();
      await page.waitForTimeout(250);
      const more = await page.evaluate(READ_MORE);
      currentRow = more?.items.find((i) => i.current)?.href ?? null;
      if (path === "/live" || path === "/millionea/tickets" || path === "/millionea") {
        const mb = await page.locator('nav.kp-rail [role="menu"]').first().boundingBox().catch(() => null);
        if (mb) await page.screenshot({ path: join(OUT, `${tag(name)}-${l}-360-lit-${tag(path)}-more.png`), clip: { x: Math.max(0, mb.x - 8), y: Math.max(0, mb.y - 8), width: Math.min(360 - Math.max(0, mb.x - 8), mb.width + 16), height: Math.min(780 - Math.max(0, mb.y - 8), mb.height + 110) } });
      }
      await page.keyboard.press("Escape");
    }
    const nb = await page.locator("nav.kp-rail").first().boundingBox().catch(() => null);
    if (nb) await page.screenshot({ path: join(OUT, `${tag(name)}-${l}-360-lit-${tag(path) || "root"}.png`), clip: { x: 0, y: nb.y - 4, width: 360, height: nb.height + 4 } });
    ok(`${name} · ${l} · ${path} (${res?.status()}) lights ${slot}${row ? `, its More row ${row} current` : ""}`,
      JSON.stringify(lit) === JSON.stringify([slot]) && (row === null || currentRow === row), `lit ${JSON.stringify(lit)} row ${currentRow}`);
  }
  // Focus rings: Tab from the element before the rail onto each slot; the ring is the pip's (the coin keeps its own).
  await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await settle(page);
  const rings = [];
  await page.evaluate(() => {
    const nav = document.querySelector("nav.kp-rail");
    const all = [...document.querySelectorAll("a[href], button, [tabindex]:not([tabindex='-1'])")].filter((el) => !el.closest("[hidden]") && el.getClientRects().length);
    const first = nav.querySelector(".kp-rail__item");
    const before = all[all.indexOf(first) - 1];
    before?.focus();
  });
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    rings.push(await page.evaluate(() => {
      const a = document.activeElement;
      if (!a?.classList.contains("kp-rail__item")) return { slot: a?.tagName ?? null };
      const pip = a.querySelector(".kp-rail__pip");
      const target = a.classList.contains("kp-rail__item--coin") ? a : pip;
      const cs = getComputedStyle(target);
      return { slot: a.tagName === "BUTTON" ? "More" : a.getAttribute("data-testid") === "deposit-rail" ? "coin" : a.getAttribute("href"), outline: `${cs.outlineStyle} ${cs.outlineWidth}`, fv: a.matches(":focus-visible") };
    }));
    if (i === 3 && drawn) {
      const nb = await page.locator("nav.kp-rail").first().boundingBox();
      await page.screenshot({ path: join(OUT, `${tag(name)}-${l}-360-focus-millionea.png`), clip: { x: 0, y: nb.y - 4, width: 360, height: nb.height + 4 } });
    }
  }
  ok(`${name} · ${l} · the keyboard reaches every slot in order, each with its ring (${rings.map((r) => `${r.slot}:${r.outline ?? "-"}`).join(", ")})`,
    rings.length === 5 && rings.every((r) => r.fv && /solid/.test(r.outline ?? "") && !/0px/.test(r.outline ?? "")) && rings.map((r) => r.slot).join() === ["/markets", "/updown", "coin", drawn ? "/millionea" : "/live", "More"].join(), JSON.stringify(rings));
  // The Needle's disc clear of every slot — read where it is drawn: a player's /results (a signed-in toy; the board and
  // the money pages suppress it, `suppressNeedleOnU43`).
  if (player) {
    await page.goto(`${BASE}/results`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await settle(page);
    await page.waitForTimeout(800);
  }
  const needle = await page.evaluate(() => {
    const host = document.getElementById("needle-root");
    const root = host?.shadowRoot ?? host;
    const disc = root?.querySelector("#hit") ?? root?.querySelector("#needle");
    if (!disc || host?.hidden) return { drawn: false };
    const d = disc.getBoundingClientRect();
    const slots = [...document.querySelectorAll("nav.kp-rail .kp-rail__item")].map((el) => el.getBoundingClientRect());
    const hit = slots.some((s) => d.left < s.right && d.right > s.left && d.top < s.bottom && d.bottom > s.top);
    return { drawn: d.width > 0, hit, disc: { x: Math.round(d.left), y: Math.round(d.top), w: Math.round(d.width) } };
  });
  ok(`${name} · ${l} · the Needle's disc stands clear of every slot (${needle.drawn ? JSON.stringify(needle.disc) : "not drawn on this page"})`, !needle.hit, JSON.stringify(needle));
  await ctx.close();
  // Reduced motion: the slots' transitions are clamped.
  const rm = await browser.newContext({ viewport: { width: 360, height: 780 }, reducedMotion: "reduce" });
  await rm.addCookies([{ name: LOCALE_COOKIE, value: l, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
  const rp = await rm.newPage();
  await rp.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await settle(rp);
  const dur = await rp.evaluate(() => [...document.querySelectorAll("nav.kp-rail .kp-rail__item, nav.kp-rail .kp-rail__pip")].map((el) => getComputedStyle(el).transitionDuration));
  ok(`${name} · ${l} · reduced motion: every slot's and pip's transition is clamped (${[...new Set(dur)].join(", ")})`, dur.length > 0 && dur.every((d) => d.split(",").every((x) => parseFloat(x) <= 0.00002)), JSON.stringify([...new Set(dur)]));
  await rm.close();
  // The handover: the rail at 1023, the top bar alone at 1024 (its Millionea link exactly when the door is drawn).
  for (const w of [1023, 1024]) {
    const hc = await browser.newContext({ viewport: { width: w, height: 800 } });
    await hc.addCookies([{ name: LOCALE_COOKIE, value: l, url: BASE }, ...cookies.map((c) => ({ ...c, url: BASE, domain: undefined, path: undefined }))]);
    const hp = await hc.newPage();
    await hp.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await settle(hp);
    const s = await hp.evaluate(() => {
      const nav = document.querySelector("nav.kp-rail:not(.kp-rail--journey)");
      const rail = !!nav && getComputedStyle(nav).display !== "none";
      const header = document.querySelector("header");
      const link = !!header && [...header.querySelectorAll('a[href="/millionea"]')].some((a) => a.getClientRects().length > 0);
      return { rail, link };
    });
    await hp.screenshot({ path: join(OUT, `${tag(name)}-${l}-${w}-handover.png`), clip: { x: 0, y: 0, width: w, height: 72 } });
    ok(`${name} · ${l} · at ${w} ${w < 1024 ? "the rail is drawn" : "the rail is gone"}${w >= 1024 ? `; the top bar's Millionea link ${drawn ? "is" : "is not"} there` : ""}`,
      s.rail === (w < 1024) && (w < 1024 || s.link === drawn), JSON.stringify(s));
    await hc.close();
  }
}

try {
  // The stylesheet's inset rules (Playwright reports every inset as 0, so they are read, not seen).
  const probe = await browser.newContext({ viewport: { width: 360, height: 780 } });
  const pp = await probe.newPage();
  await pp.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await settle(pp);
  const insets = await pp.evaluate(() => {
    const out = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      const walk = (list, media) => { for (const r of list) { if (r.cssRules && !(r instanceof CSSStyleRule)) walk(r.cssRules, r.media?.mediaText ?? media); else if (r.selectorText === ".kp-rail") out.push(`${media ?? "all"} → ${r.style.cssText}`); } };
      walk(rules, null);
    }
    return out;
  });
  await probe.close();
  ok(`the rail pads the bottom inset always and the side insets in landscape (${insets.length} rules)`,
    insets.some((x) => /padding-bottom: env\(safe-area-inset-bottom/.test(x)) && insets.some((x) => /landscape/.test(x) && /padding-left: env\(safe-area-inset-left/.test(x) && /padding-right: env\(safe-area-inset-right/.test(x)), JSON.stringify(insets));

  await composition("a guest", [], MODE === "drawn");
  const player = await demoSession(browser, BASE);
  await composition("the demo player", [player], MODE === "drawn");
  const held = await demoSession(browser, BASE, { query: "?hold=officer" });
  await composition("a held wallet", [held], MODE === "drawn", { held: true });
  if (MODE === "drawn") {
    // The break, through the real form (Millionea visible, its door not drawn): the rail is today's, D13 lights a stand-in.
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addCookies([{ name: LOCALE_COOKIE, value: "en", url: BASE }]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await settle(page);
    await page.goto(`${BASE}/profile/responsible-gambling`, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await settle(page);
    const form = page.locator("form").filter({ has: page.locator('[name="period"]') }).first();
    const trigger = form.locator("button[type=button]").last();
    const label = ((await trigger.textContent()) ?? "").trim();
    await trigger.click();
    const dialog = page.locator('[role="alertdialog"], [role="dialog"]').last();
    await dialog.waitFor({ timeout: 15_000 });
    await dialog.locator("button", { hasText: label }).last().click();
    await page.waitForURL(/\/auth\/login/, { timeout: 60_000 });
    ok("PREMISE · the break was taken through the form (the session ends, the login page says so)", /cooled=1/.test(page.url()), page.url());
    await ctx.close();
    const onBreak = await demoSession(browser, BASE);
    await composition("the player on a break", [onBreak], false, { onBreak: true, held: false });
  }
} finally {
  await browser.close();
}
writeFileSync(join(OUT, "results.json"), JSON.stringify(rows, null, 1));
console.log(`\nqa:classic-rail (${MODE}): ${pass} passed, ${fails.length} failed (shots in ${OUT})`);
process.exitCode = fails.length ? 1 : 0;
