/**
 * S4 REHEARSAL 2 — THE ROLLBACK DRILL (04-amendments.md §S3 "Test (S4 rehearsal 2)", §S4 drill 2).
 *
 *   npm run rehearse:rollback
 *
 * ⛔ THIS DRILL IS DELIBERATELY INCOMPLETE, AND IT EXITS 3 (NOT MEASURED) EVEN WHEN EVERY ASSERTION BELOW IS
 * GREEN. Two of the four steps §S3 names cannot be taken on `rel-lane` and neither reason is a matter of effort:
 *
 *   · **Step 2 is not a script.** "Boot the pre-merge SHA" means a second worktree checked out before the house
 *     commits, with its OWN `node_modules` and a Prisma client that has no `houseBotId` — and installing
 *     dependencies is outside what any lane may do here. Hand-writing an unmarked `Transaction` row and calling
 *     the result "the rollback" would rehearse DRIFT DETECTION over a fixture, not a rollback, and recording
 *     that as drill 2 is the true-measurement-of-the-wrong-population this programme exists to refuse.
 *   · **Steps 4–7 need instruments that live on another branch.** `ops:house-bots-status --drift` and
 *     `ops:house-bots-remark` are keys on `origin/ops-lane` only. They were read READ-ONLY (`git show
 *     origin/ops-lane:scripts/ops-house-bots-status.mts`) for §0's pin and for `RELEASE-LADDER.md` §10's
 *     procedure. ops-lane was NOT merged: lane 2 is renumbering the register inside it right now.
 *
 * ⭐ SO WHAT IS THIS, THEN. Everything the drill needs that DOES live on this branch, driven for real against a
 * scratch Postgres the run creates and drops:
 *
 *   §0  THE DIVERGENCE PIN THAT ARMS ITSELF. The four drift predicates this file runs are transcribed from
 *       ops-lane's script. Once ops-lane merges, §0 compares them against the merged file and goes RED if they
 *       have drifted apart. Before the merge it says NOT MEASURED and names the file it is waiting for. A second
 *       copy of a query is a second authority, and this is the only thing that stops the two diverging silently.
 *   §1  THE IMMUTABILITY PIN, **DRIVEN** (procedure step 9). `test:house-bot-reports` 0.232.4 already pins this,
 *       but it pins the SPELLING: it greps both store twins for the line that drops the key. Nothing anywhere
 *       drives `db.txn.update(id, { houseBotId })` against a real database and reads the column back — and
 *       nothing anywhere holds the POSITIVE CONTROL §S3 step 4 actually asks for, that the same update still
 *       WRITES its other fields. A drop that swept in the whole patch would leave 0.232.4 greener than ever
 *       while the ledger quietly stopped being updatable.
 *   §2  THE DRIFT-FREE BASELINE. Drift legs (a), (b) and (c) run over a database this run filled with REAL
 *       money movement through the real services — house stakes, a settlement, a void, an emergency void, a
 *       player cash-out, an agent commission. All three legs must report 0. ⛔ That is not a re-run of the
 *       rollback: it is the precondition that makes step 4 READABLE. If the CURRENT SHA leaves leg-(a) rows of
 *       its own, then after a rollback nobody can tell an old-code row from a new-code one, and `remark` would
 *       be filling markers onto rows nobody understands. Each leg prints its population and each has a PLANTED
 *       CONTROL that writes the exact shape old code writes and requires the leg to find it.
 *   §3  WAGERING — the half of leg (c) that NO query can see, driven instead. `BonusGrant` carries no
 *       `positionId`, so "wagering on a marked position" is unmeasurable in SQL for ever (that is why §10 makes
 *       the ops script print it as UNMEASURABLE rather than 0). The only defence left is that the current code
 *       never accrues it — so this drill drives that, on one account, with the same grant, both ways.
 *
 * 🔴 AND ONE THING §2 MEASURED THAT NOBODY HAD: **drift leg (c1) CANNOT FIRE ON THIS SCHEMA.** It joins
 * `Transaction."positionId" = Position."id"` for `type = 'AGENT_COMMISSION'`. §2.c1 drives a real commission all
 * the way through `settleMarket` and then reads EVERY AGENT_COMMISSION row in the database: all of them carry
 * `positionId` NULL. So leg (c1)'s 0 is a 0 over an empty population, and leg (c2) — which rebuilds the
 * deterministic `sourceRef` — is the only half of (c) that can find commission at all.
 * ⚠️ THE MEASUREMENT IS OF THE ROWS; the explanation is a read of `src/`, and it is stated as one: the single
 * `type: "AGENT_COMMISSION"` in the platform is `policy.txnType` (`affiliate-service.ts:447`), which reaches the
 * ledger through `creditInternal` (`wallet-service.ts`), and that writer hardcodes `positionId: null`. If a second
 * writer is ever added, §2.c1.x is the assertion that will notice — it counts rows, not call sites.
 *
 * ⛔ IT NEVER TOUCHES ANYTHING BUT ITS OWN SCRATCH DATABASE. It refuses any host that is not loopback, creates
 * `hb_reh_rollback_<pid>`, and drops only that. The master switch is turned on against that database and nowhere
 * else — the owner's switch on the real platform is his act alone.
 *
 * Exit: 1 a failure · 2 refused (wrong target) · 3 NOT MEASURED (no local Postgres, or the drill's own
 * structural remainder — which is every run, until steps 2 and 4–7 above become possible).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

type Any = any;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra = ""): boolean => {
  cond ? pass++ : fail++;
  console.log(`${cond ? "PASS" : "FAIL"} ${label}${extra ? ` — ${extra}` : ""}`);
  return cond;
};
const section = (t: string) => console.log(`\n${t}`);
const pop = (t: string) => console.log(`     population: ${t}`);
const show = (r: Any) => (r?.ok ? "ok" : `${r?.code ?? "?"}/${r?.reason ?? "no-reason"}${r?.detail ? ` ${JSON.stringify(r.detail)}` : ""}`);

/** The number of days of `Position.placedAt` the legs look back over — ops-lane's own default. */
const SINCE_DAYS = 30;
const DRIFT_LIMIT = 200;

/**
 * ⛔ THE FOUR DRIFT PREDICATES, TRANSCRIBED. §S3's re-release law states the three legs in prose; these are the
 * exact WHERE fragments ops-lane's `ops-house-bots-status.mts` runs, read there read-only. They are held here as
 * named constants for one reason: §0 can then compare them, character for character, against that file the
 * moment it lands in this tree. A transcription nobody can check is a second authority.
 */
const PRED_A = `p."houseBotId" IS NOT NULL AND t."houseBotId" IS NULL`;
const PRED_B = `p."houseBotId" IS NOT NULL AND t."type"::text = 'CASHOUT'`;
const PRED_C1 = `p."houseBotId" IS NOT NULL AND t."type"::text = 'AGENT_COMMISSION'`;
const PRED_C2 = `r."sourceRef" = 'referral:commission:' || p."marketId" || ':' || p."id"`;

// ═══ §0 · THE DIVERGENCE PIN — runs first, because it needs no database ═════════════════════════════════════
section("§0 · the divergence pin: these predicates and ops-lane's must not drift apart");
let notMeasured = 0;
{
  const OPS = join(ROOT, "scripts", "ops-house-bots-status.mts");
  if (existsSync(OPS)) {
    const src = readFileSync(OPS, "utf8");
    const missing = ([["a", PRED_A], ["b", PRED_B], ["c1", PRED_C1], ["c2", PRED_C2]] as const)
      .filter(([, p]) => !src.includes(p)).map(([n]) => n);
    pop(`${src.length} chars of scripts/ops-house-bots-status.mts · 4 predicates compared`);
    ok("0.1 · ⛔ every drift predicate this drill runs still appears verbatim in the merged ops script — the second copy has not drifted",
      missing.length === 0, missing.length === 0 ? "a, b, c1, c2 all present" : `MISSING: ${missing.join(", ")}`);
    // POSITIVE CONTROL — the comparison is not simply blind: a string the file CANNOT contain must be reported.
    ok("0.2 · POSITIVE CONTROL · the same comparison reports a predicate that is NOT there, so 0.1 is a measurement and not an empty `every`",
      !src.includes(`p."houseBotId" IS NOT NULL AND t."houseBotId" IS NULL AND 1 = 2 /* never */`));
  } else {
    notMeasured++;
    console.log(`     NOT MEASURED — scripts/ops-house-bots-status.mts is not in this tree. It is a key on`);
    console.log(`     origin/ops-lane only, and ops-lane was not merged (lane 2 is renumbering its register).`);
    console.log(`     ⭐ THIS PIN ARMS ITSELF: the moment REL-M lands that file, the branch above starts running`);
    console.log(`     and this drill goes RED if the two copies of the drift query have drifted apart.`);
    console.log(`     Predicates held here: (a) ${PRED_A}`);
    console.log(`                           (b) ${PRED_B}`);
    console.log(`                           (c1) ${PRED_C1}`);
    console.log(`                           (c2) ${PRED_C2}`);
  }
}

// ═══ PREFLIGHT · the target ═════════════════════════════════════════════════════════════════════════════════
const RAW = process.env.VERIFY_DATABASE_URL ?? "";
if (!RAW) {
  console.error(`\n!! NOT MEASURED — this drill needs a local Postgres. Run \`npm run rehearse:rollback\`, which boots one.`);
  console.log(`\nrollback: ${pass} passed, ${fail} failed — the DRILL was NOT MEASURED`);
  process.exit(3);
}
let host = "";
try { host = new URL(RAW).hostname; } catch { /* refused below */ }
if (!["127.0.0.1", "localhost", "::1", "[::1]"].includes(host)) {
  console.error(`!! refusing: this rehearsal creates and drops a database and runs only against a loopback cluster (saw ${host || "an unparseable URL"}).`);
  process.exit(2);
}
if (process.env.NODE_ENV === "production") { console.error("!! refusing to run with NODE_ENV=production."); process.exit(2); }

const BASE = RAW.replace(/\/[^/?]*(\?.*)?$/, "");
const DB = `hb_reh_rollback_${process.pid}`;
const URL_DB = `${BASE}/${DB}?connect_timeout=30`;

const admin = new pg.Client({ connectionString: RAW });
await admin.connect();
// ⚠️ Only ever this process's own database. Four lanes share this cluster; nothing else is dropped, ever.
await admin.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
await admin.query(`CREATE DATABASE "${DB}"`);
await admin.end();
console.log(`\nscratch database: ${DB} (created by this run, dropped at the end)`);

let cli: pg.Client | null = null;
let prismaRef: Any = null;
try {
  const mig = await new Promise<number>((done) => {
    const c = spawn("npx", ["prisma", "migrate", "deploy"], {
      cwd: ROOT, env: { ...process.env, DATABASE_URL: URL_DB }, stdio: "ignore",
      shell: process.platform === "win32",
    });
    c.on("exit", (x) => done(x ?? 1));
    c.on("error", () => done(1));
  });
  if (!ok("0.migrate · prisma migrate deploy applies every migration to the scratch database", mig === 0, `exit ${mig}`)) {
    throw new Error("migrate failed");
  }

  // ⛔ IMPORT ORDER IS THE CONTRACT (house-bot-world.mts header): the stores bind to Postgres or memory when they
  // are FIRST imported, so the environment is set before anything is awaited.
  process.env.DATABASE_URL = URL_DB;
  process.env.USE_PRISMA_DAL = "true";
  process.env.AUDIT_CHAIN_SECRET = "rehearsal-rollback-chain-secret-do-not-use-anywhere-else";
  // The bonus wallet is a WITHDRAWN product. §3 needs a real grant, so it is switched on for THIS process only,
  // exactly as `agent-policy.test.mts` and `withdrawn-features.test.mts` do, and restored below.
  const bonusBefore = process.env.FEATURE_BONUS;
  process.env.FEATURE_BONUS = "ACTIVE";

  const { loadWorld, OFFICER }: Any = await import("../lib/house-bot-world.mts");
  const w: Any = await loadWorld();
  const AFF: Any = await import("../../src/lib/server/affiliate-service.ts");
  const BONUS: Any = await import("../../src/lib/server/bonus-service.ts");
  const { approveFixtureAgent }: Any = await import("../lib/agent-fixtures.mts");
  prismaRef = w.prisma();

  cli = new pg.Client({ connectionString: `${BASE}/${DB}` });
  await cli.connect();
  const q = async (sql: string, params: Any[] = []): Promise<Any[]> => (await cli!.query(sql, params)).rows;
  const n1 = async (sql: string, params: Any[] = []): Promise<number> => Number((await q(sql, params))[0].n);

  const bound = `p."placedAt" >= (now() AT TIME ZONE 'UTC') - (${SINCE_DAYS}::int * interval '1 day')`;
  const legA = () => q(`SELECT t."id" AS "txnId", t."type"::text AS "type", t."positionId", p."houseBotId"`
    + ` FROM "Position" p JOIN "Transaction" t ON t."positionId" = p."id"`
    + ` WHERE ${PRED_A} AND ${bound} ORDER BY t."createdAt" LIMIT ${DRIFT_LIMIT}`);
  const legB = () => q(`SELECT t."id" AS "txnId", t."positionId", p."houseBotId", t."amount"::text AS "amount"`
    + ` FROM "Position" p JOIN "Transaction" t ON t."positionId" = p."id"`
    + ` WHERE ${PRED_B} AND ${bound} ORDER BY t."createdAt" LIMIT ${DRIFT_LIMIT}`);
  const legC1 = () => q(`SELECT t."id" AS "txnId", t."positionId", p."houseBotId", t."amount"::text AS "amount"`
    + ` FROM "Position" p JOIN "Transaction" t ON t."positionId" = p."id"`
    + ` WHERE ${PRED_C1} AND ${bound} ORDER BY t."createdAt" LIMIT ${DRIFT_LIMIT}`);
  const legC2 = () => q(`SELECT r."id" AS "rewardId", r."sourceRef", p."houseBotId"`
    + ` FROM "Position" p JOIN "ReferralReward" r ON ${PRED_C2}`
    + ` WHERE p."houseBotId" IS NOT NULL AND ${bound} ORDER BY r."id" LIMIT ${DRIFT_LIMIT}`);
  const driftTotal = async () => (await legA()).length + (await legB()).length + (await legC1()).length + (await legC2()).length;

  await w.user({ id: OFFICER, role: "ADMIN" });
  await w.limits();
  await w.switchOn();

  /**
   * A poll with a LOCKED NO stake from a fresh player, so a house YES stake has a counterparty the seam will
   * attribute to. `backdateMs` must exceed the poll's own exit window, or the position is still sellable and the
   * house FILL condition reports `house_condition_gone` instead of placing.
   */
  const pollWithLockedNo = async (noStake: number, graceMin = 0, backdateMs = 10_000): Promise<{ market: Any; player: string; noPos: Any }> => {
    const market = await w.poll({ graceMin });
    const player = await w.user({ balance: 1_000_000 });
    const r = await w.svc.buyPosition(player, { marketId: market.id, side: "NO", stake: noStake, idempotencyKey: crypto.randomUUID() });
    if (!r.ok) throw new Error(`fixture bet refused: ${show(r)}`);
    await w.backdate(r.data.positionId, backdateMs);
    return { market, player, noPos: await w.mdal.positionStore.get(r.data.positionId) };
  };

  // ══ THE FIXTURE · real money movement through the real services, on four markets ═══════════════════════════
  section("fixture · the money this drill measures is placed, settled, voided and cashed out for real");

  // The agent whose commission both a HOUSE holder and an ordinary player will (or will not) earn.
  const agent = await w.user({ balance: 0 });
  const code = await approveFixtureAgent(agent, { commissionPct: 20 });

  // M1 · settlement. A house YES, a RECRUITED player's YES, a player's NO for the pool.
  const m1 = await pollWithLockedNo(10_000);
  const holder1 = await w.user({ balance: 5_000_000, passwordHash: "hash_holder_v1" });
  const bound1 = await AFF.bindRecruit({ recruitUserId: holder1, code });
  ok("f.1 · fixture · the bot HOLDER is bound to the agent, so commission would accrue on his positions if nothing stopped it",
    bound1.bound === true, JSON.stringify(bound1));
  const b1 = await w.bot({ holderId: holder1 });
  const recruit = await w.user({ balance: 1_000_000 });
  const bound2 = await AFF.bindRecruit({ recruitUserId: recruit, code });
  ok("f.2 · fixture · an ORDINARY player is bound to the SAME agent — the positive control for every commission line below",
    bound2.bound === true, JSON.stringify(bound2));

  // §3's grant is credited BEFORE the house stake, so the turnover measurement starts from a live requirement.
  const grant = await BONUS.creditBonus(holder1, { amountTzs: 10_000, source: "ADMIN", sourceRef: `reh_rollback_${process.pid}`, wagerMultiplier: 3, note: "rehearsal" });
  ok("f.3 · fixture · the holder carries a REAL, ACTIVE bonus grant with an open turnover requirement",
    grant.ok === true && grant.grant?.status === "ACTIVE" && grant.grant?.wagerRequiredTzs > 0,
    grant.ok ? `grant ${grant.grant.id} · required ${grant.grant.wagerRequiredTzs} · wagered ${grant.grant.wageredTzs}` : JSON.stringify(grant));
  const grantId = grant.ok ? grant.grant.id : "";
  const wageredNow = async (): Promise<number> => Number((await q(`SELECT "wageredTzs" AS n FROM "BonusGrant" WHERE id = $1`, [grantId]))[0]?.n ?? -1);
  const wagered0 = await wageredNow();

  const r1 = await w.place(b1, await w.intent(b1, m1.market.id, { kind: "FILL", side: "YES", stakeTzs: 5_000 }));
  ok("f.4 · fixture · the house YES stake places on the settlement market", r1.ok === true, show(r1));
  const rr = await w.svc.buyPosition(recruit, { marketId: m1.market.id, side: "YES", stake: 5_000, idempotencyKey: crypto.randomUUID() });
  ok("f.5 · fixture · the recruited player's own YES stake places on the same market", rr.ok === true, show(rr));
  const wageredAfterHouse = await wageredNow();

  await w.svc.resolveMarket({ marketId: m1.market.id, outcome: "YES", officerId: OFFICER });
  const s1 = await w.svc.settleMarket(m1.market.id, { force: true });
  ok("f.6 · fixture · the settlement market resolves YES and settles", s1.ok === true, show(s1));

  // M2 · VOID refund on a house stake.
  const m2 = await pollWithLockedNo(10_000);
  const b2 = await w.bot();
  const r2 = await w.place(b2, await w.intent(b2, m2.market.id, { kind: "FILL", side: "YES", stakeTzs: 4_000 }));
  await w.svc.resolveMarket({ marketId: m2.market.id, outcome: "VOID", officerId: OFFICER });
  await w.svc.settleMarket(m2.market.id, { force: true });
  ok("f.7 · fixture · a house stake is refunded by a VOID", r2.ok === true, show(r2));

  // M3 · emergency void on a house stake.
  const m3 = await pollWithLockedNo(10_000);
  const b3 = await w.bot();
  const r3 = await w.place(b3, await w.intent(b3, m3.market.id, { kind: "FILL", side: "YES", stakeTzs: 3_000 }));
  const ev = await w.svc.emergencyVoidMarket({ marketId: m3.market.id, officerId: OFFICER, reason: "rehearsal 2 fixture" });
  ok("f.8 · fixture · a house stake is refunded by an EMERGENCY VOID", r3.ok === true && ev.ok === true, `${show(r3)} · ${show(ev)}`);

  /**
   * M4 · the cash-out market. ⛔ IT CARRIES TWO PLAYER POSITIONS ON PURPOSE, and the reason is leg (b) itself.
   * The house FILL condition needs LOCKED liquidity — a counterparty whose own exit window has already passed —
   * while the cash-out positive control needs a player whose window is still OPEN. One position cannot be both,
   * because the window is a property of the poll's rates and the row's age, so: player A is backdated 70 minutes
   * past the 60-minute window (locked, and the house stake's counterparty), player B is fresh (sellable, and the
   * control). A drill that skipped this and simply asserted "leg (b) is 0" would be sweeping a database with no
   * cash-out in it at all.
   */
  const m4 = await pollWithLockedNo(10_000, 60, 70 * 60_000);
  const seller = await w.user({ balance: 1_000_000 });
  const sellerBet = await w.svc.buyPosition(seller, { marketId: m4.market.id, side: "NO", stake: 5_000, idempotencyKey: crypto.randomUUID() });
  const b4 = await w.bot();
  const r4 = await w.place(b4, await w.intent(b4, m4.market.id, { kind: "FILL", side: "YES", stakeTzs: 3_000 }));
  ok("f.9 · fixture · a house stake sits OPEN on a market whose exit window is still open, beside a player position that is still sellable",
    r4.ok === true && sellerBet.ok === true, `${show(r4)} · seller ${show(sellerBet)}`);

  const markedPositions = await n1(`SELECT count(*)::int AS n FROM "Position" WHERE "houseBotId" IS NOT NULL`);
  const positionedTxns = await n1(`SELECT count(*)::int AS n FROM "Position" p JOIN "Transaction" t ON t."positionId" = p."id" WHERE p."houseBotId" IS NOT NULL`);
  const playerPositions = await n1(`SELECT count(*)::int AS n FROM "Position" WHERE "houseBotId" IS NULL`);
  pop(`${markedPositions} MARKED positions · ${positionedTxns} transactions joined to them · ${playerPositions} unmarked (player) positions`);
  ok("f.10 · fixture · the population the legs will sweep is REAL and non-empty — a sweep over zero passes, and so does a sweep whose fixture quietly stopped placing",
    markedPositions >= 4 && positionedTxns >= 7 && playerPositions >= 6,
    `marked ${markedPositions} (want ≥4) · positioned txns ${positionedTxns} (want ≥7) · player ${playerPositions} (want ≥6)`);

  // ══ §1 · THE IMMUTABILITY PIN, DRIVEN (procedure step 9) ══════════════════════════════════════════════════
  section("§1 · the immutability pin, DRIVEN — `txn.update` cannot re-mark, un-mark or POSITION a ledger row");
  {
    const houseTxns = (await w.txnsFor(r1.data.positionId)) as Any[];
    const marked = houseTxns.find((t) => t.type === "BET_PLACED");
    const payout = houseTxns.find((t) => t.type === "BET_PAYOUT");
    ok("1.0 · fixture · the house stake's BET_PLACED and BET_PAYOUT rows both exist and both carry the marker",
      !!marked && marked.houseBotId === b1.botId && !!payout && payout.houseBotId === b1.botId,
      `placed ${marked?.houseBotId} · payout ${payout?.houseBotId}`);

    // A row with NO marker and NO position: the shape `positionId` must never be added to.
    const wal = (await w.db.wallet.findByUserId(holder1)) as Any;
    const at = new Date().toISOString();
    const looseId = `txn_reh_loose_${process.pid}`;
    await w.db.txn.create({
      id: looseId, walletId: wal.id, userId: holder1, type: "DEPOSIT", status: "CONFIRMED", amount: 1_000, fee: 0, taxWithheld: 0,
      balanceAfter: null, currency: "TZS", provider: "MPESA", providerRef: `reh_loose_${process.pid}`, msisdn: null,
      description: "rehearsal probe row", positionId: null, amlReason: null, createdAt: at, updatedAt: at, completedAt: at,
    } as Any);

    /** Read the COLUMN, not the mapper: a DAL read could hide a write the database accepted. */
    const raw = async (id: string): Promise<Any> => (await q(`SELECT "houseBotId", "positionId", "description", "amlReason" FROM "Transaction" WHERE id = $1`, [id]))[0];

    // ⛔ THE PATCHES ARE OBJECTS, NOT LITERALS, because the PLANTED CONTROL at 1.4 must run the SAME patch
    // through the PRE-FIX update. A control that builds its own patch proves nothing about these three.
    const patchA = { houseBotId: b2.botId, description: "REHEARSAL PROBE A" };
    const patchB = { houseBotId: null, amlReason: "REHEARSAL PROBE B" };
    const patchC = { positionId: r1.data.positionId, description: "REHEARSAL PROBE C" };

    await w.db.txn.update(marked.id, patchA as Any);
    const afterA = await raw(marked.id);
    ok("1.1 · ⛔ REFUSED · a patch naming another bot's id does NOT re-mark the row — the marker is create-only in the database, not only in the type",
      afterA.houseBotId === b1.botId, `marker ${afterA.houseBotId} (bot A ${b1.botId}, patch aimed at ${b2.botId})`);
    ok("1.1p · POSITIVE CONTROL · the SAME update still WROTE its other field — the drop does not sweep the whole patch away and the ledger is still updatable",
      afterA.description === "REHEARSAL PROBE A", `description ${JSON.stringify(afterA.description)}`);

    await w.db.txn.update(marked.id, patchB as Any);
    const afterB = await raw(marked.id);
    ok("1.2 · ⛔ REFUSED · a patch of `houseBotId: null` does NOT un-mark the row — a house row cannot be laundered into a player row",
      afterB.houseBotId === b1.botId, `marker ${afterB.houseBotId}`);
    ok("1.2p · POSITIVE CONTROL · the SAME update still WROTE `amlReason`",
      afterB.amlReason === "REHEARSAL PROBE B", `amlReason ${JSON.stringify(afterB.amlReason)}`);

    await w.db.txn.update(looseId, patchC as Any);
    const afterC = await raw(looseId);
    ok("1.3 · ⛔ REFUSED · an unpositioned, unmarked row cannot be POSITIONED after the fact — the one way a positioned row could exist that ruling 232's create-site scan can never see",
      afterC.positionId === null, `positionId ${afterC.positionId}`);
    ok("1.3p · POSITIVE CONTROL · the SAME update still WROTE `description`",
      afterC.description === "REHEARSAL PROBE C", `description ${JSON.stringify(afterC.description)}`);

    /**
     * PLANTED CONTROL — the shape the REAL code contained until C5-7's review: an update that spreads the whole
     * patch. The three greens above must be measurements of the drop, not of patches that never carried the key.
     * ⛔ It is a plain object spread, so it PARSES by construction; a control that only produces a syntax error
     * is not a caught defect.
     */
    const preFix = (row: Any, patch: Any) => ({ ...row, ...patch });
    const pA = preFix(await raw(marked.id), patchA);
    const pB = preFix(await raw(marked.id), patchB);
    const pC = preFix(await raw(looseId), patchC);
    ok("1.4 · PLANTED CONTROL · the pre-fix update (`{ ...row, ...patch }`) DOES re-mark, un-mark and position with these exact patches — so 1.1–1.3 measure the drop and not an empty patch",
      pA.houseBotId === b2.botId && pB.houseBotId === null && pC.positionId === r1.data.positionId,
      `re-marked ${pA.houseBotId === b2.botId} · un-marked ${pB.houseBotId === null} · positioned ${pC.positionId === r1.data.positionId}`);

    // POSITIVE CONTROL for the whole section: an ORDINARY, unmarked ledger row is still fully updatable.
    await w.db.txn.update(looseId, { status: "REVERSED", amlReason: "REHEARSAL PROBE D" } as Any);
    const afterD = await raw(looseId);
    const statusD = (await q(`SELECT "status"::text AS s FROM "Transaction" WHERE id = $1`, [looseId]))[0].s;
    ok("1.5 · POSITIVE CONTROL · an ordinary ledger row still takes an ordinary update in full (status AND amlReason) — a guard that swept in too much would leave every refusal above greener than ever",
      statusD === "REVERSED" && afterD.amlReason === "REHEARSAL PROBE D", `status ${statusD} · amlReason ${JSON.stringify(afterD.amlReason)}`);

    console.log(`     ⭐ THIS IS WHY \`ops:house-bots-remark --apply\` MUST USE RAW SQL: §S3 calls it "the one sanctioned`);
    console.log(`     exception to markers-on-create-only", and §1 is the measurement that says the exception is`);
    console.log(`     genuinely needed — no DAL path can fill that marker, in either direction.`);
  }

  // ══ §2 · THE DRIFT-FREE BASELINE — legs (a), (b), (c) over the fixture above ══════════════════════════════
  section("§2 · the drift-free baseline: what the CURRENT SHA leaves behind, so step 4's population is readable");
  {
    // ── leg (a) ──────────────────────────────────────────────────────────────────────────────────────────
    const a0 = await legA();
    pop(`${positionedTxns} transactions joined to ${markedPositions} marked positions, over a ${SINCE_DAYS}-day Position.placedAt bound`);
    ok("2.a · leg (a) is 0 — the current SHA writes NO unmarked ledger row on a marked position (payouts, refunds, emergency-void refunds and one-sided refunds all carry the marker)",
      a0.length === 0, a0.length === 0 ? "0 rows" : JSON.stringify(a0.slice(0, 5)));

    // PLANTED CONTROL — the exact shape OLD code writes: a payout row on a marked position, unmarked.
    const realPayout = ((await w.txnsFor(r1.data.positionId)) as Any[]).find((t) => t.type === "BET_PAYOUT");
    const plantAId = `txn_reh_plantA_${process.pid}`;
    await w.db.txn.create({ ...realPayout, id: plantAId, providerRef: null, houseBotId: null } as Any);
    const a1 = await legA();
    ok("2.a.c1 · PLANTED CONTROL · a rollback-window payout — the SAME row the pre-merge SHA writes, with no marker — is found by leg (a), exactly once, and named",
      a1.length === 1 && a1[0].txnId === plantAId && a1[0].positionId === r1.data.positionId,
      a1.length === 1 ? `${a1[0].txnId} ${a1[0].type} on ${a1[0].positionId}` : `${a1.length} rows`);
    await cli.query(`DELETE FROM "Transaction" WHERE id = $1`, [plantAId]);
    ok("2.a.c2 · POSITIVE CONTROL · with the plant removed the leg reads 0 again — the green at 2.a is a live measurement, not a query that never matches",
      (await legA()).length === 0);

    // ── leg (b) · CASHOUT on a marked position ───────────────────────────────────────────────────────────
    // ⛔ A 0 here is worth nothing unless a CASHOUT row EXISTS to be missed. So the drill cashes a player out.
    const playerCash = await w.svc.cashOutPosition(seller, sellerBet.data.positionId);
    ok("2.b.p · POSITIVE CONTROL · an ORDINARY player's cash-out on the same market is still ALLOWED and succeeds — the refusal below is the marker's, not a shut door",
      playerCash.ok === true, show(playerCash));
    const houseCash = await w.svc.cashOutPosition(b4.userId, r4.data.positionId);
    ok("2.b.r · ⛔ REFUSED · the house stake on that same open window cannot be cashed out (sanctioned change (e); already pinned by `test:house-bot-money` 1.11/1.12 — driven here so leg (b) sweeps a real population)",
      houseCash.ok === false && houseCash.reason === "exit_window_closed", show(houseCash));
    const cashoutRows = await n1(`SELECT count(*)::int AS n FROM "Transaction" WHERE "type"::text = 'CASHOUT'`);
    const b0 = await legB();
    pop(`${cashoutRows} CASHOUT row(s) in the database · ${b0.length} of them on a marked position`);
    ok("2.b · leg (b) is 0 over a database that DOES contain a cash-out — the current SHA lets no house position be sold",
      cashoutRows >= 1 && b0.length === 0, `cashouts ${cashoutRows} · on marked ${b0.length}`);

    // PLANTED CONTROL — what old code does: a CASHOUT row against a marked position.
    const realCash = ((await w.db.txn.listAll()) as Any[]).find((t) => t.type === "CASHOUT");
    const plantBId = `txn_reh_plantB_${process.pid}`;
    await w.db.txn.create({ ...realCash, id: plantBId, providerRef: null, positionId: r4.data.positionId, houseBotId: null } as Any);
    const b1rows = await legB();
    ok("2.b.c1 · PLANTED CONTROL · a CASHOUT written against a MARKED position is found by leg (b), exactly once",
      b1rows.length === 1 && b1rows[0].txnId === plantBId, b1rows.length === 1 ? `${b1rows[0].txnId} on ${b1rows[0].positionId}` : `${b1rows.length} rows`);
    await cli.query(`DELETE FROM "Transaction" WHERE id = $1`, [plantBId]);
    ok("2.b.c2 · POSITIVE CONTROL · with the plant removed leg (b) reads 0 again", (await legB()).length === 0);

    // ── leg (c1) · AGENT_COMMISSION as a LEDGER row ──────────────────────────────────────────────────────
    const commissionTxns = (await w.db.txn.findByUser(agent, 500)) as Any[];
    const commissionRows = commissionTxns.filter((t) => t.type === "AGENT_COMMISSION");
    const allCommission = await q(`SELECT id, "positionId" FROM "Transaction" WHERE "type"::text = 'AGENT_COMMISSION'`);
    const withPosition = allCommission.filter((r) => r.positionId != null);
    pop(`${allCommission.length} AGENT_COMMISSION row(s) in the database · ${withPosition.length} of them carry a positionId`);
    ok("2.c1.p · POSITIVE CONTROL · the recruited player's settlement DID pay the agent a real AGENT_COMMISSION — the commission path is live in this fixture, so a 0 below is not a 0 over silence",
      commissionRows.length >= 1, `${commissionRows.length} row(s), amounts ${JSON.stringify(commissionRows.map((t) => t.amount))}`);
    ok("2.c1 · leg (c1) is 0 — no AGENT_COMMISSION ledger row names a marked position",
      (await legC1()).length === 0);
    /**
     * 🔴 AND THE REASON IT IS 0 IS NOT THE ONE THE LEG ASSUMES. Every AGENT_COMMISSION row on this platform is
     * written by `creditInternal` (`wallet-service.ts`, `positionId: null`), and nothing else writes that type —
     * so leg (c1)'s join `t."positionId" = p."id"` can never match ANY row, drifted or not. This is measured,
     * not argued: the count above is of every such row in the database, including the one the agent was just paid.
     */
    ok("2.c1.x · ⛔ MEASURED · EVERY AGENT_COMMISSION row in the database carries positionId NULL, so leg (c1) is structurally incapable of returning a row — its 0 is a 0 over an empty population, and leg (c2) is the only half of (c) that can find commission",
      allCommission.length >= 1 && withPosition.length === 0,
      `${allCommission.length} commission row(s), ${withPosition.length} with a positionId`);
    // PLANTED CONTROL — the SQL itself works; it is the data that can never take this shape.
    const plantC1Id = `txn_reh_plantC1_${process.pid}`;
    await w.db.txn.create({ ...commissionRows[0], id: plantC1Id, providerRef: null, positionId: r1.data.positionId } as Any);
    const c1rows = await legC1();
    ok("2.c1.c1 · PLANTED CONTROL · an AGENT_COMMISSION row given a marked position IS found by leg (c1) — the query is sound; it is the schema that starves it",
      c1rows.length === 1 && c1rows[0].txnId === plantC1Id, c1rows.length === 1 ? `${c1rows[0].txnId}` : `${c1rows.length} rows`);
    await cli.query(`DELETE FROM "Transaction" WHERE id = $1`, [plantC1Id]);
    ok("2.c1.c2 · POSITIVE CONTROL · with the plant removed leg (c1) reads 0 again", (await legC1()).length === 0);

    // ── leg (c2) · the ReferralReward row, found by its deterministic sourceRef ──────────────────────────
    const recruitRef = `referral:commission:${m1.market.id}:${rr.data.positionId}`;
    const houseRef = `referral:commission:${m1.market.id}:${r1.data.positionId}`;
    const realReward = await w.db.referralReward.findBySourceRef(recruitRef);
    const houseReward = await w.db.referralReward.findBySourceRef(houseRef);
    ok("2.c2.p · POSITIVE CONTROL · the ORDINARY recruited player's position produced a commission reward row under exactly the sourceRef leg (c2) rebuilds — the shape is real and findable",
      !!realReward, realReward ? `${realReward.id} ${realReward.sourceRef}` : `nothing at ${recruitRef}`);
    ok("2.c2.r · ⛔ REFUSED · the HOLDER's marked position — same agent, same market, same settlement — produced NO reward row at all (04 A17)",
      houseReward === null, houseReward ? JSON.stringify(houseReward) : "none");
    ok("2.c2 · leg (c2) is 0 — no referral reward names a marked position", (await legC2()).length === 0);
    const plantC2Id = `rr_reh_plantC2_${process.pid}`;
    await w.db.referralReward.create({ ...realReward, id: plantC2Id, sourceRef: houseRef } as Any);
    const c2rows = await legC2();
    ok("2.c2.c1 · PLANTED CONTROL · a reward row whose sourceRef names the MARKED position is found by leg (c2), exactly once",
      c2rows.length === 1 && c2rows[0].rewardId === plantC2Id, c2rows.length === 1 ? `${c2rows[0].rewardId} ${c2rows[0].sourceRef}` : `${c2rows.length} rows`);
    await cli.query(`DELETE FROM "ReferralReward" WHERE id = $1`, [plantC2Id]);
    ok("2.c2.c2 · POSITIVE CONTROL · with the plant removed leg (c2) reads 0 again", (await legC2()).length === 0);

    // ── the whole law, in one number ─────────────────────────────────────────────────────────────────────
    const total = await driftTotal();
    ok("2.total · §S3's re-release law is satisfied on this database: every leg 0, over a population this run filled with real money movement",
      total === 0, `drift total ${total}`);
  }

  // ══ §3 · WAGERING — the half of leg (c) no query can ever see ═════════════════════════════════════════════
  section("§3 · wagering: unmeasurable in SQL for ever, so it is DRIVEN instead");
  {
    console.log(`     ⛔ \`BonusGrant\` has no \`positionId\` and no marker. "Wagering on a marked position" cannot be`);
    console.log(`     expressed as a join on this schema, which is why §10 makes the ops script print that half of`);
    console.log(`     leg (c) as UNMEASURABLE rather than 0 — a 0 there would be a true measurement of the wrong`);
    console.log(`     population. The only remaining defence is that the current code never accrues it.`);
    const grantCols = await q(`SELECT column_name FROM information_schema.columns WHERE table_name = 'BonusGrant'`);
    const names = grantCols.map((r) => String(r.column_name));
    pop(`${names.length} columns on "BonusGrant" · positionId present: ${names.includes("positionId")} · houseBotId present: ${names.includes("houseBotId")}`);
    ok("3.0 · ⛔ MEASURED, not assumed · \"BonusGrant\" carries neither `positionId` nor `houseBotId`, so no drift query can attribute turnover to a house stake",
      !names.includes("positionId") && !names.includes("houseBotId"), names.join(","));

    const wagered1 = wageredAfterHouse;
    ok("3.1 · ⛔ REFUSED · the holder placed a 5,000 HOUSE stake while holding an ACTIVE grant, and the grant's turnover counter did not move (H6 / PLAN I7: the turnover is not his)",
      wagered0 >= 0 && wagered1 === wagered0, `wageredTzs ${wagered0} → ${wagered1}`);

    // POSITIVE CONTROL — the SAME account, the SAME grant, an ordinary bet of his own on a different market.
    // ⛔ A different market on purpose: a bet on the opposite side of one he already holds is a HEDGE, and
    // `buyPositionInner` skips wagering for a hedge too — a control that tripped that rule would prove nothing.
    const m5 = await w.poll({ graceMin: 0 });
    const own = await w.svc.buyPosition(holder1, { marketId: m5.id, side: "YES", stake: 5_000, idempotencyKey: crypto.randomUUID() });
    const wagered2 = await wageredNow();
    ok("3.2 · POSITIVE CONTROL · the SAME holder's OWN 5,000 player bet on a different market DOES accrue turnover against the SAME grant — the skip is keyed on the house marker, not on the account",
      own.ok === true && wagered2 === wagered1 + 5_000, `${show(own)} · wageredTzs ${wagered1} → ${wagered2}`);

    // And the reversal side: §S3's hazard is that old code reverses wagering on a house refund it should not touch.
    const gAfterVoid = await n1(`SELECT count(*)::int AS n FROM "BonusGrant" WHERE "wageredTzs" < 0`);
    ok("3.3 · no grant anywhere carries negative turnover after two voids and an emergency void — no house refund reversed wagering that never accrued (04 A17)",
      gAfterVoid === 0, `${gAfterVoid} grant(s) below zero`);
  }

  if (bonusBefore === undefined) delete process.env.FEATURE_BONUS; else process.env.FEATURE_BONUS = bonusBefore;
} finally {
  if (cli) await cli.end().catch(() => {});
  // Close Prisma's pool BEFORE the drop: `DROP DATABASE … WITH (FORCE)` terminates its backends, and the client
  // prints a page of FATAL 57P01 lines that read like a failure and are not one.
  if (prismaRef) await prismaRef.$disconnect().catch(() => {});
  const drop = new pg.Client({ connectionString: RAW });
  await drop.connect();
  await drop.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`).catch(() => {});
  await drop.end();
  console.log(`\nscratch database ${DB} dropped. (Only this run's own database is ever touched.)`);
}

// ══ §4 · WHAT THIS DRILL DID NOT MEASURE ════════════════════════════════════════════════════════════════════
section("§4 · ⛔ NOT MEASURED — named, so nobody has to decide about a checklist row on the day");
console.log(`   step 2 · BOOT THE PRE-MERGE SHA, settle, cash one house position out.`);
console.log(`            A second worktree checked out before the house commits, with its own node_modules and a`);
console.log(`            Prisma client that has no \`houseBotId\`. Installing dependencies is outside what any lane`);
console.log(`            may do here, and simulating old code by hand would rehearse §2 over again, not a rollback.`);
console.log(`   steps 4–7 · \`ops:house-bots-status -- --drift\`, then \`ops:house-bots-remark\` dry, \`--apply\`, and`);
console.log(`            \`--apply\` a second time for 0 rows. Both are keys on origin/ops-lane only. §0 above arms`);
console.log(`            itself the moment that file lands in this tree.`);
console.log(`   step 8 · the house book's realised figure read back against the ledger, AFTER a remark.`);
console.log(`   ⭐ The ten-step procedure, with what each step must PRINT: plans/house-bots/RELEASE-LADDER.md §10.`);
notMeasured += 3;

console.log(`\n${fail === 0 ? "no failures" : "FAILURES"} — rehearsal 2 (rollback): ${pass} passed, ${fail} failed, ${notMeasured} step(s) NOT MEASURED`);
console.log(`@@SUMMARY ${JSON.stringify({ pass, fail, notMeasured })}`);
if (fail > 0) process.exit(1);
console.log(`\n⛔ NOT MEASURED — the slices above are green, and the drill is NOT discharged. It exits 3 on purpose:`);
console.log(`   a rehearsal that reports PASS while three of its steps were never taken is exactly the row this`);
console.log(`   register was built to stop existing.`);
process.exit(3);
