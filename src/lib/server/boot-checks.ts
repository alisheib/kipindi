/**
 * Startup validation — runs once from instrumentation.register() on server boot.
 *
 * Two audit findings live here:
 *  - C7 (compliance): refuse to boot in production if the POCA §16 conflicted-
 *    resolution override was left ON. Throws — fail closed.
 *  - H7 (config): warn loudly for any missing payment-webhook secret in
 *    production. The webhook receiver reads these EXACT env names; a naming
 *    mismatch made every callback 401 and deposits silently never credit — a
 *    guaranteed launch-day outage. Catch it at boot, not in production traffic.
 */
import { assertProductionComplianceLocks } from "./test-overrides";

/** The exact env names read by api/webhooks/payments/route.ts (KNOWN_PROVIDERS). */
const WEBHOOK_SECRET_ENVS = ["SELCOM_WEBHOOK_SECRET", "AZAMPAY_WEBHOOK_SECRET", "MIXX_WEBHOOK_SECRET"] as const;

export async function runBootChecks(): Promise<void> {
  // May throw — intentional. Do not wrap in try/catch at the call site.
  await assertProductionComplianceLocks();

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
