import Link from "next/link";
import { Compass, ArrowRight } from "lucide-react";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";

export const metadata = { title: "Market not found · Hakuna soko" };

/**
 * Colocated not-found page for the /markets/[id] segment.
 *
 * Without this file Next.js 16 calls `notFound()` from MarketDetail
 * server-component, renders our global `app/not-found.tsx`, but
 * returns HTTP 200 instead of 404 — search engines + tooling read
 * that as "the page exists" which is wrong. A segment-level
 * not-found.tsx forces the right status while keeping the same
 * branded fallback the catch-all uses.
 */
export default function MarketNotFound() {
  return (
    <main className="mx-auto flex min-h-[80svh] max-w-[640px] flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-5">
        <FiftyMark size={64} />
      </div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-gold-300">
        404 · Hakuna soko
      </p>
      <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-text">
        That market isn&rsquo;t available
      </h1>
      <p className="mt-2 text-[14px] italic text-text-muted">
        Soko hilo halipo
      </p>
      <p className="mt-3 max-w-[420px] text-[13px] leading-relaxed text-text-subtle">
        The market may have resolved, been voided, or never existed.
        Browse the open markets below to find another one.
      </p>
      <nav aria-label="Recovery links" className="mt-6 grid w-full max-w-[420px] grid-cols-1 gap-2 sm:grid-cols-3">
        <Link
          href="/markets"
          className="rounded-xl border border-border bg-bg-elevated p-3 text-left transition-colors hover:border-gold-700 hover:bg-bg-overlay"
        >
          <p className="font-display text-[13px] font-semibold text-text">Markets</p>
          <p className="mt-0.5 text-[11px] italic text-text-subtle">Soko</p>
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-border bg-bg-elevated p-3 text-left transition-colors hover:border-gold-700 hover:bg-bg-overlay"
        >
          <p className="font-display text-[13px] font-semibold text-text">Home</p>
          <p className="mt-0.5 text-[11px] italic text-text-subtle">Mwanzo</p>
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
        <I.arrowRight s={12} />
      </Link>
    </main>
  );
}
