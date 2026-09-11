/**
 * qa:kyc-roster — DRIVE the roster's KYC column and its filter against a REAL render.
 *
 * ⭐ WHY IT EXISTS AND WHY IT IS NOT A UNIT TEST. `test:kyc-stage` proves the
 * DERIVATION and the SOURCE wiring; neither can see a filter that works on page 1 and
 * evaporates on page 2, a chip the officer never sees because the column did not render,
 * or a KPI that silently moves under a filter. Those are render facts, and the only
 * instrument that observes them is a browser pointed at `next start`.
 *
 * ⛔ NEVER COMPARE VISIBLE ROWS. `PER_PAGE` is 20, so a filtered set of 34 shows 20 and
 * a naive "rows === count" arm reports a false failure — a mistake already recorded in
 * `scripts/admin-filter-drive.mjs`. `readView()` walks EVERY page via `?page=N` and
 * collects `[data-row-id]`.
 *
 * ⭐ THE CENTRAL ARM IS DISJOINT + COVERING (§3). Filtering to each of the seven stages
 * in turn must partition the population EXACTLY: no id in two stages, every id in one.
 * That is stronger than sampling a chip's word and it is locale-proof — it never reads a
 * label. It is also, incidentally, the only live proof that one user yields one row.
 *
 * ⛔ LOCALHOST ONLY. It signs in as a seeded local ADMIN, which cannot exist on
 * production, and it refuses a non-localhost BASE outright.
 *
 * Run (see docs/LIVE-QA-CAMPAIGN.md):
 *   npx tsx scripts/db-scratch.mts            # terminal 1, holds the cluster
 *   bash scratchpad/boot.sh                   # migrate + seed
 *   … next start …                            # terminal 2
 *   npm run qa:kyc-roster                     # terminal 3
 */
import { chromium } from "playwright";
import { login } from "./harness.mjs";
import { KYC_STAGES } from "../../src/lib/kyc-stage.ts";

const BASE = process.env.LIVE_BASE ?? "http://127.0.0.1:3000";
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error(`REFUSED — this driver signs in as a seeded local admin and will not run against ${BASE}.`);
  process.exit(2);
}
let pass = 0;
const fails = [];
const check = (name, ok, detail = "") => {
  if (ok) { pass++; console.log(`  ok   ${name}`); }
  else { fails.push(`${name}${detail ? ` — ${detail}` : ""}`); console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`); }
  return ok;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const page = await ctx.newPage();

/* ── sign in ─────────────────────────────────────────────────────────────── */
console.log("\nqa:kyc-roster — the roster's KYC column, driven\n");
// ⛔ THE SHARED `login()`, NEVER A HAND-ROLLED ONE. It knows that staff go to
// /auth/admin (a player form renders a different id and lands on the player shell), that
// PhoneInput mirrors into a hidden input only after React hydrates, and that it must
// wait for a POSITIVE signal rather than the absence of the word "sign in". A driver
// that re-implemented this reported seven false failures over a working console.
await login(page, "local:ADMIN");

await page.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
// ⛔ Prove we are on the console, not still on the sign-in page. A driver that asserted
// text the LOGIN page also renders once reported seven false failures over a working
// console — the trap `harness.mjs` records.
check("§0 signed in and the roster rendered",
  await page.locator("table.admin-tbl").count() > 0,
  (await page.title()) + " · " + page.url());

/** Every row id across EVERY page of a view, plus the headline count. */
async function readView(qs) {
  const ids = [];
  const seen = new Set();
  let resultCount = null;
  for (let p = 1; p <= 40; p++) {
    const url = `${BASE}/admin/players?${qs}${qs ? "&" : ""}page=${p}`;
    await page.goto(url, { waitUntil: "networkidle" });
    const pageIds = await page.$$eval("[data-row-id]", (els) => els.map((e) => e.getAttribute("data-row-id")));
    if (resultCount === null) {
      const m = (await page.locator("text=/\\d+ of \\d+ player/").first().textContent().catch(() => null)) ?? "";
      const mm = /(\d+) of (\d+)/.exec(m);
      if (mm) resultCount = Number(mm[1]);
    }
    if (pageIds.length === 0) break;
    // 🔴 STOP ON "NOTHING NEW", NOT ON A SHORT PAGE. `parsePage` CLAMPS a `?page=` beyond
    // the last page back to the LAST one, so a naive walk re-reads the final page forever
    // and returns 20 × 40 = 800 ids for a 40-player population. The first version of this
    // driver did exactly that and reported it as a PRODUCT failure (union 40 vs 800) —
    // an instrument defect wearing a product defect's clothes.
    const fresh = pageIds.filter((id) => !seen.has(id));
    if (fresh.length === 0) break;
    for (const id of fresh) { seen.add(id); ids.push(id); }
    if (pageIds.length < 20) break;
  }
  return { ids, resultCount };
}

/* ── §1 · the column renders, with a chip on every row ───────────────────── */
await page.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
const headers = await page.$$eval("table.admin-tbl thead th", (els) => els.map((e) => e.textContent.trim()));
check("§1a the KYC column exists", headers.includes("KYC"), headers.join(" | "));
const rowCount = await page.locator("[data-row-id]").count();
const chipCount = await page.locator("td[data-kyc-stage]").count();
check("§1b every visible row carries a KYC chip", chipCount === rowCount, `${chipCount} chips for ${rowCount} rows`);

/* ── §2 · all seven stages are reachable and the words are distinct ──────── */
const seenWords = new Map();
for (const stage of KYC_STAGES) {
  await page.goto(`${BASE}/admin/players?kyc=${stage}`, { waitUntil: "networkidle" });
  // ⛔ `data-kyc-stage`, NOT `data-filter-value`. The ACCOUNT-status cell carries the
  // latter, and "PENDING_KYC" contains an underscore — the first version of this driver
  // selected both cells and filtered by `v.includes("_")`, so it duly reported account
  // statuses as stray KYC stages. Two columns, two attributes, no guessing.
  const mine = await page.$$eval("td[data-kyc-stage]", (els) => els.map((e) => e.getAttribute("data-kyc-stage")));
  const wrong = mine.filter((v) => v !== stage);
  check(`§2·${stage} every returned row carries that stage`, mine.length > 0 && wrong.length === 0,
    mine.length === 0 ? "no rows returned" : `stray: ${[...new Set(wrong)].join(",")}`);
  const word = await page.locator(`td[data-kyc-stage="${stage}"] >> nth=0`).textContent().catch(() => null);
  if (word) seenWords.set(stage, word.trim());
}
check("§2z each stage renders its own distinct word",
  new Set(seenWords.values()).size === seenWords.size, JSON.stringify([...seenWords]));

/* ── §3 · 🔴 DISJOINT + COVERING — the partition proof ───────────────────── */
const all = await readView("");
const union = new Set();
let overlap = 0;
const perStage = {};
for (const stage of KYC_STAGES) {
  const v = await readView(`kyc=${stage}`);
  perStage[stage] = v.ids.length;
  for (const id of v.ids) { if (union.has(id)) overlap++; union.add(id); }
}
check("§3a no player appears under two stages (DISJOINT)", overlap === 0, `${overlap} duplicated`);
check("§3b every player appears under exactly one stage (COVERING)",
  union.size === all.ids.length, `union ${union.size} vs population ${all.ids.length}`);
console.log(`    partition: ${JSON.stringify(perStage)} = ${union.size} of ${all.ids.length}`);

/* ── §4 · 🔴 THE PAGE-2 REGRESSION — the silent one ──────────────────────── */
// With a hand-typed baseHref literal, ?kyc= is dropped from every page link: page 2
// silently serves the UNFILTERED roster while the officer believes it is a queue.
const nothing = await readView("kyc=nothing_yet");
check("§4a the biggest stage really spans more than one page", nothing.ids.length > 20,
  `${nothing.ids.length} rows — fixture too small to exercise pagination`);
await page.goto(`${BASE}/admin/players?kyc=nothing_yet&page=2`, { waitUntil: "networkidle" });
const p2 = await page.$$eval("td[data-kyc-stage]", (els) => els.map((e) => e.getAttribute("data-kyc-stage")));
const p2Stray = p2.filter((v) => v !== "nothing_yet");
check("§4b 🔴 page 2 KEEPS the filter", p2.length > 0 && p2Stray.length === 0,
  p2.length === 0 ? "page 2 empty" : `stray on page 2: ${[...new Set(p2Stray)].join(",")}`);
const pagerHref = await page.locator('a[href*="page="]').first().getAttribute("href").catch(() => null);
check("§4c the pager's own links carry ?kyc=", !pagerHref || pagerHref.includes("kyc="), String(pagerHref));

/* ── §5 · the KPI band does not move under a filter ──────────────────────── */
await page.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
const kpiBefore = await page.$$eval("[class*='kpi'], [data-kpi]", (els) => els.map((e) => e.textContent.trim()));
await page.goto(`${BASE}/admin/players?kyc=with_us`, { waitUntil: "networkidle" });
const kpiAfter = await page.$$eval("[class*='kpi'], [data-kpi]", (els) => els.map((e) => e.textContent.trim()));
check("§5 the headline tiles are population-wide and do not move under a filter",
  JSON.stringify(kpiBefore) === JSON.stringify(kpiAfter));

/* ── §6 · a junk token must not silently empty the roster ────────────────── */
const junk = await readView("kyc=not_a_real_stage");
check("§6 an unrecognised ?kyc= falls back to everything, never to zero rows",
  junk.ids.length === all.ids.length, `${junk.ids.length} vs ${all.ids.length}`);

/* ── §7 · the control is inside the form — Search must not wipe the filter ─ */
await page.goto(`${BASE}/admin/players?kyc=with_us`, { waitUntil: "networkidle" });
await page.locator('button[type="submit"]').first().click();
await page.waitForLoadState("networkidle");
check("§7 🔴 pressing Search preserves the KYC filter", page.url().includes("kyc=with_us"), page.url());

/* ── §8 · SUPPORT sees the column too (the gate ruling, driven) ──────────── */
const ctx2 = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
const sup = await ctx2.newPage();
await login(sup, "local:SUPPORT");
await sup.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
const supHeaders = await sup.$$eval("table.admin-tbl thead th", (els) => els.map((e) => e.textContent.trim())).catch(() => []);
check("§8 the SUPPORT desk — whose domain owns this page — sees the KYC column",
  supHeaders.includes("KYC"), supHeaders.join(" | "));

/* ── §9 · narrow width must not overflow the body ────────────────────────── */
await page.setViewportSize({ width: 390, height: 900 });
await page.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("§9 no horizontal body overflow at 390px", overflow <= 1, `${overflow}px`);

/* ── screenshots ─────────────────────────────────────────────────────────── */
await page.setViewportSize({ width: 1600, height: 1000 });
await page.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
await page.screenshot({ path: "kyc-roster-1600.png", fullPage: false });
await page.goto(`${BASE}/admin/players?kyc=uploaded`, { waitUntil: "networkidle" });
await page.screenshot({ path: "kyc-roster-uploaded.png", fullPage: false });
await page.setViewportSize({ width: 390, height: 900 });
await page.goto(`${BASE}/admin/players`, { waitUntil: "networkidle" });
await page.screenshot({ path: "kyc-roster-390.png", fullPage: false });
console.log("\n    screenshots: kyc-roster-1600.png · kyc-roster-uploaded.png · kyc-roster-390.png");

await browser.close();

console.log(`\n${pass} passed, ${fails.length} failed\n`);
for (const f of fails) console.log(`  · ${f}`);
// ⛔ Zero assertions is a FAILURE, not a pass — a driver that silently stopped
// asserting would otherwise exit 0 and read as verification.
if (pass === 0) { console.error("!! ZERO assertions ran."); process.exit(3); }
process.exit(fails.length > 0 ? 1 : 0);
