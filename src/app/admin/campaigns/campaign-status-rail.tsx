/**
 * U36 · THE SMS CAMPAIGN LIST'S STATUS RAIL — one axis, the shared filter language, at the admin density.
 *
 * ⛔ IT TYPES NO ROUTE, NO STATUS AND NO LABEL. Every pill's label, href, count and whether it is in force are built in
 * `campaigns-rail.ts` (the desk idiom the contact book follows: one file builds, one draws), so this file cannot
 * disagree with the rows the loader returned.
 * ⛔ IT IS A SERVER COMPONENT, DELIBERATELY. `FilterPill` is a `<Link>` with its own client boundary, so nothing here
 * needs one — and a client file would put this page's prop names into a public chunk.
 * ⛔ THIS IS THE CAMPAIGN SECTION'S ONE filter-rail FILE: it carries `data-filter-rail` once and is declared in
 * `test:filter-language`'s ADMIN_SURFACES in the SAME commit (§0.4 refuses an undeclared rail, §6.1 a declared file that
 * renders no control). ONE `FilterPill`, at the dense rank — the admin measure, 32px (`--h-control-xs`) — so §6.6
 * counts it 1 dense of 1. `replace` and `scroll={false}`: a filter is not a navigation.
 * ⭐ The group key names the axis, so a screen reader hears "Status" before "All".
 *
 * @see src/app/admin/campaigns/campaigns-rail.ts · scripts/filter-language.test.mts
 */
import { FilterGroupKey, FilterPill } from "@/components/ui/filter-pill";
import type { CampaignRail } from "./campaigns-rail";

export function CampaignStatusRail({ rail }: { rail: CampaignRail }) {
  return (
    <div data-filter-rail="campaign-status" role="group" aria-label={rail.label} className="flex items-center gap-1 flex-wrap gap-y-1.5 border-b border-border-subtle p-3">
      <FilterGroupKey>{rail.groupKey}</FilterGroupKey>
      {rail.options.map((o) => (
        <FilterPill
          key={o.key === "" ? "all" : o.key}
          href={o.href}
          label={o.label}
          count={o.count}
          title={o.title}
          on={o.on}
          semantics="tab"
          rank="dense"
          replace
          scroll={false}
          testId={`status:${o.key}`}
        />
      ))}
    </div>
  );
}
