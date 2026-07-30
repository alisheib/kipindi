/**
 * OPS — PAUSE every running Up & Down chain. Containment, not configuration.
 *
 *   railway run npx tsx scripts/ops-updown-pause-chains.mts --actor "<name>" --reason "<why>"
 *   railway run npx tsx scripts/ops-updown-pause-chains.mts --actor "<name>" --reason "<why>" --apply
 *
 * Dry run is the DEFAULT. Nothing is written without `--apply`.
 *
 * ── WHY THIS EXISTS (2026-07-30) ─────────────────────────────────────────────
 * Production had 1,396 rounds opened and NOT ONE ever resolved: every observation sat
 * PENDING because the configured source pages render their price in a client-side
 * widget that web search cannot read. Meanwhile two chains kept firing, so the count of
 * unresolvable rounds — and the player money inside them — grew every 15 minutes.
 *
 * PAUSE is the first rung of the rollback ladder and the correct one here: it stops NEW
 * rounds while leaving in-flight rounds untouched, so they can still be resolved or
 * voided once the read path is fixed. STOP would be no safer and harder to resume from.
 *
 * ⚠️ A pause takes effect WITHOUT a redeploy: `advanceChain` re-reads the chain's state
 * from the database on every fire and refuses unless it is RUNNING. An in-process timer
 * may still tick, but it can no longer open a round.
 *
 * Goes through `setChainState`, the same service function the admin console calls, so the
 * audit entry (`updown.chain.paused`) is written with a NAMED ACTOR exactly as if an
 * operator had clicked. `--actor` is required for that reason — a compliance trail with
 * "system" on a containment action tells nobody anything.
 */
import { listChains, listAssets, setChainState } from "../src/lib/server/updown-config.ts";
import { roundStore } from "../src/lib/server/updown-dal.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}
const APPLY = process.argv.includes("--apply");
const ACTOR = arg("actor");
const REASON = arg("reason");

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("✗ DATABASE_URL is not set. Run this through `railway run` so the target is explicit.");
  process.exit(1);
}
if (!ACTOR || !REASON) {
  console.error('✗ --actor "<name>" and --reason "<why>" are both required.');
  console.error("  This writes an audit entry on a containment action; it must name who and why.");
  process.exit(1);
}

// Host only — never print credentials.
console.log(`target: ${(() => { try { return new URL(url).host; } catch { return "unparseable"; } })()}`);
console.log(`actor:  ${ACTOR}`);
console.log(`reason: ${REASON}`);
console.log(`mode:   ${APPLY ? "APPLY — chains will be PAUSED" : "DRY RUN — nothing will be written"}\n`);

const assets = await listAssets();
const byId = new Map(assets.map((a) => [a.id, a]));
const chains = await listChains();
const running = chains.filter((c) => c.state === "RUNNING");

if (running.length === 0) {
  console.log("No RUNNING chains. Nothing to contain.");
  process.exit(0);
}

// Show what is riding on each chain before touching it — the number an operator needs
// is not "N chains" but "what is inside them".
console.log(`RUNNING chains: ${running.length}\n`);
for (const c of running) {
  const a = byId.get(c.assetId);
  const rounds = await roundStore.list({ chainId: c.id, limit: 500 });
  const unsettled = rounds.filter((r) => !r.settledAt);
  let staked = 0;
  let positions = 0;
  for (const r of unsettled) {
    const m = await marketStore.get(r.marketId);
    if (m) { staked += Number(m.yesPool ?? 0) + Number(m.noPool ?? 0); positions += Number(m.predictorCount ?? 0); }
  }
  console.log(`  ${a?.key ?? c.assetId} · ${c.durationMinutes}m`);
  console.log(`      source        ${a?.priceSourceUrl ?? "(asset missing)"}`);
  console.log(`      rounds        ${rounds.length} (${unsettled.length} unsettled)`);
  console.log(`      staked        TZS ${staked.toLocaleString()} across ${positions} position(s)`);
  console.log(`      next boundary ${c.nextBoundaryAt ?? "none"}`);
}

if (!APPLY) {
  console.log("\nDRY RUN — nothing written. Re-run with --apply to pause these chains.");
  console.log("In-flight rounds are NOT touched: they stay resolvable/voidable once the read path is fixed.");
  process.exit(0);
}

console.log("");
let paused = 0;
for (const c of running) {
  const a = byId.get(c.assetId);
  const r = await setChainState(c.id, "PAUSED", ACTOR);
  if (r.ok) {
    paused++;
    console.log(`  ✓ paused ${a?.key ?? c.assetId} ${c.durationMinutes}m`);
  } else {
    console.log(`  ✗ FAILED ${a?.key ?? c.assetId} ${c.durationMinutes}m — ${r.error}`);
  }
}

console.log(`\n${paused}/${running.length} chain(s) paused. No new rounds will open.`);
console.log("In-flight rounds are untouched and still resolvable or voidable.");
