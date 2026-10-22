// Scratch drive (PLATFORM r2, item 5 · perceived performance): what loading pictures does a reader meet on a client move
// from the Millionea hub to How to play (and How to the register)? BASE=… node ghost-seq.mjs <outDir> [label]
// Per animation frame after the tap: the address, and what the main column shows — the page itself (its test id), a
// Millionea ghost (`aria-busy`, with a signature of its first child), the brand spinner bare (the journey's AnyPageGhost)
// or framed (the classic SectionLoader), or nothing. Consecutive equal frames are folded into one step with its duration.
// Two passes: the first visit (a dev server compiles the page: a long wait) and a second, warm one.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const { chromium } = createRequire("C:/50pick-ssd/kipindi-mln-fplt/package.json")("playwright");
const BASE = process.env.BASE || "http://localhost:3500";
const OUT = process.argv[2]; const LABEL = process.argv[3] || "run";
mkdirSync(OUT, { recursive: true });
const RECORDER = () => {
  window.__kpSeq = [];
  window.__kpRec = (ms) => {
    window.__kpSeq = [];
    const until = performance.now() + ms;
    const vis = (el) => { if (!el) return false; const r = el.getBoundingClientRect(); const c = getComputedStyle(el); return r.width > 0 && r.height > 0 && c.visibility !== "hidden" && Number(c.opacity) > 0; };
    const step = () => {
      let s = "nothing";
      const page = ["millionea-how", "millionea-register", "millionea-hub"].find((id) => vis(document.querySelector(`[data-testid="${id}"]`)));
      const ghost = [...document.querySelectorAll('[aria-busy="true"]')].find(vis);
      const spin = [...document.querySelectorAll('[role="status"][aria-label="Loading"]')].find(vis);
      if (page) s = `page:${page.replace("millionea-", "")}`;
      else if (ghost) {
        // Each Millionea ghost by a part only it draws: How's numbered steps, the hub's week chip, the register's text block,
        // the slip ghost's own test id; anything else by its size.
        const kind = ghost.querySelector('[class*="grid-cols-[24px_1fr]"]') ? "how"
          : ghost.querySelector('[class*="h-[23px]"][class*="w-[72px]"]') ? "hub"
          : ghost.querySelector('[class*="max-w-[68ch]"][class*="gap-2"]') ? "register"
          : ghost.closest('[data-testid="slip-ghost"]') || ghost.matches('[data-testid="slip-ghost"]') ? "slip"
          : `other(${ghost.querySelectorAll("*").length} nodes)`;
        s = `ghost:${kind}`;
      }
      else if (spin) s = spin.closest(".bg-bg-elevated.border") ? "spinner:framed (classic SectionLoader)" : "spinner:bare (journey AnyPageGhost)";
      window.__kpSeq.push({ t: Math.round(performance.now()), path: location.pathname, s });
      if (performance.now() < until) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
};
const fold = (seq) => {
  const out = [];
  for (const f of seq) { const last = out.at(-1); if (last && last.s === f.s && last.path === f.path) { last.until = f.t; last.frames++; } else out.push({ path: f.path, s: f.s, from: f.t, until: f.t, frames: 1 }); }
  const t0 = seq[0]?.t ?? 0;
  return out.map((x) => `${x.path} ${x.s} [+${x.from - t0}…+${x.until - t0}ms, ${x.frames} fr]`);
};
const browser = await chromium.launch();
const rows = [];
try {
  for (const pass of ["first", "warm"]) {
    const ctx = await browser.newContext({ viewport: { width: 360, height: 780 } });
    await ctx.addCookies([{ name: "kp-locale", value: "sw", url: BASE }]);
    await ctx.addInitScript(RECORDER);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/millionea`, { waitUntil: "domcontentloaded", timeout: 180_000 });
    await page.waitForSelector('[data-testid="millionea-hub"]', { timeout: 180_000 });
    await page.waitForTimeout(1500);
    const shell = await page.evaluate(() => (document.querySelector('[data-testid="journey-tabs"]') ? "journey" : "classic"));
    for (const [from, sel, to] of [["/millionea", 'a[href="/millionea/how"]', "/millionea/how"], ["/millionea/how", 'a[href="/millionea/register"]', "/millionea/register"], ["/millionea", 'a[href="/millionea/slip"]', "/millionea/slip"]]) {
      if (new URL(page.url()).pathname !== from) { await page.goto(`${BASE}${from}`, { waitUntil: "domcontentloaded", timeout: 180_000 }); await page.waitForTimeout(1500); }
      const link = page.locator(sel).first();
      if (!(await link.count())) { rows.push({ pass, shell, move: `${from} → ${to}`, note: `no link ${sel}` }); console.log(`${LABEL} ${pass} ${shell} ${from} → ${to}: no link ${sel}`); continue; }
      await page.evaluate(() => window.__kpRec(12000));
      await link.evaluate((a) => a.click());
      await page.waitForURL((u) => u.pathname === to, { timeout: 180_000 }).catch(() => {});
      await page.waitForTimeout(12500);
      const seq = fold(await page.evaluate(() => window.__kpSeq));
      rows.push({ pass, shell, move: `${from} → ${to}`, seq });
      console.log(`${LABEL} ${pass} ${shell} ${from} → ${to}:\n    ${seq.join("\n    ")}`);
    }
    await ctx.close();
  }
} finally {
  await browser.close();
}
writeFileSync(join(OUT, `ghost-seq-${LABEL}.json`), JSON.stringify(rows, null, 1));
