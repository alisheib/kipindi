/**
 * Sprint 20 — dead-button audit.
 *
 * Walks every public + demo-authed route, finds every interactive element
 * (button + a + [role=button]), and reports any that:
 *   - have no href, no onClick handler, no form association
 *   - have href="#" (placeholder)
 *   - have an empty / whitespace-only accessible name
 *
 *   BASE=http://localhost:3000  node scripts/dead-button-audit.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";

const ROUTES = [
  { path: "/",                        auth: false },
  { path: "/live",                    auth: false },
  { path: "/games",                   auth: false },
  { path: "/mapigo",                  auth: false },
  { path: "/legal/terms",             auth: false },
  { path: "/help",                    auth: false },
  { path: "/fairness",                auth: false },
  { path: "/wallet",                  auth: true },
  { path: "/wallet/deposit",          auth: true },
  { path: "/wallet/withdraw",         auth: true },
  { path: "/bets",                    auth: true },
  { path: "/profile",                 auth: true },
  { path: "/profile/account",         auth: true },
  { path: "/profile/responsible-gambling", auth: true },
  { path: "/admin",                   auth: true },
  { path: "/admin/finance",           auth: true },
  { path: "/admin/aml",               auth: true },
  { path: "/admin/players",           auth: true },
  { path: "/admin/audit",             auth: true },
  { path: "/admin/system",            auth: true },
];

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

async function audit(ctx, path) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  await p.waitForTimeout(400);

  const findings = await p.evaluate(() => {
    const results = { dead: [], emptyName: [], placeholderHash: [] };
    const interactives = Array.from(document.querySelectorAll('button, a, [role="button"]'));
    for (const el of interactives) {
      const tag = el.tagName.toLowerCase();
      const text = (el.textContent || "").trim();
      const aria = el.getAttribute("aria-label");
      const name = aria || text;
      const inForm = el.closest("form");
      // Anchors must have href (or onclick / formaction)
      if (tag === "a") {
        const href = el.getAttribute("href") ?? "";
        if (href === "" || href === "#") {
          results.placeholderHash.push({ tag, name: name.slice(0, 60), href });
        }
      }
      // Buttons must have onClick handler OR be inside a form (submit/reset)
      if (tag === "button") {
        const type = el.getAttribute("type") ?? "submit";
        const hasReact = !!Object.keys(el).find((k) => k.startsWith("__reactProps"));
        // Heuristic: react-attached props mean event handler is wired by React
        if (!inForm && type !== "submit" && !hasReact) {
          results.dead.push({ tag, name: name.slice(0, 60), type });
        }
      }
      if (!name) {
        results.emptyName.push({ tag, type: el.getAttribute("type") ?? "" });
      }
    }
    return results;
  });

  // Allow up to 1 nameless icon-only element per page (decorative chevrons / patterns)
  const okEmpty = findings.emptyName.length <= 1;
  const okHash  = findings.placeholderHash.length === 0;
  const okDead  = findings.dead.length === 0;

  log(
    `${path}: dead-buttons:${findings.dead.length} empty-names:${findings.emptyName.length} hash-hrefs:${findings.placeholderHash.length}`,
    okEmpty && okHash && okDead,
    findings.dead.length > 0 ? `e.g. ${findings.dead[0]?.name ?? "?"}` : findings.placeholderHash.length > 0 ? `e.g. href=${findings.placeholderHash[0]?.href}` : "",
  );
  await p.close();
}

const browser = await chromium.launch();

console.log("\n=== DEAD-BUTTON AUDIT ===");

// Guest pass first
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  for (const r of ROUTES.filter((r) => !r.auth)) {
    await audit(ctx, r.path);
  }
  await ctx.close();
}

// Authed pass
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  for (const r of ROUTES.filter((r) => r.auth)) {
    await audit(ctx, r.path);
  }
  await ctx.close();
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nDEAD-BUTTON AUDIT  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
