/**
 * Redis — OPTIONAL, FAIL-OPEN infrastructure.
 *
 * Redis buys us exactly three things, and nothing else is allowed to depend on it:
 *   1. cross-container rate limits (rate-limit.ts) — closes audit H2, where two
 *      Railway containers each granted the full per-phone budget, doubling every
 *      OTP/login/register ceiling the compliance story claims.
 *   2. SSE pub/sub fan-out (event-bus.ts) — a wallet:balance emitted on container A
 *      never reached a player whose EventSource landed on container B.
 *   3. queue telemetry for the operator card.
 *
 * THE ONE RULE: THIS MODULE MUST NEVER BE ABLE TO BREAK A REQUEST.
 * 50pick is real money. An unreachable cache is an inconvenience; an unreachable
 * cache that throws into a bet, a login or a withdrawal is an outage. So every
 * single access goes through `withRedis(fn, fallback)`, which swallows EVERY
 * failure mode — connect refused, DNS miss, timeout, command error, parse error,
 * WRONGTYPE, OOM — and returns the caller's fallback. There is no code path in
 * this file that can propagate a rejection to a caller who used the primitive.
 *
 * REDIS IS NEVER ON THE ADMISSION / BET PATH. admission.ts does not import this
 * module (invariant 4 in its header) and the two bet-path rate-limit call sites
 * deliberately stay on the synchronous in-memory bucket — see rate-limit.ts. A
 * Redis stall must not be able to slow a bet, let alone stop one.
 *
 * WITH REDIS_URL UNSET — the production state today — this module is completely
 * inert: no client is constructed, no socket is opened, nothing is logged, and
 * every consumer falls through to the in-memory behaviour it had before. The
 * layer only wakes up when an operator configures it.
 *
 * TWO KEYS TO ARM IT: REDIS_ENABLED="true" *and* REDIS_URL. Configuring and
 * activating are deliberately separate acts. The Railway project already carries
 * Redis tiles and docs/CLOUDFLARE-SETUP-GUIDE.md walks an operator through wiring
 * `${{Redis.REDIS_URL}}` for unrelated reasons — so if the URL alone were the
 * on-switch, a 30-second variable edit made while following a CDN runbook would
 * silently move every login, OTP, deposit and withdrawal onto a Lua bucket and
 * start publishing SSE frames, with no deploy and no review. It also gives us an
 * instant rollback that does not require deleting a service reference.
 */

import Redis, { type RedisOptions } from "ioredis";

/* ── Tuning ──────────────────────────────────────────────────────────────── */

/**
 * Every option here exists to make a DEAD Redis cheap rather than slow.
 *
 * `enableOfflineQueue: false` is the important one: ioredis's default is to
 * BUFFER commands while disconnected and flush them on reconnect. On a fail-open
 * cache that is precisely wrong — a request would hang holding its promise while
 * a queue of stale rate-limit checks grew without bound. Off means a command
 * issued against a dead socket rejects immediately, which the breaker below then
 * turns into "don't even try" within a handful of attempts.
 */
const OPTIONS: RedisOptions = {
  lazyConnect: true,           // constructing the client must not open a socket
  enableOfflineQueue: false,   // fail NOW; never buffer work for a dead server
  maxRetriesPerRequest: 1,     // one retry, then surface it to withRedis
  connectTimeout: 1_000,
  commandTimeout: 1_000,
  enableReadyCheck: true,
  /**
   * Capped exponential backoff, FOREVER. Never return a non-number here.
   *
   * This previously gave up after 5 attempts (`times > 5 ? null : …`), which is
   * ~6.2s of total reconnect window. A non-number makes ioredis call
   * `setStatus("end")` and `flushQueue(CONNECTION_CLOSED)` — see
   * node_modules/ioredis/built/redis/event_handler.js:187-191 — and NOTHING ever
   * reconnects an ended client. Verified against a dead port: `status after
   * retryStrategy gave up: end` / `ping -> Connection is closed.` / `can it ever
   * recover? false`. Because getRedis() latches `initialised`, that dead client
   * was then handed to every caller for the life of the container.
   *
   * So any Redis outage longer than ~6s — a Railway redeploy of the Redis
   * service, a failover, a container that boots before Redis accepts connections
   * — permanently reverted us to per-container rate limits, silently reopening
   * the exact audit-H2 bug this module was written to close, while the operator
   * card still read healthy. Giving up is the wrong tool for cost control: the
   * circuit breaker below already makes a dead Redis cost ~0ms per call, and the
   * 10s ceiling bounds reconnect chatter to ~6 attempts/minute.
   */
  retryStrategy: (times: number) => Math.min(100 * 2 ** Math.min(times, 6), 10_000),
};

/** Consecutive command failures before we stop calling Redis at all. */
const BREAKER_THRESHOLD = 5;
/** How long the breaker stays open before one probe is allowed through. */
const BREAKER_COOLDOWN_MS = 30_000;

/* ── State (globalThis-pinned, HMR-safe — same pattern as the rate-limit
      buckets and the event bus) ───────────────────────────────────────────── */

type RedisState = {
  /** null both before first use and forever after, when REDIS_URL is unset. */
  client: Redis | null;
  subscriber: Redis | null;
  /** Set once we have looked at REDIS_URL — stops us re-checking on every call. */
  initialised: boolean;
  configured: boolean;
  consecutiveFailures: number;
  breakerOpenUntil: number;
  lastError: string | null;
  /** Subscriber-connection errors, kept SEPARATE from the command client's so a
   *  pub/sub blip cannot masquerade as a rate-limiter failure on the operator
   *  card during the incident an operator is actually reading it for. */
  subscriberError: string | null;
  /** True only once a SUBSCRIBE has actually been ACKed by the server. The
   *  operator card must never report fan-out green off a merely-connected
   *  socket — a connected subscriber subscribed to nothing is the failure mode
   *  that hid a total fan-out outage behind a healthy-looking card. */
  subscribed: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __50PICK_REDIS: RedisState | undefined;
}

const st: RedisState = globalThis.__50PICK_REDIS ?? (globalThis.__50PICK_REDIS = {
  client: null,
  subscriber: null,
  initialised: false,
  configured: false,
  consecutiveFailures: 0,
  breakerOpenUntil: 0,
  lastError: null,
  subscriberError: null,
  subscribed: false,
});

/* ── Client construction ─────────────────────────────────────────────────── */

/**
 * An ioredis client with NO 'error' listener CRASHES THE NODE PROCESS.
 * EventEmitter re-throws an unhandled 'error' event as an uncaught exception, so
 * a Redis outage — the exact scenario this whole module is built to survive —
 * would take the entire site down instead of degrading it. The listener is
 * therefore attached in the same statement that creates the client, before any
 * `await` can yield and before connect() is called.
 */
/**
 * `ownsBreaker` — ONLY the command client may touch the breaker.
 *
 * The breaker state describes the health of the connection the rate limiter
 * actually issues commands on. The subscriber is a second, independent socket:
 * letting its 'ready' reset `consecutiveFailures`/`breakerOpenUntil` meant a
 * flapping pub/sub connection force-closed the breaker while the command path
 * was genuinely unhealthy, and every login/OTP call immediately resumed paying a
 * full commandTimeout (1s) until 5 more failures re-accumulated — repeatedly,
 * once per flap. Its errors are recorded under their own key for the same
 * reason: attributing subscriber noise to `lastError` misdirects the operator.
 */
function attachHandlers(client: Redis, label: string, opts: { ownsBreaker: boolean }): void {
  client.on("error", (err: unknown) => {
    // Connection-level noise. Recorded for the operator card, deliberately NOT
    // counted toward the breaker: command failures (below) are the signal that
    // actually costs a request latency, and double-counting would trip the
    // breaker on a single blip.
    if (opts.ownsBreaker) st.lastError = `${label}: ${errText(err)}`;
    else st.subscriberError = `${label}: ${errText(err)}`;
  });
  client.on("ready", () => {
    if (!opts.ownsBreaker) { st.subscriberError = null; return; }
    st.consecutiveFailures = 0;
    st.breakerOpenUntil = 0;
    st.lastError = null;
  });
}

function errText(err: unknown): string {
  if (err instanceof Error) return err.message.slice(0, 200);
  return String(err).slice(0, 200);
}

/**
 * BOTH keys, or the layer stays inert. See the header: presence of a URL must
 * not be the on-switch, because the URL gets wired for reasons unrelated to this
 * feature (a Railway service reference, a runbook step) by people who are not
 * deciding to move production rate limiting onto a cache.
 */
function redisArmed(): boolean {
  return process.env.REDIS_ENABLED === "true" && !!process.env.REDIS_URL;
}

/**
 * The shared command client, or null when Redis is not armed.
 *
 * Lazy: nothing is constructed at import time, so importing this module (or
 * anything that imports it) is free. Unless BOTH REDIS_ENABLED="true" and
 * REDIS_URL are present the first call latches `initialised` and every
 * subsequent call returns null without touching the env again — no connection
 * attempt, no log spam, ever.
 */
export function getRedis(): Redis | null {
  // Self-heal a client ioredis has permanently ended. With the capped-forever
  // retryStrategy above this should be unreachable from an outage, but `end` is
  // still reachable via an explicit disconnect() — and the old failure mode
  // (dead client latched behind `initialised` and handed out forever) was severe
  // and silent enough that it is worth making structurally impossible rather
  // than relying on one option's value staying correct.
  if (st.client && st.client.status === "end") {
    st.client = null;
    st.initialised = false;
  }
  if (st.initialised) return st.client;
  st.initialised = true;

  if (!redisArmed()) {
    st.configured = false;
    return null;
  }
  const url = process.env.REDIS_URL!;
  st.configured = true;

  try {
    const client = new Redis(url, OPTIONS);
    attachHandlers(client, "client", { ownsBreaker: true });
    // lazyConnect means the socket opens only when we ask. Kick it off in the
    // background rather than on the first command, so the first rate-limit check
    // after boot isn't the one that pays the connect cost — and .catch() because
    // a rejected connect() here must not become an unhandled rejection.
    void client.connect().catch(() => { /* fail-open: withRedis reports it */ });
    st.client = client;
  } catch (err) {
    // `new Redis(...)` throws synchronously on a malformed URL.
    st.lastError = `construct: ${errText(err)}`;
    st.client = null;
  }
  return st.client;
}

/**
 * A SECOND, dedicated connection for pub/sub.
 *
 * Not an optimisation — a protocol requirement. Once a Redis connection issues
 * SUBSCRIBE it enters subscriber mode and will refuse every ordinary command on
 * that socket, so sharing the client above would break the rate limiter the
 * moment the first SSE listener attached.
 *
 * This is the ONE sanctioned raw-client accessor (pub/sub is push-based and
 * cannot be expressed through withRedis's call/fallback shape). Its single
 * consumer, event-bus.ts, wraps every use in try/catch.
 */
export function getRedisSubscriber(): Redis | null {
  // Same self-heal as getRedis, plus one extra step: event-bus.ts latches
  // `__50PICK_BUS_SUB_WIRED` once it has attached handlers to a subscriber, so
  // handing back a REBUILT client without clearing that latch would leave the
  // handlers bound to the discarded socket and fan-out dead with no signal.
  if (st.subscriber && st.subscriber.status === "end") {
    st.subscriber = null;
    st.subscribed = false;
    globalThis.__50PICK_BUS_SUB_WIRED = undefined;
  }
  if (st.subscriber) return st.subscriber;
  if (!redisArmed()) return null;
  const url = process.env.REDIS_URL!;
  try {
    const sub = new Redis(url, OPTIONS);
    attachHandlers(sub, "subscriber", { ownsBreaker: false });
    void sub.connect().catch(() => { /* fail-open: SSE stays per-container */ });
    st.subscriber = sub;
  } catch (err) {
    st.subscriberError = `subscriber-construct: ${errText(err)}`;
    st.subscriber = null;
  }
  return st.subscriber;
}

/**
 * Recorded by event-bus.ts when a SUBSCRIBE is ACKed (or the socket drops), so
 * redisHealth() can tell "connected" from "actually receiving fan-out". Nothing
 * else may set it — the flag's whole value is that it reflects a server reply
 * rather than our intent to subscribe.
 */
export function setRedisSubscribed(v: boolean): void {
  st.subscribed = v;
}

/* ── The fail-open primitive ─────────────────────────────────────────────── */

function recordFailure(err: unknown): void {
  st.consecutiveFailures++;
  st.lastError = errText(err);
  if (st.consecutiveFailures >= BREAKER_THRESHOLD) {
    // Open the breaker. Without this, a dead-but-resolving host costs every
    // caller a full commandTimeout (1s) forever. With it, a dead Redis costs
    // ~0ms and we spend one probe per cooldown window finding out it's back.
    st.breakerOpenUntil = Date.now() + BREAKER_COOLDOWN_MS;
  }
}

/**
 * THE fail-open primitive. Every Redis-backed feature goes through here.
 *
 * Runs `fn` against the shared client and returns its result. Returns `fallback`
 * — never throws — when Redis is unconfigured, the breaker is open, or `fn`
 * rejects for any reason whatsoever. Callers treat a `fallback` return as
 * "Redis had nothing to say" and proceed with their in-memory behaviour.
 */
export async function withRedis<T>(fn: (r: Redis) => Promise<T>, fallback: T): Promise<T> {
  // Breaker first: this is the branch that makes a dead Redis free.
  if (st.breakerOpenUntil > Date.now()) return fallback;

  let client: Redis | null;
  try {
    client = getRedis();
  } catch {
    return fallback; // defensive — getRedis already swallows, but never throw
  }
  if (!client) return fallback;

  try {
    const out = await fn(client);
    st.consecutiveFailures = 0;
    st.breakerOpenUntil = 0;
    st.lastError = null;
    return out;
  } catch (err) {
    recordFailure(err);
    return fallback;
  }
}

/* ── Telemetry ───────────────────────────────────────────────────────────── */

export type RedisHealth = {
  /** Armed: BOTH REDIS_ENABLED="true" and REDIS_URL. */
  configured: boolean;
  /** The two halves, so the card can say WHICH one is missing. */
  enabled: boolean;
  urlPresent: boolean;
  connected: boolean;
  /** Raw ioredis status ("none" when no client). `end` is reported distinctly
   *  because it used to mean "permanently dead but showing 0 failures". */
  clientStatus: string;
  /** SUBSCRIBE ACKed — i.e. cross-container SSE fan-out is genuinely live.
   *  `connected && !subscribed` is a real, previously-invisible outage. */
  subscribed: boolean;
  breakerOpen: boolean;
  lastError: string | null;
  subscriberError: string | null;
  consecutiveFailures: number;
};

/**
 * Honest health for the operator card. Reads the env directly rather than the
 * latched flags so the card is truthful before first use.
 */
export function redisHealth(): RedisHealth {
  const enabled = process.env.REDIS_ENABLED === "true";
  const urlPresent = !!process.env.REDIS_URL;
  return {
    configured: enabled && urlPresent,
    enabled,
    urlPresent,
    connected: st.client?.status === "ready",
    clientStatus: st.client?.status ?? "none",
    subscribed: st.subscribed,
    breakerOpen: st.breakerOpenUntil > Date.now(),
    lastError: st.lastError,
    subscriberError: st.subscriberError,
    consecutiveFailures: st.consecutiveFailures,
  };
}

/** Test-only: drop connections and return the module to its pre-first-use state. */
export function __resetRedisForTests(): void {
  for (const c of [st.client, st.subscriber]) {
    try { c?.disconnect(); } catch { /* already gone */ }
  }
  st.client = null;
  st.subscriber = null;
  st.initialised = false;
  st.configured = false;
  st.consecutiveFailures = 0;
  st.breakerOpenUntil = 0;
  st.lastError = null;
  st.subscriberError = null;
  st.subscribed = false;
  // event-bus.ts's wiring latch lives on globalThis and is NOT part of this
  // state object, so a reset that left it set meant ensureRemoteSubscriber()
  // returned early forever and no subscriber connection was created again for
  // the rest of the process. That silently de-wired the bus after the first
  // reset — which is precisely why this suite could not see that cross-container
  // fan-out had never worked at all. Also fixes Next.js dev HMR, where the same
  // latch survives module reload.
  globalThis.__50PICK_BUS_SUB_WIRED = undefined;
}
