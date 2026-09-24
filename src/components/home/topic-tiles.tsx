/**
 * §1d — BROWSE BY TOPIC, with a REAL count on every tile and a REAL pool wherever there is one.
 *
 * The tiles this replaces were one glyph and one word each, so the eye skipped the whole band —
 * nothing distinguished one from another. A count is the cheapest possible information scent and
 * it was already computed.
 *
 * ⭐ THE FIGURES RECONCILE TO THE HERO BY CONSTRUCTION, not by agreement. The kit warns that
 * per-topic counts and pools "must reconcile to the header or the page contradicts itself"; both
 * are folds over the SAME `open` set from the SAME board read (`landingTopics` in
 * `lib/markets/landing.ts`), and `landingTopicsReconcile` is the assertion the gate runs.
 *
 * ⛔ THE LEAN UNDERLINE IS ONLY DRAWN WHERE THERE IS MONEY. `leanYesPct` is null on a topic
 * nobody has staked, and a 50%-wide bar over an empty topic is the same fabricated claim as a
 * "50%" label — drawn instead of written (licence condition 1). This is the cold-start rule
 * applied to a graphic.
 */
import Link from "next/link";
import { I, categoryGlyph } from "@/components/ui/glyphs";
import { categoryLabel } from "@/lib/markets/category-label";
import { fill, formatTzsCompact } from "@/lib/utils";
import type { MarketCategory } from "@/lib/server/market-service";
import type { Dict } from "@/lib/i18n-dict";
import type { TopicAggregate } from "@/lib/markets/landing";

export function TopicTiles({
  topics, t, openCount,
}: {
  topics: TopicAggregate[];
  t: Dict;
  /** For the `All topics` tile — the same figure the hero's proof rail states. */
  openCount: number;
}) {
  if (topics.length === 0) return null;
  return (
    <div>
      <p className="kp-hero__eyebrow text-balance">
        <span className="kp-hero__tick" aria-hidden />
        {t.common.topic}
      </p>
      {/* `text-balance`: without it "Vinjari kwa mada" drops "mada" alone onto a second line
          under browser zoom (measured at 130% and 200%). */}
      <h3 className="kp-shead__h text-balance">{t.common.browseByTopic}</h3>

      {/* 🔴 `gridAutoRows: 1fr` — THE LAST TILE WAS 15px SHORTER THAN EVERY OTHER TILE. Measured at
          360 on production: the tracks resolve to 86.25 / 86.25 / 86.25 / 71.25 because rows 1–3 each
          contain at least one tile whose meta wraps to two lines, and the final row holds one tile
          with a one-line meta. Every row here is IMPLICIT and `grid-auto-rows` was `auto`, so each
          row sized to its own content and the orphan came up short against a visible bordered box.
          ⚠️ `1fr` and not a fixed height: the tallest tile decides, so this cannot clip a longer
          topic name or a wrapped pool figure, and it costs 15px once rather than a magic number that
          would be wrong in the next locale. At widths where the rows are explicit this is inert. */}
      <div className="kp-topics" style={{ gridAutoRows: "1fr" }}>
        {/* `All topics` carries the whole open count, which is the hero's own number. */}
        <Link href={"/markets" as never} className="kp-topic">
          <span className="kp-topic__glyph" aria-hidden><I.layoutGrid s={18} /></span>
          <span className="kp-topic__n">{t.home.topicAll}</span>
          <span className="kp-topic__m">
            <span className="kp-topic__live">{fill(t.home.topicLive, { n: openCount })}</span>
          </span>
        </Link>

        {topics.map((tp) => (
          <Link
            key={tp.id}
            /* The board's own href shape — `topic` is the discovery contract's param, not `cat`. */
            href={`/markets?topic=${tp.id}` as never}
            className="kp-topic"
          >
            <span className="kp-topic__glyph" aria-hidden>
              {(() => { const G = I[categoryGlyph(tp.id)]; return <G s={18} />; })()}
            </span>
            <span className="kp-topic__n">{categoryLabel(t, tp.id as MarketCategory)}</span>
            <span className="kp-topic__m">
              <span className="kp-topic__live">{fill(t.home.topicLive, { n: tp.count })}</span>
              {/* 🔴 A ZERO POOL IS NO LONGER STATED, WHICH REVERSES THIS FILE’S OWN NOTE ABOVE.
                  Measured on production 2026-09-24: 3 of the 7 tiles read “TZS 0”, in 46 of the 52
                  cells of the landing gate. A tile exists to give a reader a reason to tap it; the
                  COUNT is that reason. A zero turns the one band whose job is to show a live book
                  into an advertisement that it is empty, and it is the single most repeated defect
                  on the page.
                  ⛔ THIS IS NOT THE COLD-START RULE BEING RELAXED. That rule (DESIGN_AUTHORITY §B6 /
                  licence condition 1) forbids INVENTING a figure nobody produced — the hardcoded 50%.
                  Omitting a true zero states nothing false, the count is never omitted, and the pool
                  is one tap away on /markets?topic=. A tile with no money still says how many
                  questions it holds, which is the honest version of the same scent.
                  ⚠️ `landingTopicsReconcile` is unaffected: it folds over `comp.topics`, not over what
                  this component paints, so the tiles still have to add up to the hero.
                  🔴 D33 · when it IS drawn the figure stays WRAPPED so it is one unbreakable token. As a
                  bare text node it shared the meta’s normal wrapping and split at its own space —
                  “TZS” on one line, “8K” on the next, on most tiles at 320. `.kp-topic__pool` carries
                  the rule and globals.css carries the arithmetic that proves it cannot clip. */}
              {tp.poolTzs > 0 && (
                <>{" · "}<span className="kp-topic__pool">{formatTzsCompact(tp.poolTzs)}</span></>
              )}
            </span>
            {tp.leanYesPct != null && (
              <span className="kp-topic__lean" style={{ width: `${tp.leanYesPct}%` }} aria-hidden />
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
