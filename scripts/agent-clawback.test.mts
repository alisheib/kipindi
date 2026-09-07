/**
 * AGENT CLAWBACK — a VOIDED market takes back every accrual it produced, and nothing else.
 *
 * Commission is a share of the fee the house KEPT. A void refunds every stake, so the house
 * kept nothing — the agent's share of nothing is nothing, and it is reclaimed from the cash
 * balance as `AGENT_COMMISSION_REVERSAL`. ⛔ Overdraw-guarded: a balance never goes negative;
 * the unrecovered part is a SHORTFALL, audited as a debt, never silently forgiven and never
 * silently invented.
 *
 * Red harness: `npm run red:agent-clawback`.
 */
import "./lib/verified-fixtures.mts";
import { db } from "../src/lib/server/store.ts";
import { mkFixtureUser, approveFixtureAgent, cashOf } from "./lib/agent-fixtures.mts";
import { bindRecruit, onRecruitSettlement, clawbackMarketCommission, getAgentDashboard } from "../src/lib/server/affiliate-service.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, extra?: string) => { if (cond) pass++; else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); } };

// ── §1 · two accruals on M and one on N; void M ─────────────────────────────────────────
await mkFixtureUser("cb_agent");
const code = await approveFixtureAgent("cb_agent", { commissionPct: 20 });
await mkFixtureUser("cb_rec");
await bindRecruit({ recruitUserId: "cb_rec", code });
await onRecruitSettlement("cb_rec", { operatorNetFee: 10_000, marketId: "mkt_cb_M", positionId: "pos_cb_1" });
await onRecruitSettlement("cb_rec", { operatorNetFee: 10_000, marketId: "mkt_cb_M", positionId: "pos_cb_2" });
await onRecruitSettlement("cb_rec", { operatorNetFee: 10_000, marketId: "mkt_cb_N", positionId: "pos_cb_3" });
ok("1.setup · three accruals, TZS 6,000 in cash", (await cashOf("cb_agent")) === 6_000, `cash=${await cashOf("cb_agent")}`);

const r1 = await clawbackMarketCommission("mkt_cb_M", "test void");
ok("1.rows · the void reverses exactly the two rows M produced", r1.reversedRows === 2, JSON.stringify(r1));
ok("1.reclaimed · TZS 4,000 reclaimed, no shortfall", r1.reclaimedTzs === 4_000 && r1.shortfallTzs === 0, JSON.stringify(r1));
ok("1.cash · the agent keeps only N's TZS 2,000", (await cashOf("cb_agent")) === 2_000, `cash=${await cashOf("cb_agent")}`);
const rows = await db.referralReward.listByReferrer("cb_agent");
ok("1.status · M's rows are REVERSED with the reason and a timestamp", rows.filter((r) => r.marketId === "mkt_cb_M").every((r) => r.status === "REVERSED" && r.reversedReason === "test void" && !!r.reversedAt), JSON.stringify(rows.map((r) => [r.marketId, r.status])));
ok("1.other · N's row is untouched, still PAID", rows.find((r) => r.marketId === "mkt_cb_N")?.status === "PAID");
const txns = await db.txn.findByUser("cb_agent");
ok("1.txn · two AGENT_COMMISSION_REVERSAL transactions of −TZS 2,000 each (a debit is signed, like every other debit)", txns.filter((t) => t.type === "AGENT_COMMISSION_REVERSAL" && t.amount === -2_000).length === 2, JSON.stringify(txns.map((t) => [t.type, t.amount])));
const dash = await getAgentDashboard("cb_agent");
ok("1.dash · the dashboard shows TZS 4,000 reversed and TZS 2,000 kept", !!dash && dash.reversedTzs === 4_000, JSON.stringify(dash && { reversed: dash.reversedTzs }));
const reversedAudit = getAuditPage({ category: "WALLET", limit: 300 }).filter((e) => e.action === "affiliate.commission.reversed" && e.payload?.marketId === "mkt_cb_M");
ok("1.audit · each reversal is audited", reversedAudit.length === 2, String(reversedAudit.length));

// ── §2 · idempotent — voiding twice reclaims nothing twice ─────────────────────────────
const r2 = await clawbackMarketCommission("mkt_cb_M", "test void again");
ok("2.idempotent · a second clawback reverses 0 rows and reclaims 0", r2.reversedRows === 0 && r2.reclaimedTzs === 0, JSON.stringify(r2));
ok("2.cash · cash unchanged", (await cashOf("cb_agent")) === 2_000);

// ── §3 · SHORTFALL — the agent already withdrew; the balance never goes negative ────────
await mkFixtureUser("cb_agent2");
const code2 = await approveFixtureAgent("cb_agent2", { commissionPct: 20 });
await mkFixtureUser("cb_rec2");
await bindRecruit({ recruitUserId: "cb_rec2", code: code2 });
await onRecruitSettlement("cb_rec2", { operatorNetFee: 10_000, marketId: "mkt_cb_S", positionId: "pos_cb_s1" });
ok("3.setup · TZS 2,000 accrued", (await cashOf("cb_agent2")) === 2_000);
const w = (await db.wallet.findByUserId("cb_agent2"))!;
await db.wallet.update(w.id, { balance: 500 });
const r3 = await clawbackMarketCommission("mkt_cb_S", "void after withdrawal");
ok("3.partial · TZS 500 recovered, TZS 1,500 shortfall", r3.reclaimedTzs === 500 && r3.shortfallTzs === 1_500 && r3.reversedRows === 1, JSON.stringify(r3));
ok("3.floor · the balance stops at zero — never negative", (await cashOf("cb_agent2")) === 0, `cash=${await cashOf("cb_agent2")}`);
ok("3.row · the row is still REVERSED (the debt is the platform's to chase, not the ledger's to hide)", (await db.referralReward.listByReferrer("cb_agent2"))[0]?.status === "REVERSED");
const shortAudit = getAuditPage({ category: "COMPLIANCE", limit: 300 }).find((e) => e.action === "affiliate.clawback.shortfall" && e.targetId === "cb_agent2");
ok("3.audit · the shortfall is AUDITED with the owed / recovered / shortfall figures", !!shortAudit && shortAudit.payload?.shortfall === 1_500 && shortAudit.payload?.owed === 2_000, JSON.stringify(shortAudit?.payload));

// ── §4 · CONTROL — a market that produced no accrual reverses nothing ──────────────────
const r4 = await clawbackMarketCommission("mkt_cb_none", "nothing here");
ok("4.control · nothing to reverse, nothing reversed", r4.reversedRows === 0 && r4.reclaimedTzs === 0 && r4.shortfallTzs === 0, JSON.stringify(r4));

// ── §5 · a PENDING (uncredited) accrual reverses without a wallet debit ────────────────
await mkFixtureUser("cb_agent3");
const code3 = await approveFixtureAgent("cb_agent3", { commissionPct: 20 });
await mkFixtureUser("cb_rec3");
await bindRecruit({ recruitUserId: "cb_rec3", code: code3 });
const w3 = (await db.wallet.findByUserId("cb_agent3"))!;
await db.wallet.update(w3.id, { status: "FROZEN" });
await onRecruitSettlement("cb_rec3", { operatorNetFee: 10_000, marketId: "mkt_cb_P", positionId: "pos_cb_p1" });
const pendingRow = (await db.referralReward.listByReferrer("cb_agent3"))[0];
ok("5.setup · a frozen wallet leaves the accrual PENDING (payable), not paid", pendingRow?.status === "PENDING" && (await cashOf("cb_agent3")) === 0, JSON.stringify(pendingRow && pendingRow.status));
const r5 = await clawbackMarketCommission("mkt_cb_P", "void of a pending accrual");
ok("5.reversed · the pending row is reversed with nothing to reclaim and no shortfall", r5.reversedRows === 1 && r5.reclaimedTzs === 0 && r5.shortfallTzs === 0, JSON.stringify(r5));
ok("5.txn · no reversal transaction was written for money that never moved", !(await db.txn.findByUser("cb_agent3")).some((t) => t.type === "AGENT_COMMISSION_REVERSAL"));

console.log(`\nagent-clawback: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
