import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkFormCard, SkTableCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Players"
        sw="Wachezaji"
        period={false}
        actions={
          <div className="flex gap-1.5">
            <SkChip className="h-6 w-16" />
            <SkChip className="h-6 w-16" />
            <SkChip className="h-6 w-16" />
          </div>
        }
      />
      <SkBody>
        <SkFormCard fields={2} titleW="w-24" />
        <SkTableCard cols={7} rows={12} minWidth={800} />
      </SkBody>
    </>
  );
}
