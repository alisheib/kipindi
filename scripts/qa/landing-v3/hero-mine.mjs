// Landing v3 · WP14 part 2 — drive the SIGNED-IN hero locally: a funded player holding a real
// portfolio (every position status, seeded through the real service) and a zero-balance player with
// no picks. Measures the stats, the Deposit/Withdraw parity, the empty prompt, Set limits; screenshots.
//   BASE=http://localhost:3057 OUT=.qa-shots/landing-v3/w2/hero node scripts/qa/landing-v3/hero-mine.mjs
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3057";
const OUT = process.env.OUT || ".qa-shots/landing-v3/hero";
mkdirSync(OUT, { recursive: true });
const H = { 320: 640, 360: 780, 768: 1024, 1280: 860 };
// ⚠️ ORDER MATTERS: every cell is the SAME demo player. The zero cells run first, on a fresh store,
// while that player holds no picks; the first funded cell then seeds the portfolio.
const CELLS = [];
for (const w of [320, 360, 1280]) for (const loc of ["sw", "en"]) CELLS.push({ kind: "zero", w, loc });
for (const w of [360, 768, 1280]) for (const loc of ["sw", "en", "zh"]) CELLS.push({ kind: "funded", w, loc });

const b = await chromium.launch({ headless: true });
let bad = 0;
const report = [];
let seeded = false;
for (const c of CELLS) {
  const id = `hero-${c.kind}-${c.w}-${c.loc}`;
  const ctx = await b.newContext({ viewport: { width: c.w, height: H[c.w] ?? 800 }, deviceScaleFactor: 1, isMobile: c.w < 640, hasTouch: c.w < 1024 });
  if (c.loc !== "sw") await ctx.addCookies([{ name: "kp-locale", value: c.loc, domain: new URL(BASE).hostname, path: "/" }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  const f = [];
  try {
    // ⚠️ The zero cell signs in with deposit=0, which RESETS the demo wallet to zero; the funded cells
    // re-fund it with deposit=1. The portfolio is seeded once, on the first funded cell.
    await page.goto(`${BASE}/auth/demo?deposit=${c.kind === "funded" ? 1 : 0}`, { waitUntil: "load", timeout: 90000 });
    if (c.kind === "funded" && !seeded) {
      const r = await page.request.post(`${BASE}/api/dev-test/seed-player-portfolio`, { timeout: 120000 });
      seeded = r.ok();
      if (!seeded) f.push(`portfolio seed HTTP ${r.status()}`);
    }
    await page.goto(`${BASE}/`, { waitUntil: "load", timeout: 90000 });
    await page.waitForTimeout(2500);
    const decline = page.getByTestId("consent-decline");
    if (await decline.count()) await decline.first().click({ timeout: 5000 }).catch(() => {});
    await page.addStyleTag({ content: "nextjs-portal,[data-nextjs-toast],[data-nextjs-dialog-overlay]{display:none!important}" }).catch(() => {});
    const mine = page.getByTestId("landing-mine");
    if (!(await mine.count())) throw new Error("no [data-testid=landing-mine] — the signed-in hero did not render");
    await mine.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    const m = await page.evaluate(() => {
      const root = document.querySelector('[data-testid="landing-mine"]');
      const vis = (el) => { if (!el) return false; const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0; };
      const box = (el) => { const r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height }; };
      const dep = root.querySelector('[data-testid="hero-deposit"]');
      const wd = root.querySelector('[data-testid="hero-withdraw"]');
      const stats = [...root.querySelectorAll(".kp-mine__stat")].filter(vis).map((s) => s.innerText.replace(/\s+/g, " ").trim());
      const overflow = [...root.querySelectorAll("*")].filter(vis).some((el) => el.getBoundingClientRect().right > innerWidth + 0.5);
      return {
        stats, lead: [...root.querySelectorAll(".kp-mine__lead")].filter(vis).map((p) => p.innerText.trim()),
        dep: vis(dep) ? box(dep) : null, wd: vis(wd) ? box(wd) : null,
        limits: vis(root.querySelector('a[href="/profile/responsible-gambling"]')),
        trustAbove: (() => { const tl = document.querySelector(".kp-hero__trust"); return !!tl && tl.getBoundingClientRect().top < root.getBoundingClientRect().top; })(),
        tzsZeroBalance: /Available|Inapatikana|可用余额/.test(root.innerText) && /TZS\s*0(?![\d,.])/.test(root.querySelector(".kp-mine__amt")?.innerText ?? ""),
        overflow, pageOverflowX: document.documentElement.scrollWidth - innerWidth,
      };
    });
    await page.screenshot({ path: join(OUT, `${id}.png`) });
    if (m.pageOverflowX > 0) f.push(`page scrolls sideways ${m.pageOverflowX}px`);
    if (m.overflow) f.push("something in the signed-in hero passes the right edge");
    if (!m.limits) f.push("no Set limits");
    if (!m.trustAbove) f.push("the trust lines are not above the player's block");
    if (c.kind === "funded") {
      if (m.stats.length !== 3) f.push(`want 3 stats, got ${m.stats.length}: ${m.stats.join(" | ")}`);
      if (!m.dep || !m.wd) f.push("the Deposit/Withdraw pair is missing");
      else {
        if (Math.abs(m.dep.w - m.wd.w) > 0.5 || Math.abs(m.dep.h - m.wd.h) > 0.5) f.push(`V19 parity: ${m.dep.w}x${m.dep.h} vs ${m.wd.w}x${m.wd.h}`);
        if (Math.abs(m.dep.t - m.wd.t) > 0.5) f.push("Deposit and Withdraw are not side by side");
      }
    } else {
      if (m.stats.length) f.push(`a player with no picks sees ${m.stats.length} stats (want one sentence)`);
      if (m.lead.length !== 1) f.push(`want the empty-balance line alone (the no-picks line yields to it), got ${m.lead.length}`);
      if (!m.dep) f.push("zero balance: no Deposit in the hero");
      if (m.wd) f.push("zero balance: Withdraw is offered");
      if (m.tzsZeroBalance) f.push('the hero prints a "TZS 0" balance');
    }
    if (errors.length) f.push("page error: " + errors[0]);
    report.push({ id, ...m, findings: f });
    console.log(`${f.length ? "FAIL" : "ok  "} ${id}  stats=[${m.stats.join(" | ")}]${m.lead.length ? `  lead=${m.lead.length}` : ""}${f.length ? " — " + f.join(" | ") : ""}`);
  } catch (e) {
    f.push("drive error: " + String(e).slice(0, 160));
    console.log(`FAIL ${id} — ${f.join(" | ")}`);
  }
  bad += f.length;
  await ctx.close();
}
await b.close();
writeFileSync(join(OUT, "hero-report.json"), JSON.stringify(report, null, 2));
console.log(bad ? `HERO: ${bad} finding(s)` : "HERO: all cells clean");
process.exit(bad ? 1 : 0);
