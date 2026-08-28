/**
 * LIVE — the bulk confirmation's TYPED GATE, both ways, on production.
 *
 *   npm run qa:bulk-confirm-gate
 *
 * ⭐ WHY THIS IS ITS OWN PROBE. The tier and the typed word used to be passed as two
 * independent props, which renders correctly and lets `tier: "hard"` with NO word sit inside
 * the declared type — and `ConfirmModal` arms on `tier === "hard" && !!typedWord`, so that
 * combination looks gated and degrades to an ordinary confirm. The fix is a type-level
 * correlation, so the only way to know the BEHAVIOUR did not move is to open the dialog on
 * the real page, both ways, and read it.
 *
 * ⛔ IT SEALS NOTHING. Every path ends in Cancel. A probe that has to move money to check a
 * dialog's copy is a probe that cannot be run twice.
 */
import { browser, login, BASE, recorder } from "./live/harness.mjs";
import { readFileSync } from "node:fs";

const rec = recorder("BULK CONFIRM — the typed gate, both ways");

for (const line of readFileSync(".env.qa.local", "utf8").split(/\r?\n/)) {
  const m = /^([A-Z_0-9]+)=(.*)$/.exec(line);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { Client } = await import("pg");
const db = new Client({ connectionString: process.env.PROD_DATABASE_PUBLIC_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const q = async (sql, p) => (await db.query(sql, p)).rows;

const rows = await q(
  `select id, "titleEn" from "PredictionMarket"
    where "proposedBy" = 'qa-bulk-resolve' and status = 'CLOSED' order by "createdAt" desc`,
);
const eligible = rows.find((r) => /fixture E-/.test(r.titleEn));
const blocked = (await q(
  `select id from "PredictionMarket"
    where status = 'CLOSED' and "proposedBy" <> 'qa-bulk-resolve'
      and "sentinelOutcome" is not null limit 1`,
))[0];
rec.check("0.1 an ELIGIBLE fixture is available", !!eligible, eligible?.id);
rec.check("0.2 a REFUSED row is available to drive the override half", !!blocked, blocked?.id);

const QUEUE = `${BASE}/admin/resolver-queue?window=all&q=${encodeURIComponent("QA bulk-resolve fixture")}`;
const { b, ctx } = await browser({ viewport: { width: 1280, height: 1000 } });
const page = await ctx.newPage();

/**
 * The overlay carrying the bulk heading — the kit Modal portals its body away from
 * `[role=dialog]`, so reading that node returns an empty string.
 *
 * ⛔ `markets?\?` — THE PLURAL IS OPTIONAL, AND THE FIRST DRAFT DEMANDED IT. A one-market
 * batch is headed *"Seal 1 market?"*, so the extractor found nothing and returned `""` — and
 * three checks then matched against an EMPTY STRING, one of which (*"no typed word is
 * demanded"*) reported a vacuous PASS. A probe that cannot find the dialog reports that the
 * dialog is fine.
 */
const dialogText = () =>
  page.evaluate(() => {
    const nodes = [...document.querySelectorAll("body > div, [data-modal], [role=dialog]")];
    const hit = nodes.map((n) => n.innerText || "").filter((t) => /(seal|stage) \d+ markets?\?/i.test(t));
    return (hit.sort((a, b) => b.length - a.length)[0] ?? "").replace(/\s+/g, " ");
  });

try {
  await login(page, "admin");

  // ── 1 · NO OVERRIDE → a plain confirm, no typed word ─────────────────────────
  await page.goto(QUEUE, { waitUntil: "networkidle" });
  await page.locator(`[data-market-id="${eligible.id}"] input[type="checkbox"]`).first().check({ force: true });
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /resolve selected/i }).click();
  await page.waitForTimeout(800);

  const plain = await dialogText();
  rec.check("1.1 the confirmation opens on an eligible-only batch", /seal 1 market\?/i.test(plain), plain.slice(0, 100));
  rec.check("1.2 ⛔ NO typed word is demanded", plain.length > 0 && !/type RESOLVE/i.test(plain), plain.slice(0, 160) || "(dialog text EMPTY — the check would be vacuous)");
  const armedPlain = await page.getByRole("button", { name: /yes, seal/i }).isEnabled();
  rec.check("1.3 …and the confirm button is ARMED immediately", armedPlain === true);
  await page.getByRole("button", { name: /not yet|bado/i }).click();
  await page.waitForTimeout(400);
  rec.check("1.4 cancel closes it, sealing nothing", (await dialogText()) === "");

  // ── 2 · AN OVERRIDE IN THE BATCH → the typed gate appears and BITES ───────────
  // ⛔ Driven on a row the floor actually refused, not simulated.
  await page.goto(`${BASE}/admin/resolver-queue?window=all`, { waitUntil: "networkidle" });
  const card = page.locator(`[data-market-id="${blocked.id}"]`);
  rec.check("2.0 the refused row is on the page", (await card.count()) === 1);
  await card.locator('input[type="checkbox"]').first().check({ force: true });
  await page.waitForTimeout(400);
  const box = card.locator("textarea");
  rec.check("2.1 ticking a refused row reveals the typed-reason box", (await box.count()) === 1);
  await box.fill("Verified the result on the approved source by hand before sealing.");
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /resolve selected/i }).click();
  await page.waitForTimeout(800);

  const hard = await dialogText();
  rec.check("2.2 ⭐ the confirmation now DEMANDS the typed word", /type RESOLVE/i.test(hard), hard.slice(0, 200));
  rec.check("2.3 …and says plainly that the floor REFUSED these", /auto-resolve floor/i.test(hard), hard.slice(0, 260));
  const armedBefore = await page.getByRole("button", { name: /yes, seal/i }).isEnabled();
  rec.check("2.4 ⭐ …with the confirm button DISARMED until it is typed", armedBefore === false);
  // By its ACCESSIBLE NAME ("Type RESOLVE to confirm"), never by a positional `input`
  // selector — the modal is a portal and the first input on the page is not this one.
  const wordBox = page.getByLabel(/type\s+RESOLVE/i);
  rec.check("2.5a the typed-word field is reachable by its accessible name", (await wordBox.count()) === 1);
  await wordBox.fill("RESOLV");
  await page.waitForTimeout(300);
  rec.check("2.5 …still disarmed on a near-miss", (await page.getByRole("button", { name: /yes, seal/i }).isEnabled()) === false);
  await wordBox.fill("RESOLVE");
  await page.waitForTimeout(300);
  rec.check("2.6 ⭐ …and ARMED only on the exact word", (await page.getByRole("button", { name: /yes, seal/i }).isEnabled()) === true);

  // ⛔ CANCEL. Nothing on this page is sealed by a probe about a dialog.
  await page.getByRole("button", { name: /not yet|bado/i }).click();
  await page.waitForTimeout(500);
  rec.check("2.7 cancelled — the refused row is untouched",
            (await q(`select status::text s from "PredictionMarket" where id=$1`, [blocked.id]))[0].s === "CLOSED");

  const failed = rec.done();
  process.exitCode = failed === 0 ? 0 : 1;
} catch (err) {
  console.error("PROBE ERROR:", err?.stack ?? err);
  process.exitCode = 1;
} finally {
  await ctx.close();
  await b.close();
  await db.end();
}
