/**
 * Cross-viewport responsive audit.
 * Tests every key page at:
 *   - 393×852  (iPhone 15 / "small phone")
 *   - 430×932  (iPhone 17 Pro Max / "large phone")
 *   - 768×1024 (iPad portrait / "tablet")
 *   - 1024×768 (iPad landscape / "tablet wide")
 *
 * For each viewport × page combination, checks horizontal overflow.
 *
 *   BASE=http://localhost:3000  node scripts/multi-viewport-audit.mjs
 *   BASE=https://kipindi-...    node scripts/multi-viewport-audit.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

const VIEWPORTS = [
  { name: "phone-393",   width: 393,  height: 852  },
  { name: "phone-430",   width: 430,  height: 932  },
  { name: "tablet-768",  width: 768,  height: 1024 },
  { name: "tablet-1024", width: 1024, height: 768  },
];

const PAGES = {
  public: ["/", "/auth/login", "/mapigo", "/live", "/leaderboard", "/games", "/legal/terms", "/legal/privacy", "/legal/responsible-gambling", "/legal/aml"],
  authed: ["/", "/wallet", "/wallet/deposit", "/wallet/withdraw", "/bets", "/mapigo", "/match/m1", "/profile", "/profile/account", "/profile/kyc", "/profile/responsible-gambling", "/admin", "/admin/audit", "/admin/aml", "/admin/system"],
};

let total = 0, fails = 0;

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  console.log(`\n=== ${vp.name} (${vp.width}×${vp.height}) ===`);

  // Public pages on a fresh context
  {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    for (const url of PAGES.public) {
      total++;
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 30_000 });
        await page.waitForTimeout(500);
        const docW = await page.evaluate(() => document.documentElement.scrollWidth);
        const overflow = docW > vp.width + 1;
        if (overflow) {
          fails++;
          // Identify offending elements
          const offenders = await page.evaluate((vw) => {
            const list = [];
            for (const el of document.querySelectorAll("*")) {
              const r = el.getBoundingClientRect();
              if (r.right > vw + 1 && r.width > 100) {
                list.push({ tag: el.tagName.toLowerCase(), cls: (el.className || "").toString().slice(0, 100), right: Math.round(r.right), width: Math.round(r.width) });
                if (list.length > 4) break;
              }
            }
            return list;
          }, vp.width);
          console.log(`  ✗ ${url}  doc=${docW}px (vp=${vp.width})`);
          for (const o of offenders.slice(0, 3)) console.log(`      ${o.tag}.${o.cls} right=${o.right}`);
        }
        else console.log(`  ✓ ${url}`);
      } catch (e) {
        fails++;
        console.log(`  ! ${url}  → ${e?.message ?? e}`);
      } finally {
        await page.close();
      }
    }
    await ctx.close();
  }

  // Authed pages with a demo session
  {
    const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
    for (const url of PAGES.authed) {
      total++;
      const page = await ctx.newPage();
      try {
        await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 30_000 });
        await page.waitForTimeout(500);
        const docW = await page.evaluate(() => document.documentElement.scrollWidth);
        const overflow = docW > vp.width + 1;
        if (overflow) {
          fails++;
          const offenders = await page.evaluate((vw) => {
            const list = [];
            for (const el of document.querySelectorAll("*")) {
              const r = el.getBoundingClientRect();
              if (r.right > vw + 1 && r.width > 100) {
                list.push({ tag: el.tagName.toLowerCase(), cls: (el.className || "").toString().slice(0, 100), right: Math.round(r.right), width: Math.round(r.width) });
                if (list.length > 4) break;
              }
            }
            return list;
          }, vp.width);
          console.log(`  ✗ ${url}  doc=${docW}px`);
          for (const o of offenders.slice(0, 3)) console.log(`      ${o.tag}.${o.cls} right=${o.right}`);
        }
        else console.log(`  ✓ ${url}`);
      } catch (e) {
        fails++;
        console.log(`  ! ${url}  → ${e?.message ?? e}`);
      } finally {
        await page.close();
      }
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nMULTI-VIEWPORT  total: ${total}    overflow: ${fails}\n${"=".repeat(60)}`);
process.exit(fails > 0 ? 1 : 0);
