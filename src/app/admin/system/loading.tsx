import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkKpiRow, SkCard, SkFormCard, SkTableRows, SkTitle } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="System" sw="Mfumo" />
      <SkBody>
        {/* Health KPIs */}
        <SkKpiRow count={4} />

        {/* Maintenance mode */}
        <SkFormCard fields={2} titleW="w-36" />

        {/* Bet queue — a titled card holding an INNER KPI band (SkCard takes no children,
            so the equivalent card is composed by hand).
            ⛔ The inner band's ladder is the PAGE's, `grid-cols-2 sm:grid-cols-4 gap-2`
            (system/page.tsx:100) — a hand-rolled AdminKpi grid, the one left in the console.
            The kit default `grid-cols-2 lg:grid-cols-4` steps at `lg`, so from 640 to 1023
            the page was one 110px tile row while this ghost drew two: a 126px shift across
            the whole tablet range, plus 4px of gap difference at every width. */}
        <div className="glass-panel p-4 space-y-3">
          <SkTitle titleW="w-[112px]" />
          <SkKpiRow count={4} cols="grid-cols-2 sm:grid-cols-4" gap="gap-2" />
          <SkBar className="h-3 w-full" />
          <SkBar className="h-3 w-2/3" />
        </div>

        {/* Settlement — a titled card holding a real `<KpiGrid>` (system/page.tsx:217),
            which IS the default ladder, so this one keeps it. */}
        <div className="glass-panel p-4 space-y-3">
          <SkTitle titleW="w-[112px]" />
          <SkKpiRow count={4} />
          <SkBar className="h-3 w-full" />
          <SkBar className="h-3 w-2/3" />
        </div>

        {/* Broadcast banner */}
        <SkFormCard fields={1} titleW="w-40" />

        {/* Platform timezone */}
        <SkFormCard fields={1} titleW="w-40" />

        {/* Audit chain integrity — ⚠️ ONE card in this `md:grid-cols-2` row, not two
            (system/page.tsx:286-297). A second ghost filled a grid area the page leaves
            empty, so at ≥768 the ghost showed two panels where the page shows one. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SkCard lines={3} />
        </div>

        {/* Persistence + Bootstrap admins */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <SkCard lines={3} />
          <SkCard lines={3} />
        </div>

        {/* Rate limiter · live buckets — a TITLED PADDED card whose table is
            `min-w-[480px]` with cells at `py-2` (12px), the `.admin-tbl` rhythm.
            ⛔ Not `SkTableCard`: that draws a flush `p-0` panel, and this card is `p-4`. */}
        <div className="glass-panel p-4">
          <SkTitle titleW="w-52" className="mb-3" />
          <SkTableRows cols={4} rows={5} minWidth={480} />
        </div>

        {/* Support contacts — titled. Had no ghost. */}
        <SkCard lines={3} titleW="w-40" />

        {/* Operational-notes info card — UNTITLED. Had no ghost. */}
        <SkCard lines={4} title={false} />
      </SkBody>
    </>
  );
}
