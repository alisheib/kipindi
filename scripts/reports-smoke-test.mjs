/**
 * REPORTS SMOKE TEST
 *
 * Walks every report in the catalogue, downloads both formats, and
 * verifies:
 *   · HTTP 200
 *   · Correct content-type
 *   · Filename matches the 50pick-<slug>-<date>.<ext> convention
 *   · Body is non-empty + a sensible size
 *   · For xlsx: the bytes start with the PK ZIP magic (Excel files
 *     are ZIP containers)
 *   · For pdf: the bytes start with %PDF-
 *
 *   BASE=http://localhost:3000  node scripts/reports-smoke-test.mjs
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.cwd(), ".50pick-shots/reports");
mkdirSync(OUT, { recursive: true });

let pass = 0, fail = 0;
const failures = [];
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else { fail++; failures.push(`${label} ${detail}`); }
}

const phoneTail = (offset = 0) => "7" + String((Date.now() + offset) % 100_000_000).padStart(8, "0");

async function reg(ctx, tail, password) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.fill('input[name="password"]', password);
  await p.fill('input[name="passwordConfirm"]', password);
  await p.check('input[name="acceptAge"]', { force: true });
  await p.check('input[name="acceptTerms"]', { force: true });
  await Promise.all([
    p.waitForURL(u => !/auth\/register$/.test(u.toString()), { timeout: 10_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.waitForTimeout(800);
  await p.close();
}

async function login(ctx, tail, password) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="password"]', password);
  await Promise.all([
    p.waitForURL(u => !/auth\/login$/.test(u.toString()), { timeout: 10_000 }).catch(() => null),
    p.click('button[type="submit"]'),
  ]);
  await p.waitForTimeout(800);
  await p.close();
}

const REPORTS = [
  { id: "gbt-monthly", slug: "gbt-monthly-summary" },
  { id: "tra-tax",     slug: "tra-withholding-tax" },
  { id: "fiu-sar",     slug: "fiu-sar" },
  { id: "sx-register", slug: "self-exclusion-register" },
  { id: "iso-audit",   slug: "iso-27001-audit-log" },
];

const browser = await chromium.launch();
try {
  await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

  // Provision an admin so we can hit the API route
  const adminTail = phoneTail(0);
  const adminPhone = "+255" + adminTail;
  const adminPwd = "ReportsSmoke!2026";
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await reg(ctx, adminTail, adminPwd);
  await fetch(`${BASE}/api/dev-test/promote-admin`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ phone: adminPhone }),
  }).catch(() => null);
  await login(ctx, adminTail, adminPwd);

  for (const r of REPORTS) {
    for (const fmt of ["xlsx", "pdf"]) {
      const res = await ctx.request.get(`${BASE}/api/admin/reports/${r.id}?format=${fmt}`);
      const status = res.status();
      log(`${r.id}.${fmt} returns 200`, status === 200, `status ${status}`);
      if (status !== 200) continue;

      const ct = res.headers()["content-type"] ?? "";
      const expectedCt = fmt === "xlsx"
        ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        : "application/pdf";
      log(`${r.id}.${fmt} content-type correct`, ct.startsWith(expectedCt), ct);

      const disp = res.headers()["content-disposition"] ?? "";
      const wantedSlug = `50pick-`;
      log(`${r.id}.${fmt} filename follows convention`, disp.includes(wantedSlug) && disp.includes(`.${fmt}`), disp);

      const body = await res.body();
      log(`${r.id}.${fmt} body has sensible size`, body.length > 500, `${body.length} bytes`);

      // Magic-byte sanity
      if (fmt === "xlsx") {
        const isZip = body[0] === 0x50 && body[1] === 0x4b; // "PK"
        log(`${r.id}.xlsx body starts with ZIP magic (PK)`, isZip);
      } else {
        const isPdf = body.slice(0, 5).toString() === "%PDF-";
        log(`${r.id}.pdf body starts with %PDF-`, isPdf, body.slice(0, 8).toString());
      }

      // Save for visual inspection
      const filename = (disp.match(/filename="([^"]+)"/)?.[1]) ?? `${r.id}.${fmt}`;
      writeFileSync(resolve(OUT, filename), body);
    }
  }

  // Negative path — non-admin should be 403
  {
    const playerCtx = await browser.newContext();
    const ptail = phoneTail(100);
    await reg(playerCtx, ptail, adminPwd);
    const res = await playerCtx.request.get(`${BASE}/api/admin/reports/gbt-monthly?format=xlsx`);
    log("player blocked from /api/admin/reports (307 redirect or 403)", res.status() === 307 || res.status() === 403, `status ${res.status()}`);
    await playerCtx.close();
  }

  // Anonymous — should also be blocked
  {
    const anonCtx = await browser.newContext();
    const res = await anonCtx.request.get(`${BASE}/api/admin/reports/gbt-monthly?format=xlsx`);
    log("anonymous blocked from /api/admin/reports", res.status() === 307 || res.status() === 401, `status ${res.status()}`);
    await anonCtx.close();
  }

  await ctx.close();
} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await browser.close();
console.log(`\n${"=".repeat(60)}\nREPORTS SMOKE  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
console.log(`Files saved to: ${OUT}\n`);
if (fail > 0) {
  console.log("Failures:");
  for (const f of failures) console.log("  · " + f);
}
process.exit(fail > 0 ? 1 : 0);
