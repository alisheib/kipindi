/**
 * ONE TICKET ON TIKETI ZANGU — a position, drawn in the canvas's order (the Vodacom plan S6, SJ-19; S6-PLAN WP9
 * step 4 as amended by A8 and A19; the S4 frames s4-9-tiketi-open and s4-9-tiketi-settled, in the kit's tokens).
 *
 * The side, then the ticket's state; the question, which is the card's only link (the Sell button sits inside the
 * card, so the card itself cannot be one); the stake and the payout; the ticket number, when the ticket was placed and,
 * while it is open, when selection closes; then the Sell button.
 *
 * ⭐ THE QUESTION IS THE SHORT TITLE where an officer approved one (S2's `cardTitle`, on the projection WP8 widened),
 * and otherwise the reader's own full question, held to two lines.
 * ⭐ ITS LINK REACHES 44px AND THE CARD DOES NOT MOVE (Law 9's tap floor): twelve pixels of padding above and below the
 * question, taken back by the same twelve as negative margin — the absorber `side-picker.tsx` uses — so one line is a
 * 44px target and two lines 64px, while every line sits where it would without them. Its neighbours, the state chips
 * above and the stake and payout below, are 16px away and neither holds a control. The two-line clamp sits on the words
 * inside: on the padded link itself a third line would show through the padding.
 * ⛔ NO PAYOUT FIGURE ON ANY UNRESOLVED TICKET (SJ-4, DESIGN_AUTHORITY §C3, VODACOM-PLAN §0h point 22): "Malipo ·
 * Matokeo yakitoka" while betting is open, after selling closes, and after the closing sweep has stamped the market; the
 * figure arrives with the result ("Malipo ya mwisho"). `ticketPayout` holds the rule and `test:journey-tickets` §2
 * drives it; the card reads no projection and no stamp, so it has nothing to branch to one with. The classic card keeps
 * its own exact post-close figure.
 * ⛔ THE STATE'S COLOUR IS `positionStatusChip`, the one rule the classic position card calls too.
 * ⛔ EVERY DATE IS FORMATTED HERE, ON THE SERVER, FROM ITS INSTANT, and each sits in a `<time>` naming that instant
 * (`test:timer-date` §3): `formatEatDateTime`, in the reader's month words and the East Africa clock, with the year only
 * when the instant is not in this EAT year (Chinese always carries it). `formatDeadline` printed English months in every
 * locale ("Imewekwa 8 Oct, 15:18", §L4).
 * ⛔ THE FREE-SELL INSTANT IS THE SERVER'S (A8): `freeExitEndsAt`, asked about this bet's own placement and the market
 * as read, and bound once. The Sell button counts down to it and, in the journey's look (WP10), names it as a clock time:
 * `formatClock` of that same binding, read here on the server in the platform's zone — never the placement plus a grace
 * ("Uza bila ada hadi 11:23 · 3:42"). `test:sell-grace-truth` §2 holds this card to the one call and its label to the one
 * binding, as it holds the classic hosts to the call; `test:timer-date` §3 holds the time to the instant. The look also
 * learns whether the page priced the exit inside its free window (`price.free`), so a free price is offered only while
 * its countdown runs.
 * ⛔ No share button and no profit figures (A19: shelved for preview viewers, `docs/SHELVED.md`). The ticket number
 * stays: it is what a player quotes to support.
 * ⛔ A SERVER COMPONENT THAT READS NOTHING: the page read and priced every ticket, and its pricing inputs stay there
 * (`test:journey-tickets` §8); this only draws, and it hands the client button plain values.
 */
import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { Stat } from "@/components/ui/stat";
import { I } from "@/components/ui/glyphs";
import { SellButton } from "@/components/markets/sell-button";
import { cardTitle } from "@/lib/markets/short-title";
import { positionStatusWord, sideWord } from "@/lib/side-label";
import { positionStatusChip } from "@/lib/status-tone";
import { formatClock, formatTzs } from "@/lib/utils";
import { formatEatDateTime } from "@/lib/eat-day";
import { freeExitEndsAt, isSelectionClosed, type StoredPosition } from "@/lib/server/market-service";
import type { PositionCardMarket } from "@/lib/server/market-dal";
import type { Dict, Locale } from "@/lib/i18n-dict";
import { ticketPayout } from "@/components/journey/tickets/ticket-payout";

/** The fields of a position the card draws. */
export type TicketPosition = Pick<StoredPosition, "id" | "marketId" | "side" | "stake" | "status" | "finalPayout" | "placedAt">;
/**
 * What the page priced for an open ticket's exit: the value it would sell at now, whether it can be sold, and whether
 * that value is the free window's — the whole stake (`cashOutValue`'s `inGracePeriod`, S6 WP10).
 */
export type TicketPrice = { value: number | null; sellable: boolean; free?: boolean };

export function TicketCard({ p, m, price, t, locale, serverNow }: {
  p: TicketPosition;
  m: PositionCardMarket;
  price: TicketPrice | undefined;
  t: Dict;
  locale: Locale;
  serverNow: number;
}) {
  const title = cardTitle(locale, m);
  const open = p.status === "OPEN";
  // The instant selection shuts — the one the Sell button closes at, and the one the close line names.
  const cutoffIso = m.selectionClosedAt ?? m.resolutionAt;
  const closed = isSelectionClosed(m);
  const payout = ticketPayout(p);
  const liveValue = price?.value ?? null;
  // Selling is shut once selection has closed or the exit window has passed: the classic page's own rule.
  const sellShut = closed || price?.sellable === false;
  // The free window's end, the server's own instant (A8), bound once: the button counts down to it, and its clock time,
  // read here on the server, is the time the journey's line names.
  const freeUntil = freeExitEndsAt({ placedAt: p.placedAt }, m);
  const [placedBefore, placedAfter] = t.journey.ticketPlacedAt.split("{date}");
  return (
    <article
      id={p.id}
      data-row-id={p.id}
      className="ticket-target scroll-mt-[96px] rounded-xl border border-border bg-bg-elevated p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Chip size="sm" variant={p.side === "YES" ? "yes" : "no"}>{sideWord(t, p.side, "MARKET")}</Chip>
        <Chip size="sm" variant={positionStatusChip(p.status)}>{positionStatusWord(t, p.status, "MARKET")}</Chip>
      </div>
      <h2 className="mt-3 font-display text-body-lg font-semibold leading-tight text-text">
        <Link href={`/markets/${p.marketId}` as never} className="-my-2 block py-2 hover:underline">
          <span className={title.short ? undefined : "line-clamp-2"}>{title.text}</span>
        </Link>
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <Stat label={t.dialog.stakeLabel} value={formatTzs(p.stake)} money />
        {payout.kind === "atResult" ? (
          <Stat label={t.journey.ticketPayout} value={t.journey.ticketPayoutAtResult} tone="muted" />
        ) : (
          <Stat label={t.journey.ticketFinalPayout} value={formatTzs(payout.amount)} tone={payout.won ? "gold" : "default"} struck={payout.won} money />
        )}
      </div>
      <div className="mt-3 space-y-1 text-body-sm text-text-muted">
        <p className="flex items-center gap-1.5 break-all font-mono"><I.ticket s={14} className="shrink-0" />{p.id}</p>
        <p className="flex items-center gap-1.5">
          <I.clock s={14} className="shrink-0" />
          <span>{placedBefore}<time dateTime={p.placedAt} className="whitespace-nowrap tabular-nums">{formatEatDateTime(Date.parse(p.placedAt), serverNow, t.common.monthsShort, locale)}</time>{placedAfter}</span>
        </p>
        {open && (
          <p className="flex items-center gap-1.5">
            <I.calendarClock s={14} className="shrink-0" />
            {closed ? (
              <span>{t.positions.selectionClosed}</span>
            ) : (
              <span>{t.positions.selectionCloses}{" "}<time dateTime={cutoffIso} className="whitespace-nowrap tabular-nums">{formatEatDateTime(Date.parse(cutoffIso), serverNow, t.common.monthsShort, locale)}</time></span>
            )}
          </p>
        )}
      </div>
      {open && (liveValue !== null || sellShut) && (
        <div className="mt-3 border-t border-border/60 pt-3">
          <SellButton
            positionId={p.id}
            stake={p.stake}
            value={liveValue ?? 0}
            pricedFree={price?.free === true}
            freeUntil={freeUntil}
            closesAt={cutoffIso}
            alreadyClosed={sellShut}
            serverNow={serverNow}
            look="journey"
            freeUntilLabel={freeUntil ? formatClock(freeUntil) : null}
          />
        </div>
      )}
    </article>
  );
}
