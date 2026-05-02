/**
 * Sprint 15 — admin dashboard end-to-end coverage.
 * Walks every admin route as a demo session, asserts the page renders the
 * expected structural elements (confidentiality band, sidebar group label,
 * breadcrumb, page heading), and that interactive primitives are reachable.
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
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });

try {
  // Boot demo session (which is admin-equivalent for the layout gate)
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });

  const ROUTES = [
    { url: "/admin",                     mustContain: ["Overview", "Active players", "GGR", "Live activity feed"] },
    { url: "/admin/live",                mustContain: ["Live ops", "polling", "Live matches"] },
    { url: "/admin/finance",             mustContain: ["Finance", "Deposits", "GGR", "Operator margin", "Provider summary"] },
    { url: "/admin/reports",             mustContain: ["Reports", "GBT monthly", "TRA withholding", "FIU"] },
    { url: "/admin/players",             mustContain: ["Players", "Search players"] },
    { url: "/admin/players/cohorts",     mustContain: ["Cohorts", "By status", "By region", "By age band"] },
    { url: "/admin/games/match",         mustContain: ["Match betting", "Per-match performance"] },
    { url: "/admin/games/window",        mustContain: ["Window pools", "Per-window performance"] },
    { url: "/admin/games/mapigo",        mustContain: ["Mapigo analytics", "Call distribution", "Outcome distribution"] },
    { url: "/admin/compliance",          mustContain: ["Compliance", "Audit chain", "Backup status", "KYC conversion funnel", "Match-integrity alerts"] },
    { url: "/admin/aml",                 mustContain: ["AML", "EDD queue"] },
    { url: "/admin/self-exclusions",     mustContain: ["Self-exclusion roster"] },
    { url: "/admin/audit",               mustContain: ["Audit log", "AUTH", "BET", "ADMIN"] },
    { url: "/admin/system",              mustContain: ["System", "Audit chain", "Backup"] },
    { url: "/admin/approvals",           mustContain: ["Two-person approvals", "AML pending"] },
    { url: "/admin/2fa/setup",           mustContain: ["Two-factor authentication", "RFC 6238"] },
  ];

  for (const r of ROUTES) {
    const p = await ctx.newPage();
    let ok = true;
    let missing = "";
    try {
      const res = await p.goto(`${BASE}${r.url}`, { waitUntil: "networkidle", timeout: 30_000 });
      if (res?.status() !== 200) { ok = false; missing = `HTTP ${res?.status()}`; }
      else {
        const body = (await p.locator("body").textContent()) ?? "";
        for (const m of r.mustContain) {
          if (!body.includes(m)) { ok = false; missing = `missing "${m}"`; break; }
        }
        // Confidentiality band must be present
        if (ok && !/STAFF · CONFIDENTIAL/i.test(body)) {
          ok = false;
          missing = "missing confidentiality band";
        }
      }
    } catch (e) {
      ok = false;
      missing = String(e?.message ?? e);
    } finally {
      await p.close();
    }
    log(`route ${r.url}`, ok, missing);
  }

  // Per-player drill-down
  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
    const firstLink = p.locator('a[href^="/admin/players/usr_"]').first();
    const href = await firstLink.getAttribute("href").catch(() => null);
    await p.close();
    if (href) {
      const pp = await ctx.newPage();
      const r = await pp.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      const body = (await pp.locator("body").textContent()) ?? "";
      const ok = r?.status() === 200 && /Player profile/.test(body) && /Risk score/.test(body) && /Activity/.test(body);
      log(`route ${href}  · per-player drill-down`, ok);
      await pp.close();
    } else {
      log("per-player drill-down", false, "no first user found");
    }
  }

  // Tab navigation on player detail
  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
    const firstLink = await p.locator('a[href^="/admin/players/usr_"]').first().getAttribute("href").catch(() => null);
    await p.close();
    if (firstLink) {
      const pp = await ctx.newPage();
      await pp.goto(`${BASE}${firstLink}?tab=bets`, { waitUntil: "networkidle" });
      const body = (await pp.locator("body").textContent()) ?? "";
      // Verify the bets tab renders (either has bet rows or the empty-state)
      const ok = /Player profile/.test(body) && (/Stake/.test(body) || /No bets placed/.test(body));
      log("player tab navigation (?tab=bets)", ok);
      await pp.close();
    }
  }

  // AML page renders (empty queue is valid)
  {
    const p = await ctx.newPage();
    await p.goto(`${BASE}/admin/aml`, { waitUntil: "networkidle" });
    const body = (await p.locator("body").textContent()) ?? "";
    // Either real buttons exist (non-empty queue) or the empty-state copy
    const ok = /Approve|Reject/.test(body) || /No transactions awaiting review/.test(body);
    log("admin/aml renders (queue or empty-state)", ok);
    await p.close();
  }
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await ctx.close();
await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 15 ADMIN  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
