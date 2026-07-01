/**
 * Bonus-wallet service tests (in-memory store; no DATABASE_URL).
 *
 * Covers the money-safe core: credit, idempotency, FIFO wagering + fulfilment
 * (remainder → real balance + BONUS_CREDIT txn), turnover overflow cascade,
 * spend (bonus-funded bet portion), refund-on-void, expiry, admin cancel, and
 * the invariant bonusBalance == Σ remainingTzs over ACTIVE grants.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import {
  creditBonus,
  recordWagering,
  spendBonus,
  refundBonus,
  expireActiveGrants,
  cancelGrant,
  getBonusSummary,
} from "../src/lib/server/bonus-service.ts";
import { setBonusConfig } from "../src/lib/server/bonus-config.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string, balance = 0): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25577${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}
const real = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
const bonus = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;
/** Invariant check: bonusBalance == Σ remainingTzs over ACTIVE grants. */
async function invariantHolds(uid: string): Promise<boolean> {
  const w = await db.wallet.findByUserId(uid);
  const active = await db.bonusGrant.listActiveByUser(uid);
  const sum = active.reduce((s, g) => s + g.remainingTzs, 0);
  return (w?.bonusBalance ?? 0) === sum;
}

// ── creditBonus: grant created, bonusBalance up, fields correct ──────────────
{
  await fundedUser("usr_b_credit");
  const r = await creditBonus("usr_b_credit", { amountTzs: 10_000, source: "ADMIN", note: "welcome" });
  ok("credit succeeded", r.ok);
  if (r.ok) {
    ok("bonusBalance == 10,000", (await bonus("usr_b_credit")) === 10_000, `bonus=${await bonus("usr_b_credit")}`);
    ok("real balance untouched (0)", (await real("usr_b_credit")) === 0);
    ok("wagerRequired == 50,000 (5×)", r.grant.wagerRequiredTzs === 50_000, `req=${r.grant.wagerRequiredTzs}`);
    ok("status ACTIVE", r.grant.status === "ACTIVE");
    ok("expiresAt set (30d default)", !!r.grant.expiresAt);
    ok("invariant holds", await invariantHolds("usr_b_credit"));
  }
}

// ── creditBonus: idempotent by sourceRef ─────────────────────────────────────
{
  await fundedUser("usr_b_idem");
  const a = await creditBonus("usr_b_idem", { amountTzs: 5_000, source: "REFERRAL", sourceRef: "ref_xyz" });
  const b = await creditBonus("usr_b_idem", { amountTzs: 5_000, source: "REFERRAL", sourceRef: "ref_xyz" });
  ok("first credit ok", a.ok);
  ok("second credit deduped", b.ok && (b as { deduped: boolean }).deduped === true);
  ok("bonusBalance still 5,000 (no double credit)", (await bonus("usr_b_idem")) === 5_000, `bonus=${await bonus("usr_b_idem")}`);
  const grants = await db.bonusGrant.listByUser("usr_b_idem");
  ok("only one grant exists", grants.length === 1, `count=${grants.length}`);
}

// ── recordWagering: partial keeps grant ACTIVE ───────────────────────────────
{
  await fundedUser("usr_b_partial");
  await creditBonus("usr_b_partial", { amountTzs: 10_000, source: "ADMIN" }); // req 50,000
  const w = await recordWagering("usr_b_partial", 20_000);
  ok("no fulfilment at 40%", w.fulfilled.length === 0);
  const g = (await db.bonusGrant.listByUser("usr_b_partial"))[0];
  ok("wageredTzs == 20,000", g.wageredTzs === 20_000, `wagered=${g.wageredTzs}`);
  ok("still ACTIVE", g.status === "ACTIVE");
  ok("bonus still in bonus wallet (10,000)", (await bonus("usr_b_partial")) === 10_000);
  ok("real still 0", (await real("usr_b_partial")) === 0);
}

// ── recordWagering: full fulfilment moves remainder → real + posts txn ────────
{
  await fundedUser("usr_b_fulfil");
  await creditBonus("usr_b_fulfil", { amountTzs: 10_000, source: "ADMIN" }); // req 50,000
  const w = await recordWagering("usr_b_fulfil", 50_000);
  ok("one grant fulfilled", w.fulfilled.length === 1);
  ok("credited 10,000 to real", w.creditedToRealTzs === 10_000, `credited=${w.creditedToRealTzs}`);
  ok("real balance == 10,000", (await real("usr_b_fulfil")) === 10_000, `real=${await real("usr_b_fulfil")}`);
  ok("bonusBalance == 0", (await bonus("usr_b_fulfil")) === 0, `bonus=${await bonus("usr_b_fulfil")}`);
  const g = (await db.bonusGrant.listByUser("usr_b_fulfil"))[0];
  ok("grant FULFILLED", g.status === "FULFILLED" && !!g.fulfilledAt);
  const txns = (await db.txn.findByUser("usr_b_fulfil", 50)).filter((t) => t.type === "BONUS_CREDIT");
  ok("BONUS_CREDIT txn posted for 10,000", txns.length === 1 && txns[0].amount === 10_000, `txns=${txns.length}`);
  ok("invariant holds", await invariantHolds("usr_b_fulfil"));
}

// ── recordWagering: sequential enforcement — second grant QUEUED, activates on fulfilment ──
{
  await fundedUser("usr_b_fifo");
  const g1 = await creditBonus("usr_b_fifo", { amountTzs: 10_000, source: "ADMIN" }); // req 50,000 — ACTIVE
  const g2 = await creditBonus("usr_b_fifo", { amountTzs: 4_000, source: "PROPOSAL" }); // req 20,000 — QUEUED (sequential)
  // Sequential enforcement: only g1 is ACTIVE, so bonusBalance = 10,000 (not 14,000)
  ok("bonusBalance == 10,000 (only active grant)", (await bonus("usr_b_fifo")) === 10_000, `bonus=${await bonus("usr_b_fifo")}`);
  const g2pre = g2.ok ? await db.bonusGrant.findById(g2.grant.id) : null;
  ok("g2 is QUEUED", g2pre?.status === "QUEUED", `status=${g2pre?.status}`);
  // 60,000 turnover: clears g1 (needs 50k), g1 fulfils → activateNextQueued promotes g2
  const w = await recordWagering("usr_b_fifo", 60_000);
  ok("g1 fulfilled", w.fulfilled.length === 1 && (g1.ok && w.fulfilled[0].id === g1.grant.id));
  ok("10,000 moved to real (g1 remainder)", (await real("usr_b_fifo")) === 10_000, `real=${await real("usr_b_fifo")}`);
  const g2row = g2.ok ? await db.bonusGrant.findById(g2.grant.id) : null;
  ok("g2 now ACTIVE (promoted from QUEUED)", g2row?.status === "ACTIVE", `status=${g2row?.status}`);
  ok("bonusBalance == 4,000 (g2 now active)", (await bonus("usr_b_fifo")) === 4_000, `bonus=${await bonus("usr_b_fifo")}`);
  ok("invariant holds", await invariantHolds("usr_b_fifo"));
}

// ── spendBonus: sequential — only active grant is spendable, cap at remaining ──
{
  await fundedUser("usr_b_spend");
  // Sequential: g1 ACTIVE, g2 QUEUED — spend can only touch g1
  const g1 = await creditBonus("usr_b_spend", { amountTzs: 6_000, source: "ADMIN" });
  const g2 = await creditBonus("usr_b_spend", { amountTzs: 4_000, source: "ADMIN" });
  ok("g2 is QUEUED (sequential)", (g2.ok ? (await db.bonusGrant.findById(g2.grant.id))?.status : null) === "QUEUED");
  // Spend 4,000 from g1 (the only ACTIVE grant)
  const s = await spendBonus("usr_b_spend", 4_000);
  ok("spent 4,000 from active grant", s.spent === 4_000, `spent=${s.spent}`);
  ok("one allocation (single active grant)", s.allocations.length === 1 && s.allocations[0].amount === 4_000);
  ok("bonusBalance == 2,000 (g1 remainder)", (await bonus("usr_b_spend")) === 2_000, `bonus=${await bonus("usr_b_spend")}`);
  // spend more than g1's remaining → capped at 2,000
  const s2 = await spendBonus("usr_b_spend", 999_999);
  ok("over-spend capped at remaining 2,000", s2.spent === 2_000, `spent=${s2.spent}`);
  ok("bonusBalance == 0 after full spend", (await bonus("usr_b_spend")) === 0);
  ok("invariant holds", await invariantHolds("usr_b_spend"));
}

// ── refundBonus: restores remaining + bonusBalance; wagering untouched ────────
{
  await fundedUser("usr_b_refund");
  const g = await creditBonus("usr_b_refund", { amountTzs: 10_000, source: "ADMIN" });
  await recordWagering("usr_b_refund", 15_000); // wagered 15k (not fulfilled)
  const s = await spendBonus("usr_b_refund", 4_000); // remaining 6k, bonusBalance 6k
  ok("after spend bonusBalance 6,000", (await bonus("usr_b_refund")) === 6_000);
  const refunded = await refundBonus("usr_b_refund", s.allocations); // void → refund 4k
  ok("refunded 4,000", refunded === 4_000, `refunded=${refunded}`);
  ok("bonusBalance back to 10,000", (await bonus("usr_b_refund")) === 10_000, `bonus=${await bonus("usr_b_refund")}`);
  const grow = g.ok ? await db.bonusGrant.findById(g.grant.id) : null;
  ok("wagering NOT reversed (still 15,000)", grow?.wageredTzs === 15_000, `wagered=${grow?.wageredTzs}`);
  ok("invariant holds", await invariantHolds("usr_b_refund"));
}

// ── fulfilment AFTER spend: only the unspent remainder converts ──────────────
{
  await fundedUser("usr_b_spendfulfil");
  await creditBonus("usr_b_spendfulfil", { amountTzs: 10_000, source: "ADMIN" }); // req 50k
  await spendBonus("usr_b_spendfulfil", 4_000); // remaining 6k
  const w = await recordWagering("usr_b_spendfulfil", 50_000);
  ok("fulfilled", w.fulfilled.length === 1);
  ok("only 6,000 (unspent) moved to real", (await real("usr_b_spendfulfil")) === 6_000, `real=${await real("usr_b_spendfulfil")}`);
  ok("bonusBalance 0 after fulfil", (await bonus("usr_b_spendfulfil")) === 0);
}

// ── expireActiveGrants: removes remainder, marks EXPIRED ──────────────────────
{
  await fundedUser("usr_b_expire");
  const g = await creditBonus("usr_b_expire", { amountTzs: 8_000, source: "ADMIN", expiryDays: 30 });
  // backdate expiry to the past
  if (g.ok) await db.bonusGrant.update(g.grant.id, { expiresAt: new Date(Date.now() - 1000).toISOString() });
  const res = await expireActiveGrants();
  ok("at least one grant expired", res.expired >= 1, `expired=${res.expired}`);
  ok("bonusBalance == 0 after expiry", (await bonus("usr_b_expire")) === 0, `bonus=${await bonus("usr_b_expire")}`);
  const grow = g.ok ? await db.bonusGrant.findById(g.grant.id) : null;
  ok("grant EXPIRED, remaining 0", grow?.status === "EXPIRED" && grow?.remainingTzs === 0);
  ok("real balance still 0 (expiry never pays out)", (await real("usr_b_expire")) === 0);
}

// ── cancelGrant: admin removes an active grant ───────────────────────────────
{
  await fundedUser("usr_b_cancel");
  const g = await creditBonus("usr_b_cancel", { amountTzs: 7_000, source: "PROMOTION" });
  const c = g.ok ? await cancelGrant(g.grant.id, "admin_ali", "test cancel") : { ok: false };
  ok("cancel ok, removed 7,000", c.ok && (c as { removedTzs: number }).removedTzs === 7_000);
  ok("bonusBalance == 0 after cancel", (await bonus("usr_b_cancel")) === 0);
  const grow = g.ok ? await db.bonusGrant.findById(g.grant.id) : null;
  ok("grant CANCELLED", grow?.status === "CANCELLED");
  // cancelling again fails
  const c2 = g.ok ? await cancelGrant(g.grant.id, "admin_ali") : { ok: true };
  ok("re-cancel rejected", !c2.ok);
}

// ── config override: per-grant multiplier + summary ──────────────────────────
{
  await fundedUser("usr_b_cfg");
  const g = await creditBonus("usr_b_cfg", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 3 });
  ok("custom multiplier → req 30,000", g.ok && g.grant.wagerRequiredTzs === 30_000, `req=${g.ok ? g.grant.wagerRequiredTzs : "?"}`);
  const sum = await getBonusSummary("usr_b_cfg");
  ok("summary bonusBalance 10,000", sum.bonusBalance === 10_000);
  ok("summary activeCount 1", sum.activeCount === 1);
  ok("summary grant progress 0%", sum.grants[0]?.progressPct === 0);
}

// ── disabled program rejects new credits ─────────────────────────────────────
{
  await fundedUser("usr_b_disabled");
  setBonusConfig({ enabled: false }, "admin_ali");
  const r = await creditBonus("usr_b_disabled", { amountTzs: 5_000, source: "ADMIN" });
  ok("credit rejected when disabled", !r.ok && (r as { code: string }).code === "DISABLED");
  setBonusConfig({ enabled: true }, "admin_ali");
  const r2 = await creditBonus("usr_b_disabled", { amountTzs: 5_000, source: "ADMIN" });
  ok("credit ok after re-enable", r2.ok);
}

console.log(`\nbonus-service: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
