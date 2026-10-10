/**
 * Admin money-ops regression tests (in-memory; no DATABASE_URL) — locks in the
 * Session-M controls: adminAdjustBalance (§9.3 #4) + the officer's identity re-check.
 *
 * ⭐ 2026-10-10 (owner ruling: players verify with TYPED details; an officer's one ask is a CORRECTION of them —
 * docs/COMPLIANCE-DECISIONS.md, "2026-10-10 · Players verify identity with typed details"). `forceReverifyKyc` is
 * DELETED; `askForCorrections` replaced it, from APPROVED and from PENDING_REVIEW, with the row version the officer
 * saw, and with "Also freeze the wallet" on the same action — because the ask itself moves no money.
 */
import { db } from "../src/lib/server/store.ts";
import { adminAdjustBalance } from "../src/lib/server/wallet-service.ts";
import * as KYC from "../src/lib/server/kyc-service.ts";
import { askForCorrections, kycRowVersion } from "../src/lib/server/kyc-service.ts";

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

// ── askForCorrections (it replaced forceReverifyKyc on 2026-10-10) ─────────────
async function seedKyc(userId: string, status: string, approvedAt: string | null = null) {
  await db.kyc.upsert({ id: `kyc_${userId}`, userId, status, rejectReason: null, rejectNote: null, idType: "NIDA", idNumber: "19900101", idExpiry: null, idVerifiedAt: now, fullName: "Jay Tester", dob: "1990-01-01", documents: [{ docType: "NIDA_FRONT", storageKey: "a", uploadedAt: now }, { docType: "NIDA_BACK", storageKey: "b", uploadedAt: now }, { docType: "SELFIE", storageKey: "c", uploadedAt: now }], extraRequests: [], reviewerId: null, reviewedAt: null, submittedAt: now, approvedAt, photoVerifiedAt: approvedAt, autoApprovedAt: null, autoFlags: [], postCheckedAt: null, postCheckedById: null, priorIdentities: [], createdAt: now, updatedAt: now });
}
const versionOf = async (userId: string) => { const k = await db.kyc.findByUserId(userId); return k ? kycRowVersion(k) : "no-row"; };
{
  ok("reverify: ⛔ forceReverifyKyc no longer exists — askForCorrections replaced it", !("forceReverifyKyc" in KYC));

  await seedUser("usr_rv");
  await seedKyc("usr_rv", "APPROVED", now);
  await db.wallet.create({ id: "wlt_rv", userId: "usr_rv", balance: 7_000, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });

  ok("corrections: self blocked", !(await askForCorrections("usr_rv", "usr_rv", { note: "self attempt here", version: await versionOf("usr_rv") })).ok);
  ok("corrections: short note rejected", !(await askForCorrections("officer1", "usr_rv", { note: "x", version: await versionOf("usr_rv") })).ok);
  ok("corrections: ⛔ a STALE version rejected (the officer must have seen this row)",
    !(await askForCorrections("officer1", "usr_rv", { note: "document expired, please correct", version: "1999-01-01T00:00:00.000Z" })).ok
    && (await db.kyc.findByUserId("usr_rv"))?.status === "APPROVED");
  ok("corrections: 'Also freeze the wallet' without a reason is rejected before anything is written",
    !(await askForCorrections("officer1", "usr_rv", { note: "document expired, please correct", version: await versionOf("usr_rv"), alsoFreeze: true, freezeReason: "" })).ok
    && (await db.kyc.findByUserId("usr_rv"))?.status === "APPROVED" && (await db.wallet.findByUserId("usr_rv"))?.status === "ACTIVE");

  const r = await askForCorrections("officer1", "usr_rv", { note: "document expired, please correct", version: await versionOf("usr_rv") });
  ok("corrections: APPROVED → ok", r.ok);
  const k = await db.kyc.findByUserId("usr_rv");
  ok("corrections: status now ADDITIONAL_INFO_REQUIRED, the note on the row, the officer recorded",
    k?.status === "ADDITIONAL_INFO_REQUIRED" && k?.rejectNote === "document expired, please correct" && k?.reviewerId === "officer1");
  // 🔴 THE MONEY HALF — the reason this lives in a money-ops suite. The ask moves no money: the first approval stays
  // (withdrawals open), the wallet is untouched, and it never writes an extra-document request.
  const w = await db.wallet.findByUserId("usr_rv");
  ok("corrections: ⛔ moves no money — first approval kept, wallet ACTIVE and untouched, no extra request written",
    k?.approvedAt === now && w?.status === "ACTIVE" && w?.balance === 7_000 && (k?.extraRequests?.length ?? 0) === 0);

  // Second call now rejected (the player holds the file).
  ok("corrections: non-APPROVED/PENDING rejected", !(await askForCorrections("officer1", "usr_rv", { note: "again on the player's move", version: await versionOf("usr_rv") })).ok);

  // From PENDING_REVIEW, with the money control on the same action.
  await seedUser("usr_rvp");
  await seedKyc("usr_rvp", "PENDING_REVIEW");
  await db.wallet.create({ id: "wlt_rvp", userId: "usr_rvp", balance: 9_000, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  const f = await askForCorrections("officer1", "usr_rvp", { note: "name does not match, please correct", version: await versionOf("usr_rvp"), alsoFreeze: true, freezeReason: "hold while the details are corrected" });
  const wp = await db.wallet.findByUserId("usr_rvp");
  ok("corrections: from PENDING_REVIEW, 'Also freeze the wallet' puts an OFFICER hold on it and moves no money",
    f.ok && (await db.kyc.findByUserId("usr_rvp"))?.status === "ADDITIONAL_INFO_REQUIRED" && wp?.status === "FROZEN"
      && ((wp as { freezeReasons?: string[] } | null)?.freezeReasons ?? []).includes("OFFICER") && wp?.balance === 9_000);

  // Unknown user → not found.
  ok("corrections: no KYC rejected", !(await askForCorrections("officer1", "usr_none", { note: "no kyc on file here", version: await versionOf("usr_none") })).ok);
}

console.log(`\nadmin-money-ops: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
