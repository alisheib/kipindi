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

    // Per-market scheduler — arm a timer for every market with a pending time
    // transition (closing-soon / selection-closed / resolve / settle). This is the
    // primary driver of market lifecycle; deadlines missed while the server was DOWN
    // fire after a short staggered grace (never skipped). Replaces the old global AI
    // sentinel sweep loop. See market-scheduler.ts.
    try {
      const { hydrateSchedulerOnBoot } = await import("./lib/server/market-scheduler");
      await hydrateSchedulerOnBoot();
    } catch (err) {
      console.error("[instrumentation] Failed to hydrate market scheduler:", err);
    }
    // Up & Down chain scheduler — one timer per RUNNING chain (not per round). Kept
    // SEPARATE from the market scheduler on purpose: Up & Down rounds are excluded
    // from it (nextDeadlineFor returns null), and the two have their own fire gates so
    // neither product can starve the other. A boundary missed while DOWN fires after a
    // short grace — delayed, never skipped. See updown-scheduler.ts.
    try {
      const { hydrateUpDownOnBoot } = await import("./lib/server/updown-scheduler");
      await hydrateUpDownOnBoot();
    } catch (err) {
      console.error("[instrumentation] Failed to hydrate Up & Down scheduler:", err);
    }
    // Lifecycle ticker — the periodic backstop: it reconciles the scheduler (re-arms
    // any market that lost its timer), expires bonus grants, reconciles stuck
    // payments, and runs the nightly trial balance. It does NOT drive market
    // transitions any more (those are the scheduler's job).
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
    //
    // 🔴 NODE ONLY, AND THE GUARD IS THE FIX FOR A SILENT GAP (2026-09-06).
    // `onRequestError` fires in BOTH runtimes, and `src/proxy.ts` is an EDGE middleware with a
    // route matcher. This import reaches `monitoring.ts` → `audit.ts` → `lock-key.ts`, which
    // loads `node:crypto` and Prisma — neither of which exists in the Edge Runtime. Turbopack
    // says so on every build ("A Node.js module is loaded ('node:crypto') which is not supported
    // in the Edge Runtime", import trace: Edge Instrumentation → instrumentation.ts), and the
    // build stays GREEN because it is only a warning.
    //
    // ⛔ WHAT IT COST: on an edge error the import threw, the outer `catch {}` swallowed it, and
    // the off-box mirror silently did not happen. The `[snag]` block above still printed, so the
    // failure was invisible — an error reporter that stops reporting exactly where nobody is
    // watching. That is audit H6 quietly not holding, not a missing feature.
    //
    // ⭐ `register()` above has guarded its Node-only imports on `NEXT_RUNTIME` since it was
    // written; this call site was simply never given the same treatment. Node behaviour is
    // unchanged. On edge the local console block still runs, and the mirror is now SKIPPED
    // deliberately rather than failing in the dark.
    if (process.env.NEXT_RUNTIME === "nodejs") {
      const { captureServerError } = await import("./lib/server/monitoring");
      void captureServerError(err, { path, method, digest, routePath: context?.routePath });
    }
  } catch {
    // Never let the reporter itself throw.
  }
}
