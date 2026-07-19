/**
 * Token-bucket rate limiter.
 * Per (key, action) pair, e.g. ("phone:+25571234", "otp.send").
 * Compliance: helps prevent brute force, OTP enumeration, abuse.
 *
 * TWO IMPLEMENTATIONS, ONE INTERFACE:
 *   • `rateCheck()`      — synchronous, in-memory, per-container. The original,
 *                          untouched. Still the authority when Redis is absent,
 *                          the fallback when Redis fails, and the ONLY thing the
 *                          bet path is allowed to call (see BET PATH below).
 *   • `rateCheckAsync()` — the same bucket evaluated in Redis via a single atomic
 *                          Lua EVAL, so N containers share one budget. Falls back
 *                          to `rateCheck()` on any Redis absence or failure.
 *
 * WHY THE REDIS VERSION EXISTS (audit H2): the buckets are per-process. Two
 * Railway containers each granted the full per-phone allowance, so the real
 * ceiling was N× whatever the rule says — "3 registrations per hour per phone"
 * was actually 3×N, and the compliance story was overstating the control. The
 * Lua script does read → refill → consume in ONE round trip, so two containers
 * cannot both spend the last token.
 *
 * FAIL-OPEN, DELIBERATELY. If Redis is down, `rateCheckAsync` silently degrades
 * to the in-memory bucket. Rate limiting is an abuse control, not a money
 * control — the correct failure mode is "throttle per-container like we did
 * before", never "refuse the request" and never "throw". Refusing logins because
 * a cache blinked would be a self-inflicted outage on a real-money platform.
 *
 * ⚠️ BET PATH — the two `bet.place` / `bet.cashout` call sites in market-service
 * stay on the SYNCHRONOUS `rateCheck()`. Both run inside an admission slot
 * (withAdmission → withTransientRetry → buyPositionInner), so an awaited Redis
 * stall there would hold a scarce slot and throttle bet throughput — exactly the
 * outcome admission.ts invariant 4 exists to prevent. Redis is never allowed to
 * slow a bet, so the bet path keeps the in-process bucket.
 */

import { getRedis, withRedis } from "./redis";

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
//
// The signature stays `() => number` (its route surfaces the return as
// `cleared`), so the Redis half is fire-and-forget: 30+ live-server suites call
// this endpoint and six of them throw on a non-2xx, so it must answer instantly
// and must not be able to fail because a cache is unreachable.
if (process.env.NODE_ENV !== "production") {
  globalThis.__50PICK_RL_RESET_HOOK = () => {
    const n = buckets.size;
    buckets.clear();
    void clearRedisBuckets();
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
  // Confirmation-link resends, per user. Reachable from the deposit gate, so a
  // stuck player will tap it — 3 quickly is generous, then ~1 every 2 min. Tight
  // enough that a signed-in account can't flood a third party's inbox with our
  // mail (which would also burn our sending reputation).
  "email.verify.resend": { capacity: 3, refillPerMin: 0.5 },
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
  "ai.batch":      { capacity: 5,  refillPerMin: 0.25 }, // 5 batch-generations burst, ~4/hr — caps AI-spend abuse
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

/* ── Redis-backed bucket ─────────────────────────────────────────────────── */

const REDIS_PREFIX = "50pick:rl:";

/**
 * Atomic token bucket. Read + refill + consume in ONE round trip — the whole
 * point of the exercise. A GET/compute/SET from JS would let two containers read
 * the same last token and both spend it, which is the bug this replaces.
 *
 * The maths mirror `rateCheck` above line-for-line, including the two subtleties
 * worth stating: a DENIED call still writes the bucket back (so `updatedAt`
 * advances and refill accrues from the last CALL, not the last GRANT), and
 * tokens are stored as fractional floats so slow refill rates work at all.
 *
 * Returns { allowed, flooredTokens, retryAfterSec, exactTokens } — `exactTokens`
 * is a string because Redis has no float return type, and we need the fraction
 * to keep the local mirror faithful.
 */
const BUCKET_LUA = `
local key          = KEYS[1]
local capacity     = tonumber(ARGV[1])
local refillPerMin = tonumber(ARGV[2])
local nowMs        = tonumber(ARGV[3])
local ttlMs        = tonumber(ARGV[4])

local cur    = redis.call('HMGET', key, 'tokens', 'ts')
local tokens = tonumber(cur[1])
local ts     = tonumber(cur[2])
if tokens == nil or ts == nil then
  tokens = capacity
  ts     = nowMs
end

-- Clamp negative elapsed time. Containers do not share a clock, so a caller on a
-- box whose clock lags the last writer's would otherwise compute a negative
-- refill and silently DESTROY tokens it never spent.
local elapsedMin = (nowMs - ts) / 60000
if elapsedMin < 0 then elapsedMin = 0 end

tokens = math.min(capacity, tokens + elapsedMin * refillPerMin)

local allowed = 0
local retry   = 0
if tokens < 1 then
  retry = math.ceil(((1 - tokens) / refillPerMin) * 60)
else
  tokens  = tokens - 1
  allowed = 1
end

redis.call('HSET', key, 'tokens', tostring(tokens), 'ts', tostring(nowMs))
redis.call('PEXPIRE', key, ttlMs)

return { allowed, math.floor(tokens), retry, tostring(tokens) }
`;

/**
 * TTL = long enough for an empty bucket to refill completely, plus slack. Any
 * shorter and an expiry would hand a throttled abuser a free full bucket; any
 * longer just wastes memory on keys that are already at capacity.
 */
function bucketTtlMs(rule: RateRule): number {
  return Math.ceil((rule.capacity / rule.refillPerMin) * 60_000) + 60_000;
}

/**
 * Cross-container rate check. Prefer this everywhere EXCEPT the bet path.
 *
 * Degrades to the synchronous in-memory bucket whenever Redis is unconfigured,
 * unreachable, breaker-open, or returns anything we don't recognise — so with
 * REDIS_URL unset (production today) this is `rateCheck()` with one extra
 * microtask and nothing else.
 */
export async function rateCheckAsync(key: string, action: keyof typeof RATE_RULES): Promise<RateResult> {
  const rule = RATE_RULES[action];
  if (!rule) return { allowed: true, remaining: Infinity, retryAfterSec: 0 };

  // Cheap pre-check: with no REDIS_URL this is a latched boolean, so the
  // unconfigured path never even allocates a promise chain into withRedis.
  if (!getRedis()) return rateCheck(key, action);

  const bucketKey = `${action}:${key}`;
  const now = Date.now();

  const raw = await withRedis<unknown[] | null>(
    (r) => r.eval(
      BUCKET_LUA, 1, `${REDIS_PREFIX}${bucketKey}`,
      String(rule.capacity), String(rule.refillPerMin), String(now), String(bucketTtlMs(rule)),
    ) as Promise<unknown[]>,
    null,
  );

  // null = Redis said nothing (absent / breaker open / any failure). Fail open
  // onto the bucket this container has always had.
  if (!Array.isArray(raw) || raw.length < 4) return rateCheck(key, action);

  const allowed = Number(raw[0]) === 1;
  const remaining = Number(raw[1]);
  const retryAfterSec = Number(raw[2]);
  const exactTokens = Number(raw[3]);
  if (!Number.isFinite(remaining) || !Number.isFinite(retryAfterSec)) return rateCheck(key, action);

  // Mirror the authoritative Redis state into the local Map. Two reasons:
  // rateLimitSnapshot() (the /admin/system card) reads this Map, and if Redis
  // dies mid-flight the fallback bucket then resumes from a realistic token
  // count instead of a stale full one.
  buckets.set(bucketKey, {
    tokens: Number.isFinite(exactTokens) ? exactTokens : remaining,
    updatedAt: now,
  });

  return { allowed, remaining, retryAfterSec };
}

/**
 * Best-effort wipe of the Redis buckets, for the dev reset hook only. SCAN
 * (never KEYS) so a large keyspace can't block the server, and every step is
 * inside withRedis so a failure is a no-op rather than a thrown reset.
 */
async function clearRedisBuckets(): Promise<void> {
  await withRedis(async (r) => {
    let cursor = "0";
    do {
      const [next, keys] = await r.scan(cursor, "MATCH", `${REDIS_PREFIX}*`, "COUNT", 500);
      if (keys.length) await r.del(...keys);
      cursor = next;
    } while (cursor !== "0");
    return true;
  }, false);
}

/**
 * Read-only snapshot of the current rate-limit buckets. Used by /admin/system.
 *
 * Stays SYNCHRONOUS on purpose — the admin page calls it un-awaited, and a
 * health card must never be able to 500 the system page or block it on a
 * network round trip. Under Redis this therefore shows THIS container's mirror
 * of the buckets it has personally evaluated, not the platform-wide keyspace;
 * the page says so, and the true cross-container state lives in Redis.
 */
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
