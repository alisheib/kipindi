import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead title="Millionea · Evidence" sw="Ushahidi" />
      <SkBody>
        {/* What a pack holds — one titled card of prose. */}
        <SkCard lines={3} titleW="w-[200px]" />
        {/* The weeks — a titled flush card, six columns at min-w-[1080px]. */}
        <SkTableCard cols={6} rows={6} minWidth={1080} headW="w-[64px]" />
      </SkBody>
    </>
  );
}
