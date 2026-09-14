/**
 * KYC AT WITHDRAWAL — THE PRODUCTION DRIVE (owner ruling, Ali, 2026-09-13).
 *
 * Proves on the LIVE site, through a real browser, that the ladder is
 *   register → confirm email → deposit and play → verify identity → withdraw
 * and that no screen still tells a player the old one. docs/COMPLIANCE-DECISIONS.md 2026-09-13.
 *
 * ⭐ AND THE QUIET RULE OF THE SAME DAY: identity is put in front of a player on the withdraw screen and
 * in ONE dismissible notice once a first deposit is confirmed — nowhere else. No app-wide bar, no
 * amber banner on /profile, no "your balance is safe" line.
 *
 * WHAT IT MEASURES, and in what order:
 *   P · the published documents, signed OUT, in en/sw/zh: Terms v2026-09-13 with §3 "before your first
 *       withdrawal" and the NEW §3a; AML v2026-09-13 without the three false §2 claims; the rules summary.
 *   R · a new account registered through the REAL form lands on /wallet/deposit (or its safe next),
 *       NOT on /profile/kyc, and is greeted with the email errand.        [REGISTER=1 only]
 *   A · as that account (never approved, NO deposit yet): the deposit screen shows no identity panel;
 *       the market dial and Up & Down render with no identity panel; the withdraw screen shows the
 *       payout panel (not_started) and NO form — "Before you withdraw", no "balance is safe" line — in
 *       three languages; the app-wide identity bar (deleted) is ABSENT on every page visited; /wallet
 *       shows NO first-deposit notice; /profile/kyc has no welcome block; /profile has no verify banner
 *       and still carries the KYC status pill.
 *   O · the officer console loads the new and changed screens.            [ADMIN_DRIVE=1 only]
 *
 * ⚠️ THE NOTICE CAN ONLY BE PROVEN ABSENT HERE. This drive moves no money, so its account never holds a
 * confirmed deposit and the notice is correctly not due. Its presence, its copy and its dismissal are
 * driven locally by `qa:kyc-gate` §2 and `qa:kyc-e2e` ④.
 *
 * ⛔ SAFETY. `REGISTER=1` writes ONE real account to production (a QA account on the reserved fleet phone
 * block, `QA_PHONE9`, with `QA_EMAIL`) — it moves no money. Its password is generated per run and written
 * to the gitignored `.env.qa.local` as QA_KYCW_PASSWORD, never printed. `ADMIN_DRIVE=1` signs in as the
 * owner's console login, which REVOKES his session on any other device (single active session) — run it
 * knowingly. Without either flag the drive reads published pages only.
 *
 * Run:  node scripts/live/kyc-at-withdrawal-prod.mjs
 *       REGISTER=1 QA_PHONE9=799000090 QA_EMAIL=you+kycqa@50pick.tz node scripts/live/kyc-at-withdrawal-prod.mjs
 *       ADMIN_DRIVE=1 node scripts/live/kyc-at-withdrawal-prod.mjs
 *   SHOT_DIR=<dir> for screenshots. LIVE_BASE to point elsewhere.
 */
import { chromium } from "playwright";
import { appendFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { BASE, SHOT, recorder, bodyText, login, shot } from "./harness.mjs";

const R = recorder(`kyc-at-withdrawal-prod — ${BASE}`);
const REGISTER = process.env.REGISTER === "1";
const ADMIN_DRIVE = process.env.ADMIN_DRIVE === "1";
const LOCALES = ["en", "sw", "zh"];
const WIDTHS = [390, 1280];
const host = new URL(BASE).hostname;

// ⛔ DELETED 2026-09-13 (`KycVerifyBanner`) — asserted absent on every page section A opens.
const BAR = '[data-testid="kyc-verify-banner"]';
const NOTICE = '[data-testid="kyc-first-deposit-notice"]';

const b = await chromium.launch({ args: ["--no-sandbox"] });
const ctxFor = async (locale, width, storageState) => {
  const ctx = await b.newContext({ viewport: { width, height: 900 }, ...(storageState ? { storageState } : {}) });
  await ctx.addCookies([{ name: "kp-locale", value: locale, domain: host, path: "/" }]);
  return ctx;
};
const settle = async (page) => {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() => { const m = document.querySelector("main"); return !!m && (m.innerText || "").trim().length > 40 && !m.querySelector(".kp-shimmer-track"); }, null, { timeout: 60_000 }).catch(() => {});
  await page.waitForTimeout(500);
};
const noOverflow = async (page) => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
const count = (page, sel) => page.locator(sel).count();
/** Collapsed, lowercased innerText of ONE element — the eyebrow is CSS-uppercased (see harness `bodyText`). */
const textIn = async (page, sel) => ((await page.locator(sel).first().innerText().catch(() => "")) || "").replace(/\s+/g, " ").toLowerCase();
const noBar = async (page, name) => R.check(`${name} no app-wide identity bar`, (await count(page, BAR)) === 0);

try {
  /* ═══ P · the published documents, signed out ═══════════════════════════════════════════ */
  const DOC = {
    // `old` is the SUPERSEDED wording, copied from c63a4668 (the last commit before the ruling) — never
    // invented, because an absence check against a string that never existed passes for nothing.
    en: { terms: ["version 2026-09-13", "before your first withdrawal", "if we cannot verify you", "any money we return is sent only to the mobile-money number"], aml: ["version 2026-09-13", "before their first withdrawal"], rules: ["verified before your first withdrawal"], old: ["required before you can deposit, place a", "required of every player before they", "behavioural anomalies are detected"] },
    sw: { terms: ["toleo 2026-09-13", "kabla ya kutoa fedha kwa mara ya kwanza", "tusipoweza kukuthibitisha"], aml: ["toleo 2026-09-13", "kabla ya kutoa fedha kwa mara ya kwanza"], rules: ["kabla ya kutoa pesa kwa mara ya kwanza"], old: ["unahitajika kabla ya kuweka fedha, kuweka", "unahitajika kwa kila mchezaji kabla ya"] },
    zh: { terms: ["版本 2026-09-13", "首次提现之前", "如果我们无法验证您的身份"], aml: ["版本 2026-09-13", "首次提现之前"], rules: ["首次提现前完成验证"], old: ["在充值、投注或提现之前", "检测到行为异常"] },
  };
  for (const loc of LOCALES) {
    const ctx = await ctxFor(loc, 390);
    const page = await ctx.newPage();
    for (const [path, keys] of [["/legal/terms", DOC[loc].terms], ["/legal/aml", DOC[loc].aml], ["/legal/rules", DOC[loc].rules]]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" }); await settle(page);
      const t = await bodyText(page);
      for (const k of keys) R.check(`P.${loc} ${path} says "${k}"`, t.includes(k.toLowerCase()));
      for (const k of DOC[loc].old) R.check(`P.${loc} ${path} no longer says "${k}"`, !t.includes(k.toLowerCase()));
      R.check(`P.${loc} ${path} no horizontal overflow at 390`, await noOverflow(page));
      if (loc === "en" && path === "/legal/terms") await shot(page, `P-terms-3a-en-390`);
    }
    await ctx.close();
  }

  /* ═══ R · registration through the real form ═════════════════════════════════════════════ */
  let state = null;
  if (REGISTER) {
    const phone9 = process.env.QA_PHONE9, email = process.env.QA_EMAIL;
    if (!/^7\d{8}$/.test(phone9 ?? "") || !/@/.test(email ?? "")) throw new Error("REGISTER=1 needs QA_PHONE9 (9 digits, 7…) and QA_EMAIL");
    const password = `Kycw-${randomBytes(9).toString("base64url")}!`;
    const ctx = await ctxFor("en", 390);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/auth/register`, { waitUntil: "networkidle" });
    await page.fill("#phone", phone9);
    await page.fill("#email", email);
    await page.fill('input[name="password"]', password);
    await page.fill('input[name="passwordConfirm"]', password);
    const segs = page.locator('form input[type="text"]:not([name])');
    await segs.nth(1).fill("05"); await segs.nth(2).fill("05"); await segs.nth(3).fill("1995");
    for (const n of ["acceptAge", "acceptTerms"]) { const c = page.locator(`input[name="${n}"]`); if (!(await c.isChecked())) await c.check({ force: true }); }
    await page.locator('form button[type="submit"]').first().click();
    await page.waitForURL((u) => !/\/auth\/register/i.test(u.toString()), { timeout: 120_000 });
    // Record the password BEFORE any assertion can throw, so the account stays reachable.
    const envFile = new URL("../../.env.qa.local", import.meta.url);
    const existing = (() => { try { return readFileSync(envFile, "utf8"); } catch { return ""; } })();
    appendFileSync(envFile, `${existing.endsWith("\n") || !existing ? "" : "\n"}QA_KYCW_PHONE=${phone9}\nQA_KYCW_PASSWORD=${password}\n`);
    await settle(page);
    const url = new URL(page.url());
    R.check("R.1 a new account lands on /wallet/deposit — not on /profile/kyc", url.pathname === "/wallet/deposit", page.url());
    // The greeting is a flash toast (auth-flash.tsx) that animates in — wait for it, never race it.
    const greeted = await page.waitForFunction(() => document.body.innerText.toLowerCase().includes("open the link we emailed you"), null, { timeout: 15_000 }).then(() => true, () => false);
    R.check("R.2 …greeted with the email errand, not an identity step", greeted, (await bodyText(page)).slice(0, 160));
    await noBar(page, "R.3 the landing page:");
    await shot(page, "R-landing-deposit-en-390");
    state = await ctx.storageState();
    state.cookies = state.cookies.filter((c) => c.name !== "kp-locale");
    await ctx.close();
  } else {
    R.note("R/A skipped — set REGISTER=1 QA_PHONE9=… QA_EMAIL=… to drive a new account");
  }

  /* ═══ A · as a never-approved account with no deposit ════════════════════════════════════ */
  if (state) {
    for (const width of WIDTHS) {
      const ctx = await ctxFor("en", width, state);
      const page = await ctx.newPage();
      const W = `@${width}`;

      await page.goto(`${BASE}/wallet/deposit`, { waitUntil: "domcontentloaded" }); await settle(page);
      R.check(`A.deposit${W} no identity panel on the deposit screen`, (await count(page, '[data-testid="kyc-gate-panel"]')) === 0);
      await noBar(page, `A.deposit${W}`);
      R.check(`A.deposit${W} no horizontal overflow`, await noOverflow(page));
      await shot(page, `A-deposit-en-${width}`);

      await page.goto(`${BASE}/wallet/withdraw`, { waitUntil: "domcontentloaded" }); await settle(page);
      const panel = page.locator('[data-testid="kyc-gate-panel"]');
      R.check(`A.withdraw${W} the payout identity panel is shown`, (await panel.count()) === 1 && (await panel.getAttribute("data-kyc-purpose")) === "payout");
      R.check(`A.withdraw${W} …in the not-started state`, (await panel.getAttribute("data-kyc-state").catch(() => null)) === "not_started");
      R.check(`A.withdraw${W} …and NO withdrawal form`, (await count(page, 'form input[name="amount"]')) === 0);
      const pt = await textIn(page, '[data-testid="kyc-gate-panel"]');
      R.check(`A.withdraw${W} the panel says "before you withdraw"`, pt.includes("before you withdraw"), pt.slice(0, 140));
      // ⛔ THE QUIET RULE (2026-09-13) removed the reassurance line, and the eyebrow stopped saying "cash
      // out". Both superseded strings are copied from ac411357, the commit before the rule.
      R.check(`A.withdraw${W} …and no longer says "before you cash out" or that the balance is safe`,
        pt.length > 20 && !pt.includes("before you cash out") && !pt.includes("your balance is safe") && (await count(page, '[data-kyc-payout-line="safe"]')) === 0,
        pt.slice(0, 140));
      R.check(`A.withdraw${W} states the review wait as a number`, /usually reviews documents within \d+ hours/.test(pt), pt.slice(0, 140));
      await noBar(page, `A.withdraw${W}`);
      R.check(`A.withdraw${W} no horizontal overflow`, await noOverflow(page));
      await shot(page, `A-withdraw-panel-en-${width}`);

      // ⭐ /wallet — the ONE quiet identity line lives here, and only once a deposit is CONFIRMED.
      await page.goto(`${BASE}/wallet`, { waitUntil: "domcontentloaded" }); await settle(page);
      R.check(`A.wallet${W} control · /wallet rendered its balance`, (await count(page, '[data-testid="wallet-balance"]')) > 0);
      R.check(`A.wallet${W} no first-deposit identity notice — this account holds no confirmed deposit`, (await count(page, NOTICE)) === 0);
      await noBar(page, `A.wallet${W}`);

      await page.goto(`${BASE}/markets`, { waitUntil: "domcontentloaded" }); await settle(page);
      await noBar(page, `A.markets${W}`);
      const href = await page.locator("a[data-row-id]").first().getAttribute("href").catch(() => null);
      if (href) {
        await page.goto(`${BASE}${href.split("?")[0]}`, { waitUntil: "domcontentloaded" }); await settle(page);
        R.check(`A.market${W} no identity panel where the dial is`, (await count(page, '[data-testid="kyc-gate-panel"]')) === 0);
        const mt = await bodyText(page);
        R.check(`A.market${W} no "verify your identity" on the market page`, !mt.includes("verify your identity"));
        await noBar(page, `A.market${W}`);
        R.check(`A.market${W} no horizontal overflow`, await noOverflow(page));
        await shot(page, `A-market-dial-en-${width}`);
      } else {
        R.note(`A.market${W} no open market link found on /markets — dial not measured`);
      }

      await page.goto(`${BASE}/updown`, { waitUntil: "domcontentloaded" }); await settle(page);
      R.check(`A.updown${W} no identity panel on the board`, (await count(page, '[data-testid="kyc-gate-panel"]')) === 0);
      await noBar(page, `A.updown${W}`);

      await page.goto(`${BASE}/profile/kyc`, { waitUntil: "domcontentloaded" }); await settle(page);
      const kt = await bodyText(page);
      R.check(`A.profile-kyc${W} no welcome block telling a new player verification opens play`, !kt.includes("browse every market for free") && !kt.includes("is what opens adding money"));
      await noBar(page, `A.profile-kyc${W}`);
      R.check(`A.profile-kyc${W} no horizontal overflow`, await noOverflow(page));
      await shot(page, `A-profile-kyc-en-${width}`);

      // ⛔ THE AMBER /profile BANNER IS DELETED (quiet rule, 2026-09-13). Its words, copied from ac411357:
      // body "…one document, one account. Verify before you cash out…", button "Continue verification".
      // The standing is still STATED there, as the KYC pill — which is the control for the absence.
      await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" }); await settle(page);
      const pr = await bodyText(page);
      const stale = ["verify before you cash out", "continue verification", "one document, one account"].filter((w) => pr.includes(w));
      R.check(`A.profile${W} the old verify banner is gone — none of its words remain`, pr.length > 200 && stale.length === 0, stale.join(" | "));
      R.check(`A.profile${W} …and the identity standing is still stated, as the KYC pill`, (await count(page, '[data-testid="profile-kyc-pill"]')) === 1);
      await noBar(page, `A.profile${W}`);
      await ctx.close();
    }
    for (const loc of ["sw", "zh"]) {
      const ctx = await ctxFor(loc, 390, state);
      const page = await ctx.newPage();
      await page.goto(`${BASE}/wallet/withdraw`, { waitUntil: "domcontentloaded" }); await settle(page);
      const pt = await textIn(page, '[data-testid="kyc-gate-panel"]');
      // `oldSafe` is the removed `kycGate.payoutSafe` line as it read at ac411357.
      const { eyebrow, oldSafe } = loc === "sw"
        ? { eyebrow: "kabla ya kutoa pesa", oldSafe: "salio lako ni salama" }
        : { eyebrow: "提现之前", oldSafe: "您的余额安全" };
      R.check(`A.withdraw.${loc} panel says "${eyebrow}"`, pt.includes(eyebrow), pt.slice(0, 140));
      R.check(`A.withdraw.${loc} …and carries no "balance is safe" line`, pt.length > 5 && !pt.includes(oldSafe), pt.slice(0, 140));
      await noBar(page, `A.withdraw.${loc}`);
      R.check(`A.withdraw.${loc} no horizontal overflow at 390`, await noOverflow(page));
      await shot(page, `A-withdraw-panel-${loc}-390`);
      await ctx.close();
    }
  }

  /* ═══ O · the officer console ════════════════════════════════════════════════════════════ */
  if (ADMIN_DRIVE) {
    const ctx = await ctxFor("en", 1280);
    const page = await ctx.newPage();
    await login(page, "admin");
    for (const [path, want] of [
      ["/admin/kyc", /kyc/],
      ["/admin/kyc/refused", /refused players' balances/],
      ["/admin/approvals", /approvals/],
      ["/admin/finance", /held for unverified/],
      ["/admin/players?funded=held", /players/],
    ]) {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded" }); await settle(page);
      const t = await bodyText(page);
      R.check(`O ${path} renders its content (not a sign-in page or an error)`, want.test(t) && !/admin sign in|application error|something went wrong/.test(t), t.slice(0, 140));
      await shot(page, `O-${path.replace(/[/?=]/g, "_")}-1280`);
    }
    await ctx.close();
  } else {
    R.note("O skipped — ADMIN_DRIVE=1 signs in as the owner (revokes his other session)");
  }
} catch (err) {
  R.check("drive completed without an exception", false, String(err?.stack ?? err).slice(0, 400));
} finally {
  await b.close();
}
console.log(`screenshots: ${SHOT}`);
process.exit(R.done() ? 1 : 0);
