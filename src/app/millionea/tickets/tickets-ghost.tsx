"use client";

import type { ReactNode } from "react";
import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostBar, GhostLine } from "@/components/maswali/maswali-ghost";
import { PageHeader } from "@/components/ui/page-header";
import { QUERY_BAR_CLASS, QUERY_BAR_ROW1_ALONE_CLASS, QUERY_STRIP_CLASS } from "@/components/ui/query-bar";
import { RoutePick } from "@/components/ui/route-pick";
import { useT } from "@/lib/i18n";
import { MILLIONEA_HREF } from "../millionea-parts";
import { MillioneaTicketGhost } from "./[serial]/ticket-ghost";

/** The four lenses, at widths near their labels'. */
const LENS_WIDTHS = ["w-[64px]", "w-[112px]", "w-[120px]", "w-[104px]"];

/** Tiketi zangu's own address; a ticket's is one segment under it (the journey's root loading state's whole-path pattern).
 *  Addresses are code here, never a string beside a drawing (`test:maswali-ui` 1.3 holds every drawing file wordless). */
const LIST = MILLIONEA_HREF.tickets;
const TICKET = `^${LIST}/[^/]+$`;

/**
 * TIKETI ZANGU'S SEGMENT LOADING STATE: THE DRAWING OF THE PAGE BEING OPENED (the lead's round-2 item, 2026-10-22; REGISTER
 * measured the shape on the register). A segment's loading state wraps its child segments too, so on a client hop from the
 * list to a ticket this segment's drawing painted — the LIST's bands — for as long as the ticket took, and every band moved
 * when it landed. The pick is the browser's, as the journey's root loading state's (`route-ghost.tsx`) and the hub's
 * (`MillioneaGhostPick`) are: during a move `usePathname()` already names the destination, so the list is drawn by its
 * drawing and a ticket by its own (`[serial]/ticket-ghost.tsx`); anything else below the segment by the list's. Held here,
 * in the client's code, the addresses never ride the loading element's payload (`test:visual-pass-r5h` 1.2), and the
 * loading file asks the server nothing (1.3).
 */
export function MillioneaTicketsGhostPick() {
  const list = <MillioneaTicketsGhost />;
  const ticket = <MillioneaTicketGhost />;
  return <RoutePick routes={{ [LIST]: list }} patterns={[[TICKET, ticket]]} other={list} />;
}

/**
 * /millionea/tickets loading skeleton — the list's own bands (`page.tsx`), at the page's own heights, so nothing moves when
 * the list lands (§B7 rule 3; the R1 tickets critic's M9): the head, the four lenses as ONE ROW on the kit's strip (the
 * page's bar is the kit's `QueryStrip` since M2, one row at every width), and the ticket cards in the list's grid (one
 * column, two from 768), each the card's own shell and bands (`MaswaliTicketCard`: the chips, the Seal Line's two rows and
 * its door, the price and payout pair, the serial and the purchase line).
 * ONE DRAWING, TWO READERS: this route's `loading.tsx` draws it for a classic reader with the page's own head — the way
 * back to the hub over the title (L9) — and the journey's root loading state draws it with Tiketi zangu's head
 * (`journeyHead`, handed in, so this module loads nothing of the journey's — `history-ghost.tsx`'s pattern). Wordless but
 * for the screen reader's "loading" (`maswali-ghost.tsx` says why).
 */
export function MillioneaTicketsGhost({ journeyHead }: { journeyHead?: ReactNode }) {
  const { t } = useT();
  return (
    <PageContainer tier="reading">
      {/* The page this drawing stands for, for the hop drive (`qa:millionea-ghost-hops` names a bar by its nearest marked
          ancestor): one box-less wrapper (`contents`) around the whole drawing, carrying the drawing's rhythm — the
          container spaces only its own children — so not a band moves. */}
      <div className="contents space-y-6" data-ghost-page="tickets">
        {journeyHead ?? (
          <div className="space-y-3" aria-hidden>
            <BackLinkGhost />
            <PageHeader title={<GhostLine className="w-[160px]" />} />
          </div>
        )}
        <div className={QUERY_BAR_CLASS} aria-hidden>
          <div className={QUERY_BAR_ROW1_ALONE_CLASS}>
            <div className={QUERY_STRIP_CLASS}>
              {LENS_WIDTHS.map((w, i) => <div key={i} className={`h-[44px] ${w} shrink-0 rounded-pill bg-bg-overlay`} />)}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex min-w-0 flex-col rounded-xl border border-border bg-bg-elevated p-4 kp-shimmer-track">
              <div className="flex items-center justify-between gap-2">
                <GhostBar className="h-[18px] w-[64px] rounded-pill" />
                <GhostBar className="h-[18px] w-[96px] rounded-pill" />
              </div>
              <div className="mt-3 flex flex-col gap-1">
                <div className="flex flex-col gap-1.5">
                  <GhostBar className="h-[18px] w-[220px] max-w-full" />
                  <GhostBar className="h-[14px] w-[86px]" />
                </div>
                <GhostBar className="h-[20px] w-[96px]" />
              </div>
              <div className="mt-3 grid grid-cols-[minmax(max-content,2fr)_minmax(0,3fr)] gap-3">
                {/* The price and the payout: a micro label over an xs figure (the Stat's own rung) — 26px, measured. */}
                <GhostBar className="h-[26px] w-[96px]" />
                <GhostBar className="h-[26px] w-full" />
              </div>
              <div className="mt-3 flex flex-col gap-1">
                <GhostBar className="h-[20px] w-[172px] max-w-full" />
                <GhostBar className="h-[20px] w-[150px] max-w-full" />
              </div>
            </div>
          ))}
        </div>
        <span className="sr-only">{t.common.loading}</span>
      </div>
    </PageContainer>
  );
}
