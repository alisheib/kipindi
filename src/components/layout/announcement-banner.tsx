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
import { I } from "@/components/ui/glyphs";

type Tone = "info" | "warning" | "success";
type Kind = Tone | "maintenance";

const TONE: Record<Kind, { bar: string; dot: string }> = {
  maintenance: { bar: "border-claret-edge bg-claret-soft text-claret-100", dot: "var(--claret-400)" },
  warning:     { bar: "border-warning-border bg-warning-bg/60 text-warning-fg", dot: "var(--warning-fg)" },
  info:        { bar: "border-info-border bg-info-bg/50 text-info-fg", dot: "var(--info-fg)" },
  success:     { bar: "border-yes-700 bg-yes-500/12 text-yes-200", dot: "var(--yes-400)" },
};

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
  const tone = TONE[active.kind];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2.5 border-b px-4 py-2 lg:px-6 ${tone.bar}`}
    >
      <span className="shrink-0 inline-block h-2 w-2 rounded-full" style={{ background: tone.dot }} aria-hidden />
      <p className="min-w-0 flex-1 text-[12.5px] leading-snug font-medium">{active.message}</p>
      {active.dismissible && (
        <button
          type="button"
          onClick={() => {
            try { sessionStorage.setItem(DISMISS_KEY, active.message); } catch { /* ignore */ }
            setDismissed(true);
          }}
          aria-label="Dismiss"
          className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md opacity-70 hover:opacity-100 transition-opacity"
        >
          <I.x s={14} />
        </button>
      )}
    </div>
  );
}
