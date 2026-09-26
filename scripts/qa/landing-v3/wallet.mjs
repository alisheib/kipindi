// Landing v3 · WP14 — drive the Wallet for real: sign in (demo, funded and zero), open the chip,
// measure the sheet/panel, the Deposit/Withdraw parity, focus trap, Esc and focus return; screenshot.
//   BASE=http://localhost:3057 OUT=.qa-shots/landing-v3/w1/wallet node scripts/qa/landing-v3/wallet.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3057";
const OUT = process.env.OUT || ".qa-shots/landing-v3/wallet";
mkdirSync(OUT, { recursive: true });
const H = { 360: 780, 768: 1024, 1024: 900, 1280: 860 };
const CELLS = [];
for (const w of [360, 768, 1280]) for (const loc of ["sw", "en", "zh"]) CELLS.push({ auth: 1, w, loc });
for (const w of [320, 360, 1024, 1280]) for (const loc of ["sw", "en"]) CELLS.push({ auth: 0, w, loc });

const browser = await chromium.launch({ headless: true });
const report = [];
let bad = 0;
for (const c of CELLS) {
  const id = `wallet-${c.auth ? "funded" : "zero"}-${c.w}-${c.loc}`;
  const ctx = await browser.newContext({ viewport: { width: c.w, height: H[c.w] ?? 780 }, deviceScaleFactor: 1, hasTouch: c.w < 1024, isMobile: c.w < 640 });
  if (c.loc !== "sw") await ctx.addCookies([{ name: "kp-locale", value: c.loc, domain: new URL(BASE).hostname, path: "/" }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const r = { id, findings: [] };
  const fail = (what) => { r.findings.push(what); bad++; };
  try {
    await page.goto(`${BASE}/auth/demo?deposit=${c.auth}`, { waitUntil: "load", timeout: 90000 });
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(2500);
    const decline = page.getByTestId("consent-decline");
    if (await decline.count()) await decline.first().click({ timeout: 5000 }).catch(() => {});
    await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay]{display:none!important}" }).catch(() => {});
    const head = await page.evaluate(() => {
      const bar = document.querySelector("header");
      const vis = (el) => { const s = getComputedStyle(el); const b = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && b.width > 0 && b.height > 0; };
      const chip = document.querySelector('[data-testid="wallet-balance-pill"]');
      const dep = [...document.querySelectorAll('header a[href="/wallet/deposit"]')].find(vis);
      const ctrls = [...(bar?.querySelectorAll("a,button") ?? [])].filter(vis).map((e) => e.getBoundingClientRect());
      return {
        overflowX: document.documentElement.scrollWidth - innerWidth,
        rightmost: Math.round(Math.max(0, ...ctrls.map((b) => b.right))),
        chip: chip && vis(chip) ? { text: chip.innerText.replace(/\s+/g, " ").trim(), aria: chip.getAttribute("aria-label"), expanded: chip.getAttribute("aria-expanded") } : null,
        deposit: dep ? { text: dep.innerText.replace(/\s+/g, " ").trim(), w: Math.round(dep.getBoundingClientRect().width), h: Math.round(dep.getBoundingClientRect().height) } : null,
        tzsZero: /TZS\s*0(?![\d,.])/.test(bar?.innerText ?? ""),
        capsuleW: (() => { const c = document.querySelector('[data-testid="wallet-balance-capsule"]'); return c && vis(c) ? Math.round(c.getBoundingClientRect().width) : null; })(),
        clusterW: (() => { const c = document.querySelector('[data-testid="wallet-balance-capsule"]')?.parentElement ?? dep?.closest("div"); return c ? Math.round(c.getBoundingClientRect().width) : null; })(),
        leftmostCtl: Math.round(Math.min(...ctrls.filter((b) => b.left > 40).map((b) => b.left))),
      };
    });
    r.head = head;
    if (head.overflowX > 0) fail(`page scrolls sideways by ${head.overflowX}px`);
    if (head.rightmost > c.w - 8) fail(`a header control ends at ${head.rightmost}px, past the bar's edge`);
    await page.screenshot({ path: join(OUT, `${id}-header.png`), clip: { x: 0, y: 0, width: c.w, height: 140 } });
    if (!c.auth) {
      if (head.chip) fail("zero balance still shows the capsule");
      if (head.tzsZero) fail('the header prints "TZS 0"');
      if (!head.deposit) fail("zero balance: no visible Deposit in the header");
      else if (!head.deposit.text) fail("zero balance: Deposit has no visible label");
    } else {
      if (!head.chip) { fail("funded: no balance chip"); throw new Error("no chip"); }
      if (c.w < 640 && /TZS/.test(head.chip.text)) fail(`phone chip still shows the currency word: "${head.chip.text}"`);
      if (head.chip.expanded !== "false") fail(`chip aria-expanded is ${head.chip.expanded} before opening`);
      await page.click('[data-testid="wallet-balance-pill"]');
      await page.waitForSelector('[data-testid="wallet-sheet"]', { timeout: 5000 });
      await page.waitForTimeout(700); // the entrance settles
      const open = await page.evaluate((w) => {
        const dlg = document.querySelector('[data-testid="wallet-sheet"]').closest('[role="dialog"]');
        const panel = document.querySelector('[data-testid="wallet-sheet"]').closest('[data-rung="modal"]');
        const cap = document.querySelector('[data-testid="wallet-balance-capsule"]');
        const b = (el) => { const x = el.getBoundingClientRect(); return { l: x.left, t: x.top, r: x.right, b: x.bottom, w: x.width, h: x.height }; };
        const dep = document.querySelector('[data-testid="wallet-sheet-deposit"]');
        const wd = document.querySelector('[data-testid="wallet-sheet-withdraw"]');
        return {
          modal: dlg?.getAttribute("aria-modal"), name: dlg?.getAttribute("aria-label"),
          panel: b(panel), capsule: b(cap), vh: innerHeight, vw: innerWidth,
          dep: dep ? b(dep) : null, wd: wd ? b(wd) : null,
          focusInside: !!(document.activeElement && panel.contains(document.activeElement)),
          expanded: document.querySelector('[data-testid="wallet-balance-pill"]').getAttribute("aria-expanded"),
          text: panel.innerText.replace(/\s+/g, " ").trim().slice(0, 240),
        };
      }, c.w);
      r.open = open;
      await page.screenshot({ path: join(OUT, `${id}-open.png`) });
      if (open.modal !== "true") fail("the Wallet is not aria-modal");
      if (!open.name) fail("the Wallet dialog has no accessible name");
      if (open.expanded !== "true") fail("chip aria-expanded did not become true");
      if (!open.focusInside) fail("focus did not move into the Wallet");
      if (open.panel.r > open.vw + 0.5 || open.panel.l < -0.5) fail(`the Wallet overflows the viewport (${Math.round(open.panel.l)}..${Math.round(open.panel.r)})`);
      if (c.w < 1024) {
        if (Math.abs(open.panel.b - open.vh) > 1) fail(`below 1024 the Wallet is not docked to the bottom (bottom ${Math.round(open.panel.b)} of ${open.vh})`);
      } else {
        if (open.panel.t < open.capsule.b) fail(`the panel (top ${Math.round(open.panel.t)}) is not under the chip (bottom ${Math.round(open.capsule.b)})`);
        if (Math.abs(open.panel.r - open.capsule.r) > 1) fail(`the panel's right edge ${Math.round(open.panel.r)} is not aligned with the chip's ${Math.round(open.capsule.r)}`);
      }
      if (!open.dep || !open.wd) fail("Deposit or Withdraw missing from the Wallet");
      else {
        if (Math.abs(open.dep.w - open.wd.w) > 0.5 || Math.abs(open.dep.h - open.wd.h) > 0.5) fail(`V19 parity: Deposit ${open.dep.w}x${open.dep.h} vs Withdraw ${open.wd.w}x${open.wd.h}`);
        if (Math.abs(open.dep.t - open.wd.t) > 0.5) fail("Deposit and Withdraw are not side by side");
        const want = c.w < 1024 ? 56 : 48;
        if (Math.round(open.dep.h) !== want) fail(`the pair is ${Math.round(open.dep.h)}px tall, want ${want}`);
      }
      // focus trap: 12 Tabs never leave the panel
      let leaked = false;
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press("Tab");
        const inside = await page.evaluate(() => { const p = document.querySelector('[data-rung="modal"]'); return !!(p && document.activeElement && p.contains(document.activeElement)); });
        if (!inside) { leaked = true; break; }
      }
      if (leaked) fail("Tab left the Wallet (focus trap)");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
      const after = await page.evaluate(() => ({
        gone: !document.querySelector('[data-testid="wallet-sheet"]'),
        expanded: document.querySelector('[data-testid="wallet-balance-pill"]')?.getAttribute("aria-expanded"),
        focusOnChip: document.activeElement === document.querySelector('[data-testid="wallet-balance-pill"]'),
      }));
      r.after = after;
      if (!after.gone) fail("Esc did not close the Wallet");
      if (after.expanded !== "false") fail("chip aria-expanded did not return to false");
      if (!after.focusOnChip) fail("focus did not return to the chip");
      // the scrim / outside click closes it too
      await page.click('[data-testid="wallet-balance-pill"]');
      await page.waitForSelector('[data-testid="wallet-sheet"]', { timeout: 5000 });
      await page.waitForTimeout(500);
      await page.mouse.click(8, Math.round((H[c.w] ?? 780) * 0.3));
      await page.waitForTimeout(500);
      if (await page.$('[data-testid="wallet-sheet"]')) fail("a click outside did not close the Wallet");
    }
  } catch (e) {
    if (!r.findings.length) fail("drive error: " + String(e).slice(0, 160));
  }
  if (errors.length) { r.pageErrors = errors; fail("page error: " + errors[0]); }
  report.push(r);
  console.log(`${r.findings.length ? "FAIL" : "ok  "} ${id}${r.findings.length ? " — " + r.findings.join(" | ") : ""}${r.head?.chip ? `  chip="${r.head.chip.text}"` : ""}${r.head?.deposit ? `  deposit="${r.head.deposit.text}" ${r.head.deposit.w}px` : ""}${r.head ? `  capsule=${r.head.capsuleW} cluster=${r.head.clusterW}` : ""}`);
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, "wallet-report.json"), JSON.stringify(report, null, 2));
console.log(bad ? `WALLET: ${bad} finding(s)` : "WALLET: all cells clean");
process.exit(bad ? 1 : 0);
