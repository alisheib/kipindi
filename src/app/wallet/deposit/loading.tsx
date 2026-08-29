import { getServerT } from "@/lib/i18n-server";
import { PageContainer } from "@/components/layout/page-container";

/**
 * B-29 / V-2 — the skeleton mirrors the FORM the page actually renders
 * (amount field → provider grid → phone field → gold confirm), instead of the
 * old centered spinner panel that repainted into a completely different shape.
 */
export default async function DepositLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="form">
      <header className="mb-6">
        <p className="font-mono text-caption uppercase tracking-[0.16em] font-bold text-text-subtle">{t.common.deposit}</p>
        <h1 className="font-display text-[28px] font-bold text-text">{t.common.loading}</h1>
      </header>

      <div className="space-y-5" aria-hidden>
        {/* Amount field */}
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-bg-overlay kp-shimmer-track" />
          {/* ⚠️ TOKEN, not `h-11` — spacing is overridden (tailwind.config.ts:200-215) so `h-11`
              drew 96px. This ghost stands in for `<Input size="md">`, which reads its height
              from --h-input (44px) — so consume the SAME token and the two can never drift.
              PLAYER MONEY SURFACE: a mismatch here is a jump on the deposit form. */}
          <div className="h-[var(--h-input)] w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
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
          {/* ⚠️ TOKEN, not `h-11` (96px on the overridden scale) — same `<Input size="md">`. */}
          <div className="h-[var(--h-input)] w-full rounded-lg border border-border bg-bg-inset kp-shimmer-track" />
        </div>

        {/* Gold confirm CTA */}
        {/* ⚠️ TOKEN, not `h-12` (128px on the overridden scale) — the gold confirm is a
            `btn-lg`, whose height is --h-control-lg (48px). */}
        <div className="h-[var(--h-control-lg)] w-full rounded-md bg-gold-500/25 kp-shimmer-track" />
      </div>
    </PageContainer>
  );
}
