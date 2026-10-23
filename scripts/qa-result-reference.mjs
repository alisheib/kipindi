/**
 * qa:result-reference — A REAL DEPOSIT'S REFERENCE NEVER LEAVES ONE CHARACTER ALONE (MASWALI-BUILD FLOW 4, the lead's
 * ruling of 2026-10-23; DESIGN_AUTHORITY §M4a rule 5; the rule: `src/lib/even-break.ts`, drawn by `OperationResultModal`).
 *
 *   BASE=http://localhost:<port> node scripts/qa-result-reference.mjs
 *
 * ⚠️ PREMISE — a local in-memory `next dev` (the mock payment rail confirms a deposit at once; any Millionea rollout). The
 *    demo player, a classic reader, deposits TZS 1,000 through the form at 320 and 360 in Swahili, English and Chinese and
 *    lands on the wallet's result. Its reference row is measured character by character (each character's line, by its
 *    box): at most two lines, never a line of one character, two lines within one character of each other, the text the
 *    exact transaction id, nothing wider than its box. ⭐ THE IN-PAGE CONTROL: beside it, the old drawing (`break-all`, the
 *    token whole) is rebuilt with a token one character longer than a line holds, and the same measure must find the lone
 *    character — a measure that cannot see the defect proves nothing. Tiles in `.50pick-shots/result-reference/`.
 * ⛔ Local only (`premise`); it moves money only through the product's own deposit, on the local mock rail.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { localBase, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3740";
const OUT = ".50pick-shots/result-reference";
if (!localBase(BASE)) { console.error(`PREMISE ABSENT — local dev only, http://localhost:PORT — got ${BASE}`); process.exit(2); }
const health = await fetch(`${BASE}/api/health`).then((r) => r.json()).catch(() => null);
if (!health || health.database?.configured !== false) { console.error("PREMISE ABSENT — an in-memory dev server must answer /api/health"); process.exit(2); }
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const browser = await chromium.launch();
const errors = [];

/** Characters per line of an element's text, by each character's own box (a line is a top within 2px). */
const lineLengths = (handle) => handle.evaluate((el) => {
  const tops = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    for (let i = 0; i < n.data.length; i++) {
      const r = document.createRange();
      r.setStart(n, i); r.setEnd(n, i + 1);
      const box = r.getClientRects()[0];
      if (box) tops.push(Math.round(box.top));
    }
  }
  const lines = [];
  for (const t of tops) {
    const line = lines.find((l) => Math.abs(l.top - t) <= 2);
    if (line) line.n++; else lines.push({ top: t, n: 1 });
  }
  return lines.sort((a, b) => a.top - b.top).map((l) => l.n);
});

for (const locale of ["sw", "en", "zh"]) {
  for (const width of [320, 360]) {
    const label = `${locale} · ${width}`;
    const session = await demoSession(browser, BASE, { query: "?deposit=0" });
    const ctx = await browser.newContext({ viewport: { width, height: 780 } });
    await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
    const page = await ctx.newPage();
    page.on("pageerror", (e) => errors.push(`${label}: ${String(e).slice(0, 200)}`));
    try {
      await page.goto(`${BASE}/wallet/deposit?amount=1000`, { waitUntil: "load", timeout: 180_000 });
      await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
      await page.waitForFunction(() => { const el = document.querySelector('input[name="provider"]'); return !!el && Object.keys(el).some((k) => k.startsWith("__react")); }, null, { timeout: 180_000 });
      await page.locator('label:has(input[name="provider"]:not([disabled]))').first().click();
      const trigger = page.locator("form button.btn-primary.btn-lg").last();
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click();
      const confirm = page.locator('[role="dialog"], [role="alertdialog"]').last();
      await confirm.waitFor({ timeout: 30_000 });
      await confirm.getByRole("button").filter({ hasNot: page.locator("svg") }).first().click();
      await page.waitForURL(/\/wallet\?deposited=/, { timeout: 120_000 });
      const id = new URL(page.url()).searchParams.get("deposited");
      const dialog = page.locator('[role="dialog"]').last();
      await dialog.waitFor({ timeout: 30_000 });
      await dialog.hover().catch(() => {}); // the success result pauses while it is read (§F, WCAG 2.2.1)
      ok(`${label} · <html lang> is ${locale}`, (await page.locator("html").getAttribute("lang")) === locale);
      const ref = dialog.locator("[data-detail-value]").filter({ hasText: id ?? "—" });
      await ref.waitFor({ timeout: 10_000 });
      const h = await ref.elementHandle();
      const lens = await lineLengths(h);
      const box = await h.evaluate((el) => ({ text: el.textContent, sw: el.scrollWidth, cw: el.clientWidth }));
      ok(`${label} · ⭐ the reference is the exact transaction id`, box.text === id, `${box.text} vs ${id}`);
      ok(`${label} · ⭐ no line of the reference holds one character alone — at most two lines, within one character of each other`,
        lens.length >= 1 && lens.length <= 2 && Math.min(...lens) >= 2 && (lens.length === 1 || Math.abs(lens[0] - lens[1]) <= 1), JSON.stringify(lens));
      ok(`${label} · nothing of it is wider than its box`, box.sw <= box.cw + 1, `${box.sw} > ${box.cw}`);
      await page.screenshot({ path: `${OUT}/${locale}-${width}.png` });
      // ⭐ THE IN-PAGE CONTROL: the old drawing (break-all, the token whole), a token one character longer than a line holds.
      const control = await h.evaluate((el) => {
        const probe = el.cloneNode(false);
        probe.className = el.className.replace(/\[word-break:normal\]|\[overflow-wrap:break-word\]/g, "") + " break-all";
        probe.removeAttribute("data-detail-value");
        probe.style.width = `${el.getBoundingClientRect().width}px`;
        probe.textContent = "x".repeat(200);
        el.parentElement.appendChild(probe);
        const r = document.createRange();
        const text = probe.firstChild;
        let perLine = 0; const top0 = (() => { r.setStart(text, 0); r.setEnd(text, 1); return Math.round(r.getClientRects()[0].top); })();
        for (let i = 0; i < 200; i++) { r.setStart(text, i); r.setEnd(text, i + 1); if (Math.abs(Math.round(r.getClientRects()[0].top) - top0) > 2) break; perLine++; }
        probe.textContent = "x".repeat(perLine + 1);
        probe.setAttribute("data-control", "");
        return perLine;
      });
      const probe = dialog.locator("[data-control]");
      const old = await lineLengths(await probe.elementHandle());
      await probe.evaluate((el) => el.remove());
      ok(`${label} · control · the old wrap of a token ${control + 1} characters long is caught — its last line holds one character`,
        old.length === 2 && old[1] === 1, JSON.stringify(old));
    } catch (e) {
      fail++;
      console.log(`FAIL ${label} · the drive stopped — ${String(e?.message ?? e).slice(0, 300)}`);
      await page.screenshot({ path: `${OUT}/${locale}-${width}-stopped.png` }).catch(() => {});
    } finally {
      await ctx.close();
    }
  }
}
await browser.close();
ok("no page error", errors.length === 0, errors.slice(0, 5).join(" | "));
console.log(`\nresult-reference: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
