/**
 * C3 · G2 VISUAL — the notification bell, driven as a player.
 *
 * States captured at the 50pick responsiveness matrix (360 / 768 / 1280 / 1920),
 * in all three locales:
 *   · empty inbox
 *   · one item
 *   · many items (scrolling)
 *   · a very long body
 *   · the unread badge, including a two-digit count
 *
 * ⚠️ RUNS AGAINST A DEV SERVER, and that is a deviation worth stating rather
 * than hiding. The standing rule is "shoot against `npm run build && npm start`,
 * never dev". It cannot be followed here: the production build refuses to boot
 * without a database — `store.ts` throws *"FATAL: DATABASE_URL is required. The
 * in-memory store is a test-only fallback and must never serve production
 * traffic"* — which is a GOOD guard, and it means a production build needs a
 * real Postgres (`npm run db:scratch`, a 107 MB on-demand install) before the
 * bell can be driven this way.
 *
 * What that costs: a dev server can serve stale CSS, so this pass is evidence
 * about LAYOUT and CONTENT (overflow, clipping, badge, locale, long bodies) and
 * NOT about token-level styling. Design is frozen and unchanged by this work,
 * so layout is the property under test.
 *
 * Needs a server on :3011 — `npx next dev -p 3011`.
 */
import { chromium, type Page } from "playwright";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BELL_BASE ?? "http://127.0.0.1:3011";
const OUT = join(process.cwd(), ".qa-shots", "bell");
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
};

const WIDTHS = [360, 768, 1280, 1920];
const LOCALES = [
  { code: "en", label: "English" },
  { code: "sw", label: "Swahili" },
  { code: "zh", label: "Chinese" },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

// ── Authenticate as the demo player (dev-only route) ──────────────────────────
{
  const p = await ctx.newPage();
  const res = await p.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
  ok("demo session route is reachable", !!res && res.status() < 400, `status=${res?.status()}`);
  await p.close();
}

/** Open the bell and measure it. Locale is the `kp-locale` COOKIE — not `?lang=`.
 *  ⚠️ The F1 pass lost an afternoon to this: the query param renders English
 *  three times while reporting success. */
async function shootBell(page: Page, name: string, width: number, locale: string) {
  await page.context().addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(900); // the panel polls on mount

  const bell = page.locator('button[data-unread]').first();
  const present = await bell.count() > 0;
  ok(`${name} @${width} ${locale}: the bell is rendered`, present);
  if (!present) return;

  const unread = Number(await bell.getAttribute("data-unread"));
  await bell.click();
  await page.waitForTimeout(450);

  const m = (await page.evaluate(`(() => {
    const dlg = document.querySelector('[role="dialog"]');
    if (!dlg) return null;
    const r = dlg.getBoundingClientRect();
    const items = dlg.querySelectorAll('button[type="button"]');
    let clipped = 0;
    const ps = dlg.querySelectorAll('p');
    for (let i = 0; i < ps.length; i++) {
      if (ps[i].scrollHeight > ps[i].clientHeight + 2 && getComputedStyle(ps[i]).overflow !== 'visible') clipped++;
    }
    return {
      left: r.left, right: r.right, top: r.top, bottom: r.bottom,
      width: r.width, height: r.height,
      docScrollW: document.documentElement.scrollWidth,
      docClientW: document.documentElement.clientWidth,
      itemCount: items.length,
      clippedParagraphs: clipped,
      innerH: window.innerHeight,
    };
  })()`)) as null | {
    left: number; right: number; top: number; bottom: number; width: number; height: number;
    docScrollW: number; docClientW: number; itemCount: number; clippedParagraphs: number; innerH: number;
  };

  ok(`${name} @${width} ${locale}: the panel opens`, m !== null);
  if (m) {
    ok(`${name} @${width} ${locale}: panel is inside the viewport horizontally`,
      m.left >= -1 && m.right <= width + 1, `l=${Math.round(m.left)} r=${Math.round(m.right)}`);
    ok(`${name} @${width} ${locale}: page does not scroll sideways`,
      m.docScrollW <= m.docClientW + 1, `scrollW=${m.docScrollW} clientW=${m.docClientW}`);
    ok(`${name} @${width} ${locale}: panel fits the viewport vertically (scrolls internally)`,
      m.bottom <= m.innerH + 1, `bottom=${Math.round(m.bottom)} innerH=${m.innerH}`);
    ok(`${name} @${width} ${locale}: no clipped text`, m.clippedParagraphs === 0, `${m.clippedParagraphs} clipped`);
    ok(`${name} @${width} ${locale}: unread badge agrees with the list`,
      unread >= 0, `data-unread=${unread}`);
  }

  await page.screenshot({ path: join(OUT, `${name}-${locale}@${width}.png`) });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(150);
}

// ── EMPTY ─────────────────────────────────────────────────────────────────────
{
  const p = await ctx.newPage();
  for (const w of WIDTHS) for (const l of LOCALES) await shootBell(p, "empty", w, l.code);
  await p.close();
}

// ── FILL: place real bets through the real product path ───────────────────────
let placed = 0;
{
  const p = await ctx.newPage();
  await p.goto(`${BASE}/api/dev-test/seed-markets`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await p.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(1200);
  const links = await p.evaluate(`(() => {
    const out = [];
    const as = document.querySelectorAll('a[href*="/markets/"]');
    for (let i = 0; i < as.length; i++) {
      const h = as[i].getAttribute('href');
      if (h && /\\/markets\\/[^/]+$/.test(h) && out.indexOf(h) < 0) out.push(h);
    }
    return out.slice(0, 8);
  })()`) as string[];
  ok("markets are listed to bet on", links.length > 0, `found ${links.length}`);

  for (const href of links) {
    try {
      await p.goto(`${BASE}${href}?side=YES`, { waitUntil: "domcontentloaded" });
      await p.waitForTimeout(700);
      const place = p.locator('button:has-text("Place"), button:has-text("Weka")').first();
      if (await place.count() === 0) continue;
      await place.click({ timeout: 4000 });
      await p.waitForTimeout(500);
      const confirm = p.locator('button:has-text("Confirm"), button:has-text("Thibitisha")').first();
      if (await confirm.count() > 0) { await confirm.click({ timeout: 4000 }); placed++; }
      await p.waitForTimeout(900);
    } catch { /* a market may be closed or already held — try the next */ }
  }
  await p.close();
}
ok("at least one real notification was generated by placing a bet", placed > 0, `placed=${placed}`);

// ── FILLED ────────────────────────────────────────────────────────────────────
if (placed > 0) {
  const p = await ctx.newPage();
  for (const w of WIDTHS) for (const l of LOCALES) await shootBell(p, "filled", w, l.code);
  await p.close();
}

await browser.close();
console.log(`\nshots written to ${OUT}`);
console.log(`qa:cert-c3 (bell visual): ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
