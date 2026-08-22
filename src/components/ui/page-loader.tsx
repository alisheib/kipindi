/**
 * PageLoader — the one shared route-loading skeleton, so every player page shows
 * a consistent, professional loader (BrandSpinner + locale-aware label + shimmer
 * rows) instead of an empty container. Width matches the page's tier so the real
 * content swaps in with no layout jump. Used by each route's loading.tsx.
 *
 * Reads kp-locale from cookies server-side so even skeletons render in the
 * user's selected language.
 *
 * ⛔ TWO THINGS CHANGED HERE ON 2026-08-22, AND BOTH WERE INVISIBLE TO EVERY
 * STATIC GUARD THIS REPO HAS.                             DESIGN_AUTHORITY B7
 *
 *   1. It rendered a `<main>`. `AppShell` already renders `<main id="main-content">`
 *      in the root layout, so all 16 loading.tsx files consuming this were showing
 *      a NESTED main for the whole of their load. `test:measure` greps `src/app`
 *      and this file is not in `src/app`, so no source guard could see it — which
 *      is the argument for the behavioural check in `scripts/responsive-audit.mjs`.
 *   2. It took `width={1080}` — a NUMBER. `PageContainer`'s own header says there
 *      is deliberately no `width={1240}` escape hatch because "a number here is how
 *      the drift started", and this component was that escape hatch, one import
 *      away. Worse, the ratchet in `test:measure` matches `max-w-[Npx]` CLASSES, so
 *      an inline `style={{ maxWidth: 1080 }}` was a hand-typed page width that the
 *      hand-typed-page-width guard could not count.
 *
 * It now states its measure the way every other page does: `<PageContainer tier>`.
 * The three widths in use (1080 / 640 / 1280) were already exactly `reading` /
 * `form` / `board`, so the migration was a zero-pixel change.
 */
import { cookies } from "next/headers";
import { BrandSpinner } from "@/components/brand";
import { PageContainer, type MeasureTier } from "@/components/layout/page-container";
import { dict, type Locale } from "@/lib/i18n-dict";

export async function PageLoader({
  tier = "reading",
  rows = 5,
  rowHeight = 64,
}: {
  /** ⛔ A TIER, never a number — B7 rule 2, and it must match the page's own. */
  tier?: MeasureTier;
  rows?: number;
  rowHeight?: number;
}) {
  const jar = await cookies();
  const raw = jar.get("kp-locale")?.value;
  const locale: Locale = raw === "sw" || raw === "zh" ? raw : "en";
  const t = dict[locale];
  return (
    <PageContainer tier={tier} className="content-fade-in">
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
    </PageContainer>
  );
}
