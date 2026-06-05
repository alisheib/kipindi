"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertOctagon, RotateCcw, ArrowRight } from "lucide-react";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";

/**
 * Global error boundary — Next.js App Router invokes this when a
 * rendering error escapes a route segment.
 *
 * Production posture:
 *   - We DO NOT echo back the raw error message or stack to the player.
 *     A licensed-operator surface that leaks "TypeError: Cannot read
 *     property 'foo' of undefined" reads as broken AND risks leaking
 *     PII captured in scope. We show a `digest` ID that the operator
 *     can use to look the error up server-side (Next.js generates this
 *     and ties it to the server log entry).
 *   - We provide three explicit recovery paths so the player doesn't
 *     bounce off the platform: retry the route, go home, go to help.
 *   - We log the digest on the client so the operator can correlate
 *     user reports ("I saw error abc123") with the server stack.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Client-side telemetry hook — server-side audit already logged.
    // Keep this dumb-simple so the error page itself never throws.
    if (typeof window !== "undefined") {
      console.warn("[50pick] error boundary fired", { digest: error.digest });
    }
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[80svh] max-w-[640px] flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-5">
        <FiftyMark size={64} />
      </div>
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-no-700 bg-no-500/10 text-no-300">
        <AlertOctagon size={18} aria-hidden />
      </div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-no-300">
        Something went wrong · Hitilafu imetokea
      </p>
      <h1 className="mt-2 font-display text-[26px] font-bold leading-tight tracking-[-0.02em] text-text">
        That page hit a snag
      </h1>
      <p className="mt-2 text-[14px] italic text-text-muted">
        Ukurasa huu umekumbana na tatizo
      </p>
      <p className="mt-3 max-w-[440px] text-[13px] leading-relaxed text-text-subtle">
        We&rsquo;ve recorded what happened and the team will look at it.
        Your wallet, positions, and bets are unaffected — every state
        change is captured in our append-only audit log.
      </p>

      {error.digest && (
        <p className="mt-3 font-mono text-[11px] tracking-[0.06em] text-text-subtle">
          Reference: <span className="text-text">{error.digest}</span>
        </p>
      )}

      <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-royal px-4 font-semibold text-onBrand text-[13px] transition-colors hover:bg-royal-hover"
        >
          <RotateCcw size={14} aria-hidden />
          Try again · Jaribu tena
        </button>
        <Link
          href="/markets"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-bg-elevated px-4 text-[13px] text-text-secondary transition-colors hover:bg-bg-overlay"
        >
          Back to markets
          <I.arrowRight s={14} />
        </Link>
        <Link
          href="/help"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-bg-elevated px-4 text-[13px] text-text-secondary transition-colors hover:bg-bg-overlay"
        >
          Contact support · Msaada
        </Link>
      </div>
    </main>
  );
}
