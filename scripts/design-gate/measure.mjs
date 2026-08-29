/**
 * DESIGN SCAN — live measurement drive (read-only, GET only). Admin OR player surface.
 *
 * Logs in ONCE, then for every route:
 *   · screenshots at 1440 / 1920 / 390
 *   · at 1440 (and rows/small-controls at 390), MEASURES the rendered DOM: every control's
 *     box + type + radius, controls that share a flex/grid row but differ in height,
 *     heading/label/type census, card padding, table geometry, section gaps, truncated
 *     text, nav link states, hover response of buttons/links/nav/switches, overflow.
 * Output: out-<surface>/<slug>.json + <slug>-<w>.png. Nothing is written to the product.
 *
 *   SURFACE=admin  PERSONA=admin node .qa-design-adminscan/measure.mjs
 *   SURFACE=player PERSONA=alpha node .qa-design-adminscan/measure.mjs
 *   ONLY=/markets,/wallet  (filter)   ANON=1 (player public pages only, no login)
 */
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { BASE } from "../live/harness.mjs";
/* ⭐ ONE SIGN-IN, SHARED. Every instrument here is its own process, so each used to take
   its own session — ~10 admin logins for one session's checks, ~10 "new login" emails to
   the owner, and (worse) each login REVOKES the previous, which is the revocation this rig
   has been fighting all along. See session.mjs. */
import { loginShared as loginOnce } from "./session.mjs";
import { ADMIN_ROUTES, PLAYER_PUBLIC, PLAYER_AUTHED } from "./routes.mjs";

const SURFACE = process.env.SURFACE || "admin";
const PERSONA = process.env.PERSONA || (SURFACE === "admin" ? "admin" : "alpha");
const ANON = process.env.ANON === "1";
const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, "..", "..", ".qa-design-gate", `out-${SURFACE}`);
mkdirSync(OUT, { recursive: true });
const ONLY = process.env.ONLY ? process.env.ONLY.split(",") : null;

// ⛔ ONE DEFINITION SITE — see scripts/design-gate/routes.mjs. The load budget imports the
// same list, so a route added for the render drive is measured for load too.
const ADMIN_DISCOVER = [
  ["/admin/players", "/admin/players/", "/admin/players/cohorts"],
  ["/admin/markets", "/admin/markets/", "/admin/markets/new"],
  ["/admin/compliance", "/admin/kyc/", null],
  ["/admin/resolver-queue", "/admin/resolver/", null],
  ["/admin/ai-polls", "/admin/ai-polls/", null],
  ["/admin/updown/rounds", "/admin/updown/rounds/", null],
  ["/admin/staff", "/admin/staff/", null],
  ["/admin/invites", "/admin/invites/", null],
];
const PLAYER_DISCOVER = [
  ["/markets", "/markets/", null],
  ["/updown", "/updown/", "/updown/history"],
  ["/proposals", "/proposals/", "/proposals/new"],
  ["/positions", "/positions/", "/positions/performance"],
  ["/wallet", "/wallet/receipt/", null],
];

/** Player pages hold an SSE stream open, so `networkidle` never settles — load, then a bounded quiet wait. */
const GOTO_T = Number(process.env.GOTO_TIMEOUT || 90_000);
async function gotoSettled(page, url, timeout = GOTO_T) {
  const resp = await page.goto(url, { waitUntil: "load", timeout });
  await page.waitForLoadState("networkidle", { timeout: 6_000 }).catch(() => {});
  await page.waitForTimeout(700);
  return resp;
}

const slug = (r) => r.replace(/^\/(admin\/?)?/, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || (SURFACE === "admin" ? "overview" : "home");

/** Runs in the page. Everything measured from computed style + getBoundingClientRect. */
function measure() {
  const cs = (el) => getComputedStyle(el);
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = cs(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && s.opacity !== "0"; };
  const txt = (el) => (el.innerText || el.value || el.getAttribute("aria-label") || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim().slice(0, 48);
  const fam = (s) => s.fontFamily.split(",")[0].replace(/['"]/g, "").trim();
  const px = (v) => Math.round(parseFloat(v) * 10) / 10;
  const r1 = (n) => Math.round(n * 10) / 10;
  const cls = (el) => (typeof el.className === "string" ? el.className : "").replace(/\s+/g, " ").trim().slice(0, 160);
  const pathOf = (el) => { const p = []; let e = el; while (e && e !== document.body && p.length < 4) { p.unshift(e.tagName.toLowerCase() + (e.id ? "#" + e.id : "")); e = e.parentElement; } return p.join(">"); };
  const main = document.querySelector("main") || document.body;
  const inShell = (el) => !main.contains(el);

  // ---------- controls ----------
  const CONTROL_SEL = 'button, a.btn, [role="button"], input:not([type="hidden"]), textarea, select, [role="combobox"], [role="switch"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], .chip, a[class*="rounded-pill"], a[class*="rounded-md"][class*="border"], nav a, aside a';
  const raw = Array.from(document.querySelectorAll(CONTROL_SEL)).filter(vis);
  const nodes = raw.filter((el) => !raw.some((o) => o !== el && el.contains(o) && o.matches("button, input, textarea, select, a")));
  const flexParent = (el) => { let e = el.parentElement; while (e && e !== document.body) { const s = cs(e); if ((s.display === "flex" || s.display === "inline-flex") && !s.flexDirection.startsWith("column")) return e; if (s.display === "grid" || s.display === "inline-grid") return e; e = e.parentElement; } return null; };
  const parents = new Map();
  const controls = nodes.map((el, i) => {
    const r = el.getBoundingClientRect(); const s = cs(el);
    const fp = flexParent(el);
    let gid = null;
    if (fp) { if (!parents.has(fp)) parents.set(fp, { id: parents.size, el: fp, items: [] }); const g = parents.get(fp); gid = g.id; g.items.push(i); }
    const kind = el.matches("input[type=checkbox], [role=checkbox]") ? "checkbox" : el.matches("input[type=radio], [role=radio]") ? "radio" : el.matches("input, textarea, select, [role=combobox]") ? "field" : el.matches("[role=switch]") ? "switch" : el.matches("[role=tab]") ? "tab" : el.matches(".chip") ? "chip" : el.matches("nav a, aside a, [role=menuitem]") ? "nav" : el.matches("button, a.btn, [role=button]") ? "button" : "pill";
    return {
      i, kind, tag: el.tagName.toLowerCase(), type: el.getAttribute("type") || "", text: txt(el), cls: cls(el),
      x: r1(r.x + scrollX), y: r1(r.y + scrollY), w: r1(r.width), h: r1(r.height),
      fs: px(s.fontSize), ff: fam(s), fw: s.fontWeight, br: s.borderRadius, pl: px(s.paddingLeft), pr: px(s.paddingRight),
      bg: s.backgroundColor, color: s.color, bc: s.borderTopColor, bw: px(s.borderTopWidth), tt: s.textTransform, ls: s.letterSpacing, shadow: s.boxShadow !== "none",
      inTable: !!el.closest("table"), inShell: inShell(el), gid, disabled: el.matches(":disabled") || el.getAttribute("aria-disabled") === "true",
      current: el.getAttribute("aria-current") || el.getAttribute("aria-selected") || el.getAttribute("aria-checked") || el.getAttribute("data-on") || el.getAttribute("data-active") || "",
    };
  });
  const rowGroups = [];
  for (const g of parents.values()) {
    const items = g.items.map((i) => controls[i]);
    if (items.length < 2) continue;
    const hs = items.map((c) => c.h);
    const spread = Math.max(...hs) - Math.min(...hs);
    if (spread > 2) rowGroups.push({ gid: g.id, parent: pathOf(g.el), parentCls: cls(g.el), display: cs(g.el).display, spread: r1(spread), inTable: !!g.el.closest("table"), inShell: inShell(g.el), items: items.map((c) => ({ kind: c.kind, tag: c.tag, text: c.text, h: c.h, w: c.w, fs: c.fs, cls: c.cls.slice(0, 90) })) });
  }

  // ---------- nav ----------
  const nav = Array.from(document.querySelectorAll("nav a, aside a, header a, [data-bottom-nav] a")).filter(vis).map((el) => { const s = cs(el); const r = el.getBoundingClientRect(); return { text: txt(el), href: el.getAttribute("href"), h: r1(r.height), w: r1(r.width), fs: px(s.fontSize), ff: fam(s), fw: s.fontWeight, color: s.color, bg: s.backgroundColor, shadow: s.boxShadow, bc: s.borderTopColor, bw: px(s.borderTopWidth), tt: s.textTransform, current: el.getAttribute("aria-current") || (/\bactive\b|\bcurrent\b|data-active/.test(el.outerHTML.slice(0, 300)) ? "cls" : ""), cls: cls(el).slice(0, 100) }; });

  // ---------- headings ----------
  const hd = (sel) => Array.from(document.querySelectorAll(sel)).filter(vis).map((el) => { const s = cs(el); return { tag: el.tagName.toLowerCase(), text: txt(el), fs: px(s.fontSize), ff: fam(s), fw: s.fontWeight, ls: s.letterSpacing, lh: s.lineHeight, color: s.color, tt: s.textTransform, inShell: inShell(el), cls: cls(el).slice(0, 100) }; });
  const headings = hd("h1, h2, h3, h4");

  // ---------- labels / eyebrows (small uppercase text) ----------
  const upper = {};
  for (const el of document.querySelectorAll("label, span, p, div, dt, th, legend, a, button")) {
    if (!vis(el)) continue;
    const s = cs(el);
    if (s.textTransform !== "uppercase" || px(s.fontSize) > 12.5) continue;
    if (!Array.from(el.childNodes).some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const key = `${px(s.fontSize)}px ${fam(s)} ${s.fontWeight} ls:${s.letterSpacing} ${s.color}`;
    upper[key] ??= { n: 0, ex: [], tags: {} };
    upper[key].n++; upper[key].tags[el.tagName.toLowerCase()] = (upper[key].tags[el.tagName.toLowerCase()] || 0) + 1;
    if (upper[key].ex.length < 3) upper[key].ex.push(txt(el));
  }
  const labels = Array.from(document.querySelectorAll("label")).filter(vis).map((el) => { const s = cs(el); const first = el.querySelector("span, p"); const fs = first ? cs(first) : s; return { text: txt(el).slice(0, 30), fs: px(fs.fontSize), ff: fam(fs), fw: fs.fontWeight, tt: fs.textTransform, ls: fs.letterSpacing, color: fs.color, cls: cls(el).slice(0, 80) }; });

  // ---------- type census (elements with direct text) ----------
  const type = {};
  const walker = document.createTreeWalker(main, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || !vis(el)) continue;
    const s = cs(el); const key = `${px(s.fontSize)}|${fam(s)}|${s.fontWeight}`;
    type[key] = (type[key] || 0) + 1;
  }

  // ---------- cards / panels ----------
  const cards = [];
  for (const el of main.querySelectorAll("div, section, article, a, li")) {
    if (!vis(el)) continue; const s = cs(el); const r = el.getBoundingClientRect();
    if (r.width < 160 || r.height < 40) continue;
    const bordered = px(s.borderTopWidth) > 0 && s.borderTopStyle !== "none";
    const painted = s.backgroundColor !== "rgba(0, 0, 0, 0)";
    if (!(bordered || painted) || px(s.borderTopLeftRadius) === 0) continue;
    if (el.closest("table")) continue;
    cards.push({ tag: el.tagName.toLowerCase(), cls: cls(el).slice(0, 120), w: r1(r.width), h: r1(r.height), br: s.borderTopLeftRadius, p: [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft].map(px).join("/"), bg: s.backgroundColor, bc: bordered ? s.borderTopColor : "none", bs: s.borderTopStyle, shadow: s.boxShadow !== "none" });
  }

  // ---------- tables ----------
  const tables = Array.from(document.querySelectorAll("table")).filter(vis).map((t) => {
    const th = t.querySelector("thead th"); const td = t.querySelector("tbody td");
    const rows = Array.from(t.querySelectorAll("tbody tr")).slice(0, 6).map((tr) => r1(tr.getBoundingClientRect().height));
    const hoverCells = Array.from(t.querySelectorAll("td, td *")).filter((e) => /hover:/.test(cls(e))).length;
    const hoverRows = Array.from(t.querySelectorAll("tr")).filter((e) => /hover:/.test(cls(e))).length;
    const cols = t.querySelectorAll("thead th").length;
    const wrap = t.parentElement; const ws = wrap ? cs(wrap) : null;
    return { cls: cls(t), adminTbl: t.classList.contains("admin-tbl"), cols, thFs: th ? px(cs(th).fontSize) : null, thPad: th ? `${px(cs(th).paddingTop)}/${px(cs(th).paddingLeft)}` : null, thTT: th ? cs(th).textTransform : null, tdFs: td ? px(cs(td).fontSize) : null, tdPad: td ? `${px(cs(td).paddingTop)}/${px(cs(td).paddingLeft)}` : null, rows, hoverCells, hoverRows, wrapOverflow: ws ? ws.overflowX : null, w: r1(t.getBoundingClientRect().width), wrapW: wrap ? r1(wrap.getBoundingClientRect().width) : null, wrapCls: wrap ? cls(wrap).slice(0, 80) : "" };
  });

  // ---------- section gaps ----------
  const body = main.querySelector('[class*="space-y"]') || main;
  const kids = Array.from(body.children).filter(vis);
  const sections = [];
  for (let i = 1; i < kids.length; i++) { const a = kids[i - 1].getBoundingClientRect(), b = kids[i].getBoundingClientRect(); sections.push({ gap: r1(b.top - a.bottom), from: cls(kids[i - 1]).slice(0, 60), to: cls(kids[i]).slice(0, 60) }); }

  // ---------- truncated / overflowing text ----------
  const truncated = [];
  for (const el of main.querySelectorAll("*")) {
    if (truncated.length > 40) break; if (!vis(el)) continue; const s = cs(el);
    if (el.scrollWidth > el.clientWidth + 1 && (s.overflowX === "hidden" || s.textOverflow === "ellipsis") && el.children.length === 0 && el.textContent.trim()) truncated.push({ text: txt(el), cls: cls(el).slice(0, 80), w: r1(el.clientWidth), need: r1(el.scrollWidth) });
  }

  // ---------- shell ----------
  const aside = document.querySelector("aside"); const header = document.querySelector("header");
  const shell = { asideW: aside ? r1(aside.getBoundingClientRect().width) : null, headerH: header ? r1(header.getBoundingClientRect().height) : null, mainW: r1(main.getBoundingClientRect().width) };

  const h1el = document.querySelector("h1");
  return { title: document.title, h1: h1el ? txt(h1el) : null, controls, rowGroups, nav, headings, upper, labels, type, cards, tables, sections, truncated, shell, overflow: { sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }, docH: document.documentElement.scrollHeight };
}

async function hoverProbe(page) {
  const hs = await page.$$('main button, main a, main [role="button"], main [role="switch"], main [role="checkbox"], main label:has(input[type=checkbox]), aside a, header a, header button, nav a');
  const out = []; let n = 0;
  const KEYS = ["transform", "filter", "backgroundColor", "color", "borderTopColor", "boxShadow", "textDecorationLine", "opacity"];
  for (const h of hs) {
    if (n >= 40) break;
    const ok = await h.evaluate((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && !el.closest("table") && !(el.matches(":disabled")); }).catch(() => false);
    if (!ok) continue;
    try {
      await h.scrollIntoViewIfNeeded();
      await page.mouse.move(0, 0);
      await page.waitForTimeout(80);
      const before = await h.evaluate((el, K) => { const s = getComputedStyle(el); const o = {}; for (const k of K) o[k] = s[k]; o.cursor = s.cursor; return o; }, KEYS);
      await h.hover({ timeout: 2000 });
      await page.waitForTimeout(260);
      const after = await h.evaluate((el, K) => { const s = getComputedStyle(el); const o = {}; for (const k of K) o[k] = s[k]; return o; }, KEYS);
      const changed = KEYS.filter((k) => before[k] !== after[k]);
      const meta = await h.evaluate((el) => ({ tag: el.tagName.toLowerCase(), text: (el.innerText || el.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 40), cls: (typeof el.className === "string" ? el.className : "").slice(0, 100), h: Math.round(el.getBoundingClientRect().height), inMain: !!el.closest("main") }));
      out.push({ ...meta, cursor: before.cursor, changed, moved: changed.includes("transform") });
      n++;
    } catch { /* detached / covered */ }
  }
  await page.mouse.move(0, 0);
  return out;
}

const browser = await chromium.launch();
let state = null;
if (!ANON) {
  try {
    state = await loginOnce(browser, PERSONA);
    console.log("logged in as", PERSONA, "against", BASE);
  } catch (e) {
    console.error("LOGIN FAILED (one attempt, stopping):", String(e.message).slice(0, 300));
    await browser.close();
    process.exit(2);
  }
}
const mk = (vp, extra = {}) => browser.newContext({ ...(state ? { storageState: state } : {}), viewport: vp, colorScheme: "dark", ...extra });
let ctx1440 = await mk({ width: 1440, height: 900 });
let ctx1920 = await mk({ width: 1920, height: 1080 });
let ctx390 = await mk({ width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

/**
 * 🔴 THE SESSION DIES MID-DRIVE, AND THIS FILE USED TO WRITE THE SIGN-IN PAGE AS DATA.
 *
 * Measured 2026-08-29 (session 77): a full 44-route admin drive returned HTTP 200 on every
 * route, printed a plausible line for each — and `redo.cjs` then deleted **30 of the 44 records
 * as poisoned**. Only 14 were real. `/admin/transactions` had been recorded with `tbl=0`, i.e.
 * a table page with no table, because the drive was photographing the sign-in form.
 *
 * ⛔ THE RECORD WAS ALREADY IN THE FILE AND NOTHING READ IT. `rec.finalUrl` has always been
 * captured — `redo.cjs` uses exactly that field, AFTER the fact, to throw the drive away. So the
 * drive knew, at the moment of measuring, that it was on `/auth/admin`, and carried on for
 * thirty more routes. Detecting it costs one `if`; not detecting it cost a whole drive.
 *
 * ⭐ So: on `/auth/`, sign in again, REBUILD ALL THREE CONTEXTS (they were minted from the dead
 * `storageState` and are dead with it), and retry that route once. ⛔ Bounded — a drive that
 * needs more than MAX_SIGNINS sign-ins has found a platform problem, and the harness records
 * that a dozen sign-ins in a few minutes stop being accepted anyway.
 * ⛔ And the count is PRINTED. A drive that silently re-authenticates is hiding a platform
 * finding as housekeeping.
 */
const MAX_SIGNINS = 8;
let signins = state ? 1 : 0;
let resignins = 0;
const revoked = (url) => !ANON && /\/auth\//.test(url);
async function resignin(why) {
  if (signins >= MAX_SIGNINS) throw new Error(`refusing sign-in #${signins + 1} — session revoked faster than it can be replaced`);
  signins++; resignins++;
  console.log(`  ⚠️  session revoked (${why}) — sign-in #${signins}, rebuilding contexts`);
  await Promise.all([ctx1440.close(), ctx1920.close(), ctx390.close()].map((q) => Promise.resolve(q).catch(() => {})));
  state = await loginOnce(browser, PERSONA);
  ctx1440 = await mk({ width: 1440, height: 900 });
  ctx1920 = await mk({ width: 1920, height: 1080 });
  ctx390 = await mk({ width: 390, height: 844 }, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
}

const routes = SURFACE === "admin" ? [...ADMIN_ROUTES] : [...PLAYER_PUBLIC, ...(ANON ? [] : PLAYER_AUTHED)];
const DISCOVER = SURFACE === "admin" ? ADMIN_DISCOVER : PLAYER_DISCOVER;
{
  const p = await ctx1440.newPage();
  for (const [list, prefix, exclude] of DISCOVER) {
    if (ANON && PLAYER_AUTHED.includes(list)) continue;
    try {
      await gotoSettled(p, BASE + list);
      const hrefs = await p.$$eval("a[href]", (as) => as.map((a) => a.getAttribute("href")));
      const hit = hrefs.find((h) => h && h.startsWith(prefix) && h !== exclude && h.split("?")[0] !== list && !/\/(new|cohorts|history|performance)$/.test(h) && !routes.includes(h.split("?")[0]));
      if (hit) routes.push(hit.split("?")[0]);
      console.log("discover", list, "→", hit || "(none)");
    } catch (e) { console.log("discover failed", list, e.message.slice(0, 80)); }
  }
  await p.close();
}

const summary = [];
for (const route of routes) {
  if (ONLY && !ONLY.some((o) => route === o || route.startsWith(o + "/") || (o !== "/" && route.startsWith(o)))) continue;
  const s = slug(route);
  const rec = { route, slug: s, surface: SURFACE, persona: ANON ? "anon" : PERSONA };
  for (let attempt = 1; attempt <= 2; attempt++) {
  try {
    const page = await ctx1440.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 120)));
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });
    const resp = await gotoSettled(page, BASE + route);
    rec.status = resp?.status();
    rec.finalUrl = page.url();
    // ⛔ THE CHECK THAT WAS MISSING. `finalUrl` was recorded and never read until redo.cjs
    // deleted the drive afterwards. A revoked page is HTTP 200 and renders perfectly.
    if (revoked(rec.finalUrl)) {
      await page.close();
      if (attempt === 1) { await resignin(route); continue; }
      rec.error = "SESSION REVOKED TWICE — measured the sign-in page";
      console.log(`${route.padEnd(32)} ✗ ${rec.error}`);
      break;
    }
    await page.waitForTimeout(600);
    rec.m1440 = await page.evaluate(measure);
    rec.hover = await hoverProbe(page);
    rec.errors = errors;
    await page.screenshot({ path: path.join(OUT, `${s}-1440.png`), fullPage: true });
    await page.close();
    for (const [ctx, w] of [[ctx1920, 1920], [ctx390, 390]]) {
      const pg = await ctx.newPage();
      await gotoSettled(pg, BASE + route);
      rec[`overflow${w}`] = await pg.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
      if (w === 390) rec.m390 = await pg.evaluate(measure).then((m) => ({ rowGroups: m.rowGroups, truncated: m.truncated, nav: m.nav, small: m.controls.filter((c) => c.h < 40 && !c.inTable).map((c) => ({ kind: c.kind, text: c.text, h: c.h, w: c.w, cls: c.cls.slice(0, 70) })), headings: m.headings.filter((h) => h.tag === "h1") }));
      await pg.screenshot({ path: path.join(OUT, `${s}-${w}.png`), fullPage: true });
      await pg.close();
    }
    const m = rec.m1440;
    console.log(`${route.padEnd(32)} ${rec.status} ctl=${m.controls.length} rows≠=${m.rowGroups.filter((g) => !g.inShell).length} tbl=${m.tables.length} cards=${m.cards.length} h1=${m.headings.find((h) => h.tag === "h1")?.fs ?? "-"} ovf390=${rec.overflow390.sw > rec.overflow390.cw + 1 ? "YES" : "no"} err=${errors.length}`);
  } catch (e) {
    rec.error = String(e.message).slice(0, 200);
    console.log(`${route.padEnd(32)} ERROR ${rec.error}`);
  }
  break; // measured, or failed for a reason a retry cannot cure
  }
  writeFileSync(path.join(OUT, `${s}.json`), JSON.stringify(rec, null, 1));
  summary.push({ route, slug: s, status: rec.status, error: rec.error });
}
writeFileSync(path.join(OUT, `_summary.json`), JSON.stringify(summary, null, 1));
await browser.close();
const poisoned = summary.filter((r) => /REVOKED/.test(r.error ?? "")).length;
console.log("done", summary.length, "routes", `· ${signins} sign-in(s), ${resignins} forced by a revoked session, ${poisoned} unrecoverable`);
// ⛔ A drive whose records are mostly the sign-in page is not a measurement. Say so in the exit code.
if (poisoned) process.exit(3);
