/**
 * Token-bucket rate limiter — in-memory.
 * Per (key, action) pair, e.g. ("phone:+25571234", "otp.send").
 * Compliance: helps prevent brute force, OTP enumeration, abuse.
 * Production: swap to Redis-backed bucket (interface unchanged).
 */

type Bucket = { tokens: number; updatedAt: number };
const buckets = new Map<string, Bucket>();

export type RateRule = { capacity: number; refillPerMin: number };

export const RATE_RULES: Record<string, RateRule> = {
  "otp.send":      { capacity: 5,  refillPerMin: 0.5 },   // 5 per ~10 min, refills slow
  "otp.verify":    { capacity: 5,  refillPerMin: 1 },
  "auth.login":    { capacity: 8,  refillPerMin: 2 },
  "auth.register": { capacity: 3,  refillPerMin: 0.2 },   // 3 per hour
  "kyc.submit":    { capacity: 5,  refillPerMin: 0.5 },
  "wallet.deposit":{ capacity: 20, refillPerMin: 4 },
  "wallet.withdraw":{ capacity: 6, refillPerMin: 0.5 },
  "bet.place":     { capacity: 30, refillPerMin: 10 },
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
