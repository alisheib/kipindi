"use client";

/**
 * AnnouncementBanner (§9.3 #5) — the site-wide operator broadcast bar.
 *
 * Shows below the top app bar on every PLAYER page (never admin — AppShell
 * skips admin routes). Two sources, maintenance takes priority:
 *   - maintenance ON  → a claret "under maintenance" bar, NOT dismissible.
 *   - active announcement → a toned bar (info/warning/success), dismissible
 *     for the session (re-shows automatically when the message changes).
 */
import { useEffect, useState } from "react";
import { NoticeBar } from "@/components/ui/notice-bar";
import type { NoticeBarTone } from "@/components/ui/notice-bar";

type Tone = "info" | "warning" | "success";
type Kind = NoticeBarTone;

const DISMISS_KEY = "kp-banner-dismissed";

export function AnnouncementBanner({
  maintenance,
  announcement,
}: {
  maintenance: string | null;
  announcement: { message: string; tone: Tone } | null;
}) {
  const active: { message: string; kind: Kind; dismissible: boolean } | null = maintenance
    ? { message: maintenance, kind: "maintenance", dismissible: false }
    : announcement
    ? { message: announcement.message, kind: announcement.tone, dismissible: true }
    : null;

  const [dismissed, setDismissed] = useState(false);
  const message = active?.message ?? "";
  const dismissible = active?.dismissible ?? false;

  useEffect(() => {
    if (!message || !dismissible) { setDismissed(false); return; }
    try {
      setDismissed(sessionStorage.getItem(DISMISS_KEY) === message);
    } catch { /* sessionStorage unavailable — always show */ }
  }, [message, dismissible]);

  if (!active || dismissed) return null;

  return (
    <NoticeBar
      tone={active.kind}
      onDismiss={
        active.dismissible
          ? () => {
              try { sessionStorage.setItem(DISMISS_KEY, active.message); } catch { /* ignore */ }
              setDismissed(true);
            }
          : undefined
      }
    >
      {active.message}
    </NoticeBar>
  );
}
