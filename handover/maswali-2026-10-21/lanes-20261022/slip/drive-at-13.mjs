/**
 * A local in-memory browser proof of MB-89: two different tickets, one reviewed charge, both serials — and, since the
 * slip's design pass (Ali 2026-10-21 10/10; the slip critic's H2, H3, M9), the composer's own rules: no switcher for one
 * ticket, "Add another ticket" after the reserves, the pay control armed only when EVERY ticket is answered (else "Finish
 * ticket n", which opens it), a ticket holding answers removed only after the kit's confirm, the stamp's serials as rows.
 * Round 2 (the lead's ruling (a)): the pills say "n · 15/15" under the group's one noun, each named with the noun — found
 * by those names — and two pills share ONE row, measured at 320 and 360 in English and Swahili.
 *
 *   BASE=http://localhost:<port> node scripts/maswali-multi-slip-drive.mjs
 *
 * ⚠️ PREMISE: a FRESH in-memory `next dev` with FEATURE_MILLIONEA=ACTIVE and DISABLE_ADMIN_TOTP=true (it seeds the weeks).
 * ⭐ HYDRATION FIRST (the 2026-10-21 run at d1c5910f printed 4 FAILs and never finished: its first press on question 1 landed
 * before React had attached, so ticket 1 read 14/15 with question 1 unanswered and every step after it cascaded). Every
 * page is pressed only once its answers are React's own (`hydrated`: the radio carries React's props), as
 * `journey-header-fit` waits for its header.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, demoSession, DEMO_PHONE, LOCALE_COOKIE } from "./live/journey-pass.mjs";

const BASE = process.env.BASE || "http://localhost:3421";
const OUT = ".50pick-shots/maswali-multi-slip";
const pre = await premise(BASE);
if (pre.refuse || pre.health?.millionea?.state !== "ACTIVE") {
  console.error(`PREMISE ABSENT — ${pre.refuse ?? "Millionea is not ACTIVE in this local in-memory server"}`);
  process.exit(2);
}
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
let pass = 0, fail = 0;
const errors = [];
const ok = (name, condition, detail = "") => {
  if (condition) pass++;
  else { fail++; console.error(`FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
};
const settle = async (page) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))));
      });
      return;
    } catch (error) {
      if (!String(error).includes("Execution context was destroyed") || attempt === 2) throw error;
      await page.waitForLoadState("load");
    }
  }
};
/** The slip's answers are React's: the first radio carries React's props (its onClick), so a press is a pick. */
const hydrated = async (page) => {
  await page.getByTestId("millionea-slip").waitFor({ timeout: 180_000 });
  await page.waitForFunction(() => {
    const radio = document.querySelector('[data-testid="millionea-slip"] [role="radio"]');
    return !!radio && Object.keys(radio).some((k) => k.startsWith("__reactProps$"));
  }, null, { timeout: 180_000 });
  // The tab's kept drafts come back in the first effect after hydration: two frames, then a beat.
  await settle(page);
  await page.waitForTimeout(300);
};
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const openSlip = async (ctx, page, locale, width) => {
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }]);
  await page.setViewportSize({ width, height: 780 });
  await page.goto(`${BASE}/millionea/slip`, { waitUntil: "load", timeout: 180_000 });
  await hydrated(page);
  ok(`${locale} @${width}: correct document language`, await page.locator("html").getAttribute("lang") === locale);
  ok(`${locale} @${width}: no horizontal overflow`, (await overflow(page)) <= 1, String(await overflow(page)));
};
const pay = (page) => page.locator('[data-testid="millionea-slip-pay"]:visible');
const switcher = (page) => page.getByTestId("millionea-ticket-drafts");
const complete = (page) => switcher(page).getByRole("button").filter({ hasText: /· 15\/15$/i });

try {
  const owner = await browser.newContext();
  await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
  const seed = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
  ok("a fresh local week is seeded", seed.ok() || seed.status() === 409, String(seed.status()));
  const session = await demoSession(browser, BASE, { query: "?deposit=0", balance: 50_000 });
  // ⭐ ITS OWN PREMISE (round 2): the demo player starts the week holding no live ticket, so the pills are numbered from 1.
  // A drive run before this one on the same server leaves tickets behind (qa:dialog-way-back buys one per engine), and the
  // pills then read from 3. They are cancelled first through the product's own free cancel (the dev route, as
  // qa:dialog-way-back does at its start). If that is refused, the premise is absent and the drive stops.
  const reset = await (await owner.request.post(`${BASE}/api/dev-test/seed-maswali-slip`, { data: { cancelFor: DEMO_PHONE }, timeout: 120_000 })).json().catch(() => ({}));
  if (reset.ok !== true) throw new Error(`PREMISE ABSENT — the demo player's live tickets could not be cancelled: ${JSON.stringify(reset)}`);
  console.log(`INFO premise: ${reset.cancelled} live ticket(s) the demo player held this week cancelled first`);
  await owner.close();

  const ctx = await browser.newContext({ viewport: { width: 320, height: 780 } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: "en", url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
  const page = await ctx.newPage();
  page.on("pageerror", (err) => errors.push(String(err)));
  await openSlip(ctx, page, "en", 320);
  const groups = page.getByRole("radiogroup");
  ok("the active ticket starts with fifteen independent questions", await groups.count() === 15);
  ok("H2 · one ticket draws no switcher (its box stood over the questions for every player)", await switcher(page).count() === 0);
  for (let i = 0; i < 15; i++) await groups.nth(i).getByRole("radio").first().click();
  ok("ticket 1 answered: every answer is YES", (await page.locator('[role="radio"][aria-checked="true"]').count()) === 15);
  await page.getByRole("button", { name: "Add another ticket" }).click();
  ok("adding a ticket starts an empty second draft", await groups.count() === 15 && await groups.first().getByRole("radio").first().getAttribute("aria-checked") === "false");
  ok("H2 · two tickets draw the switcher, the kit's pills (role=group, aria-pressed)",
    await switcher(page).getByRole("group").count() === 1 && await switcher(page).locator('button[aria-pressed="true"]').count() === 1);
  // H3 · ticket 2 half answered, then back to the complete ticket 1: the control reads "Finish ticket 2", never armed.
  for (let i = 0; i < 7; i++) await groups.nth(i).getByRole("radio").nth(1).click();
  // The pills say "1 · 15/15" under the group's "TICKETS"; each is NAMED with the noun (the lead's ruling (a), round 2).
  await switcher(page).getByRole("button", { name: /^Ticket 1 · / }).click();
  ok("H3 · ticket 1 complete, ticket 2 not: the pay control reads \"Finish ticket 2\" and is not armed",
    /Finish ticket 2/.test(await pay(page).innerText()) && await pay(page).getAttribute("data-armed") === null, await pay(page).innerText());
  ok("H3 · the counts lead with the ticket being answered", (await page.locator(".kp-mln-rail").innerText()).includes("Ticket 1"));
  await pay(page).click();
  ok("H3 · \"Finish ticket 2\" opens ticket 2", await switcher(page).locator('button[aria-pressed="true"][aria-label="Ticket 2 · 7/15"]').count() === 1);
  ok("round 2 · ruling (a) · the pills say the number and the progress, the group's label says the noun once — and two pills share ONE row at 320",
    await switcher(page).locator('button[aria-pressed="true"]').innerText() === "2 · 7/15"
      && /^tickets$/i.test(await switcher(page).locator("span[aria-hidden]").first().innerText())
      && await switcher(page).getByRole("button", { name: /^Ticket \d · / }).evaluateAll((els) => new Set(els.map((e) => Math.round(e.getBoundingClientRect().top))).size === 1));
  ok("M8 · …and the first unanswered question holds the focus", await page.evaluate(() => document.activeElement?.closest("li")?.id) === "q-8",
    await page.evaluate(() => String(document.activeElement?.closest("li")?.id)));
  for (let i = 7; i < 15; i++) await groups.nth(i).getByRole("radio").nth(1).click();
  await complete(page).first().click();
  ok("the first draft retained YES when the second chose NO", await groups.first().getByRole("radio").first().getAttribute("aria-checked") === "true");
  await complete(page).last().click();
  ok("the second draft retained its independent NO", await groups.first().getByRole("radio").nth(1).getAttribute("aria-checked") === "true");
  // The words read as the button's text, spaces collapsed: `innerText` breaks a line between the button's flex items (the
  // words and the amount's own run), so "…tickets ·\nTZS 2,000" is what it returns for the words drawn on one line.
  const armedWords = (await pay(page).textContent() ?? "").replace(/\s+/g, " ").trim();
  ok("H3 · every ticket answered: the control is armed for the whole purchase", await pay(page).getAttribute("data-armed") === "true" && armedWords === "Continue · 2 tickets · TZS 2,000",
    `${await pay(page).getAttribute("data-armed")} · ${armedWords}`);
  await page.reload({ waitUntil: "load" });
  await hydrated(page);
  await complete(page).last().waitFor();
  ok("both drafts and the active ticket survive reload", await groups.first().getByRole("radio").nth(1).getAttribute("aria-checked") === "true"
    && await complete(page).count() === 2);
  await settle(page);
  await page.screenshot({ path: `${OUT}/draft-en-320.png`, fullPage: false });
  // M9 · a ticket holding answers is removed only after the kit's confirm — and keeping it keeps it.
  await page.getByTestId("millionea-ticket-remove").click();
  const ask = page.getByRole("alertdialog");
  await ask.waitFor();
  ok("M9 · removing a ticket with answers asks first (the kit's ConfirmModal), naming the ticket in its body",
    /Remove this\sticket\?/.test(await ask.innerText()) && /Ticket 2 and its answers/.test(await ask.innerText()));
  await ask.getByRole("button", { name: "Keep ticket" }).click();
  await ask.waitFor({ state: "detached" });
  ok("M9 · \"Keep ticket\" keeps both", await complete(page).count() === 2);
  // ⭐ ROUND 2 · RULING (a), MEASURED (S5-R2-SLIP): at 320 and 360, in English and in Swahili (the longest language), the two
  // pills stand on ONE row, whole inside the viewport, unclipped and at least 40px tall — read from the boxes the browser laid
  // out, under the group's one noun. Each composer is kept as a tile (`pills-*`, `composer-*`) to read.
  const NOUN = { en: /^tickets$/i, sw: /^tiketi$/i };
  for (const [locale, width] of [["en", 320], ["en", 360], ["sw", 320], ["sw", 360]]) {
    await openSlip(ctx, page, locale, width);
    await complete(page).first().waitFor();
    await switcher(page).scrollIntoViewIfNeeded();
    await settle(page);
    const pills = await switcher(page).locator("button[aria-pressed]").evaluateAll((els) => els.map((e) => {
      const r = e.getBoundingClientRect();
      return { text: (e.textContent ?? "").replace(/\s+/g, " ").trim(), top: Math.round(r.top), left: Math.round(r.left * 10) / 10,
        right: Math.round(r.right * 10) / 10, height: Math.round(r.height), clipped: e.scrollWidth > e.clientWidth + 1 };
    }));
    const vw = await page.evaluate(() => document.documentElement.clientWidth);
    const noun = await switcher(page).locator("span[aria-hidden]").first().innerText();
    console.log(`INFO ruling (a) ${locale} @${width}: noun "${noun}" · viewport ${vw} · pills ${JSON.stringify(pills)}`);
    ok(`round 2 · ruling (a) · ${locale} @${width}: the label is the noun once, and the two pills ("n · 15/15") share ONE row, whole inside the viewport, unclipped, 40px tall`,
      NOUN[locale].test(noun) && pills.length === 2 && pills.every((p) => /^\d+ · 15\/15$/.test(p.text)) && new Set(pills.map((p) => p.top)).size === 1
        && pills.every((p) => p.left >= 0 && p.right <= vw && !p.clipped && p.height >= 40), JSON.stringify({ noun, vw, pills }));
    await switcher(page).screenshot({ path: `${OUT}/pills-${locale}-${width}.png` });
    await page.screenshot({ path: `${OUT}/composer-${locale}-${width}.png`, fullPage: false });
  }
  await openSlip(ctx, page, "zh", 320);
  await complete(page).first().waitFor();
  ok("Chinese 320 keeps two complete tickets", await complete(page).count() === 2);
  await page.screenshot({ path: `${OUT}/draft-zh-320.png`, fullPage: false });
  await page.goto(`${BASE}/wallet/deposit?amount=1000`, { waitUntil: "load", timeout: 180_000 });
  await page.goto(`${BASE}/millionea/slip`, { waitUntil: "load", timeout: 180_000 });
  await hydrated(page);
  await complete(page).first().waitFor();
  ok("both drafts survive the deposit return", await complete(page).count() === 2);
  await openSlip(ctx, page, "sw", 360);
  await complete(page).first().waitFor();
  await pay(page).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  ok("one Swahili confirmation names two tickets and the TZS 2,000 main-balance charge",
    await dialog.getByRole("heading", { name: /Thibitisha tiketi zote 2/ }).count() === 1
      && (await dialog.innerText()).includes("TZS 2,000")
      && await page.getByRole("dialog").count() === 1);
  ok("the one confirmation can review both sets of fifteen picks", await dialog.locator("details").count() === 2);
  await dialog.locator("details").nth(0).locator("summary").click();
  ok("ticket one's picks are present in the review", await dialog.locator("details").nth(0).locator("span").count() > 15);
  await dialog.locator("details").nth(0).locator("summary").click();
  await dialog.locator("details").nth(1).locator("summary").click();
  ok("ticket two's first answer differs in the review", (await dialog.locator("details").nth(1).innerText()).includes("HAPANA"));
  await dialog.locator("details").nth(1).locator("summary").click();
  await settle(page);
  await page.screenshot({ path: `${OUT}/confirm-sw-360.png`, fullPage: false });
  await dialog.getByRole("button", { name: /Kata tiketi zote 2/ }).click();
  const receipt = page.getByRole("dialog");
  await receipt.getByRole("heading", { name: /Tiketi 2 zimekatwa/ }).waitFor({ timeout: 120_000 });
  const serials = (await receipt.locator(".orm-detail").allInnerTexts()).map((row) => row.split("\n").pop()?.trim() ?? "").filter((v) => /^ML[ND]-/.test(v));
  ok("one Swahili receipt lists two distinct returned serials, each in its own row", serials.length === 2 && serials[0] !== serials[1], JSON.stringify(serials));
  ok("the receipt names its week in its eyebrow (M9) and when the payout comes", /MASWALI MILLIONEA · WIKI \d+/i.test(await receipt.innerText()) && (await receipt.innerText()).includes("Wiki itakapokamilika"));
  // Round 2 (the lead's ruling): the door is the kit's Link to the list (`primaryHref`), so it is found as a link — with the
  // list's own address — and never as a button.
  ok("the receipt has one door to the player's ticket list — a link to it",
    await receipt.getByRole("link", { name: "Tazama tiketi" }).count() === 1 && await receipt.getByRole("button", { name: "Tazama tiketi" }).count() === 0
      && await receipt.getByRole("link", { name: "Tazama tiketi" }).getAttribute("href") === "/millionea/tickets");
  ok("H2 · the cleared slip owes no refusal: no row is marked and no line says one is unanswered",
    await page.locator("li[data-flagged]").count() === 0 && await page.getByTestId("millionea-slip-refusal").count() === 0);
  await settle(page);
  await page.screenshot({ path: `${OUT}/receipt-sw-360.png`, fullPage: false });
  await receipt.getByRole("link", { name: "Tazama tiketi" }).click();
  await page.waitForURL(`${BASE}/millionea/tickets`, { timeout: 120_000 });
  const list = page.getByTestId("millionea-tickets");
  await list.waitFor();
  const links = await list.locator('li a[href^="/millionea/tickets/"]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")));
  ok("both purchased tickets appear in the player's list", serials.every((serial) => links.some((href) => href?.endsWith(`/${serial}`))), JSON.stringify(links));
  ok("no browser page error", errors.length === 0, errors.slice(0, 2).join(" | "));
  await ctx.close();
} finally {
  await browser.close();
}
console.log(`maswali-multi-slip-drive: ${pass} passed, ${fail} failed · ${OUT}/`);
process.exitCode = fail ? 1 : 0;
