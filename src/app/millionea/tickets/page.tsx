/**
 * /millionea/tickets — TIKETI ZANGU, MILLIONEA (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 items 1 and 4, §10 §3.9; the v6
 * delivery's T-list frames, D-42). The reading tier, as Tiketi zangu's other two kinds.
 *
 * For a journey reader, Tiketi zangu's own head — its name and the switch, Maswali | Juu/Chini | Millionea, this kind
 * current (`ticket-switch.tsx`) — and for everybody else the page's own name under the product's. Then the four lenses
 * (`tickets-bar.tsx`) and the reader's tickets as the platform's ticket card (`MaswaliTicketCard`: the week and the state
 * word, the Seal Line as its link, the stake and the final payout, the serial and when it was bought), newest week first,
 * one column on a phone and two from 768. Row text is the ticket page's, byte for byte (§3.9).
 *
 * ⛔ THE TICKETS' GATE (`millioneaTicketGate`, L5): a kill hides the product, never a player's own tickets — a holder
 *    reaches this list at every rollout state; a signed-out reader is sent to sign in and back here.
 * ⛔ GOLD ONLY ON A PAID SHARE (§M8a item 7): the card's payout stat is struck for a won ticket whose share is the
 *    player's, and a held or forfeited share shows its word instead (MB-43, OD-07).
 * ⛔ No `.catch` on the read: a failed read is the error page, never "no tickets yet" drawn over a player's money (B-1).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { RefreshPoller } from "@/components/ui/refresh-poller";
import { MaswaliTicketCard } from "@/components/maswali/maswali-ticket";
import { eatWeekdayClock, weekNumberOf } from "@/components/maswali/maswali-format";
import { TicketsHead } from "@/components/journey/tickets/ticket-switch";
import { millioneaTicketGate } from "@/lib/server/millionea-gate";
import { millioneaMyTickets, type MillioneaTicketRow } from "@/lib/server/maswali-player";
import { millioneaWeekPrices } from "@/lib/server/millionea-doors";
import { resolveSimpleJourney } from "@/lib/server/journey-preview";
import { getServerT } from "@/lib/i18n-server";
import { fill } from "@/lib/utils";
import { MILLIONEA_HREF, MillioneaPreviewMark, signInHref, ticketPageHref } from "../millionea-parts";
import { lineOfSlots, msOf } from "../millionea-view";
import { inLens, MillioneaTicketsBar, parseMillioneaLens } from "./tickets-bar";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  await millioneaTicketGate();
  const { t } = await getServerT();
  const { journey } = await resolveSimpleJourney();
  return { title: journey ? `${t.journey.tabTickets} · ${t.millionea.productLabel}` : t.millionea.myTicketsTitle };
}

/** What a ticket was finally paid, as the card prints it (§10 §3.9): a PAID share, the price back once a refund or a
 *  cancel landed, nothing on a loss — and no figure while the result is not in, or for a held or forfeited share. */
function payoutOf(row: MillioneaTicketRow, price: number): number | null {
  switch (row.shown) {
    case "won": return row.share === "paid" ? row.paid : null;
    case "lost": return 0;
    case "refunded": return row.refund?.state === "landed" ? row.refund.amount : price;
    case "cancelled": return price;
    case "running": return null;
  }
}

export default async function MillioneaTicketsPage({ searchParams }: { searchParams: Promise<{ lens?: string }> }) {
  const gate = await millioneaTicketGate();
  if (!gate.userId) redirect(signInHref(MILLIONEA_HREF.tickets));
  const [{ t, locale }, { journey }, sp] = await Promise.all([getServerT(), resolveSimpleJourney(), searchParams]);
  const nowMs = Date.now();
  const lens = parseMillioneaLens(sp.lens);
  const weeks = await millioneaMyTickets(gate.userId);
  // Each week's frozen price — every ticket of a week cost the same (MR-11); a week whose rules cannot be read draws no card.
  const prices = await millioneaWeekPrices(weeks.map((g) => g.week.id));
  const cards = weeks.flatMap((g) => {
    const price = prices.get(g.week.id);
    return price === undefined ? [] : g.tickets.filter((row) => inLens(lens, row.shown)).map((row) => ({ g, row, price }));
  });
  const anyLive = weeks.some((g) => g.tickets.some((row) => row.shown === "running"));
  const openWeek = weeks.find((g) => g.week.state === "OPEN") ?? null;

  return (
    <PageContainer tier="reading" className="space-y-6">
      <RefreshPoller intervalMs={60_000} enabled={anyLive} />
      {journey
        ? <TicketsHead current="millionea" t={t} />
        : <PageHeader eyebrow={t.millionea.productTitle} title={t.millionea.myTicketsTitle} />}
      {gate.preview && <MillioneaPreviewMark t={t} />}
      <MillioneaTicketsBar lens={lens} t={t} />
      {cards.length === 0 ? (
        <EmptyState
          kind="positions"
          title={t.millionea.emptyTickets}
          body={openWeek && gate.visible
            ? fill(t.millionea.emptyTicketsNext, { week: weekNumberOf(openWeek.week.code), when: eatWeekdayClock(t, msOf(openWeek.week.closesAt) ?? 0) })
            : undefined}
          action={gate.visible ? (
            <Link href={MILLIONEA_HREF.hub as never} className="btn btn-ghost btn-md border-border-control">{t.millionea.productTitle}</Link>
          ) : undefined}
        />
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
                placedAt={row.boughtAt}
              />
            </li>
          ))}
        </ul>
      )}
    </PageContainer>
  );
}
