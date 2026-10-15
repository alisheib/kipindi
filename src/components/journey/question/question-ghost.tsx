"use client";

/** The question ghost follows the open guest page's bands, with a separate signed-in pick shape. */
import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { useT } from "@/lib/i18n";

function ShimmerLine({ className }: { className: string }) {
  return <span className={`absolute top-1/2 -translate-y-1/2 rounded bg-bg-overlay kp-shimmer-track ${className}`} />;
}

function GuestBetGhost({ t }: { t: ReturnType<typeof useT>["t"] }) {
  // The invisible words keep the real card's locale-dependent wrapping and height. The visible lines are only a loading
  // picture; no guessed fixed height can fit both the one-line Chinese and longer Swahili guest invitation.
  return <div className="kp-qghost__guest rounded-xl border border-border bg-bg-elevated p-6 text-center" aria-hidden>
    <p className="relative font-mono text-micro uppercase eyebrow font-bold text-text-subtle">
      <span className="invisible">{t.market.signInToPredict}</span><ShimmerLine className="left-[35%] w-[30%] h-2" />
    </p>
    <h2 className="relative mt-1.5 font-display text-[18px] font-bold text-text leading-tight text-balance">
      <span className="invisible">{t.market.placeYourStake}</span><ShimmerLine className="left-[22%] w-[56%] h-3" />
    </h2>
    <p className="relative mt-1.5 text-body-sm text-text-muted leading-snug text-balance [word-break:keep-all] [overflow-wrap:break-word]">
      <span className="invisible">{t.market.browseForFree}</span><ShimmerLine className="left-[12%] w-[76%] h-2" />
    </p>
    <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 gap-2">
      <div className="h-[44px] rounded-pill bg-bg-overlay kp-shimmer-track" />
      <div className="h-[44px] rounded-pill bg-bg-overlay kp-shimmer-track" />
    </div>
  </div>;
}

function PickGhost() {
  return <div className="kp-qghost__picks grid grid-cols-2 gap-3" aria-hidden>
    <div className="h-[64px] rounded-lg bg-bg-overlay kp-shimmer-track" />
    <div className="h-[64px] rounded-lg bg-bg-overlay kp-shimmer-track" />
  </div>;
}

export function QuestionGhost() {
  const { t } = useT();
  return <PageContainer tier="reading" className="kp-qghost">
    <BackLinkGhost />
    <header data-testid="journey-question-ghost" className="mt-3 mb-5" aria-hidden>
      <div className="mb-3 flex h-[40px] items-center gap-2">
        <div className="h-[25px] w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track" />
        <div className="h-[25px] w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track" />
      </div>
      <div className="mb-3 h-px w-full bg-border" />
      {/* One desktop line; two mobile lines reserve a common question without knowing its title during loading. */}
      <div className="h-[70px] md:h-[40px] w-3/4 rounded bg-bg-overlay kp-shimmer-track" />
    </header>
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[1fr_360px] lg:grid-rows-[auto_auto] lg:items-start lg:gap-6">
      <div className="kp-qghost__aside order-1 lg:order-2 lg:col-start-2 lg:row-start-1 lg:self-stretch">
        <aside className="flex flex-col gap-3 lg:sticky lg:top-[72px]" aria-hidden>
          <GuestBetGhost t={t} />
          <div className="kp-qghost__member"><PickGhost /></div>
        </aside>
      </div>
      <section className="order-2 lg:order-1 lg:col-start-1 lg:row-start-1 min-w-0 space-y-5" aria-hidden>
        {/* TippingBar's 28px rail + 8px label gap + 16.5px label line = 52.5px before the KPI strip. */}
        <div>
          <div className="h-[28px] rounded-pill bg-bg-overlay kp-shimmer-track" />
          <div className="mt-1.5 flex h-[16.5px] items-center justify-between gap-3">
            <div className="h-2 w-[70px] rounded bg-bg-overlay kp-shimmer-track" />
            <div className="h-2 w-[70px] rounded bg-bg-overlay kp-shimmer-track" />
          </div>
        </div>
        {/* Same two-then-one phone grid and three-column desktop measure as the page's Stat strip. */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)_minmax(0,1fr)]">
          <div className="h-[77px] rounded-md border border-border bg-bg-elevated p-3 kp-shimmer-track" />
          <div className="h-[77px] rounded-md border border-border bg-bg-elevated p-3 kp-shimmer-track" />
          <div className="col-span-2 sm:col-span-1 h-[77px] rounded-md border border-border bg-bg-elevated p-3 kp-shimmer-track" />
        </div>
        <div className="glass-panel h-[140px] p-5 space-y-2.5 kp-shimmer-track">
          <div className="h-3 w-2/5 rounded bg-bg-overlay" />
          <div className="h-[64px] w-3/4 rounded bg-bg-overlay" />
        </div>
        <div className="kp-qghost__member kp-qghost__mobile-picks"><PickGhost /></div>
        <section className="glass-panel min-h-[203px] p-5 space-y-3 kp-shimmer-track">
          <div className="h-[23px] w-2/5 rounded bg-bg-overlay" />
          <div className="h-3 w-full rounded bg-bg-overlay" />
          <div className="h-3 w-4/5 rounded bg-bg-overlay" />
        </section>
      </section>
    </div>
  </PageContainer>;
}
