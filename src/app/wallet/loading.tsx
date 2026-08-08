import { getServerT } from "@/lib/i18n-server";

export default async function WalletLoading() {
  const { t } = await getServerT();
  return (
    <main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.wallet.title}</p>
          <h1 className="font-display text-[28px] font-bold text-text leading-tight tracking-[-0.02em]">{t.common.yourFunds}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="h-10 w-24 rounded-pill bg-bg-overlay kp-shimmer-track" />
          <div className="h-10 w-24 rounded-pill bg-bg-overlay kp-shimmer-track" />
        </div>
      </header>

      {/* B-29 / V-2 — the page renders TWO wallet cards side-by-side at lg
          (main + bonus). The old single full-width ghost snapped to half-width
          and popped a second card when the real page resolved — the most
          visible "cheap" moment on the money page. Mirror the real grid. */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch" aria-hidden>
        <div
          className="rounded-xl border border-border overflow-hidden kp-shimmer-track"
          style={{ height: 160, background: "linear-gradient(135deg, oklch(23% 0.075 268), oklch(16% 0.05 268))" }}
        >
          <div className="p-5 lg:p-6 space-y-4">
            <div className="h-3 w-20 rounded bg-bg-overlay/30" />
            <div className="h-10 w-40 rounded bg-bg-overlay/20" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-16 rounded-md bg-bg-overlay/15" />
              <div className="h-16 rounded-md bg-bg-overlay/15" />
            </div>
          </div>
        </div>
        {/* Bonus wallet card (warm-toned on the real page). */}
        <div
          className="rounded-xl border border-border overflow-hidden kp-shimmer-track"
          style={{ height: 160, background: "linear-gradient(135deg, oklch(21% 0.05 80), oklch(15% 0.03 80))" }}
        >
          <div className="p-5 lg:p-6 space-y-4">
            <div className="h-3 w-24 rounded bg-bg-overlay/30" />
            <div className="h-10 w-32 rounded bg-bg-overlay/20" />
            <div className="h-16 rounded-md bg-bg-overlay/15" />
          </div>
        </div>
      </div>

      {/* Tab skeleton */}
      <nav className="flex items-center gap-1 border-b border-border" aria-hidden>
        {[t.common.activity, t.common.methods, t.common.limits].map((tab, i) => (
          <div key={tab} className={`h-9 px-3.5 ${i === 0 ? "border-b-2 border-gold-500" : ""}`}>
            <span className="font-display text-[13px] text-text-subtle">{tab}</span>
          </div>
        ))}
      </nav>

      {/* 30-day balance spark strip (46px svg + label padding on the page). */}
      <div className="rounded-xl border border-border bg-bg-elevated p-3 kp-shimmer-track" aria-hidden>
        <div className="h-2.5 w-36 rounded bg-bg-overlay mb-2" />
        <div className="h-[46px] w-full rounded bg-bg-overlay/40" />
      </div>

      {/* Transaction row skeletons */}
      <div className="rounded-xl border border-border bg-bg-elevated overflow-hidden" aria-hidden>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 px-3 border-b border-border last:border-b-0 kp-shimmer-track">
            <div className="h-[34px] w-[34px] rounded-md bg-bg-overlay" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-32 rounded bg-bg-overlay" />
              <div className="h-2.5 w-24 rounded bg-bg-overlay" />
            </div>
            <div className="text-right space-y-1.5">
              <div className="h-3.5 w-20 rounded bg-bg-overlay ml-auto" />
              <div className="h-2 w-14 rounded bg-bg-overlay ml-auto" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
