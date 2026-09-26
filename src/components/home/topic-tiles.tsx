/**
 * §1d — BROWSE BY TOPIC, with a REAL count on every tile and a REAL pool wherever there is one.
 *
 * A count is the cheapest possible information scent and it was already computed, so every tile
 * states one.
 *
 * ⭐ THE FIGURES RECONCILE TO THE HERO BY CONSTRUCTION, not by agreement: both are folds over the
 * SAME `open` set from the SAME board read (`landingTopics` in `lib/markets/landing.ts`), and
 * `landingTopicsReconcile` is the assertion the gate runs. ⛔ That is why the six-tile cut below is
 * made HERE, at render — slicing `comp.topics` itself would break the reconciliation.
 *
 * ── landing v3 (WP10), 2026-09-26 ──────────────────────────────────────────────────────────────
 * - "All topics" was a tile carrying the whole open count; it is now the section's own link, where
 *   every other section on the page keeps its "see all" (`.kp-shead__link`). A tile that is not a
 *   topic made the grid read as seven topics.
 * - Six tiles, most live first, **Other always last** — "Other" is a remainder, and leading with it
 *   when it happens to be large told a reader the platform's biggest subject is "miscellaneous".
 * - Two columns below 1024, three from 1024: six tiles are three rows or two, never an orphan. When
 *   the book holds fewer topics, the last tile spans its row instead of standing alone (V6).
 * - No glyph and no lean underline. The glyph repeated the name; the underline drew the topic's YES
 *   lean with no text beside it, and the delivery asks that every bar carry a text description (K22).
 *   `leanYesPct` is still computed by `landingTopics` — a real fact about the topic, simply not drawn.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { categoryLabel } from "@/lib/markets/category-label";
import { fill, formatTzsCompact } from "@/lib/utils";
import type { MarketCategory } from "@/lib/server/market-service";
import type { Dict } from "@/lib/i18n-dict";
import type { TopicAggregate } from "@/lib/markets/landing";

/** The tile count — two full rows of three, three of two. */
export const TOPIC_TILES = 6;

/**
 * Most live first (the order `landingTopics` already returns), "other" moved to the end.
 * ⚠️ THE LAST SLOT IS RESERVED FOR "OTHER" WHEN IT IS LIVE. There are six named categories and
 * "other"; appending Other and THEN cutting to six would drop it on every full book, however many
 * markets it held — "Other last" silently becoming "Other never" (found by the v3 review).
 */
export function topicTileOrder(topics: TopicAggregate[]): TopicAggregate[] {
  const named = topics.filter((tp) => tp.id !== "other");
  const other = topics.filter((tp) => tp.id === "other");
  return [...named.slice(0, TOPIC_TILES - other.length), ...other];
}

export function TopicTiles({ topics, t }: { topics: TopicAggregate[]; t: Dict }) {
  const tiles = topicTileOrder(topics);
  if (tiles.length === 0) return null;
  return (
    <div>
      <div className="kp-shead">
        <div className="min-w-0">
          <p className="kp-hero__eyebrow text-balance">
            <span className="kp-hero__tick" aria-hidden />
            {t.common.topic}
          </p>
          {/* `text-balance`: without it "Vinjari kwa mada" drops "mada" alone onto a second line
              under browser zoom (measured at 130% and 200%). An h2 — it heads its own block, like
              "Pick a side now" above it. */}
          <h2 className="kp-shead__h text-balance">{t.common.browseByTopic}</h2>
        </div>
        <Link href={"/markets" as never} className="kp-shead__link">
          {t.home.topicAll}
          <I.chevronRight s={14} />
        </Link>
      </div>

      {/* 🔴 `gridAutoRows: 1fr` — THE LAST TILE WAS 15px SHORTER THAN EVERY OTHER TILE (measured at 360
          on production): every row here is implicit, so each row sized to its own content and a row
          whose tiles carried one-line metas came up short against a visible bordered box. `1fr` lets
          the tallest tile decide, so it cannot clip a longer name or a wrapped pool figure. */}
      <div className="kp-topics" style={{ gridAutoRows: "1fr" }}>
        {tiles.map((tp) => (
          <Link
            key={tp.id}
            /* The board's own href shape — `topic` is the discovery contract's param, not `cat`. */
            href={`/markets?topic=${tp.id}` as never}
            className="kp-topic"
          >
            <span className="kp-topic__n">{categoryLabel(t, tp.id as MarketCategory)}</span>
            <span className="kp-topic__m">
              <span className="kp-topic__live">{fill(t.home.topicLive, { n: tp.count })}</span>
              {/* 🔴 A ZERO POOL IS NOT STATED: 3 of the 7 tiles read "TZS 0" on production (2026-09-24),
                  turning the band whose job is to show a live book into an advertisement that it is
                  empty. ⛔ This is not the cold-start rule relaxed — that rule forbids INVENTING a
                  figure; omitting a true zero states nothing false, and the count is never omitted.
                  🔴 D33 · when it IS drawn the figure stays WRAPPED as one unbreakable token, so it
                  cannot split at its own space ("TZS" over "8K"). */}
              {tp.poolTzs > 0 && (
                <>{" · "}<span className="kp-topic__pool">{formatTzsCompact(tp.poolTzs)}</span></>
              )}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
