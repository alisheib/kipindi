/**
 * NO DOUBLE PAY — one settled position, one accrual, forever.
 *
 * 🔴 Settlement is RESUMABLE, and before `sourceRef` the commission hook had no idempotency key:
 * a replayed settlement paid the agent twice. The key is `referral:commission:<market>:<position>`,
 * UNIQUE in Postgres and re-read under the per-(referrer, recruit) lock in memory, so a replay,
 * a retry and a genuine race all resolve to ONE row.
 *
 * Red harness: `npm run red:no-double-pay`.
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, cashOf } from "./lib/agent-fixtures.mts";
import { bindRecruit, onRecruitSettlement } from "../src/lib/server/affiliate-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => { if (cond) pass++; else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };

await mkFixtureUser("ndp_agent");
const code = await approveFixtureAgent("ndp_agent", { commissionPct: 20 });
await mkFixtureUser("ndp_rec");
const bound = await bindRecruit({ recruitUserId: "ndp_rec", code });
ok("0.setup · the recruit is bound", bound.bound === true, JSON.stringify(bound));
const rows = async () => db.referralReward.listByReferrer("ndp_agent");

// ── §1 · the same position settled twice in sequence ─────────────────────────────────────
await onRecruitSettlement("ndp_rec", { operatorNetFee: 10_000, marketId: "mkt_ndp_1", positionId: "pos_ndp_1" });
await onRecruitSettlement("ndp_rec", { operatorNetFee: 10_000, marketId: "mkt_ndp_1", positionId: "pos_ndp_1" });
ok("1.once · a replayed settlement credits ONCE — TZS 2,000, not 4,000", (await cashOf("ndp_agent")) === 2_000, `cash=${await cashOf("ndp_agent")}`);
ok("1.row · exactly one row", (await rows()).length === 1, String((await rows()).length));
ok("1.key · the row carries the deterministic key", (await rows())[0]?.sourceRef === "referral:commission:mkt_ndp_1:pos_ndp_1", String((await rows())[0]?.sourceRef));

// ── §2 · a genuine race — three concurrent settlements of one position ───────────────────
await Promise.all([
  onRecruitSettlement("ndp_rec", { operatorNetFee: 10_000, marketId: "mkt_ndp_2", positionId: "pos_ndp_2" }),
  onRecruitSettlement("ndp_rec", { operatorNetFee: 10_000, marketId: "mkt_ndp_2", positionId: "pos_ndp_2" }),
  onRecruitSettlement("ndp_rec", { operatorNetFee: 10_000, marketId: "mkt_ndp_2", positionId: "pos_ndp_2" }),
]);
ok("2.race · three concurrent settlements of one position credit once", (await cashOf("ndp_agent")) === 4_000, `cash=${await cashOf("ndp_agent")}`);
ok("2.rows · two rows in total (one per position)", (await rows()).length === 2, String((await rows()).length));

// ── §3 · CONTROL — a DIFFERENT position on the same market pays again ────────────────────
await onRecruitSettlement("ndp_rec", { operatorNetFee: 10_000, marketId: "mkt_ndp_2", positionId: "pos_ndp_3" });
ok("3.control · a second position on the same market is a second accrual", (await cashOf("ndp_agent")) === 6_000, `cash=${await cashOf("ndp_agent")}`);
ok("3.rows · three rows", (await rows()).length === 3);
ok("3.keys · every key is distinct", new Set((await rows()).map((r) => r.sourceRef)).size === 3);

// ── §4 · the key is per POSITION, not per market — the same position id on another market is another key ──
await onRecruitSettlement("ndp_rec", { operatorNetFee: 10_000, marketId: "mkt_ndp_3", positionId: "pos_ndp_3" });
ok("4.market · the key includes the market, so a position id reused elsewhere is not a collision", (await rows()).length === 4);

// ── §5 · a replay with a DIFFERENT amount still loses — the first write is the truth ─────
await onRecruitSettlement("ndp_rec", { operatorNetFee: 999_999, marketId: "mkt_ndp_1", positionId: "pos_ndp_1" });
ok("5.amount · a replay cannot re-price an accrual", (await rows()).find((r) => r.sourceRef === "referral:commission:mkt_ndp_1:pos_ndp_1")?.amountTzs === 2_000);
ok("5.cash · …and cash is unchanged", (await cashOf("ndp_agent")) === 8_000, `cash=${await cashOf("ndp_agent")}`);

console.log(`\nno-double-pay: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
