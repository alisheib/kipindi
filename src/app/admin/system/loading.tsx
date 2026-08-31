import { AdminPageHead } from "@/components/admin/admin-shell";
/* ⚠️ `SkTableRows` dropped 2026-08-31: its only user was the rate-limiter ghost, which went with
   the diagnostics panel behind the rail. An import nothing renders is dead weight `tsc` will not
   flag here, and the next reader would take it as a hint that a table is still ghosted. */
import { SkBar, SkBody, SkKpiRow, SkCard, SkFormCard, SkTitle } from "@/components/admin/admin-skeletons";

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

        {/* ⭐ THE SECTION RAIL'S GHOST (DG-S-08, 2026-08-31) — §B7 rule 3 and §K rule 7c: the
            skeleton moves in the SAME commit as the rail, or every load drops the panels below
            it by the rail's full height. 45px = the kit `<Tabs variant="line">` item at 44px
            (§A2's preferred tap height, §K rule 7c's rung) plus the rail's own 1px bottom
            border — the same literal `roles/loading.tsx` and `players/[id]/loading.tsx` carry.
            ⚠️ A LITERAL, not `h-11`: `theme.extend.spacing` is overridden, so a scale class here
            is roughly double what it reads as. */}
        <div className="glass-panel p-0">
          <div className="h-[45px] border-b border-border" />
        </div>

        {/* ⚠️ ONLY THE `platform` TAB'S CARDS ARE GHOSTED, and that is deliberate rather than an
            omission: the rail defaults to `platform`, so that is what a cold load paints. A
            skeleton for the diagnostics panel would draw boxes the first render never fills. */}
        {/* Broadcast banner */}
        <SkFormCard fields={1} titleW="w-40" />

        {/* Platform timezone */}
        <SkFormCard fields={1} titleW="w-40" />

        {/* Support contacts — MOVED into the platform tab with the page (2026-08-31). */}
        <SkCard lines={3} titleW="w-40" />

        {/* ⛔ THE DIAGNOSTICS GHOSTS ARE DELETED, NOT MOVED — audit-chain integrity, the
            Persistence + Bootstrap-admins pair, the rate-limiter table and the operational-notes
            card. They ghosted a panel the landing tab no longer renders, so keeping them would
            paint ~1,100px of boxes that the first render never fills and then collapse: the
            same jump §B7 rule 3 exists to prevent, only in the other direction.
            ⚠️ If the rail's DEFAULT tab ever changes from `platform`, this file is wrong and
            silently so — a skeleton cannot fail a gate. That coupling is the cost of ghosting a
            tabbed page at all, and it is written down here rather than left to be discovered. */}
      </SkBody>
    </>
  );
}
