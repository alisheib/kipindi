// Landing v3 · WP14b (E) — the card share on a SETTLED card: every action stays on the page.
//   BASE=http://localhost:3057 OUT=<dir> node scripts/qa/landing-v3/share-drive.mjs
// Until 2026-09-27 a closed / resolved / void card was a <Link> wrapping its body, share button
// included: the dialog's clicks bubbled (through React's tree, past the portal) to that Link, which
// navigated — WhatsApp and Copy never happened on /results, and closing the dialog left the page.
// This drives /results (settled cards) at 360 and 1280 in en, and asserts for the first card:
//   open the share → the dialog is there and the URL is still /results;
//   Copy → still /results (the clipboard holds the market link);
//   WhatsApp → a wa.me popup opens, and this page is still /results;
//   Esc and the backdrop each close the dialog without leaving /results;
//   CONTROL — tapping the card itself DOES open the market (the stretched link still works).
// Exit 1 on any failure. Frames land in <OUT>/share-*.png.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3057";
const OUT = process.env.OUT || ".qa-shots/landing-v3/share";
mkdirSync(OUT, { recursive: true });
const fails = [];
const check = (label, cond, detail = "") => {
  console.log(`${cond ? "ok  " : "FAIL"} ${label}${detail ? ` — ${detail}` : ""}`);
  if (!cond) fails.push(label);
};

const browser = await chromium.launch({ headless: true });
for (const [w, h] of [[360, 780], [1280, 860]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE }).catch(() => {});
  await ctx.addCookies([{ name: "kp-locale", value: "en", domain: new URL(BASE).hostname, path: "/" }]);
  await ctx.addInitScript(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  const page = await ctx.newPage();
  const at = `${w}`;
  const onResults = () => new URL(page.url()).pathname === "/results";
  await page.goto(`${BASE}/results`, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(3000);
  const decline = page.getByTestId("consent-decline");
  if (await decline.count()) await decline.first().click({ timeout: 5000 }).catch(() => {});
  const card = page.locator("article.mcardp[data-row-id]").first();
  check(`${at} a settled card is an <article> (one root in every phase)`, (await card.count()) === 1);
  if (!(await card.count())) { await ctx.close(); continue; }
  const id = await card.getAttribute("data-row-id");
  check(`${at} no share button sits inside an <a> anywhere on /results`,
    (await page.locator("a button, a [role=button]").count()) === 0,
    `${await page.locator("a button").count()} nested`);
  const shareBtn = card.locator('button[aria-haspopup="dialog"][aria-label="Share this market"]');
  await card.scrollIntoViewIfNeeded();

  const openDialog = async () => {
    await shareBtn.click();
    await page.getByRole("dialog").first().waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
    return (await page.getByRole("dialog").count()) > 0;
  };

  check(`${at} tapping share opens the dialog`, await openDialog());
  check(`${at} …and the page is still /results`, onResults(), page.url());
  await page.screenshot({ path: join(OUT, `share-${at}-open.png`) });

  await page.getByRole("button", { name: /Copy link|Copied/ }).first().click().catch((e) => fails.push(`${at} copy click: ${e.message}`));
  await page.waitForTimeout(600);
  check(`${at} Copy keeps the page on /results`, onResults(), page.url());
  const clip = await page.evaluate(() => navigator.clipboard.readText()).catch(() => "");
  check(`${at} the clipboard holds this market's link`, clip.includes(`/markets/${id}`), clip.slice(0, 80));

  if (!(await page.getByRole("dialog").count())) await openDialog();
  const [popup] = await Promise.all([
    ctx.waitForEvent("page", { timeout: 8000 }).catch(() => null),
    page.locator('a[href^="https://wa.me/"]').first().click().catch((e) => fails.push(`${at} whatsapp click: ${e.message}`)),
  ]);
  check(`${at} WhatsApp opens a wa.me window`, !!popup && /wa\.me|whatsapp/.test(popup.url() || (await popup.evaluate(() => location.href).catch(() => ""))), popup ? popup.url() : "no popup");
  if (popup) await popup.close().catch(() => {});
  await page.waitForTimeout(500);
  check(`${at} …and this page is still /results`, onResults(), page.url());

  if (!(await page.getByRole("dialog").count())) await openDialog();
  await page.keyboard.press("Escape");
  await page.waitForTimeout(700);
  check(`${at} Esc closes the dialog`, (await page.getByRole("dialog").count()) === 0);
  check(`${at} …without leaving /results`, onResults(), page.url());

  await openDialog();
  await page.mouse.click(8, Math.round(h / 2));
  await page.waitForTimeout(700);
  check(`${at} the backdrop closes the dialog`, (await page.getByRole("dialog").count()) === 0);
  check(`${at} …without leaving /results`, onResults(), page.url());

  // CONTROL — the card itself still opens its market: a tap lands on the stretched link over the card.
  await card.locator("a.mcardp-open").click();
  await page.waitForURL(/\/markets\//, { timeout: 15000 }).catch(() => {});
  check(`${at} CONTROL: tapping the card opens the market`, new URL(page.url()).pathname === `/markets/${id}`, page.url());
  await ctx.close();
}
await browser.close();
writeFileSync(join(OUT, "share-drive.json"), JSON.stringify({ fails }, null, 2));
console.log(`\nshare-drive: ${fails.length === 0 ? "CLEAN" : `${fails.length} failure(s)`}`);
process.exit(fails.length === 0 ? 0 : 1);
