import { BrandSpinner } from "@/components/brand";

export default function LiveLoading() {
  return (
    <main className="mx-auto max-w-[1480px] px-3 lg:px-6 py-6 space-y-5">
      {/* Slim header — matches the live page so the questions-first layout
          doesn't jump when the real content swaps in. */}
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[12px] uppercase tracking-[0.18em] font-bold text-text">Live · Hai</p>
        <p className="font-mono text-[10.5px] text-text-subtle">Loading · Inapakia</p>
      </div>

      <div className="market-grid" aria-hidden>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-bg-elevated p-4 kp-shimmer-track"
            style={{ height: 180 }}
          />
        ))}
      </div>

      <div className="grid place-items-center pt-4">
        <BrandSpinner size={48} />
      </div>
    </main>
  );
}
