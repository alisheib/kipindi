/**
 * `node scripts/live/e254-sources-drive.mjs` — drive E-254 on PRODUCTION, safely.
 *
 * ⛔ THE SAFETY ARGUMENT COMES FIRST, BECAUSE THIS TYPES INTO A REAL ADMIN FORM.
 *
 *  ① It submits `bbc.com`, a domain measured as BLOCKED to Anthropic's fetcher. On the NEW
 *     code that submit is REFUSED and writes nothing — no registry row, no audit row beyond
 *     the refusal itself. That refusal is the whole thing being verified.
 *  ② 🔴 ON THE OLD CODE THE SAME SUBMIT WOULD SIMPLY ADD `bbc.com` TO THE PRODUCTION
 *     TRUSTED-SOURCE REGISTRY. So the drive REFUSES TO SUBMIT until it has proved the new
 *     bundle is actually being served, by finding a string that exists only in this
 *     change — `Choose another source` — inside the page's own JavaScript chunks.
 *     A deploy check that trusted a timestamp, or trusted me, would not be a deploy check.
 *  ③ It never presses *Add it anyway*. That button is the one that writes.
 *  ④ 🔴 AND THE DEPLOY GATE IS NOT SUFFICIENT ON ITS OWN, which the first run proved. The
 *     probe FAILS OPEN by design, so a probe that is merely BROKEN also lets the add
 *     through — new code, correct logic, row written anyway. Hence the unconditional
 *     cleanup in `finally`: this drive owns whatever it creates, however it exits.
 *
 * ⭐ AND IT ASSERTS A NEGATIVE AFTERWARDS: the registry must NOT contain bbc.com when the
 * drive finishes. A refusal that quietly wrote anyway is precisely the failure a screenshot
 * of a nice red panel would hide.
 */
import { chromium } from "playwright";
import { login, BASE } from "./harness.mjs";

const WIDTHS = [360, 768, 1280, 1920];
const OUT = process.env.SHOT_DIR ?? "C:/Users/Ali/AppData/Local/Temp/claude/shots";
const MARKER = "Choose another source";
/** Unique to this drive, so cleanup can never match somebody else's row. */
const RATIONALE = "QA drive for E-254 - verifying the crawler-block refusal. This must NOT be added.";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
let bad = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) bad++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

try {
  await login(page, "admin");
  await page.goto(`${BASE}/admin/sources`, { waitUntil: "networkidle" });
  ok("0.1 the sources page loaded as ADMIN", /\/admin\/sources/.test(page.url()), page.url());

  // ── THE DEPLOY GATE ────────────────────────────────────────────────────────
  // Read every script the page actually loaded and look for the new string.
  const srcs = await page.$$eval("script[src]", (ns) => ns.map((n) => n.src));
  let deployed = false;
  for (const s of srcs) {
    const r = await page.request.get(s).catch(() => null);
    if (!r || !r.ok()) continue;
    if ((await r.text()).includes(MARKER)) { deployed = true; break; }
  }
  ok(`1.1 the NEW bundle is live (found "${MARKER}" in a served chunk)`, deployed,
     deployed ? `${srcs.length} chunks scanned` : `NOT FOUND in ${srcs.length} chunks — refusing to submit`);

  if (!deployed) {
    console.log("\n⛔ STOPPING BEFORE THE SUBMIT. On the old code this form would ADD bbc.com to");
    console.log("   the production registry. Re-run once Railway has finished deploying.");
    process.exit(1);
  }

  // ── THE DRIVE ──────────────────────────────────────────────────────────────
  await page.getByRole("button", { name: /Add source/i }).first().click();
  await page.locator('[data-field="domain"] input, input[name="domain"]').first().fill("bbc.com");
  await page.locator('input[name="label"]').first().fill("BBC News");
  await page.locator('textarea[name="rationale"]').first()
    .fill(RATIONALE);

  await page.getByRole("button", { name: /^Add source$/i }).click();
  const panel = page.getByText(/cannot be read directly by the AI/i);
  await panel.waitFor({ state: "visible", timeout: 30_000 });

  ok("2.1 the refusal panel appeared", await panel.isVisible());
  const body = await page.locator("body").innerText();
  ok("2.2 …and it names the domain", /bbc\.com/i.test(body));
  ok("2.3 …and says the source still works rather than implying breakage", /still work/i.test(body));
  ok("2.4 …and offers the deliberate second attempt", /Add it anyway/i.test(body));
  ok("2.5 …and an exit that is not it", new RegExp(MARKER, "i").test(body));

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w === 360 ? 800 : 900 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/e254-sources-${w}.png`, fullPage: true });
    console.log(`  shot ${w}px → ${OUT}/e254-sources-${w}.png`);
  }

  // ── THE NEGATIVE THAT MATTERS ──────────────────────────────────────────────
  // ⛔ A refusal that wrote anyway would look identical on screen.
  await page.goto(`${BASE}/admin/sources`, { waitUntil: "networkidle" });
  const after = await page.locator("body").innerText();
  ok("3.1 ⛔ bbc.com was NOT added to the production registry",
     !/bbc\.com/i.test(after), "bbc.com IS PRESENT — the refusal wrote a row");
} finally {
  /**
   * 🔴 CLEANUP IS UNCONDITIONAL, AND IT IS HERE BECAUSE THE FIRST RUN OF THIS DRIVE ADDED
   * `bbc.com` TO THE PRODUCTION REGISTRY AND LEFT IT THERE.
   *
   * The probe returned `unknown` (the triage model could not hold `web_fetch`), so the
   * fail-open path did exactly what it promised and the add went through — while the drive
   * threw on a panel that never appeared and never reached its own assertion. A drive that
   * types into a live admin form OWNS whatever it creates, in a `finally`, whether it passed,
   * failed, or died on a selector.
   */
  try {
    await page.goto(`${BASE}/admin/sources`, { waitUntil: "networkidle" });
    const row = page.locator("div,li,tr").filter({ hasText: RATIONALE }).last();
    if (await row.count() > 0) {
      console.log("⚠️  a row was created — removing it");
      await row.getByRole("button", { name: /^Remove$/i }).last().click();
      // The dialog's confirm button reads "Remove source", NOT "Remove".
      await page.getByRole("button", { name: /^Remove source$/i }).click({ timeout: 15_000 });
      await page.waitForTimeout(2500);
      await page.goto(`${BASE}/admin/sources`, { waitUntil: "networkidle" });
      const t = await page.locator("body").innerText();
      console.log(t.includes(RATIONALE) ? "🔴 CLEANUP FAILED — remove it by hand" : "✅ cleaned up");
    }
  } catch (e) {
    console.error("🔴 CLEANUP THREW — check /admin/sources by hand:", String(e).slice(0, 200));
  }
  await browser.close();
}

console.log(`\n${bad === 0 ? "ALL PASS" : "FAILURES"} — ${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
