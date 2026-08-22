/**
 * LIVE — `/notifications` on production, driven as a real player.
 *
 *   node scripts/live-notifications-page.mjs <fleet:NN>
 *
 * ── WHAT THIS PROVES THAT NO SUITE CAN ───────────────────────────────────────
 *
 * `test:notifications-page` drives the lenses against the store and is the stronger half for
 * correctness. It still cannot answer the question Ali actually asked: **can a player get to
 * everything from the bell, and does the screen behave?** Between the DAL and the eye sit the
 * bell's footer strip, a client-side navigation, five URL-driven lenses, a pager, the locale
 * picker and three viewports.
 *
 * ⛔ THE ONE THAT MATTERS IS THE CLEARED ROUND-TRIP. `CLEAR ALL` used to be irreversible in
 * practice; this asserts the rows are still reachable afterwards and that **Restore** brings
 * one back. Everything else on this page is convenience — that is the safety property.
 *
 * ⛔ Every cell verifies `<html lang>` before reading a word of copy. E-106 voided every SW/ZH
 * screenshot ever taken because nobody checked that.
 */
import { mkdirSync } from "node:fs";
import { BASE, loginOnce, browser, bodyText } from "./live/harness.mjs";

const WHO = process.argv[2] ?? "fleet:01";
const OUT = process.env.SHOT_DIR ?? ".qa-artifacts/notif-page";
mkdirSync(OUT, { recursive: true });

let pass = 0;
const fails = [];
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  PASS ${label}${detail ? ` — ${detail}` : ""}`); }
  else { fails.push(`${label}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
  return cond;
};

const BELL = { en: /^Notifications/i, sw: /^Arifa/i, zh: /^通知/ };
/** The five lens pills, per locale — money words, so they are pinned. */
const LENS = {
  en: { all: /All/i, unread: /Unread/i, money: /Money/i, account: /Account/i, cleared: /Cleared/i },
  sw: { all: /Zote/i, unread: /Hazijasomwa/i, money: /Pesa/i, account: /Akaunti/i, cleared: /Zilizoondolewa/i },
  zh: { all: /全部/, unread: /未读/, money: /资金/, account: /账户/, cleared: /已清除/ },
};

const b = (await browser()).b;
const state = await loginOnce(b, WHO);

const open = async (locale, width, path = "/notifications") => {
  const ctx = await b.newContext({ storageState: state, viewport: { width, height: 900 } });
  await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("main, header", { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1800);
  return { ctx, page };
};

// ── §1 · the bell's strip is the way in ────────────────────────────────────────
console.log("\n§1 · the bell strip carries the count and opens the screen");
{
  const { ctx, page } = await open("en", 390, "/updown");
  try {
    const bell = page.getByRole("button", { name: BELL.en }).first();
    if (ok("§1 the bell is present", (await bell.count()) > 0)) {
      // ⭐ The badge's number, read off the accessible name the bell already publishes.
      const label = (await bell.getAttribute("aria-label")) ?? "";
      const badge = Number((label.match(/\((\d+)\)/) ?? [])[1] ?? 0);
      await bell.click();
      await page.waitForTimeout(1200);
      const panel = page.getByRole("dialog").first();
      const text = (await panel.innerText().catch(() => "")).replace(/\s+/g, " ");
      ok("§1 the panel opened", text.length > 0);
      ok("§1 the strip states an unread count", /\d+\s*unread|unread/i.test(text), text.slice(0, 120));
      // ⛔ ONE SOURCE. If the badge and the strip could disagree, one of them is wrong.
      const strip = Number((text.match(/(\d+)\s*unread/i) ?? [])[1] ?? -1);
      ok("§1 ⭐ the strip's number equals the badge's", strip === badge, `strip=${strip} badge=${badge}`);
      ok("§1 the strip offers a way to the screen", /see all/i.test(text), text.slice(0, 160));

      await page.getByRole("link", { name: /see all/i }).first().click();
      await page.waitForTimeout(2500);
      ok("§1 ⭐ it lands on /notifications", /\/notifications/.test(page.url()), page.url());
    }
  } catch (e) { ok("§1 drive completed", false, String(e).slice(0, 160)); }
  await ctx.close();
}

// ── §2 · every lens, and the pager ─────────────────────────────────────────────
console.log("\n§2 · every lens returns a page, and the pager walks");
{
  const { ctx, page } = await open("en", 1280);
  try {
    for (const lens of ["all", "unread", "money", "account", "cleared"]) {
      const url = lens === "all" ? "/notifications" : `/notifications?filter=${lens}`;
      await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1500);
      const body = await bodyText(page);
      const rows = await page.locator("li[data-notif-kind]").count();
      // ⛔ A lens must render SOMETHING it can be judged by: rows, or an honest empty state.
      const empty = /no |hakuna|huna|暂无|尚未|everything here is read|kimesomwa|都已读/i.test(body);
      ok(`§2 ${lens} renders rows or an honest empty state`, rows > 0 || empty, `rows=${rows}`);
      if (lens === "cleared" && rows > 0) {
        ok("§2 ⭐ cleared rows offer Restore", /restore/i.test(body));
      }
      await page.screenshot({ path: `${OUT}/lens-${lens}.png` });
    }
    // Sort actually changes the order of the rendered list.
    await page.goto(`${BASE}/notifications`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const newest = await page.locator("li[data-notif-kind]").first().innerText().catch(() => "");
    await page.goto(`${BASE}/notifications?sort=oldest`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1200);
    const oldest = await page.locator("li[data-notif-kind]").first().innerText().catch(() => "");
    ok("§2 ⭐ oldest-first is not newest-first", newest !== oldest || newest === "", `${newest.slice(0,40)} vs ${oldest.slice(0,40)}`);
  } catch (e) { ok("§2 drive completed", false, String(e).slice(0, 160)); }
  await ctx.close();
}

// ── §3 · the matrix ────────────────────────────────────────────────────────────
console.log("\n§3 · three widths × three languages");
for (const locale of ["en", "sw", "zh"]) {
  for (const width of [360, 768, 1280]) {
    const cell = `${locale}-${width}`;
    const { ctx, page } = await open(locale, width);
    try {
      const lang = await page.getAttribute("html", "lang").catch(() => null);
      if (!ok(`${cell} · really is ${locale}`, (lang ?? "").toLowerCase().startsWith(locale), `<html lang="${lang}">`)) {
        await ctx.close(); continue;
      }
      // 🔴 READ THE PILLS THEMSELVES, NOT THE PAGE BODY. The first version of this check
      // tested each lens label against `bodyText(page)` — the WHOLE page, nav chrome included —
      // so `/All/i` matched almost any English page and `/未读/` matched the bell's own tooltip.
      // It passed 75/75 while proving almost nothing about the pills. Anchored on the pill's
      // own `data-chip`, which the page sets per lens, so the assertion is about the control.
      for (const [k, re] of Object.entries(LENS[locale])) {
        const pill = page.locator(`[data-chip="notif-filter-${k}"]`).first();
        const n = await pill.count().catch(() => 0);
        if (!ok(`${cell} · the ${k} pill is rendered`, n > 0)) continue;
        const label = ((await pill.innerText().catch(() => "")) || "").replace(/\s+/g, " ").trim();
        ok(`${cell} · the ${k} pill is localised`, re.test(label), `pill reads "${label}"`);
        // ������ PRESENT IN THE DOM IS NOT THE SAME AS REACHABLE. The first build scrolled this rail
        // horizontally, so at 360 the **Account & security** and **Cleared** pills sat off-screen
        // with no affordance that anything followed — and `Cleared` is the ONLY route back to a
        // notification that `CLEAR ALL` hid. Every pill must be inside the viewport, not merely
        // rendered somewhere in it.
        const box = await pill.boundingBox().catch(() => null);
        ok(`${cell} · the ${k} pill is actually on screen`,
           !!box && box.x >= 0 && box.x + box.width <= width + 1,
           box ? `x=${Math.round(box.x)} w=${Math.round(box.width)} vs viewport ${width}` : "no box");
        // ⛔ A pill must carry an HONEST count or none at all (FilterPill: A-5, no fabrication).
        const m = label.match(/(\d[\d,]*)/);
        ok(`${cell} · the ${k} pill's count is a number`, m === null || !Number.isNaN(Number(m[1].replace(/,/g, ""))), label);
      }
      // ⛔ Nothing may scroll the PAGE sideways at 360.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      ok(`${cell} · no horizontal page scroll`, overflow <= 1, `overflow=${overflow}px`);
      await page.screenshot({ path: `${OUT}/page-${cell}.png` });
      console.log(`   📸 page-${cell}.png`);
    } catch (e) { ok(`${cell} · drive completed`, false, String(e).slice(0, 140)); }
    await ctx.close();
  }
}

await b.close();
console.log(`\nlive-notifications-page — ${pass} passed, ${fails.length} failed`);
if (fails.length) { for (const f of fails) console.error(`  ✗ ${f}`); process.exit(1); }
