#!/usr/bin/env node
/**
 * criterion-publish-e2e.mjs — THE WHOLE CHAIN, IN A BROWSER, FOR REAL.
 *
 * ⛔ THIS EXISTS BECAUSE THE REST OF F6's EVIDENCE STOPPED SHORT. `test:criterion-i18n`
 * greps the wizard, the action and the service. `test:criterion-chain` calls
 * `createMarket` directly. `qa:criterion-wizard` fills the form but never presses
 * Publish. `qa:criterion-visual` reads a market that was SEEDED straight into the
 * database. Every one of those skips the join it claims to prove.
 *
 * So this one does the only thing that settles it: an officer signs in, types three
 * criteria into the real wizard, presses Publish, and then a PLAYER opens the market
 * that was created and reads it back in Swahili and Chinese. Nothing is seeded and
 * nothing is called directly — the value has to survive
 *   wizard → createMarketAction → validation → source-trust gate → createMarket
 *          → normaliseCriterionTranslation → marketStore.set → Postgres
 *          → getMarket → pickCriterion → the page.
 *
 * ⛔ LOCALHOST ONLY, and it refuses anything else: it SIGNS IN AS AN ADMIN and it
 * CREATES A MARKET. Both are things that must never touch production.
 *
 * Setup:
 *   DATABASE_URL=<local 5433> npx tsx scripts/seed-admin-local.mts
 *   npm run build
 *   DATABASE_URL=<local 5433> DISABLE_ADMIN_TOTP=true SESSION_SECRET=… AUDIT_CHAIN_SECRET=… npx next start -p 3001
 * Usage:
 *   DATABASE_URL=<local 5433> node scripts/criterion-publish-e2e.mjs --base http://127.0.0.1:3001
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://127.0.0.1:3001").replace(/\/$/, "");
const PHONE = arg("--phone", "+255700000000");
const PASSWORD = arg("--password", "QaAdmin2026!");
const SHOTS = arg("--shots", ".qa-f6-e2e");
const DB = process.env.DATABASE_URL;

if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(BASE)) {
  console.error(`REFUSED — localhost only, got ${BASE}. This signs in as an admin and CREATES A MARKET.`);
  process.exit(1);
}
if (DB && /rlwy\.net|railway\.app|50pick\.tz|railway\.internal/i.test(DB)) {
  console.error("REFUSED — DATABASE_URL points at production.");
  process.exit(1);
}
mkdirSync(SHOTS, { recursive: true });

const RUN = `e2e-${process.pid}-${Math.random().toString(36).slice(2, 7)}`;
const TITLE = `E2E ${RUN} will the shilling strengthen against the dollar?`;
const EN = "Resolves YES if the Bank of Tanzania official daily mid-rate published on the last business day of the month is strictly below the rate published on the first business day.";
const SW = "Inatatuliwa NDIYO iwapo kiwango rasmi cha katikati cha Benki Kuu ya Tanzania kilichochapishwa siku ya mwisho ya kazi ya mwezi kiko chini ya kiwango cha siku ya kwanza.";
const ZH = "若坦桑尼亚银行在当月最后一个营业日公布的官方每日中间价严格低于第一个营业日公布的价格，则结算为“是”。";
const NOTE = { sw: "Maandishi ya Kiingereza ndiyo yanayoamua", zh: "结算以英文原文为准" };

let pass = 0, fail = 0;
const ok = (l, c, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l}${x ? ` — ${x}` : ""}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1400 }, deviceScaleFactor: 2 });
const page = await ctx.newPage();
let marketId = null;

try {
  // ── Sign in (harness.mjs's rule: /auth/admin, 9-digit local part, networkidle) ──
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 60000 });
  const field = (await page.locator("#phone").count()) ? "#phone" : "#identifier";
  await page.fill(field, PHONE.replace(/^\+255/, ""));
  await page.fill('input[type="password"]', PASSWORD);
  await page.getByRole("button", { name: /sign in|log ?in|ingia|(?<!退出)登录/i }).first().click();
  const signedIn = await page.waitForFunction(() => {
    const t = document.body.innerText.toLowerCase();
    if (/invalid|incorrect|too many attempts|locked/.test(t)) return "bad";
    if (/admin sign in|i'm a player, not staff/.test(t)) return false;
    return /back to app|muhtasari|staff · confidential/.test(t);
  }, undefined, { timeout: 30000 }).then((h) => h.jsonValue()).catch(() => false);
  ok("0: signed in as an admin", signedIn === true, String(signedIn));
  if (signedIn !== true) throw new Error("cannot continue without an admin session");

  // ── Fill the real wizard ───────────────────────────────────────────────────
  await page.goto(`${BASE}/admin/markets/new`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.getByText("Step 1 / 4").waitFor({ timeout: 60000 });

  const advance = async (label, fill) => {
    const cont = page.getByRole("button", { name: "Continue" });
    for (let i = 0; i < 60; i++) {
      await fill();
      if (await cont.isEnabled()) { await cont.click(); return true; }
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: `${SHOTS}/STUCK-${label}.png`, fullPage: true });
    return false;
  };

  // ⚠️ CATEGORY MUST BE macro. `createMarketAction` runs a SOURCE-TRUST gate
  // (isSourceTrusted(url, category)); bot.go.tz is registered under macro and the
  // wizard defaults to sports, so publishing with the default is refused for a reason
  // that has nothing to do with what this test is about.
  //
  // ⛔ AND IT IS NOT A NATIVE <select>. The kit's Select is a custom
  // role="combobox" + role="option" listbox in a portal, so `selectOption()` throws.
  // The first version of this driver wrapped that in `.catch(() => {})` — so the
  // category silently stayed "sports", publish was refused, and the run reported
  // "the wizard did not publish" as if the PRODUCT had failed. A swallowed catch
  // turns a broken driver into a false accusation; there is no catch here now.
  await page.getByPlaceholder("Will the TZS strengthen").fill(TITLE);
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: /^macro/i }).first().click();
  const chosen = (await page.getByRole("combobox").first().innerText()).trim();
  ok("1a: the category combobox actually changed to macro", /macro/i.test(chosen), `reads "${chosen}"`);

  ok("1: step 1 — title + category", await advance("title", async () => {
    await page.getByPlaceholder("Will the TZS strengthen").fill(TITLE);
  }));

  const when = new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 16);
  ok("2: step 2 — trusted source + resolution instant", await advance("source", async () => {
    await page.getByPlaceholder("https://www.bot.go.tz").fill("https://www.bot.go.tz/exchangerates");
    await page.locator('input[type="datetime-local"]').fill(when);
  }));

  await page.getByPlaceholder("Resolves YES if the BoT").fill(EN);
  await page.getByPlaceholder("Inatatuliwa NDIYO").fill(SW);
  await page.getByPlaceholder("若坦桑尼亚银行最后一个营业日的中间价").fill(ZH);
  ok("3: step 3 — all three criteria accepted (no refusal)",
     await page.locator('[role="alert"]').filter({ hasText: /English text|Too short/ }).count() === 0);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Step 4 / 4").waitFor({ timeout: 15000 });

  const review = await page.locator("body").innerText();
  ok("4: the review step echoes the Swahili criterion", review.includes("Inatatuliwa NDIYO iwapo kiwango rasmi"));
  ok("4: …and the Chinese", review.includes("若坦桑尼亚银行在当月最后一个营业日"));
  await page.screenshot({ path: `${SHOTS}/review.png`, fullPage: true });

  // ── PRESS PUBLISH. This is the step every earlier driver stopped short of. ──
  // ⭐ WATCH FOR THE REFUSAL TOO, NOT JUST FOR SUCCESS. The first version waited only
  // for the success signal and, on failure, dumped the whole page — which is the admin
  // shell and says nothing. The action's refusal arrives as a "Couldn't create" toast
  // carrying the REASON, and that one line is the entire diagnosis.
  await page.getByRole("button", { name: /Publish market/i }).click();
  const outcome = await page.waitForFunction(() => {
    const t = document.body.innerText;
    if (/Couldn['’]t create/i.test(t)) return "refused";
    if (/Market published/i.test(t) || location.pathname === "/admin/markets") return "published";
    return false;
  }, undefined, { timeout: 45000 }).then((h) => h.jsonValue()).catch(() => "timeout");

  let reason = "";
  if (outcome !== "published") {
    await page.screenshot({ path: `${SHOTS}/PUBLISH-FAILED.png`, fullPage: true });
    const toast = await page.locator('[role="status"], [role="alert"]').allInnerTexts().catch(() => []);
    reason = toast.join(" | ").replace(/\s+/g, " ").slice(0, 220) || `outcome=${outcome}`;
  }
  ok("5: the wizard actually PUBLISHED the market", outcome === "published", reason);

  // ── Find the id of the market that was just created ───────────────────────
  await page.goto(`${BASE}/admin/markets`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(1500);
  const body = await page.locator("body").innerText();
  // ⛔ Scoped by the RUN-UNIQUE title, so this can never pick up another market.
  const row = body.split("\n").findIndex((l) => l.includes(RUN));
  const ids = [...body.matchAll(/\bmkt_[a-f0-9]{20}\b/g)].map((m) => m[0]);
  // Prefer the admin row's own link, which is unambiguous.
  const href = await page.locator(`a[href*="/markets/mkt_"]`).evaluateAll(
    (as, tag) => as.map((a) => ({ href: a.getAttribute("href"), text: a.closest("tr,li,div")?.innerText ?? "" }))
                   .filter((x) => x.text.includes(tag)).map((x) => x.href), RUN);
  marketId = (href[0]?.match(/mkt_[a-f0-9]{20}/) ?? [])[0] ?? (row >= 0 ? ids[0] : null);
  ok("6: the created market was located by its unique title", !!marketId, marketId ?? `rows=${ids.length}`);
  if (!marketId) throw new Error("cannot verify the player view without the market id");
  console.log(`     created market: ${marketId}`);

  // ── NOW READ IT BACK AS A PLAYER, in each locale ──────────────────────────
  for (const locale of ["en", "sw", "zh"]) {
    const pctx = await browser.newContext({ viewport: { width: 1280, height: 1100 }, locale, deviceScaleFactor: 2 });
    await pctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
    const p = await pctx.newPage();
    await p.goto(`${BASE}/markets/${marketId}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    const lang = await p.getAttribute("html", "lang");
    if (lang !== locale) { ok(`7-${locale}: <html lang> matches the locale asked for`, false, `got ${lang}`); await pctx.close(); continue; }

    const heading = { en: "Resolution criterion", sw: "Kigezo cha utatuzi", zh: "结算标准" }[locale];
    const section = p.getByRole("heading", { name: heading, exact: true }).locator("xpath=ancestor::section[1]");
    await section.waitFor({ state: "visible", timeout: 20000 });
    const text = (await section.locator("p").first().innerText()).trim();
    const all = await section.innerText();

    if (locale === "en") {
      ok(`7-en: the player is shown the English criterion the officer typed`, text === EN, text.slice(0, 40));
      ok(`7-en: with no language note`, !all.includes("Shown in English"));
    } else {
      const want = locale === "sw" ? SW : ZH;
      ok(`7-${locale}: the player is shown the ${locale.toUpperCase()} CRITERION THE OFFICER TYPED`,
         text === want, text.slice(0, 40));
      ok(`7-${locale}: and is told the English decides`, all.includes(NOTE[locale]));
      ok(`7-${locale}: no "no translation" note, because there IS one`,
         !all.includes("Imeonyeshwa kwa Kiingereza") && !all.includes("以英文显示"));
    }
    await section.screenshot({ path: `${SHOTS}/player-${locale}.png` });
    await pctx.close();
  }
} finally {
  await browser.close();
  // ── Cleanup: delete ONLY the market this run created ───────────────────────
  // ⚠️ By id, never by title — a harness that deletes rows it did not create is a
  // destructive test. Skipped (loudly) when there is no DATABASE_URL to reach.
  if (marketId && DB) {
    const require_ = createRequire(import.meta.url);
    const { Client } = require_("pg");
    const c = new Client({ connectionString: DB });
    await c.connect();
    const r = await c.query(`delete from "PredictionMarket" where id = $1`, [marketId]);
    const [{ n }] = (await c.query(`select count(*)::int as n from "PredictionMarket" where id = $1`, [marketId])).rows;
    await c.end();
    ok("8: the market this run created was deleted afterwards", r.rowCount === 1 && n === 0, `deleted=${r.rowCount} left=${n}`);
  } else if (marketId) {
    console.log(`⚠️  NOT CLEANED UP: ${marketId} — set DATABASE_URL so this can delete what it made.`);
  }
}

console.log(`\ncriterion-publish-e2e: ${pass} passed, ${fail} failed · shots in ${SHOTS}/`);
process.exit(fail > 0 ? 1 : 0);
