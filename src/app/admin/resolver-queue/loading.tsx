import { AdminPageHead } from "@/components/admin/admin-shell";
import { SkBody, SkChip, SkBar, SkFormCard, SkCard } from "@/components/admin/admin-skeletons";

export default function Loading() {
  return (
    <>
      <AdminPageHead
        title="Resolver queue"
        sw="Foleni ya utatuzi"
        period={false}
        actions={
          <>
            <SkChip className="h-7 w-28" />
            <SkBar className="h-3 w-40" />
          </>
        }
      />
      <SkBody>
        {/* Filter bar */}
        <SkFormCard fields={3} titleW="w-24" />
        {/* Market cards */}
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkCard key={i} lines={5} />
          ))}
        </div>
      </SkBody>
    </>
  );
}
