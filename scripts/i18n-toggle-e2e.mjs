/**
 * Language toggle E2E — proves the EN/SW/FR switcher actually persists
 * the locale (cookie + localStorage) and triggers a router refresh that
 * carries the new language through to server-rendered text.
 *
 *   BASE=http://localhost:3000  node scripts/i18n-toggle-e2e.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const p = await ctx.newPage();

// === 1 · Landing renders, language toggle visible
await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
await p.waitForTimeout(500);
const toggle = p.locator('button[aria-label^="Language:"]').first();
log("1a language toggle button is visible", await toggle.isVisible().catch(() => false));

// === 2 · Default locale on cookieless visit is EN
const cookiesBefore = await ctx.cookies();
const initialLocaleCookie = cookiesBefore.find(c => c.name === "kp-locale");
log("2a no kp-locale cookie initially (defaults to EN)", !initialLocaleCookie);
const currentLabel = await toggle.textContent();
log("2b toggle currently reads EN", /EN/i.test(currentLabel ?? ""), `text="${currentLabel?.trim()}"`);

// === 3 · Click toggle → pick Kiswahili
await toggle.click();
await p.waitForTimeout(300);
await p.locator('[role="menuitem"]').filter({ hasText: /Kiswahili/i }).first().click();
await p.waitForTimeout(900);

// Cookie should be set to "sw"
const cookiesAfter = await ctx.cookies();
const swCookie = cookiesAfter.find(c => c.name === "kp-locale");
log("3a kp-locale cookie set to sw", swCookie?.value === "sw", `value=${swCookie?.value}`);

// document.documentElement.lang should be "sw"
const lang = await p.evaluate(() => document.documentElement.lang);
log("3b <html lang> now sw", lang === "sw", `lang=${lang}`);

// localStorage backup
const ls = await p.evaluate(() => localStorage.getItem("kp-locale"));
log("3c localStorage kp-locale=sw", ls === "sw");

// Toggle button text should show SW now
const afterText = await toggle.textContent();
log("3d toggle now reads SW", /SW/i.test(afterText ?? ""), `text="${afterText?.trim()}"`);

// === 4 · Locale persists on reload
await p.reload({ waitUntil: "networkidle" });
await p.waitForTimeout(500);
const reloadedLang = await p.evaluate(() => document.documentElement.lang);
log("4a reload still SW", reloadedLang === "sw", `lang=${reloadedLang}`);

// === 5 · Switch to French
await toggle.click();
await p.waitForTimeout(300);
await p.locator('[role="menuitem"]').filter({ hasText: /Français/i }).first().click();
await p.waitForTimeout(900);
const frCookie = (await ctx.cookies()).find(c => c.name === "kp-locale");
log("5a kp-locale cookie set to fr", frCookie?.value === "fr", `value=${frCookie?.value}`);
const frLang = await p.evaluate(() => document.documentElement.lang);
log("5b <html lang> now fr", frLang === "fr");

// === 6 · Help page bilingual content
await p.goto(`${BASE}/help`, { waitUntil: "networkidle" });
await p.waitForTimeout(500);
const body = (await p.locator("body").textContent()) ?? "";
log("6a help page shows Call us · Tupigie", /Call us\s*[·\-]\s*Tupigie/.test(body));
log("6b help page shows Email · Barua pepe", /Email\s*[·\-]\s*Barua pepe/.test(body));
log("6c help page shows Wallet help + Msaada wa pochi", /Wallet help/.test(body) && /Msaada wa pochi/.test(body));

await p.close();
await ctx.close();
await browser.close();
console.log(`\n${"=".repeat(60)}\nI18N TOGGLE  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
