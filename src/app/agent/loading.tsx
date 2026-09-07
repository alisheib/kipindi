import { PageContainer } from "@/components/layout/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { getServerT } from "@/lib/i18n-server";

/**
 * The page that is COMING: a header, three stat tiles in a row (one column on a phone), a
 * CTA, then four panels. Ghosted at the page's own rung heights so nothing snaps when the
 * data lands. ⛔ Never a ghost for a card the page does not render.
 */
export default async function AgentLoading() {
  const { t } = await getServerT();
  return (
    <PageContainer tier="reading" className="space-y-6" aria-busy="true">
      <PageHeader eyebrow={t.agent.eyebrow} title={t.agent.title} />
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
    </PageContainer>
  );
}
