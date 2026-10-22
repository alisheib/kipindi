import type { ReactNode } from "react";
import { Chip } from "@/components/ui/chip";
import { I } from "@/components/ui/glyphs";
import { MaswaliFacts, factsOf, keepFact } from "@/components/maswali/maswali-facts";
import { doorClass, type DoorHost } from "@/components/maswali/maswali-home-card";
import { weekWord } from "@/components/maswali/maswali-format";
import { fillNodes } from "@/lib/fill-nodes";
import { cn, fill, formatTzs } from "@/lib/utils";
import type { Dict, Locale } from "@/lib/i18n-dict";

/**
 * THE MILLIONEA CARD'S LOADING PICTURE — ONE DRAWING FOR EVERY GHOST THAT HOLDS ITS SLOT (S5-DESIGN-DOORS, the critic's H1):
 * the journey home's ghost (`journey-home-ghost.tsx`: the page's own Suspense fallback and the root loading's picture of `/`)
 * and the classic board's (`markets-ghost.tsx`, which `markets/loading.tsx` draws).
 *
 * 🔴 WHAT IT REPLACES: a plate and three bars, about 114px, where the card lands 287px tall (320, sw), 234 (360, sw), 144
 * (768) — and on /markets no slot at all — so the page jumped by up to 303px as the card arrived.
 * ⭐ IT IS THE CARD'S OWN ANATOMY AND ITS OWN WORDS, SO IT WRAPS AS THE CARD WRAPS: the door's grid (`.kp-mln-door`, the
 * card's classes), its host's box (`doorClass`), the plate's 48px, and the card's dictionary lines for a week on sale to a
 * reader who holds no ticket — the most common card — set through the same fact lines (`MaswaliFacts`, `keepFact`,
 * `fillNodes`) in the reader's language. Each fact's words are HIDDEN (`.kp-mln-ghost__words`: `visibility: hidden`, so
 * nothing in it can be read, found or copied) inside a bar that follows their lines (`.kp-mln-ghost__bar`: an inline
 * background cloned onto every line, the journey ghost's headline technique), so each bar is as long as the line it stands
 * for and the box is exactly as tall as the card. The figure is a bar like the rest: no number is drawn for a figure not read.
 * ⭐ ONE WORD IS DRAWN, ITS NAME — "Millionea", as the How-to card's ghost beside it draws its title and the board's ghost its
 * page's name (journey-home-ghost.tsx: names in words, every other shape a bar). It never changes, so it stands where the
 * card's own will; the week beside it is a datum, and a bar.
 * ⚠️ WHAT IT CANNOT KNOW: the week's state and the reader's tickets are the hub's read, which the ghost stands in for. A week
 * still waiting on an earlier one's carry, a closed week, a void, a reader at the cap — each a line more or fewer — land at
 * their own height; `qa:maswali-player-shots`' door pages measure the common card exactly and record the rest
 * (`qa:maswali-door-preview` the staff preview's), and `test:maswali-doors` §2 holds the ghost's anatomy and words.
 * ⛔ NO DIRECTIVE, NO SERVER READ, NO WORD OF ITS OWN: a server page and two client modules draw it, so it takes its words
 * as `t` and reaches only pure modules (`test:journey-home` 7.client holds the journey ghost's graph). Its callers draw it
 * only where their door answered that the card will be offered — never while Millionea is hidden (WITHDRAWN draws nothing).
 */
export function MaswaliHomeCardGhost({ t, locale, host, preview = false, className }: {
  t: Dict;
  locale: Locale;
  host: DoorHost;
  /** At STAFF_PREVIEW the card carries its preview chip in the title row: the ghost holds its place. */
  preview?: boolean;
  className?: string;
}) {
  /** One fact's words, hidden inside the bar that follows their lines. */
  const bar = (words: ReactNode) => <span className="kp-mln-ghost__bar"><span className="kp-mln-ghost__words">{words}</span></span>;
  const keep = (s: string) => bar(keepFact(locale, s));
  // The card's lines for a week on sale, set as the card sets them (maswali-home-card.tsx) at a figure, a week, a fee, a
  // close and a price of the platform's own sizes: read by no one, they only hold their lines' lengths.
  const pct = 13;
  const rule = factsOf(t.millionea.ruleWithFigure);
  const at = rule.findIndex((f) => f.includes("{amount}"));
  const amount = <span className="amount text-body-lg font-semibold">{formatTzs(1_000_000)}</span>;
  const headline = [
    ...rule.slice(0, at).map((f) => keep(fill(f, { pct }))),
    bar(fillNodes(rule[at] ?? "", { amount, pct })),
    ...rule.slice(at + 1).map((f) => keep(fill(f, { pct }))),
  ];
  // The close as the card sets it (`doorTime`): the weekday in the body face, the clock a `.mono` numeral, one run.
  const when = <span className="whitespace-nowrap">{t.millionea.weekdays[4]} <span className="mono">18:00</span></span>;
  const state = [bar(fillNodes(t.millionea.salesCloseAt, { when })), keep(fill(t.millionea.cardPrice, { price: formatTzs(1_000) }))];
  return (
    <div aria-hidden className={cn("kp-mln-zh kp-mln-ghost kp-shimmer-track", doorClass(host), className)} data-ghost-part="millionea">
      <span className="kp-mln-door__plate kp-jhome-ghost__plate" />
      <span className="kp-mln-door__head">
        <span className="kp-mln-door__title">
          <span className="font-display text-body-lg font-semibold">
            <MaswaliFacts numerals={false} facts={[t.millionea.productLabel, bar(keepFact(locale, weekWord(t, 49), [], { numerals: false }))]} />
          </span>
          {preview && (
            <Chip variant="neutral" size="sm" className="gap-1">
              <span className="kp-mln-ghost__words"><I.eye s={10} aria-hidden /></span>
              <span className="kp-mln-ghost__words">{t.millionea.previewChip}</span>
            </Chip>
          )}
        </span>
      </span>
      <span className="kp-mln-door__rule text-body-sm">
        <MaswaliFacts layout="phone" facts={headline} />
      </span>
      <span className="kp-mln-door__state text-body-sm">
        <MaswaliFacts layout="phone" facts={state} />
      </span>
      <I.chevronRight s={20} edge="end" className="kp-mln-door__chev" />
    </div>
  );
}
