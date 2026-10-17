import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Millionea · Integrity" sw="Uadilifu" />
      <SkBody>
        <SkCard lines={2} titleW="w-[80px]" />
        <SkCard lines={2} titleW="w-56" />
        <SkCard lines={4} titleW="w-40" />
        <SkCard lines={2} titleW="w-40" />
        <SkTableCard cols={5} rows={2} minWidth={900} headW="w-[112px]" />
        <SkTableCard cols={7} rows={4} minWidth={960} headW="w-[112px]" />
        <SkTableCard cols={7} rows={6} minWidth={960} headW="w-[112px]" />
      </SkBody>
    </>
  );
}
