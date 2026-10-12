/**
 * "ONYESHA ZAIDI" — THE JOURNEY'S ONE SHOW-MORE CONTROL (the Vodacom plan S7: VODACOM-PLAN §3.2's cumulative paging,
 * Open point 12; `S7-PLAN.md` WP7 step 2 item 6 and WP10 as amendment A21 item 4 amends it). The journey home and journey
 * /live draw the same control under their lists, so it has one drawing: the kit's ghost control at the large rung, the
 * board's full width, the deck's words (`journey.showMore`), the canvas's caret on the control's end (round 9's edge
 * rule), and the kit's pending mark (`LinkPending`, the owner's ask of 2026-09-26), so a tap on a slow line says it landed
 * instead of standing unchanged until the next twelve arrive.
 * ⭐ IT DECIDES NOTHING: each list hands it its next page's address, written by that page's own rule (the home's
 * `homeHref`, /live's `buildQueryHref`), and both page through the one paging rule (`pageCumulative`).
 * ⭐ THE READER KEEPS THEIR PLACE: `scroll={false}`, so the cards already read stay where they were and the next ones grow
 * under them.
 * ⛔ A SERVER COMPONENT, no directive: its one client part is the kit's pending mark, which renders nothing at rest.
 * `test:journey-home` 9.more holds it: the one control, its two importers, and no other file saying its words.
 */
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { LinkPending } from "@/components/ui/link-pending";
import type { Dict } from "@/lib/i18n-dict";

/** The control under a journey list while questions are left: a link to the list's next page, the reader's place kept. */
export function ShowMore({ href, t }: { href: string; t: Dict }) {
  return (
    <Link href={href as never} scroll={false} className="btn btn-ghost btn-lg w-full">
      {t.journey.showMore}
      <I.chevronDown s={18} edge="end" />
      <LinkPending />
    </Link>
  );
}
