/**
 * PageLoader — the one shared route-loading skeleton, so every player page shows
 * a consistent, professional loader (BrandSpinner + bilingual label + shimmer
 * rows) instead of an empty container. Width matches the page's tier so the real
 * content swaps in with no layout jump. Used by each route's loading.tsx.
 */
import { BrandSpinner } from "@/components/brand";

export function PageLoader({
  width = 1080,
  label = "Loading",
  labelSw = "Inapakia",
  rows = 5,
  rowHeight = 64,
}: {
  width?: number;
  label?: string;
  labelSw?: string;
  rows?: number;
  rowHeight?: number;
}) {
  return (
    <main className="mx-auto px-3 lg:px-6 py-6" style={{ maxWidth: width }}>
      <div className="rounded-xl border border-border bg-bg-elevated p-10 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <BrandSpinner size={48} />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            {label} · {labelSw}
          </p>
        </div>
      </div>
      <div className="mt-4 space-y-3" aria-hidden>
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="rounded-lg border border-border bg-bg-elevated kp-shimmer-track"
            style={{ height: rowHeight }}
          />
        ))}
      </div>
    </main>
  );
}
