/**
 * Reports renderers smoke test — production-path.
 *
 * Downloads every catalogue report in BOTH formats through the real
 * `/api/admin/reports/[id]` route (admin session cookie + role gate + the
 * TOTP step-up, which DISABLE_ADMIN_TOTP=true satisfies in dev), and asserts:
 *   · HTTP 200 + a sensible size
 *   · the right content-type (application/pdf / spreadsheetml)
 *   · the file magic bytes (%PDF- / PK ZIP)
 *   · a content-disposition filename of 50pick-<slug>-<date>.<ext>, where the
 *     slug tracks REPORT_CATALOGUE[id].name (route.ts → reportFilename())
 * plus the negative cases (unknown id → 404, bad format → 400).
 *
 * Auth is bootstrapped via /api/dev-test/seed-admin (creates an ADMIN with a
 * live session cookie in one call) — no brittle register-form automation.
 *
 *   DISABLE_ADMIN_TOTP=true npx next dev -p 3000
 *   BASE=http://localhost:3000  node scripts/report-renderers-smoke.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.cwd(), ".50pick-shots/reports-smoke");
mkdirSync(OUT, { recursive: true });

// Mirrors REPORT_CATALOGUE in src/lib/server/reports/catalogue.ts (tra-tax was
// removed in 2026-07 — 50pick no longer withholds any per-player tax). The slug
// is derived from the entry NAME by reportFilename() in brand.ts.
const REPORTS = [
  { id: "daily-ops",       slug: "daily-operations-report" },
  { id: "gbt-monthly",     slug: "monthly-report" },
  { id: "fiu-sar",         slug: "fiu-sar" },
  { id: "sx-register",     slug: "self-exclusion-register" },
  { id: "iso-audit",       slug: "iso-27001-audit-log" },
  { id: "kyc-reverify",    slug: "kyc-re-verification-roster" },
  { id: "rg-engagement",   slug: "responsible-gambling-engagement" },
  { id: "match-integrity", slug: "match-integrity-quarterly-review" },
];

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const browser = await chromium.launch();
const ctx = await browser.newContext();

// Bootstrap: seed an admin (sets the session cookie in this context) + a little
// money/audit data so the reports have rows to render.
const seed = await ctx.request.post(`${BASE}/api/dev-test/seed-admin`, { data: {} });
log("admin seeded + session cookie set", seed.status() === 200, String(seed.status()));
await ctx.request.post(`${BASE}/api/dev-test/stress-regulator-grade`, { data: { n: 20, u: 12, b: 150, r: 8 } }).catch(() => {});

for (const { id, slug } of REPORTS) {
  for (const fmt of ["pdf", "xlsx"]) {
    try {
      const res = await ctx.request.get(`${BASE}/api/admin/reports/${id}?format=${fmt}`);
      const buf = Buffer.from(await res.body());
      const ct = res.headers()["content-type"] || "";
      const cd = res.headers()["content-disposition"] || "";
      const magic = fmt === "pdf" ? buf.subarray(0, 5).toString() === "%PDF-" : (buf[0] === 0x50 && buf[1] === 0x4b);
      const ctOk = fmt === "pdf" ? ct.includes("application/pdf") : ct.includes("spreadsheetml");
      const fnOk = cd.includes(`50pick-${slug}-`) && cd.endsWith(`.${fmt}"`);
      const ok = res.status() === 200 && buf.length > 2000 && magic && ctOk && fnOk;
      log(`${id} · ${fmt}`, ok, `${res.status()} ${(buf.length / 1024).toFixed(1)}kb ct=${ctOk ? "ok" : ct} fn=${fnOk ? "ok" : cd.slice(0, 70)}`);
      if (ok) writeFileSync(resolve(OUT, `${id}.${fmt}`), buf);
    } catch (e) {
      log(`${id} · ${fmt}`, false, String(e?.message ?? e));
    }
  }
}

// Negative cases — the route must reject a bad format and an unknown id.
const badFmt = await ctx.request.get(`${BASE}/api/admin/reports/gbt-monthly?format=csv`);
log("bad format → 400", badFmt.status() === 400, String(badFmt.status()));
const unknown = await ctx.request.get(`${BASE}/api/admin/reports/does-not-exist?format=pdf`);
log("unknown report → 404", unknown.status() === 404, String(unknown.status()));

// Authz — an anonymous (cookie-less) caller must never receive a report.
const anon = await browser.newContext();
const anonRes = await anon.request.get(`${BASE}/api/admin/reports/gbt-monthly?format=pdf`);
log("anonymous blocked (401/307)", anonRes.status() === 401 || anonRes.status() === 307, String(anonRes.status()));
await anon.close();

await ctx.close();
await browser.close();
console.log(`\n${"=".repeat(60)}\nREPORTS SMOKE  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
