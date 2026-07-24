import { getServerT } from "@/lib/i18n-server";

/**
 * /updown/[roundId] loading skeleton. Matches the detail layout (header, price panel,
 * action panel) so the real page swaps in without a jump.
 */
export default async function UpDownRoundLoading() {
  const { t } = await getServerT();
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-6" aria-busy="true">
      <div className="h-4 w-24 rounded bg-bg-elevated kp-shimmer-track" aria-hidden />
      <div className="mt-3 h-7 w-64 rounded-md bg-bg-elevated kp-shimmer-track" aria-hidden />
      {/* price panel */}
      <div className="mt-5 h-40 rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
      {/* action panel */}
      <div className="mt-4 h-36 rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
