/**
 * Admin smoke E2E — visits EVERY admin page at desktop + mobile and asserts:
 *   - no console errors / page errors (minus dev-eval noise)
 *   - no horizontal overflow (scrollWidth ≈ clientWidth)
 *   - no error.tsx "hit a snag" boundary
 *
 *   BASE=http://localhost:3009 node scripts/admin-smoke-e2e.mjs
 */
import { chromium, devices } from "playwright";

const B = process.env.BASE || "http://localhost:3009";
let pass = 0; const failures = [];
const ok = (l, c, x = "") => { c ? (pass++, console.log(`  ✓ ${l}`)) : (failures.push(`${l} ${x}`), console.log(`  ✗ ${l} ${x}`)); };
const isNoise = (t) => /eval|DevTools|React will never use eval|favicon|Failed to load resource|net::ERR|Download the React/i.test(t);

const STATIC = [
  "/admin", "/admin/live", "/admin/finance", "/admin/reports", "/admin/players",
  "/admin/players/cohorts", "/admin/sources", "/admin/config",
  "/admin/ai-polls", "/admin/candidates", "/admin/proposals", "/admin/markets",
  "/admin/markets/new", "/admin/resolver-queue", "/admin/affiliate", "/admin/moderation",
  "/admin/compliance", "/admin/aml", "/admin/self-exclusions", "/admin/audit",
  "/admin/system", "/admin/approvals", "/admin/retention", "/admin/privacy",
];

const br = await chromium.launch();
async function setup(ctx) {
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const p = await ctx.newPage();
  await p.goto(`${B}/auth/demo`, { waitUntil: "networkidle" });
  await p.request.post(`${B}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });
  return p;
}

async function sweep(label, ctx, extraPaths) {
  const p = await setup(ctx);
  const paths = [...STATIC, ...extraPaths];
  for (const path of paths) {
    const errs = [];
    const onMsg = (m) => { if (m.type() === "error" && !isNoise(m.text())) errs.push(m.text()); };
    const onErr = (e) => errs.push(String(e));
    p.on("console", onMsg); p.on("pageerror", onErr);
    let overflow = 0, snag = false, code = 0;
    try {
      const resp = await p.goto(`${B}${path}`, { waitUntil: "networkidle", timeout: 20000 });
      code = resp ? resp.status() : 0;
      await p.waitForTimeout(250);
      overflow = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      snag = /hit a snag|Application error/i.test(await p.locator("body").innerText());
    } catch (e) { errs.push(`nav: ${String(e).slice(0, 80)}`); }
    p.off("console", onMsg); p.off("pageerror", onErr);
    ok(`[${label}] ${path} — clean`, code < 400 && !snag && errs.length === 0 && overflow <= 1,
       `${code >= 400 ? `HTTP ${code} ` : ""}${snag ? "SNAG " : ""}${overflow > 1 ? `overflow ${overflow}px ` : ""}${errs.slice(0, 2).join(" | ")}`);
  }
  await p.close();
}

try {
  // Seed a player so we can drill into /admin/players/<id>?tab=kyc.
  const tmp = await br.newContext();
  const tp = await tmp.newPage();
  await tp.goto(`${B}/auth/demo`, { waitUntil: "networkidle" });
  await tp.request.post(`${B}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });
  const seed = await (await tp.request.post(`${B}/api/dev-test/seed-kyc`, { data: { status: "PENDING_REVIEW" } })).json();
  await tmp.close();
  const drill = [`/admin/players/${seed.userId}?tab=kyc`, `/admin/players/${seed.userId}?tab=activity`];

  const desk = await br.newContext({ viewport: { width: 1366, height: 900 } });
  await sweep("desktop", desk, drill);
  await desk.close();

  const mob = await br.newContext({ ...devices["Pixel 7"] });
  await sweep("mobile", mob, drill);
  await mob.close();
} catch (e) {
  ok("smoke ran without throwing", false, String(e));
}
await br.close();
console.log(`\n${failures.length === 0 ? "✅ ALL ADMIN PAGES CLEAN" : "❌ FAILURES"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
