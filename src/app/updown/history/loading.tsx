import { getServerT } from "@/lib/i18n-server";

export default async function UpDownHistoryLoading() {
  const { t } = await getServerT();
  return (
    <div className="mx-auto w-full max-w-[1080px] px-4 py-6" aria-busy="true">
      <div className="h-4 w-32 rounded bg-bg-elevated kp-shimmer-track" aria-hidden />
      <div className="mt-3 h-7 w-52 rounded-md bg-bg-elevated kp-shimmer-track" aria-hidden />
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-xl border border-border bg-bg-elevated kp-shimmer-track" />)}
      </div>
      <div className="mt-4 h-64 rounded-xl border border-border bg-bg-elevated kp-shimmer-track" aria-hidden />
      <span className="sr-only">{t.common.loading}</span>
    </div>
  );
}
