/**
 * /millionea/tickets — THE LENS RAIL (MASWALI-BUILD S5 composition; the v6 delivery's T-list frames: Zote · Hai ·
 * Imekamilika · Umeshinda, D-42; `test:filter-language` declares this file a player filter surface).
 *
 * One axis, four lenses over the reader's own tickets, on the platform's one filter control (`FilterPill`) on the query
 * bar's own classes — the journey Tiketi zangu bar's shape (`positions-bar.tsx` `PositionsBarJourney`): row 1 alone, no
 * count (the frames draw none).
 * ⭐ S5 VIS P11 · FOUR LENSES WRAP, THEY NEVER SCROLL: in the one scrolling strip the fourth lens was cut mid-word by its
 * fade at 320 and 360 ("Um…", "Umeshind…"), and Swahili's decided words (§D) are longer still. Four pills need no strip:
 * they stand in one row wherever it holds them and take a second where it does not (Swahili below about 500px), each
 * pill whole. ⭐ Their words are Millionea's own (`millionea.lens*`, §D: "Zinazoendelea · Zilizokamilika · Ulizoshinda",
 * "已中奖"); the platform's lens words stay the platform's.
 * ⛔ A lens is a filter, never a navigation: toggle semantics, `replace`, no scroll. Server markup, no directive.
 */
import { FilterPill } from "@/components/ui/filter-pill";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_ALONE_CLASS } from "@/components/ui/query-bar";
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
    case "all": return t.millionea.lensAll;
    case "open": return t.millionea.lensOpen;
    case "settled": return t.millionea.lensSettled;
    case "won": return t.millionea.lensWon;
  }
}

export function MillioneaTicketsBar({ lens, t }: { lens: MillioneaLens; t: Dict }) {
  return (
    <div data-filter-rail className={QUERY_BAR_CLASS}>
      <div className={QUERY_BAR_ROW1_ALONE_CLASS}>
        <nav aria-label={t.journey.ticketsFilterAria} className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1 gap-y-1.5">
          {MILLIONEA_LENSES.map((l) => (
            <FilterPill key={l} href={lensHref(l)} label={lensLabel(t, l)} on={lens === l} testId={`lens:${l}`} semantics="toggle" replace scroll={false} />
          ))}
        </nav>
      </div>
    </div>
  );
}
