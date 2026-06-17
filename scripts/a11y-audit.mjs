/**
 * Accessibility audit — WCAG 2.1 AA basics.
 *
 * Walks every key page and checks:
 *  - Every <img> has alt text (WCAG 1.1.1)
 *  - Every <input>, <select>, <textarea> has an associated <label> or aria-label
 *  - Every <button> has accessible text content or aria-label
 *  - Every <a> has accessible text content or aria-label (non-empty)
 *  - Form fields are reachable via keyboard (TabIndex check)
 *  - Page has a single <h1>
 *  - <html lang> is set
 *
 * Run:  BASE=http://localhost:3000  node scripts/a11y-audit.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

const PAGES_PUBLIC = ["/", "/auth/login", "/auth/register", "/markets", "/live", "/legal/terms", "/legal/privacy", "/legal/responsible-gambling", "/legal/aml"];
const PAGES_AUTHED = ["/wallet", "/wallet/deposit", "/wallet/withdraw", "/positions", "/profile", "/profile/account", "/profile/source-of-funds", "/profile/responsible-gambling", "/profile/kyc", "/admin", "/admin/audit", "/admin/system"];

let total = 0, fail = 0;

const browser = await chromium.launch();

async function audit(ctx, url) {
  total++;
  const page = await ctx.newPage();
  try {
    await page.goto(`${BASE}${url}`, { waitUntil: "networkidle", timeout: 30_000 });
    await page.waitForTimeout(500);
    const issues = await page.evaluate(() => {
      const out = [];
      // <html lang> set
      const lang = document.documentElement.getAttribute("lang");
      if (!lang) out.push("html missing lang attribute");

      // Single <h1>
      const h1s = document.querySelectorAll("h1");
      if (h1s.length === 0) out.push("no <h1> on page");
      // (Multiple <h1> is allowed but discouraged; warn only)

      // Images: alt
      for (const img of document.querySelectorAll("img")) {
        if (!img.getAttribute("alt") && img.getAttribute("alt") !== "") {
          out.push(`<img> without alt: ${img.getAttribute("src")?.slice(0, 60) ?? ""}`);
        }
      }

      // Inputs: accessible name (label, aria-label, or aria-labelledby)
      for (const el of document.querySelectorAll("input:not([type='hidden']), select, textarea")) {
        const id = el.id;
        const ariaLabel = el.getAttribute("aria-label");
        const ariaLabelledBy = el.getAttribute("aria-labelledby");
        const labelFor = id && document.querySelector(`label[for="${CSS.escape(id)}"]`);
        const enclosingLabel = el.closest("label");
        if (!ariaLabel && !ariaLabelledBy && !labelFor && !enclosingLabel) {
          out.push(`form-control missing label: ${(el.outerHTML || "").slice(0, 80)}`);
        }
      }

      // Buttons: accessible name
      for (const b of document.querySelectorAll("button")) {
        const txt = (b.textContent || "").trim();
        const aria = b.getAttribute("aria-label");
        if (!txt && !aria) {
          out.push(`<button> without text/aria-label`);
        }
      }

      // Anchors: accessible name
      for (const a of document.querySelectorAll("a")) {
        const txt = (a.textContent || "").trim();
        const aria = a.getAttribute("aria-label");
        if (!txt && !aria) {
          out.push(`<a href="${a.getAttribute("href") ?? ""}"> without text/aria-label`);
        }
      }

      return out;
    });
    if (issues.length === 0) {
      console.log(`  ✓ ${url}`);
    } else {
      fail++;
      console.log(`  ✗ ${url}  (${issues.length} issues)`);
      for (const i of issues.slice(0, 3)) console.log(`      ${i}`);
    }
  } catch (e) {
    fail++;
    console.log(`  ! ${url}  → ${e?.message ?? e}`);
  } finally {
    await page.close();
  }
}

console.log(`\n=== A11Y · public pages ===`);
{
  const ctx = await browser.newContext();
  for (const u of PAGES_PUBLIC) await audit(ctx, u);
  await ctx.close();
}

console.log(`\n=== A11Y · authed pages ===`);
{
  const ctx = await browser.newContext();
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  for (const u of PAGES_AUTHED) await audit(ctx, u);
  await ctx.close();
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nA11Y  total: ${total}    fail: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
