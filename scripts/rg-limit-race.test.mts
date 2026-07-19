/**
 * Responsible-gambling limit RACE tests (audit C4). Proves the TOCTOU is closed:
 * the deposit cap and the daily loss cap are now re-checked INSIDE the wallet
 * lock, so N genuinely concurrent operations (Promise.all) can no longer each
 * read the pre-op total and all clear a cap only one/some should.
 *
 * Before the fix: 10 concurrent 100k deposits vs a 100k cap all committed (10×
 * the limit — a self-limited problem gambler defeats their own protection by
 * double-tapping). After: exactly one clears.
 *
 * In-memory store; no DATABASE_URL. The in-memory withLock is a real per-process
 * mutex, so this exercises the exact serialization the fix relies on.
 */
import { db, type StoredWallet, type StoredResponsibleGambling } from "../src/lib/server/store.ts";
import { deposit } from "../src/lib/server/wallet-service.ts";
import { buyPosition, createMarket } from "../src/lib/server/market-service.ts";
import { setLimits } from "../src/lib/server/responsible-gambling.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string, balance: number): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    email: `${id}@t.tz`, emailVerifiedAt: now(),
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

// setLimits defers a deposit-cap increase (incl. null→value) 24h, so seed the
// active cap directly — a decrease/seed is what a self-limiting player relies on.
async function seedDepositCap(userId: string, dailyDepositLimit: number): Promise<void> {
  await db.responsible.upsert({
    userId,
    dailyDepositLimit, weeklyDepositLimit: null, monthlyDepositLimit: null, dailyLossLimit: null,
    // realityCheckIntervalMin is NON-nullable (Int @default(30)); the old
    // `null` here only survived because of the `as` cast below and the
    // in-memory Map, and blew up on real Postgres.
    sessionTimeLimitMin: null, realityCheckIntervalMin: 30,
    selfExclusionUntil: null, coolingOffUntil: null,
    pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null,
    pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null,
    pendingMonthlyIncreaseTo: null, pendingMonthlyIncreaseEffectiveAt: null,
  } as StoredResponsibleGambling);
}

// ── C4a · 10 concurrent deposits vs a 100k daily cap → exactly ONE clears ────
{
  const uid = "rg_dep_race";
  await fundedUser(uid, 0);
  await seedDepositCap(uid, 100_000);

  const results = await Promise.all(
    Array.from({ length: 10 }, () => deposit(uid, { provider: "MPESA", amount: 100_000, msisdn: "712345678" })),
  );
  const okCount = results.filter((r) => r.ok).length;
  ok("C4a: exactly ONE of 10 concurrent 100k deposits succeeds", okCount === 1, `succeeded=${okCount}/10`);
  const blocked = results.filter((r) => !r.ok);
  ok("C4a: the other nine are blocked on the cap", blocked.length === 9 && blocked.every((r) => !r.ok && /limit/i.test(r.error)), `blocked=${blocked.length}`);

  // Credited balance must never exceed the cap.
  const w = await db.wallet.findByUserId(uid);
  ok("C4a: credited balance ≤ the 100k cap (no 10× breach)", (w?.balance ?? 0) <= 100_000, `balance=${w?.balance}`);
}

// ── C4b · concurrent bets vs a 50k daily loss cap → only 5×10k clear ─────────
{
  const uid = "rg_loss_race";
  await fundedUser(uid, 1_000_000); // balance is never the constraint here
  await setLimits(uid, { dailyLossLimit: 50_000 }); // loss-cap decreases apply immediately

  const m = await createMarket({
    titleEn: "Loss-cap race market", titleSw: "Soko la mtihani", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);

  const results = await Promise.all(
    Array.from({ length: 10 }, (_, i) => buyPosition(uid, { marketId: m.id, side: i % 2 === 0 ? "YES" : "NO", stake: 10_000 })),
  );
  const okCount = results.filter((r) => r.ok).length;
  // Each open bet counts 10k toward the 24h net loss; the cap is 50k → 5 fit.
  ok("C4b: concurrent bets stop at the loss cap (5×10k = 50k)", okCount === 5, `succeeded=${okCount}/10`);
  ok("C4b: total staked never exceeds the loss cap", okCount * 10_000 <= 50_000);
}

console.log(`\nrg-limit-race: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
