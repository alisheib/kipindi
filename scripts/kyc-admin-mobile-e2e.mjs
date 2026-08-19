/**
 * D2 · qa:cert-d2 — the KYC surfaces at every width, and tappable on a phone.
 *
 * A compliance officer reviews "on the run". If the decision controls are under
 * 44px, or the workstation overflows horizontally, the officer either mis-taps a
 * decision that moves money or gives up and approves from memory later. So this is
 * an ergonomics gate, not a cosmetic one.
 *
 * ⚠️ ADOPTED 2026-07-31 after sitting UNRUN in scripts/orphan-allowlist.json.
 * As written it could not pass: it used `waitUntil: "networkidle"` (never fires —
 * /api/events is an open SSE stream), drove /admin/players/[id]?tab=kyc (officer
 * review has since MOVED to the workstation at /admin/kyc/[id], and that tab is
 * additionally gated on the canView(role,"compliance") grant added 2026-07-28), and
 * wrote its screenshot to a POSIX-only /tmp path.
 *
 * Rescoped to what it uniquely proves — ergonomics and layout — since the officer
 * DECISION state machine is covered headlessly by `npm run test:kyc` and the journey
 * by `npm run qa:cert-d1`. Widths per the 50pick standard: 360 / 768 / 1280 / 1920.
 *
 * Needs a running server (NODE_ENV != production):
 *   BASE=http://localhost:3009 npm run qa:cert-d2
 */
import { chromium, devices } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3009";
const SHOTS = ".50pick-shots/cert-d2";
let pass = 0; const failures = [];
const ok = (l, c, x = "") => { c ? (pass++, console.log(`  ✓ ${l}`)) : (failures.push(`${l} ${x}`), console.log(`  ✗ ${l} ${x}`)); };

mkdirSync(SHOTS, { recursive: true });
const browser = await chromium.launch();
const errs = [];

const overflowOf = (page) => page.evaluate(() =>
  document.documentElement.scrollWidth - document.documentElement.clientWidth);

try {
  // ── Fixtures: an admin session and a submission actually awaiting review ──
  const ctx = await browser.newContext({ ...devices["Pixel 7"] }); // 412×915, isMobile, touch
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error" && !/eval|DevTools|React will never use eval|404|Failed to load resource|navigator.vibrate/.test(m.text())) errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));

  await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
  const promote = await page.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });
  ok("promote-admin ok", promote.ok());
  const seedRes = await page.request.post(`${BASE}/api/dev-test/seed-kyc`, { data: { status: "PENDING_REVIEW" } });
  const seed = await seedRes.json();
  ok("seed-kyc ok", seedRes.ok() && !!seed.userId, JSON.stringify(seed));

  const workstation = `${BASE}/admin/kyc/${seed.userId}`;

  // ── 1 · Phone ergonomics on the decision controls ──
  await page.goto(workstation, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  ok("workstation reachable on a phone", /Approve identity|Reject/i.test(body), body.slice(0, 120).replace(/\n+/g, " "));

  // Every decision the officer can take must be a real 44px target (WCAG 2.5.5).
  for (const name of [/Approve identity/i, /^Reject$/i, /Escalate AML/i]) {
    const btn = page.getByRole("button", { name }).first();
    if (!(await btn.count())) { ok(`decision control ${name} present`, false); continue; }
    const box = await btn.boundingBox();
    ok(`decision control ${String(name)} is ≥44px tall`,
      !!box && box.height >= 44, box ? `(${Math.round(box.height)}px)` : "(no box)");
  }

  // The document viewer's slot tabs are how an officer actually inspects evidence.
  for (const name of [/ID FRONT/i, /ID BACK/i, /SELFIE/i]) {
    const tab = page.getByRole("button", { name }).first();
    if (!(await tab.count())) { ok(`viewer tab ${String(name)} present`, false); continue; }
    const box = await tab.boundingBox();
    ok(`viewer tab ${String(name)} is ≥44px tall`,
      !!box && box.height >= 44, box ? `(${Math.round(box.height)}px)` : "(no box)");
  }
  await page.screenshot({ path: `${SHOTS}/workstation-phone.png`, fullPage: true });
  await ctx.close();

  // ── 2 · The 50pick width standard, on both KYC surfaces ──
  for (const width of [360, 768, 1280, 1920]) {
    const wctx = await browser.newContext({ viewport: { width, height: 900 } });
    await wctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
    const wp = await wctx.newPage();
    wp.on("console", (m) => { if (m.type() === "error" && !/eval|DevTools|React will never use eval|404|Failed to load resource|navigator.vibrate/.test(m.text())) errs.push(m.text()); });
    wp.on("pageerror", (e) => errs.push(String(e)));

    // Officer surface (needs the admin session, so re-establish it in this context).
    await wp.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
    await wp.request.post(`${BASE}/api/dev-test/promote-admin`, { data: { phone: "+255700000000" } });
    await wp.goto(workstation, { waitUntil: "domcontentloaded" });
    await wp.waitForTimeout(1200);
    ok(`workstation @${width}px: no horizontal overflow`, (await overflowOf(wp)) <= 1,
      `(overflow=${await overflowOf(wp)}px)`);
    await wp.screenshot({ path: `${SHOTS}/workstation-${width}.png`, fullPage: true });

    // Player surface, in the three states that matter: empty, mid-flow, rejected.
    const fresh = await (await wp.request.post(`${BASE}/api/dev-test/fresh-kyc-player`, { data: { state: "none" } })).json();
    await wp.goto(`${BASE}/profile/kyc`, { waitUntil: "domcontentloaded" });
    await wp.waitForTimeout(900);
    ok(`player KYC (no documents) @${width}px: no horizontal overflow`, (await overflowOf(wp)) <= 1);
    await wp.screenshot({ path: `${SHOTS}/player-empty-${width}.png`, fullPage: true });

    // A REJECTING NIDA (ends 9999 → MISMATCH) so the rejection panel renders — the
    // panel that was unreachable dead code until 2026-07-31.
    // ⚠️ The field is `#idNumber` from 2026-08-20 (it was `#nida` while NIDA was the
    // only accepted document). The MISMATCH hook lives in the NIDA mock, so this
    // shot deliberately stays on the NIDA journey — it is proving the REJECTION
    // panel, not the chooser.
    await wp.fill("#idNumber", "199001" + String(Date.now()).slice(-10) + "9999");
    await wp.fill("#fullName", "Asha Mwamba Juma");
    await wp.fill("#email", `rej${String(Date.now()).slice(-6)}@example.com`);
    await wp.getByRole("button", { name: /Continue verification/ }).click();
    await wp.waitForTimeout(2500);
    const rejBody = await wp.locator("body").innerText();
    ok(`🔴 rejected player is TOLD they were rejected @${width}px`,
      /Rejected/i.test(rejBody) && !/Document details accepted/i.test(rejBody),
      "Until 2026-07-31 this showed a green 'NIDA number accepted' banner while the\n" +
      "    player's inbox held 'Identity check needs attention'.");
    ok(`player KYC (rejected) @${width}px: no horizontal overflow`, (await overflowOf(wp)) <= 1);
    await wp.screenshot({ path: `${SHOTS}/player-rejected-${width}.png`, fullPage: true });
    if (fresh.userId) { /* fixture consumed */ }
    await wctx.close();
  }

  ok("no console / page errors across every width", errs.length === 0, errs.slice(0, 3).join(" | "));
} catch (e) {
  ok("e2e ran without throwing", false, String(e));
}

await browser.close();
console.log(`\n  Screenshots: ${SHOTS}/ — LOOK at them; a green suite is not a readable screen.`);
console.log(`${failures.length === 0 ? "✅ ALL PASS" : "❌ FAILURES"} — ${pass} passed, ${failures.length} failed`);
if (failures.length) { failures.forEach((f) => console.log("  - " + f)); process.exit(1); }
