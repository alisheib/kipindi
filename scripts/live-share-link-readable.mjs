/**
 * E-221 · A LINK THE PLAYER IS SHOWN MUST BE READABLE — every character, at every width.
 *
 * Ali, from the live product: *"in share market and multiple share the copy link gets out of
 * the isolated input field — maybe we should make it take multiple lines."*
 *
 * Measured on production at 393 before anything changed: the invite page's referral field was
 * a single-line `<Input readOnly>` holding `https://50pick.tz/auth/register?ref=QAFLC8R2` at
 * **scrollWidth 454 against clientWidth 255**. ⭐ **44% of the link was unreachable, and the
 * hidden 44% was the `?ref=` code — the only part that makes it a referral link at all.**
 *
 * ⛔ AND NO OVERFLOW CHECK COULD EVER HAVE SEEN IT. The field's wrapper carries
 * `overflow: hidden`, so `document.scrollWidth` was 0px over budget and every horizontal-
 * overflow sweep this campaign runs was honestly reporting a clean page. The clipping was
 * silent, total, and inside the control. **That is E-30's lesson one layer down: a
 * document-level overflow check cannot see text clipped INSIDE a box.**
 *
 * ⭐ SO THIS ASKS THE ONLY QUESTION THAT MATTERS — *is the whole string on screen?* — as
 * `scrollWidth <= clientWidth` and `scrollHeight <= clientHeight` on the element that holds
 * the link. It is deliberately indifferent to how: a wrapping textarea, a wrapping caption
 * and a wider box would all pass, and a truncating one-liner fails whatever it is built from.
 *
 * THE CONTROLS, in the same run:
 *   ① POSITIVE — the element must actually CONTAIN the whole link (`value`/text ends with the
 *     real referral code, and the market URL carries the real market id). A control rendering
 *     an EMPTY string is never clipped, and would pass a bare geometry check perfectly.
 *   ② MUST-GO-RED — `white-space: nowrap` is forced back onto each element with
 *     `addStyleTag` and the same measurement must report clipping. ⚠️ With an assertion that
 *     the forced style APPLIED, because a mutation the cascade ignores reports NOT CAUGHT and
 *     looks like a clean pass (E-218).
 *
 * Run: npm run qa:share-link-readable
 */
import { browser, login, BASE, recorder } from "./live/harness.mjs";

const SHOT = process.env.SHOT_DIR ?? "docs/shots/share-link";
const WIDTHS = [
  { name: "phone", width: 393, height: 852 },
  { name: "tablet", width: 768, height: 1000 },
  { name: "desktop", width: 1440, height: 1000 },
];
const LOCALES = ["en", "sw", "zh"];
const REFERRAL_LABEL = /your referral link|kiungo chako cha rufaa|您的推荐链接|推荐链接/i;
const SHARE_MARKET = /share this market|shiriki soko hili|分享此市场/i;

/** Is every character of this element's content actually on screen? */
const FITS = (el) => ({
  scrollW: el.scrollWidth,
  clientW: el.clientWidth,
  scrollH: el.scrollHeight,
  clientH: el.clientHeight,
  // ⚠️ 1px of slack for sub-pixel layout, and no more. The real defect was 199px.
  clipped: el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1,
  text: el.value ?? el.textContent ?? "",
  whiteSpace: getComputedStyle(el).whiteSpace,
  overflowWrap: getComputedStyle(el).overflowWrap + "/" + getComputedStyle(el).wordBreak,
});

const rec = recorder("E-221 · A SHOWN LINK IS A READABLE LINK — measured on production");

const { b } = await browser({ viewport: { width: 1440, height: 1000 } });
const state = await (async () => {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await login(page, "fleet:07");
  const s = await ctx.storageState();
  s.cookies = s.cookies.filter((c) => c.name !== "kp-locale");
  await ctx.close();
  return s;
})();

const { mkdirSync } = await import("node:fs");
mkdirSync(SHOT, { recursive: true });

for (const w of WIDTHS) {
  for (const loc of LOCALES) {
    const cell = `${w.name}/${loc}`;
    const ctx = await b.newContext({ storageState: state, viewport: { width: w.width, height: w.height } });
    await ctx.addCookies([{ name: "kp-locale", value: loc, url: BASE }]);
    const page = await ctx.newPage();
    try {
      // ── A · the invite page's referral field ────────────────────────────────────
      await page.goto(`${BASE}/profile/invite`, { waitUntil: "domcontentloaded" });
      const field = page.getByLabel(REFERRAL_LABEL).first();
      await field.waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForTimeout(500);
      const m = await field.evaluate(FITS);

      // ① POSITIVE CONTROL — an empty control is never clipped.
      rec.check(`① ${cell} · invite · the field holds the WHOLE link, code and all`,
        /^https?:\/\/\S+\?ref=[A-Z0-9]{4,}$/i.test(m.text.trim()), m.text.slice(0, 70));
      rec.check(`   ${cell} · invite · every character of it is on screen`,
        !m.clipped, `scroll ${m.scrollW}x${m.scrollH} vs client ${m.clientW}x${m.clientH} · white-space=${m.whiteSpace}`);

      // ── B · the market share dialog's link line ─────────────────────────────────
      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" });
      // ⛔ BY ACCESSIBLE NAME. A bare `[role="dialog"]` probe finds the FILTER panel — an
      // instrument mistake this campaign has already paid for once.
      await page.getByRole("button", { name: SHARE_MARKET }).first().click({ timeout: 30_000 });
      const dlg = page.getByRole("dialog", { name: SHARE_MARKET }).first();
      await dlg.waitFor({ state: "visible", timeout: 30_000 });
      await page.waitForTimeout(600);
      const link = dlg.locator("span.font-mono").filter({ hasText: /markets\// }).first();
      const lm = await link.evaluate(FITS);

      rec.check(`① ${cell} · dialog · the line carries a real market link`,
        /50pick\.tz\/markets\/mkt_[0-9a-f]{8,}/i.test(lm.text), lm.text.slice(0, 70));
      rec.check(`   ${cell} · dialog · every character of it is on screen`,
        !lm.clipped, `scroll ${lm.scrollW}x${lm.scrollH} vs client ${lm.clientW}x${lm.clientH} · white-space=${lm.whiteSpace}`);
      // The tile must not push the dialog wider than itself either.
      const escapes = await dlg.evaluate((d) => {
        const r = d.getBoundingClientRect();
        return [...d.querySelectorAll("*")].some((el) => el.getBoundingClientRect().right > r.right + 1);
      });
      rec.check(`   ${cell} · dialog · nothing inside it reaches past its own edge`, !escapes);

      if (loc === "en") {
        await dlg.screenshot({ path: `${SHOT}/${w.name}-dialog.png` });
        await page.goto(`${BASE}/profile/invite`, { waitUntil: "domcontentloaded" });
        const f2 = page.getByLabel(REFERRAL_LABEL).first();
        await f2.waitFor({ state: "visible", timeout: 30_000 });
        await f2.evaluate((el) => el.scrollIntoView({ block: "center" }));
        await page.waitForTimeout(400);
        const bb = await f2.boundingBox();
        await page.screenshot({ path: `${SHOT}/${w.name}-invite.png`, clip: { x: 0, y: Math.max(0, bb.y - 60), width: w.width, height: 220 } });
      }

      // ── ② MUST-GO-RED, once, on the real page ───────────────────────────────────
      if (w.name === "phone" && loc === "en") {
        await page.goto(`${BASE}/profile/invite`, { waitUntil: "domcontentloaded" });
        const f3 = page.getByLabel(REFERRAL_LABEL).first();
        await f3.waitFor({ state: "visible", timeout: 30_000 });
        await page.addStyleTag({
          content: `textarea[aria-label], .font-mono { white-space: nowrap !important; overflow-wrap: normal !important; word-break: normal !important; }`,
        });
        await page.waitForTimeout(400);
        const red = await f3.evaluate(FITS);
        rec.check("② RED CONTROL · the forced nowrap actually applied",
          red.whiteSpace === "nowrap", `white-space=${red.whiteSpace}`);
        rec.check("② RED CONTROL · with wrapping forced off, the SAME measurement reports the link clipped",
          red.clipped, `scroll ${red.scrollW} vs client ${red.clientW}`);
      }
    } catch (e) {
      rec.check(`${cell} · measured`, false, String(e.message ?? e));
    } finally {
      await ctx.close();
    }
  }
}

await b.close();
const failed = rec.done();
console.log(`shots → ${SHOT}`);
process.exit(failed ? 1 : 0);
