"use client";

/**
 * NotifyPrompt — small in-card opt-in for browser notifications about a
 * specific market. Saves the marketId in localStorage; the global
 * notification poller (mounted in AppShell) checks this list against
 * resolved-since-last-poll and fires Notification API + a brand toast.
 *
 * No back-end push subscription needed for the demo phase — this is a
 * client-only opt-in tied to the device. When we wire FCM/APN later, we
 * upgrade this to register a push subscription instead.
 */
import { useEffect, useState } from "react";
import { I } from "@/components/ui/glyphs";

const KEY = "50pick-notify-markets";

function readWatchlist(): string[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeWatchlist(ids: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 50)));
  } catch {
    /* private browsing */
  }
}

export function NotifyPrompt({ marketId, marketTitle }: { marketId: string; marketTitle: string }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [watching, setWatching] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (typeof Notification === "undefined") {
      setSupported(false);
      return;
    }
    setSupported(true);
    setPermission(Notification.permission);
    setWatching(readWatchlist().includes(marketId));
  }, [marketId]);

  if (!supported) {
    return (
      <div className="rounded-md border border-border bg-bg-overlay px-3 py-2 text-[11px] text-text-subtle">
        Browser notifications not supported here. Add this market to your home screen for the best alerts.
      </div>
    );
  }

  const toggle = async () => {
    setPending(true);
    try {
      if (!watching) {
        if (permission === "default") {
          const r = await Notification.requestPermission();
          setPermission(r);
          if (r !== "granted") {
            setPending(false);
            return;
          }
        }
        if (Notification.permission !== "granted") {
          setPending(false);
          return;
        }
        const next = Array.from(new Set([...readWatchlist(), marketId]));
        writeWatchlist(next);
        setWatching(true);
        // Confirmation chirp so the user sees it works
        new Notification("Watching this market", { body: marketTitle.slice(0, 80), tag: `50pick-${marketId}` });
      } else {
        const next = readWatchlist().filter((x) => x !== marketId);
        writeWatchlist(next);
        setWatching(false);
      }
    } finally {
      setPending(false);
    }
  };

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border bg-bg-overlay px-3 py-2 text-[11px] text-text-subtle">
        <I.bellOff s={14} />
        <span>Notifications blocked. Enable them in your browser settings to get a ping when this market resolves.</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={watching}
      className={`w-full inline-flex items-center justify-center gap-2 rounded-md border px-3 h-10 font-display font-semibold text-[13px] transition-colors ${
        watching
          ? "border-yes-700 bg-yes-500/15 text-yes-300 hover:border-yes-500"
          : "border-border bg-bg-elevated text-text-muted hover:border-border-strong hover:text-text"
      } disabled:opacity-50`}
    >
      {watching ? <I.bellRing s={14} /> : <I.bell s={14} />}
      {watching ? "Watching · I'll ping you on resolve" : "Notify me when this resolves"}
    </button>
  );
}
