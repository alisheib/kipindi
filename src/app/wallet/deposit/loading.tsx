import { BrandSpinner } from "@/components/markets/brand-spinner";

export default function DepositLoading() {
  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">Deposit · Amana</p>
        <h1 className="font-display text-[28px] font-bold text-text">Loading</h1>
      </header>
      <div className="grid place-items-center py-20 rounded-lg border border-border bg-bg-elevated/40">
        <BrandSpinner size={56} />
      </div>
    </main>
  );
}
