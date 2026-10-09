"use client";

/**
 * OfflineBanner — shows a slim banner at the top of the viewport when
 * the browser loses network connectivity. Hides automatically when
 * the connection is restored. Prevents players from attempting deposits
 * or bets that would silently fail.
 */

import { useEffect, useState } from "react";
import { I } from "@/components/ui/glyphs";
import { useT } from "@/lib/i18n";

export function OfflineBanner() {
  const [offline, setOffline] = useState(false);
  const { t } = useT();

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    // Check initial state
    if (!navigator.onLine) setOffline(true);
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="alert"
      className="fixed top-0 inset-x-0 z-[200] flex items-center justify-center gap-2 px-4 py-2 text-[12px] font-semibold text-text"
      // DS-16 — the strip stays viewport-fixed (connectivity outranks layout),
      // but it paints with the WARNING semantic family now, not a hue-40 amber
      // that matched no token in the system.
      style={{
        background: "linear-gradient(90deg, color-mix(in oklab, var(--warning-bg) 88%, var(--bg-base)), color-mix(in oklab, var(--warning-bg) 70%, var(--bg-base)))",
        borderBottom: "1px solid color-mix(in oklab, var(--warning-fg) 45%, transparent)",
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 8px)",
      }}
    >
      <I.alertCircle s={14} />
      {t.common.offline} &middot; {t.common.offlineHint}
    </div>
  );
}
