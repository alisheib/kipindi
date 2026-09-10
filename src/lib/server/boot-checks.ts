/**
 * Startup validation — runs once from instrumentation.register() on server boot.
 *
 * Findings surfaced here (all FAIL-OPEN — a boot check must never take a live
 * real-money platform down over an alarm the runtime guard already enforces; the
 * C7 outage was exactly a boot `throw`):
 *  - Payment mode: in LIVE money-mode, warn if the active provider is the mock
 *    (deposits/withdrawals are simulated — a deliberate operator choice now) or a
 *    real provider with missing creds (every call fails). See payment-control.ts.
 *  - H7 (config): warn loudly for any missing payment-webhook secret in
 *    production. The webhook receiver reads these EXACT env names; a naming
 *    mismatch made every callback 401 and deposits silently never credit — a
 *    guaranteed launch-day outage. Catch it at boot, not in production traffic.
 *
 * NOTE: the old POCA §16 conflicted-resolution boot alarm is gone — the two-officer
 * rule + officer-conflict block were retired (resolution-policy.ts; owner decision
 * 2026-07-24). There is no stale override flag left to warn about.
 */
import { assertPaymentModeSane } from "./payment-control";
import { isAdminTotpEnforced } from "./admin-guard";

/** The exact env names read by api/webhooks/payments/route.ts (KNOWN_PROVIDERS). */
const WEBHOOK_SECRET_ENVS = ["SELCOM_WEBHOOK_SECRET", "AZAMPAY_WEBHOOK_SECRET", "MIXX_WEBHOOK_SECRET"] as const;

/** Anything that will never verify a vendor signature: unset, a setup-template placeholder,
 *  or too short to be a generated secret. Exported so `test:webhook-secret` can drive it —
 *  a predicate buried inside a boot function is a predicate nothing ever checks. */
export function webhookSecretUnusable(raw: string | undefined): boolean {
  const v = (raw ?? "").trim();
  if (!v) return true;
  if (/^(paste|change|replace|set|your|todo|xxx+|placeholder|example|generated?[_-]?value)/i.test(v)) return true;
  if (/^[A-Z][A-Z0-9_]{8,}$/.test(v)) return true; // SCREAMING_SNAKE — a template token, not a secret
  return v.length < 16;
}

export async function runBootChecks(): Promise<void> {
  // Fail-open payment-mode surface (logs, never throws).
  await assertPaymentModeSane();

  if (process.env.NODE_ENV === "production") {
    // 🔴 Admin 2FA off in production. This was TRUE on production from before 2026-07-31 and
    // absolutely nothing said so — not this file, not /api/health, not /admin/system. A
    // password-only admin console on a licensed real-money platform is a finding in its own right;
    // one that LOOKS like a 2FA-protected console is worse. Fail-open (log, never throw): the
    // runtime guard already decides access, and a boot `throw` caused the C7 outage.
    if (!isAdminTotpEnforced()) {
      console.error(
        "[security] WARNING: DISABLE_ADMIN_TOTP=true in PRODUCTION — the admin console is " +
          "PASSWORD-ONLY. Every /admin surface, every money-ops action and every compliance " +
          "override is reachable with a password alone. This was set deliberately so a consultant " +
          "could test; it MUST be unset before real money. ⚠️ Before unsetting it, confirm at least " +
          "one ADMIN has TOTP enrolled — otherwise the flip locks the owner out of his own console " +
          "(the layout forces enrolment, so a locked-out admin cannot reach the setup page either).",
      );
    }

    /**
     * 🔴 THIS USED TO BE `!process.env[name]` — PRESENCE, NOT VALIDITY — AND PRODUCTION HAS
     * BEEN CARRYING `SELCOM_WEBHOOK_SECRET=PASTE_ANOTHER_GENERATED_VALUE` PAST IT.
     *
     * The literal placeholder out of the setup template is a truthy string, so the check saw
     * it as set and said nothing. ⭐ **A placeholder is functionally ABSENT** — the vendor signs
     * with the real shared secret, so every HMAC comparison fails and the receiver 401s exactly
     * as it would with no secret at all. The warning below already describes that outcome in
     * capitals; it simply could not fire for the one case that was actually true.
     *
     * ⛔ The question this guard failed is the standing one: *would it still pass if the thing
     * it checks for were absent?* It did, for 40+ days.
     *
     * ⚠️ Deposits are NOT affected today and that was measured, not assumed:
     * `webhook.payment.received` last fired 2026-08-01, while `payments.fast_credit` (42) and
     * `payments.reconcile_sweep` (2,529) are current — money credits through the reconcile
     * path, and the webhook receiver is dormant. This is a latent door, not a live outage.
     */
    const missing = WEBHOOK_SECRET_ENVS.filter((name) => webhookSecretUnusable(process.env[name]));
    if (missing.length) {
      console.error(
        `[config] WARNING: payment webhook secret(s) MISSING, PLACEHOLDER or too short: ${missing.join(", ")}. ` +
          `The webhook receiver reads these exact names (api/webhooks/payments/route.ts). ` +
          `Any provider whose secret is missing has EVERY callback rejected with 401 → deposits ` +
          `for that provider never credit. Set them in Railway before enabling the provider. ` +
          `(The legacy name PAYMENT_WEBHOOK_SECRET is NOT read by the code.)`,
      );
    }
  }
}
