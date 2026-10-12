import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkChip, SkCard, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Affiliate program" sw="Mpango wa marafiki" actions={<SkChip />} />
      <SkBody>
        <SkKpiRow count={4} />
        {/* Config editor */}
        <SkFormCard fields={4} titleW="w-52" />
        {/* Compliance note */}
        <SkCard lines={2} />
        {/* The roster — "Invites by player" (2 columns) while unpaid; the 4-column leaderboard only when paid.
            Since 2026-10-12 the two-column roster fits a phone, so its ghost does too: no width floor; its rows are the
            avatar rows' measured 58.5px (a 44.5 text row was 14px short on each); and below `sm` its head is the
            two-line "FRIENDS / JOINED" head's 49.5px (page.tsx). */}
        <SkTableCard cols={2} rows={5} minWidth={0} rowMinH={58.5} headClass="max-sm:min-h-[49.5px]" />
        {/* Payout ledger */}
        <SkTableCard cols={6} rows={6} minWidth={640} />
      </SkBody>
    </>
  );
}
