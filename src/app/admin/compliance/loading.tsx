import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkChip, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * /admin/compliance loader — SEVEN bands, one per `<AdminBody>` child of
 * compliance/page.tsx: the integrity row, the KYC/AML pair, the four RG tiles, the
 * match-integrity/exports pair, the "Inspector mode" info card, `PlayerSafetyPanel`
 * and the confidential footnote.
 * ⛔ The old loader drew FOUR, and its first band stepped at `md` where the page
 * steps at `lg`: between 768 and 1023 the ghost was 2-up while the page was 1-up,
 * and at ≥1024 the page took two card rows to the ghost's one. A skeleton must
 * mirror the page's RESPONSIVE stack, not a plausible one (DESIGN_AUTHORITY §S1,
 * dated ruling of 2026-08-29 / DG-P-04).
 * ⚠️ Bands are named, not line-numbered: this page moved 18 lines under this file
 * during the same session that wrote it (DG-A-22), which is how 30 of these 47
 * loaders came to be a month stale in the first place.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Compliance"
        sw="Kanuni"
        /* `h-7` is 40px on the overridden scale, and the page's action really is a
           40px `h-7` bordered link (compliance/page.tsx's header Link) — correct as written. */
        actions={<SkChip className="h-7 w-40" />}
      />
      <SkBody>
        {/* §A — Audit chain · Backup status · Error monitoring.
            ⚠️ DG-A-22 (2026-08-30) moved the PAGE's §A band from `lg:grid-cols-2` to
            `lg:grid-cols-3` — three equal-weight cards in two columns left a 572px grid area
            with no item in it at 1440. This band follows it: three ghosts in three columns,
            one row, the same shape the page paints. */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <SkCard lines={4} />
          <SkCard lines={4} />
          <SkCard lines={4} />
        </div>
        {/* §B — KYC conversion funnel + AML queue · 7-day. */}
        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3">
          <SkCard lines={5} />
          <SkCard lines={5} />
        </div>
        {/* §C — the four responsible-gambling tiles: self-exclusion, cooling-off, limit-increase deferrals, reality-check engagement. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SkCard lines={2} />
          <SkCard lines={2} />
          <SkCard lines={2} />
          <SkCard lines={2} />
        </div>
        {/* §D — Match-integrity alerts + Regulator report exports.
            ⛔ NOT one full-width flush table card: both are PADDED `AdminCard`s in a
            2-up grid, so the old ghost drew the wrong container in the wrong column
            count and lost the 20px gutters on each side. */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkCard lines={4} />
          <SkCard lines={4} />
        </div>
        {/* §E — "Inspector mode", an UNTITLED info card. */}
        <SkCard lines={3} title={false} />
        {/* §F — PlayerSafetyPanel: a titled `p-0` card whose body opens with a 51px chip
            strip (`px-4 py-3 border-b` around five 18px `Chip size="sm"`), then a
            five-column table whose User, Marker, Severity and Detected headers are
            `SortTh` — 44px cells, not 35.
            ⚠️ NO `pager`: the harm-marker set is RECOMPUTED per load, not appended to,
            so it is not one of the five surfaces whose row source is unbounded, and
            `pagination.tsx:105` renders nothing under 21 rows. */}
        <SkTableCard
          cols={5}
          rows={8}
          minWidth={720}
          headW="w-52"
          sortable
          beforeBody={
            <div className="px-4 py-3 border-b border-border-subtle flex flex-wrap gap-1.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkChip key={i} className="h-[18px] w-[104px]" />
              ))}
            </div>
          }
        />
        {/* §G — the confidential footnote: a bare `<p className="text-caption ... pt-3">`,
            NOT a card — 16 + 15 = 31px. */}
        <SkBar className="h-[15px] w-[320px] mx-auto mt-3" />
      </SkBody>
    </>
  );
}
