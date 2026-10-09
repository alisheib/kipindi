import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { FiftyMark } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { hangCjkMarks } from "@/lib/cjk-marks";
import type { Locale } from "@/lib/i18n-dict";
// ⭐ R4-J (2026-10-09): every not-found answer says so to what stands outside the page (`lib/not-found-mark.ts`).
import { NotFoundMark } from "@/components/ui/not-found-mark";

/**
 * ⭐ ONE NOT-FOUND, EVERYWHERE IN THE APP (2026-10-09, the visual pass's round 4, E42–E47 E51; tiles 345–398).
 *
 * There were two designs. The root page (`app/not-found.tsx`, which also answers inside `/updown/[roundId]`) drew the
 * kit frame — a kicker, icon cards, a periwinkle way out, the topographic wave — and `/markets/[id]` and
 * `/proposals/[id]` drew plain cards in another order (Masoko · Mwanzo · Msaada) under a GOLD "404" with a GOLD link:
 * gold on a page that pays nothing (§M3, Q5 "gold is money, and nothing else"). All three now render this view.
 *   · THE ORDER IS DECIDED ONCE: Home · Markets · Help — the root page's, its first glyph the arrow back.
 *   · ONE LINK COLOUR, `--brand-300`, for the one way out under the cards; a segment names its own (`way`).
 *   · THE WORDS ARE THE ROOT PAGE'S, below, in every language — the market page used the dictionary's twin of these
 *     sentences, whose English h1 types a straight apostrophe ("couldn't", E44; S12 owns that key).
 *   · THE CONTENT EDGE IS THE HOUSE GUTTER, `px-3` (16px): `px-5` was 24px, so on a phone the cards stood 8px inside
 *     the edge every other page keeps, in both shells (E51: cards x24–336 at 360).
 *   · THE WAVE FADES OUT (E46). Clipped to this 640px column it was a hard-edged box at 1280 (x320–959, y169–823):
 *     `.kp-nf-topo` fades it over 64px at the top and the bottom, and at the sides only where the column is narrower
 *     than the screen — on a phone its sides are the screen's.
 *   · THE HEADING AND THE HINT ARE BALANCED (E42): "Hatukupata ukurasa / huo" and "…that / page" left a word alone, and
 *     the Chinese hint broke inside 选择 at 390 and left 继续。 alone at 1280. Chinese breaks only after its marks
 *     (`keep-all`, `break-word` the floor), and every mark that ends a line hangs its empty half (`hangCjkMarks`, E50).
 *   · `max-w-form` is the 640px tier token, so the view states no hand-typed page width (`test:measure`).
 */
export const NOT_FOUND_WORDS = {
  en: {
    notFoundCode: "404",
    notFound: "Page not found",
    notFoundBody: "We couldn’t find that page",
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
    notFound: "页面未找到",
    notFoundBody: "我们找不到该页面",
    notFoundHint: "链接可能已失效，市场可能已结算，或URL输入有误。请选择以下目的地继续。",
    home: "首页",
    markets: "市场",
    help: "帮助",
    browseOpenMarkets: "浏览开放市场",
  },
} as const satisfies Record<Locale, Record<string, string>>;

export type NotFoundWords = (typeof NOT_FOUND_WORDS)[Locale];

/** The page's tab title, in its language: "Hakuna ukurasa · 404" (the root layout's template adds " · 50pick"). */
export const notFoundTitle = (w: NotFoundWords) => `${w.notFound} · ${w.notFoundCode}`;

const CARD = "group rounded-xl border border-border bg-bg-elevated p-3.5 text-left transition-all hover:border-brand-400 hover:bg-bg-overlay hover:-translate-y-0.5 hover:shadow-[var(--shadow-3)]";
/* ⚠️ LITERALS, not `h-7 w-7` — the spacing scale is overridden (tailwind.config.ts), so `h-7` IS 40px; written as what
   it renders, so nothing moves and `test:ui-consistency`'s numeric-size rule has nothing to baseline. */
const PLATE = "mb-2 inline-flex h-[40px] w-[40px] items-center justify-center rounded-md bg-bg-inset text-text-subtle group-hover:text-brand-300 transition-colors";
const LABEL = "font-display text-[13px] font-semibold text-text";

export function NotFoundView({
  words,
  recoveryLabel,
  way,
}: {
  words: NotFoundWords;
  /** The cards' nav name (`t.error.recoveryLinks`). */
  recoveryLabel: string;
  /** The one way out under the cards; by default the open markets. */
  way?: { href: string; label: string };
}) {
  const out = way ?? { href: "/markets", label: words.browseOpenMarkets };
  return (
    // Same kit frame as the shared RouteError (A3): FiftyMark 64 over a faint BrandTopo, a glyph badge, neutral chrome.
    // A 404 is "not found", not an error — so the badge is royal/info (not the RouteError rose alert tint), and there is
    // no gold here (404 isn't earned money).
    <div className="kp-shortpage relative mx-auto flex min-h-[80svh] max-w-form flex-col items-center justify-center overflow-hidden px-3 py-10 text-center">
      {/* ⭐ THE NOT-FOUND MARK (R4-J, 2026-10-09): an empty, hidden span and its announcement — the Needle, the chat
          bubble and the channels panel stop standing down for a question page that is not there, the journey's chrome
          lights no tab and stops its unread polls (a Server Action posted to a not-found address is answered 404). */}
      <NotFoundMark />
      <div aria-hidden className="kp-nf-topo">
        <div className="kp-nf-topo__x">
          <BrandTopo id="notfound-topo" opacity={0.09} />
        </div>
      </div>
      <div className="relative flex flex-col items-center">
        <FiftyMark size={64} />
        <div
          /* ⚠️ LITERALS, not `h-11 w-11` — `h-11` renders 96px on the overridden scale, a medallion that rivalled the
             size={64} mark above it. */
          className="mb-3 mt-5 inline-flex h-[44px] w-[44px] items-center justify-center rounded-full border border-brand-600 bg-brand-500/10 text-brand-300"
          style={{ boxShadow: "0 0 0 7px color-mix(in oklab, var(--brand-500) 8%, transparent)" }}
        >
          <I.search s={19} />
        </div>
        <p className="font-mono text-micro font-bold uppercase tracking-[0.20em] text-text-subtle">
          {words.notFoundCode} · {words.notFound}
        </p>
        <h1 className="mt-2 font-display text-title-lg font-bold leading-tight tracking-[-0.02em] text-text text-balance">
          {words.notFoundBody}
        </h1>
        <p className="mt-3 max-w-[420px] text-[13px] leading-relaxed text-text-subtle text-balance [word-break:keep-all] [overflow-wrap:break-word]">
          {hangCjkMarks(words.notFoundHint)}
        </p>
        {/* 🔴 D68 · THREE ACROSS AT EVERY WIDTH, BECAUSE ONE PER ROW PUT THEM OFF THE SCREEN. At 320×640 one card per row
            left the first 61.6% visible behind the rail and the other two entirely off-screen. The labels are one short
            word each, so three across at 320 gives each ~90px of an ~48px word and turns 304px into one row. */}
        <nav aria-label={recoveryLabel} className="mt-6 grid w-full max-w-[420px] grid-cols-3 gap-2.5">
          <Link href="/" className={CARD}>
            <span className={PLATE}>
              <I.arrowRight s={13} style={{ transform: "rotate(180deg)" }} />
            </span>
            <p className={LABEL}>{words.home}</p>
          </Link>
          <Link href="/markets" className={CARD}>
            <span className={PLATE}>
              <I.chart s={13} />
            </span>
            <p className={LABEL}>{words.markets}</p>
          </Link>
          <Link href="/help" className={CARD}>
            <span className={PLATE}>
              <I.info s={13} />
            </span>
            <p className={LABEL}>{words.help}</p>
          </Link>
        </nav>
        <Link
          href={out.href as never}
          className="mt-6 inline-flex items-center gap-2 font-mono text-caption uppercase tracking-[0.14em] text-brand-300 hover:text-brand-200"
        >
          <I.globe s={12} />
          {out.label}
          <I.arrowRight s={12} />
        </Link>
      </div>
    </div>
  );
}
