import { BrandSpinner } from "@/components/brand";

export default function PositionsLoading() {
  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Positions · Madau</p>
        <h1 className="font-display text-[28px] font-bold text-text">Your predictions</h1>
      </header>
      <div className="grid place-items-center py-20 rounded-lg border border-border bg-bg-elevated/40">
        <div className="flex flex-col items-center gap-4">
          <BrandSpinner size={56} />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">Loading your positions</p>
        </div>
      </div>
    </main>
  );
}
