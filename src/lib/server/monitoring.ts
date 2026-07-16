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

/**
 * Forward a server error to the external monitor when configured. Never throws.
 * The `[snag]` console block stays the primary, always-on record; this is the
 * additive off-box mirror.
 */
export async function captureServerError(err: unknown, context?: Record<string, unknown>): Promise<void> {
  try {
    const s = await getSentry();
    if (s) s.captureException(err, context ? { extra: context } : undefined);
  } catch {
    // Monitoring must never break a request or a boot.
  }
}
