/**
 * Prove Redis is in the LIVE REQUEST PATH, not merely reachable.
 *
 *   BASE=https://www.50pick.tz node scripts/live-redis-armed-drive.mjs
 *
 * ⚠️ WHY A DRIVE AND NOT A PING. `railway ssh` already proved the app's own ioredis can
 * connect, AUTH, and round-trip a SET/GET against production Redis. That answers "is it
 * reachable". It does not answer "is the application using it", and those are different
 * questions — the module is fail-open by design, so every consumer silently falls back to an
 * in-memory bucket when Redis is absent. A fail-open layer cannot report its own absence, which
 * is exactly why arming it needs a behavioural check rather than a connectivity one.
 *
 * `/api/health` reports `clientStatus: "none"` until something actually asks for Redis, because
 * `getRedis()` is lazy and constructs nothing on boot. So this drive makes one ordinary request
 * down a Redis-backed path and then reads health back.
 *
 * THE PATH CHOSEN, and why it is safe:
 *   `/auth/forgot-password` → `requestResetAction` → `rateCheckAsync(phone, "password_reset")`.
 * The rate-limit check happens BEFORE `requestPasswordReset`, so the Redis call is made
 * regardless of whether the number exists. The action then "always shows sent regardless of
 * whether the phone exists" to prevent enumeration, so a non-existent number sends nothing,
 * emails nobody and creates no account state. It is a request production receives routinely.
 *
 * ⛔ It moves no money, creates no account, and touches no real player's number.
 */
import { chromium } from "playwright";

const BASE = process.env.LIVE_BASE || process.env.BASE || "https://www.50pick.tz";
// A well-formed TZ mobile number that is deliberately implausible as a real registration.
const PROBE_MSISDN = process.env.PROBE_MSISDN || "799999999";

let pass = 0;
const failures = [];
const ok = (l, c, x = "") => {
  if (c) { pass++; console.log(`  ✓ ${l}${x ? ` — ${x}` : ""}`); }
  else { failures.push(l); console.log(`  ✗ ${l}${x ? ` — ${x}` : ""}`); }
};

const health = async () => {
  const r = await fetch(`${BASE}/api/health`, { cache: "no-store" });
  return (await r.json()).redis ?? {};
};

console.log(`\n=== Is Redis in the live request path? — ${BASE} ===\n`);

// ── 1 · the state BEFORE any Redis-backed request ────────────────────────────────────
const before = await health();
ok("both arming keys are present", before.enabled === true && before.urlPresent === true,
  `enabled=${before.enabled} urlPresent=${before.urlPresent}`);
ok("health reports a state word, not a bare boolean", typeof before.state === "string", before.state);
console.log(`    before: clientStatus=${before.clientStatus} connected=${before.connected}`);

// ── 2 · one ordinary request down a Redis-backed path ────────────────────────────────
const browser = await chromium.launch();
const page = await browser.newContext({ viewport: { width: 1200, height: 900 } }).newPage();
await page.goto(`${BASE}/auth/forgot-password`, { waitUntil: "domcontentloaded" });
const phoneBox = page.locator('input[inputmode="numeric"], input[type="tel"]').first();
await phoneBox.fill(PROBE_MSISDN);
await Promise.all([
  page.waitForLoadState("networkidle").catch(() => {}),
  page.locator('button[type="submit"]').first().click(),
]);
await page.waitForTimeout(2000);
const url = page.url();
await browser.close();

// The action redirects to ?sent=1 for any well-formed number — enumeration-safe by design.
ok("the reset request was accepted (rate-limit check ran before anything else)",
  /sent=1|rate_limited/.test(url), url);
ok("⛔ and it did NOT reveal whether the number exists",
  !/no_account|not_found|unknown/.test(url), url);

// ── 3 · the state AFTER — this is the assertion that matters ─────────────────────────
// Give the lazy connect a moment; it is kicked off in the background on first use.
await new Promise((r) => setTimeout(r, 3000));
const after = await health();
console.log(`    after:  clientStatus=${after.clientStatus} connected=${after.connected}`);

ok("🔴 a client now EXISTS — the request really went through Redis, not around it",
  after.clientStatus !== "none",
  `clientStatus=${after.clientStatus} (was ${before.clientStatus})`);
ok("🔴 and it is CONNECTED — rate limits are cross-container (audit H2 closed)",
  after.connected === true,
  after.lastError ? `lastError=${after.lastError}` : `state=${after.state}`);
ok("the state word says so in words", after.state === "cross-container", after.state);
ok("⛔ no credential in the public health payload",
  !JSON.stringify(after).includes("@redis.railway.internal") || /\*\*\*/.test(JSON.stringify(after)),
  "a construct error must be scrubbed before it is served");

console.log(`\n${"─".repeat(64)}`);
console.log(`  REDIS ARMED: ${pass} passed, ${failures.length} failed`);
if (failures.length) console.log(`\n  FAILED:\n${failures.map((f) => `   - ${f}`).join("\n")}`);
console.log(`  Reachable is not the same as in use. A fail-open layer cannot report its`);
console.log(`  own absence, so arming it needs a behavioural check, not a ping.`);
console.log(`${"─".repeat(64)}\n`);
process.exit(failures.length ? 1 : 0);
