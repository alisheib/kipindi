"use client";

/** The journey question's loading picture: the same header bands and content column, with tickets and two picks. */
import { PageContainer } from "@/components/layout/page-container";
import { BackLinkGhost } from "@/components/ui/back-link";
import { useT } from "@/lib/i18n";

export function QuestionGhost() {
  const { t } = useT();
  const picks = <div className="kp-qghost__picks grid grid-cols-2 gap-3" aria-hidden><div className="h-[64px] rounded-lg bg-bg-overlay kp-shimmer-track" /><div className="h-[64px] rounded-lg bg-bg-overlay kp-shimmer-track" /></div>;
  return <PageContainer tier="reading" className="kp-qghost space-y-5">
    <div><BackLinkGhost /><header className="mt-3" aria-hidden>
      <div className="mb-3 flex h-[40px] items-center gap-2"><div className="h-[25px] w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track" /><div className="h-[25px] w-[64px] rounded-pill bg-bg-overlay kp-shimmer-track" /></div>
      <div className="mb-3 h-px w-full bg-border" /><div className="h-[35px] rounded bg-bg-overlay kp-shimmer-track md:h-[45px] w-3/4" />
    </header></div>
    <div className="lg:grid lg:grid-cols-[1fr_360px] lg:items-start lg:gap-6">
      <div className="min-w-0 space-y-4">
        <div className="h-2 w-full rounded-full bg-bg-overlay kp-shimmer-track" aria-hidden />
        <div className="h-[96px] rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
        <div className="h-[180px] rounded-lg border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
        <section className="rounded-xl border border-border bg-bg-elevated p-5 space-y-3" aria-hidden>
          <h2 className="font-display text-body-lg font-semibold text-text invisible">{t.journey.ticketsHere}</h2>
          <div className="h-[80px] rounded-md bg-bg-overlay kp-shimmer-track" />
        </section>
        <div className="lg:hidden">{picks}</div>
      </div>
      <div className="hidden lg:block">{picks}</div>
    </div>
  </PageContainer>;
}
