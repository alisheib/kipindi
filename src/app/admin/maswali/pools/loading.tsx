import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkKpiRow, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Millionea · Pools" sw="Mifuko" />
      <SkBody>
        <SkKpiRow count={4} />
        <SkTableCard cols={7} rows={3} minWidth={1000} headW="w-[112px]" />
        <SkTableCard cols={10} rows={4} minWidth={980} headW="w-[112px]" />
        <SkCard lines={6} titleW="w-24" />
      </SkBody>
    </>
  );
}
