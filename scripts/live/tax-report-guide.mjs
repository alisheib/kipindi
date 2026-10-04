/**
 * THE MANAGERS' GUIDE · how to download the Government Tax Report, as a PDF (2026-10-04).
 * Ali: "a pdf guide how to download it … no extra comments or internal info … straightforward". So: one title, eight
 * steps — the month's filing, then the daily report (Ali, same day: "the same doc … with the daily instruction added")
 * — one picture of the real screen per step (the control to press outlined in red) — and nothing else. The
 * pictures are cropped to the part of the screen the step is about: no session, e-mail or role chip is ever in one.
 * Taken on a local in-memory server (zero production risk) with seeded books, signed in as a FINANCE officer — what the
 * managers who file it see. ⛔ Every word the guide quotes from the screen is checked against the source first: a guide
 * that quotes a label the page no longer shows refuses to build, naming it (the admin-guide rule).
 *
 * Run (one boot, in-memory; remove .next first — a stale .next 404s every /api/dev-test route):
 *   SESSION_SECRET=… OTP_PEPPER=… DISABLE_ADMIN_TOTP=true npx next dev -p 3047
 *   BASE=http://localhost:3047 npm run guide:tax-report
 * It downloads the report's own PDF too (.qa-shots/tax-guide/tax.pdf). To show that file's signature block in step 6,
 * render the last page's Attestation block (heading and the three boxes) as tax-sign.png beside it, with any PDF
 * renderer, the preparer's printed user id blanked (no internal id in a managers' guide), then rebuild without the server:
 *   BUILD_ONLY=1 npm run guide:tax-report
 * Writes docs/guides/50pick-how-to-download-the-tax-report.pdf.
 */
import { chromium } from "playwright";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3047";
const OUT = process.env.OUT || join("docs", "guides");
const SHOTS = join(".qa-shots", "tax-guide");
const PDF = join(OUT, "50pick-how-to-download-the-tax-report.pdf");
const BUILD_ONLY = process.env.BUILD_ONLY === "1";
mkdirSync(SHOTS, { recursive: true });
mkdirSync(OUT, { recursive: true });

/* ═══ THE WORDS — each one the guide quotes is checked against the screen's source ═══════════════════════════════ */

const QUOTED = [
  { file: "src/components/admin/admin-nav-groups.ts", text: 'group: { en: "Money", sw: "Pesa" }' },
  { file: "src/components/admin/admin-nav-groups.ts", text: 'href: "/admin/tax", label: "Tax report"' },
  { file: "src/app/admin/tax/page.tsx", text: "Ready to lock and file." },
  { file: "src/app/admin/tax/page.tsx", text: "Out of balance by " },
  { file: "src/app/admin/tax/page.tsx", text: "Period in progress — not for filing." },
  { file: "src/app/admin/tax/page.tsx", text: 'AdminCard title="Lock & filing"' },
  { file: "src/app/admin/tax/lock-panel.tsx", text: "Lock period" },
  { file: "src/app/admin/tax/lock-panel.tsx", text: 'typedWord="LOCK"' },
  { file: "src/app/admin/tax/lock-panel.tsx", text: 'confirmLabel="Lock"' },
  { file: "src/app/admin/tax/export-buttons.tsx", text: 'pdf: "PDF", xlsx: "Excel", csv: "CSV"' },
  { file: "src/app/admin/tax/page.tsx", text: 'AdminCard title="Day by day"' },
  { file: "src/app/admin/tax/page.tsx", text: 'day: "Day"' },
  { file: "src/app/admin/tax/period-jump.tsx", text: '">Go</span>' },
  { file: "src/lib/server/tax-report-doc.ts", text: '{ role: "Prepared by", name:' },
  { file: "src/lib/server/tax-report-doc.ts", text: '{ role: "Reviewed by", name: "" }' },
  { file: "src/lib/server/tax-report-doc.ts", text: '{ role: "Approved by", name: "" }' },
];
const stale = QUOTED.filter((q) => !readFileSync(q.file, "utf8").includes(q.text));
if (stale.length > 0) {
  console.log("⛔ the guide quotes words the screen no longer shows — update the guide:");
  for (const q of stale) console.log(`   · ${q.file}: ${q.text}`);
  process.exit(1);
}

/* ═══ THE PICTURES ═════════════════════════════════════════════════════════════════════════════════════════════ */

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const failures = [];
const shot = (id) => join(SHOTS, `${id}.png`);
const browser = await chromium.launch();

if (!BUILD_ONLY) {
  // Two device pixels per CSS pixel: the pictures stay sharp on paper.
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 860 }, deviceScaleFactor: 2, acceptDownloads: true });
  // The dev badge is not on the live site; the guide's red mark is the only thing added to the real screen.
  await ctx.addInitScript(() => {
    const add = () => {
      if (document.getElementById("kp-guide-css")) return;
      const el = document.createElement("style");
      el.id = "kp-guide-css";
      el.textContent = "nextjs-portal{display:none !important} .kp-guide-mark{outline:3px solid #ff3b30 !important;outline-offset:4px !important;border-radius:10px}";
      (document.head || document.documentElement).appendChild(el);
    };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
    else add();
  });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const seeded = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "FINANCE", phone: "+255700000411", name: "Finance Officer" } });
  if (!seeded.ok()) throw new Error(`seed-admin failed: ${seeded.status()}`);
  const books = await page.request.post(BASE + "/api/dev-test/seed-tax-books", { data: {} });
  if (!books.ok()) throw new Error(`seed-tax-books failed: ${books.status()}`);
  /** The day the books were placed on — the day the daily steps point at. */
  const seededDay = (await books.json()).day;

  /** Outline the elements matched by `selector` (or the glass card around them with `card`). */
  const mark = (selector, card = false) => page.evaluate(([sel, c]) => {
    document.querySelectorAll(".kp-guide-mark").forEach((e) => e.classList.remove("kp-guide-mark"));
    document.querySelectorAll(sel).forEach((e) => {
      if (e.getClientRects().length === 0) return;
      (c ? e.closest(".glass-panel") ?? e : e).classList.add("kp-guide-mark");
    });
  }, [selector, card]);
  /** A picture of a rectangle of the viewport, never wider than the page. */
  const take = async (id, r) => {
    const vp = page.viewportSize();
    const x = Math.max(0, Math.floor(r.x)), y = Math.max(0, Math.floor(r.y));
    const clip = { x, y, width: Math.min(vp.width - x, Math.ceil(r.width)), height: Math.min(vp.height - y, Math.ceil(r.height)) };
    await page.screenshot({ path: shot(id), clip, caret: "initial", animations: "disabled" });
  };
  /** The box of an element (or of its glass card), grown by `pad` on every side. */
  const boxOf = async (selector, pad, card = false) => page.evaluate(([sel, p, c]) => {
    const el = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length > 0);
    if (!el) return null;
    const r = (c ? el.closest(".glass-panel") ?? el : el).getBoundingClientRect();
    return { x: r.x - p, y: r.y - p, width: r.width + p * 2, height: r.height + p * 2 };
  }, [selector, pad, card]);
  const step = async (id, fn) => { try { await fn(); } catch (err) { failures.push(`${id}: ${err?.message ?? err}`); } };

  await page.goto(BASE + "/admin/tax", { waitUntil: "domcontentloaded" });
  await page.getByRole("heading", { name: "Tax report" }).first().waitFor({ timeout: 180_000 });
  await page.locator('[data-testid="tax-window"]').first().waitFor({ timeout: 60_000 });
  await wait(800);

  await step("1-menu", async () => {
    await mark('a[href="/admin/tax"]');
    const link = await boxOf('a[href="/admin/tax"]', 0);
    // The menu alone, from under the staff strip to just below the link: a wider crop cut the page's cards mid-sentence.
    const menu = await page.evaluate(() => {
      const a = [...document.querySelectorAll('a[href="/admin/tax"]')].find((e) => e.getClientRects().length > 0);
      return (a.closest("aside") ?? a.closest("nav")).getBoundingClientRect().right;
    });
    await take("1-menu", { x: 0, y: 30, width: menu + 12, height: link.y + link.height + 70 - 30 });
  });
  await step("2-period", async () => {
    await mark('[data-testid="tax-prev"], [data-testid="tax-next"]');
    // The month list is named by aria-labelledby, so it is found by its label, not by an attribute.
    await page.getByLabel("Jump to month").first().evaluate((el) => el.classList.add("kp-guide-mark"));
    await take("2-period", await boxOf('[data-testid="tax-window"]', 18, true));
  });
  await step("3-status", async () => {
    await mark("nothing-at-all");
    await take("3-status", await boxOf('[data-testid="tax-status"]', 18));
  });
  await step("4-lock", async () => {
    await page.locator('[data-testid="tax-lock"]').first().scrollIntoViewIfNeeded();
    await wait(400);
    await mark('[data-testid="tax-lock"]');
    await take("4-lock", await boxOf('[data-testid="tax-lock"]', 18, true));
  });
  await step("5-confirm", async () => {
    await mark("nothing-at-all");
    await page.locator('[data-testid="tax-lock"]').first().click();
    const dlg = page.locator('[role="alertdialog"], [role="dialog"]').last();
    await dlg.waitFor({ timeout: 30_000 });
    await dlg.locator("input").first().fill("LOCK");
    await wait(400);
    await dlg.getByRole("button", { name: /^Lock$/ }).evaluate((b) => b.classList.add("kp-guide-mark"));
    // The dialog's panel, not the dimmed page behind it.
    const panel = await dlg.evaluate((el) => {
      const fit = (r) => r.width > 260 && r.width < innerWidth * 0.9 && r.height > 120;
      const own = el.getBoundingClientRect();
      if (fit(own)) return { x: own.x, y: own.y, width: own.width, height: own.height };
      for (const k of el.querySelectorAll("*")) { const r = k.getBoundingClientRect(); if (fit(r)) return { x: r.x, y: r.y, width: r.width, height: r.height }; }
      return { x: own.x, y: own.y, width: own.width, height: own.height };
    });
    // Tight to the panel, and the page behind it hidden for this one picture: its rounded corners showed slivers of
    // the dimmed page's text. The dialog lives in a portal on <body>, so everything else can be hidden around it.
    const hide = (on) => page.evaluate((h) => {
      const root = [...document.body.children].find((c) => c.matches('[role="dialog"], [role="alertdialog"]') || c.querySelector('[role="dialog"], [role="alertdialog"]'));
      for (const c of document.body.children) if (c !== root && c.tagName !== "SCRIPT" && c.tagName !== "STYLE") c.style.visibility = h ? "hidden" : "";
    }, on);
    await hide(true);
    await wait(150);
    await take("5-confirm", { x: panel.x - 4, y: panel.y - 4, width: panel.width + 8, height: panel.height + 8 });
    await hide(false);
    await dlg.getByRole("button", { name: /^Lock$/ }).click();
    await page.getByText(/^Locked /).first().waitFor({ timeout: 60_000 });
    await wait(600);
  });
  await step("6-download", async () => {
    for (const b of await page.locator("button[data-toast-dismiss]").all()) await b.click({ timeout: 2000 }).catch(() => {});
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(500);
    await mark('[data-testid^="tax-export-"]');
    const head = await page.evaluate(() => {
      const h = [...document.querySelectorAll("h1")].find((e) => e.textContent?.trim() === "Tax report");
      const btns = [...document.querySelectorAll('[data-testid^="tax-export-"]')].map((e) => e.getBoundingClientRect());
      const hr = h.getBoundingClientRect();
      const right = Math.max(...btns.map((r) => r.right));
      const bottom = Math.max(hr.bottom, ...btns.map((r) => r.bottom));
      const top = Math.min(hr.top, ...btns.map((r) => r.top));
      return { x: hr.left - 24, y: top - 24, width: right - hr.left + 48, height: bottom - top + 48 };
    });
    await take("6-download", head);
    const [dl] = await Promise.all([page.waitForEvent("download", { timeout: 90_000 }), page.locator('[data-testid="tax-export-pdf"]').click()]);
    await dl.saveAs(join(SHOTS, "tax.pdf"));
  });
  await step("7-days", async () => {
    await page.goto(BASE + "/admin/tax", { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="tax-days"]').first().waitFor({ timeout: 60_000 });
    for (const b of await page.locator("button[data-toast-dismiss]").all()) await b.click({ timeout: 2000 }).catch(() => {});
    // The card's title at the top of the screen: its columns and the outlined day fit one picture.
    await page.evaluate(() => { const c = document.querySelector('[data-testid="tax-days-card"]'); window.scrollBy(0, c.getBoundingClientRect().top - 16); });
    await page.mouse.move(0, 0);
    await wait(500);
    await mark(`[data-testid="tax-days"] tr[data-day="${seededDay}"] [data-testid="tax-day-link"]`);
    const card = await boxOf('[data-testid="tax-days-card"]', 0);
    const row = await boxOf(`[data-testid="tax-days"] tr[data-day="${seededDay}"]`, 0);
    // From the card's title to two rows below the day to click.
    const top = card.y - 12;
    await take("7-days", { x: card.x - 12, y: top, width: card.width + 24, height: row.y + row.height * 3 + 12 - top });
  });
  await step("8-day", async () => {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.locator('[data-chip="tax-kind:day"]').first().click();
    await page.waitForURL(/period=day/, { timeout: 60_000 });
    await page.locator('[data-testid="tax-window"]').first().waitFor({ timeout: 60_000 });
    await wait(600);
    // The date typed the way a person types it (click, select, type): the kit's date segments ignore a programmatic fill.
    const [y, m, d] = seededDay.split("-");
    const jump = page.locator('[role="group"][aria-label="Jump to a day"]').first();
    const segs = jump.locator('input[inputmode="numeric"]');
    for (const [i, v] of [[0, d], [1, m], [2, y]]) { await segs.nth(i).click(); await segs.nth(i).press("Control+a"); await segs.nth(i).pressSequentially(v); }
    // The typing focus off the year box: its outline in the picture read as a second thing to press.
    await page.evaluate(() => (document.activeElement instanceof HTMLElement ? document.activeElement.blur() : undefined));
    await page.mouse.move(0, 0);
    await wait(400);
    await mark('[data-chip="tax-kind:day"]');
    await jump.evaluate((el) => el.classList.add("kp-guide-mark"));
    await take("8-day", await boxOf('[data-testid="tax-window"]', 18, true));
  });
  await ctx.close();
}

/* ═══ THE DOCUMENT ════════════════════════════════════════════════════════════════════════════════════════════ */

/** A PNG's width in pixels (its IHDR). */
const pxWidth = (id) => readFileSync(shot(id)).readUInt32BE(16);
const SCREENS = ["1-menu", "2-period", "3-status", "4-lock", "5-confirm", "6-download", "7-days", "8-day"].filter((id) => existsSync(shot(id)));
/** ONE print scale for every screen picture, set by the widest (CSS px = device px / 2), so the screen text is the same
 *  size in every step; 680 CSS px is the A4 text width at the page margins below. */
const SCALE = Math.min(0.62, 680 / Math.max(...SCREENS.map((id) => pxWidth(id) / 2)));
const img = (id) => {
  if (!existsSync(shot(id))) return "";
  const width = SCREENS.includes(id) ? `${Math.round((pxWidth(id) / 2) * SCALE)}px` : "100%";
  return `<img src="data:image/png;base64,${readFileSync(shot(id)).toString("base64")}" style="width:${width}" alt="">`;
};
const STEPS = [
  { title: "Open the report", text: "Sign in at <b>50pick.tz/admin</b>. In the menu on the left, under <b>Money · Pesa</b>, click <b>Tax report</b>.", shots: ["1-menu"] },
  { title: "Choose the month", text: "It opens on last month, with <b>All</b> products. To choose another month, use the arrows or the month list.", shots: ["2-period"] },
  { title: "Check the coloured box", text: "<b>Green — Ready to lock and file:</b> continue. <b>Red — Out of balance:</b> stop and tell the Owner. <b>Period in progress:</b> wait until the month has ended.", shots: ["3-status"] },
  { title: "Lock the month", text: "Scroll down to <b>Lock &amp; filing</b> and click <b>Lock period</b>. Type <b>LOCK</b> and click <b>Lock</b>.", shots: ["4-lock", "5-confirm"] },
  { title: "Download", text: "At the top right, click <b>PDF</b> for the copy to sign. Click <b>Excel</b> or <b>CSV</b> when a spreadsheet is asked for.", shots: ["6-download"] },
  { title: "Sign the PDF", text: "On the last page, sign under <b>Prepared by</b>. Your reviewer and approver sign under <b>Reviewed by</b> and <b>Approved by</b>.", shots: ["tax-sign"] },
  { title: "See each day", text: "Scroll down to <b>Day by day</b>: one line for every day of the month — Sales, Payout, On hold, Refunds and Total tax. Click a day to open that day's report.", shots: ["7-days"] },
  { title: "Download a day", text: "With the day open, click <b>PDF</b>, <b>Excel</b> or <b>CSV</b> at the top right, as in step 5. To open any day directly, click <b>Day</b> at the top, type the date and click <b>Go</b>.", shots: ["8-day"] },
];
const body = STEPS.map((s, i) => `
  <section class="step">
    <h2><span class="n">${i + 1}</span>${s.title}</h2>
    <p>${s.text}</p>
    ${(s.shots ?? []).map((id) => (existsSync(shot(id)) ? `<figure>${img(id)}</figure>` : "")).join("")}
  </section>`).join("");
const html = `<!doctype html><html><head><meta charset="utf-8"><title>How to download the Government Tax Report</title><style>
  @page { size: A4; margin: 16mm 15mm; }
  body { font-family: "Segoe UI", Arial, sans-serif; color: #1c1f26; font-size: 11pt; line-height: 1.45; margin: 0; }
  h1 { font-size: 21pt; margin: 0 0 7mm; padding-bottom: 3mm; border-bottom: 2px solid #c9a227; }
  h2 { font-size: 13.5pt; margin: 0 0 1.5mm; } h2 .n { display: inline-block; min-width: 8mm; color: #c9a227; }
  .step { page-break-inside: avoid; margin: 0 0 8mm; } .step p { margin: 0 0 2.5mm; }
  figure { margin: 2mm 0 0; text-align: center; }
  figure img { max-width: 100%; border: 1px solid #d1d5db; border-radius: 2mm; }
  figure + figure { margin-top: 3mm; }
</style></head><body><h1>How to download the Government Tax Report</h1>${body}</body></html>`;
writeFileSync(join(SHOTS, "guide.html"), html);
const pdfPage = await (await browser.newContext()).newPage();
await pdfPage.setContent(html, { waitUntil: "load" });
await pdfPage.pdf({ path: PDF, format: "A4", printBackground: true, margin: { top: "16mm", bottom: "16mm", left: "15mm", right: "15mm" } });
await browser.close();

const missing = STEPS.flatMap((s) => s.shots ?? []).filter((id) => !existsSync(shot(id)));
console.log(`tax-report-guide: ${PDF}`);
if (failures.length) { console.log("⛔ captures that failed:"); for (const f of failures) console.log(`   · ${f}`); }
if (missing.length) console.log(`pictures not in the guide: ${missing.join(", ")}`);
process.exit(failures.length > 0 ? 1 : 0);
