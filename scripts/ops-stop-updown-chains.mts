/**
 * STOP every RUNNING Up & Down chain — through the real service call, never SQL.
 *
 *   railway run --service 50pick -- npx tsx scripts/ops-stop-updown-chains.mts          # dry run
 *   railway run --service 50pick -- npx tsx scripts/ops-stop-updown-chains.mts --apply  # do it
 *
 * WHY THIS EXISTS. Ali, 2026-08-03: *"nothing should be by 50pick automatic — my admins will
 * enter and generate every 5 min… because sometimes we might not generate, other times we
 * would."* A RUNNING chain emits a round on a timer with no human involved; on production that
 * was **48 rounds in one hour** across four chains. Stopping the chains is what makes round
 * creation a deliberate act again.
 *
 * ⛔ IT GOES THROUGH `setChainState`, THE SAME CALL THE CONSOLE'S STOP BUTTON MAKES. A raw
 * `UPDATE "UpDownChain" SET state='STOPPED'` would skip the refusals, skip the audit row, and
 * leave the scheduler's in-memory timer armed — the chain would keep firing while the database
 * claimed it was stopped. Every money-touching change in this campaign goes through the service.
 *
 * ⚠️ STOPPING DOES NOT VOID AN OPEN ROUND, and that is correct. A round already open keeps its
 * money, closes at its own boundary and settles normally; if its price never confirms, the E-24
 * self-healer terminates and refunds it within `abandonAfterSeconds`. Nothing is stranded by
 * stopping — but check what is in flight first anyway, which is what the dry run prints.
 */
// ⛔ REWRITE THE DB HOST BEFORE PRISMA IS EVER IMPORTED.
//
// `railway run` injects the SERVICE's `DATABASE_URL`, which names `postgres.railway.internal`
// — resolvable only from inside Railway's network. From a laptop Prisma fails with
// "Can't reach database server at postgres.railway.internal:5432", which reads like the
// database is down and is not. `scripts/live/q.cjs` has always done this swap; a Prisma script
// has to do it BEFORE the client is constructed, so the imports below are DYNAMIC — a static
// `import` is hoisted and would connect with the old value no matter where this line sat.
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!process.env.DATABASE_URL) {
  console.error("no DATABASE_URL — run under `railway run --service 50pick --`");
  process.exit(2);
}

const { listChains, setChainState, getAsset } = await import("../src/lib/server/updown-config.ts");
const { roundStore } = await import("../src/lib/server/updown-dal.ts");
const { marketStore } = await import("../src/lib/server/market-dal.ts");

const APPLY = process.argv.includes("--apply");
// Attributed to a real operator identity, not "system": this is an operator decision.
const OFFICER = process.env.OPS_OFFICER_ID ?? "usr_ops_stop_updown";

const chains = await listChains();
const running = chains.filter((c) => c.state === "RUNNING");

console.log(`\n${running.length} RUNNING chain(s)${APPLY ? "" : "  — DRY RUN, nothing will change"}\n`);
if (running.length === 0) { console.log("nothing to do\n"); process.exit(0); }

let stopped = 0;
const problems: string[] = [];

for (const c of running) {
  const asset = await getAsset(c.assetId);
  const label = `${asset?.key ?? c.assetId} ${c.durationMinutes}m`;

  // What is riding on it right now — printed BEFORE the change, so the decision is informed.
  const open = (await roundStore.list({ chainId: c.id, limit: 5 })).filter((r) => !r.resolvedAt);
  let money = 0, players = 0;
  for (const r of open) {
    const m = await marketStore.get(r.marketId);
    if (m) { money += Number(m.yesPool ?? 0) + Number(m.noPool ?? 0); players += Number(m.predictorCount ?? 0); }
  }
  console.log(`  ${label.padEnd(12)} open rounds ${open.length}  ·  TZS ${money.toLocaleString()}  ·  ${players} player(s)`);

  if (!APPLY) continue;
  const r = await setChainState(c.id, "STOPPED", OFFICER);
  if (r.ok) { stopped++; console.log(`    → STOPPED`); }
  else { problems.push(`${label}: ${r.error}`); console.log(`    → REFUSED: ${r.error}`); }
}

if (!APPLY) {
  console.log(`\nre-run with --apply to stop them\n`);
  process.exit(0);
}

// ⛔ FLUSH THE AUDIT QUEUE BEFORE EXITING — THIS COST THREE AUDIT ROWS ON PRODUCTION.
//
// `setChainState` calls `audit({...})` WITHOUT awaiting it, and `audit()` chains the write onto
// a serialised global queue (`__50PICK_AUDIT_QUEUE`) because the HMAC chain needs its entries
// written in order. In the web app that queue always drains — the process outlives the request.
// A SCRIPT does not: the first run of this file stopped four chains and then called
// `process.exit()`, and only **one** `updown.chain.stopped` row reached the database. The state
// change was correct and complete; three of its four audit entries simply never got written,
// and they cannot be added afterwards — hand-writing an `AuditLog` row is forbidden here
// precisely because the chain is HMAC-linked by `prevHash`.
//
// `auditFlush()` exists for this. ⚠️ ANY ops script that calls a service function and then exits
// needs it — the money-path services all audit fire-and-forget.
const { auditFlush } = await import("../src/lib/server/audit.ts");
await auditFlush();

// Read the state BACK rather than trusting the return values.
const after = (await listChains()).filter((c) => c.state === "RUNNING");
console.log(`\n${stopped} stopped · ${after.length} still RUNNING · audit queue flushed\n`);
for (const p of problems) console.log(`  · ${p}`);
process.exit(after.length === 0 && problems.length === 0 ? 0 : 1);
