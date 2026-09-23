import Link from "next/link";
import { cookies } from "next/headers";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { getServerT } from "@/lib/i18n-server";
import { localeOrDefault } from "@/lib/i18n-dict";

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

/**
 * Resolve locale: the visitor's chosen language (the `kp-locale` cookie), else Swahili — the platform default, the same
 * rule every other page uses (`localeOrDefault`). The browser's Accept-Language is no longer consulted: a 404 must not
 * speak a different language from the page the visitor just left.
 */
async function resolveLocale(): Promise<Locale> {
  const jar = await cookies();
  return localeOrDefault(jar.get("kp-locale")?.value);
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
    // Same kit frame as the shared RouteError (A3): FiftyMark 64 over a faint
    // BrandTopo, a glyph badge, neutral chrome. A 404 is "not found", not an
    // error — so the badge is royal/info (not the RouteError rose alert tint),
    // and there's no gold here (404 isn't earned-money).
    <div className="kp-shortpage relative mx-auto flex min-h-[80svh] max-w-[640px] flex-col items-center justify-center overflow-hidden px-5 py-10 text-center">
      <BrandTopo id="notfound-topo" opacity={0.09} />
      <div className="relative flex flex-col items-center">
        <FiftyMark size={64} />
        <div
          /* ⚠️ LITERALS, not `h-11 w-11` — spacing is overridden (tailwind.config.ts:200-215)
             so `h-11` renders 96px, i.e. a medallion that rivalled the size={64} mark above it. */
          className="mb-3 mt-5 inline-flex h-[44px] w-[44px] items-center justify-center rounded-full border border-brand-600 bg-brand-500/10 text-brand-300"
          style={{ boxShadow: "0 0 0 7px color-mix(in oklab, var(--brand-500) 8%, transparent)" }}
        >
          <I.search s={19} />
        </div>
        <p className="font-mono text-micro font-bold uppercase tracking-[0.20em] text-text-subtle">
          {d.notFoundCode} · {d.notFound}
        </p>
        <h1 className="mt-2 font-display text-title-lg font-bold leading-tight tracking-[-0.02em] text-text">
          {d.notFoundBody}
        </h1>
        <p className="mt-3 max-w-[420px] text-[13px] leading-relaxed text-text-subtle">
          {d.notFoundHint}
        </p>
        {/* 🔴 D68 · THREE ACROSS AT EVERY WIDTH, BECAUSE ONE PER ROW PUT THEM OFF THE SCREEN.
            This page tells the player to choose where to go next, and at 320×640 — the smallest supported
            phone — not one destination was usable: measured, the first was 61.6% visible behind the bottom
            rail and the other two were **entirely off-screen**, with nothing at rest to say they existed.
            Each card stacks a 28px glyph over its label inside `p-3.5`, so it is 101.5px tall and three of
            them are 304px — more than the page had left after the mark, the badge, the code line, the
            heading and the hint. ⭐ The labels are one short word each (`Mwanzo` / `Masoko` / `Msaada`,
            and shorter in EN and ZH), so three across at 320 gives each ~86px of an ~48px word and turns
            304px into one row. The `sm:` gate was the whole defect: the phone got the layout designed for
            the case where there is room to spare. */}
        <nav aria-label={t.error.recoveryLinks} className="mt-6 grid w-full max-w-[420px] grid-cols-3 gap-2.5">
          <Link
            href="/"
            className="group rounded-xl border border-border bg-bg-elevated p-3.5 text-left transition-all hover:border-brand-400 hover:bg-bg-overlay hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]"
          >
            <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-inset text-text-subtle group-hover:text-brand-300 transition-colors">
              <I.arrowRight s={13} style={{ transform: "rotate(180deg)" }} />
            </span>
            <p className="font-display text-[13px] font-semibold text-text">{d.home}</p>
          </Link>
          <Link
            href="/markets"
            className="group rounded-xl border border-border bg-bg-elevated p-3.5 text-left transition-all hover:border-brand-400 hover:bg-bg-overlay hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]"
          >
            <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-inset text-text-subtle group-hover:text-brand-300 transition-colors">
              <I.chart s={13} />
            </span>
            <p className="font-display text-[13px] font-semibold text-text">{d.markets}</p>
          </Link>
          <Link
            href="/help"
            className="group rounded-xl border border-border bg-bg-elevated p-3.5 text-left transition-all hover:border-brand-400 hover:bg-bg-overlay hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]"
          >
            <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-bg-inset text-text-subtle group-hover:text-brand-300 transition-colors">
              <I.info s={13} />
            </span>
            <p className="font-display text-[13px] font-semibold text-text">{d.help}</p>
          </Link>
        </nav>
        <Link
          href="/markets"
          className="mt-6 inline-flex items-center gap-2 font-mono text-caption uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200"
        >
          <I.globe s={12} />
          {d.browseOpenMarkets}
          <I.arrowRight s={12} />
        </Link>
      </div>
    </div>
  );
}
