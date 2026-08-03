/**
 * OPS — VOID the backlog of Up & Down rounds that can never resolve, refunding every
 * stake in full.
 *
 *   railway run npx tsx scripts/ops-updown-void-stuck-rounds.mts --actor "<name>" --reason "<why>"
 *   railway run npx tsx scripts/ops-updown-void-stuck-rounds.mts --actor "<name>" --reason "<why>" --apply
 *
 * Dry run is the DEFAULT. Nothing moves without `--apply`.
 *
 * ── WHY THIS EXISTS (2026-07-30) ─────────────────────────────────────────────
 * Production accumulated 1,398 rounds that had opened and could never reach a verdict:
 * both configured source pages render their price in a client-side widget that web search
 * cannot read, and the retry ladder was never wired, so every observation sat PENDING at
 * one attempt. TZS 96,250 across 35 positions was stranded with no code path able to
 * return it.
 *
 * The retry sweep (`resolveOverdueRounds`) now fixes this going FORWARD. But letting it
 * grind through the existing backlog would spend `maxObservationAttempts` AI calls on
 * every one of ~1,400 boundaries — thousands of paid calls that we already know will fail,
 * because the source is unreadable by this method. That is not diligence, it is waste.
 *
 * So the backlog is cleared deliberately, by a named officer, with a stated reason, and
 * with ZERO AI calls. Each round goes through `voidRoundByOperator` — the same service
 * function the admin console's Void button calls — so every one gets its own audit entry
 * and its void reason is recorded as "operator", not misattributed to the source.
 *
 * ⛔ SCOPE IS NARROW ON PURPOSE. Only rounds that
 *     · are UNSETTLED (their money has not moved), and
 *     · whose boundary passed more than `--older-than-minutes` ago (default 60), and
 *     · have NO CONFIRMED observation at that boundary
 *   are touched. A round whose boundary just passed, or one that has a real reading and
 *   could still settle correctly, is left entirely alone.
 */
import { listAssets, listChains } from "../src/lib/server/updown-config.ts";
import { roundStore, observationStore } from "../src/lib/server/updown-dal.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";
import { voidRoundByOperator } from "../src/lib/server/updown-service.ts";

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}
const APPLY = process.argv.includes("--apply");
const ACTOR = arg("actor");
const REASON = arg("reason");
const OLDER_THAN_MIN = Number(arg("older-than-minutes") ?? 60);
const LIMIT = Number(arg("limit") ?? 5000);

const url = process.env.DATABASE_URL ?? "";
if (!url) {
  console.error("✗ DATABASE_URL is not set. Run this through `railway run` so the target is explicit.");
  process.exit(1);
}
if (!ACTOR || !REASON) {
  console.error('✗ --actor "<name>" and --reason "<why>" are both required.');
  console.error("  Each round gets an audit entry naming who refunded it and why.");
  process.exit(1);
}
if (!Number.isFinite(OLDER_THAN_MIN) || OLDER_THAN_MIN < 0) {
  console.error("✗ --older-than-minutes must be a non-negative number.");
  process.exit(1);
}

console.log(`target: ${(() => { try { return new URL(url).host; } catch { return "unparseable"; } })()}`);
console.log(`actor:  ${ACTOR}`);
console.log(`reason: ${REASON}`);
console.log(`scope:  unsettled · boundary older than ${OLDER_THAN_MIN} min · NO confirmed reading · limit ${LIMIT}`);
console.log(`mode:   ${APPLY ? "APPLY — rounds will be VOIDED and stakes refunded" : "DRY RUN — nothing will move"}\n`);

const cutoffIso = new Date(Date.now() - OLDER_THAN_MIN * 60_000).toISOString();

const assets = await listAssets();
const assetById = new Map(assets.map((a) => [a.id, a]));
const chains = await listChains();
const chainById = new Map(chains.map((c) => [c.id, c]));

// Every unsettled round past the cutoff, oldest first.
const candidates = (await roundStore.overdueUnresolved({ beforeIso: cutoffIso, limit: LIMIT }))
  .filter((r) => !r.settledAt);

console.log(`unresolved rounds older than the cutoff: ${candidates.length}\n`);
if (candidates.length === 0) {
  console.log("Nothing to do.");
  process.exit(0);
}

type Target = {
  id: string; label: string; staked: number; players: number; boundaryAt: string;
};

// ── Batched lookups, not one query per round ────────────────────────────────
// The first version did `observationStore.find` + `marketStore.get` per round: ~2,800
// round-trips over the public proxy, which simply timed out. Both sets are small enough
// to fetch whole — one query per asset for the readings, one for every UPDOWN market.
const confirmedBoundaries = new Set<string>();
for (const a of assets) {
  for (const o of await observationStore.list({ assetId: a.id, state: "CONFIRMED" })) {
    if (o.price != null) confirmedBoundaries.add(`${a.id}|${o.boundaryAt}`);
  }
}
const marketById = new Map(
  (await marketStore.listBoard({ productLine: "UPDOWN" })).map((m) => [m.id, m]),
);
console.log(`confirmed readings: ${confirmedBoundaries.size} · UPDOWN markets loaded: ${marketById.size}\n`);

const targets: Target[] = [];
let skippedHasReading = 0;
let skippedNoChain = 0;

for (const r of candidates) {
  const chain = chainById.get(r.chainId);
  const asset = chain ? assetById.get(chain.assetId) : undefined;
  if (!chain || !asset) { skippedNoChain++; continue; }

  // ⛔ The guard that keeps this narrow: if the boundary HAS a confirmed reading, the
  // round can settle correctly and must not be voided by hand.
  if (confirmedBoundaries.has(`${asset.id}|${r.boundaryAt}`)) { skippedHasReading++; continue; }

  const m = marketById.get(r.marketId);
  targets.push({
    id: r.id,
    label: `${asset.key} ${chain.durationMinutes}m #${r.roundNumber}`,
    staked: m ? Number(m.yesPool ?? 0) + Number(m.noPool ?? 0) : 0,
    players: m ? Number(m.predictorCount ?? 0) : 0,
    boundaryAt: r.boundaryAt,
  });
}

const withMoney = targets.filter((t) => t.staked > 0);
const totalStaked = targets.reduce((s, t) => s + t.staked, 0);
const totalPlayers = targets.reduce((s, t) => s + t.players, 0);

const line = "─".repeat(72);
console.log(line);
console.log(`  to VOID              ${String(targets.length).padStart(6)}`);
console.log(`    · holding money    ${String(withMoney.length).padStart(6)}`);
console.log(`  TZS to REFUND        ${totalStaked.toLocaleString().padStart(6)}`);
console.log(`  positions refunded   ${String(totalPlayers).padStart(6)}`);
console.log(`  skipped: has a confirmed reading (can still settle)  ${skippedHasReading}`);
console.log(`  skipped: chain/asset missing                          ${skippedNoChain}`);
console.log(line);

// The rounds that actually carry money are the ones an operator must see individually.
if (withMoney.length > 0) {
  console.log("\nRounds holding real money — these are the refunds:");
  for (const t of withMoney) {
    console.log(`    · ${t.label.padEnd(22)} TZS ${t.staked.toLocaleString().padStart(9)}  ${t.players} position(s)  boundary ${t.boundaryAt}`);
  }
}

if (!APPLY) {
  console.log("\nDRY RUN — nothing moved. Re-run with --apply to void these and refund every stake in full.");
  process.exit(0);
}

console.log("\nvoiding…");
let voided = 0, failed = 0, refunded = 0;
for (const t of targets) {
  const r = await voidRoundByOperator(t.id, ACTOR, REASON);
  if (r.ok) {
    voided++;
    refunded += t.staked;
    if (t.staked > 0) console.log(`  ✓ ${t.label} — refunded TZS ${t.staked.toLocaleString()} to ${t.players} position(s)`);
  } else {
    failed++;
    console.log(`  ✗ ${t.label} — ${r.error}`);
  }
  // Progress on a long run, without a line per round.
  if (voided % 200 === 0 && voided > 0) console.log(`    … ${voided}/${targets.length}`);
}

// ⛔ E-66 · FLUSH THE AUDIT QUEUE BEFORE THIS PROCESS ENDS — AND THIS IS THE SCRIPT THAT
// MATTERS MOST, because the loop above REFUNDS REAL MONEY.
//
// The money-path services audit FIRE-AND-FORGET: `audit()` chains its write onto a serialised
// global queue (the HMAC chain must be written in prevHash order) and nobody awaits it. A
// long-lived web process always drains that queue; a script does not. Measured on production:
// `ops-stop-updown-chains.mts` stopped FOUR chains and exactly ONE `updown.chain.stopped` row
// reached the database. The state changes were all correct — three of their audit entries
// simply never existed, and they cannot be added afterwards, because an `AuditLog` row is
// HMAC-linked and forging one is forbidden here.
//
// ⚠️ A refund whose audit entry never lands is precisely the record a regulator asks for.
const { auditFlush } = await import("../src/lib/server/audit.ts");
await auditFlush();

console.log(`\n${line}`);
console.log(`  voided ${voided} · failed ${failed} · TZS ${refunded.toLocaleString()} refunded in full`);
console.log(line);
console.log("Re-run `npx tsx scripts/audit-updown-source-drift.mts` to confirm the backlog is clear.");
