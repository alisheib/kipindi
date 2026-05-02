/**
 * Light-theme visual audit — captures screenshots of key pages in light mode
 * and runs basic contrast checks on text vs background.
 *
 *   BASE=http://localhost:3000  node scripts/light-theme-audit.mjs
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT  = join(process.cwd(), "scripts", "light-audit");

const PAGES = [
  { name: "01-landing",        url: "/" },
  { name: "02-login",          url: "/auth/login" },
  { name: "03-wallet",         url: "/wallet" },
  { name: "04-deposit",        url: "/wallet/deposit" },
  { name: "05-bets",           url: "/bets" },
  { name: "06-mapigo",         url: "/mapigo" },
  { name: "07-match",          url: "/match/m1" },
  { name: "08-profile",        url: "/profile" },
  { name: "09-rg",             url: "/profile/responsible-gambling" },
  { name: "10-sof",            url: "/profile/source-of-funds" },
  { name: "11-account",        url: "/profile/account" },
  { name: "12-admin",          url: "/admin" },
  { name: "13-admin-system",   url: "/admin/system" },
  { name: "14-legal-terms",    url: "/legal/terms" },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  colorScheme: "light",
});
// Boot demo so authed pages work
await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });

const issues = [];

for (const p of PAGES) {
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}${p.url}`, { waitUntil: "networkidle" });
    // Force light theme via the storage key + class
    await page.evaluate(() => {
      try { localStorage.setItem("kp-theme", "light"); } catch {}
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(700);
    await page.screenshot({ path: join(OUT, `${p.name}.png`), fullPage: true });

    // Sample contrast check — pick body text and report any element where text/bg is too close
    const lowContrast = await page.evaluate(() => {
      const samples = [];
      const els = document.querySelectorAll("p, h1, h2, h3, h4, button, a, span");
      const seen = new Set();
      for (const el of els) {
        if (samples.length > 5) break;
        const cs = getComputedStyle(el);
        const fg = cs.color;
        // Walk up parents to find a non-transparent background
        let bg = "";
        let cur = el;
        while (cur && cur !== document.body) {
          const cbg = getComputedStyle(cur).backgroundColor;
          if (cbg && cbg !== "rgba(0, 0, 0, 0)" && !cbg.includes("0)")) { bg = cbg; break; }
          cur = cur.parentElement;
        }
        if (!bg) continue;
        const key = `${fg}|${bg}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const fgRgb = fg.match(/\d+/g)?.map(Number) ?? [];
        const bgRgb = bg.match(/\d+/g)?.map(Number) ?? [];
        if (fgRgb.length < 3 || bgRgb.length < 3) continue;
        const lum = (rgb) => {
          const [r, g, b] = rgb.map((c) => c / 255).map((c) => c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4));
          return 0.2126*r + 0.7152*g + 0.0722*b;
        };
        const l1 = lum(fgRgb), l2 = lum(bgRgb);
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
        if (ratio < 4.5) {
          samples.push({ tag: el.tagName.toLowerCase(), fg, bg, ratio: ratio.toFixed(2), text: (el.textContent ?? "").trim().slice(0, 40) });
        }
      }
      return samples;
    });
    if (lowContrast.length > 0) {
      console.log(`  ⚠ ${p.url} — ${lowContrast.length} contrast issues`);
      lowContrast.slice(0, 3).forEach((c) => {
        console.log(`      ${c.tag} "${c.text}" — ${c.ratio}:1 (fg ${c.fg}, bg ${c.bg})`);
        issues.push({ page: p.url, ...c });
      });
    } else {
      console.log(`  ✓ ${p.url}`);
    }
  } catch (e) {
    console.log(`  ! ${p.url}  → ${e?.message ?? e}`);
  } finally {
    await page.close();
  }
}

await ctx.close();
await browser.close();
console.log(`\nScreenshots: ${OUT}\nLow-contrast issues: ${issues.length}`);
process.exit(0);
