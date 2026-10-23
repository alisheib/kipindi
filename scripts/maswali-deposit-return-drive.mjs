/**
 * qa:maswali-deposit-return — MB-57 IN A BROWSER: A DEPOSIT STARTED FROM THE MILLIONEA SLIP LEADS BACK TO THE SLIP, EVERY
 * ANSWER OF EVERY TICKET KEPT, NOTHING BOUGHT BY ITSELF (MASWALI-BUILD FLOW 3, the lead's ruling of 2026-10-23; MASWALI-PLAN
 * §8 MB-57; the rule: `src/lib/journey/slip-return.ts`).
 *
 *   BASE=http://localhost:<port> node scripts/maswali-deposit-return-drive.mjs              (MLN_RETURN_MODE=drawn, default)
 *   BASE=http://localhost:<port> MLN_RETURN_MODE=dark node scripts/maswali-deposit-return-drive.mjs
 *   BASE=http://localhost:<port> MLN_RETURN_PLANT=1 node scripts/maswali-deposit-return-drive.mjs   (the plant, below)
 *
 * ⚠️ PREMISE — a FRESH in-memory `next dev` (no DATABASE_URL; the local mock payment rail, which confirms a deposit at once),
 *    DISABLE_ADMIN_TOTP=true (the staff pass for the journey shell), MASWALI_SCHEDULER=false and LIFECYCLE_TICKER=false;
 *    drawn: FEATURE_MILLIONEA=ACTIVE (it seeds the weeks itself); dark: no FEATURE_MILLIONEA (the shipped WITHDRAWN ceiling).
 *
 * DRAWN — for each shell (classic: the demo player as a classic reader; journey: with a staff preview pass), each language
 * (Swahili first) and each width (360, 1280): the demo player with an empty wallet fills the slip (every answer chosen,
 * a pattern of its own per case), presses Continue, meets the confirm's low balance, takes its deposit door, and the deposit
 * page carries the way back (`returnPath=/millionea/slip`); the payment goes through the form as a player sends it, and the
 * player lands on the wait page, which says the money arrived and that the answers wait (`millionea.depositPaidSlip`) and
 * offers "Return to your answers" (`deposit-slip-return`); pressed, it opens the slip with every answer of every ticket as
 * chosen, and the confirm now offers the buy, not a deposit. The multi-ticket case (two tickets, different answers) runs in
 * the classic shell in Swahili at 360 and in the journey shell in English at 1280. Every page: <html lang> = the cookie, no
 * horizontal overflow, no page error; tiles in `.50pick-shots/maswali-deposit-return/`, read one by one.
 * A deposit NOT started from the slip lands where it always did, with no slip door (the control).
 * DARK — Millionea hidden from the reader: a deposit page asked for the slip's way back carries none, a deposit sent with
 * it lands where any classic deposit lands (the wallet's result), and a wait page asked for it draws no door, no word.
 * THE PLANT (MLN_RETURN_PLANT=1, drawn only): the slip dropped from the allowed returns (`SLIP_RETURN_PATHS`) on this
 * running server; one case must then find no way back (caught), and the file is restored byte for byte, then checked.
 * ⛔ Local only (`premise`). It moves money only through the product's own deposit, on the local mock rail.
 */
import { chromium } from "playwright";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { premise, mintStaffPass, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3740";
const MODE = process.env.MLN_RETURN_MODE === "dark" ? "dark" : "drawn";
const PLANT = process.env.MLN_RETURN_PLANT === "1";
const OUT = ".50pick-shots/maswali-deposit-return";
const RULE_FILE = "src/lib/journey/slip-return.ts";
const RULE_LINE = "export const SLIP_RETURN_PATHS: readonly string[] = [MILLIONEA_SLIP_RETURN];";
/** The words a reader sees, per language — the dictionary's, read back here so a renamed key is caught. */
const WORDS = {
  en: { door: "Return to your answers", paid: "Payment received", body: /Return to your Millionea answers and confirm to buy/ },
  sw: { door: "Rudi kwenye majibu yako", paid: "Malipo yamepokelewa", body: /Rudi kwenye majibu yako ya Millionea/ },
  zh: { door: "返回您的答案", paid: "已收到付款", body: /返回您的 Millionea 答案/ },
};

let pass = 0, fail = 0;
const ok = (n, c, e = "") => { if (c) { pass++; console.log(`PASS ${n}`); } else { fail++; console.log(`FAIL ${n}${e ? ` — ${e}` : ""}`); } };
const die = (why) => { console.error(`\nPREMISE ABSENT — ${why}\n`); process.exit(2); };

const pre = await premise(BASE);
if (pre.refuse) die(pre.refuse);
const ml = pre.health?.millionea;
if (MODE === "drawn" && ml?.state !== "ACTIVE") die(`drawn needs FEATURE_MILLIONEA=ACTIVE; /api/health says ${JSON.stringify(ml)}`);
if (MODE === "dark" && ml?.state !== "WITHDRAWN") die(`dark needs the shipped WITHDRAWN ceiling; /api/health says ${JSON.stringify(ml)}`);
if (PLANT && MODE !== "drawn") die("the plant runs on a drawn server");
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const errors = [];
const settle = async (page) => {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const oneShot = document.getAnimations().filter((a) => a.effect?.getTiming().iterations !== Infinity);
    await Promise.all(oneShot.map((a) => a.finished.catch(() => {})));
    await Promise.all([...document.images].filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; setTimeout(r, 3000); })));
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
  }).catch(() => {});
};
const tile = async (page, name) => { await settle(page); await page.screenshot({ path: `${OUT}/${name}.png` }); };
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const reactOn = (page, sel) => page.waitForFunction((s) => { const el = document.querySelector(s); return !!el && Object.keys(el).some((k) => k.startsWith("__react")); }, sel, { timeout: 180_000 });
async function pageChecks(page, label, locale) {
  ok(`${label} · <html lang> is ${locale}`, (await page.locator("html").getAttribute("lang")) === locale);
  const o = await overflow(page);
  ok(`${label} · no horizontal overflow`, o <= 1, `${o}px`);
}
async function hydratedSlip(page) {
  await page.getByTestId("millionea-slip").waitFor({ timeout: 180_000 });
  await reactOn(page, '[data-testid="millionea-slip"] [role="radio"]');
  await settle(page);
  await page.waitForTimeout(300);
}
/** The answers of the ticket on screen, question by question: "Y", "N" or "-". */
const answersOnScreen = (page) => page.getByRole("radiogroup").evaluateAll((groups) => groups.map((g) => {
  const radios = [...g.querySelectorAll('[role="radio"]')];
  const at = radios.findIndex((r) => r.getAttribute("aria-checked") === "true");
  return at === 0 ? "Y" : at === 1 ? "N" : "-";
}).join(""));
async function fill(page, pattern) {
  const groups = page.getByRole("radiogroup");
  for (let i = 0; i < 15; i++) await groups.nth(i).getByRole("radio").nth(pattern[i] === "Y" ? 0 : 1).click();
}
const payControl = (page) => page.locator('[data-testid="millionea-slip-pay"]:visible');
const dialogOf = (page) => page.locator('[role="dialog"], [role="alertdialog"]').last();

/** The deposit page's payment, as a player sends it: a mobile-money rail chosen, the form's own commit. */
async function payDeposit(page, shell) {
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  if (shell === "journey") {
    await reactOn(page, '[data-testid="journey-deposit-form"]');
    await page.locator('label:has(input[name="provider"]:not([disabled]))').first().click();
    const submit = page.locator('[data-testid="journey-deposit-form"] button[type="submit"]');
    await submit.waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-testid="journey-deposit-form"] button[type="submit"]')?.hasAttribute("disabled"), null, { timeout: 30_000 });
    await submit.click();
  } else {
    await reactOn(page, 'input[name="provider"]');
    await page.locator('label:has(input[name="provider"]:not([disabled]))').first().click();
    const trigger = page.locator("form button.btn-primary.btn-lg").last();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    const dialog = dialogOf(page);
    await dialog.waitFor({ timeout: 30_000 });
    // The dialog's commit is its first button with words: the scrim (a button too, named "Cancel" in the reader's language)
    // and the ✕ (a glyph) are not it; Cancel is the second.
    const commit = dialog.locator("button:not(.m-scrim)").filter({ hasNot: page.locator("svg") }).first();
    await commit.waitFor();
    await commit.click();
  }
}

async function contextFor(shell, locale, width, pass) {
  const session = await demoSession(browser, BASE, { query: "?deposit=0" });
  const ctx = await browser.newContext({ viewport: { width, height: width >= 1024 ? 900 : 780 } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined },
    ...(shell === "journey" && pass ? [{ ...pass, url: BASE, domain: undefined, path: undefined }] : [])]);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push(`${shell}/${locale}/${width}: ${String(e).slice(0, 200)}`));
  return { ctx, page };
}

// ── DRAWN ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function drawnCase(shell, locale, width, pass, { tickets = 1, expectDoor = true, tag = "" } = {}) {
  const label = `${shell} · ${locale} · ${width}${tickets > 1 ? ` · ${tickets} tickets` : ""}${tag}`;
  const name = `${shell}-${locale}-${width}${tickets > 1 ? "-multi" : ""}${tag ? "-plant" : ""}`;
  const { ctx, page } = await contextFor(shell, locale, width, pass);
  try {
    await page.goto(`${BASE}/millionea/slip`, { waitUntil: "load", timeout: 180_000 });
    await hydratedSlip(page);
    // Each case its own answers, so a slip restored from another case could never pass for this one.
    const seed = `${shell}${locale}${width}${tickets}`.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const patterns = Array.from({ length: tickets }, (_, t) => Array.from({ length: 15 }, (_, i) => (((seed >> ((i + t * 5) % 24)) ^ (i * (t + 3))) & 1) ? "Y" : "N").join(""));
    await fill(page, patterns[0]);
    for (let t = 1; t < tickets; t++) {
      await page.getByRole("button", { name: /Add another ticket|Ongeza tiketi nyingine|再添加一张彩票/ }).click();
      await fill(page, patterns[t]);
    }
    ok(`${label} · the slip holds every answer chosen`, (await answersOnScreen(page)) === patterns[tickets - 1], await answersOnScreen(page));
    await payControl(page).click();
    const sheet = dialogOf(page);
    await sheet.waitFor({ timeout: 60_000 });
    const door = page.getByTestId("millionea-slip-deposit");
    await door.waitFor({ timeout: 30_000 });
    await tile(page, `${name}-1-confirm`);
    ok(`${label} · the confirm's low balance offers its deposit door`, await door.isVisible());
    await door.click();
    await page.waitForURL(/\/wallet\/deposit\?/, { timeout: 120_000 });
    const asked = new URL(page.url());
    ok(`${label} · ⭐ the deposit page is asked for the slip's way back, and nothing else of the slip`,
      asked.searchParams.get("returnPath") === "/millionea/slip" && asked.searchParams.get("from") === "low-balance"
        && [...asked.searchParams.keys()].every((k) => ["amount", "from", "returnPath"].includes(k)), asked.search);
    await page.waitForLoadState("load");
    await pageChecks(page, `${label} · deposit page`, locale);
    ok(`${label} · ⭐ the deposit form carries the way back`, (await page.locator('form input[type="hidden"][name="returnPath"]').getAttribute("value").catch(() => null)) === (expectDoor ? "/millionea/slip" : null));
    // The journey's payment focus: the root shell's own frame, with no board header and no tabs — the door is a document request.
    const focused = await page.locator("[data-focused-payment]").count();
    ok(`${label} · ⭐ the deposit opens in ${shell === "journey" ? "the journey's payment focus (no board header, no tabs)" : "the classic shell, as every classic deposit does"}`,
      shell === "journey" ? focused === 1 : focused === 0, `data-focused-payment ×${focused}`);
    await tile(page, `${name}-2-deposit`);
    await payDeposit(page, shell);
    await page.waitForURL(/\/wallet\/deposit\/wait\/|\/wallet\?/, { timeout: 120_000 });
    const landed = new URL(page.url());
    if (!expectDoor) {
      // The plant: the slip is no allowed return, so the deposit page sent nothing back — the way back must be gone.
      ok(`${label} · ⭐ (plant) with the slip dropped from the allowed returns there is no way back`, false,
        `landed on ${landed.pathname}${landed.search} — the case passes only when a door is offered; this line is the plant caught`);
      return;
    }
    ok(`${label} · ⭐ the deposit lands on the wait page, the way back kept`, landed.pathname.startsWith("/wallet/deposit/wait/") && landed.searchParams.get("returnPath") === "/millionea/slip", `${landed.pathname}${landed.search}`);
    await page.getByRole("heading", { name: WORDS[locale].paid }).waitFor({ timeout: 120_000 });
    const back = page.getByTestId("deposit-slip-return");
    await back.waitFor({ timeout: 30_000 });
    await pageChecks(page, `${label} · wait page`, locale);
    ok(`${label} · ⭐ the wait page says the money arrived and the answers wait, and offers "${WORDS[locale].door}"`,
      WORDS[locale].body.test(await page.locator("main").innerText()) && (await back.innerText()).trim() === WORDS[locale].door && await back.getAttribute("href") === "/millionea/slip",
      (await back.innerText()).trim());
    const box = await back.boundingBox();
    ok(`${label} · the door is a full tap target inside the viewport`, !!box && box.height >= 40 && box.x >= 0 && box.x + box.width <= width + 0.5, JSON.stringify(box));
    await tile(page, `${name}-3-wait-paid`);
    await back.click();
    await page.waitForURL(/\/millionea\/slip$/, { timeout: 120_000 });
    await hydratedSlip(page);
    await pageChecks(page, `${label} · slip again`, locale);
    // Every ticket, as chosen: the switcher's pills when there is more than one.
    const seen = [];
    if (tickets > 1) {
      for (let t = 0; t < tickets; t++) {
        await page.getByTestId("millionea-ticket-drafts").getByRole("button").nth(t).click();
        await page.waitForTimeout(150);
        seen.push(await answersOnScreen(page));
      }
    } else seen.push(await answersOnScreen(page));
    ok(`${label} · ⭐ the slip opens with every answer of every ticket as chosen`, JSON.stringify(seen) === JSON.stringify(patterns), `${JSON.stringify(seen)} vs ${JSON.stringify(patterns)}`);
    await tile(page, `${name}-4-slip-kept`);
    await payControl(page).click();
    await dialogOf(page).waitFor({ timeout: 60_000 });
    ok(`${label} · the confirm now offers the buy, not a deposit — nothing was bought by itself`,
      (await page.getByTestId("millionea-slip-deposit").count()) === 0 && await page.getByTestId("millionea-confirm-commit").isVisible()
        && (await page.getByRole("link", { name: /Ticket bought|Tiketi imekatwa|已出票/ }).count()) === 0);
    await tile(page, `${name}-5-confirm-funded`);
  } finally {
    await ctx.close();
  }
}

async function controlCase(shell, pass) {
  // A deposit NOT started from the slip: where it always landed, and no slip door.
  const { ctx, page } = await contextFor(shell, "en", 360, pass);
  try {
    await page.goto(`${BASE}/wallet/deposit?amount=1000`, { waitUntil: "load", timeout: 180_000 });
    ok(`${shell} · control · a plain deposit page carries no way back`, (await page.locator('form input[name="returnPath"]').count()) === 0);
    await payDeposit(page, shell);
    await page.waitForURL(/\/wallet\/deposit\/wait\/|\/wallet\?/, { timeout: 120_000 });
    const landed = new URL(page.url());
    ok(`${shell} · control · a plain deposit lands where it always did (${shell === "journey" ? "the wait page" : "the wallet's result"})`,
      shell === "journey" ? landed.pathname.startsWith("/wallet/deposit/wait/") && !landed.searchParams.has("returnPath") : landed.pathname === "/wallet" && landed.searchParams.has("deposited"),
      `${landed.pathname}${landed.search}`);
    await page.waitForTimeout(1500);
    ok(`${shell} · control · and offers no slip door`, (await page.getByTestId("deposit-slip-return").count()) === 0);
  } finally {
    await ctx.close();
  }
}

// ── DARK ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function darkCases() {
  const { ctx, page } = await contextFor("classic", "en", 360, null);
  try {
    await page.goto(`${BASE}/wallet/deposit?amount=1000&from=low-balance&returnPath=%2Fmillionea%2Fslip`, { waitUntil: "load", timeout: 180_000 });
    ok("dark · ⛔ a deposit page asked for the slip's way back carries none while Millionea is hidden",
      (await page.locator('input[name="returnPath"]').count()) === 0 && !(await page.content()).includes("/millionea"));
    await payDeposit(page, "classic");
    await page.waitForURL(/\/wallet\/deposit\/wait\/|\/wallet\?/, { timeout: 120_000 });
    const landed = new URL(page.url());
    ok("dark · ⛔ the deposit lands where any classic deposit lands — the wallet's result, never the slip's wait",
      landed.pathname === "/wallet" && landed.searchParams.has("deposited"), `${landed.pathname}${landed.search}`);
    const id = landed.searchParams.get("deposited");
    await page.goto(`${BASE}/wallet/deposit/wait/${id}?returnPath=%2Fmillionea%2Fslip`, { waitUntil: "load", timeout: 180_000 });
    await page.waitForTimeout(1500);
    ok("dark · ⛔ a wait page asked for the slip's way back draws no door and no word of Millionea",
      (await page.getByTestId("deposit-slip-return").count()) === 0 && !/Millionea/.test(await page.locator("main").innerText()));
    await tile(page, "dark-wait");
  } finally {
    await ctx.close();
  }
}

try {
  if (MODE === "dark") {
    await darkCases();
  } else {
    const owner = await browser.newContext();
    await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
    const seed = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
    ok("a fresh local week is seeded", seed.ok() || seed.status() === 409, String(seed.status()));
    await owner.close();
    const pass = await mintStaffPass(browser, BASE);
    if (PLANT) {
      const before = readFileSync(RULE_FILE, "utf8");
      if (!before.includes(RULE_LINE)) die(`the plant's line is not in ${RULE_FILE}`);
      try {
        writeFileSync(RULE_FILE, before.replace(RULE_LINE, "export const SLIP_RETURN_PATHS: readonly string[] = [];"));
        await new Promise((r) => setTimeout(r, 4000));
        await drawnCase("classic", "en", 360, pass, { expectDoor: false, tag: " · plant" });
      } finally {
        writeFileSync(RULE_FILE, before);
      }
      const restored = readFileSync(RULE_FILE, "utf8") === before;
      console.log(`\nPLANT ${restored ? "restored byte for byte" : "LEFT DIRTY"}: ${RULE_FILE}`);
      if (!restored) process.exitCode = 1;
    } else {
      for (const shell of ["classic", "journey"]) {
        for (const locale of ["sw", "en", "zh"]) {
          for (const width of [360, 1280]) await drawnCase(shell, locale, width, pass);
        }
      }
      await drawnCase("classic", "sw", 360, pass, { tickets: 2 });
      await drawnCase("journey", "en", 1280, pass, { tickets: 2 });
      await controlCase("classic", pass);
      await controlCase("journey", pass);
    }
  }
} catch (e) {
  fail++;
  console.log(`FAIL the drive stopped — ${String(e?.stack ?? e).slice(0, 600)}`);
} finally {
  await browser.close();
}
ok("no page error", errors.length === 0, errors.slice(0, 5).join(" | "));
console.log(`\nmaswali-deposit-return (${MODE}${PLANT ? ", plant" : ""}): ${pass} passed, ${fail} failed`);
process.exit(PLANT ? (fail > 0 ? 0 : 1) : fail ? 1 : 0);
