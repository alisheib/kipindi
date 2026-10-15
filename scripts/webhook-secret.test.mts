/**
 * WEBHOOK SECRETS — a placeholder is ABSENT, and the guard must say so.
 *
 *   npx tsx scripts/webhook-secret.test.mts   (npm run test:webhook-secret)
 *
 * 🔴 E-331. `boot-checks.ts` warned when a payment webhook secret was "not set", and it
 * tested `!process.env[name]` — PRESENCE, not validity. A template placeholder is
 * truthy but cannot verify a generic provider's HMAC callback.
 *
 * ⭐ A PLACEHOLDER IS FUNCTIONALLY ABSENT for generic AzamPay/Mixx callbacks. Selcom is
 * routed separately and verifies its Digest with PAYMENT_API_SECRET. Its unused legacy
 * SELCOM_WEBHOOK_SECRET must not appear in a warning that says deposits cannot credit.
 *
 * The source pins below keep the boot warning aligned with the receiver's routing.
 */
import { readFileSync } from "node:fs";
import { webhookSecretUnusable } from "../src/lib/server/boot-checks.ts";

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`PASS ${label}`); }
  else { fail++; console.log(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }
};

// ── §1 — the exact value live on production must be REJECTED. This is the case the old
//        guard passed, and it is the reason this file exists.
ok("§1 the production placeholder is rejected", webhookSecretUnusable("PASTE_ANOTHER_GENERATED_VALUE"));

// ── §2 — the other shapes a setup template leaves behind.
for (const v of [
  "", "   ", "changeme", "your-secret-here", "TODO", "xxxxxxxxxxxxxxxx",
  "PLACEHOLDER", "replace_me", "SET_THIS_VALUE", "GENERATED_VALUE", "example_secret",
]) {
  ok(`§2 rejected: ${JSON.stringify(v)}`, webhookSecretUnusable(v));
}
ok("§2 undefined is rejected", webhookSecretUnusable(undefined));

// ── §3 — ⚠️ POSITIVE CONTROL. A guard that rejects everything is not a guard; it is an
//        outage. Real generated secrets must pass, or the warning becomes noise and the
//        next person deletes it.
/**
 * ⛔ NOT REAL-LOOKING CREDENTIALS, AND THAT IS A CONSTRAINT ON THE FIXTURE, NOT A COMPROMISE
 * OF IT. The first version of §3 used a `sk_live_…`-shaped string as a "vendor-prefixed"
 * example and GITHUB PUSH PROTECTION REJECTED THE PUSH — it matches Stripe's live-key format,
 * and a scanner cannot tell an invented one from a leaked one. It was right to refuse: the
 * remedy is a fixture that cannot be mistaken for a credential, never an unblock link. What
 * this section actually needs is only that the values be long, mixed and unlike a template
 * token — none of which requires imitating a real vendor's key shape.
 */
for (const v of [
  "d4f19b7c0a2e8631f5c7920ab3de4471",         // hex, the shape a generated webhook secret takes
  "wh-fixture-2f8a41d0-not-a-real-secret",    // prefixed, self-labelling
  "ZmFrZS1maXh0dXJlLXZhbHVlLWZvci10ZXN0cw==", // base64 of "fake-fixture-value-for-tests"
  "correct-horse-battery-staple-9f2a",        // long passphrase
]) {
  ok(`§3 ACCEPTED (positive control): ${v.slice(0, 12)}…`, !webhookSecretUnusable(v));
}

// ── §4 — a short-but-real-looking value is still rejected: 15 chars is not a secret.
ok("§4 a 15-char value is rejected", webhookSecretUnusable("abc123def456gh0"));
ok("§4 a 16-char value is accepted", !webhookSecretUnusable("abc123def456gh01"));

// ── §5 — the boot warning must follow the actual receiver, not a legacy env name.
const boot = readFileSync(new URL("../src/lib/server/boot-checks.ts", import.meta.url), "utf8");
const route = readFileSync(new URL("../src/app/api/webhooks/payments/route.ts", import.meta.url), "utf8");
const genericMap = route.slice(route.indexOf("const KNOWN_PROVIDERS"), route.indexOf("const AUTHORITATIVE_ONLY"));
ok("§5 boot checks only generic callback secrets",
  /const GENERIC_WEBHOOK_SECRET_ENVS = \["AZAMPAY_WEBHOOK_SECRET", "MIXX_WEBHOOK_SECRET"\]/.test(boot)
  && /GENERIC_WEBHOOK_SECRET_ENVS\.filter\(\(name\) => webhookSecretUnusable\(process\.env\[name\]\)\)/.test(boot));
ok("§5 Selcom uses its signed dedicated handler",
  !/selcom\s*:/.test(genericMap) && /const AUTHORITATIVE_ONLY = new Set\(\["selcom"\]\)/.test(route)
  && route.includes("apiSecret: env.apiSecret") && boot.includes("Selcom uses PAYMENT_API_SECRET"));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
