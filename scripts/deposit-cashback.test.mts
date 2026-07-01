/**
 * Deposit cashback tests (in-memory store; no DATABASE_URL).
 *
 * Verifies the 10% deposit-back feature (Ali 2026-06-27):
 *   - a confirmed deposit credits cashbackPercentage% into the BONUS wallet
 *   - it lands as a CASHBACK BonusGrant keyed by `deposit:<txnId>` (idempotent)
 *   - a retried webhook does NOT double-credit the cashback (exactly-once)
 *   - the synchronous deposit path also gets cashback
 *   - tiny deposits whose 10% floors to 0 create no grant
 *   - turning cashbackEnabled off stops new cashback (no limits otherwise)
 *   - cashback never blocks the deposit itself
 */
import { db } from "../src/lib/server/store.ts";
import { deposit, settlePaymentWebhook } from "../src/lib/server/wallet-service.ts";
import { setBonusConfig, getBonusConfig } from "../src/lib/server/bonus-config.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}

const now = new Date().toISOString();
function makePlayer(id: string) {
  db.user.create({
    id, phoneE164: `+25572000${id.slice(-4)}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: "1990-01-01", region: "TZ", acceptedTermsVersion: "v1", acceptedTermsAt: now,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: `${id}@t.tz`,
    createdAt: now, updatedAt: now, lastLoginAt: now, closedAt: null,
  } as never);
  db.wallet.create({ id: `wlt_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now } as never);
}
const bal = (uid: string) => db.wallet.findByUserId(uid)?.balance ?? -1;
const bonus = (uid: string) => db.wallet.findByUserId(uid)?.bonusBalance ?? -1;
const ref = (txnId: string) => db.txn.findById(txnId)?.providerRef ?? "";

// Ensure config: 10% cashback in AUTO mode (the deposit-auto-credit path).
// Default is REQUEST mode (player requests after loss); AUTO is the legacy path
// tested here — it auto-credits on every confirmed deposit.
setBonusConfig({ enabled: true, cashbackEnabled: true, cashbackPercentage: 10, cashbackMode: "AUTO" }, "test");
ok("cashback config ready (AUTO mode, 10%)", getBonusConfig().cashbackPercentage === 10 && getBonusConfig().cashbackEnabled && getBonusConfig().cashbackMode === "AUTO");

// ── ASYNC deposit → webhook confirms → 10% cashback to bonus wallet ─────────
process.env.PAYMENTS_DEMO_ASYNC = "true";
makePlayer("usr_cb1");
const d1 = await deposit("usr_cb1", { provider: "MPESA", amount: 50_000 });
const t1 = d1.ok ? d1.data!.txnId : "";
ok("deposit pending, no cashback yet", bonus("usr_cb1") === 0);

await settlePaymentWebhook({ providerRef: ref(t1), status: "CONFIRMED" });
ok("deposit credited to real balance", bal("usr_cb1") === 50_000);
ok("10% cashback credited to bonus wallet", bonus("usr_cb1") === 5_000, `bonus=${bonus("usr_cb1")}`);

const grant = db.bonusGrant.findBySourceRef(`deposit:${t1}`);
ok("cashback grant exists with CASHBACK source", !!grant && grant.source === "CASHBACK", grant ? grant.source : "no grant");
ok("cashback grant uses default 5× wagering", !!grant && grant.wagerRequiredTzs === 25_000, grant ? `req=${grant.wagerRequiredTzs}` : "no grant");

// Retry the SAME webhook → cashback must NOT double up.
await settlePaymentWebhook({ providerRef: ref(t1), status: "CONFIRMED" });
ok("retried webhook does not double cashback", bonus("usr_cb1") === 5_000, `bonus=${bonus("usr_cb1")}`);

// ── SYNC deposit path also earns cashback ──────────────────────────────────
delete process.env.PAYMENTS_DEMO_ASYNC;
makePlayer("usr_cb2");
await deposit("usr_cb2", { provider: "MPESA", amount: 12_000 });
ok("sync deposit credited", bal("usr_cb2") === 12_000);
ok("sync deposit cashback = 1,200", bonus("usr_cb2") === 1_200, `bonus=${bonus("usr_cb2")}`);

// ── Tiny deposit whose 10% floors to 0 → no grant ──────────────────────────
makePlayer("usr_cb3");
await deposit("usr_cb3", { provider: "MPESA", amount: 5 }); // floor(0.5) = 0
ok("sub-unit cashback creates no grant", bonus("usr_cb3") === 0, `bonus=${bonus("usr_cb3")}`);

// ── cashbackEnabled = false → no new cashback (deposit still works) ─────────
setBonusConfig({ cashbackEnabled: false }, "test");
makePlayer("usr_cb4");
await deposit("usr_cb4", { provider: "MPESA", amount: 30_000 });
ok("deposit still credited with cashback off", bal("usr_cb4") === 30_000);
ok("no cashback when disabled", bonus("usr_cb4") === 0, `bonus=${bonus("usr_cb4")}`);
setBonusConfig({ cashbackEnabled: true }, "test"); // restore

console.log(`\ndeposit-cashback: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
