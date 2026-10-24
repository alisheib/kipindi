import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkKpiRow, SkCard, SkFormCard, SkTableCard, SkChip } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Market config"
        sw="Mipangilio ya soko"
        /* ⛔ NOT 40px. The action is `<Chip size="md" variant="resolved">` and `resolved`
           IS in chip.tsx's `isStatus` set, so it takes `sizeStyles.md.status` — height 23.
           The `h-7` ghost drew 40, the third-largest header-action error in the console. */
        actions={<SkChip className="h-[23px] w-44" />}
      />
      <SkBody>
        {/* Snapshot KPIs. ⛔ SEVEN tiles, not six — config/page.tsx's `<KpiGrid cols="3">`
            has seven `<AdminKpi>` children (commission, fee ceiling, and five more). At the
            `3` ladder's 2-up that is four tile rows against the ghost's three, and at `lg`
            3-up three against two: a 126px jump (110px tile + the band's 16px `gap-3`) at
            EVERY width. The ladder itself was right — `KPI_COLS["3"]` is exactly this. */}
        <SkKpiRow count={7} cols="grid-cols-2 lg:grid-cols-3" />
        {/* "Capped-fee pari-mutuel" — an UNTITLED info card.
            ⚠️ The loser-share warning card above it is CONDITIONAL on `config.feeModel`
            and is deliberately not ghosted: the capped-fee model is the standing one. */}
        <SkCard lines={5} title={false} />
        {/* Fee simulator — titled. The law simulated and the example books (FEE-TAX-2026-10, R2c), then the
            four inputs on the page's own `grid-cols-2 lg:grid-cols-4` ladder, then the result strips of the
            same shape below them. */}
        <SkFormCard
          fields={5}
          titleW="w-[128px]"
          cols="grid-cols-2 lg:grid-cols-4"
          afterFields={
            <div className="space-y-3">
              <SkBar className="h-[76px] w-full rounded-md" />
              <SkBar className="h-[76px] w-full rounded-md" />
            </div>
          }
        />
        {/* Fees & taxes — titled (FEE-TAX-2026-10, R2c). ⛔ TWENTY-ONE fields on `md:grid-cols-2` under
            the default model: the polls panel's eleven (the model and its total, Platform, Operator, the
            estimate and its switch, the capped pair, the winning tax, TRA and GBT) and the ten other platform
            rates — then the model's description and Up & Down's panel (its profile, its chains, its three
            fields and the reason). Fields are the kit `Input` at its default size, i.e. `--h-input` 44 — NOT
            the `sm` rung. */}
        <SkFormCard
          fields={21}
          titleW="w-40"
          cols="md:grid-cols-2"
          afterFields={
            <div className="space-y-3">
              <SkBar className="h-[72px] w-full rounded-md" />
              <SkBar className="h-[360px] w-full rounded-lg" />
            </div>
          }
        />
        {/* Per-market overrides — titled; cells are `p-3`. */}
        <SkTableCard cols={5} rows={4} cellPy={16} />
        {/* Recent changes — a titled `p-0` card; cells are `p-3`. */}
        <SkTableCard cols={4} rows={6} cellPy={16} />
        {/* Live-polls warning — UNTITLED. */}
        <SkCard lines={2} title={false} />
      </SkBody>
    </>
  );
}
