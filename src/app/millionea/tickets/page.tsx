/**
 * /millionea/tickets — TIKETI ZANGU, MILLIONEA (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 items 1 and 4, §10 §3.9; the v6
 * delivery's T-list frames, D-42). The reading tier, as Tiketi zangu's other two kinds.
 *
 * For a journey reader, Tiketi zangu's own head — its name and the switch, Maswali | Juu/Chini | Millionea, this kind
 * current (`ticket-switch.tsx`) — and for everybody else the page's own name under the product's. Then the four lenses
 * (`tickets-bar.tsx`) and the reader's tickets as the platform's ticket card (`MaswaliTicketCard`: the week and the state
 * word, the Seal Line as its link, the stake and the final payout, the serial and when it was bought), newest week first,
 * one column on a phone and two from 768. Row text is the ticket page's, byte for byte (§3.9).
 * ⭐ PAGED BY WEEK, ON THE PLATFORM'S PAGER (`millioneaMyTickets`, round 3; S5 re-review 4): every week the account holds a
 *    ticket in is counted, and each week on a page comes whole — never a page of the newest tickets, which a weekly cap of
 *    up to 100 would cut in half. The pager is links (`?page`), so it works without JavaScript; a lens narrows the page it
 *    is on, and a lens that empties a page says so in its own words, never "no ticket yet" over a holder's tickets.
 *
 * ⛔ THE TICKETS' GATE (`millioneaTicketGate`, L5): a kill hides the product, never a player's own tickets — a holder
 *    reaches this list at every rollout state; a signed-out reader is sent to sign in and back here.
 * ⛔ GOLD ONLY ON A PAID SHARE (§M8a item 7): the card's payout stat is struck for a won ticket whose share is the
 *    player's, and a held or forfeited share shows its word instead (MB-43, OD-07).
 * ⛔ No `.catch` on the read: a failed read is the error page, never "no tickets yet" drawn over a player's money (B-1).
 */
import type { Metadata } from "next";
import { generateMetadata as notFoundMetadata } from "@/app/not-found";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination, PLAYER_PER_PAGE, buildBaseHref } from "@/components/ui/pagination";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { MaswaliTicketCard } from "@/components/maswali/maswali-ticket";
import { eatWeekdayClock, weekNumberOf } from "@/components/maswali/maswali-format";
import { TicketsHead } from "@/components/journey/tickets/ticket-switch";
import { millioneaTicketGate } from "@/lib/server/millionea-gate";
import { millioneaMyTickets, type MillioneaTicketRow } from "@/lib/server/maswali-player";
import { millioneaHubNow, millioneaTicketsDoor, millioneaWeekPrices } from "@/lib/server/millionea-doors";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { getServerT } from "@/lib/i18n-server";
import { fill } from "@/lib/utils";
import { MILLIONEA_HREF, MillioneaPreviewMark, signInHref, ticketPageHref } from "../millionea-parts";
import { lineOfSlots, msOf } from "../millionea-view";
import { inLens, MillioneaTicketsBar, parseMillioneaLens } from "./tickets-bar";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  // The title obeys the same answer as the body (L5: shown, or a holder at a kill; the account hub's precedent), and
  // asking never rejects (visual-pass-r5d 1.4″).
  if (!(await millioneaTicketsDoor())) return notFoundMetadata();
  const { t } = await getServerT();
  const { journey } = await resolveSimpleJourney();
  return { title: journey ? `${t.journey.tabTickets} · ${t.millionea.productLabel}` : t.millionea.myTicketsTitle };
}

/** What a ticket was finally paid, as the card prints it (§10 §3.9): a PAID share, the price back once a refund or a
 *  cancel landed, nothing on a loss — and no figure while the result is not in, for a share held for review, or for one
 *  forfeited after it (round 3: its ticket reads "forfeited", and its word stands in the payout's place). */
function payoutOf(row: MillioneaTicketRow, price: number): number | null {
  switch (row.shown) {
    case "won": return row.share === "paid" ? row.paid : null;
    case "forfeited": return null;
    case "lost": return 0;
    case "refunded": return row.refund?.state === "landed" ? row.refund.amount : price;
    case "cancelled": return price;
    case "running": return null;
  }
}

export default async function MillioneaTicketsPage({ searchParams }: { searchParams: Promise<{ lens?: string; page?: string }> }) {
  const gate = await millioneaTicketGate();
  if (!gate.userId) redirect(signInHref(MILLIONEA_HREF.tickets));
  const [{ t, locale }, { journey }, sp] = await Promise.all([getServerT(), resolveSimpleJourney(), searchParams]);
  const nowMs = Date.now();
  const lens = parseMillioneaLens(sp.lens);
  // One page of the reader's WEEKS, each whole, with the count of them all; the read clamps the page asked into range and
  // answers the page it drew, which the pager then marks.
  const { rows: weeks, total, page } = await millioneaMyTickets(gate.userId, {
    page: Number.parseInt(String(sp.page ?? "1"), 10) || 1,
    perPage: PLAYER_PER_PAGE,
  });
  // Each week's frozen price — every ticket of a week cost the same (MR-11); a week whose rules cannot be read draws no card.
  const prices = await millioneaWeekPrices(weeks.map((g) => g.week.id));
  // Newest first, as the list promises: the weeks come newest first, and inside a week its tickets by when they were bought,
  // the latest first (S5 VIS P11: 000041 stood before 000042), the serial deciding a tie.
  const newestFirst = (a: MillioneaTicketRow, b: MillioneaTicketRow) => (Date.parse(b.boughtAt) - Date.parse(a.boughtAt)) || b.serial.localeCompare(a.serial);
  const cards = weeks.flatMap((g) => {
    const price = prices.get(g.week.id);
    return price === undefined ? [] : g.tickets.filter((row) => inLens(lens, row.shown)).sort(newestFirst).map((row) => ({ g, row, price }));
  });
  const anyLive = weeks.some((g) => g.tickets.some((row) => row.shown === "running"));
  // The empty list's one invitation (the T-list frame): the week on sale — read only for a reader who holds no ticket at
  // all, and only while the product is shown to them (a holder let in at a kill is offered nothing, L5).
  const hubWeek = total === 0 && gate.visible ? (await millioneaHubNow(gate.userId, gate.state))?.week ?? null : null;
  const selling = hubWeek?.selling ? hubWeek : null;

  return (
    <PageContainer tier="reading" className="kp-mln-zh space-y-6">
      <RefreshPoller intervalMs={60_000} enabled={anyLive} />
      {/* The classic head: the product's name over "Your tickets" — one line at 320 in every language (P11: "Your
          Millionea tickets" left "tickets" alone there, and a balanced wrap cannot do better than that). */}
      {journey
        ? <TicketsHead current="millionea" millionea t={t} />
        : <PageHeader eyebrow={t.millionea.productTitle} title={t.millionea.ticketsTitle} />}
      {gate.preview && <MillioneaPreviewMark t={t} />}
      <MillioneaTicketsBar lens={lens} t={t} />
      {total === 0 ? (
        <EmptyState
          kind="positions"
          title={t.millionea.emptyTickets}
          body={selling
            ? fill(t.millionea.emptyTicketsNext, { week: weekNumberOf(selling.code), when: eatWeekdayClock(t, msOf(selling.closesAt) ?? 0) })
            : undefined}
          action={gate.visible ? (
            <Link href={MILLIONEA_HREF.hub as never} className="btn btn-ghost btn-md border-border-control">{t.millionea.productTitle}</Link>
          ) : undefined}
        />
      ) : cards.length === 0 ? (
        // The reader holds tickets; this lens leaves none on this page (or, on the one page, none at all).
        <EmptyState kind="positions" title={total > PLAYER_PER_PAGE ? t.millionea.lensNoneOnPage : t.millionea.lensNone} />
      ) : (
        <ul role="list" className="grid grid-cols-1 gap-3 md:grid-cols-2" data-testid="millionea-tickets">
          {cards.map(({ g, row, price }) => (
            <li key={row.serial}>
              <MaswaliTicketCard
                t={t}
                locale={locale}
                serverNow={nowMs}
                href={ticketPageHref(row.serial)}
                serial={row.serial}
                week={weekNumberOf(g.week.code)}
                shown={row.shown}
                line={lineOfSlots(row.slots, g.week.state)}
                price={price}
                payout={payoutOf(row, price)}
                share={row.share}
                refundPending={row.refund?.state === "pending"}
                placedAt={row.boughtAt}
              />
            </li>
          ))}
        </ul>
      )}
      {total > PLAYER_PER_PAGE && (
        <div className="mt-4 rounded-lg border border-border bg-bg-elevated/40 overflow-hidden">
          <Pagination
            total={total}
            page={page}
            perPage={PLAYER_PER_PAGE}
            baseHref={buildBaseHref(MILLIONEA_HREF.tickets, { lens: lens === "all" ? undefined : lens })}
            ofLabel={t.common.of}
            prevLabel={t.common.previousPage}
            nextLabel={t.common.nextPage}
            firstLabel={t.common.firstPage}
            lastLabel={t.common.lastPage}
          />
        </div>
      )}
    </PageContainer>
  );
}
