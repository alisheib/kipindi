import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Week" sw="Wiki" />
      <SkBody>
        <SkKpiRow count={4} />
        <SkCard lines={4} titleW="w-40" />
        <SkTableCard cols={6} rows={15} minWidth={1040} headW="w-[112px]" />
      </SkBody>
    </>
  );
}
