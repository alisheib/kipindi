/**
 * `node scripts/live/e253-bulk-bar-drive.mjs` — drive E-253's bulk bar on PRODUCTION.
 *
 * ⛔ SAFETY, FIRST AND ABSOLUTELY. This page SEALS REAL MARKETS AND MOVES REAL MONEY.
 *   · It only TICKS CHECKBOXES. Selecting is a read-only act the queue is designed for.
 *   · It NEVER presses the primary button, never opens the confirmation, never types the
 *     `RESOLVE` word that arms it. Those are the controls that settle money.
 *   · It clears the selection before it leaves.
 *
 * ⭐ WHAT IT PROVES, and none of it is provable from a unit suite: with rows the resolver
 * REFUSED selected, an ADMIN sees (a) the note field is OPTIONAL — the seal button is ARMED
 * with the box empty, which is Ali's ruling made visible — and (b) the button's tooltip
 * states what pressing it will do rather than demanding a sentence.
 *
 * ⚠️ IF NO REFUSED-BUT-OVERRIDABLE ROW IS IN THE QUEUE TONIGHT, THAT IS NOT A PASS. The
 * drive says so and exits non-zero, rather than reporting green over a surface it never saw.
 */
import { chromium } from "playwright";
import { login, BASE } from "./harness.mjs";

const WIDTHS = [360, 768, 1280, 1920];
const OUT = process.env.SHOT_DIR ?? "C:/Users/Ali/AppData/Local/Temp/claude/shots";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await ctx.newPage();
let bad = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) bad++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
};

try {
  await login(page, "admin");
  await page.goto(`${BASE}/admin/resolver-queue?window=all`, { waitUntil: "networkidle" });
  ok("0.1 the resolver queue loaded as ADMIN", /resolver-queue/.test(page.url()), page.url());

  /**
   * ⛔ SELECT FIRST, THEN LOOK — the first version of this drive had it backwards and
   * reported "0 refused rows" over a healthy queue.
   *
   * `row-select.tsx` computes `needsOverride = on && !verdict.eligible && verdict.overridable`,
   * where `on` means SELECTED. So "Needs an override" cannot exist before anything is ticked,
   * and searching for it up front finds zero on every possible queue — a drive that could
   * only ever report the surface missing. Tick rows one at a time until the bar's own
   * optional-note panel appears; that panel IS the state under test.
   */
  const boxes = page.getByRole("checkbox", { name: /^Select / });
  const total = await boxes.count();
  console.log(`selectable rows on page: ${total}`);

  let armed = false;
  for (let i = 0; i < total; i++) {
    await boxes.nth(i).check({ force: true }).catch(() => {});
    await page.waitForTimeout(500);
    if (/Anything to add about/i.test(await page.locator("body").innerText())) { armed = true; break; }
  }
  // ⚠️ A "no" from this drive must say WHAT the queue held instead, or it is unactionable.
  if (!armed) {
    const lines = (await page.locator("body").innerText()).split("\n");
    const chips = [...new Set(lines.filter((l) =>
      /refused|below the configured floor|different site|not a trusted source|evidence|countersignature|still open|eligible/i.test(l)))].slice(0, 10);
    console.log("verdict lines present on the queue tonight:");
    for (const c of chips) console.log("  - " + c.trim());
  }
  ok("1.1 a refused-but-overridable row could be selected on the live queue",
     armed, armed ? "" : `none of the first ${total} rows is refused-but-overridable tonight`);

  if (!armed) {
    console.log("\n⛔ NOT A PASS. The surface under test only exists once such a row is selected,");
    console.log("   and tonight's queue offered none. Re-run when the queue holds a refused row.");
    process.exit(1);
  }
  await page.waitForTimeout(600);

  const body = await page.locator("body").innerText();
  ok("2.1 the note field is offered as OPTIONAL, not as a toll gate",
     /Anything to add about/i.test(body) && /Optional/i.test(body));
  ok("2.2 …and the hint states what is recorded even with an empty note",
     /is recorded with its own outcome, confidence, floor and cited source/i.test(body));
  ok("2.3 ⛔ the old typed-reason demand is GONE",
     !/Type why you are sealing/i.test(body) && !/at least 12 characters/i.test(body));

  // ⭐ ALI'S RULING, MADE VISIBLE: the seal button is ARMED with the note box empty.
  const sealBtn = page.locator("[data-bulk-bar]").getByRole("button", { name: /Resolve selected|Stage selected/i });
  const disabled = await sealBtn.first().isDisabled().catch(() => true);
  ok("3.1 ⭐ the seal button is ARMED with the note EMPTY (the owner's ruling, on screen)",
     disabled === false, disabled ? "still disabled — the ruling is not implemented on the live page" : "");
  const title = await sealBtn.first().getAttribute("title");
  ok("3.2 …and its tooltip states what pressing it does, not what to type",
     !!title && /refused by the resolver/i.test(title) && !/at least/i.test(title), String(title));

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: w === 360 ? 820 : 950 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${OUT}/e253-bulk-bar-${w}.png`, fullPage: true });
    console.log(`  shot ${w}px → ${OUT}/e253-bulk-bar-${w}.png`);
  }
} finally {
  // ⛔ LEAVE THE CONSOLE AS IT WAS FOUND. A selection left ticked is a loaded control
  // sitting in front of whoever opens this page next.
  try {
    const clear = page.getByRole("button", { name: /^Clear$/i });
    if (await clear.count() > 0) await clear.first().click({ timeout: 5000 });
  } catch { /* the page may already be gone */ }
  await browser.close();
}

console.log(`\n${bad === 0 ? "ALL PASS" : "FAILURES"} — ${bad} failed`);
process.exit(bad === 0 ? 0 : 1);
