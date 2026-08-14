/**
 * PROBE THE POLL MARKET PAGE'S DOM CONTRACT — never remember it, re-read it.
 *
 *   MKT=mkt_x node scripts/live/probe-poll-card.mjs
 *
 * ⛔ WHY. Two driver attempts timed out on a page that was working perfectly: first on a
 * stake box that does not exist until a side is chosen, then on a `^YES$` text filter that
 * did not match the control. Guessing costs a full run each time; this costs thirty seconds.
 * Same precedent as `probe-updown-card.mjs`.
 */
import { BASE, browser, login } from "./harness.mjs";

const MKT = process.env.MKT;
const WHO = process.env.WHO ?? "fleet:15";
const { b, ctx } = await browser();
const page = await ctx.newPage();
try {
  await login(page, WHO);
  // SIDE=NO reproduces the state a hedging player is actually in — the panel renders
  // differently once they hold a position, which is how a working page timed out a driver.
  const q = process.env.SIDE ? `?side=${process.env.SIDE}` : "";
  await page.goto(`${BASE}/markets/${MKT}${q}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main", { timeout: 45_000 });
  await page.waitForTimeout(3_000);

  const dump = async (label) => {
    const btns = await page.evaluate(() => [...document.querySelectorAll("button")].map((x, i) => ({
      i,
      text: (x.innerText || "").replace(/\s+/g, " ").trim().slice(0, 44),
      tc: (x.textContent || "").replace(/\s+/g, " ").trim().slice(0, 44),
      aria: x.getAttribute("aria-label"),
      disabled: x.disabled,
    })).filter((x) => x.text || x.aria));
    console.log(`\n=== BUTTONS · ${label} ===`);
    for (const x of btns) console.log(`  [${String(x.i).padStart(2)}] text=${JSON.stringify(x.text)} tc=${JSON.stringify(x.tc)} aria=${JSON.stringify(x.aria)}${x.disabled ? " DISABLED" : ""}`);
    const ins = await page.evaluate(() => [...document.querySelectorAll("input,textarea")].map((x, i) => ({
      i, tag: x.tagName, type: x.type, mode: x.inputMode, aria: x.getAttribute("aria-label"), ph: x.placeholder, val: x.value,
    })));
    console.log(`--- INPUTS · ${label} ---`);
    for (const x of ins) console.log(`  [${String(x.i).padStart(2)}] ${x.tag} type=${x.type} inputmode=${x.mode} aria=${JSON.stringify(x.aria)} ph=${JSON.stringify(x.ph)} val=${JSON.stringify(x.val)}`);
  };

  await dump("initial");

  // ⭐ WHICH LOCATOR ACTUALLY RESOLVES? Measure it; do not reason about it. A locator that
  // resolves but has no bounding box is present-but-unclickable, and Playwright's timeout for
  // that reads exactly like "not found" — which is why the driver's one-line error was useless.
  const strategies = {
    "text filter ^YES$":        page.locator("button").filter({ hasText: /^YES$/ }),
    "text filter ^NO$":         page.locator("button").filter({ hasText: /^NO$/ }),
    "getByRole name=Back YES":  page.getByRole("button", { name: "Back YES", exact: true }),
    "aria-label attr Back YES": page.locator('button[aria-label="Back YES"]'),
    "getByRole name /^YES/":    page.getByRole("button", { name: /^YES/i }),
  };
  console.log("\n=== LOCATOR STRATEGIES ===");
  for (const [name, loc] of Object.entries(strategies)) {
    let n, box = null;
    try { n = await loc.count(); } catch (e) { n = `ERR ${e.message.slice(0, 40)}`; }
    if (typeof n === "number" && n > 0) box = await loc.first().boundingBox().catch(() => null);
    const suffix = box ? ` box ${Math.round(box.width)}x${Math.round(box.height)}`
                       : (typeof n === "number" && n > 0 ? "  NO BOX (unclickable)" : "");
    console.log(`  ${String(n).padStart(3)} match(es)  ${name}${suffix}`);
  }

  // Now pick a side the way a player does, and dump again — the stake control only exists after.
  const yes = page.getByRole("button", { name: /^YES/i }).first();
  if (await yes.isVisible().catch(() => false)) {
    await yes.click();
    await page.waitForTimeout(1_500);
    await dump("after picking YES");
  } else {
    console.log("\n(no YES button matched getByRole name /^YES/i)");
  }
} finally { await b.close(); }
