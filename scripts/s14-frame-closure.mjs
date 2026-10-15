/**
 * Focused S14 local frame interactions left open by the 201-tile matrix.
 * Run only against a disposable localhost next dev with no DATABASE_URL and a mock rail.
 * This script never submits a deposit. All accounts, pools and limits are synthetic.
 */
import { chromium } from "playwright";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { premise, mintStaffPass, LOCALE_COOKIE } from "./live/journey-pass.mjs";
import { asCookie, freshPlayer, observed, openSheet, pageIn, post, S } from "./live/bet-sheet-gates.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3054";
const OUT = resolve(process.env.KP_S14_CLOSURE_OUT ?? resolve(tmpdir(), "50pick-s14-frame-closure"));
const sourceCommit = process.env.KP_SOURCE_SHA ?? null;
const proof = { sourceCommit, generatedAt: new Date().toISOString(), base: BASE,
  premise: "disposable localhost, in-memory store, synthetic players and funded pools, mock rail; no production payment",
  checks: [], images: [], errors: [] };
const ok = (id, value, detail = "") => {
  proof.checks.push({ id, state: value ? "PASS" : "FAIL", detail });
  console.log(`${value ? "PASS" : "FAIL"} ${id}${detail ? ` — ${detail}` : ""}`);
  if (!value) throw new Error(`${id}: ${detail}`);
};
const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");
const shot = async (page, name, fullPage = false) => {
  const path = resolve(OUT, `${name}.png`);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path, fullPage, animations: "disabled", style: "nextjs-portal{display:none!important}" });
  proof.images.push({ name: `${name}.png`, sha256: sha(path) });
};
const pre = await premise(BASE);
if (pre.refuse || pre.health?.security?.adminTotp !== "DISABLED") {
  throw new Error(`INVALID isolated preview premise: ${pre.refuse ?? "admin TOTP must be disabled only for this synthetic test"}`);
}
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const contexts = [];
let admin, adminPage, pausedRail = false;
try {
  admin = await browser.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: "block" });
  contexts.push(admin);
  await post(BASE, admin, "seed-admin", { role: "ADMIN", phone: "+255700009064", name: "S14 Closure Operator" });
  await post(BASE, admin, "seed-markets");
  const pass = await mintStaffPass(browser, BASE, { phone: "+255700009065", name: "S14 Closure Support" });

  // P08: automation opt-in drives the actual first-visit timer and stored seen key.
  const first = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  contexts.push(first);
  await first.addCookies([asCookie(BASE, pass), { name: LOCALE_COOKIE, value: "en", url: BASE }]);
  await first.addInitScript(() => { localStorage.setItem("kp-primer-force", "1"); });
  const fp = await first.newPage();
  await fp.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
  const how = fp.locator('[data-testid="journey-howto-sheet"]:visible');
  await how.waitFor({ timeout: 30_000 });
  ok("P08.first", await how.isVisible(), "first-visit timer opened the How-to sheet");
  await shot(fp, "first-visit-howto");
  await fp.locator('.kp-howto:visible .kp-wsheet__act').click();
  await how.waitFor({ state: "hidden" });
  ok("P08.seen", await fp.evaluate(() => localStorage.getItem("50pick-howto-seen") === "1"), "dismissal stores seen key");
  await fp.reload({ waitUntil: "domcontentloaded" });
  await fp.waitForTimeout(1200);
  ok("P08.once", !(await how.count()), "later landing did not auto-open again");
  await fp.locator('[data-testid="journey-howto-card"]').click();
  await how.waitFor();
  ok("P08.reopen", await how.isVisible(), "card reopens the same guide");
  await fp.locator('.kp-howto:visible .kp-wsheet__act').click();

  // H12: read the actual below-list transition and document footer at phone width.
  const homeEnd = await fp.evaluate(() => {
    const last = [...document.querySelectorAll('.kp-jgrid [data-testid="journey-card"]')].at(-1);
    const footer = document.querySelector("footer");
    const main = document.querySelector("main");
    if (!last || !footer || !main) return null;
    return { lastBottom: last.getBoundingClientRect().bottom + scrollY,
      mainBottom: main.getBoundingClientRect().bottom + scrollY,
      footerTop: footer.getBoundingClientRect().top + scrollY,
      footerText: footer.textContent?.replace(/\s+/g, " ").slice(0, 90) ?? "",
      horizontalOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth };
  });
  ok("H12.order", !!homeEnd && homeEnd.lastBottom < homeEnd.footerTop && homeEnd.mainBottom <= homeEnd.footerTop + 1
    && homeEnd.horizontalOverflow <= 1, homeEnd ? `last card ${Math.round(homeEnd.lastBottom)}px; footer ${Math.round(homeEnd.footerTop)}px; overflow ${homeEnd.horizontalOverflow}px` : "missing end of page");
  await fp.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await fp.waitForTimeout(200);
  await shot(fp, "home-footer-390");
  await fp.close();

  // Fund both sides through the dev-only real bet ledger. A zero-pool frame cannot prove estimates.
  const short = await freshPlayer(browser, BASE, pass, { balance: 0, locale: "en", controlledNetwork: true });
  contexts.push(short.ctx);
  const page = await pageIn(BASE, short.ctx, "/", proof.errors);
  const firstPick = page.locator('[data-sheet] a[data-bet-side="YES"]').first();
  await firstPick.waitFor({ state: "visible" });
  const marketId = await firstPick.evaluate((a) => JSON.parse(a.closest("[data-sheet]").getAttribute("data-sheet")).id);
  await post(BASE, admin, "stress-bulk-bet", { marketId, n: 6, yesRatio: 1, stake: 1000, userPrefix: "s14closurey" });
  await post(BASE, admin, "stress-bulk-bet", { marketId, n: 6, yesRatio: 0, stake: 1000, userPrefix: "s14closuren" });
  await page.reload({ waitUntil: "domcontentloaded" });
  const card = page.locator(`[data-testid="journey-card"][data-row-id="${marketId}"]`).first();
  await card.waitFor({ state: "visible" });
  const sideRead = await card.evaluate((el) => [...el.querySelectorAll('[data-bet-side="YES"],[data-bet-side="NO"]')].map((a) => ({
    side: a.getAttribute("data-bet-side"), text: a.textContent?.replace(/\s+/g, " ").trim() ?? "" })));
  ok("H10", sideRead.length === 2 && sideRead.every((x) => /≈/.test(x.text)) && !sideRead.some((x) => /guarantee|fixed/i.test(x.text)),
    sideRead.map((x) => `${x.side}:${x.text.slice(0, 55)}`).join(" | "));
  await card.scrollIntoViewIfNeeded();
  await shot(page, "funded-card-390");
  const pricedPlayer = await freshPlayer(browser, BASE, pass, { balance: 100_000, locale: "en", controlledNetwork: true });
  contexts.push(pricedPlayer.ctx);
  const pricedPage = await pageIn(BASE, pricedPlayer.ctx, "/", proof.errors);
  await openSheet(pricedPage, marketId);
  await pricedPage.locator(`${S.root}[data-frame="edit"] .kp-bsheet__estimate`).waitFor({ timeout: 20_000 });
  const estimate = await pricedPage.locator(S.root).evaluate((el) => {
    const figure = el.querySelector(".kp-bsheet__estimate-figure"), mult = el.querySelector(".kp-bsheet__mult"), note = el.querySelector(".kp-bsheet__estimate .kp-bsheet__note");
    const top = (s) => el.querySelector(s)?.getBoundingClientRect().top ?? null;
    return { state: el.querySelector(".kp-bsheet__estimate")?.getAttribute("data-estimate-state"),
      figure: figure?.textContent?.trim() ?? "", mult: mult?.textContent?.trim() ?? "", note: note?.textContent?.trim() ?? "",
      figureTop: top(".kp-bsheet__estimate-figure"), multTop: top(".kp-bsheet__mult"), balanceTop: top(".kp-bsheet__balance") };
  });
  ok("B06", /≈\s*TZS\s*\d/.test(estimate.figure) && estimate.figureTop < estimate.multTop
    && estimate.multTop < estimate.balanceTop, `state=${estimate.state}; payout above multiple above balance`);
  ok("B07", /×/.test(estimate.mult) && /%/.test(estimate.note), `multiple and commission note visible`);
  await shot(pricedPage, "funded-edit-sheet-390");
  await pricedPage.close();
  await pricedPlayer.ctx.close();
  await openSheet(page, marketId);
  await page.locator(`${S.root}[data-frame="low"] .kp-bsheet__compact`).waitFor({ timeout: 20_000 });
  const lowCompact = await page.locator(`${S.root} .kp-bsheet__compact`).innerText();
  ok("L03", /≈/.test(lowCompact) && /×/.test(lowCompact), "low-balance sheet retains compact approximate payout and multiple");
  await shot(page, "funded-low-sheet-390");
  await page.setViewportSize({ width: 360, height: 640 });
  await page.locator(S.stake).focus();
  const cdp = await short.ctx.newCDPSession(page);
  try {
    await cdp.send("Runtime.evaluate", { expression: "Object.defineProperty(window.visualViewport,'height',{configurable:true,value:340});window.visualViewport.dispatchEvent(new Event('resize'));" });
    await page.locator('[data-testid="journey-sheet-estimate-compact"]').waitFor({ timeout: 8000 });
    await shot(page, "funded-low-keyboard-360x640");
  } finally {
    await cdp.send("Runtime.evaluate", { expression: "delete window.visualViewport.height;window.visualViewport.dispatchEvent(new Event('resize'));" }).catch(() => {});
    await cdp.detach().catch(() => {});
  }

  // D11: the short-height form reaches each money control by ordinary scrolling, with the fixed nav out of its hit area.
  await page.setViewportSize({ width: 360, height: 400 });
  await page.locator('[data-testid="journey-sheet-deposit"]').click();
  await page.waitForURL(/\/wallet\/deposit\?/);
  const form = page.locator('[data-testid="journey-deposit-form"]');
  await form.waitFor();
  const reach = async (locator) => {
    await locator.scrollIntoViewIfNeeded();
    return locator.evaluate((el) => {
      const r = el.getBoundingClientRect(), x = Math.max(1, Math.min(innerWidth - 2, (r.left + r.right) / 2));
      const y = Math.max(1, Math.min(innerHeight - 2, (r.top + r.bottom) / 2));
      return { top: Math.round(r.top), bottom: Math.round(r.bottom), hit: el === document.elementFromPoint(x, y) || el.contains(document.elementFromPoint(x, y)) };
    });
  };
  const amountReach = await reach(form.locator('input[name="amount"]'));
  const methodReach = await reach(form.locator('label:has(#provider-MPESA)'));
  const phoneReach = await reach(form.locator("#msisdn"));
  await page.locator("#msisdn").focus();
  const payReach = await reach(form.locator('button[type="submit"]'));
  ok("D11", [amountReach, methodReach, phoneReach, payReach].every((r) => r.hit && r.top >= 0 && r.bottom <= 400),
    `amount ${amountReach.top}-${amountReach.bottom}; method ${methodReach.top}-${methodReach.bottom}; phone ${phoneReach.top}-${phoneReach.bottom}; pay ${payReach.top}-${payReach.bottom}`);
  await shot(page, "deposit-pay-reached-360x400");

  // D04 baseline chips and a real account limit: the form must never offer a quick amount above the server's ceiling.
  const baselineChips = await form.locator('input[name="amount"]').locator('xpath=..').locator('xpath=..').locator('button[type="button"]').allTextContents();
  ok("D04.baseline", baselineChips.length === 6, `${baselineChips.length} amount chips before constraint`);
  const sibling = await browser.newContext({ viewport: { width: 1280, height: 900 } }); contexts.push(sibling);
  await sibling.addCookies(await short.ctx.cookies(BASE));
  const limits = await pageIn(BASE, sibling, "/profile/responsible-gambling", proof.errors);
  const limitForm = limits.locator('form:has(input[name="dailyLossLimit"])');
  await limitForm.locator('input[name="dailyDepositLimit"]').fill("1500");
  await limitForm.locator('button[type="submit"]').click();
  await limits.waitForURL((url) => url.searchParams.get("saved") === "1");
  await page.reload({ waitUntil: "domcontentloaded" });
  await form.waitFor();
  const max = Number(await form.locator('input[name="amount"]').getAttribute("max"));
  const constrained = await form.locator('input[name="amount"]').locator('xpath=..').locator('xpath=..').locator('button[type="button"]').allTextContents();
  ok("D04.ceiling", max === 1500 && constrained.length > 0 && constrained.every((x) => Number(x.replaceAll(",", "")) <= max),
    `max=${max}; chips=${constrained.join(",")}`);
  await shot(page, "deposit-ceiling-360x400", true);
  const originalDepositUrl = page.url();
  const highRequest = new URL(originalDepositUrl);
  highRequest.searchParams.set("amount", "5000");
  await page.goto(highRequest.href, { waitUntil: "domcontentloaded" });
  await form.waitFor();
  const clamped = await form.locator('input[name="amount"]').inputValue();
  const clampNotice = await page.locator('[data-testid="journey-deposit-ceiling-note"]').innerText();
  ok("D04.clamped", clamped === "1500" && /5,000/.test(clampNotice),
    `requested=5,000; shown=${clamped}; limit notice visible`);
  await page.goto(originalDepositUrl, { waitUntil: "domcontentloaded" });
  await form.waitFor();
  // Less than the TZS 1,000 deposit minimum leaves no legal amount. In particular,
  // the carried shortfall must not silently promote the input back to TZS 1,000.
  await limitForm.locator('input[name="dailyDepositLimit"]').fill("500");
  await limitForm.locator('button[type="submit"]').click();
  await limits.waitForURL((url) => url.searchParams.get("saved") === "1");
  await page.reload({ waitUntil: "domcontentloaded" });
  await form.waitFor();
  const belowMin = {
    max: Number(await form.locator('input[name="amount"]').getAttribute("max")),
    value: await form.locator('input[name="amount"]').inputValue(),
    chips: await form.locator('input[name="amount"]').locator('xpath=..').locator('xpath=..').locator('button[type="button"]').count(),
    disabled: await form.locator('button[type="submit"]').isDisabled(),
    notice: await page.locator('[data-testid="journey-deposit-ceiling-note"]').innerText(),
  };
  ok("D04.belowMinimum", belowMin.max === 500 && belowMin.value === "" && belowMin.chips === 0
    && belowMin.disabled && /limit/i.test(belowMin.notice),
    `max=${belowMin.max}; empty=${belowMin.value === ""}; chips=${belowMin.chips}; payDisabled=${belowMin.disabled}`);
  await shot(page, "deposit-below-minimum-360x400", true);

  // D05 one paused wallet method, no default, explicit choice on an enabled method. Restore the synthetic switch.
  adminPage = await pageIn(BASE, admin, "/admin/payments?tab=health", proof.errors);
  const live = adminPage.getByRole("button", { name: "Deposits LIVE", exact: true });
  const paused = adminPage.getByRole("button", { name: "Deposits PAUSED", exact: true });
  ok("D05.premise", await live.count() === 4 && await paused.count() === 0, "four synthetic wallet rails live");
  await live.first().click();
  await adminPage.getByPlaceholder("PAUSE", { exact: true }).fill("PAUSE");
  await adminPage.getByRole("button", { name: "Pause", exact: true }).click();
  await paused.waitFor({ state: "visible" }); pausedRail = true;
  await page.reload({ waitUntil: "domcontentloaded" });
  await form.waitFor();
  const radios = await form.locator('input[name="provider"]').evaluateAll((nodes) => nodes.map((n) => ({ value: n.value, disabled: n.disabled, checked: n.checked })));
  ok("D05.filter", radios.length === 4 && radios.filter((x) => x.disabled).length === 1
    && radios.filter((x) => !x.disabled).length === 3 && radios.every((x) => !x.checked), "one paused rail disabled; three enabled; no preselection");
  const active = radios.find((x) => !x.disabled).value;
  await form.locator(`label:has(#provider-${active})`).click();
  const chosen = await form.locator('input[name="provider"]:checked').getAttribute("value");
  ok("D05.choice", chosen === active, "an enabled wallet rail was selected deliberately");
  await shot(page, "deposit-one-rail-paused-360x400");
  await paused.first().click();
  await live.first().waitFor({ state: "visible" }); pausedRail = false;
  // D01: the focused header's own Back link is actionable. The selected bet
  // remains owned by the tab if the player then returns to this form.
  await page.locator('a[href="/wallet"]').first().click();
  await page.waitForURL((url) => url.pathname === "/wallet");
  ok("D01.back", new URL(page.url()).pathname === "/wallet", "focused Back navigated to Wallet");
  await page.goBack();
  await form.waitFor();
  const carried = await page.locator('[data-testid="journey-deposit-bet-strip"]').innerText();
  ok("D01.choice", /YES/.test(carried) && /TZS\s*500/.test(carried), "history return retained chosen side and stake");
  await page.close();
  await short.ctx.close();

  // B10 and B02/B11: a funded owner; Escape and browser Back close before placing, but not while a real action is held.
  const funded = await freshPlayer(browser, BASE, pass, { balance: 100_000, locale: "en", controlledNetwork: true });
  contexts.push(funded.ctx);
  const bp = await pageIn(BASE, funded.ctx, "/", proof.errors);
  const chosenSeed = await openSheet(bp);
  const initialFocus = await bp.evaluate(() => document.activeElement?.classList.contains("kp-bsheet__title") === true);
  ok("B10.focus", initialFocus, "opening focuses sheet heading");
  await bp.keyboard.press("Escape");
  await bp.locator(S.root).waitFor({ state: "hidden" });
  ok("B10.escape", !(await bp.locator(S.root).count()), "Escape dismissed idle sheet");
  await openSheet(bp, chosenSeed.id);
  await bp.goBack();
  await bp.locator(S.root).waitFor({ state: "hidden" });
  ok("B10.back", !(await bp.locator(S.root).count()), "browser Back dismissed idle sheet");
  await openSheet(bp, chosenSeed.id);
  const before = await observed(BASE, funded.ctx, chosenSeed.id);
  const held = [], requests = [];
  bp.on("request", (req) => { if (req.method() === "POST" && req.headers()["next-action"] && req.postData()?.includes("idempotencyKey")) requests.push(req); });
  await bp.route("**/*", (route) => {
    const req = route.request();
    if (req.method() === "POST" && req.headers()["next-action"] && req.postData()?.includes("idempotencyKey")) { held.push(route); return; }
    return route.fallback();
  });
  await bp.locator(S.place).click();
  await bp.locator(`${S.root}[data-frame="placing"]`).waitFor({ timeout: 20_000 });
  await bp.keyboard.press("Escape");
  ok("B02", await bp.locator(S.root).count() === 1 && await bp.locator(S.close).isDisabled(),
    "close visible but disabled; Escape did not release held placing request");
  await shot(bp, "bet-placing-held-390");
  for (const route of held) await route.abort("failed");
  await bp.locator(`${S.root}[data-frame="inDoubt"]`).waitFor({ timeout: 20_000 });
  const refusal = await bp.locator(S.root).evaluate((el) => {
    const line = el.querySelector(".kp-bsheet__lines"), cta = el.querySelector('[data-testid="journey-sheet-place"]');
    return { text: line?.textContent?.replace(/\s+/g, " ").trim() ?? "", above: !!line && !!cta && line.getBoundingClientRect().bottom <= cta.getBoundingClientRect().top + 1,
      visible: !!line && line.getBoundingClientRect().top >= 0 && line.getBoundingClientRect().bottom <= innerHeight };
  });
  const after = await observed(BASE, funded.ctx, chosenSeed.id);
  ok("B11", requests.length === 1 && before.positionCount === after.positionCount && before.betPlacedCount === after.betPlacedCount
    && refusal.text.length > 0 && refusal.above && refusal.visible,
    `one action; no bet; inline refusal above action and visible`);
  await shot(bp, "bet-inline-failure-390");
  await bp.close();
} catch (error) {
  proof.error = String(error?.stack ?? error).slice(0, 2000);
  console.error(`S14 frame closure failed: ${String(error?.message ?? error).slice(0, 300)}`);
  process.exitCode = 1;
} finally {
  if (pausedRail && adminPage) {
    await adminPage.getByRole("button", { name: "Deposits PAUSED", exact: true }).first().click().catch(() => {});
  }
  proof.completedAt = new Date().toISOString();
  writeFileSync(resolve(OUT, "evidence.json"), JSON.stringify(proof, null, 2));
  for (const ctx of contexts) await ctx.close().catch(() => {});
  await browser.close();
}
if (!process.exitCode) console.log(`S14 frame closure: ${proof.checks.length} passed, 0 failed`);
