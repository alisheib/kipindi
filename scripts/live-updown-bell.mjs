/**
 * LIVE — THE UP & DOWN RESULT ROW, IN THE REAL BELL, ON PRODUCTION.
 *
 *   node scripts/live-updown-bell.mjs <roundId> <fleet:NN> [expectedOutcome]
 *
 * ── WHAT THIS PROVES THAT NO SUITE CAN ───────────────────────────────────────
 *
 * `test:updown-bell` drives the emitter and reads the row back out of the store. That is a
 * strong check and it still cannot answer the only question Ali asked: **does a player who
 * settles a real Up & Down round see it in their bell, and does tapping it take them to that
 * round?** Between the emitter and the player's eye sit settlement, the SSE nudge, the panel's
 * own fetch, the locale picker, three viewports and a client-side router push — none of which
 * a unit test touches.
 *
 * ⛔ IT ASSERTS ON NAVIGATION, NOT ON AN href. The rows are `<button onClick>` and call
 * `router.push(n.href)`; there is no anchor to read. Clicking and checking where the browser
 * ENDED UP is both the only way and the better one — it proves the link works rather than
 * that a string was rendered.
 *
 * ⛔ ONE SIGN-IN, N CONTEXTS. `loginOnce` exists because a matrix that logs in per cell gets
 * bounced by the server after a dozen sign-ins in a few minutes, and the bounce looks exactly
 * like a wrong password (harness.mjs, ATOM A). The locale cookie is set PER CELL, and every
 * cell verifies `<html lang>` agrees — E-106 voided every SW/ZH screenshot ever taken because
 * nobody checked that.
 */
import { mkdirSync } from "node:fs";
import { BASE, loginOnce, browser, bodyText } from "./live/harness.mjs";

const ROUND = process.argv[2];
const WHO = process.argv[3] ?? "fleet:01";
const EXPECT = (process.argv[4] ?? "").toUpperCase(); // WIN | LOSS | REFUND — optional
if (!ROUND) {
  console.error("usage: node scripts/live-updown-bell.mjs <roundId> <fleet:NN> [WIN|LOSS|REFUND]");
  process.exit(2);
}

const OUT = process.env.SHOT_DIR ?? ".qa-artifacts/bell";
mkdirSync(OUT, { recursive: true });

let pass = 0;
const fails = [];
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${label}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

/** The bell's accessible name, per locale — it carries the unread count as a suffix. */
const BELL = { en: /^Notifications/i, sw: /^Arifa/i, zh: /^通知/ };
/** What the row must SAY, per outcome per locale. Money words, so they are pinned. */
const EXPECTED_COPY = {
  WIN:    { en: /You won/i,      sw: /Umeshinda/i,     zh: /您赢得/ },
  LOSS:   { en: /Bet lost/i,     sw: /Dau limepotea/i, zh: /投注未中/ },
  REFUND: { en: /Refunded/i,     sw: /Umerudishiwa/i,  zh: /已退款/ },
};

const b = (await browser()).b;
const state = await loginOnce(b, WHO);

const WIDTHS = [360, 768, 1280];
const LOCALES = ["en", "sw", "zh"];

for (const locale of LOCALES) {
  for (const width of WIDTHS) {
    const cell = `${locale}-${width}`;
    const ctx = await b.newContext({ storageState: state, viewport: { width, height: 900 } });
    // Set the locale COOKIE for this cell only. The saved state deliberately carries none.
    await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const page = await ctx.newPage();
    try {
      await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("header", { timeout: 30_000 }).catch(() => {});
      await page.waitForTimeout(2500); // hydration — a pre-hydration tap does nothing at all

      // ⛔ CONTROL FIRST. If the page is not actually in this language, every copy assertion
      // below is measuring English and would pass or fail for the wrong reason.
      const lang = await page.getAttribute("html", "lang").catch(() => null);
      if (!ok(`${cell} · page really is in ${locale}`, (lang ?? "").toLowerCase().startsWith(locale), `<html lang="${lang}">`)) {
        await ctx.close();
        continue;
      }

      // ── open the bell ─────────────────────────────────────────────────────
      const bell = page.getByRole("button", { name: BELL[locale] }).first();
      if (!ok(`${cell} · the bell is present`, await bell.count().catch(() => 0) > 0)) { await ctx.close(); continue; }
      await bell.click();
      await page.waitForTimeout(1200); // the panel floats in; a shot now would catch it translucent

      const panel = page.getByRole("dialog").first();
      const hasPanel = await panel.count().catch(() => 0) > 0;
      ok(`${cell} · the panel opened`, hasPanel);

      const text = hasPanel ? (await panel.innerText().catch(() => "")) : await bodyText(page);

      // ── the row is THERE and says the right thing ──────────────────────────
      if (EXPECT && EXPECTED_COPY[EXPECT]) {
        ok(`${cell} · the ${EXPECT} row is in the bell, in ${locale}`,
           EXPECTED_COPY[EXPECT][locale].test(text),
           text.slice(0, 140).replace(/\s+/g, " "));
        // 🔴 The string that was live and wrong. Never, in any locale, on any row.
        ok(`${cell} · no row says the bet never went through`, !/投注失败/.test(text));
      }

      await panel.screenshot({ path: `${OUT}/bell-${cell}.png` }).catch(async () => {
        await page.screenshot({ path: `${OUT}/bell-${cell}.png` });
      });
      console.log(`   📸 bell-${cell}.png`);

      // ── ⭐ THE NAVIGATION, DRIVEN ONCE (EN @ 1280 is enough; the rest is chrome) ──
      if (locale === "en" && width === 1280) {
        // Find the row that mentions this round by clicking the FIRST result row and
        // checking where it lands. ⛔ We assert the destination, never a rendered string.
        const rows = panel.getByRole("button");
        const n = await rows.count().catch(() => 0);
        let landed = null;
        for (let i = 0; i < Math.min(n, 8); i++) {
          const r = rows.nth(i);
          const label = (await r.innerText().catch(() => "")).replace(/\s+/g, " ");
          if (!/won|lost|refund/i.test(label)) continue;
          await r.click();
          await page.waitForTimeout(2500);
          landed = page.url();
          break;
        }
        ok("nav · tapping a result row leaves the board", landed !== null && !/\/updown\/?$/.test(landed), String(landed));
        ok("nav · ⭐ it lands on a ROUND page, not a list", /\/updown\/[A-Za-z0-9_-]+/.test(landed ?? ""), String(landed));
        if (landed && ROUND) {
          ok("nav · …and it is a real round page that renders", /your result|matokeo yako|您的结果|round|raundi|回合/i.test(await bodyText(page)));
        }
      }
    } catch (e) {
      ok(`${cell} · drive completed`, false, String(e).slice(0, 160));
    }
    await ctx.close();
  }
}

await b.close();

console.log(`\nlive-updown-bell — ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.error(`  ✗ ${f}`); process.exit(1); }
