/**
 * Error-monitoring seam (audit H6).
 *
 * ONE place server errors flow to an external monitor. Today every uncaught
 * server error is logged as a greppable `[snag]` block (instrumentation.ts) — the
 * moment a `SENTRY_DSN` is set AND `@sentry/node` is installed, the SAME errors
 * also ship to Sentry, with no other code change. Best-effort + fail-open:
 * monitoring can NEVER throw into a request path (skill §0: never break the
 * request path; alarm, don't crash).
 *
 * ✅ 2026-07-30 — `@sentry/node` IS now installed and the seam is proven end to end:
 * `test:alerting` points a real client at a throwaway HTTP server, pushes a real error
 * through `captureServerError`, and inspects the bytes that arrive. **One step remains and
 * it is Ali's**: set `SENTRY_DSN` (+ optional `SENTRY_ENVIRONMENT`,
 * `SENTRY_TRACES_SAMPLE_RATE`, `SENTRY_MAX_BREADCRUMBS`) and redeploy. Until then nothing
 * pages anyone — errors are durable on box, and silent.
 *
 * 🔴 AND THE THING THAT GATE FOUND. `captureException` was being handed the RAW error
 * while only the audit sink ran `scrubForAudit` — so the first alert ever sent would have
 * carried a player's phone number out of Tanzania. Removing `beforeSend` below and
 * re-running `test:alerting` shows a real +255…, a real email and a real NIDA in the
 * envelope on the wire. It was dormant only because no DSN was ever set.
 */

type SentryLike = {
  init?: (opts: Record<string, unknown>) => void;
  captureException: (e: unknown, hint?: Record<string, unknown>) => void;
  flush?: (timeout?: number) => Promise<boolean>;
};

/**
 * Scrub every string in a Sentry event before it leaves the machine.
 *
 * 🔴 WHY THIS EXISTS. `captureException` was handed the RAW error while only the audit
 * sink ran `scrubForAudit`. The scrubber sat one line away from the call that ships data
 * to a third party and was not applied to it — so the moment a DSN was set, every MSISDN,
 * email and NIDA that had found its way into an exception message or a stack frame would
 * have been sent off-box, out of the country, by a licensed operator that has never asked
 * a player for permission to do that. The on-box audit sink was scrubbed precisely because
 * that data is sensitive; the sink that actually leaves the building was not.
 *
 * Walks the whole event rather than a list of known fields: `message`,
 * `exception.values[].value`, breadcrumbs, `extra`, request data and framed local
 * variables are all strings Sentry may carry, and an allowlist of "the ones we thought of"
 * is how the next identifier gets through.
 */
export function scrubEvent<T>(value: T, seen = new WeakSet<object>()): T {
  if (typeof value === "string") return scrubForAudit(value) as unknown as T;
  if (value === null || typeof value !== "object") return value;
  // Sentry events can contain cycles (a frame referencing its own scope); without this
  // the scrubber would recurse until the stack gives out, inside an error handler.
  if (seen.has(value as object)) return value;
  seen.add(value as object);
  if (Array.isArray(value)) return value.map((v) => scrubEvent(v, seen)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = scrubEvent(v, seen);
  return out as T;
}

// undefined = not yet attempted; null = unavailable (no DSN, or package absent).
let sentry: SentryLike | null | undefined;

async function getSentry(): Promise<SentryLike | null> {
  if (sentry !== undefined) return sentry;
  sentry = null;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return null; // not configured → log-only, no import attempted
  try {
    // Optional dependency: kept out of the static graph via a computed specifier
    // so the build never requires it. Resolves at runtime only once Ali installs
    // it; absent → the catch below leaves us log-only.
    const spec = ["@sentry", "node"].join("/");
    const mod = (await import(/* @vite-ignore */ spec)) as unknown as SentryLike;
    mod.init?.({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "production",
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0),
      // 🔴 THE LAST THING THAT RUNS BEFORE PLAYER DATA LEAVES THE COUNTRY.
      // Sentry's own `sendDefaultPii` default is false, which covers IPs and cookies —
      // it does nothing about a phone number inside an exception message, which is
      // exactly the shape 50pick's errors take ("no wallet for +2557…").
      //
      // Verified by removing this line and watching `test:alerting` catch a real
      // +255757619808, a real email and a real NIDA in the bytes on the wire.
      beforeSend: (event: unknown) => scrubEvent(event),
      beforeSendTransaction: (event: unknown) => scrubEvent(event),
      // Off by default: breadcrumbs collect request URLs and console output, and the
      // console lines on this platform routinely carry MSISDNs. They are scrubbed by
      // beforeSend too, but not collecting them is the stronger position.
      maxBreadcrumbs: Number(process.env.SENTRY_MAX_BREADCRUMBS ?? 0),
    });
    sentry = mod;
    console.log("[monitoring] Sentry initialised.");
  } catch {
    console.warn("[monitoring] SENTRY_DSN is set but @sentry/node is not installed — errors log only. Run `npm i @sentry/node`.");
    sentry = null;
  }
  return sentry;
}

/** Is an external monitor configured (a DSN is present)? */
export function isMonitoringEnabled(): boolean {
  return !!process.env.SENTRY_DSN;
}

/**
 * Push anything queued to the monitor and wait for it, up to `timeoutMs`.
 *
 * Sentry batches: in a short-lived process — a script, a cron job, or the gate that
 * proves this seam works — the process can exit before the envelope is on the wire, which
 * looks exactly like "monitoring is not wired up". Never called on a request path.
 */
export async function flushMonitoring(timeoutMs = 4000): Promise<boolean> {
  const s = await getSentry();
  if (!s?.flush) return false;
  try {
    return await s.flush(timeoutMs);
  } catch {
    return false;
  }
}

// ── Durable, on-box error record (the part a rotating log cannot give us) ─────
//
// 🔴 WHY THIS EXISTS. The `[snag]` console block is clear and greppable, and it is
// still the primary record — but a log is not a record. On 2026-07-30 we went looking
// for a payout failure roughly ten minutes old and Railway's buffer had already rolled
// past it. So "a silent 500 could run for days" was never really about missing logs;
// it was about nothing SURVIVING. An external monitor fixes that, but it needs a DSN,
// an installed SDK, and a decision to send a licensed operator's data off-box.
//
// The audit chain is already here: DB-backed, hash-chained, queryable in the admin
// console, and it never leaves our infrastructure. Writing errors there closes the
// gap today and stays useful after Sentry is wired.
//
// DEDUPED ON PURPOSE. A flapping route can throw on every request; one audit row per
// request would bury the chain and cost more than it tells us. One row per distinct
// fingerprint per window, with the repeat count carried on the NEXT row, so a storm
// reads as "this failed 4,812 times in 10 minutes" instead of 4,812 rows.
const DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const seen = new Map<string, { firstAt: number; count: number }>();

/** Redact anything that could identify a player before it is persisted.
 *  Exported for `test:monitoring` — a PII scrubber that is never driven is a
 *  promise, not a control. */
export function scrubForAudit(text: string): string {
  return text
    // Tanzanian MSISDNs in any of the forms the platform accepts.
    .replace(/(?:\+?255|0)7\d{8}/g, "<msisdn>")
    .replace(/\b\d{12,}\b/g, "<digits>")   // NIDA and other long identifiers
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "<email>");
}

/** Stable fingerprint: same bug at the same place collapses to one entry. */
function fingerprint(name: string, message: string, route: string): string {
  // Message head only — trailing ids/values differ per request and would defeat
  // the dedupe entirely, which is how "deduped" logging quietly becomes unbounded.
  return `${route}|${name}|${scrubForAudit(message).slice(0, 120)}`;
}

async function persistServerError(err: unknown, context?: Record<string, unknown>): Promise<void> {
  const e = err as { name?: string; message?: string; stack?: string };
  const route = String(context?.routePath ?? context?.path ?? "(unknown)");
  const name = e?.name ?? "Error";
  const message = e?.message ?? String(err);
  const key = fingerprint(name, message, route);

  const now = Date.now();
  const prior = seen.get(key);
  if (prior && now - prior.firstAt < DEDUPE_WINDOW_MS) {
    prior.count += 1;
    return; // inside the window — counted, not written
  }
  const repeatsSuppressed = prior?.count ?? 0;
  seen.set(key, { firstAt: now, count: 1 });

  // Keep the map from growing without bound on a long-lived process.
  if (seen.size > 500) {
    for (const [k, v] of seen) if (now - v.firstAt > DEDUPE_WINDOW_MS) seen.delete(k);
  }

  const { audit } = await import("./audit");
  await audit({
    category: "SYSTEM",
    action: "server.error",
    actorId: null,
    targetType: "Route",
    targetId: route,
    payload: {
      name,
      message: scrubForAudit(message).slice(0, 500),
      // Stack is the whole point of persisting — truncated, scrubbed, still useful.
      stack: e?.stack ? scrubForAudit(e.stack).slice(0, 2000) : null,
      method: context?.method ?? null,
      digest: context?.digest ?? null,
      // How many identical errors were swallowed by the previous window. A non-zero
      // value here is the storm signal.
      repeatsSuppressed,
      monitorEnabled: isMonitoringEnabled(),
    },
  });
}

/**
 * Record a server error. Never throws — monitoring must not break a request or a boot.
 *
 * Two sinks, deliberately independent so neither can suppress the other:
 *   1. the audit chain — always on, on-box, durable, deduped (see above);
 *   2. the external monitor — only when `SENTRY_DSN` is set and the SDK is installed.
 *
 * The `[snag]` console block in instrumentation.ts remains the primary human-readable
 * record and is unaffected.
 */
export async function captureServerError(err: unknown, context?: Record<string, unknown>): Promise<void> {
  // Settled, not raced: a failure in one sink must not stop the other from recording.
  await Promise.allSettled([
    persistServerError(err, context).catch((e) =>
      console.error("[monitoring] failed to persist server error:", (e as Error)?.message ?? e),
    ),
    (async () => {
      const s = await getSentry();
      if (s) s.captureException(err, context ? { extra: context } : undefined);
    })().catch(() => {}),
  ]);
}
