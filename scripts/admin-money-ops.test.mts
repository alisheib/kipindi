/**
 * Admin money-ops regression tests (in-memory; no DATABASE_URL) — locks in the
 * Session-M controls: adminAdjustBalance (§9.3 #4) + forceReverifyKyc.
 */
import { db } from "../src/lib/server/store.ts";
import { adminAdjustBalance } from "../src/lib/server/wallet-service.ts";
import { forceReverifyKyc } from "../src/lib/server/kyc-service.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean) => { if (cond) pass++; else { fail++; console.log(`FAIL ${label}`); } };
const now = new Date().toISOString();

async function seedUser(id: string) {
  await db.user.create({ id, phoneE164: `+25571000${id.slice(-4)}`, passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: "T " + id.slice(-3), dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@t.tz`, createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null });
}

// ── adminAdjustBalance ───────────────────────────────────────────────────────
{
  await seedUser("usr_adj");
  await db.wallet.create({ id: "wlt_adj", userId: "usr_adj", balance: 10_000, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });

  const credit = await adminAdjustBalance("usr_adj", "officer1", 5_000, "goodwill credit");
  ok("adjust: credit ok", credit.ok && credit.balance === 15_000);

  const debit = await adminAdjustBalance("usr_adj", "officer1", -3_000, "clawback correction");
  ok("adjust: debit ok", debit.ok && debit.balance === 12_000);

  const over = await adminAdjustBalance("usr_adj", "officer1", -999_999, "overdraw attempt");
  ok("adjust: overdraw blocked", !over.ok);
  const w = await db.wallet.findByUserId("usr_adj");
  ok("adjust: balance intact after blocked debit (12000)", w?.balance === 12_000);

  ok("adjust: zero rejected", !(await adminAdjustBalance("usr_adj", "officer1", 0, "noop")).ok);
  ok("adjust: short reason rejected", !(await adminAdjustBalance("usr_adj", "officer1", 1_000, "x")).ok);
  ok("adjust: over-cap rejected", !(await adminAdjustBalance("usr_adj", "officer1", 60_000_000, "too big amount here")).ok);

  const txns = await db.txn.findByUser("usr_adj", 50);
  ok("adjust: a CREDIT txn was written", txns.some((t) => t.type === "ADJUSTMENT_CREDIT" && t.amount === 5_000));
  ok("adjust: a DEBIT txn was written", txns.some((t) => t.type === "ADJUSTMENT_DEBIT" && t.amount === -3_000));

  // Frozen wallet → rejected.
  await seedUser("usr_frz");
  await db.wallet.create({ id: "wlt_frz", userId: "usr_frz", balance: 5_000, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "FROZEN", createdAt: now, updatedAt: now });
  ok("adjust: non-ACTIVE wallet rejected", !(await adminAdjustBalance("usr_frz", "officer1", 1_000, "on a frozen wallet")).ok);
}

// ── forceReverifyKyc ─────────────────────────────────────────────────────────
async function seedKyc(userId: string, status: string) {
  await db.kyc.upsert({ id: `kyc_${userId}`, userId, status, rejectReason: null, rejectNote: null, nidaNumber: "19900101", nidaVerifiedAt: now, fullName: "Jay Tester", dob: "1990-01-01", documents: [{ docType: "NIDA_FRONT", storageKey: "a", uploadedAt: now }, { docType: "NIDA_BACK", storageKey: "b", uploadedAt: now }, { docType: "SELFIE", storageKey: "c", uploadedAt: now }], reviewerId: null, reviewedAt: null, submittedAt: now, createdAt: now, updatedAt: now });
}
{
  await seedUser("usr_rv");
  await seedKyc("usr_rv", "APPROVED");

  ok("reverify: self blocked", !(await forceReverifyKyc("usr_rv", "usr_rv", "self attempt here")).ok);
  ok("reverify: short reason rejected", !(await forceReverifyKyc("officer1", "usr_rv", "x")).ok);

  const r = await forceReverifyKyc("officer1", "usr_rv", "document expired, re-verify");
  ok("reverify: APPROVED → ok", r.ok);
  const k = await db.kyc.findByUserId("usr_rv");
  ok("reverify: status now ADDITIONAL_INFO_REQUIRED", k?.status === "ADDITIONAL_INFO_REQUIRED");

  // Second call now rejected (no longer APPROVED).
  ok("reverify: non-APPROVED rejected", !(await forceReverifyKyc("officer1", "usr_rv", "again on non-approved")).ok);

  // Unknown user → not found.
  ok("reverify: no KYC rejected", !(await forceReverifyKyc("officer1", "usr_none", "no kyc on file here")).ok);
}

console.log(`\nadmin-money-ops: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
