import { BrandSpinner } from "@/components/brand";

export default function AdminLoading() {
  return (
    <div className="grid place-items-center py-20">
      <div className="flex flex-col items-center gap-4">
        <BrandSpinner size={56} />
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Loading operator console · Inapakia</p>
      </div>
    </div>
  );
}
