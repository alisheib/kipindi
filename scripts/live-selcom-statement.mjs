/**
 * JAY UNIT I (#7) · THE SELCOM STATEMENT, RECONCILED ON PRODUCTION.
 *
 * The acceptance asks for *"a statement reconciling to `scripts/live/ops/payments-now.cjs`"*.
 * So this reads the numbers TWICE, from two places that share no code: off the rendered
 * console page, and out of the production database with its own SQL. A figure that agrees
 * with itself proves nothing — `test:selcom-statement` already drives the pure function, and
 * a page can render a correct function's output through the wrong caption.
 *
 * ⛔ THE DEFECT THIS UNIT EXISTS TO PREVENT IS NOT AN ARITHMETIC ERROR. `BET_PAYOUT` is an
 * internal wallet credit; `WITHDRAWAL` is money leaving to Selcom. On production they are
 * TZS 2,077,191 and TZS 70,000 — quoting the first as the second overstates the rail by
 * 29.7× on a page built for the regulator. So the run asserts the money-out figure equals
 * the WITHDRAWAL total *and* is nowhere near the BET_PAYOUT total, and that the in-wallet
 * figure is on the page and captioned as money that never touched Selcom.
 *
 * ⭐ THE POSITIVE CONTROL IS ABOUT THE DATA, NOT THE PAGE. Every assertion below about "the
 * rail figure is not the conflated figure" is VACUOUS on a platform where the two happen to
 * be equal, or where either is zero. So the run first requires production to hold a real
 * conflation — a non-zero BET_PAYOUT total, materially larger than the rail — and says so.
 * If that ever stops being true the run must be read differently, and it will say so itself.
 *
 * ⚠️ SIGNED VS ABSOLUTE IS MEASURED, NOT ASSUMED. Withdrawals are stored negative, so the
 * page's magnitude is `sum(abs(amount))`. That equals `abs(sum(amount))` only while every
 * confirmed row of a type shares one sign — so the SQL reads both and the run fails if they
 * ever diverge, rather than quietly reporting whichever it happened to pick.
 *
 * ⚠️ SIGNED IN AS THE **FINANCE** OFFICER, deliberately. `/admin/payments` is the
 * `accounting` domain and FINANCE holds it (`roles.ts` DEFAULT_GRANTS). ADMIN bypasses every
 * domain check, so a sweep run as ADMIN measures nothing about who can actually see this.
 *
 * Run: npm run qa:selcom-statement
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { browser, login, BASE, recorder, bodyText } from "./live/harness.mjs";

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const SHOT = process.env.SHOT_DIR ?? "docs/shots/selcom-statement";

// ── the independent read: production's own database, its own SQL ─────────────────────
async function censusFromDb() {
  const { Client } = require(join(HERE, "..", "node_modules", "pg"));
  const envPath = join(HERE, "live", "ops", ".env");
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const i = line.indexOf("=");
    if (i > 0) process.env[line.slice(0, i)] = line.slice(i + 1).trim();
  }
  const c = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await c.connect();
  const { rows } = await c.query(`
    select "type"::text as type,
           count(*)::int            as n,
           sum(abs("amount"))::text as abs_total,
           abs(sum("amount"))::text as signed_abs
      from "Transaction"
     where "status" = 'CONFIRMED'
       and "type" in ('DEPOSIT','WITHDRAWAL','BET_PAYOUT')
     group by "type"`);
  await c.end();
  const by = Object.fromEntries(rows.map((r) => [r.type, r]));
  const get = (t) => ({
    amount: Number(by[t]?.abs_total ?? 0),
    count: Number(by[t]?.n ?? 0),
    oneSign: (by[t]?.abs_total ?? "0") === (by[t]?.signed_abs ?? "0"),
  });
  return { DEPOSIT: get("DEPOSIT"), WITHDRAWAL: get("WITHDRAWAL"), BET_PAYOUT: get("BET_PAYOUT") };
}

/** `TZS 1,234,567` → 1234567. Returns null when the caption is not a money figure. */
const parseTzs = (s) => {
  const m = /TZS\s*(−|-)?([\d,]+)/.exec(s ?? "");
  if (!m) return null;
  return (m[1] ? -1 : 1) * Number(m[2].replace(/,/g, ""));
};

const rec = recorder("JAY UNIT I (#7) · THE SELCOM STATEMENT — reconciled against production's own SQL");

const db = await censusFromDb();
rec.note(`db: DEPOSIT ${db.DEPOSIT.amount} (${db.DEPOSIT.count}) · WITHDRAWAL ${db.WITHDRAWAL.amount} (${db.WITHDRAWAL.count}) · BET_PAYOUT ${db.BET_PAYOUT.amount} (${db.BET_PAYOUT.count})`);

// ── ⭐ THE DATA CONTROL, before anything is claimed about the page ────────────────────
rec.check("⭐ CONTROL · production holds a real conflation to get wrong",
  db.BET_PAYOUT.amount > 0 && db.WITHDRAWAL.amount > 0 && db.BET_PAYOUT.amount > db.WITHDRAWAL.amount * 5,
  `BET_PAYOUT ${db.BET_PAYOUT.amount} vs WITHDRAWAL ${db.WITHDRAWAL.amount} — if these ever converge, every "not the conflated number" assertion below goes vacuous`);
rec.check("⭐ CONTROL · every confirmed type holds ONE sign, so a magnitude is unambiguous",
  db.DEPOSIT.oneSign && db.WITHDRAWAL.oneSign && db.BET_PAYOUT.oneSign,
  `sum(abs) vs abs(sum): DEPOSIT ${db.DEPOSIT.oneSign} · WITHDRAWAL ${db.WITHDRAWAL.oneSign} · BET_PAYOUT ${db.BET_PAYOUT.oneSign}`);

const { b, ctx } = await browser({ viewport: { width: 1440, height: 1100 } });
const page = await ctx.newPage();
const { mkdirSync } = await import("node:fs");
mkdirSync(SHOT, { recursive: true });

try {
  await login(page, "finance");
  await page.goto(`${BASE}/admin/payments`, { waitUntil: "domcontentloaded" });
  // ⛔ Wait for the CARD, not for the page — `/admin/payments` renders a dozen cards and a
  // load-error branch is still a rendered page. Ask for the thing under test by what it is.
  const card = page.locator("div.glass-panel", { hasText: "Collections balance (C2B)" }).first();
  await card.waitFor({ state: "visible", timeout: 45_000 });
  await page.waitForTimeout(600);

  const text = (await card.innerText()).replace(/\s+/g, " ");
  rec.check("the Selcom card rendered (not the load-error branch)",
    !/could not be loaded|couldn't be read/i.test(text), text.slice(0, 120));

  // ── read each figure by its own caption, scoped to the card ────────────────────────
  const figureUnder = async (caption) => {
    const block = card.locator("div", { hasText: new RegExp(caption.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i") }).last();
    const t = (await block.innerText()).replace(/\s+/g, " ");
    return { amount: parseTzs(t), text: t };
  };

  // ⚠️ PLAIN TEXT, NOT A REGEX. `figureUnder` escapes what it is given; a first version
  // passed pre-escaped captions ("Money in \\(deposits\\)") and the escaper escaped the
  // backslashes again, so the locator hunted for `Money in \\\(deposits\\\)` and timed out
  // against a card that was rendering perfectly. The harness lying, not the product — again.
  const moneyIn = await figureUnder("Money in (deposits)");
  const moneyOut = await figureUnder("Money out (withdrawals)");
  const net = await figureUnder("Net across the rail");
  const inWallet = await figureUnder("Winnings credited in-wallet");

  // ── ① RECONCILIATION — the page vs production's own SQL ────────────────────────────
  rec.check("① money IN on the page equals the confirmed DEPOSIT total in the database",
    moneyIn.amount === db.DEPOSIT.amount, `page ${moneyIn.amount} vs db ${db.DEPOSIT.amount}`);
  rec.check("① money OUT on the page equals the confirmed WITHDRAWAL total in the database",
    moneyOut.amount === db.WITHDRAWAL.amount, `page ${moneyOut.amount} vs db ${db.WITHDRAWAL.amount}`);
  rec.check("① the net is in − out, to the shilling",
    net.amount === db.DEPOSIT.amount - db.WITHDRAWAL.amount, `page ${net.amount} vs db ${db.DEPOSIT.amount - db.WITHDRAWAL.amount}`);
  rec.check("① the counts are the real row counts, not the page's own arithmetic",
    new RegExp(`${db.DEPOSIT.count} confirmed`).test(moneyIn.text) && new RegExp(`${db.WITHDRAWAL.count} confirmed`).test(moneyOut.text),
    `in="${moneyIn.text.slice(0, 60)}" out="${moneyOut.text.slice(0, 60)}"`);

  // ── ② ⛔ THE CONFLATION IS NOT ON THE RAIL SIDE ────────────────────────────────────
  rec.check("② ⛔ money OUT is NOT the in-wallet credit total",
    moneyOut.amount !== db.BET_PAYOUT.amount, `${moneyOut.amount} vs ${db.BET_PAYOUT.amount}`);
  rec.check("② ⛔ …nor the two added together",
    moneyOut.amount !== db.BET_PAYOUT.amount + db.WITHDRAWAL.amount);
  rec.check("② the in-wallet credit IS on the page, at its true value",
    inWallet.amount === db.BET_PAYOUT.amount, `page ${inWallet.amount} vs db ${db.BET_PAYOUT.amount}`);
  rec.check("② …captioned as money that did not touch Selcom",
    /did not touch selcom/i.test(text));
  rec.check("② …and the overstatement is named with its real ratio",
    new RegExp(`${(db.BET_PAYOUT.amount / db.WITHDRAWAL.amount).toFixed(1)}×`).test(text),
    `expected ${(db.BET_PAYOUT.amount / db.WITHDRAWAL.amount).toFixed(1)}× in the card`);

  // ── ③ PROVENANCE — every ledger figure says it is ours ─────────────────────────────
  const ledgerLabels = (text.match(/from our ledger/g) ?? []).length;
  rec.check("③ every one of the four ledger figures says it came from OUR ledger",
    ledgerLabels === 4, `found ${ledgerLabels}`);
  rec.check("③ ⛔ the ledger figures are never captioned 'from Selcom'",
    !/(confirmed · from Selcom)/i.test(text));

  // ── ④ THE TWO BALANCES — one live, one honestly absent ─────────────────────────────
  rec.check("④ the collections balance is stated as NOT PUBLISHED by Selcom",
    /not published by selcom/i.test(text));
  rec.check("④ …with the reason, naming the per-transaction contract",
    /per-transaction/i.test(text));
  rec.check("④ ⛔ …and carries no number a reader could take for a balance",
    !/Collections balance \(C2B\)[^]{0,80}TZS/i.test(text), text.slice(text.search(/Collections balance/i), text.search(/Collections balance/i) + 160));
  const floatShown = /Disbursement float \(B2C\)[^]{0,60}(TZS [\d,]+|Unavailable)/i.exec(text);
  rec.check("④ the disbursement float is either a live number or an honest 'Unavailable'",
    !!floatShown, floatShown?.[0]?.slice(0, 80) ?? "neither");

  await card.screenshot({ path: `${SHOT}/selcom-card-1440.png` });
  await page.screenshot({ path: `${SHOT}/payments-page-1440.png`, fullPage: false });

  // ── ⑤ the page still works at a phone width ────────────────────────────────────────
  await page.setViewportSize({ width: 393, height: 900 });
  await page.waitForTimeout(500);
  // ⚠️ LOWERCASED. §3's oldest trap: Chrome's `innerText` applies `text-transform`, and
  // these captions are `uppercase`, so a case-sensitive `indexOf("Money in")` returns −1 and
  // the slice that follows reads the last character of the card. It reported a PERFECT card
  // as having dropped every figure at 393 — the seventh time this campaign has been lied to
  // by its own harness rather than by the product. The desktop reads above survived only
  // because their locators were built case-insensitively.
  const narrow = (await card.innerText()).replace(/\s+/g, " ").toLowerCase();
  const afterMoneyIn = narrow.slice(narrow.indexOf("money in"));
  rec.check("⑤ every figure survives 393 — nothing is dropped by the layout",
    narrow.includes("money in") && parseTzs(afterMoneyIn.toUpperCase()) === db.DEPOSIT.amount
      && narrow.includes("not published by selcom") && parseTzs(narrow.slice(narrow.indexOf("winnings credited")).toUpperCase()) === db.BET_PAYOUT.amount,
    `found "money in": ${narrow.includes("money in")} · first figure after it: ${parseTzs(afterMoneyIn.toUpperCase())}`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  rec.check("⑤ …and it adds no horizontal overflow at 393", overflow <= 0, `${overflow}px`);
  await card.screenshot({ path: `${SHOT}/selcom-card-393.png` });

  const body = await bodyText(page);
  rec.check("⑤ the old stand-alone float strip is gone — ONE Selcom money surface, not two",
    (body.match(/disbursement float/g) ?? []).length === 1, `${(body.match(/disbursement float/g) ?? []).length} occurrences`);
} catch (e) {
  rec.check("the drive completed", false, String(e.message ?? e));
} finally {
  await b.close();
}

const failed = rec.done();
console.log(`shots → ${SHOT}`);
process.exit(failed ? 1 : 0);
