/**
 * LEG A · BULK AI GENERATION ACROSS EVERY CATEGORY, ON PRODUCTION.
 *
 *   SHOT_DIR=./shots/RUN BATCH=14 node scripts/live-bulk-generate.mjs
 *
 * Ali: *"we need tests on real-life markets … generation and resolution and playing them …
 * in bulk, not only 1 of each category."* This is the generation half.
 *
 * ⚠️ IT SPENDS REAL ANTHROPIC CREDIT — roughly $0.20 per poll at the rates the console
 * reports ($70.82 over 537 generations). BATCH is capped here at 25, which is also the
 * form's own maximum. Budget for this session: $5.
 *
 * Driven as the TRADING officer — the narrowest identity that holds `trading`, which is
 * what "generate" is. ⛔ NOT as ADMIN: an owner bypass would prove nothing about whether a
 * real operator can do this (E-40 was found exactly this way).
 *
 * The batch runs "two-tier across sports, macro, weather, crypto, culture, tech, other:
 * brainstorm → free filter → enrich keepers", so one run covers every category rather than
 * seven single-category runs — which is the difference between bulk and a specimen.
 */
import { BASE, SHOT, browser, login, bodyText, shot, clickByName } from "./live/harness.mjs";

const BATCH = Math.min(Number(process.env.BATCH ?? 14), 25);
const { b, ctx } = await browser();
const page = await ctx.newPage();

const before = {};
try {
  console.log(`\nLEG A · bulk generation · batch=${BATCH} · ${BASE}\n`);
  await login(page, "trading");
  await page.goto(`${BASE}/admin/ai-polls`, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => /ai poll generation/i.test(document.body.innerText), null, { timeout: 45_000 });
  await page.waitForTimeout(1500);

  // Baseline the counters BEFORE, so the run is measured as a DELTA rather than by
  // "did a number I hoped for appear" — which cannot see a number that should not be there.
  const t0 = await bodyText(page);
  before.total = (t0.match(/(\d+)\s+polls/) ?? [])[1];
  before.spend = (t0.match(/total spend \$([\d.]+)/) ?? [])[1];
  before.pending = (t0.match(/pending review\s+(\d+)/) ?? [])[1];
  console.log(`  before: ${before.total} polls · $${before.spend} spent · ${before.pending} pending review`);
  await shot(page, "bulkA-1-before");

  // The batch count field, then the batch button. Ask for controls by what they ARE.
  const count = page.getByLabel(/batch count/i).first();
  if (await count.count()) {
    await count.fill(String(BATCH));
  } else {
    // Fall back to the numeric input nearest the batch control rather than guessing an id.
    await page.locator('input[type="number"]').last().fill(String(BATCH));
  }
  await shot(page, "bulkA-2-armed");

  await clickByName(page, /generate batch/i);
  console.log(`  batch of ${BATCH} started — this takes minutes, not seconds`);

  // ⚠️ WAIT FOR A POSITIVE SIGNAL. `networkidle` never fires here (open event stream), and
  // the counters stream in. Poll the TOTAL until it stops moving for two consecutive reads.
  let stable = 0, last = before.total;
  for (let i = 0; i < 60 && stable < 3; i++) {
    await page.waitForTimeout(10_000);
    await page.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
    await page.waitForFunction(() => /ai poll generation/i.test(document.body.innerText), null, { timeout: 45_000 }).catch(() => {});
    const t = await bodyText(page);
    const now = (t.match(/(\d+)\s+polls/) ?? [])[1];
    const generating = (t.match(/generating\s+(\d+)/) ?? [])[1] ?? "?";
    if (now === last) stable++; else { stable = 0; last = now; }
    console.log(`    ${(i + 1) * 10}s · polls=${now} · generating=${generating}`);
  }

  const t1 = await bodyText(page);
  const after = {
    total: (t1.match(/(\d+)\s+polls/) ?? [])[1],
    spend: (t1.match(/total spend \$([\d.]+)/) ?? [])[1],
    pending: (t1.match(/pending review\s+(\d+)/) ?? [])[1],
  };
  await shot(page, "bulkA-3-after");

  console.log(`\n  after:  ${after.total} polls · $${after.spend} spent · ${after.pending} pending review`);
  console.log(`  DELTA:  +${Number(after.total) - Number(before.total)} polls · ` +
              `+$${(Number(after.spend) - Number(before.spend)).toFixed(2)} · ` +
              `+${Number(after.pending) - Number(before.pending)} approvable`);
  console.log(`\n  ⛔ The console is not the proof — pair it against AIPoll rows in the DB.`);
} catch (e) {
  console.log(`FAILED — ${e.message}`);
  await shot(page, "bulkA-FAILED");
  process.exitCode = 1;
} finally {
  await b.close();
}
console.log(`shots in ${SHOT}`);
