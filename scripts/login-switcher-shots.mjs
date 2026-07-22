/**
 * Visual + a11y check for the player sign-in Phone/Email switcher.
 * Screenshots /auth/login in phone + email modes, at 360 + 1280, in EN + SW.
 * Asserts: switcher renders (2 radios), toggling swaps the input (+255 prefix in
 * phone mode; email input in email mode), no console errors, no horizontal
 * overflow. Shots → .50pick-shots/. Run against `npm run dev` on :3000.
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`ok  ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const browser = await chromium.launch();

async function run(locale) {
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: "kp-locale", value: locale, domain: "localhost", path: "/" }]);
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90000);
  page.setDefaultTimeout(20000);
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));

  await page.goto(`${BASE}/auth/login`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const radios = page.getByRole("radio");
  ok(`[${locale}] switcher has 2 options`, (await radios.count()) === 2, `count=${await radios.count()}`);

  for (const w of [360, 1280]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(150);

    // Phone mode (default): +255 prefix should be visible.
    ok(`[${locale}] phone mode shows +255 @${w}`, (await page.getByText("+255").count()) >= 1);
    let of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`[${locale}] no overflow (phone) @${w}`, of <= 1, `overflow=${of}px`);
    await page.screenshot({ path: `.50pick-shots/login-${locale}-phone-${w}.png`, fullPage: false });

    // Switch to Email.
    await radios.nth(1).click();
    await page.waitForTimeout(200);
    const emailInput = page.locator('input[name="identifier"][type="email"]');
    ok(`[${locale}] email mode shows email input @${w}`, (await emailInput.count()) === 1);
    of = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    ok(`[${locale}] no overflow (email) @${w}`, of <= 1, `overflow=${of}px`);
    await page.screenshot({ path: `.50pick-shots/login-${locale}-email-${w}.png`, fullPage: false });

    // Back to phone for next width.
    await radios.nth(0).click();
    await page.waitForTimeout(150);
  }

  ok(`[${locale}] no console errors`, errs.length === 0, errs.slice(0, 3).join(" | "));
  await ctx.close();
}

await run("en");
await run("sw");

await browser.close();
console.log(`\nlogin-switcher-shots: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
