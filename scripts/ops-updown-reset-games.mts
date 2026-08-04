/**
 * OPS — CLEAR EVERY UP & DOWN GAME so operators start from a clean board.
 *
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-reset-games.mts --actor "<name>" --reason "<why>"
 *   railway run -s 50pick -- npx tsx scripts/ops-updown-reset-games.mts --actor "<name>" --reason "<why>" --apply
 *
 * Dry run is the DEFAULT. Nothing is deleted without `--apply`.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * Ali, 2026-08-04: the operator guide is being rewritten, and the admins are to learn the game
 * by creating real chains from that guide rather than inheriting 2,515 rounds of a configuration
 * that no longer exists. The history on the board was produced by the QUOTE reader at a 1-tick
 * band; reading it now teaches the wrong thing — a 100%-void SOL chain looks like a broken
 * product rather than a retired setting.
 *
 * ⛔ THERE IS NO DELETE IN THE CONSOLE (E-59), which is why this is a script. It is deliberately
 * NOT a new admin button: a one-click "delete every round" on a money surface is a worse hazard
 * than the missing feature.
 *
 * ── THE MONEY RULE, AND IT IS THE WHOLE POINT ────────────────────────────────
 * ⛔ MONEY IS NEVER DELETED. A stake sitting in an unresolved round is a LIABILITY, not a row.
 * Deleting a round that still holds one destroys the player's claim silently and leaves the
 * wallet short — the position would cascade away with the market and nobody would ever know.
 *
 * So this script REFUSES outright if any round is unresolved or any position is still OPEN, and
 * names them. Settling or voiding them first is the operator's job, through the normal paths that
 * write ledger entries and notify the player. There is no `--force`.
 *
 * ⚠️ Assets are NOT touched. They carry the measured band per instrument (gold's 40 ticks came
 * off production data) and the operator's approved source host. Clearing them would throw away
 * the one part of this configuration that is right.
 */
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!process.env.DATABASE_URL) {
  console.error("✗ no DATABASE_URL — run under `railway run --service 50pick --`");
  process.exit(2);
}

const { prisma } = await import("../src/lib/server/prisma.ts");
const { audit, auditFlush } = await import("../src/lib/server/audit.ts");

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1]!.startsWith("--") ? process.argv[i + 1]! : null;
}
const APPLY = process.argv.includes("--apply");
const ACTOR = arg("actor");
const REASON = arg("reason");

if (!ACTOR || !REASON) {
  console.error('✗ --actor "<name>" and --reason "<why>" are both required.');
  console.error("  This destroys the trading history of a real money product; the audit must name who and why.");
  process.exit(1);
}

const db = prisma();
// ⛔ PROVE THE CONNECTION BEFORE READING ANYTHING. `railway run` injects the internal host, the
// DAL swallows the failure, and an unreachable database then reads as "nothing to delete" — a
// script that reports success having done nothing is the worst outcome available here.
if (!db) { console.error("✗ no prisma client"); process.exit(2); }
const totalRounds = await db.upDownRound.count().catch((e: Error) => e);
if (totalRounds instanceof Error) {
  console.error(`\n✗ CANNOT REACH THE DATABASE — refusing to act.\n  ${totalRounds.message.split("\n")[0]}`);
  process.exit(2);
}

console.log(`✓ database reachable — ${totalRounds} round(s) present.`);
console.log(`actor:  ${ACTOR}`);
console.log(`reason: ${REASON}`);
console.log(`mode:   ${APPLY ? "APPLY — rows will be DELETED" : "DRY RUN — nothing will be deleted"}\n`);

// ── 1 · THE MONEY INTERLOCK ─────────────────────────────────────────────────
const unresolved = await db.upDownRound.findMany({
  where: { outcome: null },
  select: { id: true, closesAt: true, chain: { select: { durationMinutes: true, asset: { select: { key: true } } } } },
});
const openPositions = await db.position.findMany({
  where: { status: "OPEN", market: { upDownRound: { isNot: null } } },
  select: {
    id: true, stake: true, side: true,
    user: { select: { displayName: true } },
    market: { select: { id: true } },
  },
});

if (unresolved.length > 0 || openPositions.length > 0) {
  console.error("🔴 REFUSING — there is live money or an undecided round on this board.\n");
  for (const r of unresolved) {
    console.error(`  unresolved round  ${r.id}  ${r.chain.asset.key} ${r.chain.durationMinutes}m  closes ${r.closesAt.toISOString()}`);
  }
  for (const p of openPositions) {
    console.error(`  OPEN position     ${p.id}  ${p.user.displayName}  ${p.side}  TZS ${p.stake}`);
  }
  console.error("\n⛔ Settle or void these through the normal paths first — they write ledger entries and");
  console.error("   tell the player. Deleting them here would destroy a claim silently and leave the");
  console.error("   wallet short. There is no --force, deliberately.");
  process.exit(1);
}
console.log("✓ money interlock clear — every round is resolved and no position is OPEN.\n");

// ── 2 · WHAT WILL GO ────────────────────────────────────────────────────────
const chains = await db.upDownChain.findMany({
  select: {
    id: true, durationMinutes: true, state: true,
    asset: { select: { key: true } },
    _count: { select: { rounds: true } },
  },
  orderBy: [{ asset: { key: "asc" } }, { durationMinutes: "asc" }],
});
const observations = await db.upDownObservation.count();
const marketIds = (await db.upDownRound.findMany({ select: { marketId: true } }))
  .map((r) => r.marketId).filter((x): x is string => !!x);

for (const c of chains) {
  console.log(`  →  chain ${c.asset.key.padEnd(7)} ${String(c.durationMinutes).padStart(2)}m  ${c.state.padEnd(8)} ${c._count.rounds} round(s)`);
}
console.log(`\n  →  ${chains.length} chain(s) · ${totalRounds} round(s) · ${marketIds.length} market(s) · ${observations} observation(s)`);
console.log(`  ·  ${await db.upDownAsset.count()} asset(s) KEPT — they carry the measured band and the approved source host`);

if (!APPLY) {
  console.log("\nDRY RUN — re-run with --apply to delete it.");
  process.exit(0);
}

// ── 3 · DELETE, PARENTS LAST ────────────────────────────────────────────────
// ⚠️ Explicit order rather than trusting a cascade. `UpDownRound.marketId` points AT the market,
// so deleting the market first would orphan or fail depending on the FK direction — and a
// cascade's reach is exactly the thing you do not want to discover on production.
const delRounds = await db.upDownRound.deleteMany({});
console.log(`  ✓ ${delRounds.count} round(s) deleted`);
const delMarkets = marketIds.length
  ? await db.predictionMarket.deleteMany({ where: { id: { in: marketIds } } })
  : { count: 0 };
console.log(`  ✓ ${delMarkets.count} market(s) deleted (their positions cascade — all settled)`);
const delChains = await db.upDownChain.deleteMany({});
console.log(`  ✓ ${delChains.count} chain(s) deleted`);
// ⛔ Observations are the write-once price ledger. They are keyed by (assetId, boundaryAt) and
// carry no money, but a stale one would be REUSED by a future round on the same boundary — which
// is how a brand-new chain could settle against a price read under the old reader.
const delObs = await db.upDownObservation.deleteMany({});
console.log(`  ✓ ${delObs.count} observation(s) deleted — no future round can reuse an old reader's price`);

// 🔴 `category` IS REQUIRED AND WAS MISSING ON THE FIRST RUN. The deletion landed and the audit
// row did not — a destructive production action with no trail — and the script still printed ✅,
// because it verified the DELETION and never the audit. Two defects, one line apart: the missing
// argument, and a success message that did not cover everything it claimed.
const auditOk = await audit({
  actorType: "ADMIN", actorId: ACTOR, action: "updown.games.reset",
  category: "ADMIN",
  targetType: "UpDownChain", targetId: "ALL",
  metadata: {
    reason: REASON,
    rounds: delRounds.count, markets: delMarkets.count,
    chains: delChains.count, observations: delObs.count,
  },
});

// ⛔ E-66 · flush the fire-and-forget HMAC audit queue BEFORE reading anything back, or the
// deletion lands and its audit row does not — and an AuditLog row cannot be written after the
// fact without breaking the hash chain.
await auditFlush();

// Read back rather than trust the writes. ⛔ AND READ BACK THE AUDIT ROW TOO — the first run
// proved that a script can verify its effect perfectly while the record of who caused it never
// existed. "Did it happen" and "can we say who did it" are two questions.
const left = {
  chains: await db.upDownChain.count(),
  rounds: await db.upDownRound.count(),
  obs: await db.upDownObservation.count(),
  assets: await db.upDownAsset.count(),
};
const trail = await db.auditLog.count({ where: { action: "updown.games.reset" } });
console.log(`\nafter: ${left.chains} chain(s) · ${left.rounds} round(s) · ${left.obs} observation(s) · ${left.assets} asset(s)`);
console.log(`audit: ${trail} \`updown.games.reset\` row(s) on record${auditOk === false ? "  ⚠️ the write reported failure" : ""}`);
const clean = left.chains === 0 && left.rounds === 0 && left.obs === 0;
const recorded = trail > 0;
console.log(clean && recorded
  ? "✅ the board is clear AND the reset is on the audit record. An operator now creates the first chain from the guide."
  : !clean
    ? "🔴 SOMETHING SURVIVED — do not hand this to an operator until it is explained."
    : "🔴 THE BOARD IS CLEAR BUT NOTHING RECORDS WHO CLEARED IT — fix the audit call before doing this again.");
process.exit(clean && recorded ? 0 : 1);
