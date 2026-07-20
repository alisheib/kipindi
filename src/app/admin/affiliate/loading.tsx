import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkChip, SkCard, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Affiliate program" sw="Mpango wa marafiki" period={false} actions={<SkChip />} />
      <SkBody>
        <SkKpiRow count={4} />
        {/* Config editor */}
        <SkFormCard fields={4} titleW="w-52" />
        {/* Compliance note */}
        <SkCard lines={2} />
        {/* Referral leaderboard */}
        <SkTableCard cols={4} rows={5} minWidth={480} />
        {/* Payout ledger */}
        <SkTableCard cols={6} rows={6} minWidth={640} />
      </SkBody>
    </>
  );
}
