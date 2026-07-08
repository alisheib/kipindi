"use client";

import { useEffect } from "react";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { useT } from "@/lib/i18n";

type Back = { href: string; label: string };

/**
 * Shared recoverable-error surface for every route error boundary (root +
 * admin/auth/markets/positions/profile/proposals/wallet). Replaces seven
 * divergent boundaries — six of which dropped the brand entirely — with one:
 * FiftyMark at 64px over a faint BrandTopo frame, a small alert glyph, a
 * section-naming sentence, and a single primary "Try again" plus a back link.
 *
 * NO claret — an error boundary is recoverable, not destructive; claret stays
 * reserved for irreversible confirms. The only `--no-*` here is the small
 * alert-glyph tint. Errors are where trust is most fragile, so they get the
 * brand, not the least-branded screen in the app.
 */
export function RouteError({
  error,
  reset,
  body,
  back,
  eyebrow,
  headline,
  logTag,
}: {
  error: Error & { digest?: string };
  reset: () => void;
  /** One sentence naming the section that failed (e.g. "We couldn't load your positions"). */
  body: string;
  /** Secondary recovery link(s) beside "Try again". */
  back?: Back | Back[];
  /** Defaults to t.error.somethingWentWrong. */
  eyebrow?: string;
  /** Defaults to t.error.pageHitSnag. */
  headline?: string;
  /** Log namespace, e.g. "wallet" → "[50pick/wallet] error boundary fired". */
  logTag?: string;
}) {
  const { t } = useT();

  useEffect(() => {
    // Client telemetry only — the server-side audit already logged the stack.
    // Kept dumb-simple so the error surface itself can never throw.
    console.warn(`[50pick${logTag ? `/${logTag}` : ""}] error boundary fired`, { digest: error.digest });
  }, [error, logTag]);

  const backs = Array.isArray(back) ? back : back ? [back] : [];

  return (
    <div className="relative mx-auto flex min-h-[60svh] w-full max-w-[560px] flex-col items-center justify-center overflow-hidden px-5 py-12 text-center">
      <BrandTopo id="route-error-topo" opacity={0.06} />
      <div className="relative flex flex-col items-center">
        <FiftyMark size={64} />
        <div
          className="mb-3 mt-5 inline-flex h-11 w-11 items-center justify-center rounded-full border border-no-700 bg-no-500/10 text-no-300"
          style={{ boxShadow: "0 0 0 7px color-mix(in oklab, var(--no-500) 8%, transparent)" }}
        >
          <I.alertCircle s={19} />
        </div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-no-300">
          {eyebrow ?? t.error.somethingWentWrong}
        </p>
        <h1 className="mt-2 font-display text-[24px] font-bold leading-tight tracking-[-0.02em] text-text">
          {headline ?? t.error.pageHitSnag}
        </h1>
        <p className="mt-3 max-w-[440px] text-[13px] leading-relaxed text-text-muted">{body}</p>

        {error.digest && (
          <p className="mt-3 font-mono text-[11px] tracking-[0.06em] text-text-subtle">
            {t.error.reference}: <span className="text-text">{error.digest}</span>
          </p>
        )}

        <div className="mt-6 flex flex-col items-stretch gap-2.5 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary btn-md inline-flex items-center justify-center gap-2"
          >
            <I.bolt s={14} />
            {t.error.tryAgain}
          </button>
          {backs.map((b) => (
            <Link key={b.href} href={b.href as never} className="btn btn-ghost btn-md inline-flex items-center justify-center gap-2">
              {b.label}
              <I.arrowRight s={14} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
