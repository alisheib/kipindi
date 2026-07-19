/**
 * SSE endpoint — real-time push channel for authenticated users.
 *
 * GET /api/events → text/event-stream
 *
 * The stream:
 *  1. Validates the session (401 if missing/expired)
 *  2. Sends a heartbeat `:ping` comment every 15 s to keep proxies alive
 *  3. Listens to the global eventBus for typed events and forwards those
 *     relevant to this user (wallet:balance is user-scoped; market events
 *     are broadcast to all)
 *  4. Cleans up listeners on client disconnect
 *
 * Wire format per event:
 *   data: {"type":"wallet:balance","data":{"userId":"...","balance":1234}}
 *
 * Uses native ReadableStream + the process event bus. When REDIS_URL is set the
 * bus additionally fans out across containers (see event-bus.ts) — this route
 * needs no knowledge of that; `subscribe()` hides it and works either way.
 */
import { getSession } from "@/lib/server/session";
import { subscribe, type SseEventType } from "@/lib/server/event-bus";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// All event types the SSE stream forwards to clients.
const ALL_EVENTS: SseEventType[] = [
  "market:odds",
  "wallet:balance",
  "notification:new",
  "market:resolve",
];

// Events that are scoped to a specific userId — only forwarded if the
// payload's userId matches the connected session.
const USER_SCOPED: Set<SseEventType> = new Set([
  "wallet:balance",
  "notification:new",
]);

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const userId = session.userId;

  // Closure-scoped cleanup so both `start` and `cancel` can reference it.
  let cleanup: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      /** Enqueue an SSE-formatted message. */
      const send = (payload: string) => {
        try {
          controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
        } catch {
          // Stream already closed — clean up below will handle it.
        }
      };

      // ── Heartbeat — keeps the connection alive through Railway's proxy,
      //    CloudFlare, browser timeouts, etc. A `:ping` comment line is
      //    ignored by EventSource but resets idle timers.
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":ping\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 15_000);

      // ── Event listeners ────────────────────────────────────────────
      // subscribe() hands back its own disposer, so the handler identity we
      // registered can never drift from the one we remove — a mismatch would
      // leak a listener per disconnected client and, on a bus capped at 500,
      // eventually break the stream for everyone.
      const unsubscribes: Array<() => void> = [];

      for (const event of ALL_EVENTS) {
        unsubscribes.push(subscribe(event, (data) => {
          // User-scoped events: only forward if the payload belongs to
          // this session's user.
          // `?? {}` because with Redis fan-out on, `data` arrives off the wire
          // from another container. event-bus.ts validates the shape, but this
          // dereference must not be the thing that depends on it: a null payload
          // here threw inside EventEmitter's synchronous dispatch, which skips
          // every listener registered after this one — i.e. one malformed frame
          // dropped the event for every other connected client on the container.
          if (USER_SCOPED.has(event)) {
            const payload = (data ?? {}) as { userId?: string };
            if (payload.userId !== userId) return;
          }
          send(JSON.stringify({ type: event, data }));
        }));
      }

      // ── Cleanup on disconnect ──────────────────────────────────────
      cleanup = () => {
        clearInterval(heartbeat);
        for (const off of unsubscribes) off();
      };
    },

    cancel() {
      // Client disconnected — tear down listeners + heartbeat.
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "cache-control": "no-cache, no-store, must-revalidate",
      "connection": "keep-alive",
      "x-accel-buffering": "no", // Nginx / Railway proxy: don't buffer
    },
  });
}
