import Link from "next/link";
import { cookies, headers } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { getServerT } from "@/lib/i18n-server";

/* ── Inline i18n dict for this server component (cannot use useT) ─────── */
const t404 = {
  en: {
    notFoundCode: "404",
    notFound: "Page not found",
    notFoundBody: "We couldn\u2019t find that page",
    notFoundHint: "The link may be stale, the market may have resolved, or the URL was typed in slightly off. Pick a destination below to keep going.",
    home: "Home",
    markets: "Markets",
    help: "Help",
    browseOpenMarkets: "Browse open markets",
  },
  sw: {
    notFoundCode: "404",
    notFound: "Hakuna ukurasa",
    notFoundBody: "Hatukupata ukurasa huo",
    notFoundHint: "Kiungo kinaweza kuwa kimepitwa na wakati, soko linaweza kuwa limetatuliwa, au URL imeandikwa vibaya. Chagua mahali pa kwenda hapa chini.",
    home: "Mwanzo",
    markets: "Masoko",
    help: "Msaada",
    browseOpenMarkets: "Tazama masoko yaliyo wazi",
  },
  zh: {
    notFoundCode: "404",
    notFound: "\u9875\u9762\u672a\u627e\u5230",
    notFoundBody: "\u6211\u4eec\u627e\u4e0d\u5230\u8be5\u9875\u9762",
    notFoundHint: "\u94fe\u63a5\u53ef\u80fd\u5df2\u5931\u6548\uff0c\u5e02\u573a\u53ef\u80fd\u5df2\u7ed3\u7b97\uff0c\u6216URL\u8f93\u5165\u6709\u8bef\u3002\u8bf7\u9009\u62e9\u4ee5\u4e0b\u76ee\u7684\u5730\u7ee7\u7eed\u3002",
    home: "\u9996\u9875",
    markets: "\u5e02\u573a",
    help: "\u5e2e\u52a9",
    browseOpenMarkets: "\u6d4f\u89c8\u5f00\u653e\u5e02\u573a",
  },
} as const;

type Locale = keyof typeof t404;

/** Resolve locale: cookie → Accept-Language header → "en". */
async function resolveLocale(): Promise<Locale> {
  const jar = await cookies();
  const cookieLocale = jar.get("kp-locale")?.value;
  if (cookieLocale === "sw" || cookieLocale === "zh") return cookieLocale;

  // Fall back to Accept-Language header
  const h = await headers();
  const accept = h.get("accept-language") ?? "";
  // Parse primary language tags (e.g. "sw,en;q=0.9,zh;q=0.8")
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0].trim().toLowerCase();
    if (tag.startsWith("sw")) return "sw";
    if (tag.startsWith("zh")) return "zh";
    if (tag.startsWith("en")) return "en";
  }
  return "en";
}

export async function generateMetadata() {
  const lang = await resolveLocale();
  const d = t404[lang];
  return { title: `${d.notFound} · ${d.notFoundCode}` };
}

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
export default async function NotFound() {
  const lang = await resolveLocale();
  const d = t404[lang];
  const { t } = await getServerT();

  return (
    <main className="mx-auto flex min-h-[80svh] max-w-[640px] flex-col items-center justify-center px-5 py-10 text-center">
      <div className="mb-5">
        <FiftyMark size={64} />
      </div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-gold-300">
        {d.notFoundCode} · {d.notFound}
      </p>
      <h1 className="mt-2 font-display text-[28px] font-bold leading-tight tracking-[-0.02em] text-text">
        {d.notFoundBody}
      </h1>
      <p className="mt-3 max-w-[420px] text-[13px] leading-relaxed text-text-subtle">
        {d.notFoundHint}
      </p>
      <nav aria-label={t.error.recoveryLinks} className="mt-6 grid w-full max-w-[420px] grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Link
          href="/"
          className="group rounded-xl border border-border bg-bg-elevated p-3.5 text-left transition-all hover:border-brand-400 hover:bg-bg-overlay hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]"
        >
          <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-inset text-text-subtle group-hover:text-gold-300 transition-colors">
            <I.arrowRight s={13} style={{ transform: "rotate(180deg)" }} />
          </span>
          <p className="font-display text-[13px] font-semibold text-text">{d.home}</p>
        </Link>
        <Link
          href="/markets"
          className="group rounded-xl border border-border bg-bg-elevated p-3.5 text-left transition-all hover:border-brand-400 hover:bg-bg-overlay hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]"
        >
          <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-inset text-text-subtle group-hover:text-gold-300 transition-colors">
            <I.chart s={13} />
          </span>
          <p className="font-display text-[13px] font-semibold text-text">{d.markets}</p>
        </Link>
        <Link
          href="/help"
          className="group rounded-xl border border-border bg-bg-elevated p-3.5 text-left transition-all hover:border-brand-400 hover:bg-bg-overlay hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]"
        >
          <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-inset text-text-subtle group-hover:text-gold-300 transition-colors">
            <I.info s={13} />
          </span>
          <p className="font-display text-[13px] font-semibold text-text">{d.help}</p>
        </Link>
      </nav>
      <Link
        href="/markets"
        className="mt-6 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-gold-300 hover:text-gold-200"
      >
        <I.globe s={12} />
        {d.browseOpenMarkets}
        <I.arrowRight s={12} />
      </Link>
    </main>
  );
}
