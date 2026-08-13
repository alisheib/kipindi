/**
 * §1d — BROWSE BY TOPIC, with a REAL count and a REAL pool on every tile.
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
      <p className="kp-hero__eyebrow">
        <span className="kp-hero__tick" aria-hidden />
        {t.common.topic}
      </p>
      <h3 className="kp-shead__h">{t.common.browseByTopic}</h3>

      <div className="kp-topics">
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
              {/* The pool is real even at zero, so it is always stated — the same distinction
                  the card draws between `fresh` (no badge) and `noPrice` (no price). */}
              {" · "}{formatTzsCompact(tp.poolTzs)}
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
