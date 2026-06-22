/**
 * Token-bucket rate limiter — in-memory.
 * Per (key, action) pair, e.g. ("phone:+25571234", "otp.send").
 * Compliance: helps prevent brute force, OTP enumeration, abuse.
 * Production: swap to Redis-backed bucket (interface unchanged).
 */

type Bucket = { tokens: number; updatedAt: number };

// Pin buckets on globalThis so Next.js dev-mode HMR doesn't strand
// references in stale closures (the dev-test reset endpoint relies on
// hitting the SAME Map instance that auth-service writes into).
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_RL_BUCKETS: Map<string, Bucket> | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_RL_RESET_HOOK: (() => number) | undefined;
}
const buckets: Map<string, Bucket> =
  globalThis.__50PICK_RL_BUCKETS ?? (globalThis.__50PICK_RL_BUCKETS = new Map());

// Dev-only reset hook used by /api/dev-test/reset-rate-limits so test
// suites can wipe accumulated buckets between sections. Per-IP cap is
// REAL in production — only this dev endpoint and the test suites it
// powers ever touch the hook.
if (process.env.NODE_ENV !== "production") {
  globalThis.__50PICK_RL_RESET_HOOK = () => {
    const n = buckets.size;
    buckets.clear();
    return n;
  };
}

export type RateRule = { capacity: number; refillPerMin: number };

export const RATE_RULES: Record<string, RateRule> = {
  "otp.send":      { capacity: 5,  refillPerMin: 0.5 },   // 5 per ~10 min, refills slow
  "otp.resend":    { capacity: 1,  refillPerMin: 2 },     // ~30s hard spacing between sends (anti SMS-pumping)
  "otp.verify":    { capacity: 5,  refillPerMin: 1 },
  "auth.login":    { capacity: 8,  refillPerMin: 2 },
  "auth.register": { capacity: 3,  refillPerMin: 0.2 },   // 3 per hour per phone
  "password_reset":{ capacity: 5,  refillPerMin: 0.2 },   // 5 reset-link requests per ~hour per phone
  // Per-IP buckets for credential stuffing / mass-registration abuse.
  // Capacities above are per-phone; these add a separate ceiling per IP.
  "auth.register.ip": { capacity: 10, refillPerMin: 0.5 }, // 10 fresh phones per IP per ~20 min
  "auth.login.ip":    { capacity: 25, refillPerMin: 5 },   // looser — multiple devices share an IP
  "totp.verify":   { capacity: 5,  refillPerMin: 0.5 },   // 5 attempts per 10 min — prevents 6-digit brute force
  "chat.send":     { capacity: 10, refillPerMin: 2 },     // 10 messages burst, 2/min steady
  "kyc.submit":    { capacity: 5,  refillPerMin: 0.5 },
  "wallet.deposit":{ capacity: 20, refillPerMin: 4 },
  "wallet.withdraw":{ capacity: 6, refillPerMin: 0.5 },
  "bet.place":     { capacity: 30, refillPerMin: 10 },
  "bet.cashout":   { capacity: 10, refillPerMin: 2 },   // 10 burst, ~30s between after burst
};

export type RateResult = { allowed: boolean; remaining: number; retryAfterSec: number };

export function rateCheck(key: string, action: keyof typeof RATE_RULES): RateResult {
  const rule = RATE_RULES[action];
  if (!rule) return { allowed: true, remaining: Infinity, retryAfterSec: 0 };
  const now = Date.now();
  const bucketKey = `${action}:${key}`;
  const bucket = buckets.get(bucketKey) ?? { tokens: rule.capacity, updatedAt: now };
  const elapsedMin = (now - bucket.updatedAt) / 60_000;
  bucket.tokens = Math.min(rule.capacity, bucket.tokens + elapsedMin * rule.refillPerMin);
  bucket.updatedAt = now;

  if (bucket.tokens < 1) {
    const need = 1 - bucket.tokens;
    const retryAfterSec = Math.ceil((need / rule.refillPerMin) * 60);
    buckets.set(bucketKey, bucket);
    return { allowed: false, remaining: 0, retryAfterSec };
  }
  bucket.tokens -= 1;
  buckets.set(bucketKey, bucket);
  return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterSec: 0 };
}

/** Read-only snapshot of the current rate-limit buckets. Used by /admin/system. */
export function rateLimitSnapshot(): Array<{ key: string; action: string; tokens: number; capacity: number }> {
  const out: Array<{ key: string; action: string; tokens: number; capacity: number }> = [];
  for (const [bucketKey, b] of buckets.entries()) {
    const [action, ...rest] = bucketKey.split(":");
    const rule = RATE_RULES[action];
    out.push({
      key: rest.join(":"),
      action,
      tokens: Math.floor(b.tokens),
      capacity: rule?.capacity ?? 0,
    });
  }
  return out.sort((a, b) => a.action.localeCompare(b.action) || a.tokens - b.tokens);
}
