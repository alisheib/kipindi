/**
 * qa:deposit-phone — the deposit's number box, and the card return leg, in real browsers (the Vodacom plan §2, S9).
 *
 *   phone (ENGINES, default chromium,firefox,webkit · en at 390): /auth/demo → /wallet/deposit, M-Pesa:
 *     P1 the box opens on the account's own number: grouped in the box, nine digits in the hidden field that is posted;
 *     P2 "Use another number" empties both;
 *     P3 "0712 345 678" TYPED key by key → the box "712 345 678", the hidden field "712345678"
 *        (the old raw box stopped at nine characters: "071234567", which the server refuses);
 *     P4 "Use my registered number" → both back to the account's number. ⭐ The hidden field FOLLOWS: with a plain
 *        `el.value =` the box changed and the posted number did not (React's value tracker);
 *     P5 "Use another number", then "+255 754 321 000" typed → "754321000";
 *     P6 the box emptied and "0712 345 678" PASTED → "712345678" (where the engine lets a script paste: chromium and
 *        webkit; firefox gives a script-made paste event no text, so P6 reports n/a there — probed per run);
 *     P7 "0712 345 678" typed afresh, TZS 1,000 confirmed in the deposit dialog → the deposit is accepted (the
 *        wallet's "deposited=…" page, never "?error=") and its action POST carried 712345678, never "071234567".
 *   card (chromium · en and sw at 390; the server must be on the test gateway, see the runner): a TZS 20,000 card
 *     deposit through the confirm dialog → the test gateway's page → back on /wallet/deposit/return:
 *     C1 the URL the buyer lands on carries our order_id (and Selcom's own payment_status + transid);
 *     C2 the page answers "Payment received" ("Malipo yamepokelewa"), never "We couldn't find that payment".
 *   tiles (chromium · 320/360/390/1280 × sw/en/zh): the number block after "0712 345 678" was typed, saved to
 *     .qa-shots/vodacom-s9/ to be READ one by one; the box must fit its row (no horizontal overflow).
 *
 * Run through `scratchpad/s9tools/run-s9-drive.sh` (in-memory dev server + the test gateway; zero production risk):
 *   BASE=http://localhost:3041 node scripts/live/deposit-phone-drive.mjs phone card tiles
 */
import { chromium, firefox, webkit } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || process.env.KP_BASE || "http://localhost:3041";
const MODES = process.argv.slice(2).length ? process.argv.slice(2) : ["phone", "card", "tiles"];
const ENGINES = (process.env.ENGINES || "chromium,firefox,webkit").split(",").map((s) => s.trim()).filter(Boolean);
const SHOTS = join(".qa-shots", "vodacom-s9");
mkdirSync(SHOTS, { recursive: true });

const WORDS = {
  en: { another: "Use another number", mine: "Use my registered number", confirm: "Confirm deposit", go: "Deposit",
    paid: "Payment received", unknown: "We couldn't find that payment" },
  sw: { another: "Tumia namba nyingine", mine: "Tumia namba yangu iliyosajiliwa", confirm: "Thibitisha amana", go: "Amana",
    paid: "Malipo yamepokelewa", unknown: "Hatukuweza kupata malipo hayo" },
  zh: { another: "使用其他号码", mine: "使用我的注册号码", confirm: "确认充值", go: "充值",
    paid: "已收到付款", unknown: "找不到该笔付款" },
};
const ENGINE = { chromium, firefox, webkit };

let pass = 0, fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};

const BOX = "#msisdn";
/** Whatever the form posts as `msisdn`: the PhoneInput's hidden field (the box itself carries no name); on the old
 *  raw box, the box. Read this way, the same drive runs against the parent tree as its control. */
const HIDDEN = '[name="msisdn"]';
const DIALOG = '[role="alertdialog"]:visible';

async function signedIn(engineName, viewport, locale) {
  const browser = await ENGINE[engineName].launch();
  const ctx = await browser.newContext({ viewport });
  await ctx.addCookies([{ name: "kp-locale", value: locale, url: BASE }]);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message || e).slice(0, 160)));
  await page.goto(`${BASE}/auth/demo`, { waitUntil: "domcontentloaded" });
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { browser, ctx, page, errors };
}

/** Open the deposit page and wait until React owns the number box (typing before that is not what a player meets). */
async function openDeposit(page, provider = "MPESA") {
  await page.goto(`${BASE}/wallet/deposit`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction((sel) => {
    const el = document.querySelector(sel);
    return !!el && Object.keys(el).some((k) => k.startsWith("__reactProps"));
  }, BOX, { timeout: 60_000 });
  await page.locator(`label:has(#provider-${provider})`).click();
}

const boxValue = (page) => page.locator(BOX).inputValue();
const posted = (page) => page.locator(HIDDEN).inputValue();
const grouped = (d) => d.replace(/^(\d{3})(\d{3})(\d{3})$/, "$1 $2 $3");

/** A real paste: a ClipboardEvent carrying the text, on the focused box (as the vb3 drive does). */
const paste = (page, text) => page.evaluate((t) => {
  const el = document.activeElement;
  const dt = new DataTransfer();
  dt.setData("text/plain", t);
  const ev = new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true });
  if (el.dispatchEvent(ev)) document.execCommand("insertText", false, t);
}, text);

async function phone(engineName) {
  console.log(`\n── phone · ${engineName} · en · 390`);
  const w = WORDS.en;
  const { browser, page, errors } = await signedIn(engineName, { width: 390, height: 844 }, "en");
  try {
    await openDeposit(page);
    const mine = await posted(page);
    ok(`${engineName} P1 the box opens on the account's own number (posted ${mine})`,
      /^[67]\d{8}$/.test(mine) && (await boxValue(page)) === grouped(mine), `box="${await boxValue(page)}" posted="${mine}"`);

    await page.getByRole("button", { name: w.another, exact: true }).click();
    await page.waitForTimeout(150);
    ok(`${engineName} P2 "Use another number" empties the box and the posted number`,
      (await boxValue(page)) === "" && (await posted(page)) === "", `box="${await boxValue(page)}" posted="${await posted(page)}"`);

    await page.locator(BOX).click();
    await page.keyboard.type("0712 345 678", { delay: 25 });
    ok(`${engineName} P3 "0712 345 678" typed → the box "712 345 678", posted 712345678`,
      (await boxValue(page)) === "712 345 678" && (await posted(page)) === "712345678", `box="${await boxValue(page)}" posted="${await posted(page)}"`);

    await page.getByRole("button", { name: w.mine, exact: true }).click();
    await page.waitForTimeout(150);
    ok(`${engineName} P4 "Use my registered number" → the box AND the posted number are the account's again`,
      (await boxValue(page)) === grouped(mine) && (await posted(page)) === mine, `box="${await boxValue(page)}" posted="${await posted(page)}" mine=${mine}`);

    await page.getByRole("button", { name: w.another, exact: true }).click();
    await page.waitForTimeout(150);
    await page.locator(BOX).click();
    await page.keyboard.type("+255 754 321 000", { delay: 25 });
    ok(`${engineName} P5 "+255 754 321 000" typed → posted 754321000`,
      (await boxValue(page)) === "754 321 000" && (await posted(page)) === "754321000", `box="${await boxValue(page)}" posted="${await posted(page)}"`);

    // P6 needs a script-made paste event that carries its text. Firefox gives one an EMPTY clipboardData (measured
    // 2026-10-09: chromium and webkit carry "0712 345 678", firefox ""), so there the paste cannot be driven by script —
    // a person's real paste does carry the text. Probed here, per engine, never assumed.
    const scriptedPasteCarries = await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData("text/plain", "1");
      return new ClipboardEvent("paste", { clipboardData: dt }).clipboardData?.getData("text") === "1";
    });
    if (!scriptedPasteCarries) {
      console.log(`  n/a  ${engineName} P6 paste — this engine gives a script-made paste event no text; not drivable here`);
    } else {
      await page.locator(BOX).fill("");
      await page.locator(BOX).focus();
      await paste(page, "0712 345 678");
      await page.waitForTimeout(100);
      ok(`${engineName} P6 "0712 345 678" pasted → posted 712345678`,
        (await boxValue(page)) === "712 345 678" && (await posted(page)) === "712345678", `box="${await boxValue(page)}" posted="${await posted(page)}"`);
    }

    // P7 — a TYPED number, sent. (Typed afresh, so P7 does not lean on P6's paste.) Next encodes an action's form fields
    // its own way, so the drive reads what a player meets — the wallet's "deposited=…" page, never "?error=" — and that
    // one of the action POSTs carried the nine digits and none the old box's cut.
    await page.locator(BOX).fill("");
    await page.locator(BOX).click();
    await page.keyboard.type("0712 345 678", { delay: 25 });
    await page.locator('input[name="amount"]').fill("1000");
    const bodies = [];
    page.on("request", (r) => {
      if (r.method() === "POST" && r.headers()["next-action"]) bodies.push((r.postDataBuffer() ?? Buffer.alloc(0)).toString("latin1"));
    });
    await page.getByRole("button", { name: w.confirm, exact: true }).click();
    await page.locator(DIALOG).getByRole("button", { name: w.go, exact: true }).click();
    await page.waitForURL(/\/wallet\?deposited=|[?&]error=/, { timeout: 30_000 }).catch(() => {});
    const carried = bodies.some((b) => b.includes("712345678"));
    ok(`${engineName} P7 "0712 345 678" typed and sent: the deposit is accepted (wallet "deposited=…") and its POST carried 712345678`,
      /\/wallet\?deposited=/.test(page.url()) && carried && !bodies.some((b) => b.includes("071234567")),
      `url=${page.url()} actionPosts=${bodies.length} carried=${carried}`);
    ok(`${engineName} no page error`, errors.length === 0, errors.join(" | "));
  } catch (e) {
    ok(`${engineName} phone drive ran to the end`, false, String(e).slice(0, 300));
  } finally {
    await browser.close();
  }
}

async function card(locale) {
  console.log(`\n── card · chromium · ${locale} · 390`);
  const w = WORDS[locale];
  const { browser, page, errors } = await signedIn("chromium", { width: 390, height: 844 }, locale);
  try {
    await openDeposit(page, "CARD");
    for (const [name, v] of [["billingFirstName", "Asha"], ["billingLastName", "Mrisho"], ["billingAddress1", "12 Samora Ave"],
      ["billingCity", "Dar es Salaam"], ["billingRegion", "Dar es Salaam"], ["billingPostcode", "P.O. Box 1234"]]) {
      await page.locator(`input[name="${name}"]`).fill(v);
    }
    await page.locator('input[name="amount"]').fill("20000");
    await page.getByRole("button", { name: w.confirm, exact: true }).click();
    await page.locator(DIALOG).getByRole("button", { name: w.go, exact: true }).click();
    await page.waitForURL(/\/wallet\/deposit\/return/, { timeout: 60_000 });
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);
    const u = new URL(page.url());
    ok(`card ${locale} C1 the buyer lands back with OUR order_id and Selcom's two parameters`,
      !!u.searchParams.get("order_id") && u.searchParams.has("payment_status") && u.searchParams.has("transid") &&
        u.searchParams.getAll("order_id").length === 1, page.url());
    const text = await page.locator("body").innerText();
    ok(`card ${locale} C2 the page says "${w.paid}", not "${w.unknown}"`, text.includes(w.paid) && !text.includes(w.unknown),
      text.slice(0, 160).replace(/\s+/g, " "));
    await page.screenshot({ path: join(SHOTS, `card-return-${locale}-390.png`), fullPage: false });
    ok(`card ${locale} no page error`, errors.length === 0, errors.join(" | "));
  } catch (e) {
    ok(`card ${locale} drive ran to the end`, false, String(e).slice(0, 300));
  } finally {
    await browser.close();
  }
}

async function tiles() {
  console.log("\n── tiles · chromium · 320/360/390/1280 × sw/en/zh");
  for (const locale of ["sw", "en", "zh"]) {
    for (const width of [320, 360, 390, 1280]) {
      const w = WORDS[locale];
      const { browser, page } = await signedIn("chromium", { width, height: 900 }, locale);
      try {
        await openDeposit(page);
        await page.getByRole("button", { name: w.another, exact: true }).click();
        await page.locator(BOX).click();
        await page.keyboard.type("0712 345 678", { delay: 10 });
        const block = page.locator(`div:has(> label[for="msisdn"])`).first();
        await block.scrollIntoViewIfNeeded();
        const fit = await page.evaluate((sel) => {
          const el = document.querySelector(sel);
          const box = el?.closest("div")?.getBoundingClientRect();
          return { docOverflow: document.documentElement.scrollWidth - window.innerWidth, right: box ? box.right : -1, vw: window.innerWidth };
        }, BOX);
        await block.screenshot({ path: join(SHOTS, `phone-${locale}-${width}.png`) });
        ok(`tile ${locale} ${width}: the box reads "712 345 678" and the page does not scroll sideways`,
          (await boxValue(page)) === "712 345 678" && fit.docOverflow <= 0 && fit.right <= fit.vw, JSON.stringify(fit));
      } catch (e) {
        ok(`tile ${locale} ${width} ran`, false, String(e).slice(0, 200));
      } finally {
        await browser.close();
      }
    }
  }
}

if (MODES.includes("phone")) for (const e of ENGINES) await phone(e);
if (MODES.includes("card")) { await card("en"); await card("sw"); }
if (MODES.includes("tiles")) await tiles();
console.log(`\nDEPOSIT PHONE DRIVE — ${pass} ok, ${fail} failed (modes: ${MODES.join(",")}; engines: ${ENGINES.join(",")})`);
process.exitCode = fail === 0 ? 0 : 1;
