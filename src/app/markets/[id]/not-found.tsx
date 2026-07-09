import Link from "next/link";
import { cookies } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { dict, type Locale } from "@/lib/i18n-dict";

/**
 * Colocated not-found page for the /markets/[id] segment.
 *
 * Without this file Next.js 16 calls `notFound()` from MarketDetail
 * server-component, renders our global `app/not-found.tsx`, but
 * returns HTTP 200 instead of 404 — search engines + tooling read
 * that as "the page exists" which is wrong. A segment-level
 * not-found.tsx forces the right status while keeping the same
 * branded fallback the catch-all uses.
 *
 * Uses inline cookie-based locale (cannot use generateMetadata in
 * not-found pages).
 */
export default async function MarketNotFound() {
  const jar = await cookies();
  const raw = jar.get("kp-locale")?.value;
  const locale: Locale = raw === "sw" || raw === "zh" ? raw : "en";
  const t = dict[locale];

  return (
    <main className="mx-auto flex min-h-[80svh] max-w-[640px] flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-5">
        <FiftyMark size={64} />
      </div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-gold-300">
        {t.error.notFoundCode}
      </p>
      <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-text">
        {t.error.notFoundBody}
      </h1>
      <p className="mt-3 max-w-[420px] text-[13px] leading-relaxed text-text-subtle">
        {t.error.notFoundHint}
      </p>
      <nav aria-label={t.error.recoveryLinks} className="mt-6 grid w-full max-w-[420px] grid-cols-1 gap-2 sm:grid-cols-3">
        <Link
          href="/markets"
          className="rounded-xl border border-border bg-bg-elevated p-3 text-left transition-colors hover:border-brand-400 hover:bg-bg-overlay"
        >
          <p className="font-display text-[13px] font-semibold text-text">{t.common.markets}</p>
        </Link>
        <Link
          href="/"
          className="rounded-xl border border-border bg-bg-elevated p-3 text-left transition-colors hover:border-brand-400 hover:bg-bg-overlay"
        >
          <p className="font-display text-[13px] font-semibold text-text">{t.common.home}</p>
        </Link>
        <Link
          href="/help"
          className="rounded-xl border border-border bg-bg-elevated p-3 text-left transition-colors hover:border-brand-400 hover:bg-bg-overlay"
        >
          <p className="font-display text-[13px] font-semibold text-text">{t.common.help}</p>
        </Link>
      </nav>
      <Link
        href="/markets"
        className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-gold-300 hover:text-gold-200"
      >
        <I.globe s={12} />
        {t.error.browseOpenMarkets}
        <I.arrowRight s={12} />
      </Link>
    </main>
  );
}
