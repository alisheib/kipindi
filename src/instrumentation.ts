/**
 * Next.js instrumentation — server error reporting.
 *
 * Next's App Router shows the client a bilingual "That page hit a snag" page
 * with only an opaque `digest`. Without this hook, the matching server-side
 * stack is NOT printed anywhere we can see on Railway — so "check the logs"
 * turns up nothing. `onRequestError` fires for EVERY uncaught error during a
 * server render / route handler and gives us the failing route + the stack,
 * keyed by the SAME digest the user sees on screen.
 *
 * We log one clearly-delimited block per error so it's greppable in
 * `railway logs` (search for "[snag]" or the digest the user reports).
 *
 * This is observability only — it changes no behaviour and cannot itself
 * break a render (any throw inside is swallowed).
 */

/**
 * register() fires once on server startup — start the market sentinel here.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Boot-time validation (audit C7 + H7). NOT wrapped in try/catch: a
    // compliance-lock violation MUST stop the server from starting.
    const { runBootChecks } = await import("./lib/server/boot-checks");
    await runBootChecks();

    try {
      const { startSentinel } = await import("./lib/server/market-sentinel");
      startSentinel();
    } catch (err) {
      console.error("[instrumentation] Failed to start sentinel:", err);
    }
    // Lifecycle ticker — drives the CLOCK-based transitions (selection close →
    // notify bettors, resolution due → alert officers, demo auto-resolve, bonus
    // expiry). Independent of the AI sentinel above so it runs even with no
    // ANTHROPIC_API_KEY / while the sentinel is paused.
    try {
      const { startLifecycleTicker } = await import("./lib/server/lifecycle");
      startLifecycleTicker();
    } catch (err) {
      console.error("[instrumentation] Failed to start lifecycle ticker:", err);
    }
  }
}

export async function onRequestError(
  err: unknown,
  request: {
    path?: string;
    method?: string;
    headers?: Record<string, string | string[] | undefined> | Headers;
  },
  context?: {
    routerKind?: string;
    routePath?: string;
    routeType?: string;
    renderSource?: string;
    renderType?: string;
    revalidateReason?: string;
  },
) {
  try {
    const e = err as { message?: string; stack?: string; digest?: string; name?: string };
    const digest =
      e?.digest ??
      (typeof err === "object" && err && "digest" in err ? String((err as { digest: unknown }).digest) : undefined);

    // NEXT_REDIRECT / NEXT_NOT_FOUND are control-flow "errors" Next throws to
    // implement redirect()/notFound() — never real failures. Don't alarm on them.
    const msg = e?.message ?? String(err);
    if (typeof digest === "string" && (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND")) {
      return;
    }
    if (msg.includes("NEXT_REDIRECT") || msg.includes("NEXT_HTTP_ERROR_FALLBACK")) return;

    const path = request?.path ?? context?.routePath ?? "(unknown path)";
    const method = request?.method ?? "(unknown method)";

    // Single block, easy to spot and copy out of Railway's log stream.
    console.error(
      [
        "",
        "──────────────────────────────────────────────────────────",
        `[snag] SERVER RENDER ERROR  digest=${digest ?? "n/a"}`,
        `  when:   ${method} ${path}`,
        `  route:  ${context?.routePath ?? "?"}  kind=${context?.routerKind ?? "?"}  type=${context?.routeType ?? "?"}`,
        `  source: ${context?.renderSource ?? "?"}  render=${context?.renderType ?? "?"}  revalidate=${context?.revalidateReason ?? "-"}`,
        `  error:  ${e?.name ?? "Error"}: ${msg}`,
        e?.stack ? `  stack:\n${e.stack}` : "  stack: (none)",
        "──────────────────────────────────────────────────────────",
      ].join("\n"),
    );

    // Off-box mirror (audit H6) — ships to Sentry when SENTRY_DSN is configured,
    // otherwise a no-op. Awaited-not-blocking-safe: it never throws.
    const { captureServerError } = await import("./lib/server/monitoring");
    void captureServerError(err, { path, method, digest, routePath: context?.routePath });
  } catch {
    // Never let the reporter itself throw.
  }
}
