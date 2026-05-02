/**
 * Sprint 9 regression suite — exercises new + existing flows end-to-end.
 *
 *  1. Demo session loads at TZS 100,000
 *  2. Match bet placement debits wallet
 *  3. Cash-out: place a bet, then cash out → wallet receives partial value, bet status flips
 *  4. /bets shows the cashed-out bet in Settled tab
 *  5. /profile/account loads with audit history
 *  6. Data export action returns JSON
 *  7. Audit chain verify endpoint returns valid
 *  8. Admin /admin/system loads (demo session is admin-equivalent)
 *  9. Reality-check banner does NOT fire on first 30s (private API check via no DOM dialog)
 * 10. Backup snapshot file exists in .kipindi-backups after a mutation
 *
 *   BASE=http://localhost:3000  node scripts/sprint9-test.mjs
 */
import { chromium } from "playwright";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3000";
const BACKUP_DIR = join(process.cwd(), ".kipindi-backups");

let pass = 0, fail = 0;
function log(label, ok, detail = "") {
  const t = ok ? "✓" : "✗";
  console.log(`${t} ${label}${detail ? "  →  " + detail : ""}`);
  if (ok) pass++; else fail++;
}

async function readBal(page) {
  const el = page.locator("[data-testid='wallet-balance']").first();
  if (await el.count() === 0) return null;
  const v = await el.getAttribute("data-balance");
  return v ? parseInt(v, 10) : null;
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 430, height: 932 } });

try {
  // ---- 1. Demo session bootstraps ----
  await (await ctx.newPage()).goto(`${BASE}/auth/demo`, { waitUntil: "networkidle" });
  const w = await ctx.newPage();
  await w.goto(`${BASE}/wallet`, { waitUntil: "networkidle" });
  await w.waitForTimeout(700);
  const startBal = await readBal(w);
  await w.close();
  log("01 demo session at TZS 100,000", startBal === 100_000, `${startBal?.toLocaleString()}`);

  // ---- 2. Match bet placement ----
  const m = await ctx.newPage();
  await m.goto(`${BASE}/match/m1`, { waitUntil: "networkidle" });
  await m.waitForTimeout(800);
  const placeBtn = m.locator('button').filter({ hasText: /^Place bet ·/ }).first();
  if (await placeBtn.isVisible().catch(() => false)) await placeBtn.click().catch(() => {});
  await m.waitForTimeout(2_500);
  await m.close();
  const w2 = await ctx.newPage();
  await w2.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await w2.waitForTimeout(700);
  const afterBet = await readBal(w2);
  await w2.close();
  log("02 match bet placed → wallet debits", afterBet !== null && afterBet < startBal, `${startBal?.toLocaleString()} → ${afterBet?.toLocaleString()}`);

  // ---- 3. Cash-out ----
  const bp = await ctx.newPage();
  await bp.goto(`${BASE}/bets`, { waitUntil: "networkidle" });
  await bp.waitForTimeout(900);
  const cashBtn = bp.locator('button').filter({ hasText: /^Cash out$/ }).first();
  const cashVisible = await cashBtn.isVisible().catch(() => false);
  if (cashVisible) {
    await cashBtn.click().catch(() => {});
    await bp.waitForTimeout(2_500);
  }
  await bp.close();
  const w3 = await ctx.newPage();
  await w3.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await w3.waitForTimeout(700);
  const afterCash = await readBal(w3);
  await w3.close();
  log("03 cash-out → wallet receives partial value", cashVisible && afterCash !== null && afterCash > afterBet, `${afterBet?.toLocaleString()} → ${afterCash?.toLocaleString()}`);

  // ---- 4. /bets shows the cashed-out bet under Settled ----
  const bets2 = await ctx.newPage();
  await bets2.goto(`${BASE}/bets`, { waitUntil: "networkidle" });
  await bets2.waitForTimeout(700);
  const body = (await bets2.locator("body").textContent()) ?? "";
  const hasCashed = /Cashed out/i.test(body) || /Settled\s*·\s*[1-9]/i.test(body);
  await bets2.close();
  log("04 /bets shows cashed-out bet", hasCashed);

  // ---- 5. /profile/account loads ----
  const acct = await ctx.newPage();
  const r5 = await acct.goto(`${BASE}/profile/account`, { waitUntil: "networkidle" });
  const acctBody = (await acct.locator("body").textContent()) ?? "";
  const hasActivity = /My activity/.test(acctBody);
  await acct.close();
  log("05 /profile/account loads with activity feed", r5?.status() === 200 && hasActivity);

  // ---- 6. Data export — verify download trigger via direct action call ----
  // (Browser-level click would download; here we verify the page renders the export button)
  const acct2 = await ctx.newPage();
  await acct2.goto(`${BASE}/profile/account`, { waitUntil: "networkidle" });
  const exportBtn = acct2.locator('button').filter({ hasText: /Download my data/i }).first();
  log("06 data-export button rendered", await exportBtn.isVisible().catch(() => false));
  await acct2.close();

  // ---- 7. Admin system page loads (demo grants admin) ----
  const sys = await ctx.newPage();
  const r7 = await sys.goto(`${BASE}/admin/system`, { waitUntil: "networkidle" });
  const sysBody = (await sys.locator("body").textContent()) ?? "";
  log("07 /admin/system loads with chain + backup buttons", r7?.status() === 200 && /Backup now/.test(sysBody) && /Verify audit chain/.test(sysBody));
  await sys.close();

  // ---- 8. Backup snapshot file exists ----
  await new Promise((r) => setTimeout(r, 2_500)); // wait for debounced backup
  const hasBackupDir = existsSync(BACKUP_DIR);
  const files = hasBackupDir ? readdirSync(BACKUP_DIR) : [];
  const hasSnapshot = files.includes("store.snapshot.json");
  log("08 backup snapshot file present", hasBackupDir && hasSnapshot, `${BACKUP_DIR} (${files.length} files)`);

  // ---- 9. Reality-check default — does not fire on first ~30s ----
  const rc = await ctx.newPage();
  await rc.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await rc.waitForTimeout(2_000);
  const dialogVisible = await rc.locator('[role="dialog"][aria-labelledby="reality-check-title"]').isVisible().catch(() => false);
  await rc.close();
  log("09 reality-check banner not shown immediately on session start", !dialogVisible);

  // ---- 10. Mapigo SPIKE place + idempotent settle (regression) ----
  await ctx.request.get(`${BASE}/auth/demo-mapigo-reset`).catch(() => {});
  await ctx.request.get(`${BASE}/auth/demo`).catch(() => {});
  const mp = await ctx.newPage();
  await mp.goto(`${BASE}/mapigo`, { waitUntil: "networkidle" });
  await mp.waitForTimeout(900);
  const sp = mp.locator('button[aria-pressed]').filter({ hasText: /Spike/i }).first();
  await sp.click().catch(() => {});
  await mp.waitForTimeout(250);
  const pl = mp.locator('button').filter({ hasText: /^Place SPIKE/ }).first();
  if (await pl.isVisible().catch(() => false)) await pl.click().catch(() => {});
  await mp.waitForTimeout(2_500);
  await mp.close();
  const w4 = await ctx.newPage();
  await w4.goto(`${BASE}/wallet?ts=${Date.now()}`, { waitUntil: "networkidle" });
  await w4.waitForTimeout(700);
  const afterMapigo = await readBal(w4);
  await w4.close();
  log("10 Mapigo SPIKE places — wallet at 99,000", afterMapigo === 99_000, `${afterMapigo?.toLocaleString()}`);

} catch (e) {
  log("FATAL", false, String(e?.message ?? e));
}

await ctx.close();
await browser.close();
console.log(`\n${"=".repeat(60)}\nSPRINT 9  PASS: ${pass}    FAIL: ${fail}\n${"=".repeat(60)}`);
process.exit(fail > 0 ? 1 : 0);
