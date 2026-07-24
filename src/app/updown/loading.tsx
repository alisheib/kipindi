import { getServerT } from "@/lib/i18n-server";

/**
 * /updown loading skeleton. Mirrors the board's real header + card grid so there is no
 * layout jump when the page swaps in — same max-width, same grid, same card height.
 */
export default async function UpDownLoading() {
  const { t } = await getServerT();
  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6" aria-busy="true">
      <div className="mb-4">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] font-bold text-text-subtle">{t.market.udStreaming}</p>
        <div className="mt-1 h-7 w-40 rounded-md bg-bg-elevated kp-shimmer-track" aria-hidden />
      </div>
      {/* price tape */}
      <div className="mt-4 h-10 rounded-xl bg-bg-inset kp-shimmer-track" aria-hidden />
      {/* asset + duration tabs */}
      <div className="mt-4 flex gap-2" aria-hidden>
        {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-9 w-24 rounded-md bg-bg-elevated kp-shimmer-track" />)}
      </div>
      <div className="mt-2 flex gap-1.5" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-7 w-16 rounded-md bg-bg-inset kp-shimmer-track" />)}
      </div>
      {/* card grid — same shape as the live grid so nothing shifts */}
      <div className="mt-4 grid items-stretch gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }} aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-bg-elevated kp-shimmer-track" style={{ height: 360 }} />
        ))}
      </div>
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
