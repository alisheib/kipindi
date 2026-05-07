/**
 * Sprint 27 — profile sub-pages kit-faithful.
 *
 *   1. /profile/kyc renders new hero, no Kipindi tokens in main DOM
 *   2. /profile/account ditto, with profile summary + activity table
 *   3. /profile/responsible-gambling ditto, with deposit limits form
 *   4. /profile/sessions ditto, with current device card
 *   5. /profile/source-of-funds ditto, with source radio grid
 *
 *   BASE=http://localhost:3000  node scripts/sprint27-test.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

// Match whole class names — `text-info` would otherwise hit `text-info-fg`
// which is the kit replacement.
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
    // Class strings are always quote-bounded or space-bounded in HTML
    // attributes. We test for the token surrounded by a non-class char
    // (space, quote, ", >, etc.) so `text-info` doesn't match `text-info-fg`.
    if (t.endsWith(" ")) return html.includes(t);
    const re = new RegExp(`(?<![\\w-])${t.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}(?![\\w-])`);
    return re.test(html);
  });
}

const ROUTES = [
  { url: "/profile/kyc",                   marker: /Verify your NIDA/i },
  { url: "/profile/account",               marker: /My account/i },
  { url: "/profile/responsible-gambling",  marker: /Responsible gambling/i },
  { url: "/profile/sessions",              marker: /Devices.{1,4}sessions/i },
  { url: "/profile/source-of-funds",       marker: /Source of funds/i },
];

const browser = await chromium.launch();

for (const r of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const p = await ctx.newPage();
  const res = await p.goto(`${BASE}${r.url}`, { waitUntil: "networkidle" });
  log(`${r.url} — 200`, res?.status() === 200, String(res?.status()));
  const body = await p.locator("main main").innerText().catch(() => "");
  log(`${r.url} — header rendered`, r.marker.test(body));
  // Scan only main inner DOM, not script bundles.
  const mainHtml = await p.locator("main main").innerHTML().catch(() => "");
  const leaks = findLeaks(mainHtml);
  log(`${r.url} — no Kipindi tokens leaked`, leaks.length === 0, leaks.join(", ") || "clean");
  await p.close();
  await ctx.close();
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 27  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
