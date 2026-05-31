import { BrandSpinner } from "@/components/brand";

export default function LiveLoading() {
  return (
    <main className="mx-auto max-w-[1240px] px-3 lg:px-6 py-6 space-y-5">
      <header className="space-y-2">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">
          Live · Hai
        </p>
        <h1 className="font-display text-[28px] font-bold text-text">
          Markets moving right now
        </h1>
      </header>

      <div className="rounded-lg border border-border bg-bg-elevated/40 p-12 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <BrandSpinner size={48} />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            Loading live · Inapakia
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-bg-elevated p-4 kp-shimmer-track"
            style={{ height: 180 }}
          />
        ))}
      </div>
    </main>
  );
}
