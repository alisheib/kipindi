/**
 * qa:house-bot-panel-states — C7 step 5's two new panels, in EVERY STATE THEY CAN REACH.
 *
 *   KP_BASE=http://127.0.0.1:3021 npm run qa:house-bot-panel-states
 *
 * ── WHY IT EXISTS BESIDE `qa:house-bots-visual` ──────────────────────────────────────────────────────────────────
 * That gate derives its routes from `CONSOLE_TABS`, so the day `activity` and `history` landed it began asserting
 * its twenty per-tile checks on them — which is exactly right and is how it caught the rail's tap floor. But a
 * route is not a STATE. The gate photographs `/admin/desk?tab=activity` and nothing else: never page 2, never a
 * filter that matches nothing, never a past-the-end page, never a read that FAILED, never the cancel ceremony, and
 * never the account page's own two panels. Those are where a panel's geometry actually breaks, because they are
 * the renders with no rows, with a pager, with a Callout where a table should be.
 *
 * ⛔ VIEWPORT TILES, NEVER `fullPage`, at the six mandatory widths, written under `KP_SHOTS` (default
 * `.qa-house-bots/states/`, gitignored by the `.qa-` prefix rule). Under ruling D19 these are pictures of a
 * feature that is never public and this repository is PUBLIC (W20) — the DRIVER is committed so anyone can
 * re-shoot; a tile never is.
 *
 * ⛔ IT MEASURES AS WELL AS PHOTOGRAPHS, because a tile nobody reads is not a measurement. Per state, per width it
 * records: the document's own horizontal overflow, every element escaping the viewport outside a scroller, the
 * rail's chip geometry, the pager's position, the empty-state box, the table's column alignment, the money cells
 * that did NOT go through the money atom, and the ADDRESS BAR — the one surface lane 1 found a raw internal word
 * in that every suite had passed.
 *
 * ⛔ LOCAL ONLY: it refuses any base that is not a loopback address, for `qa:house-bots-visual`'s own reason.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.KP_BASE ?? "http://127.0.0.1:3021";
if (!/^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — local next start only. KP_BASE was ${JSON.stringify(BASE)}.`);
  process.exit(2);
}
const SHOTS = process.env.KP_SHOTS ?? ".qa-house-bots/states";
const WIDTHS = (process.env.KP_WIDTHS ?? "360,640,768,1024,1280,1920").split(",").map(Number).filter(Boolean);
const ONLY = process.env.KP_ONLY ? process.env.KP_ONLY.split(",").map((s) => s.trim()) : null;
const PHONE = "+255700000000";
const PASSWORD = process.env.KP_ADMIN_PASSWORD ?? "QaAdmin2026!";
const ACTIVE = process.env.KP_ACTIVE_ID ?? "";
const REMOVED = process.env.KP_REMOVED_ID ?? "";
mkdirSync(SHOTS, { recursive: true });

/** The states. `q` is appended to the route; `note` says what the tile is FOR. */
const STATES = [
  ["L-A1", "/admin/desk?tab=activity", "landing activity · rows, default window"],
  ["L-A2", "/admin/desk?tab=activity&page=2", "landing activity · page 2"],
  ["L-A3", "/admin/desk?tab=activity&page=999", "landing activity · past the end → last page"],
  ["L-A4", "/admin/desk?tab=activity&kind=manual&product=up-down", "landing activity · filtered to ZERO"],
  ["L-A5", "/admin/desk?tab=activity&kind=responding&product=polls&outcome=placed&range=7d", "landing activity · every filter at once"],
  ["L-A6", "/admin/desk?tab=activity&page=x&kind=nonsense&range=forever", "landing activity · a crafted address, refused"],
  ["L-H1", "/admin/desk?tab=history", "landing history · rows"],
  ["L-H2", "/admin/desk?tab=history&hpage=2", "landing history · page 2"],
  ["L-H3", "/admin/desk?tab=history&hpage=999", "landing history · past the end → last page"],
  ["A-A1", `/admin/desk/${ACTIVE}?tab=activity`, "ACTIVE account · activity, rows"],
  ["A-A2", `/admin/desk/${ACTIVE}?tab=activity&page=2`, "ACTIVE account · activity, page 2"],
  ["A-A3", `/admin/desk/${ACTIVE}?tab=activity&page=999`, "ACTIVE account · activity, past the end"],
  ["A-A4", `/admin/desk/${ACTIVE}?tab=activity&kind=manual&product=up-down`, "ACTIVE account · activity filtered to ZERO"],
  ["A-A5", `/admin/desk/${ACTIVE}?tab=activity&kind=responding&product=polls&outcome=placed&range=7d`, "ACTIVE account · every filter at once"],
  ["A-H1", `/admin/desk/${ACTIVE}?tab=history`, "ACTIVE account · history, rows"],
  ["A-H2", `/admin/desk/${ACTIVE}?tab=history&hpage=2`, "ACTIVE account · history, page 2"],
  ["R-A1", `/admin/desk/${REMOVED}?tab=activity`, "REMOVED account · activity"],
  ["R-H1", `/admin/desk/${REMOVED}?tab=history`, "REMOVED account · history"],
].filter(([id, route]) => (!ONLY || ONLY.includes(id)) && !/\/undefined|\/\?/.test(route));

/** Everything read out of ONE render, in the page, rather than guessed from the picture. */
const PROBE = `() => {
  const de = document.documentElement;
  const vw = window.innerWidth;
  const esc = [];
  for (const el of document.querySelectorAll("main *")) {
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    if (r.right > vw + 1 || r.left < -1) {
      let p = el.parentElement, scroller = false;
      while (p) { const s = getComputedStyle(p); if (/auto|scroll/.test(s.overflowX)) { scroller = true; break; } p = p.parentElement; }
      if (!scroller) esc.push((el.tagName + "." + (el.className && el.className.baseVal === undefined ? String(el.className).slice(0,40) : "")).slice(0,60)
        + " right=" + Math.round(r.right));
    }
  }
  const rail = document.querySelector("[data-filter-rail]");
  const chips = rail ? [...rail.querySelectorAll("a,button")].map((c) => ({
    t: (c.textContent || "").trim().slice(0, 22), h: Math.round(c.getBoundingClientRect().height),
    y: Math.round(c.getBoundingClientRect().top),
  })) : [];
  const railBox = rail ? (() => { const r = rail.getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width), right: Math.round(r.right) }; })() : null;
  const rows = [...document.querySelectorAll("main .admin-tbl tbody tr")];
  const heads = [...document.querySelectorAll("main .admin-tbl thead th")].map((th) => ({
    t: (th.textContent || "").trim().slice(0, 24),
    align: getComputedStyle(th).textAlign, tabular: /tabular/.test(th.className || ""),
  }));
  const firstCells = rows[0] ? [...rows[0].children].map((td) => ({
    t: (td.textContent || "").trim().slice(0, 26),
    align: getComputedStyle(td).textAlign,
    tabular: /tabular/.test(td.className || ""),
    amount: !!td.querySelector(".amount,[data-amount]"),
    variant: /variant-numeric:\\s*tabular/.test(getComputedStyle(td).fontVariantNumeric) || getComputedStyle(td).fontVariantNumeric.includes("tabular"),
  })) : [];
  /* ⛔ THE TIMESTAMP COLUMN, MEASURED THE WAY §A5 MEANS IT. "Never clip money or a timestamp" is about the
     VALUE, so a wrap is read with a Range over the cell's own contents rather than from scrollWidth, which is
     0 > 1 for an inline non-replaced span and therefore always false. FOUND 2026-09-21: every When cell on all
     four new panels broke "20 Sep 22:33:59" onto two line boxes at 360-1024, while the Stake cell beside it was
     nowrap / tabular-nums — one table, two treatments of the same kind of value. */
  const whenIdx = heads.findIndex((h) => h.t === "When");
  let whenWrapped = 0, whenWs = null, whenFvn = null;
  if (whenIdx >= 0) {
    for (const tr of rows) {
      /* MEASURE THE RIGHT POPULATION. A panel with nothing to show still renders ONE tbody row — the
         empty-state box, spanning every column — and that row has no When CELL at all. Counting it made
         this assertion fail on the two filtered-to-zero states while the product was right, which is the
         false positive that discredits a gate faster than a missed defect does. Data rows only. */
      if (tr.children.length !== heads.length) continue;
      const td = tr.children[whenIdx]; if (!td) continue;
      const cs = getComputedStyle(td);
      whenWs = whenWs === null ? cs.whiteSpace : whenWs;
      whenFvn = whenFvn === null ? cs.fontVariantNumeric : whenFvn;
      const rg = document.createRange(); rg.selectNodeContents(td);
      if (rg.getClientRects().length > 1) whenWrapped += 1;
    }
  }
  /* 🔴 THE "Who" COLUMN, MEASURED THE SAME WAY AND FOR THE SAME REASON. Ruling 420 paints the actor as an ID;
     "break-all" broke it INSIDE the word, and on the desk-wide history — the only one of the two carrying an
     Account column — "usr_ops_visual_officer" came apart into SIX one-to-four-character line boxes at 640,
     while the account page's copy of the same cell broke cleanly in two. One value, two treatments, and at 360
     the shattered cell set the ROW height from inside the horizontal scroller. The ceiling is 1: an id is a
     value, and a value that needs six lines has been rendered wrong rather than wrapped.
     The "Change" column is measured with it and for the same reason: it holds a bounded PAIR
     ("Paused → Active"), and at 360 it came apart into three line boxes with the arrow alone on the
     middle one — a relation broken across lines is not the relation. */
  const lineBoxes = (name) => {
    const idx = heads.findIndex((h) => h.t === name);
    let max = 0, ws = null, n = 0;
    if (idx >= 0) {
      for (const tr of rows) {
        if (tr.children.length !== heads.length) continue;
        const td = tr.children[idx]; if (!td) continue;
        ws = ws === null ? getComputedStyle(td).whiteSpace : ws;
        const rg = document.createRange(); rg.selectNodeContents(td);
        max = Math.max(max, rg.getClientRects().length);
        n += 1;
      }
    }
    return { max, ws, n };
  };
  const who = lineBoxes("Who");
  const change = lineBoxes("Change");
  const whoMaxLines = who.max, whoWs = who.ws, whoRows = who.n;
  const money = [...document.querySelectorAll("main .amount, main [data-amount]")].length;
  const tzsText = (document.querySelector("main") || document.body).innerText.match(/TZS/g);
  /* ⛔ THE PAGER IS FOUND BY ITS OWN CONTROLS, NOT BY A 'nav[aria-label]' — the first draft of this probe
     matched the SECTION TABS ("Desk sections") on every state and reported a pager that was never the pager. */
  /* 🔴 AND THE FIRST WORKING DRAFT FOUND NOTHING AT ALL, WHICH IS WORSE THAN FINDING THE WRONG THING. It
     scoped the search to "main …" and reported pagerBox: null on ALL 108 renders — including states whose
     TILE shows the pager plainly ("81-82 OF 82", then « ‹ 1 2 3 4 5 › »). A probe that answers ABSENT for
     something photographed PRESENT is the false negative that makes a green drive worthless. Scope is the
     document, the disabled controls are SPANS and so are matched too, and §P0 below fails if no render on
     a multi-page state reached one — so this can never go quietly blind again. */
  /* 🔴 AND THE SECOND DRAFT WAS STILL BLIND, WHICH IS WHY THE HOOK IS NOW THE KIT'S OWN. Scoping to the
     document and matching a/button/span by aria-label STILL found nothing on all 66 paged renders, while the
     very same probe's own aria list carried "First page" · "Previous page" · "Next page" · "Last page" from
     a "main [aria-label]" query — so the labelled element is none of those three tags, and guessing a fourth
     would be the same mistake a third time. pagination.tsx stamps data-pager-group on its three groups: that is
     a hook the kit MAINTAINS, not one this probe inferred. The tag names are recorded beside it so the next
     reader does not have to re-derive why the aria route failed. */
  const pagerTags = [...document.querySelectorAll("[aria-label]")]
    .filter((b) => /page|ukurasa/i.test(b.getAttribute("aria-label") || ""))
    .map((b) => b.tagName + "[" + (b.getAttribute("aria-label") || "").slice(0, 14) + "]").slice(0, 6);
  const pageBtn = [...document.querySelectorAll("[data-pager-group], a[aria-label], button[aria-label], span[aria-label]")]
    .filter((b) => b.hasAttribute("data-pager-group") || /page|ukurasa/i.test(b.getAttribute("aria-label") || ""));
  const pageBtnLegacy = [...document.querySelectorAll("a[aria-label], button[aria-label], span[aria-label]")]
    .filter((b) => /page|ukurasa/i.test(b.getAttribute("aria-label") || ""));
  /* The pager ROW, not the strip of controls inside it: the row is the one that also carries the reading
     ("1-20 OF 82"), and the row's top is what "where the pager sits" means. Bounded walk — four levels, then
     give up — so a markup change cannot silently promote this to <body>. */
  let pager = pageBtn.length ? pageBtn[0].parentElement : null;
  for (let up = 0; up < 4 && pager && !/\\d\\s+of\\s+\\d/i.test(pager.textContent || ""); up += 1) pager = pager.parentElement;
  const pagerBox = pager ? (() => { const r = pager.getBoundingClientRect();
    return { label: pager.getAttribute("aria-label") || "", h: Math.round(r.height), top: Math.round(r.top),
             text: (pager.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 90) }; })() : null;
  const callout = [...document.querySelectorAll("main [role='alert'], main .callout, main [data-callout]")]
    .map((c) => (c.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 120));
  const empty = [...document.querySelectorAll("main h2, main h3, main p")]
    .map((n) => (n.textContent || "").trim()).filter((t) => /Nothing|No changes|not used in full/i.test(t)).slice(0, 4);
  const tabs = [...document.querySelectorAll("main [role='tablist'] a, main [role='tablist'] button")]
    .map((a) => (a.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 34));
  const aria = [...document.querySelectorAll("main [aria-label],main [title],main [placeholder],main img[alt]")]
    .flatMap((el) => ["aria-label","title","placeholder","alt"].map((a) => el.getAttribute(a)).filter(Boolean))
    .map((s) => s.slice(0, 70));
  return {
    url: location.pathname + location.search,
    docOverflow: de.scrollWidth > vw + 1 ? de.scrollWidth + ">" + vw : null,
    escaping: esc.slice(0, 8), railBox, chips, heads, firstCells, rowCount: rows.length,
    money, tzs: tzsText ? tzsText.length : 0, pagerBox, callout, empty, tabs,
    pagerTags, pagerLegacyHits: pageBtnLegacy.length, pagerGroups: document.querySelectorAll("[data-pager-group]").length,
    whenWrapped, whenWs, whenFvn, whenRows: whenIdx >= 0 ? rows.filter((tr) => tr.children.length === heads.length).length : 0,
    whoMaxLines, whoWs, whoRows, changeMaxLines: change.max, changeWs: change.ws, changeRows: change.n,
    aria: aria.slice(0, 40),
    h1: (document.querySelector("main h1") || {}).textContent || "",
    lang: document.documentElement.lang || "",
  };
}`;

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const report = [];
try {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 60_000 });
  await page.fill("#phone", PHONE.replace("+255", ""));
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([
    page.waitForURL((u) => !/\/auth\//.test(u.toString()), { timeout: 60_000 }).catch(() => null),
    page.click('button[type="submit"]'),
  ]);
  if (/\/auth\//.test(page.url())) {
    console.error("REFUSED — the local admin could not sign in.");
    process.exit(3);
  }
  await page.close();

  for (const [id, route, note] of STATES) {
    for (const width of WIDTHS) {
      const p = await ctx.newPage();
      await p.setViewportSize({ width, height: 900 });
      await p.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 60_000 });
      await p.waitForTimeout(450);
      const m = await p.evaluate(eval(`(${PROBE})`)).catch((e) => ({ probeError: String(e).slice(0, 200) }));
      const file = join(SHOTS, `${id}-${width}.png`);
      await p.screenshot({ path: file });              // ⛔ VIEWPORT, never fullPage
      /* ⛔ A SECOND VIEWPORT TILE, SCROLLED TO THE PANEL — still never `fullPage`. At 360 the KPI band,
         the tabs and a 324px filter rail push the table entirely below the fold, and register row 9's
         own lesson is that a tile whose subject is off-screen measures NOTHING. So the table is brought
         into view and photographed as its own viewport tile. */
      const scrolled = await p.evaluate(() => {
        const t = document.querySelector("main .admin-tbl") || document.querySelector("main [data-empty], main [role='alert']");
        if (!t) return false;
        t.scrollIntoView({ block: "center" });
        return true;
      });
      if (scrolled) {
        await p.waitForTimeout(200);
        await p.screenshot({ path: join(SHOTS, `${id}-${width}-table.png`) });
      }
      report.push({ id, width, note, route, ...m });
      await p.close();
    }
    console.log(`shot ${id.padEnd(5)} ${WIDTHS.length} widths · ${note}`);
  }
} finally {
  await ctx.close();
  await browser.close();
}
writeFileSync(join(SHOTS, "states.json"), JSON.stringify(report, null, 1));

/* ── THE ASSERTIONS THIS DRIVER OWES ───────────────────────────────────────────────────────
 * A driver that only photographs leaves its finding in a sentence somebody has to re-read. These are the two
 * the 2026-09-21 pass earned, plus a coverage floor — 0 findings must mean the instrument RAN, which is the
 * "not applicable" verdict this programme has already paid for twice. */
let pass = 0, fail = 0;
const ok = (label, cond, extra = "") => {
  cond ? pass++ : fail++;
  console.log((cond ? "PASS " : "FAIL ") + label + (extra ? " — " + extra : ""));
};
console.log("");
for (const r of report) {
  if (!r.whenRows) continue;
  ok(`§W1 ${r.id} @${r.width} · no When timestamp is broken across two line boxes`,
    r.whenWrapped === 0,
    r.whenWrapped ? `${r.whenWrapped} of ${r.whenRows} rows wrapped (white-space: ${r.whenWs})` : "");
  ok(`§W2 ${r.id} @${r.width} · the When column sits on the same numeral axis as the Stake column beside it`,
    r.whenWs === "nowrap" && /tabular/.test(r.whenFvn || ""),
    `white-space: ${r.whenWs}, font-variant-numeric: ${r.whenFvn}`);
}
for (const r of report) {
  if (!r.whoRows) continue;
  ok(`§H1 ${r.id} @${r.width} · the actor id is ONE line, not a column of fragments`,
    r.whoMaxLines === 1, `worst cell took ${r.whoMaxLines} line boxes (white-space: ${r.whoWs})`);
  ok(`§H2 ${r.id} @${r.width} · a status CHANGE stays on one line, arrow and both ends together`,
    r.changeMaxLines <= 1, `worst cell took ${r.changeMaxLines} line boxes (white-space: ${r.changeWs})`);
}
ok("§H0 CONTROL · a Who column was actually reached, on both history panels",
  new Set(report.filter((r) => r.whoRows > 0).map((r) => r.id.slice(0, 1))).size >= 2,
  `${report.filter((r) => r.whoRows > 0).length} renders carried a Who column`);
ok("§W0 CONTROL · a When column was actually reached, on more than one state",
  report.filter((r) => r.whenRows > 0).length >= 6,
  `${report.filter((r) => r.whenRows > 0).length} renders carried a When column`);
for (const r of report) {
  ok(`§O1 ${r.id} @${r.width} · the document itself does not scroll sideways`, !r.docOverflow, r.docOverflow || "");
}
/* ── THE PAGER, WHICH THIS DRIVER PHOTOGRAPHED FOR A WHOLE RUN WITHOUT MEASURING ──────────────────────────
 * Ruling 411 puts a pager under both panels wherever the row source is unbounded, and 432(a) forbids one over a
 * list with nothing in it. Both halves are asserted here, with a control, because the first version of this file
 * recorded `pagerBox` and asserted NOTHING about it — so a probe that had gone blind and a page that had lost its
 * pager read exactly the same in the log. */
/* 🔴 AND PAGE 2 MUST REALLY BE PAGE 2. A state named "page 2" that is served the LAST page — which is what
 * `?hpage=2` correctly does when the panel holds one page — photographs page 1 under another name, and the
 * drive then CLAIMS a state it never reached. Measured 2026-09-21: the ACTIVE account held exactly 20 events,
 * so `A-H2` was page 1 and nothing said so. The fixture now gives that panel a second page, and this pair of
 * assertions is what keeps the claim honest: the first row of page 2 must DIFFER from the first row of page 1. */
const PAGE2 = [["L-A2", "L-A1"], ["A-A2", "A-A1"], ["L-H2", "L-H1"], ["A-H2", "A-H1"]];
const PAGED = new Set(["L-A1", "L-A2", "L-A3", "L-H1", "L-H2", "L-H3", "A-A1", "A-A2", "A-A3", "A-H1", "A-H2"]);
const UNPAGED = new Set(["L-A4", "A-A4"]);
for (const r of report) {
  if (PAGED.has(r.id)) {
    ok(`§P1 ${r.id} @${r.width} · the panel carries its pager`, !!r.pagerBox,
      r.pagerBox ? "" : "no page control found in the document");
    ok(`§P2 ${r.id} @${r.width} · and the pager states its own reading, not just arrows`,
      !!r.pagerBox && /\d[\s\S]{0,4}of[\s\S]{0,4}\d/i.test(r.pagerBox.text || ""),
      r.pagerBox ? JSON.stringify(r.pagerBox.text) : "");
    ok(`§P3 ${r.id} @${r.width} · its controls clear the 44px tap floor`,
      !!r.pagerBox && r.pagerBox.h >= 44, r.pagerBox ? `row height ${r.pagerBox.h}` : "");
  }
  if (UNPAGED.has(r.id)) {
    ok(`§P4 ${r.id} @${r.width} · CONTROL · no pager is drawn over a filter that matched nothing`,
      !r.pagerBox, r.pagerBox ? JSON.stringify(r.pagerBox.text) : "");
  }
}

for (const [two, one] of PAGE2) {
  for (const width of WIDTHS) {
    const b = report.find((r) => r.id === two && r.width === width);
    const a = report.find((r) => r.id === one && r.width === width);
    if (!a || !b) continue;
    const key = (r) => JSON.stringify((r.firstCells || []).map((c) => c.t));
    ok(`§P5 ${two} @${width} · page 2 is a DIFFERENT page, not page 1 under another name`,
      key(a) !== key(b) && b.rowCount > 0, `page1 ${key(a).slice(0, 60)} · page2 ${key(b).slice(0, 60)}`);
  }
}

console.log(`\n${report.length} tiles under ${SHOTS} · measurements in ${join(SHOTS, "states.json")}`);
console.log(`qa:house-bot-panel-states: ${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
