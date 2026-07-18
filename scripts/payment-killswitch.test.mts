/**
 * ADM4 payment kill-switch — money-path enforcement test (in-memory store).
 *
 * Verifies that pausing a provider's deposits/withdrawals actually blocks the
 * money path (not just the UI), that other providers stay live, that resuming
 * restores flow, and that every toggle is audited. Default = all live.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { deposit, withdraw } from "../src/lib/server/wallet-service.ts";
import { setKillSwitch, isPaymentPaused, getKillSwitches } from "../src/lib/server/payment-ops.ts";
import { getAuditPage } from "../src/lib/server/audit.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; console.log(`PASS ${label}${extra ? ` — ${extra}` : ""}`); }
  else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
async function mkUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@test.tz`, emailVerifiedAt: now,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 500_000, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
}

await mkUser("payer");

// Default: all live.
const initial = await getKillSwitches();
ok("default: MPESA deposits live", initial.MPESA?.deposits === false);
ok("isPaymentPaused false by default", (await isPaymentPaused("MPESA", "deposits")) === false);

// Baseline deposit works.
const d0 = await deposit("payer", { provider: "MPESA", amount: 10_000 });
ok("baseline MPESA deposit works", d0.ok, d0.ok ? "" : d0.error);

// Pause MPESA deposits → blocked; AIRTEL still works.
await setKillSwitch("MPESA", "deposits", true, "ops_admin");
ok("isPaymentPaused true after pause", (await isPaymentPaused("MPESA", "deposits")) === true);
const dBlocked = await deposit("payer", { provider: "MPESA", amount: 10_000 });
ok("paused MPESA deposit BLOCKED at money path", !dBlocked.ok && dBlocked.code === "SUSPENDED", dBlocked.ok ? "unexpected ok" : dBlocked.error);
const dOther = await deposit("payer", { provider: "AIRTEL_MONEY", amount: 10_000 });
ok("other provider (Airtel) still deposits", dOther.ok, dOther.ok ? "" : dOther.error);

// Withdrawals for MPESA still allowed (only deposits paused).
ok("MPESA withdrawals still live", (await isPaymentPaused("MPESA", "withdrawals")) === false);

// Resume MPESA deposits → works again.
await setKillSwitch("MPESA", "deposits", false, "ops_admin");
const dResumed = await deposit("payer", { provider: "MPESA", amount: 10_000 });
ok("resumed MPESA deposit works again", dResumed.ok, dResumed.ok ? "" : dResumed.error);

// Withdrawal kill-switch.
await setKillSwitch("MPESA", "withdrawals", true, "ops_admin");
const wBlocked = await withdraw("payer", { provider: "MPESA", amount: 5_000 });
ok("paused MPESA withdrawal BLOCKED at money path", !wBlocked.ok && wBlocked.code === "SUSPENDED", wBlocked.ok ? "unexpected ok" : wBlocked.error);
await setKillSwitch("MPESA", "withdrawals", false, "ops_admin");

// Audit trail.
const compliance = getAuditPage({ category: "COMPLIANCE", limit: 500 });
ok("audit: killswitch pause recorded", compliance.some((e) => e.action === "payments.killswitch.paused" && e.targetId === "MPESA"));
ok("audit: killswitch resume recorded", compliance.some((e) => e.action === "payments.killswitch.resumed" && e.targetId === "MPESA"));

console.log(`\npayment-killswitch: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
