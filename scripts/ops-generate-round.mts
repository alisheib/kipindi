/**
 * Generate ONE Up & Down round on a chain — the same service call the admin button makes.
 *
 *   railway run --service 50pick -- npx tsx scripts/ops-generate-round.mts            # list chains
 *   railway run --service 50pick -- npx tsx scripts/ops-generate-round.mts <chainId>  # generate
 *
 * E-67. Ali stopped automatic emission, so a round now exists only because someone asked for
 * one. `/admin/updown` → **Generate round** is the way an operator does it; this is the same
 * `generateRoundNow()` behind it, for ops use and for proving the path on production without a
 * browser session.
 *
 * ⛔ IT CREATES A REAL ROUND that real players can stake on. There is no dry run for the write
 * itself — running it with a chain id IS the action. With no argument it only lists.
 *
 * ⚠️ `auditFlush()` before exit — E-66. `generateRoundNow` audits fire-and-forget onto a
 * serialised HMAC queue, and `process.exit()` kills it mid-drain: four chain stops once produced
 * exactly one audit row. Any ops script that calls a money-path service must flush.
 */
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!process.env.DATABASE_URL) {
  console.error("no DATABASE_URL — run under `railway run --service 50pick --`");
  process.exit(2);
}

const { listChains, getAsset } = await import("../src/lib/server/updown-config.ts");
const { generateRoundNow } = await import("../src/lib/server/updown-service.ts");
const { roundStore } = await import("../src/lib/server/updown-dal.ts");
const { auditFlush } = await import("../src/lib/server/audit.ts");

const chainId = process.argv[2];
const OFFICER = process.env.OPS_OFFICER_ID ?? "usr_ops_generate_round";

if (!chainId) {
  console.log("\nchains:\n");
  for (const c of await listChains()) {
    const a = await getAsset(c.assetId);
    const latest = await roundStore.latestForChain(c.id);
    const live = latest && !latest.resolvedAt ? `  ← round LIVE until ${latest.closesAt}` : "";
    console.log(`  ${c.id}  ${(a?.key ?? "?").padEnd(6)} ${String(c.durationMinutes).padStart(3)}m  ${c.state}${live}`);
  }
  console.log("\npass a chain id to generate one round on it\n");
  process.exit(0);
}

const r = await generateRoundNow(chainId, OFFICER);
await auditFlush();

if (!r.ok) {
  console.log(`\n⛔ REFUSED — no round created\n\n  ${r.error}\n`);
  process.exit(1);
}
console.log(`\n✓ round ${r.data.id}`);
console.log(`  opens  ${r.data.opensAt}   closes ${r.data.closesAt}`);
console.log(`  open   ${r.data.openPrice}`);
console.log(`  up ≥   ${r.data.upTarget}     down ≤ ${r.data.downTarget}   (${r.data.marginBps} bps)\n`);
process.exit(0);
