/**
 * /millionea/tickets — THE LENS RAIL (MASWALI-BUILD S5 composition; the v6 delivery's T-list frames: Zote · Hai ·
 * Imekamilika · Umeshinda, D-42; `test:filter-language` declares this file a player filter surface).
 *
 * One axis, four lenses over the reader's own tickets, on the platform's one filter control (`FilterPill`) in the one
 * scrolling strip (`QueryStrip`) on the query bar's own classes — the journey Tiketi zangu bar's shape (`positions-bar.tsx`
 * `PositionsBarJourney`): row 1 alone, no count (the frames draw none). Its words are the platform's lens words.
 * ⛔ A lens is a filter, never a navigation: toggle semantics, `replace`, no scroll. Server markup, no directive.
 */
import { FilterPill } from "@/components/ui/filter-pill";
import { QueryStrip, QUERY_BAR_CLASS, QUERY_BAR_ROW1_ALONE_CLASS } from "@/components/ui/query-bar";
import { positionOutcomeWord } from "@/lib/side-label";
import type { TicketShown } from "@/lib/maswali-week-label";
import type { Dict } from "@/lib/i18n-dict";

export const MILLIONEA_LENSES = ["all", "open", "settled", "won"] as const;
export type MillioneaLens = (typeof MILLIONEA_LENSES)[number];

/** The lens a URL asks for; anything else is "all" (a URL-supplied word is not a lens until it is checked). */
export function parseMillioneaLens(raw: unknown): MillioneaLens {
  return MILLIONEA_LENSES.find((l) => l === raw) ?? "all";
}

/** Does a ticket belong in a lens: open is still running; settled has run its course (won, lost, forfeited, refunded,
 *  cancelled); won is a WON ticket — its share paid or held for review — never one whose share was forfeited after review
 *  (round 3: that ticket reads "forfeited"). */
export function inLens(lens: MillioneaLens, shown: TicketShown): boolean {
  switch (lens) {
    case "all": return true;
    case "open": return shown === "running";
    case "settled": return shown !== "running";
    case "won": return shown === "won";
  }
}

function lensHref(lens: MillioneaLens): string {
  return lens === "all" ? "/millionea/tickets" : `/millionea/tickets?lens=${lens}`;
}

function lensLabel(t: Dict, lens: MillioneaLens): string {
  switch (lens) {
    case "all": return t.common.all;
    case "open": return t.common.open;
    case "settled": return t.common.settled;
    case "won": return positionOutcomeWord(t, "WIN", "MASWALI");
  }
}

export function MillioneaTicketsBar({ lens, t }: { lens: MillioneaLens; t: Dict }) {
  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_ALONE_CLASS}>
        <QueryStrip ariaLabel={t.journey.ticketsFilterAria}>
          {MILLIONEA_LENSES.map((l) => (
            <FilterPill key={l} href={lensHref(l)} label={lensLabel(t, l)} on={lens === l} testId={`lens:${l}`} semantics="toggle" replace scroll={false} />
          ))}
        </QueryStrip>
      </div>
    </div>
  );
}
