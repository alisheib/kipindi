// Landing v3 · WP4 — the closing-soonest board rows, measured per row.
//   BASE=http://localhost:3057 OUT=<dir> [WIDTHS=360,768,1280] [LOCALES=sw,en,zh] [TAG=p2] node scripts/qa/landing-v3/rows.mjs
//   RED=1 … rows.mjs   → plants `display:block` on every row at 1280 and REQUIRES the one-line check to fail.
// Per `.kp-qrow` (an <li>, three sibling zones — WP17):
//   · no a>a, a>button or button>a nesting, and the row itself is not a link;
//   · the head link opens /markets/{id}; the side links end ?side=YES / ?side=NO and are ≥ 44px tall;
//   · phone (< 640): head above reading above pick, the pick spans the row, its two halves equal (±1px);
//   · tablet (640–1023): head and reading share a band with the reading to the right, the pick below both;
//   · desktop (≥ 1024): head, reading and pick share ONE band, left to right;
//   · by `data-price`: priced → two "@ n%" suffixes and the priced rail; oneSided → no suffix, the dashed rail
//     and a note naming the empty side; none → the dashed rail and no note;
//   · V18's parts all present: price|state, time, pool, predictors, source, pick.
// Exit 1 on any finding (RED inverts it: exit 0 only when the plant is caught); exit 2 when no row was measured.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = (process.env.BASE || "http://localhost:3057").replace(/\/$/, "");
const OUT = process.env.OUT || ".qa-shots/landing-v3/wp34";
const TAG = process.env.TAG || "rows";
const RED = process.env.RED === "1";
const W = (process.env.WIDTHS || (RED ? "1280" : "360,768,1280")).split(",").map(Number);
const LOCALES = (process.env.LOCALES || (RED ? "sw" : "sw,en,zh")).split(",");
const H = { 360: 780, 768: 1024, 1280: 860 };
mkdirSync(OUT, { recursive: true });

const PROBE = (plant) => {
  if (plant) for (const r of document.querySelectorAll(".kp-qrow")) r.style.setProperty("display", "block", "important");
  const vis = (el) => { if (!el) return false; const b = el.getBoundingClientRect(); const s = getComputedStyle(el); return b.width > 0 && b.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
  const R = (el) => el.getBoundingClientRect();
  const out = [];
  const vw = innerWidth;
  for (const row of document.querySelectorAll(".kp-qboard > .kp-qrow")) {
    if (!vis(row)) continue;
    const bad = [];
    const id = row.getAttribute("data-row-id") || "?";
    const kind = row.getAttribute("data-price");
    if (row.tagName !== "LI") bad.push(`the row is a <${row.tagName.toLowerCase()}>, not an <li>`);
    if (row.closest("a")) bad.push("the row sits inside a link");
    if (row.querySelector("a a, a button, button a")) bad.push("an interactive element inside another");
    const head = row.querySelector(".kp-qrow__head"), read = row.querySelector(".kp-qrow__read"), act = row.querySelector(".kp-qrow__act");
    if (!head || !read || !act) { bad.push("a zone is missing"); out.push({ id, kind, bad }); continue; }
    if (!(head.getAttribute("href") || "").endsWith(`/markets/${id}`)) bad.push(`head href ${head.getAttribute("href")}`);
    if (R(head).height < 44) bad.push(`head link ${Math.round(R(head).height)}px tall`);
    const [yes, no] = [...act.querySelectorAll("a")];
    if (!yes || !no) bad.push("the pair is not two links");
    else {
      if (!(yes.getAttribute("href") || "").endsWith(`/markets/${id}?side=YES`)) bad.push(`YES href ${yes.getAttribute("href")}`);
      if (!(no.getAttribute("href") || "").endsWith(`/markets/${id}?side=NO`)) bad.push(`NO href ${no.getAttribute("href")}`);
      for (const b of [yes, no]) if (R(b).height < 44) bad.push(`a side link ${Math.round(R(b).height)}px tall`);
    }
    const h = R(head), r = R(read), a = R(act), rw = R(row);
    const band = (p, q) => p.top < q.bottom - 1 && q.top < p.bottom - 1;
    if (vw < 640) {
      if (!(h.bottom <= r.top + 1 && r.bottom <= a.top + 1)) bad.push("phone: not head → reading → pick top to bottom");
      if (Math.abs(a.width - rw.width) > 2) bad.push(`phone: the pair is ${Math.round(a.width)} of the row's ${Math.round(rw.width)}px`);
      if (yes && no && Math.abs(R(yes).width - R(no).width) > 1) bad.push(`phone: halves ${Math.round(R(yes).width)} vs ${Math.round(R(no).width)}`);
    } else if (vw < 1024) {
      if (!band(h, r) || r.left < h.right - 1) bad.push("tablet: the reading is not beside the head, to its right");
      if (a.top < Math.max(h.bottom, r.bottom) - 1) bad.push("tablet: the pair is not below the head and the reading");
    } else {
      if (!(band(h, r) && band(r, a) && h.right <= r.left + 1 && r.right <= a.left + 1)) bad.push("desktop: head, reading and pick are not one line, left to right");
    }
    const at = row.querySelectorAll(".kp-qrow__at").length;
    const note = row.querySelector(".kp-qrow__note");
    if (kind === "priced") {
      if (at !== 2) bad.push(`priced: ${at} "@ n%" suffixes`);
      if (!row.querySelector(".tipbar-rail")) bad.push("priced: no priced rail");
    } else {
      if (at !== 0) bad.push(`${kind}: ${at} "@ n%" suffixes on a row with no price`);
      if (!row.querySelector(".tipbar-empty")) bad.push(`${kind}: no dashed rail`);
      if (kind === "oneSided" && !(note && vis(note))) bad.push("oneSided: no refund note");
      if (kind === "none" && note) bad.push("none: a refund note on an empty pool");
    }
    for (const p of ["time", "pool", "predictors", "source", "pick"]) {
      const el = row.querySelector(`[data-market-part="${p}"]`);
      if (!el || !vis(el) || !(el.innerText || "").trim()) bad.push(`no visible ${p}`);
    }
    if (!row.querySelector('[data-market-part="price"], [data-market-part="state"]')) bad.push("neither price nor state");
    out.push({ id, kind, bad, h: Math.round(rw.height), meta: (row.querySelector(".kp-qrow__meta")?.innerText || "").trim().slice(0, 140) });
  }
  return out;
};

const browser = await chromium.launch({ headless: true });
const report = [];
let findings = 0, measured = 0;
for (const w of W) for (const loc of LOCALES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: H[w] || 900 }, deviceScaleFactor: 1 });
  if (loc !== "sw") await ctx.addCookies([{ name: "kp-locale", value: loc, domain: new URL(BASE).hostname, path: "/" }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const id = `${w}-${loc}`;
  try {
    await page.goto(BASE + "/", { waitUntil: "load", timeout: 120000 });
    await page.waitForTimeout(4000);
    const decline = page.getByTestId("consent-decline");
    if (await decline.count()) await decline.first().click({ timeout: 5000 }).catch(() => {});
    const board = page.locator(".kp-qboard").first();
    if (await board.count()) await board.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(700);
    const rows = await page.evaluate(PROBE, RED);
    if (await board.count()) await board.screenshot({ path: join(OUT, `${TAG}-${id}${RED ? "-red" : ""}.png`) }).catch(() => {});
    measured += rows.length;
    for (const r of rows) findings += r.bad.length;
    report.push({ id, rows });
    console.log(`${id}: ${rows.length} rows · ${rows.map((r) => `${r.kind}${r.bad.length ? " ✗ " + r.bad.join("; ") : " ok"}`).join(" | ")}`);
  } catch (e) {
    report.push({ id, error: String(e.message).split("\n")[0] });
    console.log(`FAIL ${id}: ${String(e.message).split("\n")[0]}`);
  }
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, `${TAG}${RED ? "-red" : ""}.json`), JSON.stringify(report, null, 2));
if (!measured) { console.error("⛔ no board row was measured"); process.exit(2); }
if (RED) {
  const caught = report.some((c) => (c.rows || []).some((r) => r.bad.some((b) => b.startsWith("desktop:"))));
  console.log(caught ? "RED PROVED — a row set as one block fails the one-line check" : "RED BLIND — the plant went unseen");
  process.exit(caught ? 0 : 1);
}
console.log(`${findings} finding(s) over ${measured} row(s)`);
process.exit(findings ? 1 : 0);
