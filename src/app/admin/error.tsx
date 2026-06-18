"use client";

import { useEffect } from "react";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";

/**
 * Admin-scoped error boundary. Without this, a throw in any /admin page or
 * server action bubbles to the ROOT error.tsx and replaces the whole app
 * (sidebar + nav included). Scoped here, a crash is contained to the admin
 * content area and the officer gets retry / back paths without losing the
 * console shell.
 *
 * Same production posture as the root boundary: never echo the raw error /
 * stack to the operator surface (PII + "looks broken"); surface a digest the
 * team can correlate with the server log.
 */
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (typeof window !== "undefined") {
      console.warn("[50pick/admin] error boundary fired", { digest: error.digest });
    }
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60svh] max-w-[560px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full border border-no-700 bg-no-500/10 text-no-300">
        <I.alertCircle s={20} />
      </div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-no-300">
        Admin error · Hitilafu
      </p>
      <h1 className="mt-2 font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-text">
        This console page hit a snag
      </h1>
      <p className="mt-3 max-w-[420px] text-[13px] leading-relaxed text-text-subtle">
        The error was recorded server-side. Nothing was mutated by the failed
        render — every state change goes through the append-only audit log.
        Retry, or head back to the dashboard.
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
          className="btn btn-primary btn-md inline-flex items-center justify-center gap-2"
        >
          <I.bolt s={14} />
          Try again · Jaribu tena
        </button>
        <Link
          href="/admin"
          className="btn btn-ghost btn-md inline-flex items-center justify-center gap-2"
        >
          Back to dashboard
          <I.arrowRight s={14} />
        </Link>
      </div>
    </div>
  );
}
