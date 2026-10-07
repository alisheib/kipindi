/**
 * ⭐ THE ONE FLOOR A WEBHOOK SECRET MUST REACH — 16 characters, the shortest a generated secret is. Below it boot warns
 * (`webhookSecretUnusable` and the rotation's `previousWebhookSecretWarning`, boot-checks.ts) and the Blackball receipt
 * receiver compares nothing at all (`authorized`, api/webhooks/blackball/route.ts — marketing U46a, E29). ONE number, so a
 * boot warning and the receiver can never disagree about which secret counts (`test:sms-dlr` §12 D9 holds both).
 * ⛔ PURE, AND IT IMPORTS NOTHING: the route and boot both read it, and neither may pull in the other's module graph —
 * boot-checks reaches `next/headers` through admin-guard.
 */
export const WEBHOOK_SECRET_MIN_CHARS = 16;
