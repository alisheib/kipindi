/**
 * OPS — raise the LIVE assets off the 1-tick configuration (E-73), and set gold's measured floor.
 *
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-set-asset-ticks.mts --actor "<name>" --reason "<why>"
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-set-asset-ticks.mts --actor "<name>" --reason "<why>" --apply
 *
 * Dry run is the DEFAULT. Nothing is written without `--apply`.
 *
 * ── WHY (E-73) ───────────────────────────────────────────────────────────────
 * `MIN_MOVE_TICKS_FLOOR = 2` gates every NEW asset save, but it cannot rewrite rows that already
 * exist — so all four ENABLED production assets still carry `minMoveTicks: 1`. At the tick-floor
 * margin that makes the winning band **0.01**, while `toFixed(2)` rounding error reaches **0.005
 * on each of the two prices** that decide the round. The band is therefore no larger than the
 * noise it is measured against, and a round can be decided by rounding rather than by the market.
 *
 * ⚠️ It works today only because BTC moves whole dollars in three minutes. That is luck, not a
 * design, and it is exactly the configuration the validator now refuses for anything new.
 *
 * ── THE VALUES, AND WHERE EACH COMES FROM ────────────────────────────────────
 *   BTC/USD  2 ticks ($0.02)   rounding dominates; the feed agrees with itself to the cent
 *   ETH/USD  2 ticks ($0.02)   same
 *   SOL/USD  2 ticks ($0.02)   same — but SOL should stay DISABLED for other reasons
 *   XAU/USD 40 ticks ($0.40)   its own feed disagrees with itself by up to $0.20 at a single
 *                              instant, and by $0.29-$0.87 across a bar seam. Measured, not chosen.
 *
 * ⛔ WHY A SCRIPT AND NOT A CLICK — already on the record, do not re-file it. `updateAsset`
 * demands `accounting` while `/admin/updown`'s VIEW gate is `trading`, so FINANCE cannot open the
 * page and TRADING sees the control locked: `control-gates.ts` states these five controls are
 * "Owner-only in practice", and §6m holds it as Ali's decision.
 *
 * Goes through `updateAsset`, the same service the console calls, so the audit entry is written
 * with a NAMED ACTOR. ⚠️ `updateAsset` REFUSES while any round on the asset is unresolved — a
 * round settles against what it captured at open — and that refusal is shown verbatim.
 */
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!process.env.DATABASE_URL) {
  console.error("✗ no DATABASE_URL — run under `railway run --service 50pick --`");
  process.exit(2);
}

const { listAssets, updateAsset, MIN_MOVE_TICKS_FLOOR } = await import("../src/lib/server/updown-config.ts");
const { findSymbol } = await import("../src/lib/server/updown-symbols.ts");
const { prisma } = await import("../src/lib/server/prisma.ts");

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1]!.startsWith("--") ? process.argv[i + 1]! : null;
}
const APPLY = process.argv.includes("--apply");
const ACTOR = arg("actor");
const REASON = arg("reason");

if (!ACTOR || !REASON) {
  console.error('✗ --actor "<name>" and --reason "<why>" are both required.');
  console.error("  This changes what counts as a WIN; the audit trail must name who and why.");
  process.exit(1);
}

// ⛔ PROVE THE DATABASE IS REACHABLE FIRST. `railway run` injects the internal host and the DAL
// swallows the failure, so an unreachable database reads as "no assets" — and this script would
// then cheerfully report nothing to do.
{
  const c = prisma();
  const n = c ? await c.upDownAsset.count().catch((e: Error) => e) : null;
  if (!c || n instanceof Error) {
    console.error(`\n✗ CANNOT REACH THE DATABASE — refusing to act.`);
    console.error(`  ${n instanceof Error ? n.message.split("\n")[0] : "no prisma client"}`);
    process.exit(2);
  }
  console.log(`✓ database reachable — ${n} asset row(s) present.\n`);
}

console.log(`actor:  ${ACTOR}`);
console.log(`reason: ${REASON}`);
console.log(`mode:   ${APPLY ? "APPLY — production asset rows change" : "DRY RUN — nothing will be written"}\n`);

const assets = await listAssets();
let changed = 0, refused = 0, skipped = 0;

for (const a of assets) {
  // The catalogue is the authority on what an asset's band SHOULD be — it carries the measured
  // values. Falling back to the hard floor keeps an uncatalogued legacy row from staying at 1.
  const want = findSymbol(a.symbol)?.minMoveTicks ?? MIN_MOVE_TICKS_FLOOR;
  if (a.minMoveTicks >= want) {
    console.log(`  ·  ${a.key.padEnd(7)} ${a.symbol.padEnd(9)} already ${a.minMoveTicks} tick(s) — leaving it`);
    skipped++;
    continue;
  }
  const band = (want * Math.pow(10, -a.decimals)).toFixed(a.decimals);
  console.log(`  →  ${a.key.padEnd(7)} ${a.symbol.padEnd(9)} ${a.minMoveTicks} → ${want} tick(s)  (band ${band})`);

  // ⛔ REPAIR THE SCHEME IN THE SAME CALL, OR THE ROW CANNOT BE SAVED AT ALL.
  //
  // 🔴 `SOL` and `XAU` were REFUSED by the first run of this script, and the reason was not the
  // ticks: their stored `priceSourceUrl` is **`http://`** — E-51's residue. `validateAsset`
  // rightly refuses to save a row that would put a provider API key on the wire in cleartext,
  // and it validates the WHOLE row, not the changed field. So the two assets that most needed
  // fixing were the two that could not be edited **at all** — including from the console.
  //
  // ⚠️ The request path was never exposed: `quoteAsset` upgrades the scheme at call time. The
  // defect was that the STORED row was never corrected, which turned a silent mitigation into
  // an edit lock. Upgrading here is the same transformation the request path already performs,
  // so it changes no behaviour — it only lets the row be written again.
  const patch: { minMoveTicks: number; priceSourceUrl?: string } = { minMoveTicks: want };
  if (a.priceSourceUrl.startsWith("http://")) {
    patch.priceSourceUrl = a.priceSourceUrl.replace(/^http:\/\//, "https://");
    console.log(`     ⚠️ also upgrading http:// → https:// (E-51 residue — this row is otherwise unsavable)`);
  }
  if (!APPLY) continue;

  const r = await updateAsset(a.id, patch, ACTOR);
  if (r.ok) {
    changed++;
    console.log(`     ✓ saved`);
  } else {
    refused++;
    // Verbatim — the service names the rounds and the money riding on them.
    console.log(`     ✗ REFUSED — ${r.error}`);
  }
}

if (!APPLY) {
  console.log("\nDRY RUN — re-run with --apply to write it.");
  process.exit(0);
}

// Read back rather than trust the writes.
const after = await listAssets();
const stillLow = after.filter((a) => a.minMoveTicks < (findSymbol(a.symbol)?.minMoveTicks ?? MIN_MOVE_TICKS_FLOOR));
console.log(`\n${changed} changed · ${refused} refused · ${skipped} already correct`);
console.log(stillLow.length === 0
  ? "✅ every asset now carries at least its measured floor — no round can be decided by rounding."
  : `🔴 still below their floor: ${stillLow.map((a) => `${a.key}=${a.minMoveTicks}`).join(", ")}`);

// ⛔ E-66 · flush the fire-and-forget HMAC audit queue before the process exits, or the state
// changes land and their audit rows do not — and an AuditLog row cannot be written afterwards.
const { auditFlush } = await import("../src/lib/server/audit.ts");
await auditFlush();
process.exit(stillLow.length === 0 ? 0 : 1);
