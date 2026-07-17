/**
 * Startup validation — runs once from instrumentation.register() on server boot.
 *
 * Findings surfaced here (all FAIL-OPEN — a boot check must never take a live
 * real-money platform down over an alarm the runtime guard already enforces; the
 * C7 outage was exactly a boot `throw`):
 *  - C7 (compliance): the POCA §16 conflicted-resolution override left ON. The
 *    runtime guard forces it off in LIVE mode; this warns loudly to clear the stale
 *    intent. See test-overrides.ts.
 *  - Payment mode: in LIVE money-mode, warn if the active provider is the mock
 *    (dispatch will refuse every payment) or a real provider with missing creds
 *    (every call fails). Runtime dispatch is the enforcement — see payment-control.ts.
 *  - H7 (config): warn loudly for any missing payment-webhook secret in
 *    production. The webhook receiver reads these EXACT env names; a naming
 *    mismatch made every callback 401 and deposits silently never credit — a
 *    guaranteed launch-day outage. Catch it at boot, not in production traffic.
 */
import { assertProductionComplianceLocks } from "./test-overrides";
import { assertPaymentModeSane } from "./payment-control";

/** The exact env names read by api/webhooks/payments/route.ts (KNOWN_PROVIDERS). */
const WEBHOOK_SECRET_ENVS = ["SELCOM_WEBHOOK_SECRET", "AZAMPAY_WEBHOOK_SECRET", "MIXX_WEBHOOK_SECRET"] as const;

export async function runBootChecks(): Promise<void> {
  // Fail-open compliance + payment-mode surfaces (they log, never throw).
  await assertProductionComplianceLocks();
  await assertPaymentModeSane();

  if (process.env.NODE_ENV === "production") {
    const missing = WEBHOOK_SECRET_ENVS.filter((name) => !process.env[name]);
    if (missing.length) {
      console.error(
        `[config] WARNING: payment webhook secret(s) not set: ${missing.join(", ")}. ` +
          `The webhook receiver reads these exact names (api/webhooks/payments/route.ts). ` +
          `Any provider whose secret is missing has EVERY callback rejected with 401 → deposits ` +
          `for that provider never credit. Set them in Railway before enabling the provider. ` +
          `(The legacy name PAYMENT_WEBHOOK_SECRET is NOT read by the code.)`,
      );
    }
  }
}
