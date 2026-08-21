"use client";

import { useT } from "@/lib/i18n";

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
import { GlyphSwap } from "@/components/ui/glyph-swap";
import { Callout } from "@/components/ui/callout";

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
  const { t } = useT();
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
    // DS-9 — the kit Callout, not a hand-rolled notice box.
    return <Callout tone="info">{t.market.notifUnsupported}</Callout>;
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
        new Notification(t.market.watchingTitle, { body: marketTitle.slice(0, 80), tag: `50pick-${marketId}` });
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
    // DS-9 — kit Callout with the bell-off glyph override.
    return (
      <Callout tone="info" glyph="bellOff">{t.market.notifBlocked}</Callout>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      aria-pressed={watching}
      /* ⭐ IT NEEDS A SIZE. `.btn` sets no height and no vertical padding, so a
         sizeless `.btn` is only as tall as its 14px glyph and 14px label — ~21px,
         far under --tap-min (40px, DA §A2) — on the market detail page right beside
         the bet controls. This was the only sizeless `.btn` call site in src.
         ⛔ NOT `btn-yes` WHEN WATCHING. §B2: green means YES/win and "must never be
         inverted, re-hued, or reused for a NON-MONEY meaning" — a notification
         opt-in is not a bet, and this rendered a full-width green button directly
         under the YES/NO controls. The pressed state now wears the platform's ONE
         selected-control language (--pill-active + --brand-400), the same fill
         `.kp-fchip[data-on]` uses. §A4 stays satisfied: the glyph and the label
         both change, so colour is never the only signal. */
      className="btn btn-ghost btn-md w-full"
      style={watching ? { background: "var(--pill-active)", borderColor: "var(--brand-400)", color: "var(--text)" } : undefined}
    >
      {/* M5 state morph — bell→ringing swaps through the kit primitive. */}
      <GlyphSwap state={watching}>{watching ? <I.bellRing s={14} /> : <I.bell s={14} />}</GlyphSwap>
      {watching ? `${t.common.watching} · ${t.common.watchingHint}` : t.common.notifyOnResolve}
    </button>
  );
}
