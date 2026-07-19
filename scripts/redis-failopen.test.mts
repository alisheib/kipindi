/**
 * Redis fail-open suite — the layer must be incapable of breaking the platform.
 *
 * Redis is optional infrastructure on 50pick: cross-container rate limits, SSE
 * fan-out, and telemetry. It is NEVER a money control and NEVER on the bet path.
 * The failure that this suite exists to make impossible is the one where a cache
 * outage becomes a real-money outage — a rejected login, a thrown emit, or a bet
 * that waits on a socket.
 *
 * The two states that actually ship are both pinned here:
 *   • REDIS_URL UNSET — production today. Must be byte-for-byte the old
 *     behaviour: no client, no socket, no log, in-memory buckets.
 *   • REDIS_URL pointing at a DEAD host — the outage. Must degrade silently, and
 *     BETS MUST STILL SUCCEED. That is the hard rule.
 *
 * ...and, since absent/dead cannot tell "it works" from "it has never once
 * worked", section L runs the pub/sub half against a REAL (minimal, in-process)
 * RESP server. Its absence is why cross-container fan-out shipped completely
 * non-functional behind a green suite: the SUBSCRIBE was rejected on every
 * container, every time, and nothing here could see it.
 *
 * In-memory store (no DATABASE_URL), so the whole thing runs without a database.
 */
import { readFileSync } from "node:fs";
import { getRedis, getRedisSubscriber, withRedis, redisHealth, __resetRedisForTests } from "../src/lib/server/redis.ts";
import { rateCheck, rateCheckAsync, RATE_RULES } from "../src/lib/server/rate-limit.ts";
import { emit, subscribe, eventBus } from "../src/lib/server/event-bus.ts";
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { createMarket, buyPosition, getMarket } from "../src/lib/server/market-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

/** A port nothing listens on — connect() is refused immediately, which is the
 *  cheapest realistic "Redis is down". */
const DEAD_URL = "redis://127.0.0.1:6390";

/**
 * Arm the layer: BOTH keys. REDIS_URL is configuration, REDIS_ENABLED is
 * activation — see section K, which pins that the URL alone stays inert.
 */
function setRedisUrl(url: string | undefined): void {
  if (url === undefined) { delete process.env.REDIS_URL; delete process.env.REDIS_ENABLED; }
  else { process.env.REDIS_URL = url; process.env.REDIS_ENABLED = "true"; }
  // State is latched on globalThis (HMR-safe), so a URL change only takes
  // effect after an explicit reset — same as a container restart in production.
  __resetRedisForTests();
}

async function fundedUser(id: string, balance: number): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25588${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

async function makeMarket(title: string): Promise<string> {
  const m = await createMarket({
    titleEn: title, titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
  return m.id;
}

// ════════════════════════════════════════════════════════════════════════════
// A · UNCONFIGURED IS INERT — the production state today. Nothing may change.
// ════════════════════════════════════════════════════════════════════════════
{
  setRedisUrl(undefined);

  ok("A: getRedis() is null with REDIS_URL unset", getRedis() === null);
  // Latched: a second call must not re-read the env or attempt a connection.
  ok("A: getRedis() stays null on repeat", getRedis() === null);

  const h = redisHealth();
  ok("A: health reports unconfigured", h.configured === false && h.connected === false);
  ok("A: health reports no failures", h.consecutiveFailures === 0 && h.lastError === null);
  ok("A: breaker closed when unconfigured", h.breakerOpen === false);

  // withRedis must hand back the fallback without ever invoking fn.
  let invoked = false;
  const out = await withRedis(async () => { invoked = true; return "redis"; }, "fallback");
  ok("A: withRedis returns fallback when unconfigured", out === "fallback", `got ${out}`);
  ok("A: withRedis never invokes fn when unconfigured", invoked === false);
}

// ════════════════════════════════════════════════════════════════════════════
// B · UNCONFIGURED RATE LIMITS == THE OLD BEHAVIOUR. rateCheckAsync must be the
//     in-memory bucket with an await in front of it — same budget, same
//     exhaustion point, same retryAfterSec.
// ════════════════════════════════════════════════════════════════════════════
{
  setRedisUrl(undefined);
  const rule = RATE_RULES["totp.verify"];
  const key = "rf_unconfigured_user";

  const results = [];
  for (let i = 0; i < rule.capacity + 2; i++) results.push(await rateCheckAsync(key, "totp.verify"));

  const allowed = results.filter((r) => r.allowed).length;
  ok("B: async allows exactly capacity", allowed === rule.capacity, `allowed=${allowed} capacity=${rule.capacity}`);
  ok("B: async denies past capacity", results[rule.capacity].allowed === false);
  ok("B: denial carries a retryAfterSec", results[rule.capacity].retryAfterSec > 0);

  // The sync limiter sees the same bucket — they are the same Map, which is what
  // makes the fallback seamless rather than a second, independent allowance.
  ok("B: sync limiter shares the exhausted bucket", rateCheck(key, "totp.verify").allowed === false);

  // Unknown action = unlimited allow, unchanged from the original contract.
  const unknown = await rateCheckAsync("x", "not.a.real.action");
  ok("B: unknown action allowed with Infinity remaining",
    unknown.allowed === true && unknown.remaining === Infinity);

  // The strongest form of "byte-for-byte identical": run both limiters against
  // fresh, parallel keys and compare the RESULT OBJECTS field by field at every
  // step of a bucket's life — first spend, mid-bucket, the exact exhaustion
  // point, and past it. Equivalent counts (above) would still pass if the async
  // path drifted on `remaining` or `retryAfterSec`; this would not.
  for (const action of ["auth.login", "totp.verify", "chat.send"] as const) {
    const cap = RATE_RULES[action].capacity;
    let same = true;
    let firstDiff = "";
    for (let i = 0; i < cap + 2; i++) {
      const s = rateCheck(`rf_parity_sync_${action}`, action);
      const a = await rateCheckAsync(`rf_parity_async_${action}`, action);
      if (s.allowed !== a.allowed || s.remaining !== a.remaining || s.retryAfterSec !== a.retryAfterSec) {
        if (same) firstDiff = `step ${i}: sync=${JSON.stringify(s)} async=${JSON.stringify(a)}`;
        same = false;
      }
    }
    ok(`B: async result is identical to sync across a full bucket (${action})`, same, firstDiff);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// C · DEAD HOST — every primitive degrades silently. Nothing throws, ever.
// ════════════════════════════════════════════════════════════════════════════
{
  setRedisUrl(DEAD_URL);

  ok("C: getRedis() returns a client when configured", getRedis() !== null);
  ok("C: health reports configured", redisHealth().configured === true);

  // Honesty, not optimism. `configured` means "an operator set REDIS_URL";
  // `connected` must mean "we are actually talking to it". Conflating the two is
  // exactly the defect the old stub had — it reported green off the env var
  // alone, so a Redis unreachable for hours still showed healthy on the operator
  // card and nobody went looking.
  ok("C: health does NOT claim connected against a dead host", redisHealth().connected === false);

  // A command against a refused socket must resolve to the fallback, not reject.
  let threw = false;
  let out: string | null = "unset";
  try {
    out = await withRedis(async (r) => { await r.ping(); return "pong"; }, null);
  } catch { threw = true; }
  ok("C: withRedis does not throw on a dead host", threw === false);
  ok("C: withRedis returns fallback on a dead host", out === null, `got ${out}`);

  // Rate limiting must still WORK — degraded to per-container, never disabled.
  // A dead cache that silently switched the limiter off would turn a Redis
  // outage into an open door on OTP and login brute force.
  const rule = RATE_RULES["auth.register"];
  const key = "rf_dead_host_phone";
  const res = [];
  for (let i = 0; i < rule.capacity + 2; i++) res.push(await rateCheckAsync(key, "auth.register"));
  const allowed = res.filter((r) => r.allowed).length;
  ok("C: limits still enforced with Redis dead", allowed === rule.capacity, `allowed=${allowed}`);
  ok("C: still denies past capacity with Redis dead", res[rule.capacity].allowed === false);
}

// ════════════════════════════════════════════════════════════════════════════
// D · NO THROW UNDER *ANY* ERROR — the fail-open guarantee itself.
//     Section C proves the one failure we can easily stage (a refused socket).
//     But withRedis promises to swallow EVERY failure mode, and the ones that
//     actually bite in production are the ones a dead port never produces: a
//     WRONGTYPE after a key-schema change, an OOM eviction error, a malformed
//     Lua reply, a null dereference in our own callback. Those arrive as a
//     REJECTED fn, not a dead connection — so drive fn directly and prove the
//     rejection is absorbed no matter what shape it has. A single escaping
//     throw here is a 500 on a login, a deposit, or a bet.
// ════════════════════════════════════════════════════════════════════════════
{
  setRedisUrl(DEAD_URL); // resets the breaker, so fn is actually reached

  // Every throwable shape JS permits — including the non-Error ones that naive
  // `err.message` handling turns into a *second* exception inside the catch.
  const throwers: Array<[string, () => never]> = [
    ["Error", () => { throw new Error("boom"); }],
    ["TypeError (null deref in our callback)", () => { throw new TypeError("x of undefined"); }],
    ["WRONGTYPE-style command error", () => { throw new Error("WRONGTYPE Operation against a key"); }],
    ["OOM command error", () => { throw new Error("OOM command not allowed when used memory > 'maxmemory'"); }],
    ["bare string", () => { throw "not an error object" as never; }],
    ["null", () => { throw null as never; }],
    ["undefined", () => { throw undefined as never; }],
    ["object with no message", () => { throw { code: "EPARSE" } as never; }],
  ];

  let escaped = "";
  let wrongFallback = "";
  let uncounted = "";
  for (const [label, thrower] of throwers) {
    // Reset before EACH shape. Five consecutive failures open the breaker, and an
    // open breaker returns the fallback without ever calling fn — so without this
    // the last three shapes would be absorbed by the short-circuit and the test
    // would be silently proving nothing about them.
    setRedisUrl(DEAD_URL);

    const sentinel = { fallback: label };
    let got: unknown = "never-assigned";
    try {
      got = await withRedis(async () => thrower(), sentinel);
    } catch {
      escaped += `${label} `;
    }
    if (got !== sentinel) wrongFallback += `${label} `;

    // The counter must MOVE. A withRedis that swallowed failures without
    // recording them would be silently fail-open forever, and the operator card
    // would show a healthy Redis that has not answered a command in days.
    // Exactly 1 also proves fn was genuinely reached, not short-circuited.
    const h = redisHealth();
    if (h.consecutiveFailures !== 1 || !h.lastError) {
      uncounted += `${label}(n=${h.consecutiveFailures},err=${h.lastError}) `;
    }
  }
  ok("D: no error shape escapes withRedis", escaped === "", `escaped: ${escaped}`);
  ok("D: the caller's fallback is returned for every error shape",
    wrongFallback === "", `wrong: ${wrongFallback}`);
  ok("D: every error shape is counted and recorded", uncounted === "", uncounted);

  // A success must CLEAR the counters, or the breaker would latch open after the
  // first transient blip and never let a recovered Redis back in.
  setRedisUrl(DEAD_URL);
  await withRedis(async () => { throw new Error("blip"); }, null);
  const okValue = await withRedis(async () => "worked", "fallback");
  ok("D: a non-throwing fn returns its own value", okValue === "worked", `got ${okValue}`);
  ok("D: success resets the failure counter", redisHealth().consecutiveFailures === 0,
    `got ${redisHealth().consecutiveFailures}`);
}

// ════════════════════════════════════════════════════════════════════════════
// E · THE CIRCUIT BREAKER — a dead Redis must cost ~zero, not a timeout per
//     call. Without this, every request pays commandTimeout forever.
// ════════════════════════════════════════════════════════════════════════════
{
  setRedisUrl(DEAD_URL);

  for (let i = 0; i < 8; i++) await withRedis(async (r) => r.ping(), null);
  const h = redisHealth();
  ok("E: failures were recorded", h.consecutiveFailures >= 1, `got ${h.consecutiveFailures}`);
  ok("E: breaker opened after repeated failures", h.breakerOpen === true,
    `failures=${h.consecutiveFailures} open=${h.breakerOpen}`);
  ok("E: lastError captured for the operator card", typeof h.lastError === "string" && h.lastError.length > 0);

  // With the breaker open, calls must short-circuit instead of each paying the
  // 1s commandTimeout. The bound is deliberately LOOSE: without the breaker these
  // 50 calls would take ~50 SECONDS, so anything in the low seconds still proves
  // the point by a factor of 25+. A tight bound (this was 250ms) measures the CI
  // runner's mood rather than our code, and a money platform's CI that cries wolf
  // is worse than no CI — people stop reading it.
  const t0 = Date.now();
  for (let i = 0; i < 50; i++) await withRedis(async (r) => r.ping(), null);
  const elapsed = Date.now() - t0;
  ok("E: breaker-open calls short-circuit (not 50x commandTimeout)", elapsed < 2_000, `${elapsed}ms for 50 calls`);

  // And the limiter keeps working through an open breaker.
  const r = await rateCheckAsync("rf_breaker_key", "chat.send");
  ok("E: rateCheckAsync still answers with breaker open", r.allowed === true);
}

// ════════════════════════════════════════════════════════════════════════════
// F · EVENT BUS — emit() is synchronous, total, and local-first. A dead Redis
//     costs a cross-container live update, never an exception into a money path
//     (wallet-service and market-service both emit mid-transaction).
// ════════════════════════════════════════════════════════════════════════════
{
  setRedisUrl(DEAD_URL);

  const seen: number[] = [];
  const off = subscribe("wallet:balance", (d) => seen.push(d.balance));

  let threw = false;
  try {
    emit("wallet:balance", { userId: "u1", balance: 4_200 });
  } catch { threw = true; }
  ok("F: emit does not throw with Redis dead", threw === false);
  ok("F: local delivery happened synchronously", seen.length === 1 && seen[0] === 4_200, `seen=${JSON.stringify(seen)}`);

  off();
  emit("wallet:balance", { userId: "u1", balance: 9_999 });
  ok("F: unsubscribe stops delivery", seen.length === 1, `seen=${JSON.stringify(seen)}`);

  // Idempotent disposer — a double cleanup (start + cancel both firing on an
  // aborted SSE stream) must not strip a listener a later subscribe rebound.
  const before = eventBus.listenerCount("wallet:balance");
  off(); off();
  ok("F: disposer is idempotent", eventBus.listenerCount("wallet:balance") === before,
    `${before} -> ${eventBus.listenerCount("wallet:balance")}`);

  // No listener leak across subscribe/unsubscribe cycles — the bus is capped at
  // 500 and a per-connection leak would eventually break SSE for everyone.
  const baseline = eventBus.listenerCount("market:odds");
  for (let i = 0; i < 100; i++) subscribe("market:odds", () => {})();
  ok("F: no listener leak over 100 cycles", eventBus.listenerCount("market:odds") === baseline,
    `${baseline} -> ${eventBus.listenerCount("market:odds")}`);
}

// ════════════════════════════════════════════════════════════════════════════
// G · THE HARD RULE — WITH REDIS POINTED AT A DEAD HOST, BETS STILL SUCCEED.
//     This is the assertion the whole design exists to satisfy. A bet must not
//     be able to fail, or even slow down, because a cache is unreachable.
// ════════════════════════════════════════════════════════════════════════════
{
  setRedisUrl(DEAD_URL);

  const mid = await makeMarket("Redis-dead betting market");
  const N = 20;
  const stake = 5_000;
  const uids = Array.from({ length: N }, (_, i) => `rf_bet_${i}`);
  for (const u of uids) await fundedUser(u, 100_000);

  const t0 = Date.now();
  const results = await Promise.all(
    uids.map((u, i) => buyPosition(u, { marketId: mid, side: i % 2 === 0 ? "YES" : "NO", stake })),
  );
  const elapsed = Date.now() - t0;

  const succeeded = results.filter((r) => r.ok).length;
  ok("G: EVERY bet succeeded with Redis dead", succeeded === N,
    `${succeeded}/${N}; first error=${JSON.stringify(results.find((r) => !r.ok))}`);

  // Money is still exactly conserved — the fail-open layer must not have
  // perturbed the pool arithmetic in any way.
  const m = (await getMarket(mid))!;
  ok("G: pool == Σ stakes with Redis dead", m.yesPool + m.noPool === N * stake,
    `pool=${m.yesPool + m.noPool} expected=${N * stake}`);

  // Not merely successful — UNSLOWED. If a bet ever awaited Redis, 20 bets would
  // cost 20 × commandTimeout (1s) at minimum. This is the timing proof that the
  // bet path never awaits a socket.
  // 20 bets awaiting Redis would cost >= 20s (20 x the 1s commandTimeout), so a
  // 10s bound still proves it by 2x while surviving a slow shared CI runner.
  ok("G: bets were not slowed by the dead cache", elapsed < 10_000, `${elapsed}ms for ${N} bets`);
}

// ════════════════════════════════════════════════════════════════════════════
// H · STRUCTURAL GUARDS — the invariants above are only true while the source
//     stays shaped this way, so pin the shape itself. These catch the
//     regression a future session would otherwise make in good faith.
// ════════════════════════════════════════════════════════════════════════════
{
  const admissionSrc = readFileSync("src/lib/server/admission.ts", "utf8");
  const importsRedis = /^\s*import[^;]*["'][^"']*\/redis(\.ts)?["']/m.test(admissionSrc)
    || /require\(["'][^"']*redis/.test(admissionSrc);
  ok("H: admission.ts does not import the Redis client", importsRedis === false);

  const marketSrc = readFileSync("src/lib/server/market-service.ts", "utf8");
  // The bet path must stay on the synchronous bucket: inside an admission slot,
  // an awaited Redis call would hold a scarce slot for a full command timeout.
  // Matches CALLS, not prose — the file explains this decision in a comment that
  // necessarily names the function.
  ok("H: market-service never calls rateCheckAsync", /rateCheckAsync\s*\(/.test(marketSrc) === false);
  const rlImport = marketSrc.match(/^import \{([^}]*)\} from "\.\/rate-limit";$/m);
  ok("H: market-service imports the rate limiter", rlImport !== null);
  ok("H: market-service binds only the sync rateCheck",
    rlImport !== null && rlImport[1].trim() === "rateCheck", `got ${rlImport?.[1]}`);
  ok("H: market-service still rate-limits bets", /rateCheck\(userId, "bet\.place"\)/.test(marketSrc));
  ok("H: market-service still rate-limits cash-out", /rateCheck\(userId, "bet\.cashout"\)/.test(marketSrc));

  // The dev reset hook is called synchronously by /api/dev-test/reset-rate-limits
  // and 30+ live-server suites, six of which throw on a non-2xx. It must stay a
  // synchronous `() => number` even though it now also clears Redis.
  setRedisUrl(DEAD_URL);
  await rateCheckAsync("rf_reset_probe", "chat.send");
  const hook = globalThis.__50PICK_RL_RESET_HOOK;
  ok("H: dev reset hook is installed", typeof hook === "function");
  const cleared = hook ? hook() : -1;
  ok("H: reset hook returns a number synchronously", typeof cleared === "number" && cleared >= 1, `got ${cleared}`);
}

// ════════════════════════════════════════════════════════════════════════════
// I · THE TWO-KEY GATE — REDIS_URL is configuration; REDIS_ENABLED is
//     activation. The Railway project already carries Redis tiles and
//     docs/CLOUDFLARE-SETUP-GUIDE.md walks an operator through wiring
//     ${{Redis.REDIS_URL}} for CDN reasons. If the URL alone armed the layer,
//     that runbook step would silently move every login, OTP, deposit and
//     withdrawal onto a Lua bucket — no deploy, no review, no decision.
// ════════════════════════════════════════════════════════════════════════════
{
  process.env.REDIS_URL = DEAD_URL;
  delete process.env.REDIS_ENABLED;
  __resetRedisForTests();

  ok("I: URL without REDIS_ENABLED constructs no client", getRedis() === null);
  const h = redisHealth();
  ok("I: health reports not-armed when only the URL is set", h.configured === false);
  ok("I: health still reports the URL present", h.urlPresent === true && h.enabled === false);

  // Inert means INERT: the limiter must be the plain in-memory bucket.
  let invoked = false;
  const out = await withRedis(async () => { invoked = true; return "redis"; }, "fallback");
  ok("I: withRedis is inert with the URL alone", out === "fallback" && invoked === false);

  // A non-"true" value must not arm it either — no truthiness games on a switch
  // that moves production rate limiting.
  for (const v of ["1", "yes", "TRUE", "on", ""]) {
    process.env.REDIS_ENABLED = v;
    __resetRedisForTests();
    ok(`I: REDIS_ENABLED="${v}" does not arm the layer`, getRedis() === null);
  }

  process.env.REDIS_ENABLED = "true";
  __resetRedisForTests();
  ok("I: both keys together DO arm the layer", getRedis() !== null);
}

// ════════════════════════════════════════════════════════════════════════════
// J · RECONNECTION IS POSSIBLE AT ALL. `retryStrategy` returning a non-number
//     makes ioredis setStatus("end") and never reconnect — and because
//     getRedis() latches, that dead client was handed to every caller for the
//     container's lifetime. One Redis redeploy (>6s) therefore reverted us to
//     per-container limits PERMANENTLY, silently reopening audit H2 while the
//     operator card still read healthy. Pin both halves: the strategy never
//     gives up, and an ended client is rebuilt rather than served forever.
// ════════════════════════════════════════════════════════════════════════════
{
  // The strategy is an ioredis option, so assert the source contract directly.
  const redisSrc = readFileSync("src/lib/server/redis.ts", "utf8");
  const strategy = redisSrc.match(/retryStrategy:\s*\(times: number\)\s*=>\s*([^\n]+)/);
  ok("J: retryStrategy is declared", strategy !== null);
  ok("J: retryStrategy never returns null (would end the client forever)",
    strategy !== null && !/null/.test(strategy[1]), `got ${strategy?.[1]}`);
  ok("J: retryStrategy caps its backoff", strategy !== null && /Math\.min/.test(strategy[1]));

  // And the structural safety net: an ended client must not be served forever.
  setRedisUrl(DEAD_URL);
  const first = getRedis();
  ok("J: a client exists against the dead host", first !== null);
  first?.disconnect();                    // forces status "end", as give-up did
  // disconnect() closes the socket; ioredis reaches "end" in its close handler on
  // a later tick, so poll rather than assume — asserting synchronously here
  // measured "connecting" and proved nothing about the rebuild below.
  for (let i = 0; i < 50 && first?.status !== "end"; i++) await new Promise((r) => setTimeout(r, 20));
  ok("J: disconnect really ends the client", first?.status === "end", `got ${first?.status}`);
  const second = getRedis();
  ok("J: getRedis rebuilds an ENDED client instead of serving it forever",
    second !== null && second !== first, `same instance? ${second === first}`);
  ok("J: health names the ended state distinctly rather than showing 0 failures",
    typeof redisHealth().clientStatus === "string");
  second?.disconnect();
}

// ════════════════════════════════════════════════════════════════════════════
// K · A MALFORMED FRAME MUST NOT SILENCE EVERY OTHER CLIENT.
//     EventEmitter dispatches listeners synchronously in order, so a throw in
//     listener N skips N+1..end. Every SSE client on a container registers the
//     same handler shape (it reads data.userId), so ONE null payload off the
//     wire dropped that event for ALL of them — invisibly, because event-bus's
//     catch swallowed it. Real-money consequence: a wallet:balance update that
//     simply never arrives.
// ════════════════════════════════════════════════════════════════════════════
{
  setRedisUrl(undefined);

  const fired: string[] = [];
  // Listener 1 is shaped exactly like src/app/api/events/route.ts — it reads
  // `.userId` off the payload, which is what threw.
  const offA = subscribe("wallet:balance", (d) => {
    const p = (d ?? {}) as { userId?: string };
    if (p.userId !== "u1") return;
    fired.push("route");
  });
  const offB = subscribe("wallet:balance", () => fired.push("second"));
  const offC = subscribe("wallet:balance", () => { throw new Error("this client is broken"); });
  const offD = subscribe("wallet:balance", () => fired.push("fourth"));

  // A hostile/legacy payload straight onto the bus, as a bad wire frame would be.
  let threw = false;
  try { eventBus.emit("wallet:balance", null); } catch { threw = true; }
  ok("K: a null payload does not throw out of emit", threw === false);
  ok("K: listeners after a null payload still run", fired.includes("second") && fired.includes("fourth"),
    `fired=${JSON.stringify(fired)}`);

  // And a genuinely throwing listener must not take the others down either.
  fired.length = 0;
  eventBus.emit("wallet:balance", { userId: "u1", balance: 1 });
  ok("K: a THROWING listener does not abort the dispatch loop",
    fired.includes("route") && fired.includes("second") && fired.includes("fourth"),
    `fired=${JSON.stringify(fired)}`);

  offA(); offB(); offC(); offD();
}

// ════════════════════════════════════════════════════════════════════════════
// L · CROSS-CONTAINER FAN-OUT ACTUALLY WORKS — against a REAL server.
//
//     This is the section whose absence hid a total outage. Every other test
//     here runs Redis absent or dead, which cannot distinguish "fan-out works"
//     from "fan-out has never once worked". It had never once worked: the
//     SUBSCRIBE was issued in the same synchronous tick as connect(), so with
//     enableOfflineQueue:false ioredis rejected it 100% of the time, the empty
//     .catch() hid the rejection, and the wired-latch meant it was never
//     retried. The connection sat 'ready', subscribed to nothing, forever.
//
//     A minimal in-process RESP server is enough to prove the real thing: a
//     frame published by ANOTHER origin must land on this container's bus.
// ════════════════════════════════════════════════════════════════════════════
{
  const { createServer } = await import("node:net");
  const subscribers = new Set<import("node:net").Socket>();
  const bulk = (s: string) => `$${Buffer.byteLength(s)}\r\n${s}\r\n`;

  const server = createServer((sock) => {
    let buf = "";
    sock.on("data", (chunk) => {
      buf += chunk.toString("binary");
      // Minimal RESP array parser — enough for INFO/SUBSCRIBE/PUBLISH/PING.
      for (;;) {
        if (!buf.startsWith("*")) break;
        const head = buf.indexOf("\r\n");
        if (head < 0) break;
        const argc = Number(buf.slice(1, head));
        let pos = head + 2;
        const args: string[] = [];
        let complete = true;
        for (let i = 0; i < argc; i++) {
          if (buf[pos] !== "$") { complete = false; break; }
          const lenEnd = buf.indexOf("\r\n", pos);
          if (lenEnd < 0) { complete = false; break; }
          const len = Number(buf.slice(pos + 1, lenEnd));
          const start = lenEnd + 2;
          if (buf.length < start + len + 2) { complete = false; break; }
          args.push(Buffer.from(buf.slice(start, start + len), "binary").toString("utf8"));
          pos = start + len + 2;
        }
        if (!complete) break;
        buf = buf.slice(pos);

        const cmd = (args[0] ?? "").toUpperCase();
        if (cmd === "INFO") sock.write(bulk("redis_version:7.0.0\r\nloading:0\r\n"));
        else if (cmd === "PING") sock.write("+PONG\r\n");
        else if (cmd === "SUBSCRIBE") {
          subscribers.add(sock);
          sock.write(`*3\r\n${bulk("subscribe")}${bulk(args[1] ?? "")}:1\r\n`);
        } else if (cmd === "PUBLISH") {
          const [, ch, payload] = args;
          for (const s of subscribers) s.write(`*3\r\n${bulk("message")}${bulk(ch)}${bulk(payload)}`);
          sock.write(`:${subscribers.size}\r\n`);
        } else sock.write("+OK\r\n");
      }
    });
    sock.on("error", () => { subscribers.delete(sock); });
    sock.on("close", () => { subscribers.delete(sock); });
  });
  await new Promise<void>((r) => server.listen(6403, "127.0.0.1", () => r()));

  setRedisUrl("redis://127.0.0.1:6403");

  // Opening an SSE stream is what lazily wires the subscriber, exactly as
  // src/app/api/events/route.ts does.
  const got: Array<{ userId: string; balance: number }> = [];
  const off = subscribe("wallet:balance", (d) => got.push(d));

  // Give the socket time to reach 'ready' and land its SUBSCRIBE. The bug was
  // that this never happened; a generous wait makes a failure here unambiguous.
  await new Promise((r) => setTimeout(r, 1_200));

  ok("L: the subscriber connection reports SUBSCRIBED (not merely connected)",
    redisHealth().subscribed === true,
    `health=${JSON.stringify(redisHealth())}`);
  ok("L: health does not claim fan-out green off a bare connection",
    redisHealth().subscribed === true && redisHealth().clientStatus !== "end");

  // Now play the part of ANOTHER container: publish a frame with a foreign
  // origin onto the shared channel and require it to reach this bus.
  const IORedis = (await import("ioredis")).default;
  const pub = new IORedis("redis://127.0.0.1:6403", { lazyConnect: true, enableOfflineQueue: false });
  pub.on("error", () => {});
  await pub.connect().catch(() => {});
  await pub.publish("50pick:sse", JSON.stringify({
    origin: "another-container", type: "wallet:balance", data: { userId: "u_remote", balance: 7_777 },
  }));
  await new Promise((r) => setTimeout(r, 400));

  ok("L: a frame from another container is delivered to this bus",
    got.some((d) => d.userId === "u_remote" && d.balance === 7_777), `got=${JSON.stringify(got)}`);

  // Our OWN echo must be dropped, or every client sees each event twice and any
  // future re-publish becomes an infinite ping-pong between containers.
  const before = got.length;
  emit("wallet:balance", { userId: "u_local", balance: 111 });
  await new Promise((r) => setTimeout(r, 400));
  const localDeliveries = got.filter((d) => d.userId === "u_local").length;
  ok("L: our own echo is not re-delivered (exactly one local delivery)",
    localDeliveries === 1, `deliveries=${localDeliveries} (before=${before})`);

  // A wire frame with an allow-listed type but a junk payload must be dropped at
  // the bus boundary, not dereferenced by consumers.
  for (const bad of [null, 42, "string", true, undefined]) {
    await pub.publish("50pick:sse", JSON.stringify({
      origin: "another-container", type: "wallet:balance", data: bad,
    }));
  }
  await new Promise((r) => setTimeout(r, 400));
  ok("L: junk-payload frames are dropped, not delivered",
    got.every((d) => d && typeof d === "object"), `got=${JSON.stringify(got)}`);

  // And a real frame still arrives AFTER the junk — proving the junk did not
  // wedge the subscriber or the dispatch loop.
  await pub.publish("50pick:sse", JSON.stringify({
    origin: "another-container", type: "wallet:balance", data: { userId: "u_after", balance: 3_030 },
  }));
  await new Promise((r) => setTimeout(r, 400));
  ok("L: fan-out still works after malformed frames",
    got.some((d) => d.userId === "u_after"), `got=${JSON.stringify(got)}`);

  // THE REGRESSION GUARD for finding 4: a reset must fully de-latch the bus, or
  // every later section silently tests a permanently de-wired subscriber — which
  // is exactly how the defect above stayed invisible behind 48 green assertions.
  off();
  __resetRedisForTests();
  ok("L: reset clears the bus wiring latch",
    globalThis.__50PICK_BUS_SUB_WIRED === undefined,
    `latch=${globalThis.__50PICK_BUS_SUB_WIRED}`);

  const got2: Array<{ userId: string }> = [];
  const off2 = subscribe("wallet:balance", (d) => got2.push(d));
  await new Promise((r) => setTimeout(r, 1_200));
  ok("L: a subscriber is rebuilt and re-subscribes after a reset",
    redisHealth().subscribed === true, `health=${JSON.stringify(redisHealth())}`);

  await pub.publish("50pick:sse", JSON.stringify({
    origin: "another-container", type: "wallet:balance", data: { userId: "u_post_reset", balance: 1 },
  }));
  await new Promise((r) => setTimeout(r, 400));
  ok("L: fan-out is live again after a reset",
    got2.some((d) => d.userId === "u_post_reset"), `got2=${JSON.stringify(got2)}`);

  off2();
  pub.disconnect();
  setRedisUrl(undefined);
  await new Promise<void>((r) => server.close(() => r()));
}

// ════════════════════════════════════════════════════════════════════════════
// M · THE SUBSCRIBER MUST NOT TOUCH THE COMMAND CLIENT'S BREAKER. The two
//     sockets have independent health but shared one state object, so a
//     subscriber reconnect force-closed a breaker the command path had opened
//     for good reason — re-arming 5 more full commandTimeout stalls on the
//     login/OTP paths, once per flap.
// ════════════════════════════════════════════════════════════════════════════
{
  const redisSrc = readFileSync("src/lib/server/redis.ts", "utf8");
  ok("M: attachHandlers takes an ownsBreaker flag",
    /attachHandlers\([^)]*ownsBreaker: boolean/.test(redisSrc));
  ok("M: the command client owns the breaker",
    /attachHandlers\(client, "client", \{ ownsBreaker: true \}\)/.test(redisSrc));
  ok("M: the subscriber does NOT own the breaker",
    /attachHandlers\(sub, "subscriber", \{ ownsBreaker: false \}\)/.test(redisSrc));

  // Behavioural proof: open the breaker on the command path, then let a
  // subscriber connection go 'ready' and require the breaker to stay open.
  setRedisUrl(DEAD_URL);
  for (let i = 0; i < 8; i++) await withRedis(async (r) => r.ping(), null);
  ok("M: breaker is open before the subscriber event", redisHealth().breakerOpen === true);

  const sub = getRedisSubscriber();
  sub?.emit("ready");                                   // simulate a subscriber flap
  ok("M: a subscriber 'ready' does not force the breaker closed",
    redisHealth().breakerOpen === true, `health=${JSON.stringify(redisHealth())}`);

  sub?.emit("error", new Error("subscriber-side blip"));
  const h = redisHealth();
  ok("M: subscriber errors are recorded under their own key",
    h.subscriberError !== null && /subscriber-side blip/.test(h.subscriberError));
  ok("M: subscriber noise does not masquerade as a command failure",
    h.lastError === null || !/subscriber-side blip/.test(h.lastError), `lastError=${h.lastError}`);
}

// Drop the sockets so the process can exit — ioredis keeps the event loop alive.
setRedisUrl(undefined);

console.log(`\nredis-failopen: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
// Explicit clean exit: a lingering ioredis handle would otherwise hang the run.
process.exit(0);
