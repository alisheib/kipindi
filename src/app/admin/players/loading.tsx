import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkCard, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * /admin/players loader. FIVE bands, in the page's order: the KPI band, the
 * population-mix card, the untitled search card, the untitled flush table, the
 * untitled info card.
 *
 * ⛔ NO HEADER ACTION. players/page.tsx:137 is `<AdminPageHead title="Players"
 * sw="Wachezaji" />` and nothing else — the three count-chips this loader used to
 * ghost were REPLACED by the KPI band (the page says so at :140-141, DG-A-10). Three
 * controls flashed on every load and then vanished, which is §C2's "a skeleton number
 * that looks like data is the same bug wearing a shimmer" applied to a control.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead title="Players" sw="Wachezaji" />
      <SkBody>
        {/* Headline KPIs — page:142, four tiles on the default ladder. */}
        <SkKpiRow count={4} />
        {/* Population mix — StatusMix's own titled card (page:295). */}
        <SkCard lines={2} titleW="w-[112px]" />
        {/* Search + status + submit — an UNTITLED card holding ONE wrap row of
            `--h-control-xs` (32px) controls and a caption, page:154-196. It is not a
            2-field form: `<SkFormCard fields={2} />` drew ~200px for ~99. */}
        <div className="glass-panel p-4">
          <div className="flex flex-wrap items-center gap-2">
            <SkBar className="h-[32px] flex-1 min-w-[260px] rounded-md" />
            <SkBar className="h-[32px] w-[180px] rounded-md" />
            <SkBar className="h-[32px] w-[72px] rounded-md" />
          </div>
          <SkBar className="h-[15px] w-[128px] mt-2" />
        </div>
        {/* Players table — page:198, an UNTITLED `padding="p-0"` card. Seven columns
            (three of them `SortTh`, page:206-208), `PER_PAGE` = 20 rows, its own
            `AdminPagination` at :260, and the ONE thing a row count cannot express:
            the page caps the scroll box, so the cap decides the height, not `rows`. */}
        <SkTableCard
          cols={7}
          rows={20}
          minWidth={800}
          title={false}
          sortable
          pager
          bodyMaxH="max-h-[calc(100vh-280px)]"
        />
        {/* Drill-down info card — page:263, UNTITLED. */}
        <SkCard lines={2} title={false} />
      </SkBody>
    </>
  );
}
