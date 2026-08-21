"use client";

/**
 * C2j — branded /offline route. The service worker precaches this and serves it
 * as the navigation fallback when the network is down (public/sw.js). Client
 * component so it localises from the kp-locale cookie even when served from
 * cache. FiftyMark + "You're offline" + a retry that reloads once back online.
 */
import { FiftyMark } from "@/components/brand";
import { BrandTopo } from "@/components/brand-topo";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export default function OfflinePage() {
  const { t } = useT();
  return (
    <main className="relative isolate flex min-h-[calc(100vh-44px)] items-center justify-center overflow-hidden px-4 py-10">
      <BrandTopo opacity={0.09} />
      <div className="relative z-10 flex max-w-[400px] flex-col items-center text-center">
        <FiftyMark size={64} />
        {/* ⚠️ LITERALS, not `h-10 w-10` — spacing is overridden (tailwind.config.ts:200-215),
            so `h-10` was an 80px disc rivalling the size={64} mark above it. */}
        <span className="mt-6 inline-flex h-[40px] w-[40px] items-center justify-center rounded-full border border-border bg-bg-overlay text-text-subtle">
          <I.wifiOff s={18} />
        </span>
        <h1 className="mt-4 font-display text-[24px] font-bold leading-tight text-text">{t.common.offline}</h1>
        <p className="mt-2 text-[13px] leading-snug text-text-muted">{t.common.offlineHint}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn btn-primary btn-md btn-pill mt-6 inline-flex items-center gap-1.5"
        >
          <I.rotateCcw s={14} />
          {t.error.tryAgain}
        </button>
      </div>
    </main>
  );
}
