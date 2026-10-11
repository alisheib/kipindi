/**
 * qa-counts-as-drive — the "Counts as" journey on a SERVED build, read against the database it writes (owner ruling
 * 2026-10-11; docs/HOUSE-BOTS.md §12.18). LOCAL SCRATCH ONLY — it refuses any BASE that is not localhost and any
 * database that is not on loopback.
 *
 *   BASE=http://localhost:3009 DATABASE_URL=<scratch> ADMIN_PHONE=+255… ADMIN_PASSWORD=… OUT=<dir> node scripts/qa-counts-as-drive.mjs
 *
 * The truth is the database (`predictorCount`, `predictorExtra`, the market's status); the screen is checked against it:
 * the roster column, the Rules box, its before-Save sentence, every refusal on the box itself, the save's own sentence,
 * the player's card and detail page (the shown count), the admin market page (the true count), and the served HTML (no
 * column name crosses). Viewport tiles at 1280, 1024 and 360; nothing full-page. It ends by putting the number back to 1.
 */
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE ?? "http://localhost:3009";
const PHONE = process.env.ADMIN_PHONE ?? "";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const OUT = process.env.OUT ?? "qa-counts-as-shots";
if (!/^http:\/\/localhost:\d+$/.test(BASE)) { console.error(`REFUSED — BASE must be http://localhost:<port>, got ${BASE}`); process.exit(2); }
if (!/@(127\.0\.0\.1|localhost):/.test(process.env.DATABASE_URL ?? "")) { console.error("REFUSED — DATABASE_URL must be a loopback scratch database"); process.exit(2); }
mkdirSync(OUT, { recursive: true });

let pass = 0;
let fail = 0;
const ok = (label, cond, extra = "") => { if (cond) pass++; else fail++; console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`); };
const fmt = (n) => String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const db = new PrismaClient();

/* ── the database's truth ── */
const [candidate] = await db.$queryRawUnsafe(`
  SELECT p."houseBotId" AS "bot", count(DISTINCT m."id")::int AS "open"
  FROM "Position" p JOIN "PredictionMarket" m ON m."id" = p."marketId" JOIN "HouseBot" b ON b."id" = p."houseBotId"
  WHERE p."houseBotId" IS NOT NULL AND m."status" IN ('LIVE', 'CLOSED') AND b."status" <> 'REMOVED'
  GROUP BY p."houseBotId" ORDER BY 2 DESC LIMIT 1`);
if (!candidate) { console.error("NOT MEASURED — no desk account holds a position on an open market (run db:seed-house-bot-panels)"); process.exit(3); }
const BOT = candidate.bot;
const marketsOf = async () => db.$queryRawUnsafe(`
  SELECT DISTINCT m."id", m."status"::text AS "status", m."predictorCount"::int AS "count", m."predictorExtra"::int AS "extra", m."productLine"::text AS "line"
  FROM "PredictionMarket" m JOIN "Position" p ON p."marketId" = m."id" WHERE p."houseBotId" = $1 ORDER BY m."id"`, BOT);
const allExtras = async () => Object.fromEntries((await db.$queryRawUnsafe(`SELECT "id", "predictorExtra"::int AS "extra" FROM "PredictionMarket"`)).map((r) => [r.id, r.extra]));
const versionOf = async () => (await db.$queryRawUnsafe(`SELECT "rulesVersion"::int AS "v" FROM "HouseBot" WHERE "id" = $1`, BOT))[0].v;
const mine0 = await marketsOf();
const OPEN = mine0.filter((m) => m.status === "LIVE" || m.status === "CLOSED");
const extras0 = await allExtras();
console.log(`account ${BOT.slice(0, 6)}… · ${mine0.length} markets carry its positions, ${OPEN.length} open`);

const browser = await chromium.launch();
const tile = async (page, name, width) => {
  await page.setViewportSize({ width, height: width === 360 ? 780 : 900 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, `${name}-${width}.png`) });
};

try {
  /* ── sign in (the visual gate's own recipe: networkidle, the VISIBLE #phone, the hidden mirror checked) ── */
  const admin = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await admin.newPage();
  await page.goto(`${BASE}/auth/admin`, { waitUntil: "networkidle", timeout: 90_000 });
  await page.fill("#phone", PHONE.replace("+255", ""));
  await page.fill('input[type="password"]', PASSWORD);
  await Promise.all([page.waitForURL((u) => !/\/auth\//.test(u.toString()), { timeout: 60_000 }).catch(() => null), page.click('button[type="submit"]')]);
  ok("0 · the local admin signs in", !/\/auth\//.test(page.url()), page.url());

  /* ── the roster ── */
  await page.goto(`${BASE}/admin/desk`, { waitUntil: "networkidle", timeout: 90_000 });
  const headers = await page.$$eval("table thead th", (ths) => ths.map((t) => (t.textContent ?? "").trim()));
  ok("1.1 · the roster has a Counts as column", headers.some((h) => /^Counts as/.test(h)), headers.join(" | "));
  const rowCell = async () => page.$eval(`a.row-link[href="/admin/desk/${BOT}"]`, (a) => {
    const tr = a.closest("tr"); const ths = [...tr.closest("table").querySelectorAll("thead th")].map((t) => (t.textContent ?? "").trim());
    const i = ths.findIndex((h) => /^Counts as/.test(h)); return i < 0 ? null : (tr.children[i]?.textContent ?? "").trim();
  }).catch(() => null);
  ok("1.2 · the account's roster cell reads 1 before any change", (await rowCell()) === "1", String(await rowCell()));
  for (const w of [1280, 1024, 360]) await tile(page, "01-roster", w);
  await page.setViewportSize({ width: 1280, height: 900 });

  /* ── the Rules box ── */
  const rulesUrl = `${BASE}/admin/desk/${BOT}?tab=rules`;
  const openRules = async () => { await page.goto(rulesUrl, { waitUntil: "networkidle", timeout: 90_000 }); await page.waitForSelector('[data-field="counts-as"] input[name="counts-as"]', { timeout: 30_000 }); };
  await openRules();
  const box = () => page.locator('[data-field="counts-as"] input[name="counts-as"]');
  const status = () => page.locator('[data-field="counts-as"] [role="status"][data-change]');
  const typeInto = async (text) => { await box().click(); await page.keyboard.press("Control+A"); await page.keyboard.press("Backspace"); if (text) await page.keyboard.type(text, { delay: 20 }); };
  const save = async () => page.locator('form button[type="submit"]', { hasText: "Save · Hifadhi" }).click();
  ok("2.1 · the box sits under Market cards and holds 1", (await box().inputValue()) === "1"
    && (await page.locator("text=Market cards").count()) > 0, await box().inputValue());
  ok("2.2 · its help sentence is the server's", (await page.locator('[data-field="counts-as"]').textContent()).includes("How many predictors this account adds to the count players see on a market it stakes on."));
  ok("2.3 · nothing is said before anything is typed", ((await status().textContent()) ?? "").trim() === "");
  await box().scrollIntoViewIfNeeded();
  for (const w of [1280, 1024, 360]) await tile(page, "02-rules-box", w);
  await page.setViewportSize({ width: 1280, height: 900 });

  await typeInto("100");
  await page.waitForTimeout(300);
  const upLine = ((await status().textContent()) ?? "").trim();
  ok(`2.4 · typing 100 says, before Save, what it does to the ${OPEN.length} open markets`,
    upLine === `Saving raises the count players see on the ${OPEN.length} open market${OPEN.length === 1 ? "" : "s"} this account is on, at once. Finished markets keep their number.`, upLine);
  await box().scrollIntoViewIfNeeded();
  for (const w of [1280, 360]) await tile(page, "03-typed-100", w);
  await page.setViewportSize({ width: 1280, height: 900 });

  /* ── refusals, each on the box, nothing moved ── */
  for (const [typed, message, name] of [["0", "Between 1 and 10,000.", "zero"], ["10001", "Between 1 and 10,000.", "over"], ["", "Enter a whole number.", "empty"]]) {
    const v0 = await versionOf();
    await openRules();
    await typeInto(typed);
    await save();
    const alert = page.locator('[data-field="counts-as"] [role="alert"]');
    await alert.waitFor({ state: "visible", timeout: 20_000 }).catch(() => null);
    const said = ((await alert.textContent().catch(() => "")) ?? "").trim();
    ok(`3 · "${typed}" is refused ON the box with "${message}", and nothing is saved`, said === message && (await versionOf()) === v0
      && JSON.stringify(await allExtras()) === JSON.stringify(extras0), said);
    await box().scrollIntoViewIfNeeded();
    await tile(page, `04-refused-${name}`, 1280);
    await page.setViewportSize({ width: 1280, height: 900 });
  }

  /* ── 1 → 100 ── */
  await openRules();
  await typeInto("100");
  await save();
  const toast100 = page.getByText(`Counts as is now 100 — ${OPEN.length} open market${OPEN.length === 1 ? "" : "s"} updated.`);
  await toast100.waitFor({ state: "visible", timeout: 30_000 }).catch(() => null);
  ok("4.1 · the save says what it moved", await toast100.isVisible().catch(() => false));
  ok("4.0 · once the save lands, the before-Save sentence is gone — the box now holds the saved number",
    ((await status().textContent().catch(() => "x")) ?? "x").trim() === "", ((await status().textContent().catch(() => "")) ?? "").trim());
  await tile(page, "05-saved-100", 1280);
  const mine1 = await marketsOf();
  const moved = mine1.filter((m, i) => m.extra !== mine0[i].extra);
  ok("4.2 · the database: every OPEN market of the account moved by exactly 99, every finished one kept its number",
    mine1.every((m, i) => (OPEN.some((o) => o.id === m.id) ? m.extra === mine0[i].extra + 99 : m.extra === mine0[i].extra)) && mine1.every((m, i) => m.count === mine0[i].count),
    JSON.stringify(mine1.map((m, i) => [m.status, mine0[i].extra, m.extra])));
  const extras1 = await allExtras();
  const strangers = Object.keys(extras1).filter((id) => extras1[id] !== extras0[id] && !moved.some((m) => m.id === id));
  ok("4.3 · …and no market the account is not on moved at all", strangers.length === 0, strangers.join(", "));

  /* ── what a PLAYER sees, signed out: the card, the detail page, the served HTML ── */
  const liveOne = mine1.find((m) => m.status === "LIVE" && m.line === "MARKET") ?? mine1.find((m) => m.status === "LIVE");
  if (liveOne) {
    const shown = fmt(liveOne.count + liveOne.extra);
    const visitor = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const pv = await visitor.newPage();
    const detailUrl = liveOne.line === "UPDOWN" ? null : `${BASE}/markets/${liveOne.id}`;
    if (detailUrl) {
      await pv.goto(detailUrl, { waitUntil: "networkidle", timeout: 90_000 });
      const text = (await pv.locator("main").textContent()) ?? "";
      ok(`5.1 · the market page states the count players see: ${shown} (true ${liveOne.count} + ${liveOne.extra})`, text.includes(shown), shown);
      for (const w of [1280, 360]) await tile(pv, "06-player-detail", w);
      const html = await (await fetch(detailUrl)).text();
      ok("5.2 · the served HTML names neither column — only the built number crosses", !/predictorExtra|predictorCount/.test(html), `${html.length} bytes`);
      /* The same law on every player board a signed-out visitor can open: a whole market row handed to a client
         component would put both columns into the page's payload, and only the served bytes can show it. */
      for (const path of ["/", "/markets", "/results", "/live", "/updown"]) {
        const body = await (await fetch(`${BASE}${path}`)).text();
        ok(`5.2′ · ${path}: the served HTML names neither column`, body.length > 1_000 && !/predictorExtra|predictorCount/.test(body), `${body.length} bytes`);
      }
      await pv.setViewportSize({ width: 1280, height: 900 });
      await pv.goto(`${BASE}/markets`, { waitUntil: "networkidle", timeout: 90_000 });
      const card = pv.locator(`a[href="/markets/${liveOne.id}"]`).first();
      if (await card.count()) {
        const host = card.locator("xpath=ancestor::*[.//*[@data-market-part='predictors']][1]");
        const cardCount = ((await host.locator("[data-market-part='predictors'] b").first().textContent().catch(() => "")) ?? "").trim();
        ok(`5.3 · the board's card for that market states ${shown}`, cardCount === shown, cardCount);
        await card.scrollIntoViewIfNeeded();
        for (const w of [1280, 360]) await tile(pv, "07-player-card", w);
      } else ok("5.3 · the board's card for that market is on /markets", false, "card not found on page 1");
    }
    /* ── what an ADMIN reads: the true count ── */
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(`${BASE}/admin/markets/${liveOne.id}`, { waitUntil: "networkidle", timeout: 90_000 });
    const adminText = (await page.locator("main").textContent()) ?? "";
    ok(`5.4 · the admin market page keeps the TRUE count (${liveOne.count}) and never the shown ${shown}`,
      adminText.includes(fmt(liveOne.count)) && (liveOne.extra === 0 || !adminText.includes(shown)), fmt(liveOne.count));
    await tile(page, "08-admin-market", 1280);
    await visitor.close();
  } else ok("5 · a LIVE market of the account to look at", false, "none");

  /* ── 100 → 50: the warning, then the fall ── */
  await page.setViewportSize({ width: 1280, height: 900 });
  await openRules();
  await typeInto("50");
  await page.waitForTimeout(300);
  const downLine = ((await status().textContent()) ?? "").trim();
  const downInk = await status().evaluate((el) => el.className);
  ok("6.1 · lowering is warned before Save, in the warning ink", downLine.startsWith("Saving lowers the count players see on the") && /text-warning-fg/.test(downInk), downLine);
  await box().scrollIntoViewIfNeeded();
  await tile(page, "09-typed-50", 1280);
  await save();
  await page.getByText(`Counts as is now 50 — ${OPEN.length} open market${OPEN.length === 1 ? "" : "s"} updated.`).waitFor({ state: "visible", timeout: 30_000 }).catch(() => null);
  const mine2 = await marketsOf();
  ok("6.2 · the database: the open markets fell by exactly 50 (99 → 49), the finished ones did not move",
    mine2.every((m, i) => (OPEN.some((o) => o.id === m.id) ? m.extra === mine0[i].extra + 49 : m.extra === mine0[i].extra)),
    JSON.stringify(mine2.map((m, i) => [m.status, mine0[i].extra, m.extra])));
  await page.goto(`${BASE}/admin/desk`, { waitUntil: "networkidle", timeout: 90_000 });
  ok("6.3 · the roster cell reads 50", (await rowCell()) === "50", String(await rowCell()));

  /* ── put it back ── */
  await openRules();
  await typeInto("1");
  await save();
  await page.getByText(`Counts as is now 1 — `).waitFor({ state: "visible", timeout: 30_000 }).catch(() => null);
  ok("7 · back to 1: every market of the account holds exactly what it held before the drive", JSON.stringify(await marketsOf()) === JSON.stringify(mine0));
  await admin.close();
} finally {
  await browser.close();
  await db.$disconnect();
}
console.log(`\nqa-counts-as-drive: ${pass} passed, ${fail} failed · tiles in ${OUT}`);
process.exit(fail === 0 && pass > 0 ? 0 : 1);
