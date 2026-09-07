import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { getServerT } from "@/lib/i18n-server";

/**
 * The page that is COMING: a header WITH its subtitle, three stat tiles in a row (one column
 * on a phone), a CTA, then five panels and the centred terms link. Ghosted at the page's own
 * rung heights so nothing snaps when the data lands. ⛔ Never a ghost for a card the page
 * does not render — and never one card short either.
 *
 * 🔴 IT WAS TWO SHORT AND ONE LINE THIN. The header ghosted eyebrow + title while the page
 * renders a three-line `heroSub` beneath them, so everything below jumped down the moment the
 * read landed; and the panel count was four against the page's five (how it works · the seven
 * documents · the fee · how you are paid · the commission waterfall) with no ghost for the
 * terms link. ⭐ The subtitle is ghosted rather than PRINTED because `heroSub` wraps to a
 * different number of lines in each locale, and a real sentence here would settle at one
 * height in English and another in Swahili.
 *
 * ⚠️ The waterfall's ghost is TALLER than the others on purpose: it is an eight-row table,
 * so a one-panel-height ghost would under-reserve it by roughly 200px and reintroduce exactly
 * the jump this file exists to prevent.
 */
export default async function AgentLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="reading" className="space-y-6" aria-busy="true">
      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} />
      <div className="space-y-1.5" aria-hidden>
        <div className="h-3 w-full max-w-[46ch] rounded bg-bg-overlay/40 kp-shimmer-track" />
        <div className="h-3 w-4/5 max-w-[38ch] rounded bg-bg-overlay/40" />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-hidden>
        {[0, 1, 2].map((i) => <div key={i} className="h-[96px] rounded-xl border border-border bg-bg-overlay/40 kp-shimmer-track" />)}
      </div>
      <div className="h-[48px] w-48 rounded-pill bg-bg-overlay kp-shimmer-track" aria-hidden />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl glass-panel p-4 space-y-3" aria-hidden>
          <div className="h-4 w-40 rounded bg-bg-overlay/60" />
          <div className="h-3 w-full rounded bg-bg-overlay/40" />
          <div className="h-3 w-5/6 rounded bg-bg-overlay/40" />
        </div>
      ))}
      {/* The commission waterfall — a header row plus eight rows of two lines each. */}
      <div className="rounded-xl glass-panel p-4 space-y-3" aria-hidden>
        <div className="h-4 w-48 rounded bg-bg-overlay/60" />
        <div className="h-3 w-2/3 rounded bg-bg-overlay/40" />
        <div className="space-y-2.5 pt-1">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="flex items-start justify-between gap-6">
              <div className="h-3 flex-1 max-w-[28ch] rounded bg-bg-overlay/40" />
              <div className="h-3 w-20 shrink-0 rounded bg-bg-overlay/40" />
            </div>
          ))}
        </div>
      </div>
      <div className="mx-auto h-3 w-40 rounded bg-bg-overlay/40" aria-hidden />
    </PageContainer>
  );
}
