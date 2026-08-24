/**
 * Visual + a11y + responsiveness check for RECOVERY's Phone/Email switcher.
 *
 *   npm run dev            # in-memory, :3000
 *   npm run qa:reset-identifier
 *
 * Recovery accepts a phone OR an email as of 2026-08-25, using the SAME
 * `LoginIdentifier` control the sign-in page uses. This drives the real page at
 * every width in the campaign's set × all three locales and asserts what a
 * player can actually see and reach.
 *
 * ⚠️ 360 IS NOT OPTIONAL and neither is ZH. The campaign's own record: a control
 * clipped at 1024 in SWAHILI only, and an English-only sweep would have certified
 * the repair 9px short for the language most of this platform's players read.
 *
 * ⭐ AND IT ASSERTS THE TWO *DIFFERENT* CONFIRMATIONS. The whole point of the
 * change is that the two entry paths do not carry the same guarantee: an address
 * is somewhere we can send to by construction, a number may belong to an account
 * with no email at all (34 of 100 production accounts). So the sent screen must
 * say two different things, and this checks that it does — otherwise the
 * distinction exists only in the source.
 *
 * ⛔ OVERFLOW IS NOT REACHABILITY. `scrollWidth - clientWidth` reads 0 on this
 * app because `body` has `overflow-x: clip` (E-190), so the document never learns
 * it was too wide.
 *
 * ⭐ AND THE REACHABILITY RULE IS **IMPORTED**, NOT REWRITTEN. A first draft of
 * this file hand-rolled "is any control outside the viewport?" and immediately
 * reported 10 failures — `LanguageMenu`'s three listbox rows at left −63 in every
 * locale at 360/393. They are not defects: a CLOSED `<details>` still lays its
 * subtree out with `visibility: visible` and `opacity: 1`, and Chrome neither
 * paints nor hit-tests it (the hit-test at their centre returns a different
 * element). `clip.mjs` already documents that exemption, having paid ~200 false
 * failures per surface to learn it. Two definitions of "not really a defect" is
 * two chances to disagree — so this imports the one the seal uses.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { clippedControls } from "./live/clip.mjs";

const BASE = process.env.BASE || "http://localhost:3000";
const WIDTHS = [360, 393, 768, 1024, 1280];
const LOCALES = (process.env.LOCALES || "en,sw,zh").split(",");
const SHOTS = ".50pick-shots";
mkdirSync(SHOTS, { recursive: true });

let pass = 0; const fails = [];
const ok = (n, c, e = "") => { if (c) { pass++; } else { fails.push(`${n}${e ? ` — ${e}` : ""}`); console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };

const host = new URL(BASE).hostname;
const browser = await chromium.launch();

for (const locale of LOCALES) {
  const ctx = await browser.newContext();
  await ctx.addCookies([{ name: "kp-locale", value: locale, domain: host, path: "/" }]);
  const page = await ctx.newPage();
  page.setDefaultNavigationTimeout(90000);
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));

  await page.goto(`${BASE}/auth/forgot-password`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("#identifier", { timeout: 30000 });

  const radios = page.getByRole("radio");
  ok(`[${locale}] recovery offers the SAME 2-option switcher as sign-in`,
    (await radios.count()) === 2, `count=${await radios.count()}`);

  for (const w of WIDTHS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(180);

    // ── phone mode (default) ──────────────────────────────────────────────
    ok(`[${locale}@${w}] phone mode shows the +255 prefix`, (await page.getByText("+255").count()) >= 1);

    // Reachability — the SHARED rule (clip.mjs), not a local re-derivation.
    const clipped = await clippedControls(page);
    ok(`[${locale}@${w}] no control severed (phone mode)`, clipped.length === 0, clipped.join(" | "));
    await page.screenshot({ path: `${SHOTS}/reset-${locale}-phone-${w}.png` });

    // ── email mode ────────────────────────────────────────────────────────
    await page.getByRole("radio", { name: /e-?mail|barua|邮箱|电子/i }).first().click();
    await page.waitForTimeout(250);
    ok(`[${locale}@${w}] email mode morphs the field to type=email`,
      (await page.getAttribute("#identifier", "type")) === "email");
    const clipped2 = await clippedControls(page);
    ok(`[${locale}@${w}] no control severed (email mode)`, clipped2.length === 0, clipped2.join(" | "));
    await page.screenshot({ path: `${SHOTS}/reset-${locale}-email-${w}.png` });

    // Back to phone for the next width.
    await page.getByRole("radio").first().click();
    await page.waitForTimeout(180);
  }

  // ── the TWO confirmations must differ ───────────────────────────────────
  await page.setViewportSize({ width: 393, height: 900 });
  // ⚠️ WAIT FOR THE PANEL, don't just wait for the document. Against production
  // `domcontentloaded` returns while the route's loading skeleton is still on
  // screen, so the read came back EMPTY and the frame was a spinner — reported
  // once as "[sw] the phone confirmation is present" FAILED, which looked like a
  // missing Swahili string and was a slow network. `.catch(() => "")` on the read
  // is what would have turned that into a silent pass, so the wait is the fix and
  // the empty-string guard below stays as the backstop.
  const sentText = async (qs, shot) => {
    await page.goto(`${BASE}/auth/forgot-password?sent=1&identifier=${qs}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('[role="status"]', { timeout: 30000 });
    const txt = (await page.locator('[role="status"]').innerText()).trim();
    await page.screenshot({ path: `${SHOTS}/${shot}` });
    return txt;
  };
  const byPhone = await sentText("712345678", `reset-${locale}-sent-phone.png`);
  const byEmail = await sentText("a%40b.tz", `reset-${locale}-sent-email.png`);

  ok(`[${locale}] the phone confirmation is present`, byPhone.length > 0);
  ok(`[${locale}] the email confirmation is present`, byEmail.length > 0);
  // ⭐ THE ASSERTION THIS DRIVER EXISTS FOR. Identical copy would mean the
  // distinction was never actually built — the number path must keep its
  // "if an account WITH an email" qualifier, the address path must not need it.
  ok(`[${locale}] ⭐ the two confirmations say DIFFERENT things`, byPhone !== byEmail,
    `both = ${JSON.stringify(byPhone.slice(0, 70))}`);

  ok(`[${locale}] no console errors`, errs.length === 0, errs.slice(0, 2).join(" | "));
  await ctx.close();
}

await browser.close();
console.log(`\nreset-identifier-shots: ${pass} passed, ${fails.length} failed  → ${SHOTS}/`);
for (const f of fails) console.log(`  · ${f}`);
process.exit(fails.length === 0 ? 0 : 1);
