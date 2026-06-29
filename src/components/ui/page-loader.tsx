/**
 * PageLoader — the one shared route-loading skeleton, so every player page shows
 * a consistent, professional loader (BrandSpinner + locale-aware label + shimmer
 * rows) instead of an empty container. Width matches the page's tier so the real
 * content swaps in with no layout jump. Used by each route's loading.tsx.
 *
 * Reads kp-locale from cookies server-side so even skeletons render in the
 * user's selected language.
 */
import { cookies } from "next/headers";
import { BrandSpinner } from "@/components/brand";
import { dict, type Locale } from "@/lib/i18n-dict";

export async function PageLoader({
  width = 1080,
  rows = 5,
  rowHeight = 64,
}: {
  width?: number;
  rows?: number;
  rowHeight?: number;
}) {
  const jar = await cookies();
  const raw = jar.get("kp-locale")?.value;
  const locale: Locale = raw === "sw" || raw === "zh" ? raw : "en";
  const t = dict[locale];
  return (
    <main className="mx-auto px-3 lg:px-6 py-6" style={{ maxWidth: width }}>
      <div className="rounded-xl border border-border bg-bg-elevated p-10 grid place-items-center">
        <div className="flex flex-col items-center gap-3">
          <BrandSpinner size={48} />
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-text-muted">
            {t.common.loading}
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
