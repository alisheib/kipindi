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
 *  - SMS (2026-09-16): an unrecognised SMS_PROVIDER, a selected Blackball with no
 *    credentials, a sender ID over the gateway's 12-character cap, an unusable DLR
 *    secret, and — loudest — OTP login switched on while SMS cannot deliver. Each of
 *    these fails a whole rail SILENTLY; the first evidence would otherwise be a
 *    player who cannot sign in. Since U46a (E29) also the rotation's second DLR secret,
 *    BLACKBALL_WEBHOOK_SECRET_PREVIOUS, for as long as it stays set.
 *
 * NOTE: the old POCA §16 conflicted-resolution boot alarm is gone — the two-officer
 * rule + officer-conflict block were retired (resolution-policy.ts; owner decision
 * 2026-07-24). There is no stale override flag left to warn about.
 */
import { assertPaymentModeSane } from "./payment-control";
import { isAdminTotpEnforced } from "./admin-guard";
import { previewSecretUsable } from "./journey-preview-secret";
import { smsConfigured, smsProviderResolution } from "./sms";
import { blackballConfigured, senderIdProblem } from "./sms-blackball";
// U46a review · the ONE floor a webhook secret must reach — the receipt receiver reads the same number.
import { WEBHOOK_SECRET_MIN_CHARS } from "./webhook-secret-floor";
import { phoneCodeSignInEnabled } from "./otp-door";

/** The exact env names read by api/webhooks/payments/route.ts (KNOWN_PROVIDERS). */
const WEBHOOK_SECRET_ENVS = ["SELCOM_WEBHOOK_SECRET", "AZAMPAY_WEBHOOK_SECRET", "MIXX_WEBHOOK_SECRET"] as const;

/** The exact env the SMS delivery-receipt receiver reads (api/webhooks/blackball/route.ts). */
const SMS_WEBHOOK_SECRET_ENV = "BLACKBALL_WEBHOOK_SECRET";
/** U46a · E29 — the rotation's second secret: the OLD value, accepted beside the current one while Blackball's callback URL
 *  is changed (docs/BLACKBALL-SMS.md §7). Read by the same receiver. */
const SMS_WEBHOOK_PREVIOUS_ENV = "BLACKBALL_WEBHOOK_SECRET_PREVIOUS";

/**
 * U46a · E29 — the line boot prints while the rotation's second secret is still set, or null when it is not. A PREVIOUS
 * left behind keeps the old secret — the one that travelled through chat — opening the receiver for ever, so it is said at
 * every boot until it is removed. A PREVIOUS under `WEBHOOK_SECRET_MIN_CHARS` is never compared at all (the receiver's
 * floor — the same constant), and the line says that too: a rotation counting on it would be refusing the old URL's
 * receipts. Exported so `test:sms-dlr` reads the exact sentence (D9).
 */
export function previousWebhookSecretWarning(raw: string | undefined): string | null {
  const value = raw ?? "";
  if (value === "") return null;
  const line = `[sms] WARNING: ${SMS_WEBHOOK_PREVIOUS_ENV} is set — remove it once Blackball's callback URL carries the new secret.`;
  return value.length < WEBHOOK_SECRET_MIN_CHARS
    ? `${line} It is shorter than ${WEBHOOK_SECRET_MIN_CHARS} characters, so the receiver does not accept it at all — a callback still carrying the old secret is refused.`
    : line;
}

/** Anything that will never verify a vendor signature: unset, a setup-template placeholder,
 *  or too short to be a generated secret. Exported so `test:webhook-secret` can drive it —
 *  a predicate buried inside a boot function is a predicate nothing ever checks. */
export function webhookSecretUnusable(raw: string | undefined): boolean {
  const v = (raw ?? "").trim();
  if (!v) return true;
  if (/^(paste|change|replace|set|your|todo|xxx+|placeholder|example|generated?[_-]?value)/i.test(v)) return true;
  if (/^[A-Z][A-Z0-9_]{8,}$/.test(v)) return true; // SCREAMING_SNAKE — a template token, not a secret
  return v.length < WEBHOOK_SECRET_MIN_CHARS;
}

export async function runBootChecks(): Promise<void> {
  // Fail-open payment-mode surface (logs, never throws).
  await assertPaymentModeSane();

  if (process.env.NODE_ENV === "production") {
    // The new journey's preview pass (Vodacom plan S1) is sealed with its OWN secret. Without a usable one the
    // preview is simply off — `journey-preview.ts` never throws — and this line is how anyone finds out why.
    if (!previewSecretUsable(process.env.JOURNEY_PREVIEW_SECRET)) {
      console.error(
        "[journey] JOURNEY_PREVIEW_SECRET is missing, shorter than 32 characters, a placeholder, or equal to " +
          "SESSION_SECRET / AUDIT_CHAIN_SECRET — the new journey's staff preview and preview links are OFF until it is set.",
      );
    }
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

    /**
     * ── SMS (2026-09-16) ────────────────────────────────────────────────────
     * The same doctrine as the block above: these are conditions that produce a
     * TOTAL, SILENT failure of a rail, and the first evidence would otherwise be a
     * player who cannot sign in. All fail-open — a boot `throw` caused the C7 outage.
     */
    const resolution = smsProviderResolution();

    // ⛔ ONE MISSING LETTER IN A RAILWAY VARIABLE. `SMS_PROVIDER=blackbal` is a FAILED
    // choice, not a default, and the tri-state exists so it cannot quietly become the
    // console stub — but nothing would SAY so without this line.
    if (resolution === "unrecognised") {
      console.error(
        `[sms] WARNING: SMS_PROVIDER="${process.env.SMS_PROVIDER}" is not a provider this build knows. ` +
          `Valid values are "console" and "blackball". NOTHING will be delivered and no message will be ` +
          `marked sent — invite campaigns hold their phone entries and OTP refuses with SMS_UNDELIVERABLE.`,
      );
    }

    if (resolution === "blackball") {
      if (!blackballConfigured()) {
        console.error(
          `[sms] WARNING: SMS_PROVIDER=blackball but BLACKBALL_CLIENT_ID / BLACKBALL_CLIENT_SECRET are not set. ` +
            `Every send will fail. Set them in Railway (Configurations → API Configurations in the Blackball portal).`,
        );
      }
      const senderProblem = senderIdProblem(process.env.SMS_SENDER_ID);
      if (senderProblem) {
        // Measured against the live gateway: `source` is capped at 12 characters and the
        // cap is enforced BEFORE authentication, so an over-long sender ID fails every
        // send with a complaint about a field rather than about the sender ID.
        console.error(`[sms] WARNING: SMS_SENDER_ID is ${senderProblem}. The gateway refuses the request outright.`);
      }
      if (webhookSecretUnusable(process.env[SMS_WEBHOOK_SECRET_ENV])) {
        console.error(
          `[sms] WARNING: ${SMS_WEBHOOK_SECRET_ENV} is MISSING, a PLACEHOLDER or too short. The delivery-receipt ` +
            `receiver reads this exact name (api/webhooks/blackball/route.ts), so EVERY callback is rejected with ` +
            `401 → delivery status is never recorded, InviteEntry.DELIVERED/BOUNCED are never written, and a ` +
            `message that silently failed looks identical to one that arrived.`,
        );
      }
    }

    // ⭐ U46a · E29 — whatever the provider: the receiver accepts PREVIOUS whenever the current secret is set.
    const previousWarning = previousWebhookSecretWarning(process.env[SMS_WEBHOOK_PREVIOUS_ENV]);
    if (previousWarning !== null) console.error(previousWarning);

    /**
     * ⭐ THE LOUDEST ONE, AND THE REASON THIS BLOCK EXISTS AT ALL. With OTP as a login
     * path, an SMS rail that cannot deliver is not a degraded feature — it is every
     * player locked out. Password sign-in still works, which is exactly what the
     * operator needs to be told in the same breath.
     */
    if (phoneCodeSignInEnabled() && !smsConfigured()) {
      console.error(
        `[sms] 🔴 OTP LOGIN IS ON AND SMS CANNOT DELIVER (provider="${resolution}"). Every phone-code sign-in ` +
          `will refuse with SMS_UNDELIVERABLE. Password sign-in is unaffected. Either fix the provider or unset ` +
          `OTP_ENABLED.`,
      );
    }
  }
}
