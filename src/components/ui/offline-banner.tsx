"use client";

/**
 * OfflineBanner — the kit's warning `NoticeBar`, in the page's flow under the header, while the browser has no network.
 * Hides itself when the connection comes back. Tells players before they try a deposit or a bet that would fail.
 *
 * 🔴 IT USED TO LIE ON THE HEADER (R4-G, 2026-10-09 — edge scenario 9, tiles 453–483, both shells, every width).
 * It was `fixed top-0 inset-x-0 z-[200]`, a strip at the top of the viewport over everything — and its fill is
 * `--warning-bg`, which is itself an 18% tint, so the strip let the header show through it. On a phone its words ran
 * over the mark, the 18+ badge, the capsule ("Salio" unreadable) and the gold pill, its icon on the mark; at 1280 its
 * band (y 0–37) lay across the nav links, the capsule, the pill, the language box and the avatar. And it took their
 * clicks: offline, `elementFromPoint` at a nav link's centre is this strip, so no header control could be pressed —
 * the drive's 1280 tap on "Tiketi zangu" timed out three times on it ("locator.click: Timeout 10000ms exceeded").
 *
 * ⭐ NOW IT IS A NOTICE LIKE THE OTHERS (`NoticeBar` says it is the single definition of "a full-width bar under the
 * app bar", and names an offline state among its uses). AppShell mounts it first among the notices, in the flow: it
 * covers nothing — no header, no control, no sticky band below — and the page moves down by its height while the
 * browser is offline. It keeps `role="alert"` (`assertive`): it appears on an event, the connection dropping, and is
 * announced at once. ⚠️ The cost, stated: it scrolls with the page rather than floating over it, so a player far down
 * a page sees it when they scroll back up — the price of never again covering the controls it warns about.
 */

import { useEffect, useState } from "react";
import { NoticeBar } from "@/components/ui/notice-bar";
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
    <NoticeBar tone="warning" glyph="alertCircle" assertive testId="offline-notice">
      <span className="font-semibold">{t.common.offline}</span> &middot; {t.common.offlineHint}
    </NoticeBar>
  );
}
