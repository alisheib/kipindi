import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard, SkChip, SkPager, SkTabs } from "@/components/admin/admin-skeletons";

/**
 * 🔴 THIS LOADER WAS WRITTEN BEFORE THE TABS AND STILL DREW THE OLD PAGE (2026-09-25).
 * It ghosted the union of all three tabs at once — house accounts, the trial balance, FOUR chart
 * blocks and the provider table — so it matched no tab the page can actually resolve into. On the
 * default (`ledger`) tab it drew two charts and a six-column provider grid that never appear, and
 * drew NOTHING for the seven-column settlement-fee table that does. It also drew no rail at all,
 * so the whole page stepped down by 44px the moment the tabs arrived.
 *
 * ⭐ IT NOW MIRRORS THE DEFAULT TAB, WHICH IS THE ONLY TAB A COLD LOAD CAN RESOLVE INTO. A
 * `?tab=` load is a soft navigation from a page that is already painted; the skeleton a first
 * paint shows is the `ledger` one, so that is the shape to promise. DG-P-04: a ghost that is the
 * wrong shape moves the page twice.
 *
 * ⚠️ `SkChip` TAKES THE HEIGHT THE REAL ACTION RENDERS. The head holds a nine-chip dense rail
 * (32px, `--h-control-xs`) plus two `btn-xs` export buttons — not one 26px chip, which is
 * `SkChip`'s default and what this file used to pass. A ghost the wrong height IS the layout jump
 * it exists to prevent.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Finance"
        sw="Fedha"
        actions={
          <div className="flex items-center gap-1.5" aria-hidden>
            {/* The window rail: eight presets + Custom, at the dense 32px rung. */}
            {["w-14", "w-20", "w-[48px]", "w-[48px]", "w-[48px]", "w-[48px]", "w-[48px]", "w-[48px]", "w-16"].map((w, i) => (
              <SkChip key={i} className={`h-[32px] ${w}`} />
            ))}
            {/* Excel + PDF, also 32px since 2026-09-25. */}
            <SkChip className="h-[32px] w-16" />
            <SkChip className="h-[32px] w-14" />
          </div>
        }
      />
      <SkBody>
        {/* KPI 9-up — THREE rows of three, on the page's own `cols="3"` ladder: money moving ·
            what we earned · what we owe. These sit ABOVE the rail on every tab, so they are the
            one part of this loader that can never be wrong. */}
        <SkKpiRow count={3} cols="grid-cols-2 lg:grid-cols-3" />
        <SkKpiRow count={3} cols="grid-cols-2 lg:grid-cols-3" />
        <SkKpiRow count={3} cols="grid-cols-2 lg:grid-cols-3" />

        {/* The rail itself — Ledger · Trends · Providers. */}
        <SkTabs count={3} widths={["w-14", "w-14", "w-20"]} />

        {/* ── the `ledger` tab, in its real order ── */}
        {/* House accounts: a grid of Stat tiles. */}
        <SkCard lines={3} titleW="w-56" />
        {/* Settlement fees by poll: seven columns, then the pager. */}
        <SkTableCard cols={7} rows={6} minWidth={720} />
        <SkPager />
        {/* Ledger trial balance: a caption, then a four-up KPI band. */}
        <SkCard lines={2} titleW="w-44" />
        <SkKpiRow count={4} />
      </SkBody>
    </>
  );
}
