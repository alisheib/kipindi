import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Up & Down · Rounds" sw="Raundi za Juu na Chini" />
      <SkBody>
        <SkKpiRow count={4} />
        <SkTableCard cols={7} rows={6} minWidth={880} />
      </SkBody>
    </>
  );
}
