"use client";

import { usePathname } from "next/navigation";
import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { GhostBar, GhostCard } from "@/components/maswali/maswali-ghost";
import { freeCancelKnownOpen, ticketSerialOf } from "@/components/maswali/maswali-ghost-hint";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Locale } from "@/lib/i18n-dict";

/** The clauses a phone's first screen holds. */
const CLAUSES = [0, 1, 2, 3];

/**
 * /millionea/tickets/[serial] loading skeleton — the ticket's own bands (`maswali-ticket.tsx`) in the receipt tier, at the
 * page's own heights (§B7 rule 3; the R1 tickets critic's M9): the back link's box, then the document — the state chip and
 * the week, the serial, the Seal Line's rule-bounded box at its real 108px (the mains and their numbers, the annex and its
 * labels: it drew 70px, and every clause under it dropped ~40px when the ticket landed), the week's live line, the clauses.
 * ⚠️ It draws the ticket a player opens most — one running in its week. A settled ticket's receipt above it is not drawn:
 * this drawing asks nothing, so it cannot know it, and a guessed band would move the page for every other ticket.
 * ⭐ THE FREE CANCEL'S BAND IS DRAWN WHEN THE DOOR KNEW IT (M9: inside the ten minutes the clauses landed a band lower):
 *    the door the ticket was opened from notes its window (`maswali-ghost-hint.tsx` — the hub's held row, the list's card,
 *    the stamp after a cut), and this drawing reads it by its own address: the clock line, the two-line button and the
 *    rule under it, at their own heights, exactly when the page will draw them.
 * ONE DRAWING, TWO READERS: this route's `loading.tsx` and the journey's root loading state. Wordless but for the screen
 * reader's "loading".
 */
/**
 * The bands that hold words, at the heights the landed page measured (`qa:maswali-ticket-ghosts`, 2026-10-21; text-body-sm
 * lines are 18px): the week's live line wraps by language and width — the Swahili facts are the longest — so its bar is
 * drawn per language, never its words. A running ticket with results in (the drawing's default): Swahili three lines on a
 * phone and two from `sm`; English and Chinese three at 320, two from 360, one from `sm`. Inside an open week's free cancel:
 * its two facts, two lines on a phone (Chinese one from 360), one from `sm`; the rule under the button two lines on a phone
 * in Swahili and English, one in Chinese and from `sm`.
 */
const LIVE: Record<"graded" | "open", Record<Locale, string>> = {
  graded: { sw: "h-[54px] sm:h-[36px]", en: "h-[54px] xs:h-[36px] sm:h-[18px]", zh: "h-[54px] xs:h-[36px] sm:h-[18px]" },
  open: { sw: "h-[36px] sm:h-[18px]", en: "h-[36px] sm:h-[18px]", zh: "h-[36px] xs:h-[18px]" },
};
const RULE: Record<Locale, string> = { sw: "h-[36px] sm:h-[18px]", en: "h-[36px] sm:h-[18px]", zh: "h-[18px]" };

export function MillioneaTicketGhost() {
  const { t, locale } = useT();
  const cancelOpen = freeCancelKnownOpen(ticketSerialOf(usePathname()), Date.now());
  return (
    <PageContainer tier="receipt" className="space-y-5">
      <BackLinkGhost />
      <GhostCard className="flex flex-col gap-3 px-3 pb-3 pt-4">
        <div className="flex flex-col gap-1.5">
          {/* The ticket's chip, then the week and its chip: two rows on a phone, one from `sm` (the page's head). */}
          <div className="flex flex-col items-start gap-1.5 sm:flex-row sm:items-center sm:justify-between">
            <GhostBar className="h-[23px] w-[112px] rounded-pill" />
            <span className="inline-flex items-center gap-2">
              <GhostBar className="h-3 w-[56px]" />
              <GhostBar className="h-[23px] w-[136px] rounded-pill" />
            </span>
          </div>
          <GhostBar className="h-[28px] w-[230px] max-w-full" />
        </div>
        {/* The Seal Line's box: 24px mains, their numbers, the annex and its labels, between its two rules — 108px in an
            open week, 122px once results are in (a sealed reserve's stamp stands taller than a waiting ring); 2px less at 320. */}
        <div className="flex flex-col border-y border-border py-2">
          <GhostBar className="h-[24px] w-full" />
          <GhostBar className="mt-0.5 h-[14px] w-full" />
          <GhostBar className={cn("mt-1.5 w-full", cancelOpen ? "h-[16px] xs:h-[18px]" : "h-[30px] xs:h-[32px]")} />
          <GhostBar className="mt-0.5 h-[14px] w-full" />
        </div>
        <GhostBar className={cn("w-[85%]", LIVE[cancelOpen ? "open" : "graded"][locale])} />
        {cancelOpen && (
          // The free cancel's door (`MaswaliCancelButton`): its clock line, the button holding its two lines, the rule.
          <div className="flex flex-col gap-1.5" data-ghost-band="free-cancel">
            <GhostBar className="h-[18px] w-[80%]" />
            <GhostBar className="h-[53px] w-full rounded-control" />
            <GhostBar className={cn("w-[70%] self-center", RULE[locale])} />
          </div>
        )}
        {CLAUSES.map((i) => (
          <div key={i} className="grid grid-cols-[28px_1fr] gap-x-2 gap-y-1 border-t border-border py-2">
            <GhostBar className="h-4 w-4" />
            <div className="flex flex-col gap-1">
              <GhostBar className="h-3 w-[96px]" />
              <GhostBar className="h-4 w-full" />
              <GhostBar className="h-4 w-[60%]" />
            </div>
          </div>
        ))}
      </GhostCard>
      <span className="sr-only">{t.common.loading}</span>
    </PageContainer>
  );
}
