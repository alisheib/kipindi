/**
 * U16a · THE RETENTION SCHEDULE, DRIVEN — /admin/retention's Schedule tab at 1280 and at 360, on an in-memory dev boot
 * (`DISABLE_ADMIN_TOTP=true`, `rm -rf .next` first, http://localhost — never 127.0.0.1). What a suite cannot see:
 *   · the two rows U16a adds — "SMS campaigns and their recipients" and "Marketing opt-out links" — each RENDERED with its
 *     7y chip, its trigger, its legal basis and its storage line, in the words `test:campaign-privacy` P6 holds equal to
 *     docs/DATA-RETENTION.md §1;
 *   · the header chip counting every row (the SCHEDULE array's length), and the table holding exactly that many;
 *   · the marketing-consent row still there beside them;
 *   · no sideways scroll on the PAGE at 360 (the table scrolls inside its own ScrollX, as it always has).
 * Writes viewport tiles to .qa-shots/marketing-setup/u16a/ — open and read them; a pass here is not a look.
 * Usage: BASE=http://localhost:3010 node scripts/live/marketing-u16a-retention-drive.mjs
 * ⛔ No backslash anywhere in this file (the tools that write it decode escapes).
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3010";
const SHOTS = join(".qa-shots", "marketing-setup", "u16a");
mkdirSync(SHOTS, { recursive: true });

const LF = String.fromCharCode(10);
const NBSP = String.fromCharCode(0xa0);
let pass = 0;
let fail = 0;
const ok = (label, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? " -- " + detail : ""}`); }
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/** Text as a reader compares it: a no-break space read as a space, every run of spaces one. */
const flat = (s) => String(s || "").split(NBSP).join(" ").split(LF).join(" ").replace(/ +/g, " ").trim();

const ADMIN_PHONE = "+255700000361";
const ADMIN_NAME = "QA U16a Owner";
/** The two rows as the page must print them — the same words as the SCHEDULE literal and DATA-RETENTION §1. */
const ROWS = [
  {
    category: "SMS campaigns and their recipients", swahili: "Kampeni", chip: "7y",
    trigger: "From the campaign's finish (for one that never finished: its last send or receipt)", legal: "GN 478T reg 51(1)",
    storage: "Postgres (policy — no purge before 2033)",
  },
  {
    category: "Marketing opt-out links", swahili: "Acha ofa na habari kwa SMS", chip: "7y",
    trigger: "From the last message that carried the link", legal: "GN 478T reg 51(1); PDPA 2022 §15",
    storage: "Postgres (policy — no purge before 2033)",
  },
];
const TABLE_ROWS = "table.admin-tbl tbody tr";

const browser = await chromium.launch();

async function adminPage(viewport) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.on("dialog", (d) => { d.accept().catch(() => {}); });
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const r = await page.request.post(BASE + "/api/dev-test/seed-admin", { data: { role: "ADMIN", phone: ADMIN_PHONE, name: ADMIN_NAME } });
  if (!r.ok()) throw new Error(`seed-admin ADMIN failed: ${r.status()}`);
  await page.evaluate(() => { try { localStorage.setItem("50pick-primer-seen", "1"); } catch {} });
  return { ctx, page };
}
const overflowOf = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
async function tile(page, name) {
  await page.screenshot({ path: join(SHOTS, `${name}.png`) });
}

for (const [w, h] of [[1280, 800], [360, 780]]) {
  const { ctx, page } = await adminPage({ width: w, height: h });
  await page.goto(BASE + "/admin/retention", { waitUntil: "domcontentloaded" });
  await page.waitForSelector(TABLE_ROWS, { timeout: 60_000 });
  await wait(400);
  const rowCount = await page.locator(TABLE_ROWS).count();
  const headerChip = flat(await page.getByText(/^[0-9]+ categories$/).first().textContent().catch(() => ""));
  ok(`${w} · the header chip counts every row of the table`, headerChip === `${rowCount} categories`, `chip "${headerChip}" · ${rowCount} rows`);
  ok(`${w} · the schedule holds the marketing-consent row beside the two new ones`,
    (await page.locator(TABLE_ROWS, { hasText: "Marketing-consent records" }).count()) === 1);
  for (const [i, want] of ROWS.entries()) {
    const row = page.locator(TABLE_ROWS, { hasText: want.category });
    const n = await row.count();
    ok(`${w} · "${want.category}" is ONE row`, n === 1, `${n} rows`);
    if (n !== 1) continue;
    const cells = (await row.locator("td").evaluateAll((els) => els.map((e) => e.textContent || ""))).map(flat);
    ok(`${w} · "${want.category}" prints its category and its copied gloss`, cells[0] === flat(`${want.category}${want.swahili}`) || (cells[0].includes(want.category) && cells[0].includes(want.swahili)), cells[0]);
    ok(`${w} · "${want.category}" prints the ${want.chip} chip`, cells[1] === want.chip, cells[1]);
    ok(`${w} · "${want.category}" prints its trigger`, cells[2] === flat(want.trigger), cells[2]);
    ok(`${w} · "${want.category}" prints its legal basis`, cells[3] === flat(want.legal), cells[3]);
    ok(`${w} · "${want.category}" prints its storage line`, cells[4] === flat(want.storage), cells[4]);
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await page.evaluate(() => window.scrollBy(0, -90)).catch(() => {});
    await wait(250);
    await tile(page, `${w}-0${i + 1}-${i === 0 ? "campaigns" : "optout-links"}`);
  }
  const overflow = await overflowOf(page);
  ok(`${w} · no sideways scroll on the page`, overflow <= 1, `${overflow}px`);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => {});
  await wait(200);
  await tile(page, `${w}-00-top`);
  await ctx.close();
}

await browser.close();
console.log(`${LF}u16a-retention-drive: ${pass} passed, ${fail} failed`);
console.log(`shots: ${SHOTS}`);
process.exit(fail > 0 ? 1 : 0);
