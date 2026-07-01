"use client";

import { useEffect } from "react";
import Link from "next/link";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export default function MarketsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useT();
  useEffect(() => {
    console.warn("[50pick/markets] error boundary fired", { digest: error.digest });
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60svh] max-w-[560px] flex-col items-center justify-center px-5 py-12 text-center">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-no-700 bg-no-500/10 text-no-300">
        <I.alertCircle s={18} />
      </div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.20em] text-no-300">
        {t.error.somethingWentWrong}
      </p>
      <h1 className="mt-2 font-display text-[22px] font-bold leading-tight tracking-[-0.02em] text-text">
        {t.error.pageHitSnag}
      </h1>
      <p className="mt-3 max-w-[420px] text-[13px] leading-relaxed text-text-subtle">
        {t.error.pageHitSnagBody}
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] tracking-[0.06em] text-text-subtle">
          {t.error.reference}: <span className="text-text">{error.digest}</span>
        </p>
      )}
      <div className="mt-6 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <button type="button" onClick={() => reset()} className="btn btn-primary btn-md inline-flex items-center justify-center gap-2">
          <I.bolt s={14} />
          {t.error.tryAgain}
        </button>
        <Link href="/markets" className="btn btn-ghost btn-md inline-flex items-center justify-center gap-2">
          {t.error.backToMarkets}
          <I.arrowRight s={14} />
        </Link>
      </div>
    </div>
  );
}
