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
 * To enable Sentry (Ali, once the DSN is issued):
 *   1. `npm i @sentry/node`
 *   2. set `SENTRY_DSN=…`  (+ optional `SENTRY_ENVIRONMENT`, `SENTRY_TRACES_SAMPLE_RATE`)
 *   3. redeploy — init + capture below activate automatically; nothing else to wire.
 */

type SentryLike = {
  init?: (opts: Record<string, unknown>) => void;
  captureException: (e: unknown, hint?: Record<string, unknown>) => void;
};

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
