/**
 * Late-bet race-hardening tests (in-memory store; no DATABASE_URL).
 *
 * Proves the GLI-33 late-bet defence in buyPosition: a stake must never land in
 * a market that closed AFTER the pre-lock checks passed. We simulate the race by
 * patching marketStore.get so the target market reads OPEN on the snapshot (1st
 * read) but CLOSED on the in-lock re-read (2nd read) — exactly the window the
 * hardening closes. The bet must be rejected and every shilling (real + the exact
 * bonus allocations) refunded, with no position, txn, or pool change committed.
 *
 * Also unit-tests refundBonusLocked (the lock-free unwind primitive) for exact
 * money conservation.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, getMarket } from "../src/lib/server/market-service.ts";
import { creditBonus, spendBonusLocked, refundBonusLocked } from "../src/lib/server/bonus-service.ts";
import { marketStore } from "../src/lib/server/market-dal.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string, balance: number): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25578${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
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
const bal = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
const bonusBal = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;
async function makeMarket() {
  return createMarket({
    titleEn: "Late-bet market", titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
}

// ── In-flight-close seam: flip the armed market to closed on its 2nd read ─────
const origGet = marketStore.get.bind(marketStore);
let armedId: string | null = null;
const getCount = new Map<string, number>();
marketStore.get = (async (id: string) => {
  const base = await origGet(id);
  if (base && id === armedId) {
    const n = (getCount.get(id) ?? 0) + 1;
    getCount.set(id, n);
    if (n >= 2) return { ...base, selectionClosedAt: new Date(Date.now() - 60_000).toISOString() };
  }
  return base;
}) as typeof marketStore.get;
const arm = (id: string) => { armedId = id; getCount.set(id, 0); };
const disarm = () => { armedId = null; };

// ── A. Normal live bet still commits (regression) ────────────────────────────
{
  await fundedUser("usr_lb_ok", 10_000);
  const m = await makeMarket();
  const r = await buyPosition("usr_lb_ok", { marketId: m.id, side: "YES", stake: 4_000 });
  ok("A: normal bet commits", r.ok, r.ok ? "" : r.error);
  ok("A: balance debited to 6,000", (await bal("usr_lb_ok")) === 6_000, `bal=${await bal("usr_lb_ok")}`);
  const m2 = await getMarket(m.id);
  ok("A: yesPool = 4,000", Number(m2?.yesPool) === 4_000, `yesPool=${m2?.yesPool}`);
}

// ── B. Market closes in-flight (real-funded) → rejected + full refund ─────────
{
  await fundedUser("usr_lb_race", 10_000);
  const m = await makeMarket();
  arm(m.id);
  const r = await buyPosition("usr_lb_race", { marketId: m.id, side: "YES", stake: 4_000 });
  disarm();
  ok("B: in-flight close → rejected", !r.ok);
  ok("B: code SELECTION_CLOSED", !r.ok && r.code === "SELECTION_CLOSED", !r.ok ? r.code : "ok");
  ok("B: real balance fully refunded (10,000)", (await bal("usr_lb_race")) === 10_000, `bal=${await bal("usr_lb_race")}`);
  const m2 = await getMarket(m.id);
  ok("B: pool unchanged (0/0)", Number(m2?.yesPool) === 0 && Number(m2?.noPool) === 0, `y=${m2?.yesPool} n=${m2?.noPool}`);
  ok("B: predictorCount unchanged (0)", Number(m2?.predictorCount) === 0, `pc=${m2?.predictorCount}`);
}

// ── C. Market closes in-flight (bonus-funded) → bonus fully restored ──────────
{
  await fundedUser("usr_lb_bonus", 0);
  await creditBonus("usr_lb_bonus", { amountTzs: 8_000, source: "ADMIN", wagerMultiplier: 5 });
  const m = await makeMarket();
  arm(m.id);
  const r = await buyPosition("usr_lb_bonus", { marketId: m.id, side: "NO", stake: 5_000 });
  disarm();
  ok("C: bonus-funded in-flight → rejected", !r.ok);
  ok("C: bonus fully restored to 8,000", (await bonusBal("usr_lb_bonus")) === 8_000, `bonus=${await bonusBal("usr_lb_bonus")}`);
}

// ── D. refundBonusLocked exactly reverses spendBonusLocked ────────────────────
{
  await fundedUser("usr_lb_refund", 0);
  await creditBonus("usr_lb_refund", { amountTzs: 6_000, source: "ADMIN", wagerMultiplier: 5 });
  const spend = await spendBonusLocked("usr_lb_refund", 4_000);
  ok("D: spent 4,000", spend.spent === 4_000, `spent=${spend.spent}`);
  ok("D: bonus now 2,000", (await bonusBal("usr_lb_refund")) === 2_000, `bonus=${await bonusBal("usr_lb_refund")}`);
  const back = await refundBonusLocked("usr_lb_refund", spend.allocations);
  ok("D: refunded exactly 4,000", back === 4_000, `back=${back}`);
  ok("D: bonus restored to 6,000", (await bonusBal("usr_lb_refund")) === 6_000, `bonus=${await bonusBal("usr_lb_refund")}`);
}

marketStore.get = origGet;
console.log(`\nlate-bet: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
