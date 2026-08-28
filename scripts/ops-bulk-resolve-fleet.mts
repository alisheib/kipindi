/**
 * THE BULK-RESOLVE TEST FLEET — mint, inspect and destroy a tagged set of markets on
 * production that covers EVERY verdict the resolver queue can render.
 *
 *   npx tsx scripts/ops-bulk-resolve-fleet.mts mint
 *   npx tsx scripts/ops-bulk-resolve-fleet.mts list
 *   npx tsx scripts/ops-bulk-resolve-fleet.mts destroy --yes
 *
 * ⛔ WHY A FLEET AND NOT THE 17 REAL MARKETS. The queue on production holds real player
 * money — 440,500 TZS on one row alone. Practising a brand-new bulk seal on it is not a
 * test, it is an incident. And two markets would not be a test either: the whole point of
 * the verdict is that it DISCRIMINATES, and you cannot prove discrimination without a
 * population that contains every case. So the fleet has one market per verdict, both
 * outcomes, one already sealed, one already claimed, one still live.
 *
 * ⭐ IT DRIVES THE REAL ENGINE, NOT SQL. Markets are born through `createMarket`, stakes
 * are placed through `buyPosition` (the real money path, real ledger entries), and each
 * market reaches CLOSED through `resolveDueMarket` — using the `assessment` seam the
 * function already documents for exactly this ("tests use the same seam to drive the real
 * branching + real DB writes without the network"). ⛔ Nothing here stamps a status by
 * hand: a fixture built by SQL proves that SQL works.
 *
 * ⭐ AND IT IS THE FIRST END-TO-END PROOF OF `sentinelDetermined`. The column is written by
 * the engine's own `sentinelFields`; if the DAL or the schema were wrong, these rows would
 * come back NULL and every fleet market would read "not recorded".
 *
 * ── THE TAG ──────────────────────────────────────────────────────────────────────
 * `proposedBy = 'qa-bulk-resolve'`. ONE predicate finds the whole fleet, for listing and
 * for deletion. ⛔ `destroy` refuses to touch any row outside it, and reads the tag back
 * off the row rather than trusting a remembered list.
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-min-aaaa";

import { readFileSync } from "node:fs";
import { join } from "node:path";

// ⛔ The public proxy, ALWAYS. `railway run` injects `postgres.railway.internal`, which
// resolves only from inside Railway; every probe in this repo has to rewrite it.
const envFile = join(process.cwd(), ".env.qa.local");
try {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z_0-9]+)=(.*)$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch { /* running inside Railway — DATABASE_URL is already set */ }
if (process.env.PROD_DATABASE_PUBLIC_URL) process.env.DATABASE_URL = process.env.PROD_DATABASE_PUBLIC_URL;
process.env.DATABASE_URL = (process.env.DATABASE_URL ?? "")
  .replace(/@postgres\.railway\.internal(:\d+)?/, "@turntable.proxy.rlwy.net:40357");
if (!process.env.DATABASE_URL) { console.error("no DATABASE_URL"); process.exit(2); }

const { marketStore } = await import("../src/lib/server/market-dal.ts");
const { createMarket, resolveDueMarket, resolveMarket, settleMarket, buyPosition, getMarket } =
  await import("../src/lib/server/market-service.ts");
const { auditFlush } = await import("../src/lib/server/audit.ts");
const { prisma: prismaFn } = await import("../src/lib/server/prisma.ts");
// `prisma()` is a FUNCTION here, not a client — it returns null when no DATABASE_URL is
// set, which is how the app boots with no database at all. Resolve it once, loudly.
const prisma = prismaFn();
if (!prisma) { console.error("prisma client unavailable — DATABASE_URL not seen by the app"); process.exit(2); }
import type { SentinelResult } from "../src/lib/server/market-sentinel.ts";

const TAG = "qa-bulk-resolve";
const APPROVED = "https://www.premierleague.com/match/qa-bulk";
const OTHER_HOST = "https://www.espn.com/soccer/report/qa-bulk";
const EVIDENCE = "The official match centre records the final score, and the fixture is complete.";

type Shape = {
  key: string;
  purpose: string;
  /** null = the AI produced nothing usable; undefined = never checked (stays LIVE). */
  assessment: SentinelResult | null | undefined;
  outcomeAfter?: "YES" | "NO";
  claim?: boolean;
  stakes?: boolean;
  /** Force this fixture onto HUMAN resolution mode before the trigger runs. */
  humanMode?: boolean;
};

const A = (over: Partial<SentinelResult>): SentinelResult => ({
  marketId: "", title: "", determined: true, outcome: "YES", confidence: 97,
  evidence: EVIDENCE, reasoning: "QA fleet fixture", sourceUrl: APPROVED, action: "assessed",
  ...over,
});

const SHAPES: Shape[] = [
  { key: "E-YES-1", purpose: "ELIGIBLE · YES, citation matches, determined, 97%", assessment: A({}), stakes: true, humanMode: true },
  { key: "E-NO-1", purpose: "ELIGIBLE · NO, citation matches, determined, 95%", assessment: A({ outcome: "NO", confidence: 95 }), stakes: true, humanMode: true },
  { key: "E-DBL", purpose: "ELIGIBLE · target for the double-click / replay test", assessment: A({}), stakes: true, humanMode: true },
  { key: "E-RACE", purpose: "ELIGIBLE · target for two admins submitting at once", assessment: A({}), stakes: true, humanMode: true },
  { key: "E-STEAL", purpose: "ELIGIBLE · sealed by someone else between render and submit", assessment: A({}), stakes: true, humanMode: true },
  { key: "B-SRC", purpose: "BLOCKED · 99% but the AI cited espn.com (THE PRODUCTION CASE)", assessment: A({ confidence: 99, sourceUrl: OTHER_HOST }), stakes: true },
  { key: "B-THR", purpose: "BLOCKED · citation matches, confidence 82 (under the floor)", assessment: A({ confidence: 82 }), stakes: true },
  { key: "B-DET", purpose: "BLOCKED · determined never recorded (pre-column row)", assessment: A({}), stakes: true, humanMode: true },
  { key: "B-NOD", purpose: "BLOCKED · the AI says the outcome is NOT locked", assessment: A({ determined: false, confidence: 95 }), stakes: true },
  { key: "B-NOA", purpose: "BLOCKED · no AI reading at all", assessment: null, stakes: true },
  { key: "B-CLM", purpose: "BLOCKED · a resolve check is running right now", assessment: A({}), claim: true, stakes: true },
  { key: "R-DONE", purpose: "ALREADY RESOLVED · must report already-applied, never a failure", assessment: A({}), outcomeAfter: "YES", stakes: true, humanMode: true },
  { key: "L-LIVE", purpose: "STILL LIVE · betting open, must be refused and NOT overridable", assessment: undefined, stakes: true },
];

const cmd = process.argv[2] ?? "list";

async function fleetPlayers(n: number): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: { phoneE164: { startsWith: "+2557990000" }, role: "PLAYER" },
    select: { id: true, phoneE164: true, wallet: { select: { balance: true } } },
    orderBy: { phoneE164: "asc" },
    take: 50,
  });
  const funded = rows.filter((r) => Number(r.wallet?.balance ?? 0) >= 3000);
  if (funded.length < n) {
    throw new Error(
      `need ${n} funded QA-fleet players, found ${funded.length} of ${rows.length}. ` +
      `Run: npx tsx scripts/ops-qa-fleet.mts create ${n} && npx tsx scripts/ops-qa-fleet.mts fund 50000`,
    );
  }
  return funded.slice(0, n).map((r) => r.id);
}

async function mint() {
  const players = await fleetPlayers(2);
  console.log(`using QA fleet players: ${players.join(", ")}\n`);
  const minted: Array<{ key: string; id: string; status: string; purpose: string }> = [];

  const only = process.argv.includes("--only") ? process.argv[process.argv.indexOf("--only") + 1] : null;
  for (const s of SHAPES) {
    if (only && s.key !== only) continue;
    const now = Date.now();
    // ⛔ `createMarket` REFUSES a past resolution date, by design. So every fixture is born
    // legitimately in the near future and then driven forward through the real trigger —
    // which is what a real market does, only faster.
    const resolutionAt = new Date(now + 90_000).toISOString();
    const selectionClosedAt = new Date(now + 30_000).toISOString();
    const m = await createMarket({
      titleEn: `QA bulk-resolve fixture ${s.key} — ${s.purpose}`,
      titleSw: `Jaribio la utatuzi wa wingi ${s.key}`,
      titleZh: `批量结算测试 ${s.key}`,
      category: "sports",
      sourceUrl: APPROVED,
      resolutionCriterion: "QA fixture for the bulk-resolve drive. Resolves YES if the fixture is complete.",
      resolutionAt,
      selectionClosedAt,
      proposedBy: TAG,
    });

    // Real stakes, through the real money path — so settlement has something to conserve.
    if (s.stakes) {
      const r1 = await buyPosition(players[0], { marketId: m.id, side: "YES", stake: 1000 });
      const r2 = await buyPosition(players[1], { marketId: m.id, side: "NO", stake: 1000 });
      if (!r1.ok || !r2.ok) {
        console.log(`  ${s.key}: stake refused — ${!r1.ok ? r1.error : ""} ${!r2.ok ? r2.error : ""}`);
      }
    }

    // ⭐ AUTO MODE SEALS AN ELIGIBLE MARKET OUTRIGHT — WHICH IS THE POINT, AND WHICH MEANS
    // AN ELIGIBLE MARKET CANNOT SIT IN THE QUEUE WHILE AUTO IS ON. Production runs
    // `resolutionMode: auto`, so the first mint watched the engine auto-seal five fixtures
    // the instant their citation matched — an unplanned live proof that the resolver works
    // and the citations were the whole problem. It also means the only honest way to stage
    // an eligible row for the bulk bar is HUMAN mode, which is the platform default and the
    // state an operator running with auto off is actually in.
    if (s.humanMode) await marketStore.stamp(m.id, { resolutionMode: "human" });
    if (s.assessment !== undefined) {
      // Move the clock forward the only honest way: pull the deadlines into the past on the
      // ROW (the market is a QA fixture and nobody is betting on it), then let the REAL
      // trigger run. Everything after this line is the engine, not this script.
      // ⛔ THE CLOCK ONLY, AND NOT THROUGH `marketStore.stamp` — which REFUSES
      // `resolutionAt` by design (its allow-list keeps pool/title/date fields out of a
      // partial write). This moves a QA fixture's deadlines into the past so the REAL
      // trigger can run against it; it touches no status, no outcome, no pool and no
      // money. Everything after this line is the engine.
      const past = new Date(now - 60_000).toISOString();
      await prisma.predictionMarket.update({
        where: { id: m.id },
        data: { resolutionAt: new Date(past), selectionClosedAt: new Date(now - 120_000) },
      });
      const assessment = s.assessment ? { ...s.assessment, marketId: m.id, title: m.titleEn } : null;
      const r = await resolveDueMarket(m.id, { assessment });
      if (r.status !== "closed-human") console.log(`  ${s.key}: trigger returned ${r.status} (expected closed-human)`);

      // B-DET reproduces a row assessed BEFORE the column existed. It is the ONLY hand
      // write in this file and it writes a NULL, never a value — clearing a fact is the
      // one thing that cannot fabricate one.
      if (s.key === "B-DET") {
        await prisma.predictionMarket.update({ where: { id: m.id }, data: { sentinelDetermined: null } });
      }
      if (s.outcomeAfter) {
        const rr = await resolveMarket({ marketId: m.id, outcome: s.outcomeAfter, officerId: TAG, evidence: EVIDENCE });
        if (!rr.ok) console.log(`  ${s.key}: pre-seal failed — ${rr.error}`);
      }
      if (s.claim) await marketStore.stamp(m.id, { resolveClaimedAt: new Date().toISOString() });
    }

    const after = await getMarket(m.id);
    minted.push({ key: s.key, id: m.id, status: after?.status ?? "?", purpose: s.purpose });
    console.log(`  ${s.key.padEnd(8)} ${m.id}  ${after?.status?.padEnd(9)}  det=${String(after?.sentinelDetermined)}  conf=${after?.sentinelConfidence ?? "-"}  cited=${after?.sentinelSourceUrl ? new URL(after.sentinelSourceUrl).hostname : "-"}`);
  }
  console.log(`\nminted ${minted.length} fixtures, tag proposedBy='${TAG}'`);
  console.log(JSON.stringify(minted, null, 2));
}

async function list() {
  const rows = await prisma.predictionMarket.findMany({
    where: { proposedBy: TAG },
    select: {
      id: true, titleEn: true, status: true, yesPool: true, noPool: true, settledAt: true,
      sentinelOutcome: true, sentinelConfidence: true, sentinelDetermined: true, sentinelSourceUrl: true,
      resolvedOutcome: true, resolveClaimedAt: true, objectionsClosedAt: true,
      _count: { select: { positions: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  console.log(`${rows.length} fleet markets (proposedBy='${TAG}')\n`);
  for (const r of rows) {
    const key = /fixture (\S+)/.exec(r.titleEn)?.[1] ?? "?";
    console.log(
      `${key.padEnd(8)} ${r.id}  ${String(r.status).padEnd(9)} out=${String(r.resolvedOutcome ?? "-").padEnd(5)} ` +
      `pool=${Number(r.yesPool) + Number(r.noPool)} pos=${r._count.positions} settled=${r.settledAt ? "Y" : "-"} ` +
      `det=${String(r.sentinelDetermined)} conf=${r.sentinelConfidence ?? "-"} ` +
      `cited=${r.sentinelSourceUrl ? new URL(r.sentinelSourceUrl).hostname : "-"}`,
    );
  }
}

async function destroy(confirmed: boolean) {
  if (!confirmed) { console.error("refusing without --yes"); process.exit(2); }
  const rows = await prisma.predictionMarket.findMany({
    where: { proposedBy: TAG },
    select: { id: true, status: true, titleEn: true },
  });
  // ⛔ THE TAG IS READ BACK OFF THE ROW. A remembered list is a list that can be wrong
  // about a market someone else created while this ran.
  const ids = rows.map((r) => r.id);
  if (ids.length === 0) { console.log("nothing to destroy"); return; }

  /**
   * 🔴 EVERY MARKET IS VOIDED AND SETTLED THROUGH THE ENGINE BEFORE IT IS DELETED, AND THE
   * FIRST DRAFT OF THIS FUNCTION DID NOT DO THAT — IT COST TZS 2,000 ON PRODUCTION.
   *
   * It credited each open position's stake back with a raw `prisma.wallet.update` and then
   * deleted the market; the positions cascade-deleted with it. The WALLETS came out right.
   * The LEDGER did not: two `STAKE_DEBIT` pairs were left standing, so the books claimed
   * TZS 2,000 was held in escrow for a market that no longer existed.
   *
   * ⛔ AND `house-money.cjs` STILL PRINTED "the books balance", because every entry summed
   * to zero — both halves of each pair were present. A grand total of zero is not the same
   * statement as "every account means what it says". `ops-fix-orphan-pool-2026-08-28.mts`
   * is the record of putting it back.
   *
   * ⭐ So the fleet is torn down the way a real market is: `resolveMarket({ outcome: "VOID" })`
   * for the verdict, then `settleMarket(force)` for the money — the same refund path, the
   * same `REFUND` ledger pairs, the same conservation checks. `force` skips only the
   * objection window and the objection check; it can never skip the already-settled guard,
   * so a re-run pays nobody twice.
   */
  let voided = 0, settled = 0;
  for (const r of rows) {
    if (r.status === "LIVE" || r.status === "CLOSED") {
      const v = await resolveMarket({ marketId: r.id, outcome: "VOID", officerId: TAG, evidence: "QA fleet teardown" });
      if (v.ok) voided++;
      else console.log(`  ${r.id}: void refused — ${v.error}`);
    }
    const s = await settleMarket(r.id, { actorId: TAG, force: true });
    if (s.ok) settled++;
  }
  // The officer bell rows the human-fallback transition writes. Scoped to THIS fleet by
  // the market id in the deep link — never a blanket delete of a notification table that
  // also carries real players' settlement news.
  const notif = await prisma.notification.deleteMany({ where: { OR: ids.map((id) => ({ href: { contains: id } })) } });
  const del = await prisma.predictionMarket.deleteMany({ where: { proposedBy: TAG } });
  console.log(`voided ${voided} · settled ${settled} · removed ${notif.count} notifications · deleted ${del.count} markets`);
}

if (cmd === "mint") await mint();
else if (cmd === "destroy") await destroy(process.argv.includes("--yes"));
else await list();

// ⛔ DRAIN THE AUDIT QUEUE BEFORE EXITING (E-66), AND THIS GATE CAUGHT THIS FILE.
// `audit()` is fire-and-forget and the chain is HMAC-linked, so a script that mutates
// audited state — this one creates markets, places real stakes, voids and settles — and then
// exits can drop entries that were queued but never hashed. A missing link in an
// append-only chain is exactly the signal the chain exists to produce.
await auditFlush();
await prisma.$disconnect();
process.exit(0);
