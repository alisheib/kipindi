/**
 * `predictorCount` counts PEOPLE, not bets — the one case that proves it.
 *
 * 🔴 THE DEFECT. `buyPosition` added +1 to `predictorCount` on EVERY bet, and repeat taps are
 * repeat bets by design, so one player tapping twice read as "2 players". Measured on the live
 * drive: **2 real humans, 16 bets → the card said "16 PLAYERS"**. The figure is not decoration —
 * it feeds the money card, the admin economics panel, the **public** OG share card, and
 * `reports/catalogue.ts` → `buildMatchIntegrity`, which is **regulator-facing**.
 *
 * ⛔ WHY A DEDICATED SUITE. `money-invariants` already asserted something about this field, and
 * it could not fail: its scenario uses 12 DISTINCT users placing one bet each, so
 * `predictorCount === positions.length` was true under the OLD behaviour and the NEW one alike.
 * Its wording — *"predictorCount matches positions"* — was the defect stated as an invariant.
 * **The only scenario that separates the two is ONE PLAYER BETTING TWICE**, and no suite
 * anywhere exercised it.
 *
 * ⚠️ Behavioural, against the real `buyPosition`. A structural grep for `mine.length === 0`
 * would pass on a line that is never reached.
 */
// 🔴 PIN THE IN-MEMORY STORE BEFORE ANY IMPORT, AND IMPORT DYNAMICALLY. `store.ts` picks
// Prisma whenever `DATABASE_URL` is set, so on a shell that has minted a PRODUCTION url this
// suite would create real users, wallets, a real MARKET and real POSITIONS — and it places
// bets, so it would move money. Static imports are hoisted above any assignment, which is why
// these are `await import(...)`. Precedent: `scripts/ai-usage.test.mts:8-13`.
process.env.USE_PRISMA_DAL = "false";
delete process.env.DATABASE_URL;

const { db } = await import("../src/lib/server/store.ts");
const { buyPosition, createMarket, getMarket } = await import("../src/lib/server/market-service.ts");

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean, d = "") => {
  if (c) { pass++; console.log(`  ok   ${n}`); } else { fails.push(`${n}${d ? ` — ${d}` : ""}`); console.log(`  FAIL ${n}${d ? ` — ${d}` : ""}`); }
};

const now = new Date().toISOString();
async function player(id: string, balance: number) {
  await db.user.create({
    id, phoneE164: `+2557955${id.slice(-4)}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@t.tz`, emailVerifiedAt: now,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wlt_${id}`, userId: id, balance, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  await db.kyc.upsert({ id: `kyc_${id}`, userId: id, status: "APPROVED", rejectReason: null, rejectNote: null, nidaNumber: "19900101456712341234", nidaVerifiedAt: now, idType: "NIDA", idNumber: "19900101456712341234", idExpiry: null, idVerifiedAt: now, fullName: "T", dob: "1990-01-01", documents: [], reviewerId: null, reviewedAt: null, submittedAt: now, createdAt: now, updatedAt: now } as never);
}

console.log("\npredictorCount — people, not bets\n");

const mkt = await createMarket({
  titleEn: "Will the count be honest?", titleSw: "?", titleZh: "?",
  category: "OTHER", sourceUrl: "https://example.tz/x",
  resolutionAt: new Date(Date.now() + 86_400_000).toISOString(),
} as never);
const marketId = typeof mkt === "string" ? mkt : (mkt as { id: string }).id;

await player("usr_pc_a", 100_000);
await player("usr_pc_b", 100_000);

const count = async () => (await getMarket(marketId))!.predictorCount;

console.log("── 1 · one player, three bets ───────────────────────────────────");
for (let i = 0; i < 3; i++) {
  const r = await buyPosition("usr_pc_a", { marketId, side: "YES", stake: 1_000 } as never);
  if (!("ok" in r) || !r.ok) { console.log(`  (bet ${i + 1} refused: ${JSON.stringify(r).slice(0, 120)})`); }
}
const afterA = await count();
ok("⭐ three bets by ONE player count as ONE predictor", afterA === 1, `predictorCount=${afterA}`);

console.log("\n── 2 · a SECOND player is counted ───────────────────────────────");
await buyPosition("usr_pc_b", { marketId, side: "YES", stake: 1_000 } as never);
const afterB = await count();
ok("a different player increments it", afterB === 2, `predictorCount=${afterB}`);

console.log("\n── 3 · …and their repeat bet does not ───────────────────────────");
await buyPosition("usr_pc_b", { marketId, side: "YES", stake: 1_000 } as never);
const afterB2 = await count();
ok("⭐ the second player's SECOND bet leaves it at 2", afterB2 === 2, `predictorCount=${afterB2}`);

console.log("\n── 4 · the control — bets really were placed ────────────────────");
// ⛔ Without this, every assertion above would pass if buyPosition had simply refused
// everything: 0 bets, count 0… and 0 !== 1 would fail — but a refusal that still counted
// once would slip through. Assert the POOL grew, which only real accepted bets can do.
const m = (await getMarket(marketId))!;
ok("4.control · the pool grew, so bets were genuinely accepted",
   m.yesPool + m.noPool >= 5_000, `pool=${m.yesPool + m.noPool}`);

console.log(`\npredictor-count: ${pass} passed, ${fails.length} failed\n`);
if (fails.length) {
  console.error("✗ predictorCount is counting BETS again — a money surface, the admin economics panel, the public share card and a regulator-facing report all overstate participation.\n");
  for (const f of fails) console.error(`  · ${f}`);
  process.exit(1);
}
console.log("predictor-count: OK — repeat taps do not manufacture players.");
