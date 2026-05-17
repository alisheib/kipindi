import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";
import { FiftyMark } from "@/components/brand";

export const metadata = { title: "Page not found · Hakuna ukurasa" };

/**
 * Global 404 page — caught by Next.js App Router whenever a request hits
 * a URL that doesn't match a route. We give the player a branded landing
 * with three explicit next-steps so they can keep moving instead of
 * bouncing off the platform. Industry standard for licensed operators:
 * the 404 must NOT look like a system error and must offer a clear path
 * back to the play surfaces.
 *
 * No PII is rendered here — the URL the player tried is not echoed back,
 * so the page is safe to log + cache.
 */
export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[80svh] max-w-[640px] flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-5">
        <FiftyMark size={64} />
      </div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-gold-300">
        404 · Hakuna ukurasa
      </p>
      <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-text">
        We couldn&rsquo;t find that page
      </h1>
      <p className="mt-2 text-[14px] italic text-text-muted">
        Hatukupata ukurasa huo
      </p>
      <p className="mt-3 max-w-[420px] text-[13px] leading-relaxed text-text-subtle">
        The link may be stale, the market may have resolved, or the URL
        was typed in slightly off. Pick a destination below to keep going.
      </p>
      <nav aria-label="Recovery links" className="mt-6 grid w-full max-w-[420px] grid-cols-1 gap-2 sm:grid-cols-3">
        <Link
          href="/"
          className="rounded-xl border border-border bg-bg-elevated p-3 text-left transition-colors hover:border-gold-700 hover:bg-bg-overlay"
        >
          <p className="font-display text-[13px] font-semibold text-text">Home</p>
          <p className="mt-0.5 text-[11px] italic text-text-subtle">Mwanzo</p>
        </Link>
        <Link
          href="/markets"
          className="rounded-xl border border-border bg-bg-elevated p-3 text-left transition-colors hover:border-gold-700 hover:bg-bg-overlay"
        >
          <p className="font-display text-[13px] font-semibold text-text">Markets</p>
          <p className="mt-0.5 text-[11px] italic text-text-subtle">Soko</p>
        </Link>
        <Link
          href="/help"
          className="rounded-xl border border-border bg-bg-elevated p-3 text-left transition-colors hover:border-gold-700 hover:bg-bg-overlay"
        >
          <p className="font-display text-[13px] font-semibold text-text">Help</p>
          <p className="mt-0.5 text-[11px] italic text-text-subtle">Msaada</p>
        </Link>
      </nav>
      <Link
        href="/markets"
        className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-gold-300 hover:text-gold-200"
      >
        <Compass size={12} />
        Browse open markets
        <ArrowRight size={12} />
      </Link>
    </main>
  );
}
