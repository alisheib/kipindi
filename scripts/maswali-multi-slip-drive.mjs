/** A local in-memory browser proof of MB-89: two different tickets, one reviewed charge, both serials. */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { premise, demoSession, LOCALE_COOKIE } from "./live/journey-pass.mjs";

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
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const changeLocale = async (ctx, page, locale, width) => {
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }]);
  await page.setViewportSize({ width, height: 780 });
  await page.goto(`${BASE}/millionea/slip`, { waitUntil: "load", timeout: 180_000 });
  await page.getByTestId("millionea-ticket-drafts").waitFor();
  await settle(page);
  ok(`${locale} @${width}: correct document language`, await page.locator("html").getAttribute("lang") === locale);
  ok(`${locale} @${width}: no horizontal overflow`, (await overflow(page)) <= 1, String(await overflow(page)));
};

try {
  const owner = await browser.newContext();
  await owner.request.post(`${BASE}/api/dev-test/seed-admin`, { data: { phone: "+255700000091", name: "Millionea Owner" }, timeout: 240_000 });
  const seed = await owner.request.post(`${BASE}/api/dev-test/seed-maswali`, { data: {}, timeout: 300_000 });
  ok("a fresh local week is seeded", seed.ok() || seed.status() === 409, String(seed.status()));
  await owner.close();

  const session = await demoSession(browser, BASE, { query: "?deposit=0", balance: 50_000 });
  const ctx = await browser.newContext({ viewport: { width: 320, height: 780 } });
  await ctx.addCookies([{ name: LOCALE_COOKIE, value: "en", url: BASE }, { ...session, url: BASE, domain: undefined, path: undefined }]);
  const page = await ctx.newPage();
  page.on("pageerror", (err) => errors.push(String(err)));
  await changeLocale(ctx, page, "en", 320);
  const groups = page.getByRole("radiogroup");
  ok("the active ticket starts with fifteen independent questions", await groups.count() === 15);
  for (let i = 0; i < 15; i++) await groups.nth(i).getByRole("radio").first().click();
  await page.getByRole("button", { name: "Add ticket" }).click();
  ok("adding a ticket starts an empty second draft", await groups.count() === 15 && await groups.first().getByRole("radio").first().getAttribute("aria-checked") === "false");
  for (let i = 0; i < 15; i++) await groups.nth(i).getByRole("radio").nth(i === 0 ? 1 : 0).click();
  const completeDrafts = () => page.getByTestId("millionea-ticket-drafts").getByRole("button").filter({ hasText: /Ticket \d+ · 15\/15/ });
  await completeDrafts().first().click();
  ok("the first draft retained YES when the second chose NO", await groups.first().getByRole("radio").first().getAttribute("aria-checked") === "true");
  await completeDrafts().last().click();
  ok("the second draft retained its independent NO", await groups.first().getByRole("radio").nth(1).getAttribute("aria-checked") === "true");
  await page.reload({ waitUntil: "load" });
  await completeDrafts().last().waitFor();
  ok("both drafts and the active ticket survive reload", await groups.first().getByRole("radio").nth(1).getAttribute("aria-checked") === "true"
    && await completeDrafts().count() === 2);
  await settle(page);
  await page.screenshot({ path: `${OUT}/draft-en-320.png`, fullPage: false });
  await changeLocale(ctx, page, "zh", 320);
  await page.getByTestId("millionea-ticket-drafts").getByRole("button").filter({ hasText: "15/15" }).first().waitFor();
  ok("Chinese 320 keeps two complete tickets", await page.getByTestId("millionea-ticket-drafts").getByRole("button").filter({ hasText: "15/15" }).count() === 2);
  await page.screenshot({ path: `${OUT}/draft-zh-320.png`, fullPage: false });
  await page.goto(`${BASE}/wallet/deposit?amount=1000`, { waitUntil: "load", timeout: 180_000 });
  await page.goto(`${BASE}/millionea/slip`, { waitUntil: "load", timeout: 180_000 });
  await page.getByTestId("millionea-ticket-drafts").getByRole("button").filter({ hasText: "15/15" }).first().waitFor();
  ok("both drafts survive the deposit return", await page.getByTestId("millionea-ticket-drafts").getByRole("button").filter({ hasText: "15/15" }).count() === 2);
  await changeLocale(ctx, page, "sw", 360);
  await page.getByTestId("millionea-ticket-drafts").getByRole("button").filter({ hasText: "15/15" }).first().waitFor();
  const continueButton = page.getByRole("button", { name: /Endelea.*TZS 2,000/ }).first();
  await continueButton.click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  ok("one Swahili confirmation names two tickets and the TZS 2,000 main-balance charge",
    await dialog.getByRole("heading", { name: /Thibitisha tiketi 2/ }).count() === 1
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
  await dialog.getByRole("button", { name: /Kata tiketi 2/ }).click();
  const receipt = page.getByRole("dialog");
  await receipt.getByRole("heading", { name: /Tiketi 2 zimekatwa/ }).waitFor({ timeout: 120_000 });
  const serials = await receipt.locator(".font-mono.tabular-nums").allTextContents();
  ok("one Swahili receipt lists two distinct returned serials", serials.length === 2 && serials[0] !== serials[1]
    && serials.every((s) => /^MLN-/.test(s)), JSON.stringify(serials));
  ok("the receipt has one door to the player's ticket list", await receipt.getByRole("button", { name: "Tazama tiketi" }).count() === 1);
  await settle(page);
  await page.screenshot({ path: `${OUT}/receipt-sw-360.png`, fullPage: false });
  await receipt.getByRole("button", { name: "Tazama tiketi" }).click();
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
