/** The question's two picks. Real anchors work before hydration; the sheet's host captures only their versioned seed. */
import Link from "next/link";
import { sideWord } from "@/lib/side-label";
import type { SheetSeed } from "@/lib/server/journey-sheet";
import type { Dict } from "@/lib/i18n-dict";

export function JourneyBetButtons({ seed, title, t, headingId, className = "" }: { seed: SheetSeed; title: string; t: Dict; headingId: string; className?: string }) {
  if (!seed.bettable) return null;
  return <div className={`kp-jbet grid grid-cols-2 gap-3 ${className}`} data-sheet={JSON.stringify(seed)} data-sheet-title={title} data-sheet-origin="market" data-testid="journey-bet-buttons" aria-labelledby={headingId}>
    {(["YES", "NO"] as const).map((side) => <Link key={side} href={`/markets/${seed.id}?side=${side}` as never} prefetch={false}
      data-bet-side={side} data-bet-origin="market" className={`${side === "YES" ? "btn-yes" : "btn-no"} min-h-[64px] flex items-center justify-center press-pop`}>
      {sideWord(t, side, "MARKET")}
    </Link>)}
  </div>;
}
