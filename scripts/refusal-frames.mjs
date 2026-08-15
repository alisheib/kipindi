/**
 * C2 THIRD TRANCHE · READ THE FRAME — the banner channel, driven, at every viewport, in
 * every language.
 *
 *   BASE=http://localhost:3015 node scripts/refusal-frames.mjs
 *
 * ⛔ A DRIVEN REFUSAL, NOT A CONSTRUCTED URL. The work order is explicit: drive a REAL refusal,
 * and do not fake one by breaking the network, which lands in a different branch. So this
 * submits the close-account form with the wrong confirmation text and lets the SERVER ACTION
 * redirect — the same `?reason=close_confirm_required` a real player gets — rather than
 * navigating straight to the query string, which would prove only that the renderer renders.
 *
 * ⛔ LANGUAGE COMES FROM THE `kp-locale` COOKIE. There is no `/api/locale`. It is set on the
 * Playwright CONTEXT, `<html lang>` is read back, and a mismatch REFUSES to capture rather than
 * quietly filing an English screenshot under `sw`.
 *
 * ⛔ A RECT IS NOT VISIBILITY — `checkVisibility()` is the assertion, not `boundingBox()`.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3015";
const OUT = "screens/refusal-frames";
const VIEWPORTS = [
  { w: 360, h: 780, name: "360" },
  { w: 768, h: 1024, name: "768" },
  { w: 1280, h: 900, name: "1280" },
  { w: 1920, h: 1080, name: "1920" },
];
// The exact sentence each locale must show. ⛔ Read from the dictionary at runtime would be
// circular — this is the independent copy of what a human decided the player should read.
const EXPECT = {
  en: "Type CLOSE MY ACCOUNT exactly as shown to confirm.",
  sw: "Andika CLOSE MY ACCOUNT kama ilivyoonyeshwa ili kuthibitisha.",
  zh: "请完全按照显示输入 CLOSE MY ACCOUNT 以确认。",
};
const LANG_ATTR = { en: "en", sw: "sw", zh: "zh" };

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ""}`); }
  else { fail++; console.log(`  ✗ ${name}${detail ? ` — ${detail}` : ""}`); }
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();

for (const locale of ["en", "sw", "zh"]) {
  for (const vp of VIEWPORTS) {
    const label = `${locale}@${vp.name}`;
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h } });
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();
    try {
      // A local-only helper that mints a funded, authed session. 404 in production by design.
      await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
      await page.goto(`${BASE}/profile/account`, { waitUntil: "domcontentloaded" });

      const lang = await page.getAttribute("html", "lang");
      // ⛔ REFUSE TO CAPTURE ON A MISMATCH. A screenshot filed under the wrong locale is worse
      // than no screenshot: it is evidence for a claim that was never tested.
      if (lang !== LANG_ATTR[locale]) {
        ok(`${label} · <html lang> matches the cookie`, false, `got "${lang}", expected "${LANG_ATTR[locale]}" — NOT capturing`);
        await ctx.close();
        continue;
      }
      ok(`${label} · <html lang> matches the cookie`, true, lang);

      // ── DRIVE THE REAL REFUSAL ────────────────────────────────────────────
      // ⛔ Find the control by NAME, never by its text: a text filter matched only Chinese once,
      // because EN renders "Up" and SW "Juu" — case, not language.
      const confirm = page.locator('input[name="confirm"]');
      await confirm.waitFor({ state: "attached", timeout: 15000 });
      await confirm.fill("not the phrase");
      await page.locator('form:has(input[name="confirm"]) button[type="submit"]').first().click();
      await page.waitForURL(/reason=/, { timeout: 20000 });

      const url = page.url();
      ok(`${label} · the SERVER redirected with a reason KEY, not prose`,
         /[?&]reason=close_confirm_required\b/.test(url) && !/[?&]error=/.test(url), url.replace(BASE, ""));

      const alert = page.locator('[role="alert"]').first();
      await alert.waitFor({ state: "attached", timeout: 15000 });
      ok(`${label} · the banner is really VISIBLE (checkVisibility, not a rect)`,
         await alert.evaluate((el) => el.checkVisibility()));

      const text = (await alert.innerText()).trim();
      ok(`${label} · it reads the player's own language`, text === EXPECT[locale], JSON.stringify(text.slice(0, 70)));
      ok(`${label} · ⛔ no placeholder survived`, !/\{\w+\}/.test(text));
      ok(`${label} · ⛔ and no raw English leaked into a non-English frame`,
         locale === "en" || !/Invalid value for|exactly to confirm/.test(text));

      await page.screenshot({ path: `${OUT}/close-confirm-${locale}-${vp.name}.png`, fullPage: false });
    } catch (e) {
      ok(`${label} · drove the refusal`, false, String(e).split("\n")[0].slice(0, 140));
    }
    await ctx.close();
  }
}

await browser.close();
console.log(`\nrefusal-frames: ${pass} passed, ${fail} failed  (${OUT})`);
process.exit(fail > 0 ? 1 : 0);
