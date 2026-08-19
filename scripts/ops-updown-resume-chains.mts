/**
 * RESUME a stopped Up & Down chain — through the real service call, never SQL.
 *
 *   npx tsx scripts/ops-updown-resume-chains.mts --stopped-with-boundary --actor "<name>" --reason "<why>"
 *   npx tsx scripts/ops-updown-resume-chains.mts --chains udc_a,udc_b   --actor "<name>" --reason "<why>" --apply
 *
 * Dry run is the DEFAULT. Nothing is written without `--apply`.
 *
 * ── WHY THIS EXISTS (2026-08-19) ─────────────────────────────────────────────
 * ⛔ THE ROLLBACK LADDER HAD NO BOTTOM RUNG. This repo ships `ops-updown-pause-chains.mts`
 * and `ops-stop-updown-chains.mts` and nothing that starts a chain again, so the only way
 * back was the admin console. `FAILURE-INVENTORY.md` §7.4 records the cost: after the E-167
 * outage two chains were **stopped by hand to silence a failing loop**, and BTC/USD 3m then
 * sat STOPPED for **35 hours** and ETH/USD 3m for **3.9 days** — players had no 3-minute game
 * on either asset — while §7.4's own closing line says *"stop->start was therefore always a
 * complete manual remedy, which nothing said out loud."* Nothing said it out loud because
 * nothing could say it: there was no instrument. This is that instrument.
 *
 * ⛔ IT GOES THROUGH `setChainState`, THE SAME CALL THE CONSOLE'S START BUTTON MAKES, for the
 * reason the stop script gives: a raw UPDATE would skip the refusals, skip the audit row, and
 * leave the scheduler's view and the database disagreeing.
 *
 * ⭐ AND STARTING IS THE DANGEROUS DIRECTION, WHICH IS WHY THE DRY RUN PRE-FLIGHTS THE
 * REFUSALS. `setChainState` refuses a start on three conditions (`updown-config.ts:1117-1128`)
 * — asset missing, asset disabled, price source no longer trusted — and it returns those as a
 * `{ ok: false }` the caller must read. A resume script that ignored them would report success
 * having changed nothing. The dry run evaluates all three BEFORE you type `--apply`, so the
 * refusal is visible while it is still cheap.
 *
 * ✅ RESUMING CANNOT RE-BRICK A CHAIN, and that is checked in code rather than assumed:
 * `setChainState` re-anchors on start (`updown-config.ts:1131-1136`) — a fresh `gridAnchorAt`
 * from `cleanGridAnchor(Date.now())` and a `nextBoundaryAt` recomputed from now — so the stale
 * boundary that bricked these two chains is discarded by the act of starting them. ⚠️ This is
 * the whole reason a stopped chain is safe to resume and a chain with a hand-written schedule
 * is not: see `--stopped-with-boundary` below.
 *
 * ⚠️ `--stopped-with-boundary` TARGETS AN E-167 FINGERPRINT, NOT "everything stopped". A chain
 * that is not RUNNING yet still holds a `nextBoundaryAt` is anomalous, because both PAUSED and
 * STOPPED write `nextBoundaryAt = null` — so something wrote a schedule back onto a chain
 * nothing will fire (E-167: a manual Generate does not check `chain.state`). Those are the
 * chains that were stopped to stop them failing. ⛔ It deliberately does NOT match a cleanly
 * stopped chain with no boundary — BTC/USD 30m and 60m are stopped by operator decision and
 * resuming them would be a configuration change nobody asked for. Name those with `--chains`.
 */
// ⛔ REWRITE THE DB HOST BEFORE PRISMA IS EVER IMPORTED — and read the ops env first.
//
// Two callers, two shapes. Under `railway run` the injected `DATABASE_URL` names
// `postgres.railway.internal`, resolvable only inside Railway's network, so it is swapped for
// the public proxy exactly as `ops-stop-updown-chains.mts` and `scripts/live/q.cjs` do. Run
// from a laptop with no `railway run`, the connection string is read from
// `scripts/live/ops/.env` — the same gitignored file all 22 ops censuses read, so this
// instrument needs no more setup than the census that finds the problem.
//
// ⛔ Both must happen before the Prisma client is constructed, so every import below is
// DYNAMIC. A static `import` is hoisted and would connect with the old value no matter where
// these lines sat.
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  try {
    const envPath = resolve(HERE, "live", "ops", ".env");
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const i = line.indexOf("=");
      if (i > 0 && !line.trimStart().startsWith("#")) {
        const k = line.slice(0, i).trim();
        if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
      }
    }
  } catch {
    /* fall through to the explicit error below */
  }
}

process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "").replace(
  /@postgres\.railway\.internal(:\d+)?/,
  "@turntable.proxy.rlwy.net:40357",
);
if (!process.env.DATABASE_URL) {
  console.error("✗ no DATABASE_URL — run under `railway run --service 50pick --`, or populate scripts/live/ops/.env");
  process.exit(2);
}

function arg(name: string): string | null {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : null;
}
const APPLY = process.argv.includes("--apply");
const BY_FINGERPRINT = process.argv.includes("--stopped-with-boundary");
const CHAIN_IDS = (arg("chains") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const ACTOR = arg("actor");
const REASON = arg("reason");

if (!ACTOR || !REASON) {
  console.error('✗ --actor "<name>" and --reason "<why>" are both required.');
  console.error("  Starting a chain takes real money from real players; the audit row must name who and why.");
  process.exit(1);
}
if (!BY_FINGERPRINT && CHAIN_IDS.length === 0) {
  console.error("✗ name what to resume: --chains udc_a,udc_b  or  --stopped-with-boundary");
  process.exit(1);
}

const { listChains, listAssets, setChainState } = await import("../src/lib/server/updown-config.ts");
// ⚠️ NOT from updown-config — it re-exports nothing. `isSourceTrusted` is the source registry's
// own function (`updown-config.ts:29` imports it from here), and the start refusal at
// `updown-config.ts:1124` calls exactly this one. Pre-flighting through a different function
// would be pre-flighting a different question.
const { isSourceTrusted } = await import("../src/lib/server/source-registry.ts");

// Host only — never print credentials.
console.log(`target: ${(() => { try { return new URL(process.env.DATABASE_URL!).host; } catch { return "unparseable"; } })()}`);
console.log(`actor:  ${ACTOR}`);
console.log(`reason: ${REASON}`);
console.log(`mode:   ${APPLY ? "APPLY — chains will be STARTED" : "DRY RUN — nothing will be written"}\n`);

const assets = await listAssets();
const byId = new Map(assets.map((a) => [a.id, a]));
const chains = await listChains();

const targets = BY_FINGERPRINT
  ? chains.filter((c) => c.state !== "RUNNING" && c.nextBoundaryAt != null)
  : chains.filter((c) => CHAIN_IDS.includes(c.id));

const missing = CHAIN_IDS.filter((id) => !chains.some((c) => c.id === id));
for (const id of missing) console.log(`  ⚠️  no such chain: ${id}`);

if (targets.length === 0) {
  console.log("Nothing to resume.");
  process.exit(0);
}

console.log(`chains to resume: ${targets.length}\n`);

// ⛔ PRE-FLIGHT EVERY REFUSAL `setChainState` CAN RETURN, so a start that cannot succeed is
// visible now rather than as a silent no-op after --apply.
let blocked = 0;
for (const c of targets) {
  const a = byId.get(c.assetId);
  console.log(`  ${a?.key ?? c.assetId} · ${c.durationMinutes}m  (${c.id})`);
  console.log(`      state         ${c.state}`);
  console.log(`      nextBoundary  ${c.nextBoundaryAt ?? "none"}   ⇢ will be recomputed from now on start`);
  console.log(`      gridAnchor    ${c.gridAnchorAt ?? "none"}     ⇢ will be re-anchored on start`);

  if (!a) {
    console.log(`      ⛔ WOULD REFUSE — the chain's asset no longer exists`);
    blocked++;
    continue;
  }
  console.log(`      source        ${a.priceSourceUrl}`);
  if (!a.enabled) {
    console.log(`      ⛔ WOULD REFUSE — asset "${a.key}" is DISABLED. Enable it before starting its chains.`);
    blocked++;
    continue;
  }
  const trusted = await isSourceTrusted(a.priceSourceUrl, a.category as never);
  if (!trusted.ok) {
    console.log(`      ⛔ WOULD REFUSE — source not trusted: ${trusted.reason}`);
    console.log(`         Re-approve at /admin/sources first.`);
    blocked++;
    continue;
  }
  console.log(`      ✓ all three start conditions pass (asset present, enabled, source trusted)`);
}

if (blocked > 0) console.log(`\n⚠️  ${blocked} of ${targets.length} would be REFUSED by the service.`);

if (!APPLY) {
  console.log("\nDRY RUN — nothing written. Re-run with --apply to start these chains.");
  console.log("On start each chain re-anchors and computes a fresh boundary, so no stale schedule survives.");
  process.exit(0);
}

console.log("");
let started = 0;
for (const c of targets) {
  const a = byId.get(c.assetId);
  const r = await setChainState(c.id, "RUNNING", ACTOR);
  if (r.ok) {
    started++;
    console.log(`  ✓ started ${a?.key ?? c.assetId} ${c.durationMinutes}m — nextBoundaryAt now ${r.data.nextBoundaryAt}`);
  } else {
    console.log(`  ✗ FAILED  ${a?.key ?? c.assetId} ${c.durationMinutes}m — ${r.error}`);
  }
}

console.log(`\n${started}/${targets.length} chain(s) started.`);
console.log("⚠️  A start is not a round. Watch one full round OPEN and SETTLE before trusting the chain:");
console.log("    node scripts/live/ops/chain-stall-census.cjs");

// ⛔ E-66 · FLUSH THE AUDIT QUEUE BEFORE THIS PROCESS ENDS.
//
// `setChainState` calls `audit({...})` WITHOUT awaiting it, and `audit()` chains the write onto
// a serialised global queue (the HMAC chain must be written in prevHash order). A long-lived
// web process always drains that queue; a script does not. Measured on production:
// `ops-stop-updown-chains.mts` stopped FOUR chains and exactly ONE `updown.chain.stopped` row
// reached the database — the state changes were all correct, three audit entries simply never
// existed, and they cannot be added afterwards because an `AuditLog` row is HMAC-linked.
//
// ⚠️ This is the record that answers "who restarted the game, and why".
const { auditFlush } = await import("../src/lib/server/audit.ts");
await auditFlush();
