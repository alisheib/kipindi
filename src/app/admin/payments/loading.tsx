import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBar, SkBody, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

/**
 * /admin/payments loader.
 *
 * The page has ELEVEN `<AdminBody>` children and this drew FIVE. Two of the six
 * missing ones — "What players are told about withdrawals" and "Selcom" — are
 * UNCONDITIONAL, i.e. they render on every load of the money console and had no
 * ghost at all. Four are data-conditional, and a loader models the MODAL production
 * state, not the maximum:
 *   · payout rails — probed live on every load, so the non-empty arm is the modal
 *     one and it IS ghosted;
 *   · frozen payouts — renders only when a payout has been stuck in PROCESSING for
 *     over 30 minutes. That is the exception, not the norm, so it is deliberately
 *     NOT ghosted: reserving space for an alarm that is normally absent is the same
 *     defect as omitting a band that is normally present.
 *
 * ⚠️ Three of the five bands that DID exist drew a card header over an UNTITLED
 * `<AdminCard>` — the reconciliation strip, the four MNO tiles and the info card.
 * With the kit's header now the real 32px title+gloss block, a header that does not
 * exist costs 48px rather than 30, so `title={false}` is load-bearing here.
 */
export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Payments operations"
        sw="Operesheni za malipo"
        /* ⛔ NOT a 40px pill. The page's action is a bare
           `<span className="font-mono text-micro uppercase eyebrow">MNO health · 24h window</span>`
           — `text-micro` is 10px on a 14px line box and `.eyebrow` sets letter-spacing only
           (globals.css:943), so it is 14px of text, not a control. The `h-7 w-44` ghost was
           40px: the largest header-action error in the console. */
        actions={<SkBar className="h-[14px] w-44" />}
      />
      <SkBody>
        {/* Operations control-plane — titled. */}
        <SkCard lines={2} titleW="w-48" />
        {/* What players are told about withdrawals — titled, and unghosted until now. */}
        <SkCard lines={3} titleW="w-64" />
        {/* Selcom statement — titled, and unghosted until now. */}
        <SkCard lines={4} titleW="w-[64px]" />
        {/* Payout rails — titled; one line per rung of PAYOUT_LADDER. */}
        <SkCard lines={4} titleW="w-[112px]" />
        {/* Reconciliation strip — an UNTITLED card holding one eyebrow + Stat row. */}
        <SkCard lines={2} title={false} />
        {/* Per-MNO health cards — UNTITLED cards in the page's own `md:grid-cols-2`. */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkCard key={i} lines={3} title={false} />
          ))}
        </div>
        {/* Retry queue — a titled `p-0` card. No `pager`: the queue is failed deposits
            and withdrawals, which is normally short, and `pagination.tsx:105` renders
            nothing below 21 rows. */}
        <SkTableCard cols={7} rows={5} minWidth={640} headW="w-40" />
        {/* Live-telemetry info — UNTITLED. */}
        <SkCard lines={2} title={false} />
      </SkBody>
    </>
  );
}
