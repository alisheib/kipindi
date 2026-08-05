/**
 * E-70, REPRODUCED — Ali's exact gesture, which two sessions never drove.
 *
 * Ali, 2026-08-06: *"when i click back to app from admin, it redirects to app but with no
 * navbar."* Earlier (2026-08-04): *"when I move from admin to game to markets there is no
 * navbar, it's lost until I login as player or retry the URL as player."*
 *
 * ⭐ THE CONTROL IS `Back to app` — a `<Link href="/">` in `admin-shell.tsx:154`. That makes it
 * a Next.js CLIENT-SIDE SOFT NAVIGATION, and that is the whole bug. Every previous attempt used
 * `page.goto()`, which is a HARD load: the server re-renders the root layout, `x-pathname` is
 * `/`, the shell renders, and the defect vanishes. The gesture had to be a CLICK.
 *
 * HYPOTHESIS UNDER TEST (from `app-shell.tsx:44-52`): `AppShell` is a SERVER component in the
 * ROOT layout that reads `x-pathname` from headers and returns `<>{children}</>` — no player
 * chrome — for any `/admin*` path. In the App Router the root layout is NOT re-executed on a
 * soft navigation, so the shell-less layout rendered for `/admin/...` is PRESERVED and `/`
 * renders inside it. Nav gone until a hard load.
 *
 * ⛔ THE CONTROL THAT MAKES THIS PROOF WORTH ANYTHING: drive the SAME destination by hard load
 * in the SAME session and show the navbar present. Without it, "no navbar at /" could mean the
 * account simply has no navbar, and the finding would be worthless.
 *
 *   node .qa-s30/repro-e70.mjs
 */
import { mkdirSync } from "node:fs";
import { BASE, login, browser } from "./live/harness.mjs";

const OUT = process.env.SHOT_DIR ?? "shots/E70";
mkdirSync(OUT, { recursive: true });

/** Count the player chrome, by ROLE and by landmark — never by a CSS class that may be renamed. */
async function chrome(page, label) {
  const c = await page.evaluate(() => {
    const navs = [...document.querySelectorAll("nav")];
    const txt = (document.body.innerText || "").toLowerCase();
    return {
      navCount: navs.length,
      navLabels: navs.map((n) => n.getAttribute("aria-label") || "(unlabelled)").slice(0, 6),
      // The five bottom-nav destinations. Their presence IS the player navbar.
      hasMarkets: /\bmarkets\b|\bmasoko\b|市场/.test(txt),
      hasUpDown: /up & down|juu na chini|涨跌/.test(txt),
      hasWallet: /\bwallet\b|\bpochi\b|钱包/.test(txt),
      // The bottom bar is a fixed element at the foot of the viewport.
      fixedBottom: [...document.querySelectorAll("*")].some((el) => {
        const s = getComputedStyle(el);
        if (s.position !== "fixed") return false;
        const r = el.getBoundingClientRect();
        return r.bottom >= window.innerHeight - 4 && r.height > 40 && r.width > window.innerWidth * 0.8;
      }),
      path: location.pathname,
    };
  });
  console.log(`   ${label.padEnd(34)} path=${c.path.padEnd(16)} nav=${c.navCount} ${JSON.stringify(c.navLabels)}`);
  console.log(`   ${" ".repeat(34)} bottomBar=${c.fixedBottom}  markets=${c.hasMarkets} upDown=${c.hasUpDown} wallet=${c.hasWallet}`);
  return c;
}

const { b } = await browser();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();

console.log("\n── E-70 · Ali's gesture: sign in as ADMIN, then CLICK 'Back to app' ──\n");
await login(page, "admin");

await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
const atAdmin = await chrome(page, "1. /admin (hard load)");
await page.screenshot({ path: `${OUT}/1-admin.png` });

// ── THE GESTURE. A real click on the real control, not a goto. ──
const back = page.getByRole("link", { name: /back to app/i }).first();
const found = await back.count();
console.log(`\n   'Back to app' link found: ${found}`);
await back.click();
await page.waitForTimeout(2500);
const afterClick = await chrome(page, "2. after CLICKING 'Back to app'");
await page.screenshot({ path: `${OUT}/2-after-back-to-app-CLICK.png` });

// ── THE CONTROL: same destination, same session, HARD load. ──
await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2500);
const afterHard = await chrome(page, "3. CONTROL — same URL, hard load");
await page.screenshot({ path: `${OUT}/3-control-hard-load.png` });

// ── Ali's original wording: admin → game → markets, all by CLICK where possible. ──
console.log("\n── the 2026-08-04 wording: admin → game → markets ──\n");
await page.goto(`${BASE}/admin/updown`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2000);
await chrome(page, "4. /admin/updown (hard)");
const back2 = page.getByRole("link", { name: /back to app/i }).first();
if (await back2.count()) { await back2.click(); await page.waitForTimeout(2500); }
await chrome(page, "5. after 'Back to app' from updown");
await page.screenshot({ path: `${OUT}/5-from-admin-updown.png` });
// then on to markets, by clicking a nav link if one exists — if the bar is gone, it cannot.
const marketsLink = page.getByRole("link", { name: /^markets$/i }).first();
console.log(`\n   a 'Markets' nav link is clickable from here: ${await marketsLink.count() > 0}`);
if (await marketsLink.count()) { await marketsLink.click(); await page.waitForTimeout(2000); }
await chrome(page, "6. /markets");
await page.screenshot({ path: `${OUT}/6-markets.png` });

console.log("\n── VERDICT ──");
// ⛔ THE VERDICT READS THE nav LANDMARK COUNT, NOT `fixedBottom`. The first version of this
// script judged on a `position:fixed` bottom-bar detector that returned FALSE ON THE CONTROL
// TOO — it could not tell a broken page from a working one, and printed "NOT reproduced" over
// a run that had just reproduced the defect perfectly. The control is what exposed it: a
// detector that reports the same value for the defect and its control is measuring nothing.
const broke = afterClick.navCount === 0 && afterHard.navCount > 0;
const fixed = afterClick.navCount > 0 && afterClick.navCount === afterHard.navCount;
console.log(broke
  ? `   🔴 REPRODUCED. Soft nav → nav=${afterClick.navCount}; hard load of the SAME url → nav=${afterHard.navCount}.`
  : fixed
  ? `   ✅ FIXED. Soft nav → nav=${afterClick.navCount}, identical to the hard-load control (${afterHard.navCount}).`
  : `   ⚠️ INCONCLUSIVE. soft=${afterClick.navCount} hard=${afterHard.navCount} — report both, do not claim either.`);
console.log(`   shots in ${OUT}/\n`);

await b.close();
process.exit(broke ? 1 : 0);
