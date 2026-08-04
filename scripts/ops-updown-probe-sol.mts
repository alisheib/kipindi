/**
 * OPS — CAN SOL SETTLE UNDER THE DATED-BAR READER? Measure it; do not repeat history.
 *
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-probe-sol.mts
 *
 * ── WHY ──────────────────────────────────────────────────────────────────────
 * SOL carried the worst record on the platform: **290 rounds resolved, 0 ever paid a winner,
 * 290 `source-failed`**. That number is quoted everywhere, including the new operator guide — but
 * it was measured entirely under the **QUOTE** reader, which asks *"what is the price now"* and
 * refuses a reading older than `maxStalenessSeconds` (90s). If SOL's quote timestamp simply lagged
 * more than 90 seconds, every single reading was refused as stale and the outcome would look
 * exactly like this, while the instrument itself was fine.
 *
 * ⛔ A DATED BAR IS A DIFFERENT QUESTION. It does not ask how fresh a price is; it asks whether the
 * bar labelled T exists. So the old figure predicts nothing about today, and repeating it as a
 * reason is the same mistake as trusting a code default for a live setting.
 *
 * This probe answers the three questions that actually decide it, against the LIVE plan and key:
 *   1 · does `/time_series` carry SOL/USD at 1-minute resolution at all?
 *   2 · how many seconds after a minute ends does its bar appear?  (BTC ~10s; SOL measured ~60s)
 *   3 · would `barPublicationGraceSeconds` (120s) cover that, and does the round's own boundary
 *        read succeed within the retry ladder the money path uses?
 *
 * ⚠️ Compares against BTC in the same run, because "SOL is late" only means something relative to
 * an asset that is known to work.
 */
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");

const KEY = process.env.TWELVEDATA_API_KEY;
if (!KEY) { console.error("✗ no TWELVEDATA_API_KEY — run under `railway run --service 50pick --`"); process.exit(2); }

const MINUTE = 60_000;
const minuteFloor = (ms: number) => Math.floor(ms / MINUTE) * MINUTE;
const stamp = (ms: number) => new Date(ms).toISOString().slice(11, 19);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** One dated read: does the bar labelled `atMs` exist right now? Returns its open, or null. */
async function barAt(symbol: string, atMs: number): Promise<{ open: number } | null> {
  const from = new Date(atMs).toISOString().slice(0, 19).replace("T", " ");
  const to = new Date(atMs + 59_000).toISOString().slice(0, 19).replace("T", " ");
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(symbol)}`
    + `&interval=1min&timezone=UTC&start_date=${encodeURIComponent(from)}&end_date=${encodeURIComponent(to)}&apikey=${KEY}`;
  const r = await fetch(url).catch(() => null);
  if (!r) return null;
  const j: unknown = await r.json().catch(() => null);
  const vals = (j as { values?: Array<{ datetime: string; open: string }> })?.values;
  if (!Array.isArray(vals) || vals.length === 0) return null;
  const row = vals.find((v) => v.datetime.startsWith(from.slice(0, 16)));
  const open = row ? Number(row.open) : NaN;
  return Number.isFinite(open) ? { open } : null;
}

console.log("── 1 · does the plan carry these symbols at 1-minute resolution? ──");
const SYMBOLS = ["SOL/USD", "BTC/USD"];
for (const s of SYMBOLS) {
  const r = await fetch(`https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(s)}&interval=1min&outputsize=3&apikey=${KEY}`);
  const j: any = await r.json().catch(() => null);
  const n = Array.isArray(j?.values) ? j.values.length : 0;
  const err = j?.message ?? j?.code;
  console.log(`  ${n > 0 ? "✓" : "✗"} ${s.padEnd(8)} ${n} bar(s)${n > 0 ? `  newest ${j.values[0].datetime} open ${j.values[0].open}` : `  ${err ?? "no values"}`}`);
}

console.log("\n── 2 · how late is a bar? poll the PREVIOUS minute until it appears ──");
// ⭐ Poll the minute that has just ENDED, which is exactly the minute `generateRoundNow` reads.
const results: Record<string, number | null> = {};
{
  // Align to the next minute boundary so every symbol is measured from the same instant.
  const nextBoundary = minuteFloor(Date.now()) + MINUTE;
  const waitMs = nextBoundary - Date.now();
  console.log(`  aligning — waiting ${Math.round(waitMs / 1000)}s for the ${stamp(nextBoundary)} boundary`);
  await sleep(waitMs + 500);

  const target = minuteFloor(Date.now()) - MINUTE; // the minute that just completed
  console.log(`  target bar: ${stamp(target)} (completed at ${stamp(target + MINUTE)})\n`);
  for (const s of SYMBOLS) results[s] = null;

  for (let elapsed = 1; elapsed <= 150; elapsed += 10) {
    const pending = SYMBOLS.filter((s) => results[s] === null);
    if (pending.length === 0) break;
    for (const s of pending) {
      const bar = await barAt(s, target);
      if (bar) {
        results[s] = elapsed;
        console.log(`  ✓ ${s.padEnd(8)} appeared at +${String(elapsed).padStart(3)}s after the minute ended  open ${bar.open}`);
      }
    }
    if (SYMBOLS.filter((s) => results[s] === null).length === 0) break;
    await sleep(10_000);
  }
  for (const s of SYMBOLS) if (results[s] === null) console.log(`  ✗ ${s.padEnd(8)} STILL ABSENT after 150s`);
}

console.log("\n── 3 · the verdict against the live money path ──");
const GRACE = 120;   // barPublicationGraceSeconds, live value
const LADDER = [15, 45, 120];
console.log(`  barPublicationGraceSeconds = ${GRACE}s · retry ladder ${JSON.stringify(LADDER)} · abandon 390s`);
for (const s of SYMBOLS) {
  const t = results[s];
  if (t === null) { console.log(`  🔴 ${s.padEnd(8)} no bar within 150s — NOT settleable`); continue; }
  const coveredByGrace = t <= GRACE;
  const attemptThatWins = LADDER.findIndex((d) => d >= t);
  console.log(`  ${coveredByGrace ? "✅" : "⚠️"} ${s.padEnd(8)} +${t}s`
    + `  ${coveredByGrace ? "inside the grace — costs NO attempt" : "OUTSIDE the grace — burns attempts"}`
    + (attemptThatWins >= 0 ? `, and retry #${attemptThatWins + 1} (${LADDER[attemptThatWins]}s) already covers it` : ""));
}
console.log("\n⛔ This measures the FEED only. It does not prove a round pays — that needs real money on");
console.log("   a real round, which is the remaining step before SOL goes to players.");
