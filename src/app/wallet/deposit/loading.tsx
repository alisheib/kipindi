import { getServerT } from "@/lib/i18n-server";

/**
 * B-29 / V-2 — the skeleton mirrors the FORM the page actually renders
 * (amount field → provider grid → phone field → gold confirm), instead of the
 * old centered spinner panel that repainted into a completely different shape.
 */
export default async function DepositLoading() {
  const { t } = await getServerT();
  return (
    <main className="mx-auto max-w-[640px] px-3 lg:px-6 py-6">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.common.deposit}</p>
        <h1 className="font-display text-[28px] font-bold text-text">{t.common.loading}</h1>
      </header>

      <div className="space-y-5" aria-hidden>
        {/* Amount field */}
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-bg-overlay kp-shimmer-track" />
          <div className="h-11 w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
          <div className="h-2.5 w-48 rounded bg-bg-overlay/60 kp-shimmer-track" />
        </div>

        {/* Provider tile grid (2 cols mobile / 3 cols sm — the real radio grid) */}
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-bg-overlay kp-shimmer-track" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-[86px] rounded-md border border-border kp-shimmer-track" style={{ background: "var(--bg-inset)" }} />
            ))}
          </div>
        </div>

        {/* Destination phone field */}
        <div className="space-y-2">
          <div className="h-3 w-32 rounded bg-bg-overlay kp-shimmer-track" />
          <div className="h-11 w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
        </div>

        {/* Gold confirm CTA */}
        <div className="h-12 w-full rounded-md bg-gold-500/25 kp-shimmer-track" />
      </div>
    </main>
  );
}
