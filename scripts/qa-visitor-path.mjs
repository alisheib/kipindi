/** S10 WP8a: local, in-memory browser drive from a journey guest's pick through a real registration and first bet.
 * KP_BASE=http://localhost:3043 npm run qa:visitor-path -- [OUTSIDE_REPO_OUTPUT]
 * KP_ONLY=core,tiles selects groups. ENGINE=webkit runs the same browser controls in WebKit.
 * Requires a local dev server with DISABLE_ADMIN_TOTP=true. Production and configured databases are refused.
 */
import { chromium, webkit } from "playwright";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { localBase, premise, mintStaffPass, LOCALE_COOKIE, SESSION_COOKIE } from "./live/journey-pass.mjs";
import { visitorFaceFacts, visitorFaceErrors, visitorPageControls, overlaps } from "./live/visitor-cells.mjs";

const BASE = process.env.KP_BASE ?? "http://localhost:3043";
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = resolve(process.argv[2] ?? join(tmpdir(), `qa-visitor-path-${Date.now()}`));
const rel = relative(ROOT, OUT);
if (!rel.startsWith("..") && !isAbsolute(rel)) { console.error("REFUSED: output must be outside the repository"); process.exit(2); }
const sections = ["core", "tiles", "classic"];
const only = (process.env.KP_ONLY ?? "").split(",").filter(Boolean);
if (only.some(s => !sections.includes(s))) { console.error(`REFUSED: KP_ONLY must name ${sections.join(",")}`); process.exit(2); }
const run = s => !only.length || only.includes(s);
const locales = (process.env.KP_LOCALES ?? "sw,en,zh").split(",").filter(Boolean);
const widths = (process.env.KP_WIDTHS ?? "320,360,390,768,1280,1920").split(",").map(Number);
if (locales.some(s => !["sw", "en", "zh"].includes(s)) || widths.some(n => ![320,360,390,768,1280,1920].includes(n))) {
  console.error("REFUSED: invalid locale or width"); process.exit(2);
}
const pre = await premise(BASE);
const withdrawnClassic = pre.health?.simpleJourney?.state === "WITHDRAWN" && only.length === 1 && only[0] === "classic";
if (!localBase(BASE) || pre.health?.database?.configured !== false || pre.health?.security?.adminTotp !== "DISABLED"
  || pre.refuse && !withdrawnClassic) {
  console.error(`REFUSED: ${pre.refuse ?? "local preview needs DISABLE_ADMIN_TOTP=true"}`); process.exit(2);
}
mkdirSync(OUT, { recursive: true });
const results = [], errors = [], contexts = new Set();
const record = (label, pass, detail = "") => {
  results.push({ label, state: pass ? "PASS" : "FAIL", detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
};
const missing = (label, reason) => { results.push({ label, state: "NOT MEASURED", detail: reason }); console.log(`NOT MEASURED ${label} — ${reason}`); };
const engine = process.env.ENGINE === "webkit" ? webkit : chromium;
const browser = await engine.launch(process.env.QA_CHROMIUM_PATH && engine === chromium ? { executablePath: process.env.QA_CHROMIUM_PATH } : {});
const cookie = c => ({ name: c.name, value: c.value, domain: new URL(BASE).hostname, path: c.path || "/" });
const height = width => width <= 360 ? 640 : width === 390 ? 844 : width === 768 ? 1024 : width === 1280 ? 900 : 1080;
let preview;
try { preview = await mintStaffPass(browser, BASE, { phone: "+255700000098", name: "Visitor QA Support" }); }
catch (error) {
  if (withdrawnClassic) missing("I WITHDRAWN classic with a staff pass", `Pass could not be minted while withdrawn: ${String(error.message).split("Call log:")[0].trim()}`);
  else {
    console.error(`INVALID staff-pass premise: ${String(error.message).split("Call log:")[0].trim()}`);
    await browser.close(); process.exit(2);
  }
}
async function context(locale = "sw", width = 390, withPass = true) {
  const ctx = await browser.newContext({ viewport: { width, height: height(width) }, serviceWorkers: "block" });
  contexts.add(ctx);
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, ...(withPass && preview ? [cookie(preview)] : [])]);
  return ctx;
}
async function pageIn(ctx, route) {
  const page = await ctx.newPage();
  page.on("console", msg => { if (msg.type() === "error" || /hydration failed|hydrated but|didn't match/i.test(msg.text())) errors.push({ route, kind: "console", text: msg.text() }); });
  page.on("pageerror", err => errors.push({ route, kind: "pageerror", text: err.message }));
  await page.goto(BASE + route, { waitUntil: "domcontentloaded", timeout: 240_000 });
  await page.locator("main").waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1200);
  return page;
}
async function post(ctx, route, data = {}) {
  const response = await ctx.request.post(`${BASE}/api/dev-test/${route}`, { data, timeout: 240_000 });
  const body = await response.json().catch(() => null);
  if (!response.ok() || body?.ok === false) throw new Error(`${route} premise failed (${response.status()})`);
  return body;
}
async function observe(ctx, id) {
  const response = await ctx.request.get(`${BASE}/api/dev-test/bet-sheet-observe?marketId=${encodeURIComponent(id)}`);
  const body = await response.json().catch(() => null);
  if (!response.ok() || !body?.ok) throw new Error(`owner-row observation failed (${response.status()})`);
  return body;
}
const summary = f => ({ path: f.path, frame: f.frame, guest: f.guest, stake: f.stake, balance: f.balance, place: f.place,
  viewport: f.viewport, scrollWidth: f.scrollWidth, tapMin: f.tapMin, signUp: f.signUp, signIn: f.signIn,
  marker: f.marker ? { present: true, keyed: /"k"\s*:/.test(f.marker), owned: /"owner"\s*:/.test(f.marker) } : { present: false } });
async function screenshot(page, label) {
  await page.evaluate(() => document.fonts.ready);
  const file = `${label.replace(/[^a-z0-9-]+/gi, "-")}.png`;
  await page.screenshot({ path: join(OUT, file), fullPage: false });
  results.push({ label, state: "TILE", file });
}
async function fillRegister(page, local, email, password) {
  await page.locator("#phone").fill(local);
  await page.locator("#email").fill(email);
  await page.locator("#dob").fill("15");
  await page.locator("#dob").locator("xpath=../..").locator("input[type='text']").nth(1).fill("01");
  await page.locator("#dob").locator("xpath=../..").locator("input[type='text']").nth(2).fill("1990");
  await page.locator('input[name="dob"]').waitFor();
  if (await page.locator('input[name="dob"]').inputValue() !== "1990-01-15") throw new Error("DOB form premise did not bind");
  await page.locator('input[name="password"]').fill(password);
  await page.locator('input[name="passwordConfirm"]').fill(password);
  await page.locator('input[name="acceptAge"]').check({ force: true });
  await page.locator('input[name="acceptTerms"]').check({ force: true });
}
const admin = await context("en", 1280, false);
const catalogue = await post(admin, "seed-markets");
await post(admin, "reset-rate-limits");
if (!catalogue?.ids?.length) { console.error("INVALID: seeded board has no markets"); await browser.close(); process.exit(2); }
const evidence = { base: BASE, engine: process.env.ENGINE ?? "chromium", flag: pre.health.simpleJourney?.state,
  revision: pre.health.deploymentId ?? null, results, errors, faces: [] };

try {
  if (run("core")) {
    const guest = await context("sw");
    const ref = "50PICK-AG-ABC123", invite = "INV-9";
    const page = await pageIn(guest, `/?ref=${ref}&invite=${invite}`);
    const pick = page.locator('[data-sheet] a[data-bet-side="YES"]').first();
    await pick.waitFor({ timeout: 60_000 });
    const seed = await pick.locator("xpath=ancestor::*[@data-sheet][1]").getAttribute("data-sheet").then(JSON.parse);
    record("A premise: public bettable market seed", seed?.bettable === true && seed?.min > 0 && seed?.max >= seed?.min);
    await pick.click();
    await page.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
    const plain = await page.evaluate(visitorFaceFacts);
    const next = `/?bet=${seed.id}.YES.${seed.min}`;
    const expected = { min: seed.min, next, ref, invite };
    const faceErrors = visitorFaceErrors(plain, expected);
    record("A guest sheet, two doors and minimum", faceErrors.length === 0, faceErrors.join(", "));
    evidence.faces.push({ label: "core-open", ...summary(plain) });
    record("A page-only mutation controls", visitorPageControls(plain, expected).every(control => control.caught));
    record("A tap opens in place", new URL(page.url()).pathname === "/" && plain.guest && new URL(page.url()).searchParams.has("bet"));
    await screenshot(page, "core-guest-open-sw-390");
    await page.locator('[data-testid="journey-bet-sheet"] .kp-bsheet__close').click();
    await page.locator('[data-testid="journey-bet-sheet"]').waitFor({ state: "detached", timeout: 30_000 });
    record("A Back closes the guest sheet", !new URL(page.url()).searchParams.has("bet"));
    await pick.click();
    await page.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
    record("A reload reopens at minimum", await page.getByTestId("journey-sheet-stake").inputValue() === String(seed.min));
    const forwarded = await context("sw");
    const forwardPage = await pageIn(forwarded, `/?bet=${seed.id}.YES.50000`);
    await forwardPage.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
    record("A forwarded URL cannot set the stake", await forwardPage.getByTestId("journey-sheet-stake").inputValue() === String(seed.min));
    await forwarded.close(); contexts.delete(forwarded);
    const campaign = await context("sw");
    const campaignPage = await pageIn(campaign, `/markets/${seed.id}?side=YES&utm_source=a&utm_campaign=b`);
    await campaignPage.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
    record("A campaign question opens at minimum", await campaignPage.getByTestId("journey-sheet-stake").inputValue() === String(seed.min));
    await campaign.close(); contexts.delete(campaign);
    const live = await context("sw");
    const livePage = await pageIn(live, "/live");
    await livePage.locator('[data-sheet] a[data-bet-side="YES"]').first().click();
    await livePage.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
    record("A live pick opens in place", new URL(livePage.url()).pathname === "/live");
    await live.close(); contexts.delete(live);
    const question = await context("sw");
    const questionPage = await pageIn(question, `/markets/${seed.id}`);
    await questionPage.locator('[data-testid="journey-bet-buttons"] a[data-bet-side="NO"]').click();
    await questionPage.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
    record("A question big button opens in place", new URL(questionPage.url()).pathname === `/markets/${seed.id}`);
    await questionPage.locator('[data-testid="journey-bet-sheet"] .kp-bsheet__close').click();
    await questionPage.locator('[data-testid="journey-bet-sheet"]').waitFor({ state: "detached", timeout: 30_000 });
    const similar = questionPage.locator('[data-testid="journey-card"][data-sheet] a[data-bet-side]').first();
    if (await similar.count()) {
      await similar.click();
      await questionPage.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
      record("A similar-rail pick opens in place", new URL(questionPage.url()).pathname === `/markets/${seed.id}`);
    } else missing("A similar-rail pick", "The seeded question displayed no bettable similar card");
    await question.close(); contexts.delete(question);
    const chosen = Math.min(seed.max, Math.max(seed.min, 5000));
    await page.getByTestId("journey-sheet-stake").fill(String(chosen));
    const changed = await page.evaluate(visitorFaceFacts);
    record("A editable guest stake", Number(changed.stake) === chosen);
    const carried = `/?bet=${seed.id}.YES.${chosen}`;
    record("B door carries page, codes and chosen stake", visitorFaceErrors(changed, { next: carried, ref, invite }).filter(s => s === "guest.doors").length === 0);
    await page.getByTestId("journey-sheet-signup").click();
    await page.waitForURL(url => url.pathname === "/auth/register", { timeout: 60_000 });
    const registerUrl = new URL(page.url());
    const marker = await page.evaluate(() => sessionStorage.getItem("kp-pending-bet"));
    const mark = (() => { try { return JSON.parse(marker); } catch { return null; } })();
    record("B keyless, ownerless marker and safe next", !!mark && mark.bet === `${seed.id}.YES.${chosen}` && !mark.k && !mark.owner
      && registerUrl.searchParams.get("next") === carried && registerUrl.searchParams.get("ref") === ref
      && registerUrl.searchParams.get("invite") === invite);
    await page.goBack({ waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
    record("B Back reopens at chosen stake", new URL(page.url()).searchParams.get("bet") === `${seed.id}.YES.${chosen}`
      && await page.getByTestId("journey-sheet-stake").inputValue() === String(chosen));
    await page.getByTestId("journey-sheet-signup").click();
    await page.waitForURL(url => url.pathname === "/auth/register", { timeout: 60_000 });
    const suffix = randomBytes(5).toString("hex");
    const local = `71${String(BigInt(`0x${suffix}`) % 10_000_000n).padStart(7, "0")}`;
    const phone = `+255${local}`, email = `visitor-${suffix}@example.com`, password = `Voda2026!${suffix}Aa`;
    await fillRegister(page, local, email, password);
    await Promise.all([page.waitForURL(url => url.searchParams.get("welcome") === "new", { timeout: 120_000 }),
      page.locator('button[type="submit"]').click()]);
    const landing = new URL(page.url());
    record("C real registration returns to chosen page", landing.pathname === "/" && landing.searchParams.get("bet") === `${seed.id}.YES.${chosen}`
      && landing.searchParams.get("welcome") === "new");
    await page.locator('[data-testid="journey-bet-sheet"]:not([data-guest])').waitFor({ timeout: 60_000 });
    await page.locator(".mat-toast").waitFor({ state: "visible", timeout: 4_000 }).catch(() => {});
    const money = await page.evaluate(visitorFaceFacts);
    evidence.faces.push({ label: "registered-low", ...summary(money) });
    record("C money sheet opens at visitor stake", !money.guest && Number(money.stake) === chosen);
    if (money.toast) record("J greeting clears chip row and close", !overlaps(money.toast, money.chips) && !overlaps(money.toast, money.close));
    else missing("J greeting beside returned sheet", "The toast was not visible in this 390px Swahili cell");
    record("C low balance offers deposit, no commit", await page.getByTestId("journey-sheet-deposit").count() === 1
      && await page.getByTestId("journey-sheet-place").count() === 0);
    const before = await observe(guest, seed.id);
    record("C no implicit position or BET_PLACED row", before.positionCount === 0 && before.betPlacedCount === 0);
    await screenshot(page, "core-registered-low-sw-390");
    const accountCookie = (await guest.cookies(BASE)).find(item => item.name === SESSION_COOKIE);
    if (!accountCookie) throw new Error("registered account session cookie missing");
    for (const locale of locales) for (const width of widths.filter(n => n <= 390)) {
      const tileCtx = await context(locale, width);
      await tileCtx.addCookies([cookie(accountCookie)]);
      const tilePage = await pageIn(tileCtx, landing.pathname + landing.search);
      await tilePage.locator('[data-testid="journey-bet-sheet"]:not([data-guest])').waitFor({ timeout: 60_000 });
      await tilePage.locator(".mat-toast").waitFor({ state: "visible", timeout: 4_000 }).catch(() => {});
      await tilePage.evaluate(() => document.fonts.ready);
      const fact = await tilePage.evaluate(visitorFaceFacts);
      const overlap = overlaps(fact.toast, fact.chips) || overlaps(fact.toast, fact.close);
      record(`J greeting and money sheet ${locale} ${width}`, !!fact.toast && !overlap && fact.scrollWidth <= width + 1,
        fact.toast ? overlap ? "toast overlaps chip row or close" : "" : "greeting not visible");
      evidence.faces.push({ label: `money-greeting-${locale}-${width}`, ...summary(fact) });
      await screenshot(tilePage, `money-greeting-${locale}-${width}`);
      await tileCtx.close(); contexts.delete(tileCtx);
    }
    await page.getByTestId("journey-sheet-deposit").click();
    await page.waitForURL(url => url.pathname === "/wallet/deposit", { timeout: 60_000 });
    const deposit = new URL(page.url());
    record("C deposit link keeps amount and bet", Number(deposit.searchParams.get("amount")) >= chosen
      && deposit.searchParams.get("bet") === `${seed.id}.YES.${chosen}`);
    const anonymous = await context("sw");
    const edge = await anonymous.request.get(`${BASE}/wallet/deposit?amount=5000&bet=${seed.id}.YES.5000&from=low-balance`, { maxRedirects: 0 });
    const location = new URL(edge.headers().location ?? "/", BASE);
    record("M signed-out deposit keeps its full query in next", edge.status() === 307 && location.pathname === "/auth/login"
      && location.searchParams.get("next") === `/wallet/deposit?amount=5000&bet=${seed.id}.YES.5000&from=low-balance`);
    await anonymous.close(); contexts.delete(anonymous);
    await post(admin, "seed-wallet", { phone, amount: Math.max(100_000, chosen) });
    await page.goto(BASE + carried, { waitUntil: "domcontentloaded" });
    await page.locator('[data-testid="journey-bet-sheet"]:not([data-guest])').waitFor({ timeout: 60_000 });
    record("D funded return edits at chosen stake", await page.getByTestId("journey-sheet-stake").inputValue() === String(chosen)
      && await page.getByTestId("journey-sheet-place").count() === 1);
    const beforeBet = await observe(guest, seed.id);
    record("D funding wrote no bet", beforeBet.positionCount === 0 && beforeBet.betPlacedCount === 0);
    await page.getByTestId("journey-sheet-place").click();
    await page.locator('[data-testid="journey-bet-sheet"][data-frame="receipt"]').waitFor({ timeout: 90_000 });
    const afterBet = await observe(guest, seed.id);
    record("D one explicit bet tap writes one position and one row", afterBet.positionCount === 1 && afterBet.betPlacedCount === 1);
    await screenshot(page, "core-first-bet-receipt-sw-390");
    await guest.close(); contexts.delete(guest);
    const loginSuffix = randomBytes(5).toString("hex");
    const loginLocal = `71${String(BigInt(`0x${loginSuffix}`) % 10_000_000n).padStart(7, "0")}`;
    const loginPhone = `+255${loginLocal}`, loginPassword = `Voda2026!${loginSuffix}Aa`;
    const seededPlayer = await post(admin, "seed-admin", { role: "PLAYER", phone: loginPhone, name: "Visitor QA Player", password: loginPassword, balance: 100_000 });
    record("E premise: fresh funded player", !!seededPlayer.userId && !seededPlayer.note);
    const returning = await context("en");
    const loginPage = await pageIn(returning, `/?bet=${seed.id}.YES`);
    await loginPage.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
    await loginPage.getByTestId("journey-sheet-signin").click();
    await loginPage.waitForURL(url => url.pathname === "/auth/login", { timeout: 60_000 });
    await loginPage.locator("#identifier").fill(loginLocal);
    await loginPage.locator("#password").fill(loginPassword);
    await Promise.all([loginPage.waitForURL(url => url.searchParams.get("welcome") === "back", { timeout: 120_000 }),
      loginPage.locator('form:has(input[name="identifier"]) button[type="submit"]').click()]);
    const signedIn = new URL(loginPage.url());
    record("E real password sign-in returns to the guest's choice", signedIn.pathname === "/"
      && signedIn.searchParams.get("bet") === `${seed.id}.YES.${seed.min}` && signedIn.searchParams.get("welcome") === "back");
    await loginPage.locator('[data-testid="journey-bet-sheet"]:not([data-guest])').waitFor({ timeout: 60_000 });
    const loginBefore = await observe(returning, seed.id);
    record("E sign-in alone places nothing", loginBefore.positionCount === 0 && loginBefore.betPlacedCount === 0);
    await loginPage.getByTestId("journey-sheet-place").click();
    await loginPage.locator('[data-testid="journey-bet-sheet"][data-frame="receipt"]').waitFor({ timeout: 90_000 });
    const loginAfter = await observe(returning, seed.id);
    record("E one signed-in tap writes one bet", loginAfter.positionCount === 1 && loginAfter.betPlacedCount === 1);
    await returning.close(); contexts.delete(returning);
  }
  if (run("classic")) {
    if (pre.health.simpleJourney?.state === "ACTIVE") missing("H classic no-pass control", "ACTIVE shows journey to every guest; run a STAFF_PREVIEW or WITHDRAWN local server");
    else {
      const classic = await context("sw", 390, pre.health.simpleJourney?.state === "WITHDRAWN");
      const oldHome = await pageIn(classic, "/");
      record("H classic home shows no journey guest host", await oldHome.locator('[data-testid="journey-card"]').count() === 0
        && await oldHome.locator('[data-testid="journey-bet-sheet"][data-guest]').count() === 0);
      await screenshot(oldHome, "classic-home-guest-sw-390");
      const oldPage = await pageIn(classic, `/markets/${catalogue.ids[0].id}?side=YES`);
      record("H classic question has its guest panel and no journey host", await oldPage.locator('[data-testid="journey-bet-buttons"]').count() === 0
        && await oldPage.locator('[data-testid="journey-bet-sheet"][data-guest]').count() === 0
        && await oldPage.locator('[data-testid="side-picker"]').count() === 1);
      await screenshot(oldPage, "classic-question-guest-sw-390");
      await classic.close(); contexts.delete(classic);
    }
  }
  if (run("tiles")) for (const locale of locales) for (const width of widths) {
    const ctx = await context(locale, width);
    const page = await pageIn(ctx, `/?bet=${catalogue.ids[0].id}.YES`);
    await page.locator('[data-testid="journey-bet-sheet"][data-guest]').waitFor({ timeout: 30_000 });
    await page.evaluate(() => document.fonts.ready);
    const facts = await page.evaluate(visitorFaceFacts);
    const faceErrors = visitorFaceErrors(facts, { min: facts.seed?.min, next: `/?bet=${catalogue.ids[0].id}.YES.${facts.seed?.min}` });
    record(`N guest tile ${locale} ${width}`, faceErrors.length === 0, faceErrors.join(", "));
    record(`J greeting leaves chip and close free ${locale} ${width}`, !overlaps(facts.toast, facts.chips) && !overlaps(facts.toast, facts.close));
    evidence.faces.push({ label: `guest-${locale}-${width}`, ...summary(facts) });
    await screenshot(page, `guest-${locale}-${width}`);
    await ctx.close(); contexts.delete(ctx);
  }
  if (run("core") || run("tiles")) {
    missing("A closed, one-sided, moved-pool and keyboard matrix", "Needs the host's controlled market states and WebKit run");
    missing("F valid bound codes, G refusals and I second flag state", "Next WP8a package");
    missing("K ended-session, L focus/keyboard and O production tap frame", "Next WP8a package");
  }
} catch (error) {
  record("drive exception", false, String(error?.message ?? error).split("Call log:")[0].slice(0, 400));
} finally {
  for (const ctx of contexts) await ctx.close().catch(() => {});
  await browser.close();
  writeFileSync(join(OUT, "evidence.json"), JSON.stringify(evidence, null, 2));
  console.log(`qa:visitor-path evidence ${OUT}`);
  console.log(`${results.filter(row => row.state === "PASS").length} pass, ${results.filter(row => row.state === "FAIL").length} fail, ${results.filter(row => row.state === "NOT MEASURED").length} not measured`);
  process.exitCode = results.some(row => row.state === "FAIL") || errors.length ? 1 : results.some(row => row.state === "NOT MEASURED") ? 3 : 0;
}
