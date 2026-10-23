/**
 * qa:classic-header-fit — THE CLASSIC HEADER ROW FITS INSIDE ITS CONTENT EDGE, AT EVERY WIDTH FROM 1024, IN EVERY
 * LANGUAGE, FOR EVERY READER (MASWALI-BUILD HEADER-1024, 2026-10-23).
 *
 *   BASE=http://localhost:3720 npm run qa:classic-header-fit        (measures the rollout the server runs — run it at
 *                                                                     FEATURE_MILLIONEA=ACTIVE, as production does, and at
 *                                                                     the default WITHDRAWN)
 *   BASE=http://localhost:3720 npm run red:classic-header-fit       (--prove-red: each defect planted IN THE PAGE)
 *
 * 🔴 THE DEFECT (found by the UDDOT lane's parity read; measured on main 4c75dbbb6, 2026-10-23): in Swahili at 1024, for
 * a signed-in player, the desktop links and the right cluster (language, balance capsule, Deposit, bell, account) plus the
 * bar's three fixed 12px gaps ran 16.6px past the row's content edge at FEATURE_MILLIONEA=ACTIVE, as production runs
 * (14.6px at WITHDRAWN) — into the 32px gutter, the account menu 15.4px from the screen's edge, up to ~1047px. The empty
 * flex spacer between the two clusters still cost the two gaps on its sides. ⛔ E-190's rule (`live/clip.mjs`, a control
 * past the SCREEN) cannot see it: the row stays on screen and `scrollWidth` reads 1024.
 *
 * THE RULE, per cell:
 *   · every visible child of the header's row, and every control inside it, ends inside the row's content edge (its box
 *     minus its padding) and starts inside it — the home link's 40px box borrows 7px of gutter each side below 1280 BY
 *     DESIGN (`top-app-bar.tsx`), so for it the MARK is held, not the box;
 *   · the links stay inside the nav and no control overlaps the next — the nav may give its lead (`min-width: 0`), so a
 *     row that needs more than its spacing can give would overrun THERE before it reached the edge;
 *   · WHERE THE ROW HAS ROOM NOTHING MOVES: with the spacer at (or past) its basis, two gaps — nothing gave — the first
 *     link stands where it stood (the mark's link + the gap + the old 10px lead) and the cluster ends at the edge;
 *   · every label is whole (a desktop link, More, the language code, the balance);
 *   · the row's SLACK is printed — a number, never a threshold: the journey's `qa:journey-header-fit` definition (content
 *     width − every visible child's outer width, a growing child at its minimum − the gaps) plus the lead's give left.
 * CELLS: a guest, the demo player, the demo player with an unconfirmed email, and the demo player under an officer's hold
 * (each minted just before its own cells: every /auth/demo visit resets the hold, the email and the balance) × sw · en ·
 * zh × /markets, /updown, /live — each page lights a different link, and a lit link is bolder and wider — × 1024, 1032,
 * 1040 (main still overflowed there), 1048 (where main first fitted), 1280 (the lockup and Deposit's word return) and
 * 1920. KP_HDR_WIDTHS=sweep walks every 8px from 1024 to 1280 and the desktop rungs to 1920, and adds /positions for the
 * signed-in readers. Widths are walked by resizing the loaded page (the header is CSS-responsive); the first is loaded.
 *
 * ⛔ REFUSES anything but `http://localhost:PORT` on an in-memory dev server (`live/journey-pass.mjs`'s premise). It
 * moves the one demo account's hold and email state, so never point it at a server another drive is using. It writes
 * no file, so `red:classic-header-fit` (--prove-red) is in `test:red-anchors`' in-process class.
 */
import { chromium } from "playwright";
import { premise, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || process.env.KP_BASE || "http://localhost:3720";
const PROVE_RED = process.argv.includes("--prove-red");
// The cells that matter by default (the lead's matrix, 2026-10-23): 1024 to 1048, where main first fitted, the xl
// rung where the lockup and Deposit's word return, and the widest board. KP_HDR_WIDTHS=sweep walks 1024–1280 every 8px
// and the desktop rungs to 1920 (the measurement that found the defect); KP_HDR_READERS / LOCALES / KP_HDR_ROUTES narrow.
const SWEEP = [...Array.from({ length: 33 }, (_, i) => 1024 + i * 8), 1279, 1280, 1300, 1366, 1440, 1536, 1600, 1920];
const WIDTHS = process.env.KP_HDR_WIDTHS === "sweep" ? SWEEP
  : (process.env.KP_HDR_WIDTHS || "1024,1032,1040,1048,1280,1920").split(",").map(Number);
const LOCALES = (process.env.LOCALES || "sw,en,zh").split(",");
const ALL_READERS = [
  { id: "guest", door: null },
  { id: "player", door: "" },
  { id: "unverified", door: "?email=unverified" },
  { id: "held", door: "?hold=officer" },
];
const READERS = process.env.KP_HDR_READERS ? ALL_READERS.filter((r) => process.env.KP_HDR_READERS.split(",").includes(r.id)) : ALL_READERS;
const ROUTES = (signedIn) => (process.env.KP_HDR_ROUTES ? process.env.KP_HDR_ROUTES.split(",")
  : ["/markets", "/updown", "/live", ...(signedIn && process.env.KP_HDR_WIDTHS === "sweep" ? ["/positions"] : [])]);

/** Runs IN THE PAGE: the classic header row's content edges, its children and controls, the labels, the slack. */
const ROW_PROBE = () => {
  const header = document.querySelector('header.app-topbar:not([data-testid="journey-top-bar"])');
  const row = header?.firstElementChild;
  if (!header || !row) return null;
  const rs = getComputedStyle(row);
  const rr = row.getBoundingClientRect();
  const left = rr.left + (parseFloat(rs.paddingLeft) || 0);
  const right = rr.right - (parseFloat(rs.paddingRight) || 0);
  const gap = parseFloat(rs.columnGap) || 0;
  const shown = (el) => { const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); return cs.display !== "none" && cs.visibility !== "hidden" && b.width > 0 && b.height > 0; };
  const name = (el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
  const home = row.querySelector(':scope > a[href="/"]');
  const nav = row.querySelector(":scope > nav");
  const navShown = !!nav && shown(nav);
  const past = [];
  for (const el of [...row.children].filter(shown)) {
    const b = el.getBoundingClientRect();
    if (b.right > right + 0.5) past.push(`${name(el)} ends ${b.right.toFixed(1)} > ${right.toFixed(1)}`);
    if (el !== home && b.left < left - 0.5) past.push(`${name(el)} starts ${b.left.toFixed(1)} < ${left.toFixed(1)}`);
  }
  // Every control inside the row (a closed <details> keeps laid-out boxes it never paints: its summary only).
  const controls = [...row.querySelectorAll('a[href], button, summary, [role="button"]')]
    .filter((el) => shown(el) && !(el.tagName !== "SUMMARY" && el.closest("details:not([open])")));
  for (const el of controls) {
    if (el === home) continue;
    const b = el.getBoundingClientRect();
    if (b.right > right + 0.5) past.push(`control ${name(el)} ends ${b.right.toFixed(1)} > ${right.toFixed(1)}`);
    if (b.left < left - 0.5) past.push(`control ${name(el)} starts ${b.left.toFixed(1)} < ${left.toFixed(1)}`);
  }
  // The DRAWN mark: below 1280 the 26px mark, from 1280 the lockup (the other one is display:none and reads 0x0).
  const mark = home ? [...home.querySelectorAll("svg")].find(shown) : null;
  if (mark && shown(home)) {
    const m = mark.getBoundingClientRect();
    if (m.left < left - 0.5) past.push(`the mark starts ${m.left.toFixed(1)} < ${left.toFixed(1)}`);
  }
  // HEADER-1024: the spacings that give way read the row's own gap ladder (`--kp-bar-gap`), so the two must agree.
  const ladder = rs.getPropertyValue("--kp-bar-gap").trim();
  const ladderPx = ladder ? (() => { const t = document.createElement("div"); t.style.width = ladder; t.style.flex = "none"; row.appendChild(t); const v = t.getBoundingClientRect().width; t.remove(); return v; })() : null;
  if (ladderPx !== null && Math.abs(ladderPx - gap) > 0.5) past.push(`--kp-bar-gap ${ladder} = ${ladderPx}px ≠ the row's gap ${rs.columnGap}`);
  // HEADER-1024: the links stay inside the nav, and no control overlaps the next (the outermost controls, left to right).
  const over = [];
  const outer = controls.filter((el) => !controls.some((o) => o !== el && o.contains(el)));
  if (navShown) {
    const nb = nav.getBoundingClientRect();
    for (const el of outer.filter((c) => nav.contains(c))) {
      const b = el.getBoundingClientRect();
      if (b.right > nb.right + 0.5) over.push(`${name(el)} overruns the nav (${b.right.toFixed(1)} > ${nb.right.toFixed(1)})`);
    }
  }
  const byX = outer.map((el) => ({ el, b: el.getBoundingClientRect() })).sort((a, z) => a.b.left - z.b.left);
  for (let i = 1; i < byX.length; i++) {
    if (byX[i].b.left < byX[i - 1].b.right - 0.5) over.push(`${name(byX[i].el)} overlaps ${name(byX[i - 1].el)} (${byX[i].b.left.toFixed(1)} < ${byX[i - 1].b.right.toFixed(1)})`);
  }
  // Every label whole: a desktop link, More, the language code, the balance's figure.
  const cut = [...row.querySelectorAll('nav a, nav button, details > summary, [data-testid="wallet-balance-pill"], [data-testid="wallet-balance-capsule"]')]
    .filter(shown).filter((el) => el.scrollWidth > el.clientWidth + 0.5).map((el) => `${name(el)} clipped (${el.scrollWidth} > ${el.clientWidth})`);
  // HEADER-1024: WHERE THE ROW HAS ROOM NOTHING MOVES. The spacer at (or past) its basis — two gaps — means nothing gave;
  // then the first link stands at the mark's link + the gap + the old 10px lead, and the cluster ends at the edge.
  const vis = [...row.children].filter((el) => getComputedStyle(el).display !== "none");
  const fill = vis.find((el) => (parseFloat(getComputedStyle(el).flexGrow) || 0) > 0) ?? null;
  const first = navShown ? outer.find((el) => nav.contains(el)) ?? null : null;
  const markEnd = home && shown(home) ? home.getBoundingClientRect().right + (parseFloat(getComputedStyle(home).marginRight) || 0) : null;
  const lead = first && markEnd !== null ? Math.round((first.getBoundingClientRect().left - markEnd) * 10) / 10 : null;
  const roomy = !!fill && fill.getBoundingClientRect().width >= 2 * gap - 0.5;
  const moved = [];
  if (roomy && lead !== null && Math.abs(lead - (gap + 10)) > 0.5) moved.push(`the links start ${lead}px after the mark's link, not ${gap + 10}px (the gap + the old 10px lead)`);
  if (roomy && vis.length) {
    const end = vis[vis.length - 1].getBoundingClientRect().right;
    if (Math.abs(end - right) > 0.5) moved.push(`the cluster ends ${end.toFixed(1)}, not at the edge ${right.toFixed(1)}`);
  }
  // The slack — the journey header-fit's definition: content width − every visible child's outer width (a growing child
  // at its minimum) − the gaps between them — plus the give the nav's lead (`::before`) still has past its floor.
  let used = 0;
  for (const el of vis) {
    const cs = getComputedStyle(el);
    const grows = (parseFloat(cs.flexGrow) || 0) > 0;
    used += (grows ? (parseFloat(cs.minWidth) || 0) : el.getBoundingClientRect().width) + (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.marginRight) || 0);
  }
  let leadGive = 0;
  if (navShown && first) {
    const before = getComputedStyle(nav, "::before");
    if (before.content && before.content !== "none" && before.content !== "normal") {
      leadGive = Math.max(0, first.getBoundingClientRect().left - nav.getBoundingClientRect().left - (parseFloat(getComputedStyle(nav).columnGap) || 0) - (parseFloat(before.minWidth) || 0));
    }
  }
  const slack = Math.round((right - left - used - gap * Math.max(0, vis.length - 1) + leadGive) * 10) / 10;
  const links = [...row.querySelectorAll("nav a.kp-navlink")].filter(shown).map((a) => a.textContent.trim());
  return { vw: innerWidth, lang: document.documentElement.lang, right: +right.toFixed(1), slack, lead, roomy, past, over, moved, cut, links };
};

/** The plants: each a stylesheet that must turn this drive red, in sw on /markets at 1024 — the player's row (the full
 *  one) or a guest's (one with room) — caught by the check it names. */
const PLANTS = [
  { id: "wider-label", reader: "player", what: "a desktop link 64px wider (more than the spacing can give)", css: "header.app-topbar nav a.kp-navlink:first-child { padding-right: 76px !important; }", caught: (m) => m.past.length + m.over.length > 0 },
  { id: "fixed-gaps", reader: "player", what: "the bar's spacing that gives way held at full width (HEADER-1024 undone)", css: ".kp-bar-lead, .kp-bar-fill { flex-shrink: 0 !important; }", caught: (m) => m.past.length > 0 },
  { id: "cut-label", reader: "player", what: "a desktop link's label cut by its box", css: "header.app-topbar nav a.kp-navlink { max-width: 40px !important; overflow: hidden !important; }", caught: (m) => m.cut.length > 0 },
  { id: "lead-short", reader: "guest", what: "the links' lead sized by its basis alone (HEADER-1024 2's first build: every link 12px left in a row with room)", css: ".kp-bar-lead::before { width: auto !important; }", caught: (m) => m.moved.length > 0 },
];
const problems = (m) => [...m.past, ...m.over, ...m.moved, ...m.cut];

const pre = await premise(BASE);
if (pre.refuse) { console.error(`PREMISE ABSENT — ${pre.refuse}`); process.exit(2); }
const MLN = pre.health?.millionea?.state ?? "?";
const browser = await chromium.launch();
let pass = 0;
const fails = [];
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✓ ${label}${detail ? ` ${detail}` : ""}`); }
  else { fails.push(`${label}${detail ? ` — ${detail}` : ""}`); console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`); }
};

/** One reader × language × page: load at 1024, then walk the widths; returns every width's reading. */
async function walk(reader, cookie, locale, route, widths, extraCss = null) {
  const ctx = await browser.newContext({ viewport: { width: widths[0], height: 760 }, deviceScaleFactor: 1 });
  try {
    await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...(cookie ? [{ ...cookie, url: BASE, domain: undefined, path: undefined }] : [])]);
    const page = await ctx.newPage();
    await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForLoadState("load", { timeout: 60_000 }).catch(() => {});
    await page.evaluate(() => document.fonts?.ready).catch(() => {});
    if (extraCss) await page.addStyleTag({ content: extraCss });
    await page.waitForTimeout(400);
    const out = [];
    for (const w of widths) {
      await page.setViewportSize({ width: w, height: 760 });
      await page.waitForTimeout(120);
      out.push({ w, m: await page.evaluate(ROW_PROBE) });
    }
    return out;
  } finally { await ctx.close(); }
}

try {
  if (!PROVE_RED) {
    console.log(`qa:classic-header-fit · Millionea ${MLN} at ${BASE} · ${READERS.length} readers × ${LOCALES.join("/")} × ${WIDTHS.length} widths (${WIDTHS[0]}–${WIDTHS[WIDTHS.length - 1]})`);
    for (const r of READERS) {
      // Minted just before its own cells: the demo door resets the shared account on every visit.
      const cookie = r.door === null ? null : await demoSession(browser, BASE, { query: r.door });
      for (const l of LOCALES) for (const route of ROUTES(r.door !== null)) {
        const rows = await walk(r.id, cookie, l, route, WIDTHS);
        const bad = rows.filter((x) => !x.m || problems(x.m).length || x.m.lang !== l);
        const least = rows.filter((x) => x.m).reduce((a, x) => (a === null || x.m.slack < a.slack ? { w: x.w, slack: x.m.slack } : a), null);
        const at1024 = rows[0]?.m;
        ok(`${r.id} · ${l} · ${route} — the row fits its content edge, nothing overlaps, every label is whole and, where the row has room, nothing moved at all ${rows.length} widths (slack at 1024 ${at1024?.slack}px; least ${least?.slack}px at ${least?.w})`,
          bad.length === 0, bad.slice(0, 3).map((x) => `${x.w}: ${x.m ? [x.m.lang !== l ? `lang ${x.m.lang}` : "", ...problems(x.m)].filter(Boolean).join("; ") : "no classic header"}`).join(" ‖ "));
      }
    }
  } else {
    console.log(`red:classic-header-fit · Millionea ${MLN} at ${BASE} — each defect planted in the page must be caught (sw, /markets, 1024: the player's full row, a guest's row with room)`);
    const cookies = { player: await demoSession(browser, BASE, { query: "" }), guest: null };
    for (const reader of ["player", "guest"]) {
      const clean = (await walk(reader, cookies[reader], "sw", "/markets", [1024]))[0].m;
      ok(`CONTROL · ${reader} · the clean page passes at 1024 before anything is planted`, !!clean && problems(clean).length === 0,
        clean ? `slack ${clean.slack}px, the links' lead ${clean.lead}px${clean.roomy ? "" : " (the row gave)"} ${problems(clean).join("; ")}` : "no classic header");
    }
    for (const p of PLANTS) {
      const m = (await walk(p.reader, cookies[p.reader], "sw", "/markets", [1024], p.css))[0].m;
      ok(`PLANT · ${p.what} → reported`, !!m && p.caught(m), m ? `${p.reader} · slack ${m.slack}px · ${problems(m).slice(0, 2).join("; ") || "nothing reported"}` : "no classic header");
    }
  }
} finally {
  await browser.close();
}
console.log(`\n${PROVE_RED ? "red:classic-header-fit" : "qa:classic-header-fit"} (Millionea ${MLN}): ${pass} passed, ${fails.length} failed`);
process.exitCode = fails.length ? 1 : 0;
