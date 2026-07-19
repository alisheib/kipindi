/**
 * Global event bus for server-sent events (SSE).
 *
 * A singleton EventEmitter pinned on `globalThis` so it survives Next.js
 * dev-mode hot-module-replacement (same pattern as __50PICK_STORE, audit
 * ring, rate-limit buckets, etc.). The SSE route subscribes to this bus
 * and forwards events to connected clients.
 *
 * Event types:
 *   market:odds       — real-time odds movement (marketId, yesPct)
 *   wallet:balance    — balance change after deposit/withdrawal/bet/payout
 *   notification:new  — new in-app notification for a user
 *   market:resolve    — market resolved to an outcome
 *
 * CROSS-CONTAINER FAN-OUT (optional, fail-open)
 * An EventEmitter reaches one process. With more than one Railway container a
 * player's EventSource is pinned to whichever instance answered the request,
 * while his bet settled on another — so `wallet:balance` and `notification:new`
 * were emitted into a process nobody was listening to, and his balance simply
 * never moved until he reloaded. When REDIS_URL is set, `emit()` also publishes
 * to a Redis channel and a dedicated subscriber re-emits remote messages onto
 * the local bus, so every container's clients see every event.
 *
 * With REDIS_URL unset this file behaves exactly as it always did: one process,
 * one emitter, no network. Redis is additive and never load-bearing — nothing
 * here can throw into a caller, and a Redis outage costs real-time updates, not
 * correctness (every surface still renders the truth from the database).
 */
import { EventEmitter } from "events";
import { randomUUID } from "crypto";
import { getRedis, getRedisSubscriber, setRedisSubscribed, withRedis } from "./redis";

// ── Typed event payloads ─────────────────────────────────────────────
export type SseEventMap = {
  "market:odds":       { marketId: string; yesPct: number };
  "wallet:balance":    { userId: string; balance: number };
  "notification:new":  { userId: string; notification: { id: string; title: string; body: string } };
  "market:resolve":    { marketId: string; outcome: "YES" | "NO" | "VOID" };
};

export type SseEventType = keyof SseEventMap;

/** Every type we are willing to accept off the wire — an allow-list, so a stray
 *  publisher on the same Redis cannot inject arbitrary event names into the bus. */
const KNOWN_EVENTS: ReadonlySet<string> = new Set<SseEventType>([
  "market:odds",
  "wallet:balance",
  "notification:new",
  "market:resolve",
]);

// ── Singleton emitter (globalThis-backed, HMR-safe) ──────────────────
const bus: EventEmitter =
  globalThis.__50PICK_EVENT_BUS ?? (globalThis.__50PICK_EVENT_BUS = new EventEmitter());

// Raise the default limit — in production many SSE clients may be
// listening concurrently; suppress the MaxListeners warning.
bus.setMaxListeners(500);

export const eventBus = bus;

/**
 * Identity of THIS process, minted once per container.
 *
 * Redis pub/sub delivers a message to every subscriber INCLUDING the publisher.
 * Without this tag, a container would receive its own emit back off the wire and
 * re-deliver it locally — every client seeing each event twice, and any future
 * re-publish on receipt turning into an infinite ping-pong between containers.
 * Messages carrying our own id are dropped on arrival.
 */
const INSTANCE_ID: string =
  globalThis.__50PICK_BUS_INSTANCE ?? (globalThis.__50PICK_BUS_INSTANCE = randomUUID());

const CHANNEL = "50pick:sse";

type WireMessage = { origin: string; type: string; data: unknown };

// ── Typed emit helper ────────────────────────────────────────────────
/**
 * Emit a typed SSE event. All server-side code should use this helper
 * instead of `eventBus.emit()` directly so the payload shape is enforced
 * at the call site.
 *
 * SYNCHRONOUS AND TOTAL. The local delivery happens first and always; the Redis
 * publish is fire-and-forget behind `withRedis`, so callers on money paths
 * (wallet-service, market-service) neither await it nor can be thrown into by
 * it. An emit that fails to reach other containers is a missed live update, and
 * that must never be allowed to unwind a settled bet.
 */
export function emit<T extends SseEventType>(type: T, data: SseEventMap[T]): void {
  eventBus.emit(type, data);
  publishRemote(type, data);
}

function publishRemote(type: SseEventType, data: unknown): void {
  try {
    if (!getRedis()) return; // unconfigured: latched false, costs nothing
    const payload = JSON.stringify({ origin: INSTANCE_ID, type, data } satisfies WireMessage);
    void withRedis((r) => r.publish(CHANNEL, payload), 0);
  } catch {
    // JSON.stringify on an unexpected payload, or anything else — emit() has a
    // void return and a real-money caller behind it; it does not throw.
  }
}

// ── Subscription ─────────────────────────────────────────────────────
/**
 * Listen for `type` and get an unsubscribe function back.
 *
 * Wrapping `on`/`removeListener` is what makes remote fan-out possible at all:
 * the subscriber connection is created lazily HERE, on the first real listener,
 * so a container that never serves an SSE stream never opens a second socket.
 * Returning the disposer (rather than exposing the raw handler) also removes the
 * leak class where a caller registers with one function identity and tries to
 * remove with another — on an emitter capped at 500 listeners, leaked handlers
 * eventually break the stream for everyone.
 */
export function subscribe<T extends SseEventType>(
  type: T,
  handler: (data: SseEventMap[T]) => void,
): () => void {
  ensureRemoteSubscriber();
  // ONE SUBSCRIBER MUST NOT BE ABLE TO SILENCE THE OTHERS. EventEmitter dispatches
  // listeners synchronously in registration order, so a throw in listener N stops
  // N+1..end from ever running — with every SSE client on the container registered
  // on the same bus, one client's handler throwing on an unexpected payload
  // dropped that event for all of them. Containing it here covers every consumer,
  // present and future, rather than trusting each one to be total.
  const fn = (data: unknown) => {
    try { handler(data as SseEventMap[T]); }
    catch { /* one stream's failure is not the other streams' problem */ }
  };
  eventBus.on(type, fn);
  let disposed = false;
  return () => {
    if (disposed) return; // idempotent — double-cleanup must not strip a rebind
    disposed = true;
    eventBus.removeListener(type, fn);
  };
}

/**
 * Lazily attach the dedicated subscriber connection.
 *
 * ioredis requires a SEPARATE connection for subscribe mode: once a connection
 * issues SUBSCRIBE it refuses ordinary commands, so reusing the shared client
 * would break the Redis rate limiter the instant the first SSE client connected.
 */
function ensureRemoteSubscriber(): void {
  if (globalThis.__50PICK_BUS_SUB_WIRED) return;
  let sub;
  try {
    sub = getRedisSubscriber();
  } catch {
    return; // fail-open: purely local fan-out
  }
  if (!sub) return;
  // The latch means HANDLERS ARE ATTACHED — nothing more. It must never be read
  // as "we are subscribed"; see the 'ready' wiring below for why.
  globalThis.__50PICK_BUS_SUB_WIRED = true;

  sub.on("message", (_channel: string, raw: string) => {
    try {
      const msg = JSON.parse(raw) as WireMessage;
      // Our own echo — already delivered locally by emit(). Dropping it here is
      // what prevents duplicate delivery and cross-container ping-pong.
      if (!msg || msg.origin === INSTANCE_ID) return;
      if (!KNOWN_EVENTS.has(msg.type)) return;
      // SHAPE, not just name. The allow-list above only vets `type`; `data` came
      // off the wire unvalidated, so a frame like {type:"wallet:balance",
      // data:null} reached consumers that legitimately read `data.userId` and
      // threw a TypeError inside EventEmitter's synchronous dispatch loop —
      // which ABORTS THE LOOP, so every listener after it is skipped. Since all
      // SSE clients on a container register the same handler shape, one bad
      // frame silently dropped that event for ALL of them, invisibly (the catch
      // below eats it). Realistic source: a rolling deploy where an old
      // container publishes the previous payload shape onto a shared channel.
      if (!msg.data || typeof msg.data !== "object") return;
      // eventBus.emit, NOT emit() — re-publishing a received message would
      // bounce it back onto the wire forever.
      eventBus.emit(msg.type, msg.data);
    } catch {
      // Malformed frame from an unknown publisher — drop it. A bad payload on a
      // shared Redis must not be able to crash the SSE fan-out.
    }
  });

  /**
   * SUBSCRIBE ONLY ON 'ready'. This is not defensive style — issuing it inline
   * was a 100% deterministic failure.
   *
   * getRedisSubscriber() starts connect() in the background, so at this point in
   * the SAME synchronous tick the socket is always status 'connecting' with no
   * stream yet. With enableOfflineQueue:false, ioredis rejects any command on a
   * non-writable socket (Redis.js:373-376), so the SUBSCRIBE was rejected every
   * single time, the empty .catch() hid it, and the latch above was already set
   * so it was never retried. Worse, ioredis only records a channel for
   * auto-resubscribe when the REPLY arrives (DataHandler.js:110), so the
   * reconnect path had nothing to restore either: the connection sat 'ready',
   * subscribed to nothing, for the container's lifetime.
   *
   * Measured against a live RESP server with these exact options —
   *   inline: "status at subscribe(): connecting | stream set? false"
   *           "SUBSCRIBE REJECTED -> Stream isn't writeable and enableOfflineQueue
   *            options is false"  →  auto-resubscribe set: (never entered)
   *   'ready'-gated: status ready  →  auto-resubscribe set: ['50pick:sse']
   *
   * 'ready' re-fires on every successful reconnect, so this also re-arms the
   * subscription after an outage. setRedisSubscribed() records the ACK so the
   * operator card cannot show fan-out green while it is off.
   */
  const doSubscribe = () => {
    void sub.subscribe(CHANNEL)
      .then(() => { setRedisSubscribed(true); })
      .catch(() => { setRedisSubscribed(false); /* fail-open: local-only */ });
  };
  sub.on("ready", doSubscribe);
  sub.on("close", () => setRedisSubscribed(false));
  sub.on("end", () => setRedisSubscribed(false));
  // Already ready (a reused connection): 'ready' will not fire again for us.
  if (sub.status === "ready") doSubscribe();
}

// ── TypeScript: augment globalThis ───────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_EVENT_BUS: EventEmitter | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_BUS_INSTANCE: string | undefined;
  // eslint-disable-next-line no-var
  var __50PICK_BUS_SUB_WIRED: boolean | undefined;
}
