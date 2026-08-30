import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard, SkChip, SkKpiRow, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * Skeleton shaped like the real page — 4 KPIs, the propose form, the filter rail, the
 * queue table, "How this works" — so the layout does not jump when the data lands.
 *
 * ⛔ Two whole bands were missing: the FILTER RAIL (page:228) and the "How this works"
 * card (page:432). The rail is `"All states"` plus one link per `STATES` entry, and
 * `STATES` (page:131) has SEVEN members — EIGHT 44px links, ~380px at 390 where the
 * ghost drew nothing at all.
 */
const STATE_LINKS = 8;

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Up & Down · AI proposals" sw="Mapendekezo ya AI" />
      <SkBody>
        <SkKpiRow count={4} />
        {/* ⚠️ The "AI generation is switched off" banner above the form is CONDITIONAL on
            the AI toolkit switch and is deliberately not ghosted: AI on is the standing
            state, and reserving space for a warning that is normally absent is the same
            defect as omitting a band that is normally present. */}
        <SkFormCard fields={3} titleW="w-40" />
        {/* Filter rail — `Chip size="lg"` inside a `min-h-[44px]` Link, the console's
            one filter idiom (identical on /admin/audit and /admin/updown/rounds). */}
        <div className="flex flex-wrap items-center gap-1.5">
          {Array.from({ length: STATE_LINKS }).map((_, i) => (
            <SkChip key={i} className="h-[44px] w-[104px]" />
          ))}
        </div>
        {/* Queue — a titled `p-0` card with EIGHT `<th>` (Asset · Round · Margin ·
            Source the platform read · What the feed returned · Checks · State · Actions),
            re-counted at HEAD. `rows={20}` because the page slices `PER_PAGE`, and
            `pager` because the queue accumulates: its own comment says "everything else
            is history, and before this the two were one undifferentiated list that only
            grew". Five ghost rows drew ~670px short of a full page. */}
        <SkTableCard cols={8} rows={20} minWidth={980} pager />
        {/* How this works — a titled card that had no ghost. */}
        <SkCard lines={6} titleW="w-40" />
      </SkBody>
    </>
  );
}
