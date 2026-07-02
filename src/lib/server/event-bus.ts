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
 */
import { EventEmitter } from "events";

// ── Typed event payloads ─────────────────────────────────────────────
export type SseEventMap = {
  "market:odds":       { marketId: string; yesPct: number };
  "wallet:balance":    { userId: string; balance: number };
  "notification:new":  { userId: string; notification: { id: string; title: string; body: string } };
  "market:resolve":    { marketId: string; outcome: "YES" | "NO" | "VOID" };
};

export type SseEventType = keyof SseEventMap;

// ── Singleton emitter (globalThis-backed, HMR-safe) ──────────────────
const bus: EventEmitter =
  globalThis.__50PICK_EVENT_BUS ?? (globalThis.__50PICK_EVENT_BUS = new EventEmitter());

// Raise the default limit — in production many SSE clients may be
// listening concurrently; suppress the MaxListeners warning.
bus.setMaxListeners(500);

export const eventBus = bus;

// ── Typed emit helper ────────────────────────────────────────────────
/**
 * Emit a typed SSE event. All server-side code should use this helper
 * instead of `eventBus.emit()` directly so the payload shape is enforced
 * at the call site.
 */
export function emit<T extends SseEventType>(type: T, data: SseEventMap[T]): void {
  eventBus.emit(type, data);
}

// ── TypeScript: augment globalThis ───────────────────────────────────
declare global {
  // eslint-disable-next-line no-var
  var __50PICK_EVENT_BUS: EventEmitter | undefined;
}
