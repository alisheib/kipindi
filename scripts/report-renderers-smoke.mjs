/**
 * Reports smoke test — renders every catalogue entry in both PDF and
 * XLSX format and asserts the binary is non-empty + carries the right
 * MIME signature. Catches renderer crashes from type changes (e.g. the
 * new signatures + bilingual labels).
 *
 * Runs in-process via Next.js dev API — no special wiring needed.
 *
 *   BASE=http://localhost:3000  node scripts/report-renderers-smoke.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.BASE || "http://localhost:3000";
const OUT = resolve(process.cwd(), ".50pick-shots/reports-smoke");
mkdirSync(OUT, { recursive: true });

const REPORTS = ["gbt-monthly", "tra-tax", "fiu-sar", "sx-register", "iso-audit"];

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

const phoneTail = (off = 0) => "7" + String((Date.now() + off) % 100_000_000).padStart(8, "0");
async function reg(ctx, tail, pwd) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="dob"]', "1990-01-15");
  await p.fill('input[name="password"]', pwd);
  await p.fill('input[name="passwordConfirm"]', pwd);
  await p.check('input[name="acceptAge"]', { force: true });
  await p.check('input[name="acceptTerms"]', { force: true });
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900);
  await p.close();
}
async function login(ctx, tail, pwd) {
  const p = await ctx.newPage();
  await p.goto(`${BASE}/auth/login`, { waitUntil: "networkidle" });
  await p.fill("#phone", tail);
  await p.fill('input[name="password"]', pwd);
  await p.click('button[type="submit"]');
  await p.waitForTimeout(900);
  await p.close();
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await fetch(`${BASE}/api/dev-test/reset-rate-limits`, { method: "POST" }).catch(() => {});

const pwd = "Smoke!2026";
const tail = phoneTail();
await reg(ctx, tail, pwd);
const promo = await fetch(`${BASE}/api/dev-test/promote-admin`, {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ phone: "+255" + tail }),
}).then(r => r.json()).catch(() => null);
log("0a admin promoted", promo?.role === "ADMIN");
await login(ctx, tail, pwd);

// Pull session cookies for the API requests
const cookies = await ctx.cookies();
const cookieHeader = cookies.map(c => `${c.name}=${c.value}`).join("; ");

for (const id of REPORTS) {
  for (const fmt of ["pdf", "xlsx"]) {
    try {
      const url = `${BASE}/api/admin/reports/${id}?format=${fmt}`;
      const r = await fetch(url, { headers: { cookie: cookieHeader } });
      const buf = Buffer.from(await r.arrayBuffer());
      const ok = r.ok && buf.length > 1024;
      const sig = fmt === "pdf"
        ? buf.subarray(0, 4).toString() === "%PDF"
        : buf[0] === 0x50 && buf[1] === 0x4b; // ZIP magic
      log(`${id} · ${fmt} non-empty + signature`, ok && sig, `${(buf.length / 1024).toFixed(1)}kb`);
      if (ok) writeFileSync(resolve(OUT, `${id}.${fmt}`), buf);
    } catch (e) {
      log(`${id} · ${fmt} render`, false, String(e?.message ?? e));
    }
  }
}

await ctx.close();
await browser.close();
console.log(`\n${"=".repeat(60)}\nREPORTS SMOKE  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
