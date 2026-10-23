/**
 * qa:classic-header-fit — THE CLASSIC HEADER ROW FITS INSIDE ITS CONTENT EDGE, AT EVERY WIDTH FROM 1024, IN EVERY
 * LANGUAGE, FOR EVERY READER (MASWALI-BUILD HEADER-1024, 2026-10-23).
 *
 *   BASE=http://localhost:3720 npm run qa:classic-header-fit        (measures the rollout the server runs — run it at
 *                                                                     FEATURE_MILLIONEA=ACTIVE, as production does, and at
 *                                                                     the default WITHDRAWN)
 *   BASE=http://localhost:3720 npm run red:classic-header-fit       (--prove-red: each defect planted IN THE PAGE)
 *
 * 🔴 THE DEFECT (found by the UDDOT lane's parity read, 2026-10-23): in Swahili at 1024, for a signed-in player, the
 * desktop links (502.5px) and the right cluster (400px: language, balance capsule, Deposit, bell, account) plus the bar's
 * three fixed 12px gaps ran 14.5px past the row's content edge — 16.5px at FEATURE_MILLIONEA=ACTIVE, where Millionea's
 * link stands in Results' place — into the 32px gutter, the account menu 4.5px from the screen's edge. The empty flex
 * spacer between the two clusters still cost the two gaps on its sides. ⛔ E-190's rule (`live/clip.mjs`, a control past
 * the SCREEN) cannot see it: the row stays on screen and `scrollWidth` reads 1024.
 *
 * THE RULE, per cell: every visible child of the header's row, and every control inside it, ends inside the row's content
 * edge (its box minus its padding) and starts inside it — the home link's 40px box borrows 7px of gutter each side below
 * 1280 BY DESIGN (`top-app-bar.tsx`), so for it the MARK is held, not the box; every label is whole (a desktop link, More,
 * the language code, the balance); and the row's SLACK (its free px, the journey's `qa:journey-header-fit` definition)
 * is printed — a number, never a threshold.
 * CELLS: a guest, the demo player, the demo player with an unconfirmed email, and the demo player under an officer's hold
 * (each minted just before its own cells: every /auth/demo visit resets the hold, the email and the balance) × sw · en ·
 * zh × /markets, /updown, /live and (signed in) /positions — each page lights a different link, and a lit link is bolder
 * and wider — × the widths below: every 8px across the band where the links first show beside the cluster, then the
 * desktop rungs to 1920. Widths are walked by resizing the loaded page (the header is CSS-responsive); 1024 is loaded.
 *
 * ⛔ REFUSES anything but `http://localhost:PORT` on an in-memory dev server (`live/journey-pass.mjs`'s premise). It
 * moves the one demo account's hold and email state, so never point it at a server another drive is using. It writes
 * no file, so `red:classic-header-fit` (--prove-red) is in `test:red-anchors`' in-process class.
 */
import { chromium } from "playwright";
import { premise, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || process.env.KP_BASE || "http://localhost:3720";
const PROVE_RED = process.argv.includes("--prove-red");
const LOCALES = (process.env.LOCALES || "sw,en,zh").split(",");
const WIDTHS = [...Array.from({ length: 33 }, (_, i) => 1024 + i * 8), 1279, 1280, 1300, 1366, 1440, 1536, 1600, 1920];
const READERS = [
  { id: "guest", door: null },
  { id: "player", door: "" },
  { id: "unverified", door: "?email=unverified" },
  { id: "held", door: "?hold=officer" },
];
const ROUTES = (signedIn) => ["/markets", "/updown", "/live", ...(signedIn ? ["/positions"] : [])];

/** Runs IN THE PAGE: the classic header row's content edges, its children and controls, the labels, the slack. */
const ROW_PROBE = () => {
  const header = document.querySelector('header.app-topbar:not([data-testid="journey-top-bar"])');
  const row = header?.firstElementChild;
  if (!header || !row) return null;
  const rs = getComputedStyle(row);
  const rr = row.getBoundingClientRect();
  const left = rr.left + (parseFloat(rs.paddingLeft) || 0);
  const right = rr.right - (parseFloat(rs.paddingRight) || 0);
  const shown = (el) => { const cs = getComputedStyle(el); const b = el.getBoundingClientRect(); return cs.display !== "none" && cs.visibility !== "hidden" && b.width > 0 && b.height > 0; };
  const name = (el) => (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
  const home = row.querySelector(':scope > a[href="/"]');
  const past = [];
  for (const el of [...row.children].filter(shown)) {
    const b = el.getBoundingClientRect();
    if (b.right > right + 0.5) past.push(`${name(el)} ends ${b.right.toFixed(1)} > ${right.toFixed(1)}`);
    if (el !== home && b.left < left - 0.5) past.push(`${name(el)} starts ${b.left.toFixed(1)} < ${left.toFixed(1)}`);
  }
  // Every control inside the row (a closed <details> keeps laid-out boxes it never paints: its summary only).
  for (const el of row.querySelectorAll('a[href], button, summary, [role="button"]')) {
    if (!shown(el) || el === home || (el.tagName !== "SUMMARY" && el.closest("details:not([open])"))) continue;
    const b = el.getBoundingClientRect();
    if (b.right > right + 0.5) past.push(`control ${name(el)} ends ${b.right.toFixed(1)} > ${right.toFixed(1)}`);
    if (b.left < left - 0.5) past.push(`control ${name(el)} starts ${b.left.toFixed(1)} < ${left.toFixed(1)}`);
  }
  const mark = home?.querySelector("svg");
  if (mark && shown(home)) {
    const m = mark.getBoundingClientRect();
    if (m.left < left - 0.5) past.push(`the mark starts ${m.left.toFixed(1)} < ${left.toFixed(1)}`);
  }
  // Every label whole: a desktop link, More, the language code, the balance's figure.
  const cut = [...row.querySelectorAll('nav a, nav button, details > summary, [data-testid="wallet-balance-pill"], [data-testid="wallet-balance-capsule"]')]
    .filter(shown).filter((el) => el.scrollWidth > el.clientWidth + 0.5).map((el) => `${name(el)} clipped (${el.scrollWidth} > ${el.clientWidth})`);
  // The slack — the journey header-fit's definition: content width − every visible child's outer width (a growing child
  // at its minimum) − the gaps between them.
  const gap = parseFloat(rs.columnGap) || 0;
  const vis = [...row.children].filter((el) => getComputedStyle(el).display !== "none");
  let used = 0;
  for (const el of vis) {
    const cs = getComputedStyle(el);
    const grows = (parseFloat(cs.flexGrow) || 0) > 0;
    used += (grows ? (parseFloat(cs.minWidth) || 0) : el.getBoundingClientRect().width) + (parseFloat(cs.marginLeft) || 0) + (parseFloat(cs.marginRight) || 0);
  }
  const slack = Math.round((right - left - used - gap * Math.max(0, vis.length - 1)) * 10) / 10;
  const links = [...row.querySelectorAll("nav a.kp-navlink")].filter(shown).map((a) => a.textContent.trim());
  return { vw: innerWidth, lang: document.documentElement.lang, right: +right.toFixed(1), slack, past, cut, links };
};

/** The plants: each a stylesheet that must turn this drive red (sw, the player, /markets, 1024). */
const PLANTS = [
  { id: "wider-label", what: "a desktop link 64px wider (the next longer label)", css: "header.app-topbar nav a.kp-navlink:first-child { padding-right: 76px !important; }" },
  { id: "fixed-gaps", what: "the bar's spacing that gives way held at full width (HEADER-1024 undone)", css: ".kp-bar-lead, .kp-bar-fill { flex-shrink: 0 !important; }" },
  { id: "cut-label", what: "a desktop link's label cut by its box", css: "header.app-topbar nav a.kp-navlink { max-width: 40px !important; overflow: hidden !important; }" },
];

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
        const bad = rows.filter((x) => !x.m || x.m.past.length || x.m.cut.length || x.m.lang !== l);
        const least = rows.filter((x) => x.m).reduce((a, x) => (a === null || x.m.slack < a.slack ? { w: x.w, slack: x.m.slack } : a), null);
        const at1024 = rows[0]?.m;
        ok(`${r.id} · ${l} · ${route} — the row fits its content edge and every label is whole at all ${rows.length} widths (slack at 1024 ${at1024?.slack}px; least ${least?.slack}px at ${least?.w})`,
          bad.length === 0, bad.slice(0, 3).map((x) => `${x.w}: ${x.m ? [x.m.lang !== l ? `lang ${x.m.lang}` : "", ...x.m.past, ...x.m.cut].filter(Boolean).join("; ") : "no classic header"}`).join(" ‖ "));
      }
    }
  } else {
    console.log(`red:classic-header-fit · Millionea ${MLN} at ${BASE} — each defect planted in the page must be caught (sw, the player, /markets, 1024)`);
    const cookie = await demoSession(browser, BASE, { query: "" });
    const clean = (await walk("player", cookie, "sw", "/markets", [1024]))[0].m;
    ok("CONTROL · the clean page fits at 1024 before anything is planted", !!clean && clean.past.length === 0 && clean.cut.length === 0, clean ? `slack ${clean.slack}px ${[...clean.past, ...clean.cut].join("; ")}` : "no classic header");
    for (const p of PLANTS) {
      const m = (await walk("player", cookie, "sw", "/markets", [1024], p.css))[0].m;
      const caught = !!m && (p.id === "cut-label" ? m.cut.length > 0 : m.past.length > 0);
      ok(`PLANT · ${p.what} → reported`, caught, m ? `slack ${m.slack}px · ${[...m.past, ...m.cut].slice(0, 2).join("; ") || "nothing reported"}` : "no classic header");
    }
  }
} finally {
  await browser.close();
}
console.log(`\n${PROVE_RED ? "red:classic-header-fit" : "qa:classic-header-fit"} (Millionea ${MLN}): ${pass} passed, ${fails.length} failed`);
process.exitCode = fails.length ? 1 : 0;
