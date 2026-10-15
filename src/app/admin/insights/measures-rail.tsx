/** Campaign filter for the S13 panel. The server builds every href and label. */
import { FilterGroupKey, FilterPill } from "@/components/ui/filter-pill";

export function MeasuresRail({ campaigns, selected }: { campaigns: readonly string[]; selected: string | null }) {
  if (campaigns.length === 0) return null;
  return <div data-filter-rail="journey-measures-campaign" role="group" aria-label="Campaign" className="mt-3 flex flex-wrap items-center gap-1 border-b border-border-subtle pb-2">
    <FilterGroupKey>Campaign</FilterGroupKey>
    <FilterPill href="/admin/insights" label="All" on={!selected} semantics="tab" rank="dense" replace scroll={false} testId="jfc:all" />
    {campaigns.map((campaign) => <FilterPill key={campaign} href={`/admin/insights?jfc=${encodeURIComponent(campaign)}`} label={campaign} on={selected === campaign} semantics="tab" rank="dense" replace scroll={false} testId={`jfc:${campaign}`} />)}
  </div>;
}
