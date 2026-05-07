/**
 * Sprint 28 — legal pages + /help kit-faithful.
 *
 *   1. /legal/terms, /legal/privacy, /legal/aml, /legal/responsible-gambling
 *      all 200 + new LegalHeader/LegalSection markup, no Kipindi tokens
 *      in main DOM
 *   2. /help 200 + FAQ details + contact + quick links
 *   3. Footer links from / land on the new pages cleanly
 *
 *   BASE=http://localhost:3000  node scripts/sprint28-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const KIPINDI_TOKENS = [
  "Pattern kind", "Breadcrumbs",
  "border-divider", "border-border-divider", "border-border-strong",
  "border-border-subtle", "text-text-secondary", "text-text-tertiary",
  "text-label", "text-caption", "text-micro",
  "bg-bg-sunken", "bg-surface ", "surface-pressed", "surface-hover",
  "shadow-e3", "shadow-e4", "shadow-e5",
  "kp-slide-up", "kp-pop-in", "kp-ping",
  "var(--royal)", "var(--success)", "var(--danger)",
  "text-royal", "bg-royal-subtle", "text-onBrand",
  "text-info ", "text-success ", "text-danger ", "text-warning ",
  "text-title-lg", "text-title-md", "text-title-sm",
];

function findLeaks(html) {
  return KIPINDI_TOKENS.filter((t) => {
    if (t.endsWith(" ")) return html.includes(t);
    const re = new RegExp(`(?<![\\w-])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\w-])`);
    return re.test(html);
  });
}

const ROUTES = [
  { url: "/legal/terms",                marker: /Terms of Service/i },
  { url: "/legal/privacy",              marker: /Privacy Policy/i },
  { url: "/legal/aml",                  marker: /AML.{1,10}KYC Policy/i },
  { url: "/legal/responsible-gambling", marker: /Responsible Gambling Policy/i },
  { url: "/help",                       marker: /How can we help/i },
];

const browser = await chromium.launch();

for (const r of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const res = await p.goto(`${BASE}${r.url}`, { waitUntil: "networkidle" });
  log(`${r.url} — 200`, res?.status() === 200, String(res?.status()));
  const body = await p.locator("main main").innerText().catch(() => "");
  log(`${r.url} — header rendered`, r.marker.test(body));
  const mainHtml = await p.locator("main main").innerHTML().catch(() => "");
  const leaks = findLeaks(mainHtml);
  log(`${r.url} — no Kipindi tokens leaked`, leaks.length === 0, leaks.join(", ") || "clean");
  await p.close();
  await ctx.close();
}

console.log("\n=== Footer link sanity ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const footer = await p.locator("footer").innerText();
  log("footer renders Privacy + AML + Terms link copy",
    /Privacy notice/.test(footer) && /AML/.test(footer) && /Terms of service/.test(footer));
  await p.close();
  await ctx.close();
}

console.log("\n=== /help features ===");
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/help`, { waitUntil: "networkidle" });
  const detailsCount = await p.locator("main main details").count();
  log("help FAQ has multiple <details>", detailsCount >= 6, `${detailsCount}`);
  const body = await p.locator("main main").innerText();
  log("contact: phone + email visible", /\+255 22 211 5811/.test(body) && /support@50pick\.com/.test(body));
  log("quick links: Wallet help + My positions", /Wallet help/.test(body) && /My positions/.test(body));
  await p.close();
  await ctx.close();
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 28  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
