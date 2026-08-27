/**
 * `npm run test:bonus-relock` — E-224 · THE BONUS RE-LOCK. In-memory store, no DATABASE_URL.
 *
 *   npx tsx scripts/bonus-relock.test.mts
 *
 * ── THE DEFECT THIS SUITE EXISTS FOR ──────────────────────────────────────────────────────
 * A player held a 2,000 bonus at 1× turnover, staked the whole 2,000 on a real market, and AT
 * THE MOMENT OF PLACEMENT the platform counted the turnover, marked the grant FULFILLED and
 * credited the bonus as real withdrawable cash. Then the market came back VOID — nobody took
 * the other side — and the stake was refunded in full. **The player ended 2,000 up, with a
 * cleared bonus, having risked nothing.** Measured on production 2026-08-26 by `qa:bonus-j`.
 *
 * ⛔ THE ROOT CAUSE WAS NOT A CONDITION ANYONE COULD SEE. `reverseWageringCore` iterated
 * `db.bonusGrant.listActiveByUser`, and that DAL method is literally `where: { userId, status:
 * "ACTIVE" }` — so a FULFILLED grant was INVISIBLE TO THE QUERY. Its docstring asserted that a
 * grant "already FULFILLED from legitimate turnover is left untouched (its cash is real)", and
 * that is precisely the assumption that failed: the bet which COMPLETED the wagering may be the
 * very one later refunded.
 *
 * ⭐ ALI RULED, 2026-08-26: "A RETURNED STAKE DOES NOT DISCHARGE A WAGERING OBLIGATION — AND
 * NOTHING IS EVER CLAWED BACK. THE BONUS IS RE-LOCKED, NOT TAKEN." Both obvious fixes are
 * wrong and knowing why is the design: a CLAWBACK punishes a player whose market went one-sided
 * through no fault of theirs and reverses a payment; DOING NOTHING leaves the gap. Re-locking is
 * neither — the player keeps every shilling and the obligation simply is not discharged by a
 * wager that, in the end, did not happen.
 *
 * ── ⭐ WHAT MAKES THIS A PROOF RATHER THAN A DESCRIPTION ───────────────────────────────────
 * The RED harness (`npm run red:bonus-relock`) MUTATES THE FIX, NOT THE DEFECT. Its first and
 * most important mutation re-points `reverseWageringCore` back at `listActiveByUser` — the
 * original one-line cause. ⛔ A proof that still passes when the FULFILLED branch is deleted is
 * measuring nothing, so §1.5 and §1.8 are written to die on exactly that edit.
 *
 * ⚠️ EVERY MONEY CLAIM IS READ FROM `Wallet` / `BonusGrant` / `Transaction`, never from a
 * rendered number, and the audit assertions snapshot the ring BEFORE the action and assert on
 * the DELTA — the log is append-only, so "does a row exist?" would pass for ever on the row the
 * first run wrote (§7.6).
 */
import { db, type StoredWallet, type StoredBonusGrant } from "../src/lib/server/store.ts";
import {
  creditBonus,
  recordWagering,
  reverseWagering,
  cancelGrant,
  expireActiveGrants,
  getAdminBonusStats,
  getBonusSummary,
} from "../src/lib/server/bonus-service.ts";
import { setBonusConfig } from "../src/lib/server/bonus-config.ts";
import { auditFlush, getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`  PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`  FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function player(id: string, balance = 0): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25576${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
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
const bonusBal = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;
const holdings = async (uid: string) => (await real(uid)) + (await bonusBal(uid));
const oneGrant = async (uid: string): Promise<StoredBonusGrant> => (await db.bonusGrant.listByUser(uid))[0];
const grantById = async (uid: string, id: string): Promise<StoredBonusGrant | undefined> =>
  (await db.bonusGrant.listByUser(uid)).find((g) => g.id === id);

/** The invariant the whole module preserves: bonusBalance == Σ remainingTzs over ACTIVE grants. */
async function invariantHolds(uid: string): Promise<boolean> {
  const w = await db.wallet.findByUserId(uid);
  const active = await db.bonusGrant.listActiveByUser(uid);
  return (w?.bonusBalance ?? 0) === active.reduce((s, g) => s + g.remainingTzs, 0);
}

/** ⛔ A RUN BOUNDARY. The audit log is append-only and rows never age out, so an assertion of
 *  the form "does a bonus.relocked row exist?" passes for ever on the row the FIRST run wrote.
 *  Snapshot the ids, act, then assert only on what is new. */
function auditMark(): Set<string> {
  return new Set(getAuditPage({ limit: 2000 }).map((e) => e.id));
}
async function auditSince(mark: Set<string>, action: string) {
  await auditFlush();
  return getAuditPage({ limit: 2000 }).filter((e) => !mark.has(e.id) && e.action === action);
}

setBonusConfig({ enabled: true } as never);

// ═══════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§1 · THE DEFECT E-224 EXISTED FOR — a refunded qualifying bet no longer clears the bonus");
// ═══════════════════════════════════════════════════════════════════════════════════════════
{
  await player("relock_core", 0);
  const c = await creditBonus("relock_core", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 1 });
  ok("1.1 · setup · a 10,000 bonus at 1× turnover is ACTIVE, and the bonus wallet holds it",
     c.ok && (await bonusBal("relock_core")) === 10_000 && (await real("relock_core")) === 0,
     `bonus=${await bonusBal("relock_core")} real=${await real("relock_core")}`);

  // The qualifying bet. 1× means a single 10,000 of turnover crosses the line — this is the
  // magnitude that makes the whole bonus free, not just the final bet.
  await recordWagering("relock_core", 10_000);
  const g1 = await oneGrant("relock_core");
  ok("1.2 · the qualifying turnover FULFILS the grant",
     g1.status === "FULFILLED" && g1.wageredTzs === 10_000, `status=${g1.status} wagered=${g1.wageredTzs}`);
  ok("1.3 · ★ and the remainder became REAL, withdrawable cash",
     (await real("relock_core")) === 10_000 && (await bonusBal("relock_core")) === 0,
     `real=${await real("relock_core")} bonus=${await bonusBal("relock_core")}`);
  ok("1.4 · ⭐ THE FIX · a FULFILLED grant KEEPS remainingTzs — the only record of what it converted",
     g1.remainingTzs === 10_000,
     `remaining=${g1.remainingTzs} — if this is 0, fulfilment erased the number the re-lock needs`);

  const holdingsBefore = await holdings("relock_core");
  const mark = auditMark();

  // ── The market comes back VOID (or one-sided), and the stake is refunded in full. ─────────
  const reversed = await reverseWagering("relock_core", 10_000);
  const g2 = await oneGrant("relock_core");

  ok("1.5 · ★★ THE REFUND RE-LOCKS IT — the grant is ACTIVE again, not FULFILLED",
     g2.status === "ACTIVE", `status=${g2.status}`);
  ok("1.6 · ⛔ …and the status is ACTIVE, never the ruling's IN_PROGRESS — that value is not in the enum",
     g2.status === "ACTIVE" && (g2.status as string) !== "IN_PROGRESS", `status=${g2.status}`);
  ok("1.7 · ★★ the wagering progress fell BACK BELOW the requirement — that is WHY it re-locked",
     g2.wageredTzs === 0 && g2.wageredTzs < g2.wagerRequiredTzs,
     `wagered=${g2.wageredTzs} required=${g2.wagerRequiredTzs}`);
  ok("1.8 · ★★ and the MONEY moved back — out of withdrawable balance, into the locked bonus wallet",
     (await real("relock_core")) === 0 && (await bonusBal("relock_core")) === 10_000,
     `real=${await real("relock_core")} bonus=${await bonusBal("relock_core")}`);
  ok("1.9 · ★★★ NOTHING WAS CLAWED BACK — total holdings are unchanged to the shilling",
     (await holdings("relock_core")) === holdingsBefore,
     `before=${holdingsBefore} after=${await holdings("relock_core")}`);
  ok("1.10 · the invariant holds · bonusBalance == Σ ACTIVE remainingTzs",
     await invariantHolds("relock_core"));
  ok("1.11 · fulfilment reported the turnover it reversed", reversed === 10_000, `reversed=${reversed}`);

  // ⛔ THE ROW, NOT THE BALANCE. A balance that moved is consistent with a dozen causes; the
  // platform's claim is that THIS movement was a bonus re-lock, and the transaction says so.
  const txns = await db.txn.listForUser("relock_core");
  const debits = txns.filter((t) => t.type === "ADJUSTMENT_DEBIT");
  ok("1.12 · ★★ a player-visible row records it, as a DEBIT of the withdrawable balance",
     debits.length === 1 && debits[0].amount === -10_000 && debits[0].status === "CONFIRMED",
     `n=${debits.length} amount=${debits[0]?.amount} status=${debits[0]?.status}`);
  ok("1.13 · ⛔ …and NOT as a negative BONUS_CREDIT — wallet/page.tsx maps that to \"deposit\" (incoming) and report-money sums its ABSOLUTE value into bonus cost",
     txns.filter((t) => t.type === "BONUS_CREDIT" && t.amount < 0).length === 0,
     `negative BONUS_CREDIT rows = ${txns.filter((t) => t.type === "BONUS_CREDIT" && t.amount < 0).length}`);
  ok("1.14 · the row explains itself in the words the player actually reads (wallet-client renders description ?? type)",
     /re-locked/i.test(debits[0]?.description ?? "") && /wagering/i.test(debits[0]?.description ?? ""),
     debits[0]?.description ?? "(none)");
  ok("1.15 · the ONE bonus unlock is still on the record — the re-lock does not erase history",
     txns.filter((t) => t.type === "BONUS_CREDIT" && t.amount === 10_000).length === 1);

  const rows = await auditSince(mark, "bonus.relocked");
  ok("1.16 · ★★ the re-lock is audited, on the delta rather than on any row a prior run left",
     rows.length === 1, `n=${rows.length}`);
  const p = (rows[0]?.payload ?? {}) as Record<string, unknown>;
  ok("1.17 · …and the audit names the figures — owed, re-locked, and a ZERO shortfall",
     p.owedTzs === 10_000 && p.relockedTzs === 10_000 && p.shortfallTzs === 0,
     JSON.stringify(p));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§2 · ⚠️ THE SHORT RE-LOCK — the player already spent the unlocked cash");
// ⛔ §0e's audit waved this off as \"cannot occur — 12 confirmed withdrawals in history\". That is
// a statement about today's DATA, not about the CODE. Re-lock what exists, audit the shortfall
// BY NAME, and never drive the balance negative. A re-lock that quietly moved less than it
// claimed would be the same class of defect as the one being fixed.
// ═══════════════════════════════════════════════════════════════════════════════════════════
{
  await player("relock_short", 0);
  await creditBonus("relock_short", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 1 });
  await recordWagering("relock_short", 10_000); // FULFILLED → balance 10,000
  // The player spends 6,000 of the unlocked cash before the void lands.
  await db.wallet.adjust(`wal_relock_short`, { balance: -6_000 });
  ok("2.1 · setup · 6,000 of the unlocked cash is already gone — 4,000 of it remains",
     (await real("relock_short")) === 4_000, `real=${await real("relock_short")}`);

  const holdingsBefore = await holdings("relock_short");
  const mark = auditMark();
  await reverseWagering("relock_short", 10_000);
  const g = await oneGrant("relock_short");

  ok("2.2 · ★★ it re-locks what EXISTS — 4,000 — and NEVER drives the balance negative",
     (await real("relock_short")) === 0 && (await bonusBal("relock_short")) === 4_000,
     `real=${await real("relock_short")} bonus=${await bonusBal("relock_short")}`);
  ok("2.3 · ⛔ remainingTzs is the RE-LOCKED figure (4,000), NOT the owed one — setting `owed` here would break the reconciler by exactly the shortfall",
     g.remainingTzs === 4_000, `remaining=${g.remainingTzs}`);
  ok("2.4 · the invariant still holds over a SHORT re-lock", await invariantHolds("relock_short"));
  ok("2.5 · ★ the grant is ACTIVE again, carrying an obligation that is not discharged",
     g.status === "ACTIVE" && g.wageredTzs < g.wagerRequiredTzs,
     `status=${g.status} wagered=${g.wageredTzs}/${g.wagerRequiredTzs}`);
  ok("2.6 · ⛔ nothing was clawed back beyond what was there — total holdings unchanged",
     (await holdings("relock_short")) === holdingsBefore,
     `before=${holdingsBefore} after=${await holdings("relock_short")}`);

  const rows = await auditSince(mark, "bonus.relocked");
  const p = (rows[0]?.payload ?? {}) as Record<string, unknown>;
  ok("2.7 · ★★ THE SHORTFALL IS AUDITED BY NAME — 6,000, visible rather than silently absorbed",
     rows.length === 1 && p.owedTzs === 10_000 && p.relockedTzs === 4_000 && p.shortfallTzs === 6_000,
     JSON.stringify(p));
  const debits = (await db.txn.listForUser("relock_short")).filter((t) => t.type === "ADJUSTMENT_DEBIT");
  ok("2.8 · the player-visible row states the amount that ACTUALLY moved, not the amount owed",
     debits.length === 1 && debits[0].amount === -4_000, `amount=${debits[0]?.amount}`);
}

// ── 2b · the extreme: nothing left at all ─────────────────────────────────────────────────
{
  await player("relock_zero", 0);
  await creditBonus("relock_zero", { amountTzs: 8_000, source: "ADMIN", wagerMultiplier: 1 });
  await recordWagering("relock_zero", 8_000);
  await db.wallet.adjust(`wal_relock_zero`, { balance: -8_000 }); // every shilling withdrawn
  const mark = auditMark();
  await reverseWagering("relock_zero", 8_000);
  const g = await oneGrant("relock_zero");
  ok("2b.1 · ⛔ with NOTHING left to re-lock the balance stays at 0 — never negative",
     (await real("relock_zero")) === 0 && (await bonusBal("relock_zero")) === 0,
     `real=${await real("relock_zero")} bonus=${await bonusBal("relock_zero")}`);
  ok("2b.2 · ★ the obligation still returns to ACTIVE and undischarged — the gap is not written off",
     g.status === "ACTIVE" && g.remainingTzs === 0 && g.wageredTzs === 0,
     `status=${g.status} remaining=${g.remainingTzs} wagered=${g.wageredTzs}`);
  ok("2b.3 · …and no money row is written for a movement of zero",
     (await db.txn.listForUser("relock_zero")).filter((t) => t.type === "ADJUSTMENT_DEBIT").length === 0);
  const rows = await auditSince(mark, "bonus.relocked");
  const p = (rows[0]?.payload ?? {}) as Record<string, unknown>;
  ok("2b.4 · the whole amount is recorded as shortfall", p.shortfallTzs === 8_000, JSON.stringify(p));
  ok("2b.5 · the invariant holds", await invariantHolds("relock_zero"));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§3 · ⭐ POSITIVE CONTROLS — the over-corrections. A fix that re-locks TOO MUCH is also a defect");
// ═══════════════════════════════════════════════════════════════════════════════════════════
{
  // ⭐ THE REGRESSION CONTROL. The overwhelmingly common case is a refund against a grant that
  // has NOT fulfilled: progress must fall and NO money may move. If this breaks, the fix has
  // changed the path every ordinary void takes.
  // ⚠️ FUNDED ON PURPOSE, AND red:bonus-relock IS WHY. With a zero balance the `every-refund-relocks`
  // mutation moved nothing (relock clamps to what exists), so §3.2 passed over a broken platform
  // and only the invariant check caught it. A control needs money in play to be a control.
  await player("relock_control_active", 30_000);
  await creditBonus("relock_control_active", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 }); // req 50,000
  await recordWagering("relock_control_active", 20_000);
  const before = { real: await real("relock_control_active"), bonus: await bonusBal("relock_control_active") };
  const mark = auditMark();
  await reverseWagering("relock_control_active", 5_000);
  const g = await oneGrant("relock_control_active");
  ok("3.1 · ⭐ CONTROL · an ACTIVE grant reverses EXACTLY as before — progress only, 20,000 → 15,000",
     g.status === "ACTIVE" && g.wageredTzs === 15_000, `status=${g.status} wagered=${g.wageredTzs}`);
  ok("3.2 · ⛔ …and NO money moved — the common path is untouched by this fix",
     (await real("relock_control_active")) === before.real && (await bonusBal("relock_control_active")) === before.bonus,
     `real ${before.real}→${await real("relock_control_active")} bonus ${before.bonus}→${await bonusBal("relock_control_active")}`);
  ok("3.3 · ⛔ …and NO adjustment row was written",
     (await db.txn.listForUser("relock_control_active")).filter((t) => t.type === "ADJUSTMENT_DEBIT").length === 0);
  ok("3.4 · ⛔ …and nothing was audited as a re-lock",
     (await auditSince(mark, "bonus.relocked")).length === 0);
  ok("3.5 · the invariant holds", await invariantHolds("relock_control_active"));
}
{
  // ⭐ CONTROL · a FULFILLED grant whose turnover stays AT OR ABOVE the requirement after the
  // reversal must NOT re-lock — the obligation is still met. Reached with a white-box fixture
  // because the normal path caps wageredTzs at exactly the requirement, so this branch is
  // defence-in-depth against legacy rows and lowered requirements rather than a live case.
  await player("relock_control_over", 0);
  await creditBonus("relock_control_over", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 1 });
  await recordWagering("relock_control_over", 10_000); // FULFILLED at exactly 10,000
  await db.bonusGrant.update((await oneGrant("relock_control_over")).id, { wageredTzs: 15_000 });
  const before = { real: await real("relock_control_over"), bonus: await bonusBal("relock_control_over") };
  await reverseWagering("relock_control_over", 3_000);
  const g = await oneGrant("relock_control_over");
  ok("3.6 · ⭐ CONTROL · turnover still ABOVE the requirement after reversal → the grant stays FULFILLED",
     g.status === "FULFILLED" && g.wageredTzs === 12_000, `status=${g.status} wagered=${g.wageredTzs}`);
  ok("3.7 · ⛔ …and no money moved for it",
     (await real("relock_control_over")) === before.real && (await bonusBal("relock_control_over")) === before.bonus,
     `real=${await real("relock_control_over")} bonus=${await bonusBal("relock_control_over")}`);
}
{
  // ⭐ CONTROL · a reversal of nothing does nothing.
  await player("relock_control_noop", 0);
  await creditBonus("relock_control_noop", { amountTzs: 5_000, source: "ADMIN", wagerMultiplier: 1 });
  await recordWagering("relock_control_noop", 5_000);
  const g0 = await oneGrant("relock_control_noop");
  const r = await reverseWagering("relock_control_noop", 0);
  const g = await oneGrant("relock_control_noop");
  ok("3.8 · ⭐ CONTROL · reversing 0 reverses nothing and re-locks nothing",
     r === 0 && g.status === "FULFILLED" && g.wageredTzs === g0.wageredTzs,
     `reversed=${r} status=${g.status}`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§4 · ⛔ EXPIRED AND CANCELLED ARE *REMOVED*, NOT CONVERTED — they must never re-lock");
// The asymmetry is the whole safety argument for preserving remainingTzs on fulfilment. On
// expiry or cancellation the remainder is taken OUT of the player's holdings; there is nothing
// to return, and a grant that resurrected itself on a later refund would mint bonus money.
// ═══════════════════════════════════════════════════════════════════════════════════════════
{
  await player("relock_cancelled", 0);
  const c = await creditBonus("relock_cancelled", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 1 });
  await recordWagering("relock_cancelled", 5_000); // partial progress, still ACTIVE
  const gid = (await oneGrant("relock_cancelled")).id;
  const cancelled = await cancelGrant(gid, "admin_test", "test cancel");
  ok("4.1 · setup · the grant is CANCELLED and its remainder was REMOVED — remainingTzs 0",
     c.ok && cancelled.ok && (await grantById("relock_cancelled", gid))?.status === "CANCELLED"
     && (await grantById("relock_cancelled", gid))?.remainingTzs === 0
     && (await bonusBal("relock_cancelled")) === 0,
     `status=${(await grantById("relock_cancelled", gid))?.status} remaining=${(await grantById("relock_cancelled", gid))?.remainingTzs} bonus=${await bonusBal("relock_cancelled")}`);

  // ⛔ THE REAL CHECK. The grant still carries 5,000 of wageredTzs, so if CANCELLED were in the
  // reversal population this call would take 5,000 off it, find the progress below the
  // requirement, and RESURRECT the grant to ACTIVE.
  const reversed = await reverseWagering("relock_cancelled", 5_000);
  const g = await grantById("relock_cancelled", gid);
  ok("4.2 · ★★ a later refund does NOT resurrect it — the reversal population excludes CANCELLED",
     reversed === 0 && g?.status === "CANCELLED",
     `reversed=${reversed} status=${g?.status}`);
  ok("4.3 · ⛔ …and no bonus money was minted",
     (await bonusBal("relock_cancelled")) === 0 && (await real("relock_cancelled")) === 0,
     `bonus=${await bonusBal("relock_cancelled")} real=${await real("relock_cancelled")}`);
  ok("4.4 · the invariant holds", await invariantHolds("relock_cancelled"));
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§5 · THE ONE UNFILTERED READER — the admin grant ledger");
// Every other reader of remainingTzs is ACTIVE-scoped (the ledger reconciler, the bonusBalance
// invariant, spendBonus, refundBonusToActive, the expiry sweep, the player wallet page). The
// admin grant ledger had NO status filter, so preserving the field on fulfilment would have
// shown a "remaining bonus" figure against a grant whose money is already real.
// ═══════════════════════════════════════════════════════════════════════════════════════════
{
  await player("relock_admin_full", 0);
  await creditBonus("relock_admin_full", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 1 });
  await recordWagering("relock_admin_full", 10_000); // FULFILLED, remainingTzs preserved at 10,000
  const fulfilledId = (await oneGrant("relock_admin_full")).id;

  await player("relock_admin_active", 0);
  await creditBonus("relock_admin_active", { amountTzs: 7_000, source: "ADMIN", wagerMultiplier: 5 });
  const activeId = (await oneGrant("relock_admin_active")).id;

  const stats = await getAdminBonusStats(5_000);
  const rowF = stats.ledger.find((r) => r.id === fulfilledId);
  const rowA = stats.ledger.find((r) => r.id === activeId);

  ok("5.0 · fixture · both grants reached the operator ledger", !!rowF && !!rowA,
     `fulfilled=${!!rowF} active=${!!rowA}`);
  ok("5.1 · ★★ the FULFILLED grant's remaining figure is SUPPRESSED — null, which the table renders as an em dash",
     rowF?.remainingTzs === null,
     `remainingTzs=${JSON.stringify(rowF?.remainingTzs)} — the underlying grant still holds 10,000, and that is correct`);
  ok("5.2 · …and the grant itself DID keep the figure — 5.1 suppresses the READ, it does not erase the record",
     (await grantById("relock_admin_full", fulfilledId))?.remainingTzs === 10_000);
  ok("5.3 · ⭐ POSITIVE CONTROL · an ACTIVE grant still shows its remaining figure — 5.1 is not a blanket null",
     rowA?.remainingTzs === 7_000, `remainingTzs=${JSON.stringify(rowA?.remainingTzs)}`);
}
{
  // A QUEUED grant genuinely holds its full amount pending activation, so the figure is honest
  // there. Built white-box: this asserts the READER, not the queueing.
  await player("relock_admin_queued", 0);
  await creditBonus("relock_admin_queued", { amountTzs: 3_000, source: "ADMIN", wagerMultiplier: 5 });
  const qid = (await oneGrant("relock_admin_queued")).id;
  await db.bonusGrant.update(qid, { status: "QUEUED" });
  const stats = await getAdminBonusStats(5_000);
  const rowQ = stats.ledger.find((r) => r.id === qid);
  ok("5.4 · a QUEUED grant keeps its honest remaining figure — it really is locked bonus money",
     rowQ?.remainingTzs === 3_000, `remainingTzs=${JSON.stringify(rowQ?.remainingTzs)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§6 · THE POPULATION IS ITS OWN QUERY — and the DAL mirror exists in BOTH stores");
// ⛔ store.ts exports `db` as `memoryDb as unknown as typeof prismaDb` — a BLIND cast. A method
// missing from the in-memory mirror is a runtime TypeError that tsc cannot see, and every suite
// in this directory runs against that mirror. §6.1 is the check that would have caught it.
// ═══════════════════════════════════════════════════════════════════════════════════════════
{
  ok("6.1 · ⛔ listReversibleByUser exists on the store this suite actually runs against",
     typeof db.bonusGrant.listReversibleByUser === "function",
     typeof db.bonusGrant.listReversibleByUser);

  await player("relock_pop", 0);
  await creditBonus("relock_pop", { amountTzs: 4_000, source: "ADMIN", wagerMultiplier: 1 });
  await recordWagering("relock_pop", 4_000);      // grant 1 → FULFILLED
  await creditBonus("relock_pop", { amountTzs: 6_000, source: "ADMIN", wagerMultiplier: 5 });
  const all = await db.bonusGrant.listByUser("relock_pop");
  const revs = await db.bonusGrant.listReversibleByUser("relock_pop");
  const actives = await db.bonusGrant.listActiveByUser("relock_pop");
  ok("6.2 · ★★ the reversal population SEES the FULFILLED grant that listActiveByUser cannot",
     revs.length === 2 && revs.some((g) => g.status === "FULFILLED"),
     `reversible=${revs.map((g) => g.status).join(",")} active=${actives.map((g) => g.status).join(",")}`);
  ok("6.3 · ⛔ …and listActiveByUser was NOT widened — spend, refund and expiry must keep seeing ACTIVE only",
     actives.every((g) => g.status === "ACTIVE"),
     `active statuses = ${actives.map((g) => g.status).join(",")}`);
  ok("6.4 · the population is FIFO oldest-first, which is what lets the caller group and reverse it",
     revs.length === all.length && revs[0].createdAt <= revs[revs.length - 1].createdAt);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§7 · ⛔ THE SECOND UNFILTERED READER — the PLAYER-facing summary");
// ⚠️ THE FIRST DRAFT OF THIS FIX CLAIMED THE ADMIN LEDGER WAS "THE ONE UNFILTERED READER". IT
// WAS WRONG, AND AN ADVERSARIAL RE-READ OF THE DIFF FOUND IT. `getBonusSummary` builds its
// `grants` array from `listByUser` — NO status filter — and `toGrantView` spread remainingTzs
// straight through. The only thing between that and the player was a filter in a DIFFERENT FILE
// (app/wallet/page.tsx) — exactly the arrangement this commit rejected for the admin row.
// Deleting one line there would have shipped the defect with tsc and every bonus suite green.
// ═══════════════════════════════════════════════════════════════════════════════════════════
{
  await player("relock_summary", 0);
  await creditBonus("relock_summary", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 1 });
  await recordWagering("relock_summary", 10_000); // FULFILLED, remainingTzs preserved at 10,000
  const s1 = await getBonusSummary("relock_summary");
  const gv = s1.grants.find((g) => g.status === "FULFILLED");
  ok("7.1 · fixture · the summary returns the FULFILLED grant (listByUser has no status filter)",
     !!gv, `statuses = ${s1.grants.map((g) => g.status).join(",")}`);
  ok("7.2 · ★★ …and its remaining figure is SUPPRESSED AT THE SOURCE, not by a filter in another file",
     gv?.remainingTzs === null, `remainingTzs=${JSON.stringify(gv?.remainingTzs)}`);
  ok("7.3 · …while the underlying grant still HOLDS the figure — the read is suppressed, the record is not",
     (await oneGrant("relock_summary")).remainingTzs === 10_000);

  await player("relock_summary_active", 0);
  await creditBonus("relock_summary_active", { amountTzs: 6_000, source: "ADMIN", wagerMultiplier: 5 });
  const s2 = await getBonusSummary("relock_summary_active");
  ok("7.4 · ⭐ POSITIVE CONTROL · an ACTIVE grant still reports its remaining figure — 7.2 is not a blanket null",
     s2.grants[0]?.remainingTzs === 6_000, `remainingTzs=${JSON.stringify(s2.grants[0]?.remainingTzs)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
console.log("\n§8 · ⛔ THE EXPIRY TRAP — a re-lock must not be swept away by the expiry sweep");
// A grant carries expiresAt = createdAt + defaultExpiryDays. If it FULFILS near that date and a
// refund re-locks it AFTER the date has passed, the grant returns to ACTIVE with a DEAD expiry —
// and expireActiveGrants selects exactly `status = ACTIVE AND expiresAt < now`. The next sweep
// would REMOVE the re-locked money and the player would end with NEITHER the cash NOR the bonus.
// ⛔ That is the clawback the ruling forbids, arriving through a different door. Found by an
// adversarial re-read of the fix, not by the design.
// ═══════════════════════════════════════════════════════════════════════════════════════════
{
  await player("relock_expiry", 0);
  await creditBonus("relock_expiry", { amountTzs: 9_000, source: "ADMIN", wagerMultiplier: 1, expiryDays: 30 });
  await recordWagering("relock_expiry", 9_000); // FULFILLED → 9,000 of real, withdrawable cash
  const gid = (await oneGrant("relock_expiry")).id;
  // Wind the clock forward past the grant expiry, the way 31 real days would.
  const dead = new Date(Date.now() - 86_400_000).toISOString();
  await db.bonusGrant.update(gid, { expiresAt: dead });
  ok("8.1 · fixture · the grant is FULFILLED and its expiry is already in the PAST",
     (await grantById("relock_expiry", gid))?.expiresAt === dead);

  const holdingsBefore = await holdings("relock_expiry");
  await reverseWagering("relock_expiry", 9_000);
  const g = await grantById("relock_expiry", gid);
  ok("8.2 · the refund re-locked it — ACTIVE again, 9,000 back in the bonus wallet",
     g?.status === "ACTIVE" && (await bonusBal("relock_expiry")) === 9_000,
     `status=${g?.status} bonus=${await bonusBal("relock_expiry")}`);
  ok("8.3 · ★★ …and the re-lock RESTARTED THE CLOCK — the expiry is in the future, not inherited dead",
     !!g?.expiresAt && Date.parse(g.expiresAt) > Date.now(),
     `expiresAt=${g?.expiresAt} (was ${dead})`);

  // ⛔ THE CHECK THAT MATTERS. Run the real sweep and see whether the money survives.
  await expireActiveGrants();
  const after = await grantById("relock_expiry", gid);
  ok("8.4 · ★★★ THE EXPIRY SWEEP DOES NOT TAKE IT — the re-locked money survives a real sweep",
     after?.status === "ACTIVE" && (await bonusBal("relock_expiry")) === 9_000,
     `status=${after?.status} bonus=${await bonusBal("relock_expiry")}`);
  ok("8.5 · ★★★ …so the player ends with NEITHER the cash taken NOR the bonus confiscated — holdings unchanged",
     (await holdings("relock_expiry")) === holdingsBefore,
     `before=${holdingsBefore} after=${await holdings("relock_expiry")}`);
  ok("8.6 · the invariant holds after the sweep", await invariantHolds("relock_expiry"));
}
{
  // ⭐ POSITIVE CONTROL · the sweep still WORKS. An ordinary ACTIVE grant past its expiry must
  // still be expired, or 8.4 would be passing because the sweep does nothing at all.
  await player("relock_expiry_control", 0);
  await creditBonus("relock_expiry_control", { amountTzs: 5_000, source: "ADMIN", wagerMultiplier: 5, expiryDays: 30 });
  const cid = (await oneGrant("relock_expiry_control")).id;
  await db.bonusGrant.update(cid, { expiresAt: new Date(Date.now() - 86_400_000).toISOString() });
  await expireActiveGrants();
  const c = await grantById("relock_expiry_control", cid);
  ok("8.7 · ⭐ POSITIVE CONTROL · an ordinary expired ACTIVE grant IS still swept — 8.4 is not a dead sweep",
     c?.status === "EXPIRED" && c?.remainingTzs === 0 && (await bonusBal("relock_expiry_control")) === 0,
     `status=${c?.status} remaining=${c?.remainingTzs} bonus=${await bonusBal("relock_expiry_control")}`);
}

console.log(`\nbonus-relock: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exit(1);
