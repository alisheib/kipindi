/**
 * Probe (S10, 2026-10-02) — is an admin table's zero-row message CENTRED in its cell at phone and desktop width?
 *
 * The cap `AdminTableEmpty` puts on its message (the visible strip of a sideways-scrolling table) was worked out for
 * a card that pads its table; an empty `.admin-tbl` cannot scroll at all, and on the contacts page the message sat
 * 20px from the card on its left and 62px on its right. globals.css now lifts the cap where the table cannot scroll.
 * This drives several admin pages with an EMPTY table, measures each message against its cell, and photographs it.
 *
 *   BASE=http://localhost:3010 node scripts/live/marketing-empty-centre-probe.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = ".qa-shots/marketing-setup/empty-centre";
mkdirSync(SHOTS, { recursive: true });
let pass = 0, fail = 0;
const ok = (l, c, x = "") => { if (c) pass++; else fail++; console.log(`  ${c ? "ok  " : "FAIL"} ${l}${x ? ` -- ${x}` : ""}`); };

// The contacts page's two zero-row states, then admin pages a fresh store leaves empty (the platform half of the claim).
const PAGES = ["/admin/contacts?op=TTCL", "/admin/contacts?op=NOKIA", "/admin/aml", "/admin/kyc/refused", "/admin/privacy",
  "/admin/self-exclusions", "/admin/compliance", "/admin/sources", "/admin/kyc"];
const browser = await chromium.launch();
for (const vp of [{ name: "360x780", width: 360, height: 780 }, { name: "1280x800", width: 1280, height: 800 }]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "ADMIN", phone: "+255700002090", name: "QA ADMIN" } });
  if (!r.ok()) throw new Error(`seed-admin failed: ${r.status()}`);
  await page.request.post(BASE + "/api/dev-test/marketing-contacts-seed?count=45");
  console.log(`\n[empty-centre] ${vp.name}`);
  let measured = 0;
  for (const path of PAGES) {
    await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => {});
    const cells = await page.$$eval("tr[data-table-empty] > td", (tds) => tds.map((td) => {
      const pin = td.querySelector("[data-table-empty-pin]");
      const t = td.getBoundingClientRect();
      const cs = getComputedStyle(td);
      const innerL = t.left + parseFloat(cs.paddingLeft), innerR = t.right - parseFloat(cs.paddingRight);
      const p = pin ? pin.getBoundingClientRect() : null;
      const btns = Array.from(td.querySelectorAll("a.btn, button.btn")).map((b) => b.getBoundingClientRect());
      const box = td.querySelector("[data-table-empty-pin] > *")?.getBoundingClientRect() ?? null;
      const inTable = td.closest("table")?.classList.contains("admin-tbl") ?? false;
      return {
        inTable, vw: innerWidth,
        left: p ? Math.round(p.left - innerL) : null, right: p ? Math.round(innerR - p.right) : null,
        offRight: p ? Math.round(p.right - innerWidth) : null,
        btnSkew: btns.length && box ? Math.round(((Math.min(...btns.map((b) => b.left)) + Math.max(...btns.map((b) => b.right))) / 2) - (box.left + box.right) / 2) : 0,
      };
    }));
    if (cells.length === 0) { console.log(`  ·    ${path} — no empty table here at this state`); continue; }
    measured++;
    cells.forEach((c, i) => {
      ok(`${vp.name} · ${path} [${i}] · the message is centred in its cell (left ${c.left}px, right ${c.right}px) and on screen`,
        c.left !== null && Math.abs(c.left - c.right) <= 2 && c.offRight <= 0, JSON.stringify(c));
      ok(`${vp.name} · ${path} [${i}] · its buttons are centred under it (skew ${c.btnSkew}px)`, Math.abs(c.btnSkew) <= 2, JSON.stringify(c));
    });
    const slug = path.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
    const target = page.locator("tr[data-table-empty]").first();
    await target.scrollIntoViewIfNeeded().catch(() => {});
    await page.screenshot({ path: `${SHOTS}/${vp.name}-${slug}.png` });
  }
  ok(`${vp.name} · CONTROL · at least three pages had an empty table to measure`, measured >= 3, String(measured));
  if (vp.width === 360) {
    // ⛔ THE PROBE MUST BE ABLE TO SEE THE DEFECT: the old cap put back IN THE PAGE (no repo file touched), and the
    // contacts page's message must measure lopsided again — or "centred" above proved nothing.
    await page.goto(BASE + "/admin/contacts?op=TTCL", { waitUntil: "networkidle" }).catch(() => {});
    await page.addStyleTag({ content: "[data-table-empty-pin] { max-width: calc(100vw - 122px) !important; }" });
    const back = await page.$eval("tr[data-table-empty] > td", (td) => {
      const p = td.querySelector("[data-table-empty-pin]").getBoundingClientRect();
      const t = td.getBoundingClientRect();
      const cs = getComputedStyle(td);
      return { left: Math.round(p.left - (t.left + parseFloat(cs.paddingLeft))), right: Math.round((t.right - parseFloat(cs.paddingRight)) - p.right) };
    });
    ok(`${vp.name} · CONTROL · with the old cap put back in the page, the probe sees the message lopsided (left ${back.left}px, right ${back.right}px)`,
      back.right - back.left > 20, JSON.stringify(back));
  }
  await ctx.close();
}
await browser.close();
console.log(`\nempty-centre-probe: ${pass} passed, ${fail} failed\nshots: ${SHOTS}`);
process.exitCode = fail === 0 ? 0 : 1;
